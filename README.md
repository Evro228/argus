# 👁️ ARGUS // Tactical Intelligence & Defense Cockpit

> **All-in-One Cyber Intelligence, Reconnaissance & Defense Operations Cockpit**  
> Единая рабочая станция тактической разведки, кибербезопасности, OSINT, 3D GEOINT / God's Eye View, аудита кода, криптографии и 818 плейбуков безопасности, объединяющая лучшие open-source инструменты мира в премиальном графическом центре управления.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Version](https://img.shields.io/badge/Version-2.2.0-emerald.svg)]()
[![Status](https://img.shields.io/badge/Status-Active%20Production-emerald.svg)]()
[![OWASP ASVS](https://img.shields.io/badge/OWASP%20ASVS-Compliant%20(20%2F20)-brightgreen.svg)]()
[![Tests](https://img.shields.io/badge/Tests-36%2F36%20PASS%20(100%25)-success.svg)]()
[![Stress Test](https://img.shields.io/badge/Stress%20Load-2200%20RPS-blueviolet.svg)]()

---

## 🌟 9 Тактических Станций ARGUS

Вместо запуска десятков консольных утилит с разными флагами вручную, **ARGUS** объединяет мощь ведущих инструментов безопасности в единый тактический кокпит:

| Станция | Технологии & Вдохновение | Ключевые возможности |
| :--- | :--- | :--- |
| **🛰️ God's Eye View (GEOINT)** | [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), Canvas 2D/3D Engine | Тактическая интерактивная карта угроз с кинетическими дугами кибератак, DEFCON-индикатором и тактической инспекцией узлов. |
| **🌐 Network Audit** | [Nmap](https://nmap.org/), [Nuclei](https://github.com/projectdiscovery/nuclei) | Сканирование открытых портов (нативное асинхронное ядро + Nmap), радио-сканирование Wi-Fi (SSID, WPA3/WPA2, PHY), оффлайн-корреляция CVE. |
| **🔎 OSINT & Recon** | [Sherlock](https://github.com/sherlock-project/sherlock), [theHarvester](https://github.com/laramies/theHarvester), [HIBP](https://haveibeenpwned.com/) | Поиск никнейма по 400+ сервисам, тактическая студия Google Dorks, локальная база утечек паролей по протоколу k-Anonymity (0 мс). |
| **🛡️ Vuln & Hardening** | [TruffleHog](https://github.com/trufflesecurity/trufflehog), [Gitleaks](https://github.com/gitleaks/gitleaks), CIS Benchmarks | Глубокий поиск утекших токенов (AWS, OpenAI, GitHub, SSH), CIS Docker Hardening, курируемый реестр словарей SecLists и PayloadsAllTheThings. |
| **🔐 Identity Vault** | [W3C WebAuthn Level 3](https://github.com/w3c/webauthn), Apple Secure Enclave, [StegCloak](https://github.com/KuroLabs/stegcloak) | Аппаратная биометрия Touch ID / Windows Hello TPM, генератор паролей (128+ бит энтропии), невидимая стеганография AES-256, одноразовые записки с физическим занулением RAM. |
| **📸 Media & Dangerzone** | [Dangerzone](https://github.com/freedomofpress/dangerzone), [Aves](https://github.com/deckerst/aves) | Scrubber метаданных EXIF и GPS-координат, инспектор вредоносных PDF-файлов с эвристическим анализом директив `/Launch` и `/JavaScript`. |
| **🎭 OPSEC & DLP** | [ClearURLs](https://github.com/ClearURLs/Addon), [Pasteguard](https://github.com/sgasser/pasteguard) | Очистка ссылок от трекеров слежки (ClearURLs), санитизация конфиденциальных данных перед отправкой, генерация временных рабочих профилей. |
| **📊 Security Analyst** | [NIST CSF](https://csrc.nist.gov/projects/cybersecurity-framework), [OWASP ASVS v4.0](https://owasp.org/www-project-application-security-verification-standard/) | Executive Security Posture Score, приоритизированный план устранения рисков, экспорт отчетов в Markdown (`.md`), печать в PDF, журнал сессий. |
| **📚 Tactics & Playbooks** | [Anthropic Cybersecurity Skills](https://github.com/anthropics) | Полнотекстовый хаб из **818 пошаговых плейбуков** реагирования, расследования и харденинга по стандартам MITRE ATT&CK и NIST CSF. |

---

## 🔒 Безопасность и Архитектурная Защита

ARGUS спроектирован с учетом жестких требований к безопасности рабочих станций ИБ:
- **Localhost IPC Token:** Защита от Drive-By атак и Web-to-Localhost (256-битный токен процесса, проверка за постоянное время `secrets.compare_digest`).
- **Защита от DNS Rebinding:** Фильтрация заголовков `Host`, `X-Forwarded-Host` и отсечение чужих доменов кодом `403 Forbidden`.
- **Физическое зануление памяти (RAM Zeroing):** Секреты и ключи шифрования перезаписываются нулевыми байтами через `ctypes.memset (0x00)` сразу после использования.
- **Air-Gapped Stealth Mode:** Тумблер моментальной изоляции: полная блокировка внешних сокетов и работа исключительно по локальным базам сигнатур.
- **W3C WebAuthn Passkeys Enclave:** Приватные ключи генерируются и изолируются внутри Apple Secure Enclave / TPM 2.0.

---

## 🚀 Быстрый запуск

### 1. Нативное десктопное приложение (macOS):
- Скачайте готовый установщик: [`dist/ARGUS-2.2.0-arm64.dmg`](dist/ARGUS-2.2.0-arm64.dmg) (105.8 МБ).
- Или запустите в 1 клик скриптом [`Launch ARGUS.command`](Launch%20ARGUS.command).

### 2. Запуск из терминала (macOS / Linux):
```bash
git clone https://github.com/Evro228/argus.git
cd argus
./run.sh
```

### 3. Запуск на Windows:
```cmd
git clone https://github.com/Evro228/argus.git
cd argus
run.bat
```

### 4. Запуск в изолированном Docker-контейнере:
```bash
docker compose up --build
```

---

## 🧪 Тестирование и Надежность

Комплекс протестирован автоматизированным набором тестов:
- **Функциональный тест-сьют:** `python tests/test_suite.py` — **36 / 36 PASS (100.0%)**.
- **Нагрузочный стресс-тест:** `python tests/stress_test.py` — **500 одновременных сессий (~2200 RPS)** без единого сбоя.
- **Статический анализатор Bandit AppSec:** **0 High, 0 Medium** уязвимостей.

---

## ⌨️ Горячие клавиши (Raycast / Linear style)

| Комбинация | Действие |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | Открыть тактическую командную палитру поиска |
| `⌘1` – `⌘9` | Мгновенное переключение между 9 станциями |
| `⌘S` | Переключение режима строгой изоляции Air-Gapped Stealth Mode |
| `⌘L` | Очистка буфера терминала SOC |

---

## ⚖️ Ответственное использование (Ethical Guidelines)

Инструмент разработан исключительно для **аудита собственной безопасности, защиты личных данных, этичного анализа цифрового следа (OSINT) и образовательных исследований**. Любое использование в неправомерных целях строго запрещено.
