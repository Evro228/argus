import ast
import io
import math
import os
import re

from fastapi import APIRouter, File, HTTPException, UploadFile, status
from PIL import ExifTags, Image

router = APIRouter()

MAX_UPLOAD_SIZE = 15 * 1024 * 1024  # 15 MB threshold
Image.MAX_IMAGE_PIXELS = 25_000_000  # 25 Megapixels threshold


async def read_limited_file(file: UploadFile, max_bytes: int = MAX_UPLOAD_SIZE) -> bytes:
    buffer = io.BytesIO()
    read_size = 0
    while chunk := await file.read(1024 * 1024):
        read_size += len(chunk)
        if read_size > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=f"Размер файла превышает лимит {max_bytes // (1024 * 1024)} МБ",
            )
        buffer.write(chunk)
    return buffer.getvalue()


def convert_to_degrees(value):
    try:
        d = float(value[0])
        m = float(value[1])
        s = float(value[2])
        deg = d + (m / 60.0) + (s / 3600.0)
        return deg if math.isfinite(deg) else None
    except Exception:
        return None


def safe_parse_coordinates(coord_val):
    """Parse coordinate string or tuple safely with input bound and recursion guard."""
    if coord_val is None:
        return None
    val = coord_val
    if isinstance(val, str):
        if len(val) > 200:
            return None
        if "[" in val or "(" in val:
            try:
                val = ast.literal_eval(val)
            except (ValueError, SyntaxError):
                return None
    if isinstance(val, (list, tuple)) and len(val) == 3:
        try:
            parsed = [float(x) for x in val]
            return parsed if all(math.isfinite(x) for x in parsed) else None
        except (TypeError, ValueError):
            return None
    return None


@router.post("/image/exif")
async def extract_image_exif(file: UploadFile = File(...)):
    try:
        contents = await read_limited_file(file)
    except HTTPException as e:
        return {"success": False, "error": e.detail}

    try:
        image = Image.open(io.BytesIO(contents))
    except Image.DecompressionBombError:
        return {
            "success": False,
            "error": "Обнаружена декомпрессионная бомба изображения (DecompressionBomb).",
        }
    except Exception as e:
        return {"success": False, "error": f"Не удалось открыть изображение: {e!s}"}

    exif_data = {}
    gps_info = {}
    lat_deg = None
    lon_deg = None

    # Check for synthetic generation metadata in image info
    generator_metadata = {}
    for k in ["parameters", "prompt", "workflow", "Comment"]:
        if k in image.info:
            generator_metadata[k] = str(image.info[k])[:1000]

    raw_exif = image.getexif()
    if raw_exif:
        for tag_id, val in raw_exif.items():
            tag_name = ExifTags.TAGS.get(tag_id, str(tag_id))
            if tag_name == "GPSInfo":
                gps_info_raw = val
                for g_id, g_val in gps_info_raw.items():
                    g_tag = ExifTags.GPSTAGS.get(g_id, str(g_id))
                    gps_info[g_tag] = str(g_val)
            else:
                exif_data[tag_name] = str(val)[:150]

        # Extract GPS if available
        if gps_info:
            try:
                gps_lat = gps_info.get("GPSLatitude")
                gps_lat_ref = gps_info.get("GPSLatitudeRef")
                gps_lon = gps_info.get("GPSLongitude")
                gps_lon_ref = gps_info.get("GPSLongitudeRef")

                parsed_lat = safe_parse_coordinates(gps_lat)
                if parsed_lat:
                    raw_lat = convert_to_degrees(parsed_lat)
                    if raw_lat is not None and -90.0 <= raw_lat <= 90.0:
                        lat_deg = -raw_lat if gps_lat_ref == "S" else raw_lat

                parsed_lon = safe_parse_coordinates(gps_lon)
                if parsed_lon:
                    raw_lon = convert_to_degrees(parsed_lon)
                    if raw_lon is not None and -180.0 <= raw_lon <= 180.0:
                        lon_deg = -raw_lon if gps_lon_ref == "W" else raw_lon
            except Exception:
                pass

    raw_filename = file.filename or "image_file"
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(raw_filename))[:120]

    return {
        "success": True,
        "filename": safe_filename,
        "format": image.format,
        "dimensions": f"{image.width}x{image.height}",
        "has_gps": lat_deg is not None and lon_deg is not None,
        "coordinates": {
            "latitude": lat_deg,
            "longitude": lon_deg,
            "osm_url": f"https://www.openstreetmap.org/?mlat={lat_deg}&mlon={lon_deg}#map=16/{lat_deg}/{lon_deg}"
            if lat_deg
            else None,
            "google_maps_url": f"https://www.google.com/maps?q={lat_deg},{lon_deg}"
            if lat_deg
            else None,
        },
        "camera": {
            "make": exif_data.get("Make", "Unknown"),
            "model": exif_data.get("Model", "Unknown"),
            "software": exif_data.get("Software", "Unknown"),
            "datetime": exif_data.get("DateTime", "Unknown"),
        },
        "is_synthetic": bool(generator_metadata),
        "is_ai_generated": bool(generator_metadata),
        "generator_metadata": generator_metadata,
        "ai_metadata": generator_metadata,
        "exif_summary": exif_data,
    }


