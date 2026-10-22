/**
 * Ubuntu Server OS — Top Bar Component
 */

import { eventBus } from "../event_bus.js";
import { appState } from "../state.js";

export class Topbar {
  constructor(element, apiFacade) {
    this.el = element;
    this.api = apiFacade;
    this.render();
    this.startClock();
    this.bindEvents();
  }

  render() {
    this.el.innerHTML = `
      <div class="topbar-left">
        <button id="mobile-menu-btn" class="btn btn-secondary" style="display:none; padding:4px 8px;" aria-label="Toggle Navigation">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div class="topbar-brand">
          <svg class="brand-icon" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="12" cy="5" r="2"/>
            <circle cx="6" cy="16" r="2"/>
            <circle cx="18" cy="16" r="2"/>
          </svg>
          <span>Ubuntu Server OS</span>
        </div>
        <div class="topbar-divider"></div>
        <span class="topbar-hostname" id="tb-hostname">srv-prod-node01.lan</span>
        <span class="mode-badge" id="tb-mode-badge" title="Click to toggle prototype / live mode">
          <span class="indicator-dot" style="width:5px;height:5px;border-radius:50%;background:currentColor;"></span>
          <span id="tb-mode-text">DEMO / MOCK DATA</span>
        </span>
      </div>

      <div class="topbar-center">
        <div class="topbar-sparks">
          <div class="spark-mini" title="Aggregate CPU Load">
            <span>CPU</span>
            <div class="spark-bar-bg">
              <div class="spark-bar-fill cpu" id="tb-spark-cpu" style="width: 24%;"></div>
            </div>
            <span class="tabular-nums" id="tb-val-cpu">24%</span>
          </div>
          <div class="spark-mini" title="System Memory Allocation">
            <span>MEM</span>
            <div class="spark-bar-bg">
              <div class="spark-bar-fill mem" id="tb-spark-mem" style="width: 48%;"></div>
            </div>
            <span class="tabular-nums" id="tb-val-mem">48%</span>
          </div>
        </div>
      </div>

      <div class="topbar-right">
        <div class="topbar-vpn-indicator" title="Encrypted VPN Overlay Active">
          <span class="status-dot"></span>
          <span>ONLINE (VPN)</span>
        </div>
        <div class="topbar-divider"></div>
        <span class="topbar-clock tabular-nums" id="tb-clock">00:00:00 UTC</span>
        <div class="topbar-divider"></div>
        <div style="display:flex;align-items:center;gap:6px;font-size:var(--text-body);font-weight:600;color:var(--color-text-secondary);">
          <span style="width:24px;height:24px;border-radius:50%;background:var(--color-surface-elevated);border:1px solid var(--color-border-strong);display:flex;align-items:center;justify-content:center;color:var(--color-brand-orange);font-size:11px;">U</span>
          <span>admin</span>
        </div>
      </div>
    `;

    // Hook mode badge toggle
    const badge = this.el.querySelector("#tb-mode-badge");
    badge.addEventListener("click", () => {
      const newMode = appState.mode === "mock" ? "live" : "mock";
      appState.mode = newMode;
      this.api.setMode(newMode);
      this.updateModeBadge(newMode);
      eventBus.emit("mode:changed", newMode);
    });

    // Mobile menu toggle
    const menuBtn = this.el.querySelector("#mobile-menu-btn");
    menuBtn.addEventListener("click", () => {
      eventBus.emit("ui:toggle-dock");
    });
  }

  updateModeBadge(mode) {
    const badge = this.el.querySelector("#tb-mode-badge");
    const text = this.el.querySelector("#tb-mode-text");
    if (mode === "live") {
      badge.className = "mode-badge live";
      text.textContent = "LIVE SECURE";
    } else {
      badge.className = "mode-badge";
      text.textContent = "DEMO / MOCK DATA";
    }
  }

  updateMetrics(metrics) {
    if (!metrics) return;
    const cpuEl = this.el.querySelector("#tb-val-cpu");
    const memEl = this.el.querySelector("#tb-val-mem");
    const sparkCpu = this.el.querySelector("#tb-spark-cpu");
    const sparkMem = this.el.querySelector("#tb-spark-mem");

    if (cpuEl) cpuEl.textContent = `${Math.round(metrics.cpu.total_percent)}%`;
    if (memEl) memEl.textContent = `${Math.round(metrics.memory.percent)}%`;
    if (sparkCpu) sparkCpu.style.width = `${metrics.cpu.total_percent}%`;
    if (sparkMem) sparkMem.style.width = `${metrics.memory.percent}%`;
  }

  startClock() {
    const clockEl = this.el.querySelector("#tb-clock");
    const update = () => {
      const now = new Date();
      const hrs = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      clockEl.textContent = `${hrs}:${mins}:${secs} UTC`;
    };
    update();
    setInterval(update, 1000);
  }

  bindEvents() {
    eventBus.on("metrics:updated", (data) => this.updateMetrics(data));
  }
}
