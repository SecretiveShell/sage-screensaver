import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { BackgroundParticles } from './objects/background-particles.js'
import { Core } from './objects/core.js'
import { CoreRays } from './objects/core-rays.js'
import { FloatingCubes } from './objects/floating-cubes.js'
import { Icosahedron } from './objects/icosahedron.js'
import { OuterLabel } from './objects/outer-label.js'
import { SignalRing } from './objects/signal-ring.js'
import { ThemeController } from './theme-controller.js'
import { THEMES, type ThemeConfig, type ThemeName } from './themes.js'

interface Updatable {
  update(delta: number): void
}

export class Scene {
  private readonly scene = new THREE.Scene()
  private readonly canvas: HTMLCanvasElement
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly bloomComposer: EffectComposer
  private readonly bloomPass: UnrealBloomPass
  private readonly finalComposer: EffectComposer
  private readonly resizeObserver: ResizeObserver
  private readonly themeController: ThemeController
  private readonly backgroundParticles = new BackgroundParticles()
  private readonly core = new Core()
  private readonly coreRays = new CoreRays()
  private readonly floatingCubes = new FloatingCubes()
  private readonly icosahedron = new Icosahedron(0.7, 0.12, 0.2, 0.14)
  private readonly outerIcosahedron = new Icosahedron(1.8, 0.12, -0.18, 0.055)
  private readonly outerLabel = new OuterLabel()
  private readonly signalRing = new SignalRing()
  private readonly essentialUpdatables: Updatable[] = [
    this.core,
    this.icosahedron,
    this.outerIcosahedron,
    this.floatingCubes,
  ]
  private readonly ambientUpdatables: Updatable[] = [
    this.backgroundParticles,
    this.coreRays,
    this.outerLabel,
    this.signalRing,
  ]
  private animationFrameId?: number
  private audioAnalyser?: AnalyserNode
  private audioContext?: AudioContext
  private audioData?: Uint8Array<ArrayBuffer>
  private audioElement?: HTMLMediaElement
  private frequencyData?: Uint8Array<ArrayBuffer>
  private audioSource?: AudioNode
  private audioStream?: MediaStream
  private manualAudioLevel = 0
  private elapsed = 0
  private activeTheme: ThemeConfig = THEMES.cool
  private nextThemeEffect = 0
  private minimalMode = false
  private readonly pointer = new THREE.Vector2()
  private previousTime = 0

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.scene.background = new THREE.Color(0x020407)
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    this.camera.position.z = 7

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.bloomComposer = new EffectComposer(this.renderer)
    this.bloomComposer.setPixelRatio(1)
    this.bloomComposer.renderToScreen = false
    this.bloomComposer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.8,
      0.45,
      0.75,
    )
    this.bloomComposer.addPass(this.bloomPass)

    this.finalComposer = new EffectComposer(this.renderer)
    this.finalComposer.addPass(new RenderPass(this.scene, this.camera))
    this.finalComposer.addPass(
      new ShaderPass(
        new THREE.ShaderMaterial({
          uniforms: {
            baseTexture: { value: null },
            bloomTexture: { value: this.bloomComposer.renderTarget2.texture },
          },
          vertexShader: `
            varying vec2 vUv;

            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `,
          fragmentShader: `
            uniform sampler2D baseTexture;
            uniform sampler2D bloomTexture;
            varying vec2 vUv;

            void main() {
              gl_FragColor = texture2D(baseTexture, vUv) + texture2D(bloomTexture, vUv);
            }
          `,
        }),
        'baseTexture',
      ),
    )

    this.scene.add(
      this.backgroundParticles.group,
      this.signalRing.mesh,
      this.coreRays.group,
      this.core.mesh,
      this.icosahedron.mesh,
      this.outerIcosahedron.mesh,
      this.outerLabel.mesh,
      this.floatingCubes.group,
    )
    enableBloom(this.core.mesh)
    enableBloom(this.coreRays.group)
    enableBloom(this.icosahedron.mesh)
    enableBloom(this.outerIcosahedron.mesh)
    this.themeController = new ThemeController(this.scene, this.bloomPass, {
      core: collectColorMaterials([
        this.coreRays.group,
        this.core.mesh,
        this.icosahedron.mesh,
        this.outerIcosahedron.mesh,
      ]),
      foreground: collectColorMaterials([
        this.backgroundParticles.group,
        this.outerLabel.mesh,
        this.signalRing.mesh,
        this.floatingCubes.group,
      ]),
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

  showMessage(message: string) {
    this.outerLabel.showMessage(message)
  }

  clearMessage() {
    this.outerLabel.clearMessage()
  }

  pulseCore() {
    this.core.pulse()
    this.coreRays.pulse()
  }

  scatterCubes() {
    this.floatingCubes.scatter()
  }

  gatherCubes() {
    this.floatingCubes.gather()
  }

  setSignalLevel(level: number) {
    this.signalRing.setSignalLevel(level)
  }

  setAudioStream(stream: MediaStream | null) {
    if (stream === this.audioStream && !this.audioElement) {
      return
    }

    this.disposeAudio()
    if (!stream) {
      return
    }

    const context = new AudioContext()
    const source = context.createMediaStreamSource(stream)
    const analyser = this.createAudioAnalyser(context)
    source.connect(analyser)

    this.audioContext = context
    this.audioAnalyser = analyser
    this.audioSource = source
    this.audioStream = stream
  }

  setAudioElement(element: HTMLMediaElement | null) {
    if (element === this.audioElement && !this.audioStream) {
      return
    }

    this.disposeAudio()
    if (!element) {
      return
    }

    const context = new AudioContext()
    const source = context.createMediaElementSource(element)
    const analyser = this.createAudioAnalyser(context)
    source.connect(analyser)
    analyser.connect(context.destination)

    this.audioContext = context
    this.audioAnalyser = analyser
    this.audioElement = element
    this.audioSource = source
  }

  resumeAudio() {
    void this.audioContext?.resume().catch(() => undefined)
  }

  setAudioLevel(level: number) {
    this.manualAudioLevel = THREE.MathUtils.clamp(level, 0, 1)
  }

  setMinimalMode(enabled: boolean) {
    this.minimalMode = enabled
    const visible = !enabled

    this.backgroundParticles.group.visible = visible
    this.coreRays.group.visible = visible
    this.outerLabel.mesh.visible = visible
    this.signalRing.mesh.visible = visible
  }

  toggleMinimalMode() {
    this.setMinimalMode(!this.minimalMode)
  }

  setTheme(theme: ThemeName) {
    this.activeTheme = this.themeController.setTheme(theme)
    this.nextThemeEffect = this.elapsed
    this.backgroundParticles.group.visible = !this.minimalMode
    if (!this.activeTheme.effects.cubeScatter) {
      this.gatherCubes()
    }

    this.setSignalLevel(this.activeTheme.effects.signalLevel)
  }

  dispose() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId)
    }

    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('pointermove', this.onPointerMove)
    this.disposeAudio()
    this.bloomComposer.dispose()
    this.finalComposer.dispose()
    this.renderer.dispose()
  }

  private render = (time: number) => {
    const delta = Math.min((time - this.previousTime) / 1_000, 0.05)
    this.previousTime = time
    this.elapsed += delta
    this.updateAudioLevel()

    for (const object of this.essentialUpdatables) {
      object.update(delta)
    }

    if (!this.minimalMode) {
      for (const object of this.ambientUpdatables) {
        object.update(delta)
      }
    }
    this.themeController.update(delta)
    const distortion = this.updateThemeEffects()
    this.camera.position.x = Math.sin(this.elapsed * 0.08) * 0.08 + this.pointer.x * 0.12 + distortion.x
    this.camera.position.y = Math.cos(this.elapsed * 0.06) * 0.05 + this.pointer.y * 0.09 + distortion.y
    this.camera.lookAt(0, 0, 0)
    this.camera.layers.set(1)
    this.bloomComposer.render()
    this.camera.layers.set(0)
    this.finalComposer.render()
    this.animationFrameId = requestAnimationFrame(this.render)
  }

  private resize = () => {
    const host = this.canvas.parentElement ?? this.canvas
    const { width, height } = host.getBoundingClientRect()
    if (width === 0 || height === 0) {
      return
    }

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.bloomComposer.setSize(width, height)
    this.finalComposer.setSize(width, height)
  }

  private onPointerMove = (event: PointerEvent) => {
    const bounds = this.canvas.getBoundingClientRect()
    this.pointer.set(
      (event.clientX - bounds.left) / bounds.width - 0.5,
      0.5 - (event.clientY - bounds.top) / bounds.height,
    )
  }

  private updateThemeEffects() {
    const { effects } = this.activeTheme

    if (effects.cubeScatter && this.elapsed >= this.nextThemeEffect) {
      this.scatterCubes()
      this.nextThemeEffect = this.elapsed
        + effects.cubeScatter.interval
        + Math.random() * effects.cubeScatter.variance
    }

    const stutter = Math.pow(
      Math.max(0, Math.sin(this.elapsed * effects.stutterFrequency)),
      effects.stutterPower,
    )
    this.coreRays.group.rotation.z += effects.raySpin + stutter * effects.rayStutterSpin
    this.floatingCubes.group.rotation.z = Math.sin(this.elapsed * effects.cubeOrbitSpeed)
      * effects.cubeOrbitAmplitude
    this.backgroundParticles.group.visible = !this.minimalMode && stutter < effects.particleFlickerThreshold

    return new THREE.Vector2(
      Math.sin(this.elapsed * effects.cameraJitter.xFrequency) * stutter * effects.cameraJitter.x,
      Math.cos(this.elapsed * effects.cameraJitter.yFrequency) * stutter * effects.cameraJitter.y,
    )
  }

  private updateAudioLevel() {
    if (!this.audioAnalyser || !this.audioData) {
      this.core.setAudioLevel(this.manualAudioLevel)
      this.coreRays.setAudioLevel(this.manualAudioLevel)
      this.icosahedron.setAudioLevel(this.manualAudioLevel)
      this.outerIcosahedron.setAudioLevel(this.manualAudioLevel * 0.65)
      return
    }

    this.audioAnalyser.getByteTimeDomainData(this.audioData)
    this.audioAnalyser.getByteFrequencyData(this.frequencyData!)
    let energy = 0

    for (const sample of this.audioData) {
      const value = (sample - 128) / 128
      energy += value * value
    }

    const level = Math.min(Math.sqrt(energy / this.audioData.length) * 4, 1)
    this.core.setAudioLevel(level)
    this.coreRays.setAudioLevel(level)
    this.icosahedron.setAudioLevel(enhanceBand(averageBand(this.frequencyData!, 2, 12)))
    this.outerIcosahedron.setAudioLevel(enhanceBand(averageBand(this.frequencyData!, 12, 72)))
  }

  private disposeAudio() {
    this.audioSource?.disconnect()
    this.audioAnalyser?.disconnect()
    if (this.audioContext) {
      void this.audioContext.close()
    }

    this.audioAnalyser = undefined
    this.audioContext = undefined
    this.audioData = undefined
    this.audioElement = undefined
    this.frequencyData = undefined
    this.audioSource = undefined
    this.audioStream = undefined
  }

  private createAudioAnalyser(context: AudioContext) {
    const analyser = context.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.75
    this.audioData = new Uint8Array(analyser.fftSize)
    this.frequencyData = new Uint8Array(analyser.frequencyBinCount)
    return analyser
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
      const items = Array.isArray(material) ? material : [material]

      for (const item of items) {
        if (item && hasColor(item)) {
          materials.add(item)
        }
      }
    })
  }

  return [...materials]
}

function hasColor(material: THREE.Material): material is THREE.Material & { color: THREE.Color } {
  return 'color' in material && material.color instanceof THREE.Color
}

function averageBand(data: Uint8Array<ArrayBuffer>, start: number, end: number) {
  const upperBound = Math.min(end, data.length)
  let total = 0

  for (let index = start; index < upperBound; index += 1) {
    total += data[index]
  }

  return total / Math.max(upperBound - start, 1) / 255
}

function enhanceBand(level: number) {
  return THREE.MathUtils.clamp(Math.pow(level, 0.58) * 1.25, 0, 1)
}
