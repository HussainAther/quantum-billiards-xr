import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QB_EVENTS, QB_STATE, QB_STATE_LABELS } from "../interactivity/constants.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = resolve(root, "assets/interactive/quantum-ball.gltf");

const TYPE = {
  int: 0,
  float: 1,
};

const DECLARATION = {
  receive: 0,
  setVariable: 1,
  setDelay: 2,
  send: 3,
  debugLog: 4,
};

const events = [
  { id: QB_EVENTS.selected },
  { id: QB_EVENTS.deselected },
  { id: QB_EVENTS.charge, values: { charge: { type: TYPE.float, value: [0] } } },
  { id: QB_EVENTS.released, values: { charge: { type: TYPE.float, value: [0] } } },
  { id: QB_EVENTS.collision, values: { impact: { type: TYPE.float, value: [0] } } },
  { id: QB_EVENTS.quantum, values: { impact: { type: TYPE.float, value: [1] } } },
  { id: QB_EVENTS.collapse },
  { id: QB_EVENTS.pocketed },
  { id: QB_EVENTS.reset },
  { id: QB_EVENTS.visualComplete },
];

const eventIndex = Object.fromEntries(events.map((event, index) => [event.id, index]));

const graph = {
  types: [{ signature: "int" }, { signature: "float" }],
  variables: [
    {
      type: TYPE.int,
      value: [QB_STATE.idle],
      extras: {
        id: "presentationState",
        labels: QB_STATE_LABELS,
      },
    },
    { type: TYPE.float, value: [0], extras: { id: "charge" } },
    { type: TYPE.float, value: [0], extras: { id: "impact" } },
  ],
  events,
  declarations: [
    { op: "event/receive" },
    { op: "variable/set" },
    { op: "flow/setDelay" },
    { op: "event/send" },
    { op: "debug/log" },
  ],
  nodes: [],
  extras: {
    owner: "Quantum Billiards",
    scope: "source ball local presentation only",
  },
};

addStateEvent(QB_EVENTS.selected, QB_STATE.selected);
addStateEvent(QB_EVENTS.deselected, QB_STATE.idle);
addStateEvent(QB_EVENTS.charge, QB_STATE.charging, [{ variable: 1, socket: "charge" }]);
addStateEvent(QB_EVENTS.released, QB_STATE.released, [{ variable: 1, socket: "charge" }]);
addStateEvent(QB_EVENTS.collision, QB_STATE.colliding, [{ variable: 2, socket: "impact" }]);
addStateEvent(QB_EVENTS.quantum, QB_STATE.quantumActive, [{ variable: 2, socket: "impact" }]);
addCollapseEvent();
addStateEvent(QB_EVENTS.pocketed, QB_STATE.pocketed);
addResetEvent();

