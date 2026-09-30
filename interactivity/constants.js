export const KHR_INTERACTIVITY = "KHR_interactivity";

export const VALUE_TYPE_LENGTHS = {
  bool: 1,
  float: 1,
  float2: 2,
  float3: 3,
  float4: 4,
  float2x2: 4,
  float3x3: 9,
  float4x4: 16,
  int: 1,
  ref: 1,
};

export const BUILTIN_OPERATIONS = new Set([
  "debug/log",
  "event/onStart",
  "event/onTick",
  "event/receive",
  "event/send",
  "flow/sequence",
  "flow/setDelay",
  "variable/get",
  "variable/set",
]);

export const QB_EVENTS = {
  selected: "QB_SELECTED",
  deselected: "QB_DESELECTED",
  charge: "QB_CHARGE",
  released: "QB_RELEASED",
  collision: "QB_COLLISION",
  quantum: "QB_QUANTUM",
  collapse: "QB_COLLAPSE",
  pocketed: "QB_POCKETED",
  reset: "QB_RESET",
  visualComplete: "QB_VISUAL_COMPLETE",
};

export const QB_STATE = {
  idle: 0,
  selected: 1,
  charging: 2,
  released: 3,
  colliding: 4,
  quantumActive: 5,
  collapsing: 6,
  pocketed: 7,
};

export const QB_STATE_LABELS = [
  "Idle",
  "Selected",
  "Charging",
  "Released",
  "Colliding",
  "Quantum-active",
  "Collapsing",
  "Pocketed",
];

export function isSupportedValueType(signature) {
  return Object.hasOwn(VALUE_TYPE_LENGTHS, signature);
}

export function defaultValueForType(signature) {
  const length = VALUE_TYPE_LENGTHS[signature] ?? 1;
  if (signature === "bool") return [false];
  if (signature === "int") return [0];
  if (signature === "ref") return [null];
  return Array.from({ length }, () => Number.NaN);
}

export function normalizeValue(signature, value) {
  const length = VALUE_TYPE_LENGTHS[signature] ?? 1;
  const source = Array.isArray(value) ? value : [value];
  const fallback = defaultValueForType(signature);
  const next = fallback.slice();
  for (let i = 0; i < length; i += 1) {
    if (i < source.length) next[i] = normalizeComponent(signature, source[i]);
  }
  return next;
}

export function normalizeComponent(signature, component) {
  if (signature === "bool") return Boolean(component);
  if (signature === "int") return Number(component) | 0;
  if (signature === "ref") return component ?? null;
  return Number(component);
}

export function scalarValue(value) {
  return Array.isArray(value) ? value[0] : value;
}
