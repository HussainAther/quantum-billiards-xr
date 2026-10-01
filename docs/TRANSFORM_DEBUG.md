# Ball transform diagnosis

The fault was reproduced in the running Desktop simulator and fixed in the
canonical Studio adapter, then synced. No tuning, geometry, scene assignments,
physics, animation, World Tracking or placement behavior was changed.

## Evidence

Forced mode bypassed touch and all simulation, adding .02 to Ball local x each
tick via Position.mutate (return false). Runtime Ball eid was 616:

- tick 0: -.479999989 -> -.459999979
- tick 1 observed -.459999979 -> -.439999968
- tick 2 observed -.439999968 -> -.419999957

Each next tick matched the previous write. Root position was (0,0,0) and scale
(1,1,1). No intervening transform reset was observed.

With the original simulation path instrumented, a shot with velocity (6,0) read
Ball at (-.48,.105,.34). After reading Socket, the retained Position cursor read
(.46,.066,-.28). The simulation therefore started at Socket, reported hit=true,
returned zero velocity and immediately reset to source. The failure was in the
adapter's reads, not an external transform owner.

Installed ECS runtime.js XG attribute implementation creates one Q cursor;
get/acquire/mutate retarget its entity/pointer and return it. Copying properties
before another attribute access is required. `return false` in mutate commits
normally in this runtime; it was not the cause.

## Fix

Snapshot Ball and Socket coordinates with object spread immediately on read.
Snapshot Ball before AimLine's Position.mutate too: otherwise that mutation
retargets the held cursor to AimLine. Keep plain core state independent of ECS
cursor lifetimes.

After the fix, the running simulator produced:

- first tick: x=-.48 -> -.38, vx=6 -> 5.991, hit=false
- second tick: x=-.38 -> -.28015, hit=false
- third tick: x=-.28015 -> -.18044977, hit=false
- later ticks: continued travel and wall reflection; a subsequent real receiver
  contact returned hit=true and reset normally (around tick 61 in one shot).

The preview showed the ball at changed positions on the table. Mobile hardware
was not exercised during this debugging pass.

## Ownership audit

Inspected all application scripts in Studio src/, the saved .expanse.json,
config/entry-plugin.js, config/webpack.config.js, installed ECS index.d.ts and
the attribute implementation in dist/runtime.js; compared canonical adapter and
core modules plus sync manifest. Ball has no attached components, collider or
animation. Root has only Quantum Billiards with the correct references. All
children share that root. No project placement script or per-frame scene restore
was present. Entry-plugin's updateBaseObjects runs on scene hot updates, not
ordinary gameplay ticks. No conflicting external component was identified.

## Diagnostics and tests

Diagnostics default off and are gated by `globalThis.__QB_DEBUG_MODE` in the
Simulator console. Set to 'forced' for direct +X movement, 'simulation' for
integration logs, or 'off' to disable. Logs cover the first three diagnostic
frames and then every 60 ticks; simulation additionally reports hits. Restart
preview between modes to reset position and counters. Forced mode deliberately
ignores arena limits and will move Ball off the table. Normal simulation was
restored and diagnostics disabled after validation.

Added tests/studio-adapter.test.mjs, executing the actual adapter against a shared
cursor model: normal shot persistence, no false target hit, correct AimLine
midpoint and forced motion accumulation. Existing core shot tests were updated
to the user's already-present .005 deadzone and 1.5–6 speed curve; tuning itself
was not changed. Restored .ts suffixes on canonical simulation imports so Node
can execute tests; sync still removes those suffixes for Studio.

Files modified this pass: src/studio/quantum-billiards.ts,
src/core/simulation.ts (import suffixes only), tests/core.test.mjs.
Files added: tests/studio-adapter.test.mjs and this report.
Synced adapter updated in Studio. Scene and donor repository remained unchanged.
Generated mirrors/backups/hash metadata are managed by the existing sync tool.

Validation: 12 tests passed; Studio tsc --noEmit passed. XR npm run build was
attempted: a broken local Vite launcher was repaired via npm rebuild vite
--offline --ignore-scripts, but macOS then rejected the installed Rolldown native
binding's code signature. No security settings were bypassed. This build is not
reported as passing. See the final validation note below for Studio Webpack.

Remaining: reload the mobile preview to receive the fixed scripts and verify
movement/tracking on device. No entity assignment or geometry changes required.

Final validation note: the Studio project's own npm run build passed (Webpack
5.111.1, two asset-size/performance warnings). Simulator console confirmed debug
mode 'off'. Source Git status remained clean; git diff --check passed.
