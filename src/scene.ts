import * as THREE from 'three'
import { AudioAnalyser } from './audio-analyser.js'
import { BloomRenderer } from './bloom-renderer.js'
import { BackgroundParticles } from './objects/background-particles.js'
import { Core } from './objects/core.js'
import { CoreRays } from './objects/core-rays.js'
import { FloatingCubes } from './objects/floating-cubes.js'
import { Icosahedron } from './objects/icosahedron.js'
import { OuterLabel } from './objects/outer-label.js'
import { SignalRing } from './objects/signal-ring.js'
import { ThemeController } from './theme-controller.js'
import { THEMES, type Theme, type ThemeConfig } from './themes.js'

interface Updatable {
  update(delta: number): void
}

/** Coordinates the scene graph, animation loop, themes, and public controls. */
export class Scene {
  private readonly scene = new THREE.Scene()
  private readonly canvas: HTMLCanvasElement
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly postProcessing: BloomRenderer
  private readonly resizeObserver: ResizeObserver
  private readonly themeController: ThemeController
  private readonly audio = new AudioAnalyser()
  private readonly backgroundParticles = new BackgroundParticles()
  private readonly core = new Core()
  private readonly coreRays = new CoreRays()
  private readonly floatingCubes = new FloatingCubes()
  private readonly icosahedron = new Icosahedron(0.7, 0.12, 0.2, 0.14)
  private readonly outerIcosahedron = new Icosahedron(1.8, 0.12, -0.18, 0.055)
  private readonly outerLabel = new OuterLabel()
  private readonly signalRing = new SignalRing()
  private readonly essentialUpdatables: Updatable[] = [
    this.core, this.icosahedron, this.outerIcosahedron, this.floatingCubes,
  ]
  private readonly ambientUpdatables: Updatable[] = [
    this.backgroundParticles, this.coreRays, this.outerLabel, this.signalRing,
  ]
  private animationFrameId?: number
  private elapsed = 0
  private activeTheme: ThemeConfig = THEMES.cool
  private nextThemeEffect = 0
  private minimalMode = false
  private readonly pointer = new THREE.Vector2()
  private previousTime = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene.background = new THREE.Color(0x020407)
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100)
    this.camera.position.z = 7
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.postProcessing = new BloomRenderer(this.renderer, this.scene, this.camera)

    this.scene.add(
      this.backgroundParticles.group, this.signalRing.mesh, this.coreRays.group, this.core.mesh,
      this.icosahedron.mesh, this.outerIcosahedron.mesh, this.outerLabel.mesh, this.floatingCubes.group,
    )
    enableBloom(this.core.mesh)
    enableBloom(this.coreRays.group)
    enableBloom(this.icosahedron.mesh)
    enableBloom(this.outerIcosahedron.mesh)
    this.themeController = new ThemeController(this.scene, this.postProcessing.bloomPass, {
      core: collectColorMaterials([this.coreRays.group, this.core.mesh, this.icosahedron.mesh, this.outerIcosahedron.mesh]),
      foreground: collectColorMaterials([this.backgroundParticles.group, this.outerLabel.mesh, this.signalRing.mesh, this.floatingCubes.group]),
    })
    this.themeController.sync()
    this.resize()
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(canvas.parentElement ?? canvas)
    canvas.addEventListener('pointermove', this.onPointerMove)
  }

  start() {
    this.previousTime = performance.now()
    this.render(this.previousTime)
  }

  showMessage(message: string) { this.outerLabel.showMessage(message) }
  clearMessage() { this.outerLabel.clearMessage() }
  pulseCore() { this.core.pulse(); this.coreRays.pulse() }
  scatterCubes() { this.floatingCubes.scatter() }
  gatherCubes() { this.floatingCubes.gather() }
  setSignalLevel(level: number) { this.signalRing.setSignalLevel(level) }
  setAudioStream(stream: MediaStream | null) { this.audio.setStream(stream) }
  setAudioElement(element: HTMLMediaElement | null) { this.audio.setElement(element) }
  resumeAudio() { this.audio.resume() }
  setAudioLevel(level: number) { this.audio.setManualLevel(level) }

  setMinimalMode(enabled: boolean) {
    this.minimalMode = enabled
    const visible = !enabled
    this.backgroundParticles.group.visible = visible
    this.coreRays.group.visible = visible
    this.outerLabel.mesh.visible = visible
    this.signalRing.mesh.visible = visible
  }

  toggleMinimalMode() { this.setMinimalMode(!this.minimalMode) }

  setTheme(theme: Theme) {
    this.activeTheme = this.themeController.setTheme(theme)
    this.nextThemeEffect = this.elapsed
    this.backgroundParticles.group.visible = !this.minimalMode
    if (!this.activeTheme.effects.cubeScatter) this.gatherCubes()
    this.setSignalLevel(this.activeTheme.effects.signalLevel)
  }

  dispose() {
    if (this.animationFrameId !== undefined) cancelAnimationFrame(this.animationFrameId)
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.audio.dispose()
    this.postProcessing.dispose()
    this.renderer.dispose()
  }

  private render = (time: number) => {
    const delta = Math.min((time - this.previousTime) / 1_000, 0.05)
    this.previousTime = time
    this.elapsed += delta
    this.updateAudio()
    this.updateObjects(delta)
    this.themeController.update(delta)
    this.updateCamera(this.updateThemeEffects())
    this.postProcessing.render()
    this.animationFrameId = requestAnimationFrame(this.render)
  }

  private updateAudio() {
    const frame = this.audio.sample()
    this.core.setAudioLevel(frame.level)
    this.coreRays.setAudioLevel(frame.level)
    this.icosahedron.setAudioSpectrum(frame.innerSpectrum)
    this.outerIcosahedron.setAudioSpectrum(frame.outerSpectrum)
  }

  private updateObjects(delta: number) {
    for (const object of this.essentialUpdatables) object.update(delta)
    if (!this.minimalMode) for (const object of this.ambientUpdatables) object.update(delta)
  }

  private updateCamera(distortion: THREE.Vector2) {
    this.camera.position.x = Math.sin(this.elapsed * 0.08) * 0.08 + this.pointer.x * 0.12 + distortion.x
    this.camera.position.y = Math.cos(this.elapsed * 0.06) * 0.05 + this.pointer.y * 0.09 + distortion.y
    this.camera.lookAt(0, 0, 0)
  }

  private resize = () => {
    const { width, height } = (this.canvas.parentElement ?? this.canvas).getBoundingClientRect()
    if (width === 0 || height === 0) return
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.postProcessing.resize(width, height)
  }

  private onPointerMove = (event: PointerEvent) => {
    const bounds = this.canvas.getBoundingClientRect()
    this.pointer.set((event.clientX - bounds.left) / bounds.width - 0.5, 0.5 - (event.clientY - bounds.top) / bounds.height)
  }

  private updateThemeEffects() {
    const { effects } = this.activeTheme
    if (effects.cubeScatter && this.elapsed >= this.nextThemeEffect) {
      this.scatterCubes()
      this.nextThemeEffect = this.elapsed + effects.cubeScatter.interval + Math.random() * effects.cubeScatter.variance
    }
    const stutter = Math.pow(Math.max(0, Math.sin(this.elapsed * effects.stutterFrequency)), effects.stutterPower)
    this.coreRays.group.rotation.z += effects.raySpin + stutter * effects.rayStutterSpin
    this.floatingCubes.group.rotation.z = Math.sin(this.elapsed * effects.cubeOrbitSpeed) * effects.cubeOrbitAmplitude
    this.backgroundParticles.group.visible = !this.minimalMode && stutter < effects.particleFlickerThreshold
    return new THREE.Vector2(
      Math.sin(this.elapsed * effects.cameraJitter.xFrequency) * stutter * effects.cameraJitter.x,
      Math.cos(this.elapsed * effects.cameraJitter.yFrequency) * stutter * effects.cameraJitter.y,
    )
  }
}

function enableBloom(object: THREE.Object3D) {
  object.traverse((child) => child.layers.enable(1))
}

function collectColorMaterials(objects: THREE.Object3D[]) {
  const materials = new Set<THREE.Material>()
  for (const object of objects) {
    object.traverse((child) => {
      const material = (child as THREE.Mesh).material
      for (const item of Array.isArray(material) ? material : [material]) {
        if (item && hasColor(item)) materials.add(item)
      }
    })
  }
  return [...materials]
}

function hasColor(material: THREE.Material): material is THREE.Material & { color: THREE.Color } {
  return 'color' in material && material.color instanceof THREE.Color
}
