/**
 * Ubuntu Server OS — macOS Control Center Dropdown
 */

import { eventBus } from "../event_bus.js";
import { appState } from "../state.js";
import { toast } from "./toast.js";

export class ControlCenter {
  constructor() {
    this.isOpen = false;
    this.currentTheme = "sonoma"; // "sonoma" | "oled" | "aubergine"
    this.pollingRate = 2000;
    this.vpnActive = true;
    this.soundAlerts = true;
    this.render();
    this.bindEvents();
  }

  render() {
    let el = document.getElementById("macos-control-center");
    if (!el) {
      el = document.createElement("div");
      el.id = "macos-control-center";
      el.className = "control-center-popover";
      document.body.appendChild(el);
    }
    this.el = el;

    this.el.innerHTML = `
      <div class="cc-header">
        <span style="font-weight:700;color:#FFFFFF;font-size:13px;">Control Center</span>
        <span style="font-size:11px;color:#94A3B8;">srv-prod-node01</span>
      </div>

      <!-- Quick Toggle Cards Grid -->
      <div class="cc-grid">
        <div class="cc-toggle-card active" id="cc-toggle-vpn">
          <div class="cc-icon-box" style="background:#2DDC88;color:#060E1A;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
          </div>
          <div class="cc-card-info">
            <span class="cc-card-title">WireGuard VPN</span>
            <span class="cc-card-sub" id="cc-vpn-sub">100.84.12.9 (Active)</span>
          </div>
        </div>

        <div class="cc-toggle-card" id="cc-toggle-maint">
          <div class="cc-icon-box" style="background:rgba(255,255,255,0.12);color:#F1F5F9;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          </div>
          <div class="cc-card-info">
            <span class="cc-card-title">Maintenance</span>
            <span class="cc-card-sub" id="cc-maint-sub">Normal Online</span>
          </div>
        </div>
      </div>

      <!-- Telemetry Polling Rate Selector -->
      <div class="cc-section">
        <div class="cc-section-label">
          <span>Telemetry Polling Rate</span>
          <span style="font-family:'SF Mono',monospace;color:#38BDF8;" id="cc-rate-display">2.0s</span>
        </div>
        <div class="macos-segmented-bar" style="width:100%;display:grid;grid-template-columns:repeat(4,1fr);text-align:center;">
          <button class="macos-segment-btn" data-rate="1000">1.0s</button>
          <button class="macos-segment-btn active" data-rate="2000">2.0s</button>
          <button class="macos-segment-btn" data-rate="5000">5.0s</button>
          <button class="macos-segment-btn" data-rate="10000">10s</button>
        </div>
      </div>

      <!-- Wallpaper & Theme Selector -->
      <div class="cc-section">
        <div class="cc-section-label">Desktop Wallpaper</div>
        <div class="macos-segmented-bar" style="width:100%;display:grid;grid-template-columns:repeat(3,1fr);text-align:center;">
          <button class="macos-segment-btn active" data-theme="sonoma">Sonoma</button>
          <button class="macos-segment-btn" data-theme="oled">OLED Black</button>
          <button class="macos-segment-btn" data-theme="aubergine">Aubergine</button>
        </div>
      </div>

      <!-- Sound Alerts Toggle -->
      <div class="cc-row" id="cc-toggle-sound">
        <div style="display:flex;align-items:center;gap:8px;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
          <span>Error Audio Alerts</span>
        </div>
        <span style="color:#2DDC88;font-weight:700;font-size:11px;" id="cc-sound-state">ENABLED</span>
      </div>
    `;

    this.bindControls();
  }

