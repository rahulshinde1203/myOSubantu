/**
 * Ubuntu Server OS — macOS Window Manager with Window Edge Snapping & Tiling
 */

import { eventBus } from "./event_bus.js";

export class MacosWindowManager {
  constructor(canvasElement, dockController) {
    this.canvas = canvasElement;
    this.dock = dockController;
    this.windows = new Map();
    this.highestZ = 100;

    // Create ghost snap indicator
    this.ghostEl = document.createElement("div");
    this.ghostEl.className = "window-snap-ghost";
    this.canvas.appendChild(this.ghostEl);
  }

  createWindow({ id, title, width = 760, height = 480, contentElement, onClose }) {
    if (this.windows.has(id)) {
      const existing = this.windows.get(id);
      if (existing.isMinimized) {
        this.restoreWindow(id);
      } else {
        this.bringToFront(id);
      }
      return existing;
    }

    const winEl = document.createElement("div");
    winEl.className = "macos-window";
    winEl.id = `macos-win-${id}`;

    // Stagger initial position
    const offset = (this.windows.size % 6) * 28;
    const canvasRect = this.canvas.getBoundingClientRect();
    const startX = Math.max(20, (canvasRect.width - width) / 2 + offset);
    const startY = Math.max(16, (canvasRect.height - height) / 2 + offset - 20);

    winEl.style.width = `${width}px`;
    winEl.style.height = `${height}px`;
    winEl.style.left = `${startX}px`;
    winEl.style.top = `${startY}px`;
    winEl.style.zIndex = ++this.highestZ;

    winEl.innerHTML = `
      <div class="macos-titlebar" data-drag-handle="true">
        <div class="macos-traffic-lights">
          <button class="traffic-btn traffic-close" title="Close Window" aria-label="Close"></button>
          <button class="traffic-btn traffic-min" title="Minimize Window" aria-label="Minimize"></button>
          <button class="traffic-btn traffic-max" title="Zoom / Fullscreen" aria-label="Fullscreen"></button>
        </div>
        <div class="macos-window-title">
          <span>${title}</span>
        </div>
      </div>
      <div class="macos-window-body"></div>
      <div class="window-resize-handle"></div>
    `;

    const body = winEl.querySelector(".macos-window-body");
    if (contentElement) body.appendChild(contentElement);

    this.canvas.appendChild(winEl);

    // Setup traffic light controls
    const closeBtn = winEl.querySelector(".traffic-close");
    const minBtn = winEl.querySelector(".traffic-min");
    const maxBtn = winEl.querySelector(".traffic-max");
    const titlebar = winEl.querySelector(".macos-titlebar");

    closeBtn.addEventListener("click", () => this.closeWindow(id));
    minBtn.addEventListener("click", () => this.minimizeWindow(id));
    maxBtn.addEventListener("click", () => this.toggleFullscreen(id));

    winEl.addEventListener("mousedown", () => this.bringToFront(id));

    const winObj = {
      id,
      element: winEl,
      isMaximized: false,
      isMinimized: false,
      isSnapped: null, // "left" | "right" | "top" | null
      prevRect: null,
      onClose
    };

    this._setupDrag(winObj, titlebar);
    this._setupResize(winObj, winEl.querySelector(".window-resize-handle"));

    this.windows.set(id, winObj);
    this.bringToFront(id);
    return winObj;
  }

  bringToFront(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;

    this.windows.forEach(w => w.element.classList.remove("focused"));
    winObj.element.classList.add("focused");
    winObj.element.style.zIndex = ++this.highestZ;
    winObj.element.classList.remove("minimized");
    winObj.isMinimized = false;
  }

  minimizeWindow(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;
    winObj.element.classList.add("minimized");
    winObj.isMinimized = true;
  }

  restoreWindow(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;
    winObj.element.classList.remove("minimized");
    winObj.isMinimized = false;
    this.bringToFront(id);
  }

  toggleFullscreen(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;

    if (winObj.isMaximized) {
      winObj.element.classList.remove("fullscreen");
      winObj.isMaximized = false;
      winObj.isSnapped = null;
      if (winObj.prevRect) {
        winObj.element.style.left = `${winObj.prevRect.left}px`;
        winObj.element.style.top = `${winObj.prevRect.top}px`;
        winObj.element.style.width = `${winObj.prevRect.width}px`;
        winObj.element.style.height = `${winObj.prevRect.height}px`;
      }
    } else {
      this._savePreSnapRect(winObj);
      winObj.element.classList.add("fullscreen");
      winObj.isMaximized = true;
    }
  }

  closeWindow(id) {
    const winObj = this.windows.get(id);
    if (!winObj) return;
    if (winObj.onClose) winObj.onClose();
    winObj.element.parentNode.removeChild(winObj.element);
    this.windows.delete(id);
    if (this.dock) this.dock.markClosed(id.replace("-win", ""));
  }

