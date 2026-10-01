import {
  measureTarget,
  resolveMeasurement,
  samplesToPath,
} from '../src/core/measurement.ts'

import {
  computeFocus,
  circleFieldValue,
} from '../src/core/quantum-state.ts'

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {stripTypeScriptTypes} from 'node:module'

import {
  CIRCLE_CONFIG,
} from '../src/core/circle-config.ts'

import {
  createGameState,
} from '../src/core/game-state.ts'

import {
  shotVelocity,
  stepBall,
} from '../src/core/simulation.ts'

import {
  predictCircleTrajectoryFromDrag,
} from '../src/core/trajectory.ts'

import {
  computeFocus,
} from '../src/core/quantum-state.ts'

import {
  getChallenge,
} from '../src/core/challenges.ts'


function removeImports(source) {
  const lines =
    source.split('\n')

  const output = []

  let insideImport =
    false

  for (
    const line
    of lines
  ) {
    const trimmed =
      line.trim()

    if (
      !insideImport &&
      trimmed.startsWith(
        'import '
      )
    ) {
      if (
        /\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(
          trimmed
        ) ||
        /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(
          trimmed
        )
      ) {
        continue
      }

      insideImport =
        true

      continue
    }

    if (
      insideImport
    ) {
      if (
        /\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(
          trimmed
        )
      ) {
        insideImport =
          false
      }

      continue
    }

    output.push(
      line
    )
  }

  return output.join(
    '\n'
  )
}


function removeExports(
  source
) {
  return source.replace(
    /export\s*\{\s*QuantumBilliards\s*,?\s*\}\s*;?/g,
    ''
  )
}


function harness() {
  //
  // Entity IDs:
  //
  // 1  = QuantumBilliardsRoot
  // 2  = Ball
  // 3  = AimLine
  // 4  = Socket
  // 5  = Trajectory1
  // 6  = Trajectory2
  // 7  = Trajectory3
  // 8  = Trajectory4
  // 9  = Trajectory5
  // 10 = Trajectory6
  // 11 = Trajectory7
  //

  const positions =
    new Map([
      [
        1,
        {
          x: 0,
          y: 0,
          z: 0,
        },
      ],

      [
        2,
        {
          x: -0.48,
          y: 0.105,
          z: 0.34,
        },
      ],

      [
        3,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],

      [
        4,
        {
          x: 0.46,
          y: 0.066,
          z: -0.28,
        },
      ],

      [
        5,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],

      [
        6,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],

      [
        7,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],

      [
        8,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],

      [
        9,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],

      [
        10,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],

      [
        11,
        {
          x: 0,
          y: 0.115,
          z: 0,
        },
      ],
    ])


  const scales =
    new Map([
      [
        1,
        {
          x: 1,
          y: 1,
          z: 1,
        },
      ],

      [
        2,
        {
          x: 1,
          y: 1,
          z: 1,
        },
      ],

      [
        3,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],

      [
        4,
        {
          x: 1,
          y: 1,
          z: 1,
        },
      ],

      [
        5,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],

      [
        6,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],

      [
        7,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],

      [
        8,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],

      [
        9,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],

      [
        10,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],

      [
        11,
        {
          x: 0.001,
          y: 0.001,
          z: 0.001,
        },
      ],
    ])


  const quaternions =
    new Map([
      [
        3,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],

      [
        5,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],

      [
        6,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],

      [
        7,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],

      [
        8,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],

      [
        9,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],

      [
        10,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],

      [
        11,
        {
          x: 0,
          y: 0,
          z: 0,
          w: 1,
        },
      ],
    ])


  function attribute(
    values
  ) {
    let current

    const ensure = (
      eid
    ) => {
      if (
        !values.has(eid)
      ) {
        values.set(
          eid,
          {}
        )
      }
    }

    const cursor =
      new Proxy(
        {},
        {
          get: (
            _,
            key
          ) => {
            ensure(
              current
            )

            return values.get(
              current
            )[key]
          },

          set: (
            _,
            key,
            value
          ) => {
            ensure(
              current
            )

            values.get(
              current
            )[key] =
              value

            return true
          },

          ownKeys: () => {
            ensure(
              current
            )

            return Object.keys(
              values.get(
                current
              )
            )
          },

          getOwnPropertyDescriptor:
            () => ({
              enumerable:
                true,

              configurable:
                true,
            }),
        }
      )

    return {
      get: (
        _world,
        eid
      ) => {
        current =
          eid

        ensure(
          eid
        )

        return cursor
      },

      mutate: (
        _world,
        eid,
        fn
      ) => {
        current =
          eid

        ensure(
          eid
        )

        fn(
          cursor
        )
      },
    }
  }


  let component
  let tick
  let enter

  const listeners =
    {}


  const chain = {
    initial() {
      return this
    },

    onEnter(fn) {
      enter =
        fn

      return this
    },

    listen(
      _target,
      name,
      fn
    ) {
      listeners[
        name
      ] =
        fn

      return this
    },

    onTick(fn) {
      tick =
        fn

      return this
    },
  }


  const ecs = {
    eid: 0,

    registerComponent:
      (
        definition
      ) => {
        component =
          definition

        return definition
      },

    Position:
      attribute(
        positions
      ),

    Scale:
      attribute(
        scales
      ),

    Quaternion:
      attribute(
        quaternions
      ),

    input: {
      SCREEN_TOUCH_START:
        'start',

      SCREEN_TOUCH_MOVE:
        'move',

      SCREEN_TOUCH_END:
        'end',
    },
  }


  const filename =
    new URL(
      '../src/studio/quantum-billiards.ts',
      import.meta.url
    )


  let source =
    fs.readFileSync(
      filename,
      'utf8'
    )


  source =
    removeImports(
      source
    )


  source =
    removeExports(
      source
    )


  source =
    stripTypeScriptTypes(
      source
    )


  //
  // ============================================================
  // HUD STUB
  // ============================================================
  //

  const hudState = {
    updates:
      [],

    quantum:
      undefined,

    flashes:
      0,
  }


  const createQuantumBilliardsHudStub =
    () => ({
      update(
        state
      ) {
        hudState.updates.push(
          {
            ...state,
          }
        )
      },

      updateQuantum(
        state
      ) {
        hudState.quantum = {
          ...state,
        }
      },

      flashHit() {
        hudState.flashes++
      },
    })


  //
  // ============================================================
  // VM CONTEXT
  // ============================================================
  //

  const context = {
    ecs,

    CIRCLE_CONFIG,

    createGameState,

    shotVelocity,
    stepBall,

    predictCircleTrajectoryFromDrag,

    computeFocus,
    getChallenge,

    createQuantumBilliardsHud:
      createQuantumBilliardsHudStub,

    console: {
      log() {},
      warn() {},
      error() {},
    },
  }


  vm.runInNewContext(
    source,
    context
  )


  component.stateMachine({
    world: {
      events: {
        globalId:
          0,
      },
    },

    eid:
      1,

    schemaAttribute: {
      get: () => ({
        ball:
          2,

        aimLine:
          3,

        target:
          4,

        trajectory1:
          5,

        trajectory2:
          6,

        trajectory3:
          7,

        trajectory4:
          8,

        trajectory5:
          9,

        trajectory6:
          10,

        trajectory7:
          11,
      }),
    },

    defineState:
      () =>
        chain,
  })


  enter()


  return {
    positions,
    scales,
    quaternions,

    tick,
    listeners,

    context,

    hudState,
  }
}


