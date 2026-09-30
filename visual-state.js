const DEFAULT_ALTERNATIVE_COUNT = 7;

export function createQuantumVisualStateSystem(deps) {
  let lastTime = 0;
  let lastSnapshot = null;

  function update(time = 0) {
    const state = deps.getState();
    const arena = deps.getArena(state.geometry);
    const focus = deps.computeFocus();
    const scars = deps.scarStrength(state.geometry, state.energy);
    const scarLock = arena.className !== "Integrable" && scars.exact;
    const qualityTier = deps.getQualityTier?.() || "high";
    const primaryPath = deps.tracePath(state.yaw, state.geometry, { power: state.power });
    const predictedTargets = buildTargetPredictions({
      arena,
      deps,
      focus,
      path: primaryPath,
      scars,
      state,
      time,
    });
    const alternatives = buildAlternatives({
      arena,
      deps,
      focus,
      qualityTier,
      scarLock,
      state,
      time,
    });
    const activeTargets = state.targets.filter((target) => target.active);
    const dt = lastTime ? Math.max(0, (time - lastTime) * 0.001) : 0;

    lastTime = time;
    lastSnapshot = {
      time,
      dt,
      gamePhase: state.phase,
      qualityTier,
      accessibilityMode: "standard",
      arena: {
        id: state.geometry,
        label: arena.label,
        className: arena.className,
        bounds: { halfX: 1.22, halfZ: 0.88 },
        scarStrength: scars.strength,
        scarNearest: scars.nearest,
        scarDistance: scars.distance,
        fieldEnergy: state.energy,
      },
      source: {
        position: tablePointToWorld(arena.source, 0.078),
        tablePosition: copyPoint(arena.source),
        radius: 0.055,
        state: state.phase === "playing" ? "aiming" : "held",
        coherence: focus.coherence,
        epsilon: focus.epsilon,
        phase: normalizePhase(time * 0.00045 + state.energy * 0.015),
        uncertainty: 1 - focus.coherence,
        measurementProgress: state.shots.length ? 1 : 0,
        lastImpact: state.cameraKick,
        scarLock: scarLock ? 1 : 0,
      },
      focus,
      scars,
      aim: {
        yaw: state.yaw,
        power: state.power,
        primaryPath,
        primaryColor: primaryPathColor(arena, scarLock),
        primaryOpacity: scarLock ? 0.96 : 0.72,
        alternatives,
        predictedTargets,
        actualShotPath: newestShotPath(state),
        outcome: state.lastResult?.cleared ? "cleared" : state.roundComplete ? "complete" : state.phase,
      },
      field: {
        sampleResolution: 0,
        densitySamples: null,
        phaseSamples: null,
        decoherenceZones: focus.coherence < 0.5 ? [{ strength: 1 - focus.coherence }] : [],
        measurementRegions: predictedTargets.map((target) => ({
          id: target.id,
          probability: target.probability,
          captureRadius: target.captureRadius,
        })),
      },
      targets: predictedTargets,
      events: {
        shotAge: state.shots.length ? Math.max(0, (time - state.shots[state.shots.length - 1].start) * 0.001) : null,
        combo: state.combo,
        perfectScar: Boolean(state.lastResult?.perfect),
        collapseCenter: predictedTargets[0]?.probability > 0.01 ? predictedTargets[0].position : null,
        activeTargetCount: activeTargets.length,
      },
    };

    return lastSnapshot;
  }

  function getSnapshot() {
    return lastSnapshot;
  }

  return { getSnapshot, update };
}

export class QuantumVisualStateDiagnosticsOverlay {
  constructor(elements) {
    this.root = elements.root;
    this.status = elements.status;
    this.variables = elements.variables;
    this.targets = elements.targets;
  }

  toggle() {
    if (!this.root) return false;
    this.root.classList.toggle("hidden");
    return !this.root.classList.contains("hidden");
  }

  render(snapshot) {
    if (!this.root || this.root.classList.contains("hidden") || !snapshot) return;
    this.status.textContent = snapshot.qualityTier;
    this.variables.textContent = [
      `phase: ${snapshot.gamePhase}`,
      `arena: ${snapshot.arena.label} / ${snapshot.arena.className}`,
      `energy: n=${snapshot.arena.fieldEnergy}`,
      `scar: ${snapshot.source.scarLock ? "locked" : "open"} (nearest ${snapshot.arena.scarNearest}, d=${snapshot.arena.scarDistance})`,
      `coherence: ${(snapshot.source.coherence * 100).toFixed(1)}%`,
      `uncertainty: ${(snapshot.source.uncertainty * 100).toFixed(1)}%`,
      `epsilon: ${snapshot.source.epsilon.toFixed(4)}`,
      `yaw/power: ${snapshot.aim.yaw} deg / ${snapshot.aim.power}%`,
      `primary points: ${snapshot.aim.primaryPath.length}`,
      `alternatives: ${snapshot.aim.alternatives.length}`,
      `combo: ${snapshot.events.combo}`,
    ].join("\n");
    this.renderTargets(snapshot.targets);
  }

