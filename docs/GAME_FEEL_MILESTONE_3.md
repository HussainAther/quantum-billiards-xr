# Game Feel Milestone 3 — Field and Scar Surface

## Purpose

Turn the table from a CPU-deformed color grid into a stable, shader-driven measurement surface. The surface communicates current field intensity and resonant scar-lock state while preserving the existing simulation as the source of gameplay truth.

## Implementation

- Added `rendering/field-surface-material.js`.
- Moved visual displacement and coloration to the GPU.
- Removed per-frame position/color buffer uploads and per-frame normal recomputation.
- Retained the existing CPU `fieldValue`, `scarStrength`, and shot-resolution functions unchanged for gameplay.
- Added dark felt-like microvariation, restrained cyan field response, gold scar-lock response, domain edge fading, and a conservative Fresnel edge cue.
- The material is opaque, depth-writing, and uses no textures, render targets, ray marching, or extra passes.

## Quality behavior

- **Low:** static surface; field remains color-readable without displacement.
- **Medium / XR-safe:** reduced displacement and animation.
- **High:** full restrained displacement.
- **Reduced motion:** temporal pulse is frozen while state remains readable.

## Important scope note

The current game models resonance/scar lock as a deterministic property of geometry and energy, not as a persistent list of historical scar objects. This milestone visualizes that existing state faithfully. It does not invent a new persistent-scar mechanic or alter scoring.

## Artist controls

The shader exposes uniforms for:

- time
- energy
- geometry class
- scar strength
- exact scar lock
- motion scale
- base color
- field color
- scar color
- reduced motion
- camera position

## Performance intent

The old surface performed thousands of CPU field evaluations, uploaded two large attributes, and recomputed normals during updates. The new surface keeps geometry stable and updates only a small uniform set. Fragment derivatives provide a local displaced-surface normal for restrained lighting cues.

## Validation

- JavaScript syntax validation
- Field material uniform test
- Existing interactivity tests
- Existing impact-system tests
- Asset regeneration
- Newgrounds packaging

Manual browser and headset review remains required for final displacement amplitude, triangle/star edge fidelity, and visual contrast at different display brightness levels.
