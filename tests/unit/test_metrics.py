"""
Ubuntu Server OS — Unit Tests: Telemetry Metrics Collector
"""

import time
from server.core.metrics_collector import MetricsCollector

def test_metrics_sample_schema():
    collector = MetricsCollector(sample_interval=1.0, max_history_samples=10)
    sample = collector.sample_now()

    # Schema verification
    assert "timestamp" in sample
    assert "cpu" in sample
    assert "aggregate_percent" in sample["cpu"]
    assert "cores_percent" in sample["cpu"]
    assert "load_average" in sample["cpu"]

    assert "memory" in sample
    assert "total_bytes" in sample["memory"]
    assert "used_bytes" in sample["memory"]
    assert "percent" in sample["memory"]

    assert "disks" in sample
    assert isinstance(sample["disks"], list)

    assert "network" in sample
    assert "rx_bytes_sec" in sample["network"]
    assert "tx_bytes_sec" in sample["network"]

def test_metrics_ring_buffer_limit():
    collector = MetricsCollector(sample_interval=0.1, max_history_samples=5)
    for _ in range(10):
        collector.sample_now()

    history = collector.get_history()
    assert len(history) == 5, f"Expected 5 ring buffer samples, got {len(history)}"

def test_metrics_submillisecond_latency():
    collector = MetricsCollector(sample_interval=1.0, max_history_samples=60)
    collector.sample_now()

    # Measure latency of get_current()
    start = time.perf_counter()
    for _ in range(100):
        collector.get_current()
    duration = time.perf_counter() - start

    avg_ms = (duration / 100) * 1000
    assert avg_ms < 1.0, f"Average get_current latency was {avg_ms:.3f}ms, expected < 1ms"
