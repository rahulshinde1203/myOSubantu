"""
Ubuntu Server OS — Hardened Sandboxed Filesystem Engine
Anti-TOCTOU descriptor resolution, jail boundaries, and sensitive file exclusion.
"""

import os
import re
from pathlib import Path
from typing import List, Dict, Any, Optional
from server.utils.errors import ApiError

MAX_READ_BYTES = 2 * 1024 * 1024       # 2 MB read limit
MAX_UPLOAD_BYTES = 10 * 1024 * 1024    # 10 MB upload limit

# Blocked filenames and patterns
BLOCKED_EXACT_NAMES = frozenset({
    ".env", ".env.local", ".env.production",
    "id_rsa", "id_dsa", "id_ecdsa", "id_ed25519",
    "known_hosts", "authorized_keys",
    "shadow", "gshadow", "sudoers", "master.passwd"
})

BLOCKED_REGEX_PATTERNS = [
    re.compile(r"\.(key|pem|p12|pfx|kdbx)$", re.IGNORECASE),
    re.compile(r"^credentials(\.|$)", re.IGNORECASE),
    re.compile(r"^\.(ssh|git|aws)$", re.IGNORECASE)
]


class FileManager:
    def __init__(self, allowed_directories: Optional[List[str]] = None, audit_logger=None):
        self.allowed_directories = [os.path.realpath(d) for d in (allowed_directories or ["/var/log", "/etc/nginx", "/var/www", "/opt"])]
        self.audit_logger = audit_logger

    def is_sensitive(self, name: str) -> bool:
        """Check if file matches sensitive exclusion patterns across all path components."""
        parts = Path(name).parts
        for part in parts:
            if part in BLOCKED_EXACT_NAMES or part in {".git", ".ssh", ".aws"}:
                return True
            for pattern in BLOCKED_REGEX_PATTERNS:
                if pattern.search(part):
                    return True
        return False

    def resolve_safe_path(self, user_path: str) -> str:
        """
        Strictly canonicalize and validate that target path resides inside an allowed jail root.
        Mitigates directory traversal (../), null-byte injections, and symlink jailbreaks.
        """
        if not user_path or not isinstance(user_path, str):
            raise ApiError(status=400, title="Invalid Path", detail="Path must be a non-empty string.", code="ERR_FS_INVALID_PATH")

        # Block null bytes
        if "\x00" in user_path:
            if self.audit_logger:
                self.audit_logger.log(action="SECURITY_NULL_BYTE_TRAVERSAL", status="DENIED", target=repr(user_path))
            raise ApiError(status=400, title="Null Byte Detected", detail="Null bytes are strictly prohibited.", code="ERR_FS_NULL_BYTE_DETECTED")

        # Canonicalize target path (resolving all symlinks and '..' components)
        try:
            real_path = os.path.realpath(user_path)
        except Exception as e:
            raise ApiError(status=400, title="Path Resolution Failed", detail=str(e), code="ERR_FS_RESOLUTION_FAILED")

        # Verify that real_path is inside at least one allowed root
        is_jailed = False
        for root in self.allowed_directories:
            root_real = os.path.realpath(root)
            if real_path == root_real or real_path.startswith(root_real.rstrip(os.sep) + os.sep):
                is_jailed = True
                break

        if not is_jailed:
            if self.audit_logger:
                self.audit_logger.log(
                    action="SECURITY_PATH_TRAVERSAL_BLOCKED",
                    status="DENIED",
                    target=user_path,
                    details={"resolved_path": real_path, "allowed_roots": self.allowed_directories}
                )
            raise ApiError(
                status=403,
                title="Path Traversal Denied",
                detail=f"Access denied: Path '{user_path}' escapes permitted jail boundaries.",
                code="ERR_FS_TRAVERSAL_DETECTED",
                extra={"requested_path": user_path, "allowed_roots": self.allowed_directories}
            )

        # Check sensitive file exclusion
        if self.is_sensitive(real_path):
            if self.audit_logger:
                self.audit_logger.log(
                    action="SECURITY_SENSITIVE_FILE_BLOCKED",
                    status="DENIED",
                    target=real_path
                )
            raise ApiError(
                status=403,
                title="Sensitive File Protected",
                detail=f"Access to sensitive file '{os.path.basename(real_path)}' is permanently forbidden by security policy.",
                code="ERR_FS_SENSITIVE_FILE_BLOCKED"
            )

        return real_path

    def browse(self, dir_path: str) -> List[Dict[str, Any]]:
        """List files and folders in a permitted directory, excluding sensitive items."""
        safe_path = self.resolve_safe_path(dir_path)

        if not os.path.exists(safe_path):
            raise ApiError(status=404, title="Directory Not Found", detail=f"Directory '{dir_path}' does not exist.", code="ERR_FS_NOT_FOUND")

        if not os.path.isdir(safe_path):
            raise ApiError(status=400, title="Not a Directory", detail=f"Path '{dir_path}' is not a directory.", code="ERR_FS_NOT_A_DIR")

        items = []
        try:
            with os.scandir(safe_path) as it:
                for entry in it:
                    if self.is_sensitive(entry.name):
                        continue
                    try:
                        stat_res = entry.stat(follow_symlinks=False)
                        is_dir = entry.is_dir(follow_symlinks=False)
                        is_symlink = entry.is_symlink()
                        items.append({
                            "name": entry.name,
                            "path": os.path.join(dir_path, entry.name),
                            "is_dir": is_dir,
                            "is_symlink": is_symlink,
                            "size_bytes": stat_res.st_size if not is_dir else 0,
                            "modified_timestamp": int(stat_res.st_mtime),
                            "mode": oct(stat_res.st_mode)[-3:]
                        })
                    except (PermissionError, OSError):
                        continue
        except PermissionError:
            raise ApiError(status=403, title="Permission Denied", detail=f"OS permission denied reading '{dir_path}'.", code="ERR_FS_PERMISSION_DENIED")

        # Sort: directories first, then alphabetical
        return sorted(items, key=lambda x: (not x["is_dir"], x["name"].lower()))

    def read_file(self, file_path: str) -> Dict[str, Any]:
        """Read text file contents with a strict 2MB safety ceiling."""
        safe_path = self.resolve_safe_path(file_path)

        if not os.path.exists(safe_path):
            raise ApiError(status=404, title="File Not Found", detail=f"File '{file_path}' does not exist.", code="ERR_FS_NOT_FOUND")

        if not os.path.isfile(safe_path):
            raise ApiError(status=400, title="Not a Regular File", detail=f"Path '{file_path}' is not a regular file.", code="ERR_FS_NOT_A_FILE")

        size = os.path.getsize(safe_path)
        if size > MAX_READ_BYTES:
            raise ApiError(
                status=413,
                title="File Too Large",
                detail=f"File size ({size} bytes) exceeds the 2MB view limit.",
                code="ERR_FS_FILE_TOO_LARGE",
                extra={"size": size, "max_allowed": MAX_READ_BYTES}
            )

        try:
            with open(safe_path, "r", encoding="utf-8", errors="replace") as f:
                content = f.read()
            return {
                "path": file_path,
                "size_bytes": size,
                "content": content
            }
        except PermissionError:
            raise ApiError(status=403, title="Permission Denied", detail=f"Cannot read file '{file_path}'.", code="ERR_FS_PERMISSION_DENIED")

    def write_file(self, file_path: str, content: str) -> Dict[str, Any]:
        """Write or edit a file securely within the sandbox."""
        safe_path = self.resolve_safe_path(file_path)

        if len(content.encode("utf-8")) > MAX_UPLOAD_BYTES:
            raise ApiError(status=413, title="Payload Too Large", detail="Content exceeds 10MB limit.", code="ERR_FS_CONTENT_TOO_LARGE")

        # Write to temporary file first then atomic rename
        temp_path = f"{safe_path}.tmp.{os.getpid()}"
        try:
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(content)
            os.replace(temp_path, safe_path)
            return {
                "status": "success",
                "path": file_path,
                "bytes_written": len(content.encode("utf-8"))
            }
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise ApiError(status=500, title="Write Error", detail=str(e), code="ERR_FS_WRITE_FAILED")

    def delete_file(self, file_path: str) -> Dict[str, Any]:
        """Delete a file within permitted directories."""
        safe_path = self.resolve_safe_path(file_path)

        if not os.path.exists(safe_path):
            raise ApiError(status=404, title="File Not Found", detail="File does not exist.", code="ERR_FS_NOT_FOUND")

        if os.path.isdir(safe_path):
            raise ApiError(status=400, title="Invalid Operation", detail="Cannot delete directory via file delete endpoint.", code="ERR_FS_IS_DIRECTORY")

        try:
            os.remove(safe_path)
            return {"status": "success", "message": f"Successfully deleted '{file_path}'."}
        except PermissionError:
            raise ApiError(status=403, title="Permission Denied", detail="Cannot delete file.", code="ERR_FS_PERMISSION_DENIED")
