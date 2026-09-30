# Quantum Billiards Shader Roadmap

Status: planning document only. Do not implement shader code from this roadmap until the shared `QuantumVisualState` layer exists and has been reviewed in game.

## Reference Status

The requested `docs/shader-bibles/` source folder is not present in this repository checkout. This roadmap is based on the current Quantum Billiards code, the existing project docs, and the user-supplied shader direction. Before shader implementation begins, place legally obtained Jettelly reference materials under `docs/shader-bibles/` and do a separate review pass for techniques and licensing. Do not copy reference shader code directly.

## Repository Audit

### Engine And Runtime

- Engine: Three.js r180, vendored as local ES modules in `vendor/`.
- Entry point: `index.html` loads `game.js` directly as a browser module.
- Renderer: `new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false })`.
- Color: `renderer.outputColorSpace = THREE.SRGBColorSpace`.
- XR: `renderer.xr.enabled = true`; optional immersive VR is requested through WebXR.
- Packaging: static Newgrounds zip through `tools/package-newgrounds.mjs`; no CDN dependency should be added.

### Shader Language And Current Rendering Pipeline

- Three.js WebGL uses GLSL internally.
- The current gameplay code does not define custom `ShaderMaterial`, `RawShaderMaterial`, `onBeforeCompile`, render targets, or post-processing passes.
- Current visuals are built from `MeshStandardMaterial`, `MeshBasicMaterial`, `LineBasicMaterial`, `PointsMaterial`, vertex colors, and CPU-updated buffer geometry.
- The table field is currently a mesh whose positions and colors are updated on the CPU in `updateField()` using `fieldValue()`.
- The aim preview is a line plus haze lines generated from `tracePath()` and `computeFocus()`.
- Shot trails and scoring feedback use transient line geometry, rings, and line sparks in `world.shotGroup` and `world.burstGroup`.

### Physics And Gameplay Authority

- There is no external physics engine.
- Shot preview, collision-style banking, scoring, scar strength, and field density are host JavaScript logic.
- Core functions include `tracePath()`, `resolveShot()`, `minDistanceToPath()`, `fieldValue()`, `scarStrength()`, and `computeFocus()`.
- Shaders must never decide whether a target was hit, whether a shot tunneled, whether a path is valid, or whether a scar is locked. They may only visualize facts supplied by gameplay.

### Camera And Input

- Desktop and mobile use a first-person `PerspectiveCamera` attached to `cameraRig`.
- Non-XR camera placement is handled by `updateCamera()`.
- WebXR uses `xr-tabletop.js` to place the complete playfield at tabletop height and transform controller rays into playfield-local coordinates before aiming.
- Shot feedback can add a small camera kick outside XR.
- Shader effects must be readable from first-person aim height and from XR, where stereo comfort matters.

### Materials, Particles, And Trails Today

- Table and rails: grounded `MeshStandardMaterial`.
- Source ball: generated glTF cue-ball asset with `KHR_interactivity`; current visible identity is off-white cue ball plus scar/nick.
- Targets: inlaid table-light fixtures, not floating generic orbs.
- Probability path: line/haze geometry, currently readable but not physically rich.
- Starfield and score bursts: `PointsMaterial`, ring meshes, and line segments.

### Post-Processing

- There is no post-processing stack today.
- Any future post stack must be optional and low priority because Newgrounds/mobile/WebXR readability matter more than screen-wide style.
- Prefer object-local and table-local shaders before full-screen effects.

### Performance Constraints

- Production target: 60 fps on desktop browsers, graceful mobile fallback, no Newgrounds-hostile dependencies.
- WebXR target: avoid heavy transparency stacks, full-screen blur, temporal accumulation, or effects that rely on frame history.
- First implementation should keep all visual systems toggleable through a single quality tier.
- The lowest tier should preserve gameplay information with lines, icons, opacity, scale, motion timing, and UI text.

## Visual State Inventory

