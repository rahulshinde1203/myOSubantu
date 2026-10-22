"""
Ubuntu Server OS — Security Test Battery: Path Traversal & Sensitive File Leak Mitigations
Verifies that 100% of directory traversal vectors and sensitive file accesses are blocked.
"""

import os
import tempfile
import urllib.parse
import pytest
from server.core.file_manager import FileManager
from server.utils.errors import ApiError

TRAVERSAL_VECTORS = [
    "../../../../etc/passwd",
    "../../../../etc/shadow",
    "/etc/shadow",
    "/root/.ssh/id_rsa",
    "/etc/sudoers",
    "/var/log/../../etc/passwd",
    "/var/www/../../../../etc/passwd",
    "....//....//etc/passwd",
    "/var/www/../etc/nginx/../../etc/shadow",
    "../../../../../../var/run/docker.sock"
]

SENSITIVE_FILES = [
    ".env",
    ".env.local",
    ".env.production",
    "id_rsa",
    "id_ed25519",
    "server.key",
    "private.pem",
    "credentials.json",
    "credentials.ini",
    ".git/config",
    ".ssh/authorized_keys"
]

def test_file_manager_traversal_blocked():
    with tempfile.TemporaryDirectory() as jail_root:
        fm = FileManager(allowed_directories=[jail_root])

        for vector in TRAVERSAL_VECTORS:
            with pytest.raises(ApiError) as exc:
                fm.resolve_safe_path(vector)
            assert exc.value.status == 403
            assert exc.value.code == "ERR_FS_TRAVERSAL_DETECTED"

def test_file_manager_null_byte_blocked():
    with tempfile.TemporaryDirectory() as jail_root:
        fm = FileManager(allowed_directories=[jail_root])
        with pytest.raises(ApiError) as exc:
            fm.resolve_safe_path(f"{jail_root}/file\x00.txt")
        assert exc.value.status == 400
        assert exc.value.code == "ERR_FS_NULL_BYTE_DETECTED"

def test_sensitive_files_blocked():
    with tempfile.TemporaryDirectory() as jail_root:
        fm = FileManager(allowed_directories=[jail_root])

        for sensitive in SENSITIVE_FILES:
            target = os.path.join(jail_root, sensitive)
            with pytest.raises(ApiError) as exc:
                fm.resolve_safe_path(target)
            assert exc.value.status == 403
            assert exc.value.code == "ERR_FS_SENSITIVE_FILE_BLOCKED"

def test_api_browse_traversal_rejected(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client

    for vector in TRAVERSAL_VECTORS:
        encoded = urllib.parse.quote(vector, safe="")
        res = client.get(f"/api/v1/fs/browse?path={encoded}")
        assert res.status_code == 403
        data = res.get_json()
        assert data["code"] == "ERR_FS_TRAVERSAL_DETECTED"

def test_api_read_sensitive_file_rejected(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client

    for sensitive in [".env", "id_rsa", "server.key"]:
        # Attempt to read inside /var/www (or any allowed root)
        path = f"/var/www/{sensitive}"
        encoded = urllib.parse.quote(path, safe="")
        res = client.get(f"/api/v1/fs/read?path={encoded}")
        assert res.status_code == 403
        data = res.get_json()
        assert data["code"] == "ERR_FS_SENSITIVE_FILE_BLOCKED"
