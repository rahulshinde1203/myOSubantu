/**
 * Ubuntu Server OS — macOS Menubar Dropdown Menus Controller
 * Implements functional menus for: Ubuntu Brand, Activity, Diagnostics, Services, Terminal, Window, and Help.
 */

import { eventBus } from "../event_bus.js";
import { toast } from "./toast.js";

export class MenubarDropdowns {
  constructor(windowManager) {
    this.wm = windowManager;
    this.activeMenu = null;
    this.isMenuOpen = false;

    this.menus = {
      brand: {
        items: [
          { label: "About Ubuntu Server OS", action: () => this.showAboutModal() },
          { divider: true },
          { label: "System Preferences...", shortcut: "⌥⌘,", action: () => eventBus.emit("app:launch", "settings") },
          { label: "Control Center...", shortcut: "Ctrl+C", action: () => eventBus.emit("app:launch", "settings") },
          { divider: true },
          { label: "Sleep Telemetry Polling", action: () => toast.info("Telemetry Paused", "Background polling suspended.") },
          { label: "Lock Console Session", shortcut: "⌃⌘Q", action: () => toast.warning("Session Locked", "Authentication required to unlock operator session.") },
          { divider: true },
          { label: "Restart Server...", action: () => eventBus.emit("modal:confirm-reboot") },
          { label: "Shut Down Server...", action: () => toast.error("Action Blocked", "Remote poweroff disabled on production node without IPMI authorization.") }
        ]
      },
      activity: {
        items: [
          { label: "Activity Monitor", shortcut: "⌘1", action: () => eventBus.emit("app:launch", "dashboard") },
          { label: "Grafana Gauges & Heatmaps", action: () => {
              eventBus.emit("app:launch", "dashboard");
              setTimeout(() => {
                const tab = document.querySelector('.segmented-tab[data-view="gauges"]');
                if (tab) tab.click();
              }, 120);
            }
          },
          { label: "Performance Telemetry Chart", action: () => {
              eventBus.emit("app:launch", "dashboard");
              setTimeout(() => {
                const tab = document.querySelector('.segmented-tab[data-view="chart"]');
                if (tab) tab.click();
              }, 120);
            }
          },
          { divider: true },
          { label: "Flush Inactive Page Cache", action: () => toast.success("Memory Optimized", "Kernel pagecache & buffer cache cleared.") },
          { label: "Kill Zombie Processes", action: () => {
              eventBus.emit("app:launch", "htop");
              toast.info("htop Process Monitor", "Locate zombie PID and press Kill Process.");
            }
          }
        ]
      },
      diagnostics: {
        items: [
          { label: "htop Realtime Process Monitor", shortcut: "⌘2", action: () => eventBus.emit("app:launch", "htop") },
          { label: "Disk Utility (df -Th)", shortcut: "⌘3", action: () => eventBus.emit("app:launch", "df") },
          { label: "Listening Ports (ss -tulpn)", shortcut: "⌘4", action: () => eventBus.emit("app:launch", "ports") },
          { divider: true },
          { label: "Console (Journald Logs)", shortcut: "⌘5", action: () => eventBus.emit("app:launch", "logs") },
          { label: "Run Gateway Ping Diagnostic", action: () => toast.success("Ping Succeeded", "rtt min/avg/max = 0.42/0.58/0.81 ms to gateway 10.0.10.1") },
          { label: "Export Diagnostics Bundle (.tar.gz)", action: () => toast.info("Diagnostic Export", "Archiving logs & telemetry to /var/log/diagnostics-node01.tar.gz") }
        ]
      },
      services: {
        items: [
          { label: "systemd Services Manager", action: () => eventBus.emit("app:launch", "services") },
          { divider: true },
          { label: "Restart Nginx Server", action: () => toast.success("nginx.service", "Graceful reload complete.") },
          { label: "Restart PostgreSQL Database", action: () => toast.info("postgresql.service", "Postgres cluster reload complete.") },
          { label: "Restart Redis In-Memory Cache", action: () => toast.info("redis-server.service", "Redis snapshot flush & restart complete.") },
          { label: "Restart Docker Engine Daemon", action: () => toast.info("docker.service", "Container runtime daemon active.") },
          { divider: true },
          { label: "Audit Anti-Lockout Guards", action: () => toast.warning("Anti-Lockout Active", "sshd.service, ufw.service, and wireguard are permanently locked against remote termination.") }
        ]
      },
      terminal: {
        items: [
          { label: "New Terminal Window", shortcut: "⌘T", action: () => eventBus.emit("app:launch", "terminal") },
          { divider: true },
          { label: "Quick Command: df -Th", action: () => { eventBus.emit("app:launch", "df"); } },
          { label: "Quick Command: htop", action: () => { eventBus.emit("app:launch", "htop"); } },
          { label: "Quick Command: ss -tulpn", action: () => { eventBus.emit("app:launch", "ports"); } },
          { label: "Quick Command: free -m", action: () => toast.info("free -m", "total: 8192 MB, used: 3950 MB, free: 3120 MB, buff/cache: 1122 MB") },
          { label: "Quick Command: uptime", action: () => toast.info("uptime", "up 42 days, 14:28, 2 users, load average: 0.42, 0.58, 0.65") }
        ]
      },
      window: {
        items: [
          { label: "Minimize Window", shortcut: "⌘M", action: () => {
              if (this.wm && this.wm.windows.size > 0) {
                const firstId = Array.from(this.wm.windows.keys()).pop();
                if (firstId) this.wm.minimizeWindow(firstId);
              }
            }
          },
          { label: "Zoom / Fullscreen", shortcut: "⌃⌘F", action: () => {
              if (this.wm && this.wm.windows.size > 0) {
                const firstId = Array.from(this.wm.windows.keys()).pop();
                if (firstId) this.wm.toggleFullscreen(firstId);
              }
            }
          },
          { divider: true },
          { label: "Tile Window to Left 50%", action: () => {
              if (this.wm && this.wm.windows.size > 0) {
                const firstId = Array.from(this.wm.windows.keys()).pop();
                const winObj = this.wm.windows.get(firstId);
                if (winObj) this.wm._applySnap(winObj, "left");
              }
            }
          },
          { label: "Tile Window to Right 50%", action: () => {
              if (this.wm && this.wm.windows.size > 0) {
                const firstId = Array.from(this.wm.windows.keys()).pop();
                const winObj = this.wm.windows.get(firstId);
                if (winObj) this.wm._applySnap(winObj, "right");
              }
            }
          },
          { divider: true },
          { label: "Close Active Window", shortcut: "⌘W", action: () => {
              if (this.wm && this.wm.windows.size > 0) {
                const firstId = Array.from(this.wm.windows.keys()).pop();
                if (firstId) this.wm.closeWindow(firstId);
              }
            }
          }
        ]
      },
      help: {
        items: [
          { label: "Ubuntu Server OS Architecture", action: () => toast.info("Architecture Specification", "Review UBUNTU_SERVER_OS_SPECIFICATION.md for 12 core requirements.") },
          { label: "Keyboard Shortcuts Guide", shortcut: "⌘/", action: () => this.showShortcutsModal() },
          { label: "Security & Trust Boundary Guidelines", action: () => toast.warning("Security Policy", "Zero backend actions permitted without CSRF tokens and administrator verification.") },
          { divider: true },
          { label: "About Google DeepMind Antigravity", action: () => toast.success("Antigravity Pair Programming", "High-assurance systems engineering for Ubuntu Server OS.") }
        ]
      }
    };

    this.renderDropdownElement();
    this.bindMenubarHeaders();
  }

