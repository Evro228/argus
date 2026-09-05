import re

import httpx
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class SanitizeRequest(BaseModel):
    text: str


class ProxyTestRequest(BaseModel):
    proxy_url: str | None = None


@router.post("/sanitize")
def sanitize_sensitive_data(req: SanitizeRequest):
    """
    Pasteguard logic: strips emails, phones, credit cards, and tokens from text.
    """
    # Bounded input to prevent ReDoS
    cleaned = req.text[:100_000]
    replacements = []

    # 1. Emails (ReDoS-safe RFC pattern)
    email_pattern = r"\b[A-Za-z0-9._%+-]{1,64}@[A-Za-z0-9.-]{1,255}\.[A-Za-z]{2,10}\b"
    for m in re.finditer(email_pattern, cleaned):
        replacements.append(("EMAIL", m.group(0)))
    cleaned = re.sub(email_pattern, "[REDACTED_EMAIL]", cleaned)

    # 2. Credit card numbers (standard digits 13-16)
    cc_pattern = r"\b(?:\d[ -]*?){13,16}\b"
    for m in re.finditer(cc_pattern, cleaned):
        replacements.append(("CARD", m.group(0)))
    cleaned = re.sub(cc_pattern, "[REDACTED_CARD]", cleaned)

    # 3. Phone numbers (intl format)
    phone_pattern = r"(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}"
    for m in re.finditer(phone_pattern, cleaned):
        replacements.append(("PHONE", m.group(0)))
    cleaned = re.sub(phone_pattern, "[REDACTED_PHONE]", cleaned)

    # 4. API keys / tokens (redacts value cleanly without duplicating key)
    token_pattern = r'((?:api[_-]?key|token|secret|password)\s*[:=]\s*["\']?)([a-zA-Z0-9_.-]{16,})(["\']?)'
    for m in re.finditer(token_pattern, cleaned, flags=re.IGNORECASE):
        replacements.append(("SECRET_TOKEN", m.group(2)))
    cleaned = re.sub(
        token_pattern,
        r"\1[REDACTED_SECRET]\3",
        cleaned,
        flags=re.IGNORECASE,
    )

    return {
        "success": True,
        "original_length": len(req.text),
        "sanitized_length": len(cleaned),
        "sanitized_text": cleaned,
        "replacements_count": len(replacements),
    }


@router.post("/ip/check")
async def check_current_ip():
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get("https://api.ipify.org?format=json")
            if resp.status_code == 200:
                ip_data = resp.json()
                return {
                    "success": True,
                    "ip": ip_data.get("ip"),
                    "note": "Это публичный IP адрес, видимый целевым серверам при сканировании без прокси.",
                }
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {"success": False, "error": "Не удалось определить IP"}


# --- ClearURLs Tracking Parameter Cleaner ---
TRACKING_PARAMS = {
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "fbclid",
    "gclid",
    "yclid",
    "mc_eid",
    "_hsenc",
    "_openstat",
    "igshid",
    "si",
    "spm",
    "ref_src",
    "ref_url",
    "trk",
    "sc_campaign",
}


class CleanUrlRequest(BaseModel):
    url: str


class DisposableIdRequest(BaseModel):
    prefix: str | None = "agent"


@router.post("/clean-url")
def clean_url_tracking(req: CleanUrlRequest):
    """
    ClearURLs implementation: removes tracking queries and spy parameters.
    """
    from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

    parsed = urlparse(req.url.strip())
    query_params = parse_qs(parsed.query, keep_blank_values=True)

    removed = []
    cleaned_params = {}
    for k, v in query_params.items():
        if k.lower() in TRACKING_PARAMS or k.lower().startswith("utm_"):
            removed.append(k)
        else:
            cleaned_params[k] = v

    new_query = urlencode(cleaned_params, doseq=True)
    cleaned_url = urlunparse(
        (
            parsed.scheme,
            parsed.netloc,
            parsed.path,
            parsed.params,
            new_query,
            parsed.fragment,
        )
    )

    return {
        "success": True,
        "original_url": req.url,
        "cleaned_url": cleaned_url,
        "removed_params_count": len(removed),
        "removed_params": removed,
    }


@router.post("/disposable-id")
def generate_disposable_id(req: DisposableIdRequest):
    """
    Disposable Identity Generator (OpenTrashmail / Privacy profile).
    """
    import secrets
    import string

    rand_hex = secrets.token_hex(4)
    username = f"{req.prefix}_{rand_hex}"
    domains = ["opentrashmail.net", "tempmail.ninja", "disposable.link"]
    chosen_domain = secrets.choice(domains)
    email = f"{username}@{chosen_domain}"

    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    passphrase = "".join(secrets.choice(alphabet) for _ in range(22))

    return {
        "success": True,
        "username": username,
        "disposable_email": email,
        "temporary_passphrase": passphrase,
        "note": "Используйте для регистрации на сервисах без раскрытия личного email.",
    }
