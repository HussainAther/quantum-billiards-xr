import {CIRCLE_CONFIG} from './circle-config.ts'
import {reflectCircle, speed} from './physics.ts'
import type {BallState, Vec2} from './physics.ts'
import {shotVelocity} from './simulation.ts'

export type TrajectorySample = {
  point: Vec2
  bounce?: boolean
}

const normalize = (p: Vec2): Vec2 => {
  const length = Math.hypot(p.x, p.z) || 1

  return {
    x: p.x / length,
    z: p.z / length,
  }
}

const signedDistance = (p: Vec2) =>
  CIRCLE_CONFIG.arenaRadius -
  Math.hypot(p.x, p.z)

/**
 * Donor-compatible tracer from the original WebAR game.
 *
 * This intentionally treats the billiard as a point particle because
 * it exists for source-game parity tests.
 */
export function traceCirclePath(
  yawDeg: number,
  power = 66
): Vec2[] {
  if (
    !Number.isFinite(yawDeg) ||
    !Number.isFinite(power)
  ) {
    throw new RangeError(
      'Finite yaw and power required'
    )
  }

  let p = {
    ...CIRCLE_CONFIG.source,
  }

  let d = normalize({
    x: Math.cos(
      yawDeg * Math.PI / 180
    ),

    z: Math.sin(
      yawDeg * Math.PI / 180
    ),
  })

  const points: Vec2[] = [
    {...p},
  ]

  const maxSteps = Math.round(
    210 +
    Math.min(
      100,
      Math.max(18, power)
    ) * 7.6
  )

  let bounces = 0

  for (
    let i = 0;
    i < maxSteps;
    i++
  ) {
    const next = {
      x: p.x + d.x * 0.012,
      z: p.z + d.z * 0.012,
    }

    if (
      signedDistance(next) >= 0
    ) {
      p = next

      if (i % 2 === 0) {
        points.push({...p})
      }

      continue
    }

    const e = 0.0025

    const n = normalize({
      x:
        signedDistance({
          x: p.x + e,
          z: p.z,
        }) -
        signedDistance({
          x: p.x - e,
          z: p.z,
        }),

      z:
        signedDistance({
          x: p.x,
          z: p.z + e,
        }) -
        signedDistance({
          x: p.x,
          z: p.z - e,
        }),
    })

    const dot =
      d.x * n.x +
      d.z * n.z

    d = normalize({
      x:
        d.x -
        2 * dot * n.x,

      z:
        d.z -
        2 * dot * n.z,
    })

    p = {
      x:
        p.x +
        n.x * 0.018,

      z:
        p.z +
        n.z * 0.018,
    }

    points.push({...p})

    bounces++

    if (bounces > 9) {
      break
    }
  }

  return points
}

/**
 * Physics-matched trajectory used by the 8th Wall version.
 *
 * Unlike traceCirclePath(), this respects the ball's finite radius and
 * therefore uses the same center boundary as the live simulation.
 */
export function predictCircleTrajectory(
  position: Vec2,
  velocity: Vec2,
  {
    maxBounces = 8,
    stepDistance = 0.02,
    maxSamples = 1000,
  } = {}
): TrajectorySample[] {
  if (speed(velocity) === 0) {
    return [
      {
        point: {...position},
      },
    ]
  }

  let state: BallState = {
    position: {
      ...position,
    },

    velocity:
      normalize(velocity),
  }

  const samples:
    TrajectorySample[] = [
      {
        point: {
          ...position,
        },
      },
    ]

  let bounces = 0

  for (
    let i = 0;
    i < maxSamples;
    i++
  ) {
    const candidate = {
      x:
        state.position.x +
        state.velocity.x *
          stepDistance,

      z:
        state.position.z +
        state.velocity.z *
          stepDistance,
    }

    const reflected =
      reflectCircle(
        candidate,
        state.velocity,
        CIRCLE_CONFIG.arenaRadius,
        CIRCLE_CONFIG.ballRadius
      )

    const bounced =
      Math.abs(
        reflected.velocity.x -
        state.velocity.x
      ) > 1e-9 ||
      Math.abs(
        reflected.velocity.z -
        state.velocity.z
      ) > 1e-9

    state = reflected

    samples.push({
      point: {
        ...state.position,
      },

      bounce: bounced,
    })

    if (bounced) {
      bounces++

      if (
        bounces >= maxBounces
      ) {
        break
      }
    }
  }

  return samples
}

export function predictCircleTrajectoryFromDrag(
  position: Vec2,
  dx: number,
  dy: number,
  options?:
    Parameters<
      typeof predictCircleTrajectory
    >[2]
) {
  const velocity =
    shotVelocity(dx, dy)

  if (!velocity) {
    return [
      {
        point: {
          ...position,
        },
      },
    ]
  }

  return predictCircleTrajectory(
    position,
    velocity,
    options
  )
}
