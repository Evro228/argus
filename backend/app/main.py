from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from backend.app.api import system, crypto, osint, audit, network, forensics, opsec, ai_analyst

app = FastAPI(
    title="CyberSec & OSINT Studio Cockpit",
    description="Единая рабочая станция кибербезопасности, OSINT, GEOINT, криптографии и аудита кода",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(system.router, prefix="/api/system", tags=["System & Tools"])
app.include_router(crypto.router, prefix="/api/crypto", tags=["Cryptography & Stego"])
app.include_router(osint.router, prefix="/api/osint", tags=["OSINT & Footprint"])
app.include_router(audit.router, prefix="/api/audit", tags=["Code & Secret Audit"])
app.include_router(network.router, prefix="/api/network", tags=["Network & Scanner"])
app.include_router(forensics.router, prefix="/api/forensics", tags=["Forensics & EXIF"])
app.include_router(opsec.router, prefix="/api/opsec", tags=["OPSEC & Privacy"])
app.include_router(ai_analyst.router, prefix="/api/analyst", tags=["AI Analyst"])

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "CyberSec & OSINT Studio",
        "version": "1.0.0"
    }

# Mount static frontend directory
current_dir = os.path.dirname(os.path.abspath(__file__))
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(current_dir)), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="127.0.0.1", port=8800, reload=True)
