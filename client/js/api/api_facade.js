/**
 * Ubuntu Server OS — API Client Facade
 * Allows seamless switching between Mock Prototype mode and Live Backend mode
 */

import { MockClient } from "./mock/mock_client.js";
import { LiveClient } from "./live_client.js";

export class ApiFacade {
  constructor(mode = null) {
    // Check localStorage preference, default to mock if not configured
    const savedMode = localStorage.getItem("ubuntuserver_api_mode");
    this.mode = mode || savedMode || "mock";
    this.mockClient = new MockClient();
    this.liveClient = new LiveClient();
  }

  setMode(mode) {
    if (mode !== "mock" && mode !== "live") {
      throw new Error(`Invalid mode: ${mode}`);
    }
    this.mode = mode;
    localStorage.setItem("ubuntuserver_api_mode", mode);
    window.dispatchEvent(new CustomEvent("ubuntu:apimode:changed", { detail: { mode } }));
  }

  getMode() {
    return this.mode;
  }

  getClient() {
    return this.mode === "live" ? this.liveClient : this.mockClient;
  }

  async getMetrics() {
    return this.getClient().getMetrics();
  }

  async getServices() {
    return this.getClient().getServices();
  }

  async performServiceAction(serviceName, action) {
    return this.getClient().performServiceAction(serviceName, action);
  }

  async getFiles(path) {
    return this.getClient().getFiles(path);
  }

  async getLogs(filter) {
    return this.getClient().getLogs(filter);
  }

  async getAuditLogs(limit, offset) {
    if (this.mode === "live") {
      return this.liveClient.getAuditLogs(limit, offset);
    }
    return { status: "success", logs: [] };
  }

  async getSystemInfo() {
    if (this.mode === "live") {
      return this.liveClient.getSystemInfo();
    }
    return {
      status: "success",
      system: { hostname: "ubuntu-server-prod-01", os: "Linux", release: "6.8.0-ubuntu", arch: "x86_64" }
    };
  }
}
