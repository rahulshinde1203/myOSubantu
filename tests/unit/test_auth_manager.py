"""
Ubuntu Server OS — Unit Tests: AuthManager
Argon2id hashing, timing attack protection, lockout, and session tokens.
"""

import time
import pytest
from server.models.db import Database
from server.models.user import UserRepository
from server.models.session import SessionRepository
from server.core.auth_manager import AuthManager
from server.utils.errors import ApiError

@pytest.fixture
def auth_setup():
    db = Database(":memory:")
    user_repo = UserRepository(db)
    session_repo = SessionRepository(db)
    auth_mgr = AuthManager(
        user_repo=user_repo,
        session_repo=session_repo,
        time_cost=1,
        memory_cost=1024,
        parallelism=1,
        max_attempts=3,
        lockout_duration=60
    )
    return auth_mgr, user_repo, session_repo

def test_hash_and_verify_password(auth_setup):
    auth_mgr, user_repo, _ = auth_setup
    pwd = "CorrectHorseBatteryStaple!"
    pwd_hash = auth_mgr.hash_password(pwd)
    assert pwd_hash.startswith("$argon2id$")

    # Seed user
    user = user_repo.create("bob", pwd_hash, "operator")

    # Authenticate successfully
    auth_user, raw_token, csrf_token = auth_mgr.authenticate("bob", pwd, "10.0.0.1")
    assert auth_user.id == user.id
    assert len(raw_token) >= 32
    assert len(csrf_token) >= 32

def test_invalid_password_and_timing_defense(auth_setup):
    auth_mgr, user_repo, _ = auth_setup
    pwd_hash = auth_mgr.hash_password("ValidPassword123")
    user_repo.create("valid_user", pwd_hash, "admin")

    # Test unknown user (exercises dummy hash execution)
    with pytest.raises(ApiError) as exc_info:
        auth_mgr.authenticate("unknown_user", "AnyPassword", "10.0.0.1")
    assert exc_info.value.status == 401
    assert exc_info.value.code == "ERR_AUTH_INVALID_CREDENTIALS"

    # Test invalid password for known user
    with pytest.raises(ApiError) as exc_info:
        auth_mgr.authenticate("valid_user", "WrongPassword", "10.0.0.1")
    assert exc_info.value.status == 401
    assert exc_info.value.code == "ERR_AUTH_INVALID_CREDENTIALS"

def test_brute_force_lockout_trigger(auth_setup):
    auth_mgr, user_repo, _ = auth_setup
    pwd_hash = auth_mgr.hash_password("LockoutTestPassword")
    user_repo.create("victim", pwd_hash, "admin")

    # 3 attempts configured for max_attempts
    for _ in range(3):
        with pytest.raises(ApiError) as exc:
            auth_mgr.authenticate("victim", "WrongPassword", "10.0.0.1")
        assert exc.value.status == 401

    # 4th attempt must be rejected with 429 Too Many Requests
    with pytest.raises(ApiError) as exc:
        auth_mgr.authenticate("victim", "LockoutTestPassword", "10.0.0.1")
    assert exc.value.status == 429
    assert exc.value.code == "ERR_AUTH_LOCKED_OUT"
    assert "locked" in exc.value.detail.lower()

def test_session_lifecycle(auth_setup):
    auth_mgr, user_repo, _ = auth_setup
    pwd_hash = auth_mgr.hash_password("SessionSecret123")
    user = user_repo.create("sess_user", pwd_hash, "admin")

    user_auth, raw_token, csrf_token = auth_mgr.authenticate("sess_user", "SessionSecret123", "127.0.0.1")

    # Validate active session
    val = auth_mgr.validate_session(raw_token)
    assert val is not None
    v_user, v_session = val
    assert v_user.username == "sess_user"
    assert v_session.csrf_token == csrf_token

    # Terminate session
    auth_mgr.terminate_session(raw_token)
    assert auth_mgr.validate_session(raw_token) is None
