/**
 * Ubuntu Server OS — Journal Logs Application Panel
 */

export class LogsApp {
  constructor(container, apiFacade) {
    this.container = container;
    this.api = apiFacade;
    this.entries = [];
    this.render();
    this.loadLogs();
  }

  render() {
    this.container.innerHTML = `
      <div class="card-panel" style="flex:1;">
        <div class="table-toolbar">
          <div class="search-input-wrapper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" id="log-search-input" placeholder="Filter journal entries...">
          </div>
          <div class="table-filter-group">
            <button class="btn btn-secondary btn-sm" id="btn-refresh-logs">Refresh</button>
          </div>
        </div>

        <div class="table-responsive" style="flex:1;background:var(--color-surface-sunken);">
          <table class="data-table" style="font-family:var(--font-mono);font-size:var(--text-code);">
            <thead>
              <tr>
                <th style="width:160px;">Timestamp</th>
                <th style="width:130px;">Unit</th>
                <th style="width:90px;">Priority</th>
                <th>Message</th>
              </tr>
            </thead>
            <tbody id="logs-tbody">
              <tr><td colspan="4" class="skeleton" style="height:32px;"></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.container.querySelector("#btn-refresh-logs").addEventListener("click", () => this.loadLogs());
    
    const searchInput = this.container.querySelector("#log-search-input");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          this.renderRows(this.entries);
          return;
        }
        const filtered = this.entries.filter(l => 
          (l.unit && l.unit.toLowerCase().includes(query)) ||
          (l.message && l.message.toLowerCase().includes(query)) ||
          (l.priority && l.priority.toLowerCase().includes(query))
        );
        this.renderRows(filtered);
      });
    }
  }

  renderRows(entries) {
    const tbody = this.container.querySelector("#logs-tbody");
    if (!tbody) return;

    if (!entries || entries.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--color-text-secondary);padding:var(--space-md);">No matching journal entries found.</td></tr>`;
      return;
    }

    tbody.innerHTML = entries.map(l => {
      let badgeColor = "var(--color-text-secondary)";
      if (l.priority === "warning") badgeColor = "var(--color-status-amber)";
      if (l.priority === "err" || l.priority === "alert") badgeColor = "var(--color-status-red)";
      if (l.priority === "notice") badgeColor = "var(--color-accent-blue)";

      return `
        <tr>
          <td class="tabular-nums" style="color:var(--color-text-secondary);">${l.timestamp}</td>
          <td style="color:var(--color-brand-orange);">${l.unit}</td>
          <td><span style="color:${badgeColor};font-weight:700;text-transform:uppercase;">${l.priority}</span></td>
          <td style="color:var(--color-text-primary);">${l.message}</td>
        </tr>
      `;
    }).join("");
  }

  async loadLogs() {
    try {
      const res = await this.api.getLogs();
      if (!res.data || !res.data.entries) return;
      this.entries = res.data.entries;

      const searchInput = this.container.querySelector("#log-search-input");
      const query = searchInput ? searchInput.value.toLowerCase().trim() : "";
      if (query) {
        const filtered = this.entries.filter(l => 
          (l.unit && l.unit.toLowerCase().includes(query)) ||
          (l.message && l.message.toLowerCase().includes(query)) ||
          (l.priority && l.priority.toLowerCase().includes(query))
        );
        this.renderRows(filtered);
      } else {
        this.renderRows(this.entries);
      }
    } catch (err) {
      console.error("Error loading logs:", err);
    }
  }
}
