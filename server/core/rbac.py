"""
Ubuntu Server OS — Role-Based Access Control (RBAC) & Authentication Decorators
Enforces authentication boundaries and role-based privilege levels.
"""

from functools import wraps
from flask import request, g, current_app
from server.utils.errors import ApiError


def get_session_token_from_request() -> str:
    """Extract raw session token from cookies or Authorization header."""
    cookie_name = current_app.config.get("SESSION_COOKIE_NAME", "ubuntuserver_session")
    token = request.cookies.get(cookie_name)
    if token:
        return token

    # Check Authorization: Bearer <token>
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()

    return ""


def authenticate_request():
    """
    Validates session token if present and attaches user and session to Flask `g`.
    Called via before_request hook.
    """
    g.current_user = None
    g.current_session = None

    token = get_session_token_from_request()
    if not token:
        return

    auth_mgr = current_app.auth_manager
    result = auth_mgr.validate_session(token)
    if result:
        user, session = result
        g.current_user = user
        g.current_session = session


def require_auth(f):
    """Decorator ensuring that request has a valid, active user session."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not getattr(g, "current_user", None):
            raise ApiError(
                status=401,
                title="Unauthorized",
                detail="Authentication required. Provide a valid session cookie or Bearer token.",
                code="ERR_AUTH_REQUIRED"
            )
        return f(*args, **kwargs)
    return decorated


def require_role(*allowed_roles):
    """
    Decorator requiring the authenticated user to hold one of the specified roles.
    Example: @require_role("admin") or @require_role("admin", "operator")
    """
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            user = getattr(g, "current_user", None)
            if not user:
                raise ApiError(
                    status=401,
                    title="Unauthorized",
                    detail="Authentication required.",
                    code="ERR_AUTH_REQUIRED"
                )

            # Role comparison is case-insensitive
            user_role = user.role.lower()
            permitted_roles = [r.lower() for r in allowed_roles]

            if user_role not in permitted_roles:
                raise ApiError(
                    status=403,
                    title="Forbidden",
                    detail=f"Action requires one of the following roles: {', '.join(allowed_roles)}. Your role is '{user.role}'.",
                    code="ERR_FORBIDDEN_INSUFFICIENT_ROLE",
                    extra={"required_roles": allowed_roles, "user_role": user.role}
                )
            return f(*args, **kwargs)
        return decorated
    return decorator
