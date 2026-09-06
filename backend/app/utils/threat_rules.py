"""
ARGUS Threat Rules Engine (YARA & Sigma Signatures)
Autonomous in-memory parser and pattern matcher for webshells, LOLBins, reverse shells, and IOCs.
Requires zero external C-dependencies; provides deterministic high-speed scanning.
"""

import re
from typing import Any, Dict, List, Optional

BUILTIN_YARA_RULES = [
    {
        "id": "YARA_WEBSHELL_PHP_GENERIC",
        "name": "PHP Generic WebShell & Code Execution",
        "category": "WebShell",
        "severity": "CRITICAL",
        "description": "Обнаружены опасные конструкции удаленного исполнения PHP кода (eval, assert, base64_decode, system).",
        "patterns": [
            r"eval\s*\(\s*(?:base64_decode|gzinflate|gzuncompress|str_rot13)\b",
            r"(?:system|shell_exec|passthru|exec|popen)\s*\(\s*\$_(?:GET|POST|REQUEST|COOKIE)",
            r"assert\s*\(\s*\$_(?:GET|POST|REQUEST)",
            r"\$_(?:POST|GET|REQUEST)\[[^\]]+\]\s*\(\s*\$_(?:POST|GET|REQUEST)",
        ],
        "condition": "any",
    },
    {
        "id": "YARA_WEBSHELL_FAMILIES",
        "name": "Known WebShell Signatures (c99 / r57 / b374k / WSO)",
        "category": "WebShell",
        "severity": "CRITICAL",
        "description": "Обнаружены сигнатуры известных хакерских веб-оболочек (c99shell, r57shell, b374k, WSO).",
        "patterns": [
            r"c99shell|c99sh",
            r"r57shell|r57\.biz",
            r"b374k|ev4l",
            r"WSO\s+\d+\.\d+|FilesMan",
            r"ChinaChopper|eval\(request\(",
        ],
        "condition": "any",
    },
    {
        "id": "YARA_REVERSE_SHELL_PAYLOADS",
        "name": "Reverse Shell Interactivity (Bash / Python / Netcat)",
        "category": "ReverseShell",
        "severity": "CRITICAL",
        "description": "Обнаружен биндинг дескрипторов сокетов и шелла (reverse tcp connect-back payload).",
        "patterns": [
            r"(?:bash|sh)\s+-i\s+>&?\s*/dev/tcp/\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}/\d+",
            r"nc(?:lite)?(?:\.exe)?\s+(?:-e|-c)\s+(?:/bin/(?:ba)?sh|cmd(?:\.exe)?)",
            r"socket\.socket\b.*os\.dup2\s*\(s\.fileno\(\)",
            r"import\s+pty;?\s*pty\.spawn\s*\(\s*['\"]/bin/(?:ba)?sh['\"]\s*\)",
        ],
        "condition": "any",
    },
    {
        "id": "YARA_POWERSHELL_OBFUSCATION",
        "name": "Obfuscated PowerShell & Memory Downloader",
        "category": "Obfuscation",
        "severity": "HIGH",
        "description": "Обнаружены скрытые команды PowerShell с подавлением окон и base64-кодированием.",
        "patterns": [
            r"powershell(?:\.exe)?\s+-(?:nop|w\s+hidden|enc|encodedcommand|executionpolicy\s+bypass)\b",
            r"Net\.WebClient\)\.DownloadString\s*\(",
            r"Invoke-Expression\s*\(\s*(?:New-Object|Net\.WebClient)",
            r"IEX\s*\(\s*New-Object",
            r"\[System\.Convert\]::FromBase64String",
        ],
        "condition": "any",
    },
    {
        "id": "YARA_MIMIKATZ_SEKURLSA",
        "name": "Mimikatz & LSASS Credential Harvesting",
        "category": "CredentialAccess",
        "severity": "CRITICAL",
        "description": "Обнаружены строковые маркеры утилит дампа учетных записей Mimikatz / sekurlsa.",
        "patterns": [
            r"sekurlsa::logonpasswords",
            r"lsadump::sam",
            r"privilege::debug",
            r"token::elevate",
            r"kerberos::golden",
        ],
        "condition": "any",
    },
    {
        "id": "YARA_SUSPICIOUS_ELF_MACHO",
        "name": "Binary Injection & Exploit Primitives",
        "category": "Exploitation",
        "severity": "MEDIUM",
        "description": "Маркеры сборки шеллкодов и ассемблерных инъекций.",
        "patterns": [
            r"\\x31\\xc0\\x50\\x68\\x2f\\x2f\\x73\\x68",  # Linux x86 execve /bin/sh
            r"\\x48\\x31\\xff\\xb0\\x69\\x0f\\x05",      # x64 setuid
            r"mprotect\s*\(.*PROT_READ\s*\|\s*PROT_WRITE\s*\|\s*PROT_EXEC",
        ],
        "condition": "any",
    }
]

