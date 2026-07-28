import * as THREE from 'three'

export class SignalRing {
  public readonly mesh: THREE.Sprite

  constructor(radius = 3.4) {
    this.mesh = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createSignalTexture(),
        color: 0xc8d8e8,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      }),
    )
    this.mesh.scale.setScalar(radius * 2)
  }

  update(delta: number) {
    this.mesh.material.rotation += delta * 0.012
  }
}

function createSignalTexture() {
  const size = 1024
  const center = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const context = canvas.getContext('2d')!
  context.lineCap = 'round'

  for (let index = 0; index < 180; index += 1) {
    const angle = (index / 180) * Math.PI * 2
    const isMajor = index % 15 === 0
    const length = isMajor ? 32 : 5 + ((index * 29) % 20)
    const outerRadius = 492
    const innerRadius = outerRadius - length
    const cosine = Math.cos(angle)
    const sine = Math.sin(angle)

    context.strokeStyle = isMajor
      ? 'rgba(255, 255, 255, 0.92)'
      : 'rgba(255, 255, 255, 0.5)'
    context.lineWidth = isMajor ? 2.2 : 1.2
    context.beginPath()
    context.moveTo(center + cosine * innerRadius, center + sine * innerRadius)
    context.lineTo(center + cosine * outerRadius, center + sine * outerRadius)
    context.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}
