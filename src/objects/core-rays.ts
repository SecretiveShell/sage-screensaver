import * as THREE from 'three'

export class CoreRays {
  public readonly group = new THREE.Group()

  private readonly material: THREE.MeshBasicMaterial
  private pulseAmount = 0

  constructor() {
    const positions: number[] = []

    for (let index = 0; index < 12; index += 1) {
      const angle = (index / 12) * Math.PI * 2 + Math.sin(index * 5.3) * 0.12
      const start = 0.22
      const end = 8 + ((index * 17) % 7) * 0.6
      const halfWidth = 0.014 + ((index * 11) % 5) * 0.008
      const direction = new THREE.Vector2(Math.cos(angle), Math.sin(angle))
      const perpendicular = new THREE.Vector2(-direction.y, direction.x)
      const startPoint = direction.clone().multiplyScalar(start)
      const endPoint = direction.clone().multiplyScalar(end)
      const left = endPoint.clone().addScaledVector(perpendicular, halfWidth)
      const right = endPoint.clone().addScaledVector(perpendicular, -halfWidth)

      positions.push(
        startPoint.x,
        startPoint.y,
        -0.08,
        left.x,
        left.y,
        -0.08,
        right.x,
        right.y,
        -0.08,
      )
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))

    this.material = new THREE.MeshBasicMaterial({
      color: 0xe6f6ff,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.group.add(new THREE.Mesh(geometry, this.material))
  }

  pulse() {
    this.pulseAmount = 1
  }

  update(delta: number) {
    this.group.rotation.z += delta * 0.025
    this.pulseAmount = Math.max(0, this.pulseAmount - delta * 1.3)
    this.material.opacity = 0.13 + this.pulseAmount * 0.3
  }
}
