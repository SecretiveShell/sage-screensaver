import * as THREE from 'three'

export class Core {
  public readonly mesh: THREE.Mesh

  private pulseAmount = 0

  constructor(radius = 0.24) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    )
  }

  pulse() {
    this.pulseAmount = 1
  }

  update(delta: number) {
    this.pulseAmount = Math.max(0, this.pulseAmount - delta * 1.6)
    this.mesh.scale.setScalar(1 + this.pulseAmount * 0.6)
  }
}
