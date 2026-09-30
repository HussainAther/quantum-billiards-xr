# Visual Feel, Motion & Atmosphere Pass

This pass preserves Quantum Billiards' simulation, scoring, trajectories, and challenge logic while making presentation react more intentionally to gameplay state.

## State rhythm

- Idle: full instrument readability with restrained ambient starfield drift.
- Aiming: side chrome softens and shifts outward a few pixels while the reticle tightens, putting visual priority on the table and trajectory.
- Shot in motion: HUD and objective chrome recede further while the reticle relaxes, allowing the moving pulse and collision path to dominate.
- Impact: collision strength drives a short localized disturbance in the field shader. Grazes are subtle; strong target/perfect contacts are more visible.
- Decay: field disturbance and release luminance decay continuously back to the idle baseline.

## Physics-linked presentation

The existing impact strengths remain the source for collision feedback. The new field response consumes those same strengths without changing resolution outcomes. Target hits and misses also feed the disturbance system at deliberately different amplitudes.

## Atmosphere

The existing starfield now drifts almost imperceptibly and changes opacity by activity state. It is quieter while aiming and slightly more present during a live shot. No extra particle emitter or post-processing pass was added.

## UI micro-motion

Controls retain the established 130/260/620 ms motion tokens. Aim/shot state transitions use opacity, tiny spatial shifts, saturation, and brightness rather than large transforms. Toasts, modal cards, and new log entries receive short resolve/arrival motion. Impulse power subtly affects the Strike control's luminous cue.

## Accessibility and performance

`prefers-reduced-motion` collapses the new DOM motion and accelerates visual decay. The field effect uses two small uniforms (`uDisturbance`, `uImpactOrigin`) and a local shader ripple rather than textures, render targets, bloom, or extra geometry.
