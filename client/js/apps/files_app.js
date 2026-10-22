/**
 * Ubuntu Server OS — Filesystem Application Panel
 */

import { toast } from "../components/toast.js";

export class FilesApp {
  constructor(container, apiFacade) {
    this.container = container;
    this.api = apiFacade;
    this.currentPath = "/var/www";
    this.render();
    this.loadDirectory(this.currentPath);
  }

  render() {
    this.container.innerHTML = `
      <div class="card-panel" style="flex:1;">
        <div class="table-toolbar">
          <div style="display:flex;align-items:center;gap:var(--space-xs);font-family:var(--font-mono);font-size:var(--text-code);color:var(--color-text-secondary);">
            <span>Path:</span>
            <span id="current-path-display" style="color:var(--color-text-primary);font-weight:700;">/var/www</span>
          </div>
          <div style="display:flex;gap:var(--space-xs);">
            <button class="btn btn-secondary btn-sm" id="btn-fs-root-www">/var/www</button>
            <button class="btn btn-secondary btn-sm" id="btn-fs-root-log">/var/log</button>
          </div>
        </div>

        <div class="table-responsive" style="flex:1;">
          <table class="data-table">
            <thead>
              <tr>
                <th>File / Directory Name</th>
                <th>Permissions</th>
                <th>File Size</th>
                <th>Last Modified</th>
                <th style="text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody id="fs-table-tbody">
              <tr><td colspan="5" class="skeleton" style="height:36px;"></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.container.querySelector("#btn-fs-root-www").addEventListener("click", () => this.loadDirectory("/var/www"));
    this.container.querySelector("#btn-fs-root-log").addEventListener("click", () => this.loadDirectory("/var/log"));
  }

  async loadDirectory(path) {
    try {
      this.currentPath = path;
      const pathDisplay = this.container.querySelector("#current-path-display");
      if (pathDisplay) pathDisplay.textContent = path;

      const res = await this.api.getFiles(path);
      const tbody = this.container.querySelector("#fs-table-tbody");
      if (!tbody || !res.data) return;

      tbody.innerHTML = res.data.entries.map(entry => `
        <tr style="cursor:pointer;" class="fs-row" data-name="${entry.name}" data-type="${entry.type}" data-size="${entry.size}" data-perms="${entry.permissions}" data-mod="${entry.modified}">
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              ${entry.type === "directory" ? `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-blue)" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
              ` : `
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-secondary)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
              `}
              <span class="${entry.type === "directory" ? "font-bold" : ""}" style="font-family:var(--font-mono);font-size:var(--text-code);">${entry.name}</span>
            </div>
          </td>
          <td class="tabular-nums">${entry.permissions}</td>
          <td class="tabular-nums">${entry.size}</td>
          <td class="tabular-nums">${entry.modified}</td>
          <td style="text-align:right;">
            <button class="btn btn-secondary btn-sm btn-inspect-file">Inspect</button>
          </td>
        </tr>
      `).join("");

      tbody.querySelectorAll(".fs-row").forEach(row => {
        const inspectBtn = row.querySelector(".btn-inspect-file");
        if (inspectBtn) {
          inspectBtn.addEventListener("click", (e) => {
            e.stopPropagation();
            const name = row.dataset.name;
            const size = row.dataset.size;
            const perms = row.dataset.perms;
            const mod = row.dataset.mod;
            toast.info("File Inspection", `${name} — Permissions: ${perms}, Size: ${size}, Modified: ${mod}`);
          });
        }

        row.addEventListener("click", () => {
          const type = row.dataset.type;
          const name = row.dataset.name;
          if (type === "directory") {
            if (name === "..") {
              const parts = this.currentPath.split("/").filter(Boolean);
              if (parts.length > 1) {
                parts.pop();
                this.loadDirectory("/" + parts.join("/"));
              } else {
                this.loadDirectory("/var/www");
              }
            } else {
              this.loadDirectory(`${this.currentPath}/${name}`.replace(/\/+/g, "/"));
            }
          } else {
            toast.info("File Selected", `Opened ${name} in safe read-only preview.`);
          }
        });
      });
    } catch (err) {
      console.error("Error loading directory:", err);
    }
  }
}
