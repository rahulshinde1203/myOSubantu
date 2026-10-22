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


@terminal_bp.route("/exec", methods=["POST"])
@require_auth
def execute_terminal_command():
    """
    Execute real shell commands in a managed bash subprocess on the server
    and return actual stdout and stderr.
    """
    import os
    import subprocess

    data = request.get_json() or {}
    command = data.get("command", "").strip()
    cwd = data.get("cwd", "/home/operator")

    if not command:
        return jsonify({
            "status": "success",
            "stdout": "",
            "stderr": "",
            "exit_code": 0,
            "cwd": cwd
        }), 200

    # Resolve target working directory safely
    target_cwd = cwd
    if not os.path.exists(target_cwd) or not os.path.isdir(target_cwd):
        target_cwd = "/opt/ubuntu-server-os"
        if not os.path.exists(target_cwd):
            target_cwd = "/"

    # Handle cd built-in command
    if command.startswith("cd ") or command == "cd":
        parts = command.split(None, 1)
        dest = parts[1].strip() if len(parts) > 1 else "~"
        if dest == "~":
            dest = os.path.expanduser("~")
        elif not dest.startswith("/"):
            dest = os.path.normpath(os.path.join(target_cwd, dest))

        if os.path.exists(dest) and os.path.isdir(dest):
            return jsonify({
                "status": "success",
                "stdout": "",
                "stderr": "",
                "exit_code": 0,
                "cwd": dest
            }), 200
        else:
            return jsonify({
                "status": "success",
                "stdout": "",
                "stderr": f"bash: cd: {dest}: No such file or directory\n",
                "exit_code": 1,
                "cwd": target_cwd
            }), 200

    try:
        proc = subprocess.run(
            ["/bin/bash", "-c", command],
            cwd=target_cwd,
            capture_output=True,
            text=True,
            timeout=25.0
        )
        return jsonify({
            "status": "success",
            "stdout": proc.stdout,
            "stderr": proc.stderr,
            "exit_code": proc.returncode,
            "cwd": target_cwd
        }), 200
    except subprocess.TimeoutExpired:
        return jsonify({
            "status": "fail",
            "stdout": "",
            "stderr": "Command execution timed out after 25 seconds.\n",
            "exit_code": 124,
            "cwd": target_cwd
        }), 200
    except Exception as e:
        return jsonify({
            "status": "fail",
            "stdout": "",
            "stderr": f"Execution error: {str(e)}\n",
            "exit_code": 1,
            "cwd": target_cwd
        }), 200

