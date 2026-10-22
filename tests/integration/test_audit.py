"""
Ubuntu Server OS — Integration Tests: Audit Logging API
"""

def test_audit_logs_recorded_on_auth_flow(client, admin_user):
    user, password = admin_user

    # 1. Failed login generates AUTH_LOGIN_FAILED audit record
    client.post("/api/v1/auth/login", json={"username": user.username, "password": "wrong"})

    # 2. Successful login generates AUTH_LOGIN_SUCCESS audit record
    res_login = client.post("/api/v1/auth/login", json={"username": user.username, "password": password})
    csrf_token = res_login.get_json()["csrf_token"]

    # 3. Query audit logs API
    res_logs = client.get("/api/v1/audit/logs?limit=10", headers={"X-CSRF-Token": csrf_token})
    assert res_logs.status_code == 200
    data = res_logs.get_json()

    assert data["status"] == "success"
    assert len(data["logs"]) >= 2

    actions = [log["action"] for log in data["logs"]]
    assert "AUTH_LOGIN_SUCCESS" in actions
    assert "AUTH_LOGIN_FAILED" in actions

    # Verify audit payload integrity
    success_entry = next(log for log in data["logs"] if log["action"] == "AUTH_LOGIN_SUCCESS")
    assert success_entry["username"] == user.username
    assert success_entry["status"] == "SUCCESS"
    assert success_entry["client_ip"] in ["127.0.0.1", "localhost"]

def test_audit_pagination_validation(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client

    # Test invalid pagination parameter
    res = client.get("/api/v1/audit/logs?limit=not_an_int")
    assert res.status_code == 400
    assert res.content_type == "application/problem+json"
    assert res.get_json()["code"] == "ERR_REQ_INVALID_PAGINATION"
