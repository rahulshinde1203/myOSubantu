"""
Ubuntu Server OS — Sandboxed Filesystem REST API Blueprint
"""

from flask import Blueprint, request, jsonify, current_app
from server.core.rbac import require_auth, require_role
from server.utils.errors import ApiError

files_bp = Blueprint("files_bp", __name__, url_prefix="/api/v1/fs")


@files_bp.route("/browse", methods=["GET"])
@require_auth
def browse_directory():
    """Browse directory contents within permitted roots."""
    dir_path = request.args.get("path", "").strip()
    if not dir_path:
        # Default to first allowed root
        roots = current_app.file_manager.allowed_directories
        dir_path = roots[0] if roots else "/"

    items = current_app.file_manager.browse(dir_path)
    return jsonify({
        "status": "success",
        "path": dir_path,
        "count": len(items),
        "items": items
    })


@files_bp.route("/read", methods=["GET"])
@require_auth
def read_file():
    """Read file content (up to 2MB)."""
    file_path = request.args.get("path", "").strip()
    if not file_path:
        raise ApiError(status=400, title="Missing Path", detail="Query parameter 'path' is required.", code="ERR_FS_MISSING_PATH")

    result = current_app.file_manager.read_file(file_path)
    return jsonify({
        "status": "success",
        "file": result
    })


@files_bp.route("/write", methods=["PUT"])
@require_auth
@require_role("admin")
def write_file():
    """Write/edit a file in a permitted root. Requires Administrator role."""
    if not request.is_json:
        raise ApiError(status=400, title="Bad Request", detail="JSON body required.", code="ERR_REQ_NOT_JSON")

    data = request.get_json() or {}
    path = data.get("path", "").strip()
    content = data.get("content", "")

    if not path:
        raise ApiError(status=400, title="Validation Error", detail="Missing 'path' parameter.", code="ERR_FS_MISSING_PATH")

    result = current_app.file_manager.write_file(path, content)

    # Audit file mutation
    current_app.audit_logger.log(
        action="FILE_WRITE",
        status="SUCCESS",
        target=path,
        details={"bytes": result["bytes_written"]}
    )

    return jsonify(result), 200


@files_bp.route("/delete", methods=["DELETE"])
@require_auth
@require_role("admin")
def delete_file():
    """Delete a file. Requires Administrator role."""
    path = request.args.get("path", "").strip()
    if not path:
        raise ApiError(status=400, title="Validation Error", detail="Missing 'path' parameter.", code="ERR_FS_MISSING_PATH")

    result = current_app.file_manager.delete_file(path)

    # Audit file deletion
    current_app.audit_logger.log(
        action="FILE_DELETE",
        status="SUCCESS",
        target=path
    )

    return jsonify(result), 200
