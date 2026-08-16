import * as THREE from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

/** Renders the base scene and bloom layer before compositing them together. */
export class BloomRenderer {
  readonly bloomPass: UnrealBloomPass
  private readonly bloomComposer: EffectComposer
  private readonly camera: THREE.Camera
  private readonly finalComposer: EffectComposer

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.camera = camera
    this.bloomComposer = new EffectComposer(renderer)
    this.bloomComposer.setPixelRatio(1)
    this.bloomComposer.renderToScreen = false
    this.bloomComposer.addPass(new RenderPass(scene, camera))
    this.bloomPass = new UnrealBloomPass(new THREE.Vector2(), 0.8, 0.45, 0.75)
    this.bloomComposer.addPass(this.bloomPass)

    this.finalComposer = new EffectComposer(renderer)
    this.finalComposer.addPass(new RenderPass(scene, camera))
    this.finalComposer.addPass(new ShaderPass(createCompositeMaterial(this.bloomComposer), 'baseTexture'))
  }

  resize(width: number, height: number) {
    this.bloomComposer.setSize(width, height)
    this.finalComposer.setSize(width, height)
  }

  render() {
    this.camera.layers.set(1)
    this.bloomComposer.render()
    this.camera.layers.set(0)
    this.finalComposer.render()
  }

  dispose() {
    this.bloomComposer.dispose()
    this.finalComposer.dispose()
  }
}

function createCompositeMaterial(bloomComposer: EffectComposer) {
  return new THREE.ShaderMaterial({
    uniforms: {
      baseTexture: { value: null },
      bloomTexture: { value: bloomComposer.renderTarget2.texture },
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
  })
}
