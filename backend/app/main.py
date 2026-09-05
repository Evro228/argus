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
    crypto,
    forensics,
    network,
    opsec,
    osint,
    system,
)

# In production, disable interactive docs and openapi schema unless explicitly requested
ENABLE_DOCS = os.getenv("ARGUS_ENABLE_DOCS", "0") == "1"

app = FastAPI(
    title="ARGUS // Tactical Intelligence & Defense",
    description="Единая рабочая станция кибербезопасности, OSINT, GEOINT, криптографии и аудита кода",
    version="2.0.0",
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
    allow_headers=["*"],
)

# Rate limiting & Security Headers Middleware
RATE_LIMIT_WINDOW = 60
RATE_LIMIT_MAX_REQUESTS = 300
client_request_history = defaultdict(list)

@app.middleware("http")
async def security_and_rate_limit_middleware(request: Request, call_next):
    # Apply rate limiting to API endpoints
    if request.url.path.startswith("/api/"):
        client_ip = request.client.host if request.client else "127.0.0.1"
        now = time.time()
        timestamps = [t for t in client_request_history[client_ip] if now - t < RATE_LIMIT_WINDOW]

        if len(timestamps) >= RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"success": False, "error": "Превышен лимит частоты запросов к API."},
                headers={"Retry-After": "60"},
            )
        timestamps.append(now)
        client_request_history[client_ip] = timestamps

    # Optional API key protection if configured in environment
    api_key = os.getenv("ARGUS_API_KEY", "").strip()
    if api_key and request.url.path.startswith("/api/") and request.url.path != "/api/health":
        auth_header = request.headers.get("X-API-Key") or request.headers.get("Authorization", "").replace("Bearer ", "")
        if auth_header != api_key:
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"success": False, "error": "Доступ запрещен: требуется валидный API-ключ."},
            )

    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
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


@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "ARGUS Tactical Cockpit",
        "version": "2.0.0",
    }


# Mount static frontend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(current_dir)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8800, reload=True)
