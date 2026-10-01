import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SCAR_STATES,
  nearestScar,
  scarStrength,
  computeFocus,
  circleFieldValue,
} from '../src/core/quantum-state.ts'

import {
  distanceToSegment,
  minDistanceToPath,
  measurementLane,
  measurementThreshold,
  measureTarget,
  resolveMeasurement,
  samplesToPath,
} from '../src/core/measurement.ts'

import {
  CHALLENGES,
  getChallenge,
  getChallengesForGeometry,
  challengeTargets,
  challengeBonuses,
  gradeChallenge,
} from '../src/core/challenges.ts'


const near = (
  a,
  b,
  epsilon = 1e-12
) => {
  assert.ok(
    Math.abs(a - b) <= epsilon,
    `${a} != ${b}`
  )
}


//
// ============================================================
// SCAR STATES
// ============================================================
//

test(
  'Circle scar table contains donor resonance energies',
  () => {
    assert.deepEqual(
      SCAR_STATES.circle,
      [
        21,
        34,
        55,
        89,
        144,
        233,
        377,
      ]
    )
  }
)


test(
  'nearestScar returns exact Circle scar energy',
  () => {
    const result =
      nearestScar(
        'circle',
        55
      )

    assert.equal(
      result.value,
      55
    )

    assert.equal(
      result.distance,
      0
    )
  }
)


test(
  'nearestScar chooses closest Circle scar',
  () => {
    const result =
      nearestScar(
        'circle',
        60
      )

    assert.equal(
      result.value,
      55
    )

    assert.equal(
      result.distance,
      5
    )
  }
)


test(
  'scarStrength is one at exact Circle resonance',
  () => {
    const result =
      scarStrength(
        'circle',
        55
      )

    assert.equal(
      result.exact,
      true
    )

    near(
      result.strength,
      1
    )

    assert.equal(
      result.nearest,
      55
    )

    assert.equal(
      result.distance,
      0
    )
  }
)


test(
  'scarStrength decays away from Circle resonance',
  () => {
    const result =
      scarStrength(
        'circle',
        60
      )

    assert.equal(
      result.exact,
      false
    )

    near(
      result.strength,
      1 - 5 / 9
    )
  }
)


//
// ============================================================
// FOCUS / COHERENCE
// ============================================================
//

test(
  'Circle energy 55 produces resonant Integrable focus',
  () => {
    const focus =
      computeFocus({
        geometry:
          'circle',

        arenaClass:
          'Integrable',

        energy:
          55,

        power:
          66,
      })

    assert.equal(
      focus.scarLock,
      false
    )

    assert.equal(
      focus.label,
      'Resonant'
    )

    assert.ok(
      focus.coherence >
      0.8
    )

    assert.ok(
      focus.coherence <=
      0.99
    )

    assert.ok(
      focus.epsilon >=
      0.002
    )

    assert.ok(
      focus.epsilon <=
      0.08
    )
  }
)


test(
  'Integrable Circle never enters scar lock',
  () => {
    const focus =
      computeFocus({
        geometry:
          'circle',

        arenaClass:
          'Integrable',

        energy:
          55,

        power:
          90,
      })

    assert.equal(
      focus.scarLock,
      false
    )
  }
)


//
// ============================================================
// CIRCLE FIELD
// ============================================================
//

test(
  'circleFieldValue stays within zero to one',
  () => {
    for (
      let i = 0;
      i < 200;
      i++
    ) {
      const angle =
        (
          i /
          200
        ) *
        Math.PI *
        2

      const radius =
        0.82 *
        (
          i /
          199
        )

      const point = {
        x:
          Math.cos(angle) *
          radius,

        z:
          Math.sin(angle) *
          radius,
      }

      const value =
        circleFieldValue(
          point,
          i * 17,
          55
        )

      assert.ok(
        Number.isFinite(
          value
        )
      )

      assert.ok(
        value >= 0
      )

      assert.ok(
        value <= 1
      )
    }
  }
)


test(
  'circleFieldValue is zero outside Circle boundary',
  () => {
    const value =
      circleFieldValue(
        {
          x: 1,
          z: 0,
        },

        0,
        55
      )

    assert.equal(
      value,
      0
    )
  }
)


