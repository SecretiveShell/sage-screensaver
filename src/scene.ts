import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'
import { Core } from './objects/core.ts'
import { FloatingCubes } from './objects/floating-cubes.ts'
import { Icosahedron } from './objects/icosahedron.ts'

export class Scene {
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly bloomComposer: EffectComposer
  private readonly finalComposer: EffectComposer
  private readonly core = new Core()
  private readonly floatingCubes = new FloatingCubes()
  private readonly icosahedron = new Icosahedron(0.7, 0.12, 0.2)
  private readonly outerIcosahedron = new Icosahedron(1.8, 0.12, -0.18)
  private animationFrameId?: number
  private previousTime = 0

  constructor(canvas: HTMLCanvasElement) {
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
      this.core.mesh,
      this.icosahedron.mesh,
      this.outerIcosahedron.mesh,
      this.floatingCubes.group,
    )
    enableBloom(this.core.mesh)
    enableBloom(this.icosahedron.mesh)
    enableBloom(this.outerIcosahedron.mesh)
    this.resize()
    window.addEventListener('resize', this.resize)
  }

  start() {
    this.previousTime = performance.now()
    this.render(this.previousTime)
  }

  dispose() {
    if (this.animationFrameId !== undefined) {
      cancelAnimationFrame(this.animationFrameId)
    }

    window.removeEventListener('resize', this.resize)
    this.bloomComposer.dispose()
    this.finalComposer.dispose()
    this.renderer.dispose()
  }

  private render = (time: number) => {
    const delta = (time - this.previousTime) / 1_000
    this.previousTime = time

    this.icosahedron.update(delta)
    this.outerIcosahedron.update(delta)
    this.floatingCubes.update(delta)
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
}

function enableBloom(object: THREE.Object3D) {
  object.traverse((child) => child.layers.enable(1))
}
