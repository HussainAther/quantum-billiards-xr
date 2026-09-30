import * as THREE from "../vendor/three.module.min.js";

const DEFAULT_BUDGETS = Object.freeze({
  low: { rings: 5, sparks: 4 },
  medium: { rings: 8, sparks: 6 },
  high: { rings: 12, sparks: 9 },
  "xr-safe": { rings: 7, sparks: 5 },
});

const COLORS = Object.freeze({
  wall: 0x8ff9ef,
  graze: 0x9bc8d0,
  target: 0x66ef9a,
  perfect: 0xffe7a0,
  miss: 0xff6a5f,
});

function makeRingMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function makeSparkMaterial() {
  return new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

export function createImpactSystem({ group, quality = "high" }) {
  const budget = DEFAULT_BUDGETS[quality] || DEFAULT_BUDGETS.high;
  const ringGeometry = new THREE.RingGeometry(0.052, 0.068, 40);
  const sparkGeometry = new THREE.BufferGeometry();
  const sparkPositions = new Float32Array(2 * 3 * 16);
  sparkGeometry.setAttribute("position", new THREE.BufferAttribute(sparkPositions, 3));

  const rings = Array.from({ length: budget.rings }, () => {
    const mesh = new THREE.Mesh(ringGeometry, makeRingMaterial());
    mesh.visible = false;
    mesh.renderOrder = 6;
    group.add(mesh);
    return { mesh, start: 0, duration: 1, strength: 1, active: false };
  });

  const sparks = Array.from({ length: budget.sparks }, () => {
    const mesh = new THREE.LineSegments(sparkGeometry.clone(), makeSparkMaterial());
    mesh.visible = false;
    mesh.renderOrder = 7;
    group.add(mesh);
    return { mesh, start: 0, duration: 1, strength: 1, active: false };
  });

  const up = new THREE.Vector3(0, 0, 1);
  const normal = new THREE.Vector3();
  const tangent = new THREE.Vector3();
  const bitangent = new THREE.Vector3();
  let ringCursor = 0;
  let sparkCursor = 0;

  function acquire(pool, cursorName) {
    const index = cursorName === "ring" ? ringCursor++ % pool.length : sparkCursor++ % pool.length;
    return pool[index];
  }

  function spawnRing({ position, normal: inputNormal, type = "wall", strength = 1, reducedMotion = false }) {
    const entry = acquire(rings, "ring");
    const color = COLORS[type] ?? COLORS.wall;
    entry.active = true;
    entry.start = performance.now();
    entry.duration = reducedMotion ? 260 : type === "perfect" ? 620 : 420;
    entry.strength = THREE.MathUtils.clamp(strength, 0.2, 1.6);
    entry.mesh.visible = true;
    entry.mesh.position.copy(position);
    normal.copy(inputNormal || up).normalize();
    entry.mesh.quaternion.setFromUnitVectors(up, normal);
    entry.mesh.scale.setScalar(0.75 + entry.strength * 0.25);
    entry.mesh.material.color.setHex(color);
    entry.mesh.material.opacity = type === "graze" ? 0.42 : 0.72;
  }

  function spawnSparks({ position, normal: inputNormal, type = "wall", strength = 1, reducedMotion = false }) {
    const entry = acquire(sparks, "spark");
    const color = COLORS[type] ?? COLORS.wall;
    const count = reducedMotion ? 4 : type === "perfect" ? 12 : type === "graze" ? 5 : 8;
    normal.copy(inputNormal || up).normalize();
    tangent.set(1, 0, 0);
    if (Math.abs(normal.dot(tangent)) > 0.9) tangent.set(0, 1, 0);
    tangent.cross(normal).normalize();
    bitangent.crossVectors(normal, tangent).normalize();

    const attribute = entry.mesh.geometry.getAttribute("position");
    const array = attribute.array;
    for (let i = 0; i < 16; i += 1) {
      const offset = i * 6;
      if (i >= count) {
        array.fill(0, offset, offset + 6);
        continue;
      }
      const angle = (i / count) * Math.PI * 2 + (i % 2) * 0.17;
      const spread = (0.04 + (i % 3) * 0.012) * THREE.MathUtils.clamp(strength, 0.35, 1.5);
      const lift = type === "target" || type === "perfect" ? 0.018 + (i % 2) * 0.012 : 0.008;
      const end = position
        .clone()
        .addScaledVector(tangent, Math.cos(angle) * spread)
        .addScaledVector(bitangent, Math.sin(angle) * spread)
        .addScaledVector(normal, lift);
      array[offset] = position.x;
      array[offset + 1] = position.y;
      array[offset + 2] = position.z;
      array[offset + 3] = end.x;
      array[offset + 4] = end.y;
      array[offset + 5] = end.z;
    }
    attribute.needsUpdate = true;
    entry.mesh.geometry.setDrawRange(0, count * 2);
    entry.active = true;
    entry.start = performance.now();
    entry.duration = reducedMotion ? 240 : type === "perfect" ? 560 : 360;
    entry.strength = THREE.MathUtils.clamp(strength, 0.2, 1.6);
    entry.mesh.visible = true;
    entry.mesh.material.color.setHex(color);
    entry.mesh.material.opacity = type === "graze" ? 0.4 : 0.78;
  }

  function spawn(options) {
    spawnRing(options);
    if (options.type !== "graze" || options.strength > 0.45) spawnSparks(options);
  }

  function update(time = performance.now()) {
    for (const entry of rings) {
      if (!entry.active) continue;
      const t = (time - entry.start) / entry.duration;
      if (t >= 1) {
        entry.active = false;
        entry.mesh.visible = false;
        continue;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      entry.mesh.scale.setScalar((0.78 + eased * (2.6 + entry.strength * 0.9)) * (0.8 + entry.strength * 0.2));
      entry.mesh.material.opacity = (1 - t) * (0.42 + entry.strength * 0.25);
    }

    for (const entry of sparks) {
      if (!entry.active) continue;
      const t = (time - entry.start) / entry.duration;
      if (t >= 1) {
        entry.active = false;
        entry.mesh.visible = false;
        continue;
      }
      entry.mesh.scale.setScalar(1 + t * (0.8 + entry.strength * 0.5));
      entry.mesh.material.opacity = (1 - t) * 0.8;
    }
  }

  function clear() {
    for (const entry of [...rings, ...sparks]) {
      entry.active = false;
      entry.mesh.visible = false;
    }
  }

  function dispose() {
    for (const entry of rings) {
      entry.mesh.removeFromParent();
      entry.mesh.material.dispose();
    }
    for (const entry of sparks) {
      entry.mesh.removeFromParent();
      entry.mesh.geometry.dispose();
      entry.mesh.material.dispose();
    }
    ringGeometry.dispose();
    sparkGeometry.dispose();
  }

  return { spawn, update, clear, dispose };
}
