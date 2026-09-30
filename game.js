import * as THREE from "./vendor/three.module.min.js";
import { InteractivityDiagnostics, InteractivityDiagnosticsOverlay } from "./interactivity/diagnostics.js";
import { QB_EVENTS } from "./interactivity/constants.js";
import { createQuantumBallInstance } from "./interactivity/host-bindings.js";
import { QuantumVisualStateDiagnosticsOverlay, createQuantumVisualStateSystem } from "./visual-state.js";
import { createXRTabletopMode } from "./xr-tabletop.js";
import { createTrajectoryMaterial, updateTrajectoryMaterial } from "./rendering/trajectory-material.js";
import { createImpactSystem } from "./rendering/impact-system.js";
import { createFieldSurfaceMaterial, updateFieldSurfaceMaterial } from "./rendering/field-surface-material.js";
import { canReplayShot, createReplaySnapshot } from "./experience/shot-replay.js";

const canvas = document.querySelector("#gameCanvas");
const simRoot = document.querySelector(".sim");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x050607, 1);
renderer.xr.enabled = true;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x050607, 0.17);
const desktopFog = scene.fog;

const camera = new THREE.PerspectiveCamera(58, 1, 0.01, 80);
camera.position.set(-1.5, 0.45, 0);
const cameraRig = new THREE.Group();
cameraRig.add(camera);

const ui = {
  geometryControls: document.querySelector("#geometryControls"),
  challengeLabel: document.querySelector("#challengeLabel"),
  geometryLabel: document.querySelector("#geometryLabel"),
  energySlider: document.querySelector("#energySlider"),
  energyInput: document.querySelector("#energyInput"),
  energyReadout: document.querySelector("#energyReadout"),
  energyDown: document.querySelector("#energyDown"),
  energyUp: document.querySelector("#energyUp"),
  angleSlider: document.querySelector("#angleSlider"),
  angleReadout: document.querySelector("#angleReadout"),
  pitchSlider: document.querySelector("#pitchSlider"),
  pitchReadout: document.querySelector("#pitchReadout"),
  powerSlider: document.querySelector("#powerSlider"),
  powerReadout: document.querySelector("#powerReadout"),
  fireButton: document.querySelector("#fireButton"),
  scarButton: document.querySelector("#scarButton"),
  resetButton: document.querySelector("#resetButton"),
  replayShotButton: document.querySelector("#replayShotButton"),
  roundReplayButton: document.querySelector("#roundReplayButton"),
  xrArButton: document.querySelector("#xrArButton"),
  xrVrButton: document.querySelector("#xrVrButton"),
  pauseButton: document.querySelector("#pauseButton"),
  muteButton: document.querySelector("#muteButton"),
  scarStatus: document.querySelector("#scarStatus"),
  targetStatus: document.querySelector("#targetStatus"),
  spectrumBar: document.querySelector("#spectrumBar"),
  scoreReadout: document.querySelector("#scoreReadout"),
  timerReadout: document.querySelector("#timerReadout"),
  shotsReadout: document.querySelector("#shotsReadout"),
  bonusReadout: document.querySelector("#bonusReadout"),
  coherenceReadout: document.querySelector("#coherenceReadout"),
  epsilonReadout: document.querySelector("#epsilonReadout"),
  modeReadout: document.querySelector("#modeReadout"),
  xrReadout: document.querySelector("#xrReadout"),
  focusReadout: document.querySelector("#focusReadout"),
  focusMeter: document.querySelector("#focusMeter"),
  eventLog: document.querySelector("#eventLog"),
  roundOverlay: document.querySelector("#roundOverlay"),
  roundEyebrow: document.querySelector("#roundEyebrow"),
  roundTitle: document.querySelector("#roundTitle"),
  roundSummary: document.querySelector("#roundSummary"),
  roundTimeBonus: document.querySelector("#roundTimeBonus"),
  roundParBonus: document.querySelector("#roundParBonus"),
  roundTotalScore: document.querySelector("#roundTotalScore"),
  roundGrade: document.querySelector("#roundGrade"),
  roundUnlock: document.querySelector("#roundUnlock"),
  roundNewBest: document.querySelector("#roundNewBest"),
  nextRoundButton: document.querySelector("#nextRoundButton"),
  restartRunButton: document.querySelector("#restartRunButton"),
  titleOverlay: document.querySelector("#titleOverlay"),
  titleBestScore: document.querySelector("#titleBestScore"),
  titleBestGrade: document.querySelector("#titleBestGrade"),
  titleRunCount: document.querySelector("#titleRunCount"),
  startRunButton: document.querySelector("#startRunButton"),
  challengeSelectButton: document.querySelector("#challengeSelectButton"),
  titleControlsButton: document.querySelector("#titleControlsButton"),
  titleSettingsButton: document.querySelector("#titleSettingsButton"),
  titleCreditsButton: document.querySelector("#titleCreditsButton"),
  phaseTrailUnlock: document.querySelector("#phaseTrailUnlock"),
  voidRailsUnlock: document.querySelector("#voidRailsUnlock"),
  pauseOverlay: document.querySelector("#pauseOverlay"),
  resumeButton: document.querySelector("#resumeButton"),
  newRunButton: document.querySelector("#newRunButton"),
  pauseControlsButton: document.querySelector("#pauseControlsButton"),
  pauseCreditsButton: document.querySelector("#pauseCreditsButton"),
  musicVolumeSlider: document.querySelector("#musicVolumeSlider"),
  sfxVolumeSlider: document.querySelector("#sfxVolumeSlider"),
  musicVolumeReadout: document.querySelector("#musicVolumeReadout"),
  sfxVolumeReadout: document.querySelector("#sfxVolumeReadout"),
  objectiveCard: document.querySelector("#objectiveCard"),
  objectiveEyebrow: document.querySelector("#objectiveEyebrow"),
  objectiveTitle: document.querySelector("#objectiveTitle"),
  objectiveHint: document.querySelector("#objectiveHint"),
  shotToast: document.querySelector("#shotToast"),
  infoOverlay: document.querySelector("#infoOverlay"),
  infoEyebrow: document.querySelector("#infoEyebrow"),
  infoTitle: document.querySelector("#infoTitle"),
  infoBody: document.querySelector("#infoBody"),
  infoPrimaryButton: document.querySelector("#infoPrimaryButton"),
  infoSecondaryButton: document.querySelector("#infoSecondaryButton"),
  infoCloseButton: document.querySelector("#infoCloseButton"),
  challengeOverlay: document.querySelector("#challengeOverlay"),
  challengeList: document.querySelector("#challengeList"),
  challengeCloseButton: document.querySelector("#challengeCloseButton"),
  interactivityDiagnostics: document.querySelector("#interactivityDiagnostics"),
  interactivityStatus: document.querySelector("#interactivityStatus"),
  interactivityVariables: document.querySelector("#interactivityVariables"),
  interactivityEvents: document.querySelector("#interactivityEvents"),
  visualStateDiagnostics: document.querySelector("#visualStateDiagnostics"),
  visualStateStatus: document.querySelector("#visualStateStatus"),
  visualStateVariables: document.querySelector("#visualStateVariables"),
  visualStateTargets: document.querySelector("#visualStateTargets"),
};

const TAU = Math.PI * 2;
const TABLE_HALF_X = 1.22;
const TABLE_HALF_Z = 0.88;
const GRID_X = 100;
const GRID_Z = 64;
const UP = new THREE.Vector3(0, 1, 0);
const STORAGE_KEY = "quantum-billiards-release-save-v1";
const GRADE_VALUE = { S: 5, A: 4, B: 3, C: 2, D: 1, F: 0, "-": -1 };
const DEFAULT_SAVE = {
  bestScore: 0,
  bestGrade: "-",
  runs: 0,
  tutorialSeen: false,
  challengeBestGrades: [],
  unlocks: {
    phaseTrail: false,
    voidRails: false,
  },
  audio: {
    muted: false,
    musicVolume: 45,
    sfxVolume: 70,
  },
};

const SCAR_STATES = {
  circle: [21, 34, 55, 89, 144, 233, 377],
  triangle: [24, 48, 96, 192, 384],
  stadium: [34, 55, 89, 144, 233, 377],
  star: [40, 80, 120, 240, 360, 480],
};

const ARENAS = {
  circle: {
    label: "Circle",
    className: "Integrable",
    source: { x: -0.48, y: 0.34 },
    targets: [
      { x: 0.46, y: -0.28 },
      { x: 0.08, y: 0.61 },
      { x: -0.09, y: -0.54 },
      { x: 0.61, y: 0.27 },
    ],
  },
  triangle: {
    label: "Triangle",
    className: "Integrable",
    source: { x: -0.43, y: 0.42 },
    targets: [
      { x: 0.42, y: 0.36 },
      { x: 0.0, y: -0.52 },
      { x: -0.1, y: 0.05 },
      { x: 0.26, y: -0.19 },
    ],
  },
  stadium: {
    label: "Stadium",
    className: "Chaotic",
    source: { x: -0.92, y: 0.0 },
    targets: [
      { x: 0.9, y: 0.0 },
      { x: 0.32, y: 0.42 },
      { x: -0.08, y: -0.47 },
      { x: 0.62, y: -0.31 },
    ],
  },
  star: {
    label: "Star",
    className: "Pseudointegrable",
    source: { x: -0.52, y: 0.14 },
    targets: [
      { x: 0.48, y: -0.1 },
      { x: -0.02, y: -0.53 },
      { x: 0.12, y: 0.56 },
      { x: -0.44, y: -0.28 },
    ],
  },
};

const CHALLENGES = [
  {
    name: "First Observation",
    lesson: "01 / DIRECT CONTROL",
    geometry: "circle",
    targetIndices: [0],
    energy: 55,
    yaw: -33,
    pitch: 6,
    power: 66,
    par: 2,
    time: 95,
    objective: "Translate intention into one clean contact.",
    hint: "Follow the bright path. Make a small adjustment, then commit.",
  },
  {
    name: "Honest Reflection",
    lesson: "02 / BANK GEOMETRY",
    geometry: "circle",
    targetIndices: [1, 2],
    energy: 55,
    yaw: 18,
    pitch: 6,
    power: 68,
    par: 3,
    time: 100,
    objective: "Use the rail to resolve two receivers.",
    hint: "A bank is predictable. Read the angle before adding power.",
  },
  {
    name: "Impulse Window",
    lesson: "03 / ENERGY CONTROL",
    geometry: "triangle",
    targetIndices: [0, 2],
    energy: 96,
    yaw: 8,
    pitch: 7,
    power: 58,
    par: 3,
    time: 105,
    objective: "Change impulse without losing the route.",
    hint: "Enough power reaches the receiver. Too much makes the path harder to read.",
  },
  {
    name: "Scar Calibration",
    lesson: "04 / REPEATING STATE",
    geometry: "stadium",
    targetIndices: [0, 1, 3],
    energy: 144,
    yaw: -6,
    pitch: 8,
    power: 78,
    par: 4,
    time: 115,
    objective: "Calibrate a repeating bank, then trust it.",
    hint: "Use Calibrate Scar once. Watch uncertainty collapse into a stable lane.",
  },
  {
    name: "Many-Worlds Run",
    lesson: "05 / SYNTHESIS",
    geometry: "star",
    targetIndices: [0, 1, 2, 3],
    energy: 240,
    yaw: 4,
    pitch: 8,
    power: 80,
    par: 5,
    time: 135,
    objective: "Turn an impossible-looking route into one elegant sequence.",
    hint: "The teeth are rails. Look for the path that resolves more than one receiver.",
  },
  {
    name: "Final Scar Run",
    lesson: "06 / MASTERY",
    geometry: "stadium",
    targetIndices: [0, 1, 2, 3],
    energy: 233,
    yaw: 0,
    pitch: 9,
    power: 86,
    par: 3,
    time: 82,
    objective: "Clear the house table with deliberate, economical motion.",
    hint: "Fast, clean banks beat loud power.",
  },
];

const TUTORIAL_STEPS = [
  {
    title: "Observe before acting",
    body: "<p>The bright trajectory is your predicted route. Move the aim gently and watch the receiver, not the controls.</p>",
  },
  {
    title: "Commit to the impulse",
    body: "<p><strong>Strike</strong>, Space, Enter, or an XR trigger releases the pulse. The first experiment asks for only one clean contact.</p>",
  },
  {
    title: "Learn from every route",
    body: "<p>After any impulse, use <strong>Replay Last Impulse</strong> to inspect the motion without changing the experiment.</p>",
  },
  {
    title: "Calibrate when chaos arrives",
    body: "<p>Later tables can smear. <strong>Calibrate Scar</strong> selects the nearest repeating state; it reveals order but never aims for you.</p>",
  },
];

