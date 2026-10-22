"""
Ubuntu Server OS — Integration Tests: Journald Logs REST API
"""

def test_api_logs_authenticated(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.get("/api/v1/logs/journal?limit=20")
    assert res.status_code == 200
    data = res.get_json()

    assert data["status"] == "success"
    assert "entries" in data
    assert isinstance(data["entries"], list)
    assert len(data["entries"]) > 0

    entry = data["entries"][0]
    assert "timestamp_iso" in entry
    assert "unit" in entry
    assert "priority" in entry
    assert "priority_name" in entry
    assert "message" in entry

def test_api_logs_priority_filter(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    # Filter for warnings or worse (priority <= 4)
    res = client.get("/api/v1/logs/journal?priority=4")
    assert res.status_code == 200
    data = res.get_json()

    for entry in data["entries"]:
        assert entry["priority"] <= 4

def test_api_logs_unauthenticated_denied(client):
    res = client.get("/api/v1/logs/journal")
    assert res.status_code == 401
    assert res.get_json()["code"] == "ERR_AUTH_REQUIRED"
