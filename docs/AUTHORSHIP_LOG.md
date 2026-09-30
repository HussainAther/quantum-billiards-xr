# Quantum Billiards Authorship Log

## 2026-07-20 - Visual State Foundation

### Original Problem

The shader roadmap identified a needed first step: future materials need stable gameplay-owned values for coherence, scar lock, probability paths, target likelihood, measurement state, and quality tier. The game previously computed those values directly inside render functions such as `updateAimPath()`, which made shader growth risky.

### Alternatives Considered

- Leave visual state implicit until the first shader is written.
- Move only the source ball values into a dedicated state object.
- Build a centralized `QuantumVisualState` snapshot and refactor one existing renderer to consume it before adding GLSL.

### Final Decision

Add `visual-state.js` with a per-frame `QuantumVisualState` snapshot, target probability estimates, path alternatives, quality-tier selection, and a `V`-toggled diagnostics panel. Refactor the existing aim preview to use this snapshot while keeping shot resolution, scoring, target hits, and physics authority in `game.js`.

### Why It Fits

This gives shader work a production backbone without changing the rules of the table. The player still sees the same playable game, but future ball/table/path materials can now read one consistent source of truth.

### What Syed Needs To Review

- Confirm the `V` diagnostics panel reports the values you want exposed during shader tuning.
- Decide whether target probability should become player-facing later or stay developer-only.
- Approve the next pass: geometry-first probability path clarity using the new state layer.

## 2026-07-20 - Shader Roadmap: Visual State Before GLSL

### Original Problem

Quantum Billiards is ready for richer shader work, but its current visual strength comes from readable first-person billiards language. Adding custom GLSL directly to the ball, table, paths, and effects would risk turning the game into generic quantum glow before the renderer has a shared idea of gameplay state.

### Alternatives Considered

- Start with a source-ball shader because the cue ball is the hero object.
- Start with a table shader because the probability field already exists as CPU-updated geometry.
- Add a full-screen post-processing stack for immediate spectacle.
- First design a centralized `QuantumVisualState` contract and phase shader work around gameplay readability.

### Final Decision

Create `docs/SHADER_ROADMAP.md` as a roadmap-only pass. Future shader systems should consume `QuantumVisualState`, keep physics/gameplay authoritative in host JavaScript, and land in phases: visual-state foundation, probability path clarity, table field material, source-ball material, collapse/interference payoff, optional tunneling only if the mechanic exists, then quality/accessibility QA.

### Why It Fits

The strongest direction remains "pool hall first, quantum second." A shared visual-state contract lets shaders communicate scar lock, probability, decoherence, and collapse without hiding targets, breaking WebXR comfort, or making color the only information channel.

### What Syed Needs To Review

- Approve whether `QuantumVisualState` should be the next implementation task.
- Add any legally obtained Jettelly reference materials to `docs/shader-bibles/` before shader implementation review.
- Decide whether tunneling should become a real mechanic later, or stay out of the shader plan.

## 2026-07-16 - Humanization Pass 1: Pool-Hall Voice

### Original Problem

The game had strong mechanics but still spoke like a generated sci-fi prototype: `Arcade Run / Optional VR`, `First-Person Scarring`, `Phase Trail`, `Void Rails`, and tutorial lines that explained systems instead of making the table feel authored.

### Alternatives Considered

- Keep the abstract quantum-simulation voice and polish it.
- Move toward a pure arcade score-attack style.
- Ground the strange mechanics in a physical impossible pool hall.

### Final Decision

Use the “Impossible Pool Hall” direction for UI copy and onboarding. Keep the quantum premise, but express most actions through billiards language: read the lane, chalk the scar, choose stroke weight, drop the lights.

### Why It Fits

The first-person cue view is already the most distinctive part of the game. Pool-hall language reinforces what the player is physically doing and makes the quantum mechanic feel like a table behavior rather than lore pasted on top.

### What Syed Needs To Review

- Approve or reject the new names `Ghost Chalk` and `Black Rail`.
- Decide whether the “pool hall” should feel haunted, elegant, grimy, comedic, or clinical.
- Rewrite any line that should sound more personally like you.
- Decide whether the final title remains `Quantum Billiards` or gets a subtitle based on the pool-hall direction.

