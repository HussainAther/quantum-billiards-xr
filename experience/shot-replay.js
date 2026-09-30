export function createReplaySnapshot({ path3, color, duration, geometry, challengeIndex, energy, power }) {
  if (!Array.isArray(path3) || path3.length < 2) return null;
  return Object.freeze({
    path3: path3.map((point) => Object.freeze({ x: point.x, y: point.y, z: point.z })),
    color,
    duration: Math.max(320, Number(duration) || 900),
    geometry,
    challengeIndex,
    energy,
    power,
  });
}

export function canReplayShot(snapshot, state) {
  return Boolean(snapshot && state?.phase === "playing" && !state.paused && !state.replaying && state.shots?.length === 0);
}
