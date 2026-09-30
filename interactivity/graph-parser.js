import { KHR_INTERACTIVITY, isSupportedValueType } from "./constants.js";
import { operationSupportMessage } from "./node-registry.js";

export function parseInteractivityExtension(gltfDocument, diagnostics) {
  const extension = gltfDocument?.extensions?.[KHR_INTERACTIVITY];
  if (!extension) {
    diagnostics?.warn("No KHR_interactivity extension found");
    return null;
  }

  if (!Array.isArray(extension.graphs) || extension.graphs.length === 0) {
    diagnostics?.error("KHR_interactivity extension has no graphs");
    return null;
  }

  const graphIndex = Number.isInteger(extension.graph) ? extension.graph : 0;
  if (graphIndex < 0 || graphIndex >= extension.graphs.length) {
    diagnostics?.error(`KHR_interactivity default graph ${graphIndex} is invalid`);
    return null;
  }

  const rawGraph = extension.graphs[graphIndex];
  const graph = {
    graphIndex,
    types: arrayOrEmpty(rawGraph.types),
    variables: arrayOrEmpty(rawGraph.variables),
    events: arrayOrEmpty(rawGraph.events),
    declarations: arrayOrEmpty(rawGraph.declarations),
    nodes: arrayOrEmpty(rawGraph.nodes),
    extras: rawGraph.extras || {},
  };

  if (!validateGraph(graph, diagnostics)) return null;
  graph.eventIdToIndex = new Map();
  graph.events.forEach((event, index) => {
    if (event.id) graph.eventIdToIndex.set(event.id, index);
  });
  graph.nodes = graph.nodes.map((node, index) => {
    const declaration = graph.declarations[node.declaration];
    return {
      ...node,
      index,
      op: declaration.op,
      declarationObject: declaration,
      configuration: node.configuration || {},
      values: node.values || {},
      flows: node.flows || {},
    };
  });
  diagnostics?.info(`KHR_interactivity graph ${graphIndex} parsed`);
  return graph;
}

export function getConfigValue(node, key, fallback = undefined) {
  const value = node.configuration?.[key]?.value;
  if (!Array.isArray(value)) return fallback;
  return value.length === 1 ? value[0] : value.slice();
}

export function getTypeSignature(graph, typeIndex) {
  return graph.types[typeIndex]?.signature;
}

function validateGraph(graph, diagnostics) {
  const signatures = new Set();
  for (let i = 0; i < graph.types.length; i += 1) {
    const signature = graph.types[i]?.signature;
    if (!isSupportedValueType(signature) && signature !== "custom") {
      diagnostics?.error(`Unsupported KHR_interactivity value type ${signature}`);
      return false;
    }
    if (signature !== "custom" && signatures.has(signature)) {
      diagnostics?.error(`Duplicate KHR_interactivity type signature ${signature}`);
      return false;
    }
    signatures.add(signature);
  }

  const eventIds = new Set();
  for (let i = 0; i < graph.events.length; i += 1) {
    const event = graph.events[i];
    if (event.id && eventIds.has(event.id)) {
      diagnostics?.error(`Duplicate KHR_interactivity event id ${event.id}`);
      return false;
    }
    if (event.id) eventIds.add(event.id);
    if (!validateValueSocketMap(graph, event.values, diagnostics, `event ${i}`)) return false;
  }

  for (let i = 0; i < graph.variables.length; i += 1) {
    const variable = graph.variables[i];
    if (!isIndex(variable.type, graph.types.length)) {
      diagnostics?.error(`Variable ${i} has invalid type index`);
      return false;
    }
  }

  for (let i = 0; i < graph.declarations.length; i += 1) {
    const declaration = graph.declarations[i];
    if (!declaration?.op) {
      diagnostics?.error(`Declaration ${i} has no op`);
      return false;
    }
    const supportMessage = operationSupportMessage(declaration);
    if (supportMessage) diagnostics?.warn(supportMessage);
  }

  for (let i = 0; i < graph.nodes.length; i += 1) {
    const node = graph.nodes[i];
    if (!isIndex(node.declaration, graph.declarations.length)) {
      diagnostics?.error(`Node ${i} has invalid declaration`);
      return false;
    }
    if (!validateNodeReferences(graph, node, i, diagnostics)) return false;
  }

  return true;
}

function validateNodeReferences(graph, node, nodeIndex, diagnostics) {
  for (const [socketId, source] of Object.entries(node.values || {})) {
    if (!source || typeof source !== "object") {
      diagnostics?.error(`Node ${nodeIndex} value ${socketId} is invalid`);
      return false;
    }
    if (source.node !== undefined) {
      if (!Number.isInteger(source.node) || source.node < 0 || source.node >= nodeIndex) {
        diagnostics?.error(`Node ${nodeIndex} value ${socketId} points forward or out of range`);
        return false;
      }
    }
    if (source.type !== undefined && !isIndex(source.type, graph.types.length)) {
      diagnostics?.error(`Node ${nodeIndex} value ${socketId} has invalid type`);
      return false;
    }
  }

  for (const [socketId, target] of Object.entries(node.flows || {})) {
    if (!target || !Number.isInteger(target.node) || target.node <= nodeIndex || target.node >= graph.nodes.length) {
      diagnostics?.error(`Node ${nodeIndex} flow ${socketId} points backward or out of range`);
      return false;
    }
  }

  return true;
}

function validateValueSocketMap(graph, values, diagnostics, label) {
  if (!values) return true;
  for (const [socketId, socket] of Object.entries(values)) {
    if (socketId === "event") {
      diagnostics?.error(`${label} uses reserved event socket id`);
      return false;
    }
    if (!isIndex(socket.type, graph.types.length)) {
      diagnostics?.error(`${label} value ${socketId} has invalid type`);
      return false;
    }
  }
  return true;
}

function arrayOrEmpty(value) {
  return Array.isArray(value) ? value : [];
}

function isIndex(value, length) {
  return Number.isInteger(value) && value >= 0 && value < length;
}
