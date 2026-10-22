/**
 * Ubuntu Server OS — Main Dashboard Application (macOS Level + Visual htop, df -Th, & Grafana Telemetry)
 */

import { eventBus } from "../event_bus.js";
import { toast } from "../components/toast.js";

export class DashboardApp {
  constructor(container, apiFacade) {
    this.container = container;
    this.api = apiFacade;
    this.metricsInterval = null;
    this.isTabVisible = true;
    const hash = window.location.hash.replace("#", "");
    this.activeView = (hash === "htop" || hash === "df" || hash === "gauges") ? hash : "chart";
    this.latestMetrics = null;
    this.visibleSeries = { cpu: true, mem: true };
    this.activeRange = "60s";

    this.render();
    if (this.activeView !== "chart") {
      const tabToActivate = this.container.querySelector(`.segmented-tab[data-view="${this.activeView}"]`);
      if (tabToActivate) tabToActivate.click();
    }
    this.startPolling();
    this.setupVisibilityListener();
  }

  render() {
    this.container.innerHTML = `
      <!-- TOP 4 METRIC CARDS ROW -->
      <section class="metrics-row" aria-label="System Hardware Telemetry">
        <!-- CPU Card -->
        <div class="card-panel metric-card cpu" id="card-cpu">
          <div class="card-header">
            <span class="card-title"><span class="card-accent-dot" style="background:var(--color-accent-blue);"></span>CPU Utilization</span>
            <span class="metric-badge">8 Cores</span>
          </div>
          <div class="metric-body">
            <span class="metric-hero tabular-nums" id="cpu-hero">--%</span>
          </div>
          <div class="metric-sub" id="cpu-sub">AMD EPYC 7763 @ 3.20 GHz</div>
          <div class="metric-sparkline" id="cpu-sparkline">
            <svg viewBox="0 0 200 32" preserveAspectRatio="none"><path d="" fill="none" stroke="var(--color-accent-blue)" stroke-width="2"/></svg>
          </div>
        </div>

        <!-- Memory Card -->
        <div class="card-panel metric-card mem" id="card-mem">
          <div class="card-header">
            <span class="card-title"><span class="card-accent-dot" style="background:var(--color-status-green);"></span>Memory Allocation</span>
            <span class="metric-badge" id="mem-badge">--%</span>
          </div>
          <div class="metric-body">
            <span class="metric-hero tabular-nums" id="mem-hero">-- GB</span>
          </div>
          <div class="metric-sub" id="mem-sub">-- GB of 8.00 GB Total</div>
          <div class="progress-bar-container" title="Memory Allocation">
            <div class="progress-segment active-mem" id="mem-progress-bar" style="width: 48%;"></div>
          </div>
        </div>

        <!-- Storage Card -->
        <div class="card-panel metric-card disk" id="card-disk">
          <div class="card-header">
            <span class="card-title"><span class="card-accent-dot" style="background:var(--color-status-amber);"></span>Storage Capacity</span>
            <span class="metric-badge">/dev/sda1</span>
          </div>
          <div class="metric-body">
            <span class="metric-hero tabular-nums" id="disk-hero">42%</span>
          </div>
          <div class="metric-sub" id="disk-sub">84.4 GB used of 200.0 GB</div>
          <div class="progress-bar-container" title="Disk Space Usage">
            <div class="progress-segment" style="width: 42%; background: var(--color-status-amber);"></div>
          </div>
        </div>

        <!-- Network Card -->
        <div class="card-panel metric-card net" id="card-net">
          <div class="card-header">
            <span class="card-title"><span class="card-accent-dot" style="background:var(--color-accent-violet);"></span>Network Throughput</span>
            <span class="metric-badge">eth0</span>
          </div>
          <div class="metric-body">
            <span class="metric-hero tabular-nums" id="net-hero">-- MB/s</span>
          </div>
          <div class="metric-sub" id="net-sub">RX: -- MB/s · TX: -- MB/s</div>
          <div class="metric-sparkline" id="net-sparkline">
            <svg viewBox="0 0 200 32" preserveAspectRatio="none"><path d="" fill="none" stroke="var(--color-accent-violet)" stroke-width="2"/></svg>
          </div>
        </div>
      </section>

      <!-- MAIN WORKSPACE CONTENT SPLIT -->
      <section class="workspace-content-grid">
        <div class="primary-stage">
          <!-- VISUAL COMMAND & GRAFANA DIAGNOSTICS PANEL -->
          <div class="card-panel chart-panel">
            <div class="card-header">
              <div style="display:flex;align-items:center;gap:var(--space-md);flex-wrap:wrap;">
                <span class="card-title" id="center-panel-title">System Performance</span>
                <!-- macOS Segmented Control Tabs (Now featuring Grafana Gauges) -->
                <div class="segmented-control" id="diag-segmented-tabs">
                  <span class="segmented-tab active" data-view="chart">Telemetry Chart</span>
                  <span class="segmented-tab" data-view="gauges">Grafana Gauges</span>
                  <span class="segmented-tab" data-view="htop">htop Monitor</span>
                  <span class="segmented-tab" data-view="df">df -Th Storage</span>
                </div>
              </div>
              <div style="display:flex;align-items:center;gap:10px;">
                <!-- Grafana Live Alert Status Badge -->
                <span class="grafana-alert-pill normal" id="grafana-alert-pill">
                  <span class="indicator-dot" style="width:5px;height:5px;border-radius:50%;background:currentColor;"></span>
                  <span id="grafana-alert-text">NORMAL</span>
                </span>
                <!-- Grafana Time Range Controls -->
                <div class="chart-controls" id="chart-controls-box">
                  <button class="chart-tab active" data-range="60s">60s</button>
                  <button class="chart-tab" data-range="5m">5m</button>
                  <button class="chart-tab" data-range="15m">15m</button>
                  <button class="chart-tab" data-range="1h">1h</button>
                </div>
              </div>
            </div>

            <!-- VIEW 1: Rolling Dual-Line Telemetry Area Chart with Grafana Crosshair -->
            <div id="view-chart" class="diag-view-pane">
              <div class="chart-canvas-wrapper" id="perf-chart-wrapper" style="position:relative;cursor:crosshair;">
                <svg id="perf-chart-svg" viewBox="0 0 600 180" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="gradCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#2196F3" stop-opacity="0.30"/>
                      <stop offset="100%" stop-color="#2196F3" stop-opacity="0.0"/>
                    </linearGradient>
                    <linearGradient id="gradMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#2DDC88" stop-opacity="0.25"/>
                      <stop offset="100%" stop-color="#2DDC88" stop-opacity="0.0"/>
                    </linearGradient>
                  </defs>
                  <!-- Baseline Grids -->
                  <line x1="0" y1="45" x2="600" y2="45" stroke="#102541" stroke-dasharray="2 4"/>
                  <line x1="0" y1="90" x2="600" y2="90" stroke="#102541" stroke-dasharray="2 4"/>
                  <line x1="0" y1="135" x2="600" y2="135" stroke="#102541" stroke-dasharray="2 4"/>

                  <!-- Grafana Threshold Lines (80% Warning & 90% Critical) -->
                  <line x1="0" y1="36" x2="600" y2="36" class="chart-threshold-line warn" stroke="#FFB547"/>
                  <text x="590" y="32" fill="#FFB547" font-size="9" font-family="'SF Mono',monospace" text-anchor="end" opacity="0.85">WARN 80%</text>

                  <line x1="0" y1="18" x2="600" y2="18" class="chart-threshold-line crit" stroke="#FF5263"/>
                  <text x="590" y="14" fill="#FF5263" font-size="9" font-family="'SF Mono',monospace" text-anchor="end" opacity="0.85">CRIT 90%</text>

                  <!-- Paths -->
                  <path id="chart-area-cpu" fill="url(#gradCpu)"/>
                  <path id="chart-line-cpu" fill="none" stroke="var(--color-accent-blue)" stroke-width="2"/>
                  <path id="chart-area-mem" fill="url(#gradMem)"/>
                  <path id="chart-line-mem" fill="none" stroke="var(--color-status-green)" stroke-width="2"/>
                </svg>

                <!-- Grafana Interactive Crosshair Overlay Elements -->
                <div class="grafana-crosshair" id="grafana-crosshair"></div>
                <div class="grafana-crosshair-dot cpu" id="crosshair-dot-cpu"></div>
                <div class="grafana-crosshair-dot mem" id="crosshair-dot-mem"></div>

                <!-- Grafana Floating Tooltip Inspector -->
                <div class="grafana-tooltip" id="grafana-tooltip">
                  <div class="grafana-tooltip-header">
                    <span id="tt-time">Time: --:--:--</span>
                    <span id="tt-delta">-0s</span>
                  </div>
                  <div class="grafana-tooltip-row">
                    <div class="grafana-tooltip-series">
                      <span style="width:6px;height:6px;border-radius:50%;background:#2196F3;"></span>
                      <span>CPU Utilization</span>
                    </div>
                    <span class="grafana-tooltip-badge" style="color:#2196F3;" id="tt-val-cpu">--%</span>
                  </div>
                  <div class="grafana-tooltip-row">
                    <div class="grafana-tooltip-series">
                      <span style="width:6px;height:6px;border-radius:50%;background:#2DDC88;"></span>
                      <span>Memory Allocation</span>
                    </div>
                    <span class="grafana-tooltip-badge" style="color:#2DDC88;" id="tt-val-mem">--%</span>
                  </div>
                  <div style="margin-top:6px;padding-top:4px;border-top:1px solid rgba(255,255,255,0.06);display:flex;justify-content:space-between;font-size:9px;color:#94A3B8;">
                    <span>Alert Status:</span>
                    <span style="color:#2DDC88;font-weight:700;" id="tt-status">OK</span>
                  </div>
                </div>
              </div>

              <!-- Interactive Legend (Click to solo/mute) -->
              <div class="chart-legend" id="chart-interactive-legend">
                <div class="legend-item" data-series="cpu" title="Click to solo / toggle CPU">
                  <div class="legend-line cpu"></div>
                  <span>CPU Utilization</span>
                </div>
                <div class="legend-item" data-series="mem" title="Click to solo / toggle Memory">
                  <div class="legend-line mem"></div>
                  <span>Memory Allocation</span>
                </div>
                <span style="font-size:10px;color:#64748B;margin-left:auto;">Hover chart to inspect data point · Click legend to toggle</span>
              </div>

              <!-- Grafana PromQL Metric Query Editor Bar -->
              <div class="grafana-query-bar">
                <span class="promql-tag">PromQL</span>
                <select class="promql-select" id="promql-query-select">
                  <option value="node_cpu_utilization_percent">node_cpu_utilization_percent (CPU Total)</option>
                  <option value="node_memory_MemAvailable_bytes">node_memory_MemAvailable_bytes (Memory Free/Used)</option>
                  <option value="rate(node_network_receive_bytes_total[1m])">rate(node_network_receive_bytes_total[1m]) (RX Throughput)</option>
                  <option value="node_load1">node_load1 (1m Load Average)</option>
                </select>
                <button class="promql-run-btn" id="promql-run-btn">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  <span>Run</span>
                </button>
                <span class="promql-meta" id="promql-latency-display">Latency: 14ms · 60 pts</span>
              </div>
            </div>

            <!-- VIEW 2: Grafana Circular Arc Gauges & Per-Core Bar Gauges -->
            <div id="view-gauges" class="diag-view-pane" style="display:none;">
              <div class="grafana-gauges-container">
                <!-- 4 Circular Arc Gauges Grid -->
                <div class="grafana-dial-grid" id="grafana-arc-dials">
                  <!-- Populated by JS -->
                </div>

                <!-- Per-Core Bar Gauges Box -->
                <div class="grafana-bargauge-box">
                  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:6px;">
                    <span style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.04em;">Per-Core CPU Heatmap &amp; Bar Gauges (8 Cores)</span>
                    <span style="font-family:'SF Mono',monospace;font-size:10px;color:#38BDF8;">AMD EPYC 7763 · SMT Active</span>
                  </div>
                  <div class="grafana-bargauge-grid" id="grafana-cores-bargauges">
                    <!-- Populated by JS -->
                  </div>
                </div>
              </div>
            </div>

            <!-- VIEW 3: htop Terminal-Type Realtime Process Monitor -->
            <div id="view-htop" class="diag-view-pane" style="display:none;">
              <div class="htop-container">
                <div class="htop-meter-grid" id="htop-core-meters"></div>
                <div class="htop-summary-row">
                  <div>Tasks: <span class="htop-tasks" id="htop-tasks-str">142, 248 thr; 1 running</span></div>
                  <div>Load average: <span class="htop-load" id="htop-load-str">0.42 0.38 0.31</span></div>
                  <div>Uptime: <span class="htop-uptime" id="htop-uptime-str">14 days, 06:22:15</span></div>
                </div>
                <div style="max-height:160px;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.06);">
                  <table class="htop-table">
                    <thead>
                      <tr>
                        <th>PID</th><th>USER</th><th>PRI</th><th>NI</th><th>VIRT</th><th>RES</th><th>SHR</th><th>S</th><th>CPU%</th><th>MEM%</th><th>TIME+</th><th>Command</th>
                      </tr>
                    </thead>
                    <tbody id="htop-procs-tbody"></tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- VIEW 4: df -Th Visual Storage Breakdown Bars -->
            <div id="view-df" class="diag-view-pane" style="display:none;">
              <div class="df-container" id="df-partitions-list"></div>
            </div>
          </div>

          <!-- SYSTEM SERVICES SUMMARY TABLE -->
          <div class="card-panel">
            <div class="card-header">
              <span class="card-title">Managed Systemd Services</span>
              <button class="btn btn-secondary btn-sm" id="btn-view-all-services">Manage Services →</button>
            </div>
            <div class="table-responsive">
              <table class="data-table" id="dashboard-services-table">
                <thead>
                  <tr>
                    <th>Service Unit</th><th>Status</th><th>Memory</th><th>CPU</th><th style="text-align:right;">Actions</th>
                  </tr>
                </thead>
                <tbody id="dash-services-tbody"></tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- RIGHT RAIL ASIDE -->
        <aside class="auxiliary-stage">
          <!-- Quick Action Commands -->
          <div class="card-panel">
            <div class="card-header"><span class="card-title">Quick Actions</span></div>
            <div class="quick-actions-grid">
              <button class="btn btn-secondary btn-qa" id="qa-restart-nginx">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
                <span>Restart Nginx Server</span>
              </button>
              <button class="btn btn-secondary btn-qa" id="qa-flush-dns">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                <span>Flush Systemd DNS Cache</span>
              </button>
              <button class="btn btn-secondary btn-qa" id="qa-export-logs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"></path></svg>
                <span>Export Diagnostics Bundle</span>
              </button>
              <button class="btn btn-danger btn-qa" id="qa-reboot-host">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                <span>Reboot Host...</span>
              </button>
            </div>
          </div>

          <!-- Server Specifications Info -->
          <div class="card-panel">
            <div class="card-header"><span class="card-title">Server Information</span></div>
            <div class="info-kv-list">
              <div class="info-kv-row"><span class="info-key">OS Release</span><span class="info-val">Ubuntu 24.04 LTS</span></div>
              <div class="info-kv-row"><span class="info-key">Linux Kernel</span><span class="info-val">6.8.0-31-generic</span></div>
              <div class="info-kv-row"><span class="info-key">Architecture</span><span class="info-val">x86_64</span></div>
              <div class="info-kv-row"><span class="info-key">System Uptime</span><span class="info-val" id="server-uptime">14d 6h 22m</span></div>
              <div class="info-kv-row"><span class="info-key">IP Address</span><span class="info-val">10.0.10.42</span></div>
            </div>
          </div>
        </aside>
      </section>
    `;

    this.bindSegmentedTabs();
    this.bindChartControls();
    this.bindGrafanaInspector();
    this.bindPromQLBar();
    this.bindQuickActions();
    this.loadServicesTable();
  }

