"""
Ubuntu Server OS — Standardized RFC 7807 Error Utilities
"""

from typing import Any, Dict, Optional
from flask import jsonify, Response, request


class ApiError(Exception):
    """Custom API Exception mapped to RFC 7807 problem details."""
    def __init__(
        self,
        status: int,
        title: str,
        detail: str,
        code: str,
        type_uri: str = "about:blank",
        extra: Optional[Dict[str, Any]] = None
    ):
        super().__init__(detail)
        self.status = status
        self.title = title
        self.detail = detail
        self.code = code
        self.type_uri = type_uri
        self.extra = extra or {}

    def to_dict(self) -> Dict[str, Any]:
        payload = {
            "type": self.type_uri,
            "title": self.title,
            "status": self.status,
            "detail": self.detail,
            "instance": request.path if request else "",
            "code": self.code
        }
        if self.extra:
            payload.update(self.extra)
        return payload

    def to_response(self) -> Response:
        resp = jsonify(self.to_dict())
        resp.status_code = self.status
        resp.content_type = "application/problem+json"
        return resp


def error_response(status: int, title: str, detail: str, code: str, **kwargs) -> Response:
    """Helper to return an RFC 7807 compliant error response."""
    return ApiError(status=status, title=title, detail=detail, code=code, extra=kwargs).to_response()
