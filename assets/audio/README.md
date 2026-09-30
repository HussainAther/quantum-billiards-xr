# Quantum Billiards Audio Plan

Use authored BeepBox/JummBox loops for music and keep Web Audio synthesis for responsive SFX.

## Target Tracks

- `title-loop.mp3` or `title-loop.ogg`
  - Menu identity, 80-100 BPM, bright but mysterious.
- `run-loop.mp3` or `run-loop.ogg`
  - Main arcade loop, stable pulse, no harsh lead that fights SFX.
- `final-loop.mp3` or `final-loop.ogg`
  - Final challenge tension, darker bass, faster arps.
- `clear-stinger.mp3` or `clear-stinger.ogg`
  - Short grade/clear flourish.
- `fail-stinger.mp3` or `fail-stinger.ogg`
  - Short collapse/fail flourish.

## Export Rules

- Keep loops short: 30-60 seconds.
- Export with seamless loop points.
- Normalize gently; leave headroom for cue and target SFX.
- Store the original BeepBox/JummBox URL in `music-manifest.json`.
- Credit final music as original composition made with BeepBox/JummBox.

## Current Runtime

The game currently uses browser-native Web Audio synth music as a placeholder. Once files are added here, wire them into `game.js` as HTMLAudioElement loops or Web Audio buffers.
