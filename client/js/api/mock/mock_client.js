/**
 * Ubuntu Server OS — Mock API Client Adapter
 * Provides zero-backend data delivery matching the production API contract
 */

import { MockMetricsGenerator } from "./fixtures_metrics.js";
import { MOCK_SERVICES } from "./fixtures_services.js";
import { MOCK_FILESYSTEM } from "./fixtures_files.js";
import { MOCK_JOURNAL_LOGS } from "./fixtures_logs.js";

export class MockClient {
  constructor() {
    this.metricsGenerator = new MockMetricsGenerator();
    this.services = JSON.parse(JSON.stringify(MOCK_SERVICES));
  }

  async getMetrics() {
    // Simulate slight network latency (20ms)
    await new Promise(r => setTimeout(r, 20));
    return {
      status: "success",
      data: this.metricsGenerator.sample()
    };
  }

  async getServices() {
    await new Promise(r => setTimeout(r, 20));
    return {
      status: "success",
      data: this.services
    };
  }

  async performServiceAction(serviceName, action) {
    await new Promise(r => setTimeout(r, 80));
    const service = this.services.find(s => s.name === serviceName);
    if (!service) {
      throw new Error(`Service not found: ${serviceName}`);
    }

    if (service.protected && (action === "stop" || action === "disable")) {
      return {
        status: "fail",
        code: "ERR_CRITICAL_SERVICE_PROTECTED",
        message: `Protected service '${serviceName}' cannot be stopped via the web interface.`
      };
    }

    if (action === "restart" || action === "reload") {
      service.status = "active";
      service.sub_state = "running";
      service.uptime = "0m 2s";
    } else if (action === "stop") {
      service.status = "failed";
      service.sub_state = "inactive";
    } else if (action === "start") {
      service.status = "active";
      service.sub_state = "running";
    }

    return {
      status: "success",
      message: `Action '${action}' executed successfully on ${serviceName}.`,
      data: service
    };
  }

  async getFiles(path = "/var/www") {
    await new Promise(r => setTimeout(r, 25));
    const entries = MOCK_FILESYSTEM[path] || [];
    return {
      status: "success",
      data: {
        current_path: path,
        allowed_roots: ["/var/www", "/var/log"],
        entries
      }
    };
  }

  async getLogs(filter = {}) {
    await new Promise(r => setTimeout(r, 30));
    return {
      status: "success",
      data: {
        total: MOCK_JOURNAL_LOGS.length,
        entries: MOCK_JOURNAL_LOGS
      }
    };
  }
}
