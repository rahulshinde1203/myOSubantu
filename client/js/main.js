/**
 * Ubuntu Server OS — MacBook Desktop Workstation Bootstrap
 */

import { ApiFacade } from "./api/api_facade.js";
import { eventBus } from "./event_bus.js";
import { appState } from "./state.js";
import { ToastManager, toast } from "./components/toast.js";
import { MacosDock } from "./macos_dock.js";
import { MacosWindowManager } from "./macos_windows.js";

import { ControlCenter } from "./components/control_center.js";
import { SpotlightSearch } from "./components/spotlight.js";
import { NotificationShelf } from "./components/notification_shelf.js";

import { DashboardApp } from "./apps/dashboard_app.js";
import { ServicesApp } from "./apps/services_app.js";
import { FilesApp } from "./apps/files_app.js";
import { LogsApp } from "./apps/logs_app.js";
import { TerminalApp } from "./apps/terminal_app.js";
import { HtopApp } from "./apps/htop_app.js";
import { DfApp } from "./apps/df_app.js";
import { PortsApp } from "./apps/ports_app.js";
import { MenubarDropdowns } from "./components/menubar_dropdowns.js";

document.addEventListener("DOMContentLoaded", () => {
  // 1. Initialize API Facade (respects localStorage preference if set)
  const api = new ApiFacade();
  appState.mode = api.getMode();

  // 2. Initialize Canvas & macOS Controllers
  const canvasEl = document.getElementById("macos-canvas");
  const dockWrapperEl = document.getElementById("macos-dock-wrapper");

  let dock = null;
  const windowManager = new MacosWindowManager(canvasEl, null);
  dock = new MacosDock(dockWrapperEl, windowManager);
  windowManager.dock = dock;

  // 3. Initialize Control Center, Spotlight, and Notification Center
  const controlCenter = new ControlCenter();
  const spotlight = new SpotlightSearch();
  const notificationShelf = new NotificationShelf();
  const menubarDropdowns = new MenubarDropdowns(windowManager);

  // 4. Initialize Top Menubar Elements & Clock
  initTopMenubar(api, spotlight, controlCenter, notificationShelf);

  // 5. Spawn Default Activity Monitor (Dashboard) Window
  spawnDashboardWindow();

  // 6. Handle App Launches from macOS Dock & Top Menu
  eventBus.on("app:launch", (appName) => {
    if (appName === "dashboard") {
      spawnDashboardWindow();
    } else if (appName === "services") {
      spawnServicesWindow();
    } else if (appName === "htop") {
      spawnHtopWindow();
    } else if (appName === "df") {
      spawnDfWindow();
    } else if (appName === "ports") {
      spawnPortsWindow();
    } else if (appName === "terminal") {
      spawnTerminalWindow();
    } else if (appName === "files") {
      spawnFilesWindow();
    } else if (appName === "logs") {
      spawnLogsWindow();
    } else if (appName === "settings") {
      controlCenter.toggle();
    }
  });

  function spawnDashboardWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "display:flex;flex-direction:column;gap:14px;overflow-y:auto;height:100%;";
    new DashboardApp(container, api);

    windowManager.createWindow({
      id: "dashboard-win",
      title: "Activity Monitor — Ubuntu Server Telemetry",
      width: isMobile ? window.innerWidth : Math.min(1160, window.innerWidth - 60),
      height: isMobile ? window.innerHeight - 100 : Math.min(680, window.innerHeight - 120),
      contentElement: container
    });
    dock.markRunning("dashboard");
  }

  function spawnHtopWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "height:100%;display:flex;flex-direction:column;";
    new HtopApp(container, api);

    windowManager.createWindow({
      id: "htop-win",
      title: "htop — Realtime System Monitor",
      width: isMobile ? window.innerWidth : 880,
      height: isMobile ? window.innerHeight - 100 : 540,
      contentElement: container
    });
    dock.markRunning("htop");
  }

  function spawnDfWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "height:100%;display:flex;flex-direction:column;";
    new DfApp(container, api);

    windowManager.createWindow({
      id: "df-win",
      title: "Disk Utility — df -Th Storage Partitions",
      width: isMobile ? window.innerWidth : 780,
      height: isMobile ? window.innerHeight - 100 : 460,
      contentElement: container
    });
    dock.markRunning("df");
  }

  function spawnPortsWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "height:100%;display:flex;flex-direction:column;";
    new PortsApp(container, api);

    windowManager.createWindow({
      id: "ports-win",
      title: "Listening Ports — ss -tulpn Socket Inspector",
      width: isMobile ? window.innerWidth : 840,
      height: isMobile ? window.innerHeight - 100 : 500,
      contentElement: container
    });
    dock.markRunning("ports");
  }

  function spawnTerminalWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "height:100%;display:flex;flex-direction:column;";
    new TerminalApp(container);

    windowManager.createWindow({
      id: "terminal-win",
      title: "Terminal — tty-operator@srv-prod-node01.lan",
      width: isMobile ? window.innerWidth : 820,
      height: isMobile ? window.innerHeight - 100 : 490,
      contentElement: container
    });
    dock.markRunning("terminal");
  }

  function spawnServicesWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "height:100%;display:flex;flex-direction:column;";
    new ServicesApp(container, api);

    windowManager.createWindow({
      id: "services-win",
      title: "systemd Services Manager",
      width: isMobile ? window.innerWidth : 880,
      height: isMobile ? window.innerHeight - 100 : 520,
      contentElement: container
    });
    dock.markRunning("services");
  }

  function spawnFilesWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "height:100%;display:flex;flex-direction:column;";
    new FilesApp(container, api);

    windowManager.createWindow({
      id: "files-win",
      title: "Finder — Scoped Storage Browser",
      width: isMobile ? window.innerWidth : 800,
      height: isMobile ? window.innerHeight - 100 : 480,
      contentElement: container
    });
    dock.markRunning("files");
  }

  function spawnLogsWindow() {
    const isMobile = window.innerWidth < 768;
    const container = document.createElement("div");
    container.style.cssText = "height:100%;display:flex;flex-direction:column;";
    new LogsApp(container, api);

    windowManager.createWindow({
      id: "logs-win",
      title: "Console — systemd-journald Log Stream",
      width: isMobile ? window.innerWidth : 840,
      height: isMobile ? window.innerHeight - 100 : 500,
      contentElement: container
    });
    dock.markRunning("logs");
  }

  // 7. Setup Reboot Modal & Confirmation Challenge
  const modalBackdrop = document.getElementById("reboot-modal");
  const cancelRebootBtn = document.getElementById("btn-cancel-reboot");
  const confirmRebootBtn = document.getElementById("btn-confirm-reboot");
  const rebootChallengeInput = document.getElementById("reboot-challenge-input");

  eventBus.on("modal:confirm-reboot", () => {
    rebootChallengeInput.value = "";
    confirmRebootBtn.disabled = true;
    modalBackdrop.classList.add("open");
  });

  cancelRebootBtn.addEventListener("click", () => {
    modalBackdrop.classList.remove("open");
  });

  rebootChallengeInput.addEventListener("input", (e) => {
    confirmRebootBtn.disabled = e.target.value.trim() !== "srv-prod-node01";
  });

  confirmRebootBtn.addEventListener("click", () => {
    modalBackdrop.classList.remove("open");
    toast.error("Host Reboot Scheduled", "Server reboot signal sent. Remote session will disconnect.");
  });

  // Hash navigation support for direct visual previews
  if (window.location.hash === "#multitask") {
    setTimeout(() => {
      spawnHtopWindow();
      setTimeout(() => {
        spawnDfWindow();
      }, 100);
    }, 100);
  } else if (window.location.hash === "#spotlight") {
    setTimeout(() => {
      spotlight.open();
    }, 150);
  } else if (window.location.hash === "#controlcenter") {
    setTimeout(() => {
      controlCenter.open();
    }, 150);
  } else if (window.location.hash === "#widgets") {
    setTimeout(() => {
      notificationShelf.open();
    }, 150);
  } else if (window.location.hash === "#ports") {
    setTimeout(() => {
      spawnPortsWindow();
    }, 150);
  } else if (window.location.hash === "#gauges") {
    setTimeout(() => {
      const tab = document.querySelector('.segmented-tab[data-view="gauges"]');
      if (tab) tab.click();
    }, 200);
  } else if (window.location.hash.startsWith("#menu-")) {
    const key = window.location.hash.replace("#menu-", "");
    setTimeout(() => {
      const headerItem = document.querySelector(`.macos-menu-item[data-menu-key="${key}"]`);
      if (headerItem) headerItem.click();
    }, 250);
  }

  // Welcome Notification
  setTimeout(() => {
    toast.info("macOS Workstation Active", "Press Cmd+K for Spotlight, click top clock for Widgets, or use Dock.");
  }, 400);
});

