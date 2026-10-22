"""
Ubuntu Server OS — Session Model & Repository
"""

import time
import uuid
from typing import Optional


class Session:
    def __init__(
        self,
        id: str,
        user_id: str,
        token_hash: str,
        csrf_token: str,
        ip_address: str,
        user_agent: Optional[str],
        created_at: int,
        last_active_at: int,
        expires_at: int
    ):
        self.id = id
        self.user_id = user_id
        self.token_hash = token_hash
        self.csrf_token = csrf_token
        self.ip_address = ip_address
        self.user_agent = user_agent
        self.created_at = created_at
        self.last_active_at = last_active_at
        self.expires_at = expires_at

    def is_expired(self, max_idle: int = 1800, max_absolute: int = 43200) -> bool:
        now = int(time.time())
        # Idle timeout (30 mins default)
        if (now - self.last_active_at) > max_idle:
            return True
        # Absolute timeout (12 hours default)
        if (now - self.created_at) > max_absolute:
            return True
        if now > self.expires_at:
            return True
        return False


class SessionRepository:
    def __init__(self, db):
        self.db = db

    def create(
        self,
        user_id: str,
        token_hash: str,
        csrf_token: str,
        ip_address: str,
        user_agent: Optional[str] = None,
        lifetime_seconds: int = 1800
    ) -> Session:
        session_id = str(uuid.uuid4())
        now = int(time.time())
        expires_at = now + lifetime_seconds

        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO sessions
                   (id, user_id, token_hash, csrf_token, ip_address, user_agent, created_at, last_active_at, expires_at)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (session_id, user_id, token_hash, csrf_token, ip_address, user_agent, now, now, expires_at)
            )
            conn.commit()

        return Session(
            id=session_id,
            user_id=user_id,
            token_hash=token_hash,
            csrf_token=csrf_token,
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=now,
            last_active_at=now,
            expires_at=expires_at
        )

    def get_by_token_hash(self, token_hash: str) -> Optional[Session]:
        with self.db.get_connection() as conn:
            row = conn.execute("SELECT * FROM sessions WHERE token_hash = ?", (token_hash,)).fetchone()
            if not row:
                return None
            return Session(
                id=row["id"],
                user_id=row["user_id"],
                token_hash=row["token_hash"],
                csrf_token=row["csrf_token"],
                ip_address=row["ip_address"],
                user_agent=row["user_agent"],
                created_at=row["created_at"],
                last_active_at=row["last_active_at"],
                expires_at=row["expires_at"]
            )

    def update_last_active(self, session_id: str, lifetime_seconds: int = 1800):
        now = int(time.time())
        new_expires = now + lifetime_seconds
        with self.db.get_connection() as conn:
            conn.execute(
                "UPDATE sessions SET last_active_at = ?, expires_at = ? WHERE id = ?",
                (now, new_expires, session_id)
            )
            conn.commit()

    def delete(self, session_id: str):
        with self.db.get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
            conn.commit()

    def delete_by_token_hash(self, token_hash: str):
        with self.db.get_connection() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))
            conn.commit()