test(
  'Studio initializes quantum HUD for First Observation',
  () => {
    const h =
      harness()

    assert.ok(
      h.hudState
        .updates.length >
      0
    )

    assert.ok(
      h.hudState
        .quantum
    )

    assert.equal(
      h.hudState
        .quantum
        .energy,
      55
    )

    assert.equal(
      h.hudState
        .quantum
        .focus,
      'Resonant'
    )

    assert.ok(
      h.hudState
        .quantum
        .coherence >
      0
    )

    assert.ok(
      h.hudState
        .quantum
        .coherence <=
      1
    )

    assert.ok(
      h.hudState
        .quantum
        .epsilon >
      0
    )
  }
)


test(
  'Studio shared Position cursor does not turn every shot into an immediate hit',
  () => {
    const h =
      harness()

    const start = {
      ...h.positions.get(
        2
      ),
    }


    h.listeners.start({
      data: {
        position: {
          x: 0,
          y: 0,
        },
      },
    })


    h.listeners.move({
      data: {
        position: {
          x: 0.6,
          y: 0,
        },
      },
    })


    const aimScale =
      h.scales.get(
        3
      )

    assert.ok(
      aimScale.z >
      0.001,
      'AimLine should become visible while aiming'
    )


    h.listeners.end({
      data: {
        position: {
          x: 0.6,
          y: 0,
        },
      },
    })


    h.tick()


    const afterOne = {
      ...h.positions.get(
        2
      ),
    }


    assert.ok(
      afterOne.x >
      start.x,
      'Ball should advance after the shot'
    )


    assert.equal(
      afterOne.z,
      start.z
    )


    assert.equal(
      afterOne.y,
      start.y
    )


    assert.notDeepEqual(
      {
        x:
          afterOne.x,

        z:
          afterOne.z,
      },

      {
        x:
          CIRCLE_CONFIG
            .source.x,

        z:
          CIRCLE_CONFIG
            .source.z,
      }
    )


    h.tick()


    const afterTwo = {
      ...h.positions.get(
        2
      ),
    }


    assert.ok(
      afterTwo.x >
      afterOne.x,
      'Ball should continue moving on the next tick'
    )


    assert.equal(
      afterTwo.z,
      start.z
    )


    assert.equal(
      afterTwo.y,
      start.y
    )


    //
    // HUD should have received an update for the shot.
    //

    const latestHud =
      h.hudState.updates[
        h.hudState.updates.length -
        1
      ]

    assert.ok(
      latestHud
    )

    assert.equal(
      latestHud.shots,
      1
    )
  }
)


test(
  'forced diagnostic bypasses simulation and accumulates X movement',
  () => {
    const h =
      harness()

    h.context
      .__QB_DEBUG_MODE =
        'forced'


    const startX =
      h.positions.get(
        2
      ).x


    for (
      let i = 0;
      i < 10;
      i++
    ) {
      h.tick()
    }


    const endX =
      h.positions.get(
        2
      ).x


    assert.ok(
      Math.abs(
        endX -
        (
          startX +
          0.2
        )
      ) <
      1e-12
    )
  }
)
