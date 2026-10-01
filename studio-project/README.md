# Generated Studio mirror

Edit `src/core` and `src/studio`, then run `npm run prepare:studio` or
`npm run sync:studio`. Generated scripts are ignored by Git; this README is not.
The manifest is `scripts/studio-files.json`. Sync adjusts adapter import depth
and removes TypeScript import extensions for the installed Studio compiler.
Do not copy README into Studio. See `docs/STUDIO_SYNC.md`.