## 2026-07-17 - KHR_interactivity Vertical Slice

### Original Problem

The project needed a production-minded `KHR_interactivity` integration, not a separate standards demo. The host game already has shot logic, scoring, UI, WebXR, and arcade structure, so the extension had to attach to the existing source ball without taking over physics or rules.

### Final Decision

Generate one source-ball glTF asset with a root-level `KHR_interactivity` graph, then execute a narrow official-operation subset through an isolated runtime. The game sends cue and shot events into the asset, and the asset sends `QB_VISUAL_COMPLETE` back after collapse presentation.

### Why It Fits

The source ball is the cleanest vertical slice: it is always present, has visible shot-state changes, and can prove the host/asset contract without destabilizing target rules or arena geometry.

### What Syed Needs To Review

- Decide whether the source ball's current glow/shell treatment is strong enough for the final art direction.
- Decide whether targets should move to the same glTF interactivity pipeline next.
- Run the harness and in-game diagnostics on the target Newgrounds browser set.

## 2026-07-17 - Humanization Pass 2: Scarred Cue Ball

### Original Problem

The interactive source ball proved the `KHR_interactivity` pipeline, but visually it still read as a generic glowing quantum sphere. That fought the “pool hall first, quantum second” pillar.

### Alternatives Considered

- Preserve the amber orb and rely on UI copy to sell the pool-hall identity.
- Add a full numbered billiards-ball skin.
- Add many scratches, chips, and dust marks.
- Make one restrained cue-ball pass with a single chalked scar seam and nick.

### Final Decision

Keep the gameplay radius and event graph unchanged, but revise the generated glTF into an off-white cue ball with one uneven scar seam and one chalk nick.

### Why It Fits

The player still sees an impossible object, but the first read is now billiards equipment. The scar seam localizes the quantum idea onto the object without adding lore or another mechanic.

### What Syed Needs To Review

- Approve whether the ball should feel clean/elegant or more worn.
- Decide whether the seam should look chalked, burned, engraved, or ghost-lit.
- Decide whether future target lights should become small table fixtures rather than orbs.

## 2026-07-17 - Humanization Pass 3: Inlaid Target Lights

### Original Problem

The gameplay copy says “drop every light,” but the targets still looked like generic floating magenta energy pickups. That weakened the pool-hall fiction and made the table feel less physically authored.

### Alternatives Considered

- Keep the glowing orbs for maximum arcade readability.
- Make each target a full pocket or numbered ball.
- Move targets onto rail posts.
- Make each target a small inlaid table light with restrained glow.

### Final Decision

Replace the target visual with a brass/off-white table fixture and magenta glass cap. Preserve the existing target positions, active/inactive behavior, hit radius, scoring, and “Light Drop” feedback.

### Why It Fits

The target now supports the existing verb: the player is literally dropping table lights. The fixture base also adds a house-made object language without adding another mechanic.

### What Syed Needs To Review

- Decide whether the base should feel brass, Bakelite, ivory, or painted metal.
- Decide whether target lights should differ per arena later, or stay consistent for readability.
- Decide whether “Light Drop” remains the scoring phrase.

## 2026-07-17 - Humanization Pass 4: Shot Feedback

### Original Problem

Shot results had the right basic information, but the impact still felt a little flat: a ring, a sound, and a toast. The phase-polish plan called for every shot to feel satisfying, but the game should not become noisy or full of generic particles.

### Alternatives Considered

- Add large screen shake and many particles for every shot.
- Add constant slow motion for successful hits.
- Add a separate combo UI panel.
- Reuse the existing burst/toast/readout surfaces with short impact sparks, small camera kick, and combo/perfect-shot callouts.

### Final Decision

Add result-bound sparks, a restrained camera kick outside XR, combo score bonuses, perfect-scar bonuses, and richer toast/log language.

### Why It Fits

The feedback now rewards the exact thing the game is about: clean banks and readable scar shots. It adds feel without adding another mechanic panel or unrelated progression system.

### What Syed Needs To Review

- Tune whether combo bonuses are generous enough for arcade replay.
- Decide whether “Perfect Scar” is the right phrase or too technical.
- Decide whether misses should keep saying “Line scattered” or move toward a more pool-hall phrase.
