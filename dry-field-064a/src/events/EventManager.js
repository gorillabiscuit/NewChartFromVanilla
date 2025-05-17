/**
 * @fileoverview Event bus system for cross-module communication.
 * 
 * Module Boundaries:
 * - This module is the single source of truth for event handling
 * - All cross-module communication MUST go through this module
 * - Direct function calls between modules are forbidden
 * - Event handlers should be pure functions
 * 
 * Allowed Dependencies:
 * - /utils/* - For pure utility functions
 * 
 * Forbidden:
 * - Direct state mutations
 * - Direct DOM manipulation
 * - Window assignments
 * - Global variables
 * - Direct function calls between modules
 */

// dry-field-064a/src/event/EventManager.js

class EventManager {
  constructor(target = window) {
    this.target = target;
    this.listeners = [];
  }

  on(event, handler) {
    this.target.addEventListener(event, handler);
    this.listeners.push({ event, handler });
    return () => this.off(event, handler);
  }

  off(event, handler) {
    this.target.removeEventListener(event, handler);
    this.listeners = this.listeners.filter(
      l => l.event !== event || l.handler !== handler
    );
  }

  removeAll() {
    for (const { event, handler } of this.listeners) {
      this.target.removeEventListener(event, handler);
    }
    this.listeners = [];
  }
}

export default EventManager; 