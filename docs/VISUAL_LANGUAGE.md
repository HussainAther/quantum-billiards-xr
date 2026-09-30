# Quantum Billiards Visual Language

## Core Motif

An impossible pool hall where table geometry behaves like a house rule. The recurring motif is a lit bank lane crossing a dark table surface.

## Shapes

- Cue and rails: long, readable, grounded cylinders.
- Source ball: an off-white cue ball marked by one chalked scar seam and one small nick; it should read as billiards equipment before it reads as a sci-fi orb.
- Targets: small inlaid table lights with a brass/off-white base and magenta glass cap, not generic orbs in fiction.
- Scar paths: repeating bank lanes that look chalked or remembered by the table.
- Star table: teeth and notches should feel like rail hazards, not abstract decoration.

## Palette

- Felt darkness: near-black green/blue base.
- Cue/house warmth: amber and off-white.
- Live targets: magenta, used sparingly.
- Scar lock: green, reserved for the “route is readable” state.
- Cyan: stable/integrable route language.

Avoid letting cyan, magenta, amber, and green all shout at once. The table should have a dominant state per moment.

## Motion

- Cue motion should feel physical: anticipation, strike, recoil, settle.
- The source ball can pulse, but the scar seam and chalk nick should stay legible at close range.
- Targets can hum or bob, but should not look weightless for no reason.
- Burst rings should read as scoring feedback, not ambient particles.
- Hit sparks should be short, radial, and tied to a shot result. They are not ambient decoration.
- Camera kick is allowed only on shot result, and should stay small enough that aiming still feels fair.
- Scar lock should be confident and steady; non-scar chaos can smear.

## Current Asset Decisions

- `quantum-ball-v2-scarred-cue`: keep the source ball at the old gameplay radius while changing the read from "generic quantum orb" to "pool hall object with impossible markings."
- The uneven scar seam is intentional and authored, not random damage. It represents the table's remembered bank line.
- The chalk nick is a single hand-placed mark. Do not scatter more marks until Syed approves that the ball should feel worn.
- Target lights: keep the old hit radius, but ground the visual as an installed table fixture. The magenta glass is the active state; the base belongs to the house/table.
- Target motion should be a restrained hum. Avoid returning to free-floating bobbing unless the target is intentionally loose or haunted.

## UI Voice

Use short pool-hall language:

- Good: `Set Scar`, `Read the lit lane`, `Black Rail`, `Ghost Chalk`
- Avoid as final copy: `Optional VR`, `Release Notes`, `First-Person Scarring`, `procedural probability route`

## Authorship Questions For Syed

- Should the pool hall feel elegant, grimy, funny, haunted, or clinical?
- Should “Ghost Chalk” and “Black Rail” stay as unlock names?
- What real-world pool hall, classroom, arcade, or memory should the table inherit from?
