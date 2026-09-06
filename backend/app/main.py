import os
import time
from collections import defaultdict
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from backend.app.api import (
    analyst,
    audit,
    cameras,
    config,
    crypto,
    forensics,
    geoint,
    network,
    opsec,
    osint,
    system,
    watcher,
)

# In production, disable interactive docs and openapi schema unless explicitly requested
ENABLE_DOCS = os.getenv("ARGUS_ENABLE_DOCS", "0") == "1"

app = FastAPI(
    title="ARGUS // Tactical Intelligence & Defense",
    description="Единая рабочая станция кибербезопасности, OSINT, GEOINT, криптографии и аудита кода",
    version="2.7.0",
    docs_url="/docs" if ENABLE_DOCS else None,
    redoc_url="/redoc" if ENABLE_DOCS else None,
    openapi_url="/openapi.json" if ENABLE_DOCS else None,
)

# Security-hardened CORS (strictly local origins, null origin removed)
ALLOWED_ORIGINS = os.getenv(
    "ARGUS_ALLOWED_ORIGINS",
    "http://127.0.0.1:8800,http://localhost:8800,http://127.0.0.1:3000,http://localhost:3000",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in ALLOWED_ORIGINS if o.strip()],
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=[
        "Content-Type",
        "X-ARGUS-Token",
        "X-API-Key",
        "Authorization",
        "Accept",
        "Origin",
        "X-Requested-With",
    ],
)

# Rate limiting & Security Headers Middleware
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 600
client_request_history = defaultdict(list)
_last_rate_limit_cleanup = time.time()

# Host validation to block DNS Rebinding
VALID_HOSTS = {"127.0.0.1", "localhost", "testserver"}

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    global _last_rate_limit_cleanup

    # 1. DNS Rebinding & Host Header Injection Protection (Anthropic Skill: testing-for-host-header-injection)
    for h_name in ("host", "x-forwarded-host", "x-host", "x-forwarded-server"):
        h_val = request.headers.get(h_name, "").split(":")[0].strip().lower()
        if h_val and h_val not in VALID_HOSTS and not h_val.startswith("127."):
            return JSONResponse(
                status_code=status.HTTP_403_FORBIDDEN,
                content={"success": False, "error": f"Запрещенный заголовок {h_name} (Host Injection & DNS Rebinding Protection)."},
            )

    # 2. Apply rate limiting to API endpoints with Memory Leak GC (V-05)
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()

        # Periodic garbage collection for stale IP tracking entries (every 60s)
        if now - _last_rate_limit_cleanup > 60:
            stale_ips = [
                ip for ip, ts in client_request_history.items()
                if not ts or (now - ts[-1] > RATE_LIMIT_WINDOW * 2)
            ]
            for ip in stale_ips:
                client_request_history.pop(ip, None)
            # Hard cap on tracked unique clients to prevent memory exhaustion
            if len(client_request_history) > 2000:
                oldest_ips = sorted(
                    client_request_history.keys(),
                    key=lambda k: client_request_history[k][-1] if client_request_history[k] else 0
                )[:500]
                for ip in oldest_ips:
                    client_request_history.pop(ip, None)
            _last_rate_limit_cleanup = now

        timestamps = [t for t in client_request_history[client_ip] if now - t < RATE_LIMIT_WINDOW]

        if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"success": False, "error": "Превышен лимит частоты запросов к API."},
                headers={"Retry-After": "60"},
            )
        timestamps.append(now)
        client_request_history[client_ip] = timestamps

    # 3. Localhost IPC Token Protection (Drive-by & Web-to-Localhost defense)
    ipc_token = os.getenv("ARGUS_IPC_TOKEN", "").strip()
    if ipc_token and request.url.path.startswith("/api/") and request.url.path != "/api/health":
        import secrets
        auth_header = request.headers.get("Authorization") or ""
        auth_token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else auth_header.strip()
        provided_token = (
            request.headers.get("X-ARGUS-Token")
            or request.headers.get("X-API-Key")
            or auth_token
            or ""
        ).strip()

        # Constant-time comparison defeats timing side-channels
        if not secrets.compare_digest(provided_token, ipc_token):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "error": "Доступ запрещен: требуется валидный токен безопасности ARGUS (X-ARGUS-Token)."},
            )

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=()"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response

# API Routers
app.include_router(system.router, prefix="/api/system", tags=["System & Tools"])
app.include_router(crypto.router, prefix="/api/crypto", tags=["Cryptography & Stego"])
app.include_router(osint.router, prefix="/api/osint", tags=["OSINT & Footprint"])
app.include_router(audit.router, prefix="/api/audit", tags=["Code & Secret Audit"])
app.include_router(network.router, prefix="/api/network", tags=["Network & Scanner"])
app.include_router(forensics.router, prefix="/api/forensics", tags=["Forensics & EXIF"])
app.include_router(opsec.router, prefix="/api/opsec", tags=["OPSEC & Privacy"])
app.include_router(analyst.router, prefix="/api/analyst", tags=["Security Analyst"])
app.include_router(geoint.router, prefix="/api/geoint", tags=["GEOINT & Tactical Radar"])
app.include_router(cameras.router, prefix="/api/cameras", tags=["Open CCTV & Webcams"])
app.include_router(cameras.router, prefix="/api/geoint/cameras", tags=["Open CCTV & Webcams"])
app.include_router(config.router, prefix="/api/system/config", tags=["API Keys & Config"])
app.include_router(watcher.router, prefix="/api/watcher", tags=["Autonomous Watcher Daemon"])


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "ARGUS Tactical Cockpit",
        "version": "2.7.0",
    }


# Mount static frontend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(current_dir)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8800, reload=True)
