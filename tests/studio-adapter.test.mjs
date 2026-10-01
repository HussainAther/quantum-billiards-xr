import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import {stripTypeScriptTypes} from 'node:module'
import {CIRCLE_CONFIG} from '../src/core/circle-config.ts'
import {shotVelocity,stepBall} from '../src/core/simulation.ts'

function harness() {
 const positions=new Map([[1,{x:0,y:0,z:0}],[2,{x:-.48,y:.105,z:.34}],[3,{x:0,y:.115,z:0}],[4,{x:.46,y:.066,z:-.28}]])
 // Match installed ECS behavior: get and mutate retarget one cursor per attribute.
 function attribute(values) {
  let current
  const cursor=new Proxy({}, {get:(_,key)=>values.get(current)[key],set:(_,key,value)=>{values.get(current)[key]=value;return true},ownKeys:()=>Object.keys(values.get(current)),getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})})
  return {get:(_,eid)=>{current=eid;return cursor},mutate:(_,eid,fn)=>{current=eid;fn(cursor)}}
 }
 let component, tick, enter
 const listeners={}
 const chain={initial(){return this},onEnter(fn){enter=fn;return this},listen(_,name,fn){listeners[name]=fn;return this},onTick(fn){tick=fn;return this}}
 const ecs={eid:0,registerComponent:c=>(component=c),Position:attribute(positions),Scale:attribute(new Map([[1,{x:1,y:1,z:1}],[3,{x:1,y:1,z:1}]])),Quaternion:attribute(new Map([[3,{x:0,y:0,z:0,w:1}]])),input:{SCREEN_TOUCH_START:'start',SCREEN_TOUCH_MOVE:'move',SCREEN_TOUCH_END:'end'}}
 const source=stripTypeScriptTypes(fs.readFileSync(new URL('../src/studio/quantum-billiards.ts',import.meta.url),'utf8')).replace(/^import .*$/gm,'').replace(/export \{\s*QuantumBilliards\s*\};?/,'')
 const context={ecs,CIRCLE_CONFIG,shotVelocity,stepBall,console:{log(){}}}
 vm.runInNewContext(source,context)
 component.stateMachine({world:{events:{globalId:0}},eid:1,schemaAttribute:{get:()=>({ball:2,aimLine:3,target:4})},defineState:()=>chain})
 enter()
 return {positions,tick,listeners,context}
}
test('Studio shared Position cursor does not turn every shot into an immediate hit',()=>{
 const h=harness()
 h.listeners.start({data:{position:{x:0,y:0}}})
 h.listeners.move({data:{position:{x:.6,y:0}}})
 // AimLine center is relative to Ball, not its previous transform.
 assert.ok(Math.abs(h.positions.get(3).x-.12)<1e-12)
 assert.equal(h.positions.get(3).z,.34)
 h.listeners.end({data:{position:{x:.6,y:0}}})
 h.tick()
 assert.ok(Math.abs(h.positions.get(2).x-(-.38))<1e-12)
 h.tick()
 assert.ok(h.positions.get(2).x>-.29)
 assert.equal(h.positions.get(2).z,.34)
 assert.equal(h.positions.get(2).y,.105)
})
test('forced diagnostic bypasses simulation and accumulates X movement',()=>{
 const h=harness();h.context.__QB_DEBUG_MODE='forced'
 for(let i=0;i<10;i++)h.tick()
 assert.ok(Math.abs(h.positions.get(2).x-(-.28))<1e-12)
})
