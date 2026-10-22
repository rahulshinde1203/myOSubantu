"""
Ubuntu Server OS — Integration Tests: Services REST API
Verifies service listing, RBAC role restrictions, and anti-lockout protection.
"""

def test_list_services_authenticated(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.get("/api/v1/services")
    assert res.status_code == 200
    data = res.get_json()

    assert data["status"] == "success"
    assert "services" in data
    assert len(data["services"]) > 0

    unit_names = [s["name"] for s in data["services"]]
    assert "nginx.service" in unit_names
    assert "docker.service" in unit_names
    assert "ssh.service" in unit_names

    # Verify protected status
    ssh_svc = next(s for s in data["services"] if s["name"] == "ssh.service")
    assert ssh_svc["is_protected"] is True

    nginx_svc = next(s for s in data["services"] if s["name"] == "nginx.service")
    assert nginx_svc["is_protected"] is False

def test_list_services_unauthenticated_rejected(client):
    res = client.get("/api/v1/services")
    assert res.status_code == 401
    assert res.get_json()["code"] == "ERR_AUTH_REQUIRED"

def test_service_action_admin_success(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.post(
        "/api/v1/services/nginx.service/action",
        headers={"X-CSRF-Token": csrf_token},
        json={"action": "restart"}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert data["unit"] == "nginx.service"
    assert data["action"] == "restart"

def test_service_action_operator_forbidden(authenticated_operator_client):
    client, csrf_token, _ = authenticated_operator_client
    res = client.post(
        "/api/v1/services/nginx.service/action",
        headers={"X-CSRF-Token": csrf_token},
        json={"action": "restart"}
    )
    assert res.status_code == 403
    assert res.content_type == "application/problem+json"
    assert res.get_json()["code"] == "ERR_FORBIDDEN_INSUFFICIENT_ROLE"

def test_service_action_anti_lockout_interceptor(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client

    # Attempt to stop critical SSH service
    res_ssh = client.post(
        "/api/v1/services/ssh.service/action",
        headers={"X-CSRF-Token": csrf_token},
        json={"action": "stop"}
    )
    assert res_ssh.status_code == 403
    assert res_ssh.content_type == "application/problem+json"
    data = res_ssh.get_json()
    assert data["code"] == "ERR_CRITICAL_SERVICE_PROTECTED"
    assert "lockout" in data["detail"].lower()

    # Attempt to disable UFW firewall
    res_ufw = client.post(
        "/api/v1/services/ufw.service/action",
        headers={"X-CSRF-Token": csrf_token},
        json={"action": "disable"}
    )
    assert res_ufw.status_code == 403
    assert res_ufw.get_json()["code"] == "ERR_CRITICAL_SERVICE_PROTECTED"

def test_service_action_not_allowed(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.post(
        "/api/v1/services/unauthorized-crypto-miner.service/action",
        headers={"X-CSRF-Token": csrf_token},
        json={"action": "start"}
    )
    assert res.status_code == 403
    assert res.get_json()["code"] == "ERR_SERVICE_NOT_ALLOWED"