const INFO_SCREENS = {
  controls: {
    eyebrow: "Reference",
    title: "Controls",
    body: `
      <ul>
        <li><strong>Aim:</strong> drag on the table, use Cue Yaw, or press Left/Right.</li>
        <li><strong>Elevation:</strong> use the slider or press Up/Down.</li>
        <li><strong>Shoot:</strong> click Strike, press Space/Enter, or use an XR trigger.</li>
        <li><strong>Scar tuning:</strong> Set Scar marks the nearest repeating bank.</li>
        <li><strong>Pause:</strong> Escape or the Pause button.</li>
      </ul>
    `,
  },
  credits: {
    eyebrow: "House Notes",
    title: "Credits",
    body: `
      <p>Quantum Billiards is a first-person trick-shot table where the rails remember certain banks.</p>
      <p>Current music is browser-native synth generated with Web Audio. Final house loops are planned for BeepBox/JummBox export under <strong>assets/audio</strong>.</p>
      <p>WebXR is optional. The browser build supports tabletop VR and, on compatible devices, room-scale WebAR placement.</p>
    `,
  },
};

const saveData = loadSave();
const interactivityDiagnostics = new InteractivityDiagnostics();
const interactivityOverlay = new InteractivityDiagnosticsOverlay(
  {
    root: ui.interactivityDiagnostics,
    status: ui.interactivityStatus,
    variables: ui.interactivityVariables,
    events: ui.interactivityEvents,
  },
  interactivityDiagnostics
);
const visualStateSystem = createQuantumVisualStateSystem({
  getState: () => state,
  getArena: (geometry) => ARENAS[geometry],
  getQualityTier: getVisualQualityTier,
  tracePath,
  computeFocus,
  scarStrength,
  fieldValue,
  minDistanceToPath,
});
const visualStateOverlay = new QuantumVisualStateDiagnosticsOverlay({
  root: ui.visualStateDiagnostics,
  status: ui.visualStateStatus,
  variables: ui.visualStateVariables,
  targets: ui.visualStateTargets,
});

const state = {
  phase: "title",
  paused: false,
  tutorialStep: 0,
  infoMode: null,
  pauseStarted: 0,
  geometry: "stadium",
  energy: 89,
  yaw: 0,
  pitch: 7,
  power: 74,
  score: 0,
  runNewBest: false,
  challengeGrades: [],
  save: saveData,
  muted: saveData.audio.muted,
  musicVolume: saveData.audio.musicVolume,
  sfxVolume: saveData.audio.sfxVolume,
  challengeIndex: 0,
  shotsTaken: 0,
  timeRemaining: CHALLENGES[0].time,
  roundStart: 0,
  lastWarningSecond: null,
  roundComplete: false,
  runComplete: false,
  scarHits: 0,
  lastResult: null,
  xrSupported: false,
  xrSession: null,
  xrAimActive: false,
  targets: [],
  shots: [],
  bursts: [],
  combo: 0,
  dragging: false,
  cueKick: 0,
  cameraKick: 0,
  cameraKickUntil: 0,
  cameraKickSeed: 0,
  fieldDirty: true,
  lastFieldUpdate: 0,
  visualState: null,
  lastShotReplay: null,
  replaying: false,
  replayRestoreOverlay: false,
  fieldImpulse: 0,
  fieldImpactOrigin: new THREE.Vector2(0, 0),
  releaseFlash: 0,
  interfaceActivity: "",
};

const audio = {
  context: null,
  master: null,
  musicGain: null,
  sfxGain: null,
  musicTimer: null,
  musicStep: 0,
};

const trianglePoly = [
  { x: 0, y: -0.84 },
  { x: 0.82, y: 0.58 },
  { x: -0.82, y: 0.58 },
];
const starPoly = makeStar(6, 0.86, 0.46, -Math.PI / 2);

const world = {
  tableMesh: null,
  gridPoints: [],
  boundaryGroup: new THREE.Group(),
  targetGroup: new THREE.Group(),
  cueGroup: new THREE.Group(),
  shotGroup: new THREE.Group(),
  burstGroup: new THREE.Group(),
  aimLine: null,
  hazeLines: [],
  starfield: null,
  environmentFloor: null,
  sourceGroup: null,
  sourceBall: null,
  sourceHalo: null,
  sourceInteractive: null,
  sourceMountToken: null,
  playfieldRoot: new THREE.Group(),
};

const materials = {
  table: createFieldSurfaceMaterial(),
  wall: new THREE.MeshStandardMaterial({
    color: 0xd7fff8,
    emissive: 0x51e7dc,
    emissiveIntensity: 0.42,
    roughness: 0.34,
    metalness: 0.12,
  }),
  source: new THREE.MeshStandardMaterial({
    color: 0xffc64b,
    emissive: 0xffa726,
    emissiveIntensity: 1.5,
    roughness: 0.28,
  }),
  target: new THREE.MeshStandardMaterial({
    color: 0xff5ac4,
    emissive: 0xff2ca5,
    emissiveIntensity: 1.85,
    roughness: 0.25,
  }),
  targetBase: new THREE.MeshStandardMaterial({
    color: 0x7d6944,
    emissive: 0x19100a,
    emissiveIntensity: 0.18,
    roughness: 0.42,
    metalness: 0.36,
  }),
  targetGlass: new THREE.MeshStandardMaterial({
    color: 0xff5ac4,
    emissive: 0xff2ca5,
    emissiveIntensity: 1.35,
    roughness: 0.18,
    metalness: 0.04,
    transparent: true,
    opacity: 0.92,
  }),
  targetSlot: new THREE.MeshStandardMaterial({
    color: 0x190912,
    emissive: 0x4a1131,
    emissiveIntensity: 0.35,
    roughness: 0.5,
  }),
  halo: new THREE.MeshBasicMaterial({
    color: 0xff4fb7,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
  cue: new THREE.MeshStandardMaterial({
    color: 0x8b5a2f,
    emissive: 0x201007,
    roughness: 0.32,
    metalness: 0.08,
  }),
  cueTip: new THREE.MeshStandardMaterial({
    color: 0x2ee9f0,
    emissive: 0x1eb8d0,
    emissiveIntensity: 1.1,
    roughness: 0.22,
  }),
};

initScene();
const impactSystem = createImpactSystem({ group: world.burstGroup, quality: getVisualQualityTier() });
installEvents();
startChallenge(0, { resetScore: true, silent: true });
setupXR();
syncSettingsUI();
updateTitleUI();
addLog("Run initialized");
resize();
renderer.setAnimationLoop(animate);

function initScene() {
  scene.add(cameraRig, world.playfieldRoot);
  scene.add(new THREE.HemisphereLight(0xbdf8ff, 0x180814, 1.6));

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(-1.8, 3.5, 1.2);
  scene.add(key);

  const rim = new THREE.PointLight(0xff4fb7, 3.4, 5.8);
  rim.position.set(1.3, 0.55, -0.8);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 8, 1, 1),
    new THREE.MeshBasicMaterial({ color: 0x050607 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.08;
  world.environmentFloor = floor;
  scene.add(floor);

  buildStarfield();
  buildTableMesh();
  buildCue();
  buildAimObjects();
  world.playfieldRoot.add(
    world.boundaryGroup,
    world.targetGroup,
    world.cueGroup,
    world.shotGroup,
    world.burstGroup
  );
}

function buildStarfield() {
  const count = 220;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const color = new THREE.Color();
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (hash(i * 1.7) - 0.5) * 9;
    positions[i * 3 + 1] = 0.8 + hash(i * 2.3) * 3.5;
    positions[i * 3 + 2] = -3.8 + hash(i * 4.1) * 7.6;
    color.setHSL(0.48 + hash(i) * 0.38, 0.7, 0.45 + hash(i * 8.8) * 0.35);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const material = new THREE.PointsMaterial({
    size: 0.018,
    vertexColors: true,
    transparent: true,
    opacity: 0.76,
  });
  world.starfield = new THREE.Points(geometry, material);
  world.starfield.userData.baseOpacity = material.opacity;
  scene.add(world.starfield);
}

function buildTableMesh() {
  const positions = [];
  const indices = [];

  for (let z = 0; z <= GRID_Z; z += 1) {
    for (let x = 0; x <= GRID_X; x += 1) {
      const px = lerp(-TABLE_HALF_X, TABLE_HALF_X, x / GRID_X);
      const pz = lerp(-TABLE_HALF_Z, TABLE_HALF_Z, z / GRID_Z);
      positions.push(px, -0.03, pz);
    }
  }

  for (let z = 0; z < GRID_Z; z += 1) {
    for (let x = 0; x < GRID_X; x += 1) {
      const a = z * (GRID_X + 1) + x;
      const b = a + 1;
      const c = a + GRID_X + 1;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(indices);
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();

  world.tableMesh = new THREE.Mesh(geometry, materials.table);
  world.tableMesh.receiveShadow = true;
  world.playfieldRoot.add(world.tableMesh);
}

function buildBoundary() {
  disposeGroup(world.boundaryGroup);
  const points = boundaryPoints(state.geometry);
  for (let i = 0; i < points.length; i += 1) {
    const a = toWorld3(points[i], 0.065);
    const b = toWorld3(points[(i + 1) % points.length], 0.065);
    const segment = cylinderBetween(a, b, 0.013, materials.wall);
    world.boundaryGroup.add(segment);
  }
}

function buildTargets() {
  disposeInteractiveSource();
  disposeGroup(world.targetGroup);

  const sourceGroup = new THREE.Group();
  world.sourceGroup = sourceGroup;
  world.sourceBall = new THREE.Mesh(new THREE.SphereGeometry(0.055, 24, 16), materials.source);
  world.sourceHalo = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 16), cloneHalo(0xffc64b, 0.16));
  sourceGroup.add(world.sourceHalo, world.sourceBall);
  world.targetGroup.add(sourceGroup);
  mountInteractiveSourceBall(sourceGroup);

  for (const target of state.targets) {
    const fixture = buildTargetLight(target);
    target.group = fixture.group;
    target.sphere = fixture.lens;
    target.lens = fixture.lens;
    target.halo = fixture.halo;
    target.base = fixture.base;
    target.rim = fixture.rim;
    target.slot = fixture.slot;
    world.targetGroup.add(fixture.group);
  }
  updateTargetObjects(0);
}

function buildTargetLight(target) {
  const group = new THREE.Group();
  const halo = new THREE.Mesh(new THREE.SphereGeometry(0.105, 24, 14), cloneHalo(0xff4fb7, 0.16));
  halo.scale.set(1, 0.42, 1);
  halo.position.y = 0.014;

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.06, 0.022, 22), ownedMaterial(materials.targetBase.clone()));
  base.position.y = -0.032;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.0048, 8, 28), ownedMaterial(materials.targetBase.clone()));
  rim.rotation.x = Math.PI / 2;
  rim.position.y = -0.018;

  const lens = new THREE.Mesh(new THREE.SphereGeometry(0.046, 28, 14), ownedMaterial(materials.targetGlass.clone()));
  lens.scale.set(1, 0.38, 1);
  lens.position.y = -0.002;

  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.071, 0.004, 0.008), ownedMaterial(materials.targetSlot.clone()));
  slot.position.y = 0.018;
  slot.rotation.y = target.phase * TAU;

  group.add(halo, base, rim, lens, slot);
  return { group, halo, base, rim, lens, slot };
}

function buildCue() {
  const cueBody = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.027, 1, 18), materials.cue);
  const cueTip = new THREE.Mesh(new THREE.SphereGeometry(0.026, 18, 12), materials.cueTip);
  const ring = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.022, 0.025, 18),
    new THREE.MeshStandardMaterial({ color: 0xf4f6f4, roughness: 0.2, metalness: 0.5 })
  );
  world.cueGroup.add(cueBody, cueTip, ring);
  world.cueBody = cueBody;
  world.cueTip = cueTip;
  world.cueRing = ring;
}

