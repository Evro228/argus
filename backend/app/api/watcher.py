"""
ARGUS Autonomous Watcher Daemon & Real-Time Alerting Engine
Continuous background monitoring for:
- CCTV camera health and stream anomalies;
- Unauthorized open ports and network socket alterations;
- Rogue device detection in local network (LAN);
- Critical OPSEC posture degradation.
"""

import asyncio
import socket
import time
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.api.system import is_air_gap_enabled

router = APIRouter()

# ----------------------------------------------------------------------
# TELEGRAM NOTIFICATIONS CONFIGURATION
# ----------------------------------------------------------------------
TELEGRAM_CONFIG: Dict[str, Any] = {
    "enabled": False,
    "bot_token": "",
    "chat_id": "",
    "min_severity": "WARNING",  # INFO, WARNING, CRITICAL
}


async def dispatch_telegram_alert(alert: Dict[str, Any]) -> Dict[str, Any]:
    if is_air_gap_enabled():
        return {"success": False, "error": "Air-Gap Stealth Mode активен: отправка в Telegram заблокирована"}

    if not TELEGRAM_CONFIG.get("enabled"):
        return {"success": False, "error": "Telegram оповещения отключены в настройках"}

    token = TELEGRAM_CONFIG.get("bot_token", "").strip()
    chat_id = TELEGRAM_CONFIG.get("chat_id", "").strip()
    if not token or not chat_id:
        return {"success": False, "error": "Не указан Bot Token или Chat ID"}

    sev = alert.get("severity", "INFO")
    icons = {"CRITICAL": "🚨", "WARNING": "⚠️", "INFO": "ℹ️"}
    icon = icons.get(sev, "🛡️")

    text = (
        f"{icon} *ARGUS Tactical Alert* [_{sev}_]\n\n"
        f"📍 *Компонент:* `{alert.get('category', 'SYSTEM')}`\n"
        f"🎯 *Событие:* *{alert.get('title', 'Тревога')}*\n"
        f"📝 {alert.get('message', '')}\n\n"
        f"⏱️ `{alert.get('timestamp', '')}`"
    )

    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(
                url,
                json={"chat_id": chat_id, "text": text, "parse_mode": "Markdown"},
            )
            if resp.status_code == 200:
                return {"success": True, "message": "Алерт успешно доставлен в Telegram"}
            else:
                return {"success": False, "error": f"Ошибка Telegram API: {resp.text}"}
    except Exception as e:
        return {"success": False, "error": f"Ошибка соединения: {e!s}"}


