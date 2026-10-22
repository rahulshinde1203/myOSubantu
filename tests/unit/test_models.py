"""
Ubuntu Server OS — Unit Tests: Database Models & Repositories
"""

import os
import tempfile
from server.models.db import Database
from server.models.user import UserRepository
from server.models.session import SessionRepository
from server.models.audit_log import AuditLogRepository

def test_database_creation_and_chmod():
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        temp_path = tf.name

    try:
        db = Database(temp_path)
        # Check permissions
        mode = os.stat(temp_path).st_mode & 0o777
        assert mode == 0o600, f"Expected 0600 permissions, got {oct(mode)}"

        with db.get_connection() as conn:
            # Check WAL mode
            row = conn.execute("PRAGMA journal_mode;").fetchone()
            assert row[0].lower() == "wal"

            # Check foreign keys
            fk = conn.execute("PRAGMA foreign_keys;").fetchone()
            assert fk[0] == 1
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

def test_user_repository_crud():
    db = Database(":memory:")
    repo = UserRepository(db)

    # Create user
    user = repo.create("testuser", "$argon2id$dummyhash", "admin")
    assert user.id is not None
    assert user.username == "testuser"
    assert user.role == "admin"
    assert user.is_active is True
    assert not user.is_locked()

    # Query by username and id
    fetched = repo.get_by_username("testuser")
    assert fetched is not None
    assert fetched.id == user.id

    fetched_by_id = repo.get_by_id(user.id)
    assert fetched_by_id is not None
    assert fetched_by_id.username == "testuser"

def test_user_lockout_counter():
    db = Database(":memory:")
    repo = UserRepository(db)
    user = repo.create("targetuser", "hash", "operator")

    # Record 4 failed attempts
    for _ in range(4):
        repo.record_failed_login("targetuser", max_attempts=5, lockout_seconds=900)
    u = repo.get_by_username("targetuser")
    assert u.failed_login_attempts == 4
    assert not u.is_locked()

    # 5th attempt triggers lockout
    repo.record_failed_login("targetuser", max_attempts=5, lockout_seconds=900)
    u_locked = repo.get_by_username("targetuser")
    assert u_locked.failed_login_attempts == 5
    assert u_locked.is_locked()
    assert u_locked.locked_until is not None

    # Reset
    repo.reset_failed_logins(user.id)
    u_reset = repo.get_by_username("targetuser")
    assert u_reset.failed_login_attempts == 0
    assert not u_reset.is_locked()

def test_session_repository():
    db = Database(":memory:")
    user_repo = UserRepository(db)
    session_repo = SessionRepository(db)

    user = user_repo.create("alice", "hash", "admin")
    session = session_repo.create(
        user_id=user.id,
        token_hash="fake_token_hash_123",
        csrf_token="fake_csrf_token_456",
        ip_address="192.168.1.50",
        user_agent="TestAgent/1.0",
        lifetime_seconds=1800
    )

    assert session.id is not None
    assert session.user_id == user.id
    assert not session.is_expired()

    fetched = session_repo.get_by_token_hash("fake_token_hash_123")
    assert fetched is not None
    assert fetched.csrf_token == "fake_csrf_token_456"

    # Terminate session
    session_repo.delete_by_token_hash("fake_token_hash_123")
    assert session_repo.get_by_token_hash("fake_token_hash_123") is None

def test_audit_log_repository():
    db = Database(":memory:")
    user_repo = UserRepository(db)
    user = user_repo.create("audit_admin", "hash", "admin")
    repo = AuditLogRepository(db)

    log = repo.record(
        client_ip="127.0.0.1",
        action="TEST_ACTION",
        status="SUCCESS",
        user_id=user.id,
        username=user.username,
        target="nginx.service",
        details={"reason": "test"}
    )
    assert log.id is not None
    assert log.status == "SUCCESS"

    logs = repo.get_recent(limit=10)
    assert len(logs) == 1
    assert logs[0].action == "TEST_ACTION"
    assert logs[0].to_dict()["details"] == {"reason": "test"}
