import * as THREE from 'three'
import { Icosahedron } from './objects/icosahedron.ts'

export class Scene {
  private readonly scene = new THREE.Scene()
  private readonly camera: THREE.PerspectiveCamera
  private readonly renderer: THREE.WebGLRenderer
  private readonly icosahedron = new Icosahedron()
  private animationFrameId?: number
  private previousTime = 0

  constructor(canvas: HTMLCanvasElement) {
    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      100,
    )
    this.camera.position.z = 6

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    this.scene.add(this.icosahedron.mesh)
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
    this.renderer.dispose()
  }

  private render = (time: number) => {
    const delta = (time - this.previousTime) / 1_000
    this.previousTime = time

    this.icosahedron.update(delta)
    this.renderer.render(this.scene, this.camera)
    this.animationFrameId = requestAnimationFrame(this.render)
  }

  private resize = () => {
    const { innerWidth: width, innerHeight: height } = window

    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(width, height)
  }
}
