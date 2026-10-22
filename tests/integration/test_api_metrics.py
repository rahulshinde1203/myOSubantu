"""
Ubuntu Server OS — Integration Tests: Metrics REST API Endpoints
"""

import time

def test_api_metrics_unauthenticated_rejected(client):
    res = client.get("/api/v1/metrics/current")
    assert res.status_code == 401
    assert res.get_json()["code"] == "ERR_AUTH_REQUIRED"

def test_api_metrics_current_authenticated(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    res = client.get("/api/v1/metrics/current")
    assert res.status_code == 200
    data = res.get_json()

    assert data["status"] == "success"
    metric = data["data"]
    assert "cpu" in metric
    assert "memory" in metric
    assert "disks" in metric
    assert "network" in metric

def test_api_metrics_history(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client
    # Query history
    res = client.get("/api/v1/metrics/history")
    assert res.status_code == 200
    data = res.get_json()

    assert data["status"] == "success"
    assert "history" in data
    assert isinstance(data["history"], list)

def test_api_metrics_latency_benchmark(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client

    latencies = []
    for _ in range(30):
        t0 = time.perf_counter()
        res = client.get("/api/v1/metrics/current")
        t1 = time.perf_counter()
        assert res.status_code == 200
        latencies.append((t1 - t0) * 1000)

    avg_latency = sum(latencies) / len(latencies)
    assert avg_latency < 15.0, f"Average API latency {avg_latency:.2f}ms exceeds threshold"
