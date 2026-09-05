from fastapi import APIRouter, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional
import secrets
import string
import hashlib
from backend.app.utils.steganography import hide_message, reveal_message

router = APIRouter()

class StegoEncodeRequest(BaseModel):
    cover_text: str
    secret_text: str
    password: Optional[str] = None

class StegoDecodeRequest(BaseModel):
    stego_text: str
    password: Optional[str] = None

class PassGenRequest(BaseModel):
    length: int = 20
    use_upper: bool = True
    use_lower: bool = True
    use_digits: bool = True
    use_symbols: bool = True

@router.post("/stego/encode")
def encode_stego(req: StegoEncodeRequest):
    if not req.cover_text.strip():
        req.cover_text = "Простой рабочий отчет за текущую неделю без изменений."
    try:
        stego_result = hide_message(req.cover_text, req.secret_text, req.password)
        return {
            "success": True,
            "stego_text": stego_result,
            "visible_length": len(req.cover_text),
            "total_length": len(stego_result),
            "hidden_chars_count": len(stego_result) - len(req.cover_text),
            "is_encrypted": bool(req.password and req.password.strip())
        }
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/stego/decode")
def decode_stego(req: StegoDecodeRequest):
    try:
        res = reveal_message(req.stego_text, req.password)
        return res
    except Exception as e:
        return {"success": False, "error": str(e)}

@router.post("/password/generate")
def generate_password(req: PassGenRequest):
    alphabet = ""
    if req.use_lower:
        alphabet += string.ascii_lowercase
    if req.use_upper:
        alphabet += string.ascii_uppercase
    if req.use_digits:
        alphabet += string.digits
    if req.use_symbols:
        alphabet += "!@#$%^&*()-_=+[]{}<>?"

    if not alphabet:
        alphabet = string.ascii_letters + string.digits

    password = "".join(secrets.choice(alphabet) for _ in range(max(8, min(req.length, 128))))
    
    # Calculate entropy estimate
    pool_size = len(alphabet)
    entropy_bits = round(req.length * (pool_size.bit_length() - 1), 1)
    
    strength = "Слабый"
    if entropy_bits >= 80:
        strength = "Максимальный (Военный стандарт)"
    elif entropy_bits >= 60:
        strength = "Надежный"
    elif entropy_bits >= 45:
        strength = "Средний"

    return {
        "password": password,
        "length": len(password),
        "entropy_bits": entropy_bits,
        "strength": strength
    }

@router.post("/hash")
async def calculate_hash(
    text: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None)
):
    content = b""
    filename = "text_input"
    if file:
        content = await file.read()
        filename = file.filename
    elif text:
        content = text.encode('utf-8')

    if not content:
        return {"success": False, "error": "Предоставьте текст или файл для хеширования."}

    md5_hash = hashlib.md5(content).hexdigest()
    sha1_hash = hashlib.sha1(content).hexdigest()
    sha256_hash = hashlib.sha256(content).hexdigest()

    return {
        "success": True,
        "filename": filename,
        "size_bytes": len(content),
        "hashes": {
            "MD5": md5_hash,
            "SHA-1": sha1_hash,
            "SHA-256": sha256_hash
        },
        "virustotal_url": f"https://www.virustotal.com/gui/file/{sha256_hash}"
    }
