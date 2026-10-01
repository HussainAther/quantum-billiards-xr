import type {
  GeometryId,
} from './quantum-state.ts'


export type Challenge = {
  name: string
  lesson: string

  geometry:
    GeometryId

  targetIndices:
    readonly number[]

  energy: number

  yaw: number
  pitch: number
  power: number

  par: number
  time: number

  objective: string
  hint: string
}


export type ChallengeGrade =
  | 'S'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'F'


export type ChallengeCompletionInput = {
  cleared: boolean

  challenge:
    Challenge

  shotsTaken:
    number

  timeRemaining:
    number

  scarHits:
    number
}


export type ChallengeBonuses = {
  timeBonus: number
  parBonus: number
  scarBonus: number
  clearBonus: number
  totalBonus: number
}


export const CHALLENGES:
readonly Challenge[] =
  Object.freeze([
    Object.freeze({
      name:
        'First Observation',

      lesson:
        '01 / DIRECT CONTROL',

      geometry:
        'circle',

      targetIndices:
        Object.freeze([
          0,
        ]),

      energy:
        55,

      yaw:
        -33,

      pitch:
        6,

      power:
        66,

      par:
        2,

      time:
        95,

      objective:
        'Translate intention into one clean contact.',

      hint:
        'Follow the bright path. Make a small adjustment, then commit.',
    }),

    Object.freeze({
      name:
        'Honest Reflection',

      lesson:
        '02 / BANK GEOMETRY',

      geometry:
        'circle',

      targetIndices:
        Object.freeze([
          1,
          2,
        ]),

      energy:
        55,

      yaw:
        18,

      pitch:
        6,

      power:
        68,

      par:
        3,

      time:
        100,

      objective:
        'Use the rail to resolve two receivers.',

      hint:
        'A bank is predictable. Read the angle before adding power.',
    }),

    Object.freeze({
      name:
        'Impulse Window',

      lesson:
        '03 / ENERGY CONTROL',

      geometry:
        'triangle',

      targetIndices:
        Object.freeze([
          0,
          2,
        ]),

      energy:
        96,

      yaw:
        8,

      pitch:
        7,

      power:
        58,

      par:
        3,

      time:
        105,

      objective:
        'Change impulse without losing the route.',

      hint:
        'Enough power reaches the receiver. Too much makes the path harder to read.',
    }),

    Object.freeze({
      name:
        'Scar Calibration',

      lesson:
        '04 / REPEATING STATE',

      geometry:
        'stadium',

      targetIndices:
        Object.freeze([
          0,
          1,
          3,
        ]),

      energy:
        144,

      yaw:
        -6,

      pitch:
        8,

      power:
        78,

      par:
        4,

      time:
        115,

      objective:
        'Calibrate a repeating bank, then trust it.',

      hint:
        'Use Calibrate Scar once. Watch uncertainty collapse into a stable lane.',
    }),

    Object.freeze({
      name:
        'Many-Worlds Run',

      lesson:
        '05 / SYNTHESIS',

      geometry:
        'star',

      targetIndices:
        Object.freeze([
          0,
          1,
          2,
          3,
        ]),

      energy:
        240,

      yaw:
        4,

      pitch:
        8,

      power:
        80,

      par:
        5,

      time:
        135,

      objective:
        'Turn an impossible-looking route into one elegant sequence.',

      hint:
        'The teeth are rails. Look for the path that resolves more than one receiver.',
    }),

    Object.freeze({
      name:
        'Final Scar Run',

      lesson:
        '06 / MASTERY',

      geometry:
        'stadium',

      targetIndices:
        Object.freeze([
          0,
          1,
          2,
          3,
        ]),

      energy:
        233,

      yaw:
        0,

      pitch:
        9,

      power:
        86,

      par:
        3,

      time:
        82,

      objective:
        'Clear the house table with deliberate, economical motion.',

      hint:
        'Fast, clean banks beat loud power.',
    }),
  ])


export function getChallenge(
  index: number
): Challenge {
  const challenge =
    CHALLENGES[
      index
    ]

  if (!challenge) {
    throw new RangeError(
      `Unknown challenge index: ${index}`
    )
  }

  return challenge
}


export function getChallengesForGeometry(
  geometry:
    GeometryId
) {
  return CHALLENGES.filter(
    (
      challenge
    ) =>
      challenge.geometry ===
      geometry
  )
}


export function challengeTargets(
  challenge:
    Challenge
) {
  return [
    ...challenge.targetIndices,
  ]
}


export function challengeBonuses({
  cleared,
  challenge,
  shotsTaken,
  timeRemaining,
  scarHits,
}: ChallengeCompletionInput):
ChallengeBonuses {
  //
  // Exact donor completion-bonus rules.
  //

  const timeBonus =
    cleared
      ? Math.ceil(
          timeRemaining
        ) * 8
      : 0


  const parBonus =
    cleared
      ? Math.max(
          0,
          challenge.par -
            shotsTaken
        ) * 150
      : 0


  const scarBonus =
    cleared
      ? scarHits *
        120
      : 0


  const clearBonus =
    cleared
      ? 500
      : 0


  return {
    timeBonus,
    parBonus,
    scarBonus,
    clearBonus,

    totalBonus:
      timeBonus +
      parBonus +
      scarBonus +
      clearBonus,
  }
}


export function gradeChallenge({
  cleared,
  challenge,
  shotsTaken,
  timeRemaining,
  scarHits,
}: ChallengeCompletionInput):
ChallengeGrade {
  if (!cleared) {
    return 'F'
  }


  let points = 0


  if (
    shotsTaken <=
    challenge.par
  ) {
    points += 2
  }


  if (
    shotsTaken <
    challenge.par
  ) {
    points += 1
  }


  if (
    timeRemaining >=
    challenge.time *
      0.45
  ) {
    points += 1
  }


  if (
    timeRemaining >=
    challenge.time *
      0.68
  ) {
    points += 1
  }


  if (
    scarHits >=
    1
  ) {
    points += 1
  }


  if (
    scarHits >=
    3
  ) {
    points += 1
  }


  if (
    points >= 6
  ) {
    return 'S'
  }


  if (
    points >= 5
  ) {
    return 'A'
  }


  if (
    points >= 3
  ) {
    return 'B'
  }


  if (
    points >= 2
  ) {
    return 'C'
  }


  return 'D'
}
