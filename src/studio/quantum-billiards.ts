import * as ecs from '@8thwall/ecs'

import {CIRCLE_CONFIG} from '../core/circle-config.ts'
import {createGameState} from '../core/game-state.ts'
import {shotVelocity, stepBall} from '../core/simulation.ts'

import {
  predictCircleTrajectoryFromDrag,
} from '../core/trajectory.ts'

import {
  computeFocus,
  circleFieldValue,
} from '../core/quantum-state.ts'

import {
  getChallenge,
} from '../core/challenges.ts'

import {
  measureTarget,
  resolveMeasurement,
  samplesToPath,
} from '../core/measurement.ts'

import {
  createQuantumBilliardsHud,
} from './hud.ts'


//
// ============================================================
// RUNTIME OPTIONS
// ============================================================
//

const USE_QUANTUM_MEASUREMENT = true

//
// About half a second at ~60 Hz.
//
// We deliberately delay collapse briefly so the player gets to
// see the launched ball move along the predicted path.
//
const QUANTUM_COLLAPSE_TICKS = 30

const TRAJECTORY_HOLD_TICKS = 30

const TARGET_PULSE_TICKS = 18
const TARGET_PULSE_AMOUNT = 0.35


const debugMode = () =>
  (globalThis as any).__QB_DEBUG_MODE || 'off'


type Point = {
  x: number
  z: number
}


type Segment = {
  start: Point
  end: Point
}


type ScaleSnapshot = {
  x: number
  y: number
  z: number
}


type TrajectorySample = {
  point: Point
  bounce?: boolean
}


