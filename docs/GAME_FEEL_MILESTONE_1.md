# Game Feel Milestone 1 — Ball and Trajectory

## Scope

This milestone changes presentation only. It does not modify trajectory calculation, collision resolution, scoring, challenge data, saves, or WebXR input.

## Implemented

### Trajectory language

- Replaced the primary aim line and alternative haze lines with one original Three.js `ShaderMaterial` system.
- Added normalized path-progress data to reusable line geometry.
- Added restrained directional pulses that communicate route direction rather than functioning as ambient decoration.
- Primary path pulse strength decreases when scar lock is active, making a locked route visually steadier.
- Alternative paths remain subordinate through lower opacity, slower motion, stronger tail fading, and confidence-weighted intensity.
- Honors the operating-system reduced-motion preference by freezing pulse travel.

### Source-ball motion

- Ball motion now consumes coherence, uncertainty, phase context, and normalized shot power.
- High coherence produces steadier movement.
- Uncertainty changes breathing and shell circulation rather than merely changing color.
- Rotation was slowed to preserve the authored cue-ball scar and chalk-mark identity.

## Artist-facing trajectory controls

Defined in `rendering/trajectory-material.js`:

- `pathColor`
- `pathOpacity`
- `pulseSpeed`
- `pulseDensity`
- `pulseStrength`
- `tailFade`
- `phaseOffset`
- `confidence`
- `reducedMotion`

## Performance notes

- One shared shader program is used by the trajectory materials.
- Geometry buffers are reused and grow only when required.
- No textures, render targets, post-processing passes, or per-frame material allocation were added.
- The effect uses existing line primitives, so fill-rate and overdraw remain bounded.

## Validation targets

1. The primary path is identifiable immediately.
2. Alternatives never appear brighter than the primary path.
3. Scar-locked paths feel more stable than uncertain paths.
4. Reduced-motion mode preserves all gameplay information.
5. Desktop and WebXR trajectory calculations remain unchanged.
