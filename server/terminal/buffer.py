"""
Ubuntu Server OS — Terminal Gateway I/O Buffer
Thread-safe circular ring buffer with truncation protections against stdout flooding.
"""

import threading


class CircularIOBuffer:
    """Fixed-capacity ring buffer capping memory usage at 256KB per terminal."""
    def __init__(self, max_bytes: int = 256 * 1024):
        self.max_bytes = max_bytes
        self._buffer = bytearray()
        self._lock = threading.Lock()

    def write(self, data: bytes) -> int:
        """Append data, discarding oldest bytes if capacity is exceeded."""
        if not data:
            return 0
        with self._lock:
            self._buffer.extend(data)
            if len(self._buffer) > self.max_bytes:
                # Drop excess from the beginning
                overflow = len(self._buffer) - self.max_bytes
                del self._buffer[:overflow]
            return len(data)

    def read(self, n: int = -1) -> bytes:
        """Read and drain bytes from the buffer."""
        with self._lock:
            if n < 0 or n >= len(self._buffer):
                data = bytes(self._buffer)
                self._buffer.clear()
                return data
            else:
                data = bytes(self._buffer[:n])
                del self._buffer[:n]
                return data

    def peek(self) -> bytes:
        """Non-destructive inspection of buffered content."""
        with self._lock:
            return bytes(self._buffer)

    def size(self) -> int:
        with self._lock:
            return len(self._buffer)
