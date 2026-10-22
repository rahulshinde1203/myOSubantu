"""
Ubuntu Server OS — Services REST API Blueprint
Endpoints for observing and controlling systemd services under strict security boundaries.
"""

from flask import Blueprint, request, jsonify, current_app, g
from server.core.rbac import require_auth, require_role
from server.utils.errors import ApiError

services_bp = Blueprint("services_bp", __name__, url_prefix="/api/v1/services")


@services_bp.route("", methods=["GET"])
@require_auth
def list_services():
    """List all permitted systemd services and their operational states."""
    svc_mgr = current_app.service_manager
    services = svc_mgr.list_services()
    return jsonify({
        "status": "success",
        "count": len(services),
        "services": services
    })


@services_bp.route("/<name>", methods=["GET"])
@require_auth
def get_service(name):
    """Query current status of a specific service."""
    svc_mgr = current_app.service_manager
    service_status = svc_mgr.get_service_status(name)
    return jsonify({
        "status": "success",
        "service": service_status
    })


@services_bp.route("/<name>/action", methods=["POST"])
@require_auth
@require_role("admin")
def perform_service_action(name):
    """
    Execute a state mutation ('start', 'stop', 'restart', 'reload') on a service.
    Requires Administrator privileges and CSRF verification.
    Anti-lockout interceptor prevents disabling SSH, networking, or firewall.
    """
    if not request.is_json:
        raise ApiError(status=400, title="Bad Request", detail="JSON body required.", code="ERR_REQ_NOT_JSON")

    data = request.get_json() or {}
    action = data.get("action", "").strip()

    if not action:
        raise ApiError(status=400, title="Validation Error", detail="Missing 'action' field.", code="ERR_SERVICE_MISSING_ACTION")

    svc_mgr = current_app.service_manager
    user = getattr(g, "current_user", None)

    try:
        result = svc_mgr.perform_action(name, action)

        # Audit successful action
        current_app.audit_logger.log(
            action=f"SERVICE_{action.upper()}",
            status="SUCCESS",
            target=result["unit"],
            details={"requested_action": action, "user_role": user.role if user else None}
        )

        return jsonify(result), 200

    except ApiError as e:
        # Audit failure or security denial
        current_app.audit_logger.log(
            action=f"SERVICE_{action.upper()}_FAILED",
            status="DENIED" if e.status == 403 else "FAILURE",
            target=name,
            details={"error_code": e.code, "detail": e.detail}
        )
        raise e
