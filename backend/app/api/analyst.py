from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class AnalysisReportRequest(BaseModel):
    title: str = "Сводный отчет безопасности"
    scan_type: str = "combined"
    findings: list[dict[str, Any]] = []
    target_info: str | None = None


@router.post("/report/generate")
def generate_security_report(req: AnalysisReportRequest):
    """
    Generates an executive security posture summary and actionable remediation plan.
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
        remediations.append(
            "Регулярно проводите сканирование репозиториев перед коммитом в production."
        )
        remediations.append(
            "Настройте pre-commit хуки с gitleaks для автоматической блокировки секретов."
        )

    now_iso = datetime.now(timezone.utc).isoformat()

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
            "total_analyzed": len(req.findings),
        },
        "key_remediations": remediations,
        "timestamp": now_iso,
    }


@router.post("/report/export/markdown")
def export_report_markdown(req: AnalysisReportRequest):
    """
    Exports a structured CISO/SOC Executive Posture Report in Markdown.
    """
    report = generate_security_report(req)
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
    date_file = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")

    md_lines = [
        f"# 🛡️ ARGUS — EXECUTIVE SECURITY POSTURE REPORT",
        f"",
        f"**Отчёт:** {report['title']}  ",
        f"**Дата генерации:** {now_str}  ",
        f"**Цель / Хост:** {req.target_info or 'Локальная рабочая станция & репозитории'}  ",
        f"**Стандарт комплаенса:** OWASP ASVS v4.0 / NIST Cybersecurity Framework (CSF)  ",
        f"",
        f"---",
        f"",
        f"## 1. Executive Summary & Security Score",
        f"",
        f"| Метрика | Значение |",
        f"| :--- | :--- |",
        f"| **Security Posture Score** | **{report['security_score']} / 100** |",
        f"| **Общий вердикт** | **{report['verdict']}** |",
        f"| **Критических уязвимостей** | `{report['summary']['critical_issues']}` |",
        f"| **Высоких рисков (HIGH)** | `{report['summary']['high_issues']}` |",
        f"| **Средних рисков (MEDIUM)** | `{report['summary']['medium_issues']}` |",
        f"| **Всего проверено объектов** | `{report['summary']['total_analyzed']}` |",
        f"",
        f"---",
        f"",
        f"## 2. Priority Remediation Plan (План устранения рисков)",
        f"",
    ]

    for rem in report["key_remediations"]:
        md_lines.append(f"- [ ] {rem}")

    if req.findings:
        md_lines.extend([
            f"",
            f"---",
            f"",
            f"## 3. Детализация выявленных находок",
            f"",
            f"| Уровень | Категория | Файл / Источник | Описание |",
            f"| :--- | :--- | :--- | :--- |",
        ])
        for f in req.findings[:30]:
            sev = f.get("severity", "INFO")
            ftype = f.get("type", "Finding")
            ffile = f.get("file", f.get("path", "N/A"))
            fdesc = f.get("description", f.get("rule", "Обнаружено несоответствие политике безопасности"))
            md_lines.append(f"| **{sev}** | {ftype} | `{ffile}` | {fdesc} |")

    md_lines.extend([
        f"",
        f"---",
        f"",
        f"*Сформировано автоматически тактическим комплексом кибербезопасности ARGUS v2.2.0.*  ",
        f"*Конфиденциально. Предназначено для команды информационной безопасности и CISO.*",
    ])

    return {
        "success": True,
        "filename": f"ARGUS-Security-Report-{date_file}.md",
        "markdown": "\n".join(md_lines),
    }

