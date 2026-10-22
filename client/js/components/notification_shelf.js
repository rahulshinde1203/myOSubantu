/**
 * Ubuntu Server OS — macOS Notification Center & Widget Shelf
 */

import { toast } from "./toast.js";

export class NotificationShelf {
  constructor() {
    this.isOpen = false;
    this.scratchpadKey = "ubuntu_os_admin_scratchpad";
    this.render();
    this.bindEvents();
  }

  render() {
    let shelf = document.getElementById("macos-notification-shelf");
    if (!shelf) {
      shelf = document.createElement("aside");
      shelf.id = "macos-notification-shelf";
      shelf.className = "notification-shelf";
      shelf.setAttribute("aria-label", "Notification Center & Widgets");
      document.body.appendChild(shelf);
    }
    this.shelf = shelf;

    const savedNotes = localStorage.getItem(this.scratchpadKey) || 
`# Incident Response Checklist
- [x] Verified nginx reverse proxy config
- [x] Checked disk space on /var/log (14% used)
- [ ] Schedule PostgreSQL pg_dump backup
- [ ] Review SSH fail2ban jail log`;

    this.shelf.innerHTML = `
      <div class="shelf-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
          <span style="font-weight:700;color:#FFFFFF;font-size:13px;">Widgets & Notifications</span>
        </div>
        <button id="btn-close-shelf" style="background:transparent;border:none;color:#94A3B8;cursor:pointer;font-size:16px;line-height:1;padding:4px;">&times;</button>
      </div>

      <div class="shelf-body">
        <!-- 1. Host Health Widget -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">Host Health & System Uptime</span>
            <span class="widget-badge green">HEALTHY</span>
          </div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:6px;font-size:11px;">
            <div style="display:flex;justify-content:space-between;color:#94A3B8;">
              <span>Uptime</span>
              <span style="color:#FFFFFF;font-weight:600;font-family:'SF Mono',monospace;">42d 14h 28m</span>
            </div>
            <div style="display:flex;justify-content:space-between;color:#94A3B8;">
              <span>Load Average</span>
              <span style="color:#38BDF8;font-weight:600;font-family:'SF Mono',monospace;">0.42, 0.58, 0.65</span>
            </div>
            <div style="display:flex;justify-content:space-between;color:#94A3B8;">
              <span>Kernel</span>
              <span style="color:#E2E8F0;font-family:'SF Mono',monospace;">6.8.0-40-generic</span>
            </div>
          </div>
        </div>

        <!-- 2. Security & Firewall Widget -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">Security & Intrusion Prevention</span>
            <span class="widget-badge blue">ACTIVE</span>
          </div>
          <div style="margin-top:10px;display:flex;flex-direction:column;gap:8px;font-size:11px;">
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="color:#94A3B8;">UFW Firewall</span>
              <span style="color:#2DDC88;font-weight:700;">DEFAULT DROP (3 RULES)</span>
            </div>
            <div style="display:flex;align-items:center;justify-content:space-between;">
              <span style="color:#94A3B8;">Fail2ban SSH Jail</span>
              <span style="color:#FFB547;font-weight:700;font-family:'SF Mono',monospace;">14 IPs Banned (24h)</span>
            </div>
            <div style="padding:6px;background:rgba(0,0,0,0.3);border-radius:4px;font-size:10px;font-family:'SF Mono',monospace;color:#94A3B8;">
              Recent block: <span style="color:#FF5263;">185.220.101.5</span> (port 22 brute force)
            </div>
          </div>
        </div>

        <!-- 3. Admin Scratchpad (Autosaved) -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">Incident Scratchpad</span>
            <span style="font-size:10px;color:#64748B;">Autosaved</span>
          </div>
          <div style="margin-top:8px;">
            <textarea id="shelf-scratchpad" placeholder="Type quick notes, checklists, or commands here..." style="width:100%;height:130px;background:rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.08);border-radius:6px;padding:8px;color:#F1F5F9;font-family:'SF Mono',monospace;font-size:11px;resize:none;outline:none;line-height:1.4;">${savedNotes}</textarea>
          </div>
        </div>

        <!-- 4. System Notifications Feed -->
        <div class="widget-card">
          <div class="widget-header">
            <span class="widget-title">System Event Feed</span>
            <button id="btn-clear-feed" style="font-size:10px;color:#94A3B8;background:none;border:none;cursor:pointer;">Clear</button>
          </div>
          <div id="shelf-notifications-feed" style="margin-top:8px;display:flex;flex-direction:column;gap:6px;font-size:11px;">
            <div class="shelf-feed-item">
              <span class="shelf-feed-time">15:38</span>
              <span class="shelf-feed-text">Nginx SSL certificate verified valid (Let's Encrypt).</span>
            </div>
            <div class="shelf-feed-item">
              <span class="shelf-feed-time">15:20</span>
              <span class="shelf-feed-text">WireGuard tunnel wg0 handshake refreshed with peer.</span>
            </div>
            <div class="shelf-feed-item">
              <span class="shelf-feed-time">14:55</span>
              <span class="shelf-feed-text">systemd-timesyncd synchronized clock with ntp.ubuntu.com.</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.scratchpad = this.shelf.querySelector("#shelf-scratchpad");
  }

  bindEvents() {
    // Close button
    this.shelf.querySelector("#btn-close-shelf").addEventListener("click", () => {
      this.close();
    });

    // Autosave scratchpad
    this.scratchpad.addEventListener("input", () => {
      localStorage.setItem(this.scratchpadKey, this.scratchpad.value);
    });

    // Clear feed
    this.shelf.querySelector("#btn-clear-feed").addEventListener("click", () => {
      const feed = this.shelf.querySelector("#shelf-notifications-feed");
      feed.innerHTML = `<div style="text-align:center;padding:12px;color:#64748B;font-size:11px;">No unread system events</div>`;
      toast.info("Notifications Cleared", "Event feed emptied.");
    });

    // Keyboard shortcut Cmd + Shift + N
    window.addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "n") {
        e.preventDefault();
        this.toggle();
      }
    });
  }

  open() {
    this.isOpen = true;
    this.shelf.classList.add("open");
  }

  close() {
    this.isOpen = false;
    this.shelf.classList.remove("open");
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }
}
