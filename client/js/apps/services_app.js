/**
 * Ubuntu Server OS — Services Application Panel
 */

import { toast } from "../components/toast.js";

export class ServicesApp {
  constructor(container, apiFacade) {
    this.container = container;
    this.api = apiFacade;
    this.services = [];
    this.filterText = "";
    this.render();
    this.loadServices();
  }

  render() {
    this.container.innerHTML = `
      <div class="card-panel" style="flex:1;">
        <div class="table-toolbar">
          <div class="search-input-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="svc-search-input" placeholder="Search systemd units...">
          </div>
          <div class="table-filter-group">
            <button class="btn btn-secondary btn-sm active" data-filter="all">All Units</button>
            <button class="btn btn-secondary btn-sm" data-filter="active">Active</button>
            <button class="btn btn-secondary btn-sm" data-filter="protected">Protected</button>
          </div>
        </div>

        <div class="table-responsive" style="flex:1;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Unit Name & Description</th>
                <th>Status</th>
                <th>Memory</th>
                <th>PID</th>
                <th>Uptime</th>
                <th style="text-align:right;">Control Actions</th>
              </tr>
            </thead>
            <tbody id="services-full-tbody">
              <tr><td colspan="6" class="skeleton" style="height:48px;"></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    const searchInput = this.container.querySelector("#svc-search-input");
    searchInput.addEventListener("input", (e) => {
      this.filterText = e.target.value.toLowerCase();
      this.renderRows();
    });
  }

  async loadServices() {
    try {
      const res = await this.api.getServices();
      if (res && res.data) {
        this.services = res.data;
        this.renderRows();
      }
    } catch (err) {
      console.error("Error loading services:", err);
    }
  }

  renderRows() {
    const tbody = this.container.querySelector("#services-full-tbody");
    if (!tbody) return;

    const filtered = this.services.filter(s =>
      s.name.toLowerCase().includes(this.filterText) ||
      s.display_name.toLowerCase().includes(this.filterText)
    );

    if (filtered.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:24px;color:var(--color-text-muted);">No matching systemd services found.</td></tr>`;
      return;
    }

    tbody.innerHTML = filtered.map(s => `
      <tr>
        <td>
          <div class="unit-cell">
            <span class="unit-name">${s.name} ${s.protected ? '<span style="font-size:10px;color:var(--color-brand-orange);margin-left:4px;">[CRITICAL]</span>' : ''}</span>
            <span class="unit-desc">${s.display_name}</span>
          </div>
        </td>
        <td>
          <span class="status-pill ${s.status}">
            <span class="indicator-dot"></span>
            <span>${s.status.toUpperCase()}</span>
          </span>
        </td>
        <td class="tabular-nums">${s.memory_mb} MB</td>
        <td class="tabular-nums">${s.pid}</td>
        <td class="tabular-nums">${s.uptime}</td>
        <td style="text-align:right;">
          <div style="display:inline-flex;gap:4px;">
            <button class="btn btn-secondary btn-sm svc-act-btn" data-svc="${s.name}" data-action="restart">Restart</button>
            <button class="btn btn-secondary btn-sm svc-act-btn" data-svc="${s.name}" data-action="reload">Reload</button>
            <button class="btn btn-danger btn-sm svc-act-btn" data-svc="${s.name}" data-action="stop">Stop</button>
          </div>
        </td>
      </tr>
    `).join("");

    tbody.querySelectorAll(".svc-act-btn").forEach(btn => {
      btn.addEventListener("click", async () => {
        const svc = btn.dataset.svc;
        const act = btn.dataset.action;
        btn.disabled = true;

        const res = await this.api.performServiceAction(svc, act);
        if (res.status === "success") {
          toast.success("Service Updated", res.message);
          this.loadServices();
        } else {
          toast.error("Security Guardrail", res.message);
        }
        btn.disabled = false;
      });
    });
  }
}
