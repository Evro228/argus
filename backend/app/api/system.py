import json
import logging
import os
import platform
import secrets
import shutil
import stat
import subprocess
from datetime import datetime, timezone
from pydantic import BaseModel

from fastapi import APIRouter
from backend.app.utils.crypto_vault import encrypt_vault_payload, decrypt_vault_payload

logger = logging.getLogger(__name__)
router = APIRouter()


# Global Air-Gapped State
AIR_GAP_STATE = {
    "enabled": False,
    "mode": "ONLINE",
    "updated_at": None,
}


def is_air_gap_enabled() -> bool:
    return AIR_GAP_STATE["enabled"]


class AirGapToggleRequest(BaseModel):
    enabled: bool | None = None


class VaultEncryptRequest(BaseModel):
    data: dict | str
    passphrase: str


class VaultDecryptRequest(BaseModel):
    envelope: dict
    passphrase: str

TOOLS_MANIFEST = [
    {
        "id": "nmap",
        "name": "Nmap",
        "category": "Network",
        "description": "Сетевой сканер портов и аудит безопасности хостов",
        "brew": "brew install nmap",
        "doc": "https://nmap.org/",
    },
    {
        "id": "gitleaks",
        "name": "Gitleaks",
        "category": "Code Audit",
        "description": "Поиск случайно закоммиченных паролей и API-ключей в коде",
        "brew": "brew install gitleaks",
        "doc": "https://github.com/gitleaks/gitleaks",
    },
    {
        "id": "trufflehog",
        "name": "TruffleHog",
        "category": "Code Audit",
        "description": "Глубокий поиск утекших секретов с проверкой их валидности",
        "brew": "brew install trufflehog",
        "doc": "https://github.com/trufflesecurity/trufflehog",
    },
    {
        "id": "nuclei",
        "name": "Nuclei",
        "category": "Network / Web",
        "description": "Быстрый сканер веб-уязвимостей на базе YAML-шаблонов",
        "brew": "brew install nuclei",
        "doc": "https://github.com/projectdiscovery/nuclei",
    },
    {
        "id": "semgrep",
        "name": "Semgrep",
        "category": "Code Audit",
        "description": "Статический анализатор кода (SAST) на наличие уязвимостей",
        "brew": "brew install semgrep",
        "doc": "https://semgrep.dev/",
    },
    {
        "id": "trivy",
        "name": "Trivy",
        "category": "Containers",
        "description": "Сканер уязвимостей Docker-образов, репозиториев и конфигов",
        "brew": "brew install trivy",
        "doc": "https://trivy.dev/",
    },
    {
        "id": "docker",
        "name": "Docker",
        "category": "Containers",
        "description": "Среда контейнеризации для изолированного запуска сервисов",
        "brew": "brew install --cask docker",
        "doc": "https://www.docker.com/",
    },
    {
        "id": "ffmpeg",
        "name": "FFmpeg",
        "category": "Media",
        "description": "Движок обработки аудио и видео для медиа-криминалистики",
        "brew": "brew install ffmpeg",
        "doc": "https://ffmpeg.org/",
    },
]


@router.get("/status")
def get_system_status():
    tools_status = []
    installed_count = 0

    for item in TOOLS_MANIFEST:
        path = shutil.which(item["id"])
        is_installed = path is not None
        version = None
        if is_installed:
            installed_count += 1
            try:
                out = subprocess.run(
                    [path, "--version"], capture_output=True, text=True, timeout=2
                )
                first_line = (out.stdout or out.stderr or "").strip().split("\n")[0]
                version = first_line[:40] if first_line else "Installed"
            except Exception:
                version = "Installed"

        tools_status.append(
            {**item, "installed": is_installed, "path": path, "version": version}
        )

    return {
        "success": True,
        "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "python": platform.python_version(),
        "total_tools": len(TOOLS_MANIFEST),
        "installed_tools": installed_count,
        "tools": tools_status,
    }


# Air-Gapped Stealth Mode Controller
@router.get("/airgap")
@router.get("/stealth/status")
def get_airgap_status():
    return {
        "success": True,
        "enabled": AIR_GAP_STATE["enabled"],
        "mode": AIR_GAP_STATE["mode"],
        "status": "STEALTH" if AIR_GAP_STATE["enabled"] else "ONLINE",
        "notice": (
            "Режим строгой изоляции АКТИВЕН. Внешние сетевые сокеты заблокированы."
            if AIR_GAP_STATE["enabled"]
            else "Стандартный режим: разрешены внешние запросы телеметрии."
        ),
    }


