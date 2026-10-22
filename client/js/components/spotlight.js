/**
 * Ubuntu Server OS — macOS Spotlight Universal Search (Cmd + K)
 */

import { eventBus } from "../event_bus.js";
import { toast } from "./toast.js";

export class SpotlightSearch {
  constructor() {
    this.isOpen = false;
    this.items = [
      // Applications
      { id: "app-dashboard", title: "Activity Monitor", category: "Application", desc: "Live CPU, Memory, Disk, and Network telemetry", icon: "activity", action: () => eventBus.emit("app:launch", "dashboard") },
      { id: "app-htop", title: "htop Process Monitor", category: "Application", desc: "8-core visual CPU bars, memory meters & process kill", icon: "cpu", action: () => eventBus.emit("app:launch", "htop") },
      { id: "app-df", title: "Disk Utility (df -Th)", category: "Application", desc: "Partition capacity meters, inodes, and mount points", icon: "disc", action: () => eventBus.emit("app:launch", "df") },
      { id: "app-ports", title: "Listening Ports (ss -tulpn)", category: "Application", desc: "Visual network sockets, exposed ports & security badges", icon: "network", action: () => eventBus.emit("app:launch", "ports") },
      { id: "app-terminal", title: "macOS Bash Terminal", category: "Application", desc: "Interactive command-line shell with visual command output", icon: "terminal", action: () => eventBus.emit("app:launch", "terminal") },
      { id: "app-services", title: "systemd Services Manager", category: "Application", desc: "Start, stop, and restart nginx, postgresql, docker", icon: "server", action: () => eventBus.emit("app:launch", "services") },
      { id: "app-files", title: "Finder (Scoped Files)", category: "Application", desc: "Safe file navigation inside allowed directory paths", icon: "folder", action: () => eventBus.emit("app:launch", "files") },
      { id: "app-logs", title: "Console (Journald Logs)", category: "Application", desc: "Live streaming kernel and service log viewer", icon: "file-text", action: () => eventBus.emit("app:launch", "logs") },

      // Quick Actions / Commands
      { id: "act-reboot", title: "Reboot Host Server", category: "System Action", desc: "Safely restart the host machine (requires confirmation)", icon: "power", action: () => eventBus.emit("modal:confirm-reboot") },
      { id: "act-vpn", title: "Toggle WireGuard VPN", category: "System Action", desc: "Enable or disable encrypted tunnel interface wg0", icon: "shield", action: () => { eventBus.emit("vpn:toggle"); toast.info("VPN Toggled", "WireGuard state modified via Spotlight."); } },
      { id: "act-cache", title: "Flush Page Cache & Swap", category: "System Action", desc: "Sync filesystem and clear inactive memory buffers", icon: "trash-2", action: () => toast.success("Memory Optimized", "Kernel pagecache & dentries cleared (mock).") },
      { id: "act-restart-nginx", title: "Restart Nginx Web Server", category: "systemd", desc: "Graceful reload of nginx HTTP reverse proxy", icon: "refresh-cw", action: () => toast.success("nginx.service", "Worker processes reloaded successfully.") },
      { id: "act-restart-postgres", title: "Restart PostgreSQL Database", category: "systemd", desc: "Restart PostgreSQL cluster with checkpoint flush", icon: "database", action: () => toast.info("postgresql.service", "Database cluster restarted.") },

      // Common Paths
      { id: "path-var-log", title: "/var/log/syslog", category: "Path", desc: "Ubuntu primary operating system syslog file", icon: "file", action: () => eventBus.emit("app:launch", "logs") },
      { id: "path-etc-nginx", title: "/etc/nginx/nginx.conf", category: "Path", desc: "Nginx reverse proxy main configuration file", icon: "file", action: () => eventBus.emit("app:launch", "files") },
      { id: "path-var-www", title: "/var/www/html", category: "Path", desc: "Document root directory for web applications", icon: "folder", action: () => eventBus.emit("app:launch", "files") }
    ];

    this.render();
    this.bindEvents();
  }

