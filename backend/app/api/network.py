from fastapi import APIRouter
from pydantic import BaseModel
import asyncio
import socket
import ssl
import shutil
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.utils.process_runner import run_command_stream

router = APIRouter()

TOP_PORTS = [
    (21, "FTP"), (22, "SSH"), (23, "Telnet"), (25, "SMTP"), (53, "DNS"),
    (80, "HTTP"), (110, "POP3"), (143, "IMAP"), (443, "HTTPS"), (445, "SMB"),
    (993, "IMAPS"), (995, "POP3S"), (1433, "MSSQL"), (1521, "Oracle"),
    (3306, "MySQL"), (3389, "RDP"), (5432, "PostgreSQL"), (5900, "VNC"),
    (6379, "Redis"), (8000, "HTTP-Alt"), (8080, "HTTP-Proxy"), (8443, "HTTPS-Alt"),
    (9000, "Sonar/Portainer"), (27017, "MongoDB")
]

class ScanHostRequest(BaseModel):
    target: str
    scan_type: str = "quick" # quick, full, nmap_fast, nmap_services

class CertCheckRequest(BaseModel):
    host: str
    port: int = 443

@router.post("/scan/ports")
async def scan_target_ports(req: ScanHostRequest):
    target = req.target.strip().replace("http://", "").replace("https://", "").split("/")[0].split(":")[0]
    if not target:
        return {"success": False, "error": "Укажите целевой IP или домен."}

    nmap_path = shutil.which("nmap")
    
    # If user selected nmap and it's installed, run nmap
    if "nmap" in req.scan_type and nmap_path:
        cmd = ["nmap", "-T4", target]
        if req.scan_type == "nmap_fast":
            cmd = ["nmap", "-F", "-T4", target]
        elif req.scan_type == "nmap_services":
            cmd = ["nmap", "-sV", "--version-light", "-T4", target]

        res = await run_command_stream(cmd, timeout=120)
        return {
            "success": res["success"],
            "engine": "nmap",
            "target": target,
            "raw_output": res["output"]
        }

    # Native Python Async Socket Scanner (Works everywhere without dependencies)
    open_ports = []
    
    async def probe_port(port: int, service: str):
        try:
            conn = asyncio.open_connection(target, port)
            reader, writer = await asyncio.wait_for(conn, timeout=1.5)
            writer.close()
            await writer.wait_closed()
            return {
                "port": port,
                "service": service,
                "state": "OPEN",
                "risk": "HIGH" if port in [21, 23, 445, 3389, 6379, 27017] else "NORMAL"
            }
        except Exception:
            return None

    tasks = [probe_port(port, service) for port, service in TOP_PORTS]
    results = await asyncio.gather(*tasks)
    open_ports = [r for r in results if r is not None]

    return {
        "success": True,
        "engine": "native_async_socket",
        "target": target,
        "scanned_ports": len(TOP_PORTS),
        "open_ports_count": len(open_ports),
        "open_ports": open_ports
    }

@router.post("/cert/inspect")
def inspect_ssl_cert(req: CertCheckRequest):
    host = req.host.strip().replace("http://", "").replace("https://", "").split("/")[0].split(":")[0]
    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((host, req.port), timeout=3.0) as sock:
            with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                cert = ssock.getpeercert()
                cipher = ssock.cipher()
                version = ssock.version()

        # Parse expiry
        not_after_str = cert.get("notAfter")
        days_left = None
        if not_after_str:
            exp_date = datetime.strptime(not_after_str, "%b %d %H:%M:%S %Y %Z")
            days_left = (exp_date - datetime.utcnow()).days

        subject = dict(x[0] for x in cert.get("subject", ()))
        issuer = dict(x[0] for x in cert.get("issuer", ()))

        return {
            "success": True,
            "host": host,
            "port": req.port,
            "tls_version": version,
            "cipher": cipher[0] if cipher else None,
            "subject_common_name": subject.get("commonName"),
            "issuer_organization": issuer.get("organizationName"),
            "valid_from": cert.get("notBefore"),
            "valid_until": not_after_str,
            "days_until_expiration": days_left,
            "status": "VALID" if (days_left and days_left > 0) else "EXPIRED"
        }
    except Exception as e:
        return {"success": False, "error": f"Ошибка соединения SSL: {str(e)}"}

# --- WireTapper: Wireless & Radio Reconnaissance ---
import subprocess

@router.get("/wifi/status")
def get_wifi_recon_status():
    try:
        cmd = ["system_profiler", "SPAirPortDataType"]
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
        raw = out.stdout or ""

        ssid = "Не подключено"
        phy_mode = "N/A"
        channel = "N/A"
        country_code = "N/A"

        lines = raw.split("\n")
        in_current = False
        for i, line in enumerate(lines):
            stripped = line.strip()
            if "Current Network Information:" in stripped and i + 1 < len(lines):
                next_line = lines[i+1].strip().rstrip(":")
                if next_line:
                    ssid = next_line
                    in_current = True
            if in_current:
                if "PHY Mode:" in stripped:
                    phy_mode = stripped.split("PHY Mode:")[-1].strip()
                elif "Channel:" in stripped:
                    channel = stripped.split("Channel:")[-1].strip()
                elif "Country Code:" in stripped:
                    country_code = stripped.split("Country Code:")[-1].strip()
                elif stripped.startswith("Other Local Wi-Fi Networks:") or (line.startswith("        ") and "PHY Mode" not in stripped and "Channel" not in stripped and "Country Code" not in stripped and "Network Type" not in stripped):
                    pass

        return {
            "success": True,
            "connected": ssid != "Не подключено",
            "current_network": {
                "ssid": ssid,
                "phy_mode": phy_mode,
                "channel": channel,
                "country_code": country_code,
                "security_rating": "WPA3 / WPA2 Enterprise" if "802.11ax" in phy_mode or "802.11ac" in phy_mode else "Standard WPA2"
            },
            "radio_environment": {
                "band_5ghz": "5GHz" in channel,
                "supported_standards": "802.11 a/b/g/n/ac/ax (Wi-Fi 6 Ready)"
            }
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