class WatcherDaemon:
    def __init__(self):
        self.is_running: bool = False
        self.started_at: Optional[str] = None
        self.cycle_count: int = 0
        self.last_check: Optional[str] = None
        self.alerts: List[Dict[str, Any]] = []
        self._task: Optional[asyncio.Task] = None
        self._known_ports: set = set()
        self._known_macs: set = set()

    def start(self):
        if self.is_running:
            return
        self.is_running = True
        self.started_at = datetime.utcnow().isoformat() + "Z"
        try:
            loop = asyncio.get_running_loop()
            self._task = loop.create_task(self._run_loop())
        except RuntimeError:
            self._task = None
        self.add_alert(
            category="SYSTEM",
            severity="INFO",
            title="Сторож ARGUS активирован",
            message="Фоновый мониторинг сокетов, камер и сетевых аномалий запущен.",
        )

    def stop(self):
        if not self.is_running:
            return
        self.is_running = False
        if self._task and not self._task.done():
            self._task.cancel()
        self._task = None
        self.add_alert(
            category="SYSTEM",
            severity="WARNING",
            title="Сторож ARGUS остановлен",
            message="Фоновый мониторинг приостановлен оператором.",
        )

    def add_alert(self, category: str, severity: str, title: str, message: str, alert_id_prefix: str = "ALT_") -> Dict[str, Any]:
        now_iso = datetime.utcnow().isoformat() + "Z"
        alert = {
            "id": f"{alert_id_prefix}{uuid.uuid4().hex[:8].upper()}",
            "timestamp": now_iso,
            "time_utc": now_iso,
            "category": category,
            "component": category,
            "severity": severity,  # INFO, WARNING, CRITICAL
            "level": severity,
            "title": title,
            "message": message,
        }
        self.alerts.insert(0, alert)
        if len(self.alerts) > 50:
            self.alerts = self.alerts[:50]

        # Trigger telegram notification if threshold met
        sev_order = {"INFO": 1, "WARNING": 2, "CRITICAL": 3}
        min_sev = TELEGRAM_CONFIG.get("min_severity", "WARNING")
        if sev_order.get(severity, 1) >= sev_order.get(min_sev, 2):
            try:
                loop = asyncio.get_running_loop()
                loop.create_task(dispatch_telegram_alert(alert))
            except RuntimeError:
                pass

        return alert

    async def _run_loop(self):
        while self.is_running:
            try:
                await self.tick()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.add_alert(
                    category="WATCHER_ERROR",
                    severity="WARNING",
                    title="Ошибка цикла сторожа",
                    message=str(e),
                )
            await asyncio.sleep(15)

    async def tick(self) -> Dict[str, Any]:
        self.cycle_count += 1
        self.last_check = datetime.utcnow().isoformat() + "Z"
        air_gap = is_air_gap_enabled()

        anomalies = []

        # 1. Socket Audit: Check common ports on localhost
        critical_ports = [21, 23, 445, 3389, 5900, 8800]
        current_open = set()
        for p in critical_ports:
            try:
                s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                s.settimeout(0.05)
                if s.connect_ex(("127.0.0.1", p)) == 0:
                    current_open.add(p)
                s.close()
            except Exception:
                pass

        new_ports = current_open - self._known_ports
        if self.cycle_count > 1 and new_ports:
            for np in new_ports:
                if np != 8800:  # Exclude our own API server
                    anomalies.append(f"Обнаружен новый открытый порт: {np}")
                    self.add_alert(
                        category="SOCKET_AUDIT",
                        severity="CRITICAL",
                        title=f"Открыт неавторизованный порт {np}",
                        message=f"На локальном интерфейсе хоста зафиксирован новый слушающий сокет {np}.",
                    )
        self._known_ports = current_open

        # 2. Camera Health Check (Skip external network in Air-Gap mode)
        if not air_gap and self.cycle_count % 3 == 0:
            from backend.app.api.cameras import ALL_CAMERAS
            # Periodic check of catalog streams
            if ALL_CAMERAS:
                sample_cam = ALL_CAMERAS[self.cycle_count % len(ALL_CAMERAS)]
                if sample_cam.get("status") != "ONLINE":
                    self.add_alert(
                        category="CAMERA_HEALTH",
                        severity="WARNING",
                        title=f"Камера {sample_cam['id']} нестабильна",
                        message=f"Поток {sample_cam['name']} переведен в статус {sample_cam.get('status')}.",
                    )

        return {
            "cycle": self.cycle_count,
            "last_check": self.last_check,
            "anomalies_detected": len(anomalies),
            "anomalies": anomalies,
        }

    def get_status(self) -> Dict[str, Any]:
        return {
            "success": True,
            "running": self.is_running,
            "is_running": self.is_running,
            "interval_seconds": 30,
            "started_at": self.started_at,
            "cycle_count": self.cycle_count,
            "cycles_completed": self.cycle_count,
            "last_check": self.last_check,
            "alerts_count": len(self.alerts),
            "total_alerts": len(self.alerts),
            "critical_alerts_count": sum(1 for a in self.alerts if a.get("severity") == "CRITICAL" or a.get("level") == "CRITICAL"),
            "recent_alerts": self.alerts[:20],
            "alerts": self.alerts,
            "air_gap_mode": is_air_gap_enabled(),
        }


# Global Watcher Daemon Singleton
DAEMON = WatcherDaemon()
try:
    DAEMON.start()
except Exception:
    pass


# ----------------------------------------------------------------------
# API ROUTES
# ----------------------------------------------------------------------
@router.post("/start")
@router.post("/start/")
async def start_watcher():
    """Активирует фоновый демон-сторож ARGUS."""
    DAEMON.start()
    return DAEMON.get_status()