const QuantumBilliards = ecs.registerComponent({
  name: 'Quantum Billiards',

  schema: {
    ball: ecs.eid,
    aimLine: ecs.eid,
    target: ecs.eid,

    trajectory1: ecs.eid,
    trajectory2: ecs.eid,
    trajectory3: ecs.eid,
    trajectory4: ecs.eid,
    trajectory5: ecs.eid,
    trajectory6: ecs.eid,
    trajectory7: ecs.eid,
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


    //
    // ============================================================
    // GAME / QUANTUM STATE
    // ============================================================
    //

    const game =
      createGameState()

    const hud =
      createQuantumBilliardsHud()

    //
    // Circle challenge currently being ported.
    //
    const challenge =
      getChallenge(0)

    //
    // Circle is an Integrable billiard.
    //
    const arenaClass =
      'Integrable' as const

    const focus =
      computeFocus({
        geometry:
          challenge.geometry,

        arenaClass,

        energy:
          challenge.energy,

        power:
          challenge.power,
      })


    //
    // Current live aiming preview.
    //
    let measurementScore:
      number | undefined


    //
    // Combo is part of donor-style measurement scoring.
    //
    let combo = 0


    //
    // Measurement result captured at release.
    //
    let pendingMeasurement:
      ReturnType<
        typeof resolveMeasurement
      > | undefined

    let quantumCollapseTicks = 0


    const updateHud = () => {
      hud.update(
        game
      )

      hud.updateQuantum({
        energy:
          challenge.energy,

        coherence:
          focus.coherence,

        epsilon:
          focus.epsilon,

        focus:
          focus.label,

        measurement:
          measurementScore,
      })
    }


    //
    // ============================================================
    // BALL / INPUT STATE
    // ============================================================
    //

    let vx = 0
    let vz = 0

    let moving = false
    let dragging = false

    let startX = 0
    let startY = 0

    let currentX = 0
    let currentY = 0

    let bestDx = 0
    let bestDy = 0
    let bestDragLength = 0

    let trajectoryHoldTicks = 0

    let targetPulseTicks = 0

    let targetBaseScale:
      | ScaleSnapshot
      | undefined

    let predictedBouncePoints:
      Point[] = []

    let actualBounceIndex = 0

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
    // BASIC HELPERS
    // ============================================================
    //

    const nowMs = () => {
      if (
        typeof performance !==
        'undefined'
      ) {
        return performance.now()
      }

      return Date.now()
    }


    const stopBall = () => {
      vx = 0
      vz = 0
      moving = false
    }


    const clearMeasurementPreview = () => {
      measurementScore =
        undefined

      updateHud()
    }


    const hideEntity = (
      entity: bigint
    ) => {
      ecs.Scale.mutate(
        world,
        entity,
        (scale) => {
          scale.x = 0.001
          scale.y = 0.001
          scale.z = 0.001

          return false
        }
      )
    }


    const trajectoryEntities = () => {
      const data =
        schemaAttribute.get(
          eid
        )

      return [
        data.aimLine,
        data.trajectory1,
        data.trajectory2,
        data.trajectory3,
        data.trajectory4,
        data.trajectory5,
        data.trajectory6,
        data.trajectory7,
      ]
    }


    const hideTrajectory = () => {
      trajectoryHoldTicks = 0

      for (
        const entity
        of trajectoryEntities()
      ) {
        if (!entity) {
          continue
        }

        hideEntity(
          entity
        )
      }
    }


    //
    // ============================================================
    // TRAJECTORY GEOMETRY
    // ============================================================
    //

    const showSegment = (
      entity: bigint,
      start: Point,
      end: Point,
      y: number
    ) => {
      const dx =
        end.x -
        start.x

      const dz =
        end.z -
        start.z

      const length =
        Math.hypot(
          dx,
          dz
        )

      if (
        length <
        1e-6
      ) {
        hideEntity(
          entity
        )

        return
      }


      const centerX =
        (
          start.x +
          end.x
        ) * 0.5

      const centerZ =
        (
          start.z +
          end.z
        ) * 0.5

      const angle =
        Math.atan2(
          dx,
          dz
        )


      ecs.Position.mutate(
        world,
        entity,
        (position) => {
          position.x =
            centerX

          position.y =
            y

          position.z =
            centerZ

          return false
        }
      )


      ecs.Quaternion.mutate(
        world,
        entity,
        (rotation) => {
          const half =
            angle *
            0.5

          rotation.x = 0

          rotation.y =
            Math.sin(
              half
            )

          rotation.z = 0

          rotation.w =
            Math.cos(
              half
            )

          return false
        }
      )


      ecs.Scale.mutate(
        world,
        entity,
        (scale) => {
          scale.x = 0.012
          scale.y = 0.006
          scale.z = length

          return false
        }
      )
    }


    const samplesToSegments = (
      samples:
        TrajectorySample[]
    ): Segment[] => {
      if (
        samples.length <
        2
      ) {
        return []
      }


      const segments:
        Segment[] = []


      let start = {
        ...samples[0].point,
      }


      for (
        let i = 1;
        i < samples.length;
        i++
      ) {
        const sample =
          samples[i]

        if (
          sample.bounce
        ) {
          segments.push({
            start: {
              ...start,
            },

            end: {
              ...sample.point,
            },
          })

          start = {
            ...sample.point,
          }
        }
      }


      const last =
        samples[
          samples.length -
          1
        ]


      if (
        Math.hypot(
          last.point.x -
            start.x,

          last.point.z -
            start.z
        ) >
        1e-6
      ) {
        segments.push({
          start: {
            ...start,
          },

          end: {
            ...last.point,
          },
        })
      }


      return segments
    }


    //
    // ============================================================
    // PURE TRAJECTORY PREDICTION
    // ============================================================
    //

    const predictionForDrag = (
      dx: number,
      dy: number,
      maxBounces = 8
    ) => {
      const data =
        schemaAttribute.get(
          eid
        )


      if (!data.ball) {
        return {
          ball:
            undefined,

          samples:
            [] as TrajectorySample[],
        }
      }


      //
      // Snapshot cursor-backed ECS data immediately.
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
            x:
              ball.x,

            z:
              ball.z,
          },

          dx,
          dy,

          {
            maxBounces,

            stepDistance:
              0.015,

            maxSamples:
              900,
          }
        )


      return {
        ball,
        samples,
      }
    }


    //
    // ============================================================
    // RECEIVER / QUANTUM MEASUREMENT
    // ============================================================
    //

    const receiverSnapshot = () => {
      const data =
        schemaAttribute.get(
          eid
        )

      if (!data.target) {
        return undefined
      }

      const position = {
        ...ecs.Position.get(
          world,
          data.target
        ),
      }

      return {
        index:
          challenge
            .targetIndices[0],

        position: {
          x:
            position.x,

          z:
            position.z,
        },

        active:
          true,
      }
    }


    const densityAtReceiver = (
      point: Point
    ) =>
      circleFieldValue(
        point,
        nowMs(),
        challenge.energy
      )


    //
    // Live preview while dragging.
    //
    const updateMeasurementPreview = (
      samples:
        TrajectorySample[]
    ) => {
      const target =
        receiverSnapshot()

      if (
        !target ||
        samples.length <
          2
      ) {
        measurementScore =
          undefined

        updateHud()

        return
      }


      const path =
        samplesToPath(
          samples
        )


      const measurement =
        measureTarget({
          target,

          path,

          density:
            densityAtReceiver(
              target.position
            ),

          power:
            challenge.power,

          focus,

          arenaClass,

          scarLock:
            focus.scarLock,
        })


      measurementScore =
        measurement.score


      updateHud()
    }


    //
    // Full donor-style measurement resolution at shot release.
    //
    const resolveShotMeasurement = (
      samples:
        TrajectorySample[]
    ) => {
      const target =
        receiverSnapshot()

      if (
        !target ||
        samples.length <
          2
      ) {
        return undefined
      }


      const path =
        samplesToPath(
          samples
        )


      return resolveMeasurement({
        path,

        targets: [
          target,
        ],

        arenaClass,

        focus,

        power:
          challenge.power,

        energy:
          challenge.energy,

        scarLock:
          focus.scarLock,

        comboBefore:
          combo,

        densityAt:
          densityAtReceiver,
      })
    }


    //
    // ============================================================
    // TRAJECTORY PREVIEW
    // ============================================================
    //

    const updateTrajectory = () => {
      const data =
        schemaAttribute.get(
          eid
        )


      if (
        !data.ball ||
        !data.aimLine
      ) {
        return
      }


      const dx =
        currentX -
        startX

      const dy =
        currentY -
        startY


      if (
        Math.hypot(
          dx,
          dy
        ) <
        minDrag
      ) {
        hideTrajectory()

        measurementScore =
          undefined

        updateHud()

        return
      }


      const {
        ball,
        samples,
      } =
        predictionForDrag(
          dx,
          dy
        )


      if (!ball) {
        hideTrajectory()

        measurementScore =
          undefined

        updateHud()

        return
      }


      //
      // Quantum readout and visual path are based on the
      // exact same predicted trajectory.
      //
      updateMeasurementPreview(
        samples
      )


      const segments =
        samplesToSegments(
          samples
        )


      const entities =
        trajectoryEntities()


      const y =
        ball.y +
        0.01


      for (
        let i = 0;
        i <
        entities.length;
        i++
      ) {
        const entity =
          entities[i]

        if (!entity) {
          continue
        }


        const segment =
          segments[i]


        if (!segment) {
          hideEntity(
            entity
          )

          continue
        }


        showSegment(
          entity,
          segment.start,
          segment.end,
          y
        )
      }
    }


    //
    // ============================================================
    // TARGET PULSE
    // ============================================================
    //

    const restoreTargetScale = () => {
      const data =
        schemaAttribute.get(
          eid
        )


      if (
        !data.target ||
        !targetBaseScale
      ) {
        return
      }


      ecs.Scale.mutate(
        world,
        data.target,
        (scale) => {
          scale.x =
            targetBaseScale!.x

          scale.y =
            targetBaseScale!.y

          scale.z =
            targetBaseScale!.z

          return false
        }
      )
    }


    const startTargetPulse = () => {
      const data =
        schemaAttribute.get(
          eid
        )

      if (!data.target) {
        return
      }


      if (
        !targetBaseScale
      ) {
        targetBaseScale = {
          ...ecs.Scale.get(
            world,
            data.target
          ),
        }
      }


      targetPulseTicks =
        TARGET_PULSE_TICKS
    }


    const updateTargetPulse = () => {
      if (
        targetPulseTicks <=
        0
      ) {
        return
      }


      const data =
        schemaAttribute.get(
          eid
        )


      if (
        !data.target ||
        !targetBaseScale
      ) {
        targetPulseTicks =
          0

        return
      }


      const elapsed =
        TARGET_PULSE_TICKS -
        targetPulseTicks


      const t =
        elapsed /
        Math.max(
          1,

          TARGET_PULSE_TICKS -
            1
        )


      const pulse =
        1 +
        TARGET_PULSE_AMOUNT *
          Math.sin(
            Math.PI *
            t
          )


      ecs.Scale.mutate(
        world,
        data.target,
        (scale) => {
          scale.x =
            targetBaseScale!.x *
            pulse

          scale.y =
            targetBaseScale!.y *
            pulse

          scale.z =
            targetBaseScale!.z *
            pulse

          return false
        }
      )


      targetPulseTicks--


      if (
        targetPulseTicks ===
        0
      ) {
        restoreTargetScale()
      }
    }


    //
    // ============================================================
    // BALL RESET
    // ============================================================
    //

    const resetBallPosition = () => {
      const data =
        schemaAttribute.get(
          eid
        )

      if (!data.ball) {
        return
      }


      stopBall()


      ecs.Position.mutate(
        world,
        data.ball,
        (position) => {
          position.x =
            source.x

          position.z =
            source.z

          return false
        }
      )
    }


    const resetBall = () => {
      const data =
        schemaAttribute.get(
          eid
        )


      if (!data.ball) {
        console.warn(
          'QB: no Ball entity assigned'
        )

        return
      }


      resetBallPosition()

      dragging = false

      hideTrajectory()

      measurementScore =
        undefined

      pendingMeasurement =
        undefined

      quantumCollapseTicks =
        0

      predictedBouncePoints =
        []

      actualBounceIndex =
        0
    }


    //
    // ============================================================
    // QUANTUM COLLAPSE
    // ============================================================
    //

    const applyQuantumCollapse = () => {
      const resolution =
        pendingMeasurement


      pendingMeasurement =
        undefined

      quantumCollapseTicks =
        0


      if (!resolution) {
        return
      }


      //
      // MISS
      //
      if (
        !resolution.hit
      ) {
        combo = 0

        console.log(
          'QB MEASUREMENT MISS',
          {
            score:
              resolution.best
                ?.score,

            threshold:
              resolution.threshold,
          }
        )

        return
      }


      //
      // HIT / COLLAPSE
      //
      combo =
        resolution.combo

      game.hits +=
        1

      game.score +=
        resolution
          .targetScore


      updateHud()

      hud.flashHit()

      startTargetPulse()


      console.log(
        'QB QUANTUM COLLAPSE',
        {
          measurement:
            resolution.best
              ?.score,

          threshold:
            resolution.threshold,

          perfect:
            resolution.perfect,

          targetScore:
            resolution
              .targetScore,

          combo,

          totalScore:
            game.score,
        }
      )


      //
      // Collapse concludes the shot.
      //
      resetBallPosition()

      hideTrajectory()

      predictedBouncePoints =
        []

      actualBounceIndex =
        0
    }


    const updateQuantumCollapse = () => {
      if (
        !USE_QUANTUM_MEASUREMENT ||
        !pendingMeasurement ||
        quantumCollapseTicks <=
          0
      ) {
        return
      }


      quantumCollapseTicks--


      if (
        quantumCollapseTicks ===
        0
      ) {
        applyQuantumCollapse()
      }
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
        debugMode() ===
          'forced' ||
        moving
      ) {
        return
      }


      const position =
        event.data?.position


      if (!position) {
        return
      }


      startX =
        position.x

      startY =
        position.y

      currentX =
        startX

      currentY =
        startY


      bestDx = 0
      bestDy = 0
      bestDragLength = 0


      dragging =
        true


      hideTrajectory()

      clearMeasurementPreview()
    }


    const updateDrag = (
      event: any
    ) => {
      if (
        debugMode() ===
          'forced' ||
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
        bestDx =
          dx

        bestDy =
          dy

        bestDragLength =
          length
      }


      updateTrajectory()
    }


    const releaseShot = (
      event: any
    ) => {
      if (
        debugMode() ===
          'forced' ||
        !dragging ||
        moving
      ) {
        return
      }


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
          bestDx =
            endDx

          bestDy =
            endDy

          bestDragLength =
            endLength
        }
      }


      dragging =
        false


      const velocity =
        shotVelocity(
          bestDx,
          bestDy
        )


      if (!velocity) {
        hideTrajectory()

        clearMeasurementPreview()


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


      //
      // Recompute prediction from the strongest drag sample.
      //
      const prediction =
        predictionForDrag(
          bestDx,
          bestDy
        )


      //
      // Save expected bank locations for the parity diagnostic.
      //
      predictedBouncePoints =
        prediction.samples
          .filter(
            (
              sample
            ) =>
              sample.bounce
          )
          .map(
            (
              sample
            ) => ({
              ...sample.point,
            })
          )


      actualBounceIndex =
        0


      //
      // Resolve the donor-style quantum measurement now,
      // but delay applying collapse so the ball visibly moves.
      //
      if (
        USE_QUANTUM_MEASUREMENT
      ) {
        pendingMeasurement =
          resolveShotMeasurement(
            prediction.samples
          )

        quantumCollapseTicks =
          QUANTUM_COLLAPSE_TICKS
      } else {
        pendingMeasurement =
          undefined

        quantumCollapseTicks =
          0
      }


      //
      // Preserve the predicted path briefly after release.
      //
      trajectoryHoldTicks =
        TRAJECTORY_HOLD_TICKS


      vx =
        velocity.x

      vz =
        velocity.z

      moving =
        true


      game.shots +=
        1


      //
      // Measurement percentage is an AIM display only.
      //
      measurementScore =
        undefined


      updateHud()


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

            measurementMode:
              USE_QUANTUM_MEASUREMENT,

            measurement:
              pendingMeasurement
                ?.best
                ?.score,

            threshold:
              pendingMeasurement
                ?.threshold,

            predictedHit:
              pendingMeasurement
                ?.hit,

            perfect:
              pendingMeasurement
                ?.perfect,

            predictedBounces:
              predictedBouncePoints,
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
        const data =
          schemaAttribute.get(
            eid
          )


        if (
          data.target
        ) {
          targetBaseScale = {
            ...ecs.Scale.get(
              world,
              data.target
            ),
          }
        }


        resetBall()

        updateHud()


        console.log(
          'Quantum Billiards ready',
          {
            challenge:
              challenge.name,

            energy:
              challenge.energy,

            coherence:
              focus.coherence,

            epsilon:
              focus.epsilon,

            focus:
              focus.label,

            quantumMeasurement:
              USE_QUANTUM_MEASUREMENT,
          }
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
        // These visual/state timers run whether or not the
        // physical ball is currently moving.
        //
        updateTargetPulse()

        updateQuantumCollapse()


        if (
          trajectoryHoldTicks >
          0
        ) {
          trajectoryHoldTicks--


          if (
            trajectoryHoldTicks ===
            0
          ) {
            hideTrajectory()
          }
        }


        //
        // Quantum collapse may have reset/stopped the ball above.
        //
        if (
          USE_QUANTUM_MEASUREMENT &&
          !moving
        ) {
          return
        }


        //
        // --------------------------------------------------------
        // FORCED POSITION DIAGNOSTIC
        // --------------------------------------------------------
        //

        if (
          mode ===
          'forced'
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
            debugTick <
              3 ||
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


        const inputVelocity = {
          x:
            vx,

          z:
            vz,
        }


        //
        // IMPORTANT:
        //
        // In quantum-measurement mode we deliberately do NOT pass
        // the Socket into stepBall().
        //
        // That prevents the old physical-overlap code from:
        //
        //   - declaring the hit
        //   - resetting the Ball
        //   - competing with measurement collapse
        //
        const physicsTarget =
          USE_QUANTUM_MEASUREMENT
            ? undefined
            : target
              ? {
                  x:
                    target.x,

                  z:
                    target.z,
                }
              : undefined


        const result =
          stepBall(
            {
              position: {
                x:
                  ball.x,

                z:
                  ball.z,
              },

              velocity: {
                ...inputVelocity,
              },
            },

            physicsTarget
          )


        //
        // --------------------------------------------------------
        // WALL REFLECTION PARITY
        // --------------------------------------------------------
        //

        const inputSpeed =
          Math.hypot(
            inputVelocity.x,
            inputVelocity.z
          )


        const outputSpeed =
          Math.hypot(
            result.velocity.x,
            result.velocity.z
          )


        let bounced =
          false


        if (
          inputSpeed >
            1e-9 &&
          outputSpeed >
            1e-9
        ) {
          const directionDot =
            (
              inputVelocity.x *
                result.velocity.x +
              inputVelocity.z *
                result.velocity.z
            ) /
            (
              inputSpeed *
              outputSpeed
            )


          bounced =
            directionDot <
            0.999
        }


        if (bounced) {
          const expected =
            predictedBouncePoints[
              actualBounceIndex
            ]


          const actual = {
            x:
              result.position.x,

            z:
              result.position.z,
          }


          const error =
            expected
              ? Math.hypot(
                  actual.x -
                    expected.x,

                  actual.z -
                    expected.z
                )
              : undefined


          console.log(
            'QB BOUNCE PARITY',
            {
              bounce:
                actualBounceIndex +
                1,

              expected,
              actual,
              error,
            }
          )


          actualBounceIndex++
        }


        //
        // --------------------------------------------------------
        // APPLY PHYSICS RESULT
        // --------------------------------------------------------
        //

        vx =
          result.velocity.x

        vz =
          result.velocity.z

        moving =
          result.moving


        ecs.Position.mutate(
          world,
          data.ball,
          (position) => {
            position.x =
              result.position.x

            position.z =
              result.position.z

            return false
          }
        )


        //
        // --------------------------------------------------------
        // LEGACY PHYSICAL HIT MODE
        // --------------------------------------------------------
        //

        if (
          !USE_QUANTUM_MEASUREMENT &&
          result.hit
        ) {
          combo = 0

          game.hits +=
            1

          game.score +=
            1


          updateHud()

          hud.flashHit()

          startTargetPulse()


          console.log(
            'QB PHYSICAL TARGET HIT',
            {
              ...game,
            }
          )
        }


        if (
          mode ===
            'simulation' &&
          (
            debugTick <
              3 ||
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

              inputVelocity,

              result,

              pendingMeasurement:
                pendingMeasurement
                  ?.best
                  ?.score,

              threshold:
                pendingMeasurement
                  ?.threshold,
            }
          )
        }


        debugTick++
      })
  },
})


export {QuantumBilliards}
