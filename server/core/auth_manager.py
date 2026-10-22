"""
Ubuntu Server OS — Authentication & Session Manager
Hardened Argon2id password hashing, token generation, and brute-force lockout.
"""

import hashlib
import secrets
import time
from typing import Optional, Tuple
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, InvalidHashError

from server.models.user import User, UserRepository
from server.models.session import Session, SessionRepository
from server.utils.errors import ApiError


class AuthManager:
    def __init__(
        self,
        user_repo: UserRepository,
        session_repo: SessionRepository,
        time_cost: int = 3,
        memory_cost: int = 65536,
        parallelism: int = 4,
        max_attempts: int = 5,
        lockout_duration: int = 900
    ):
        self.user_repo = user_repo
        self.session_repo = session_repo
        self.max_attempts = max_attempts
        self.lockout_duration = lockout_duration
        self.hasher = PasswordHasher(
            time_cost=time_cost,
            memory_cost=memory_cost,
            parallelism=parallelism,
            hash_len=32,
            salt_len=16
        )
        # Dummy hash for constant-time comparisons when user does not exist
        self._dummy_hash = self.hasher.hash("dummy_constant_time_passphrase_to_mitigate_enumeration")

    def hash_password(self, password: str) -> str:
        """Hash a password using Argon2id."""
        return self.hasher.hash(password)

    def _hash_token(self, token: str) -> str:
        """Hash session tokens using SHA-256 before database storage."""
        return hashlib.sha256(token.encode("utf-8")).hexdigest()

    def authenticate(
        self,
        username: str,
        password: str,
        ip_address: str,
        user_agent: Optional[str] = None
    ) -> Tuple[User, str, str]:
        """
        Authenticate user and return (User, raw_session_token, csrf_token).
        Raises ApiError if authentication fails.
        """
        user = self.user_repo.get_by_username(username)

        if not user:
            # Perform dummy verification to prevent timing attack enumeration
            try:
                self.hasher.verify(self._dummy_hash, password)
            except Exception:
                pass
            raise ApiError(
                status=401,
                title="Authentication Failed",
                detail="Invalid username or password.",
                code="ERR_AUTH_INVALID_CREDENTIALS"
            )

        # Check account active
        if not user.is_active:
            raise ApiError(
                status=403,
                title="Account Suspended",
                detail="This administrative account is disabled.",
                code="ERR_AUTH_ACCOUNT_DISABLED"
            )

        # Check brute force lockout
        now = int(time.time())
        if user.is_locked():
            remaining_seconds = (user.locked_until or now) - now
            raise ApiError(
                status=429,
                title="Account Locked",
                detail=f"Too many failed login attempts. Account locked for {remaining_seconds} more seconds.",
                code="ERR_AUTH_LOCKED_OUT",
                extra={"retry_after_seconds": remaining_seconds}
            )

        # Verify password with Argon2id
        try:
            self.hasher.verify(user.password_hash, password)
        except (VerifyMismatchError, InvalidHashError):
            self.user_repo.record_failed_login(
                username=username,
                max_attempts=self.max_attempts,
                lockout_seconds=self.lockout_duration
            )
            raise ApiError(
                status=401,
                title="Authentication Failed",
                detail="Invalid username or password.",
                code="ERR_AUTH_INVALID_CREDENTIALS"
            )

        # Successful authentication: reset failed logins counter
        self.user_repo.reset_failed_logins(user.id)

        # Generate 256-bit cryptographically secure session token and CSRF token
        raw_token = secrets.token_urlsafe(32)
        csrf_token = secrets.token_urlsafe(32)
        token_hash = self._hash_token(raw_token)

        # Persist session with 30 min idle timeout
        self.session_repo.create(
            user_id=user.id,
            token_hash=token_hash,
            csrf_token=csrf_token,
            ip_address=ip_address,
            user_agent=user_agent,
            lifetime_seconds=1800
        )

        return user, raw_token, csrf_token

    def validate_session(self, raw_token: str) -> Optional[Tuple[User, Session]]:
        """Validate session token and return (User, Session) if valid."""
        if not raw_token:
            return None

        token_hash = self._hash_token(raw_token)
        session = self.session_repo.get_by_token_hash(token_hash)
        if not session:
            return None

        # Check if session is expired (idle or absolute)
        if session.is_expired():
            self.session_repo.delete(session.id)
            return None

        # Fetch active user
        user = self.user_repo.get_by_id(session.user_id)
        if not user or not user.is_active or user.is_locked():
            self.session_repo.delete(session.id)
            return None

        # Update last active timestamp
        self.session_repo.update_last_active(session.id, lifetime_seconds=1800)
        return user, session

    def terminate_session(self, raw_token: str):
        """Log out / delete session."""
        if not raw_token:
            return
        token_hash = self._hash_token(raw_token)
        self.session_repo.delete_by_token_hash(token_hash)
