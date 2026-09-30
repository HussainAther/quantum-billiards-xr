import * as THREE from "../vendor/three.module.min.js";
import { KHR_INTERACTIVITY, QB_EVENTS, QB_STATE_LABELS } from "./constants.js";
import { InteractivityDiagnostics } from "./diagnostics.js";
import { InteractivityEventBridge } from "./event-bridge.js";
import { loadInteractiveGltf, cloneSceneWithUniqueMaterials } from "./extension-loader.js";
import { parseInteractivityExtension } from "./graph-parser.js";
import { InteractivityGraphRuntime } from "./graph-runtime.js";

const COLOR_IDLE = new THREE.Color(0xded5b7);
const COLOR_SELECTED = new THREE.Color(0x66ef9a);
const COLOR_QUANTUM = new THREE.Color(0x39d8e8);
const COLOR_COLLAPSE = new THREE.Color(0xff4fb7);
const COLOR_BAD = new THREE.Color(0xff6a5f);
const COLOR_SCAR = new THREE.Color(0x0b2c25);
const COLOR_CHALK = new THREE.Color(0xc2e9c8);

let quantumBallAssetPromise = null;

export async function createQuantumBallInstance({
  url = "./assets/interactive/quantum-ball.gltf",
  diagnostics = new InteractivityDiagnostics(),
  onAssetEvent,
} = {}) {
  if (!quantumBallAssetPromise) {
    quantumBallAssetPromise = loadInteractiveGltf(url, diagnostics);
  }

  const { document, gltf } = await quantumBallAssetPromise;
  const graph = parseInteractivityExtension(document, diagnostics);
  const root = cloneSceneWithUniqueMaterials(gltf.scene);
  root.name = "QuantumBallInteractiveInstance";
  root.scale.setScalar(1);

  if (!graph) {
    diagnostics.setStatus("Interactivity fallback");
    return createFallbackInstance(root, diagnostics);
  }

  const bridge = new InteractivityEventBridge(diagnostics);
  const runtime = new InteractivityGraphRuntime(graph, { bridge, diagnostics });
  const presenter = new QuantumBallPresenter(root, runtime.store, diagnostics);
  const unsubscribeVisualComplete = bridge.onAssetEvent(QB_EVENTS.visualComplete, (payload) => {
    onAssetEvent?.(QB_EVENTS.visualComplete, payload);
  });

  runtime.start();
  diagnostics.setStatus(`${KHR_INTERACTIVITY} active`);

  return {
    root,
    bridge,
    runtime,
    presenter,
    send(id, payload) {
      bridge.emitHostEvent(id, payload);
    },
    update(seconds, hostContext = {}) {
      runtime.tick();
      presenter.update(seconds, hostContext);
    },
    dispose() {
      unsubscribeVisualComplete();
      presenter.dispose();
      runtime.dispose();
    },
  };
}

function createFallbackInstance(root, diagnostics) {
  return {
    root,
    send() {},
    update() {},
    dispose() {
      diagnostics?.warn("Disposed non-interactive glTF fallback");
    },
  };
}

class QuantumBallPresenter {
  constructor(root, store, diagnostics) {
    this.root = root;
    this.store = store;
    this.diagnostics = diagnostics;
    this.state = 0;
    this.charge = 0;
    this.impact = 0;
    this.materials = {};
    this.core = null;
    this.halo = null;
    this.shell = null;
    this.scarBand = null;
    this.chalkNick = null;
    this.unsubscribe = store.subscribe(() => this.readState());

    root.traverse((object) => {
      if (object.name === "QuantumBallCore") this.core = object;
      if (object.name === "QuantumBallHalo") this.halo = object;
      if (object.name === "QuantumBallShell") this.shell = object;
      if (object.name === "QuantumBallScarBand") this.scarBand = object;
      if (object.name === "QuantumBallChalkNick") this.chalkNick = object;
      if (object.material?.name) this.materials[object.material.name] = object.material;
    });

    this.readState();
  }