//
// ============================================================
// PATH DISTANCE
// ============================================================
//

test(
  'distanceToSegment returns zero for point on segment',
  () => {
    const distance =
      distanceToSegment(
        {
          x: 0.5,
          z: 0,
        },

        {
          x: 0,
          z: 0,
        },

        {
          x: 1,
          z: 0,
        }
      )

    near(
      distance,
      0
    )
  }
)


test(
  'distanceToSegment returns perpendicular distance',
  () => {
    const distance =
      distanceToSegment(
        {
          x: 0.5,
          z: 0.2,
        },

        {
          x: 0,
          z: 0,
        },

        {
          x: 1,
          z: 0,
        }
      )

    near(
      distance,
      0.2
    )
  }
)


test(
  'minDistanceToPath chooses nearest segment',
  () => {
    const path = [
      {
        x: 0,
        z: 0,
      },

      {
        x: 1,
        z: 0,
      },

      {
        x: 1,
        z: 1,
      },
    ]

    const distance =
      minDistanceToPath(
        {
          x: 0.8,
          z: 0.1,
        },

        path
      )

    near(
      distance,
      0.1
    )
  }
)


//
// ============================================================
// MEASUREMENT CONSTANTS
// ============================================================
//

test(
  'Integrable measurement constants match donor',
  () => {
    assert.equal(
      measurementLane(
        'Integrable',
        false
      ),
      0.12
    )

    assert.equal(
      measurementThreshold(
        'Integrable',
        false
      ),
      0.39
    )
  }
)


test(
  'scar lock uses wider lane and lower threshold',
  () => {
    assert.equal(
      measurementLane(
        'Chaotic',
        true
      ),
      0.17
    )

    assert.equal(
      measurementThreshold(
        'Chaotic',
        true
      ),
      0.34
    )
  }
)


//
// ============================================================
// TARGET MEASUREMENT
// ============================================================
//

test(
  'direct path produces strong receiver measurement',
  () => {
    const focus =
      computeFocus({
        geometry:
          'circle',

        arenaClass:
          'Integrable',

        energy:
          55,

        power:
          66,
      })

    const target = {
      index:
        0,

      position: {
        x: 0.5,
        z: 0,
      },

      active:
        true,
    }

    const measurement =
      measureTarget({
        target,

        path: [
          {
            x: 0,
            z: 0,
          },

          {
            x: 1,
            z: 0,
          },
        ],

        density:
          1,

        power:
          66,

        focus,

        arenaClass:
          'Integrable',

        scarLock:
          false,
      })

    near(
      measurement.distance,
      0
    )

    near(
      measurement.aimScore,
      1
    )

    assert.ok(
      measurement.score >
      0.39
    )
  }
)


test(
  'distant path produces zero aim score',
  () => {
    const focus =
      computeFocus({
        geometry:
          'circle',

        arenaClass:
          'Integrable',

        energy:
          55,

        power:
          66,
      })

    const measurement =
      measureTarget({
        target: {
          index:
            0,

          position: {
            x: 0,
            z: 0.5,
          },

          active:
            true,
        },

        path: [
          {
            x: -1,
            z: 0,
          },

          {
            x: 1,
            z: 0,
          },
        ],

        density:
          1,

        power:
          66,

        focus,

        arenaClass:
          'Integrable',

        scarLock:
          false,
      })

    assert.equal(
      measurement.aimScore,
      0
    )

    assert.equal(
      measurement.score,
      0
    )
  }
)


//
// ============================================================
// MEASUREMENT RESOLUTION
// ============================================================
//

test(
  'resolveMeasurement hits active target above threshold',
  () => {
    const focus =
      computeFocus({
        geometry:
          'circle',

        arenaClass:
          'Integrable',

        energy:
          55,

        power:
          66,
      })

    const result =
      resolveMeasurement({
        path: [
          {
            x: 0,
            z: 0,
          },

          {
            x: 1,
            z: 0,
          },
        ],

        targets: [
          {
            index:
              0,

            position: {
              x: 0.5,
              z: 0,
            },

            active:
              true,
          },
        ],

        arenaClass:
          'Integrable',

        focus,

        power:
          66,

        energy:
          55,

        scarLock:
          false,

        comboBefore:
          0,

        densityAt: () =>
          1,
      })

    assert.equal(
      result.hit,
      true
    )

    assert.equal(
      result.combo,
      1
    )

    assert.ok(
      result.best
    )

    assert.equal(
      result.best.target.index,
      0
    )

    assert.ok(
      result.targetScore >
      0
    )
  }
)


