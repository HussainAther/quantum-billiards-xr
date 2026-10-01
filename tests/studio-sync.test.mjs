import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {syncStudio} from '../scripts/sync-studio.mjs'
async function project(t) {
 const dir=await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(),'qb-studio-')))
 t.after(()=>fs.rm(dir,{recursive:true,force:true}))
 await fs.mkdir(path.join(dir,'src')); await fs.mkdir(path.join(dir,'config'))
 await fs.writeFile(path.join(dir,'package.json'),JSON.stringify({name:'@8thwall/studio-build'}))
 for(const name of ['src/.expanse.json','src/index.html','config/entry-plugin.js','tsconfig.json']) await fs.writeFile(path.join(dir,name),'{}')
 return dir
}
const log=()=>{}
test('sync dry run writes nothing; actual sync preserves scene and unrelated code',async t=>{
 const dir=await project(t)
 await fs.writeFile(path.join(dir,'src/other.ts'),'// user content')
 await syncStudio({project:dir,dryRun:true,log})
 assert.equal((await fs.readdir(path.join(dir,'src'))).length,3)
 await syncStudio({project:dir,log})
 const adapter=await fs.readFile(path.join(dir,'src/quantum-billiards.ts'),'utf8')
 assert.ok(adapter.includes("from './core/simulation'"))
 assert.equal(await fs.readFile(path.join(dir,'src/other.ts'),'utf8'),'// user content')
 assert.equal(await fs.readFile(path.join(dir,'src/.expanse.json'),'utf8'),'{}')
 await syncStudio({project:dir,log})
 await fs.appendFile(path.join(dir,'src/core/simulation.ts'),'\n// local edit')
 await assert.rejects(syncStudio({project:dir,log}),/Local edits/)
})
test('unmanaged conflicts abort before writing any script',async t=>{
 const dir=await project(t)
 await fs.mkdir(path.join(dir,'src/core'))
 await fs.writeFile(path.join(dir,'src/core/physics.ts'),'// unrelated')
 await assert.rejects(syncStudio({project:dir,log}),/Local edits/)
 await assert.rejects(fs.access(path.join(dir,'src/quantum-billiards.ts')))
})
test('invalid/missing destination and symlink paths fail safely',async t=>{
 await assert.rejects(syncStudio({log}),/Set EIGHTHWALL/)
 const dir=await project(t)
 await assert.rejects(syncStudio({project:path.join(dir,'missing'),log}))
 await fs.symlink(os.tmpdir(),path.join(dir,'src/core'))
 await assert.rejects(syncStudio({project:dir,log}),/Symlink refused/)
})
