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


function removeImports(source) {
  const lines = source.split('\n')
  const output = []

  let insideImport = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!insideImport && trimmed.startsWith('import ')) {
      //
      // Single-line import:
      //
      // import * as ecs from '@8thwall/ecs'
      //
      // or:
      //
      // import {foo} from './foo'
      //
      if (
        /\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(trimmed) ||
        /^import\s+['"][^'"]+['"]\s*;?\s*$/.test(trimmed)
      ) {
        continue
      }

      //
      // Otherwise this is the first line of a
      // multi-line import.
      //
      insideImport = true
      continue
    }

    if (insideImport) {
      //
      // Final line of a multi-line import:
      //
      // } from './foo'
      //
      if (
        /\bfrom\s+['"][^'"]+['"]\s*;?\s*$/.test(trimmed)
      ) {
        insideImport = false
      }

      continue
    }

    output.push(line)
  }

  return output.join('\n')
}


function harness() {
  const positions = new Map([
    [1, {x: 0, y: 0, z: 0}],
    [2, {x: -0.48, y: 0.105, z: 0.34}],
    [3, {x: 0, y: 0.115, z: 0}],
    [4, {x: 0.46, y: 0.066, z: -0.28}],
  ])

  //
  // Match installed ECS behavior:
  // get() and mutate() retarget one cursor per attribute.
  //
  function attribute(values) {
    let current

    const cursor = new Proxy(
      {},
      {
        get: (_, key) => {
          return values.get(current)[key]
        },

        set: (_, key, value) => {
          values.get(current)[key] = value
          return true
        },

        ownKeys: () => {
          return Object.keys(
            values.get(current)
          )
        },

        getOwnPropertyDescriptor: () => ({
          enumerable: true,
          configurable: true,
        }),
      }
    )

    return {
      get: (_, eid) => {
        current = eid
        return cursor
      },

      mutate: (_, eid, fn) => {
        current = eid
        fn(cursor)
      },
    }
  }

  let component
  let tick
  let enter

  const listeners = {}

  const chain = {
    initial() {
      return this
    },

    onEnter(fn) {
      enter = fn
      return this
    },

    listen(_, name, fn) {
      listeners[name] = fn
      return this
    },

    onTick(fn) {
      tick = fn
      return this
    },
  }

  const ecs = {
    eid: 0,

    registerComponent: (definition) => {
      component = definition
      return definition
    },

    Position: attribute(
      positions
    ),

    Scale: attribute(
      new Map([
        [1, {x: 1, y: 1, z: 1}],
        [3, {x: 1, y: 1, z: 1}],
      ])
    ),

    Quaternion: attribute(
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
      ])
    ),

    input: {
      SCREEN_TOUCH_START: 'start',
      SCREEN_TOUCH_MOVE: 'move',
      SCREEN_TOUCH_END: 'end',
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

  //
  // Remove real module imports because this test
  // executes the Studio component inside a VM and
  // injects the dependencies explicitly below.
  //
  source = removeImports(source)

  source = source.replace(
    /export\s*\{\s*QuantumBilliards\s*\}\s*;?/g,
    ''
  )

  source =
    stripTypeScriptTypes(
      source
    )

  const context = {
    ecs,

    CIRCLE_CONFIG,

    createGameState,

    shotVelocity,
    stepBall,

    predictCircleTrajectoryFromDrag,

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
        globalId: 0,
      },
    },

    eid: 1,

    schemaAttribute: {
      get: () => ({
        ball: 2,
        aimLine: 3,
        target: 4,
      }),
    },

    defineState: () => chain,
  })

  enter()

  return {
    positions,
    tick,
    listeners,
    context,
  }
}


test(
  'Studio shared Position cursor does not turn every shot into an immediate hit',
  () => {
    const h = harness()

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

    //
    // AimLine center is relative to Ball,
    // not its previous transform.
    //
    const aim = h.positions.get(3)

assert.ok(
  Number.isFinite(aim.x),
  'AimLine X should be finite'
)

assert.ok(
  Number.isFinite(aim.z),
  'AimLine Z should be finite'
)

assert.ok(
  Math.hypot(
    aim.x - (-0.48),
    aim.z - 0.34
  ) > 0,
  'AimLine should move away from the ball while aiming'
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

    assert.ok(
      Math.abs(
        h.positions.get(2).x -
        (-0.38)
      ) < 1e-12
    )

    h.tick()

    assert.ok(
      h.positions.get(2).x >
      -0.29
    )

    assert.equal(
      h.positions.get(2).z,
      0.34
    )

    assert.equal(
      h.positions.get(2).y,
      0.105
    )
  }
)


test(
  'forced diagnostic bypasses simulation and accumulates X movement',
  () => {
    const h = harness()

    h.context.__QB_DEBUG_MODE =
      'forced'

    for (
      let i = 0;
      i < 10;
      i++
    ) {
      h.tick()
    }

    assert.ok(
      Math.abs(
        h.positions.get(2).x -
        (-0.28)
      ) < 1e-12
    )
  }
)
