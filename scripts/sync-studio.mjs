import fs from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {createHash} from 'node:crypto'
const root = fileURLToPath(new URL('../', import.meta.url))
const hash = text => createHash('sha256').update(text).digest('hex')
const exists = async file => {try {await fs.lstat(file); return true} catch(e) {if(e.code==='ENOENT') return false; throw e}}

// Refuse symlinks anywhere in managed paths, including destination parents.
async function safePath(file) {
  for (let p=path.resolve(file); ; p=path.dirname(p)) {
    if (await exists(p) && (await fs.lstat(p)).isSymbolicLink()) throw Error(`Symlink refused: ${p}`)
    if (p===path.dirname(p)) break
  }
}
export async function syncStudio({project, dryRun=false, generateOnly=false, log=console.log}={}) {
  const manifest=JSON.parse(await fs.readFile(path.join(root,'scripts/studio-files.json'),'utf8'))
  const files=await Promise.all(manifest.map(async ([source,destination])=>{
    const original=await fs.readFile(path.join(root,source),'utf8')
    // Studio's tsconfig does not allow .ts import extensions. Webpack resolves them.
    const text=original.replaceAll("'../core/", "'./core/").replace(/(from\s+['"][^'"]+)\.ts(['"])/g,'$1$2')
    return {source,destination,original,text}
  }))
  let destinationRoot
  let previous={}
  let stateFile
  if (!generateOnly) {
    if (!project) throw Error('Set EIGHTHWALL_STUDIO_PROJECT or studio-sync.local.json project. No default destination.')
    destinationRoot=path.resolve(project)
    await safePath(destinationRoot)
    const pkg=JSON.parse(await fs.readFile(path.join(destinationRoot,'package.json'),'utf8'))
    if(pkg.name!=='@8thwall/studio-build') throw Error('Destination is not an 8th Wall Studio build project')
    for (const required of ['src/.expanse.json','src/index.html','config/entry-plugin.js','tsconfig.json']) {
      if(!await exists(path.join(destinationRoot,required))) throw Error(`Missing project marker: ${required}`)
    }
    stateFile=path.join(destinationRoot,'.quantum-billiards-sync.json')
    await safePath(stateFile)
    if(await exists(stateFile)) previous=JSON.parse(await fs.readFile(stateFile,'utf8'))
    // Preflight every file before writing anything. First sync may adopt an exact
    // copy of canonical source; changed Studio files always require reconciliation.
    for(const file of files) {
      const dest=path.join(destinationRoot,'src',file.destination)
      await safePath(dest)
      if(await exists(dest)) {
        const current=await fs.readFile(dest,'utf8')
        if(current!==file.text && current!==file.original && hash(current)!==previous[file.destination]) {
          throw Error(`Local edits/unmanaged file: ${dest}. Reconcile into src/ before syncing; nothing copied.`)
        }
        file.before=current
      }
    }
  }
  for(const file of files) {
    const mirror=path.join(root,'studio-project',file.destination)
    await safePath(mirror)
  }
  if(dryRun) {
    files.forEach(f=>log(`WOULD COPY ${f.source} -> ${destinationRoot ? path.join(destinationRoot,'src',f.destination) : 'studio-project/'+f.destination}`))
    return
  }
  for(const file of files) {
    const mirror=path.join(root,'studio-project',file.destination)
    await fs.mkdir(path.dirname(mirror),{recursive:true})
    await fs.writeFile(mirror,file.text)
  }
  if(generateOnly) {files.forEach(f=>log(`GENERATED studio-project/${f.destination}`)); return}
  const state={...previous}
  for(const file of files) {
    const dest=path.join(destinationRoot,'src',file.destination)
    // Recheck to avoid overwriting editor changes made since preflight.
    const current=await exists(dest) ? await fs.readFile(dest,'utf8') : undefined
    if(current!==file.before) throw Error(`Destination changed during sync: ${dest}; rerun after reconciling`)
    if(current!==file.text) {
      if(current!==undefined) {
        const backup=path.join(destinationRoot,'.quantum-billiards-backups',hash(current),file.destination)
        await safePath(backup)
        await fs.mkdir(path.dirname(backup),{recursive:true})
        await fs.writeFile(backup,current)
      }
      await fs.mkdir(path.dirname(dest),{recursive:true})
      await fs.writeFile(dest,file.text)
      log(`COPIED ${file.source} -> ${dest}`)
    } else log(`UNCHANGED ${dest}`)
    if(await fs.readFile(dest,'utf8')!==file.text) throw Error(`Verification failed: ${dest}`)
    state[file.destination]=hash(file.text)
  }
  await fs.writeFile(stateFile,JSON.stringify(state,null,2)+'\n')
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  try {
    const flags=process.argv.slice(2)
    if(flags.some(f=>!['--dry-run','--generate-only'].includes(f))) throw Error('Unknown argument')
    const local=path.join(root,'studio-sync.local.json')
    const config=await exists(local) ? JSON.parse(await fs.readFile(local,'utf8')) : {}
    await syncStudio({project:process.env.EIGHTHWALL_STUDIO_PROJECT || config.project,dryRun:flags.includes('--dry-run'),generateOnly:flags.includes('--generate-only')})
  } catch(e) {console.error(e.message); process.exitCode=1}
}
