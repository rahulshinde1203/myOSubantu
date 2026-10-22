/**
 * Ubuntu Server OS — Mock Metrics Fixtures Engine (macOS Level + htop + df -Th)
 * Produces deterministic, realistic simulated psutil telemetry, htop tasks, and df -Th partitions
 */

export class MockMetricsGenerator {
  constructor() {
    this.historyLength = 60;
    this.cpuHistory = [];
    this.memHistory = [];
    this.netRxHistory = [];
    this.netTxHistory = [];
    this.baseCpu = 24.5;
    this.baseMem = 48.2;
    this.baseRx = 1.15; // MB/s
    this.baseTx = 0.38; // MB/s

    // Seed rolling histories
    for (let i = 0; i < this.historyLength; i++) {
      this.cpuHistory.push(this._jitter(this.baseCpu, 15, 5, 95));
      this.memHistory.push(this._jitter(this.baseMem, 4, 30, 85));
      this.netRxHistory.push(this._jitter(this.baseRx, 0.4, 0.1, 8.0));
      this.netTxHistory.push(this._jitter(this.baseTx, 0.2, 0.05, 3.0));
    }
  }

  _jitter(base, maxDelta, minVal, maxVal) {
    const delta = (Math.random() * 2 - 1) * maxDelta;
    let res = base + delta;
    return Math.max(minVal, Math.min(maxVal, parseFloat(res.toFixed(1))));
  }

  sample() {
    const nextCpu = this._jitter(this.baseCpu, 8, 4, 98);
    const nextMem = this._jitter(this.baseMem, 1.5, 30, 85);
    const nextRx = this._jitter(this.baseRx, 0.35, 0.1, 10.0);
    const nextTx = this._jitter(this.baseTx, 0.15, 0.05, 4.0);

    this.cpuHistory.shift();
    this.cpuHistory.push(nextCpu);

    this.memHistory.shift();
    this.memHistory.push(nextMem);

    this.netRxHistory.shift();
    this.netRxHistory.push(nextRx);

    this.netTxHistory.shift();
    this.netTxHistory.push(nextTx);

    // 8-Core htop loads
    const coreLoads = [
      this._jitter(nextCpu, 14, 5, 95),
      this._jitter(nextCpu * 0.8, 12, 4, 90),
      this._jitter(nextCpu * 1.2, 16, 8, 98),
      this._jitter(nextCpu * 0.6, 10, 3, 85),
      this._jitter(nextCpu * 0.9, 12, 5, 92),
      this._jitter(nextCpu * 1.1, 15, 6, 96),
      this._jitter(nextCpu * 0.7, 10, 4, 88),
      this._jitter(nextCpu * 0.85, 11, 5, 90)
    ];

    // df -Th visual partition breakdowns
    const filesystems = [
      {
        filesystem: "/dev/sda1",
        type: "ext4",
        size: "200.0G",
        used: "84.4G",
        avail: "115.6G",
        percent: 42,
        mount: "/"
      },
      {
        filesystem: "/dev/sdb1",
        type: "ext4",
        size: "500.0G",
        used: "342.0G",
        avail: "158.0G",
        percent: 68,
        mount: "/home/data"
      },
      {
        filesystem: "/dev/nvme0n1p2",
        type: "btrfs",
        size: "250.0G",
        used: "218.0G",
        avail: "32.0G",
        percent: 87,
        mount: "/var/lib/docker"
      },
      {
        filesystem: "tmpfs",
        type: "tmpfs",
        size: "3.9G",
        used: "18.2M",
        avail: "3.9G",
        percent: 1,
        mount: "/run"
      },
      {
        filesystem: "/dev/sda2",
        type: "vfat",
        size: "1.1G",
        used: "124.0M",
        avail: "976.0M",
        percent: 11,
        mount: "/boot/efi"
      }
    ];

    // htop active processes
    const htopProcesses = [
      { pid: 1420, user: "www-data", pri: 20, ni: 0, virt: "148M", res: "48.2M", shr: "18.4M", s: "S", cpu: (nextCpu * 0.25).toFixed(1), mem: 1.2, time: "12:18.42", cmd: "/usr/sbin/nginx -g daemon on;" },
      { pid: 984, user: "root", pri: 20, ni: 0, virt: "1.2G", res: "284M", shr: "42.0M", s: "S", cpu: (nextCpu * 0.35).toFixed(1), mem: 3.5, time: "48:12.05", cmd: "/usr/bin/dockerd -H fd:// --containerd=/run/containerd/containerd.sock" },
      { pid: 1120, user: "postgres", pri: 20, ni: 0, virt: "420M", res: "142M", shr: "68.2M", s: "S", cpu: (nextCpu * 0.18).toFixed(1), mem: 1.8, time: "08:44.20", cmd: "postgres: 16/main: checkpointer" },
      { pid: 1045, user: "redis", pri: 20, ni: 0, virt: "94.2M", res: "32.4M", shr: "8.6M", s: "S", cpu: "0.8", mem: 0.4, time: "04:15.80", cmd: "/usr/bin/redis-server 127.0.0.1:6379" },
      { pid: 612, user: "root", pri: 20, ni: 0, virt: "28.4M", res: "12.8M", shr: "4.2M", s: "S", cpu: "0.2", mem: 0.2, time: "01:02.14", cmd: "/usr/sbin/sshd -D" },
      { pid: 1, user: "root", pri: 20, ni: 0, virt: "168M", res: "14.2M", shr: "8.8M", s: "S", cpu: "0.1", mem: 0.2, time: "03:12.89", cmd: "/sbin/init splash" }
    ];

    return {
      timestamp: new Date().toISOString(),
      cpu: {
        total_percent: nextCpu,
        cores: coreLoads,
        core_count: 8,
        clock_speed: "3.20 GHz",
        model: "AMD EPYC 7763 64-Core Processor",
        history: [...this.cpuHistory]
      },
      memory: {
        total_gb: 8.0,
        used_gb: parseFloat(((nextMem / 100) * 8.0).toFixed(2)),
        free_gb: parseFloat((8.0 - (nextMem / 100) * 8.0).toFixed(2)),
        percent: nextMem,
        active_gb: parseFloat(((nextMem / 100) * 6.2).toFixed(2)),
        buffers_gb: 1.2,
        history: [...this.memHistory]
      },
      disk: {
        mount_point: "/",
        device: "/dev/sda1",
        filesystem: "ext4",
        total_gb: 200.0,
        used_gb: 84.4,
        free_gb: 115.6,
        percent: 42.2
      },
      filesystems,
      htop: {
        tasks_count: 142,
        threads_count: 248,
        running_tasks: 1,
        load_avg: "0.42 0.38 0.31",
        uptime_str: "14 days, 06:22:15",
        swap_total: "2.00G",
        swap_used: "128M",
        swap_percent: 6.4,
        processes: htopProcesses
      },
      network: {
        interface: "eth0",
        rx_mb_per_sec: nextRx,
        tx_mb_per_sec: nextTx,
        rx_total_gb: 42.8,
        tx_total_gb: 12.3,
        history_rx: [...this.netRxHistory],
        history_tx: [...this.netTxHistory]
      },
      system: {
        hostname: "srv-prod-node01.lan",
        os: "Ubuntu 24.04 LTS (Noble Numbat)",
        kernel: "Linux 6.8.0-31-generic (x86_64)",
        uptime_seconds: 1232542,
        uptime_formatted: "14d 6h 22m",
        vpn_status: "CONNECTED (Tailscale 100.84.12.9)"
      }
    };
  }
}
