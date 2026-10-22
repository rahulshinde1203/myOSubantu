"""
Ubuntu Server OS — End-to-End System Verification Test (Full Workflow Battery)
Verifies: Admin Login -> Telemetry Sync -> Service Restart -> File Edit -> Audit Trail Verification -> Logout.
"""

import os
import tempfile

def test_full_admin_lifecycle_workflow(client, admin_user, app):
    user, password = admin_user

    # 1. Admin logs in with Argon2id credentials
    login_res = client.post("/api/v1/auth/login", json={"username": user.username, "password": password})
    assert login_res.status_code == 200
    login_data = login_res.get_json()
    assert login_data["status"] == "success"
    csrf_token = login_data["csrf_token"]
    assert csrf_token is not None

    # Verify session cookie was set
    cookie = login_res.headers.get("Set-Cookie")
    assert "ubuntuserver_session=" in cookie

    # 2. Query System Info & Health
    health_res = client.get("/api/v1/system/health")
    assert health_res.status_code == 200
    assert health_res.get_json()["status"] == "healthy"

    sys_res = client.get("/api/v1/system/info")
    assert sys_res.status_code == 200
    assert "system" in sys_res.get_json()

    # 3. Query Live Telemetry (Current & History)
    metrics_res = client.get("/api/v1/metrics/current")
    assert metrics_res.status_code == 200
    m_data = metrics_res.get_json()["data"]
    assert "cpu" in m_data
    assert "memory" in m_data

    # 4. Service Management Lifecycle
    # Query services list
    services_res = client.get("/api/v1/services")
    assert services_res.status_code == 200
    assert any(s["name"] == "nginx.service" for s in services_res.get_json()["services"])

    # Restart allowlisted service with CSRF verification
    action_res = client.post(
        "/api/v1/services/nginx.service/action",
        headers={"X-CSRF-Token": csrf_token},
        json={"action": "restart"}
    )
    assert action_res.status_code == 200
    assert action_res.get_json()["action"] == "restart"

    # Verify anti-lockout prevents stopping critical SSH service
    lockout_res = client.post(
        "/api/v1/services/ssh.service/action",
        headers={"X-CSRF-Token": csrf_token},
        json={"action": "stop"}
    )
    assert lockout_res.status_code == 403
    assert lockout_res.get_json()["code"] == "ERR_CRITICAL_SERVICE_PROTECTED"

    # 5. Sandboxed Filesystem Operations
    with tempfile.TemporaryDirectory() as td:
        orig_allowed = app.file_manager.allowed_directories
        app.file_manager.allowed_directories = [os.path.realpath(td)]
        try:
            target_conf = os.path.join(td, "custom.conf")

            # Write file
            write_res = client.put(
                "/api/v1/fs/write",
                headers={"X-CSRF-Token": csrf_token},
                json={"path": target_conf, "content": "server { listen 80; }"}
            )
            assert write_res.status_code == 200

            # Read file back
            read_res = client.get(f"/api/v1/fs/read?path={target_conf}")
            assert read_res.status_code == 200
            assert "server { listen 80; }" in read_res.get_json()["file"]["content"]

        finally:
            app.file_manager.allowed_directories = orig_allowed

    # 6. Query Journald Logs
    logs_res = client.get("/api/v1/logs/journal?limit=10")
    assert logs_res.status_code == 200
    assert len(logs_res.get_json()["entries"]) > 0

    # 7. Verify Audit Log Trail
    audit_res = client.get("/api/v1/audit/logs?limit=50", headers={"X-CSRF-Token": csrf_token})
    assert audit_res.status_code == 200
    audit_entries = audit_res.get_json()["logs"]
    actions = [e["action"] for e in audit_entries]

    assert "AUTH_LOGIN_SUCCESS" in actions
    assert "SERVICE_RESTART" in actions
    assert "SERVICE_STOP_FAILED" in actions or "SECURITY_LOCKOUT_PREVENTION_TRIGGERED" in actions
    assert "FILE_WRITE" in actions

    # 8. Admin Logout
    logout_res = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert logout_res.status_code == 200

    # 9. Verify Session Invalidation
    after_res = client.get("/api/v1/auth/session")
    assert after_res.status_code == 401
    assert after_res.get_json()["code"] == "ERR_AUTH_REQUIRED"
