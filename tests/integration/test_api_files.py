"""
Ubuntu Server OS — Integration Tests: Filesystem REST API
"""

import os
import tempfile
import pytest

@pytest.fixture
def temp_jail(app):
    with tempfile.TemporaryDirectory() as td:
        # Register temporary directory in app file_manager allowed_directories
        orig = app.file_manager.allowed_directories
        app.file_manager.allowed_directories = [os.path.realpath(td)]
        # Create test file
        test_file = os.path.join(td, "hello.txt")
        with open(test_file, "w") as f:
            f.write("Hello from sandboxed Ubuntu Server OS!")
        yield td
        app.file_manager.allowed_directories = orig

def test_api_fs_browse(authenticated_admin_client, temp_jail):
    client, csrf_token, _ = authenticated_admin_client
    res = client.get(f"/api/v1/fs/browse?path={temp_jail}")
    assert res.status_code == 200
    data = res.get_json()

    assert data["status"] == "success"
    assert data["path"] == temp_jail
    assert len(data["items"]) == 1
    assert data["items"][0]["name"] == "hello.txt"
    assert data["items"][0]["is_dir"] is False

def test_api_fs_read(authenticated_admin_client, temp_jail):
    client, csrf_token, _ = authenticated_admin_client
    target = os.path.join(temp_jail, "hello.txt")
    res = client.get(f"/api/v1/fs/read?path={target}")
    assert res.status_code == 200
    data = res.get_json()

    assert data["status"] == "success"
    assert "Hello from sandboxed" in data["file"]["content"]

def test_api_fs_write(authenticated_admin_client, temp_jail):
    client, csrf_token, _ = authenticated_admin_client
    target = os.path.join(temp_jail, "new_config.conf")

    res = client.put(
        "/api/v1/fs/write",
        headers={"X-CSRF-Token": csrf_token},
        json={"path": target, "content": "worker_processes auto;"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["bytes_written"] > 0

    # Verify content on disk
    with open(target, "r") as f:
        assert f.read() == "worker_processes auto;"

def test_api_fs_delete(authenticated_admin_client, temp_jail):
    client, csrf_token, _ = authenticated_admin_client
    target = os.path.join(temp_jail, "hello.txt")

    res = client.delete(
        f"/api/v1/fs/delete?path={target}",
        headers={"X-CSRF-Token": csrf_token}
    )
    assert res.status_code == 200
    assert not os.path.exists(target)

def test_api_fs_write_operator_forbidden(authenticated_operator_client, temp_jail):
    client, csrf_token, _ = authenticated_operator_client
    target = os.path.join(temp_jail, "unauthorized.txt")

    res = client.put(
        "/api/v1/fs/write",
        headers={"X-CSRF-Token": csrf_token},
        json={"path": target, "content": "forbidden"}
    )
    assert res.status_code == 403
    assert res.get_json()["code"] == "ERR_FORBIDDEN_INSUFFICIENT_ROLE"
