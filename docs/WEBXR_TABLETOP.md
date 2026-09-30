# WebXR Spatial Modes

Quantum Billiards keeps the simulation under one `playfieldRoot`, allowing the same game to run on desktop, in immersive VR, or as a placed WebAR tabletop without changing the underlying physics.

## Room AR

On browsers that support `immersive-ar` and WebXR hit testing, **Place in Your Room** starts a passthrough AR session. The synthetic floor, starfield, and fog are disabled so the physical environment remains visible.

1. Aim the placement reticle at a horizontal floor or tabletop surface.
2. Press an XR trigger to place the full billiards apparatus.
3. Aim a controller at the placed table to steer the shot.
4. Press trigger to strike.
5. Squeeze a controller to re-enter placement mode and move the table.
6. Use the controller stick to rotate the placed table.

AR placement is intentionally conservative in v1: steep/vertical hit-test surfaces are rejected to keep the simulation level and readable.

## Tabletop VR

If `immersive-vr` is available, **Enter Tabletop VR** preserves the original comfortable fixed placement approximately 0.78 m above the local floor and 1.15 m in front of the player. Controller ray aiming and trigger-to-strike behavior remain unchanged.

## Architecture

All table-owned scene objects live under `world.playfieldRoot`: field, boundaries, source, targets, cue, aim paths, shots, and impact effects. `xr-tabletop.js` owns XR capability detection, sessions, controller input, AR hit testing, placement, rotation, haptics, and world-to-playfield aim conversion.

`game.js` owns environment presentation. In AR it switches the WebGL clear alpha to transparent and hides the synthetic room elements; ending XR restores the desktop scene automatically.

## Secure context requirement

Immersive WebXR must be tested from a secure origin. `localhost` works for local desktop development, but headset testing should use an HTTPS-hosted build (including an itch.io draft page) or another trusted HTTPS origin.

## Future XR work

- Optional persistent anchors for more stable room placement.
- Hand-only placement/aiming experiments.
- AR-native scale/height adjustment UI.
- Transient-input hit testing for direct controller/hand placement.
- Device-specific comfort and performance validation.
