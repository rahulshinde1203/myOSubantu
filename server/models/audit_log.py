"""
Ubuntu Server OS — Audit Log Model & Repository
Persistent append-only operations log.
"""

import time
import uuid
import json
from typing import Optional, Dict, Any, List


class AuditLog:
    def __init__(
        self,
        id: str,
        timestamp: int,
        user_id: Optional[str],
        username: Optional[str],
        client_ip: str,
        action: str,
        target: Optional[str],
        status: str,
        details: Optional[str] = None
    ):
        self.id = id
        self.timestamp = timestamp
        self.user_id = user_id
        self.username = username
        self.client_ip = client_ip
        self.action = action
        self.target = target
        self.status = status
        self.details = details

    def to_dict(self) -> Dict[str, Any]:
        parsed_details = None
        if self.details:
            try:
                parsed_details = json.loads(self.details)
            except Exception:
                parsed_details = self.details

        return {
            "id": self.id,
            "timestamp": self.timestamp,
            "user_id": self.user_id,
            "username": self.username,
            "client_ip": self.client_ip,
            "action": self.action,
            "target": self.target,
            "status": self.status,
            "details": parsed_details
        }


class AuditLogRepository:
    def __init__(self, db):
        self.db = db

    def record(
        self,
        client_ip: str,
        action: str,
        status: str,
        user_id: Optional[str] = None,
        username: Optional[str] = None,
        target: Optional[str] = None,
        details: Optional[Any] = None
    ) -> AuditLog:
        log_id = str(uuid.uuid4())
        now = int(time.time())
        status = status.upper()
        if status not in {"SUCCESS", "FAILURE", "DENIED"}:
            status = "SUCCESS"
        details_str = json.dumps(details) if isinstance(details, (dict, list)) else (str(details) if details else None)

        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO audit_logs
                   (id, timestamp, user_id, username, client_ip, action, target, status, details)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (log_id, now, user_id, username, client_ip, action, target, status, details_str)
            )
            conn.commit()

        return AuditLog(
            id=log_id,
            timestamp=now,
            user_id=user_id,
            username=username,
            client_ip=client_ip,
            action=action,
            target=target,
            status=status,
            details=details_str
        )

    def get_recent(self, limit: int = 50, offset: int = 0) -> List[AuditLog]:
        with self.db.get_connection() as conn:
            rows = conn.execute(
                """SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?""",
                (limit, offset)
            ).fetchall()

            return [
                AuditLog(
                    id=row["id"],
                    timestamp=row["timestamp"],
                    user_id=row["user_id"],
                    username=row["username"],
                    client_ip=row["client_ip"],
                    action=row["action"],
                    target=row["target"],
                    status=row["status"],
                    details=row["details"]
                ) for row in rows
            ]