@router.post("/airgap/toggle")
def toggle_airgap(req: AirGapToggleRequest | None = None):
    import time
    if req and req.enabled is not None:
        AIR_GAP_STATE["enabled"] = req.enabled
    else:
        AIR_GAP_STATE["enabled"] = not AIR_GAP_STATE["enabled"]

    AIR_GAP_STATE["mode"] = "STEALTH" if AIR_GAP_STATE["enabled"] else "ONLINE"
    AIR_GAP_STATE["updated_at"] = time.time()

    return {
        "success": True,
        "enabled": AIR_GAP_STATE["enabled"],
        "mode": AIR_GAP_STATE["mode"],
        "status": "STEALTH" if AIR_GAP_STATE["enabled"] else "ONLINE",
    }


# Encrypted Vault Storage (AES-256-GCM)
@router.post("/vault/encrypt")
def vault_encrypt(req: VaultEncryptRequest):
    if not req.passphrase or len(req.passphrase) < 8:
        return {"success": False, "error": "Пароль сейфа должен содержать минимум 8 символов."}
    try:
        envelope = encrypt_vault_payload(req.data, req.passphrase)
        return {"success": True, "envelope": envelope}
    except Exception as e:
        return {"success": False, "error": f"Ошибка шифрования: {e!s}"}


@router.post("/vault/decrypt")
def vault_decrypt(req: VaultDecryptRequest):
    try:
        decrypted_bytes = decrypt_vault_payload(req.envelope, req.passphrase)
        # Try decoding as JSON or string
        try:
            payload = json.loads(decrypted_bytes.decode("utf-8"))
        except Exception:
            payload = decrypted_bytes.decode("utf-8", errors="replace")
        return {"success": True, "payload": payload}
    except ValueError as e:
        return {"success": False, "error": str(e)}
    except Exception as e:
        return {"success": False, "error": f"Ошибка расшифровки: {e!s}"}


