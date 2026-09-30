# Experience Milestone 5 — First Ten Minutes

This milestone reshapes the opening sequence around progressive mastery rather than exposing every system at once.

## Learning arc

1. Direct control with one receiver.
2. Predictable rail reflection with two receivers.
3. Impulse/energy control.
4. Scar calibration on a chaotic table.
5. A four-receiver synthesis challenge intended as the first “whoa” moment.
6. A compact mastery run.

Each challenge now declares its lesson and active receiver subset. The underlying arena geometry, collision model, scoring API, and trajectory simulation are unchanged.

## Replay

The latest impulse is captured as an immutable visual snapshot. `Replay Last Impulse` or the `R` key replays its route without rescoring, changing targets, consuming time, or altering the experiment. Replay is disabled while another pulse is moving.

## Validation

- Challenge receiver subsets are deterministic.
- Replay snapshots copy path data rather than retaining mutable Three.js vectors.
- Replay availability is state-gated.
- Existing gameplay and rendering tests remain required.
