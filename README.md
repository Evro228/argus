# 👁️ ARGUS // Tactical Intelligence & Defense Cockpit

> **All-in-One Cyber Intelligence, Reconnaissance & Defense Operations Cockpit**
> Единая рабочая станция тактической разведки, кибербезопасности, OSINT, 3D GEOINT / God's Eye View, аудита кода и криптографии, объединяющая лучшие open-source инструменты мира в премиальном графическом центре управления.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Version](https://img.shields.io/badge/Version-2.0.0-emerald.svg)]()
[![Status](https://img.shields.io/badge/Status-Active%20Production-emerald.svg)]()

---

## 🌟 Возможности и объединенные проекты

Вместо запуска десятков консольных утилит с разными флагами вручную, **ARGUS** объединяет функционал передовых репозиториев GitHub в единый тактический кокпит:

| Модуль | Вдохновлен проектами | Ключевые возможности |
| :--- | :--- | :--- |
| **🔎 OSINT & Footprint** | [Sherlock](https://github.com/sherlock-project/sherlock), [Blackbird](https://github.com/p1ngul1n0/blackbird), [theHarvester](https://github.com/laramies/theHarvester), [GHunt](https://github.com/mxrch/GHunt), [HIBP](https://haveibeenpwned.com/) | Мульти-поиск по никнейму по 400+ сервисам, интерактивная студия Google Dorks, проверка утечек почты. |
| **🛰️ GEOINT 3D Map** | [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), [Cesium](https://cesium.com/) | Фотореалистичный 3D-глобус с отслеживанием авиации (ADS-B), морских судов (AIS), орбит спутников и термальных очагов NASA FIRMS. |
| **🔍 Code & Secret Audit** | [Gitleaks](https://github.com/gitleaks/gitleaks), [TruffleHog](https://github.com/trufflesecurity/trufflehog), [Semgrep](https://semgrep.dev/) | Автоматический аудит локальных репозиториев на утечки API-ключей OpenAI/AWS/GitHub, приватных ключей и паролей. |
| **🌐 Network & WireTapper** | [Nmap](https://nmap.org/), [Nuclei](https://github.com/projectdiscovery/nuclei), [WireTapper](https://github.com/h9zdev/WireTapper) | Сканирование открытых портов (нативное асинхронное ядро + Nmap), инспектор SSL/TLS, радио-сканирование Wi-Fi (SSID, WPA3/WPA2, 5GHz). |
| **🔐 Crypto, Stego & Burn** | [StegCloak](https://github.com/KuroLabs/stegcloak), [Privnote](https://privnote.com/), [Send](https://github.com/timvisee/send), [w3c/webauthn](https://github.com/w3c/webauthn) | Невидимая стеганография в символах Unicode, шифрование AES-256, одноразовые самоуничтожающиеся записки, стенд Passkeys/WebAuthn. |
| **📸 Media & Dangerzone** | [Aves](https://github.com/deckerst/aves), [Dangerzone](https://github.com/freedomofpress/dangerzone), [Deface](https://github.com/ORB-HD/deface) | Извлечение EXIF GPS-координат, проверка PDF на скрытый JS/эксплойты автозапуска (Dangerzone), детекция сгенерированных изображений. |
| **🎭 OPSEC & ClearURLs** | [ClearURLs](https://github.com/ClearURLs/Addon), [Pasteguard](https://github.com/sgasser/pasteguard), [OpenTrashmail](https://github.com/HaschekSolutions/opentrashmail) | Очистка ссылок от шпионских трекеров (utm, fbclid), санитизация текста от персональных данных, генерация временных профилей. |
| **🛡️ Security Analyst** | [NIST SP 800-115](https://csrc.nist.gov/publications/detail/sp/800-115/final), [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks) | Автоматическая генерация аналитических отчетов безопасности, оценка Security Posture Score и пошаговый план защиты. |
| **📋 Hardening & Knowledge** | [How-To-Secure-A-Linux-Server](https://github.com/imthenachoman/How-To-Secure-A-Linux-Server), [SecLists](https://github.com/danielmiessler/SecLists), [HackTricks](https://book.hacktricks.xyz/) | Аудит FileVault/SIP/Gatekeeper, встроенные словари и читшиты безопасности (PayloadsAllTheThings, OWASP). |

---

## 🚀 Кроссплатформенный запуск (macOS, Windows, Linux)

### 1. Запуск десктопного приложения в отдельном окне (macOS / Win / Linux):
```bash
# Установка зависимостей Electron
npm install

# Запуск нативного десктопного приложения
npm start
```

### 2. Запуск на macOS / Linux (Терминал + Браузер):
```bash
git clone https://github.com/Evro228/cybersec-studio.git
cd cybersec-studio
./run.sh
```

### 3. Запуск на Windows:
```cmd
git clone https://github.com/Evro228/cybersec-studio.git
cd cybersec-studio
run.bat
```

### 4. Запуск в изолированном Docker контейнере:
```bash
docker compose up --build
```

---

## 🛠 Архитектура проекта

```
cybersec-studio/
├── backend/
│   ├── app/
│   │   ├── api/             # Модули API (OSINT, Аудит, Сеть, Крипто, Медиа, OPSEC)
│   │   ├── utils/           # Ядро StegCloak стеганографии и асинхронный раннер
│   │   └── main.py          # Точка входа FastAPI
├── frontend/
│   ├── css/styles.css       # Стилизация Glassmorphism и темная кибер-тема
│   ├── js/
│   │   ├── app.js           # Логика интерфейса и вызовы API
│   │   └── geoint.js        # 3D Движок тактического глобуса
│   └── index.html           # Одностраничное приложение (SPA)
├── requirements.txt         # Зависимости Python
├── docker-compose.yml       # Стек контейнеризации
├── run.sh                   # Лаунчер в 1 клик для Mac
└── README.md
```

---

## ⚖️ Ответственное использование и этический кодекс (The Line)

Инструмент разработан исключительно в целях **аудита собственной безопасности, защиты данных, этичного анализа цифрового следа (OSINT) и образовательных исследований**.
* Проект **не предоставляет** функционала для несанкционированного доступа, деанонимизации или взлома компьютерных систем.
* Поиск в открытых источниках осуществляется строго в рамках публично доступных протоколов и политик безопасности соответствующих веб-сервисов.
