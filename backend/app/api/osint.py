import asyncio
import re
from typing import Any

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

OSINT_TARGET_SITES = [
    {
        "name": "GitHub",
        "category": "Dev",
        "url": "https://github.com/{}",
        "check_url": "https://github.com/{}",
        "not_found_code": 404,
    },
    {
        "name": "Telegram",
        "category": "Messenger",
        "url": "https://t.me/{}",
        "check_url": "https://t.me/{}",
        "not_found_code": 404,
    },
    {
        "name": "GitLab",
        "category": "Dev",
        "url": "https://gitlab.com/{}",
        "check_url": "https://gitlab.com/{}",
        "not_found_code": 404,
    },
    {
        "name": "Reddit",
        "category": "Forum",
        "url": "https://www.reddit.com/user/{}",
        "check_url": "https://www.reddit.com/user/{}/about.json",
        "not_found_code": 404,
    },
    {
        "name": "Docker Hub",
        "category": "Dev",
        "url": "https://hub.docker.com/u/{}",
        "check_url": "https://hub.docker.com/v2/users/{}/",
        "not_found_code": 404,
    },
    {
        "name": "HackerNews",
        "category": "Forum",
        "url": "https://news.ycombinator.com/user?id={}",
        "check_url": "https://hacker-news.firebaseio.com/v0/user/{}.json",
        "not_found_code": 404,
    },
    {
        "name": "Medium",
        "category": "Blogging",
        "url": "https://medium.com/@{}",
        "check_url": "https://medium.com/@{}",
        "not_found_code": 404,
    },
    {
        "name": "Steam",
        "category": "Gaming",
        "url": "https://steamcommunity.com/id/{}",
        "check_url": "https://steamcommunity.com/id/{}",
        "not_found_code": 404,
    },
    {
        "name": "Pinterest",
        "category": "Social",
        "url": "https://www.pinterest.com/{}/",
        "check_url": "https://www.pinterest.com/{}/",
        "not_found_code": 404,
    },
    {
        "name": "Mastodon",
        "category": "Social",
        "url": "https://mastodon.social/@{}",
        "check_url": "https://mastodon.social/@{}",
        "not_found_code": 404,
    },
    {
        "name": "Pastebin",
        "category": "Sharing",
        "url": "https://pastebin.com/u/{}",
        "check_url": "https://pastebin.com/u/{}",
        "not_found_code": 404,
    },
    {
        "name": "Gravatar",
        "category": "Avatar",
        "url": "https://gravatar.com/{}",
        "check_url": "https://gravatar.com/{}",
        "not_found_code": 404,
    },
    {
        "name": "Chess.com",
        "category": "Gaming",
        "url": "https://www.chess.com/member/{}",
        "check_url": "https://api.chess.com/pub/player/{}",
        "not_found_code": 404,
    },
    {
        "name": "Disqus",
        "category": "Forum",
        "url": "https://disqus.com/by/{}/",
        "check_url": "https://disqus.com/by/{}/",
        "not_found_code": 404,
    },
    {
        "name": "Vimeo",
        "category": "Media",
        "url": "https://vimeo.com/{}",
        "check_url": "https://vimeo.com/{}",
        "not_found_code": 404,
    },
]

DORKS_COLLECTION = [
    {
        "id": "env_files",
        "category": "Утечки секретов",
        "title": "Открытые файлы .env и API ключи",
        "dork": 'filetype:env "DB_PASSWORD" OR "SECRET_KEY"',
    },
    {
        "id": "sql_dumps",
        "category": "Утечки баз данных",
        "title": "Забытые SQL бэкапы баз",
        "dork": 'filetype:sql "INSERT INTO" "password"',
    },
    {
        "id": "git_exposed",
        "category": "Уязвимости конфигурации",
        "title": "Открытые директории .git",
        "dork": 'intitle:"index of /" ".git"',
    },
    {
        "id": "admin_panels",
        "category": "Панели управления",
        "title": "Панели авторизации администратора",
        "dork": 'inurl:admin intitle:"login"',
    },
    {
        "id": "log_files",
        "category": "Серверные логи",
        "title": "Логи серверов и ошибок с данными",
        "dork": 'filetype:log "error" "exception" intext:password',
    },
    {
        "id": "open_s3",
        "category": "Облачные хранилища",
        "title": "Публичные бакеты Amazon S3",
        "dork": 'site:s3.amazonaws.com "confidential" OR "internal use only"',
    },
]


class UsernameSearchRequest(BaseModel):
    username: str


class DorkGenerateRequest(BaseModel):
    domain: str | None = None
    category: str | None = None


class EmailCheckRequest(BaseModel):
    email: str


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

    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    }

    results = []

    async with httpx.AsyncClient(
        timeout=4.0, follow_redirects=True, headers=headers
    ) as client:

        async def check_site(site: dict[str, Any]):
            check_url = site["check_url"].format(username)
            profile_url = site["url"].format(username)
            try:
                resp = await client.get(check_url)
                # Reddit special check
                if "reddit.com" in check_url and resp.status_code == 200:
                    data = resp.json()
                    if data.get("data", {}).get("is_suspended") is True or not data.get(
                        "data"
                    ):
                        return None

                # HackerNews special check
                if "firebaseio.com" in check_url and resp.status_code == 200:
                    if resp.json() is None:
                        return None

                if resp.status_code == 200:
                    return {
                        "name": site["name"],
                        "category": site["category"],
                        "url": profile_url,
                        "status": "Found",
                        "status_code": resp.status_code,
                    }
                return None
            except Exception:
                return None

        tasks = [check_site(site) for site in OSINT_TARGET_SITES]
        raw_results = await asyncio.gather(*tasks)

    found_profiles = [r for r in raw_results if r is not None]

    return {
        "success": True,
        "username": username,
        "total_checked": len(OSINT_TARGET_SITES),
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
                "google_search_url": f"https://www.google.com/search?q={httpx.URL('', params={'q': query}).query.decode('utf-8')}",
            }
        )
    return {"success": True, "dorks": output}


@router.post("/breach/check")
def check_email_breach(req: EmailCheckRequest):
    email = req.email.strip().lower()
    if "@" not in email:
        return {"success": False, "error": "Некорректный формат email."}

    # Generate direct verified verification links and intelligence info
    return {
        "success": True,
        "email": email,
        "hibp_url": f"https://haveibeenpwned.com/account/{email}",
        "dehashed_url": f"https://www.dehashed.com/search?query={email}",
        "recommendations": [
            "Проверьте email на официальном верификаторе Have I Been Pwned",
            "Активируйте двухфакторную аутентификацию (2FA) на всех привязанных сервисах",
            "Используйте уникальные пароли для каждого сервиса через KeePassXC или Bitwarden",
        ],
    }
