"""
ARGUS // Encrypted Vault Storage (AES-256-GCM)
Provides authenticated, tamper-evident encryption for local data-at-rest.
"""

import os
import json
import secrets
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
from backend.app.utils.memory import SecureBuffer


def derive_key(passphrase: str, salt: bytes, iterations: int = 100_000) -> bytes:
    """Derives a 256-bit AES key using PBKDF2-HMAC-SHA256."""
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=salt,
        iterations=iterations,
    )
    return kdf.derive(passphrase.encode("utf-8"))


def encrypt_vault_payload(data: dict | str | bytes, passphrase: str) -> dict:
    """
    Encrypts data using AES-256-GCM with a 96-bit random nonce and 128-bit salt.
    Returns serialized envelope with base64/hex representations.
    """
    if isinstance(data, dict):
        raw_bytes = json.dumps(data, ensure_ascii=False).encode("utf-8")
    elif isinstance(data, str):
        raw_bytes = data.encode("utf-8")
    elif isinstance(data, bytes):
        raw_bytes = data
    else:
        raise TypeError("Unsupported data type for encryption")

    salt = secrets.token_bytes(16)
    key_bytes = derive_key(passphrase, salt)
    
    with SecureBuffer(key_bytes) as s_key:
        aesgcm = AESGCM(s_key.get_bytes())
        nonce = secrets.token_bytes(12)  # Standard 96-bit nonce for GCM
        # Authenticated Additional Data (AAD) binds envelope version
        aad = b"ARGUS_VAULT_V1"
        ciphertext = aesgcm.encrypt(nonce, raw_bytes, aad)

    return {
        "version": "1.0",
        "cipher": "AES-256-GCM",
        "salt": salt.hex(),
        "nonce": nonce.hex(),
        "ciphertext": ciphertext.hex(),
    }


def decrypt_vault_payload(envelope: dict, passphrase: str) -> bytes:
    """
    Decrypts and verifies an AES-256-GCM envelope.
    Raises ValueError on tampering or invalid passphrase.
    """
    try:
        salt = bytes.fromhex(envelope["salt"])
        nonce = bytes.fromhex(envelope["nonce"])
        ciphertext = bytes.fromhex(envelope["ciphertext"])
    except Exception as e:
        raise ValueError(f"Invalid envelope format: {e}")

    key_bytes = derive_key(passphrase, salt)
    with SecureBuffer(key_bytes) as s_key:
        aesgcm = AESGCM(s_key.get_bytes())
        aad = b"ARGUS_VAULT_V1"
        try:
            plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
            return plaintext
        except Exception:
            raise ValueError("Authentication tag mismatch or invalid password. Decryption failed.")
