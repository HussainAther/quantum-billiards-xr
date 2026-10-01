import { getArena } from './arenas.js'

const arena = getArena('circle')

export const CIRCLE_CONFIG = Object.freeze({
  arenaRadius: arena.radius,
  ballRadius: 0.055,

  source: Object.freeze({
    x: arena.source.x,
    z: arena.source.y,
  }),

  targetHitRadius: 0.11,

  // 8th Wall touch positions are normalized screen coordinates.
  minDrag: 0.005,

  // Shot tuning. Valid drags are remapped to [minSpeed, maxSpeed].
  minSpeed: 1.5,
  maxSpeed: 6,
  powerSaturationDrag: 0.15,

  // Per-frame damping at the nominal 60 Hz simulation step.
  friction: 0.9985,
  stopSpeed: 0.01,
  dt: 1 / 60,

  // Prevent fast shots from tunneling through small targets or skipping too
  // deeply through the circular wall in a single frame.
  maxSubstepDistance: 0.02,
})
