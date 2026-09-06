import os
import re
from typing import Any

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel

router = APIRouter()

SECRET_PATTERNS = [
    {
        "id": "openai_api_key",
        "name": "OpenAI API Key",
        "severity": "CRITICAL",
        "regex": r"sk-[a-zA-Z0-9]{20,T3BlbkFJ[a-zA-Z0-9]{20,}|sk-proj-[a-zA-Z0-9_-]{40,}",
        "remediation": "Немедленно отзовите ключ в личном кабинете OpenAI Platform.",
    },
    {
        "id": "github_token",
        "name": "GitHub Personal Access Token",
        "severity": "CRITICAL",
        "regex": r"ghp_[0-9a-zA-Z]{36}|github_pat_[0-9a-zA-Z_]{82}",
        "remediation": "Перейдите в Settings -> Developer settings -> Personal access tokens и отзовите скомпрометированный токен.",
    },
    {
        "id": "aws_access_key",
        "name": "AWS Access Key ID",
        "severity": "HIGH",
        "regex": r"(?:A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}",
        "remediation": "Деактивируйте ключ в консоли AWS IAM и проверьте CloudTrail на аномальную активность.",
    },
    {
        "id": "slack_webhook",
        "name": "Slack Incoming Webhook",
        "severity": "HIGH",
        "regex": r"https://hooks\.slack\.com/services/T[a-zA-Z0-9_]+/B[a-zA-Z0-9_]+/[a-zA-Z0-9_]+",
        "remediation": "Пересоздайте вебхук в панели Slack App Management.",
    },
    {
        "id": "private_key",
        "name": "Private Cryptographic Key",
        "severity": "CRITICAL",
        "regex": r"-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----",
        "remediation": "Приватный ключ скомпрометирован. Создайте новую ключевую пару и удалите старый публичный ключ с серверов.",
    },
    {
        "id": "database_url",
        "name": "Database Connection String with Credentials",
        "severity": "HIGH",
        "regex": r"(?:postgres|postgresql|mysql|mongodb|redis)://[a-zA-Z0-9_]+:[^@\s]+@[a-zA-Z0-9_.-]+:[0-9]+/[a-zA-Z0-9_]+",
        "remediation": "Смените пароль пользователя базы данных и вынесите строку подключения в защищенные переменные окружения.",
    },
    {
        "id": "jwt_token",
        "name": "JSON Web Token (Hardcoded)",
        "severity": "MEDIUM",
        "regex": r"eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}",
        "remediation": "Убедитесь, что токен не содержит бессрочные права и не зашит в клиентском коде.",
    },
]


class ScanPathRequest(BaseModel):
    path: str
    deep_scan: bool = True


def scan_text_content(content: str, filename: str) -> list[dict[str, Any]]:
    findings = []
    lines = content.split("\n")
    for line_num, line in enumerate(lines, 1):
        for pattern in SECRET_PATTERNS:
            matches = re.finditer(pattern["regex"], line)
            for m in matches:
                secret_snippet = m.group(0)
                # Mask the middle of the secret for safe display
                if len(secret_snippet) > 8:
                    masked = (
                        secret_snippet[:4]
                        + "*" * (len(secret_snippet) - 8)
                        + secret_snippet[-4:]
                    )
                else:
                    masked = "****"

                findings.append(
                    {
                        "type": pattern["name"],
                        "severity": pattern["severity"],
                        "file": filename,
                        "line": line_num,
                        "masked_secret": masked,
                        "context": line.strip()[:150],
                        "remediation": pattern["remediation"],
                    }
                )
    return findings