  bindControls() {
    // VPN Toggle
    const vpnCard = this.el.querySelector("#cc-toggle-vpn");
    const vpnSub = this.el.querySelector("#cc-vpn-sub");
    vpnCard.addEventListener("click", () => {
      this.vpnActive = !this.vpnActive;
      if (this.vpnActive) {
        vpnCard.classList.add("active");
        vpnSub.textContent = "100.84.12.9 (Active)";
        toast.success("VPN Connected", "Encrypted WireGuard tunnel active.");
      } else {
        vpnCard.classList.remove("active");
        vpnSub.textContent = "Disconnected";
        toast.warning("VPN Disconnected", "Traffic routing over local interface.");
      }
    });

    // Maintenance Mode Toggle
    const maintCard = this.el.querySelector("#cc-toggle-maint");
    const maintSub = this.el.querySelector("#cc-maint-sub");
    maintCard.addEventListener("click", () => {
      maintCard.classList.toggle("active");
      const isMaint = maintCard.classList.contains("active");
      maintSub.textContent = isMaint ? "Active (Locked)" : "Normal Online";
      if (isMaint) {
        toast.warning("Maintenance Mode", "External HTTP traffic redirected to 503 Maintenance page.");
      } else {
        toast.info("Maintenance Mode", "Normal production traffic restored.");
      }
    });

    // Polling rate buttons
    const rateBtns = this.el.querySelectorAll("[data-rate]");
    const rateDisplay = this.el.querySelector("#cc-rate-display");
    rateBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        rateBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.pollingRate = parseInt(btn.dataset.rate, 10);
        rateDisplay.textContent = `${(this.pollingRate / 1000).toFixed(1)}s`;
        eventBus.emit("polling:rate-changed", this.pollingRate);
        toast.info("Polling Adjusted", `Hardware telemetry sampling interval set to ${this.pollingRate / 1000}s.`);
      });
    });

    // Theme buttons
    const themeBtns = this.el.querySelectorAll("[data-theme]");
    themeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        themeBtns.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.setWallpaperTheme(btn.dataset.theme);
      });
    });

    // Sound toggle
    const soundRow = this.el.querySelector("#cc-toggle-sound");
    const soundState = this.el.querySelector("#cc-sound-state");
    soundRow.addEventListener("click", () => {
      this.soundAlerts = !this.soundAlerts;
      soundState.textContent = this.soundAlerts ? "ENABLED" : "MUTED";
      soundState.style.color = this.soundAlerts ? "#2DDC88" : "#94A3B8";
    });
  }

  setWallpaperTheme(theme) {
    this.currentTheme = theme;
    const body = document.body;
    if (theme === "oled") {
      body.style.backgroundImage = "none";
      body.style.backgroundColor = "#000000";
      toast.info("OLED Theme", "True black theme applied for OLED screens.");
    } else if (theme === "aubergine") {
      body.style.backgroundImage = `
        radial-gradient(at 10% 20%, #4C1D42 0px, transparent 55%),
        radial-gradient(at 90% 80%, #77216F 0px, transparent 60%),
        radial-gradient(at 50% 50%, #2C001E 0px, transparent 70%)
      `;
      body.style.backgroundColor = "#1A0012";
      toast.info("Ubuntu Theme", "Canonical Aubergine dark wallpaper applied.");
    } else {
      // Default Sonoma
      body.style.backgroundImage = `
        radial-gradient(at 15% 10%, #17325C 0px, transparent 50%),
        radial-gradient(at 85% 15%, #3B163B 0px, transparent 55%),
        radial-gradient(at 50% 80%, #0D2447 0px, transparent 60%),
        radial-gradient(at 90% 90%, #5E2129 0px, transparent 50%),
        radial-gradient(at 20% 85%, #0B1930 0px, transparent 50%)
      `;
      body.style.backgroundColor = "#080D1A";
      toast.info("Sonoma Theme", "Sonoma Twilight gradient wallpaper applied.");
    }
  }

  open() {
    this.isOpen = true;
    this.el.classList.add("open");
  }

  toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  close() {
    this.isOpen = false;
    this.el.classList.remove("open");
  }

  bindEvents() {
    document.addEventListener("click", (e) => {
      if (!this.isOpen) return;
      if (!this.el.contains(e.target) && !e.target.closest("#menu-control-center-btn")) {
        this.close();
      }
    });
  }
}