BUILTIN_SIGMA_RULES = [
    {
        "id": "SIGMA_LOLBIN_CERTUTIL",
        "title": "Suspicious Certutil Remote File Download",
        "category": "DefenseEvasion",
        "severity": "HIGH",
        "tags": ["attack.defense_evasion", "attack.t1105", "lolbin"],
        "patterns": [
            r"certutil(?:\.exe)?.*-(?:urlcache|split|f)\s+https?://",
        ],
        "description": "Использование легитимной утилиты certutil для загрузки полезной нагрузки из интернета.",
    },
    {
        "id": "SIGMA_LOLBIN_BITSADMIN",
        "title": "Bitsadmin Job File Transfer",
        "category": "DefenseEvasion",
        "severity": "HIGH",
        "tags": ["attack.persistence", "attack.t1197", "lolbin"],
        "patterns": [
            r"bitsadmin(?:\.exe)?\s+/transfer\s+\S+\s+https?://",
        ],
        "description": "Скрытная загрузка бинарных файлов через службу фоновой передачи BITS.",
    },
    {
        "id": "SIGMA_LOLBIN_MSHTA",
        "title": "MSHTA Inline Script Execution",
        "category": "Execution",
        "severity": "HIGH",
        "tags": ["attack.execution", "attack.t1218.005", "lolbin"],
        "patterns": [
            r"mshta(?:\.exe)?\s+(?:javascript|vbscript):",
        ],
        "description": "Выполнение вредоносного скрипта через Microsoft HTML Application Host (mshta).",
    },
    {
        "id": "SIGMA_CRED_LSASS_DUMP",
        "title": "Suspicious Process Access to LSASS",
        "category": "CredentialDumping",
        "severity": "CRITICAL",
        "tags": ["attack.credential_access", "attack.t1003.001"],
        "patterns": [
            r"comsvcs(?:\.dll)?.*MiniDump.*lsass",
            r"procdump(?:\.exe)?\s+.*-ma\s+lsass(?:\.exe)?",
        ],
        "description": "Создание дампа процесса LSASS для извлечения хэшей и паролей из памяти.",
    },
    {
        "id": "SIGMA_PRIV_ESC_SUDOERS",
        "title": "Sudoers File Modification / NOPASSWD",
        "category": "PrivilegeEscalation",
        "severity": "CRITICAL",
        "tags": ["attack.privilege_escalation", "attack.t1548.003"],
        "patterns": [
            r"ALL=\(ALL(?::ALL)?\)\s+NOPASSWD:\s*ALL",
            r"echo\s+['\"].*NOPASSWD.*['\"]\s+>>\s*/etc/sudoers",
        ],
        "description": "Добавление беспарольного доступа root в конфигурацию sudoers.",
    }
]


class ThreatRuleEngine:
    def __init__(self):
        self.yara_rules = list(BUILTIN_YARA_RULES)
        self.sigma_rules = list(BUILTIN_SIGMA_RULES)

    def get_catalog(self) -> Dict[str, Any]:
        return {
            "success": True,
            "total_yara_rules": len(self.yara_rules),
            "total_sigma_rules": len(self.sigma_rules),
            "total_signatures": len(self.yara_rules) + len(self.sigma_rules),
            "yara_rules": self.yara_rules,
            "sigma_rules": self.sigma_rules,
        }

    def scan_text(self, text: str, custom_rules: Optional[List[Dict[str, Any]]] = None) -> Dict[str, Any]:
        matched_rules = []
        rules_to_check = list(self.yara_rules)
        if custom_rules:
            rules_to_check.extend(custom_rules)

        # 1. YARA rules scan
        for rule in rules_to_check:
            patterns = rule.get("patterns", [])
            matches_in_rule = []
            for p in patterns:
                try:
                    for match in re.finditer(p, text, re.IGNORECASE):
                        start, end = match.span()
                        matched_snippet = text[max(0, start - 30):min(len(text), end + 30)].strip()
                        matches_in_rule.append({
                            "pattern": p,
                            "offset": start,
                            "length": end - start,
                            "snippet": matched_snippet,
                        })
                except Exception:
                    pass

            if matches_in_rule:
                matched_rules.append({
                    "engine": "YARA",
                    "id": rule["id"],
                    "name": rule["name"],
                    "category": rule.get("category", "Threat"),
                    "severity": rule.get("severity", "MEDIUM"),
                    "description": rule.get("description", ""),
                    "matches_count": len(matches_in_rule),
                    "matches": matches_in_rule[:5],
                })

        # 2. Sigma rules scan
        for sigma in self.sigma_rules:
            patterns = sigma.get("patterns", [])
            sigma_matches = []
            for p in patterns:
                try:
                    for match in re.finditer(p, text, re.IGNORECASE):
                        start, end = match.span()
                        sigma_matches.append({
                            "pattern": p,
                            "offset": start,
                            "snippet": text[max(0, start - 25):min(len(text), end + 25)].strip(),
                        })
                except Exception:
                    pass

            if sigma_matches:
                matched_rules.append({
                    "engine": "SIGMA",
                    "id": sigma["id"],
                    "name": sigma["title"],
                    "category": sigma.get("category", "Detection"),
                    "severity": sigma.get("severity", "HIGH"),
                    "description": sigma.get("description", ""),
                    "tags": sigma.get("tags", []),
                    "matches_count": len(sigma_matches),
                    "matches": sigma_matches[:5],
                })

        # Calculate max severity
        sev_rank = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1, "CLEAN": 0}
        max_sev = "CLEAN"
        for r in matched_rules:
            if sev_rank.get(r["severity"], 0) > sev_rank.get(max_sev, 0):
                max_sev = r["severity"]

        return {
            "success": True,
            "total_rules_evaluated": len(rules_to_check) + len(self.sigma_rules),
            "matched_rules_count": len(matched_rules),
            "max_severity": max_sev,
            "matches": matched_rules,
            "verdict": "THREAT_DETECTED" if matched_rules else "CLEAN",
        }


# Global engine singleton
GLOBAL_THREAT_ENGINE = ThreatRuleEngine()
