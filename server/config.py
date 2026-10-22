"""
Ubuntu Server OS — Configuration Module
Environment configurations adhering to security trust boundaries.
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"


class Config:
    """Base Configuration."""
    SECRET_KEY = os.environ.get("UBUNTU_OS_SECRET_KEY", "insecure-dev-secret-key-change-in-prod-32bytes!")
    SESSION_COOKIE_NAME = "ubuntuserver_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Strict"
    SESSION_COOKIE_SECURE = os.environ.get("UBUNTU_OS_ENV") == "production"
    PERMANENT_SESSION_LIFETIME = 1800  # 30 minutes idle timeout
    MAX_SESSION_ABSOLUTE_LIFETIME = 43200  # 12 hours absolute limit

    # Database
    DATABASE_PATH = os.environ.get("UBUNTU_OS_DB_PATH", str(DATA_DIR / "ubuntu_os.db"))

    # Security
    ARGON2_TIME_COST = 3
    ARGON2_MEMORY_COST = 65536  # 64 MB
    ARGON2_PARALLELISM = 4
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION_SECONDS = 900  # 15 minutes

    # Scoped Filesystem Allowlist
    ALLOWED_DIRECTORIES = [
        "/var/log",
        "/etc/nginx",
        "/var/www",
        "/opt"
    ]

    # Service Management Allowlist
    ALLOWED_SERVICES = [
        "nginx.service",
        "postgresql.service",
        "redis-server.service",
        "docker.service",
        "ssh.service",
        "ufw.service",
        "wg-quick@wg0.service"
    ]

    # Anti-Lockout Protected Units
    PROTECTED_SERVICES = [
        "ssh.service",
        "sshd.service",
        "ufw.service",
        "wg-quick@wg0.service"
    ]


class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False
    SESSION_COOKIE_SECURE = False


class TestingConfig(Config):
    DEBUG = False
    TESTING = True
    DATABASE_PATH = ":memory:"
    ARGON2_TIME_COST = 1
    ARGON2_MEMORY_COST = 1024  # Fast for tests
    ARGON2_PARALLELISM = 1
    SESSION_COOKIE_SECURE = False


class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    SESSION_COOKIE_SECURE = True


config_by_name = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
    "default": DevelopmentConfig
}
