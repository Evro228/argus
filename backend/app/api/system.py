from fastapi import APIRouter
import shutil
import os
import platform
import subprocess

router = APIRouter()

TOOLS_MANIFEST = [
    {
        "id": "nmap",
        "name": "Nmap",
        "category": "Network",
        "description": "Сетевой сканер портов и аудит безопасности хостов",
        "brew": "brew install nmap",
        "doc": "https://nmap.org/"
    },
    {
        "id": "gitleaks",
        "name": "Gitleaks",
        "category": "Code Audit",
        "description": "Поиск случайно закоммиченных паролей и API-ключей в коде",
        "brew": "brew install gitleaks",
        "doc": "https://github.com/gitleaks/gitleaks"
    },
    {
        "id": "trufflehog",
        "name": "TruffleHog",
        "category": "Code Audit",
        "description": "Глубокий поиск утекших секретов с проверкой их валидности",
        "brew": "brew install trufflehog",
        "doc": "https://github.com/trufflesecurity/trufflehog"
    },
    {
        "id": "nuclei",
        "name": "Nuclei",
        "category": "Network / Web",
        "description": "Быстрый сканер веб-уязвимостей на базе YAML-шаблонов",
        "brew": "brew install nuclei",
        "doc": "https://github.com/projectdiscovery/nuclei"
    },
    {
        "id": "semgrep",
        "name": "Semgrep",
        "category": "Code Audit",
        "description": "Статический анализатор кода (SAST) на наличие уязвимостей",
        "brew": "brew install semgrep",
        "doc": "https://semgrep.dev/"
    },
    {
        "id": "trivy",
        "name": "Trivy",
        "category": "Containers",
        "description": "Сканер уязвимостей Docker-образов, репозиториев и конфигов",
        "brew": "brew install trivy",
        "doc": "https://trivy.dev/"
    },
    {
        "id": "docker",
        "name": "Docker",
        "category": "Containers",
        "description": "Среда контейнеризации для изолированного запуска сервисов",
        "brew": "brew install --cask docker",
        "doc": "https://www.docker.com/"
    },
    {
        "id": "ffmpeg",
        "name": "FFmpeg",
        "category": "Media",
        "description": "Движок обработки аудио и видео для медиа-криминалистики",
        "brew": "brew install ffmpeg",
        "doc": "https://ffmpeg.org/"
    }
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
                out = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=2)
                first_line = (out.stdout or out.stderr or "").strip().split("\n")[0]
                version = first_line[:40] if first_line else "Installed"
            except Exception:
                version = "Installed"
                
        tools_status.append({
            **item,
            "installed": is_installed,
            "path": path,
            "version": version
        })

    return {
        "os": f"{platform.system()} {platform.release()} ({platform.machine()})",
        "python": platform.python_version(),
        "total_tools": len(TOOLS_MANIFEST),
        "installed_tools": installed_count,
        "tools": tools_status
    }
