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
        f"*Сформировано автоматически тактическим комплексом кибербезопасности ARGUS v2.7.0.*  ",
        f"*Конфиденциально. Предназначено для команды информационной безопасности и CISO.*",
    ])

    return {
        "success": True,
        "filename": f"ARGUS-Security-Report-{date_file}.md",
        "markdown": "\n".join(md_lines),
    }


class AnalystAssistRequest(BaseModel):
    query: str
    context: str | None = None


@router.post("/assist")
async def assist_operator(req: AnalystAssistRequest):
    """
    Autonomous AI SOC Copilot grounded directly in the 818 Anthropic Cybersecurity Playbooks.
    Supports local Ollama if available, with instant offline fallback synthesis.
    """
    import os
    import re
    import httpx
    from backend.app.api.system import _load_skills, SKILLS_PATH, is_air_gap_enabled

    clean_query = req.query.strip()
    if not clean_query:
        return {"success": False, "error": "Запрос не может быть пустым."}

    # 1. Search across 818 Anthropic Skills
    all_skills = _load_skills()
    tokens = [t for t in re.split(r"[\s,;:\-_/]+", clean_query.lower()) if len(t) > 2]

    scored = []
    for s in all_skills:
        score = 0
        name = s.get("name", "").lower()
        desc = s.get("description", "").lower()
        for tok in tokens:
            if tok in name:
                score += 5
            elif tok in desc:
                score += 2
        if score > 0:
            scored.append((score, s))

    scored.sort(key=lambda x: x[0], reverse=True)
    top_skills = [item[1] for item in scored[:5]]

    # If no exact token match, provide top foundational defensive skills
    if not top_skills and all_skills:
        top_skills = all_skills[:3]

    # 2. Extract playbooks content snippets
    matched_playbooks = []
    playbook_snippets = []
    suggested_commands = []

    for s in top_skills:
        s_name = s.get("name", "")
        skill_file = os.path.join(SKILLS_PATH, "skills", s_name, "SKILL.md")
        content_preview = ""
        if os.path.exists(skill_file):
            try:
                with open(skill_file, "r", encoding="utf-8") as f:
                    full_text = f.read()
                    content_preview = full_text[:1200]
                    # Extract shell command snippets
                    cmd_matches = re.findall(r"```(?:bash|sh|shell)?\s*\n([\s\S]*?)```", full_text)
                    for block in cmd_matches:
                        for line in block.split("\n"):
                            line = line.strip()
                            if line and not line.startswith("#") and len(line) > 4 and line not in suggested_commands:
                                suggested_commands.append(line)
                                if len(suggested_commands) >= 6:
                                    break
            except Exception:
                pass

        matched_playbooks.append({
            "name": s_name,
            "description": s.get("description", ""),
            "has_doc": bool(content_preview),
        })
        if content_preview:
            playbook_snippets.append(f"### Playbook: {s_name}\n{content_preview}")

    # Fallback default commands if none parsed
    if not suggested_commands:
        suggested_commands = [
            f"nmap -sV -sC -T4 {req.context or '127.0.0.1'}",
            "openssl s_client -connect target.com:443 -tls1_2",
            "trufflehog filesystem --directory=. --only-verified",
            "yara -r /rules/malware_index.yar ./payloads/",
        ]

    # 3. Check for Local Ollama if not Air-Gapped
    ollama_response = None
    air_gap = is_air_gap_enabled()
    if not air_gap:
        try:
            async with httpx.AsyncClient(verify=True, timeout=2.0) as client:
                prompt_text = (
                    f"You are the ARGUS AI SOC Copilot, an elite defensive cybersecurity analyst.\n"
                    f"User Query: {clean_query}\n"
                    f"Context: {req.context or 'Workstation & perimeter defense'}\n"
                    f"Grounded Playbooks: {', '.join([p['name'] for p in matched_playbooks])}\n"
                    f"Provide actionable, technical investigation and remediation steps in Russian."
                )
                ollama_req = await client.post(
                    "http://127.0.0.1:11434/api/generate",
                    json={"model": "llama3", "prompt": prompt_text, "stream": False},
                )
                if ollama_req.status_code == 200:
                    ollama_data = ollama_req.json()
                    ollama_response = ollama_data.get("response")
        except Exception:
            pass

    provider = "Ollama Local LLM" if ollama_response else "ARGUS Autonomous SOC Engine (Anthropic Playbooks Grounded)"

    # 4. Formulate structured response if Ollama was not active
    if not ollama_response:
        primary_skill = matched_playbooks[0]["name"] if matched_playbooks else "incident-response"
        md_response = [
            f"### 🛡️ Тактический анализ инцидента: `{clean_query}`",
            f"",
            f"**Заземление на плейбуки Anthropic:** найдено **{len(matched_playbooks)}** профильных стандартов реагирования.",
            f"",
            f"#### 1. Идентификация и классификация (MITRE ATT&CK & NIST CSF)",
            f"- **Вектор угрозы:** Эксплуатация уязвимостей конфигурации, учетных записей или сетевого периметра.",
            f"- **Основной плейбук:** [`{primary_skill}`] (доступен в Хабе плейбуков `⌘9`).",
            f"- **Уровень изоляции:** Режим Air-Gap {'АКТИВЕН (строгий stealth)' if air_gap else 'ВЫКЛЮЧЕН (online telemetry)'}.",
            f"",
            f"#### 2. Пошаговый алгоритм расследования и локализации",
            f"1. **Изоляция источника:** Немедленно проверьте активные сетевые сокеты и внешние соединения.",
            f"2. **Сбор криминалистических артефактов:** Снимите дамп памяти процесса и журналы событий (EVTX / syslog).",
            f"3. **Корреляция с сигнатурами:** Запустите сканирование YARA / Sigma по путям временных файлов.",
            f"4. **Устранение и харденинг:** Заблокируйте скомпрометированные ключи/токены, выполните смену учетных записей.",
            f"",
            f"#### 3. Рекомендуемые терминальные команды",
        ]
        for cmd in suggested_commands[:5]:
            md_response.append(f"```bash\n{cmd}\n```")
        final_answer = "\n".join(md_response)
    else:
        final_answer = ollama_response

    return {
        "success": True,
        "provider": provider,
        "query": clean_query,
        "air_gap_mode": air_gap,
        "matched_playbooks": matched_playbooks,
        "suggested_commands": suggested_commands[:6],
        "answer": final_answer,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


