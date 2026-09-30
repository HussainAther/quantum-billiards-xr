import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { QB_EVENTS, QB_STATE } from "../interactivity/constants.js";
import { InteractivityDiagnostics } from "../interactivity/diagnostics.js";
import { InteractivityEventBridge } from "../interactivity/event-bridge.js";
import { parseInteractivityExtension } from "../interactivity/graph-parser.js";
import { InteractivityGraphRuntime } from "../interactivity/graph-runtime.js";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const assetPath = resolve(root, "assets/interactive/quantum-ball.gltf");
const document = JSON.parse(readFileSync(assetPath, "utf8"));

testGeneratedAssetParses();
testHostToAssetState();
testDelayedAssetToHostEvent();
testInvalidDuplicateEventRejected();

console.log("interactivity runtime tests passed");

function testGeneratedAssetParses() {
  const diagnostics = new InteractivityDiagnostics();
  const graph = parseInteractivityExtension(document, diagnostics);
  assert.ok(graph, "expected KHR_interactivity graph");
  assert.equal(graph.graphIndex, 0);
  assert.equal(graph.eventIdToIndex.has(QB_EVENTS.charge), true);
  assert.equal(graph.variables[0].extras.id, "presentationState");
}

function testHostToAssetState() {
  const { bridge, runtime } = makeRuntime();
  runtime.start();
  bridge.emitHostEvent(QB_EVENTS.charge, { charge: 0.72 });
  assert.equal(runtime.store.getScalarById("presentationState"), QB_STATE.charging);
  assert.equal(runtime.store.getScalarById("charge"), 0.72);

  bridge.emitHostEvent(QB_EVENTS.collision, { impact: 1.1 });
  assert.equal(runtime.store.getScalarById("presentationState"), QB_STATE.colliding);
  assert.equal(runtime.store.getScalarById("impact"), 1.1);

  bridge.emitHostEvent(QB_EVENTS.reset);
  assert.equal(runtime.store.getScalarById("presentationState"), QB_STATE.idle);
  assert.equal(runtime.store.getScalarById("charge"), 0);
  assert.equal(runtime.store.getScalarById("impact"), 0);
  runtime.dispose();
}

function testDelayedAssetToHostEvent() {
  const { bridge, runtime, flushTimers } = makeRuntime();
  const assetEvents = [];
  bridge.onAssetEvent(QB_EVENTS.visualComplete, (payload) => assetEvents.push(payload));

  runtime.start();
  bridge.emitHostEvent(QB_EVENTS.collapse);
  assert.equal(runtime.store.getScalarById("presentationState"), QB_STATE.collapsing);
  assert.equal(assetEvents.length, 0);

  flushTimers();
  assert.equal(assetEvents.length, 1);
  runtime.dispose();
}

function testInvalidDuplicateEventRejected() {
  const diagnostics = new InteractivityDiagnostics();
  const broken = structuredClone(document);
  const events = broken.extensions.KHR_interactivity.graphs[0].events;
  events.push({ id: QB_EVENTS.charge });
  const graph = parseInteractivityExtension(broken, diagnostics);
  assert.equal(graph, null);
  assert.ok(diagnostics.entries.some((entry) => entry.level === "error"));
}

function makeRuntime() {
  const diagnostics = new InteractivityDiagnostics();
  const graph = parseInteractivityExtension(document, diagnostics);
  const bridge = new InteractivityEventBridge(diagnostics);
  const timers = new Map();
  let nextTimer = 1;
  const runtime = new InteractivityGraphRuntime(graph, {
    bridge,
    diagnostics,
    clock: () => 100,
    setTimer(handler) {
      const id = nextTimer;
      nextTimer += 1;
      timers.set(id, handler);
      return id;
    },
    clearTimer(id) {
      timers.delete(id);
    },
  });
  return {
    bridge,
    runtime,
    flushTimers() {
      const handlers = [...timers.values()];
      timers.clear();
      handlers.forEach((handler) => handler());
    },
  };
}