  bindSegmentedTabs() {
    const tabs = this.container.querySelectorAll(".segmented-tab");
    const chartControls = this.container.querySelector("#chart-controls-box");
    const titleEl = this.container.querySelector("#center-panel-title");

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        const view = tab.dataset.view;
        this.activeView = view;

        const pChart = this.container.querySelector("#view-chart");
        const pGauges = this.container.querySelector("#view-gauges");
        const pHtop = this.container.querySelector("#view-htop");
        const pDf = this.container.querySelector("#view-df");

        pChart.style.display = view === "chart" ? "block" : "none";
        pGauges.style.display = view === "gauges" ? "block" : "none";
        pHtop.style.display = view === "htop" ? "block" : "none";
        pDf.style.display = view === "df" ? "block" : "none";

        if (view === "chart") {
          titleEl.textContent = "System Performance";
          chartControls.style.display = "flex";
        } else if (view === "gauges") {
          titleEl.textContent = "Grafana Gauges & Heatmaps";
          chartControls.style.display = "flex";
          if (this.latestMetrics) this.renderGrafanaGauges(this.latestMetrics);
        } else if (view === "htop") {
          titleEl.textContent = "htop Process Monitor";
          chartControls.style.display = "none";
          if (this.latestMetrics) this.renderHtop(this.latestMetrics);
        } else if (view === "df") {
          titleEl.textContent = "Filesystems (df -Th)";
          chartControls.style.display = "none";
          if (this.latestMetrics) this.renderDfTh(this.latestMetrics);
        }
      });
    });
  }

  bindChartControls() {
    const timeTabs = this.container.querySelectorAll(".chart-tab");
    timeTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        timeTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        this.activeRange = tab.dataset.range;
        toast.info("Grafana Time Window", `Viewport scaled to Last ${this.activeRange}`);
        if (this.latestMetrics) {
          this.renderAreaChart(this.latestMetrics.cpu.history, this.latestMetrics.memory.history);
        }
      });
    });
  }

  bindGrafanaInspector() {
    const wrapper = this.container.querySelector("#perf-chart-wrapper");
    const crosshair = this.container.querySelector("#grafana-crosshair");
    const dotCpu = this.container.querySelector("#crosshair-dot-cpu");
    const dotMem = this.container.querySelector("#crosshair-dot-mem");
    const tooltip = this.container.querySelector("#grafana-tooltip");
    const ttTime = this.container.querySelector("#tt-time");
    const ttDelta = this.container.querySelector("#tt-delta");
    const ttCpu = this.container.querySelector("#tt-val-cpu");
    const ttMem = this.container.querySelector("#tt-val-mem");
    const ttStatus = this.container.querySelector("#tt-status");

    if (!wrapper) return;

    wrapper.addEventListener("mousemove", (e) => {
      if (!this.latestMetrics || !this.latestMetrics.cpu || !this.latestMetrics.cpu.history) return;

      const rect = wrapper.getBoundingClientRect();
      const mouseX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const ratio = mouseX / rect.width;

      const cpuHistory = this.latestMetrics.cpu.history;
      const memHistory = this.latestMetrics.memory.history;
      const totalPoints = cpuHistory.length;

      const index = Math.min(totalPoints - 1, Math.max(0, Math.round(ratio * (totalPoints - 1))));
      const valCpu = cpuHistory[index] || 0;
      const valMem = memHistory[index] || 0;

      // Position crosshair vertical line
      crosshair.style.display = "block";
      crosshair.style.left = `${mouseX}px`;

      // Position dots (SVG coordinate h=180)
      const yCpuRatio = 1 - (valCpu / 100);
      const yMemRatio = 1 - (valMem / 100);

      dotCpu.style.display = this.visibleSeries.cpu ? "block" : "none";
      dotCpu.style.left = `${mouseX}px`;
      dotCpu.style.top = `${yCpuRatio * rect.height}px`;

      dotMem.style.display = this.visibleSeries.mem ? "block" : "none";
      dotMem.style.left = `${mouseX}px`;
      dotMem.style.top = `${yMemRatio * rect.height}px`;

      // Update Tooltip values
      tooltip.style.display = "block";
      const secondsAgo = (totalPoints - 1 - index) * 2;
      const now = new Date();
      const pointTime = new Date(now.getTime() - secondsAgo * 1000);
      const hrs = String(pointTime.getUTCHours()).padStart(2, '0');
      const mins = String(pointTime.getUTCMinutes()).padStart(2, '0');
      const secs = String(pointTime.getUTCSeconds()).padStart(2, '0');

      ttTime.textContent = `${hrs}:${mins}:${secs} UTC`;
      ttDelta.textContent = secondsAgo === 0 ? "now" : `-${secondsAgo}s`;
      ttCpu.textContent = `${valCpu.toFixed(1)}%`;
      ttMem.textContent = `${valMem.toFixed(1)}%`;

      const isAlerting = valCpu > 80 || valMem > 90;
      ttStatus.textContent = isAlerting ? (valCpu > 80 ? "ALERT: CPU > 80%" : "ALERT: MEM > 90%") : "OK";
      ttStatus.style.color = isAlerting ? "var(--color-status-red)" : "var(--color-status-green)";

      // Tooltip positioning with bounds check
      const tooltipW = 180;
      let ttLeft = mouseX + 16;
      if (ttLeft + tooltipW > rect.width) {
        ttLeft = mouseX - tooltipW - 16;
      }
      tooltip.style.left = `${ttLeft}px`;
      tooltip.style.top = `20px`;
    });

    wrapper.addEventListener("mouseleave", () => {
      crosshair.style.display = "none";
      dotCpu.style.display = "none";
      dotMem.style.display = "none";
      tooltip.style.display = "none";
    });

    // Interactive Legend Toggle
    const legendItems = this.container.querySelectorAll("#chart-interactive-legend .legend-item");
    legendItems.forEach(item => {
      item.addEventListener("click", () => {
        const series = item.dataset.series;
        this.visibleSeries[series] = !this.visibleSeries[series];

        if (this.visibleSeries[series]) {
          item.classList.remove("muted");
        } else {
          item.classList.add("muted");
        }

        if (this.latestMetrics) {
          this.renderAreaChart(this.latestMetrics.cpu.history, this.latestMetrics.memory.history);
        }
      });
    });
  }

  bindPromQLBar() {
    const runBtn = this.container.querySelector("#promql-run-btn");
    const querySelect = this.container.querySelector("#promql-query-select");
    const latencyDisplay = this.container.querySelector("#promql-latency-display");

    if (!runBtn || !querySelect) return;

    const executeQuery = () => {
      const q = querySelect.value;
      const latency = Math.floor(Math.random() * 14) + 8;
      latencyDisplay.textContent = `Latency: ${latency}ms · 60 pts`;
      toast.info("PromQL Query Executed", `Expression: ${q} (${latency}ms)`);
    };

    runBtn.addEventListener("click", executeQuery);
    querySelect.addEventListener("change", executeQuery);
  }

  async fetchAndRenderMetrics() {
    if (!this.isTabVisible) return;
    try {
      const res = await this.api.getMetrics();
      if (res && res.data) {
        this.latestMetrics = res.data;
        this.updateMetricsUI(res.data);
        if (this.activeView === "gauges") this.renderGrafanaGauges(res.data);
        if (this.activeView === "htop") this.renderHtop(res.data);
        if (this.activeView === "df") this.renderDfTh(res.data);
        eventBus.emit("metrics:updated", res.data);
      }
    } catch (err) {
      console.error("Telemetry fetch error:", err);
    }
  }

  updateMetricsUI(data) {
    // CPU
    const cpuHero = this.container.querySelector("#cpu-hero");
    if (cpuHero) cpuHero.textContent = `${data.cpu.total_percent.toFixed(1)}%`;
    this.renderSparkline("cpu-sparkline", data.cpu.history, "#2196F3");

    // Memory
    const memHero = this.container.querySelector("#mem-hero");
    const memBadge = this.container.querySelector("#mem-badge");
    const memSub = this.container.querySelector("#mem-sub");
    const memProgress = this.container.querySelector("#mem-progress-bar");
    if (memHero) memHero.textContent = `${data.memory.used_gb.toFixed(2)} GB`;
    if (memBadge) memBadge.textContent = `${data.memory.percent.toFixed(1)}%`;
    if (memSub) memSub.textContent = `${data.memory.used_gb} GB of ${data.memory.total_gb.toFixed(1)} GB Total`;
    if (memProgress) memProgress.style.width = `${data.memory.percent}%`;

    // Network
    const netHero = this.container.querySelector("#net-hero");
    const netSub = this.container.querySelector("#net-sub");
    if (netHero) netHero.textContent = `${(data.network.rx_mb_per_sec + data.network.tx_mb_per_sec).toFixed(2)} MB/s`;
    if (netSub) netSub.textContent = `RX: ${data.network.rx_mb_per_sec.toFixed(2)} MB/s · TX: ${data.network.tx_mb_per_sec.toFixed(2)} MB/s`;
    this.renderSparkline("net-sparkline", data.network.history_rx, "#A970FF");

    // Alert Pill Check (> 80% is warning/alerting)
    const alertPill = this.container.querySelector("#grafana-alert-pill");
    const alertText = this.container.querySelector("#grafana-alert-text");
    if (alertPill && alertText) {
      if (data.cpu.total_percent > 80) {
        alertPill.className = "grafana-alert-pill alerting";
        alertText.textContent = `CPU WARN (${data.cpu.total_percent.toFixed(0)}%)`;
      } else if (data.memory.percent > 90) {
        alertPill.className = "grafana-alert-pill alerting";
        alertText.textContent = `MEM CRIT (${data.memory.percent.toFixed(0)}%)`;
      } else {
        alertPill.className = "grafana-alert-pill normal";
        alertText.textContent = "NORMAL";
      }
    }

    // Performance Area Chart
    if (this.activeView === "chart") {
      this.renderAreaChart(data.cpu.history, data.memory.history);
    }
  }

  renderGrafanaGauges(data) {
    const dialsContainer = this.container.querySelector("#grafana-arc-dials");
    const bargaugeContainer = this.container.querySelector("#grafana-cores-bargauges");

    if (!dialsContainer || !bargaugeContainer) return;

    // Helper to generate SVG Arc Gauge
    const makeGaugeHtml = (title, valStr, percent, color, sub) => {
      // 240 degree circular arc (circumference = 2 * PI * 38 ≈ 238.76)
      const arcCircumference = 238.76 * (240 / 360); // ~159.17
      const offset = arcCircumference - (percent / 100) * arcCircumference;

      return `
        <div class="grafana-gauge-card">
          <div class="grafana-gauge-title">${title}</div>
          <svg class="grafana-gauge-svg" viewBox="0 0 120 80">
            <!-- Background Track Arc -->
            <path d="M 22 68 A 38 38 0 1 1 98 68" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8" stroke-linecap="round"/>
            <!-- Active Fill Arc -->
            <path d="M 22 68 A 38 38 0 1 1 98 68" fill="none" stroke="${color}" stroke-width="8" stroke-dasharray="159.17" stroke-dashoffset="${offset}" stroke-linecap="round" style="transition:stroke-dashoffset 400ms ease;"/>
          </svg>
          <div class="grafana-gauge-val" style="color:${color};">${valStr}</div>
          <div class="grafana-gauge-sub">${sub}</div>
        </div>
      `;
    };

    const cpuPct = data.cpu.total_percent;
    const cpuColor = cpuPct > 80 ? "#FF5263" : cpuPct > 65 ? "#FFB547" : "#2196F3";

    const memPct = data.memory.percent;
    const memColor = memPct > 85 ? "#FF5263" : memPct > 70 ? "#FFB547" : "#2DDC88";

    const diskPct = 42;
    const diskColor = "#FFB547";

    const load1 = data.htop ? parseFloat(data.htop.load_avg.split(" ")[0]) || 0.42 : 0.42;
    const loadPct = Math.min(100, (load1 / 8.0) * 100);
    const loadColor = loadPct > 75 ? "#FF5263" : "#38BDF8";

    dialsContainer.innerHTML = `
      ${makeGaugeHtml("CPU Utilization", `${cpuPct.toFixed(1)}%`, cpuPct, cpuColor, "8 Cores Total")}
      ${makeGaugeHtml("Memory Allocation", `${data.memory.used_gb.toFixed(1)} GB`, memPct, memColor, `${memPct.toFixed(0)}% of 8.0 GB`)}
      ${makeGaugeHtml("Storage Usage", "42%", diskPct, diskColor, "84.4 GB of 200 GB")}
      ${makeGaugeHtml("1m Load Average", `${load1.toFixed(2)}`, loadPct, loadColor, "Capacity: 8.00")}
    `;

    // 8-Core Bar Gauges
    if (data.cpu.cores) {
      bargaugeContainer.innerHTML = data.cpu.cores.map((coreLoad, idx) => {
        const barColor = coreLoad > 75 ? "linear-gradient(90deg, #F59E0B, #EF4444)" : coreLoad > 50 ? "linear-gradient(90deg, #10B981, #F59E0B)" : "linear-gradient(90deg, #0284C7, #10B981)";
        return `
          <div class="grafana-bargauge-row">
            <span class="grafana-bargauge-label">Core ${idx}</span>
            <div class="grafana-bargauge-track">
              <div class="grafana-bargauge-fill" style="width:${coreLoad}%;background:${barColor};"></div>
            </div>
            <span class="grafana-bargauge-val tabular-nums" style="color:${coreLoad > 75 ? '#FF5263' : '#F1F5F9'};">${coreLoad.toFixed(1)}%</span>
          </div>
        `;
      }).join("");
    }
  }

  renderHtop(data) {
    const metersContainer = this.container.querySelector("#htop-core-meters");
    const procsTbody = this.container.querySelector("#htop-procs-tbody");
    const tasksStr = this.container.querySelector("#htop-tasks-str");
    const loadStr = this.container.querySelector("#htop-load-str");
    const uptimeStr = this.container.querySelector("#htop-uptime-str");

    if (tasksStr && data.htop) tasksStr.textContent = `${data.htop.tasks_count}, ${data.htop.threads_count} thr; ${data.htop.running_tasks} running`;
    if (loadStr && data.htop) loadStr.textContent = data.htop.load_avg;
    if (uptimeStr && data.htop) uptimeStr.textContent = data.htop.uptime_str;

    if (metersContainer && data.cpu.cores) {
      metersContainer.innerHTML = data.cpu.cores.map((coreLoad, idx) => `
        <div class="htop-meter-row">
          <span class="htop-core-num">${idx + 1}</span>
          <div class="htop-bar-box">
            <div class="htop-bar-active" style="width:${coreLoad}%;background:${coreLoad > 75 ? 'var(--color-status-red)' : coreLoad > 50 ? 'var(--color-status-amber)' : 'var(--color-status-green)'};"></div>
          </div>
          <span class="htop-meter-val tabular-nums">[${coreLoad.toFixed(1)}%]</span>
        </div>
      `).join("");
    }

    if (procsTbody && data.htop && data.htop.processes) {
      procsTbody.innerHTML = data.htop.processes.map(p => `
        <tr>
          <td>${p.pid}</td>
          <td>${p.user}</td>
          <td>${p.pri}</td>
          <td>${p.ni}</td>
          <td>${p.virt}</td>
          <td>${p.res}</td>
          <td>${p.shr}</td>
          <td>${p.s}</td>
          <td style="color:${parseFloat(p.cpu) > 10 ? 'var(--color-status-amber)' : '#F0F4F8'};font-weight:600;">${p.cpu}</td>
          <td>${p.mem}</td>
          <td>${p.time}</td>
          <td class="htop-cmd">${p.cmd}</td>
        </tr>
      `).join("");
    }
  }

  renderDfTh(data) {
    const container = this.container.querySelector("#df-partitions-list");
    if (!container || !data.filesystems) return;

    container.innerHTML = data.filesystems.map(fs => {
      let barClass = "safe";
      if (fs.percent > 85) barClass = "danger";
      else if (fs.percent > 65) barClass = "warn";

      return `
        <div class="df-item">
          <div class="df-header">
            <div class="df-mount">
              <span>${fs.mount}</span>
              <span class="df-device">${fs.filesystem}</span>
              <span class="df-type-tag">${fs.type}</span>
            </div>
            <div class="df-stats tabular-nums">
              <span>${fs.used} used</span>
              <span style="color:var(--color-text-muted);">/</span>
              <span>${fs.size}</span>
              <span style="font-weight:700;color:${fs.percent > 85 ? 'var(--color-status-red)' : fs.percent > 65 ? 'var(--color-status-amber)' : 'var(--color-status-green)'};">(${fs.percent}%)</span>
            </div>
          </div>
          <div class="df-bar-wrapper" title="${fs.mount} capacity: ${fs.percent}%">
            <div class="df-bar-fill ${barClass}" style="width: ${fs.percent}%;"></div>
          </div>
        </div>
      `;
    }).join("");
  }

  renderSparkline(containerId, dataPoints, strokeColor) {
    const el = this.container.querySelector(`#${containerId} svg path`);
    if (!el || !dataPoints || dataPoints.length < 2) return;

    const w = 200, h = 32;
    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints, min + 1);
    const stepX = w / (dataPoints.length - 1);

    const points = dataPoints.map((val, idx) => {
      const x = (idx * stepX).toFixed(1);
      const y = (h - ((val - min) / (max - min)) * (h - 4) - 2).toFixed(1);
      return `${x},${y}`;
    });

    el.setAttribute("d", `M ${points.join(" L ")}`);
    el.setAttribute("stroke", strokeColor);
  }

  renderAreaChart(cpuPoints, memPoints) {
    const lineCpu = this.container.querySelector("#chart-line-cpu");
    const areaCpu = this.container.querySelector("#chart-area-cpu");
    const lineMem = this.container.querySelector("#chart-line-mem");
    const areaMem = this.container.querySelector("#chart-area-mem");

    if (!lineCpu || !cpuPoints || cpuPoints.length < 2) return;

    const w = 600, h = 180;
    const stepX = w / (cpuPoints.length - 1);

    const makePaths = (pts) => {
      const linePts = pts.map((val, idx) => {
        const x = (idx * stepX).toFixed(1);
        const y = (h - (val / 100) * (h - 10) - 5).toFixed(1);
        return `${x},${y}`;
      });
      const lineStr = `M ${linePts.join(" L ")}`;
      const areaStr = `${lineStr} L ${w},${h} L 0,${h} Z`;
      return { lineStr, areaStr };
    };

    if (this.visibleSeries.cpu) {
      const cpu = makePaths(cpuPoints);
      lineCpu.style.display = "block";
      areaCpu.style.display = "block";
      lineCpu.setAttribute("d", cpu.lineStr);
      areaCpu.setAttribute("d", cpu.areaStr);
    } else {
      lineCpu.style.display = "none";
      areaCpu.style.display = "none";
    }

    if (this.visibleSeries.mem) {
      const mem = makePaths(memPoints);
      lineMem.style.display = "block";
      areaMem.style.display = "block";
      lineMem.setAttribute("d", mem.lineStr);
      areaMem.setAttribute("d", mem.areaStr);
    } else {
      lineMem.style.display = "none";
      areaMem.style.display = "none";
    }
  }

  async loadServicesTable() {
    try {
      const res = await this.api.getServices();
      const tbody = this.container.querySelector("#dash-services-tbody");
      if (!tbody || !res.data) return;

      tbody.innerHTML = res.data.slice(0, 4).map(s => `
        <tr>
          <td>
            <div class="unit-cell">
              <span class="unit-name">${s.name}</span>
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
          <td class="tabular-nums">${s.cpu_percent}%</td>
          <td style="text-align:right;">
            <button class="btn btn-secondary btn-sm btn-restart-svc" data-service="${s.name}">Restart</button>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll(".btn-restart-svc").forEach(btn => {
        btn.addEventListener("click", async () => {
          const svcName = btn.dataset.service;
          btn.disabled = true;
          btn.textContent = "Restarting...";
          const actRes = await this.api.performServiceAction(svcName, "restart");
          if (actRes.status === "success") {
            toast.success("Service Restarted", actRes.message);
            this.loadServicesTable();
          } else {
            toast.error("Action Prohibited", actRes.message);
          }
          btn.disabled = false;
          btn.textContent = "Restart";
        });
      });
    } catch (err) {
      console.error("Error loading services table:", err);
    }
  }

  bindQuickActions() {
    const btnNginx = this.container.querySelector("#qa-restart-nginx");
    const btnDns = this.container.querySelector("#qa-flush-dns");
    const btnLogs = this.container.querySelector("#qa-export-logs");
    const btnReboot = this.container.querySelector("#qa-reboot-host");
    const btnAllSvc = this.container.querySelector("#btn-view-all-services");

    if (btnNginx) {
      btnNginx.addEventListener("click", async () => {
        toast.info("Executing", "Restarting Nginx HTTP Server...");
        const res = await this.api.performServiceAction("nginx.service", "restart");
        if (res.status === "success") toast.success("Completed", res.message);
      });
    }

    if (btnDns) {
      btnDns.addEventListener("click", () => {
        toast.success("DNS Flushed", "systemd-resolved local cache successfully purged.");
      });
    }

    if (btnLogs) {
      btnLogs.addEventListener("click", () => {
        toast.info("Diagnostics", "Bundling logs into /var/log/diagnostics-20261022.tar.gz...");
      });
    }

    if (btnReboot) {
      btnReboot.addEventListener("click", () => {
        eventBus.emit("modal:confirm-reboot");
      });
    }

    if (btnAllSvc) {
      btnAllSvc.addEventListener("click", () => {
        eventBus.emit("app:launch", "services");
      });
    }
  }

  startPolling() {
    this.fetchAndRenderMetrics();
    this.metricsInterval = setInterval(() => this.fetchAndRenderMetrics(), 2000);
  }

  setupVisibilityListener() {
    document.addEventListener("visibilitychange", () => {
      this.isTabVisible = !document.hidden;
      if (this.isTabVisible) {
        this.fetchAndRenderMetrics();
      }
    });
  }

  destroy() {
    if (this.metricsInterval) clearInterval(this.metricsInterval);
  }
}