const gltf = buildGltf();
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(gltf, null, 2)}\n`);
console.log(`Wrote ${outputPath}`);

function addStateEvent(eventId, stateValue, passthrough = []) {
  const receiveNode = graph.nodes.length;
  graph.nodes.push({
    declaration: DECLARATION.receive,
    configuration: { event: { value: [eventIndex[eventId]] } },
    flows: { out: { node: receiveNode + 1 } },
  });

  const variables = [0, ...passthrough.map((entry) => entry.variable)];
  const values = {
    0: { type: TYPE.int, value: [stateValue] },
  };
  passthrough.forEach((entry) => {
    values[String(entry.variable)] = { node: receiveNode, socket: entry.socket };
  });

  graph.nodes.push({
    declaration: DECLARATION.setVariable,
    configuration: { variables: { value: variables } },
    values,
  });
}

function addCollapseEvent() {
  const receiveNode = graph.nodes.length;
  graph.nodes.push({
    declaration: DECLARATION.receive,
    configuration: { event: { value: [eventIndex[QB_EVENTS.collapse]] } },
    flows: { out: { node: receiveNode + 1 } },
  });
  graph.nodes.push({
    declaration: DECLARATION.setVariable,
    configuration: { variables: { value: [0, 1] } },
    values: {
      0: { type: TYPE.int, value: [QB_STATE.collapsing] },
      1: { type: TYPE.float, value: [0] },
    },
    flows: { out: { node: receiveNode + 2 } },
  });
  graph.nodes.push({
    declaration: DECLARATION.setDelay,
    values: {
      duration: { type: TYPE.float, value: [0.42] },
    },
    flows: {
      done: { node: receiveNode + 3 },
    },
  });
  graph.nodes.push({
    declaration: DECLARATION.send,
    configuration: { event: { value: [eventIndex[QB_EVENTS.visualComplete]] } },
  });
}

function addResetEvent() {
  const receiveNode = graph.nodes.length;
  graph.nodes.push({
    declaration: DECLARATION.receive,
    configuration: { event: { value: [eventIndex[QB_EVENTS.reset]] } },
    flows: { out: { node: receiveNode + 1 } },
  });
  graph.nodes.push({
    declaration: DECLARATION.setVariable,
    configuration: { variables: { value: [0, 1, 2] } },
    values: {
      0: { type: TYPE.int, value: [QB_STATE.idle] },
      1: { type: TYPE.float, value: [0] },
      2: { type: TYPE.float, value: [0] },
    },
  });
}

function buildGltf() {
  const sphere = createSphere(32, 16);
  const scarBand = createGreatCircleBand(72, 0.034);
  const chalkNick = createSphericalPatch(18, 0.18);
  const buffers = [];
  const bufferViews = [];
  const accessors = [];

  const sphereAccessors = addGeometryAccessors(sphere);
  const scarAccessors = addGeometryAccessors(scarBand);
  const nickAccessors = addGeometryAccessors(chalkNick);

  const binary = Buffer.concat(buffers);
  return {
    asset: {
      version: "2.0",
      generator: "Quantum Billiards deterministic KHR_interactivity pipeline",
      extras: {
        build: "quantum-ball-v2-scarred-cue",
        generatedBy: "tools/build-quantum-ball.mjs",
        humanizationDecision: "scarred off-white cue ball with one chalked house-rule seam",
      },
    },
    extensionsUsed: ["KHR_interactivity"],
    scene: 0,
    scenes: [{ name: "QuantumBallScene", nodes: [0] }],
    nodes: [
      { name: "QuantumBallRoot", children: [1, 2, 3, 4, 5] },
      { name: "QuantumBallCore", mesh: 0, scale: [0.055, 0.055, 0.055] },
      { name: "QuantumBallHalo", mesh: 1, scale: [0.087, 0.087, 0.087] },
      { name: "QuantumBallShell", mesh: 2, scale: [0.071, 0.071, 0.071] },
      { name: "QuantumBallScarBand", mesh: 3, scale: [0.058, 0.058, 0.058] },
      { name: "QuantumBallChalkNick", mesh: 4, scale: [0.058, 0.058, 0.058] },
    ],
    meshes: [
      {
        name: "QuantumBallCoreMesh",
        primitives: [
          {
            attributes: { POSITION: sphereAccessors.position, NORMAL: sphereAccessors.normal },
            indices: sphereAccessors.indices,
            material: 0,
          },
        ],
      },
      {
        name: "QuantumBallHaloMesh",
        primitives: [
          {
            attributes: { POSITION: sphereAccessors.position, NORMAL: sphereAccessors.normal },
            indices: sphereAccessors.indices,
            material: 1,
          },
        ],
      },
      {
        name: "QuantumBallShellMesh",
        primitives: [
          {
            attributes: { POSITION: sphereAccessors.position, NORMAL: sphereAccessors.normal },
            indices: sphereAccessors.indices,
            material: 2,
          },
        ],
      },
      {
        name: "QuantumBallScarBandMesh",
        primitives: [
          {
            attributes: { POSITION: scarAccessors.position, NORMAL: scarAccessors.normal },
            indices: scarAccessors.indices,
            material: 3,
          },
        ],
      },
      {
        name: "QuantumBallChalkNickMesh",
        primitives: [
          {
            attributes: { POSITION: nickAccessors.position, NORMAL: nickAccessors.normal },
            indices: nickAccessors.indices,
            material: 4,
          },
        ],
      },
    ],
    materials: [
      {
        name: "QuantumBallCoreMaterial",
        pbrMetallicRoughness: {
          baseColorFactor: [0.86, 0.82, 0.68, 1],
          metallicFactor: 0.02,
          roughnessFactor: 0.38,
        },
        emissiveFactor: [0.2, 0.13, 0.04],
      },
      {
        name: "QuantumBallHaloMaterial",
        pbrMetallicRoughness: {
          baseColorFactor: [0.86, 0.82, 0.68, 0.16],
          metallicFactor: 0,
          roughnessFactor: 0.62,
        },
        emissiveFactor: [0.42, 0.31, 0.1],
        alphaMode: "BLEND",
        doubleSided: true,
      },
      {
        name: "QuantumBallShellMaterial",
        pbrMetallicRoughness: {
          baseColorFactor: [0.22, 0.84, 0.91, 0.18],
          metallicFactor: 0.16,
          roughnessFactor: 0.18,
        },
        emissiveFactor: [0.22, 0.84, 0.91],
        alphaMode: "BLEND",
        doubleSided: true,
      },
      {
        name: "QuantumBallScarMaterial",
        pbrMetallicRoughness: {
          baseColorFactor: [0.035, 0.13, 0.105, 0.92],
          metallicFactor: 0,
          roughnessFactor: 0.76,
        },
        emissiveFactor: [0.02, 0.16, 0.11],
        alphaMode: "BLEND",
        doubleSided: true,
      },
      {
        name: "QuantumBallChalkNickMaterial",
        pbrMetallicRoughness: {
          baseColorFactor: [0.78, 0.93, 0.82, 0.82],
          metallicFactor: 0,
          roughnessFactor: 0.9,
        },
        emissiveFactor: [0.08, 0.16, 0.1],
        alphaMode: "BLEND",
        doubleSided: true,
      },
    ],
    buffers: [
      {
        byteLength: binary.byteLength,
        uri: `data:application/octet-stream;base64,${binary.toString("base64")}`,
      },
    ],
    bufferViews,
    accessors,
    extensions: {
      KHR_interactivity: {
        graphs: [graph],
        graph: 0,
      },
    },
  };

  function addGeometryAccessors(geometry) {
    const bounds = computeBounds(geometry.positions);
    const positionsView = appendBufferView(buffers, bufferViews, new Float32Array(geometry.positions), 34962);
    const normalsView = appendBufferView(buffers, bufferViews, new Float32Array(geometry.normals), 34962);
    const indicesView = appendBufferView(buffers, bufferViews, new Uint16Array(geometry.indices), 34963);

    const position = accessors.length;
    accessors.push({
      bufferView: positionsView,
      componentType: 5126,
      count: geometry.positions.length / 3,
      type: "VEC3",
      min: bounds.min,
      max: bounds.max,
    });
    const normal = accessors.length;
    accessors.push({
      bufferView: normalsView,
      componentType: 5126,
      count: geometry.normals.length / 3,
      type: "VEC3",
    });
    const indices = accessors.length;
    accessors.push({
      bufferView: indicesView,
      componentType: 5123,
      count: geometry.indices.length,
      type: "SCALAR",
    });
    return { position, normal, indices };
  }
}

function appendBufferView(buffers, bufferViews, typedArray, target) {
  const byteOffset = buffers.reduce((sum, buffer) => sum + buffer.byteLength, 0);
  const padding = (4 - (byteOffset % 4)) % 4;
  if (padding) buffers.push(Buffer.alloc(padding));
  const alignedOffset = byteOffset + padding;
  const data = Buffer.from(typedArray.buffer, typedArray.byteOffset, typedArray.byteLength);
  buffers.push(data);
  const index = bufferViews.length;
  bufferViews.push({
    buffer: 0,
    byteOffset: alignedOffset,
    byteLength: data.byteLength,
    target,
  });
  return index;
}

function createSphere(segments, rings) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let y = 0; y <= rings; y += 1) {
    const v = y / rings;
    const theta = v * Math.PI;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let x = 0; x <= segments; x += 1) {
      const u = x / segments;
      const phi = u * Math.PI * 2;
      const nx = Math.cos(phi) * sinTheta;
      const ny = cosTheta;
      const nz = Math.sin(phi) * sinTheta;
      positions.push(nx, ny, nz);
      normals.push(nx, ny, nz);
    }
  }

  for (let y = 0; y < rings; y += 1) {
    for (let x = 0; x < segments; x += 1) {
      const a = y * (segments + 1) + x;
      const b = a + segments + 1;
      const c = b + 1;
      const d = a + 1;
      indices.push(a, b, d, d, b, c);
    }
  }

  return { positions, normals, indices };
}

function createGreatCircleBand(segments, width) {
  const normal = normalize3([0.34, 0.77, 0.54]);
  const basisA = normalize3(cross3(normal, [0, 1, 0]));
  const basisB = normalize3(cross3(normal, basisA));
  const positions = [];
  const normals = [];
  const indices = [];

  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const center = add3(scale3(basisA, Math.cos(angle)), scale3(basisB, Math.sin(angle)));
    const wobble = 1 + Math.sin(angle * 3 + 0.5) * 0.16 + Math.sin(angle * 7 - 0.9) * 0.055;
    for (const side of [-1, 1]) {
      const offset = side * width * wobble;
      const p = normalize3(add3(scale3(center, Math.cos(offset)), scale3(normal, Math.sin(offset))));
      const raised = scale3(p, 1.026);
      positions.push(...raised);
      normals.push(...p);
    }
  }

  for (let i = 0; i < segments; i += 1) {
    const a = i * 2;
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }

  return { positions, normals, indices };
}

function createSphericalPatch(segments, radius) {
  const center = normalize3([-0.42, 0.31, 0.85]);
  const basisA = normalize3(cross3(center, [0, 1, 0]));
  const basisB = normalize3(cross3(center, basisA));
  const positions = [];
  const normals = [];
  const indices = [];

  positions.push(...scale3(center, 1.033));
  normals.push(...center);

  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const unevenRadius = radius * (1 + Math.sin(angle * 2.1) * 0.1 + Math.cos(angle * 5.2) * 0.045);
    const tangent = add3(scale3(basisA, Math.cos(angle)), scale3(basisB, Math.sin(angle)));
    const p = normalize3(add3(scale3(center, Math.cos(unevenRadius)), scale3(tangent, Math.sin(unevenRadius))));
    positions.push(...scale3(p, 1.034));
    normals.push(...p);
  }

  for (let i = 1; i <= segments; i += 1) {
    indices.push(0, i, i + 1);
  }

  return { positions, normals, indices };
}

function computeBounds(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let j = 0; j < 3; j += 1) {
      min[j] = Math.min(min[j], positions[i + j]);
      max[j] = Math.max(max[j], positions[i + j]);
    }
  }
  return { min, max };
}

function add3(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale3(a, scalar) {
  return [a[0] * scalar, a[1] * scalar, a[2] * scalar];
}

function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normalize3(a) {
  const length = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}
