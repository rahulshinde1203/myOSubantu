"""
Ubuntu Server OS — Hardened Systemd Service Manager
Interfacing with systemd services with immutable anti-lockout safeguards and zero shell execution.
"""

import subprocess
import shutil
import platform
from typing import Dict, Any, List, Optional, Set
from server.constants import (
    SERVICE_NAME_REGEX,
    VALID_SERVICE_ACTIONS,
    DESTRUCTIVE_SERVICE_ACTIONS,
    CRITICAL_PROTECTED_SERVICES,
    DEFAULT_ALLOWED_SERVICES
)
from server.utils.errors import ApiError


class ServiceManager:
    """
    Manages host systemd services with strict argument validation,
    anti-lockout protection interceptors, and non-bypassable allowlists.
    """
    def __init__(self, allowed_services: Optional[Set[str]] = None, audit_logger=None):
        self.allowed_services = set(allowed_services or DEFAULT_ALLOWED_SERVICES)
        self.audit_logger = audit_logger
        self.has_systemctl = shutil.which("systemctl") is not None and platform.system() == "Linux"

        # In-memory simulated states for dev / testing / non-Linux environments
        self._simulated_states: Dict[str, Dict[str, Any]] = {
            "nginx.service": {"active": "active", "sub": "running", "description": "A high performance web server and reverse proxy", "load": "loaded", "memory": "48.2 MB", "cpu": "1.2%"},
            "postgresql.service": {"active": "active", "sub": "running", "description": "PostgreSQL RDBMS Database Server", "load": "loaded", "memory": "142.0 MB", "cpu": "0.8%"},
            "redis-server.service": {"active": "active", "sub": "running", "description": "Advanced key-value store", "load": "loaded", "memory": "32.4 MB", "cpu": "0.4%"},
            "docker.service": {"active": "active", "sub": "running", "description": "Docker Application Container Engine", "load": "loaded", "memory": "284.0 MB", "cpu": "2.5%"},
            "mysql.service": {"active": "inactive", "sub": "dead", "description": "MySQL Community Server", "load": "loaded", "memory": "0 MB", "cpu": "0.0%"},
            "ssh.service": {"active": "active", "sub": "running", "description": "OpenBSD Secure Shell server", "load": "loaded", "memory": "12.8 MB", "cpu": "0.1%"},
            "ufw.service": {"active": "active", "sub": "exited", "description": "Uncomplicated firewall", "load": "loaded", "memory": "0 MB", "cpu": "0.0%"},
            "wg-quick@wg0.service": {"active": "active", "sub": "exited", "description": "WireGuard via wg-quick(8) for wg0", "load": "loaded", "memory": "0 MB", "cpu": "0.0%"}
        }

    def validate_unit_name(self, unit_name: str) -> str:
        """Validate unit name to prevent command injection or path traversal."""
        if not unit_name or not isinstance(unit_name, str):
            raise ApiError(
                status=400,
                title="Invalid Unit Name",
                detail="Service unit name must be a non-empty string.",
                code="ERR_SERVICE_INVALID_NAME"
            )

        unit_name = unit_name.strip()
        if not unit_name.endswith(".service"):
            unit_name = f"{unit_name}.service"

        if not SERVICE_NAME_REGEX.match(unit_name):
            raise ApiError(
                status=400,
                title="Invalid Unit Name Syntax",
                detail=f"Service name '{unit_name}' contains illegal characters. Only alphanumeric, dashes, dots, and '@' are allowed.",
                code="ERR_SERVICE_INJECTION_DETECTED"
            )

        return unit_name

    def validate_action(self, action: str) -> str:
        """Validate service action verb."""
        action = (action or "").strip().lower()
        if action not in VALID_SERVICE_ACTIONS:
            raise ApiError(
                status=400,
                title="Invalid Service Action",
                detail=f"Action '{action}' is not supported. Allowed actions: {', '.join(sorted(VALID_SERVICE_ACTIONS))}",
                code="ERR_SERVICE_INVALID_ACTION"
            )
        return action

    def is_protected(self, unit_name: str) -> bool:
        """Check if service is protected against shutdown / lockout."""
        return unit_name in CRITICAL_PROTECTED_SERVICES

    def perform_action(self, raw_unit_name: str, raw_action: str) -> Dict[str, Any]:
        """
        Execute a systemd service state mutation with strict safeguards.
        """
        unit = self.validate_unit_name(raw_unit_name)
        action = self.validate_action(raw_action)

        # 1. ANTI-LOCKOUT INTERCEPTOR
        if self.is_protected(unit) and action in DESTRUCTIVE_SERVICE_ACTIONS:
            if self.audit_logger:
                self.audit_logger.log(
                    action="SECURITY_LOCKOUT_PREVENTION_TRIGGERED",
                    status="DENIED",
                    target=unit,
                    details={"attempted_action": action, "reason": "Target service is critical for remote access"}
                )
            raise ApiError(
                status=403,
                title="Critical Service Protected",
                detail=f"Host Protection Interceptor: Operation '{action}' is permanently forbidden on critical service '{unit}' to prevent administrative lockout.",
                code="ERR_CRITICAL_SERVICE_PROTECTED",
                extra={"unit": unit, "action": action, "critical": True}
            )

        # 2. ALLOWLIST VERIFICATION
        if unit not in self.allowed_services:
            raise ApiError(
                status=403,
                title="Service Not Allowed",
                detail=f"Service '{unit}' is not in the permitted management allowlist.",
                code="ERR_SERVICE_NOT_ALLOWED",
                extra={"unit": unit, "allowed_services": sorted(list(self.allowed_services))}
            )

        # 3. EXECUTION
        if self.has_systemctl:
            # Strictly argument-vectored subprocess call without shell
            cmd = ["/bin/systemctl", action, unit]
            try:
                proc = subprocess.run(
                    cmd,
                    shell=False,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=10.0
                )
                if proc.returncode != 0:
                    raise ApiError(
                        status=500,
                        title="Service Action Failed",
                        detail=proc.stderr.strip() or f"systemctl exited with code {proc.returncode}",
                        code="ERR_SYSTEMCTL_EXECUTION_FAILED"
                    )
            except subprocess.TimeoutExpired:
                raise ApiError(
                    status=504,
                    title="Service Action Timeout",
                    detail=f"Operation timed out while executing '{action}' on '{unit}'.",
                    code="ERR_SERVICE_TIMEOUT"
                )
        else:
            # In simulated environment (dev/test), update internal state
            state = self._simulated_states.setdefault(unit, {
                "active": "active",
                "sub": "running",
                "description": f"Managed service {unit}",
                "load": "loaded",
                "memory": "24.0 MB",
                "cpu": "0.1%"
            })
            if action in {"stop", "disable"}:
                state["active"] = "inactive"
                state["sub"] = "dead"
                state["cpu"] = "0.0%"
            elif action in {"start", "restart", "reload"}:
                state["active"] = "active"
                state["sub"] = "running"
                state["cpu"] = "0.5%"

        return {
            "status": "success",
            "unit": unit,
            "action": action,
            "message": f"Service '{unit}' executed action '{action}' successfully."
        }

    def get_service_status(self, raw_unit_name: str) -> Dict[str, Any]:
        """Query real-time status of an allowlisted service."""
        unit = self.validate_unit_name(raw_unit_name)

        if unit not in self.allowed_services:
            raise ApiError(
                status=403,
                title="Service Not Allowed",
                detail=f"Service '{unit}' is not in the permitted management allowlist.",
                code="ERR_SERVICE_NOT_ALLOWED"
            )

        if self.has_systemctl:
            # Query unit via `systemctl show` with argument vector
            cmd = ["/bin/systemctl", "show", unit, "--no-page"]
            try:
                proc = subprocess.run(cmd, shell=False, capture_output=True, text=True, timeout=5.0)
                props = {}
                for line in proc.stdout.splitlines():
                    if "=" in line:
                        k, v = line.split("=", 1)
                        props[k.strip()] = v.strip()

                return {
                    "name": unit,
                    "active_state": props.get("ActiveState", "unknown"),
                    "sub_state": props.get("SubState", "unknown"),
                    "load_state": props.get("LoadState", "unknown"),
                    "description": props.get("Description", ""),
                    "is_protected": self.is_protected(unit)
                }
            except Exception as e:
                raise ApiError(
                    status=500,
                    title="Systemctl Query Error",
                    detail=str(e),
                    code="ERR_SYSTEMCTL_QUERY_FAILED"
                )
        else:
            state = self._simulated_states.get(unit, {
                "active": "active",
                "sub": "running",
                "description": f"Managed service {unit}",
                "load": "loaded"
            })
            return {
                "name": unit,
                "active_state": state.get("active", "active"),
                "sub_state": state.get("sub", "running"),
                "load_state": state.get("load", "loaded"),
                "description": state.get("description", ""),
                "is_protected": self.is_protected(unit),
                "memory": state.get("memory", "24.0 MB"),
                "cpu": state.get("cpu", "0.2%")
            }

    def list_services(self) -> List[Dict[str, Any]]:
        """List all allowlisted services with their current operational states."""
        results = []
        for unit in sorted(list(self.allowed_services)):
            try:
                results.append(self.get_service_status(unit))
            except Exception:
                continue
        return results
