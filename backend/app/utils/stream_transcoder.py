"""
ARGUS RTSP Micro-Transcoder Daemon
On-demand FFmpeg stream converter from raw RTSP (tcp/udp) to HTML5-compatible HLS.
Includes auto-termination after idle timeout, process tracking, and strict Air-Gap enforcement.
"""

import asyncio
import logging
import os
import shutil
import subprocess
import time
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

# Base temporary directory for transcode chunks
TRANSCODE_BASE_DIR = "/Users/slava/Antigravity/tmp/transcode"


class RTSPStreamTranscoder:
    def __init__(self, idle_timeout: int = 60):
        self.idle_timeout = idle_timeout
        self.active_streams: Dict[str, Dict[str, Any]] = {}
        self._ensure_tmp_dir()

    def _ensure_tmp_dir(self):
        try:
            os.makedirs(TRANSCODE_BASE_DIR, exist_ok=True)
        except Exception as e:
            logger.error("Failed to create transcode directory: %s", e)

    def is_ffmpeg_available(self) -> bool:
        return shutil.which("ffmpeg") is not None

    def get_ffmpeg_path(self) -> Optional[str]:
        return shutil.which("ffmpeg")

    def get_stream_dir(self, camera_id: str) -> str:
        safe_id = "".join(c for c in camera_id if c.isalnum() or c in ("-", "_"))
        return os.path.join(TRANSCODE_BASE_DIR, safe_id)

    def get_playlist_path(self, camera_id: str) -> str:
        return os.path.join(self.get_stream_dir(camera_id), "live.m3u8")

    async def start_transcode(self, camera_id: str, rtsp_url: str) -> Dict[str, Any]:
        from backend.app.api.system import is_air_gap_enabled

        if is_air_gap_enabled():
            return {
                "success": False,
                "error": "Air-Gap Stealth Mode активен: внешние RTSP-сокеты заблокированы.",
                "air_gap_blocked": True,
            }

        ffmpeg_bin = self.get_ffmpeg_path()
        if not ffmpeg_bin:
            return {
                "success": False,
                "error": "FFmpeg не обнаружен в системе. Установите его через 'brew install ffmpeg'.",
                "installed": False,
            }

        # Check if already active and running
        if camera_id in self.active_streams:
            stream_info = self.active_streams[camera_id]
            proc = stream_info.get("process")
            if proc and proc.poll() is None:
                stream_info["last_activity"] = time.time()
                return {
                    "success": True,
                    "camera_id": camera_id,
                    "status": "RUNNING",
                    "hls_url": f"/api/cameras/transcode/hls/{camera_id}/live.m3u8",
                    "pid": proc.pid,
                    "uptime_sec": int(time.time() - stream_info["started_at"]),
                    "message": "Поток уже активен",
                }

        # Clean prior directory
        stream_dir = self.get_stream_dir(camera_id)
        if os.path.exists(stream_dir):
            shutil.rmtree(stream_dir, ignore_errors=True)
        os.makedirs(stream_dir, exist_ok=True)

        playlist_file = os.path.join(stream_dir, "live.m3u8")
        segment_pattern = os.path.join(stream_dir, "segment_%03d.ts")

        # Convert RTSP to HLS via FFmpeg
        cmd = [
            ffmpeg_bin,
            "-hide_banner",
            "-loglevel", "error",
            "-rtsp_transport", "tcp",
            "-i", rtsp_url,
            "-c:v", "libx264",
            "-preset", "ultrafast",
            "-tune", "zerolatency",
            "-c:a", "aac",
            "-b:a", "64k",
            "-f", "hls",
            "-hls_time", "2",
            "-hls_list_size", "4",
            "-hls_flags", "delete_segments+split_by_time",
            "-hls_segment_filename", segment_pattern,
            playlist_file,
        ]

        try:
            # Launch subprocess
            proc = subprocess.Popen(
                cmd,
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                start_new_session=True,
            )

            now = time.time()
            self.active_streams[camera_id] = {
                "camera_id": camera_id,
                "rtsp_url": rtsp_url,
                "process": proc,
                "started_at": now,
                "last_activity": now,
                "stream_dir": stream_dir,
                "playlist_path": playlist_file,
            }

            # Wait briefly for m3u8 generation (up to 2.5 seconds)
            for _ in range(25):
                if os.path.exists(playlist_file) and os.path.getsize(playlist_file) > 0:
                    break
                await asyncio.sleep(0.1)

            return {
                "success": True,
                "camera_id": camera_id,
                "status": "RUNNING" if os.path.exists(playlist_file) else "INITIALIZING",
                "hls_url": f"/api/cameras/transcode/hls/{camera_id}/live.m3u8",
                "pid": proc.pid,
                "message": "Микро-транскодер RTSP запущен",
            }
        except Exception as e:
            logger.error("Failed to start FFmpeg transcoder: %s", e)
            return {"success": False, "error": f"Ошибка запуска FFmpeg: {e!s}"}

    def stop_transcode(self, camera_id: str) -> Dict[str, Any]:
        if camera_id not in self.active_streams:
            return {"success": True, "message": "Поток не был запущен"}

        info = self.active_streams.pop(camera_id, None)
        if info:
            proc = info.get("process")
            if proc and proc.poll() is None:
                try:
                    proc.terminate()
                    proc.wait(timeout=2)
                except Exception:
                    try:
                        proc.kill()
                    except Exception:
                        pass

            stream_dir = info.get("stream_dir")
            if stream_dir and os.path.exists(stream_dir):
                shutil.rmtree(stream_dir, ignore_errors=True)

        return {"success": True, "camera_id": camera_id, "status": "STOPPED"}

    def touch(self, camera_id: str):
        if camera_id in self.active_streams:
            self.active_streams[camera_id]["last_activity"] = time.time()

    def get_status(self, camera_id: str) -> Dict[str, Any]:
        if camera_id not in self.active_streams:
            return {
                "success": True,
                "camera_id": camera_id,
                "active": False,
                "status": "IDLE",
                "ffmpeg_installed": self.is_ffmpeg_available(),
            }

        info = self.active_streams[camera_id]
        proc = info.get("process")
        is_alive = proc and proc.poll() is None
        now = time.time()

        # Check idle timeout
        if is_alive and (now - info["last_activity"] > self.idle_timeout):
            self.stop_transcode(camera_id)
            return {
                "success": True,
                "camera_id": camera_id,
                "active": False,
                "status": "STOPPED_IDLE",
                "ffmpeg_installed": self.is_ffmpeg_available(),
                "message": "Поток остановлен по таймауту неактивности (60 сек)",
            }

        playlist = info.get("playlist_path")
        ready = is_alive and os.path.exists(playlist) and os.path.getsize(playlist) > 0

        return {
            "success": True,
            "camera_id": camera_id,
            "active": is_alive,
            "status": "RUNNING" if ready else ("STARTING" if is_alive else "FAILED"),
            "pid": proc.pid if proc else None,
            "uptime_sec": int(now - info["started_at"]),
            "idle_sec": int(now - info["last_activity"]),
            "hls_url": f"/api/cameras/transcode/hls/{camera_id}/live.m3u8",
            "ffmpeg_installed": self.is_ffmpeg_available(),
        }

    def stop_all(self):
        cam_ids = list(self.active_streams.keys())
        for cid in cam_ids:
            self.stop_transcode(cid)


# Global singleton transcoder
GLOBAL_TRANSCODER = RTSPStreamTranscoder(idle_timeout=60)
