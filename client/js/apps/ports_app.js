/**
 * Ubuntu Server OS — Visual Listening Ports Scanner (ss -tulpn)
 */

import { toast } from "../components/toast.js";

export class PortsApp {
  constructor(container, apiFacade) {
    this.container = container;
    this.api = apiFacade;
    this.currentFilter = "all";
    this.searchTerm = "";

    this.sockets = [
      { proto: "tcp", state: "LISTEN", recvQ: 0, sendQ: 511, localAddr: "0.0.0.0", port: 80, peerAddr: "0.0.0.0:*", process: "nginx: master", pid: 1420, exposure: "public" },
      { proto: "tcp", state: "LISTEN", recvQ: 0, sendQ: 511, localAddr: "0.0.0.0", port: 443, peerAddr: "0.0.0.0:*", process: "nginx: master", pid: 1420, exposure: "public" },
      { proto: "tcp", state: "LISTEN", recvQ: 0, sendQ: 128, localAddr: "0.0.0.0", port: 22, peerAddr: "0.0.0.0:*", process: "sshd", pid: 940, exposure: "public" },
      { proto: "tcp", state: "LISTEN", recvQ: 0, sendQ: 244, localAddr: "127.0.0.1", port: 5432, peerAddr: "0.0.0.0:*", process: "postgres", pid: 2110, exposure: "loopback" },
      { proto: "tcp", state: "LISTEN", recvQ: 0, sendQ: 511, localAddr: "127.0.0.1", port: 6379, peerAddr: "0.0.0.0:*", process: "redis-server", pid: 1980, exposure: "loopback" },
      { proto: "tcp", state: "LISTEN", recvQ: 0, sendQ: 128, localAddr: "127.0.0.1", port: 8080, peerAddr: "0.0.0.0:*", process: "python3 (http)", pid: 3412, exposure: "loopback" },
      { proto: "udp", state: "UNCONN", recvQ: 0, sendQ: 0, localAddr: "100.84.12.9", port: 51820, peerAddr: "0.0.0.0:*", process: "wireguard (wg0)", pid: 812, exposure: "vpn" },
      { proto: "udp", state: "UNCONN", recvQ: 0, sendQ: 0, localAddr: "127.0.0.53", port: 53, peerAddr: "0.0.0.0:*", process: "systemd-resolve", pid: 640, exposure: "loopback" },
      { proto: "tcp", state: "LISTEN", recvQ: 0, sendQ: 128, localAddr: "127.0.0.1", port: 9100, peerAddr: "0.0.0.0:*", process: "node_exporter", pid: 1822, exposure: "loopback" }
    ];

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="ports-app-wrapper" style="display:flex;flex-direction:column;height:100%;background:#0A121E;color:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;">
        <!-- Top Toolbar & Stats -->
        <div style="padding:12px 16px;background:rgba(255,255,255,0.03);border-bottom:1px solid rgba(255,255,255,0.08);display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;">
          <!-- Left: Filter Pills -->
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:11px;font-weight:700;color:#94A3B8;text-transform:uppercase;letter-spacing:0.05em;margin-right:4px;">Filter:</span>
            <div class="macos-segmented-bar" id="ports-filter-group">
              <button class="macos-segment-btn active" data-filter="all">All (${this.sockets.length})</button>
              <button class="macos-segment-btn" data-filter="tcp">TCP</button>
              <button class="macos-segment-btn" data-filter="udp">UDP</button>
              <button class="macos-segment-btn" data-filter="public" style="color:#FFB547;">Public Exposed</button>
              <button class="macos-segment-btn" data-filter="loopback">Local Only</button>
            </div>
          </div>

          <!-- Right: Search & Quick Refresh -->
          <div style="display:flex;align-items:center;gap:10px;">
            <div style="position:relative;display:flex;align-items:center;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" style="position:absolute;left:8px;pointer-events:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input type="text" id="ports-search-input" placeholder="Search port or daemon..." style="background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.1);border-radius:6px;padding:4px 8px 4px 26px;color:#FFFFFF;font-size:12px;outline:none;width:170px;" />
            </div>
            <button id="btn-refresh-ports" class="btn btn-secondary" style="padding:4px 10px;font-size:11px;display:flex;align-items:center;gap:5px;border-radius:6px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
              <span>Scan ss -tulpn</span>
            </button>
          </div>
        </div>

        <!-- Security Summary Banner -->
        <div style="padding:8px 16px;background:rgba(233,84,32,0.08);border-bottom:1px solid rgba(233,84,32,0.18);display:flex;align-items:center;justify-content:space-between;font-size:12px;">
          <div style="display:flex;align-items:center;gap:8px;">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#E95420" stroke-width="2.2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
            <span><strong>Socket Exposure Audit:</strong> 3 ports are bound to <code>0.0.0.0</code> (HTTP, HTTPS, SSH). Databases (PostgreSQL 5432, Redis 6379) are safely locked to loopback.</span>
          </div>
          <span style="font-family:'SF Mono',monospace;font-size:11px;color:#2DDC88;">UFW: ACTIVE (22, 80, 443 ALLOWED)</span>
        </div>

