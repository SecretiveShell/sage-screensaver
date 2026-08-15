import * as THREE from 'three'

export class Icosahedron {
  public readonly mesh: THREE.Mesh
  private readonly audioScaleAmount: number
  private readonly basePositions: Float32Array
  private deformationElapsed = 0
  private readonly geometry: THREE.IcosahedronGeometry
  private readonly nodeTransform = new THREE.Object3D()
  private readonly nodeSpectrumIndices: Uint8Array
  private readonly nodeVertices: THREE.Vector3[]
  private readonly nodes: THREE.InstancedMesh
  private readonly position: THREE.BufferAttribute | THREE.InterleavedBufferAttribute
  private readonly rotationXSpeed: number
  private readonly rotationYSpeed: number
  private readonly spectrumLevels: Float32Array
  private readonly targetSpectrumLevels: Float32Array
  private targetAudioLevel = 0
  private readonly vertexSpectrumIndices: Uint8Array

  constructor(
    radius = 1,
    rotationXSpeed = 0.25,
    rotationYSpeed = 0.4,
    audioScaleAmount = 0.1,
  ) {
    this.audioScaleAmount = audioScaleAmount
    this.rotationXSpeed = rotationXSpeed
    this.rotationYSpeed = rotationYSpeed

    this.geometry = new THREE.IcosahedronGeometry(radius)
    this.position = this.geometry.getAttribute('position')
    this.basePositions = new Float32Array(this.position.array)

    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
    })

    this.mesh = new THREE.Mesh(this.geometry, material)
    const nodes = createVertexNodes(this.geometry, radius)
    this.nodes = nodes.mesh
    this.nodeVertices = nodes.vertices
    const spectrumIndices = createSpectrumIndices(this.geometry, this.nodeVertices)
    this.vertexSpectrumIndices = spectrumIndices.vertices
    this.nodeSpectrumIndices = spectrumIndices.nodes
    this.spectrumLevels = new Float32Array(this.nodeVertices.length)
    this.targetSpectrumLevels = new Float32Array(this.nodeVertices.length)
    this.mesh.add(this.nodes)
  }

  update(delta: number) {
    const spectrumSmoothing = Math.min(delta * 14, 1)
    for (let index = 0; index < this.spectrumLevels.length; index += 1) {
      this.spectrumLevels[index] += (this.targetSpectrumLevels[index] - this.spectrumLevels[index])
        * spectrumSmoothing
    }
    this.deformationElapsed += delta
    this.mesh.rotation.x += delta * this.rotationXSpeed
    this.mesh.rotation.y += delta * this.rotationYSpeed
    this.updateDeformation()
  }

  setAudioLevel(level: number) {
    this.targetAudioLevel = THREE.MathUtils.clamp(level, 0, 1)
  }

  /** Map visualiser bands onto the icosahedron's unique vertices. */
  setAudioSpectrum(levels: ArrayLike<number> | null) {
    for (let index = 0; index < this.targetSpectrumLevels.length; index += 1) {
      const level = levels ? levels[index % levels.length] ?? 0 : this.targetAudioLevel
      this.targetSpectrumLevels[index] = THREE.MathUtils.clamp(level, 0, 1)
    }
  }

  private updateDeformation() {
    for (let index = 0; index < this.position.count; index += 1) {
      const offset = index * 3
      const vertex = new THREE.Vector3(
        this.basePositions[offset],
        this.basePositions[offset + 1],
        this.basePositions[offset + 2],
      )
      vertex.multiplyScalar(this.deformationScale(vertex, this.vertexSpectrumIndices[index]))
      this.position.setXYZ(index, vertex.x, vertex.y, vertex.z)
    }

    this.position.needsUpdate = true

    for (const [index, vertex] of this.nodeVertices.entries()) {
      this.nodeTransform.position.copy(vertex).multiplyScalar(this.deformationScale(vertex, this.nodeSpectrumIndices[index]))
      this.nodeTransform.updateMatrix()
      this.nodes.setMatrixAt(index, this.nodeTransform.matrix)
    }

    this.nodes.instanceMatrix.needsUpdate = true
  }

  private deformationScale(vertex: THREE.Vector3, spectrumIndex: number) {
    const phase = vertex.x * 13.7 + vertex.y * 19.1 + vertex.z * 23.9
    // Audio changes deformation amplitude, never phase velocity. Keeping this fixed
    // makes a new playback behave like the first one rather than feeling faster.
    const ripple = Math.sin(this.deformationElapsed * 1.8 + phase)
    const amount = this.spectrumLevels[spectrumIndex] * this.audioScaleAmount
    return 1 + amount * (0.75 + ripple * 0.25)
  }
}

function createSpectrumIndices(geometry: THREE.BufferGeometry, nodeVertices: THREE.Vector3[]) {
  const indices = new Map<string, number>()
  for (const [index, vertex] of nodeVertices.entries()) {
    indices.set(vertexKey(vertex), index)
  }

  const position = geometry.getAttribute('position')
  const vertices = new Uint8Array(position.count)
  for (let index = 0; index < position.count; index += 1) {
    vertices[index] = indices.get(vertexKey(new THREE.Vector3().fromBufferAttribute(position, index))) ?? 0
  }

  return { nodes: new Uint8Array(nodeVertices.length).map((_, index) => index), vertices }
}

function vertexKey(vertex: THREE.Vector3) {
  return vertex.toArray().map((value) => value.toFixed(5)).join(',')
}

function createVertexNodes(geometry: THREE.BufferGeometry, radius: number) {
  const position = geometry.getAttribute('position')
  const vertices = new Map<string, THREE.Vector3>()

  for (let index = 0; index < position.count; index += 1) {
    const vertex = new THREE.Vector3().fromBufferAttribute(position, index)
    const key = vertexKey(vertex)
    vertices.set(key, vertex)
  }

  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(radius * 0.014, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
    vertices.size,
  )
  const transform = new THREE.Object3D()

  for (const [index, vertex] of [...vertices.values()].entries()) {
    transform.position.copy(vertex)
    transform.updateMatrix()
    mesh.setMatrixAt(index, transform.matrix)
  }

  mesh.instanceMatrix.needsUpdate = true
  return { mesh, vertices: [...vertices.values()] }
}