function buildAimObjects() {
  world.aimLine = new THREE.Line(
    new THREE.BufferGeometry(),
    createTrajectoryMaterial({
      color: 0x66ef9a,
      opacity: 0.95,
      pulseSpeed: 0.34,
      pulseDensity: 4.2,
      pulseStrength: 0.2,
      tailFade: 0.12,
    })
  );
  world.aimLine.renderOrder = 6;
  world.playfieldRoot.add(world.aimLine);

  for (let i = 0; i < 7; i += 1) {
    const line = new THREE.Line(
      new THREE.BufferGeometry(),
      createTrajectoryMaterial({
        color: 0xff4fb7,
        opacity: 0.08,
        pulseSpeed: 0.18 + i * 0.018,
        pulseDensity: 3.2 + i * 0.16,
        pulseStrength: 0.15,
        tailFade: 0.42,
        phaseOffset: i * 0.13,
        confidence: 0.35,
      })
    );
    line.renderOrder = 5;
    world.hazeLines.push(line);
    world.playfieldRoot.add(line);
  }
}

function animate(time, frame) {
  const seconds = time * 0.001;
  updateRoundClock(time);
  updateXR(frame);
  state.visualState = visualStateSystem.update(time);
  updateAtmosphere(time, seconds);
  updateInterfaceMotion();
  updateCamera(seconds);
  updateCue(seconds);
  updateField(time);
  updateAimPath(time);
  updateTargetObjects(time);
  updateInteractiveSourceBall(seconds);
  updateShots(time);
  updateBursts(time);
  impactSystem.update(time);
  visualStateOverlay.render(state.visualState);
  renderer.render(scene, camera);
}

function disturbField(position, strength = 0.5) {
  state.fieldImpulse = Math.max(state.fieldImpulse, clamp(strength, 0, 1.5));
  state.fieldImpactOrigin.set(position.x, position.z);
}

function updateAtmosphere(time, seconds) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const shotActive = state.shots.length > 0;
  state.fieldImpulse *= reducedMotion ? 0.78 : 0.91;
  if (state.fieldImpulse < 0.002) state.fieldImpulse = 0;
  state.releaseFlash *= reducedMotion ? 0.7 : 0.88;

  if (world.starfield) {
    const targetOpacity = state.paused || state.phase === "title" ? 0.5 : shotActive ? 0.84 : state.dragging || state.xrAimActive ? 0.58 : 0.68;
    world.starfield.material.opacity = lerp(world.starfield.material.opacity, targetOpacity, 0.035);
    if (!reducedMotion) {
      world.starfield.rotation.y = Math.sin(seconds * 0.055) * 0.018;
      world.starfield.position.y = Math.sin(seconds * 0.13) * 0.018;
    }
  }

  if (simRoot) {
    simRoot.style.setProperty("--qb-release-flash", state.releaseFlash.toFixed(3));
    simRoot.style.setProperty("--qb-field-impulse", Math.min(state.fieldImpulse, 1).toFixed(3));
  }
}

function updateInterfaceMotion() {
  if (!simRoot) return;
  const activity = state.paused || state.phase === "title"
    ? "suspended"
    : state.shots.length > 0
      ? "kinetic"
      : state.dragging || state.xrAimActive
        ? "aiming"
        : "idle";
  if (activity !== state.interfaceActivity) {
    state.interfaceActivity = activity;
    simRoot.dataset.activity = activity;
  }
  simRoot.style.setProperty("--qb-shot-energy", (state.power / 100).toFixed(3));
}

function currentChallenge() {
  return CHALLENGES[state.challengeIndex] || CHALLENGES[0];
}

function startChallenge(index, options = {}) {
  const nextIndex = clamp(index, 0, CHALLENGES.length - 1);
  const challenge = CHALLENGES[nextIndex];
  state.challengeIndex = nextIndex;
  state.geometry = challenge.geometry;
  state.energy = challenge.energy;
  state.yaw = challenge.yaw;
  state.pitch = challenge.pitch;
  state.power = challenge.power;
  state.shotsTaken = 0;
  state.timeRemaining = challenge.time;
  state.roundStart = state.phase === "playing" ? performance.now() : 0;
  state.lastWarningSecond = null;
  state.roundComplete = false;
  state.runComplete = false;
  state.scarHits = 0;
  state.lastResult = null;
  state.combo = 0;
  state.lastShotReplay = null;
  state.replaying = false;
  state.replayRestoreOverlay = false;
  if (options.resetScore) {
    state.score = 0;
    state.runNewBest = false;
    state.challengeGrades = [];
  }

  syncControlValues();
  clearShots();
  resetTargets();
  buildBoundary();
  buildTargets();
  installSpectrumMarkers();
  updateObjective();
  hideRoundOverlay();
  state.fieldDirty = true;
  sendInteractiveBallEvent(QB_EVENTS.reset);

  if (!options.silent) addLog(`${challenge.name} loaded`);
  updateStaticUI();
}

function updateRoundClock(time) {
  if (state.phase !== "playing" || state.paused || state.roundComplete || state.runComplete || !state.roundStart) return;
  const challenge = currentChallenge();
  state.timeRemaining = Math.max(0, challenge.time - (time - state.roundStart) / 1000);
  const warningSecond = Math.ceil(state.timeRemaining);
  if (warningSecond <= 10 && warningSecond > 0 && warningSecond !== state.lastWarningSecond) {
    state.lastWarningSecond = warningSecond;
    playSfx("warning");
  }
  if (state.timeRemaining <= 0 && state.targets.some((target) => target.active)) {
    completeChallenge(false);
  } else {
    updateStaticUI();
  }
}

function completeChallenge(cleared) {
  if (state.roundComplete) return;
  state.roundComplete = true;
  const challenge = currentChallenge();
  const timeBonus = cleared ? Math.ceil(state.timeRemaining) * 8 : 0;
  const parBonus = cleared ? Math.max(0, challenge.par - state.shotsTaken) * 150 : 0;
  const scarBonus = cleared ? state.scarHits * 120 : 0;
  const clearBonus = cleared ? 500 : 0;
  const totalBonus = timeBonus + parBonus + scarBonus + clearBonus;
  state.score += totalBonus;

  const finalChallenge = state.challengeIndex >= CHALLENGES.length - 1;
  state.runComplete = cleared && finalChallenge;
  const grade = gradeChallenge(cleared, challenge);
  state.challengeGrades[state.challengeIndex] = grade;
  if (cleared) recordChallengeGrade(state.challengeIndex, grade);
  const unlockMessages = updateUnlocks();
  const runGrade = state.runComplete ? gradeRun() : grade;
  const newBest = state.runComplete ? finalizeRunProgress(runGrade) : false;
  state.lastResult = {
    cleared,
    timeBonus,
    parBonus,
    scarBonus,
    clearBonus,
    totalBonus,
    grade,
    runGrade,
    unlockMessages,
    newBest,
  };

  if (cleared) {
    addLog(`${challenge.name} clear +${totalBonus}`);
    playSfx(state.runComplete ? "runClear" : "clear");
    showToast(`${state.runComplete ? "Run" : "Challenge"} Grade ${runGrade}`, "bonus");
  } else {
    addLog(`${challenge.name} failed`);
    playSfx("fail");
    showToast("Time collapse", "bad");
  }
  showRoundOverlay(cleared);
  updateStaticUI();
}

function showRoundOverlay(cleared) {
  const challenge = currentChallenge();
  const result = state.lastResult;
  ui.roundOverlay.classList.remove("hidden");
  ui.roundEyebrow.textContent = state.runComplete ? "Run Complete" : cleared ? "Challenge Clear" : "Time Up";
  ui.roundTitle.textContent = state.runComplete ? "House Run Cleared" : challenge.name;
  ui.roundSummary.textContent = cleared
    ? `${state.shotsTaken} shots, ${formatTime(state.timeRemaining)} left, ${state.scarHits} scar banks.`
    : `${state.targets.filter((target) => target.active).length} lights stayed up.`;
  ui.roundGrade.textContent = result.runGrade || result.grade;
  ui.roundUnlock.textContent = result.unlockMessages.length
    ? result.unlockMessages.join(" ")
    : gradeCopy(result.runGrade || result.grade, cleared);
  ui.roundTimeBonus.textContent = `+${result.timeBonus}`;
  ui.roundParBonus.textContent = `+${result.parBonus + result.scarBonus + result.clearBonus}`;
  ui.roundTotalScore.textContent = String(state.score);
  ui.roundNewBest.textContent = `New best ${state.save.bestScore} saved.`;
  ui.roundNewBest.classList.toggle("hidden", !result.newBest);
  ui.nextRoundButton.textContent = state.runComplete ? "New Run" : cleared ? "Next Challenge" : "Retry Challenge";
}

function hideRoundOverlay() {
  ui.roundOverlay.classList.add("hidden");
}

async function beginRun() {
  await unlockAudio();
  state.paused = false;
  ui.titleOverlay.classList.add("hidden");
  ui.pauseOverlay.classList.add("hidden");
  startChallenge(0, { resetScore: true, silent: true });
  addLog("Run started");
  playSfx("start");
  if (!state.save.tutorialSeen) {
    openTutorial({ firstRun: true });
  } else {
    startRoundClock();
  }
  updateStaticUI();
}

async function beginChallengeRun(index) {
  await unlockAudio();
  state.phase = "playing";
  state.paused = false;
  closeChallengeSelect();
  closeInfoOverlay();
  ui.titleOverlay.classList.add("hidden");
  ui.pauseOverlay.classList.add("hidden");
  startChallenge(index, { resetScore: true, silent: true });
  startRoundClock();
  addLog(`${currentChallenge().name} replay`);
  playSfx("start");
  updateStaticUI();
}

function startRoundClock() {
  state.phase = "playing";
  state.paused = false;
  state.roundStart = performance.now();
  state.lastWarningSecond = null;
}

async function openSettingsFromTitle() {
  await unlockAudio();
  state.paused = true;
  ui.pauseOverlay.classList.remove("hidden");
  playSfx("ui");
  updateStaticUI();
}

function setPaused(paused) {
  if (state.phase !== "playing" || state.roundComplete || state.runComplete) return;
  if (paused === state.paused) return;
  state.paused = paused;
  if (paused) {
    state.pauseStarted = performance.now();
    ui.pauseOverlay.classList.remove("hidden");
    playSfx("ui");
  } else {
    const elapsed = performance.now() - state.pauseStarted;
    if (state.roundStart) state.roundStart += elapsed;
    state.pauseStarted = 0;
    ui.pauseOverlay.classList.add("hidden");
    playSfx("resume");
  }
  updateStaticUI();
}

function newRunFromMenu() {
  ui.pauseOverlay.classList.add("hidden");
  state.phase = "playing";
  state.paused = false;
  startChallenge(0, { resetScore: true, silent: true });
  startRoundClock();
  addLog("New run");
  playSfx("start");
  updateStaticUI();
}

function openTutorial(options = {}) {
  state.phase = options.firstRun ? "tutorial" : state.phase;
  state.paused = options.firstRun ? false : state.paused;
  state.tutorialStep = 0;
  renderTutorialStep(options.firstRun);
}

function renderTutorialStep(firstRun = state.phase === "tutorial") {
  const step = TUTORIAL_STEPS[state.tutorialStep];
  ui.infoOverlay.classList.remove("hidden");
  ui.infoEyebrow.textContent = `Training ${state.tutorialStep + 1} / ${TUTORIAL_STEPS.length}`;
  ui.infoTitle.textContent = step.title;
  ui.infoBody.innerHTML = step.body;
  ui.infoPrimaryButton.textContent = state.tutorialStep >= TUTORIAL_STEPS.length - 1 ? "Start Playing" : "Next";
  ui.infoSecondaryButton.textContent = firstRun ? "Skip Tutorial" : "Close";
  state.infoMode = firstRun ? "firstRunTutorial" : "tutorial";
}

function openInfoScreen(type) {
  const screen = INFO_SCREENS[type];
  if (!screen) return;
  state.infoMode = type;
  ui.infoOverlay.classList.remove("hidden");
  ui.infoEyebrow.textContent = screen.eyebrow;
  ui.infoTitle.textContent = screen.title;
  ui.infoBody.innerHTML = screen.body;
  ui.infoPrimaryButton.textContent = "Close";
  ui.infoSecondaryButton.textContent = type === "controls" ? "Tutorial" : "Controls";
}

