"""
Ubuntu Server OS — Integration Tests: Authentication API
Tests login, logout, session check, cookie flags, and RFC 7807 error format.
"""

def test_api_login_success(client, admin_user):
    user, password = admin_user
    res = client.post("/api/v1/auth/login", json={"username": user.username, "password": password})
    assert res.status_code == 200
    data = res.get_json()

    assert data["status"] == "success"
    assert data["user"]["username"] == user.username
    assert data["user"]["role"] == "admin"
    assert "csrf_token" in data
    assert len(data["csrf_token"]) >= 32

    # Check session cookie attributes
    cookie_header = res.headers.get("Set-Cookie")
    assert "ubuntuserver_session=" in cookie_header
    assert "HttpOnly" in cookie_header
    assert "SameSite=Strict" in cookie_header

def test_api_login_invalid_credentials(client, admin_user):
    res = client.post("/api/v1/auth/login", json={"username": "admin", "password": "wrongpassword!"})
    assert res.status_code == 401
    assert res.content_type == "application/problem+json"

    data = res.get_json()
    assert data["status"] == 401
    assert data["code"] == "ERR_AUTH_INVALID_CREDENTIALS"
    assert data["title"] == "Authentication Failed"

def test_api_session_and_logout(authenticated_admin_client):
    client, csrf_token, user = authenticated_admin_client

    # Check active session
    res = client.get("/api/v1/auth/session")
    assert res.status_code == 200
    data = res.get_json()
    assert data["authenticated"] is True
    assert data["user"]["username"] == user.username
    assert data["csrf_token"] == csrf_token

    # Check CSRF endpoint
    res_csrf = client.get("/api/v1/auth/csrf")
    assert res_csrf.status_code == 200
    assert res_csrf.get_json()["csrf_token"] == csrf_token

    # Logout (requires CSRF token for POST)
    res_logout = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf_token})
    assert res_logout.status_code == 200

    # Verify session is now invalidated
    res_after = client.get("/api/v1/auth/session")
    assert res_after.status_code == 401
    assert res_after.get_json()["code"] == "ERR_AUTH_REQUIRED"
