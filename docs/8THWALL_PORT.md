# Quantum Billiards — Circle port

## Repository boundary and first-pass scope

Source (read-only): `/Volumes/External/games/quantum-billiards`.
Target: `/Volumes/External/games/quantum-billiards-xr`.
Both were clean before this pass. The existing Studio component is the tested
baseline; it was already present and must not be replaced with a guessed API.
This audit precedes extraction. Only Circle is enabled.

## System mapping / source audit

| Source file / system | Target core | Studio destination / status |
| --- | --- | --- |
| game.js ARENAS, signedDistance, boundaryPoints | arenas.js, circle-config.ts | Table; Circle radius .84, original source and four receiver coordinates retained |
| game.js trianglePoly / polygonSignedDistance | future arenas / physics | Triangle deferred |
| game.js stadium signed distance (.55 straight half-length, .58 radius) | future arenas / physics | Stadium deferred |
| game.js makeStar(6,.86,.46,-PI/2) | future arenas / physics | Star deferred |
| game.js tracePath, normalAt | trajectory.ts | Source Circle bank tracer extracted; rich rendering deferred |
| Existing target Studio movement, reflection, drag power and friction | physics.ts, simulation.ts, circle-config.ts | quantum-billiards.ts; preserve tested contact simulation |
| game.js fire, createShot, updateShots | future shot-state / simulation | Source animates a precomputed path, not a friction-driven rigid ball |
| game.js resolveShot | future scoring.ts | Source uses distance-to-path, field density, power and coherence; not ported as contact scoring |
| game.js CHALLENGES, startChallenge, completeChallenge, gradeChallenge | future challenges.ts | HUD / progression deferred; first Circle challenge receiver 0, second receivers 1 and 2 |
| game.js nearestScar, scarStrength, computeFocus, fieldValue, scarPathValue | future quantum.ts | Energy, calibration, uncertainty deferred |
| visual-state.js | future visual-state / trajectory | Primary path, target probabilities and ghost paths; Circle has no chaotic alternatives |
| rendering/field-surface-material.js | future numerical field helpers | render/materials + effects; shader integration deferred |
| rendering/trajectory-material.js, game.js setLinePath | trajectory.ts | Future trajectory-renderer.ts; phase/coherence/progress shader attributes |
| rendering/impact-system.js | future effect event data | effects.ts; pooled rings/sparks and reduced-motion behavior deferred |
| game.js playSfx, unlockAudio, music loop; assets/audio | none | Audio hooks deferred |
| experience/shot-replay.js | future replay snapshot | Immutable path replay, guarded by phase/paused/replaying state; deferred |
| xr-tabletop.js, docs/WEBXR_TABLETOP.md | placement concepts | Existing Studio World Tracking owns placement; no WebXR session code copied |
| game.js installEvents, index.html, styles.css | shot commands | Existing screen touch adapter retained; compact AR HUD pending |
| interactivity/*.js, assets/interactive/quantum-ball.gltf | future state/event bridge | Optional interactive asset integration deferred |
| tests/interactivity-runtime.test.mjs, impact-system.test.mjs, field-surface-material.test.mjs, experience.test.mjs | tests/ | Source tests cover asset events, visual effects, replay/experience; Circle numerical regression tests added here |

## Architecture and coordinate contract

Core has no ECS, DOM, Three.js or AR dependency. Studio reads/writes ECS entities
and dispatches commands to core. Original arena points use x/y; y maps directly
to local z. All gameplay entities must be direct children of the same root.
Root placement/rotation/uniform scale therefore does not change the local math.
Ball height is preserved by the adapter. Keep the existing screen dx / negative
dy input mapping for this pass; camera-relative aiming after walking around is
not yet implemented.

There are deliberately two trajectory contracts: the faithful source tracer uses
point-particle radius .84, power 18–100, .012 steps and at most ten reflections.
The Studio contact simulation uses center radius .785 (.84 minus .055), speed
up to 6, and friction .9985 per 1/60 tick. Do not present the source tracer as an
exact preview of that simulation. The existing AimLine remains the direction /
power cue until a matching multi-segment renderer and gameplay contract are chosen.

## Studio setup and manual validation

Keep the already working World Tracking and placement setup in the current
Desktop/Studio project. This repository is script source, not an exported scene.
Copy `src/core` and `src/studio` preserving relative imports. Attach the registered
**Quantum Billiards** component to QuantumBilliardsRoot. Assign its `ball`,
`aimLine`, and `target` entity references to Ball, AimLine, and Socket.

```
QuantumBilliardsRoot
├── Table
├── Ball
├── Socket
└── AimLine
```

Use Table radius .84 and Ball radius .055. Source local x/z is (-.48,.34).
For the first source challenge place Socket at (.46,-.28). The other source
receivers are (.08,.61), (-.09,-.54), (.61,.27); multi-receiver progression is
not active. AimLine is centered and aligned to local +Z with base length 1.
Keep ball/line heights as configured in the working scene.

Use the project's existing mobile preview workflow. Place the root on a desk,
walk around it, drag and release, check short-drag cancellation, strong shots,
wall banks, friction, receiver hit/reset and fixed height. Repeat after root
rotation and uniform scaling. Check placement touches do not accidentally shoot.
The adapter intentionally preserves the existing fixed 1/60 tick behavior;
refresh-rate independence and camera-relative aiming remain follow-up work.
Local build success does not establish tracking stability or Studio runtime parity.

## Validation and parity gates

`npm test` runs core tests with Node's built-in test runner (Node 22.18+ or 24),
consistent with the source project's Node test tooling, with no ECS dependency.
`npm run build` builds the existing Vite desktop preview plus a separate Studio
bundle with @8thwall/ecs external. This checks adapter imports/transpilation,
not the installed Studio SDK's type contract or mobile runtime.

Current parity: Circle layout and source tracer; extracted tested Studio shot,
contact reflection, friction, receiver reset and aim cue. Source scoring,
challenges, energy/scars, field-weighted hit resolution, rich trajectories,
materials, audio, replay and AR-native HUD remain unported. GameState is a
reserved scaffold, not a claim of scoring parity. Manual Studio acceptance is
required before declaring Circle parity solid or advancing to Triangle.

Next phase: validate this extraction on the same mobile scene, then reconcile
source path-based shot resolution with Studio moving-ball interaction and port
Circle receivers/scoring plus matching trajectory rendering. Only then port
Triangle, Stadium and Star in order.

## First-pass results

Donor revision: `098326ca05859886292bdd38e9dcd6f3a7a4d4ab`.
Source Git status remains clean; no source files were changed or generated.
Target changes are uncommitted. No commits, resets, rebases or clean operations
were performed. `dist/` and `node_modules/` remain ignored.

Created: `docs/8THWALL_PORT.md`, `src/core/circle-config.ts`,
`src/core/simulation.ts`, `src/core/trajectory.ts`, `tests/core.test.mjs`,
`tests/fixtures/source-circle.json`, `vite.studio.config.js`.
Modified: `src/studio/quantum-billiards.ts`, `package.json`, `package-lock.json`.
Existing `src/core/physics.ts`, `arenas.js`, and `game-state.ts` were retained.

Read source implementation sections in `game.js`, `visual-state.js`,
`xr-tabletop.js`, `experience/shot-replay.js`, all three `rendering/*.js` modules,
`docs/WEBXR_TABLETOP.md`, `package.json`, and the four `tests/*.mjs` files
(test inventory plus focused test bodies). Other assets/UI/interactivity modules
were inventoried for the mapping, not fully audited internally.

Reused: existing donor Circle definition already present in target arenas.js;
existing target reflectCircle function. Adapted: donor tracePath / signedDistance /
normalAt from x/y to x/z and explicit power inputs; existing Studio movement,
friction, contact detection, reset and power curve into pure simulation functions.
No source scoring or quantum substitutes were introduced.

Validation on Node 24.21.0:
- `npm test`: 7 passed, 0 failed. Layout, shot thresholds/capping, integration,
  friction, speed-conserving reflection, capture/reset, stop behavior, repeated
  banks, donor trajectory fixtures and input bounds.
- Trajectory fixtures were generated by executing the actual donor functions in
  an isolated context for four yaw/power cases. They store path lengths and
  selected points; tests run independently of the donor checkout.
- `npm run build`: desktop and external-ECS Studio bundles passed. Desktop
  Three.js bundle produces a non-fatal >500 kB chunk warning.
- `git diff --check`: passed.
- No SDK typecheck, Studio upload, device preview or tracking test was performed.

Preserved prototype limitations: end-of-tick target detection can miss sufficiently
small grazing intersections; fixed tick speed depends on render rate; screen drag
does not account for camera heading. These require deliberate follow-up changes
and device acceptance, rather than being silently changed during extraction.

## Studio sync follow-up

Use `docs/STUDIO_SYNC.md` for the generated mirror, conflict-protected sync command,
actual local project discovery and installed compiler checks. The exact local
project path is in ignored `studio-sync.local.json`. The saved scene already
assigns the component but has geometry/receiver dimensions inconsistent with the
Circle core; correct them in Desktop before mobile acceptance. Scene metadata was
preserved. Core and adapter gameplay code were unchanged by this sync pass.


## Circle scene scale correction

The Studio scene JSON was backed up and corrected directly: Table radius .84,
height .06, unit scale; Ball radius .055 at y=.105; Socket at (.46,.066,-.28)
with outer radius .11 and unit scale; unit-box AimLine initially hidden. Root
placement and unit scale, entity IDs, parenting and assignments were preserved.
The inspected Table had radius .84 with scale 10 in all axes (effective radius
8.4, height 10), Ball radius .5, and Socket at x=4 with scale 2. Those values
were inconsistent with the .785 maximum ball-center radius. No shot tuning or
simulation behavior changed, and no duplicate scale conversion was found in the
adapter/core. A max-speed first tick advances .1 local units as expected.
See STUDIO_SYNC.md for current exact values; this supersedes earlier pending
geometry-correction notes. Reopen the project to avoid stale editor state.
