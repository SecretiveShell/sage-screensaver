import * as THREE from 'three'

export class Icosahedron {
  public readonly mesh: THREE.Mesh

  constructor(radius = 1) {
    const geometry = new THREE.IcosahedronGeometry(radius)

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
    })

    this.mesh = new THREE.Mesh(geometry, material)
  }

  update(delta: number) {
    this.mesh.rotation.x += delta * 0.25
    this.mesh.rotation.y += delta * 0.4
  }
}
