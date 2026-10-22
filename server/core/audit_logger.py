"""
Ubuntu Server OS — Persistent Audit Logger (Dual-Write Engine)
Writes audit events simultaneously to SQLite and structured system log / journald.
"""

import json
import logging
from typing import Optional, Any, List
from flask import request, g
from server.models.audit_log import AuditLog, AuditLogRepository

# Setup dedicated audit logger
audit_syslog = logging.getLogger("ubuntu_os.audit")
audit_syslog.setLevel(logging.INFO)

# If no handlers attached, attach a StreamHandler with ISO format
if not audit_syslog.handlers:
    ch = logging.StreamHandler()
    formatter = logging.Formatter(
        '{"timestamp": "%(asctime)s", "type": "AUDIT", "logger": "%(name)s", "message": %(message)s}'
    )
    ch.setFormatter(formatter)
    audit_syslog.addHandler(ch)

# Try connecting to systemd journald if on Linux
try:
    from systemd import journal
    audit_syslog.addHandler(journal.JournalHandler())
except ImportError:
    pass


class AuditLogger:
    def __init__(self, repo: AuditLogRepository):
        self.repo = repo

    def log(
        self,
        action: str,
        status: str = "success",
        target: Optional[str] = None,
        details: Optional[Any] = None,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        client_ip: Optional[str] = None
    ) -> AuditLog:
        """
        Record an administrative audit event to both SQLite and the system journal.
        If user_id / client_ip are omitted, resolves them from Flask context `g` and `request`.
        """
        status = status.upper()
        if status not in {"SUCCESS", "FAILURE", "DENIED"}:
            status = "SUCCESS"

        # Resolve from context if in Flask request
        if client_ip is None:
            try:
                client_ip = request.remote_addr or "127.0.0.1"
            except RuntimeError:
                client_ip = "127.0.0.1"

        if user_id is None or username is None:
            try:
                curr_user = getattr(g, "current_user", None)
                if curr_user:
                    user_id = user_id or curr_user.id
                    username = username or curr_user.username
            except RuntimeError:
                pass

        # 1. Write to SQLite
        audit_entry = self.repo.record(
            client_ip=client_ip,
            action=action,
            status=status,
            user_id=user_id,
            username=username,
            target=target,
            details=details
        )

        # 2. Write to system log / journald
        try:
            log_payload = json.dumps({
                "audit_id": audit_entry.id,
                "timestamp": audit_entry.timestamp,
                "user_id": user_id,
                "username": username,
                "client_ip": client_ip,
                "action": action,
                "target": target,
                "status": status,
                "details": details
            })
            audit_syslog.info(log_payload)
        except Exception as e:
            # Audit logging failure to syslog should not crash main operation, but warn
            logging.getLogger(__name__).warning("Failed to emit audit event to syslog: %s", e)

        return audit_entry

    def get_recent(self, limit: int = 50, offset: int = 0) -> List[AuditLog]:
        """Fetch audit log records."""
        return self.repo.get_recent(limit=limit, offset=offset)
