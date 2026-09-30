import { defaultValueForType, normalizeValue, scalarValue } from "./constants.js";
import { getConfigValue, getTypeSignature } from "./graph-parser.js";
import { isOperationSupported } from "./node-registry.js";
import { InteractivityStateStore } from "./state-store.js";

export class InteractivityGraphRuntime {
  constructor(graph, { bridge, diagnostics, clock, setTimer, clearTimer } = {}) {
    this.graph = graph;
    this.bridge = bridge;
    this.diagnostics = diagnostics;
    this.clock = clock || (() => performance.now() / 1000);
    this.setTimer = setTimer || ((handler, ms) => window.setTimeout(handler, ms));
    this.clearTimer = clearTimer || ((timer) => window.clearTimeout(timer));
    this.store = new InteractivityStateStore(graph, diagnostics);
    this.nodeOutputs = new Map();
    this.delayState = new Map();
    this.running = false;
    this.startedAt = 0;
    this.lastTick = Number.NaN;
    this.unsubscribeBridge = bridge?.onHostEvent(({ id, payload }) => this.receiveEvent(id, payload));
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.startedAt = this.clock();
    this.lastTick = Number.NaN;
    this.diagnostics?.setStatus(`Graph ${this.graph.graphIndex} running`);
    this.graph.nodes.forEach((node) => {
      if (node.op === "event/onStart") {
        this.nodeOutputs.set(node.index, { event: [{ kind: "start", at: this.clock() }] });
        this.activateFlow(node.index, "out");
      }
    });
  }

  tick() {
    if (!this.running) return;
    const now = this.clock();
    const timeSinceStart = Math.max(0, now - this.startedAt);
    const timeSinceLastTick = Number.isNaN(this.lastTick) ? Number.NaN : Math.max(0, now - this.lastTick);
    this.lastTick = now;

    this.graph.nodes.forEach((node) => {
      if (node.op !== "event/onTick") return;
      this.nodeOutputs.set(node.index, {
        timeSinceStart: [timeSinceStart],
        timeSinceLastTick: [timeSinceLastTick],
        event: [{ kind: "tick", at: now }],
      });
      this.activateFlow(node.index, "out");
    });
  }

  receiveEvent(eventId, payload = {}) {
    if (!this.running) this.start();
    const eventIndex = this.graph.eventIdToIndex.get(eventId);
    if (eventIndex === undefined) {
      this.diagnostics?.warn(`Ignored unknown host event ${eventId}`);
      return;
    }

    const eventDefinition = this.graph.events[eventIndex];
    const outputValues = this.resolveEventValues(eventDefinition, payload);
    outputValues.event = [{ kind: "custom", id: eventId, at: this.clock() }];

    this.graph.nodes.forEach((node) => {
      if (node.op !== "event/receive") return;
      if (Number(getConfigValue(node, "event", -1)) !== eventIndex) return;
      this.nodeOutputs.set(node.index, outputValues);
      this.activateFlow(node.index, "out");
    });
  }

  activateNodeInput(nodeIndex, socket = "in") {
    const node = this.graph.nodes[nodeIndex];
    if (!node) return;
    if (!isOperationSupported(node.op)) return;

    if (node.op === "flow/setDelay" && socket === "cancel") {
      this.cancelDelayNode(node.index);
      return;
    }

    switch (node.op) {
      case "debug/log":
        this.executeDebugLog(node);
        break;
      case "event/send":
        this.executeEventSend(node);
        break;
      case "flow/sequence":
        this.executeSequence(node);
        break;
      case "flow/setDelay":
        this.executeSetDelay(node);
        break;
      case "variable/set":
        this.executeVariableSet(node);
        break;
      default:
        break;
    }
  }

  activateFlow(nodeIndex, socket) {
    const node = this.graph.nodes[nodeIndex];
    const target = node?.flows?.[socket];
    if (!target) return;
    this.activateNodeInput(target.node, target.socket || "in");
  }

  evaluateInput(node, socketId) {
    const source = node.values?.[socketId];
    if (!source) return [undefined];
    if (source.node !== undefined) return this.evaluateOutput(source.node, source.socket || "value");
    if (source.type !== undefined) {
      const signature = getTypeSignature(this.graph, source.type);
      if (source.value !== undefined) return normalizeValue(signature, source.value);
      return defaultValueForType(signature);
    }
    return [undefined];
  }

