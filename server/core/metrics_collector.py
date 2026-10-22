"""
Ubuntu Server OS — Telemetry Engine & Metrics Collector
High-performance system telemetry via psutil with in-memory circular ring buffer cache.
"""

import time
import threading
from collections import deque
from typing import Dict, Any, List, Optional
import psutil


class MetricsCollector:
    """
    Sub-millisecond telemetry sampler utilizing an in-memory circular ring buffer.
    Maintains rolling history without generating disk I/O.
    """
    def __init__(self, sample_interval: float = 2.0, max_history_samples: int = 60):
        self.sample_interval = sample_interval
        self.max_history_samples = max_history_samples
        self._buffer: deque = deque(maxlen=max_history_samples)
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None

        # Network delta tracking
        self._last_net_time: Optional[float] = None
        self._last_bytes_recv: Optional[int] = None
        self._last_bytes_sent: Optional[int] = None

        # Initialize baseline psutil cpu measurement
        try:
            psutil.cpu_percent(interval=None, percpu=True)
            net_io = psutil.net_io_counters()
            self._last_net_time = time.time()
            self._last_bytes_recv = net_io.bytes_recv
            self._last_bytes_sent = net_io.bytes_sent
        except Exception:
            pass

    def sample_now(self) -> Dict[str, Any]:
        """Collect an instantaneous snapshot of system telemetry."""
        now = time.time()

        # 1. CPU Metrics
        try:
            per_cpu = psutil.cpu_percent(interval=None, percpu=True)
            cpu_aggregate = psutil.cpu_percent(interval=None) if not per_cpu else (sum(per_cpu) / len(per_cpu))
            load_avg = list(psutil.getloadavg()) if hasattr(psutil, "getloadavg") else [0.0, 0.0, 0.0]
        except Exception:
            per_cpu = [0.0]
            cpu_aggregate = 0.0
            load_avg = [0.0, 0.0, 0.0]

        # 2. Memory Metrics
        try:
            vm = psutil.virtual_memory()
            memory_data = {
                "total_bytes": vm.total,
                "available_bytes": vm.available,
                "used_bytes": vm.used,
                "free_bytes": vm.free,
                "percent": vm.percent,
                "buffers_bytes": getattr(vm, "buffers", 0),
                "cached_bytes": getattr(vm, "cached", 0)
            }
        except Exception:
            memory_data = {
                "total_bytes": 0,
                "available_bytes": 0,
                "used_bytes": 0,
                "free_bytes": 0,
                "percent": 0.0,
                "buffers_bytes": 0,
                "cached_bytes": 0
            }

        # 3. Swap Metrics
        try:
            sm = psutil.swap_memory()
            swap_data = {
                "total_bytes": sm.total,
                "used_bytes": sm.used,
                "free_bytes": sm.free,
                "percent": sm.percent
            }
        except Exception:
            swap_data = {"total_bytes": 0, "used_bytes": 0, "free_bytes": 0, "percent": 0.0}

        # 4. Disk Partition Metrics
        disks = []
        try:
            for part in psutil.disk_partitions(all=False):
                try:
                    usage = psutil.disk_usage(part.mountpoint)
                    disks.append({
                        "device": part.device,
                        "mountpoint": part.mountpoint,
                        "fstype": part.fstype,
                        "total_bytes": usage.total,
                        "used_bytes": usage.used,
                        "free_bytes": usage.free,
                        "percent": usage.percent
                    })
                except (PermissionError, OSError):
                    continue
        except Exception:
            pass

        # 5. Network RX / TX Bandwidth Deltas
        net_rx_rate = 0.0
        net_tx_rate = 0.0
        try:
            net_io = psutil.net_io_counters()
            if self._last_net_time and self._last_bytes_recv is not None and self._last_bytes_sent is not None:
                dt = max(now - self._last_net_time, 0.001)
                net_rx_rate = max(0.0, (net_io.bytes_recv - self._last_bytes_recv) / dt)
                net_tx_rate = max(0.0, (net_io.bytes_sent - self._last_bytes_sent) / dt)

            self._last_net_time = now
            self._last_bytes_recv = net_io.bytes_recv
            self._last_bytes_sent = net_io.bytes_sent
        except Exception:
            pass

        metric_point = {
            "timestamp": int(now),
            "timestamp_iso": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(now)),
            "cpu": {
                "aggregate_percent": round(cpu_aggregate, 1),
                "cores_percent": [round(c, 1) for c in per_cpu],
                "core_count": len(per_cpu),
                "load_average": [round(x, 2) for x in load_avg]
            },
            "memory": memory_data,
            "swap": swap_data,
            "disks": disks,
            "network": {
                "rx_bytes_sec": round(net_rx_rate, 1),
                "tx_bytes_sec": round(net_tx_rate, 1)
            }
        }

        # Store into thread-safe circular buffer
        with self._lock:
            self._buffer.append(metric_point)

        return metric_point

    def get_current(self) -> Dict[str, Any]:
        """Fetch latest telemetry snapshot (< 1ms)."""
        with self._lock:
            if self._buffer:
                return self._buffer[-1]
        # If buffer empty, sample synchronously
        return self.sample_now()

    def get_history(self) -> List[Dict[str, Any]]:
        """Fetch rolling history snapshot in chronological order."""
        with self._lock:
            return list(self._buffer)

    def _loop(self):
        """Background sampling loop."""
        while self._running:
            try:
                self.sample_now()
            except Exception:
                pass
            time.sleep(self.sample_interval)

    def start(self):
        """Start background sampling thread."""
        if self._running:
            return
        self._running = True
        self._thread = threading.Thread(target=self._loop, daemon=True, name="TelemetrySampler")
        self._thread.start()

    def stop(self):
        """Stop background sampling thread."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=1.0)
            self._thread = None