# System Hardening & Compliance Matrix
@router.get("/hardening")
def get_hardening_audit():
    os_name = platform.system()
    checks = []

    if os_name == "Darwin":
        # 1. FileVault (Disk Encryption)
        fdesetup_path = shutil.which("fdesetup") or "/usr/bin/fdesetup"
        try:
            out = subprocess.run(
                [fdesetup_path, "status"], capture_output=True, text=True, timeout=2
            )
            status_str = (out.stdout or "").strip()
            is_on = "FileVault is On" in status_str
            checks.append(
                {
                    "id": "filevault",
                    "name": "FileVault (Аппаратное шифрование диска)",
                    "status": "PASS" if is_on else "WARN",
                    "detail": status_str,
                    "remediation": "Включите FileVault в Системных настройках -> Конфиденциальность и безопасность -> FileVault.",
                }
            )
        except Exception as e:
            logger.debug("FileVault check failed: %s", e)
            checks.append(
                {
                    "id": "filevault",
                    "name": "FileVault (Шифрование диска)",
                    "status": "CHECK_REQUIRED",
                    "detail": "Не удалось выполнить проверку (сбой системного вызова)",
                    "remediation": "Проверьте статус FileVault в настройках macOS.",
                }
            )

        # 2. Gatekeeper (Защита от запуска неподписанного софта)
        spctl_path = shutil.which("spctl") or "/usr/sbin/spctl"
        try:
            out = subprocess.run(
                [spctl_path, "--status"], capture_output=True, text=True, timeout=2
            )
            status_str = (out.stdout or "").strip()
            is_active = "assessments enabled" in status_str
            checks.append(
                {
                    "id": "gatekeeper",
                    "name": "Apple Gatekeeper (Контроль подписей приложений)",
                    "status": "PASS" if is_active else "CRITICAL",
                    "detail": status_str,
                    "remediation": "Включите Gatekeeper командой: sudo spctl --master-enable",
                }
            )
        except Exception as e:
            logger.debug("Gatekeeper check failed: %s", e)
            checks.append(
                {
                    "id": "gatekeeper",
                    "name": "Apple Gatekeeper (Контроль подписей приложений)",
                    "status": "CHECK_REQUIRED",
                    "detail": "Не удалось выполнить проверку (сбой системного вызова)",
                    "remediation": "Проверьте статус Gatekeeper в терминале: spctl --status",
                }
            )

        # 3. System Integrity Protection (SIP)
        csrutil_path = shutil.which("csrutil") or "/usr/bin/csrutil"
        try:
            out = subprocess.run(
                [csrutil_path, "status"], capture_output=True, text=True, timeout=2
            )
            status_str = (out.stdout or "").strip()
            is_enabled = "enabled" in status_str
            checks.append(
                {
                    "id": "sip",
                    "name": "System Integrity Protection (SIP)",
                    "status": "PASS" if is_enabled else "WARN",
                    "detail": status_str,
                    "remediation": "SIP защищает системные папки от руткитов. Рекомендуется держать включенным.",
                }
            )
        except Exception as e:
            logger.debug("SIP check failed: %s", e)
            checks.append(
                {
                    "id": "sip",
                    "name": "System Integrity Protection (SIP)",
                    "status": "CHECK_REQUIRED",
                    "detail": "Не удалось выполнить проверку (сбой системного вызова)",
                    "remediation": "Проверьте статус SIP в терминале: csrutil status",
                }
            )

        # 4. macOS Application Firewall
        socketfilterfw = "/usr/libexec/ApplicationFirewall/socketfilterfw"
        if os.path.exists(socketfilterfw):
            try:
                out = subprocess.run(
                    [socketfilterfw, "--getglobalstate"], capture_output=True, text=True, timeout=2
                )
                fw_str = (out.stdout or "").strip()
                fw_enabled = "enabled" in fw_str.lower()
                checks.append(
                    {
                        "id": "macos_firewall",
                        "name": "macOS Application Firewall (Брандмауэр)",
                        "status": "PASS" if fw_enabled else "WARN",
                        "detail": fw_str,
                        "remediation": "Включите брандмауэр в Настройки -> Сеть -> Брандмауэр.",
                    }
                )
            except Exception as e:
                logger.debug("Firewall check failed: %s", e)

    elif os_name == "Windows":
        # Windows host hardening
        ps_bin = shutil.which("powershell") or "C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe"
        try:
            out = subprocess.run(
                [ps_bin, "-NoProfile", "-Command", "Get-BitLockerVolume -MountPoint C: | Select-Object -ExpandProperty ProtectionStatus"],
                capture_output=True, text=True, timeout=3
            )
            bitlocker_status = (out.stdout or "").strip()
            is_on = bitlocker_status == "1" or "on" in bitlocker_status.lower()
            checks.append({
                "id": "bitlocker",
                "name": "BitLocker Drive Encryption (C:)",
                "status": "PASS" if is_on else "WARN",
                "detail": f"ProtectionStatus: {bitlocker_status or 'N/A'}",
                "remediation": "Включите шифрование диска BitLocker в панели управления Windows.",
            })
        except Exception as e:
            logger.debug("BitLocker check failed: %s", e)
            checks.append({
                "id": "bitlocker",
                "name": "BitLocker Drive Encryption",
                "status": "CHECK_REQUIRED",
                "detail": "Не удалось выполнить проверку (сбой системного вызова)",
                "remediation": "Проверьте состояние BitLocker через `manage-bde -status`.",
            })

        try:
            out = subprocess.run(
                [ps_bin, "-NoProfile", "-Command", "Get-MpComputerStatus | Select-Object -ExpandProperty RealTimeProtectionEnabled"],
                capture_output=True, text=True, timeout=3
            )
            rtp = (out.stdout or "").strip().lower()
            is_active = rtp == "true"
            checks.append({
                "id": "defender",
                "name": "Microsoft Defender (Real-Time Protection)",
                "status": "PASS" if is_active else "CRITICAL",
                "detail": f"RealTimeProtectionEnabled: {rtp}",
                "remediation": "Активируйте защиту в режиме реального времени в Центре безопасности Windows.",
            })
        except Exception as e:
            logger.debug("Defender check failed: %s", e)
            checks.append({
                "id": "defender",
                "name": "Microsoft Defender",
                "status": "CHECK_REQUIRED",
                "detail": "Не удалось выполнить проверку (сбой системного вызова)",
                "remediation": "Проверьте службу Defender в службах Windows.",
            })

        # 3. User Account Control (UAC)
        try:
            out = subprocess.run(
                ["reg", "query", r"HKLM\SOFTWARE\Microsoft\Windows\CurrentVersion\Policies\System", "/v", "EnableLUA"],
                capture_output=True, text=True, timeout=2
            )
            uac_on = "0x1" in (out.stdout or "")
            checks.append({
                "id": "uac",
                "name": "User Account Control (UAC)",
                "status": "PASS" if uac_on else "WARN",
                "detail": "EnableLUA: 0x1 (Active)" if uac_on else "EnableLUA: Inactive or Modified",
                "remediation": "Включите максимальный уровень защиты UAC в настройках учетных записей Windows.",
            })
        except Exception as e:
            logger.debug("UAC check failed: %s", e)

        # 4. Windows Firewall Profiles
        try:
            out = subprocess.run(
                ["netsh", "advfirewall", "show", "allprofiles"],
                capture_output=True, text=True, timeout=2
            )
            fw_text = (out.stdout or "").lower()
            fw_on = "state" in fw_text and "on" in fw_text
            checks.append({
                "id": "win_firewall",
                "name": "Windows Defender Firewall",
                "status": "PASS" if fw_on else "WARN",
                "detail": "All Profiles Active" if fw_on else "One or more profiles disabled",
                "remediation": "Включите брандмауэр для всех профилей: netsh advfirewall set allprofiles state on",
            })
        except Exception as e:
            logger.debug("WinFirewall check failed: %s", e)

    else:
        # Linux host hardening checks
        # 1. LUKS Encryption
        is_luks = os.path.exists("/dev/mapper") and any("luks" in f.lower() or "crypt" in f.lower() for f in os.listdir("/dev/mapper") if os.path.isfile(f) or os.path.islink(f) or os.path.isdir(f))
        checks.append({
            "id": "luks",
            "name": "LUKS Full Disk Encryption (/dev/mapper)",
            "status": "PASS" if is_luks else "WARN",
            "detail": "Encrypted block device active" if is_luks else "No cryptsetup LUKS mapping found",
            "remediation": "Настройте полнодисковое шифрование LUKS при установке системы.",
        })

        # 2. Mandatory Access Control (AppArmor / SELinux)
        apparmor_bin = shutil.which("apparmor_status")
        selinux_bin = shutil.which("getenforce")
        mac_status = "NONE"
        if apparmor_bin:
            try:
                out = subprocess.run([apparmor_bin, "--enabled"], capture_output=True, timeout=2)
                if out.returncode == 0:
                    mac_status = "AppArmor Enforcing"
            except Exception as e:
                logger.debug("AppArmor check error: %s", e)
        elif selinux_bin:
            try:
                out = subprocess.run([selinux_bin], capture_output=True, text=True, timeout=2)
                mac_status = f"SELinux: {(out.stdout or '').strip()}"
            except Exception as e:
                logger.debug("SELinux check error: %s", e)

        checks.append({
            "id": "mac_lsm",
            "name": "Linux Mandatory Access Control (AppArmor / SELinux)",
            "status": "PASS" if mac_status != "NONE" else "WARN",
            "detail": mac_status,
            "remediation": "Включите модуль безопасности AppArmor или SELinux в ядре.",
        })

        # 3. Linux Firewall (UFW / iptables / nftables)
        ufw_bin = shutil.which("ufw")
        is_ufw_active = False
        if ufw_bin:
            try:
                out = subprocess.run([ufw_bin, "status"], capture_output=True, text=True, timeout=2)
                is_ufw_active = "active" in (out.stdout or "").lower()
            except Exception as e:
                logger.debug("UFW check error: %s", e)
        checks.append({
            "id": "linux_firewall",
            "name": "Linux Firewall (UFW / Netfilter)",
            "status": "PASS" if is_ufw_active else "WARN",
            "detail": "UFW Active" if is_ufw_active else "UFW Inactive or not installed",
            "remediation": "Включите фаервол: sudo ufw enable",
        })

        # 4. Kernel ASLR Hardening
        aslr_active = False
        if os.path.exists("/proc/sys/kernel/randomize_va_space"):
            try:
                with open("/proc/sys/kernel/randomize_va_space", "r") as f:
                    val = f.read().strip()
                    aslr_active = val in ("1", "2")
            except Exception:
                pass
        checks.append({
            "id": "kernel_aslr",
            "name": "Kernel ASLR (Address Space Layout Randomization)",
            "status": "PASS" if aslr_active else "WARN",
            "detail": "Full ASLR (randomize_va_space=2)" if aslr_active else "ASLR Inactive or non-Linux host",
            "remediation": "Включите ASLR: sysctl -w kernel.randomize_va_space=2",
        })

        # 5. SSH Root Login Hardening
        ssh_root_blocked = False
        sshd_config = "/etc/ssh/sshd_config"
        if os.path.exists(sshd_config):
            try:
                with open(sshd_config, "r", errors="ignore") as f:
                    cfg = f.read().lower()
                    if "permitrootlogin no" in cfg or "permitrootlogin prohibit-password" in cfg:
                        ssh_root_blocked = True
            except Exception:
                pass
        checks.append({
            "id": "ssh_root",
            "name": "SSH Daemon Hardening (Root Login Blocked)",
            "status": "PASS" if ssh_root_blocked else "WARN",
            "detail": "PermitRootLogin Restricted" if ssh_root_blocked else "Check /etc/ssh/sshd_config",
            "remediation": "Установите 'PermitRootLogin no' в /etc/ssh/sshd_config и перезапустите sshd.",
        })

    # Calculate overall hardening score
    passed = sum(1 for c in checks if c["status"] == "PASS")
    score = round((passed / len(checks)) * 100) if checks else 100

    return {
        "success": True,
        "os": os_name,
        "hardening_score": score,
        "total_checks": len(checks),
        "passed_checks": passed,
        "checks": checks,
    }



