import './style.css'
import { Scene } from './scene.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<main aria-label="Sage screensaver">
  <canvas aria-label="Animated wireframe icosahedron"></canvas>
</main>
`

const canvas = document.querySelector<HTMLCanvasElement>('canvas')!
const scene = new Scene(canvas)

scene.start()

Object.assign(window, { sageScene: scene })
