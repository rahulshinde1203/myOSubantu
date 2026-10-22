"""
Ubuntu Server OS — Security Constants & Service Policies
Immutable security boundaries and critical service protection definitions.
"""

import re

# Strict validation regex for systemd service unit names
SERVICE_NAME_REGEX = re.compile(r"^[a-zA-Z0-9_\-\@\.]+\.service$")

# Valid state mutation verbs
VALID_SERVICE_ACTIONS = frozenset({"start", "stop", "restart", "reload", "enable", "disable"})

# Mutating actions that can disable or tear down a service
DESTRUCTIVE_SERVICE_ACTIONS = frozenset({"stop", "disable"})

# IMMUTABLE CRITICAL BLACKLIST / PROTECTED SERVICES
# Mutating actions ('stop', 'disable') are permanently blocked to prevent host lockout.
# This list is frozen and cannot be modified by user or runtime configurations.
CRITICAL_PROTECTED_SERVICES = frozenset({
    "ssh.service",
    "sshd.service",
    "systemd-networkd.service",
    "NetworkManager.service",
    "systemd-resolved.service",
    "ufw.service",
    "firewalld.service",
    "iptables.service",
    "wireguard.service",
    "wg-quick@wg0.service",
    "tailscaled.service"
})

# DEFAULT ALLOWLIST OF SYSTEMD UNITS PERMITTED FOR MANAGEMENT
# Only services explicitly listed here can be inspected or mutated via the web workstation.
DEFAULT_ALLOWED_SERVICES = frozenset({
    "nginx.service",
    "postgresql.service",
    "redis-server.service",
    "docker.service",
    "mysql.service",
    "memcached.service",
    "prometheus.service",
    "grafana-server.service",
    # Allow safe read-only inspection of network/ssh status (mutations blocked by anti-lockout)
    "ssh.service",
    "ufw.service",
    "wg-quick@wg0.service"
})
