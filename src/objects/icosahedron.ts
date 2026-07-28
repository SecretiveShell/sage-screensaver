import * as THREE from 'three'

export class Icosahedron {
  public readonly mesh: THREE.Mesh
  private readonly rotationXSpeed: number
  private readonly rotationYSpeed: number

  constructor(
    radius = 1,
    rotationXSpeed = 0.25,
    rotationYSpeed = 0.4,
  ) {
    this.rotationXSpeed = rotationXSpeed
    this.rotationYSpeed = rotationYSpeed

    const geometry = new THREE.IcosahedronGeometry(radius)

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
    })

    this.mesh = new THREE.Mesh(geometry, material)
    this.mesh.add(createVertexNodes(geometry, radius))
  }

  update(delta: number) {
    this.mesh.rotation.x += delta * this.rotationXSpeed
    this.mesh.rotation.y += delta * this.rotationYSpeed
  }
}

function createVertexNodes(geometry: THREE.BufferGeometry, radius: number) {
  const position = geometry.getAttribute('position')
  const vertices = new Map<string, THREE.Vector3>()

  for (let index = 0; index < position.count; index += 1) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, index)
    const key = vertex.toArray().map((value) => value.toFixed(5)).join(',')
    vertices.set(key, vertex)
  }

  const nodes = new THREE.InstancedMesh(
    new THREE.SphereGeometry(radius * 0.014, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    vertices.size,
  )
  const transform = new THREE.Object3D()

  for (const [index, vertex] of [...vertices.values()].entries()) {
    transform.position.copy(vertex)
    transform.updateMatrix()
    nodes.setMatrixAt(index, transform.matrix)
  }

  nodes.instanceMatrix.needsUpdate = true
  return nodes
}
