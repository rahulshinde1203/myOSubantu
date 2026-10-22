/**
 * Ubuntu Server OS — Reactive State Store
 */

import { eventBus } from "./event_bus.js";

const initialState = {
  mode: "mock", // "mock" | "live"
  activeApp: "dashboard",
  metrics: null,
  services: [],
  terminalExpanded: false,
  activeWindowId: null,
  windows: {}
};

function createReactiveStore(state) {
  return new Proxy(state, {
    set(target, prop, value) {
      const prev = target[prop];
      target[prop] = value;
      eventBus.emit(`state:${prop}`, { value, prev });
      return true;
    }
  });
}

export const appState = createReactiveStore(initialState);
