import { CIRCLE_CONFIG as config } from './circle-config.ts'
import { reflectCircle } from './physics.ts'
import type { BallState, Vec2 } from './physics.ts'

export function shotVelocity(dx: number, dy: number): Vec2 | null {
  const length = Math.hypot(dx, dy)

  if (!Number.isFinite(length) || length < config.minDrag) {
    return null
  }

  const dirX = dx / length
  const dirZ = -dy / length

  // 8th Wall screen drags are small normalized values. Once the gesture is
  // valid, map it into a useful billiards-speed range instead of allowing
  // nearly-zero launch velocities.
  const minSpeed = 1.5
  const normalizedPower = Math.min(
    Math.max((length - config.minDrag) / 0.15, 0),
    1
  )
  const speed = minSpeed + normalizedPower * (config.maxSpeed - minSpeed)

  return {x: dirX * speed, z: dirZ * speed}
}

// One Studio simulation tick.
export function stepBall(ball: BallState, target?: Vec2) {
  const result = reflectCircle(
    {
      x: ball.position.x + ball.velocity.x * config.dt,
      z: ball.position.z + ball.velocity.z * config.dt,
    },
    ball.velocity,
    config.arenaRadius,
    config.ballRadius
  )

  const hit = !!target && Math.hypot(
    result.position.x - target.x,
    result.position.z - target.z
  ) < config.targetHitRadius

  if (hit) {
    return {
      position: {...config.source},
      velocity: {x: 0, z: 0},
      hit,
      moving: false,
    }
  }

  const velocity = {
    x: result.velocity.x * config.friction,
    z: result.velocity.z * config.friction,
  }

  const moving = Math.hypot(velocity.x, velocity.z) >= config.stopSpeed

  return {
    ...result,
    velocity: moving ? velocity : {x: 0, z: 0},
    hit,
    moving,
  }
}
