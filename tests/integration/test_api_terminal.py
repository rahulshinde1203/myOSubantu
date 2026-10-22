"""
Ubuntu Server OS — Integration Tests: Terminal Gateway & Step-Up Authentication
"""

import time
import pytest
from server.terminal.buffer import CircularIOBuffer

def test_terminal_circular_buffer_truncation():
    buf = CircularIOBuffer(max_bytes=10)
    buf.write(b"12345")
    assert buf.size() == 5

    buf.write(b"67890ABCDE")
    # Buffer should cap at 10 bytes and retain the newest data
    assert buf.size() == 10
    assert buf.read() == b"67890ABCDE"
    assert buf.size() == 0

def test_terminal_step_up_success(authenticated_admin_client, admin_user):
    client, csrf_token, user = authenticated_admin_client
    _, password = admin_user

    res = client.post(
        "/api/v1/terminal/ticket",
        headers={"X-CSRF-Token": csrf_token},
        json={"password": password}
    )
    assert res.status_code == 200
    data = res.get_json()
    assert data["status"] == "success"
    assert "ticket" in data
    assert len(data["ticket"]) >= 32
    assert data["expires_in"] == 60

def test_terminal_step_up_wrong_password(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.post(
        "/api/v1/terminal/ticket",
        headers={"X-CSRF-Token": csrf_token},
        json={"password": "WrongAdminPassword!"}
    )
    assert res.status_code == 401
    assert res.content_type == "application/problem+json"
    assert res.get_json()["code"] == "ERR_TERMINAL_AUTH_FAILED"

def test_terminal_step_up_operator_forbidden(authenticated_operator_client, operator_user):
    client, csrf_token, _ = authenticated_operator_client
    _, password = operator_user

    res = client.post(
        "/api/v1/terminal/ticket",
        headers={"X-CSRF-Token": csrf_token},
        json={"password": password}
    )
    assert res.status_code == 403
    assert res.get_json()["code"] == "ERR_FORBIDDEN_INSUFFICIENT_ROLE"

def test_terminal_session_lifecycle_and_single_use(authenticated_admin_client, admin_user):
    client, csrf_token, _ = authenticated_admin_client
    _, password = admin_user

    # 1. Issue ticket
    res_ticket = client.post(
        "/api/v1/terminal/ticket",
        headers={"X-CSRF-Token": csrf_token},
        json={"password": password}
    )
    ticket = res_ticket.get_json()["ticket"]

    # 2. Consume ticket to create session
    res_sess = client.post(
        "/api/v1/terminal/session",
        headers={"X-CSRF-Token": csrf_token},
        json={"ticket": ticket}
    )
    assert res_sess.status_code == 201
    session_id = res_sess.get_json()["session_id"]
    assert session_id is not None

    # 3. Attempt to reuse ticket (Must fail: single-use)
    res_reuse = client.post(
        "/api/v1/terminal/session",
        headers={"X-CSRF-Token": csrf_token},
        json={"ticket": ticket}
    )
    assert res_reuse.status_code == 403
    assert res_reuse.get_json()["code"] == "ERR_TERMINAL_TICKET_INVALID"

    # 4. Terminate session
    res_term = client.delete(
        f"/api/v1/terminal/session/{session_id}",
        headers={"X-CSRF-Token": csrf_token}
    )
    assert res_term.status_code == 200

def test_terminal_quota_enforcement(authenticated_admin_client, admin_user):
    client, csrf_token, _ = authenticated_admin_client
    _, password = admin_user

    sessions = []
    try:
        # Create session 1
        t1 = client.post("/api/v1/terminal/ticket", headers={"X-CSRF-Token": csrf_token}, json={"password": password}).get_json()["ticket"]
        s1 = client.post("/api/v1/terminal/session", headers={"X-CSRF-Token": csrf_token}, json={"ticket": t1}).get_json()["session_id"]
        sessions.append(s1)

        # Create session 2
        t2 = client.post("/api/v1/terminal/ticket", headers={"X-CSRF-Token": csrf_token}, json={"password": password}).get_json()["ticket"]
        s2 = client.post("/api/v1/terminal/session", headers={"X-CSRF-Token": csrf_token}, json={"ticket": t2}).get_json()["session_id"]
        sessions.append(s2)

        # Attempt session 3 (User limit is 2)
        t3 = client.post("/api/v1/terminal/ticket", headers={"X-CSRF-Token": csrf_token}, json={"password": password}).get_json()["ticket"]
        res_s3 = client.post("/api/v1/terminal/session", headers={"X-CSRF-Token": csrf_token}, json={"ticket": t3})
        assert res_s3.status_code == 429
        assert res_s3.get_json()["code"] == "ERR_TERMINAL_QUOTA_USER"

    finally:
        # Cleanup
        for sid in sessions:
            client.delete(f"/api/v1/terminal/session/{sid}", headers={"X-CSRF-Token": csrf_token})
