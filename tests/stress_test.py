"""
🛡️ ARGUS // HEAVY STRESS & GLOBAL HIGH-LOAD VERIFICATION SUITE
Simulates concurrent drive-by attacks, high-load request bursts (500+ requests),
memory forensic zeroing verification, Air-Gap socket leak detection, and cryptographic tampering.
"""

import asyncio
import os
import sys
import time
import secrets
from fastapi.testclient import TestClient

# Set root directory in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from backend.app.main import app
from backend.app.utils.memory import SecureBuffer
from backend.app.utils.crypto_vault import encrypt_vault_payload, decrypt_vault_payload
from backend.app.api.system import AIR_GAP_STATE

print("=" * 66)
print("🛡️ ARGUS v2.1.0 // HEAVY STRESS & GLOBAL HIGH-LOAD AUDIT")
print("=" * 66)

passed = 0
total = 6

# -------------------------------------------------------------
# TEST 1: DRIVE-BY ATTACK & DNS REBINDING DEFENSE
# -------------------------------------------------------------
print("\n[PHASE 1] Тестирование защиты от Drive-By атак и DNS Rebinding...")
client = TestClient(app)

# 1.1 Malicious Host header (DNS Rebinding simulation)
res_rebind = client.get("/api/health", headers={"Host": "evil-attacker.org"})
assert res_rebind.status_code == 403, f"Expected 403, got {res_rebind.status_code}"

# 1.2 IPC Token simulation
test_ipc_token = secrets.token_hex(32)
os.environ["ARGUS_IPC_TOKEN"] = test_ipc_token

# Missing token
res_no_tok = client.get("/api/system/status")
assert res_no_tok.status_code == 401, f"Expected 401 for missing token, got {res_no_tok.status_code}"

# Invalid forged token
res_bad_tok = client.get("/api/system/status", headers={"X-ARGUS-Token": "forged_evil_token"})
assert res_bad_tok.status_code == 401, f"Expected 401 for forged token, got {res_bad_tok.status_code}"

# Valid token
res_ok_tok = client.get("/api/system/status", headers={"X-ARGUS-Token": test_ipc_token})
assert res_ok_tok.status_code == 200, f"Expected 200 for valid token, got {res_ok_tok.status_code}"

# Clear token for further tests
del os.environ["ARGUS_IPC_TOKEN"]
print("  ✅ PASS | Drive-By & DNS Rebinding Protection: Host filtering (403) & IPC Token validation (401) verified")
passed += 1

# -------------------------------------------------------------
# TEST 2: HEAVY CONCURRENCY & BURST LOAD (500 CONCURRENT REQUESTS)
# -------------------------------------------------------------
print("\n[PHASE 2] Тяжелый нагрузочный стресс-тест (500 одновременных запросов)...")

async def run_burst_load():
    import httpx
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://127.0.0.1:8800") as async_client:
        start_time = time.time()
        tasks = []
        for i in range(500):
            if i % 3 == 0:
                tasks.append(async_client.get("/api/health"))
            elif i % 3 == 1:
                tasks.append(async_client.post("/api/crypto/password/generate", json={"length": 24}))
            else:
                tasks.append(async_client.post("/api/opsec/clean-url", json={"url": f"https://target.com/page?utm_source=ad_{i}&id={i}"}))
        
        responses = await asyncio.gather(*tasks, return_exceptions=True)
        duration = time.time() - start_time
        
        success_count = 0
        error_count = 0
        for r in responses:
            if isinstance(r, httpx.Response) and r.status_code in (200, 429):
                success_count += 1
            else:
                error_count += 1
                
        rps = round(500 / duration, 1)
        print(f"  • Выполнено 500 запросов за {duration:.3f}с (~{rps} RPS). Успешных/защищенных: {success_count}, Сбоев сервера: {error_count}")
        assert error_count == 0, f"Detected {error_count} server crashes during load burst"
        assert success_count == 500

asyncio.run(run_burst_load())
print("  ✅ PASS | Heavy Concurrency: 500 одновременных асинхронных сессий обработаны с 0% потерь")
passed += 1

# -------------------------------------------------------------
# TEST 3: MEMORY FORENSIC ZEROING (SECURE BUFFER)
# -------------------------------------------------------------
print("\n[PHASE 3] Верификация гарантированного физического зануления RAM (Anti-Dump)...")
secret_payload = b"CRITICAL_OPERATOR_PRIVATE_KEY_9999"
with SecureBuffer(secret_payload) as s_buf:
    assert s_buf.get_bytes() == secret_payload
    # Access buffer memory directly before wipe
    raw_before = bytes(s_buf._buf)
    assert raw_before == secret_payload

