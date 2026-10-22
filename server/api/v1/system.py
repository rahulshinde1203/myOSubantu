"""
Ubuntu Server OS — System Status & Health API Blueprint
System info and health check routes.
"""

import time
import platform
from flask import Blueprint, jsonify
from server.core.rbac import require_auth

system_bp = Blueprint("system_bp", __name__, url_prefix="/api/v1/system")


@system_bp.route("/health", methods=["GET"])
def health():
    """Unauthenticated health probe."""
    return jsonify({
        "status": "healthy",
        "timestamp": int(time.time()),
        "version": "1.0.0"
    })


@system_bp.route("/info", methods=["GET"])
@require_auth
def get_system_info():
    """Authenticated high-level host system information."""
    boot_time = None
    try:
        import psutil
        boot_time = int(psutil.boot_time())
        uptime = int(time.time()) - boot_time
    except Exception:
        uptime = None

    return jsonify({
        "status": "success",
        "system": {
            "hostname": platform.node(),
            "os": platform.system(),
            "release": platform.release(),
            "arch": platform.machine(),
            "uptime_seconds": uptime,
            "boot_time": boot_time
        }
    })
