"""
ARGUS // Secure Memory Hygiene Module
Provides deterministic memory zeroing and core dump suppression for sensitive keys.
"""

import ctypes
import os
import platform

# Suppress core dumps on POSIX (macOS & Linux) to prevent forensic RAM recovery
if platform.system() in ("Darwin", "Linux"):
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_CORE, (0, 0))
    except Exception:
        pass


class SecureBuffer:
    """
    A mutable byte buffer that guarantees explicit memory wiping (zeroing)
    upon release or context exit using ctypes.memset.
    """

    def __init__(self, data: bytes | bytearray | str):
        if isinstance(data, str):
            data_bytes = data.encode("utf-8")
        elif isinstance(data, (bytes, bytearray)):
            data_bytes = bytes(data)
        else:
            raise TypeError("SecureBuffer requires bytes, bytearray, or str")

        self._length = len(data_bytes)
        self._buf = (ctypes.c_char * self._length).from_buffer_copy(data_bytes)
        self._wiped = False

    @property
    def length(self) -> int:
        return self._length

    def get_bytes(self) -> bytes:
        if self._wiped:
            raise ValueError("Access to wiped SecureBuffer is forbidden")
        return bytes(self._buf)

    def wipe(self):
        """Deterministically overwrites memory with zero bytes."""
        if not self._wiped and self._length > 0:
            ctypes.memset(ctypes.addressof(self._buf), 0, self._length)
            self._wiped = True

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.wipe()

    def __del__(self):
        try:
            self.wipe()
        except Exception:
            pass


def secure_zero(byte_data: bytearray | memoryview):
    """
    Zeroes out a mutable bytearray or memoryview in place.
    """
    if isinstance(byte_data, bytearray):
        for i in range(len(byte_data)):
            byte_data[i] = 0
    elif isinstance(byte_data, memoryview):
        if not byte_data.readonly:
            byte_data[:] = b"\x00" * len(byte_data)
