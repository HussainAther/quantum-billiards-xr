import { defaultValueForType, normalizeValue, scalarValue } from "./constants.js";

export class InteractivityStateStore {
  constructor(graph, diagnostics) {
    this.graph = graph;
    this.diagnostics = diagnostics;
    this.values = [];
    this.variableIds = new Map();
    this.listeners = new Set();

    graph.variables.forEach((variable, index) => {
      const signature = graph.types[variable.type]?.signature;
      this.values[index] = variable.value
        ? normalizeValue(signature, variable.value)
        : defaultValueForType(signature);
      if (variable.extras?.id) this.variableIds.set(variable.extras.id, index);
    });

    this.#publish();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.describeVariables());
    return () => this.listeners.delete(listener);
  }

  getVariable(index) {
    return this.values[index]?.slice() ?? [undefined];
  }

  getVariableById(id) {
    const index = this.variableIds.get(id);
    return index === undefined ? undefined : this.getVariable(index);
  }

  getScalarById(id) {
    const value = this.getVariableById(id);
    return value === undefined ? undefined : scalarValue(value);
  }

  setVariable(index, value, source = "runtime") {
    const variable = this.graph.variables[index];
    const signature = this.graph.types[variable?.type]?.signature;
    if (!signature) {
      this.diagnostics?.warn(`Ignored write to unknown variable ${index}`, { source });
      return;
    }
    this.values[index] = normalizeValue(signature, value);
    this.diagnostics?.info(`variable[${index}] = ${this.values[index].join(",")}`);
    this.#publish();
  }

  describeVariables() {
    const result = {};
    this.graph.variables.forEach((variable, index) => {
      const id = variable.extras?.id || `var${index}`;
      const value = this.values[index] ?? [];
      const labels = variable.extras?.labels || variable.extras?.states;
      const scalar = scalarValue(value);
      result[id] = labels?.[scalar] ?? value.join(",");
    });
    return result;
  }

  #publish() {
    const variables = this.describeVariables();
    this.diagnostics?.setVariables(variables);
    for (const listener of this.listeners) listener(variables);
  }
}
