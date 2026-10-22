/**
 * Ubuntu Server OS — htop Realtime System Monitor Application
 */

export class HtopApp {
  constructor(container, apiFacade) {
    this.container = container;
    this.api = apiFacade;
    this.timer = null;
    this.render();
    this.poll();
  }

  render() {
    this.container.innerHTML = `
      <div style="background:#02070F;border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:12px;font-family:'SF Mono','Ubuntu Mono',monospace;font-size:11px;color:#C8D3E0;display:flex;flex-direction:column;gap:8px;height:100%;box-shadow:inset 0 2px 6px rgba(0,0,0,0.6);">
        <!-- 8-Core Meters -->
        <div id="htop-meters-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">
          <!-- Core bars populated dynamically -->
        </div>

        <!-- Memory & Swap Meters -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 16px;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:8px;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:#2DDC88;font-weight:700;width:30px;">Mem</span>
            <div style="flex:1;height:12px;background:#071526;border-radius:2px;overflow:hidden;border:1px solid #14283F;">
              <div id="htop-mem-fill" style="height:100%;background:#2DDC88;width:48%;"></div>
            </div>
            <span id="htop-mem-text" style="color:#F0F4F8;font-size:10.5px;">[3.81G/8.00G]</span>
          </div>
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="color:#38BDF8;font-weight:700;width:30px;">Swp</span>
            <div style="flex:1;height:12px;background:#071526;border-radius:2px;overflow:hidden;border:1px solid #14283F;">
              <div style="height:100%;background:#38BDF8;width:6%;"></div>
            </div>
            <span style="color:#F0F4F8;font-size:10.5px;">[128M/2.00G]</span>
          </div>
        </div>

        <!-- Tasks & Load Average -->
        <div style="display:flex;justify-content:space-between;color:#94A9C9;font-size:11px;padding:2px 0;">
          <div>Tasks: <span style="color:#A970FF;font-weight:700;" id="htop-tasks">142, 248 thr; 1 running</span></div>
          <div>Load average: <span style="color:#FFB547;font-weight:700;" id="htop-load">0.42 0.38 0.31</span></div>
          <div>Uptime: <span style="color:#2DDC88;font-weight:700;" id="htop-uptime">14 days, 06:22:15</span></div>
        </div>

        <!-- Interactive Process Table -->
        <div style="flex:1;overflow-y:auto;border-top:1px solid rgba(255,255,255,0.06);margin-top:2px;">
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#0B1C33;color:#38BDF8;text-align:left;position:sticky;top:0;">
                <th style="padding:4px 6px;">PID</th>
                <th style="padding:4px 6px;">USER</th>
                <th style="padding:4px 6px;">PRI</th>
                <th style="padding:4px 6px;">NI</th>
                <th style="padding:4px 6px;">VIRT</th>
                <th style="padding:4px 6px;">RES</th>
                <th style="padding:4px 6px;">SHR</th>
                <th style="padding:4px 6px;">S</th>
                <th style="padding:4px 6px;">CPU%</th>
                <th style="padding:4px 6px;">MEM%</th>
                <th style="padding:4px 6px;">TIME+</th>
                <th style="padding:4px 6px;">Command</th>
              </tr>
            </thead>
            <tbody id="htop-procs-list">
              <!-- Dynamically populated -->
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  async poll() {
    try {
      const res = await this.api.getMetrics();
      if (res && res.data) {
        this.update(res.data);
      }
    } catch (e) {
      console.error(e);
    }
    this.timer = setTimeout(() => this.poll(), 2000);
  }

  update(data) {
    const metersGrid = this.container.querySelector("#htop-meters-grid");
    const procsList = this.container.querySelector("#htop-procs-list");
    const memFill = this.container.querySelector("#htop-mem-fill");
    const memText = this.container.querySelector("#htop-mem-text");

    if (memFill && memText && data.memory) {
      memFill.style.width = `${data.memory.percent}%`;
      memText.textContent = `[${data.memory.used_gb}G/${data.memory.total_gb.toFixed(2)}G]`;
    }

    if (metersGrid && data.cpu && data.cpu.cores) {
      metersGrid.innerHTML = data.cpu.cores.map((cLoad, idx) => `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="color:#38BDF8;font-weight:700;width:16px;text-align:right;">${idx + 1}</span>
          <div style="flex:1;height:11px;background:#071526;border-radius:2px;overflow:hidden;border:1px solid #14283F;">
            <div style="height:100%;width:${cLoad}%;background:${cLoad > 75 ? '#FF5263' : cLoad > 50 ? '#FFB547' : '#2DDC88'};"></div>
          </div>
          <span style="width:46px;text-align:right;color:#F0F4F8;font-weight:600;">[${cLoad.toFixed(1)}%]</span>
        </div>
      `).join("");
    }

    if (procsList && data.htop && data.htop.processes) {
      procsList.innerHTML = data.htop.processes.map(p => `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.03);">
          <td style="padding:3px 6px;">${p.pid}</td>
          <td style="padding:3px 6px;color:#94A9C9;">${p.user}</td>
          <td style="padding:3px 6px;">${p.pri}</td>
          <td style="padding:3px 6px;">${p.ni}</td>
          <td style="padding:3px 6px;">${p.virt}</td>
          <td style="padding:3px 6px;">${p.res}</td>
          <td style="padding:3px 6px;">${p.shr}</td>
          <td style="padding:3px 6px;">${p.s}</td>
          <td style="padding:3px 6px;color:${parseFloat(p.cpu) > 10 ? '#FFB547' : '#F0F4F8'};font-weight:600;">${p.cpu}</td>
          <td style="padding:3px 6px;">${p.mem}</td>
          <td style="padding:3px 6px;">${p.time}</td>
          <td style="padding:3px 6px;color:#2DDC88;white-space:nowrap;">${p.cmd}</td>
        </tr>
      `).join("");
    }
  }

  destroy() {
    if (this.timer) clearTimeout(this.timer);
  }
}
