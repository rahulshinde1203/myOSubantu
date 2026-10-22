"""
Ubuntu Server OS — Integration Tests: CSRF Middleware & Role Guards (RBAC)
"""

def test_csrf_missing_token_on_logout(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    # Attempt logout without X-CSRF-Token
    res = client.post("/api/v1/auth/logout")
    assert res.status_code == 403
    assert res.content_type == "application/problem+json"
    data = res.get_json()
    assert data["code"] == "ERR_CSRF_TOKEN_MISSING"

def test_csrf_invalid_token_rejected(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "invalid-token-tampered"})
    assert res.status_code == 403
    assert res.content_type == "application/problem+json"
    data = res.get_json()
    assert data["code"] == "ERR_CSRF_TOKEN_INVALID"

def test_csrf_origin_mismatch_rejected(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.post(
        "/api/v1/auth/logout",
        headers={
            "X-CSRF-Token": csrf_token,
            "Origin": "http://evil-attacker.com"
        }
    )
    assert res.status_code == 403
    data = res.get_json()
    assert data["code"] == "ERR_CSRF_ORIGIN_MISMATCH"

def test_rbac_unauthenticated_access_denied(client):
    # System info requires authentication
    res = client.get("/api/v1/system/info")
    assert res.status_code == 401
    assert res.content_type == "application/problem+json"
    assert res.get_json()["code"] == "ERR_AUTH_REQUIRED"

def test_rbac_health_endpoint_public(client):
    # Health probe is unauthenticated
    res = client.get("/api/v1/system/health")
    assert res.status_code == 200
    assert res.get_json()["status"] == "healthy"

def test_rbac_role_guard_access(authenticated_operator_client):
    client, csrf_token, operator = authenticated_operator_client
    # Operator can access system info and audit logs (both admin and operator allowed)
    res_sys = client.get("/api/v1/system/info")
    assert res_sys.status_code == 200
    assert "system" in res_sys.get_json()

    res_audit = client.get("/api/v1/audit/logs")
    assert res_audit.status_code == 200
    assert "logs" in res_audit.get_json()