        <!-- Sockets Table -->
        <div style="flex:1;overflow-y:auto;padding:0;">
          <table style="width:100%;border-collapse:collapse;font-size:12px;text-align:left;">
            <thead>
              <tr style="background:rgba(0,0,0,0.4);border-bottom:1px solid rgba(255,255,255,0.08);color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;">
                <th style="padding:10px 16px;">Proto</th>
                <th style="padding:10px 12px;">State</th>
                <th style="padding:10px 12px;">Local Address : Port</th>
                <th style="padding:10px 12px;">Security Exposure</th>
                <th style="padding:10px 12px;">Process Name</th>
                <th style="padding:10px 12px;">PID</th>
                <th style="padding:10px 16px;text-align:right;">Actions</th>
              </tr>
            </thead>
            <tbody id="ports-table-body">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>
      </div>
    `;

    this.renderRows();
    this.bindEvents();
  }

  renderRows() {
    const tbody = this.container.querySelector("#ports-table-body");
    const filtered = this.sockets.filter(sock => {
      // Protocol / Exposure filter
      if (this.currentFilter === "tcp" && !sock.proto.startsWith("tcp")) return false;
      if (this.currentFilter === "udp" && !sock.proto.startsWith("udp")) return false;
      if (this.currentFilter === "public" && sock.exposure !== "public") return false;
      if (this.currentFilter === "loopback" && sock.exposure !== "loopback") return false;

      // Search term
      if (this.searchTerm) {
        const q = this.searchTerm.toLowerCase();
        const matchesPort = sock.port.toString().includes(q);
        const matchesProc = sock.process.toLowerCase().includes(q);
        const matchesAddr = sock.localAddr.toLowerCase().includes(q);
        if (!matchesPort && !matchesProc && !matchesAddr) return false;
      }
      return true;
    });

    if (!filtered.length) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center;padding:32px;color:#64748B;">
            No listening sockets match the current filter.
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = filtered.map(sock => {
      let badgeHtml = "";
      if (sock.exposure === "public") {
        badgeHtml = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:rgba(255,181,71,0.15);color:#FFB547;border:1px solid rgba(255,181,71,0.3);"><span style="width:5px;height:5px;border-radius:50%;background:#FFB547;"></span>PUBLIC (0.0.0.0)</span>`;
      } else if (sock.exposure === "loopback") {
        badgeHtml = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:rgba(45,220,136,0.15);color:#2DDC88;border:1px solid rgba(45,220,136,0.3);"><span style="width:5px;height:5px;border-radius:50%;background:#2DDC88;"></span>LOOPBACK (LOCAL)</span>`;
      } else {
        badgeHtml = `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:9999px;font-size:10px;font-weight:700;background:rgba(56,189,248,0.15);color:#38BDF8;border:1px solid rgba(56,189,248,0.3);"><span style="width:5px;height:5px;border-radius:50%;background:#38BDF8;"></span>VPN TUNNEL</span>`;
      }

      return `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.04);transition:background 120ms;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='transparent'">
          <td style="padding:10px 16px;font-family:'SF Mono',monospace;font-size:11px;font-weight:700;color:#38BDF8;">${sock.proto.toUpperCase()}</td>
          <td style="padding:10px 12px;font-family:'SF Mono',monospace;font-size:11px;color:#94A3B8;">${sock.state}</td>
          <td style="padding:10px 12px;font-family:'SF Mono',monospace;font-size:12px;font-weight:600;color:#FFFFFF;">
            <span>${sock.localAddr}:</span><span style="color:#2196F3;font-weight:bold;">${sock.port}</span>
          </td>
          <td style="padding:10px 12px;">${badgeHtml}</td>
          <td style="padding:10px 12px;font-weight:500;color:#E2E8F0;">${sock.process}</td>
          <td style="padding:10px 12px;font-family:'SF Mono',monospace;font-size:11px;color:#94A3B8;">${sock.pid}</td>
          <td style="padding:10px 16px;text-align:right;">
            <button class="btn btn-secondary btn-copy-sock" data-socket="${sock.localAddr}:${sock.port}" style="padding:2px 8px;font-size:10px;border-radius:4px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:#CBD5E1;cursor:pointer;">Copy</button>
          </td>
        </tr>
      `;
    }).join("");

    tbody.querySelectorAll(".btn-copy-sock").forEach(btn => {
      btn.addEventListener("click", () => {
        navigator.clipboard?.writeText(btn.dataset.socket);
        toast.success("Socket Copied", `${btn.dataset.socket} copied to clipboard.`);
      });
    });
  }

  bindEvents() {
    const filterGroup = this.container.querySelector("#ports-filter-group");
    filterGroup.querySelectorAll(".macos-segment-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        filterGroup.querySelectorAll(".macos-segment-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        this.currentFilter = btn.dataset.filter;
        this.renderRows();
      });
    });

    const searchInput = this.container.querySelector("#ports-search-input");
    searchInput.addEventListener("input", (e) => {
      this.searchTerm = e.target.value.trim();
      this.renderRows();
    });

    const refreshBtn = this.container.querySelector("#btn-refresh-ports");
    refreshBtn.addEventListener("click", () => {
      toast.info("Socket Table Refreshed", "ss -tulpn scan completed: 9 active listening sockets.");
    });
  }
}