| Concept | Current Source | Current Rendering | Gap | Risk |
| --- | --- | --- | --- | --- |
| Classical position | `state.sourcePosition`, camera/cue state, target transforms | Mesh positions | Strong enough | Keep ball readable as billiards equipment |
| Probability density | `fieldValue()` and sampled table grid | Vertex-colored field mesh | Needs clearer gameplay meaning | Can become wallpaper if not tied to aim/targets |
| Superposition | Haze alternatives from `tracePath()` offsets | Multiple transparent line paths | Good candidate for first upgrade | Too many alternatives can hide the correct route |
| Phase | Implied by time, scar strength, wave motion | Not explicitly communicated | Useful only if it helps predict outcome | Color-only phase is inaccessible and confusing |
| Interference | `fieldValue()` visual texture, arena geometry, path overlaps | Table shimmer/field color | Needs authored moments | Abstract interference can read as generic noise |
| Measurement/collapse | Shot result, target hits, `KHR_interactivity` visual event | Burst ring, sparks, toast, source-ball event | Can become signature shot payoff | Must not obscure hit confirmation |
| Decoherence | Focus/coherence from `computeFocus()` and aim wobble | Wider haze/scatter | Already present as feel | Must not punish readability too early |
| Tunneling | Not currently a gameplay mechanic | None | Future mechanic only | Do not fake it visually before rules exist |
| Quantum scarring | `scarStrength()` and `computeFocus()` | Scar lock route, steadier path | Core identity | Needs crisp route language, not more glow |
| Entanglement | Not currently a gameplay mechanic | None | Out of scope | Avoid adding vocabulary without a play loop |

## Central Contract: `QuantumVisualState`

Add a centralized visual-state layer before any shader implementation. The gameplay simulation writes it once per frame; renderers, materials, debug overlays, and future shaders consume it.

### Ownership Rule

Gameplay owns truth. Visuals own presentation.

- Gameplay computes positions, outcomes, score, measurement state, scar strength, predicted paths, target state, and arena geometry.
- `QuantumVisualState` normalizes those values into stable render inputs.
- Materials and shaders read from `QuantumVisualState`.
- Shaders do not mutate gameplay state, generate authoritative collisions, or choose outcomes.

### Update Order

1. Read input.
2. Update gameplay state.
3. Compute shot preview and target probabilities.
4. Build `QuantumVisualState`.
5. Update ordinary geometry and shader uniforms from that state.
6. Render.
7. Record debug/performance samples.

### Proposed Shape

This is a data contract sketch, not implementation code.

```js
QuantumVisualState = {
  time: 0,
  dt: 0,
  qualityTier: "high",
  accessibilityMode: "standard",

  arena: {
    id: "circle",
    geometryName: "Circle Table",
    bounds: {},
    scarStrength: 0,
    fieldEnergy: 0
  },

  source: {
    position: { x: 0, y: 0, z: 0 },
    radius: 0.18,
    state: "classical",
    coherence: 1,
    phase: 0,
    uncertainty: 0,
    measurementProgress: 0,
    lastImpact: 0,
    scarLock: 0
  },

  aim: {
    yaw: 0,
    power: 0,
    primaryPath: [],
    alternatives: [
      { points: [], weight: 0, phase: 0, coherence: 0, bounceCount: 0 }
    ],
    predictedTargets: [],
    actualShotPath: [],
    outcome: "idle"
  },

  field: {
    sampleResolution: 0,
    densitySamples: null,
    phaseSamples: null,
    decoherenceZones: [],
    measurementRegions: []
  },

  targets: [
    {
      id: "light-0",
      position: { x: 0, y: 0, z: 0 },
      active: true,
      probability: 0,
      captureRadius: 0,
      measurementWeight: 0,
      lastHitAge: 0
    }
  ],

  events: {
    shotAge: 0,
    combo: 0,
    perfectScar: false,
    collapseCenter: null
  }
};
```

### Required Debugging

- Add a developer-only visual-state overlay before shader work.
- Show coherence, scar lock, selected target probability, active alternatives, measurement progress, and current quality tier.
- Add a deterministic debug seed for screenshots.
- Add a quality toggle that can force low, medium, high, and XR-safe modes.

## Shader System Roadmap

Each system below must be implemented as an isolated, toggleable feature. The final game should feel like an authored impossible pool hall, not a generic neon science demo.

### 1. Source Ball State Material

- Gameplay purpose: make the source ball communicate readiness, scar lock, shot charge, collapse, and cooldown without losing the cue-ball identity.
- Scientific concept: classical state, superposition hints, decoherence, and measurement collapse.
- Player information conveyed: "ready to shoot," "route is focused," "shot is collapsing," and "last strike had impact."
- Rendering technique: start with `MeshStandardMaterial` plus controlled emissive/roughness changes through material uniforms or `onBeforeCompile`; later graduate to a custom material only if necessary.
- Affected files: `game.js`, `assets/interactive/quantum-ball.gltf`, `tools/build-quantum-ball.mjs`, possible future `visual-state.js`, possible future `materials/source-ball-material.js`.
- Shader inputs: `time`, `coherence`, `scarLock`, `phase`, `measurementProgress`, `lastImpact`, `shotCharge`, camera-facing falloff.
- Physics interaction: reads gameplay values only; hit and collapse events still come from `resolveShot()` and the KHR interactivity bridge.
- GPU cost: low. One hero material on one ball.
- Readability/accessibility: scar seam and chalk nick must remain visible; do not rely on hue alone. Use pulse rate, line steadiness, seam brightness, and surface roughness.
- Low-quality fallback: keep current cue-ball material, animate emissive intensity and scale only.
- Test procedure: inspect at desktop, mobile, and XR eye height; confirm the ball reads as a cue ball in the first second; verify collapse feedback does not hide aim.