  evaluateOutput(nodeIndex, socket = "value") {
    const node = this.graph.nodes[nodeIndex];
    if (!node) return [undefined];
    if (node.op === "variable/get" && socket === "value") {
      const variableIndex = Number(getConfigValue(node, "variable", -1));
      return this.store.getVariable(variableIndex);
    }
    const outputs = this.nodeOutputs.get(nodeIndex);
    if (outputs && Object.hasOwn(outputs, socket)) return outputs[socket];
    return [undefined];
  }

  executeDebugLog(node) {
    const severity = Number(getConfigValue(node, "severity", 0));
    const message = String(getConfigValue(node, "message", ""));
    const rendered = message.replace(/\{([^{}]+)\}/g, (_match, socketId) => {
      return String(this.evaluateInput(node, socketId).join(","));
    });
    if (severity >= 2) this.diagnostics?.warn(rendered);
    else this.diagnostics?.info(rendered);
    this.activateFlow(node.index, "out");
  }

  executeEventSend(node) {
    const eventIndex = Number(getConfigValue(node, "event", -1));
    const eventDefinition = this.graph.events[eventIndex];
    if (!eventDefinition) return;
    const payload = {};
    for (const socketId of Object.keys(eventDefinition.values || {})) {
      payload[socketId] = this.evaluateInput(node, socketId);
    }
    this.bridge?.emitAssetEvent(eventDefinition.id || `event:${eventIndex}`, payload);
    this.activateFlow(node.index, "out");
  }

  executeSequence(node) {
    Object.keys(node.flows)
      .sort()
      .forEach((socket) => this.activateFlow(node.index, socket));
  }

  executeSetDelay(node) {
    const duration = scalarValue(this.evaluateInput(node, "duration"));
    if (!Number.isFinite(duration) || duration < 0) {
      this.activateFlow(node.index, "err");
      return;
    }

    const delayRef = { id: `delay-${node.index}-${Date.now()}-${Math.random().toString(16).slice(2)}` };
    const nodeState = this.delayState.get(node.index) || { timers: new Map() };
    const timer = this.setTimer(() => {
      const state = this.delayState.get(node.index);
      if (!state?.timers.has(timer)) return;
      state.timers.delete(timer);
      if (!state.timers.size) this.delayState.delete(node.index);
      this.activateFlow(node.index, "done");
    }, duration * 1000);
    nodeState.timers.set(timer, delayRef);
    this.delayState.set(node.index, nodeState);
    this.nodeOutputs.set(node.index, { lastDelay: [delayRef] });
    this.activateFlow(node.index, "out");
  }

  executeVariableSet(node) {
    const variables = getConfigValue(node, "variables", []);
    const variableList = Array.isArray(variables) ? variables : [variables];
    const seen = new Set();
    for (const variableIndex of variableList) {
      if (seen.has(variableIndex)) continue;
      seen.add(variableIndex);
      this.store.setVariable(variableIndex, this.evaluateInput(node, String(variableIndex)), `node ${node.index}`);
    }
    this.activateFlow(node.index, "out");
  }

  resolveEventValues(eventDefinition, payload) {
    const result = {};
    for (const [socketId, socket] of Object.entries(eventDefinition.values || {})) {
      const signature = getTypeSignature(this.graph, socket.type);
      const value = payload[socketId] !== undefined ? payload[socketId] : socket.value;
      result[socketId] = value !== undefined ? normalizeValue(signature, value) : defaultValueForType(signature);
    }
    return result;
  }

  cancelDelayNode(nodeIndex) {
    const state = this.delayState.get(nodeIndex);
    if (!state) return;
    for (const timer of state.timers.keys()) this.clearTimer(timer);
    this.delayState.delete(nodeIndex);
    this.nodeOutputs.set(nodeIndex, { lastDelay: [null] });
  }

  dispose() {
    this.unsubscribeBridge?.();
    for (const nodeIndex of this.delayState.keys()) this.cancelDelayNode(nodeIndex);
    this.running = false;
  }
}