function continueInfo() {
  if (state.infoMode === "firstRunTutorial" || state.infoMode === "tutorial") {
    if (state.tutorialStep < TUTORIAL_STEPS.length - 1) {
      state.tutorialStep += 1;
      renderTutorialStep(state.infoMode === "firstRunTutorial");
      playSfx("ui");
      return;
    }
    finishTutorial();
    return;
  }
  closeInfoOverlay();
}

function secondaryInfoAction() {
  if (state.infoMode === "firstRunTutorial" || state.infoMode === "tutorial") {
    finishTutorial();
    return;
  }
  openInfoScreen(state.infoMode === "controls" ? "credits" : "controls");
}

function finishTutorial() {
  const wasFirstRun = state.infoMode === "firstRunTutorial";
  state.save.tutorialSeen = true;
  writeSave();
  closeInfoOverlay();
  if (wasFirstRun) startRoundClock();
  playSfx("resume");
  updateStaticUI();
}

function closeInfoOverlay() {
  ui.infoOverlay.classList.add("hidden");
  state.infoMode = null;
}

function openChallengeSelect() {
  renderChallengeSelect();
  ui.challengeOverlay.classList.remove("hidden");
  playSfx("ui");
}

function closeChallengeSelect() {
  ui.challengeOverlay.classList.add("hidden");
}

function renderChallengeSelect() {
  ui.challengeList.replaceChildren();
  CHALLENGES.forEach((challenge, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "challenge-option";
    button.dataset.challengeIndex = String(index);
    const grade = state.save.challengeBestGrades[index] || "-";
    button.innerHTML = `
      <span class="grade-pill">Best ${grade}</span>
      <strong>${index + 1}. ${challenge.name}</strong>
      <span>${ARENAS[challenge.geometry].label} table / Par ${challenge.par} / ${formatTime(challenge.time)}</span>
      <span>${challenge.objective}</span>
    `;
    ui.challengeList.append(button);
  });
}

function updateObjective() {
  const challenge = currentChallenge();
  ui.objectiveEyebrow.textContent = challenge.lesson || `Challenge ${state.challengeIndex + 1} - ${challenge.name}`;
  ui.objectiveTitle.textContent = challenge.objective;
  ui.objectiveHint.textContent = challenge.hint;
}

function showToast(message, tone = "neutral") {
  ui.shotToast.textContent = message;
  ui.shotToast.className = `shot-toast ${tone}`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => {
    ui.shotToast.classList.add("hidden");
  }, 1150);
}

function syncSettingsUI() {
  ui.musicVolumeSlider.value = String(state.musicVolume);
  ui.sfxVolumeSlider.value = String(state.sfxVolume);
  ui.musicVolumeReadout.textContent = `${state.musicVolume}%`;
  ui.sfxVolumeReadout.textContent = `${state.sfxVolume}%`;
  ui.muteButton.textContent = state.muted ? "Audio Off" : "Audio On";
  applyAudioMix();
}

function setMusicVolume(value) {
  state.musicVolume = clamp(Math.round(Number(value) || 0), 0, 100);
  state.save.audio.musicVolume = state.musicVolume;
  syncSettingsUI();
  writeSave();
}

function setSfxVolume(value) {
  state.sfxVolume = clamp(Math.round(Number(value) || 0), 0, 100);
  state.save.audio.sfxVolume = state.sfxVolume;
  syncSettingsUI();
  writeSave();
  playSfx("ui");
}

async function toggleMute() {
  await unlockAudio();
  state.muted = !state.muted;
  state.save.audio.muted = state.muted;
  syncSettingsUI();
  writeSave();
  playSfx("ui");
}

function syncControlValues() {
  ui.energySlider.value = String(state.energy);
  ui.energyInput.value = String(state.energy);
  ui.angleSlider.value = String(state.yaw);
  ui.pitchSlider.value = String(state.pitch);
  ui.powerSlider.value = String(state.power);
}

function updateCamera(seconds) {
  if (renderer.xr.isPresenting) return;
  cameraRig.position.set(0, 0, 0);
  cameraRig.rotation.set(0, 0, 0);
  const source = ARENAS[state.geometry].source;
  const dir = aimDir();
  const back = { x: source.x - dir.x * 0.52, y: source.y - dir.y * 0.52 };
  const look = { x: source.x + dir.x * 1.3, y: source.y + dir.y * 1.3 };
  const bob = Math.sin(seconds * 1.1) * 0.006;
  const desired = toWorld3(back, 0.39 + state.pitch * 0.004 + bob);
  const shake = cameraKickOffset(seconds);
  desired.z += Math.sin(seconds * 0.7) * 0.012;
  desired.add(shake);
  camera.position.lerp(desired, 0.16);
  camera.lookAt(toWorld3(look, 0.055 + state.pitch * 0.001));
}

function updateCue(seconds) {
  const source = ARENAS[state.geometry].source;
  const dir = aimDir();
  state.cueKick *= 0.86;
  const recoil = state.cueKick * 0.18;
  const tip2 = { x: source.x + dir.x * (0.16 + recoil * 0.45), y: source.y + dir.y * (0.16 + recoil * 0.45) };
  const butt2 = { x: source.x - dir.x * (0.82 + recoil), y: source.y - dir.y * (0.82 + recoil) };
  const tip = toWorld3(tip2, 0.078 + state.pitch * 0.001);
  const butt = toWorld3(butt2, 0.17 + state.pitch * 0.013);
  setCylinderBetween(world.cueBody, butt, tip);
  world.cueTip.position.copy(tip);
  const ringPos = tip.clone().lerp(butt, 0.08);
  world.cueRing.position.copy(ringPos);
  world.cueRing.quaternion.copy(world.cueBody.quaternion);

  const pulse = 1 + Math.sin(seconds * 5.5) * 0.035;
  if (world.sourceBall) {
    world.sourceBall.scale.setScalar(pulse);
    world.sourceHalo.scale.setScalar(1.0 + Math.sin(seconds * 3.3) * 0.08);
  }
}

function updateField(time) {
  const scars = scarStrength();
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);
  updateFieldSurfaceMaterial(materials.table, {
    timeSeconds: time * 0.001,
    energy: state.energy,
    geometry: state.geometry,
    scarStrength: scars.strength,
    scarExact: scars.exact,
    quality: getVisualQualityTier(),
    reducedMotion,
    cameraPosition,
    disturbance: state.fieldImpulse,
    impactOrigin: state.fieldImpactOrigin,
  });
  state.fieldDirty = false;
  state.lastFieldUpdate = time;
}

function updateAimPath(time) {
  const snapshot = state.visualState || visualStateSystem.update(time);
  const path = snapshot.aim.primaryPath;
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  setLinePath(world.aimLine, path, 0.092);
  updateTrajectoryMaterial(world.aimLine.material, {
    color: snapshot.aim.primaryColor,
    opacity: snapshot.aim.primaryOpacity,
    timeSeconds: time * 0.001,
    phaseOffset: snapshot.source.phase,
    confidence: snapshot.source.coherence,
    pulseStrength: snapshot.source.scarLock ? 0.1 : 0.22,
    reducedMotion,
  });

  for (let i = 0; i < world.hazeLines.length; i += 1) {
    const line = world.hazeLines[i];
    const alternative = snapshot.aim.alternatives[i];
    line.visible = Boolean(alternative?.visible);
    if (!alternative?.visible) continue;
    updateTrajectoryMaterial(line.material, {
      color: alternative.color,
      opacity: alternative.opacity,
      timeSeconds: time * 0.001,
      phaseOffset: alternative.phase,
      confidence: alternative.weight,
      pulseStrength: 0.12 + (1 - snapshot.source.coherence) * 0.12,
      reducedMotion,
    });
    setLinePath(line, alternative.points, 0.082);
  }
}

function updateTargetObjects(time) {
  const source = ARENAS[state.geometry].source;
  if (world.sourceGroup) {
    const pos = toWorld3(source, 0.078);
    world.sourceGroup.position.copy(pos);
  } else if (world.sourceBall) {
    world.sourceBall.position.copy(toWorld3(source, 0.078));
    world.sourceHalo.position.copy(toWorld3(source, 0.078));
  }

  for (const target of state.targets) {
    if (!target.group) continue;
    const density = fieldValue(target, time);
    const hum = Math.sin(time * 0.0035 + target.phase * TAU);
    const resolving = target.resolving;
    let collapse = 0;
    if (resolving) {
      collapse = clamp((time - resolving.start) / resolving.duration, 0, 1);
      if (collapse >= 1) target.resolving = null;
    }
    target.group.visible = target.active || Boolean(target.resolving);
    target.group.position.copy(toWorld3(target, 0.067 + density * 0.018 + Math.sin(collapse * Math.PI) * 0.018));
    const settleScale = resolving ? Math.max(0.02, 1 - collapse) : 1;
    target.group.scale.setScalar(settleScale);
    target.group.rotation.y = resolving ? collapse * Math.PI * 0.6 : 0;
    target.halo.scale.set(1 + density * 0.24 + collapse * 0.55, 0.42 + density * 0.1, 1 + density * 0.24 + collapse * 0.55);
    if (target.halo?.material) target.halo.material.opacity = resolving ? (1 - collapse) * 0.35 : 0.18;
    if (target.lens) target.lens.scale.set(1 + density * 0.08, 0.38 + density * 0.08 + hum * 0.012, 1 + density * 0.08);
    if (target.slot) target.slot.rotation.y = target.phase * TAU + hum * 0.06 + collapse * Math.PI;
  }
}

function updateShots(time) {
  for (let i = state.shots.length - 1; i >= 0; i -= 1) {
    const shot = state.shots[i];
    const progress = clamp((time - shot.start) / shot.duration, 0, 1);
    const point = pointAlongShot(shot, progress);
    shot.ball.position.copy(point);
    shot.light.position.copy(point);
    const visible = Math.max(2, Math.floor(progress * shot.path3.length));
    shot.line.geometry.setDrawRange(0, visible);
    shot.ball.scale.setScalar(1 + Math.sin(time * 0.018) * 0.15);
    if (progress >= 1) {
      world.shotGroup.remove(shot.ball, shot.line, shot.light);
      if (shot.trail) world.shotGroup.remove(shot.trail);
      shot.ball.geometry.dispose();
      shot.ball.material.dispose();
      shot.line.geometry.dispose();
      shot.line.material.dispose();
      if (shot.trail) {
        shot.trail.geometry.dispose();
        shot.trail.material.dispose();
      }
      state.shots.splice(i, 1);
      if (shot.isReplay) {
        state.replaying = false;
        if (state.replayRestoreOverlay && state.roundComplete) ui.roundOverlay.classList.remove("hidden");
        state.replayRestoreOverlay = false;
        showToast("Replay complete", "good");
        updateStaticUI();
      }
    } else {
      triggerShotImpacts(shot, progress);
      if (shot.trail) shot.trail.geometry.setDrawRange(0, visible);
    }
  }
}

function updateBursts(time) {
  for (let i = state.bursts.length - 1; i >= 0; i -= 1) {
    const burst = state.bursts[i];
    const progress = (time - burst.start) / (burst.lifespan || 780);
    if (progress >= 1) {
      world.burstGroup.remove(burst.mesh);
      burst.mesh.geometry.dispose();
      burst.mesh.material.dispose();
      state.bursts.splice(i, 1);
      continue;
    }
    burst.mesh.scale.setScalar(1 + progress * (burst.spread || 5.6));
    burst.mesh.material.opacity = (1 - progress) * (burst.fade || 0.75);
  }
}

function fire() {
  if (state.phase !== "playing" || state.paused || state.roundComplete || state.runComplete || state.replaying) return;
  state.shotsTaken += 1;
  state.releaseFlash = 1;
  playSfx("strike");
  sendInteractiveBallEvent(QB_EVENTS.released, { charge: state.power / 100 });
  const snapshot = visualStateSystem.update(performance.now());
  state.visualState = snapshot;
  const path = snapshot.aim.primaryPath;
  const focus = snapshot.focus;
  const scars = snapshot.scars;
  const color = snapshot.aim.primaryColor;
  const path3 = path.map((point) => toWorld3(point, 0.13));
  const duration = 520 + (1 - focus.coherence) * 500 + (100 - state.power) * 4;
  const shot = createShot(path3, color, duration);
  state.lastShotReplay = createReplaySnapshot({
    path3,
    color,
    duration,
    geometry: state.geometry,
    challengeIndex: state.challengeIndex,
    energy: state.energy,
    power: state.power,
  });
  state.shots.push(shot);
  state.cueKick = 1;
  const result = resolveShot(path, focus, scars);
  if (result?.perfect) shot.duration *= 1.28;
}

