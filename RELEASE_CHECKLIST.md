# Quantum Billiards itch.io + WebXR Release Checklist

## Local verification

- Run `npm test` and confirm all suites pass.
- Serve over HTTP for desktop testing; do not open `index.html` directly from `file://`.
- Run `npm run package:itch` and verify `dist/quantum-billiards-itch.zip` contains `index.html` at the ZIP root.
- Verify the desktop game remains playable when WebXR is unavailable.

## WebXR / WebAR verification

- Test the hosted build over HTTPS on a WebXR-capable device.
- Confirm `Place in Your Room` appears only when `immersive-ar` is supported.
- Confirm `Enter Tabletop VR` appears only when `immersive-vr` is supported.
- In AR, verify the real environment remains visible and the synthetic floor/starfield are hidden.
- Aim the placement reticle at a horizontal floor/table surface and trigger to place the playfield.
- Squeeze a controller to re-enter placement mode and move the table.
- Use the controller stick to rotate the placed table.
- Confirm controller aiming and trigger-to-strike work after placement.
- Exit XR and confirm the normal desktop placement and environment are restored.
- Confirm permission denial/session failure returns gracefully to desktop mode.

## itch.io upload

- Upload `dist/quantum-billiards-itch.zip` as an HTML5 project.
- Use browser launch/fullscreen presentation where appropriate for XR entry.
- Keep all runtime assets local and referenced with relative paths.
- Test the actual itch.io-hosted HTTPS build on the target headset/browser before publishing.

## Current XR scope

The project supports desktop browser play, immersive VR tabletop mode, and WebAR surface placement on compatible WebXR browsers. AR v1 uses hit testing and controller input; persistent anchors, room meshing, and hand-only placement are future enhancements rather than release requirements.