  readState() {
    this.state = Number(this.store.getScalarById("presentationState") ?? 0);
    this.charge = clamp(Number(this.store.getScalarById("charge") ?? 0), 0, 1.35);
    this.impact = clamp(Number(this.store.getScalarById("impact") ?? 0), 0, 1.4);
    this.diagnostics?.setStatus(`Asset ${QB_STATE_LABELS[this.state] || "Unknown"}`);
  }

  update(seconds, hostContext) {
    const stateColor = this.colorForState();
    const coherence = clamp(hostContext.coherence ?? 0.6, 0, 1);
    const uncertainty = clamp(hostContext.uncertainty ?? 1 - coherence, 0, 1);
    const power = clamp(hostContext.power ?? 0.5, 0, 1);
    const breathing = 1 + Math.sin(seconds * (4.2 + uncertainty * 1.8)) * (0.012 + uncertainty * 0.016);
    const chargePulse = this.charge * (0.055 + power * 0.035 + Math.sin(seconds * 10.5) * 0.018);
    const impactPulse = this.impact * Math.max(0, 0.16 + Math.sin(seconds * 17) * 0.07);
    const scarLight = this.state === 5 ? COLOR_QUANTUM : this.state === 6 || this.state === 7 ? COLOR_COLLAPSE : COLOR_SCAR;

    const rotationSpeed = 0.0025 + uncertainty * 0.006 + this.charge * 0.006;
    this.root.rotation.y += rotationSpeed;

    if (this.core) {
      this.core.scale.setScalar(breathing + chargePulse + impactPulse);
    }
    if (this.halo) {
      const haloScale = 1 + this.charge * 0.42 + this.impact * 0.25 + Math.sin(seconds * 3.7) * 0.06;
      this.halo.scale.setScalar(haloScale);
    }
    if (this.shell) {
      this.shell.rotation.x = seconds * (0.12 + uncertainty * 0.28 + this.charge * 0.32);
      this.shell.rotation.z = seconds * (-0.08 - uncertainty * 0.2);
      this.shell.scale.setScalar(1.04 + coherence * 0.1 + power * 0.025);
    }
    if (this.scarBand) {
      this.scarBand.scale.setScalar(1 + this.charge * 0.07 + this.impact * 0.035);
    }
    if (this.chalkNick) {
      this.chalkNick.scale.setScalar(1 + Math.sin(seconds * 6.5) * 0.018);
    }

    this.applyMaterial("QuantumBallCoreMaterial", stateColor, 0.28 + this.charge * 0.38 + this.impact * 0.24);
    this.applyMaterial("QuantumBallHaloMaterial", stateColor, 0.28 + this.charge * 0.58 + this.impact * 0.35);
    this.applyMaterial("QuantumBallShellMaterial", stateColor, 0.34 + this.charge * 0.45);
    this.applyMaterial("QuantumBallScarMaterial", scarLight, 0.18 + this.charge * 0.38 + this.impact * 0.32);
    this.applyMaterial("QuantumBallChalkNickMaterial", COLOR_CHALK, 0.1 + this.charge * 0.12);
  }

  applyMaterial(name, color, emissiveIntensity) {
    const material = this.materials[name];
    if (!material) return;
    if (material.color) material.color.lerp(color, 0.22);
    if (material.emissive) material.emissive.lerp(color, 0.22);
    if ("emissiveIntensity" in material) material.emissiveIntensity = emissiveIntensity;
    if (material.transparent && name.includes("Halo")) {
      material.opacity = clamp(0.18 + this.charge * 0.18 + this.impact * 0.12, 0.16, 0.58);
    }
  }

  colorForState() {
    if (this.state === 4) return COLOR_BAD;
    if (this.state === 5) return COLOR_QUANTUM;
    if (this.state === 6 || this.state === 7) return COLOR_COLLAPSE;
    if (this.state === 1 || this.state === 2 || this.state === 3) return COLOR_SELECTED;
    return COLOR_IDLE;
  }

  dispose() {
    this.unsubscribe?.();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
