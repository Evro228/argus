import asyncio
import json
import os
import re
from typing import Any, Dict, List

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

from backend.app.data.pwned_local import (
    check_password_breach_automated,
    check_email_local_intelligence
)

router = APIRouter()

# Load extended platforms catalog
PLATFORMS_FILE = os.path.join(os.path.dirname(__file__), "..", "data", "osint_platforms.json")
try:
    with open(PLATFORMS_FILE, "r", encoding="utf-8") as f:
        OSINT_TARGET_SITES = json.load(f)
except Exception:
    OSINT_TARGET_SITES = [
        {"name": "GitHub", "category": "Dev", "url": "https://github.com/{}", "check_url": "https://github.com/{}", "not_found_code": 404},
        {"name": "Telegram", "category": "Messenger", "url": "https://t.me/{}", "check_url": "https://t.me/{}", "not_found_code": 404},
        {"name": "GitLab", "category": "Dev", "url": "https://gitlab.com/{}", "check_url": "https://gitlab.com/{}", "not_found_code": 404},
        {"name": "Reddit", "category": "Forum", "url": "https://www.reddit.com/user/{}", "check_url": "https://www.reddit.com/user/{}/about.json", "not_found_code": 404},
        {"name": "Medium", "category": "Blogging", "url": "https://medium.com/@{}", "check_url": "https://medium.com/@{}", "not_found_code": 404}
    ]

DORKS_COLLECTION = [
    {
        "id": "env_files",
        "category": "Утечки секретов",
        "title": "Открытые файлы .env и API ключи",
        "dork": "filetype:env \"DB_PASSWORD\" OR \"SECRET_KEY\"",
    },
    {
        "id": "sql_dumps",
        "category": "Утечки баз данных",
        "title": "Забытые SQL бэкапы баз",
        "dork": "filetype:sql \"INSERT INTO\" \"password\"",
    },
    {
        "id": "git_exposed",
        "category": "Уязвимости конфигурации",
        "title": "Открытые директории .git",
        "dork": "intitle:\"index of /\" \".git\"",
    },
    {
        "id": "admin_panels",
        "category": "Панели управления",
        "title": "Панели авторизации администратора",
        "dork": "inurl:admin intitle:\"login\"",
    },
    {
        "id": "log_files",
        "category": "Серверные логи",
        "title": "Логи серверов и ошибок с данными",
        "dork": "filetype:log \"error\" \"exception\" intext:password",
    },
    {
        "id": "open_s3",
        "category": "Облачные хранилища",
        "title": "Публичные бакеты Amazon S3",
        "dork": "site:s3.amazonaws.com \"confidential\" OR \"internal use only\"",
    },
]


class UsernameSearchRequest(BaseModel):
    username: str
    category: str | None = None


class DorkGenerateRequest(BaseModel):
    domain: str | None = None
    category: str | None = None


class EmailCheckRequest(BaseModel):
    email: str


class PasswordBreachRequest(BaseModel):
    password: str
    offline_only: bool = False


@router.post("/search/username")
async def search_username(req: UsernameSearchRequest):
    username = req.username.strip().lstrip("@")
    if not username:
        return {"success": False, "error": "Введите никнейм для поиска."}

    # Strict alphanumeric + safe delimiter check (prevents SSRF / path injection)
    if not re.fullmatch(r"[a-zA-Z0-9_.-]{1,64}", username):
        return {
            "success": False,
            "error": "Некорректный формат никнейма. Допускаются только буквы, цифры, дефис, точка и подчеркивание (до 64 символов).",
        }

    from backend.app.api.system import is_air_gap_enabled
    if is_air_gap_enabled():
        return {
            "success": True,
            "username": username,
            "air_gap_mode": True,
            "total_checked": 0,
            "found_count": 0,
            "profiles": [],
            "notice": "Режим Air-Gapped Stealth Mode АКТИВЕН. Внешние HTTP-запросы заблокированы. Используйте оффлайн базы утечек и локальный справочник платформ.",
        }

    target_sites = OSINT_TARGET_SITES
    if req.category and req.category.lower() != "all":
        target_sites = [s for s in OSINT_TARGET_SITES if s.get("category", "").lower() == req.category.lower()]

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    async with httpx.AsyncClient(
        timeout=3.5, follow_redirects=True, headers=headers
    ) as client:

        async def check_site(site: dict[str, Any]):
            check_url = site["check_url"].format(username)
            profile_url = site["url"].format(username)
            try:
                resp = await client.get(check_url)
                # Reddit special check
                if "reddit.com" in check_url and resp.status_code == 200:
                    data = resp.json()
                    if data.get("data", {}).get("is_suspended") is True or not data.get("data"):
                        return None

                # HackerNews special check
                if "firebaseio.com" in check_url and resp.status_code == 200:
                    if resp.json() is None:
                        return None

                if resp.status_code == 200:
                    return {
                        "name": site["name"],
                        "category": site.get("category", "General"),
                        "url": profile_url,
                        "status": "Found",
                        "status_code": resp.status_code,
                    }
                return None
            except Exception:
                return None

        tasks = [check_site(site) for site in target_sites]
        raw_results = await asyncio.gather(*tasks)

    found_profiles = [r for r in raw_results if r is not None]

    return {
        "success": True,
        "username": username,
        "total_checked": len(target_sites),
        "found_count": len(found_profiles),
        "profiles": found_profiles,
    }


@router.get("/dorks")
def get_dorks(domain: str | None = None):
    output = []
    for d in DORKS_COLLECTION:
        query = d["dork"]
        if domain and domain.strip():
            clean_domain = (
                domain.strip()
                .replace("http://", "")
                .replace("https://", "")
                .split("/")[0]
            )
            query = f"site:{clean_domain} {query}"

        output.append(
            {
                **d,
                "query": query,
                "raw_dork": query
            }
        )
    return {"success": True, "dorks": output}


@router.post("/breach/check")
def check_email_breach(req: EmailCheckRequest):
    email = req.email.strip().lower()
    if "@" not in email:
        return {"success": False, "error": "Некорректный формат email."}

    intel = check_email_local_intelligence(email)
    
    return {
        "success": True,
        "email": email,
        "status": "COMPLETED",
        "hibp_url": f"https://haveibeenpwned.com/account/{email}",
        "historical_breaches_count": intel["total_historical_breaches_in_category"],
        "breaches": intel["breaches"],
        "domain_risk": intel["domain_risk"],
        "recommendations": [
            "Активируйте двухфакторную аутентификацию (2FA) на всех привязанных сервисах.",
            "Проверьте актуальность паролей, сгенерированных ранее 2020 года.",
            "Используйте уникальные пароли через встроенный модуль Crypto Stronghold."
        ],
    }


@router.post("/breach/password")
async def check_password_breach(req: PasswordBreachRequest):
    res = await check_password_breach_automated(req.password, req.offline_only)
    return {
        "success": True,
        **res
    }
