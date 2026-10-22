# Ubuntu Server OS — Workstation Control Panel

A production-grade, hardened web workstation and observability control panel for Ubuntu Linux servers (22.04 / 24.04 LTS), featuring a macOS-inspired interactive desktop environment with real-time telemetry, service management, sandboxed file exploration, and terminal access.

---

## Key Highlights

- **macOS Workstation Interface**: Frosted glass menubar, dynamic Sonoma dock with magnification and active running indicators, window management (drag, resize, snap, minimize, maximize), and global Spotlight search (`Cmd + K`).
- **Telemetry & Grafana-Style Gauges**: Sub-millisecond `psutil` metric polling with ring buffer historical tracking, dynamic gauge meters, network I/O, disk partitions (`df -Th`), and 8-core CPU process inspector (`htop`).
- **Hardened Service Daemon Management**: Non-root systemd unit control (`start`, `stop`, `restart`, `reload`) with immutable anti-lockout safeguards protecting SSH, networking, and critical firewall daemons.
- **Sandboxed Filesystem & Journald Logs**: File-descriptor scoped storage access preventing path traversal and protecting sensitive files, with real-time systemd journal search filtering.
- **PTY Terminal Gateway**: Isolated pseudo-terminal sessions with single-use tickets, credential step-up authorization, circular ring buffers, and concurrency quotas.
- **Enterprise Security**: Argon2id password hashing, RFC 7807 problem details, origin-enforced CSRF protection, RBAC role gating, and automated audit logging with foreign-key integrity.

---

## Quick Start (Local Development)

### 1. Prerequisites
- Python 3.10+
- Modern Web Browser

### 2. Setup & Installation
```bash
# 1. Clone repository
git clone https://github.com/rahulshinde1203/myOSubantu.git
cd myOSubantu

# 2. Set up Python virtual environment
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# 3. Run test suites
pytest -v tests/
```

### 3. Launch Development Server
```bash
# Terminal 1: Start Flask Backend
.venv/bin/flask --app server run --port 5000

# Terminal 2: Serve Web Desktop UI
python3 -m http.server 8080 --directory client
```
Open **`http://localhost:8080`** in your browser.

---

## Production Deployment (Ubuntu 22.04 / 24.04 LTS)

Ubuntu Server OS includes an automated production installer that configures an unprivileged system user (`ubuntulos`), systemd services, Unix domain socket forwarding, Nginx reverse proxy, and UFW firewall rules.

```bash
# Run automated installer as root
sudo chmod +x deploy/install.sh
sudo ./deploy/install.sh

# Create the initial administrator account
sudo -u ubuntulos /opt/ubuntu-server-os/.venv/bin/flask --app server create-admin
```

Detailed deployment instructions and security hardening specifications can be found in [`deploy/README_DEPLOY.md`](deploy/README_DEPLOY.md).

---

## Architecture Overview

```
├── client/                     # Frontend Vanilla ES6 & Tailwind macOS Desktop
│   ├── index.html              # HTML5 Workspace Canvas
│   ├── css/                    # Modular Design System & macOS Glassmorphism
│   └── js/
│       ├── apps/               # Activity Monitor, htop, df, Finder, Console, Ports
│       ├── components/         # Dock, Windows, Spotlight, Control Center, Notifications
│       └── api/                # Unified API Facade (Mock Prototype & Live API)
├── server/                     # Hardened Flask & Python 3 Application
│   ├── api/v1/                 # RFC 7807 REST API Endpoints
│   ├── core/                   # Telemetry, Services, Filesystem, RBAC, CSRF
│   ├── models/                 # SQLite Persistence (Users, Sessions, Audit Logs)
│   └── terminal/               # PTY Session Gateway & Buffer Management
├── deploy/                     # Production Deployment Configurations
│   ├── systemd/                # Hardened systemd services (ProtectSystem=strict)
│   ├── nginx/                  # SSL A+ reverse proxy with rate limiting
│   ├── sudoers.d/              # Scoped non-root helper execution
│   └── install.sh              # One-click Ubuntu automated installer
└── tests/                      # 56 Automated Unit, Integration & Security Tests
    ├── unit/                   # Password hashing, rate limiting, telemetry
    ├── integration/            # Auth, CSRF, RBAC, Filesystem, Terminal
    └── security/               # Command injection and path traversal defenses
```

---

## License

MIT License. See [LICENSE](LICENSE) for details.
