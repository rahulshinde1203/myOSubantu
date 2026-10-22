"""
Ubuntu Server OS — Journald Log Reader Subsystem
Structured querying of host systemd-journald logs with ANSI sequence sanitization.
"""

import re
import json
import time
import shutil
import platform
import subprocess
from typing import Dict, Any, List, Optional
from server.utils.errors import ApiError

ANSI_ESCAPE_REGEX = re.compile(r'\x1B(?:[@-Z\\-_]|\[[0-?]*[ -/]*[@-~])')

PRIORITY_NAMES = {
    0: "emerg",
    1: "alert",
    2: "crit",
    3: "err",
    4: "warning",
    5: "notice",
    6: "info",
    7: "debug"
}


class LogReader:
    def __init__(self):
        self.has_journalctl = shutil.which("journalctl") is not None and platform.system() == "Linux"

        # Mock journald stream for dev / test / non-Linux environments
        self._mock_entries = [
            {"unit": "nginx.service", "priority": 6, "msg": "Configuration /etc/nginx/nginx.conf syntax is ok"},
            {"unit": "nginx.service", "priority": 6, "msg": "nginx.service: Deactivated successfully."},
            {"unit": "nginx.service", "priority": 6, "msg": "Started A high performance web server and reverse proxy."},
            {"unit": "docker.service", "priority": 6, "msg": "Started Docker Application Container Engine."},
            {"unit": "docker.service", "priority": 5, "msg": "containerd successfully booted in 0.042s"},
            {"unit": "postgresql.service", "priority": 6, "msg": "database system was shut down at 2026-10-22 08:00:12 UTC"},
            {"unit": "postgresql.service", "priority": 6, "msg": "database system is ready to accept connections"},
            {"unit": "ssh.service", "priority": 6, "msg": "Server listening on 0.0.0.0 port 22."},
            {"unit": "ssh.service", "priority": 4, "msg": "Failed password for invalid user admin from 192.168.1.100 port 54120 ssh2"},
            {"unit": "ufw.service", "priority": 6, "msg": "[UFW BLOCK] IN=eth0 OUT= MAC=... SRC=198.51.100.42 DST=10.0.0.1 PROTO=TCP SPT=44122 DPT=23"}
        ]

    def sanitize_message(self, text: str) -> str:
        """Strip raw ANSI escape sequences to prevent terminal injection."""
        if not text or not isinstance(text, str):
            return ""
        return ANSI_ESCAPE_REGEX.sub('', text)

    def query_logs(
        self,
        unit: Optional[str] = None,
        priority: int = 7,
        limit: int = 100,
        since: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Query systemd-journald logs with pagination and sanitization.
        Max limit: 500 lines.
        """
        limit = min(max(int(limit), 1), 500)
        priority = min(max(int(priority), 0), 7)

        if self.has_journalctl:
            cmd = ["journalctl", "--output=json", "-n", str(limit), "-p", str(priority), "--no-pager"]
            if unit:
                cmd.extend(["-u", unit])
            if since:
                cmd.extend(["--since", since])

            try:
                proc = subprocess.run(cmd, shell=False, capture_output=True, text=True, timeout=8.0)
                entries = []
                for line in proc.stdout.splitlines():
                    if not line.strip():
                        continue
                    try:
                        record = json.loads(line)
                        raw_msg = record.get("MESSAGE", "")
                        clean_msg = self.sanitize_message(raw_msg)
                        p_val = int(record.get("PRIORITY", 6))
                        ts_us = int(record.get("__REALTIME_TIMESTAMP", time.time() * 1_000_000))
                        entries.append({
                            "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(ts_us / 1_000_000)),
                            "unit": record.get("_SYSTEMD_UNIT", record.get("SYSLOG_IDENTIFIER", "kernel")),
                            "priority": p_val,
                            "priority_name": PRIORITY_NAMES.get(p_val, "info"),
                            "message": clean_msg
                        })
                    except Exception:
                        continue
                return entries
            except Exception as e:
                raise ApiError(status=500, title="Journald Query Error", detail=str(e), code="ERR_JOURNALD_EXECUTION_FAILED")

        # Simulated journald records
        now = time.time()
        filtered = []
        for i, mock in enumerate(self._mock_entries):
            if unit and mock["unit"] != unit:
                continue
            if mock["priority"] > priority:
                continue
            item_ts = now - (len(self._mock_entries) - i) * 60
            filtered.append({
                "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(item_ts)),
                "unit": mock["unit"],
                "priority": mock["priority"],
                "priority_name": PRIORITY_NAMES.get(mock["priority"], "info"),
                "message": self.sanitize_message(mock["msg"])
            })

        return filtered[-limit:]
