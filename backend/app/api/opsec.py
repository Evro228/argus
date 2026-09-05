from fastapi import APIRouter
from pydantic import BaseModel
import re
import httpx
from typing import Optional

router = APIRouter()

class SanitizeRequest(BaseModel):
    text: str

class ProxyTestRequest(BaseModel):
    proxy_url: Optional[str] = None

@router.post("/sanitize")
def sanitize_sensitive_data(req: SanitizeRequest):
    """
    Pasteguard logic: strips emails, phones, credit cards, and tokens from text.
    """
    cleaned = req.text
    replacements = []

    # 1. Emails
    email_pattern = r'[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+'
    for m in re.finditer(email_pattern, cleaned):
        replacements.append(("EMAIL", m.group(0)))
    cleaned = re.sub(email_pattern, "[REDACTED_EMAIL]", cleaned)

    # 2. Credit card numbers (Luhn/standard digits 13-19)
    cc_pattern = r'\b(?:\d[ -]*?){13,16}\b'
    cleaned = re.sub(cc_pattern, "[REDACTED_CARD]", cleaned)

    # 3. Phone numbers (intl format)
    phone_pattern = r'(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}'
    cleaned = re.sub(phone_pattern, "[REDACTED_PHONE]", cleaned)

    # 4. API keys / tokens (generic hex or base64 32+ chars)
    token_pattern = r'(?:api[_-]?key|token|secret|password)\s*[:=]\s*["\']?([a-zA-Z0-9_.-]{16,})["\']?'
    cleaned = re.sub(token_pattern, r'\g<0>'.split(':')[0] + ': [REDACTED_SECRET]', cleaned, flags=re.IGNORECASE)

    return {
        "success": True,
        "original_length": len(req.text),
        "sanitized_length": len(cleaned),
        "sanitized_text": cleaned,
        "replacements_count": len(replacements)
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
                    "note": "Это публичный IP адрес, видимый целевым серверам при сканировании без прокси."
                }
    except Exception as e:
        return {"success": False, "error": str(e)}

    return {"success": False, "error": "Не удалось определить IP"}

# --- ClearURLs Tracking Parameter Cleaner ---
TRACKING_PARAMS = {
    "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content",
    "fbclid", "gclid", "yclid", "mc_eid", "_hsenc", "_openstat", "igshid",
    "si", "spm", "ref_src", "ref_url", "trk", "sc_campaign"
}

class CleanUrlRequest(BaseModel):
    url: str

class DisposableIdRequest(BaseModel):
    prefix: Optional[str] = "agent"

@router.post("/clean-url")
def clean_url_tracking(req: CleanUrlRequest):
    """
    ClearURLs implementation: removes tracking queries and spy parameters.
    """
    from urllib.parse import urlparse, parse_qs, urlencode, urlunparse

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
    cleaned_url = urlunparse((
        parsed.scheme,
        parsed.netloc,
        parsed.path,
        parsed.params,
        new_query,
        parsed.fragment
    ))

    return {
        "success": True,
        "original_url": req.url,
        "cleaned_url": cleaned_url,
        "removed_params_count": len(removed),
        "removed_params": removed
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
        "note": "Используйте для регистрации на сервисах без раскрытия личного email."
    }
