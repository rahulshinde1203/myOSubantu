"""
Ubuntu Server OS — Metrics REST API Blueprint
Sub-millisecond endpoints for live and historical telemetry.
"""

from flask import Blueprint, jsonify, current_app
from server.core.rbac import require_auth

metrics_bp = Blueprint("metrics_bp", __name__, url_prefix="/api/v1/metrics")


@metrics_bp.route("/current", methods=["GET"])
@require_auth
def get_current_metrics():
    """Return latest instantaneous telemetry snapshot."""
    collector = current_app.metrics_collector
    data = collector.get_current()
    return jsonify({
        "status": "success",
        "data": data
    })


@metrics_bp.route("/history", methods=["GET"])
@require_auth
def get_metrics_history():
    """Return rolling circular buffer history (up to 60 samples)."""
    collector = current_app.metrics_collector
    history = collector.get_history()
    return jsonify({
        "status": "success",
        "count": len(history),
        "history": history
    })
