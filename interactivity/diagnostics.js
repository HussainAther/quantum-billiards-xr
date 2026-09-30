export class InteractivityDiagnostics {
  constructor({ limit = 80 } = {}) {
    this.limit = limit;
    this.status = "Idle";
    this.entries = [];
    this.variables = {};
    this.listeners = new Set();
  }

  setStatus(status) {
    this.status = status;
    this.#notify();
  }

  setVariables(variables) {
    this.variables = { ...variables };
    this.#notify();
  }

  info(message, data) {
    this.#push("info", message, data);
  }

  warn(message, data) {
    this.#push("warn", message, data);
  }

  error(message, data) {
    this.#push("error", message, data);
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => this.listeners.delete(listener);
  }

  snapshot() {
    return {
      status: this.status,
      variables: { ...this.variables },
      entries: this.entries.slice(),
    };
  }

  #push(level, message, data) {
    this.entries.unshift({
      level,
      message,
      data,
      time: new Date().toLocaleTimeString([], { hour12: false }),
    });
    if (this.entries.length > this.limit) this.entries.length = this.limit;
    this.#notify();
  }

  #notify() {
    const snapshot = this.snapshot();
    for (const listener of this.listeners) listener(snapshot);
  }
}

export class InteractivityDiagnosticsOverlay {
  constructor(elements, diagnostics) {
    this.elements = elements;
    this.unsubscribe = diagnostics.subscribe((snapshot) => this.render(snapshot));
  }

  setVisible(visible) {
    this.elements.root?.classList.toggle("hidden", !visible);
  }

  toggle() {
    this.setVisible(this.elements.root?.classList.contains("hidden"));
  }

  render(snapshot) {
    if (!this.elements.root) return;
    if (this.elements.status) this.elements.status.textContent = snapshot.status;
    if (this.elements.variables) {
      const rows = Object.entries(snapshot.variables).map(([key, value]) => `${key}: ${value}`);
      this.elements.variables.textContent = rows.length ? rows.join("\n") : "No variables";
    }
    if (this.elements.events) {
      this.elements.events.replaceChildren(
        ...snapshot.entries.slice(0, 9).map((entry) => {
          const li = document.createElement("li");
          li.className = entry.level;
          li.textContent = `[${entry.time}] ${entry.message}`;
          return li;
        })
      );
    }
  }

  dispose() {
    this.unsubscribe?.();
  }
}
