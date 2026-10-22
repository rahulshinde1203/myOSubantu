/**
 * Ubuntu Server OS — Mock Journald Logs Fixtures
 */

export const MOCK_JOURNAL_LOGS = [
  {
    timestamp: "2026-10-22 13:30:14",
    unit: "systemd[1]",
    priority: "info",
    message: "Started Session 42 of User admin."
  },
  {
    timestamp: "2026-10-22 13:28:45",
    unit: "nginx[1420]",
    priority: "info",
    message: "10.0.10.42 - - [22/Oct/2026:13:28:45 +0000] \"GET /api/v1/metrics/current HTTP/1.1\" 200 482"
  },
  {
    timestamp: "2026-10-22 13:24:10",
    unit: "kernel",
    priority: "notice",
    message: "[UFW BLOCK] IN=eth0 OUT= MAC=52:54:00:12:34:56 SRC=198.51.100.44 DST=10.0.10.15 PROTO=TCP DPT=23"
  },
  {
    timestamp: "2026-10-22 13:20:02",
    unit: "dockerd[984]",
    priority: "info",
    message: "containerd: default container runtime active"
  },
  {
    timestamp: "2026-10-22 13:18:22",
    unit: "systemd[1]",
    priority: "info",
    message: "Reloaded Nginx HTTP Server."
  },
  {
    timestamp: "2026-10-22 13:15:00",
    unit: "cron[620]",
    priority: "info",
    message: "(root) CMD (/usr/local/bin/logrotate-check)"
  },
  {
    timestamp: "2026-10-22 13:00:12",
    unit: "sshd[742]",
    priority: "warning",
    message: "Failed password for invalid user oracle from 203.0.113.12 port 49210 ssh2"
  }
];