  renderDropdownElement() {
    let dropdown = document.getElementById("macos-menu-dropdown");
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = "macos-menu-dropdown";
      dropdown.className = "macos-menu-dropdown";
      document.body.appendChild(dropdown);
    }
    this.dropdownEl = dropdown;
  }

  bindMenubarHeaders() {
    const leftBar = document.querySelector(".macos-menu-left");
    if (!leftBar) return;

    // Map children to menu keys
    const items = leftBar.querySelectorAll(".macos-menu-item");
    const menuKeys = ["brand", "activity", "diagnostics", "services", "terminal", "window", "help"];

    items.forEach((item, index) => {
      const key = menuKeys[index];
      if (!key) return;

      item.setAttribute("data-menu-key", key);

      item.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.isMenuOpen && this.activeMenu === key) {
          this.closeMenu();
        } else {
          this.openMenu(key, item);
        }
      });

      item.addEventListener("mouseenter", () => {
        if (this.isMenuOpen && this.activeMenu !== key) {
          this.openMenu(key, item);
        }
      });
    });

    // Close when clicking anywhere outside
    document.addEventListener("click", (e) => {
      if (this.isMenuOpen && !this.dropdownEl.contains(e.target)) {
        this.closeMenu();
      }
    });

    // Close on Escape key
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.isMenuOpen) {
        this.closeMenu();
      }
    });
  }

  openMenu(key, triggerEl) {
    const menuDef = this.menus[key];
    if (!menuDef) return;

    this.activeMenu = key;
    this.isMenuOpen = true;

    // Highlight active menu header
    document.querySelectorAll(".macos-menu-item").forEach(el => el.classList.remove("menu-header-active"));
    triggerEl.classList.add("menu-header-active");

    // Compute screen coordinates
    const rect = triggerEl.getBoundingClientRect();
    this.dropdownEl.style.left = `${Math.max(8, rect.left)}px`;
    this.dropdownEl.style.top = `28px`;

    // Render items
    this.dropdownEl.innerHTML = menuDef.items.map(item => {
      if (item.divider) {
        return `<div class="menu-dropdown-divider"></div>`;
      }
      return `
        <div class="menu-dropdown-item" data-action="true">
          <span class="menu-item-label">${item.label}</span>
          ${item.shortcut ? `<span class="menu-item-shortcut">${item.shortcut}</span>` : ''}
        </div>
      `;
    }).join("");

    this.dropdownEl.classList.add("open");

    // Bind item clicks
    const renderedItems = this.dropdownEl.querySelectorAll('.menu-dropdown-item');
    let itemIdx = 0;
    menuDef.items.forEach(item => {
      if (!item.divider) {
        const el = renderedItems[itemIdx++];
        if (el) {
          el.addEventListener("click", () => {
            this.closeMenu();
            if (item.action) item.action();
          });
        }
      }
    });
  }

  closeMenu() {
    this.isMenuOpen = false;
    this.activeMenu = null;
    this.dropdownEl.classList.remove("open");
    document.querySelectorAll(".macos-menu-item").forEach(el => el.classList.remove("menu-header-active"));
  }

  showAboutModal() {
    let modal = document.getElementById("about-ubuntu-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "about-ubuntu-modal";
      modal.className = "about-modal-backdrop";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="about-dialog-box" role="dialog" aria-modal="true">
        <button class="about-close-btn" id="btn-close-about">&times;</button>
        <div class="about-logo-wrapper">
          <svg viewBox="0 0 24 24" style="width:54px;height:54px;color:#E95420;">
            <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
            <circle cx="12" cy="5" r="2.5" fill="currentColor"/>
            <circle cx="5.5" cy="16" r="2.5" fill="currentColor"/>
            <circle cx="18.5" cy="16" r="2.5" fill="currentColor"/>
          </svg>
        </div>
        <div style="font-size:18px;font-weight:700;color:#FFFFFF;margin-top:10px;">Ubuntu Server OS</div>
        <div style="font-size:12px;color:#94A3B8;margin-top:2px;">Version 24.04 LTS (Noble Numbat) · Workstation Control</div>
        <div class="about-specs-grid">
          <div class="spec-row"><span>Host:</span><strong>srv-prod-node01.lan</strong></div>
          <div class="spec-row"><span>Kernel:</span><strong>Linux 6.8.0-40-generic x86_64</strong></div>
          <div class="spec-row"><span>Processor:</span><strong>AMD EPYC 7763 (8 vCPU Assigned)</strong></div>
          <div class="spec-row"><span>Memory:</span><strong>8.00 GB DDR4 Registered ECC</strong></div>
          <div class="spec-row"><span>Storage:</span><strong>200.0 GB NVMe ZFS (42% Allocated)</strong></div>
          <div class="spec-row"><span>Security:</span><strong>UFW Active · Fail2ban · Argon2id</strong></div>
        </div>
        <div style="font-size:10px;color:#64748B;margin-top:14px;border-top:1px solid rgba(255,255,255,0.06);padding-top:10px;">
          Ubuntu Server OS Workstation Architecture · Built for High-Assurance Operations
        </div>
      </div>
    `;

    modal.classList.add("open");
    modal.querySelector("#btn-close-about").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  }

  showShortcutsModal() {
    let modal = document.getElementById("shortcuts-help-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "shortcuts-help-modal";
      modal.className = "about-modal-backdrop";
      document.body.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="about-dialog-box" style="width:420px;" role="dialog" aria-modal="true">
        <button class="about-close-btn" id="btn-close-shortcuts">&times;</button>
        <div style="font-size:15px;font-weight:700;color:#FFFFFF;display:flex;align-items:center;gap:8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="2" ry="2"></rect><line x1="6" y1="8" x2="6.01" y2="8"></line><line x1="10" y1="8" x2="10.01" y2="8"></line><line x1="14" y1="8" x2="14.01" y2="8"></line><line x1="18" y1="8" x2="18.01" y2="8"></line><line x1="8" y1="12" x2="8.01" y2="12"></line><line x1="12" y1="12" x2="12.01" y2="12"></line><line x1="16" y1="12" x2="16.01" y2="12"></line><line x1="7" y1="16" x2="17" y2="16"></line></svg>
          <span>Workstation Keyboard Shortcuts</span>
        </div>
        <div class="shortcuts-list" style="margin-top:14px;display:flex;flex-direction:column;gap:8px;font-size:11px;">
          <div class="spec-row"><span>Spotlight Universal Search</span><kbd class="shortcut-kbd">⌘ K / Ctrl+K</kbd></div>
          <div class="spec-row"><span>Notification Center &amp; Widgets</span><kbd class="shortcut-kbd">⌘ Shift N</kbd></div>
          <div class="spec-row"><span>New Bash Terminal</span><kbd class="shortcut-kbd">⌘ T</kbd></div>
          <div class="spec-row"><span>Tile Window Left 50%</span><kbd class="shortcut-kbd">Drag to Left Edge</kbd></div>
          <div class="spec-row"><span>Tile Window Right 50%</span><kbd class="shortcut-kbd">Drag to Right Edge</kbd></div>
          <div class="spec-row"><span>Zoom / Fullscreen Window</span><kbd class="shortcut-kbd">Drag to Top Edge</kbd></div>
          <div class="spec-row"><span>Close Active Window / Dialog</span><kbd class="shortcut-kbd">ESC / ⌘ W</kbd></div>
        </div>
      </div>
    `;

    modal.classList.add("open");
    modal.querySelector("#btn-close-shortcuts").addEventListener("click", () => modal.classList.remove("open"));
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("open");
    });
  }
}
