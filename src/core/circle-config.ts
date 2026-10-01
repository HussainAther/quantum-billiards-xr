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

  // Lowered for 8th Wall normalized touch coordinates.
  minDrag: 0.005,

  maxSpeed: 6,
  powerScale: 10,
  friction: 0.9985,
  stopSpeed: 0.01,
  dt: 1 / 60,
})