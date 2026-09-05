from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

router = APIRouter()

class AnalysisReportRequest(BaseModel):
    title: str = "Сводный отчет безопасности"
    scan_type: str = "combined"
    findings: List[Dict[str, Any]] = []
    target_info: Optional[str] = None

@router.post("/report/generate")
def generate_security_report(req: AnalysisReportRequest):
    """
    Generates a structured executive summary based on Anthropic Cybersecurity methodology.
    """
    critical_count = sum(1 for f in req.findings if f.get("severity") == "CRITICAL")
    high_count = sum(1 for f in req.findings if f.get("severity") == "HIGH")
    medium_count = sum(1 for f in req.findings if f.get("severity") == "MEDIUM")
    
    # Calculate posture score: start at 100, deduct points
    score = max(0, 100 - (critical_count * 25 + high_count * 10 + medium_count * 3))
    
    if score >= 90:
        verdict = "ОТЛИЧНЫЙ УРОВЕНЬ ЗАЩИТЫ"
        badge_color = "emerald"
    elif score >= 70:
        verdict = "УДОВЛЕТВОРИТЕЛЬНО (ТРЕБУЕТСЯ ВНИМАНИЕ)"
        badge_color = "amber"
    else:
        verdict = "КРИТИЧЕСКИЙ РИСК КОМПРОМЕТАЦИИ"
        badge_color = "rose"

    remediations = []
    for idx, item in enumerate(req.findings[:10], 1):
        rem = item.get("remediation")
        if rem and rem not in remediations:
            remediations.append(f"{idx}. {item.get('type', 'Уязвимость')}: {rem}")

    if not remediations:
        remediations.append("Регулярно проводите сканирование репозиториев перед коммитом в production.")
        remediations.append("Настройте pre-commit хуки с gitleaks для автоматической блокировки секретов.")

    return {
        "success": True,
        "title": req.title,
        "security_score": score,
        "verdict": verdict,
        "badge_color": badge_color,
        "summary": {
            "critical_issues": critical_count,
            "high_issues": high_count,
            "medium_issues": medium_count,
            "total_analyzed": len(req.findings)
        },
        "key_remediations": remediations,
        "timestamp": "2026-09-05"
    }