  _savePreSnapRect(winObj) {
    if (!winObj.prevRect) {
      winObj.prevRect = {
        left: parseInt(winObj.element.style.left, 10) || 40,
        top: parseInt(winObj.element.style.top, 10) || 40,
        width: parseInt(winObj.element.style.width, 10) || 760,
        height: parseInt(winObj.element.style.height, 10) || 480
      };
    }
  }

  _setupDrag(winObj, handleEl) {
    let isDragging = false;
    let startX = 0, startY = 0, initialLeft = 0, initialTop = 0;
    let pendingSnap = null;
    const windowEl = winObj.element;

    handleEl.addEventListener("mousedown", (e) => {
      if (e.target.closest(".macos-traffic-lights")) return;

      // If dragging while snapped or fullscreen, restore normal dimensions
      if (winObj.isSnapped || winObj.isMaximized) {
        this._unsnap(winObj, e.clientX);
      }

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
        const currentLeft = Math.max(0, initialLeft + dx);
        const currentTop = Math.max(0, initialTop + dy);

        windowEl.style.left = `${currentLeft}px`;
        windowEl.style.top = `${currentTop}px`;

        // Check edge snapping zones
        const canvasRect = this.canvas.getBoundingClientRect();
        const cursorX = moveEvent.clientX;
        const cursorY = moveEvent.clientY;

        if (cursorX <= canvasRect.left + 16) {
          // Left 50% snap
          pendingSnap = "left";
          this._showGhostSnap(0, 0, canvasRect.width / 2, canvasRect.height - 70);
        } else if (cursorX >= canvasRect.right - 16) {
          // Right 50% snap
          pendingSnap = "right";
          this._showGhostSnap(canvasRect.width / 2, 0, canvasRect.width / 2, canvasRect.height - 70);
        } else if (cursorY <= canvasRect.top + 8) {
          // Top Maximize snap
          pendingSnap = "top";
          this._showGhostSnap(0, 0, canvasRect.width, canvasRect.height - 70);
        } else {
          pendingSnap = null;
          this._hideGhostSnap();
        }
      };

      const onMouseUp = () => {
        isDragging = false;
        handleEl.style.cursor = "grab";
        this._hideGhostSnap();

        if (pendingSnap) {
          this._applySnap(winObj, pendingSnap);
          pendingSnap = null;
        }

        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    });
  }

  _showGhostSnap(left, top, width, height) {
    this.ghostEl.style.display = "block";
    this.ghostEl.style.left = `${left}px`;
    this.ghostEl.style.top = `${top}px`;
    this.ghostEl.style.width = `${width}px`;
    this.ghostEl.style.height = `${height}px`;
  }

  _hideGhostSnap() {
    this.ghostEl.style.display = "none";
  }

  _applySnap(winObj, snapZone) {
    this._savePreSnapRect(winObj);
    const canvasRect = this.canvas.getBoundingClientRect();
    const availableHeight = canvasRect.height - 70; // keep dock clear

    winObj.element.classList.remove("fullscreen");
    winObj.isMaximized = false;
    winObj.isSnapped = snapZone;

    if (snapZone === "left") {
      winObj.element.style.left = "0px";
      winObj.element.style.top = "0px";
      winObj.element.style.width = `${canvasRect.width / 2}px`;
      winObj.element.style.height = `${availableHeight}px`;
    } else if (snapZone === "right") {
      winObj.element.style.left = `${canvasRect.width / 2}px`;
      winObj.element.style.top = "0px";
      winObj.element.style.width = `${canvasRect.width / 2}px`;
      winObj.element.style.height = `${availableHeight}px`;
    } else if (snapZone === "top") {
      this.toggleFullscreen(winObj.id);
    }
  }

  _unsnap(winObj, mouseClientX) {
    winObj.element.classList.remove("fullscreen");
    winObj.isMaximized = false;
    winObj.isSnapped = null;

    if (winObj.prevRect) {
      winObj.element.style.width = `${winObj.prevRect.width}px`;
      winObj.element.style.height = `${winObj.prevRect.height}px`;
      // Center the titlebar roughly under cursor
      const newLeft = Math.max(10, mouseClientX - winObj.prevRect.width / 2);
      winObj.element.style.left = `${newLeft}px`;
    }
  }

  _setupResize(winObj, handleEl) {
    let isResizing = false;
    let startX = 0, startY = 0, initialW = 0, initialH = 0;
    const windowEl = winObj.element;

    handleEl.addEventListener("mousedown", (e) => {
      if (windowEl.classList.contains("fullscreen")) return;
      e.stopPropagation();
      isResizing = true;
      startX = e.clientX;
      startY = e.clientY;
      initialW = windowEl.offsetWidth;
      initialH = windowEl.offsetHeight;

      const onMouseMove = (moveEvent) => {
        if (!isResizing) return;
        const nw = Math.max(380, initialW + (moveEvent.clientX - startX));
        const nh = Math.max(240, initialH + (moveEvent.clientY - startY));
        windowEl.style.width = `${nw}px`;
        windowEl.style.height = `${nh}px`;
        winObj.isSnapped = null;
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
