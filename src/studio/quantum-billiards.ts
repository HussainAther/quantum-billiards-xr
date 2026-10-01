import * as ecs from '@8thwall/ecs'

import {CIRCLE_CONFIG} from '../core/circle-config.ts'
import {createGameState} from '../core/game-state.ts'
import {shotVelocity, stepBall} from '../core/simulation.ts'
import {
  predictCircleTrajectoryFromDrag,
} from '../core/trajectory.ts'


// Runtime-only diagnostics.
// In the simulator console you can set:
//
// globalThis.__QB_DEBUG_MODE = 'forced'
// globalThis.__QB_DEBUG_MODE = 'simulation'
// globalThis.__QB_DEBUG_MODE = 'off'
//
const debugMode = () =>
  (globalThis as any).__QB_DEBUG_MODE || 'off'


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
    const {
      source,
      minDrag,
    } = CIRCLE_CONFIG

    const game =
      createGameState()

    let vx = 0
    let vz = 0

    let moving = false
    let dragging = false

    let startX = 0
    let startY = 0

    let currentX = 0
    let currentY = 0

    //
    // SCREEN_TOUCH_END can sometimes report a coordinate
    // back near TOUCH_START in Studio/device input.
    //
    // Preserve the strongest observed MOVE sample.
    //
    let bestDx = 0
    let bestDy = 0
    let bestDragLength = 0

    let debugTick = 0

    let previousDebugPosition:
      | {
          x: number
          y: number
          z: number
        }
      | undefined


    //
    // ============================================================
    // BALL STATE
    // ============================================================
    //

    const stopBall = () => {
      vx = 0
      vz = 0
      moving = false
    }


    //
    // ============================================================
    // AIM LINE
    // ============================================================
    //

    const hideAimLine = () => {
      const data =
        schemaAttribute.get(eid)

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


    //
    // ============================================================
    // RESET
    // ============================================================
    //

    const resetBall = () => {
      const data =
        schemaAttribute.get(eid)

      if (!data.ball) {
        console.warn(
          'QB: no Ball entity assigned'
        )

        return
      }

      stopBall()

      dragging = false

      hideAimLine()

      ecs.Position.mutate(
        world,
        data.ball,
        (position) => {
          position.x = source.x
          position.z = source.z

          //
          // Leave Y unchanged.
          //

          return false
        }
      )
    }


    //
    // ============================================================
    // AIM PREVIEW
    // ============================================================
    //
    // The single AimLine currently previews the physically
    // correct FIRST leg of the predicted Circle trajectory.
    //
    // Later we can replace this with pooled multi-bank segments.
    //

    const updateAimLine = () => {
      const data =
        schemaAttribute.get(eid)

      if (
        !data.ball ||
        !data.aimLine
      ) {
        return
      }

      const dx =
        currentX - startX

      const dy =
        currentY - startY

      const dragLength =
        Math.hypot(dx, dy)

      if (
        dragLength < minDrag
      ) {
        hideAimLine()
        return
      }

      //
      // ECS get() is cursor-backed.
      // Snapshot Ball before touching another entity.
      //

      const ball = {
        ...ecs.Position.get(
          world,
          data.ball
        ),
      }

      const samples =
        predictCircleTrajectoryFromDrag(
          {
            x: ball.x,
            z: ball.z,
          },

          dx,
          dy,

          {
            maxBounces: 1,
            stepDistance: 0.015,
            maxSamples: 160,
          }
        )

      //
      // End the AimLine at first rail contact.
      //

      const bounceSample =
        samples.find(
          (sample) =>
            sample.bounce
        )

      const end =
        bounceSample?.point ??
        samples[
          samples.length - 1
        ]?.point

      if (!end) {
        hideAimLine()
        return
      }

      const segX =
        end.x - ball.x

      const segZ =
        end.z - ball.z

      const length =
        Math.hypot(
          segX,
          segZ
        )

      if (
        length < 1e-6
      ) {
        hideAimLine()
        return
      }

      const angle =
        Math.atan2(
          segX,
          segZ
        )

      //
      // ----------------------------------------------------------
      // POSITION
      // ----------------------------------------------------------
      //

      ecs.Position.mutate(
        world,
        data.aimLine,
        (position) => {
          position.x =
            ball.x +
            segX * 0.5

          position.y =
            ball.y + 0.01

          position.z =
            ball.z +
            segZ * 0.5

          return false
        }
      )

      //
      // ----------------------------------------------------------
      // ROTATION
      // ----------------------------------------------------------
      //

      ecs.Quaternion.mutate(
        world,
        data.aimLine,
        (rotation) => {
          const halfAngle =
            angle * 0.5

          rotation.x = 0
          rotation.y =
            Math.sin(
              halfAngle
            )

          rotation.z = 0
          rotation.w =
            Math.cos(
              halfAngle
            )

          return false
        }
      )

      //
      // ----------------------------------------------------------
      // SCALE
      // ----------------------------------------------------------
      //
      // AimLine is assumed to be a Box whose long local axis is Z.
      //

      ecs.Scale.mutate(
        world,
        data.aimLine,
        (scale) => {
          scale.x = 0.012
          scale.y = 0.008
          scale.z = length

          return false
        }
      )
    }


    //
    // ============================================================
    // INPUT
    // ============================================================
    //

    const beginDrag = (
      event: any
    ) => {
      if (
        debugMode() === 'forced' ||
        moving
      ) {
        return
      }

      const position =
        event.data?.position

      if (!position) {
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
    }


    const updateDrag = (
      event: any
    ) => {
      if (
        debugMode() === 'forced' ||
        !dragging ||
        moving
      ) {
        return
      }

      const position =
        event.data?.position

      if (!position) {
        return
      }

      currentX =
        position.x

      currentY =
        position.y

      const dx =
        currentX -
        startX

      const dy =
        currentY -
        startY

      const length =
        Math.hypot(
          dx,
          dy
        )

      if (
        length >
        bestDragLength
      ) {
        bestDx = dx
        bestDy = dy
        bestDragLength =
          length
      }

      updateAimLine()
    }


    const releaseShot = (
      event: any
    ) => {
      if (
        debugMode() === 'forced' ||
        !dragging ||
        moving
      ) {
        return
      }

      //
      // Some Studio/device paths report TOUCH_END close
      // to TOUCH_START.
      //
      // Only replace our strongest MOVE sample if the
      // release sample extends the drag.
      //

      const position =
        event.data?.position

      if (position) {
        const endDx =
          position.x -
          startX

        const endDy =
          position.y -
          startY

        const endLength =
          Math.hypot(
            endDx,
            endDy
          )

        if (
          endLength >
          bestDragLength
        ) {
          bestDx = endDx
          bestDy = endDy
          bestDragLength =
            endLength
        }
      }

      dragging = false

      hideAimLine()

      const velocity =
        shotVelocity(
          bestDx,
          bestDy
        )

      if (!velocity) {
        if (
          debugMode() !==
          'off'
        ) {
          console.log(
            'QB SHOT CANCELLED',
            {
              bestDragLength,
              minDrag,
            }
          )
        }

        return
      }

      vx = velocity.x
      vz = velocity.z

      moving = true

      game.shots += 1

      if (
        debugMode() !==
        'off'
      ) {
        console.log(
          'QB SHOT',
          {
            shot:
              game.shots,

            drag:
              bestDragLength,

            vx,
            vz,
          }
        )
      }
    }


    //
    // ============================================================
    // STATE MACHINE
    // ============================================================
    //

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
        ecs.input
          .SCREEN_TOUCH_START,
        beginDrag
      )

      .listen(
        world.events.globalId,
        ecs.input
          .SCREEN_TOUCH_MOVE,
        updateDrag
      )

      .listen(
        world.events.globalId,
        ecs.input
          .SCREEN_TOUCH_END,
        releaseShot
      )

      //
      // ==========================================================
      // GAME LOOP
      // ==========================================================
      //

      .onTick(() => {
        const data =
          schemaAttribute.get(
            eid
          )

        if (!data.ball) {
          return
        }

        const mode =
          debugMode()

        //
        // --------------------------------------------------------
        // FORCED TRANSFORM DIAGNOSTIC
        // --------------------------------------------------------
        //

        if (
          mode === 'forced'
        ) {
          const before = {
            ...ecs.Position.get(
              world,
              data.ball
            ),
          }

          ecs.Position.mutate(
            world,
            data.ball,
            (position) => {
              position.x +=
                0.02

              return false
            }
          )

          const after = {
            ...ecs.Position.get(
              world,
              data.ball
            ),
          }

          if (
            debugTick < 3 ||
            debugTick %
              60 ===
              0
          ) {
            console.log(
              'QB FORCED',
              {
                tick:
                  debugTick,

                before,
                after,

                previous:
                  previousDebugPosition,

                rootPosition: {
                  ...ecs.Position.get(
                    world,
                    eid
                  ),
                },

                rootScale: {
                  ...ecs.Scale.get(
                    world,
                    eid
                  ),
                },
              }
            )
          }

          previousDebugPosition =
            after

          debugTick++

          return
        }

        //
        // --------------------------------------------------------
        // NORMAL SIMULATION
        // --------------------------------------------------------
        //

        if (!moving) {
          return
        }

        //
        // Snapshot cursor-backed ECS components before
        // touching another Position entity.
        //

        const ball = {
          ...ecs.Position.get(
            world,
            data.ball
          ),
        }

        const target =
          data.target
            ? {
                ...ecs.Position.get(
                  world,
                  data.target
                ),
              }
            : undefined

        const result =
          stepBall(
            {
              position: {
                x: ball.x,
                z: ball.z,
              },

              velocity: {
                x: vx,
                z: vz,
              },
            },

            target
              ? {
                  x:
                    target.x,

                  z:
                    target.z,
                }
              : undefined
          )

        vx =
          result.velocity.x

        vz =
          result.velocity.z

        moving =
          result.moving

        //
        // Apply the simulation result to the rendered Ball.
        //

        ecs.Position.mutate(
          world,
          data.ball,
          (position) => {
            position.x =
              result.position.x

            position.z =
              result.position.z

            //
            // Never touch Y.
            //

            return false
          }
        )

        //
        // --------------------------------------------------------
        // HIT / SCORE
        // --------------------------------------------------------
        //

        if (result.hit) {
          game.hits += 1
          game.score += 1

          console.log(
            'QB TARGET HIT',
            {
              ...game,
            }
          )
        } else if (
          mode ===
            'simulation' &&
          (
            debugTick < 3 ||
            debugTick %
              60 ===
              0
          )
        ) {
          console.log(
            'QB SIMULATION',
            {
              ball,
              target,

              velocity: {
                x: vx,
                z: vz,
              },

              result,
            }
          )
        }

        debugTick++
      })
  },
})

export {QuantumBilliards}