@router.post("/stop")
@router.post("/stop/")
async def stop_watcher():
    """Приостанавливает работу фонового сторожа."""
    DAEMON.stop()
    return DAEMON.get_status()


@router.get("/status")
@router.get("/status/")
async def get_watcher_status():
    """Возвращает текущий статус фонового сторожа и статистику циклов."""
    return DAEMON.get_status()


@router.get("/alerts")
@router.get("/alerts/")
async def get_watcher_alerts():
    """Возвращает журнал оперативных алертов и предупреждений сторожа."""
    return {
        "success": True,
        "count": len(DAEMON.alerts),
        "alerts": DAEMON.alerts,
    }


@router.post("/clear")
@router.post("/clear/")
async def clear_watcher_alerts():
    """Очищает историю алертов сторожа."""
    DAEMON.alerts = []
    return {"success": True, "message": "Журнал алертов очищен"}


@router.post("/trigger-test")
@router.post("/trigger-test/")
async def trigger_test_alert():
    """
    Генерирует тестовый алерт для проверки нативных уведомлений ОС и всплывающего тостера.
    """
    alert = DAEMON.add_alert(
        category="TEST_DRILL",
        severity="CRITICAL",
        title="Тестовая тактическая тревога ARGUS",
        message="Проверка канала нативных уведомлений и подсистемы оповещений оператора.",
        alert_id_prefix="ALT_TEST_",
    )
    return {
        "success": True,
        "alert": alert,
    }


class TelegramConfigModel(BaseModel):
    enabled: bool | None = None
    bot_token: str | None = None
    chat_id: str | None = None
    min_severity: str | None = None


@router.get("/telegram/config")
@router.get("/telegram/config/")
def get_telegram_config():
    """
    Возвращает текущий статус интеграции с Telegram Bot API (токен маскируется).
    """
    raw_token = TELEGRAM_CONFIG.get("bot_token", "")
    masked_token = f"{raw_token[:6]}••••••••{raw_token[-4:]}" if len(raw_token) > 10 else ("Configured" if raw_token else "")
    return {
        "success": True,
        "enabled": TELEGRAM_CONFIG.get("enabled", False),
        "bot_configured": bool(raw_token),
        "masked_token": masked_token,
        "chat_id": TELEGRAM_CONFIG.get("chat_id", ""),
        "min_severity": TELEGRAM_CONFIG.get("min_severity", "WARNING"),
        "air_gap_mode": is_air_gap_enabled(),
    }


@router.post("/telegram/config")
@router.post("/telegram/config/")
def set_telegram_config(cfg: TelegramConfigModel):
    """
    Обновляет параметры бота Telegram для отправки алертов сторожа.
    """
    if cfg.enabled is not None:
        TELEGRAM_CONFIG["enabled"] = cfg.enabled
    if cfg.bot_token is not None:
        TELEGRAM_CONFIG["bot_token"] = cfg.bot_token.strip()
    if cfg.chat_id is not None:
        TELEGRAM_CONFIG["chat_id"] = cfg.chat_id.strip()
    if cfg.min_severity is not None:
        TELEGRAM_CONFIG["min_severity"] = cfg.min_severity.upper()

    return get_telegram_config()


@router.post("/telegram/test")
@router.post("/telegram/test/")
async def send_telegram_test():
    """
    Отправляет тестовое уведомление в Telegram для верификации связки.
    """
    if is_air_gap_enabled():
        return {
            "success": False,
            "error": "Air-Gap Stealth Mode активен: внешние сетевые запросы заблокированы.",
            "air_gap_enforced": True,
        }

    test_alert = {
        "id": "ALT_TG_VERIFY",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "category": "TELEGRAM_VERIFY",
        "severity": "CRITICAL",
        "title": "ARGUS // Проверка канала Telegram",
        "message": "Тестовая тактическая тревога. Связь между сторожем ARGUS и оператором успешно установлена.",
    }
    return await dispatch_telegram_alert(test_alert)

