"""
Ubuntu Server OS — Terminal Gateway API Blueprint
Step-up authentication ticket dispenser and session management.
"""

from flask import Blueprint, request, jsonify, current_app, g
from argon2.exceptions import VerifyMismatchError, InvalidHashError
from server.core.rbac import require_auth, require_role
from server.utils.errors import ApiError

terminal_bp = Blueprint("terminal_bp", __name__, url_prefix="/api/v1/terminal")


@terminal_bp.route("/ticket", methods=["POST"])
@require_auth
@require_role("admin")
def issue_step_up_ticket():
    """
    Step-Up Authentication Ticket Dispenser.
    Re-verifies administrator credentials and generates a 256-bit single-use ticket valid for 60 seconds.
    """
    if not request.is_json:
        raise ApiError(status=400, title="Bad Request", detail="JSON body required.", code="ERR_REQ_NOT_JSON")

    data = request.get_json() or {}
    password = data.get("password", "")

    if not password:
        raise ApiError(status=400, title="Validation Error", detail="Password is required for step-up authentication.", code="ERR_AUTH_MISSING_PASSWORD")

    user = g.current_user
    auth_mgr = current_app.auth_manager

    # Re-verify password with Argon2id
    try:
        auth_mgr.hasher.verify(user.password_hash, password)
    except (VerifyMismatchError, InvalidHashError):
        current_app.audit_logger.log(
            action="TERMINAL_STEP_UP_AUTH_FAILED",
            status="DENIED",
            target=user.username,
            details={"reason": "Password verification failed during terminal step-up"}
        )
        raise ApiError(
            status=401,
            title="Step-Up Authentication Failed",
            detail="Incorrect password for terminal session step-up.",
            code="ERR_TERMINAL_AUTH_FAILED"
        )

    # Issue single-use 60s ticket
    ticket = current_app.terminal_ticket_manager.issue_ticket(user.id)

    current_app.audit_logger.log(
        action="TERMINAL_STEP_UP_AUTH_SUCCESS",
        status="SUCCESS",
        target=user.username,
        details={"ticket_ttl": 60}
    )

    return jsonify({
        "status": "success",
        "ticket": ticket,
        "expires_in": 60
    }), 200


@terminal_bp.route("/session", methods=["POST"])
@require_auth
def create_terminal_session():
    """Consume single-use ticket and allocate terminal session."""
    if not request.is_json:
        raise ApiError(status=400, title="Bad Request", detail="JSON body required.", code="ERR_REQ_NOT_JSON")

    data = request.get_json() or {}
    ticket = data.get("ticket", "").strip()

    if not ticket:
        raise ApiError(status=400, title="Missing Ticket", detail="Single-use ticket required.", code="ERR_TERMINAL_MISSING_TICKET")

    user_id = current_app.terminal_ticket_manager.consume_ticket(ticket)
    if not user_id:
        raise ApiError(
            status=403,
            title="Invalid or Expired Ticket",
            detail="The terminal ticket has expired, is invalid, or has already been consumed.",
            code="ERR_TERMINAL_TICKET_INVALID"
        )

    # Allocate session under session manager with quota checks
    session = current_app.terminal_session_manager.create_session(user_id)

    return jsonify({
        "status": "success",
        "session_id": session.session_id,
        "message": "Terminal PTY allocated successfully."
    }), 201


@terminal_bp.route("/session/<session_id>", methods=["DELETE"])
@require_auth
def close_terminal_session(session_id):
    """Close and cleanly terminate an active terminal session."""
    current_app.terminal_session_manager.terminate_session(session_id)
    return jsonify({
        "status": "success",
        "message": f"Terminal session '{session_id}' terminated."
    }), 200
