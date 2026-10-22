# Ubuntu Server OS — Production Deployment & Network Isolation Blueprint

This document specifies the automated installation and security hardening steps for deploying **Ubuntu Server OS** on host Ubuntu 22.04 / 24.04 LTS servers.

---

## 1. Network Perimeter Isolation (UFW Firewall & VPN Binding)

To ensure the control panel is never exposed to public internet scanners or automated attack bots, port 443 must be strictly bound to your VPN tunnel (`tailscale0` or `wg0`).

```bash
# 1. Reset UFW to strict defaults
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 2. Allow SSH on custom or standard port with rate limiting
sudo ufw limit 22/tcp comment "Rate-limited OpenSSH access"

# 3. Restrict Web Management Port 443 strictly to WireGuard or Tailscale VPN
sudo ufw allow in on wg0 to any port 443 proto tcp comment "Ubuntu Server OS via WireGuard"
sudo ufw allow in on tailscale0 to any port 443 proto tcp comment "Ubuntu Server OS via Tailscale"

# 4. Explicitly deny port 443 on public WAN interfaces
sudo ufw deny in on eth0 to any port 443 proto tcp comment "Block public WAN web traffic"

# 5. Enable UFW
sudo ufw enable
sudo ufw status verbose
```

---

## 2. Dedicated Unprivileged Service Account

```bash
# Create dedicated system group and user with disabled shell and locked password
sudo groupadd -r ubuntulos
sudo useradd -r -g ubuntulos -s /usr/sbin/nologin -d /var/lib/ubuntu-server-os -m ubuntulos

# Set strict permissions
sudo mkdir -p /var/lib/ubuntu-server-os /var/log/ubuntu-server-os /run/ubuntu-server-os
sudo chown -R ubuntulos:ubuntulos /var/lib/ubuntu-server-os /var/log/ubuntu-server-os /run/ubuntu-server-os
sudo chmod 700 /var/lib/ubuntu-server-os
```

---

## 3. Systemd Units Installation

```bash
# Copy systemd units
sudo cp deploy/systemd/ubuntu-os.service /etc/systemd/system/
sudo cp deploy/systemd/ubuntu-term.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable and start services
sudo systemctl enable --now ubuntu-os.service
sudo systemctl enable --now ubuntu-term.service
```

---

## 4. Nginx Reverse Proxy Deployment

```bash
# Copy Nginx configuration
sudo cp deploy/nginx/ubuntu-server-os.conf /etc/nginx/sites-available/ubuntu-server-os.conf
sudo ln -sf /etc/nginx/sites-available/ubuntu-server-os.conf /etc/nginx/sites-enabled/

# Test syntax and reload
sudo nginx -t
sudo systemctl reload nginx
```

---

## 5. Provisioning First Administrative User

```bash
cd /opt/ubuntu-server-os
sudo -u ubuntulos .venv/bin/flask --app server create-admin
```
