import * as ecs from '@8thwall/ecs'
import { CIRCLE_CONFIG } from '../core/circle-config.ts'
import { shotVelocity, stepBall } from '../core/simulation.ts'

// Runtime-only diagnostics; default is off. Set in the Simulator console.
const debugMode = () => (globalThis as any).__QB_DEBUG_MODE || 'off'

const QuantumBilliards = ecs.registerComponent({
  name: 'Quantum Billiards',

  schema: {
    ball: ecs.eid,
    aimLine: ecs.eid,
    target: ecs.eid,
  },

  stateMachine: ({
    world,
    eid,
    schemaAttribute,
    defineState,
  }) => {
    const { source, minDrag } = CIRCLE_CONFIG
    const sourceX = source.x
    const sourceZ = source.z

    const aimLineBaseLength = 1.0

    let debugTick = 0
    let previousDebugPosition: {x: number, y: number, z: number} | undefined
    let vx = 0
    let vz = 0

    let moving = false
    let dragging = false

    let startX = 0
    let startY = 0

    let currentX = 0
    let currentY = 0

    // SCREEN_TOUCH_END can report a point back near the touch-start position
    // in the Studio/device input path. Preserve the strongest MOVE sample so
    // release cannot accidentally collapse a real drag to ~zero.
    let bestDx = 0
    let bestDy = 0
    let bestDragLength = 0

    const stopBall = () => {
      vx = 0
      vz = 0
      moving = false

      console.log('BALL STOPPED')
    }

    const hideAimLine = () => {
      const data = schemaAttribute.get(eid)

      if (!data.aimLine) {
        return
      }

      ecs.Scale.mutate(
        world,
        data.aimLine,
        (scale) => {
          scale.x = 0.001
          scale.y = 0.001
          scale.z = 0.001

          return false
        }
      )
    }

    const resetBall = () => {
      const data = schemaAttribute.get(eid)

      if (!data.ball) {
        console.log('RESET: no ball assigned')
        return
      }

      stopBall()
      dragging = false
      hideAimLine()

      ecs.Position.mutate(
        world,
        data.ball,
        (position) => {
          position.x = sourceX
          position.z = sourceZ

          return false
        }
      )

      console.log('BALL RESET')
    }

    const updateAimLine = () => {
      const data = schemaAttribute.get(eid)

      if (!data.ball || !data.aimLine) {
        return
      }

      const dx = currentX - startX
      const dy = currentY - startY

      const dragLength = Math.hypot(dx, dy)

      if (dragLength < minDrag) {
        hideAimLine()
        return
      }

      const dirX = dx / dragLength
      const dirZ = -dy / dragLength

      const angle = Math.atan2(
        dirX,
        dirZ
      )

      const visualLength = Math.min(
        dragLength * 2.5,
        1.2
      )

      // ECS get() returns a shared cursor; snapshot before mutating AimLine.
      const ballPosition = {...ecs.Position.get(world, data.ball)}

      //
      // AIM LINE POSITION
      //

      ecs.Position.mutate(
        world,
        data.aimLine,
        (position) => {
          position.x =
            ballPosition.x +
            dirX * visualLength * 0.5

          position.y =
            ballPosition.y + 0.01

          position.z =
            ballPosition.z +
            dirZ * visualLength * 0.5

          return false
        }
      )

      //
      // AIM LINE ROTATION
      //

      ecs.Quaternion.mutate(
        world,
        data.aimLine,
        (rotation) => {
          const halfAngle =
            angle * 0.5

          rotation.x = 0
          rotation.y = Math.sin(halfAngle)
          rotation.z = 0
          rotation.w = Math.cos(halfAngle)

          return false
        }
      )

      //
      // AIM LINE SCALE
      //

      ecs.Scale.mutate(
        world,
        data.aimLine,
        (scale) => {
          scale.x = 0.02
          scale.y = 0.01
          scale.z =
            visualLength /
            aimLineBaseLength

          return false
        }
      )
    }

    const beginDrag = (
      event: any
    ) => {
      if (debugMode() === 'forced') return
      if (moving) {
        console.log('IGNORED TOUCH: ball moving')
        return
      }

      const position =
        event.data?.position

      if (!position) {
        console.log('TOUCH START: no position')
        return
      }

      startX = position.x
      startY = position.y

      currentX = startX
      currentY = startY
      bestDx = 0
      bestDy = 0
      bestDragLength = 0

      dragging = true

      hideAimLine()

      console.log(
        'AIM START',
        startX,
        startY
      )
    }

    const updateDrag = (
      event: any
    ) => {
      if (debugMode() === 'forced') return
      if (!dragging || moving) {
        return
      }

      const position =
        event.data?.position

      if (!position) {
        return
      }

      currentX = position.x
      currentY = position.y

      const dx = currentX - startX
      const dy = currentY - startY
      const dragLength = Math.hypot(dx, dy)

      if (dragLength > bestDragLength) {
        bestDx = dx
        bestDy = dy
        bestDragLength = dragLength
      }

      updateAimLine()
    }

    const releaseShot = (
      event: any
    ) => {
      if (debugMode() === 'forced') return
      if (!dragging || moving) {
        return
      }

      const position =
        event.data?.position

      // Only trust the touch-end coordinate if it extends the drag. Some
      // Studio/device paths report touch-end close to touch-start.
      if (position) {
        const endDx = position.x - startX
        const endDy = position.y - startY
        const endLength = Math.hypot(endDx, endDy)

        if (endLength > bestDragLength) {
          bestDx = endDx
          bestDy = endDy
          bestDragLength = endLength
        }
      }

      dragging = false
      hideAimLine()

      console.log('SHOT RELEASE', {
        dx: bestDx,
        dy: bestDy,
        dragLength: bestDragLength,
        minDrag,
      })

      const velocity = shotVelocity(bestDx, bestDy)
      if (!velocity) {
        console.log('SHOT CANCELLED: not enough force', {
          dragLength: bestDragLength,
          minDrag,
        })
        return
      }

      vx = velocity.x
      vz = velocity.z
      moving = true

      console.log('SHOT VELOCITY', {vx, vz})
    }

    defineState('running')
      .initial()

      .onEnter(() => {
        resetBall()

        console.log(
          'Quantum Billiards ready'
        )
      })

      .listen(
        world.events.globalId,
        ecs.input.SCREEN_TOUCH_START,
        (event) => {
          beginDrag(event)
        }
      )

      .listen(
        world.events.globalId,
        ecs.input.SCREEN_TOUCH_MOVE,
        (event) => {
          updateDrag(event)
        }
      )

      .listen(
        world.events.globalId,
        ecs.input.SCREEN_TOUCH_END,
        (event) => {
          releaseShot(event)
        }
      )

      .onTick(() => {
        const data =
          schemaAttribute.get(eid)

        if (!data.ball) {
          console.log(
            'TICK BLOCKED: no ball assigned'
          )
          return
        }

        const mode = debugMode()
        if (mode === 'forced') {
          const before = {...ecs.Position.get(world, data.ball)}
          ecs.Position.mutate(world, data.ball, (position) => {
            position.x += 0.02
            return false
          })
          const after = {...ecs.Position.get(world, data.ball)}
          if (debugTick < 3 || debugTick % 60 === 0) {
            console.log('QB FORCED', JSON.stringify({tick: debugTick,
              ball: String(data.ball), before, after, previous: previousDebugPosition,
              persists: !previousDebugPosition || Math.abs(before.x - previousDebugPosition.x) < 0.00001,
              rootPosition: {...ecs.Position.get(world, eid)},
              rootScale: {...ecs.Scale.get(world, eid)},
            }))
          }
          previousDebugPosition = after
          debugTick++
          return
        }

        if (!moving) {
          return
        }

        // Another Position.get/mutate retargets the same ECS cursor.
        const position = {...ecs.Position.get(world, data.ball)}
        const observedBall = {...position}
        const target = data.target ? {...ecs.Position.get(world, data.target)} : undefined
        const result = stepBall({
          position: {x: position.x, z: position.z},
          velocity: {x: vx, z: vz},
        }, target)
        if (mode === 'simulation' && (debugTick < 3 || debugTick % 60 === 0 || result.hit)) {
          console.log('QB SIMULATION', JSON.stringify({observedBall, inputPosition: {...position}, target: target && {...target}, inputVelocity: {x: vx, z: vz}, result}))
        }
        debugTick++
        vx = result.velocity.x
        vz = result.velocity.z
        moving = result.moving
        ecs.Position.mutate(world, data.ball, (position) => {
          position.x = result.position.x
          position.z = result.position.z
          return false
        })
      })
  },
})

export {QuantumBilliards}
