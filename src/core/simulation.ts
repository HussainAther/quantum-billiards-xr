import { CIRCLE_CONFIG as config } from './circle-config.ts'
import { reflectCircle, segmentHitsCircle, speed } from './physics.ts'
import type { BallState, Vec2 } from './physics.ts'

export type StepResult = BallState & {
  hit: boolean
  moving: boolean
}

export function shotVelocity(dx: number, dy: number): Vec2 | null {
  const length = Math.hypot(dx, dy)

  if (!Number.isFinite(length) || length < config.minDrag) {
    return null
  }

  const dirX = dx / length
  const dirZ = -dy / length
  const normalizedPower = Math.min(
    Math.max((length - config.minDrag) / config.powerSaturationDrag, 0),
    1
  )
  const launchSpeed = config.minSpeed + normalizedPower * (config.maxSpeed - config.minSpeed)

  return {x: dirX * launchSpeed, z: dirZ * launchSpeed}
}

// One nominal Studio simulation tick. Motion is internally substepped so fast
// shots cannot skip straight through a receiver or deeply penetrate the rail.
export function stepBall(ball: BallState, target?: Vec2): StepResult {
  const initialSpeed = speed(ball.velocity)
  if (!Number.isFinite(initialSpeed) || initialSpeed < config.stopSpeed) {
    return {
      position: {...ball.position},
      velocity: {x: 0, z: 0},
      hit: false,
      moving: false,
    }
  }

  const frameDistance = initialSpeed * config.dt
  const substeps = Math.max(1, Math.ceil(frameDistance / config.maxSubstepDistance))
  const subDt = config.dt / substeps

  let position = {...ball.position}
  let velocity = {...ball.velocity}

  for (let i = 0; i < substeps; i++) {
    const previous = position
    const candidate = {
      x: position.x + velocity.x * subDt,
      z: position.z + velocity.z * subDt,
    }
    const reflected = reflectCircle(
      candidate,
      velocity,
      config.arenaRadius,
      config.ballRadius
    )

    position = reflected.position
    velocity = reflected.velocity

    if (target && segmentHitsCircle(previous, position, target, config.targetHitRadius)) {
      return {
        position: {...config.source},
        velocity: {x: 0, z: 0},
        hit: true,
        moving: false,
      }
    }
  }

  velocity = {
    x: velocity.x * config.friction,
    z: velocity.z * config.friction,
  }

  const moving = speed(velocity) >= config.stopSpeed

  return {
    position,
    velocity: moving ? velocity : {x: 0, z: 0},
    hit: false,
    moving,
  }
}
