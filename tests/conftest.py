"""
Ubuntu Server OS — Pytest Fixtures
"""

import pytest
from server import create_app

@pytest.fixture
def app():
    app = create_app("testing")
    yield app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def admin_user(app):
    """Seed an admin user for testing."""
    password = "AdminSuperSecretPassword123!"
    pw_hash = app.auth_manager.hash_password(password)
    user = app.user_repo.create("admin", pw_hash, "admin")
    return user, password

@pytest.fixture
def operator_user(app):
    """Seed an operator user for testing."""
    password = "OperatorSecretPassword123!"
    pw_hash = app.auth_manager.hash_password(password)
    user = app.user_repo.create("operator", pw_hash, "operator")
    return user, password

@pytest.fixture
def authenticated_admin_client(app, client, admin_user):
    """Client logged in as admin with active session cookie and CSRF token."""
    user, password = admin_user
    res = client.post("/api/v1/auth/login", json={"username": user.username, "password": password})
    assert res.status_code == 200
    data = res.get_json()
    csrf_token = data["csrf_token"]
    return client, csrf_token, user

@pytest.fixture
def authenticated_operator_client(app, client, operator_user):
    """Client logged in as operator with active session cookie and CSRF token."""
    user, password = operator_user
    res = client.post("/api/v1/auth/login", json={"username": user.username, "password": password})
    assert res.status_code == 200
    data = res.get_json()
    csrf_token = data["csrf_token"]
    return client, csrf_token, user
