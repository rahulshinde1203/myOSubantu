"""
Ubuntu Server OS — User Model & Repository
"""

import time
import uuid
from typing import Optional, Dict, Any


class User:
    def __init__(
        self,
        id: str,
        username: str,
        password_hash: str,
        role: str,
        is_active: bool = True,
        failed_login_attempts: int = 0,
        locked_until: Optional[int] = None,
        created_at: Optional[int] = None,
        updated_at: Optional[int] = None
    ):
        self.id = id
        self.username = username
        self.password_hash = password_hash
        self.role = role
        self.is_active = is_active
        self.failed_login_attempts = failed_login_attempts
        self.locked_until = locked_until
        self.created_at = created_at or int(time.time())
        self.updated_at = updated_at or int(time.time())

    def is_locked(self) -> bool:
        if self.locked_until and self.locked_until > int(time.time()):
            return True
        return False

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "is_active": bool(self.is_active),
            "is_locked": self.is_locked(),
            "created_at": self.created_at
        }


class UserRepository:
    def __init__(self, db):
        self.db = db

    def get_by_username(self, username: str) -> Optional[User]:
        with self.db.get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE username = ?", (username,)).fetchone()
            if not row:
                return None
            return User(
                id=row["id"],
                username=row["username"],
                password_hash=row["password_hash"],
                role=row["role"],
                is_active=bool(row["is_active"]),
                failed_login_attempts=row["failed_login_attempts"],
                locked_until=row["locked_until"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    def get_by_id(self, user_id: str) -> Optional[User]:
        with self.db.get_connection() as conn:
            row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
            if not row:
                return None
            return User(
                id=row["id"],
                username=row["username"],
                password_hash=row["password_hash"],
                role=row["role"],
                is_active=bool(row["is_active"]),
                failed_login_attempts=row["failed_login_attempts"],
                locked_until=row["locked_until"],
                created_at=row["created_at"],
                updated_at=row["updated_at"]
            )

    def create(self, username: str, password_hash: str, role: str) -> User:
        user_id = str(uuid.uuid4())
        now = int(time.time())
        with self.db.get_connection() as conn:
            conn.execute(
                """INSERT INTO users
                   (id, username, password_hash, role, is_active, failed_login_attempts, locked_until, created_at, updated_at)
                   VALUES (?, ?, ?, ?, 1, 0, NULL, ?, ?)""",
                (user_id, username, password_hash, role, now, now)
            )
            conn.commit()
        return User(id=user_id, username=username, password_hash=password_hash, role=role, created_at=now, updated_at=now)

    def record_failed_login(self, username: str, max_attempts: int = 5, lockout_seconds: int = 900):
        now = int(time.time())
        with self.db.get_connection() as conn:
            user = self.get_by_username(username)
            if not user:
                return
            new_attempts = user.failed_login_attempts + 1
            locked_until = now + lockout_seconds if new_attempts >= max_attempts else None
            conn.execute(
                """UPDATE users SET failed_login_attempts = ?, locked_until = ?, updated_at = ? WHERE id = ?""",
                (new_attempts, locked_until, now, user.id)
            )
            conn.commit()

    def reset_failed_logins(self, user_id: str):
        now = int(time.time())
        with self.db.get_connection() as conn:
            conn.execute(
                """UPDATE users SET failed_login_attempts = 0, locked_until = NULL, updated_at = ? WHERE id = ?""",
                (now, user_id)
            )
            conn.commit()