function createShot(path3, color, duration) {
  const ballMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.95,
    blending: THREE.AdditiveBlending,
  });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.042, 24, 16), ballMaterial);
  const light = new THREE.PointLight(color, 2.2, 1.4);
  const lineMaterial = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(path3), lineMaterial);
  line.geometry.setDrawRange(0, 2);
  let trail = null;
  if (state.save.unlocks.phaseTrail) {
    trail = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(path3),
      new THREE.LineBasicMaterial({
        color: 0xff4fb7,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    trail.geometry.setDrawRange(0, 2);
    world.shotGroup.add(trail);
  }
  world.shotGroup.add(ball, line, light);

  const distances = [0];
  for (let i = 1; i < path3.length; i += 1) {
    distances[i] = distances[i - 1] + path3[i].distanceTo(path3[i - 1]);
  }
  return {
    ball,
    line,
    light,
    trail,
    path3,
    distances,
    total: distances[distances.length - 1] || 1,
    start: performance.now(),
    duration,
    impacts: findShotImpacts(path3, distances),
    nextImpact: 0,
    isReplay: false,
  };
}


function replayLastShot() {
  if (!canReplayShot(state.lastShotReplay, state)) return;
  const snapshot = state.lastShotReplay;
  const path3 = snapshot.path3.map((point) => new THREE.Vector3(point.x, point.y, point.z));
  const overlayWasVisible = !ui.roundOverlay.classList.contains("hidden");
  if (overlayWasVisible) ui.roundOverlay.classList.add("hidden");
  state.replaying = true;
  state.replayRestoreOverlay = overlayWasVisible;
  const shot = createShot(path3, snapshot.color, snapshot.duration * 1.12);
  shot.isReplay = true;
  state.shots.push(shot);
  addLog(`Replay: ${currentChallenge().name}`);
  showToast("Replaying last impulse", "bonus");
  playSfx("ui");
  updateStaticUI();
}


function findShotImpacts(path3, distances) {
  const impacts = [];
  if (path3.length < 5) return impacts;
  const incoming = new THREE.Vector3();
  const outgoing = new THREE.Vector3();
  const normal = new THREE.Vector3();
  for (let i = 2; i < path3.length - 2; i += 1) {
    incoming.copy(path3[i]).sub(path3[i - 2]).normalize();
    outgoing.copy(path3[i + 2]).sub(path3[i]).normalize();
    const alignment = incoming.dot(outgoing);
    if (alignment > 0.985) continue;
    normal.copy(outgoing).sub(incoming).normalize();
    const strength = clamp((1 - alignment) * 1.4, 0.2, 1);
    impacts.push({
      progress: distances[i] / (distances[distances.length - 1] || 1),
      position: path3[i].clone(),
      normal: normal.clone(),
      strength,
      type: alignment > 0.72 ? "graze" : "wall",
    });
    i += 2;
  }
  return impacts;
}

function triggerShotImpacts(shot, progress) {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  while (shot.nextImpact < shot.impacts.length && progress >= shot.impacts[shot.nextImpact].progress) {
    const impact = shot.impacts[shot.nextImpact];
    impactSystem.spawn({ ...impact, reducedMotion });
    disturbField(impact.position, impact.type === "graze" ? impact.strength * 0.32 : impact.strength * 0.72);
    xrTabletop?.pulse(impact.type === "graze" ? 0.16 : 0.28 + impact.strength * 0.18, impact.type === "graze" ? 24 : 38);
    if (impact.type !== "graze") playSfx("wall");
    shot.nextImpact += 1;
  }
}

function resolveShot(path, focus, scars) {
  const arena = ARENAS[state.geometry];
  const scarLock = arena.className !== "Integrable" && scars.exact;
  let best = null;
  for (const target of state.targets) {
    if (!target.active) continue;
    const distance = minDistanceToPath(target, path);
    const density = fieldValue(target, performance.now());
    const lane = scarLock ? 0.17 : arena.className === "Integrable" ? 0.12 : 0.095;
    const aimScore = clamp(1 - distance / lane, 0, 1);
    const densityScore = 0.32 + density * 0.68;
    const powerScore = clamp(state.power / 74, 0.35, 1.25);
    const score = aimScore * densityScore * powerScore * (0.55 + focus.coherence * 0.8);
    if (!best || score > best.score) best = { target, score };
  }

  const threshold = scarLock ? 0.34 : arena.className === "Integrable" ? 0.39 : 0.48;
  if (best && best.score >= threshold) {
    sendInteractiveBallEvent(QB_EVENTS.collision, { impact: best.score });
    if (scarLock) sendInteractiveBallEvent(QB_EVENTS.quantum, { impact: best.score });
    const perfect = best.score >= threshold + (scarLock ? 0.38 : 0.32) && focus.coherence >= 0.68;
    best.target.active = false;
    best.target.resolving = {
      start: performance.now(),
      duration: perfect ? 620 : 460,
      type: perfect ? "perfect" : "target",
    };
    if (scarLock) state.scarHits += 1;
    state.combo += 1;
    const baseScore = Math.round((80 + state.energy * 0.25 + state.power * 0.5 + best.score * 120) * (scarLock ? 2 : 1));
    const comboBonus = Math.max(0, state.combo - 1) * 55;
    const perfectBonus = perfect ? 90 : 0;
    const targetScore = baseScore + comboBonus + perfectBonus;
    state.score += targetScore;
    const hitPosition = toWorld3(best.target, 0.145);
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    impactSystem.spawn({
      position: hitPosition,
      normal: new THREE.Vector3(0, 1, 0),
      type: perfect ? "perfect" : "target",
      strength: 0.85 + best.score * 0.45,
      reducedMotion,
    });
    disturbField(hitPosition, perfect ? 1.35 : 0.82 + best.score * 0.28);
    xrTabletop?.pulse(perfect ? 0.78 : 0.52, perfect ? 95 : 58);
    kickCamera(perfect ? 0.012 : 0.007, perfect ? 230 : 150);
    const comboText = state.combo > 1 ? ` x${state.combo}` : "";
    const shotLabel = perfect ? "Perfect Scar" : scarLock ? "Scar Drop" : "Light Drop";
    addLog(`${shotLabel}${comboText} +${targetScore}`);
    playSfx(scarLock ? "scarTarget" : "target");
    showToast(`${shotLabel}${comboText} +${targetScore}`, perfect || scarLock ? "bonus" : "good");
    sendInteractiveBallEvent(QB_EVENTS.collapse);
    if (state.targets.every((target) => !target.active)) {
      sendInteractiveBallEvent(QB_EVENTS.pocketed);
      completeChallenge(true);
    }
    updateStaticUI();
    return { hit: true, perfect, combo: state.combo };
  } else {
    sendInteractiveBallEvent(QB_EVENTS.collision, { impact: 0.16 });
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    impactSystem.spawn({
      position: toWorld3(ARENAS[state.geometry].source, 0.145),
      normal: new THREE.Vector3(0, 1, 0),
      type: "miss",
      strength: 0.65,
      reducedMotion,
    });
    disturbField(toWorld3(ARENAS[state.geometry].source, 0.145), 0.28);
    xrTabletop?.pulse(0.2, 34);
    kickCamera(0.005, 110);
    state.combo = 0;
    const missText = scars.distance <= 2 && !scars.exact ? `Scar missed by ${scars.distance}` : "Line scattered";
    addLog(missText);
    playSfx("miss");
    showToast(missText, "bad");
  }
  updateStaticUI();
  return { hit: false, perfect: false, combo: 0 };
}

function addBurst(point, good) {
  const material = new THREE.MeshBasicMaterial({
    color: good ? 0x66ef9a : 0xff6a5f,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(0.065, 0.083, 54), material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.copy(toWorld3(point, 0.145));
  world.burstGroup.add(mesh);
  state.bursts.push({ mesh, start: performance.now() });
}

function addHitSparks(point, type = "hit", strength = 1) {
  const color = type === "miss" ? 0xff6a5f : type === "perfect" ? 0xfff2a0 : 0x66ef9a;
  const count = type === "miss" ? 7 : type === "perfect" ? 12 : 9;
  const spread = type === "perfect" ? 0.14 : 0.105;
  const positions = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + (type === "miss" ? 0.2 : 0);
    const jitter = 0.82 + hash(i * 1.73 + state.energy * 0.013) * 0.32;
    const inner = toWorld3(
      {
        x: point.x + Math.cos(angle) * 0.026,
        y: point.y + Math.sin(angle) * 0.026,
      },
      0.15
    );
    const outer = toWorld3(
      {
        x: point.x + Math.cos(angle) * spread * strength * jitter,
        y: point.y + Math.sin(angle) * spread * strength * jitter,
      },
      0.15 + (i % 3) * 0.006
    );
    positions.push(inner.x, inner.y, inner.z, outer.x, outer.y, outer.z);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: type === "miss" ? 0.62 : 0.82,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const sparks = new THREE.LineSegments(geometry, material);
  world.burstGroup.add(sparks);
  state.bursts.push({ mesh: sparks, start: performance.now(), lifespan: type === "perfect" ? 620 : 420, fade: 1.1 });
}

function tracePath(yawDeg, geometry = state.geometry, options = {}) {
  const arena = ARENAS[geometry];
  const direction = {
    x: Math.cos((yawDeg * Math.PI) / 180),
    y: Math.sin((yawDeg * Math.PI) / 180),
  };
  let p = { ...arena.source };
  let d = normalize(direction);
  const step = 0.012;
  const maxSteps = Math.round(210 + clamp(options.power ?? state.power, 18, 100) * 7.6);
  const points = [{ ...p }];
  let bounces = 0;

  for (let i = 0; i < maxSteps; i += 1) {
    const next = { x: p.x + d.x * step, y: p.y + d.y * step };
    if (inside(next, geometry)) {
      p = next;
      if (i % 2 === 0) points.push({ ...p });
      continue;
    }

    const n = normalAt(p, geometry);
    d = normalize({ x: d.x - 2 * dot(d, n) * n.x, y: d.y - 2 * dot(d, n) * n.y });
    p = { x: p.x + n.x * 0.018, y: p.y + n.y * 0.018 };
    points.push({ ...p });
    bounces += 1;
    if (bounces > 9) break;
  }
  return points;
}

function setGeometry(geometry) {
  if (!ARENAS[geometry]) return;
  const challengeIndex = Math.max(0, CHALLENGES.findIndex((challenge) => challenge.geometry === geometry));
  startChallenge(challengeIndex, { resetScore: false });
}

function setEnergy(value) {
  state.energy = clamp(Math.round(Number(value) || 1), 1, 500);
  ui.energySlider.value = String(state.energy);
  ui.energyInput.value = String(state.energy);
  state.fieldDirty = true;
  updateStaticUI();
}

function setYaw(value) {
  state.yaw = clamp(Math.round(Number(value) || 0), -38, 38);
  ui.angleSlider.value = String(state.yaw);
  updateStaticUI();
}

function setPitch(value) {
  state.pitch = clamp(Math.round(Number(value) || 0), -3, 18);
  ui.pitchSlider.value = String(state.pitch);
  updateStaticUI();
}

function setPower(value) {
  state.power = clamp(Math.round(Number(value) || 18), 18, 100);
  ui.powerSlider.value = String(state.power);
  sendInteractiveBallEvent(QB_EVENTS.charge, { charge: state.power / 100 });
  updateStaticUI();
}

function resetTargets() {
  const arenaTargets = ARENAS[state.geometry].targets;
  const indices = currentChallenge().targetIndices || arenaTargets.map((_, index) => index);
  state.targets = indices.map((arenaIndex, orderIndex) => {
    const target = arenaTargets[arenaIndex];
    return {
      ...target,
      id: `${state.geometry}-${arenaIndex}`,
      arenaIndex,
      active: true,
      radius: 0.055,
      phase: hash(orderIndex + state.energy * 0.01),
    };
  });
}

function clearShots() {
  for (const shot of state.shots) {
    world.shotGroup.remove(shot.ball, shot.line, shot.light);
    if (shot.trail) world.shotGroup.remove(shot.trail);
    shot.ball.geometry.dispose();
    shot.ball.material.dispose();
    shot.line.geometry.dispose();
    shot.line.material.dispose();
    if (shot.trail) {
      shot.trail.geometry.dispose();
      shot.trail.material.dispose();
    }
  }
  state.shots = [];
  for (const burst of state.bursts) {
    world.burstGroup.remove(burst.mesh);
    burst.mesh.geometry.dispose();
    burst.mesh.material.dispose();
  }
  state.bursts = [];
  impactSystem?.clear();
}

function updateStaticUI() {
  const arena = ARENAS[state.geometry];
  const challenge = currentChallenge();
  const replayAvailable = canReplayShot(state.lastShotReplay, state);
  if (ui.replayShotButton) ui.replayShotButton.disabled = !replayAvailable;
  if (ui.roundReplayButton) ui.roundReplayButton.disabled = !replayAvailable;
  const scars = scarStrength();
  const scarLock = arena.className !== "Integrable" && scars.exact;
  const focus = computeFocus();
  const remaining = state.targets.filter((target) => target.active).length;
  ui.challengeLabel.textContent = `${state.challengeIndex + 1} / ${CHALLENGES.length}`;
  ui.geometryLabel.textContent = arena.label;
  ui.energyReadout.textContent = `n=${state.energy}`;
  ui.angleReadout.textContent = `${state.yaw} deg`;
  ui.pitchReadout.textContent = `${state.pitch} deg`;
  ui.powerReadout.textContent = `${state.power}%`;
  ui.scarStatus.textContent = scarLock ? "Scar Lock" : arena.className === "Integrable" ? "Coherent" : "Dispersive";
  ui.targetStatus.textContent = `${remaining} / ${state.targets.length}`;
  ui.scoreReadout.textContent = String(state.score);
  ui.timerReadout.textContent = formatTime(state.timeRemaining);
  ui.shotsReadout.textContent = `${state.shotsTaken} / ${challenge.par}`;
  ui.bonusReadout.textContent =
    state.combo > 1 ? `x${state.combo} chain` : scarLock ? "x2.0" : state.shotsTaken <= challenge.par ? "Par" : "Base";
  ui.coherenceReadout.textContent = `${Math.round(focus.coherence * 100)}%`;
  ui.epsilonReadout.textContent = focus.epsilon.toFixed(3);
  ui.modeReadout.textContent = arena.className;
  ui.focusReadout.textContent = focus.label;
  ui.focusMeter.style.width = `${Math.round(focus.coherence * 100)}%`;
  ui.spectrumBar.style.setProperty("--energy-pos", `${((state.energy - 1) / 499) * 100}%`);
  ui.pauseButton.textContent = state.paused ? "Resume" : "Pause";
  ui.pauseButton.disabled = state.phase !== "playing" || state.roundComplete || state.runComplete;
  ui.muteButton.textContent = state.muted ? "Audio Off" : "Audio On";

  [...ui.geometryControls.querySelectorAll("button")].forEach((button) => {
    button.classList.toggle("active", button.dataset.geometry === state.geometry);
  });
  updateTitleUI();
}

function computeFocus() {
  const arena = ARENAS[state.geometry];
  const scars = scarStrength();
  const energyPressure = state.energy / 500;
  const powerPressure = Math.max(0, (state.power - 76) / 42);
  const scarLock = arena.className !== "Integrable" && scars.exact;
  let coherence = 0.9 - energyPressure * 0.12 - powerPressure * 0.09;
  if (arena.className === "Chaotic") coherence = 0.38 - energyPressure * 0.08 + scars.strength * 0.58 - powerPressure * 0.08;
  if (arena.className === "Pseudointegrable") coherence = 0.48 - energyPressure * 0.11 + scars.strength * 0.46 - powerPressure * 0.07;
  if (arena.className === "Integrable") coherence += scars.strength * 0.08;
  coherence = clamp(coherence, 0.12, 0.99);
  const epsilon = clamp(0.002 + energyPressure * energyPressure * 0.04 + (1 - coherence) * 0.018, 0.002, 0.08);
  const label = scarLock ? "Scar locked" : arena.className === "Integrable" && scars.exact ? "Resonant" : coherence > 0.72 ? "Stable" : coherence > 0.48 ? "Turbulent" : "Diffuse";
  return { coherence, epsilon, label };
}

function nearestScar(geometry = state.geometry, energy = state.energy) {
  const list = SCAR_STATES[geometry];
  let best = list[0];
  let dist = Math.abs(energy - best);
  for (const candidate of list) {
    const next = Math.abs(energy - candidate);
    if (next < dist) {
      best = candidate;
      dist = next;
    }
  }
  return { value: best, distance: dist };
}

function scarStrength(geometry = state.geometry, energy = state.energy) {
  const nearest = nearestScar(geometry, energy);
  const falloff = geometry === "circle" || geometry === "triangle" ? 9 : 5;
  return {
    exact: nearest.distance === 0,
    strength: clamp(1 - nearest.distance / falloff, 0, 1),
    nearest: nearest.value,
    distance: nearest.distance,
  };
}

function fieldValue(p, time, geometry = state.geometry, energy = state.energy) {
  const fade = clamp(signedDistance(p, geometry) / 0.16, 0, 1);
  if (fade <= 0) return 0;

  const k = 3.1 + energy * 0.105;
  const scars = scarStrength(geometry, energy);
  const t = time * 0.00045;
  let psi = 0;

  if (geometry === "circle") {
    const r = Math.hypot(p.x, p.y) / 0.84;
    const a = Math.atan2(p.y, p.x);
    const m = 2 + (energy % 9);
    const radial = 1 + Math.floor(energy / 34) % 8;
    psi =
      Math.sin(radial * Math.PI * (1 - r) + t * 2.2) * Math.cos(m * a - t * 1.4) +
      0.42 * Math.sin((radial + 2) * Math.PI * (1 - r * r) - t) * Math.cos((m + 3) * a + t * 0.8);
  } else if (geometry === "triangle") {
    const k2 = k * 0.58;
    psi =
      Math.sin(k2 * (p.x + 0.22 * p.y) + t * 2.0) +
      Math.sin(k2 * (-0.5 * p.x + 0.866 * p.y) - t * 1.4) +
      Math.sin(k2 * (-0.5 * p.x - 0.866 * p.y) + t * 0.9);
    psi += 0.36 * Math.sin(k2 * 1.7 * p.x - t * 1.6) * Math.sin(k2 * 1.1 * p.y + t);
  } else {
    const waves = geometry === "stadium" ? 9 : 12;
    for (let i = 0; i < waves; i += 1) {
      const angle = hash(energy * 0.71 + i * 13.31 + (geometry === "star" ? 5 : 0)) * TAU;
      const speed = 0.35 + hash(i * 2.9 + energy) * 0.95;
      const offset = hash(energy * 1.13 + i * 5.7) * TAU;
      psi += Math.sin(k * (Math.cos(angle) * p.x + Math.sin(angle) * p.y) + offset + t * speed);
    }
    psi /= Math.sqrt(waves);
    const scar = scarPathValue(p, geometry, energy, time);
    psi = lerp(psi, scar.wave * 2.4 + psi * 0.22, scars.strength);
  }

  return clamp((psi * psi) * 0.26, 0, 1) * fade;
}

function scarPathValue(p, geometry, energy, time) {
  const scars = scarStrength(geometry, energy);
  if (scars.strength <= 0.001) return { wave: 0, distance: 1 };

  const paths = geometry === "stadium" ? stadiumScarPaths() : starScarPaths();
  let bestDistance = Infinity;
  let phaseDistance = 0;
  for (const path of paths) {
    for (let i = 0; i < path.length - 1; i += 1) {
      const d = distanceToSegment(p, path[i], path[i + 1]);
      if (d < bestDistance) {
        bestDistance = d;
        phaseDistance = i + d * 8;
      }
    }
  }

  const width = geometry === "stadium" ? 0.052 : 0.043;
  const lane = Math.exp(-(bestDistance * bestDistance) / (width * width));
  const phase = Math.sin(energy * 0.15 + phaseDistance * 1.9 - time * 0.003);
  return { wave: lane * phase, distance: bestDistance };
}

function fieldColor(color, value, p, time, insideDomain) {
  if (!insideDomain) {
    color.setRGB(0.006, 0.007, 0.009);
    return;
  }
  const v = clamp(value, 0, 1);
  const heat = v * v;
  const phase = (p.x - p.y) * 1.8 + time * 0.0008;
  const shimmer = (Math.sin(phase * 1.7) + Math.cos(phase * 0.8)) * 0.5;
  color.setRGB(
    clamp((4 + 34 * v + 210 * heat + 46 * heat * shimmer) / 255, 0, 1),
    clamp((5 + 165 * Math.pow(v, 0.7) + 72 * Math.pow(v, 3)) / 255, 0, 1),
    clamp((8 + 215 * Math.sqrt(v) + 34 * heat * Math.cos(phase)) / 255, 0, 1)
  );
}

function signedDistance(p, geometry = state.geometry) {
  if (geometry === "circle") return 0.84 - Math.hypot(p.x, p.y);
  if (geometry === "triangle") return polygonSignedDistance(p, trianglePoly);
  if (geometry === "star") return polygonSignedDistance(p, starPoly);

  const a = 0.55;
  const r = 0.58;
  const px = Math.abs(p.x);
  const outside = px > a ? Math.hypot(px - a, p.y) - r : Math.abs(p.y) - r;
  return -outside;
}

function inside(p, geometry = state.geometry) {
  return signedDistance(p, geometry) >= 0;
}

function normalAt(p, geometry = state.geometry) {
  const e = 0.0025;
  const dx = signedDistance({ x: p.x + e, y: p.y }, geometry) - signedDistance({ x: p.x - e, y: p.y }, geometry);
  const dy = signedDistance({ x: p.x, y: p.y + e }, geometry) - signedDistance({ x: p.x, y: p.y - e }, geometry);
  return normalize({ x: dx, y: dy });
}

function boundaryPoints(geometry) {
  if (geometry === "circle") {
    return Array.from({ length: 96 }, (_, i) => {
      const a = (i / 96) * TAU;
      return { x: Math.cos(a) * 0.84, y: Math.sin(a) * 0.84 };
    });
  }
  if (geometry === "triangle") return trianglePoly;
  if (geometry === "star") return starPoly;

  const points = [];
  const a = 0.55;
  const r = 0.58;
  for (let i = 0; i <= 22; i += 1) {
    const t = i / 22;
    points.push({ x: lerp(-a, a, t), y: -r });
  }
  for (let i = 1; i <= 32; i += 1) {
    const theta = -Math.PI / 2 + (i / 32) * Math.PI;
    points.push({ x: a + Math.cos(theta) * r, y: Math.sin(theta) * r });
  }
  for (let i = 1; i <= 22; i += 1) {
    const t = i / 22;
    points.push({ x: lerp(a, -a, t), y: r });
  }
  for (let i = 1; i <= 32; i += 1) {
    const theta = Math.PI / 2 + (i / 32) * Math.PI;
    points.push({ x: -a + Math.cos(theta) * r, y: Math.sin(theta) * r });
  }
  return points;
}

function stadiumScarPaths() {
  return [
    [
      { x: -0.94, y: 0 },
      { x: -0.28, y: -0.52 },
      { x: 0.46, y: 0.52 },
      { x: 0.94, y: 0 },
      { x: 0.46, y: -0.52 },
      { x: -0.28, y: 0.52 },
      { x: -0.94, y: 0 },
    ],
    [
      { x: -0.52, y: -0.55 },
      { x: 0.52, y: 0.55 },
    ],
  ];
}

function starScarPaths() {
  return [
    [
      { x: 0, y: -0.82 },
      { x: 0.39, y: 0.22 },
      { x: -0.74, y: -0.02 },
      { x: 0.39, y: -0.22 },
      { x: 0, y: 0.82 },
      { x: -0.39, y: -0.22 },
      { x: 0.74, y: 0.02 },
      { x: -0.39, y: 0.22 },
      { x: 0, y: -0.82 },
    ],
  ];
}

function loadSave() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneSave(DEFAULT_SAVE);
    const saved = JSON.parse(raw);
    return {
      bestScore: Number(saved.bestScore) || 0,
      bestGrade: saved.bestGrade || "-",
      runs: Number(saved.runs) || 0,
      tutorialSeen: Boolean(saved.tutorialSeen),
      challengeBestGrades: Array.isArray(saved.challengeBestGrades) ? saved.challengeBestGrades : [],
      unlocks: {
        phaseTrail: Boolean(saved.unlocks?.phaseTrail),
        voidRails: Boolean(saved.unlocks?.voidRails),
      },
      audio: {
        muted: Boolean(saved.audio?.muted),
        musicVolume: clamp(Number(saved.audio?.musicVolume ?? DEFAULT_SAVE.audio.musicVolume), 0, 100),
        sfxVolume: clamp(Number(saved.audio?.sfxVolume ?? DEFAULT_SAVE.audio.sfxVolume), 0, 100),
      },
    };
  } catch {
    return cloneSave(DEFAULT_SAVE);
  }
}

function cloneSave(save) {
  return {
    bestScore: save.bestScore,
    bestGrade: save.bestGrade,
    runs: save.runs,
    tutorialSeen: save.tutorialSeen,
    challengeBestGrades: [...save.challengeBestGrades],
    unlocks: { ...save.unlocks },
    audio: { ...save.audio },
  };
}

function writeSave() {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.save));
  } catch {
    // Private browsing or embedded portals can reject storage; gameplay should continue.
  }
  updateTitleUI();
}

