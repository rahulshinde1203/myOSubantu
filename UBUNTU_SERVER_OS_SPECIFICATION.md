# Ubuntu Server OS — Architecture, Security & UI Design System Specification

**Target Platform:** Ubuntu Server 22.04 / 24.04 LTS (x86_64 / arm64)  
**Document Type:** Master System Specification & Design Blueprint  
**Status:** Architecture & Design Specification (Ready for Implementation Phase 1)  
**Date:** October 2026  

---

## Table of Contents
1. [Executive Summary & System Overview](#1-executive-summary--system-overview)
2. [End-to-End System Architecture](#2-end-to-end-system-architecture)
3. [Recommended Project Directory Structure](#3-recommended-project-directory-structure)
4. [Security & Threat Mitigation Architecture](#4-security--threat-mitigation-architecture)
5. [API Contract & RFC 7807 Error Specification](#5-api-contract--rfc-7807-error-specification)
6. [Isolated PTY Terminal Gateway](#6-isolated-pty-terminal-gateway)
7. [UI Design System & Visual Tokens](#7-ui-design-system--visual-tokens)
8. [Dashboard Composition & Layout Specification](#8-dashboard-composition--layout-specification)
9. [Component Inventory & Visual States](#9-component-inventory--visual-states)
10. [Animation, Motion & Accessibility Specs](#10-animation-motion--accessibility-specs)
11. [Testing Strategy & Coverage Targets](#11-testing-strategy--coverage-targets)
12. [Staged Implementation Sequence & Roadmap](#12-staged-implementation-sequence--roadmap)
13. [Key Decisions & Open Approvals](#13-key-decisions--open-approvals)

---

## 1. Executive Summary & System Overview

**Ubuntu Server OS** is an enterprise-grade, browser-based administrative control environment for Ubuntu Server installations. It provides systems administrators with an OS-style desktop interface for real-time observability, allowlisted systemd service management, path-jailed file management, journald log observation, and an isolated browser terminal gateway—without requiring persistent direct SSH access for routine tasks.

### Core Architectural Flow
Requests traverse four strictly decoupled layers:
1. **Client Tier (Browser)**: Built with standard HTML5, CSS custom properties, and native ES modules. Supports a dual-mode API facade:
   - **Mock Mode**: Zero-backend fixture engine for rapid UI validation and layout testing.
   - **Live Mode**: Authenticated REST client (`fetch`) with CSRF token management and WebSocket feeds.
2. **Perimeter Tier (Reverse Proxy & TLS)**: Nginx terminates TLS 1.3, enforces HSTS, applies rate limits (10 req/s burst per IP), and proxies requests over a protected local Unix domain socket (`/run/ubuntu-server-os/web.sock`).
3. **Application Tier (Flask + Gunicorn)**: Runs exclusively under an unprivileged system service account (`ubuntulos` with shell `/usr/sbin/nologin`). Enforces session validation, CSRF checks, RBAC authorization, and input sanitization.
4. **Privileged System Boundary**: Administrative actions (service control, controlled reboot) interface via the Linux `systemd` D-Bus API (`org.freedesktop.systemd1`) or a tightly scoped privileged helper script managed under `/etc/sudoers.d/` with strict parameter allowlisting.

---

## 2. End-to-End System Architecture

```
[Browser Client: Desktop / Tablet / Mobile]
       │
       ├── Mode A: Mock Data Engine (Local Fixtures, No Backend)
       └── Mode B: Live Production Client (fetch / WSS)
              │
              ▼  (HTTPS / WSS via Port 443)
[Security Perimeter: Reverse Proxy (Nginx) + VPN (Tailscale/WireGuard)]
       │
       ├── TLS 1.3 Termination & HSTS
       ├── Static Asset Delivery (HTML, CSS, Vanilla ESM)
       └── Local Unix Domain Socket Proxy
              │
              ▼
[Application Tier: Flask + Gunicorn (User: 'ubuntulos')]
       ├── Session & CSRF Auth Middleware
       ├── RBAC Enforcer (Viewer/Operator vs Administrator)
       ├── Telemetry Engine (psutil background worker + 60-point circular RAM cache)
       ├── Service Manager (Allowlist & Anti-Lockout Blacklist Enforcer)
       ├── File Engine (O_NOFOLLOW / openat2 descriptor-based resolution)
       ├── Journald Log Reader (Structured pagination)
       ├── Persistent Audit Logger (SQLite + systemd-journald dual-write)
       │
       ├── Terminal Gateway Daemon (Isolated Worker)
       │      ├── 60-Second Single-Use Ticket Dispenser
       │      └── PTY Bridge (pty.openpty) -> Isolated Subshell (Unprivileged user)
       │
       ▼
[Ubuntu Linux System Core & Root Boundary]
       ├── systemd D-Bus API (org.freedesktop.systemd1)
       ├── Linux procfs / sysfs
       └── systemd-journald Daemon (Optional RFC 5424 Remote Syslog Forwarding)
```

---

## 3. Recommended Project Directory Structure

```
ubuntu-server-os/
├── pyproject.toml                     # Dependencies, pytest, ruff, mypy configs
├── gunicorn.conf.py                   # WSGI config: Unix socket, worker quotas
├── deploy/                            # Hardened deployment templates
│   ├── nginx/ubuntu-server-os.conf    # TLS termination, HSTS, security headers
│   ├── systemd/ubuntu-os.service      # Unprivileged service unit (ubuntulos)
│   ├── systemd/ubuntu-term.service    # Isolated terminal gateway daemon unit
│   └── sudoers.d/99-ubuntu-os-helper  # Restrictive sudoers definitions
│
├── server/                            # Python Backend Package
│   ├── __init__.py                    # Flask Application Factory (`create_app`)
│   ├── config.py                      # Development, Testing, Production profiles
│   ├── extensions.py                  # SQLAlchemy, CSRF, Rate-limiter instances
│   ├── constants.py                   # Blacklisted services, immutable rules
│   │
│   ├── api/                           # API Blueprints (HTTP Layer Only)
│   │   ├── __init__.py
│   │   ├── v1/
│   │   │   ├── auth.py                # Login, logout, CSRF token, session status
│   │   │   ├── metrics.py             # System telemetry feeds
│   │   │   ├── services.py            # Allowlisted systemd controller
│   │   │   ├── files.py               # Sandboxed descriptor-based file manager
│   │   │   ├── logs.py                # Journald query and stream controllers
│   │   │   └── terminal.py            # Step-up auth & single-use ticket dispenser
│   │
│   ├── core/                          # Domain Logic & Kernel Interfaces
│   │   ├── auth_manager.py            # Argon2id verification, session revocation
│   │   ├── rbac.py                    # Role definitions & decorator guards
│   │   ├── metrics_collector.py       # psutil sampler with ring-buffer cache
│   │   ├── service_manager.py         # D-Bus IPC & blacklist enforcement
│   │   ├── file_manager.py            # O_NOFOLLOW / openat2 secure I/O engine
│   │   ├── log_reader.py              # systemd-journald reader interface
│   │   ├── audit_logger.py            # SQLite recorder + journald forwarder
│   │   └── security_guard.py          # Input regex validators, parameter checks
│   │
│   ├── terminal/                      # Isolated Terminal Subsystem
│   │   ├── __init__.py
│   │   ├── gateway.py                 # WebSocket server & ticket validator
│   │   ├── session_manager.py         # PTY allocator, quotas, process reaper
│   │   └── buffer.py                  # Ring buffer for terminal I/O capping
│   │
│   ├── models/                        # Persistent Storage Models
│   │   ├── __init__.py
│   │   ├── user.py                    # User credentials, roles, lockout tracking
│   │   └── audit_log.py               # Security event records
│   │
│   └── utils/
│       ├── __init__.py
│       ├── errors.py                  # RFC 7807 Problem Details serialization
│       └── validators.py              # Strict schema definitions
│
├── client/                            # Zero-Build Browser Assets (ES Modules)
│   ├── index.html                     # SPA Desktop shell
│   ├── css/
│   │   ├── tokens.css                 # Midnight navy design tokens & accents
│   │   ├── layout.css                 # Desktop workspace, top bar, dock, rail
│   │   ├── components/                # Window, modal, table, terminal styling
│   │   └── responsive.css             # Mobile (<768px), Tablet, Desktop rules
│   │
│   └── js/
│       ├── main.js                    # Application entrypoint & mode switch
│       ├── config.js                  # Global configuration
│       ├── state.js                   # Reactive UI state (Proxy store)
│       ├── event_bus.js               # Cross-component pub/sub bus
│       │
│       ├── api/                       # Data Access Layer
│       │   ├── api_facade.js          # Switchboard: routes to Mock or Live Client
│       │   ├── live_client.js         # Real fetch client with CSRF and error handling
│       │   └── mock/                  # Standalone Mock Data Engine
│       │       ├── mock_client.js     # Intercepts requests and serves fixtures
│       │       ├── fixtures_metrics.js# Simulated psutil telemetry curves
│       │       ├── fixtures_services.js# Simulated systemd services
│       │       ├── fixtures_files.js  # Safe mock directory structure
│       │       └── fixtures_logs.js   # Realistic journald log entries
│       │
│       ├── components/                # Desktop Shell Elements
│       │   ├── window_manager.js      # Window drag, resize, z-index, snap
│       │   ├── topbar.js              # System clock, host telemetry sparkline
│       │   ├── dock.js                # Ubuntu launcher dock
│       │   └── toast.js               # RFC 7807 error visualizer
│       │
│       └── apps/                      # Functional Panels
│           ├── dashboard_app.js       # System resource monitoring
│           ├── services_app.js        # Systemd service manager
│           ├── files_app.js           # Filesystem navigator
│           ├── logs_app.js            # Journald log viewer
│           └── terminal_app.js        # xterm.js terminal integration
│
└── tests/                             # Comprehensive Test Suite
    ├── conftest.py                    # Fixtures, test client, mocks
    ├── unit/                          # Schema validation, path security
    ├── integration/                   # Auth lifecycle, D-Bus service calls
    ├── security/                      # Traversal, TOCTOU, injection batteries
    └── frontend/                      # Headless responsive & component tests
```

---

## 4. Security & Threat Mitigation Architecture

### Non-Root Execution
The Flask web server and WSGI daemon run under a dedicated system account:
- User: `ubuntulos`, Group: `ubuntulos`
- Shell: `/usr/sbin/nologin`
- Home Directory: `/var/lib/ubuntu-server-os`

### Advanced Filesystem Security (Anti-TOCTOU & Symlink Escapes)
- **Descriptor-Based Resolution**: Use POSIX open flags `O_NOFOLLOW | O_CLOEXEC` to reject symlink traversal at the destination.
- **Kernel-Enforced Path Boundary (`openat2`)**: On Linux kernels 5.6+ (Ubuntu 22.04/24.04), file operations leverage the `openat2` system call with `RESOLVE_BENEATH`, guaranteeing that the kernel refuses to resolve any path component escaping the opened directory descriptor.
- **Permitted Root Jails**: Access is strictly constrained to whitelisted roots (`/var/www`, `/var/log`, `/home`). Access to `/etc`, `/root`, `/proc`, `/sys`, and `/boot` is blocked.
- **Sensitive File Exclusion Mask**: Even inside permitted directories, patterns matching sensitive assets (`.env`, `id_rsa`, `id_ed25519`, `*.key`, `*.pem`, `credentials*`) are masked and rejected.
- **Upload Quotas & Streaming Checks**: File uploads are capped at 10MB, streamed through isolated temporary files, checked for MIME-type safety, and written with non-executable permissions (`0640`).

### Service Allowlisting & Lockout Safeguards
- **Server-Enforced Allowlist**: Read from `/etc/ubuntu-server-os/allowed-services.conf`.
- **Immutable Critical Blacklist**: The following services cannot be stopped, restarted, or disabled via the web UI under any circumstance:
  ```
  ssh, sshd, systemd-networkd, NetworkManager, networking,
  ufw, iptables, firewalld,
  wireguard, wg-quick@*, tailscaled, openvpn, openvpn@*,
  ubuntu-server-os.service
  ```
- Any request targeting a blacklisted unit aborts with HTTP `403 Forbidden` (`ERR_CRITICAL_SERVICE_PROTECTED`) and records an immediate security audit event.

### Authentication, Sessions & RBAC
- **Password Hashing**: `argon2id` (memory cost 64MB, 3 iterations, 4 parallelism lanes).
- **Session Tokens**: 256-bit cryptographically secure pseudorandom values via `secrets.token_urlsafe(32)`.
- **Cookie Security**: `HttpOnly`, `SameSite=Strict`, `Secure`.
- **Session Expiry**: 30 minutes idle timeout; 12 hours absolute maximum lifetime.
- **Brute-Force Lockout**: Account locks for 15 minutes after 5 consecutive failed attempts.
- **CSRF Defense**: Synchronizer Token Pattern verified on all non-idempotent HTTP methods (`POST`, `PUT`, `PATCH`, `DELETE`).
- **RBAC Matrix**:
  - `Viewer / Operator`: Can view telemetry, read allowlisted services, browse permitted directories, read logs.
  - `Administrator`: Can restart allowlisted services, write/upload/delete files, launch terminal sessions, and trigger reboots.

### Audit Logging Posture
- **Tamper-Evident Local Storage**: SQLite audit records (`chmod 600`, owned by `ubuntulos`).
- **Dual-Write to Linux Journal**: Every event is simultaneously written to `systemd-journald`.
- **Remote Syslog Forwarding**: Optional continuous `RFC 5424` syslog forwarding to an off-host collector to guarantee audit persistence even if local storage is altered.

---

## 5. API Contract & RFC 7807 Error Specification

### Error Envelope (RFC 7807 `application/problem+json`)
```json
{
  "type": "https://errors.ubuntuserveros.local/errors/forbidden-service",
  "title": "Service Action Prohibited",
  "status": 403,
  "detail": "The service 'ssh.service' is a protected infrastructure component and cannot be modified.",
  "code": "ERR_CRITICAL_SERVICE_PROTECTED",
  "instance": "/api/v1/services/ssh/action",
  "trace_id": "c4b8e2a1-8d2a-4a92-9421-9d2a3f890123"
}
```

### Complete Endpoints Specification

| Method | Endpoint | Description | Role | Input Validation |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/auth/csrf` | Obtain session CSRF token | Public | None |
| `POST` | `/api/v1/auth/login` | Authenticate & create session | Public | `username` (alphanumeric, max 32), `password` (max 128) |
| `POST` | `/api/v1/auth/logout` | Terminate active session | Authenticated | None |
| `GET` | `/api/v1/system/info` | Hostname, OS version, uptime | Operator, Admin | None |
| `GET` | `/api/v1/metrics/current` | Real-time system telemetry | Operator, Admin | None |
| `GET` | `/api/v1/metrics/history` | Rolling 60-sample telemetry | Operator, Admin | Query: `range` (1m to 60m) |
| `GET` | `/api/v1/services` | List allowlisted services | Operator, Admin | None |
| `GET` | `/api/v1/services/<name>` | Detailed service unit state | Operator, Admin | `<name>`: `^[a-zA-Z0-9_\-\.@]+$` |
| `POST` | `/api/v1/services/<name>/action` | Service state transition | Admin Only | Payload: `{"action": "start"\|"stop"\|"restart"\|"reload"}` |
| `GET` | `/api/v1/fs/browse` | List directory contents | Operator, Admin | Query: `path` (canonicalized) |
| `GET` | `/api/v1/fs/read` | Read text file contents | Operator, Admin | Query: `path`, max 2MB |
| `PUT` | `/api/v1/fs/write` | Write text file contents | Admin Only | Query: `path`, payload text, max 2MB |
| `DELETE`| `/api/v1/fs/delete` | Delete file or directory | Admin Only | Query: `path`, non-root targets only |
| `GET` | `/api/v1/logs/journal` | Query journald log stream | Operator, Admin | `unit`, `priority` (0-7), `lines` (1-500) |
| `POST` | `/api/v1/terminal/ticket` | Step-up auth for PTY ticket | Admin Only | Payload: `{"password": "<admin_password>"}` |
| `WSS` | `/ws/v1/terminal` | Bidirectional terminal stream| Admin (Ticketed) | Query: `?ticket=<single_use_token>` |
| `GET` | `/api/v1/audit/events` | Query audit log entries | Admin Only | `page`, `limit`, `action_type`, `user_id` |

---

## 6. Isolated PTY Terminal Gateway

1. **Step-Up Authentication**: Ticket generation requires explicit password confirmation, preventing session-hijacked background access.
2. **Ephemeral Single-Use Ticket**: Valid for 60 seconds, deleted from memory immediately upon WebSocket handshake.
3. **Unprivileged Execution**: Spawns under an unprivileged user context (`operator`), never directly as root. Root actions require interactive `sudo` in the terminal.
4. **Concurrency & Quotas**: Maximum 2 concurrent sessions per user; maximum 5 host-wide.
5. **Memory & Buffer Protection**: Enforces a 256KB ring buffer per session. Runaway output (e.g., `cat /dev/urandom`) is truncated to avoid worker memory exhaustion.
6. **Inactivity Timeout**: Disconnects after 15 minutes of idle time.
7. **Guaranteed Cleanup**: On WebSocket disconnect, sends `SIGHUP` to the process group, waits 3 seconds, and follows with `SIGTERM` and `SIGKILL` to prevent zombie sub-processes.

---

## 7. UI Design System & Visual Tokens

### Foundation & Surfaces (Midnight Navy Theme)
- `--color-bg-app: #071326;` (Deep midnight canvas background)
- `--color-surface-panel: #0B1B32;` (Standard card and workspace panels)
- `--color-surface-elevated: #102541;` (Modals, dropdowns, hovered items)
- `--color-surface-sunken: #040D1A;` (Terminal viewport, table headers, recessed inputs)
- `--color-surface-hover: #162E4E;` (Interactive hover state for rows/cards)
- `--color-surface-active: #1D3B63;` (Pressed button and active tab state)
- `--color-border-subtle: #14273E;` (Interior dividers, subtle gridlines)
- `--color-border-default: #1C3555;` (Standard structural borders, 1px solid)
- `--color-border-strong: #2D4F7C;` (Active card borders, modal bounds)
- `--color-border-focus: #2196F3;` (Visible accessibility focus outline)

### Typography & Text Tokens
- `--color-text-primary: #F0F4F8;` (Headings, metric values, contrast 15.4:1 — AAA)
- `--color-text-secondary: #94A9C9;` (Labels, metadata, timestamps, contrast 5.8:1 — AA)
- `--color-text-muted: #5B7394;` (Placeholders, hints, contrast 3.1:1)
- `--color-text-inverse: #071326;` (Text on bright accent buttons)

### Semantic Hardware & Health Accents
- `--color-brand-orange: #E95420;` (Ubuntu identity, shell branding, active nav marker)
- `--color-accent-blue: #2196F3;` (Electric Blue: Primary actions, focus rings, CPU telemetry)
- `--color-status-green: #2DDC88;` (Healthy Green: Memory/RAM telemetry, running units)
- `--color-status-amber: #FFB547;` (Warning Amber: Storage capacity, warnings, non-fatal alerts)
- `--color-accent-violet: #A970FF;` (Network Violet: Ingress/egress bandwidth telemetry)
- `--color-status-red: #FF5263;` (Critical Red: Exclusively for errors, stopped units, destructive actions)

### Typography Stack & Numeric Rules
- **UI Font**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`.
- **Monospace Font**: `"Ubuntu Mono", "SF Mono", "Cascadia Code", "Roboto Mono", Menlo, Consolas, monospace`.
- **Tabular Numerics**: `font-variant-numeric: tabular-nums;` strictly enforced on all metrics, timestamps, and percentages.

### 8pt Grid & Geometry
- Spacing: `2xs: 2px`, `xs: 4px`, `sm: 8px`, `md: 12px`, `lg: 16px`, `xl: 24px`, `2xl: 32px`.
- Radii: `sm: 3px` (badges), `md: 6px` (buttons, inputs), `lg: 8px` (cards, modals, terminal).
- Depth: `shadow-card: 0 1px 3px rgba(0,0,0,0.4), 0 0 0 1px var(--color-border-default)`.

---

## 8. Dashboard Composition & Layout Specification

### Desktop Workstation Layout (`≥ 1200px`)
- **Top Bar (48px fixed)**: Ubuntu logo, hostname (`srv-prod-node01.lan`), `[DEMO / MOCK DATA]` or `[LIVE SECURE]` status badge, aggregate hardware sparkbars, UTC/local clock, connection status, user menu.
- **Left Navigation Dock (200px)**: Vertical icon + label navigation (Dashboard, System Health, Services, Terminal, Files, Logs, Network, Settings).
- **Top Metric Cards (4 columns)**:
  1. *CPU Utilization* (Blue): Hero value, core summary, 60s sparkline.
  2. *Memory Allocation* (Green): Hero value, segmented active/buffer progress bar.
  3. *Storage Capacity* (Amber): Hero value, circular percentage ring gauge.
  4. *Network Traffic* (Violet): Hero value, dual RX/TX direction sparklines.
- **Main Center Workspace (Fluid)**:
  - *Panel A*: System Performance (Dual telemetry area chart with 1m, 5m, 15m, 1h filters).
  - *Panel B*: System Services (Allowlisted units table with search, status filters, and action buttons).
- **Right Rail (320px fixed)**:
  - Quick Actions (`[Restart Web Server]`, `[Flush DNS]`, `[Reboot Host...]`).
  - Server Information (OS, Kernel, IP, Uptime).
  - Recent Activity (Audit trail timeline).
- **Bottom Workspace (Collapsible Terminal Drawer)**:
  - 40px collapsed status strip; expands smoothly to 260px housing `xterm.js` terminal.

### Tablet Breakpoint (`768px - 1199px`)
- Left navigation collapses to a 56px icon rail.
- Main workspace expands to fill viewport.
- Right rail drops below the main workspace into a structured 2-column card row.
- Metric cards render in a 2x2 grid.

### Mobile Breakpoint (`< 768px`)
- Top bar features Ubuntu branding, hostname, and hamburger drawer button.
- Navigation shifts into a slide-over off-canvas drawer.
- Metric cards render as a compact 2x2 grid without large sparklines.
- Services table shifts to touch-friendly card list items.
- Terminal opens as a full-screen modal sheet with a virtual keyboard accessory bar.
- Minimum touch target: `44px x 44px` on all interactive elements.

---

## 9. Component Inventory & Visual States

1. **Buttons**:
   - *Primary (Electric Blue)*: `#2196F3`, hover `#1E88E5`, focus ring `2px solid #2196F3`.
   - *Secondary (Navy Surface)*: `#102541`, border `#1C3555`, hover `#162E4E`.
   - *Destructive (Critical Red)*: Background `rgba(255,82,99,0.12)`, text `#FF5263`, border `rgba(255,82,99,0.4)`, hover solid `#FF5263`.
2. **Form Inputs**: Recessed navy background (`#040D1A`), focus outline `#2196F3`.
3. **Status Badges**:
   - Active: `rgba(45,220,136,0.12)` / `#2DDC88` dot.
   - Warning: `rgba(255,181,71,0.12)` / `#FFB547` dot.
   - Failed: `rgba(255,82,99,0.14)` / `#FF5263` dot.
   - Mock Data: `rgba(233,84,32,0.14)` / `#E95420` border.
4. **Data Tables**: Header `#040D1A`, alternating rows `#0B1B32`, hover `#102541`, monospace numeric alignment.
5. **Dangerous Action Confirmation Modal**: Warning shield in `#FF5263`, explicit operational impact description, hostname typing challenge for system-wide disruptions, default focus on `[Cancel]`.

---

## 10. Animation, Motion & Accessibility Specs

- **Durations**: Instant interactions `75ms`, dropdowns/popovers `150ms`, panels/drawers `250ms`, metric tweens `400ms`.
- **Restraint**: Zero decorative glow animations. Metric numbers update immediately; progress bars and gauges tween smoothly over 400ms.
- **Loading Skeletons**: Gradient sweep (`#0B1B32` → `#162E4E` → `#0B1B32`) over 1.6s. No spinning wheels.
- **Accessibility**:
  - `prefers-reduced-motion` suppresses all transitions.
  - `aria-live="polite"` applied to telemetry readouts.
  - Keyboard trap on modals; `Esc` dismisses drawers and dialogs.
  - WCAG 2.1 AA/AAA compliance on contrast ratios.

---

## 11. Testing Strategy & Coverage Targets

- **100% Branch Coverage**: Security modules (`security_guard.py`, `file_manager.py`, `service_manager.py`, `auth_manager.py`).
- **90%+ Line Coverage**: REST controllers, schema validators, error handlers.
- **Automated Security Battery**: 100+ path traversal permutations, command injection test strings, brute-force lockout verification, CSRF bypass checks.
- **Headless UI Tests**: Automated viewport testing across Mobile (375x812), Tablet (768x1024), and Desktop (1920x1080).

---

## 12. Staged Implementation Sequence & Roadmap

### Phase 1: Interactive Mock-Data Desktop Shell
- **Scope**: Build vanilla HTML5/CSS3/ESM desktop interface, window manager, top bar, dock, and responsive mobile sheet layout. Wire to `MockClient` serving realistic telemetry and mock system panels.
- **Zero Backend Dependencies**: Can be tested and reviewed completely in the browser without running Flask, systemd, or root privileges.

### Phase 2: Core Foundation, Authentication & Audit Logging
- **Scope**: Flask app factory, SQLite database, Argon2id credentials, session tokens, CSRF validation, and persistent audit logging.

### Phase 3: Telemetry Engine & Live Dashboard Integration
- **Scope**: `psutil` background sampler, memory ring buffer cache, and live `/api/v1/metrics/` integration.

### Phase 4: Hardened Service Management
- **Scope**: `ServiceManager` with D-Bus IPC, strict service allowlist checking, and immutable blacklist lockout safeguards.

### Phase 5: Sandboxed Filesystem & Journald Log Viewer
- **Scope**: Descriptor-based filesystem browser with `O_NOFOLLOW` / `openat2` resolution and paginated `systemd-journald` log reader.

### Phase 6: Isolated PTY Terminal Gateway
- **Scope**: Standalone WebSocket daemon, step-up authentication, single-use ticket generator, and unprivileged PTY process spawner.

### Phase 7: Deployment Automation & Production Hardening
- **Scope**: Production Nginx configuration, systemd service units, UFW firewall rules, and end-to-end integration verification.

---

## 13. Key Decisions & Open Approvals

The following operational policies are ready for approval before starting Phase 1:
1. **Permitted Filesystem Roots**: Default recommendation to jail file operations to `/var/www`, `/var/log`, and `/home`.
2. **Authentication Source**: Standalone SQLite user accounts with Argon2id password hashing (decoupling web credentials from Linux OS user accounts).
3. **VPN & Network Boundary**: Access restricted to an encrypted VPN overlay network (Tailscale / WireGuard on private subnet `100.x` or `10.x`).
4. **Terminal User Context**: Spawns under an unprivileged user (`operator`), requiring interactive `sudo` for administrative commands.
5. **Initial Service Allowlist**: Default set: `nginx`, `docker`, `postgresql`, `mysql`, `redis`.

---
*End of Master System Specification.*
