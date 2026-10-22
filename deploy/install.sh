#!/usr/bin/env bash
# ==============================================================================
# Ubuntu Server OS — Automated Production Installer
# Supported OS: Ubuntu 22.04 LTS / 24.04 LTS
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_err()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# 1. Root pre-flight check
if [[ $EUID -ne 0 ]]; then
   log_err "This installer must be run as root (use: sudo ./deploy/install.sh)"
fi

INSTALL_DIR="/opt/ubuntu-server-os"
WWW_DIR="/var/www/ubuntu-server-os"
DATA_DIR="/var/lib/ubuntu-server-os"
LOG_DIR="/var/log/ubuntu-server-os"
RUN_DIR="/run/ubuntu-server-os"
SERVICE_USER="ubuntulos"
SERVICE_GROUP="ubuntulos"

log_info "Starting Ubuntu Server OS deployment..."

# 2. Install Host Dependencies
log_info "Updating package lists and installing dependencies..."
apt-get update -qq
apt-get install -y -qq python3 python3-venv python3-pip nginx sqlite3 ufw libcap2-bin

# 3. Create Dedicated Unprivileged System Account
if ! id "$SERVICE_USER" &>/dev/null; then
    log_info "Creating dedicated system user '${SERVICE_USER}'..."
    groupadd -r "$SERVICE_GROUP"
    useradd -r -g "$SERVICE_GROUP" -s /usr/sbin/nologin -d "$DATA_DIR" -m "$SERVICE_USER"
    log_ok "User '${SERVICE_USER}' created."
else
    log_info "User '${SERVICE_USER}' already exists."
fi

# 4. Prepare Directories and Permissions
log_info "Creating production filesystem hierarchies..."
mkdir -p "$INSTALL_DIR" "$WWW_DIR" "$DATA_DIR" "$LOG_DIR" "$RUN_DIR"

chown -R "$SERVICE_USER:$SERVICE_GROUP" "$DATA_DIR" "$LOG_DIR" "$RUN_DIR"
chmod 700 "$DATA_DIR"
chmod 750 "$LOG_DIR" "$RUN_DIR"

# 5. Copy Codebase
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
log_info "Syncing codebase to ${INSTALL_DIR}..."
cp -r "${SCRIPT_DIR}/server" "$INSTALL_DIR/"
cp -r "${SCRIPT_DIR}/pyproject.toml" "$INSTALL_DIR/" 2>/dev/null || true
cp -r "${SCRIPT_DIR}/requirements.txt" "$INSTALL_DIR/"

log_info "Deploying frontend static files to ${WWW_DIR}..."
cp -r "${SCRIPT_DIR}/client" "$WWW_DIR/"
chown -R root:root "$WWW_DIR"
chmod -R 755 "$WWW_DIR"

# 6. Setup Python Virtual Environment
log_info "Configuring Python virtual environment in ${INSTALL_DIR}/.venv..."
python3 -m venv "${INSTALL_DIR}/.venv"
"${INSTALL_DIR}/.venv/bin/pip" install --upgrade pip -q
"${INSTALL_DIR}/.venv/bin/pip" install -r "${INSTALL_DIR}/requirements.txt" -q
chown -R "$SERVICE_USER:$SERVICE_GROUP" "$INSTALL_DIR"

# 7. Install Scoped Sudoers Helper
if [[ -f "${SCRIPT_DIR}/deploy/sudoers.d/99-ubuntu-os-helper" ]]; then
    log_info "Configuring scoped sudoers policy..."
    cp "${SCRIPT_DIR}/deploy/sudoers.d/99-ubuntu-os-helper" /etc/sudoers.d/99-ubuntu-os-helper
    chmod 440 /etc/sudoers.d/99-ubuntu-os-helper
fi

# 8. Install Systemd Units
log_info "Installing systemd service..."
cp "${SCRIPT_DIR}/deploy/systemd/ubuntu-os.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable ubuntu-os.service

# 9. Configure Self-Signed SSL if Certificates Missing
CERT_DIR="/etc/ssl/certs"
KEY_DIR="/etc/ssl/private"
if [[ ! -f "${CERT_DIR}/ubuntu-server-os.crt" || ! -f "${KEY_DIR}/ubuntu-server-os.key" ]]; then
    log_warn "No SSL certificates found. Generating self-signed TLS certificates for development/intranet..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "${KEY_DIR}/ubuntu-server-os.key" \
        -out "${CERT_DIR}/ubuntu-server-os.crt" \
        -subj "/CN=ubuntu-server-os.lan/O=RahulOS/C=US"
    chmod 600 "${KEY_DIR}/ubuntu-server-os.key"
    chmod 644 "${CERT_DIR}/ubuntu-server-os.crt"
    log_ok "Self-signed certificate installed."
fi

# 10. Install Nginx Configuration
log_info "Configuring Nginx reverse proxy..."
cp "${SCRIPT_DIR}/deploy/nginx/ubuntu-server-os.conf" /etc/nginx/sites-available/ubuntu-server-os.conf
ln -sf /etc/nginx/sites-available/ubuntu-server-os.conf /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx

# 11. Start Services
log_info "Starting Ubuntu Server OS backend daemon..."
systemctl restart ubuntu-os.service

log_ok "Deployment completed successfully!"
echo ""
echo "================================================================="
echo "  Ubuntu Server OS is now running."
echo "  Web Interface: https://<SERVER_IP>/"
echo ""
echo "  To create the initial administrator user account, run:"
echo "    sudo -u ${SERVICE_USER} ${INSTALL_DIR}/.venv/bin/flask --app server create-admin"
echo "================================================================="
