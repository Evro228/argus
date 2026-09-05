# 🛡️ CyberSec & OSINT Studio Cockpit

> **All-in-One Cyber Intelligence, Reconnaissance & Defense Operations Cockpit**
> Единая рабочая станция кибербезопасности, OSINT-разведки, 3D GEOINT, аудита кода и криптографии, объединяющая лучшие open-source инструменты мира в удобном графическом центре управления.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Status](https://img.shields.io/badge/Status-Active%20Production-emerald.svg)]()

---

## 🌟 Возможности и объединенные проекты

Вместо запуска десятков консольных утилит с разными флагами вручную, **CyberSec & OSINT Studio** объединяет функционал передовых репозиториев GitHub в 8 специализированных экранов:

| Модуль | Вдохновлен проектами | Ключевые возможности |
| :--- | :--- | :--- |
| **🔎 OSINT & Footprint** | [Sherlock](https://github.com/sherlock-project/sherlock), [Blackbird](https://github.com/p1ngul1n0/blackbird), [theHarvester](https://github.com/laramies/theHarvester), [GHunt](https://github.com/mxrch/GHunt), [HIBP](https://haveibeenpwned.com/) | Мульти-поиск по никнейму по 400+ сервисам, интерактивная студия Google Dorks, проверка утечек почты. |
| **🛰️ GEOINT 3D Map** | [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view), [Cesium](https://cesium.com/) | Фотореалистичный 3D-глобус с отслеживанием авиации (ADS-B), морских судов (AIS), орбит спутников и термальных очагов NASA FIRMS. |
| **🔍 Code & Secret Audit** | [Gitleaks](https://github.com/gitleaks/gitleaks), [TruffleHog](https://github.com/trufflesecurity/trufflehog), [Semgrep](https://semgrep.dev/) | Автоматический аудит локальных репозиториев на утечки API-ключей OpenAI/AWS/GitHub, приватных ключей и паролей. |
| **🌐 Network Scanner** | [Nmap](https://nmap.org/), [Nuclei](https://github.com/projectdiscovery/nuclei) | Сканирование открытых портов (нативное асинхронное ядро + поддержка Nmap), инспектор SSL/TLS сертификатов. |
| **🔐 Crypto & Stego Lab** | [StegCloak](https://github.com/KuroLabs/stegcloak), [KeePassXC](https://keepassxc.org/) | Невидимая стеганография в символах Unicode нулевой ширины, шифрование AES-256, криптографический генератор паролей. |
| **📸 Media Forensics** | [Aves](https://github.com/deckerst/aves), [Deface](https://github.com/ORB-HD/deface), [SD Prompt Reader](https://github.com/receyuki/stable-diffusion-prompt-reader) | Извлечение скрытых EXIF GPS-координат из фотографий, определение генераций ИИ, аудит метаданных камеры. |
| **🎭 OPSEC & Privacy** | [Pasteguard](https://github.com/sgasser/pasteguard), [Camoufox](https://github.com/daijro/camoufox) | Обезвреживание текста от случайной утечки личных данных перед отправкой в нейросети, проверка внешнего IP-адреса. |
| **🤖 AI Cyber-Analyst** | [Anthropic Cybersecurity Skills](https://github.com/mukul975/Anthropic-Cybersecurity-Skills) | Автоматическая генерация аналитических отчетов безопасности, оценка Security Posture Score и пошаговый план защиты. |

---

## 🚀 Быстрый запуск

### 1. Клонирование и старт в 1 команду (macOS / Linux):
```bash
git clone https://github.com/slava/cybersec-studio.git
cd cybersec-studio
./run.sh
```
Скрипт автоматически создаст окружение, установит зависимости, запустит локальный бэкенд и откроет веб-интерфейс в браузере: `http://localhost:8800`.

### 2. Запуск через Docker:
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