# Knowledge & CheatSheet Hub
KNOWLEDGE_CATALOG = [
    {
        "id": "payloads_all_the_things",
        "title": "PayloadsAllTheThings",
        "category": "Веб-аудит & Безопасность",
        "stars": "79.8k★",
        "url": "https://github.com/swisskyrepo/PayloadsAllTheThings",
        "desc": "Всемирная коллекция шпаргалок по безопасности веб-приложений, обходам WAF и методологиям тестирования.",
    },
    {
        "id": "hacktricks",
        "title": "HackTricks Wiki",
        "category": "Энциклопедия",
        "stars": "12k★",
        "url": "https://book.hacktricks.xyz/",
        "desc": "Детальнейшая база знаний по повышению привилегий в Linux/Windows, облачной безопасности и сетевым протоколам.",
    },
    {
        "id": "seclists",
        "title": "SecLists (Daniel Miessler)",
        "category": "Словари & Паттерны",
        "stars": "73k★",
        "url": "https://github.com/danielmiessler/SecLists",
        "desc": "Главная коллекция словарей безопасности: фаззинг URL, дефолтные учетные записи, чувствительные пути файлов.",
    },
    {
        "id": "owasp_cheatsheets",
        "title": "OWASP CheatSheetSeries",
        "category": "Безопасная разработка",
        "stars": "27k★",
        "url": "https://cheatsheetseries.owasp.org/",
        "desc": "Официальные шпаргалки OWASP по защите API, криптографии, аутентификации и сессиям.",
    },
    {
        "id": "awesome_privacy",
        "title": "Awesome Privacy Directory",
        "category": "Приватность & Софт",
        "stars": "18k★",
        "url": "https://github.com/pluja/awesome-privacy",
        "desc": "Курируемый реестр открытых альтернатив коммерческим сервисам без слежки и утечек данных.",
    },
]


