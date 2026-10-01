# Studio script synchronization

The XR repository is the script source of truth. Edit `src/core/` or
`src/studio/`; do not edit generated mirrors. The donor game remains read-only.

## Local discovery

The source, target and Studio folders are siblings:
`<games>/quantum-billiards`, `<games>/quantum-billiards-xr`, and
`<games>/quantum-billiards-8thwall`, respectively.
The local 8th Wall application-state database registered the latter as its only
project. Its saved scene contains QuantumBilliardsRoot, Table, Ball, Socket and
AimLine, with the Quantum Billiards component attached and references assigned.
The exact discovered absolute destination is saved in ignored
`studio-sync.local.json` (`project`). No machine-specific path is required in Git.

The installed package identifies itself as `@8thwall/studio-build`.
`config/entry-plugin.js` recursively imports `.ts` and `.js` files under `src`,
except assets and .dependencies. Calling `ecs.registerComponent` registers the
component. Webpack resolves local `.ts`/`.js` imports. The installed tsconfig does
not allow `.ts` import suffixes, so generation removes those suffixes and changes
the adapter's `../core/` imports to `./core/`. Core logic is not manually copied.
There was no assets directory in this project at discovery. The initial copied
adapter referenced missing core files; sync supplies them.

## Commands

From the XR repository:

```sh
npm test
npm run build
npm run sync:studio -- --dry-run
npm run sync:studio
```

For another validated local Studio checkout, configure its real project root:

```sh
EIGHTHWALL_STUDIO_PROJECT="/path/to/local/project" npm run sync:studio -- --dry-run
EIGHTHWALL_STUDIO_PROJECT="/path/to/local/project" npm run sync:studio
```

The environment variable overrides `studio-sync.local.json`. The root must
already exist and contain Studio package metadata, `src/.expanse.json`,
`src/index.html`, the entry plugin and tsconfig. There is no guessed default.
`npm run prepare:studio` generates only the ignored `studio-project/` mirror.

The manifest `scripts/studio-files.json` specifies exactly these destination
paths, relative to the Studio project's `src/`:

- quantum-billiards.ts
- core/arenas.js
- core/circle-config.ts
- core/physics.ts
- core/simulation.ts
- core/trajectory.ts
- core/game-state.ts

Sync validates every destination before copying, rejects symlink paths, prints
COPIED or UNCHANGED per file, and verifies the written contents. Dry run writes
nothing. It does not delete files, replace the scene, modify HTML, assets,
project metadata, dependencies, or entity assignments.

Existing scripts can be adopted only if they match canonical source or generated
output. Later syncs accept the hash from `.quantum-billiards-sync.json`; divergent
local edits cause a failure. Reconcile edits into the XR sources and restore the
last synced Studio version before retrying. There is no force-overwrite option.
Replaced versions are preserved under `.quantum-billiards-backups/<hash>/` outside
`src`, where Studio will not discover duplicate components. Sync is not an
all-files atomic transaction: an I/O error or concurrent edit can stop a batch
partway through. Keep the editor idle during sync; resolve the reported file
before retrying. Backups and hash metadata are local workflow files.

## GUI checks before testing

Open the discovered project in Desktop. Wait for recompilation; if new files do
not appear, reopen the project. Select QuantumBilliardsRoot in the hierarchy and
inspect its Quantum Billiards component. If missing, add that custom component.
Set Ball to Ball, Aim Line to AimLine, and Target to Socket. These assignments
already exist in the saved scene; verify them rather than adding duplicates.
Keep all four gameplay entities direct children of QuantumBilliardsRoot.

The saved scene was corrected directly after backing up `.expanse.json`.
Current local values (position is x/y/z):

| Entity | Position | Scale | Geometry |
| --- | --- | --- | --- |
| QuantumBilliardsRoot | 0,0,0 | 1,1,1 | None |
| Table | 0,.02,0 | 1,1,1 | Cylinder radius .84, height .06; top .05 |
| Ball | -.48,.105,.34 | 1,1,1 | Sphere radius .055 |
| Socket | .46,.066,-.28 | 1,1,1 | Torus radius .095, tube .015; outer radius .11 |
| AimLine | -.48,.115,.34 | .001,.001,.001 | Unit box, long axis +Z; hidden initially |

Root, Table, Ball and AimLine retain identity rotations. Socket retains its
90-degree X rotation, placing its ring horizontally. The adapter controls
AimLine scale during dragging (.02, .01, preview length) and ball x/z on reset.
No geometry edits remain necessary unless an already-open editor restores stale
scene data. Reopen the saved project before editing or saving it, then verify
these inspector values. Component IDs and all three assignments are preserved.

Do not scale the children together to compensate for mismatched dimensions;
use uniform root scale for physical tabletop sizing. Saved camera metadata has
phone AR and world tracking selected. Placement behavior and tracking must still
be verified on device; this sync does not add or change placement logic.

## Simulator and mobile

In Desktop, open the project's simulator/preview and wait for a successful build.
Confirm a stationary start, hidden AimLine until dragging, short-drag cancellation,
release-to-shoot, strong shots, wall banks, friction and receiver reset. Ensure
no duplicate Quantum Billiards registration or missing-module error appears.
The simulator cannot establish real-world tracking quality.

Keep the existing Desktop preview server running on port 58000. In a separate
terminal run the current working tunnel command:

```sh
cloudflared tunnel --url http://localhost:58000
```

Open the HTTPS URL printed by that process on the phone and allow camera access.
Keep Desktop and the tunnel running. The temporary trycloudflare.com URL changes;
never save it as a permanent project URL. Place the table, walk around it, and
repeat the interaction checks. Screen-direction aiming still uses the existing
mapping and is not camera-relative. Check that placement touches do not shoot.
If hot reload fails through the tunnel, reload the page after a successful build.

## Scope and validation

No gameplay algorithms, ECS schema, touch listeners or tuning changed in this
pass. Only import paths differ in generated scripts. Source scoring, rich path
rendering and other arenas remain outside scope. Tests exercise dry-run behavior,
unrelated-file preservation, repeated sync, conflict refusal, missing destinations
and symlink protection, in addition to the seven Circle tests.

Scripts and corrected saved geometry are prepared for device validation. No simulator or mobile acceptance is claimed.

Validation results for this pass: 10/10 tests passed; target desktop and adapter
builds passed; dry run passed; seven scripts synced and byte-verified against the
mirror; a second sync reported all unchanged. The installed Studio TypeScript
compiler (`tsc --noEmit -p <Studio project>/tsconfig.json`) passed. The Studio
project's own `npm run build` passed with two runtime asset-size/performance
warnings. The target desktop build retains its existing large-chunk warning.

Files added this pass: `scripts/sync-studio.mjs`, `scripts/studio-files.json`,
`studio-project/README.md`, `tests/studio-sync.test.mjs`, `docs/STUDIO_SYNC.md`.
Files updated: `package.json`, `.gitignore`, `docs/8THWALL_PORT.md`.
Local-only outputs: `studio-sync.local.json`, seven generated mirror scripts,
seven synced Studio scripts, sync hash metadata, one backed-up adapter version,
and Studio build output. New npm commands: `prepare:studio` and `sync:studio`.
No source repository changes or commits were made.