### 2. Probability Path Preview

- Gameplay purpose: teach players to aim through the glowing probability path and understand which bank lanes are plausible.
- Scientific concept: superposition of possible paths and probability amplitude.
- Player information conveyed: primary route, alternate routes, confidence, bounce count, and target likelihood.
- Rendering technique: continue using geometry lines first; later use tube/strip shader with line width, dashed phase bands, and soft edge only if the ordinary line system becomes insufficient.
- Affected files: `game.js`, possible future `visual-state.js`, possible future `materials/path-preview-material.js`.
- Shader inputs: path points, per-segment weight, coherence, phase, bounce index, target probability, focus/scar lock.
- Physics interaction: path points are produced by `tracePath()`; material only styles the path.
- GPU cost: low to medium depending on line count and width technique.
- Readability/accessibility: primary path must remain visually dominant; alternatives should be thinner, shorter, or patterned. Do not create a fog fan that covers targets.
- Low-quality fallback: current `LineBasicMaterial` paths with opacity/width-style ordering and UI text.
- Test procedure: compare circle, stadium, and star arenas; verify the player can identify the intended bank within 2 seconds of aiming.

### 3. Table Probability Field

- Gameplay purpose: make the table feel alive while also indicating where shots are likely to focus or scatter.
- Scientific concept: probability density and standing-wave/scarring behavior.
- Player information conveyed: calm lanes, turbulent zones, focused scar routes, and high-density target zones.
- Rendering technique: migrate the current CPU vertex-color field into a dedicated field material. Start with the existing grid and add a sampled data texture only after the state contract proves stable.
- Affected files: `game.js`, possible future `visual-state.js`, possible future `materials/table-field-material.js`.
- Shader inputs: density samples, phase samples, scar strength, time, arena id, energy, target influence, quality tier.
- Physics interaction: density is derived from `fieldValue()` or a cached equivalent. Shader does not compute scoring.
- GPU cost: medium if using a data texture; low if continuing vertex colors.
- Readability/accessibility: table surface stays behind gameplay. Rail outlines, target bases, and source ball silhouette must remain clear.
- Low-quality fallback: current vertex colors with slower update rate.
- Test procedure: screenshot before/after in all six stages; confirm targets have visible contrast; measure frame timing on mobile-size viewport.

### 4. Interference Wavefronts

- Gameplay purpose: make great bank shots and near misses feel physically legible instead of just scored.
- Scientific concept: constructive and destructive interference.
- Player information conveyed: paths reinforcing, paths cancelling, and collision aftermath.
- Rendering technique: short-lived local ripples or rings spawned along impact/collapse points. Prefer mesh strips/rings over screen-wide post effects.
- Affected files: `game.js`, possible future `visual-state.js`, possible future `effects/interference-bursts.js`.
- Shader inputs: event origin, age, amplitude, phase, hit quality, combo, surface normal, quality tier.
- Physics interaction: spawned from resolved shot events, target hits, rail contacts, or perfect-scar result.
- GPU cost: low to medium; transient and bounded.
- Readability/accessibility: impact rings must not cover the next aim line. Use shape, expansion speed, and fade timing in addition to color.
- Low-quality fallback: current burst rings and line sparks.
- Test procedure: run miss, normal hit, combo hit, and perfect-scar shot; verify feedback ends quickly and does not linger as decoration.

### 5. Measurement Collapse Effect

- Gameplay purpose: turn a successful light drop into a satisfying arcade payoff and teach that the fuzzy route has become one outcome.
- Scientific concept: measurement/collapse from probability to classical result.
- Player information conveyed: selected target, final route, score outcome, combo/perfect-scar status.
- Rendering technique: collapse pulse from target back along the actual shot path, plus a brief source-ball response. Keep it object-local.
- Affected files: `game.js`, `interactivity/event-bridge.js`, possible future `visual-state.js`, possible future `effects/collapse-effect.js`.
- Shader inputs: collapse center, actual path, measurementProgress, target id, score quality, event age.
- Physics interaction: triggered after `resolveShot()`; KHR interactivity may mirror the source-ball visual but must not own the result.
- GPU cost: low if path mesh based; medium if path texture sampling is added.
- Readability/accessibility: collapse should point to the target even for color-blind players. Use path direction, expanding/contracting shape, and target scale.
- Low-quality fallback: current target burst, toast, and sound.
- Test procedure: hit every target type in every arena; verify the final target remains identifiable after the effect.

