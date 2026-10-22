/**
 * Ubuntu Server OS — Toast Notifications System
 */

export class ToastManager {
  constructor(containerId = "toast-container") {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }
  }

  show({ title, message, type = "info", duration = 4000 }) {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const content = document.createElement("div");
    content.className = "toast-content";

    if (title) {
      const t = document.createElement("div");
      t.className = "toast-title";
      t.textContent = title;
      content.appendChild(t);
    }

    if (message) {
      const m = document.createElement("div");
      m.className = "toast-message";
      m.textContent = message;
      content.appendChild(m);
    }

    toast.appendChild(content);
    this.container.appendChild(toast);

    // Trigger animation in next frame
    requestAnimationFrame(() => {
      toast.classList.add("show");
    });

    setTimeout(() => {
      toast.classList.remove("show");
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    }, duration);
  }

  success(title, message) {
    this.show({ title, message, type: "success" });
  }

  error(title, message) {
    this.show({ title, message, type: "error", duration: 6000 });
  }

  warning(title, message) {
    this.show({ title, message, type: "warning", duration: 5000 });
  }

  info(title, message) {
    this.show({ title, message, type: "info" });
  }
}

export const toast = new ToastManager();
