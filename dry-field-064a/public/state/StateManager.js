// dry-field-064a/src/state/StateManager.js

class StateManager {
  constructor(initialState = {}) {
    this.state = { ...initialState };
    this.subscribers = [];
  }

  getState(path = []) {
    let current = this.state;
    for (const key of path) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  }

  setState(path, value) {
    let current = this.state;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    const lastKey = path[path.length - 1];
    const prevValue = current[lastKey];
    current[lastKey] = value;
    this.notify(path, prevValue, value);
  }

  subscribe(callback) {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(cb => cb !== callback);
    };
  }

  notify(path, prevValue, newValue) {
    for (const cb of this.subscribers) {
      cb({ path, prevValue, newValue });
    }
  }
}

export default StateManager; 