### 6. Decoherence And Aim Scatter

- Gameplay purpose: show when the table is becoming less predictable so players understand why a shot needs scar/focus adjustment.
- Scientific concept: loss of coherence and widening uncertainty.
- Player information conveyed: stable vs unstable aim, widening path, reduced confidence.
- Rendering technique: widen and break alternate path bands as coherence drops; add restrained grain only inside the path preview, not across the whole screen.
- Affected files: `game.js`, possible future `visual-state.js`, possible future `materials/path-preview-material.js`.
- Shader inputs: coherence, uncertainty, focus, aim duration, power, arena id.
- Physics interaction: reads `computeFocus()` and path alternatives; no scoring authority.
- GPU cost: low.
- Readability/accessibility: unstable paths should be visually softer but still aimable. Do not hide the primary line entirely.
- Low-quality fallback: current haze offset amount and opacity.
- Test procedure: force coherence high/medium/low in debug; confirm three states are distinguishable without relying on color.

### 7. Tunneling Barriers

- Gameplay purpose: only add if the game introduces barrier shots where a path can pass through a forbidden rail or gate under specific conditions.
- Scientific concept: tunneling through a potential barrier.
- Player information conveyed: blocked route, possible tunnel route, tunnel probability, failed tunnel.
- Rendering technique: barrier material with a visible threshold band and a path segment that fades through the barrier when gameplay says tunneling is allowed.
- Affected files: future arena/barrier definitions, future `visual-state.js`, future `materials/barrier-material.js`.
- Shader inputs: barrier strength, allowed probability, path intersection point, shot power, coherence, event age.
- Physics interaction: entirely future-facing. Gameplay must decide pass/fail before visuals animate it.
- GPU cost: low to medium depending on barrier count.
- Readability/accessibility: do not introduce this visual without a controls/tutorial beat. Use barrier shape and UI wording, not color alone.
- Low-quality fallback: dashed blocked line plus simple pass/fail spark.
- Test procedure: create a dedicated debug arena with one barrier and seeded outcomes; verify players can predict likely pass/fail after one tutorial shot.

### 8. Target Light Probability State

- Gameplay purpose: make target lights feel like measurable outcomes rather than generic pickups.
- Scientific concept: measurement regions and probability capture.
- Player information conveyed: active target, likely target, recent hit, inactive/dropped target.
- Rendering technique: keep target fixtures; add small local glass shimmer or inlaid meter ring around the base.
- Affected files: `game.js`, `docs/previews/target-light-preview.html`, possible future `visual-state.js`, possible future `materials/target-light-material.js`.
- Shader inputs: target probability, active state, measurement weight, lastHitAge, combo link.
- Physics interaction: probability is derived from distance to predicted path and target activity; hit remains host-owned.
- GPU cost: low.
- Readability/accessibility: the physical base must stay visible. Avoid turning every target into a floating orb again.
- Low-quality fallback: current target material plus scale/pulse.
- Test procedure: aim at one of several targets and confirm the intended light can be identified without reading the HUD.

### 9. Scarred Lane And Table Memory

- Gameplay purpose: make scarring feel like learning a remembered bank line instead of activating a power-up.
- Scientific concept: quantum scarring along stable periodic orbits.
- Player information conveyed: route is learnable, repeating, and safer than chaotic alternatives.
- Rendering technique: chalk-like lane marks on or just above the table, stabilized when scar lock is high. Use rough, physical edges that match the cue-ball scar.
- Affected files: `game.js`, `docs/VISUAL_LANGUAGE.md`, possible future `visual-state.js`, possible future `materials/scar-lane-material.js`.
- Shader inputs: scarStrength, path points, lane age, coherence, arena id, target probability.
- Physics interaction: reads `scarStrength()` and `computeFocus()` only.
- GPU cost: low to medium.
- Readability/accessibility: scar lock should be steady and confident; chaos can smear. Keep color secondary to steadiness, thickness, and pattern.
- Low-quality fallback: existing scar route line and toast.
- Test procedure: compare scar lock on/off in stadium and star arenas; verify the locked route feels calmer, not simply brighter.

### 10. Optional Full-Screen And Camera Effects