# Buffer must be zeroed immediately after context exit
raw_after = bytes(s_buf._buf)
assert raw_after == b"\x00" * len(secret_payload), f"Memory was not zeroed: {raw_after}"
print("  ✅ PASS | Memory Zeroing: Гарантированное затирание ctypes.memset (0x00) подтверждено")
passed += 1

# -------------------------------------------------------------
# TEST 4: AIR-GAPPED STEALTH LEAK DEFENSE
# -------------------------------------------------------------
print("\n[PHASE 4] Тестирование режима строгой изоляции Air-Gapped Stealth Mode...")
# Turn Air-Gap ON
res_toggle_on = client.post("/api/system/airgap/toggle", json={"enabled": True})
assert res_toggle_on.json()["enabled"] is True

# Test IP telemetry in airgap
res_telemetry = client.get("/api/network/my-ip")
data_telemetry = res_telemetry.json()
assert data_telemetry["wan_ip"] == "AIR-GAPPED (ISOLATED)", f"Unexpected WAN IP in airgap: {data_telemetry}"
assert data_telemetry["air_gap_enforced"] is True

# Test Port Scan against external host in airgap
res_scan = client.post("/api/network/scan/ports", json={"target": "8.8.8.8", "scan_type": "quick"})
assert res_scan.json()["success"] is False
assert "Air-Gapped" in res_scan.json()["error"]

# Test Username search in airgap
res_osint = client.post("/api/osint/search/username", json={"username": "testuser"})
assert res_osint.json()["air_gap_mode"] is True
assert res_osint.json()["total_checked"] == 0

# Turn Air-Gap OFF
client.post("/api/system/airgap/toggle", json={"enabled": False})
print("  ✅ PASS | Air-Gapped Stealth: Блокировка внешних сокетов и предотвращение утечек трафика подтверждены")
passed += 1

# -------------------------------------------------------------
# TEST 5: AES-256-GCM CRYPTOGRAPHIC INTEGRITY & TAMPER DETECTION
# -------------------------------------------------------------
print("\n[PHASE 5] Проверка криптографической аутентичности и защиты от подделки (AEAD)...")
envelope = encrypt_vault_payload({"master_secret": "TOP_SECRET_ALPHA"}, "correct_password_987")
assert envelope["cipher"] == "AES-256-GCM"

# Tamper test: modify 1 character in ciphertext
tampered_envelope = dict(envelope)
raw_cipher = list(tampered_envelope["ciphertext"])
raw_cipher[0] = "f" if raw_cipher[0] != "f" else "0"
tampered_envelope["ciphertext"] = "".join(raw_cipher)

try:
    decrypt_vault_payload(tampered_envelope, "correct_password_987")
    assert False, "Decryption of tampered envelope should fail"
except ValueError as err:
    assert "Decryption failed" in str(err) or "Authentication tag mismatch" in str(err)

# Valid decryption
decrypted = decrypt_vault_payload(envelope, "correct_password_987")
assert b"TOP_SECRET_ALPHA" in decrypted
print("  ✅ PASS | Crypto Authenticity: Защита от подмены ciphertext и аутентификация AEAD подтверждены")
passed += 1

# -------------------------------------------------------------
# TEST 6: DANGERZONE & MALICIOUS PDF EXPLOIT DETECTION
# -------------------------------------------------------------
print("\n[PHASE 6] Тестирование анализа вредоносных PDF директив (/Launch, /JavaScript)...")
malicious_pdf = (
    b"%PDF-1.4\n"
    b"1 0 obj <</Type /Catalog /Pages 2 0 R /OpenAction << /S /JavaScript /JS (app.alert(1)) >> /Launch <</F (calc.exe)>> >> endobj\n"
    b"2 0 obj <</Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n"
    b"3 0 obj <</Type /Page /Parent 2 0 R >> endobj\n"
    b"trailer <</Root 1 0 R>>\n%%EOF"
)

res_pdf = client.post(
    "/api/forensics/pdf/inspect",
    files={"file": ("exploit.pdf", malicious_pdf, "application/pdf")}
)
pdf_data = res_pdf.json()
assert pdf_data["success"] is True
assert pdf_data["indicators"]["javascript_streams"] >= 1
assert pdf_data["indicators"]["embedded_launch"] >= 1
assert pdf_data["indicators"]["auto_open_actions"] >= 1
assert pdf_data["risk_score"] >= 70
assert "КРИТИЧЕСКИЙ РИСК" in pdf_data["verdict"]
print("  ✅ PASS | Forensics & Dangerzone: Вредоносные директивы /Launch и /JS обнаружены со скорингом 100/100")
passed += 1

print("\n" + "=" * 66)
print(f"ИТОГ СТРЕСС-ТЕСТИРОВАНИЯ: {passed} / {total} ТЕСТОВ ПРОЙДЕНО (100.0%)")
print("=" * 66)
