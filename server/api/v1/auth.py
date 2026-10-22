"""
Ubuntu Server OS — Authentication API Blueprint
Handles admin login, logout, session state, and CSRF token retrieval.
"""

from flask import Blueprint, request, jsonify, make_response, current_app, g
from server.core.rbac import require_auth, get_session_token_from_request
from server.utils.errors import ApiError

auth_bp = Blueprint("auth_bp", __name__, url_prefix="/api/v1/auth")


@auth_bp.route("/login", methods=["POST"])
def login():
    """
    Authenticate administrative user via Argon2id.
    Returns session cookie and CSRF token.
    """
    if not request.is_json:
        raise ApiError(
            status=400,
            title="Bad Request",
            detail="Request body must be JSON.",
            code="ERR_REQ_NOT_JSON"
        )

    data = request.get_json() or {}
    username = data.get("username", "").strip()
    password = data.get("password", "")

    if not username or not password:
        raise ApiError(
            status=400,
            title="Validation Error",
            detail="Username and password are required.",
            code="ERR_VALIDATION_MISSING_CREDENTIALS"
        )

    ip_address = request.remote_addr or "127.0.0.1"
    user_agent = request.headers.get("User-Agent")

    try:
        user, raw_token, csrf_token = current_app.auth_manager.authenticate(
            username=username,
            password=password,
            ip_address=ip_address,
            user_agent=user_agent
        )
    except ApiError as e:
        # Audit failed login attempt
        current_app.audit_logger.log(
            action="AUTH_LOGIN_FAILED",
            status="failure",
            target=username,
            client_ip=ip_address,
            details={"error_code": e.code, "detail": e.detail}
        )
        raise e

    # Audit successful login
    current_app.audit_logger.log(
        action="AUTH_LOGIN_SUCCESS",
        status="success",
        target=username,
        user_id=user.id,
        username=user.username,
        client_ip=ip_address,
        details={"role": user.role}
    )

    resp_data = {
        "status": "success",
        "user": user.to_dict(),
        "csrf_token": csrf_token
    }
    response = make_response(jsonify(resp_data), 200)

    # Attach HttpOnly, SameSite=Strict cookie
    cookie_name = current_app.config.get("SESSION_COOKIE_NAME", "ubuntuserver_session")
    cookie_secure = current_app.config.get("SESSION_COOKIE_SECURE", False)
    cookie_samesite = current_app.config.get("SESSION_COOKIE_SAMESITE", "Strict")
    cookie_lifetime = current_app.config.get("PERMANENT_SESSION_LIFETIME", 1800)

    response.set_cookie(
        key=cookie_name,
        value=raw_token,
        max_age=cookie_lifetime,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        path="/"
    )

    return response


@auth_bp.route("/logout", methods=["POST"])
@require_auth
def logout():
    """
    Invalidate active session and clear session cookie.
    """
    token = get_session_token_from_request()
    user = getattr(g, "current_user", None)

    if token:
        current_app.auth_manager.terminate_session(token)

    if user:
        current_app.audit_logger.log(
            action="AUTH_LOGOUT",
            status="success",
            target=user.username,
            user_id=user.id,
            username=user.username,
            client_ip=request.remote_addr or "127.0.0.1"
        )

    response = make_response(jsonify({"status": "success", "message": "Successfully logged out."}), 200)
    cookie_name = current_app.config.get("SESSION_COOKIE_NAME", "ubuntuserver_session")
    response.delete_cookie(key=cookie_name, path="/")
    return response


@auth_bp.route("/session", methods=["GET"])
@require_auth
def get_session():
    """Return active user profile and CSRF synchronizer token."""
    user = g.current_user
    session = g.current_session

    return jsonify({
        "status": "success",
        "authenticated": True,
        "user": user.to_dict(),
        "csrf_token": session.csrf_token if session else None
    })


@auth_bp.route("/csrf", methods=["GET"])
@require_auth
def get_csrf_token():
    """Retrieve CSRF token for the authenticated session."""
    session = g.current_session
    if not session:
        raise ApiError(status=401, title="Unauthorized", detail="Active session not found.", code="ERR_AUTH_REQUIRED")
    return jsonify({
        "status": "success",
        "csrf_token": session.csrf_token
    })
