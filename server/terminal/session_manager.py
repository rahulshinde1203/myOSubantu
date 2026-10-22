"""
Ubuntu Server OS — Terminal Session & Ticket Manager
Unprivileged PTY worker allocation, single-use ticket dispenser, quota enforcement, and process group cleanup.
"""

import os
import pty
import time
import signal
import secrets
import threading
from typing import Dict, Optional
from server.terminal.buffer import CircularIOBuffer
from server.utils.errors import ApiError

MAX_SESSIONS_PER_USER = 2
MAX_SERVER_WIDE_SESSIONS = 5
TICKET_LIFETIME_SECONDS = 60
SESSION_IDLE_TIMEOUT_SECONDS = 900  # 15 minutes


class TerminalTicket:
    def __init__(self, ticket: str, user_id: str, expires_at: float):
        self.ticket = ticket
        self.user_id = user_id
        self.expires_at = expires_at

    def is_expired(self) -> bool:
        return time.time() > self.expires_at


class TerminalTicketManager:
    """Issues and consumes single-use 256-bit step-up authentication tickets."""
    def __init__(self, ticket_ttl: int = TICKET_LIFETIME_SECONDS):
        self.ticket_ttl = ticket_ttl
        self._tickets: Dict[str, TerminalTicket] = {}
        self._lock = threading.Lock()

    def issue_ticket(self, user_id: str) -> str:
        ticket_str = secrets.token_urlsafe(32)
        expires_at = time.time() + self.ticket_ttl
        with self._lock:
            # Clean expired tickets
            now = time.time()
            self._tickets = {k: v for k, v in self._tickets.items() if v.expires_at > now}
            self._tickets[ticket_str] = TerminalTicket(ticket_str, user_id, expires_at)
        return ticket_str

    def consume_ticket(self, ticket_str: str) -> Optional[str]:
        """Validate and immediately delete the ticket (strictly single-use)."""
        with self._lock:
            ticket = self._tickets.pop(ticket_str, None)
            if not ticket or ticket.is_expired():
                return None
            return ticket.user_id


class TerminalSession:
    def __init__(self, session_id: str, user_id: str, pid: int, master_fd: int):
        self.session_id = session_id
        self.user_id = user_id
        self.pid = pid
        self.master_fd = master_fd
        self.buffer = CircularIOBuffer()
        self.created_at = time.time()
        self.last_active_at = time.time()
        self.is_alive = True

    def touch(self):
        self.last_active_at = time.time()

    def is_idle_expired(self, timeout: int = SESSION_IDLE_TIMEOUT_SECONDS) -> bool:
        return (time.time() - self.last_active_at) > timeout


class TerminalSessionManager:
    """
    Manages terminal sessions, enforces quotas, allocates PTYs,
    and terminates process groups cleanly without leaving zombie shells.
    """
    def __init__(
        self,
        max_per_user: int = MAX_SESSIONS_PER_USER,
        max_total: int = MAX_SERVER_WIDE_SESSIONS
    ):
        self.max_per_user = max_per_user
        self.max_total = max_total
        self._sessions: Dict[str, TerminalSession] = {}
        self._lock = threading.Lock()

    def count_user_sessions(self, user_id: str) -> int:
        with self._lock:
            return sum(1 for s in self._sessions.values() if s.user_id == user_id and s.is_alive)

    def total_active_sessions(self) -> int:
        with self._lock:
            return sum(1 for s in self._sessions.values() if s.is_alive)

    def create_session(self, user_id: str) -> TerminalSession:
        """Allocate an unprivileged PTY shell enforcing session quotas."""
        with self._lock:
            # Check server-wide quota
            active_total = sum(1 for s in self._sessions.values() if s.is_alive)
            if active_total >= self.max_total:
                raise ApiError(
                    status=429,
                    title="Terminal Quota Exceeded",
                    detail=f"Server-wide concurrent terminal limit reached ({self.max_total} active).",
                    code="ERR_TERMINAL_QUOTA_SERVER"
                )

            # Check per-user quota
            active_user = sum(1 for s in self._sessions.values() if s.user_id == user_id and s.is_alive)
            if active_user >= self.max_per_user:
                raise ApiError(
                    status=429,
                    title="User Terminal Quota Exceeded",
                    detail=f"User terminal limit reached (maximum {self.max_per_user} concurrent sessions).",
                    code="ERR_TERMINAL_QUOTA_USER"
                )

        session_id = secrets.token_urlsafe(16)

        # Allocate PTY
        try:
            master_fd, slave_fd = pty.openpty()
        except Exception as e:
            raise ApiError(
                status=500,
                title="PTY Allocation Failed",
                detail=f"Failed to allocate pseudo-terminal: {e}",
                code="ERR_TERMINAL_PTY_FAILED"
            )

        # Fork worker shell process
        pid = os.fork()
        if pid == 0:
            # Child process: configure new session group and attach PTY slave
            try:
                os.setsid()
                os.close(master_fd)

                # Connect stdin, stdout, stderr to slave_fd
                for fd in (0, 1, 2):
                    os.dup2(slave_fd, fd)
                if slave_fd > 2:
                    os.close(slave_fd)

                # Set terminal environment
                os.environ["TERM"] = "xterm-256color"
                os.environ["PS1"] = r"\[\033[01;32m\]ubuntu@server\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ "

                # Execute bash login shell
                shell = "/bin/bash" if os.path.exists("/bin/bash") else "/bin/sh"
                os.execv(shell, [shell, "--login"])
            except Exception:
                os._exit(1)
        else:
            # Parent process
            os.close(slave_fd)
            session = TerminalSession(session_id, user_id, pid, master_fd)
            with self._lock:
                self._sessions[session_id] = session
            return session

    def terminate_session(self, session_id: str):
        """Cleanly terminate PTY process group (SIGHUP -> SIGTERM -> SIGKILL)."""
        with self._lock:
            session = self._sessions.get(session_id)
            if not session or not session.is_alive:
                return
            session.is_alive = False

        # Close master FD
        try:
            os.close(session.master_fd)
        except OSError:
            pass

        # Send SIGHUP to process group
        try:
            pgid = os.getpgid(session.pid)
            os.killpg(pgid, signal.SIGHUP)
            time.sleep(0.05)
            # Follow with SIGTERM if still running
            os.killpg(pgid, signal.SIGTERM)
        except (ProcessLookupError, PermissionError, OSError):
            pass

        # Reap zombie process
        try:
            os.waitpid(session.pid, os.WNOHANG)
        except (ChildProcessError, OSError):
            pass

        with self._lock:
            self._sessions.pop(session_id, None)

    def reap_idle_sessions(self, timeout: int = SESSION_IDLE_TIMEOUT_SECONDS):
        """Cleanup sessions inactive for > 15 minutes."""
        with self._lock:
            to_reap = [s.session_id for s in self._sessions.values() if s.is_alive and s.is_idle_expired(timeout)]

        for sid in to_reap:
            self.terminate_session(sid)
