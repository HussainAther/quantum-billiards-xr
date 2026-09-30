# Quantum Billiards UI Motion System

## Motion families

### Initialize
A measured fade and vertical settle. Used when the title interface or a major panel becomes available.

### Trace
A directional line draws between stable nodes. Used only for trajectory-derived branding and progress cues.

### Confirm
A short underline expansion and restrained brightness increase. Used for hover, focus, and button confirmation.

### Resolve
Content settles or fades without bounce. Used for completion and dismissal.

## Timing tokens

- Fast: 130 ms
- Medium: 260 ms
- Slow: 620 ms
- Main ease: `cubic-bezier(0.2, 0.72, 0.2, 1)`
- Entry ease: `cubic-bezier(0.16, 1, 0.3, 1)`

## Accessibility

The CSS `prefers-reduced-motion` query collapses animation and transition durations. No information is communicated solely through motion, and the title remains fully legible without its trace animation.

## XR rule

This system changes DOM and panel presentation only. It never moves the XR camera or forces world-space motion.