  renderTargets(targets) {
    if (!this.targets) return;
    this.targets.replaceChildren();
    const visible = targets.filter((target) => target.active).slice(0, 5);
    if (!visible.length) {
      const item = document.createElement("li");
      item.textContent = "No active target lights.";
      this.targets.append(item);
      return;
    }
    for (const target of visible) {
      const item = document.createElement("li");
      const probability = `${Math.round(target.probability * 100)}%`;
      item.textContent = `${target.id}: ${probability} p=${target.measurementWeight.toFixed(2)} d=${target.pathDistance.toFixed(3)}`;
      if (target.probability >= 0.72) item.className = "strong";
      this.targets.append(item);
    }
  }
}

function buildAlternatives({ arena, deps, focus, qualityTier, scarLock, state, time }) {
  const chaotic = arena.className !== "Integrable" && !scarLock;
  if (!chaotic || qualityTier === "low") return [];

  const count = qualityTier === "xr-safe" ? 3 : DEFAULT_ALTERNATIVE_COUNT;
  const center = Math.floor(count / 2);
  const spread = 5.5 + (1 - focus.coherence) * 7;
  const alternatives = [];

  for (let i = 0; i < count; i += 1) {
    const offset = i - center;
    const wobble = Math.sin(time * 0.001 + i * 1.6) * 2.4;
    const yaw = state.yaw + offset * spread + wobble;
    const path = deps.tracePath(yaw, state.geometry, { power: state.power * 0.82 });
    const distanceWeight = 1 - Math.abs(offset) / (center + 1);
    const weight = clamp(distanceWeight * (0.35 + (1 - focus.coherence) * 0.65), 0.08, 0.88);
    alternatives.push({
      points: path,
      weight,
      phase: normalizePhase(time * 0.00065 + i * 0.17),
      coherence: focus.coherence,
      bounceCount: estimateBounces(path),
      opacity: clamp(0.045 + weight * 0.09, 0.04, 0.16),
      color: 0xff4fb7,
      visible: true,
    });
  }

  return alternatives;
}

function buildTargetPredictions({ arena, deps, focus, path, scars, state, time }) {
  const scarLock = arena.className !== "Integrable" && scars.exact;
  const lane = scarLock ? 0.17 : arena.className === "Integrable" ? 0.12 : 0.095;
  const threshold = scarLock ? 0.34 : arena.className === "Integrable" ? 0.39 : 0.48;

  return state.targets
    .map((target) => {
      const pathDistance = target.active ? deps.minDistanceToPath(target, path) : Infinity;
      const density = target.active ? deps.fieldValue(target, time, state.geometry, state.energy) : 0;
      const aimScore = target.active ? clamp(1 - pathDistance / lane, 0, 1) : 0;
      const densityScore = 0.32 + density * 0.68;
      const powerScore = clamp(state.power / 74, 0.35, 1.25);
      const measurementWeight = aimScore * densityScore * powerScore * (0.55 + focus.coherence * 0.8);
      const probability = target.active ? clamp(measurementWeight / (threshold + 0.28), 0, 1) : 0;

      return {
        id: target.id,
        position: tablePointToWorld(target, 0.067),
        tablePosition: copyPoint(target),
        active: target.active,
        probability,
        captureRadius: lane,
        measurementWeight,
        pathDistance,
        density,
        lastHitAge: null,
      };
    })
    .sort((a, b) => b.probability - a.probability);
}

function newestShotPath(state) {
  const shot = state.shots[state.shots.length - 1];
  if (!shot) return [];
  return shot.path3.map((point) => ({ x: point.x, y: point.y, z: point.z }));
}

function primaryPathColor(arena, scarLock) {
  if (scarLock) return 0x66ef9a;
  if (arena.className === "Integrable") return 0x39d8e8;
  return 0xffc64b;
}

function tablePointToWorld(point, height) {
  return { x: point.x, y: height, z: point.y };
}

function copyPoint(point) {
  return { x: point.x, y: point.y };
}

function estimateBounces(path) {
  let bounces = 0;
  for (let i = 2; i < path.length; i += 1) {
    const a = path[i - 2];
    const b = path[i - 1];
    const c = path[i];
    const ab = Math.atan2(b.y - a.y, b.x - a.x);
    const bc = Math.atan2(c.y - b.y, c.x - b.x);
    if (Math.abs(angleDelta(ab, bc)) > 0.42) bounces += 1;
  }
  return bounces;
}

function angleDelta(a, b) {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function normalizePhase(value) {
  return value - Math.floor(value);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
