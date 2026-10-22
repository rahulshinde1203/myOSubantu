"""
Ubuntu Server OS — Application Factory
Flask initialization, database binding, security middleware, and routing.
"""

from flask import Flask
from werkzeug.exceptions import HTTPException

from server.config import config_by_name
from server.models.db import Database
from server.models.user import UserRepository
from server.models.session import SessionRepository
from server.models.audit_log import AuditLogRepository
from server.core.auth_manager import AuthManager
from server.core.audit_logger import AuditLogger
from server.core.metrics_collector import MetricsCollector
from server.core.service_manager import ServiceManager
from server.core.file_manager import FileManager
from server.core.log_reader import LogReader
from server.terminal.session_manager import TerminalTicketManager, TerminalSessionManager
from server.core.csrf import init_csrf
from server.core.rbac import authenticate_request
from server.utils.errors import ApiError, error_response


class UbuntuServerApp(Flask):
    """Flask application subclass with strictly typed security and domain managers."""
    db: Database
    user_repo: UserRepository
    session_repo: SessionRepository
    audit_repo: AuditLogRepository
    auth_manager: AuthManager
    audit_logger: AuditLogger
    metrics_collector: MetricsCollector
    service_manager: ServiceManager
    file_manager: FileManager
    log_reader: LogReader
    terminal_ticket_manager: TerminalTicketManager
    terminal_session_manager: TerminalSessionManager


def create_app(config_name: str = "default") -> UbuntuServerApp:
    """Create and configure the Ubuntu Server OS Flask application."""
    app = UbuntuServerApp(__name__)

    # Load configuration
    cfg_class = config_by_name.get(config_name, config_by_name["default"])
    app.config.from_object(cfg_class)

    # Initialize Database & Repositories
    db = Database(app.config["DATABASE_PATH"])
    user_repo = UserRepository(db)
    session_repo = SessionRepository(db)
    audit_repo = AuditLogRepository(db)

    # Initialize Managers
    auth_manager = AuthManager(
        user_repo=user_repo,
        session_repo=session_repo,
        time_cost=app.config.get("ARGON2_TIME_COST", 3),
        memory_cost=app.config.get("ARGON2_MEMORY_COST", 65536),
        parallelism=app.config.get("ARGON2_PARALLELISM", 4),
        max_attempts=app.config.get("MAX_LOGIN_ATTEMPTS", 5),
        lockout_duration=app.config.get("LOCKOUT_DURATION_SECONDS", 900)
    )
    audit_logger = AuditLogger(audit_repo)

    # Initialize Telemetry Metrics Collector
    metrics_collector = MetricsCollector(
        sample_interval=app.config.get("METRICS_SAMPLE_INTERVAL", 2.0),
        max_history_samples=app.config.get("METRICS_HISTORY_SAMPLES", 60)
    )
    if not app.config.get("TESTING"):
        metrics_collector.start()

    # Initialize Service Manager
    service_manager = ServiceManager(
        allowed_services=app.config.get("ALLOWED_SERVICES"),
        audit_logger=audit_logger
    )

    # Initialize Filesystem & Log Managers
    file_manager = FileManager(
        allowed_directories=app.config.get("ALLOWED_DIRECTORIES"),
        audit_logger=audit_logger
    )
    log_reader = LogReader()

    # Initialize Terminal Managers
    terminal_ticket_manager = TerminalTicketManager()
    terminal_session_manager = TerminalSessionManager()

    # Attach to application context
    app.db = db
    app.user_repo = user_repo
    app.session_repo = session_repo
    app.audit_repo = audit_repo
    app.auth_manager = auth_manager
    app.audit_logger = audit_logger
    app.metrics_collector = metrics_collector
    app.service_manager = service_manager
    app.file_manager = file_manager
    app.log_reader = log_reader
    app.terminal_ticket_manager = terminal_ticket_manager
    app.terminal_session_manager = terminal_session_manager

    # Register Middlewares
    app.before_request(authenticate_request)
    init_csrf(app)

    # Security Headers
    @app.after_request
    def set_security_headers(response):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        if app.config.get("SESSION_COOKIE_SECURE"):
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        return response

    # RFC 7807 Error Handlers
    @app.errorhandler(ApiError)
    def handle_api_error(err: ApiError):
        return err.to_response()

    @app.errorhandler(HTTPException)
    def handle_http_exception(err: HTTPException):
        code = f"ERR_HTTP_{err.code}"
        return error_response(
            status=err.code or 500,
            title=err.name,
            detail=err.description or "An HTTP exception occurred.",
            code=code
        )

    @app.errorhandler(Exception)
    def handle_unhandled_exception(err: Exception):
        app.logger.exception("Unhandled server exception: %s", err)
        return error_response(
            status=500,
            title="Internal Server Error",
            detail="An unexpected internal server error occurred.",
            code="ERR_INTERNAL_SERVER_ERROR"
        )

    # Register Blueprints
    from server.api.v1.auth import auth_bp
    from server.api.v1.audit import audit_bp
    from server.api.v1.system import system_bp
    from server.api.v1.metrics import metrics_bp
    from server.api.v1.services import services_bp
    from server.api.v1.files import files_bp
    from server.api.v1.logs import logs_bp
    from server.api.v1.terminal import terminal_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(audit_bp)
    app.register_blueprint(system_bp)
    app.register_blueprint(metrics_bp)
    app.register_blueprint(services_bp)
    app.register_blueprint(files_bp)
    app.register_blueprint(logs_bp)
    app.register_blueprint(terminal_bp)

    # CLI Management Commands
    @app.cli.command("create-admin")
    def create_admin_cmd():
        """CLI tool to provision an initial administrator account."""
        import click
        username = click.prompt("Admin username", default="admin")
        password = click.prompt("Admin password", hide_input=True, confirmation_prompt=True)
        role = click.prompt("Role (admin/operator)", default="admin")

        existing = user_repo.get_by_username(username)
        if existing:
            click.echo(f"Error: User '{username}' already exists.")
            return

        p_hash = auth_manager.hash_password(password)
        new_user = user_repo.create(username, p_hash, role)
        click.echo(f"Successfully provisioned administrative user '{new_user.username}' (ID: {new_user.id}, Role: {new_user.role}).")

    return app
