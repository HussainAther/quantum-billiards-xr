import { BUILTIN_OPERATIONS } from "./constants.js";

export const OPERATION_SUPPORT = {
  "debug/log": "supported",
  "event/onStart": "supported",
  "event/onTick": "supported",
  "event/receive": "supported",
  "event/send": "supported",
  "flow/sequence": "supported",
  "flow/setDelay": "supported",
  "variable/get": "supported",
  "variable/set": "supported",
};

export function isOperationSupported(op) {
  return OPERATION_SUPPORT[op] === "supported";
}

export function operationSupportMessage(declaration) {
  if (isOperationSupported(declaration.op)) return null;
  if (declaration.extension) {
    return `Unsupported interactivity extension operation ${declaration.extension}:${declaration.op} will run as no-op.`;
  }
  if (!BUILTIN_OPERATIONS.has(declaration.op)) {
    return `Operation ${declaration.op} is outside this game's supported KHR_interactivity subset and will run as no-op.`;
  }
  return `Operation ${declaration.op} is not enabled in this runtime and will run as no-op.`;
}
