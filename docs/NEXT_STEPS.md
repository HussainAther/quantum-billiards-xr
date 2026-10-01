# Quantum Billiards XR - Next Steps

## Current Circle vertical slice

The current port now has:

- 8th Wall World Tracking scene with `QuantumBilliardsRoot`.
- Drag-to-aim input with touch-end collapse protection.
- Minimum useful launch speed for normalized 8th Wall drags.
- Physics substeps to reduce target tunneling and deep rail penetration.
- Swept target collision between simulation samples.
- Circle reflection using the ball-center legal radius.
- A physics-matched first-leg aim preview that ends at the first rail contact.
- Donor-compatible point-particle trajectory fixtures retained separately for source parity.
- Shot/hit/score runtime counters in the Studio adapter.
- A visual rail and clearer Circle/ball/socket/aim colors in the Studio scene.

## Validate on device first

1. In `quantum-billiards-xr` run:

   ```bash
   npm test
   npm run build
   npm run sync:studio
   ```

2. Restart Play in 8th Wall Desktop.
3. Confirm the Ball starts at `(-0.48, 0.34)` and remains still before input.
4. Drag to aim. The cyan line should terminate at the predicted first rail contact.
5. Release. The actual ball should travel along the same first leg and reflect at the rail.
6. Hit the magenta Socket and confirm the ball resets to the source and `QB TARGET HIT` is logged.
7. Repeat on the mobile World Tracking preview.

## Recommended next implementation phase

### 1. Multi-segment trajectory renderer

The core now exposes `predictCircleTrajectory()` and `predictCircleTrajectoryFromDrag()`.
Replace the single `AimLine` with a small pool of segment entities so the user can see several predicted bank segments. Keep prediction and live simulation on the same reflection primitives.

### 2. Target-hit feedback and compact HUD

Add lightweight Studio entities/components for:

- target flash/pulse on hit;
- score / hits / shots;
- a reset-shot control;
- optional power indication.

Do not build a large desktop-style HUD over the camera feed.

### 3. Circle parity pass against the donor WebAR game

Compare the Circle slice with `/Volumes/External/games/quantum-billiards` for:

- source/target positions;
- trajectory visual styling;
- impact feedback;
- challenge behavior;
- energy / uncertainty / scar mechanics that apply to Circle.

### 4. Port remaining arenas

Only after Circle parity is stable:

1. Triangle
2. Stadium
3. Star

Arena geometry and collision math should be extracted from the donor rather than approximated.

## Debug modes

In the Studio Simulator console:

```js
globalThis.__QB_DEBUG_MODE = 'simulation'
```

logs periodic simulation state.

```js
globalThis.__QB_DEBUG_MODE = 'forced'
```

bypasses gameplay and directly moves the Ball in +X to test transform ownership.

Reset with:

```js
globalThis.__QB_DEBUG_MODE = 'off'
```
