export class InteractivityEventBridge {
  constructor(diagnostics) {
    this.diagnostics = diagnostics;
    this.hostListeners = new Set();
    this.assetListeners = new Map();
  }

  onHostEvent(listener) {
    this.hostListeners.add(listener);
    return () => this.hostListeners.delete(listener);
  }

  emitHostEvent(id, payload = {}) {
    this.diagnostics?.info(`host -> asset ${id}`);
    for (const listener of this.hostListeners) listener({ id, payload });
  }

  onAssetEvent(id, listener) {
    if (!this.assetListeners.has(id)) this.assetListeners.set(id, new Set());
    this.assetListeners.get(id).add(listener);
    return () => this.assetListeners.get(id)?.delete(listener);
  }

  emitAssetEvent(id, payload = {}) {
    this.diagnostics?.info(`asset -> host ${id}`);
    const listeners = this.assetListeners.get(id);
    if (!listeners) return;
    for (const listener of listeners) listener(payload);
  }
}
