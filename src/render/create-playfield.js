import * as THREE from 'three'

export function createPlayfield() {
  const root = new THREE.Group()
  root.name = 'QuantumBilliardsPlayfield'

  // Circular play surface
  const tableGeometry = new THREE.CylinderGeometry(
    1,
    1,
    0.08,
    96
  )

  const tableMaterial = new THREE.MeshStandardMaterial({
    color: 0x182033,
    roughness: 0.55,
    metalness: 0.15,
  })

  const table = new THREE.Mesh(tableGeometry, tableMaterial)
  table.position.y = 0
  root.add(table)

  // Outer rail
  const railGeometry = new THREE.TorusGeometry(
    1,
    0.055,
    16,
    96
  )

  const railMaterial = new THREE.MeshStandardMaterial({
    color: 0x5d76a8,
    roughness: 0.3,
    metalness: 0.45,
  })

  const rail = new THREE.Mesh(railGeometry, railMaterial)
  rail.rotation.x = Math.PI / 2
  rail.position.y = 0.07
  root.add(rail)

  // Source ball
  const sourceGeometry = new THREE.SphereGeometry(
    0.08,
    32,
    32
  )

  const sourceMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
  })

  const sourceBall = new THREE.Mesh(
    sourceGeometry,
    sourceMaterial
  )

  sourceBall.position.set(-0.45, 0.13, 0.15)
  sourceBall.name = 'SourceBall'
  root.add(sourceBall)

  // Target
  const targetGeometry = new THREE.TorusGeometry(
    0.11,
    0.025,
    16,
    48
  )

  const targetMaterial = new THREE.MeshStandardMaterial({
    color: 0x66ffcc,
    emissive: 0x114433,
  })

  const target = new THREE.Mesh(
    targetGeometry,
    targetMaterial
  )

  target.rotation.x = Math.PI / 2
  target.position.set(0.45, 0.095, -0.2)
  target.name = 'Target'
  root.add(target)

  return root
}
