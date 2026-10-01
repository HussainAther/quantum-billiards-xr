import type {Vec2} from './physics.ts'


export type GeometryId =
  | 'circle'
  | 'triangle'
  | 'stadium'
  | 'star'


export type ArenaClass =
  | 'Integrable'
  | 'Chaotic'
  | 'Pseudointegrable'


export type ScarInfo = {
  exact: boolean
  strength: number
  nearest: number
  distance: number
}


export type FocusState = {
  coherence: number
  epsilon: number

  label:
    | 'Scar locked'
    | 'Resonant'
    | 'Stable'
    | 'Turbulent'
    | 'Diffuse'

  scarLock: boolean
}


export type QuantumStateInput = {
  geometry: GeometryId
  arenaClass: ArenaClass
  energy: number
  power: number
}


export const SCAR_STATES: Readonly<
  Record<
    GeometryId,
    readonly number[]
  >
> = Object.freeze({
  circle: Object.freeze([
    21,
    34,
    55,
    89,
    144,
    233,
    377,
  ]),

  triangle: Object.freeze([
    24,
    48,
    96,
    192,
    384,
  ]),

  stadium: Object.freeze([
    34,
    55,
    89,
    144,
    233,
    377,
  ]),

  star: Object.freeze([
    40,
    80,
    120,
    240,
    360,
    480,
  ]),
})


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


export function nearestScar(
  geometry: GeometryId,
  energy: number
) {
  const list =
    SCAR_STATES[
      geometry
    ]

  let best =
    list[0]

  let distance =
    Math.abs(
      energy - best
    )

  for (
    const candidate
    of list
  ) {
    const next =
      Math.abs(
        energy -
        candidate
      )

    if (
      next <
      distance
    ) {
      best =
        candidate

      distance =
        next
    }
  }

  return {
    value:
      best,

    distance,
  }
}


export function scarStrength(
  geometry: GeometryId,
  energy: number
): ScarInfo {
  const nearest =
    nearestScar(
      geometry,
      energy
    )

  //
  // Exact donor behavior:
  //
  // Circle/Triangle scars have a wider
  // energy falloff than Stadium/Star.
  //

  const falloff =
    geometry ===
      'circle' ||
    geometry ===
      'triangle'
      ? 9
      : 5

  return {
    exact:
      nearest.distance ===
      0,

    strength:
      clamp(
        1 -
          nearest.distance /
            falloff,

        0,
        1
      ),

    nearest:
      nearest.value,

    distance:
      nearest.distance,
  }
}


export function computeFocus({
  geometry,
  arenaClass,
  energy,
  power,
}: QuantumStateInput):
FocusState {
  const scars =
    scarStrength(
      geometry,
      energy
    )

  const energyPressure =
    energy / 500

  const powerPressure =
    Math.max(
      0,
      (
        power -
        76
      ) / 42
    )

  //
  // Donor intentionally prevents
  // Integrable arenas from entering
  // true Scar Lock.
  //

  const scarLock =
    arenaClass !==
      'Integrable' &&
    scars.exact


  let coherence =
    0.9 -
    energyPressure *
      0.12 -
    powerPressure *
      0.09


  if (
    arenaClass ===
    'Chaotic'
  ) {
    coherence =
      0.38 -
      energyPressure *
        0.08 +
      scars.strength *
        0.58 -
      powerPressure *
        0.08
  }


  if (
    arenaClass ===
    'Pseudointegrable'
  ) {
    coherence =
      0.48 -
      energyPressure *
        0.11 +
      scars.strength *
        0.46 -
      powerPressure *
        0.07
  }


  if (
    arenaClass ===
    'Integrable'
  ) {
    coherence +=
      scars.strength *
      0.08
  }


  coherence =
    clamp(
      coherence,
      0.12,
      0.99
    )


  const epsilon =
    clamp(
      0.002 +
        energyPressure *
          energyPressure *
          0.04 +
        (
          1 -
          coherence
        ) *
          0.018,

      0.002,
      0.08
    )


  let label:
    FocusState['label']


  if (scarLock) {
    label =
      'Scar locked'
  } else if (
    arenaClass ===
      'Integrable' &&
    scars.exact
  ) {
    label =
      'Resonant'
  } else if (
    coherence >
    0.72
  ) {
    label =
      'Stable'
  } else if (
    coherence >
    0.48
  ) {
    label =
      'Turbulent'
  } else {
    label =
      'Diffuse'
  }


  return {
    coherence,
    epsilon,
    label,
    scarLock,
  }
}


//
// ============================================================
// CIRCLE FIELD
// ============================================================
//
// This is the donor Circle fieldValue() branch adapted
// from x/y to x/z.
//
// We are intentionally implementing Circle first.
// Triangle/Stadium/Star field functions should be ported when
// those arenas are actually introduced into XR.
//

export function circleFieldValue(
  point: Vec2,
  timeMs: number,
  energy: number
): number {
  //
  // Donor signed distance:
  //
  // 0.84 - radius
  //
  // and a 0.16-wide fade toward the rail.
  //

  const signedDistance =
    0.84 -
    Math.hypot(
      point.x,
      point.z
    )

  const fade =
    clamp(
      signedDistance /
        0.16,

      0,
      1
    )

  if (
    fade <= 0
  ) {
    return 0
  }


  const t =
    timeMs *
    0.00045


  const r =
    Math.hypot(
      point.x,
      point.z
    ) / 0.84


  const angle =
    Math.atan2(
      point.z,
      point.x
    )


  const m =
    2 +
    (
      energy %
      9
    )


  const radial =
    1 +
    (
      Math.floor(
        energy / 34
      ) %
      8
    )


  const psi =
    Math.sin(
      radial *
        Math.PI *
        (
          1 -
          r
        ) +
      t * 2.2
    ) *
      Math.cos(
        m *
          angle -
        t * 1.4
      ) +

    0.42 *
      Math.sin(
        (
          radial +
          2
        ) *
          Math.PI *
          (
            1 -
            r *
              r
          ) -
        t
      ) *
      Math.cos(
        (
          m +
          3
        ) *
          angle +
        t * 0.8
      )


  return (
    clamp(
      (
        psi *
        psi
      ) *
        0.26,

      0,
      1
    ) *
    fade
  )
}
