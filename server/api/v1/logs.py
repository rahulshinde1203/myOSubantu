"""
Ubuntu Server OS — Journald Logs REST API Blueprint
"""

from flask import Blueprint, request, jsonify, current_app
from server.core.rbac import require_auth
from server.utils.errors import ApiError

logs_bp = Blueprint("logs_bp", __name__, url_prefix="/api/v1/logs")


@logs_bp.route("/journal", methods=["GET"])
@require_auth
def get_journal_logs():
    """
    Query systemd-journald logs.
    Query params:
      - unit: Optional systemd service unit name (e.g. nginx.service)
      - priority: Optional syslog priority ceiling (0-7, default: 7)
      - limit: Optional line limit (max 500, default: 100)
      - since: Optional ISO or journalctl time specification
    """
    unit = request.args.get("unit", "").strip() or None
    since = request.args.get("since", "").strip() or None

    try:
        priority = int(request.args.get("priority", 7))
        limit = int(request.args.get("limit", 100))
    except ValueError:
        raise ApiError(status=400, title="Validation Error", detail="priority and limit must be valid integers.", code="ERR_REQ_INVALID_PARAMS")

    reader = current_app.log_reader
    entries = reader.query_logs(unit=unit, priority=priority, limit=limit, since=since)

    return jsonify({
        "status": "success",
        "count": len(entries),
        "entries": entries
    })