# PDF security inspection
@router.post("/pdf/inspect")
async def inspect_pdf_security(file: UploadFile = File(...)):
    try:
        contents = await read_limited_file(file)
    except HTTPException as e:
        return {"success": False, "error": e.detail}

    if not contents.startswith(b"%PDF"):
        return {
            "success": False,
            "error": "Загруженный файл не является корректным PDF документом.",
        }

    content_str = contents.decode("latin-1", errors="ignore")

    indicators = {
        "javascript_streams": len(content_str.split("/JavaScript"))
        - 1
        + len(content_str.split("/JS"))
        - 1,
        "auto_open_actions": len(content_str.split("/OpenAction"))
        - 1
        + len(content_str.split("/AA"))
        - 1,
        "embedded_launch": len(content_str.split("/Launch")) - 1,
        "embedded_files": len(content_str.split("/EmbeddedFiles")) - 1,
        "uri_links": len(content_str.split("/URI")) - 1,
        "forms": len(content_str.split("/AcroForm")) - 1,
    }

    risk_score = 0
    warnings = []
    if indicators["javascript_streams"] > 0:
        risk_score += 45
        warnings.append(
            f"Обнаружен встроенный JavaScript код ({indicators['javascript_streams']} вхождений). Высокий риск выполнения скриптов!"
        )
    if indicators["auto_open_actions"] > 0:
        risk_score += 35
        warnings.append(
            "Обнаружены автоматические действия OpenAction при открытии файла!"
        )
    if indicators["embedded_launch"] > 0:
        risk_score += 50
        warnings.append(
            "Критический риск: документ содержит директивы /Launch для запуска системных программ!"
        )
    if indicators["embedded_files"] > 0:
        risk_score += 20
        warnings.append(
            f"Обнаружены вложенные скрытые файлы ({indicators['embedded_files']})."
        )

    verdict = "БЕЗОПАСНЫЙ ДОКУМЕНТ"
    if risk_score >= 50:
        verdict = "КРИТИЧЕСКИЙ РИСК (ПОДОЗРЕНИЕ НА ЭКСПЛОЙТ)"
    elif risk_score >= 20:
        verdict = "ПОТЕНЦИАЛЬНО ОПАСНЫЙ (ТРЕБУЕТСЯ ПЕСОЧНИЦА DANGERZONE)"

    raw_filename = file.filename or "document.pdf"
    safe_filename = re.sub(r"[^a-zA-Z0-9_.-]", "_", os.path.basename(raw_filename))[:120]

    return {
        "success": True,
        "filename": safe_filename,
        "size_bytes": len(contents),
        "risk_score": min(100, risk_score),
        "verdict": verdict,
        "indicators": indicators,
        "warnings": warnings,
        "dangerzone_advice": "Для открытия подозрительного файла используйте Dangerzone для безопасной конвертации в пиксели.",
    }


# Threat inspection engine
from pydantic import BaseModel
from backend.app.utils.threat_rules import GLOBAL_THREAT_ENGINE


class ThreatScanRequest(BaseModel):
    content: str
    custom_rules: list[dict] | None = None
    target_name: str | None = "payload.txt"


@router.get("/rules/catalog")
@router.get("/rules/catalog/")
def get_threat_rules_catalog():
    """
    Возвращает каталог встроенных сигнатур YARA и правил обнаружения Sigma.
    """
    return GLOBAL_THREAT_ENGINE.get_catalog()


@router.post("/rules/scan")
@router.post("/rules/scan/")
def scan_text_threat_rules(req: ThreatScanRequest):
    """
    Сканирует переданный текст или код на наличие сигнатур веб-шеллов,
    бэкдоров, подозрительных команд PowerShell и LOLBins.
    """
    res = GLOBAL_THREAT_ENGINE.scan_text(req.content, req.custom_rules)
    return {
        **res,
        "target_name": req.target_name,
    }


@router.post("/rules/scan/file")
@router.post("/rules/scan/file/")
async def scan_file_threat_rules(file: UploadFile = File(...)):
    """
    Сканирует загруженный файл на наличие сигнатур вредоносного ПО YARA/Sigma.
    """
    try:
        contents = await read_limited_file(file)
    except HTTPException as e:
        return {"success": False, "error": e.detail}

    text_repr = contents.decode("latin-1", errors="ignore")
    res = GLOBAL_THREAT_ENGINE.scan_text(text_repr)
    safe_name = re.sub(r"[^a-zA-Z0-9_.-]", "_", file.filename or "file.bin")[:100]

    return {
        **res,
        "filename": safe_name,
        "size_bytes": len(contents),
    }

