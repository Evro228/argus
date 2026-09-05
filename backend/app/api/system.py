import json
import os
import platform
import shutil
import subprocess

from fastapi import APIRouter

router = APIRouter()

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
        "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "python": platform.python_version(),
        "total_tools": len(TOOLS_MANIFEST),
        "installed_tools": installed_count,
        "tools": tools_status,
    }


# --- System Hardening & Compliance Matrix ---
@router.get("/hardening")
def get_hardening_audit():
    checks = []

    # 1. FileVault (Disk Encryption)
    try:
        out = subprocess.run(
            ["fdesetup", "status"], capture_output=True, text=True, timeout=2
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
    except Exception:
        checks.append(
            {
                "id": "filevault",
                "name": "FileVault (Шифрование диска)",
                "status": "CHECK_REQUIRED",
                "detail": "Не удалось выполнить fdesetup автоматически",
                "remediation": "Проверьте статус FileVault в настройках macOS.",
            }
        )

    # 2. Gatekeeper (Защита от запуска неподписанного софта)
    try:
        out = subprocess.run(
            ["spctl", "--status"], capture_output=True, text=True, timeout=2
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
    except Exception:
        pass

    # 3. System Integrity Protection (SIP)
    try:
        out = subprocess.run(
            ["csrutil", "status"], capture_output=True, text=True, timeout=2
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
    except Exception:
        pass

    # Calculate overall hardening score
    passed = sum(1 for c in checks if c["status"] == "PASS")
    score = round((passed / len(checks)) * 100) if checks else 100

    return {
        "success": True,
        "hardening_score": score,
        "total_checks": len(checks),
        "passed_checks": passed,
        "checks": checks,
    }


# --- Knowledge & CheatSheet Hub ---
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


# --- Security Tactics & Playbooks Hub (818 Playbooks) ---
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

SKILLS_PATH = os.environ.get("CYBERSEC_SKILLS_PATH", DEFAULT_SKILLS_PATH)

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
        except Exception:
            pass
    return []


@router.get("/skills")
def get_cybersec_skills(q: str = None, limit: int = 50):
    all_skills = _load_skills()
    if not q:
        filtered = all_skills[:limit]
    else:
        query_lower = q.lower()
        filtered = [
            s
            for s in all_skills
            if query_lower in s.get("name", "").lower()
            or query_lower in s.get("description", "").lower()
        ][:limit]

    return {
        "success": True,
        "total": len(all_skills),
        "count": len(filtered),
        "skills": filtered,
    }


@router.get("/skills/{skill_name}")
def get_skill_detail(skill_name: str):
    clean_name = os.path.basename(skill_name)
    skill_file = os.path.join(SKILLS_PATH, "skills", clean_name, "SKILL.md")
    if not os.path.exists(skill_file):
        return {"success": False, "error": f"Skill '{clean_name}' not found"}
    try:
        with open(skill_file, "r", encoding="utf-8") as f:
            content = f.read()
        return {"success": True, "name": clean_name, "content": content}
    except Exception as e:
        return {"success": False, "error": str(e)}
