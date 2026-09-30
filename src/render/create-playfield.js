import * as THREE from 'three'
import { getArena, boundaryPoints } from '../core/arenas.js'

function toWorld(point, height = 0) {
  return new THREE.Vector3(
    point.x,
    height,
    point.y
  )
}

function cylinderBetween(a, b, radius, material) {
  const midpoint = new THREE.Vector3()
    .addVectors(a, b)
    .multiplyScalar(0.5)

  const direction = new THREE.Vector3()
    .subVectors(b, a)

  const length = direction.length()

  const geometry = new THREE.CylinderGeometry(
    radius,
    radius,
    length,
    10
  )

  const mesh = new THREE.Mesh(geometry, material)

  mesh.position.copy(midpoint)

  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  )

  return mesh
}

export function createPlayfield() {
  const arena = getArena('circle')

  const root = new THREE.Group()
  root.name = 'QuantumBilliardsPlayfield'

  //
  // PLAY SURFACE
  //

  const tableGeometry = new THREE.CylinderGeometry(
    arena.radius,
    arena.radius,
    0.055,
    96
  )

  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x071018,
    roughness: 0.36,
    metalness: 0.12,
  })

  const table = new THREE.Mesh(
    tableGeometry,
    tableMaterial
  )

  table.position.y = -0.025

  table.name = 'PlaySurface'
  root.add(table)

  //
  // BOUNDARY / RAILS
  //

  const boundaryGroup = new THREE.Group()
  boundaryGroup.name = 'Boundary'

  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x36d9e8,
    emissive: 0x083f48,
    emissiveIntensity: 1.1,
    roughness: 0.28,
    metalness: 0.32,
  })

  const points = boundaryPoints(arena)

  for (let i = 0; i < points.length; i++) {
    const current = points[i]
    const next = points[(i + 1) % points.length]

    const a = toWorld(current, 0.055)
    const b = toWorld(next, 0.055)

    const rail = cylinderBetween(
      a,
      b,
      0.013,
      railMaterial
    )

    boundaryGroup.add(rail)
  }

  root.add(boundaryGroup)

  //
  // SOURCE BALL
  //

  const sourceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc64b,
    emissive: 0x503000,
    emissiveIntensity: 1,
    roughness: 0.25,
  })

  const sourceBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 32, 24),
    sourceMaterial
  )

  sourceBall.position.set(
    arena.source.x,
    0.09,
    arena.source.y
  )

  sourceBall.name = 'SourceBall'
  root.add(sourceBall)

  //
  // SOURCE HALO
  //

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(0.075, 0.11, 48),
    new THREE.MeshBasicMaterial({
      color: 0xffc64b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    })
  )

  halo.rotation.x = -Math.PI / 2
  halo.position.set(
    arena.source.x,
    0.035,
    arena.source.y
  )

  root.add(halo)

  //
  // TARGETS
  //

  const targetGroup = new THREE.Group()
  targetGroup.name = 'Targets'

  arena.targets.forEach((targetData, index) => {
    const target = new THREE.Mesh(
      new THREE.RingGeometry(0.07, 0.105, 48),
      new THREE.MeshStandardMaterial({
        color: 0xff4fb7,
        emissive: 0x64183f,
        emissiveIntensity: 1.5,
        side: THREE.DoubleSide,
      })
    )

    target.rotation.x = -Math.PI / 2

    target.position.set(
      targetData.x,
      0.038,
      targetData.y
    )

    target.name = `Target-${index}`

    targetGroup.add(target)
  })

  root.add(targetGroup)

  //
  // Metadata useful later for XR interaction.
  //

  root.userData.arena = arena.id
  root.userData.sourceBall = sourceBall
  root.userData.targetGroup = targetGroup

  return root
}
