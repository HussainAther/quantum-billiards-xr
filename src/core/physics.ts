export type Vec2 = {
  x: number
  z: number
}

export type BallState = {
  position: Vec2
  velocity: Vec2
}

export function reflectCircle(
  position: Vec2,
  velocity: Vec2,
  arenaRadius: number,
  ballRadius: number
): BallState {
  const distance = Math.hypot(
    position.x,
    position.z
  )

  const maxDistance =
    arenaRadius - ballRadius

  if (distance <= maxDistance) {
    return {
      position,
      velocity,
    }
  }

  const nx = position.x / distance
  const nz = position.z / distance

  const dot =
    velocity.x * nx +
    velocity.z * nz

  return {
    position: {
      x: nx * maxDistance,
      z: nz * maxDistance,
    },

    velocity: {
      x:
        velocity.x -
        2 * dot * nx,

      z:
        velocity.z -
        2 * dot * nz,
    },
  }
}
