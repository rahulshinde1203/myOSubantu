"""
Ubuntu Server OS — CSRF Protection Middleware
Synchronizer token pattern and Origin/Referer verification.
"""

import hmac
from flask import request, g, current_app
from server.utils.errors import ApiError

# Safe methods that do not modify state
SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}

# Exempt routes (e.g. public authentication endpoints)
CSRF_EXEMPT_ENDPOINTS = {
    "auth_bp.login",
    "system_bp.health"
}


def init_csrf(app):
    """Register before_request hook to enforce CSRF validation."""
    @app.before_request
    def check_csrf():
        # Skip safe methods
        if request.method in SAFE_METHODS:
            return None

        # Skip testing if CSRF disabled in test config
        if current_app.config.get("WTF_CSRF_ENABLED") is False:
            return None

        # Check endpoint exemption
        endpoint = request.endpoint
        if endpoint in CSRF_EXEMPT_ENDPOINTS:
            return None

        # Only require CSRF if a session exists (or should exist)
        # If user is accessing authenticated endpoints, session must be present
        session = getattr(g, "current_session", None)
        if not session:
            # If there's no session, let @require_auth handle 401
            return None

        # Validate Origin / Referer header if present
        origin = request.headers.get("Origin")
        referer = request.headers.get("Referer")
        host = request.host

        source_url = origin or referer
        if source_url:
            # Source must match host
            source_host = source_url.split("://")[-1].split("/")[0]
            if source_host != host and not source_host.startswith(host):
                raise ApiError(
                    status=403,
                    title="CSRF Origin Validation Failed",
                    detail=f"Cross-origin request rejected from Source: {source_url}",
                    code="ERR_CSRF_ORIGIN_MISMATCH"
                )

        # Validate X-CSRF-Token header against session csrf_token
        provided_token = request.headers.get("X-CSRF-Token")
        if not provided_token:
            # Fallback to JSON payload or form if requested
            if request.is_json and request.json and "csrf_token" in request.json:
                provided_token = request.json.get("csrf_token")
            elif request.form and "csrf_token" in request.form:
                provided_token = request.form.get("csrf_token")

        if not provided_token:
            raise ApiError(
                status=403,
                title="CSRF Token Missing",
                detail="Request must include valid 'X-CSRF-Token' header for state-mutating operations.",
                code="ERR_CSRF_TOKEN_MISSING"
            )

        if not hmac.compare_digest(provided_token, session.csrf_token):
            raise ApiError(
                status=403,
                title="CSRF Token Invalid",
                detail="The provided CSRF token does not match active session.",
                code="ERR_CSRF_TOKEN_INVALID"
            )

        return None
