# Ubuntu Server OS — Project Implementation Task Plan

**Project:** Ubuntu Server OS Workstation Control Panel  
**Tracking File:** `TASKS.md`  
**Specification Reference:** [`UBUNTU_SERVER_OS_SPECIFICATION.md`](file:///Users/rahul/RahulOS/UBUNTU_SERVER_OS_SPECIFICATION.md)  
**Status:** Architecture Approved / Ready for Phase 1 Execution  
**Current Milestone:** Phase 1 — Interactive Mock-Data Desktop Shell  

---

## Progress Overview

| Phase | Milestone Name | Status | Tasks Total | Completed |
| :---: | :--- | :---: | :---: | :---: |
| **Phase 1** | Interactive Mock-Data Desktop Shell | Completed | 17 | 17 |
| **Phase 2** | Core Foundation, Auth & Audit Logging | Completed | 7 | 7 |
| **Phase 3** | Telemetry Engine & Live Dashboard | Completed | 6 | 6 |
| **Phase 4** | Hardened Service Management | Completed | 6 | 6 |
| **Phase 5** | Sandboxed Filesystem & Journald Logs | Completed | 6 | 6 |
| **Phase 6** | Isolated PTY Terminal Gateway | Completed | 6 | 6 |
| **Phase 7** | Deployment Automation & Production Hardening | Completed | 5 | 5 |
| **Total** | | | **53** | **53** |

---

## Phase 1: Interactive Mock-Data Desktop Shell

> **Goal:** Create a 100% client-side, zero-backend interactive workstation prototype using Vanilla HTML5, CSS custom properties, and native ES modules. Validate responsiveness (desktop, tablet, mobile), window management, Ubuntu dark styling, and mock telemetry without risking server state.

- [X] **TASK-1.1: Core Design System Tokens & Base Reset**
  - **Target:** `client/css/tokens.css`, `client/css/reset.css`
  - **Scope:** Define midnight navy surfaces (`#071326`, `#0B1B32`, `#102541`), structural borders (`#1C3555`), semantic hardware accents (Blue `#2196F3`, Green `#2DDC88`, Amber `#FFB547`, Violet `#A970FF`, Red `#FF5263`, Orange `#E95420`), spacing scale (8pt grid), and typography tokens.
  - **Acceptance Criteria:** Contrast ratios meet WCAG 2.1 AA/AAA standards; `font-variant-numeric: tabular-nums` applied for numbers.

- [X] **TASK-1.2: Desktop Shell HTML Structure & Workspace Canvas**
  - **Target:** `client/index.html`, `client/css/layout.css`
  - **Scope:** Scaffold the top bar (48px fixed), collapsible left dock (200px / 56px), main fluid workspace canvas, right rail (320px), and bottom terminal drawer bar (40px).
  - **Acceptance Criteria:** Semantic HTML5 landmarks (`header`, `nav`, `main`, `aside`, `footer`); ARIA roles configured; responsive grid container defined.

- [X] **TASK-1.3: Responsive Layout & Mobile Breakpoint Engine**
  - **Target:** `client/css/responsive.css`
  - **Scope:** Implement layout shifts for Desktop (`≥1200px`), Tablet (`768px-1199px` with icon dock and relocated right rail), and Mobile (`<768px` single column stacked view with off-canvas navigation drawer).
  - **Acceptance Criteria:** Minimum `44px x 44px` touch targets on mobile; zero horizontal scrolling on viewports down to 320px.

- [X] **TASK-1.4: Window Manager & Floating Shell Controller**
  - **Target:** `client/js/components/window_manager.js`, `client/css/components/window.css`
  - **Scope:** Window dragging, resizing, minimize-to-dock, maximize/restore, active z-index stacking, and mobile full-screen modal transformation.
  - **Acceptance Criteria:** Windows cannot be dragged out of canvas bounds; smooth 60fps movement; `Esc` key dismisses focused floating window.

- [X] **TASK-1.5: Mock Data Fixtures Engine**
  - **Target:** `client/js/api/mock/fixtures_metrics.js`, `fixtures_services.js`, `fixtures_files.js`, `fixtures_logs.js`, `mock_client.js`
  - **Scope:** Build realistic mock generators producing simulated `psutil` telemetry curves, allowlisted systemd units (nginx, docker, postgresql), sandboxed virtual directories, and journald log lines.
  - **Acceptance Criteria:** Data includes subtle mathematical noise/jitter to simulate live hardware; displays prominent `[DEMO / MOCK DATA]` badge.

- [X] **TASK-1.6: UI Panels & Metric Visualization Widgets**
  - **Target:** `client/js/apps/dashboard_app.js`, `services_app.js`, `files_app.js`, `logs_app.js`
  - **Scope:** Build metric cards (CPU, Memory, Disk, Network), dual-line SVG/Canvas telemetry area charts, allowlisted service status table, file directory browser card, and log stream viewer.
  - **Acceptance Criteria:** Shimmer loading skeletons; empty and error states; 400ms smooth gauge tweening.

- [X] **TASK-1.7: Application State & Event Bus**
  - **Target:** `client/js/state.js`, `client/js/event_bus.js`, `client/js/main.js`
  - **Scope:** Reactive JavaScript Proxy state store; event bus decoupling window actions; Page Visibility API to pause polling when the browser tab is hidden.
  - **Acceptance Criteria:** Minimizing or hiding tab suspends mock animation loops; state mutations notify subscribed UI elements cleanly.

- [X] **TASK-1.8: Phase 1 Smoke Test & Review Validation**
  - **Target:** `tests/frontend/smoke_test.html`
  - **Scope:** Automated browser test validating window manipulation, responsive breakpoint triggers, mock data rendering, and keyboard accessibility.
  - **Acceptance Criteria:** Prototype passes all visual and ergonomic checks across desktop (1920x1080), tablet (768x1024), and mobile (375x812).

- [X] **TASK-1.9: Authentic macOS Desktop Architecture & Sonoma Dock**
  - **Target:** `client/index.html`, `client/js/macos_dock.js`, `client/css/macos.css`
  - **Scope:** Integrated Tailwind CSS CDN with custom tokens, 28px frosted menubar with live telemetry sparklines, floating glass dock with magnification, hover tooltips, and active app indicator dots.
  - **Acceptance Criteria:** Glassmorphism with `backdrop-filter: blur(32px) saturate(200%)`, authentic traffic lights (`×`, `−`, `+`), responsive layout across mobile and desktop.

- [X] **TASK-1.10: Visual Command Output Windows (df -Th, htop, Terminal)**
  - **Target:** `client/js/apps/df_app.js`, `client/js/apps/htop_app.js`, `client/js/apps/terminal_app.js`
  - **Scope:** Visual storage partition meters for `df -Th`, authentic 8-core CPU meters & process table for `htop`, and interactive bash terminal with full-screen, drawer, and pop-out modes.
  - **Acceptance Criteria:** Interactive command inputs, real-time bar visualizations, process kill actions with status toasts.

- [X] **TASK-1.11: macOS Spotlight Universal Search (Cmd + K)**
  - **Target:** `client/js/components/spotlight.js`, `client/css/macos.css`
  - **Scope:** Global search palette triggered by `Cmd + K`, `Ctrl + K`, or menubar icon. Fast fuzzy searching across applications, systemd daemons, critical filesystem paths, and quick actions.
  - **Acceptance Criteria:** Keyboard arrow navigation (`↑`, `↓`), `Enter` execution, `Esc` dismiss, search highlighting.

- [X] **TASK-1.12: macOS Control Center Dropdown**
  - **Target:** `client/js/components/control_center.js`, `client/css/macos.css`
  - **Scope:** Quick system toggle card for WireGuard VPN (`100.84.12.9`), telemetry polling rate selector (`1.0s`, `2.0s`, `5.0s`, `10s`), wallpaper theme switcher (`Sonoma`, `OLED Black`, `Aubergine`), and error audio alert toggle.
  - **Acceptance Criteria:** Click-outside dismissal, instant DOM theme mutations, live status readouts.

- [X] **TASK-1.13: macOS Notification Center & Incident Scratchpad (Cmd + Shift + N)**
  - **Target:** `client/js/components/notification_shelf.js`, `client/css/macos.css`
  - **Scope:** Slide-out right widget drawer triggered by clicking menubar clock or `Cmd + Shift + N`. Includes Uptime & Load Average widget, Security & UFW/Fail2ban widget, localStorage autosaved Incident Scratchpad, and system notification feed.
  - **Acceptance Criteria:** Smooth CSS slide transition, persistent notes across page refreshes, feed clearing.

- [X] **TASK-1.14: Visual Listening Ports Scanner (ss -tulpn)**
  - **Target:** `client/js/apps/ports_app.js`, `client/css/macos.css`
  - **Scope:** Network socket inspector showing protocol (TCP/UDP), local/peer addresses, security exposure badges (`PUBLIC 0.0.0.0`, `LOOPBACK LOCAL`, `VPN TUNNEL`), daemon process name, PID, and one-click socket address copying.
  - **Acceptance Criteria:** Real-time protocol and exposure filtering, search bar, exposure audit alert banner.

- [X] **TASK-1.15: Window Edge Snapping & Tiling (50% Split & Fullscreen Zoom)**
  - **Target:** `client/js/macos_windows.js`, `client/css/macos.css`
  - **Scope:** Drag-to-edge window snapping. Dragging to left edge tiles window to left 50%; right edge tiles to right 50%; top edge zooms to maximize. Includes frosted blue ghost preview box and drag-away un-snapping.
  - **Acceptance Criteria:** 60fps drag physics, dock clearance retention, pre-snap geometry restoration.

- [X] **TASK-1.16: Expanded Automated Smoke Test Suite**
  - **Target:** `tests/frontend/smoke_test.html`
  - **Scope:** Automated browser test harness verifying mock metrics, service allowlist, anti-lockout safeguards, scoped filesystem, journal logs, spotlight search, ports scanner, control center, notification shelf, window edge snapping, and Grafana gauges.
  - **Acceptance Criteria:** All 12 test cases report `PASS` under headless Chrome execution.

- [X] **TASK-1.17: Grafana Telemetry Gauges, Crosshairs, Alert Thresholds & PromQL Editor**
  - **Target:** `client/js/apps/dashboard_app.js`, `client/css/components/dashboard.css`
  - **Scope:** Interactive hover crosshairs with synchronized tooltip, 80% and 90% dashed threshold alert lines, live `NORMAL` / `ALERTING` status badge, interactive legend solo/mute toggle, dedicated Grafana Gauges view with 4 SVG circular arc dials + 8 per-core BarGauges, and bottom PromQL query bar.
  - **Acceptance Criteria:** 60fps crosshair tracking; real-time gauge arc stroke-dashoffset transitions; query latency indicator.

---

## Phase 2: Core Foundation, Authentication & Audit Logging

> **Goal:** Scaffolding the Python backend, application factory, SQLite database, Argon2id authentication, session management, synchronizer-token CSRF defense, and persistent audit logging.

- [X] **TASK-2.1: Python Packaging & Application Factory Scaffolding**
  - **Target:** `pyproject.toml`, `server/__init__.py`, `server/config.py`, `server/extensions.py`
  - **Scope:** Initialize Flask factory (`create_app`), environment configurations (Development, Production, Testing), and extension bindings.
  - **Acceptance Criteria:** Clean imports; strict type checking via mypy; zero global mutable application instances.

- [X] **TASK-2.2: SQLite Database Models & Migrations**
  - **Target:** `server/models/user.py`, `server/models/audit_log.py`
  - **Scope:** Define schemas for administrative users, roles (`Operator` vs `Admin`), lockout counters, and audit log events.
  - **Acceptance Criteria:** File created with `chmod 600`; foreign keys enforced; indexes on timestamps and user IDs.

- [X] **TASK-2.3: Argon2id Password Hashing & Brute-Force Lockout**
  - **Target:** `server/core/auth_manager.py`
  - **Scope:** Implement Argon2id password verification (64MB memory cost, 3 iterations, 4 parallelism lanes). Lock account for 15 minutes after 5 consecutive failed attempts.
  - **Acceptance Criteria:** Constant-time password comparisons; timing attacks mitigated; lockout state persists across reboots.

- [X] **TASK-2.4: Session Token Engine & Secure Cookie Configuration**
  - **Target:** `server/core/auth_manager.py`, `server/api/v1/auth.py`
  - **Scope:** Cryptographically secure 256-bit session tokens (`secrets.token_urlsafe(32)`). Cookies set with `HttpOnly`, `SameSite=Strict`, `Secure`. 30m idle timeout; 12h absolute limit.
  - **Acceptance Criteria:** Session tokens verified on every request; invalidated tokens reject access with HTTP 401.

- [X] **TASK-2.5: Synchronizer Token CSRF Middleware & Role Guards**
  - **Target:** `server/core/rbac.py`, `server/utils/errors.py`
  - **Scope:** Validate `X-CSRF-Token` headers on all mutating verbs (`POST`, `PUT`, `PATCH`, `DELETE`). Enforce `@require_role("admin")` and `@require_role("operator")` decorators.
  - **Acceptance Criteria:** Missing or forged tokens abort with HTTP 403; standardized RFC 7807 problem details returned.

- [X] **TASK-2.6: Persistent Audit Logger (Dual-Write Engine)**
  - **Target:** `server/core/audit_logger.py`
  - **Scope:** Record operational mutations (logins, logouts, service commands, file edits) simultaneously to local SQLite and `systemd-journald`.
  - **Acceptance Criteria:** Audit records contain `timestamp`, `user_id`, `client_ip`, `action`, `target`, and `status`.

- [X] **TASK-2.7: Phase 2 Test Suite (Auth & Security Batteries)**
  - **Target:** `tests/unit/test_validators.py`, `tests/integration/test_api_auth.py`
  - **Scope:** 100% test coverage for authentication flows, lockout triggers, CSRF verification, and session timeouts.
  - **Acceptance Criteria:** All test cases pass; no unhandled exceptions leak stack traces.

---

## Phase 3: Telemetry Engine & Live Dashboard Integration

> **Goal:** High-performance, sub-millisecond system telemetry collection via `psutil` backed by an in-memory ring-buffer cache and live dashboard integration.

- [X] **TASK-3.1: psutil Background Telemetry Sampler**
  - **Target:** `server/core/metrics_collector.py`
  - **Scope:** Background daemon thread sampling CPU per-core and aggregate, memory (active/buffers/cached), disk partition stats, and network RX/TX bandwidth deltas every 2.0s.
  - **Acceptance Criteria:** Background sampler utilizes `< 1%` CPU overhead; handles missing sensors gracefully.

- [X] **TASK-3.2: In-Memory Circular Ring Buffer Cache**
  - **Target:** `server/core/metrics_collector.py`
  - **Scope:** Fixed-size 60-sample in-memory circular buffer retaining 2 minutes of rolling history. Zero disk I/O for telemetry queries.
  - **Acceptance Criteria:** Thread-safe reads and writes; sub-millisecond retrieval latency (`< 1ms`).

- [X] **TASK-3.3: Metrics REST API Endpoints**
  - **Target:** `server/api/v1/metrics.py`, `server/api/v1/system.py`
  - **Scope:** Expose `GET /api/v1/metrics/current`, `GET /api/v1/metrics/history`, and `GET /api/v1/system/info`.
  - **Acceptance Criteria:** Outputs validate against strict JSON schemas; system info sanitizes raw hardware strings.

- [X] **TASK-3.4: Live Frontend API Client & Facade Binding**
  - **Target:** `client/js/api/live_client.js`, `client/js/api/api_facade.js`
  - **Scope:** Implement live fetch client injecting CSRF tokens and handling session expiration. Toggle `ApiFacade` from `mock` to `live`.
  - **Acceptance Criteria:** Frontend transitions seamlessly from mock to live data; displays `[LIVE SECURE]` badge in top bar.

- [X] **TASK-3.5: Dashboard Live Wire-up & Sparklines**
  - **Target:** `client/js/apps/dashboard_app.js`
  - **Scope:** Connect dashboard cards and performance chart to real `/api/v1/metrics/` feeds. Page visibility API pauses polling when tab is hidden.
  - **Acceptance Criteria:** Gauges tween smoothly on live 2s intervals; charts slide without memory leaks.

- [X] **TASK-3.6: Phase 3 Telemetry Verification & Benchmarks**
  - **Target:** `tests/unit/test_metrics.py`, `tests/integration/test_api_metrics.py`
  - **Scope:** Validate schema accuracy and benchmark endpoint latency under concurrency (50 requests/sec).
  - **Acceptance Criteria:** Average response time `< 5ms`; 0% cache invalidation errors.

---

## Phase 4: Hardened Service Management

> **Goal:** Secure systemd service observation and control with strict allowlists, D-Bus IPC, and non-bypassable host lockout safeguards.

- [X] **TASK-4.1: Systemd Service Allowlist & Blacklist Configuration**
  - **Target:** `server/constants.py`, `/etc/ubuntu-server-os/allowed-services.conf`
  - **Scope:** Declare initial service allowlist (`nginx`, `docker`, `postgresql`, `mysql`, `redis`) and immutable critical blacklist (`ssh`, `systemd-networkd`, `NetworkManager`, `ufw`, `wireguard`, `tailscaled`).
  - **Acceptance Criteria:** Blacklist is hardcoded in Python; cannot be overridden by configuration files.

- [X] **TASK-4.2: D-Bus Systemd Service Manager Engine**
  - **Target:** `server/core/service_manager.py`
  - **Scope:** Interfacing with `org.freedesktop.systemd1` over system D-Bus. Query unit states, active status, and execute `start`, `stop`, `restart`, `reload`.
  - **Acceptance Criteria:** Zero raw shell calls; argument vectors strictly validated with alphanumeric regex.

- [X] **TASK-4.3: Anti-Lockout Safeguards & Verification Interceptors**
  - **Target:** `server/core/service_manager.py`
  - **Scope:** Intercept all state mutations. If target matches critical blacklist, immediately reject with HTTP 403 (`ERR_CRITICAL_SERVICE_PROTECTED`) and trigger security audit alarm.
  - **Acceptance Criteria:** Even users with `Administrator` role are prevented from stopping SSH, networking, or VPN units.

- [X] **TASK-4.4: Services REST API Endpoints**
  - **Target:** `server/api/v1/services.py`
  - **Scope:** `GET /api/v1/services`, `GET /api/v1/services/<name>`, `POST /api/v1/services/<name>/action`.
  - **Acceptance Criteria:** Only allowlisted services returned; actions require `Admin` role and valid CSRF token.

- [X] **TASK-4.5: Services Panel Frontend Integration**
  - **Target:** `client/js/apps/services_app.js`, `client/js/api/services_api.js`
  - **Scope:** Live services table with search filter, status badges, action buttons, and confirmation dialogs for service stops.
  - **Acceptance Criteria:** Table updates dynamically upon action completion; displays toast notifications for success/failure.

- [X] **TASK-4.6: Phase 4 Security & Integration Test Battery**
  - **Target:** `tests/integration/test_api_services.py`, `tests/security/test_command_injection.py`
  - **Scope:** Test allowlisted commands, blacklisted rejections, and command injection attempts (e.g., `nginx; reboot`, `../../bin/sh`).
  - **Acceptance Criteria:** 100% of injection attempts fail validation; blacklisted units reject 100% of mutating actions.

---

## Phase 5: Sandboxed Filesystem & Journald Log Viewer

> **Goal:** Secure, descriptor-based filesystem browsing (`openat2` / `O_NOFOLLOW`) within permitted root jails and filtered journald log viewing.

- [X] **TASK-5.1: Descriptor-Based Filesystem Engine (Anti-TOCTOU)**
  - **Target:** `server/core/file_manager.py`
  - **Scope:** Implement descriptor-based file operations using `openat2` with `RESOLVE_BENEATH` (Linux 5.6+) or POSIX `O_NOFOLLOW | O_CLOEXEC` to prevent symlink traversal attacks and race conditions.
  - **Acceptance Criteria:** Symlink directory escapes immediately trigger kernel/POSIX errors; jailed strictly to allowed roots (`/var/www`, `/var/log`, `/home`).

- [X] **TASK-5.2: Sensitive File Exclusion Filter & Quotas**
  - **Target:** `server/core/file_manager.py`
  - **Scope:** Hardcoded mask blocking access to `.env`, `id_rsa`, `id_ed25519`, `*.key`, `*.pem`, `credentials*`. File upload cap at 10MB; read limit at 2MB.
  - **Acceptance Criteria:** Sensitive files hidden from directory listings and blocked from read/write regardless of OS permissions.

- [X] **TASK-5.3: Filesystem REST API Endpoints**
  - **Target:** `server/api/v1/files.py`
  - **Scope:** `GET /api/v1/fs/browse`, `GET /api/v1/fs/read`, `PUT /api/v1/fs/write`, `POST /api/v1/fs/upload`, `DELETE /api/v1/fs/delete`.
  - **Acceptance Criteria:** All endpoints strictly canonicalize paths; non-admin users restricted to read-only operations.

- [X] **TASK-5.4: Journald Log Reader Subsystem**
  - **Target:** `server/core/log_reader.py`, `server/api/v1/logs.py`
  - **Scope:** Paginated query of `systemd-journald` entries by unit name, syslog priority (0-7), and line count (max 500).
  - **Acceptance Criteria:** Structured output (timestamp, unit, priority, message); sanitized against terminal escape sequences.

- [X] **TASK-5.5: Files & Logs UI Panels Integration**
  - **Target:** `client/js/apps/files_app.js`, `client/js/apps/logs_app.js`
  - **Scope:** Tree/table file manager with file viewer/editor modal and searchable, priority-colored journald log viewer.
  - **Acceptance Criteria:** File edits prompt for confirmation; log entries display correct priority color badges.

- [X] **TASK-5.6: Phase 5 Path Traversal Security Battery**
  - **Target:** `tests/security/test_path_traversal.py`
  - **Scope:** Execute 100+ directory traversal vectors (`../`, `..%2f`, null-bytes, absolute paths, nested symlinks).
  - **Acceptance Criteria:** 0 traversal attempts succeed; all violations recorded in security audit log.

---

## Phase 6: Isolated PTY Terminal Gateway

> **Goal:** Standalone, unprivileged WebSocket-to-PTY terminal gateway powered by `xterm.js` with step-up authentication, single-use tickets, and aggressive process cleanup.

- [X] **TASK-6.1: Step-Up Authentication & Single-Use Ticket Dispenser**
  - **Target:** `server/api/v1/terminal.py`
  - **Scope:** Endpoint `POST /api/v1/terminal/ticket`. Requires admin password re-verification. Issues 256-bit single-use ticket valid for 60 seconds stored in memory.
  - **Acceptance Criteria:** Ticket expires after 60s; ticket consumed immediately upon first WebSocket connection attempt.

- [X] **TASK-6.2: Isolated Terminal Gateway Daemon & Quota Enforcer**
  - **Target:** `server/terminal/gateway.py`, `server/terminal/session_manager.py`
  - **Scope:** WebSocket endpoint `WSS /ws/v1/terminal?ticket=...`. Validates ticket; enforces quotas (max 2 sessions per user, max 5 server-wide).
  - **Acceptance Criteria:** Unauthorized or excess connections rejected with code 4003 (Forbidden / Quota Exceeded).

- [X] **TASK-6.3: Unprivileged PTY Worker Spawner**
  - **Target:** `server/terminal/session_manager.py`
  - **Scope:** Allocate pseudo-terminal via `pty.openpty()`. Spawns `/bin/bash` login shell under an unprivileged user (`operator`), never root.
  - **Acceptance Criteria:** Shell runs as unprivileged user; administrative operations require interactive `sudo`.

- [X] **TASK-6.4: I/O Ring Buffer & Timeout Reaper**
  - **Target:** `server/terminal/buffer.py`, `server/terminal/session_manager.py`
  - **Scope:** 256KB ring buffer per session; truncate excessive output (e.g., `cat /dev/urandom`). 15-minute idle inactivity timeout.
  - **Acceptance Criteria:** Worker process killed after 15m idle; memory footprint capped at `< 10MB` per active terminal.

- [X] **TASK-6.5: Process Group Disconnect Cleanup (`SIGHUP`/`SIGKILL`)**
  - **Target:** `server/terminal/session_manager.py`
  - **Scope:** On WebSocket disconnect, issue `SIGHUP` to child process group, wait 3 seconds grace period, follow with `SIGTERM` and `SIGKILL`.
  - **Acceptance Criteria:** Zero orphaned shell processes or lingering PTY file descriptors after disconnect.

- [X] **TASK-6.6: Terminal Frontend Panel (xterm.js Integration)**
  - **Target:** `client/js/apps/terminal_app.js`, `client/css/components/terminal.css`
  - **Scope:** Embed `xterm.js` inside collapsible bottom drawer and full-screen mobile sheet. Custom dark theme matching tokens.
  - **Acceptance Criteria:** Step-up modal prompts for password before connection; terminal reconnects cleanly after network drop.

---

## Phase 7: Deployment Automation & Production Hardening

> **Goal:** Production Nginx configuration, systemd service units, UFW firewall rules, automated installation scripts, and end-to-end integration validation.

- [X] **TASK-7.1: Nginx Hardened Reverse Proxy Configuration**
  - **Target:** `deploy/nginx/ubuntu-server-os.conf`
  - **Scope:** Configure TLS 1.3 termination, HSTS, Content Security Policy (CSP), rate limiting, and Unix domain socket forwarding.
  - **Acceptance Criteria:** Qualys SSL Labs A+ rating equivalent; static assets served with cache headers; API proxied over socket.

- [X] **TASK-7.2: Systemd Service Units (Zero-Root Execution)**
  - **Target:** `deploy/systemd/ubuntu-os.service`, `deploy/systemd/ubuntu-term.service`
  - **Scope:** Systemd service units configured with `User=ubuntulos`, `Group=ubuntulos`, `ProtectSystem=strict`, `ProtectHome=read-only`, and `PrivateTmp=true`.
  - **Acceptance Criteria:** Services boot on startup; crash restarts automated; zero root privileges.

- [X] **TASK-7.3: Sudoers Scoped Helper & Polkit Policy**
  - **Target:** `deploy/sudoers.d/99-ubuntu-os-helper`
  - **Scope:** Sudoers policy permitting `ubuntulos` to execute ONLY the specific allowlisted helper script with validated arguments.
  - **Acceptance Criteria:** `sudo -l` confirms `NOPASSWD: ALL` is NOT granted; command line escapes impossible.

- [X] **TASK-7.4: UFW & VPN Network Isolation Blueprint**
  - **Target:** `deploy/README_DEPLOY.md`
  - **Scope:** Document and automate UFW firewall rules binding port 443 strictly to VPN interface (`tailscale0` or `wg0`), blocking public WAN exposure.
  - **Acceptance Criteria:** Port 443 invisible to external WAN port scanners; accessible exclusively through VPN IP.

- [X] **TASK-7.5: End-to-End System Verification Test**
  - **Target:** `tests/integration/test_e2e_workflow.py`
  - **Scope:** Automated test verifying: Admin logs in -> Telemetry updates -> Service restarted -> File edited -> Audit log verified -> Logout.
  - **Acceptance Criteria:** Full workflow completes without error; audit trail accurately records all steps.

---

## Task Execution Guidelines

1. **Strict Dependency Order**: Complete tasks sequentially within each phase. Phase N must pass all acceptance criteria before Phase N+1 begins.
2. **Quality & Zero Fake Code**: Never create empty placeholder files or fake telemetry without explicit `[MOCK / DEMO]` labeling.
3. **Commit & Verification Protocol**:
   - Run unit tests immediately after each task.
   - Run security batteries before marking any security task completed.
   - Update the task status box (`[X]`) upon successful verification.
