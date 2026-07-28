import * as THREE from 'three'

export class SignalRing {
  public readonly mesh: THREE.Sprite

  private signalLevel = 0
  private targetSignalLevel = 0

  constructor(radius = 3.4) {
    this.mesh = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: createSignalTexture(),
        color: 0xc8d8e8,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    )
    this.mesh.scale.setScalar(radius * 2)
  }

  setSignalLevel(level: number) {
    this.targetSignalLevel = THREE.MathUtils.clamp(level, 0, 1)
  }

  update(delta: number) {
    this.signalLevel += (this.targetSignalLevel - this.signalLevel) * Math.min(delta * 2, 1)
    this.mesh.material.rotation += delta * (0.012 + this.signalLevel * 0.04)
    this.mesh.material.opacity = 0.4 + this.signalLevel * 0.3
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
