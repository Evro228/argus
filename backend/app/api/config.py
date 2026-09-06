import json
import os
import stat
from typing import Dict, Any, Optional
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

CONFIG_FILE = os.path.expanduser("~/.argus_keys.json")

class ApiKeysUpdateRequest(BaseModel):
    nasa_firms_key: Optional[str] = None
    opensky_username: Optional[str] = None
    opensky_password: Optional[str] = None
    aisstream_key: Optional[str] = None
    shodan_key: Optional[str] = None
    ollama_url: Optional[str] = None


def read_keys() -> Dict[str, str]:
    if not os.path.exists(CONFIG_FILE):
        return {}
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def write_keys(keys_data: Dict[str, str]):
    flags = os.O_WRONLY | os.O_CREAT | os.O_TRUNC
    # Owner read/write only
    mode = stat.S_IRUSR | stat.S_IWUSR
    with os.fdopen(os.open(CONFIG_FILE, flags, mode), "w", encoding="utf-8") as f:
        json.dump(keys_data, f, indent=2)


def mask_key(val: Optional[str]) -> str:
    if not val:
        return ""
    val_str = str(val).strip()
    if len(val_str) <= 6:
        return "••••••"
    return f"{val_str[:2]}••••••••{val_str[-4:]}"


@router.get("/keys")
def get_api_keys_status():
    """
    Returns configured API keys status with masked tokens for UI security.
    """
    keys = read_keys()
    return {
        "success": True,
        "config_path": CONFIG_FILE,
        "keys": {
            "nasa_firms_key": {
                "configured": bool(keys.get("nasa_firms_key")),
                "masked": mask_key(keys.get("nasa_firms_key")),
                "description": "NASA FIRMS Map Key (для спутниковых термоточек высокого разрешения)",
                "status": "CONFIGURED" if keys.get("nasa_firms_key") else "OPEN_MODE (Zero-Key)",
            },
            "opensky": {
                "configured": bool(keys.get("opensky_username") and keys.get("opensky_password")),
                "username": mask_key(keys.get("opensky_username")),
                "description": "OpenSky Network Account (для повышенной квоты опроса ADS-B)",
                "status": "CONFIGURED" if keys.get("opensky_username") else "OPEN_MODE (Anonymous)",
            },
            "aisstream_key": {
                "configured": bool(keys.get("aisstream_key")),
                "masked": mask_key(keys.get("aisstream_key")),
                "description": "AISStream API Key (для сырого стрима мирового морского флота)",
                "status": "CONFIGURED" if keys.get("aisstream_key") else "OPEN_MODE (Tactical Fleet)",
            },
            "shodan_key": {
                "configured": bool(keys.get("shodan_key")),
                "masked": mask_key(keys.get("shodan_key")),
                "description": "Shodan API Key (для глубокой разведки открытых портов и баннеров)",
                "status": "CONFIGURED" if keys.get("shodan_key") else "OPTIONAL",
            },
            "ollama_url": {
                "configured": True,
                "value": keys.get("ollama_url") or "http://127.0.0.1:11434",
                "description": "Локальный хост Ollama (Llama 3 / Mistral)",
                "status": "ACTIVE",
            },
        },
    }


@router.post("/keys")
def update_api_keys(req: ApiKeysUpdateRequest):
    """
    Persists user-supplied API keys securely to ~/.argus_keys.json with 0600 permissions.
    """
    keys = read_keys()
    if req.nasa_firms_key is not None:
        keys["nasa_firms_key"] = req.nasa_firms_key.strip()
    if req.opensky_username is not None:
        keys["opensky_username"] = req.opensky_username.strip()
    if req.opensky_password is not None:
        keys["opensky_password"] = req.opensky_password.strip()
    if req.aisstream_key is not None:
        keys["aisstream_key"] = req.aisstream_key.strip()
    if req.shodan_key is not None:
        keys["shodan_key"] = req.shodan_key.strip()
    if req.ollama_url is not None:
        keys["ollama_url"] = req.ollama_url.strip()

    write_keys(keys)
    return {
        "success": True,
        "message": "Ключи конфигурации успешно сохранены в локальном защищенном хранилище.",
    }