function updateTitleUI() {
  ui.titleBestScore.textContent = String(state.save.bestScore);
  ui.titleBestGrade.textContent = state.save.bestGrade;
  ui.titleRunCount.textContent = String(state.save.runs);
  ui.phaseTrailUnlock.textContent = state.save.unlocks.phaseTrail ? "Ghost Chalk unlocked" : "Ghost Chalk at 1,600";
  ui.voidRailsUnlock.textContent = state.save.unlocks.voidRails ? "Black Rail unlocked" : "Black Rail on clear";
  ui.phaseTrailUnlock.classList.toggle("unlocked", state.save.unlocks.phaseTrail);
  ui.voidRailsUnlock.classList.toggle("unlocked", state.save.unlocks.voidRails);
  if (!ui.challengeOverlay.classList.contains("hidden")) renderChallengeSelect();
}

function gradeChallenge(cleared, challenge) {
  if (!cleared) return "F";
  let points = 0;
  if (state.shotsTaken <= challenge.par) points += 2;
  if (state.shotsTaken < challenge.par) points += 1;
  if (state.timeRemaining >= challenge.time * 0.45) points += 1;
  if (state.timeRemaining >= challenge.time * 0.68) points += 1;
  if (state.scarHits >= 1) points += 1;
  if (state.scarHits >= 3) points += 1;
  if (points >= 6) return "S";
  if (points >= 5) return "A";
  if (points >= 3) return "B";
  if (points >= 2) return "C";
  return "D";
}

