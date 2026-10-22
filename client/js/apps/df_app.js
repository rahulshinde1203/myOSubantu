/**
 * Ubuntu Server OS — Disk Utility (df -Th) Application
 */

export class DfApp {
  constructor(container, apiFacade) {
    this.container = container;
    this.api = apiFacade;
    this.render();
    this.load();
  }

  render() {
    this.container.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:12px;height:100%;font-size:13px;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,0.08);padding-bottom:10px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="font-weight:700;color:#F1F5F9;font-size:14px;">Filesystem Storage Allocation</span>
            <span style="font-family:'SF Mono',monospace;font-size:11px;background:rgba(255,255,255,0.06);padding:2px 8px;border-radius:4px;color:#94A3B8;">df -Th</span>
          </div>
          <button class="btn btn-secondary btn-sm" id="btn-refresh-df">Refresh Volumes</button>
        </div>

        <div id="df-partitions-grid" style="display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1;">
          <div class="skeleton" style="height:48px;"></div>
        </div>
      </div>
    `;

    this.container.querySelector("#btn-refresh-df").addEventListener("click", () => this.load());
  }

  async load() {
    try {
      const res = await this.api.getMetrics();
      if (!res || !res.data || !res.data.filesystems) return;

      const grid = this.container.querySelector("#df-partitions-grid");
      grid.innerHTML = res.data.filesystems.map(fs => {
        let barColor = "linear-gradient(90deg, #1B8A53, #2DDC88)";
        let statusBadge = `<span style="color:#2DDC88;font-weight:700;">OK</span>`;
        if (fs.percent > 85) {
          barColor = "linear-gradient(90deg, #DC2626, #FF5263)";
          statusBadge = `<span style="color:#FF5263;font-weight:700;">CRITICAL</span>`;
        } else if (fs.percent > 65) {
          barColor = "linear-gradient(90deg, #D97706, #FFB547)";
          statusBadge = `<span style="color:#FFB547;font-weight:700;">WARNING</span>`;
        }

        return `
          <div style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.07);border-radius:8px;padding:10px 14px;display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <div style="display:flex;align-items:center;gap:10px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
                <span style="font-family:'SF Mono',monospace;font-weight:700;color:#FFFFFF;font-size:13px;">${fs.mount}</span>
                <span style="font-family:'SF Mono',monospace;color:#94A3B8;font-size:11px;">${fs.filesystem}</span>
                <span style="font-family:'SF Mono',monospace;background:rgba(255,255,255,0.08);padding:1px 6px;border-radius:3px;font-size:10px;color:#CBD5E1;">${fs.type}</span>
              </div>
              <div style="font-family:'SF Mono',monospace;font-size:12px;display:flex;gap:10px;align-items:center;">
                <span style="color:#CBD5E1;">${fs.used} of ${fs.size}</span>
                <span style="font-weight:700;color:#FFFFFF;">(${fs.percent}%)</span>
                ${statusBadge}
              </div>
            </div>
            <div style="width:100%;height:8px;background:rgba(0,0,0,0.5);border-radius:9999px;overflow:hidden;border:1px solid rgba(255,255,255,0.04);">
              <div style="width:${fs.percent}%;height:100%;background:${barColor};border-radius:9999px;transition:width 400ms;"></div>
            </div>
          </div>
        `;
      }).join("");
    } catch (e) {
      console.error(e);
    }
  }
}
