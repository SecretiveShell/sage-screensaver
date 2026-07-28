import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { BackgroundParticles } from './objects/background-particles.ts'
import { Core } from './objects/core.ts'
import { CoreRays } from './objects/core-rays.ts'
import { FloatingCubes } from './objects/floating-cubes.ts'
import { Icosahedron } from './objects/icosahedron.ts'
import { OuterLabel } from './objects/outer-label.ts'
import { SignalRing } from './objects/signal-ring.ts'

interface Updatable {
  update(delta: number): void
}

type Theme = 'alert' | 'cool'

const THEMES: Record<Theme, { background: THREE.ColorRepresentation; foreground: THREE.ColorRepresentation }> = {
  cool: { background: 0x020407, foreground: 0xc6ddeb },
  alert: { background: 0x0a0202, foreground: 0xff8a6d },
}

export class Scene {
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly bloomComposer: EffectComposer
  private readonly finalComposer: EffectComposer
  private readonly backgroundParticles = new BackgroundParticles()
  private readonly core = new Core()
  private readonly coreRays = new CoreRays()
  private readonly floatingCubes = new FloatingCubes()
  private readonly icosahedron = new Icosahedron(0.7, 0.12, 0.2)
  private readonly outerIcosahedron = new Icosahedron(1.8, 0.12, -0.18)
  private readonly outerLabel = new OuterLabel()
  private readonly signalRing = new SignalRing()
  private readonly updatables: Updatable[] = [
    this.core,
    this.icosahedron,
    this.outerIcosahedron,
    this.floatingCubes,
    this.backgroundParticles,
    this.coreRays,
    this.outerLabel,
    this.signalRing,
  ]
  private animationFrameId?: number
  private elapsed = 0
  private minimalMode = false
  private readonly pointer = new THREE.Vector2()
  private previousTime = 0

  constructor(canvas: HTMLCanvasElement) {
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
    this.bloomComposer.renderToScreen = false
    this.bloomComposer.addPass(new RenderPass(this.scene, this.camera))
    this.bloomComposer.addPass(
      new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.8,
        0.45,
        0.75,
      ),
    )

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
    this.resize()
    window.addEventListener('pointermove', this.onPointerMove)
    window.addEventListener('resize', this.resize)
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

  setTheme(theme: Theme) {
    const colors = THEMES[theme]
    this.scene.background = new THREE.Color(colors.background)

    for (const object of [
      this.coreRays.group,
      this.core.mesh,
      this.icosahedron.mesh,
      this.outerIcosahedron.mesh,
    ]) {
      setObjectColor(object, 0xffffff)
    }

    for (const object of [
      this.backgroundParticles.group,
      this.outerLabel.mesh,
      this.signalRing.mesh,
      this.floatingCubes.group,
    ]) {
      setObjectColor(object, colors.foreground)
    }
  }

  dispose() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId)
    }

    window.removeEventListener('resize', this.resize)
    window.removeEventListener('pointermove', this.onPointerMove)
    this.bloomComposer.dispose()
    this.finalComposer.dispose()
    this.renderer.dispose()
  }

  private render = (time: number) => {
    const delta = (time - this.previousTime) / 1_000
    this.previousTime = time
    this.elapsed += delta

    for (const object of this.updatables) {
      object.update(delta)
    }
    this.camera.position.x = Math.sin(this.elapsed * 0.08) * 0.08 + this.pointer.x * 0.12
    this.camera.position.y = Math.cos(this.elapsed * 0.06) * 0.05 + this.pointer.y * 0.09
    this.camera.lookAt(0, 0, 0)
    this.camera.layers.set(1)
    this.bloomComposer.render()
    this.camera.layers.set(0)
    this.finalComposer.render()
    this.animationFrameId = requestAnimationFrame(this.render)
  }

  private resize = () => {
    const { innerWidth: width, innerHeight: height } = window

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
    this.bloomComposer.setSize(width, height)
    this.finalComposer.setSize(width, height)
  }

  private onPointerMove = (event: PointerEvent) => {
    this.pointer.set(
      event.clientX / window.innerWidth - 0.5,
      0.5 - event.clientY / window.innerHeight,
    )
  }

}

function enableBloom(object: THREE.Object3D) {
  object.traverse((child) => child.layers.enable(1))
}

function setObjectColor(object: THREE.Object3D, color: THREE.ColorRepresentation) {
  object.traverse((child) => {
    const material = (child as THREE.Mesh).material
    const materials = Array.isArray(material) ? material : [material]

    for (const item of materials) {
      if (item && hasColor(item)) {
        item.color.set(color)
      }
    }
  })
}

function hasColor(material: THREE.Material): material is THREE.Material & { color: THREE.Color } {
  return 'color' in material && material.color instanceof THREE.Color
}
