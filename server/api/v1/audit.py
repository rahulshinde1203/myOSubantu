"""
Ubuntu Server OS — Audit Log API Blueprint
Endpoints for reviewing persistent operational events.
"""

from flask import Blueprint, request, jsonify, current_app
from server.core.rbac import require_auth, require_role
from server.utils.errors import ApiError

audit_bp = Blueprint("audit_bp", __name__, url_prefix="/api/v1/audit")


@audit_bp.route("/logs", methods=["GET"])
@require_auth
@require_role("admin", "operator")
def get_audit_logs():
    """
    Retrieve historical audit log entries.
    Query params:
      - limit: int (default: 50, max: 200)
      - offset: int (default: 0)
    """
    try:
        limit = min(int(request.args.get("limit", 50)), 200)
        offset = max(int(request.args.get("offset", 0)), 0)
    except ValueError:
        raise ApiError(
            status=400,
            title="Invalid Pagination",
            detail="limit and offset must be non-negative integers.",
            code="ERR_REQ_INVALID_PAGINATION"
        )

    logs = current_app.audit_logger.get_recent(limit=limit, offset=offset)
    return jsonify({
        "status": "success",
        "count": len(logs),
        "limit": limit,
        "offset": offset,
        "logs": [log.to_dict() for log in logs]
    })