function gradeRun() {
  if (!state.challengeGrades.length) return "-";
  const average =
    state.challengeGrades.reduce((sum, grade) => sum + Math.max(0, GRADE_VALUE[grade] ?? 0), 0) /
    CHALLENGES.length;
  if (average >= 4.75) return "S";
  if (average >= 4.0) return "A";
  if (average >= 3.0) return "B";
  if (average >= 2.0) return "C";
  return "D";
}

function gradeCopy(grade, cleared) {
  if (!cleared) return "Rack it again. The table kept a few lights.";
  if (grade === "S") return "The house heard that bank.";
  if (grade === "A") return "Clean table. Trim a shot for S rank.";
  if (grade === "B") return "Good clear. Scar banks will lift the grade.";
  return "Clear banked. Replay for faster routes.";
}

function recordChallengeGrade(index, grade) {
  const previous = state.save.challengeBestGrades[index] || "-";
  if ((GRADE_VALUE[grade] ?? -1) <= (GRADE_VALUE[previous] ?? -1)) return;
  state.save.challengeBestGrades[index] = grade;
  writeSave();
}

function updateUnlocks() {
  const messages = [];
  if (!state.save.unlocks.phaseTrail && state.score >= 1600) {
    state.save.unlocks.phaseTrail = true;
    messages.push("Ghost Chalk unlocked.");
  }
  if (!state.save.unlocks.voidRails && state.runComplete) {
    state.save.unlocks.voidRails = true;
    messages.push("Black Rail unlocked.");
  }
  if (messages.length) writeSave();
  return messages;
}

function finalizeRunProgress(runGrade) {
  state.save.runs += 1;
  let newBest = false;
  if (state.score > state.save.bestScore) {
    state.save.bestScore = state.score;
    newBest = true;
  }
  if ((GRADE_VALUE[runGrade] ?? -1) > (GRADE_VALUE[state.save.bestGrade] ?? -1)) {
    state.save.bestGrade = runGrade;
    newBest = true;
  }
  state.runNewBest = newBest;
  writeSave();
  return newBest;
}

async function unlockAudio() {
  if (!audio.context) {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audio.context = new AudioCtor();
    audio.master = audio.context.createGain();
    audio.musicGain = audio.context.createGain();
    audio.sfxGain = audio.context.createGain();
    audio.musicGain.connect(audio.master);
    audio.sfxGain.connect(audio.master);
    audio.master.connect(audio.context.destination);
    applyAudioMix();
  }
  if (audio.context.state === "suspended") {
    await audio.context.resume();
  }
  startMusicLoop();
}

function applyAudioMix() {
  if (!audio.master) return;
  const now = audio.context.currentTime;
  audio.master.gain.setTargetAtTime(state.muted ? 0 : 1, now, 0.025);
  audio.musicGain.gain.setTargetAtTime((state.musicVolume / 100) * 0.18, now, 0.04);
  audio.sfxGain.gain.setTargetAtTime((state.sfxVolume / 100) * 0.55, now, 0.02);
}

function startMusicLoop() {
  if (audio.musicTimer || !audio.context) return;
  audio.musicTimer = window.setInterval(playMusicStep, 360);
  playMusicStep();
}

function playMusicStep() {
  if (!audio.context || state.muted || state.musicVolume <= 0) return;
  const notes = [0, 7, 10, 14, 12, 7, 3, 5, 0, 7, 15, 14, 10, 5, 3, -2];
  const step = audio.musicStep % notes.length;
  const base = state.save.unlocks.voidRails ? 92 : 110;
  const freq = base * 2 ** (notes[step] / 12);
  audio.musicStep += 1;
  tone(freq, 0.28, step % 4 === 0 ? "triangle" : "sine", 0.42, audio.musicGain);
  if (step % 4 === 0) tone(freq * 0.5, 0.46, "sine", 0.22, audio.musicGain);
}

function playSfx(type) {
  if (!audio.context || state.muted || state.sfxVolume <= 0) return;
  if (audio.context.state === "suspended") return;
  const target = audio.sfxGain;
  if (type === "strike") {
    tone(130, 0.08, "sawtooth", 0.5, target, -240);
  } else if (type === "wall") {
    tone(260, 0.045, "triangle", 0.12, target, 180);
    tone(410, 0.035, "sine", 0.08, target, -80);
  } else if (type === "target") {
    tone(520, 0.12, "triangle", 0.42, target, 420);
    tone(780, 0.16, "sine", 0.28, target, 120);
  } else if (type === "scarTarget") {
    tone(430, 0.12, "triangle", 0.38, target, 620);
    tone(1030, 0.2, "sine", 0.24, target, -80);
  } else if (type === "miss") {
    tone(150, 0.16, "sine", 0.34, target, -520);
  } else if (type === "clear") {
    tone(540, 0.12, "triangle", 0.3, target, 0);
    setTimeout(() => tone(810, 0.16, "triangle", 0.3, target, 0), 70);
  } else if (type === "runClear") {
    [420, 630, 840, 1260].forEach((freq, index) => {
      setTimeout(() => tone(freq, 0.18, "triangle", 0.34, target, 0), index * 85);
    });
  } else if (type === "fail") {
    tone(180, 0.24, "sawtooth", 0.22, target, -620);
  } else if (type === "warning") {
    tone(760, 0.055, "square", 0.12, target, 0);
  } else if (type === "resume") {
    tone(440, 0.08, "sine", 0.2, target, 80);
  } else if (type === "start") {
    [220, 330, 495].forEach((freq, index) => {
      setTimeout(() => tone(freq, 0.14, "triangle", 0.26, target, 0), index * 70);
    });
  } else {
    tone(360, 0.06, "sine", 0.16, target, 0);
  }
}

function tone(freq, duration, type, volume, destination, detune = 0) {
  if (!audio.context || !destination) return;
  const now = audio.context.currentTime;
  const osc = audio.context.createOscillator();
  const gain = audio.context.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, now);
  osc.detune.setValueAtTime(detune, now);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), now + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.connect(gain);
  gain.connect(destination);
  osc.start(now);
  osc.stop(now + duration + 0.04);
}

let xrTabletop = null;

function setXREnvironmentMode(mode) {
  const isAR = mode === "ar";
  renderer.setClearColor(0x050607, isAR ? 0 : 1);
  scene.fog = isAR ? null : desktopFog;
  if (world.environmentFloor) world.environmentFloor.visible = !isAR;
  if (world.starfield) world.starfield.visible = !isAR;
}

async function setupXR() {
  xrTabletop = createXRTabletopMode({
    renderer,
    scene,
    playfieldRoot: world.playfieldRoot,
    getSource: () => ARENAS[state.geometry].source,
    onAim: (yaw) => setYaw(yaw),
    onFire: () => fire(),
    onEnvironmentMode: setXREnvironmentMode,
    onStatus: ({ support = {}, active, mode, placementMode, label }) => {
      const arSupported = Boolean(support.ar);
      const vrSupported = Boolean(support.vr);
      state.xrSupported = arSupported || vrSupported;
      state.xrSession = active ? renderer.xr.getSession() : null;

      ui.xrArButton.disabled = active ? mode !== "ar" : !arSupported;
      ui.xrVrButton.disabled = active ? mode !== "vr" : !vrSupported;
      ui.xrArButton.textContent = active && mode === "ar"
        ? "Exit Room AR"
        : arSupported ? "Place in Your Room" : "Room AR Unavailable";
      ui.xrVrButton.textContent = active && mode === "vr"
        ? "Exit Tabletop VR"
        : vrSupported ? "Enter Tabletop VR" : "VR Unavailable";
      ui.xrReadout.textContent = label;
    },
  });
  await xrTabletop.detectSupport();
}

async function toggleXR(mode) {
  await xrTabletop?.toggle(mode);
}

function updateXR(frame) {
  state.xrAimActive = xrTabletop?.update(frame) ?? false;
}