  render() {
    let overlay = document.getElementById("macos-spotlight-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "macos-spotlight-overlay";
      overlay.className = "spotlight-overlay";
      document.body.appendChild(overlay);
    }
    this.overlay = overlay;

    this.overlay.innerHTML = `
      <div class="spotlight-dialog" role="dialog" aria-modal="true" aria-label="Spotlight Search">
        <div class="spotlight-search-header">
          <svg class="spotlight-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input type="text" id="spotlight-input" class="spotlight-input" placeholder="Spotlight Search (apps, services, paths, or commands)..." autocomplete="off" spellcheck="false" />
          <kbd class="spotlight-kbd-hint">ESC</kbd>
        </div>
        <div class="spotlight-results" id="spotlight-results-list"></div>
        <div class="spotlight-footer">
          <span>Use <strong>&uarr; &darr;</strong> to navigate</span>
          <span>Press <strong>&crarr; Return</strong> to open</span>
          <span>Press <strong>esc</strong> to dismiss</span>
        </div>
      </div>
    `;

    this.input = this.overlay.querySelector("#spotlight-input");
    this.resultsList = this.overlay.querySelector("#spotlight-results-list");
  }

  bindEvents() {
    // Keyboard shortcut Cmd + K or Ctrl + K
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        this.toggle();
      } else if (e.key === "Escape" && this.isOpen) {
        this.close();
      }
    });

    // Close on overlay backdrop click
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) {
        this.close();
      }
    });

    // Filter results on input
    this.input.addEventListener("input", () => {
      this.filterResults(this.input.value.trim());
    });

    // Keyboard navigation in results
    this.input.addEventListener("keydown", (e) => {
      const items = Array.from(this.resultsList.querySelectorAll(".spotlight-item"));
      if (!items.length) return;

      const activeIdx = items.findIndex(el => el.classList.contains("active"));

      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIdx = activeIdx < items.length - 1 ? activeIdx + 1 : 0;
        this.setActiveItem(items, nextIdx);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        const prevIdx = activeIdx > 0 ? activeIdx - 1 : items.length - 1;
        this.setActiveItem(items, prevIdx);
      } else if (e.key === "Enter") {
        e.preventDefault();
        const current = items[activeIdx >= 0 ? activeIdx : 0];
        if (current) current.click();
      }
    });
  }

  setActiveItem(items, index) {
    items.forEach((item, idx) => {
      if (idx === index) {
        item.classList.add("active");
        item.scrollIntoView({ block: "nearest" });
      } else {
        item.classList.remove("active");
      }
    });
  }

  open() {
    this.isOpen = true;
    this.overlay.classList.add("open");
    this.input.value = "";
    this.filterResults("");
    setTimeout(() => this.input.focus(), 60);
  }

  close() {
    this.isOpen = false;
    this.overlay.classList.remove("open");
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  filterResults(query) {
    const q = query.toLowerCase();
    const filtered = this.items.filter(item => {
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
      );
    });

    if (!filtered.length) {
      this.resultsList.innerHTML = `
        <div class="spotlight-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <div style="font-size:13px;color:#94A3B8;margin-top:6px;">No results found for "${query}"</div>
          <div style="font-size:11px;color:#64748B;">Try searching for apps (htop, ports), services (nginx), or paths (/var/log)</div>
        </div>
      `;
      return;
    }

    this.resultsList.innerHTML = filtered.map((item, idx) => `
      <div class="spotlight-item ${idx === 0 ? 'active' : ''}" data-id="${item.id}">
        <div class="spotlight-item-icon ${item.category.toLowerCase().replace(/[^a-z]/g, '')}">
          ${this._getIconSvg(item.icon)}
        </div>
        <div class="spotlight-item-content">
          <div class="spotlight-item-title">${item.title}</div>
          <div class="spotlight-item-desc">${item.desc}</div>
        </div>
        <div class="spotlight-item-badge">${item.category}</div>
      </div>
    `).join("");

    this.resultsList.querySelectorAll(".spotlight-item").forEach(el => {
      el.addEventListener("click", () => {
        const item = this.items.find(i => i.id === el.dataset.id);
        if (item && item.action) {
          this.close();
          item.action();
        }
      });
      el.addEventListener("mouseenter", () => {
        this.resultsList.querySelectorAll(".spotlight-item").forEach(i => i.classList.remove("active"));
        el.classList.add("active");
      });
    });
  }

  _getIconSvg(iconName) {
    switch (iconName) {
      case "activity":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>`;
      case "cpu":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>`;
      case "disc":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>`;
      case "network":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
      case "terminal":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>`;
      case "server":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>`;
      case "folder":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>`;
      case "file-text":
      case "file":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
      case "power":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>`;
      case "shield":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
      case "trash-2":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`;
      case "refresh-cw":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>`;
      case "database":
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>`;
      default:
        return `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle></svg>`;
    }
  }
}