function initTopMenubar(apiFacade, spotlight, controlCenter, notificationShelf) {
  const clockEl = document.getElementById("tb-clock");
  const sparkCpu = document.getElementById("tb-spark-cpu");
  const sparkMem = document.getElementById("tb-spark-mem");
  const valCpu = document.getElementById("tb-val-cpu");
  const valMem = document.getElementById("tb-val-mem");
  const modeBadge = document.getElementById("tb-mode-badge");
  const modeText = document.getElementById("tb-mode-text");

  const spotlightBtn = document.getElementById("tb-btn-spotlight");
  const controlCenterBtn = document.getElementById("tb-btn-control-center");

  // Wire Spotlight trigger
  if (spotlightBtn) {
    spotlightBtn.addEventListener("click", () => {
      spotlight.toggle();
    });
  }

  // Wire Control Center trigger
  if (controlCenterBtn) {
    controlCenterBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      controlCenter.toggle();
    });
  }

  // Wire Clock trigger for Notification Shelf
  if (clockEl) {
    clockEl.addEventListener("click", (e) => {
      e.stopPropagation();
      notificationShelf.toggle();
    });
  }

  // Clock updating
  const updateClock = () => {
    const now = new Date();
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const day = days[now.getUTCDay()];
    const month = months[now.getUTCMonth()];
    const date = now.getUTCDate();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');
    clockEl.textContent = `${day} ${month} ${date}  ${hrs}:${mins} UTC`;
  };
  updateClock();
  setInterval(updateClock, 1000);

  // Synchronize initial mode badge appearance
  if (apiFacade.getMode() === "live") {
    modeBadge.className = "mode-badge live";
    modeText.textContent = "LIVE SECURE";
  } else {
    modeBadge.className = "mode-badge";
    modeText.textContent = "MOCK DATA";
  }

  // Mode badge click toggle
  modeBadge.addEventListener("click", () => {
    const newMode = appState.mode === "mock" ? "live" : "mock";
    appState.mode = newMode;
    apiFacade.setMode(newMode);
    if (newMode === "live") {
      modeBadge.className = "mode-badge live";
      modeText.textContent = "LIVE SECURE";
    } else {
      modeBadge.className = "mode-badge";
      modeText.textContent = "MOCK DATA";
    }
    toast.info("Mode Switched", `Switched to ${newMode.toUpperCase()} mode.`);
  });

  // Live telemetry sync
  eventBus.on("metrics:updated", (data) => {
    if (data && data.cpu && data.memory) {
      if (valCpu) valCpu.textContent = `${Math.round(data.cpu.total_percent)}%`;
      if (valMem) valMem.textContent = `${Math.round(data.memory.percent)}%`;
      if (sparkCpu) sparkCpu.style.width = `${data.cpu.total_percent}%`;
      if (sparkMem) sparkMem.style.width = `${data.memory.percent}%`;
    }
  });
}
