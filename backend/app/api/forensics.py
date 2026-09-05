import io

from fastapi import APIRouter, File, UploadFile
from PIL import ExifTags, Image

router = APIRouter()


def convert_to_degrees(value):
    d = float(value[0])
    m = float(value[1])
    s = float(value[2])
    return d + (m / 60.0) + (s / 3600.0)


@router.post("/image/exif")
async def extract_image_exif(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        image = Image.open(io.BytesIO(contents))
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

                # If GPS tags are tuples/lists
                if gps_lat and gps_lon:
                    lat_deg = convert_to_degrees(
                        eval(gps_lat)
                        if isinstance(gps_lat, str) and "[" in gps_lat
                        else gps_lat
                    )
                    if gps_lat_ref == "S":
                        lat_deg = -lat_deg
                    lon_deg = convert_to_degrees(
                        eval(gps_lon)
                        if isinstance(gps_lon, str) and "[" in gps_lon
                        else gps_lon
                    )
                    if gps_lon_ref == "W":
                        lon_deg = -lon_deg
            except Exception:
                pass

    return {
        "success": True,
        "filename": file.filename,
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


# --- Dangerzone & PDF Security Inspector ---
@router.post("/pdf/inspect")
async def inspect_pdf_security(file: UploadFile = File(...)):
    contents = await file.read()
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

    return {
        "success": True,
        "filename": file.filename,
        "size_bytes": len(contents),
        "risk_score": min(100, risk_score),
        "verdict": verdict,
        "indicators": indicators,
        "warnings": warnings,
        "dangerzone_advice": "Для открытия подозрительного файла используйте Dangerzone для безопасной конвертации в пиксели.",
    }
