import * as THREE from 'three'

export class BackgroundParticles {
  public readonly group = new THREE.Group()

  constructor() {
    this.group.add(createParticleField(360, 0.018, 0.36, 0xa9c9e6, 2.3, 7))
    this.group.add(createParticleField(70, 0.042, 0.52, 0xe9f5ff, 2.6, 6.5))
  }

  update(delta: number) {
    this.group.rotation.z += delta * 0.006
  }
}

function createParticleField(
  count: number,
  size: number,
  opacity: number,
  color: THREE.ColorRepresentation,
  innerRadius: number,
  outerRadius: number,
) {
  const positions: number[] = []

  for (let index = 0; index < count; index += 1) {
    const angle = Math.random() * Math.PI * 2
    const radius = innerRadius + Math.sqrt(Math.random()) * (outerRadius - innerRadius)

    positions.push(
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      -2 - Math.random() * 4,
    )
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

  return new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      color,
      size,
      transparent: true,
      opacity,
      depthWrite: false,
    }),
  )
}
