import * as THREE from 'three'

export class Core {
  public readonly mesh: THREE.Mesh

  constructor(radius = 0.24) {
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 32, 32),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    )
  }
}
