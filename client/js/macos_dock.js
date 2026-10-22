/**
 * Ubuntu Server OS — macOS Sonoma Floating Dock Controller
 */

import { eventBus } from "./event_bus.js";

export class MacosDock {
  constructor(element, windowManager) {
    this.el = element;
    this.wm = windowManager;
    this.runningApps = new Set(["dashboard"]);
    this.render();
  }

  render() {
    this.el.innerHTML = `
      <div class="macos-dock" role="navigation" aria-label="macOS Dock">
        <!-- 1. Activity Monitor (Dashboard) -->
        <div class="dock-app running active" data-app="dashboard" id="dock-item-dashboard">
          <div class="dock-tooltip">Activity Monitor (Dashboard)</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #1E3A8A, #3B82F6);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <!-- 2. Services Manager -->
        <div class="dock-app" data-app="services" id="dock-item-services">
          <div class="dock-tooltip">systemd Services Manager</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #4A1D96, #8B5CF6);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><rect x="2" y="2" width="20" height="8" rx="2"></rect><rect x="2" y="14" width="20" height="8" rx="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <!-- 3. htop Process Monitor -->
        <div class="dock-app" data-app="htop" id="dock-item-htop">
          <div class="dock-tooltip">htop Process Monitor</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #064E3B, #10B981);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <!-- 4. Disk Utility (df -Th) -->
        <div class="dock-app" data-app="df" id="dock-item-df">
          <div class="dock-tooltip">Disk Utility (df -Th)</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #78350F, #F59E0B);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="3"></circle></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <!-- 5. Listening Ports (ss -tulpn) -->
        <div class="dock-app" data-app="ports" id="dock-item-ports">
          <div class="dock-tooltip">Listening Ports (ss -tulpn)</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #0E7490, #06B6D4);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><circle cx="12" cy="12" r="4"></circle><line x1="1.05" y1="12" x2="7" y2="12"></line><line x1="17.01" y1="12" x2="22.96" y2="12"></line></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <!-- 6. Terminal -->
        <div class="dock-app" data-app="terminal" id="dock-item-terminal">
          <div class="dock-tooltip">macOS Bash Terminal</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #111827, #374151);border:1px solid rgba(255,255,255,0.15);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2DDC88" stroke-width="2.2"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <!-- 7. Finder (File Manager) -->
        <div class="dock-app" data-app="files" id="dock-item-files">
          <div class="dock-tooltip">Finder (Scoped Files)</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #0284C7, #38BDF8);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <!-- 8. Console (Journal Logs) -->
        <div class="dock-app" data-app="logs" id="dock-item-logs">
          <div class="dock-tooltip">Console (Journald Logs)</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #831843, #EC4899);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
          </div>
          <div class="dock-dot"></div>
        </div>

        <div class="dock-divider"></div>

        <!-- 9. System Preferences -->
        <div class="dock-app" data-app="settings" id="dock-item-settings">
          <div class="dock-tooltip">Control Center & Settings</div>
          <div class="dock-app-icon" style="background:linear-gradient(135deg, #475569, #94A3B8);">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
          </div>
          <div class="dock-dot"></div>
        </div>
      </div>
    `;

    this.el.querySelectorAll(".dock-app").forEach(item => {
      item.addEventListener("click", () => {
        const app = item.dataset.app;
        this.markRunning(app);
        eventBus.emit("app:launch", app);
      });
    });
  }

  markRunning(appName) {
    this.runningApps.add(appName);
    const item = this.el.querySelector(`#dock-item-${appName}`);
    if (item) item.classList.add("running");
  }

  markClosed(appName) {
    this.runningApps.delete(appName);
    const item = this.el.querySelector(`#dock-item-${appName}`);
    if (item) item.classList.remove("running");
  }
}