test(
  'resolveMeasurement ignores inactive targets',
  () => {
    const focus =
      computeFocus({
        geometry:
          'circle',

        arenaClass:
          'Integrable',

        energy:
          55,

        power:
          66,
      })

    const result =
      resolveMeasurement({
        path: [
          {
            x: 0,
            z: 0,
          },

          {
            x: 1,
            z: 0,
          },
        ],

        targets: [
          {
            index:
              0,

            position: {
              x: 0.5,
              z: 0,
            },

            active:
              false,
          },
        ],

        arenaClass:
          'Integrable',

        focus,

        power:
          66,

        energy:
          55,

        scarLock:
          false,

        comboBefore:
          0,

        densityAt: () =>
          1,
      })

    assert.equal(
      result.hit,
      false
    )

    assert.equal(
      result.best,
      null
    )

    assert.equal(
      result.combo,
      0
    )
  }
)


test(
  'resolveMeasurement misses receiver below threshold',
  () => {
    const focus =
      computeFocus({
        geometry:
          'circle',

        arenaClass:
          'Integrable',

        energy:
          55,

        power:
          66,
      })

    const result =
      resolveMeasurement({
        path: [
          {
            x: -1,
            z: 0,
          },

          {
            x: 1,
            z: 0,
          },
        ],

        targets: [
          {
            index:
              0,

            position: {
              x: 0,
              z: 0.6,
            },

            active:
              true,
          },
        ],

        arenaClass:
          'Integrable',

        focus,

        power:
          66,

        energy:
          55,

        scarLock:
          false,

        comboBefore:
          3,

        densityAt: () =>
          1,
      })

    assert.equal(
      result.hit,
      false
    )

    //
    // Miss resets combo.
    //
    assert.equal(
      result.combo,
      0
    )

    assert.equal(
      result.targetScore,
      0
    )
  }
)


//
// ============================================================
// PERFECT HIT
// ============================================================
//

test(
  'high measurement and coherence can produce perfect hit',
  () => {
    const focus = {
      coherence:
        0.95,

      epsilon:
        0.004,

      label:
        'Stable',

      scarLock:
        false,
    }

    const result =
      resolveMeasurement({
        path: [
          {
            x: 0,
            z: 0,
          },

          {
            x: 1,
            z: 0,
          },
        ],

        targets: [
          {
            index:
              0,

            position: {
              x: 0.5,
              z: 0,
            },

            active:
              true,
          },
        ],

        arenaClass:
          'Integrable',

        focus,

        power:
          100,

        energy:
          55,

        scarLock:
          false,

        comboBefore:
          1,

        densityAt: () =>
          1,
      })

    assert.equal(
      result.hit,
      true
    )

    assert.equal(
      result.perfect,
      true
    )

    assert.equal(
      result.combo,
      2
    )

    assert.equal(
      result.comboBonus,
      55
    )

    assert.equal(
      result.perfectBonus,
      90
    )
  }
)


//
// ============================================================
// TRAJECTORY SAMPLE CONVERSION
// ============================================================
//

test(
  'samplesToPath strips trajectory metadata',
  () => {
    const result =
      samplesToPath([
        {
          point: {
            x: 0,
            z: 0,
          },

          bounce:
            false,
        },

        {
          point: {
            x: 1,
            z: 0,
          },

          bounce:
            true,
        },
      ])

    assert.deepEqual(
      result,
      [
        {
          x: 0,
          z: 0,
        },

        {
          x: 1,
          z: 0,
        },
      ]
    )
  }
)


//
// ============================================================
// CHALLENGES
// ============================================================
//

