import type {Vec2} from './physics.ts'
import type {
  ArenaClass,
  FocusState,
} from './quantum-state.ts'


export type MeasurementTarget = {
  index: number
  position: Vec2
  active: boolean
}


export type TargetMeasurement = {
  target:
    MeasurementTarget

  distance:
    number

  density:
    number

  lane:
    number

  aimScore:
    number

  densityScore:
    number

  powerScore:
    number

  score:
    number
}


export type MeasurementResolution = {
  hit: boolean
  perfect: boolean

  threshold:
    number

  best:
    TargetMeasurement |
    null

  combo:
    number

  baseScore:
    number

  comboBonus:
    number

  perfectBonus:
    number

  targetScore:
    number
}


export type ResolveMeasurementInput = {
  path:
    readonly Vec2[]

  targets:
    readonly
    MeasurementTarget[]

  arenaClass:
    ArenaClass

  focus:
    FocusState

  power:
    number

  energy:
    number

  scarLock:
    boolean

  comboBefore:
    number

  densityAt:
    (
      point: Vec2
    ) => number
}


const clamp = (
  value: number,
  min: number,
  max: number
) =>
  Math.max(
    min,
    Math.min(
      max,
      value
    )
  )


export function distanceToSegment(
  point: Vec2,
  a: Vec2,
  b: Vec2
): number {
  const vx =
    b.x - a.x

  const vz =
    b.z - a.z

  const wx =
    point.x - a.x

  const wz =
    point.z - a.z


  const c =
    clamp(
      (
        wx *
          vx +
        wz *
          vz
      ) /
        (
          vx *
            vx +
          vz *
            vz ||
          1
        ),

      0,
      1
    )


  const px =
    a.x +
    vx * c

  const pz =
    a.z +
    vz * c


  return Math.hypot(
    point.x -
      px,

    point.z -
      pz
  )
}


export function minDistanceToPath(
  point: Vec2,
  path:
    readonly Vec2[]
): number {
  let min =
    Infinity

  for (
    let i = 0;
    i <
    path.length - 1;
    i++
  ) {
    min =
      Math.min(
        min,

        distanceToSegment(
          point,
          path[i],
          path[
            i + 1
          ]
        )
      )
  }

  return min
}


export function measurementLane(
  arenaClass:
    ArenaClass,
  scarLock: boolean
): number {
  //
  // Exact donor constants.
  //

  if (scarLock) {
    return 0.17
  }

  if (
    arenaClass ===
    'Integrable'
  ) {
    return 0.12
  }

  return 0.095
}


export function measurementThreshold(
  arenaClass:
    ArenaClass,
  scarLock: boolean
): number {
  //
  // Exact donor constants.
  //

  if (scarLock) {
    return 0.34
  }

  if (
    arenaClass ===
    'Integrable'
  ) {
    return 0.39
  }

  return 0.48
}


export function measureTarget({
  target,
  path,
  density,
  power,
  focus,
  arenaClass,
  scarLock,
}: {
  target:
    MeasurementTarget

  path:
    readonly Vec2[]

  density:
    number

  power:
    number

  focus:
    FocusState

  arenaClass:
    ArenaClass

  scarLock:
    boolean
}): TargetMeasurement {
  const distance =
    minDistanceToPath(
      target.position,
      path
    )


  const lane =
    measurementLane(
      arenaClass,
      scarLock
    )


  const aimScore =
    clamp(
      1 -
        distance /
          lane,

      0,
      1
    )


  const densityScore =
    0.32 +
    density *
      0.68


  const powerScore =
    clamp(
      power / 74,

      0.35,
      1.25
    )


  const score =
    aimScore *
    densityScore *
    powerScore *
    (
      0.55 +
      focus.coherence *
        0.8
    )


  return {
    target,

    distance,
    density,
    lane,

    aimScore,
    densityScore,
    powerScore,

    score,
  }
}


export function resolveMeasurement({
  path,
  targets,
  arenaClass,
  focus,
  power,
  energy,
  scarLock,
  comboBefore,
  densityAt,
}: ResolveMeasurementInput):
MeasurementResolution {
  let best:
    TargetMeasurement |
    null =
      null


  for (
    const target
    of targets
  ) {
    if (
      !target.active
    ) {
      continue
    }


    const density =
      densityAt(
        target.position
      )


    const measurement =
      measureTarget({
        target,
        path,
        density,
        power,
        focus,
        arenaClass,
        scarLock,
      })


    if (
      !best ||
      measurement.score >
        best.score
    ) {
      best =
        measurement
    }
  }


  const threshold =
    measurementThreshold(
      arenaClass,
      scarLock
    )


  if (
    !best ||
    best.score <
      threshold
  ) {
    return {
      hit: false,
      perfect: false,

      threshold,
      best,

      combo: 0,

      baseScore: 0,
      comboBonus: 0,
      perfectBonus: 0,
      targetScore: 0,
    }
  }


  //
  // Exact donor perfect-hit rule.
  //

  const perfect =
    best.score >=
      threshold +
        (
          scarLock
            ? 0.38
            : 0.32
        ) &&
    focus.coherence >=
      0.68


  const combo =
    comboBefore +
    1


  //
  // Exact donor target scoring.
  //

  const baseScore =
    Math.round(
      (
        80 +
        energy *
          0.25 +
        power *
          0.5 +
        best.score *
          120
      ) *
        (
          scarLock
            ? 2
            : 1
        )
    )


  const comboBonus =
    Math.max(
      0,
      combo - 1
    ) * 55


  const perfectBonus =
    perfect
      ? 90
      : 0


  const targetScore =
    baseScore +
    comboBonus +
    perfectBonus


  return {
    hit: true,
    perfect,

    threshold,
    best,

    combo,

    baseScore,
    comboBonus,
    perfectBonus,
    targetScore,
  }
}


//
// Convenience helper for trajectory.ts output.
//

export function samplesToPath(
  samples:
    readonly {
      point: Vec2
    }[]
): Vec2[] {
  return samples.map(
    (
      sample
    ) => ({
      ...sample.point,
    })
  )
}
