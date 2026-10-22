/**
 * Ubuntu Server OS — Floating Window Manager
 * Manages dragging, resizing, active z-index stacking, minimizing and maximizing
 */

import { eventBus } from "../event_bus.js";
import { appState } from "../state.js";

export class WindowManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.windows = new Map();
    this.highestZ = 100;

    // Global keyboard listener for Esc key to close or minimize active window
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && appState.activeWindowId) {
        this.closeWindow(appState.activeWindowId);
      }
    });
  }

  createWindow({ id, title, iconSvg, width = 680, height = 440, contentElement, onClose }) {
    if (this.windows.has(id)) {
      this.bringToFront(id);
      return this.windows.get(id);
    }

    const winEl = document.createElement("div");
    winEl.className = "os-window";
    winEl.id = `win-${id}`;

    // Center the window on creation with stagger
    const offset = this.windows.size * 24;
    const canvasRect = this.canvas.getBoundingClientRect();
    const startX = Math.max(16, (canvasRect.width - width) / 2 + offset);
    const startY = Math.max(16, (canvasRect.height - height) / 2 + offset);

    winEl.style.width = `${width}px`;
    winEl.style.height = `${height}px`;
    winEl.style.left = `${startX}px`;
    winEl.style.top = `${startY}px`;
    winEl.style.zIndex = ++this.highestZ;

    winEl.innerHTML = `
      <div class="window-titlebar" data-drag-handle="true">
        <div class="window-title">
          <span class="window-icon">${iconSvg || ""}</span>
          <span>${title}</span>
        </div>
        <div class="window-controls">
          <button class="win-btn win-btn-minimize" title="Minimize" aria-label="Minimize"></button>
          <button class="win-btn win-btn-maximize" title="Maximize" aria-label="Maximize"></button>
          <button class="win-btn win-btn-close" title="Close" aria-label="Close"></button>
        </div>
      </div>
      <div class="window-body"></div>
      <div class="window-resize-handle"></div>
    `;

    const body = winEl.querySelector(".window-body");
    if (contentElement) body.appendChild(contentElement);

    this.canvas.appendChild(winEl);

    // Setup window controls
    const closeBtn = winEl.querySelector(".win-btn-close");
    const minBtn = winEl.querySelector(".win-btn-minimize");
    const maxBtn = winEl.querySelector(".win-btn-maximize");
    const titlebar = winEl.querySelector(".window-titlebar");

    closeBtn.addEventListener("click", () => this.closeWindow(id));
    minBtn.addEventListener("click", () => this.minimizeWindow(id));
    maxBtn.addEventListener("click", () => this.toggleMaximize(id));

    winEl.addEventListener("mousedown", () => this.bringToFront(id));

    this._setupDrag(winEl, titlebar);
    this._setupResize(winEl, winEl.querySelector(".window-resize-handle"));

    const winObj = {
      id,
      element: winEl,
      isMaximized: false,
      isMinimized: false,
      prevRect: null,
      onClose
    };

    this.windows.set(id, winObj);
    this.bringToFront(id);
    return winObj;
  }

  bringToFront(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;

    this.windows.forEach(w => w.element.classList.remove("active-window"));
    winObj.element.classList.add("active-window");
    winObj.element.style.zIndex = ++this.highestZ;
    winObj.element.classList.remove("minimized");
    winObj.isMinimized = false;
    appState.activeWindowId = id;
  }

  minimizeWindow(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;
    winObj.element.classList.add("minimized");
    winObj.isMinimized = true;
    if (appState.activeWindowId === id) {
      appState.activeWindowId = null;
    }
  }

  toggleMaximize(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;

    if (winObj.isMaximized) {
      winObj.element.classList.remove("maximized");
      winObj.isMaximized = false;
      if (winObj.prevRect) {
        winObj.element.style.left = `${winObj.prevRect.left}px`;
        winObj.element.style.top = `${winObj.prevRect.top}px`;
        winObj.element.style.width = `${winObj.prevRect.width}px`;
        winObj.element.style.height = `${winObj.prevRect.height}px`;
      }
    } else {
      winObj.prevRect = {
        left: parseInt(winObj.element.style.left, 10),
        top: parseInt(winObj.element.style.top, 10),
        width: parseInt(winObj.element.style.width, 10),
        height: parseInt(winObj.element.style.height, 10)
      };
      winObj.element.classList.add("maximized");
      winObj.isMaximized = true;
    }
  }

  closeWindow(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;
    if (winObj.onClose) winObj.onClose();
    winObj.element.parentNode.removeChild(winObj.element);
    this.windows.delete(id);
    if (appState.activeWindowId === id) {
      appState.activeWindowId = null;
    }
  }

  _setupDrag(windowEl, handleEl) {
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;

    handleEl.addEventListener("mousedown", (e) => {
      if (e.target.closest(".window-controls")) return;
      if (windowEl.classList.contains("maximized")) return;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = parseInt(windowEl.style.left, 10) || 0;
      initialTop = parseInt(windowEl.style.top, 10) || 0;
      handleEl.style.cursor = "grabbing";

      const onMouseMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        windowEl.style.left = `${Math.max(0, initialLeft + dx)}px`;
        windowEl.style.top = `${Math.max(0, initialTop + dy)}px`;
      };

      const onMouseUp = () => {
        isDragging = false;
        handleEl.style.cursor = "grab";
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  _setupResize(windowEl, handleEl) {
    let isResizing = false;
    let startX = 0, startY = 0, initialW = 0, initialH = 0;

    handleEl.addEventListener("mousedown", (e) => {
      if (windowEl.classList.contains("maximized")) return;
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      initialW = windowEl.offsetWidth;
      initialH = windowEl.offsetHeight;

      const onMouseMove = (moveEvent) => {
        if (!isResizing) return;
        const nw = Math.max(320, initialW + (moveEvent.clientX - startX));
        const nh = Math.max(200, initialH + (moveEvent.clientY - startY));
        windowEl.style.width = `${nw}px`;
        windowEl.style.height = `${nh}px`;
      };

      const onMouseUp = () => {
        isResizing = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }
}
