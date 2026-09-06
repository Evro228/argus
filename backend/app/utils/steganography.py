import base64
import json
import os

from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from backend.app.utils.memory import SecureBuffer

# Zero-Width Characters Map
ZW_MAP = {
    "00": "\u200b",  # Zero-width space
    "01": "\u200c",  # Zero-width non-joiner
    "10": "\u200d",  # Zero-width joiner
    "11": "\ufeff",  # Zero-width no-break space (BOM)
}
ZW_REVERSE_MAP = {v: k for k, v in ZW_MAP.items()}
START_MARKER = "\u2060\u2060"  # Word Joiner x 2
END_MARKER = "\u2060\u2061"  # Word Joiner + Function Application


def derive_key(password: str, salt: bytes) -> bytes:
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=100000,
    )
    return kdf.derive(password.encode("utf-8"))


def encrypt_payload(data: str, password: str) -> str:
    salt = os.urandom(16)
    nonce = os.urandom(12)
    key = derive_key(password, salt)
    with SecureBuffer(key) as s_key:
        aesgcm = AESGCM(s_key.get_bytes())
        ciphertext = aesgcm.encrypt(nonce, data.encode("utf-8"), None)

    package = {
        "salt": base64.b64encode(salt).decode("utf-8"),
        "nonce": base64.b64encode(nonce).decode("utf-8"),
        "ct": base64.b64encode(ciphertext).decode("utf-8"),
    }
    return json.dumps(package)


def decrypt_payload(package_str: str, password: str) -> str:
    package = json.loads(package_str)
    salt = base64.b64decode(package["salt"])
    nonce = base64.b64decode(package["nonce"])
    ciphertext = base64.b64decode(package["ct"])

    key = derive_key(password, salt)
    with SecureBuffer(key) as s_key:
        aesgcm = AESGCM(s_key.get_bytes())
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode("utf-8")


def text_to_zw(text: str) -> str:
    raw_bytes = text.encode("utf-8")
    bits = "".join(f"{b:08b}" for b in raw_bytes)
    zw_chars = []
    for i in range(0, len(bits), 2):
        pair = bits[i : i + 2]
        zw_chars.append(ZW_MAP.get(pair, ""))
    return START_MARKER + "".join(zw_chars) + END_MARKER


def zw_to_text(stego_text: str) -> str:
    start_idx = stego_text.find(START_MARKER)
    end_idx = stego_text.find(END_MARKER)
    if start_idx == -1 or end_idx == -1 or end_idx <= start_idx:
        raise ValueError("Скрытое сообщение не обнаружено или маркеры повреждены.")

    zw_payload = stego_text[start_idx + len(START_MARKER) : end_idx]
    bits = []
    for char in zw_payload:
        if char in ZW_REVERSE_MAP:
            bits.append(ZW_REVERSE_MAP[char])

    bit_str = "".join(bits)
    if len(bit_str) % 8 != 0:
        bit_str = bit_str[: -(len(bit_str) % 8)]

    bytes_list = []
    for i in range(0, len(bit_str), 8):
        byte = int(bit_str[i : i + 8], 2)
        bytes_list.append(byte)

    return bytes(bytes_list).decode("utf-8", errors="replace")


def hide_message(cover_text: str, secret_text: str, password: str = None) -> str:
    payload = secret_text
    if password and password.strip():
        payload = encrypt_payload(secret_text, password.strip())

    zw_encoded = text_to_zw(payload)

    # Insert after first space, or after punctuation, or at start
    if " " in cover_text:
        first_space = cover_text.index(" ")
        return (
            cover_text[: first_space + 1] + zw_encoded + cover_text[first_space + 1 :]
        )
    return cover_text + zw_encoded


def reveal_message(stego_text: str, password: str = None) -> dict:
    raw_payload = zw_to_text(stego_text)

    # Check if payload is encrypted JSON package
    is_encrypted = False
    try:
        data = json.loads(raw_payload)
        if isinstance(data, dict) and "salt" in data and "ct" in data:
            is_encrypted = True
    except Exception:
        pass

    if is_encrypted:
        if not password or not password.strip():
            return {
                "success": False,
                "is_encrypted": True,
                "error": "Сообщение зашифровано паролем (AES-256). Введите пароль для расшифровки.",
            }
        try:
            plaintext = decrypt_payload(raw_payload, password.strip())
            return {"success": True, "is_encrypted": True, "secret": plaintext}
        except Exception:
            return {
                "success": False,
                "is_encrypted": True,
                "error": "Неверный пароль расшифровки или поврежденный шифртекст.",
            }
    else:
        return {"success": True, "is_encrypted": False, "secret": raw_payload}