@router.post("/scan/path")
def scan_directory_path(req: ScanPathRequest):
    raw_path = req.path.strip()
    if not raw_path:
        return {"success": False, "error": "Путь не может быть пустым."}

    # Resolve symlinks and normalize path
    target_path = os.path.realpath(os.path.expanduser(raw_path))

    if not os.path.exists(target_path):
        return {
            "success": False,
            "error": f"Путь '{target_path}' не существует на диске.",
        }

    # Security: block system root directories and credential vaults
    blocked_prefixes = (
        "/etc", "/proc", "/sys", "/dev", "/root", "/var", "/private",
        "/bin", "/sbin", "/usr/bin", "/usr/sbin", "/System", "/Library"
    )
    blocked_dir_names = {".ssh", ".gnupg", ".aws", ".azure", ".config/gcloud"}

    for prefix in blocked_prefixes:
        if target_path == prefix or target_path.startswith(prefix + "/"):
            return {
                "success": False,
                "error": f"Доступ к системной директории '{prefix}' заблокирован политикой безопасности.",
            }

    path_parts = set(os.path.normpath(target_path).split(os.sep))
    if any(b in path_parts for b in blocked_dir_names):
        return {
            "success": False,
            "error": "Сканирование конфиденциальных директорий учетных данных (.ssh, .aws, .gnupg) запрещено.",
        }

    all_findings = []
    files_scanned = 0

    # Ignore big/irrelevant directories
    ignored_dirs = {
        ".git",
        "node_modules",
        ".venv",
        "venv",
        "__pycache__",
        "build",
        "dist",
        ".cache",
    }

    if os.path.isfile(target_path):
        files_to_scan = [target_path]
    else:
        files_to_scan = []
        for root, dirs, files in os.walk(target_path):
            dirs[:] = [d for d in dirs if d not in ignored_dirs]
            for file in files:
                # Limit extensions to text / code / configs
                if file.endswith(
                    (
                        ".py",
                        ".js",
                        ".ts",
                        ".jsx",
                        ".tsx",
                        ".json",
                        ".env",
                        ".yaml",
                        ".yml",
                        ".xml",
                        ".txt",
                        ".sh",
                        ".conf",
                        ".md",
                        ".sql",
                    )
                ):
                    files_to_scan.append(os.path.join(root, file))
                    if len(files_to_scan) >= 500:  # Safety threshold
                        break

    for fpath in files_to_scan:
        try:
            real_fpath = os.path.realpath(fpath)
            if not os.path.isfile(real_fpath):
                continue

            # Ensure resolved path does not traverse into blocked prefixes
            if any(real_fpath == p or real_fpath.startswith(p + "/") for p in blocked_prefixes):
                continue

            # Ensure resolved path does not contain blocked credential folders
            real_parts = set(os.path.normpath(real_fpath).split(os.sep))
            if any(b in real_parts for b in blocked_dir_names):
                continue

            with open(real_fpath, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read(500000)  # Read up to 500KB per file
                rel_path = (
                    os.path.relpath(fpath, target_path)
                    if os.path.isdir(target_path)
                    else os.path.basename(fpath)
                )
                findings = scan_text_content(content, rel_path)
                all_findings.extend(findings)
                files_scanned += 1
        except Exception:
            continue

    # Severity counts
    critical_cnt = sum(1 for f in all_findings if f["severity"] == "CRITICAL")
    high_cnt = sum(1 for f in all_findings if f["severity"] == "HIGH")
    medium_cnt = sum(1 for f in all_findings if f["severity"] == "MEDIUM")

    return {
        "success": True,
        "target_path": target_path,
        "files_scanned": files_scanned,
        "total_findings": len(all_findings),
        "critical_count": critical_cnt,
        "high_count": high_cnt,
        "medium_count": medium_cnt,
        "findings": all_findings,
    }


@router.post("/scan/file")
async def scan_uploaded_file(file: UploadFile = File(...)):
    raw_filename = file.filename or "unknown_file"
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(raw_filename))[:120]

    # Limit to 15MB
    content_bytes = await file.read(15 * 1024 * 1024 + 1)
    if len(content_bytes) > 15 * 1024 * 1024:
        return {"success": False, "error": "Размер файла превышает лимит 15 МБ."}

    content_str = content_bytes.decode("utf-8", errors="ignore")
    findings = scan_text_content(content_str, safe_filename)

    return {
        "success": True,
        "filename": safe_filename,
        "size_bytes": len(content_bytes),
        "total_findings": len(findings),
        "findings": findings,
    }
