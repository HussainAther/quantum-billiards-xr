export type Vec2 = {
  x: number
  z: number
}

export type BallState = {
  position: Vec2
  velocity: Vec2
}

export const speed = (velocity: Vec2) => Math.hypot(velocity.x, velocity.z)

export const distance = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.z - b.z)

export function reflectCircle(
  position: Vec2,
  velocity: Vec2,
  arenaRadius: number,
  ballRadius: number
): BallState {
  const radialDistance = Math.hypot(position.x, position.z)
  const maxDistance = arenaRadius - ballRadius

  if (radialDistance <= maxDistance) {
    return {
      position: {...position},
      velocity: {...velocity},
    }
  }

  // Degenerate origin case is impossible for a positive radius boundary, but
  // guard it anyway so invalid input never emits NaNs.
  if (radialDistance === 0) {
    return {
      position: {x: 0, z: 0},
      velocity: {...velocity},
    }
  }

  const nx = position.x / radialDistance
  const nz = position.z / radialDistance
  const dot = velocity.x * nx + velocity.z * nz

  return {
    position: {
      x: nx * maxDistance,
      z: nz * maxDistance,
    },
    velocity: {
      x: velocity.x - 2 * dot * nx,
      z: velocity.z - 2 * dot * nz,
    },
  }
}

// Squared distance from p to a finite segment ab. Useful for reliable target
// capture when a fast ball crosses the target between simulation samples.
export function pointSegmentDistanceSquared(p: Vec2, a: Vec2, b: Vec2) {
  const abx = b.x - a.x
  const abz = b.z - a.z
  const lengthSquared = abx * abx + abz * abz

  if (lengthSquared === 0) {
    const dx = p.x - a.x
    const dz = p.z - a.z
    return dx * dx + dz * dz
  }

  const t = Math.max(0, Math.min(1,
    ((p.x - a.x) * abx + (p.z - a.z) * abz) / lengthSquared
  ))
  const qx = a.x + t * abx
  const qz = a.z + t * abz
  const dx = p.x - qx
  const dz = p.z - qz
  return dx * dx + dz * dz
}

export function segmentHitsCircle(a: Vec2, b: Vec2, center: Vec2, radius: number) {
  return pointSegmentDistanceSquared(center, a, b) < radius * radius
}