@router.get("/knowledge")
def get_knowledge_hub():
    return {
        "success": True,
        "count": len(KNOWLEDGE_CATALOG),
        "items": KNOWLEDGE_CATALOG,
    }


# Security Tactics & Playbooks Hub
DEFAULT_SKILLS_PATH = os.path.expanduser(
    "~/Antigravity/Skills/Anthropic-Cybersecurity-Skills"
)
if not os.path.exists(DEFAULT_SKILLS_PATH):
    rel_path = os.path.abspath(
        os.path.join(
            os.path.dirname(__file__),
            "../../../../../Skills/Anthropic-Cybersecurity-Skills",
        )
    )
    if os.path.exists(rel_path):
        DEFAULT_SKILLS_PATH = rel_path

SKILLS_PATH = os.environ.get("ARGUS_SKILLS_PATH", DEFAULT_SKILLS_PATH)

_skills_cache = None


def _load_skills():
    global _skills_cache
    if _skills_cache is not None:
        return _skills_cache
    index_file = os.path.join(SKILLS_PATH, "index.json")
    if os.path.exists(index_file):
        try:
            with open(index_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                _skills_cache = data.get("skills", [])
                return _skills_cache
        except Exception as e:
            logger.warning("Не удалось прочитать индекс скиллов: %s", e)
    return []


CATEGORY_KEYWORDS = {
    "cloud": ["cloud", "aws", "azure", "gcp", "s3", "iam", "kubernetes", "k8s", "container"],
    "malware": ["malware", "reverse", "yara", "ghidra", "decompile", "ransomware", "trojan", "pe", "elf", "payload"],
    "forensics": ["forensic", "memory", "volatility", "wireshark", "pcap", "disk", "evtx", "dump", "mft", "kape"],
    "hunting": ["hunt", "siem", "splunk", "elastic", "sigma", "detection", "suricata", "zeek", "edr", "incident"],
    "zero-trust": ["zero trust", "iam", "auth", "token", "jwt", "saml", "pam", "rbac", "passkey", "credential", "mfa"],
    "web": ["web", "xss", "sqli", "csrf", "ssrf", "api", "burp", "owasp", "http", "oauth", "cors", "injection"],
}


@router.get("/skills")
def get_argus_skills(q: str = None, category: str = None, limit: int = 100):
    all_skills = _load_skills()
    filtered = all_skills

    # Category filter
    if category and category.lower() != "all":
        cat_key = category.lower().strip()
        keywords = CATEGORY_KEYWORDS.get(cat_key, [cat_key])
        filtered = [
            s
            for s in filtered
            if any(
                kw in s.get("name", "").lower() or kw in s.get("description", "").lower()
                for kw in keywords
            )
        ]

    # Text query filter
    if q and q.strip():
        query_lower = q.lower().strip()
        filtered = [
            s
            for s in filtered
            if query_lower in s.get("name", "").lower()
            or query_lower in s.get("description", "").lower()
        ]

    effective_limit = min(max(limit, 1), 1000)
    result_slice = filtered[:effective_limit]

    return {
        "success": True,
        "total": len(all_skills),
        "matched": len(filtered),
        "count": len(result_slice),
        "skills": result_slice,
    }



@router.get("/skills/{skill_name}")
def get_skill_detail(skill_name: str):
    clean_name = os.path.basename(skill_name).strip()
    import re
    if not clean_name or not re.fullmatch(r"[a-zA-Z0-9_\-\.]{1,128}", clean_name):
        return {"success": False, "error": "Некорректный синтаксис имени навыка."}

    skills_base = os.path.realpath(os.path.join(SKILLS_PATH, "skills"))
    skill_file = os.path.realpath(os.path.join(skills_base, clean_name, "SKILL.md"))

    try:
        if os.path.commonpath([skill_file, skills_base]) != skills_base:
            return {"success": False, "error": "Доступ запрещен политикой безопасности."}
    except (ValueError, Exception):
        return {"success": False, "error": "Доступ запрещен политикой безопасности."}

    if not os.path.exists(skill_file) or not os.path.isfile(skill_file):
        return {"success": False, "error": f"Skill '{clean_name}' not found"}
    try:
        with open(skill_file, "r", encoding="utf-8") as f:
            content = f.read(500_000)
        return {"success": True, "name": clean_name, "content": content}
    except Exception:
        return {"success": False, "error": "Не удалось прочитать содержимое навыка."}


# Session History Persistence
HISTORY_FILE = os.path.expanduser("~/.argus_session_history.json")


def _read_history():
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.warning("Не удалось прочитать историю сессий: %s", e)
        return []


def _write_history(entries):
    try:
        flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
        mode = stat.S_IRUSR | stat.S_IWUSR
        with os.fdopen(os.open(HISTORY_FILE, flags, mode), "w", encoding="utf-8") as f:
            json.dump(entries[:100], f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning("Не удалось сохранить историю сессий: %s", e)


class HistoryEntry(BaseModel):
    station: str
    target: str | None = None
    summary: str
    score: int | None = None
    status: str = "COMPLETED"


@router.get("/history")
def get_session_history():
    entries = _read_history()
    return {
        "success": True,
        "count": len(entries),
        "history": entries,
    }


@router.post("/history/save")
def save_session_history_entry(entry: HistoryEntry):
    record = {
        "id": secrets.token_hex(6),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "station": entry.station,
        "target": entry.target,
        "summary": entry.summary,
        "score": entry.score,
        "status": entry.status,
    }
    entries = _read_history()
    entries.insert(0, record)
    _write_history(entries)
    return {"success": True, "entry": record}

