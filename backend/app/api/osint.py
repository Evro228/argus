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

    # Alphanumeric format check
    if not re.fullmatch(r"[a-zA-Z0-9][a-zA-Z0-9_.-]{0,63}", username) or username in (".", "..") or ".." in username:
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

            # Validate scheme and target host
            from urllib.parse import urlparse
            import ipaddress
            parsed = urlparse(check_url)
            if parsed.scheme != "https":
                return None
            hostname = parsed.hostname or ""
            if hostname in ("localhost", "127.0.0.1") or hostname.endswith(".local"):
                return None
            try:
                ip_obj = ipaddress.ip_address(hostname)
                if ip_obj.is_private or ip_obj.is_loopback or ip_obj.is_link_local or ip_obj.is_unspecified or str(ip_obj) == "169.254.169.254":
                    return None
            except ValueError:
                pass

            try:
                resp = await client.get(check_url)
                if resp.status_code != 200:
                    return None

                # Telegram: non-existent usernames do not have tgme_page_extra
                if "t.me" in check_url:
                    if "tgme_page_extra" not in resp.text:
                        return None

                # Steam: returns 200 on missing profiles with specific error
                if "steamcommunity.com" in check_url:
                    if "The specified profile could not be found" in resp.text or "error_ctn" in resp.text:
                        return None

                # Pinterest: returns 200 on missing profile
                if "pinterest.com" in check_url:
                    if "profile_does_not_exist" in resp.text or "User not found" in resp.text or "resourceResponse" not in resp.text:
                        return None

                # Reddit special check
                if "reddit.com" in check_url:
                    data = resp.json()
                    if not data.get("data") or data.get("data", {}).get("is_suspended") is True or "name" not in data.get("data", {}):
                        return None

                # HackerNews special check
                if "firebaseio.com" in check_url:
                    if resp.json() is None:
                        return None

                # Keybase special check
                if "keybase.io" in check_url:
                    kb_data = resp.json()
                    them = kb_data.get("them", [])
                    if not them or them == [None] or them[0] is None:
                        return None

                # Docker Hub special check
                if "hub.docker.com" in check_url:
                    if "username" not in resp.text:
                        return None

                # Gravatar special check
                if "gravatar.com" in check_url:
                    if "We couldn't find that page" in resp.text or "entry" not in resp.text:
                        return None

                # Chess.com special check
                if "chess.com" in check_url:
                    if "player_id" not in resp.text:
                        return None

                # Disqus special check
                if "disqus.com" in check_url:
                    if "user-not-found" in resp.text or "Page not found" in resp.text:
                        return None

                # Habr special check
                if "habr.com" in check_url:
                    if "Пользователь не найден" in resp.text or "Страница не найдена" in resp.text:
                        return None

                # GitLab special check
                if "gitlab.com" in check_url:
                    if "users/sign_in" in str(resp.url):
                        return None

                # GitHub special check
                if "github.com" in check_url:
                    if "Not Found" in resp.text and "<title>Page not found" in resp.text:
                        return None

                # Mastodon special check
                if "mastodon.social" in check_url:
                    if "Record not found" in resp.text or "error" in resp.text:
                        return None

                return {
                    "name": site["name"],
                    "category": site.get("category", "General"),
                    "url": profile_url,
                    "status": "Found",
                    "status_code": resp.status_code,
                }
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
    from backend.app.api.system import is_air_gap_enabled
    offline = bool(req.offline_only or is_air_gap_enabled())
    res = await check_password_breach_automated(req.password, offline)
    return {
        "success": True,
        **res
    }


class OSINTGraphRequest(BaseModel):
    target: str
    target_type: str = "username"  # username, email, domain
    profiles: list[dict[str, Any]] | None = None


