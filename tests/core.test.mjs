import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import {getArena, boundaryPoints} from '../src/core/arenas.js'
import {reflectCircle} from '../src/core/physics.ts'
import {CIRCLE_CONFIG as config} from '../src/core/circle-config.ts'
import {shotVelocity, stepBall} from '../src/core/simulation.ts'
import {traceCirclePath} from '../src/core/trajectory.ts'
const near = (a,b) => assert.ok(Math.abs(a-b)<1e-12, `${a} != ${b}`)

test('source Circle geometry and receiver coordinates',()=>{
 const arena=getArena('circle')
 assert.equal(arena.radius,.84)
 assert.deepEqual(arena.source,{x:-.48,y:.34})
 assert.deepEqual(arena.targets,[{x:.46,y:-.28},{x:.08,y:.61},{x:-.09,y:-.54},{x:.61,y:.27}])
 const points=boundaryPoints(arena)
 assert.equal(points.length,96)
 points.forEach(p=>near(Math.hypot(p.x,p.y),.84))
 assert.throws(()=>getArena('triangle'))
})
test('drag deadzone, direction, exact threshold and capped power',()=>{
 assert.equal(shotVelocity(config.minDrag-.001,0),null)
 assert.equal(shotVelocity(NaN,0),null)
 near(shotVelocity(config.minDrag,0).x,1.5)
 near(shotVelocity(.3,.4).x,3.6); near(shotVelocity(.3,.4).z,-4.8)
 near(Math.hypot(...Object.values(shotVelocity(3,4))),6)
})
test('integration precedes friction and inputs are immutable',()=>{
 const ball={position:{x:0,z:0},velocity:{x:3,z:2}}
 const before=structuredClone(ball)
 const next=stepBall(ball)
 near(next.position.x,.05); near(next.position.z,2/60)
 near(next.velocity.x,3*.9985)
 assert.deepEqual(ball,before)
 assert.equal(next.moving,true)
})
test('Circle reflection preserves speed and reverses normal component',()=>{
 const next=reflectCircle({x:.8,z:0},{x:3,z:2},.84,.055)
 near(next.position.x,.785)
 assert.deepEqual(next.velocity,{x:-3,z:2})
 near(Math.hypot(next.velocity.x,next.velocity.z),Math.sqrt(13))
 const inside=reflectCircle({x:0,z:0},{x:3,z:2},.84,.055)
 assert.deepEqual(inside.velocity,{x:3,z:2})
})
test('receiver hit resets to source; exact capture edge is excluded',()=>{
 const next=stepBall({position:{x:0,z:0},velocity:{x:3,z:0}},{x:.05,z:0})
 assert.equal(next.hit,true); assert.equal(next.moving,false)
 assert.deepEqual(next.position,config.source)
 assert.deepEqual(next.velocity,{x:0,z:0})
 assert.equal(stepBall({position:{x:0,z:0},velocity:{x:0,z:0}},{x:.11,z:0}).hit,false)
})
test('slow ball stops and repeated strong banks stay bounded',()=>{
 assert.equal(stepBall({position:{x:0,z:0},velocity:{x:.009,z:0}}).moving,false)
 let ball={position:{...config.source},velocity:shotVelocity(.6,.2)}
 for(let i=0;i<1000;i++) {
  const speed=Math.hypot(ball.velocity.x,ball.velocity.z)
  ball=stepBall(ball)
  assert.ok(Math.hypot(ball.position.x,ball.position.z)<=.785+1e-12)
  assert.ok(Math.hypot(ball.velocity.x,ball.velocity.z)<=speed+1e-12)
 }
})
test('source tracer matches independently executed donor fixtures',()=>{
 const fixtures=JSON.parse(fs.readFileSync(new URL('./fixtures/source-circle.json',import.meta.url)))
 for(const fixture of fixtures) {
  const path=traceCirclePath(fixture.yaw,fixture.power)
  assert.equal(path.length,fixture.length)
  for(const {index,point} of fixture.samples) {
   near(path[index].x,point.x); near(path[index].z,point.y)
  }
  path.forEach(p=>assert.ok(Math.hypot(p.x,p.z)<=.84+1e-12))
 }
 assert.deepEqual(traceCirclePath(0,-10),traceCirclePath(0,18))
 assert.deepEqual(traceCirclePath(0,200),traceCirclePath(0,100))
 assert.throws(()=>traceCirclePath(Infinity))
})

test('fast shots cannot tunnel through a receiver between frame samples',()=>{
 const next=stepBall({position:{x:0,z:0},velocity:{x:6,z:0}},{x:.05,z:0})
 assert.equal(next.hit,true)
 assert.equal(next.moving,false)
 assert.deepEqual(next.position,config.source)
})

test('physics-matched Circle trajectory uses ball-center boundary', async()=>{
 const {predictCircleTrajectory}=await import('../src/core/trajectory.ts')
 const path=predictCircleTrajectory(config.source,{x:6,z:0},{maxBounces:1,stepDistance:.01})
 assert.ok(path.length>2)
 const bounce=path.find(s=>s.bounce)
 assert.ok(bounce)
 assert.ok(Math.hypot(bounce.point.x,bounce.point.z)<=config.arenaRadius-config.ballRadius+1e-12)
})
