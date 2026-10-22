/**
 * Ubuntu Server OS — Mock Filesystem Fixtures
 * Scoped directory tree restricted to safe virtual roots
 */

export const MOCK_FILESYSTEM = {
  "/var/www": [
    { name: "html", type: "directory", size: "4.0 KB", modified: "2026-10-18 14:22", permissions: "drwxr-xr-x" },
    { name: "app.ubuntuserver.lan", type: "directory", size: "4.0 KB", modified: "2026-10-20 09:15", permissions: "drwxr-xr-x" },
    { name: "index.html", type: "file", size: "1.2 KB", modified: "2026-10-21 11:30", permissions: "-rw-r--r--" },
    { name: "robots.txt", type: "file", size: "284 B", modified: "2026-10-19 16:40", permissions: "-rw-r--r--" }
  ],
  "/var/www/html": [
    { name: "..", type: "directory", size: "—", modified: "—", permissions: "drwxr-xr-x" },
    { name: "assets", type: "directory", size: "4.0 KB", modified: "2026-10-20 18:00", permissions: "drwxr-xr-x" },
    { name: "index.html", type: "file", size: "3.4 KB", modified: "2026-10-21 17:10", permissions: "-rw-r--r--" },
    { name: "favicon.ico", type: "file", size: "14.2 KB", modified: "2026-10-15 12:00", permissions: "-rw-r--r--" }
  ],
  "/var/log": [
    { name: "nginx", type: "directory", size: "4.0 KB", modified: "2026-10-22 13:00", permissions: "drwxr-x---" },
    { name: "syslog", type: "file", size: "4.8 MB", modified: "2026-10-22 13:30", permissions: "-rw-r-----" },
    { name: "auth.log", type: "file", size: "820 KB", modified: "2026-10-22 13:25", permissions: "-rw-r-----" },
    { name: "dpkg.log", type: "file", size: "1.4 MB", modified: "2026-10-18 04:12", permissions: "-rw-r--r--" }
  ]
};