function installEvents() {
  ui.startRunButton.addEventListener("click", beginRun);
  ui.challengeSelectButton.addEventListener("click", openChallengeSelect);
  ui.titleControlsButton.addEventListener("click", () => openInfoScreen("controls"));
  ui.titleSettingsButton.addEventListener("click", openSettingsFromTitle);
  ui.titleCreditsButton.addEventListener("click", () => openInfoScreen("credits"));
  ui.pauseButton.addEventListener("click", () => {
    if (state.paused) setPaused(false);
    else setPaused(true);
  });
  ui.muteButton.addEventListener("click", toggleMute);
  ui.resumeButton.addEventListener("click", () => {
    if (state.phase === "title") {
      state.paused = false;
      ui.pauseOverlay.classList.add("hidden");
      playSfx("resume");
      updateStaticUI();
    } else {
      setPaused(false);
    }
  });
  ui.newRunButton.addEventListener("click", newRunFromMenu);
  ui.pauseControlsButton.addEventListener("click", () => openInfoScreen("controls"));
  ui.pauseCreditsButton.addEventListener("click", () => openInfoScreen("credits"));
  ui.musicVolumeSlider.addEventListener("input", (event) => setMusicVolume(event.target.value));
  ui.sfxVolumeSlider.addEventListener("input", (event) => setSfxVolume(event.target.value));
  ui.infoPrimaryButton.addEventListener("click", continueInfo);
  ui.infoSecondaryButton.addEventListener("click", secondaryInfoAction);
  ui.infoCloseButton.addEventListener("click", () => {
    if (state.infoMode === "firstRunTutorial") finishTutorial();
    else closeInfoOverlay();
  });
  ui.challengeCloseButton.addEventListener("click", closeChallengeSelect);
  ui.challengeList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-challenge-index]");
    if (!button) return;
    beginChallengeRun(Number(button.dataset.challengeIndex));
  });

  ui.geometryControls.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-geometry]");
    if (button) {
      playSfx("ui");
      setGeometry(button.dataset.geometry);
    }
  });

  ui.energySlider.addEventListener("input", (event) => setEnergy(event.target.value));
  ui.energyInput.addEventListener("change", (event) => setEnergy(event.target.value));
  ui.energyDown.addEventListener("click", () => {
    playSfx("ui");
    setEnergy(state.energy - 1);
  });
  ui.energyUp.addEventListener("click", () => {
    playSfx("ui");
    setEnergy(state.energy + 1);
  });
  ui.angleSlider.addEventListener("input", (event) => setYaw(event.target.value));
  ui.pitchSlider.addEventListener("input", (event) => setPitch(event.target.value));
  ui.powerSlider.addEventListener("input", (event) => setPower(event.target.value));
  ui.fireButton.addEventListener("click", fire);
  ui.scarButton.addEventListener("click", () => {
    if (state.roundComplete || state.runComplete) return;
    const nearest = nearestScar();
    setEnergy(nearest.value);
    addLog(`Scar chalked n=${nearest.value}`);
    playSfx("ui");
    showToast(`Scar chalked n=${nearest.value}`, "bonus");
    sendInteractiveBallEvent(QB_EVENTS.quantum, { impact: 0.9 });
  });
  ui.resetButton.addEventListener("click", () => {
    startChallenge(state.challengeIndex, { resetScore: false });
    addLog("Challenge reset");
    playSfx("ui");
  });
  ui.replayShotButton.addEventListener("click", replayLastShot);
  ui.roundReplayButton.addEventListener("click", replayLastShot);
  ui.xrArButton.addEventListener("click", () => toggleXR("ar"));
  ui.xrVrButton.addEventListener("click", () => toggleXR("vr"));
  ui.nextRoundButton.addEventListener("click", async () => {
    if (state.runComplete) {
      await beginRun();
      return;
    }
    if (state.lastResult?.cleared) startChallenge(state.challengeIndex + 1, { resetScore: false });
    else startChallenge(state.challengeIndex, { resetScore: false });
    playSfx("ui");
  });
  ui.restartRunButton.addEventListener("click", () => {
    startChallenge(0, { resetScore: true });
    playSfx("ui");
  });

  canvas.addEventListener("pointerdown", (event) => {
    state.dragging = true;
    canvas.setPointerCapture(event.pointerId);
    sendInteractiveBallEvent(QB_EVENTS.selected);
    sendInteractiveBallEvent(QB_EVENTS.charge, { charge: state.power / 100 });
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!state.dragging) return;
    setYaw(state.yaw + event.movementX * 0.12);
    setPitch(state.pitch - event.movementY * 0.05);
  });
  canvas.addEventListener("pointerup", (event) => {
    state.dragging = false;
    canvas.releasePointerCapture(event.pointerId);
    sendInteractiveBallEvent(QB_EVENTS.deselected);
  });
  canvas.addEventListener("pointercancel", () => {
    state.dragging = false;
    sendInteractiveBallEvent(QB_EVENTS.deselected);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "i" && !event.metaKey && !event.ctrlKey && !isTextInput(event.target)) {
      event.preventDefault();
      interactivityOverlay.toggle();
      return;
    }
    if (event.key.toLowerCase() === "v" && !event.metaKey && !event.ctrlKey && !isTextInput(event.target)) {
      event.preventDefault();
      visualStateOverlay.toggle();
      visualStateOverlay.render(state.visualState || visualStateSystem.update(performance.now()));
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      if (!ui.challengeOverlay.classList.contains("hidden")) {
        closeChallengeSelect();
        return;
      }
      if (!ui.infoOverlay.classList.contains("hidden")) {
        if (state.infoMode === "firstRunTutorial") finishTutorial();
        else closeInfoOverlay();
        return;
      }
      if (state.phase === "title" && !ui.pauseOverlay.classList.contains("hidden")) {
        state.paused = false;
        ui.pauseOverlay.classList.add("hidden");
      } else if (state.phase === "playing") {
        setPaused(!state.paused);
      }
      return;
    }
    if (event.key.toLowerCase() === "r" && !event.metaKey && !event.ctrlKey && !isTextInput(event.target)) {
      event.preventDefault();
      replayLastShot();
      return;
    }
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      fire();
    }
    if (event.key === "ArrowLeft") setYaw(state.yaw - 1);
    if (event.key === "ArrowRight") setYaw(state.yaw + 1);
    if (event.key === "ArrowUp") setPitch(state.pitch + 1);
    if (event.key === "ArrowDown") setPitch(state.pitch - 1);
  });
  window.addEventListener("resize", resize);
}

function installSpectrumMarkers() {
  ui.spectrumBar.querySelectorAll(".scar-marker").forEach((marker) => marker.remove());
  for (const marker of SCAR_STATES[state.geometry]) {
    const span = document.createElement("span");
    span.className = "scar-marker";
    span.style.left = `${((marker - 1) / 499) * 100}%`;
    ui.spectrumBar.append(span);
  }
}

function addLog(message) {
  const li = document.createElement("li");
  li.textContent = message;
  ui.eventLog.prepend(li);
  while (ui.eventLog.children.length > 8) ui.eventLog.lastElementChild.remove();
}

async function mountInteractiveSourceBall(sourceGroup) {
  const token = Symbol("source-ball");
  world.sourceMountToken = token;
  try {
    const instance = await createQuantumBallInstance({
      diagnostics: interactivityDiagnostics,
      onAssetEvent: handleInteractiveAssetEvent,
    });
    if (world.sourceMountToken !== token || world.sourceGroup !== sourceGroup) {
      instance.dispose();
      return;
    }
    sourceGroup.add(instance.root);
    if (world.sourceBall) world.sourceBall.visible = false;
    if (world.sourceHalo) world.sourceHalo.visible = false;
    world.sourceInteractive = instance;
    sendInteractiveBallEvent(QB_EVENTS.reset);
  } catch (error) {
    interactivityDiagnostics.error(`Interactive ball fallback: ${error.message}`);
    addLog("KHR ball fallback");
  }
}

function disposeInteractiveSource() {
  world.sourceMountToken = null;
  if (!world.sourceInteractive) return;
  world.sourceInteractive.dispose();
  world.sourceInteractive = null;
}

function updateInteractiveSourceBall(seconds) {
  if (!world.sourceInteractive) return;
  const snapshot = state.visualState;
  const focus = snapshot?.focus || computeFocus();
  world.sourceInteractive.update(seconds, {
    coherence: focus.coherence,
    scarLock: Boolean(snapshot?.source.scarLock) || focus.label === "Scar locked",
    uncertainty: snapshot?.source.uncertainty ?? 1 - focus.coherence,
    phase: snapshot?.source.phase ?? 0,
    power: state.power / 100,
  });
}

function sendInteractiveBallEvent(id, payload = {}) {
  world.sourceInteractive?.send(id, payload);
}

function handleInteractiveAssetEvent(id) {
  if (id === QB_EVENTS.visualComplete) addLog("Ball visual complete");
}

function getVisualQualityTier() {
  if (renderer.xr.isPresenting) return "xr-safe";
  if (window.innerWidth <= 760 || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4)) return "medium";
  return "high";
}

function isTextInput(target) {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

function kickCamera(strength, duration) {
  if (renderer.xr.isPresenting) return;
  state.cameraKick = Math.max(state.cameraKick, strength);
  state.cameraKickUntil = performance.now() + duration;
  state.cameraKickSeed += 1;
}

function cameraKickOffset(seconds) {
  const remaining = state.cameraKickUntil - performance.now();
  if (remaining <= 0 || state.cameraKick <= 0.0001) return new THREE.Vector3();
  const fade = clamp(remaining / 280, 0, 1);
  const seed = state.cameraKickSeed * 1.73;
  return new THREE.Vector3(
    Math.sin(seconds * 37 + seed) * state.cameraKick * fade,
    Math.cos(seconds * 31 + seed * 0.7) * state.cameraKick * 0.45 * fade,
    Math.sin(seconds * 29 + seed * 1.3) * state.cameraKick * 0.6 * fade
  );
}

function formatTime(value) {
  const total = Math.max(0, Math.ceil(value));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function pointAlongShot(shot, progress) {
  const distance = shot.total * progress;
  let index = 1;
  while (index < shot.distances.length && shot.distances[index] < distance) index += 1;
  const prev = Math.max(0, index - 1);
  const span = Math.max(0.0001, shot.distances[index] - shot.distances[prev]);
  const t = clamp((distance - shot.distances[prev]) / span, 0, 1);
  return shot.path3[prev].clone().lerp(shot.path3[index] || shot.path3[prev], t);
}

function setLinePath(line, path, height) {
  const pointCapacity = Math.max(1, path.length);
  const requiredPositions = pointCapacity * 3;
  let positionAttribute = line.geometry.getAttribute("position");
  let progressAttribute = line.geometry.getAttribute("pathProgress");
  if (!positionAttribute || positionAttribute.array.length < requiredPositions) {
    const capacity = Math.max(pointCapacity, 32);
    line.geometry.dispose();
    line.geometry = new THREE.BufferGeometry();
    positionAttribute = new THREE.BufferAttribute(new Float32Array(capacity * 3), 3);
    progressAttribute = new THREE.BufferAttribute(new Float32Array(capacity), 1);
    positionAttribute.setUsage(THREE.DynamicDrawUsage);
    progressAttribute.setUsage(THREE.DynamicDrawUsage);
    line.geometry.setAttribute("position", positionAttribute);
    line.geometry.setAttribute("pathProgress", progressAttribute);
  }

  let totalDistance = 0;
  const distances = new Float32Array(path.length);
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const point = path[index];
    totalDistance += Math.hypot(point.x - previous.x, point.y - previous.y);
    distances[index] = totalDistance;
  }

  for (let index = 0; index < path.length; index += 1) {
    const point = path[index];
    positionAttribute.setXYZ(index, point.x, height, point.y);
    progressAttribute.setX(index, totalDistance > 0 ? distances[index] / totalDistance : 0);
  }
  positionAttribute.needsUpdate = true;
  progressAttribute.needsUpdate = true;
  line.geometry.setDrawRange(0, path.length);
  line.geometry.computeBoundingSphere();
}

function toWorld3(p, height = 0) {
  return new THREE.Vector3(p.x, height, p.y);
}

function aimDir() {
  const angle = (state.yaw * Math.PI) / 180;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

function cylinderBetween(a, b, radius, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), material);
  setCylinderBetween(mesh, a, b);
  return mesh;
}

function setCylinderBetween(mesh, a, b) {
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const direction = b.clone().sub(a);
  const length = direction.length();
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  mesh.scale.set(1, length, 1);
}

function cloneHalo(color, opacity) {
  return ownedMaterial(new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }));
}

function ownedMaterial(material) {
  material.userData.ownedByObject = true;
  return material;
}

function disposeGroup(group) {
  while (group.children.length) {
    const child = group.children.pop();
    child.traverse((object) => {
      object.geometry?.dispose();
      const ownedMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of ownedMaterials) {
        if (material?.userData?.ownedByObject) material.dispose();
      }
    });
  }
}

function makeStar(points, outer, inner, offset) {
  const poly = [];
  for (let i = 0; i < points * 2; i += 1) {
    const r = i % 2 === 0 ? outer : inner;
    const a = offset + (i / (points * 2)) * TAU;
    poly.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return poly;
}

function pointInPolygon(point, poly) {
  let insidePoly = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i, i += 1) {
    const pi = poly[i];
    const pj = poly[j];
    const intersect =
      pi.y > point.y !== pj.y > point.y &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y + 1e-9) + pi.x;
    if (intersect) insidePoly = !insidePoly;
  }
  return insidePoly;
}

function polygonSignedDistance(p, poly) {
  let minDistance = Infinity;
  for (let i = 0; i < poly.length; i += 1) {
    minDistance = Math.min(minDistance, distanceToSegment(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return pointInPolygon(p, poly) ? minDistance : -minDistance;
}

function distanceToSegment(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const wx = p.x - a.x;
  const wy = p.y - a.y;
  const c = clamp((wx * vx + wy * vy) / (vx * vx + vy * vy || 1), 0, 1);
  const px = a.x + vx * c;
  const py = a.y + vy * c;
  return Math.hypot(p.x - px, p.y - py);
}

function minDistanceToPath(point, path) {
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i += 1) {
    min = Math.min(min, distanceToSegment(point, path[i], path[i + 1]));
  }
  return min;
}

function normalize(v) {
  const len = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / len, y: v.y / len };
}

function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

function hash(value) {
  const s = Math.sin(value * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}
