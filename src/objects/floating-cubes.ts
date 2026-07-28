import * as THREE from 'three'

interface Cube {
  angle: number
  mesh: THREE.Mesh
  baseZ: number
  phase: number
  orbitSpeed: number
  radius: number
  rotationSpeed: number
  scatterOffset: THREE.Vector3
  scatterAmount: number
}

export class FloatingCubes {
  public readonly group = new THREE.Group()

  private readonly cubes: Cube[] = []
  private elapsed = 0
  private scatterTarget = 0

  constructor(count = 18) {
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
    })

    for (let index = 0; index < count; index += 1) {
      const angle = Math.random() * Math.PI * 2
      const radius = 0.9 + Math.random() * 0.45
      const baseZ = (Math.random() - 0.5) * 0.4
      const size = 0.045 + Math.random() * 0.065
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), material)

      mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, baseZ)
      mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
      this.group.add(mesh)
      this.cubes.push({
        angle,
        mesh,
        baseZ,
        phase: Math.random() * Math.PI * 2,
        orbitSpeed: 0.08 + Math.random() * 0.12,
        radius,
        rotationSpeed: 0.16 + Math.random() * 0.18,
        scatterOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.8,
          (Math.random() - 0.5) * 1.2,
        ),
        scatterAmount: 0,
      })
    }
  }

  scatter() {
    this.scatterTarget = 1
  }

  gather() {
    this.scatterTarget = 0
  }

  update(delta: number) {
    this.elapsed += delta

    for (const cube of this.cubes) {
      cube.scatterAmount += (this.scatterTarget - cube.scatterAmount) * Math.min(delta * 1.5, 1)
      cube.angle += delta * cube.orbitSpeed
      cube.mesh.position.set(
        Math.cos(cube.angle) * cube.radius,
        Math.sin(cube.angle) * cube.radius,
        cube.baseZ + Math.sin(this.elapsed * cube.rotationSpeed + cube.phase) * 0.035,
      )
      cube.mesh.position.addScaledVector(cube.scatterOffset, cube.scatterAmount)
      cube.mesh.rotation.x += delta * cube.rotationSpeed
      cube.mesh.rotation.y += delta * cube.rotationSpeed * 0.7
    }
  }
}
