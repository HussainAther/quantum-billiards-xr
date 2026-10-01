import { CIRCLE_CONFIG } from './circle-config.ts'
import type { Vec2 } from './physics.ts'

const normalize = (p: Vec2): Vec2 => {
  const length = Math.hypot(p.x, p.z) || 1
  return {x: p.x / length, z: p.z / length}
}
const signedDistance = (p: Vec2) => CIRCLE_CONFIG.arenaRadius - Math.hypot(p.x, p.z)

// Adapted from source game.js tracePath / normalAt: y becomes z, state becomes
// explicit arguments. This is the source point-particle path, not ball physics.
export function traceCirclePath(yawDeg: number, power = 66): Vec2[] {
  if (!Number.isFinite(yawDeg) || !Number.isFinite(power)) throw new RangeError('Finite yaw and power required')
  let p = {...CIRCLE_CONFIG.source}
  let d = normalize({x: Math.cos(yawDeg * Math.PI / 180), z: Math.sin(yawDeg * Math.PI / 180)})
  const points = [{...p}]
  const maxSteps = Math.round(210 + Math.min(100, Math.max(18, power)) * 7.6)
  let bounces = 0
  for (let i = 0; i < maxSteps; i++) {
    const next = {x: p.x + d.x * 0.012, z: p.z + d.z * 0.012}
    if (signedDistance(next) >= 0) {
      p = next
      if (i % 2 === 0) points.push({...p})
      continue
    }
    const e = 0.0025
    const n = normalize({
      x: signedDistance({x: p.x + e, z: p.z}) - signedDistance({x: p.x - e, z: p.z}),
      z: signedDistance({x: p.x, z: p.z + e}) - signedDistance({x: p.x, z: p.z - e}),
    })
    const dot = d.x * n.x + d.z * n.z
    d = normalize({x: d.x - 2 * dot * n.x, z: d.z - 2 * dot * n.z})
    p = {x: p.x + n.x * 0.018, z: p.z + n.z * 0.018}
    points.push({...p})
    if (++bounces > 9) break
  }
  return points
}