@router.post("/graph/build")
async def build_osint_graph(req: OSINTGraphRequest):
    """
    Генерирует топологический граф связей сущностей (Synapse Entity Graph)
    для интерактивной 2D симуляции связей цели в интерфейсе.
    """
    clean_target = req.target.strip()
    if not clean_target:
        clean_target = "UNKNOWN_ENTITY"

    nodes = []
    links = []

    # 1. Central Target Node
    nodes.append({
        "id": "target",
        "label": clean_target,
        "type": "target",
        "category": "Target",
        "size": 24,
        "color": "#38bdf8",
        "glow": True,
        "metadata": {"type": req.target_type, "identifier": clean_target},
    })

    # Categories config
    cat_colors = {
        "Dev": "#818cf8",
        "Social": "#c084fc",
        "Messenger": "#2dd4bf",
        "Forum": "#fb923c",
        "Blogging": "#f472b6",
        "Breach": "#f87171",
        "Security": "#34d399",
        "General": "#94a3b8",
    }

    # If profiles were provided (from username scan)
    profiles = req.profiles
    seen_categories = set()

    if profiles is not None:
        if len(profiles) == 0:
            # Real empty result: target has 0 detected accounts
            nodes[0]["label"] = f"@{clean_target}"
            nodes[0]["color"] = "#64748b"
            nodes[0]["status"] = "0 СВЯЗЕЙ"
            return {
                "success": True,
                "target": clean_target,
                "total_nodes": 1,
                "total_links": 0,
                "nodes": nodes,
                "links": [],
            }

        for p in profiles:
            cat = p.get("category", "General")
            seen_categories.add(cat)

            # Category cluster node
            cat_node_id = f"cat_{cat.lower()}"
            if not any(n["id"] == cat_node_id for n in nodes):
                nodes.append({
                    "id": cat_node_id,
                    "label": cat.upper(),
                    "type": "category",
                    "category": cat,
                    "size": 16,
                    "color": cat_colors.get(cat, "#94a3b8"),
                    "glow": False,
                    "metadata": {"count": 1},
                })
                links.append({
                    "source": "target",
                    "target": cat_node_id,
                    "weight": 2.5,
                    "color": "#38bdf840",
                    "type": "hierarchy",
                })

            # Platform node
            plat_id = f"plat_{p.get('name', 'node').lower()}"
            is_found = p.get("status") == "Found"
            nodes.append({
                "id": plat_id,
                "label": p.get("name", "Unknown"),
                "type": "platform",
                "category": cat,
                "size": 12,
                "color": "#10b981" if is_found else "#64748b",
                "status": p.get("status", "Unknown"),
                "url": p.get("url", ""),
                "glow": is_found,
                "metadata": p,
            })
            links.append({
                "source": cat_node_id,
                "target": plat_id,
                "weight": 1.2,
                "color": "#10b98160" if is_found else "#47556940",
                "type": "affiliation",
            })
    else:
        # Default ready topology for Synapse workspace
        ready_clusters = [
            ("Поиск", ["Sherlock Multi-Platform", "Dorks Studio"]),
            ("Разведка", ["Breach Intelligence", "Metadata Forensics"]),
            ("Сеть", ["Localhost Matrix", "RF Spectrum"]),
        ]
        nodes[0]["label"] = "SYNAPSE READY"
        for cat, items in ready_clusters:
            cat_node_id = f"cat_{cat.lower()}"
            nodes.append({
                "id": cat_node_id,
                "label": cat.upper(),
                "type": "category",
                "category": cat,
                "size": 15,
                "color": "#818cf8",
                "glow": False,
                "metadata": {"count": len(items)},
            })
            links.append({
                "source": "target",
                "target": cat_node_id,
                "weight": 2.2,
                "color": "#38bdf840",
                "type": "hierarchy",
            })
            for item in items:
                plat_id = f"node_{item.lower().replace(' ', '_')}"
                nodes.append({
                    "id": plat_id,
                    "label": item,
                    "type": "platform",
                    "category": cat,
                    "size": 11,
                    "color": "#38bdf8",
                    "status": "READY",
                    "url": "",
                    "glow": False,
                    "metadata": {"name": item},
                })
                links.append({
                    "source": cat_node_id,
                    "target": plat_id,
                    "weight": 1.1,
                    "color": "#38bdf830",
                    "type": "affiliation",
                })


    return {
        "success": True,
        "target": clean_target,
        "target_type": req.target_type,
        "total_nodes": len(nodes),
        "total_links": len(links),
        "clusters_count": len(seen_categories) if seen_categories else 4,
        "nodes": nodes,
        "links": links,
    }

