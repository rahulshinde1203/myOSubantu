/**
 * Ubuntu Server OS — Mock Services Fixtures
 * Allowlisted services and anti-lockout blacklist representations
 */

export const MOCK_SERVICES = [
  {
    name: "nginx.service",
    display_name: "Nginx HTTP Server",
    description: "A high performance web server and reverse proxy",
    status: "active",
    sub_state: "running",
    memory_mb: 48.2,
    cpu_percent: 1.2,
    pid: 1420,
    uptime: "14d 6h 18m",
    allowlisted: true,
    protected: false
  },
  {
    name: "docker.service",
    display_name: "Docker Application Container Engine",
    description: "Open source container virtualization daemon",
    status: "active",
    sub_state: "running",
    memory_mb: 284.6,
    cpu_percent: 3.4,
    pid: 984,
    uptime: "14d 6h 20m",
    allowlisted: true,
    protected: false
  },
  {
    name: "postgresql.service",
    display_name: "PostgreSQL RDBMS",
    description: "PostgreSQL relational database server",
    status: "active",
    sub_state: "running",
    memory_mb: 142.0,
    cpu_percent: 0.8,
    pid: 1120,
    uptime: "14d 6h 19m",
    allowlisted: true,
    protected: false
  },
  {
    name: "redis-server.service",
    display_name: "Redis In-Memory Store",
    description: "Persistent key-value database and cache server",
    status: "active",
    sub_state: "running",
    memory_mb: 32.4,
    cpu_percent: 0.4,
    pid: 1045,
    uptime: "14d 6h 19m",
    allowlisted: true,
    protected: false
  },
  {
    name: "ufw.service",
    display_name: "Uncomplicated Firewall",
    description: "Program for managing a netfilter firewall",
    status: "active",
    sub_state: "exited",
    memory_mb: 4.1,
    cpu_percent: 0.0,
    pid: 612,
    uptime: "14d 6h 22m",
    allowlisted: true,
    protected: true // PROTECTED: Cannot be stopped from web UI
  },
  {
    name: "ssh.service",
    display_name: "OpenBSD Secure Shell server",
    description: "OpenSSH remote access daemon",
    status: "active",
    sub_state: "running",
    memory_mb: 12.8,
    cpu_percent: 0.1,
    pid: 742,
    uptime: "14d 6h 22m",
    allowlisted: false,
    protected: true // PROTECTED: Lockout prevention
  }
];