test(
  'first Circle challenge matches donor setup',
  () => {
    const challenge =
      getChallenge(0)

    assert.equal(
      challenge.name,
      'First Observation'
    )

    assert.equal(
      challenge.geometry,
      'circle'
    )

    assert.equal(
      challenge.energy,
      55
    )

    assert.equal(
      challenge.yaw,
      -33
    )

    assert.equal(
      challenge.power,
      66
    )

    assert.equal(
      challenge.par,
      2
    )

    assert.equal(
      challenge.time,
      95
    )

    assert.deepEqual(
      challenge.targetIndices,
      [
        0,
      ]
    )
  }
)


test(
  'second Circle challenge uses targets one and two',
  () => {
    const challenge =
      getChallenge(1)

    assert.equal(
      challenge.name,
      'Honest Reflection'
    )

    assert.equal(
      challenge.geometry,
      'circle'
    )

    assert.deepEqual(
      challengeTargets(
        challenge
      ),
      [
        1,
        2,
      ]
    )
  }
)


test(
  'Circle challenge filter returns first two challenges',
  () => {
    const challenges =
      getChallengesForGeometry(
        'circle'
      )

    assert.equal(
      challenges.length,
      2
    )

    assert.equal(
      challenges[0].name,
      'First Observation'
    )

    assert.equal(
      challenges[1].name,
      'Honest Reflection'
    )
  }
)


test(
  'unknown challenge index throws',
  () => {
    assert.throws(
      () =>
        getChallenge(
          999
        ),

      RangeError
    )
  }
)


//
// ============================================================
// CHALLENGE BONUSES
// ============================================================
//

test(
  'challenge completion bonuses follow donor formula',
  () => {
    const challenge =
      getChallenge(0)

    const bonuses =
      challengeBonuses({
        cleared:
          true,

        challenge,

        shotsTaken:
          1,

        timeRemaining:
          10.2,

        scarHits:
          2,
      })

    //
    // ceil(10.2) * 8 = 88
    //
    assert.equal(
      bonuses.timeBonus,
      88
    )

    //
    // par 2 - shots 1 = 1 * 150
    //
    assert.equal(
      bonuses.parBonus,
      150
    )

    //
    // 2 scar hits * 120
    //
    assert.equal(
      bonuses.scarBonus,
      240
    )

    assert.equal(
      bonuses.clearBonus,
      500
    )

    assert.equal(
      bonuses.totalBonus,
      978
    )
  }
)


test(
  'failed challenge gives no completion bonuses',
  () => {
    const challenge =
      getChallenge(0)

    const bonuses =
      challengeBonuses({
        cleared:
          false,

        challenge,

        shotsTaken:
          8,

        timeRemaining:
          0,

        scarHits:
          4,
      })

    assert.deepEqual(
      bonuses,
      {
        timeBonus:
          0,

        parBonus:
          0,

        scarBonus:
          0,

        clearBonus:
          0,

        totalBonus:
          0,
      }
    )
  }
)


//
// ============================================================
// CHALLENGE GRADES
// ============================================================
//

test(
  'uncleared challenge receives F',
  () => {
    const challenge =
      getChallenge(0)

    const grade =
      gradeChallenge({
        cleared:
          false,

        challenge,

        shotsTaken:
          1,

        timeRemaining:
          90,

        scarHits:
          5,
      })

    assert.equal(
      grade,
      'F'
    )
  }
)


test(
  'excellent challenge run receives S',
  () => {
    const challenge =
      getChallenge(0)

    const grade =
      gradeChallenge({
        cleared:
          true,

        challenge,

        shotsTaken:
          1,

        timeRemaining:
          80,

        scarHits:
          3,
      })

    assert.equal(
      grade,
      'S'
    )
  }
)


//
// ============================================================
// BASIC DATA SANITY
// ============================================================
//

test(
  'all challenge definitions are internally sane',
  () => {
    assert.ok(
      CHALLENGES.length >= 6
    )

    for (
      const challenge
      of CHALLENGES
    ) {
      assert.ok(
        challenge.name.length >
        0
      )

      assert.ok(
        challenge.targetIndices.length >
        0
      )

      assert.ok(
        Number.isFinite(
          challenge.energy
        )
      )

      assert.ok(
        challenge.power >
        0
      )

      assert.ok(
        challenge.par >
        0
      )

      assert.ok(
        challenge.time >
        0
      )
    }
  }
)