- Gameplay purpose: reserved for stage transitions, final clear, fail state, or menu presentation.
- Scientific concept: none required; this is game-feel polish.
- Player information conveyed: transition, danger, timer pressure, or run completion.
- Rendering technique: CSS/HUD effects first. If WebGL post-processing is added, use a single optional pass with hard performance budget.
- Affected files: `index.html`, `styles.css`, `game.js`, possible future `effects/post.js`.
- Shader inputs: event age, run state, timer warning, quality tier.
- Physics interaction: none.
- GPU cost: medium to high; avoid for XR.
- Readability/accessibility: never distort the aim view during active shot setup. Avoid flashing.
- Low-quality fallback: CSS overlay, audio stinger, toast, and camera kick.
- Test procedure: verify pause, menu, active shot, XR, and mobile layouts are not harmed.

## Phased Implementation Plan

### Phase 0: Visual State Foundation

- Add `visual-state.js`.
- Build `QuantumVisualState` from existing gameplay functions.
- Add debug overlay and quality toggles.
- Add deterministic screenshot/debug seed.
- No shader code.

Exit criteria: visual state values are visible, stable, and match current gameplay across all six stages.

### Phase 1: Geometry-First Probability Path

- Refactor aim preview to consume `QuantumVisualState`.
- Improve primary vs alternate route hierarchy using existing line geometry.
- Add target probability indicators without custom GLSL.

Exit criteria: player can understand primary route, alternatives, and likely target faster than before.

### Phase 2: Table Field Material

- Convert table field rendering into a contained module.
- Preserve current CPU vertex-color path as fallback.
- Introduce a shader only if it improves field clarity and performance.

Exit criteria: table looks more intentional while targets, rails, and source ball stay clearer than the field.

### Phase 3: Source Ball Material Pass

- Add state-driven cue-ball material polish.
- Keep scar seam and chalk nick readable.
- Connect collapse/charge/coherence values from `QuantumVisualState`.

Exit criteria: the ball communicates state while still reading as billiards equipment.

### Phase 4: Collapse And Interference Payoff

- Add object-local collapse and interference effects.
- Keep events short, tied to score, and visually bounded.
- Reuse current burst/spark architecture where possible.

Exit criteria: hit, combo, perfect-scar, and miss have distinct readable feedback.

### Phase 5: Tunneling Only If Gameplay Exists

- Do not build a tunneling shader until barrier/tunnel mechanics are designed and implemented.
- If added, ship one tutorial table before adding more barrier arenas.

Exit criteria: tunnel visuals are predictive, not decorative.

### Phase 6: Production QA

- Add quality presets: low, medium, high, XR-safe.
- Add accessibility checks for color-independent readability.
- Confirm static packaging still works.
- Confirm no external asset or shader dependency violates Newgrounds packaging.

Exit criteria: shader features can be disabled, downgraded, and tested without breaking core play.

## Accessibility And Readability Rules

- Color cannot be the only information channel.
- Use line hierarchy, scale, rhythm, shape, opacity, texture, and UI callouts.
- The source ball must remain a cue ball first.
- Target lights must remain installed table fixtures.
- Table effects stay lower priority than aim line, targets, rail boundaries, score, and pause/settings UI.
- Avoid flashing, heavy chromatic separation, screen-wide distortion, and stereo-unfriendly effects in XR.
- Every shader must have a non-shader fallback.

## Test Matrix

| Test | Viewport/Mode | Required Result |
| --- | --- | --- |
| Desktop aim clarity | 1440 x 900 | Primary route and target are readable in all arenas |
| Mobile aim clarity | 390 x 844 | No text/UI overlap; path does not hide targets |
| XR comfort | WebXR where available | No full-screen distortion; depth and aim remain comfortable |
| Low quality | Forced low tier | All gameplay information survives without shaders |
| Color accessibility | Simulated reduced color distinction | Route/target/coherence remain distinguishable |
| Stage progression | Six-stage arcade run | Effects do not leak between stages |
| Performance | Desktop and mobile-size browser | Stable frame time with shader toggles on/off |
| Packaging | `npm run package:newgrounds` | Static zip includes all local files and no CDN references |

## Explicit Non-Goals

- Do not make a realistic pool simulator.
- Do not build a generic neon/purple/blue sci-fi skin.
- Do not add random glitch effects as a substitute for quantum concepts.
- Do not move physics into shaders.
- Do not add tunneling visuals before tunneling rules exist.
- Do not add full-screen post-processing as the first shader milestone.
- Do not copy code or assets from reference shader packs.

## First Production Task After This Roadmap

Implement `QuantumVisualState` and a debug overlay, then refactor the existing aim preview to consume that state with current geometry-based rendering. This gives the shader roadmap a stable data backbone and improves gameplay clarity before visual complexity rises.
