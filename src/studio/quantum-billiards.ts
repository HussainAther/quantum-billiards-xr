import * as ecs from '@8thwall/ecs'

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
    const arenaRadius = 0.84
    const ballRadius = 0.055

    const sourceX = -0.48
    const sourceZ = 0.34

    const targetHitRadius = 0.11

    // Shot tuning
    const minDrag = 0.025
    const maxSpeed = 6.0
    const powerScale = 10.0

    // Lower = more friction.
    // 0.9985 keeps the ball moving much longer than 0.995.
    const friction = 0.9985

    const aimLineBaseLength = 1.0

    let vx = 0
    let vz = 0

    let moving = false
    let dragging = false

    let startX = 0
    let startY = 0

    let currentX = 0
    let currentY = 0

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

      const ballPosition =
        ecs.Position.get(
          world,
          data.ball
        )

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

      updateAimLine()
    }

    const releaseShot = (
      event: any
    ) => {
      if (!dragging || moving) {
        return
      }

      const position =
        event.data?.position

      if (position) {
        currentX = position.x
        currentY = position.y
      }

      dragging = false

      const dx =
        currentX - startX

      const dy =
        currentY - startY

      const dragLength =
        Math.hypot(dx, dy)

      hideAimLine()

      if (dragLength < minDrag) {
        console.log(
          'SHOT CANCELLED: not enough force'
        )
        return
      }

      const dirX =
        dx / dragLength

      const dirZ =
        -dy / dragLength

      //
      // Much stronger power curve.
      //

      const speed =
        Math.min(
          dragLength *
            powerScale,
          maxSpeed
        )

      vx = dirX * speed
      vz = dirZ * speed

      moving = true

      console.log(
        'SHOT',
        {
          dx,
          dy,
          dragLength,
          speed,
          vx,
          vz,
        }
      )
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

        if (!moving) {
          return
        }

        const dt = 1 / 60

        ecs.Position.mutate(
          world,
          data.ball,
          (position) => {
            //
            // MOVE BALL
            //

            position.x +=
              vx * dt

            position.z +=
              vz * dt

            //
            // CIRCLE WALL COLLISION
            //

            const distance =
              Math.hypot(
                position.x,
                position.z
              )

            const maxDistance =
              arenaRadius -
              ballRadius

            if (
              distance >
              maxDistance
            ) {
              const nx =
                position.x /
                distance

              const nz =
                position.z /
                distance

              const dot =
                vx * nx +
                vz * nz

              vx -=
                2 * dot * nx

              vz -=
                2 * dot * nz

              position.x =
                nx *
                maxDistance

              position.z =
                nz *
                maxDistance

              console.log(
                'WALL BOUNCE',
                vx,
                vz
              )
            }

            //
            // TARGET COLLISION
            //

            if (data.target) {
              const targetPosition =
                ecs.Position.get(
                  world,
                  data.target
                )

              const targetDx =
                position.x -
                targetPosition.x

              const targetDz =
                position.z -
                targetPosition.z

              const targetDistance =
                Math.hypot(
                  targetDx,
                  targetDz
                )

              if (
                targetDistance <
                targetHitRadius
              ) {
                console.log(
                  'TARGET HIT'
                )

                vx = 0
                vz = 0
                moving = false

                position.x =
                  sourceX

                position.z =
                  sourceZ

                return false
              }
            }

            //
            // FRICTION
            //

            vx *= friction
            vz *= friction

            //
            // STOP WHEN VERY SLOW
            //

            const speed =
              Math.hypot(
                vx,
                vz
              )

            if (
              speed < 0.01
            ) {
              stopBall()
            }

            //
            // Never alter Y.
            //

            return false
          }
        )
      })
  },
})

export {QuantumBilliards}
