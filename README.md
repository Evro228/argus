# 👁️ ARGUS // Tactical Intelligence & Defense Cockpit

```text
       █████╗ ██████╗  ██████╗ ██╗   ██╗███████╗
      ██╔══██╗██╔══██╗██╔════╝ ██║   ██║██╔════╝
      ███████║██████╔╝██║  ███╗██║   ██║███████╗
      ██╔══██║██╔══██╗██║   ██║██║   ██║╚════██║
      ██║  ██║██║  ██║╚██████╔╝╚██████╔╝███████║
      ╚═╝  ╚═╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝ ╚══════╝
  TACTICAL CYBER INTELLIGENCE, RECON & DEFENSE OPERATIONS
```

[![Version](https://img.shields.io/badge/Release-v1.0.0-00f0ff.svg?style=flat-square)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-3b82f6.svg?style=flat-square)](LICENSE)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10+-10b981.svg?style=flat-square&logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI Core](https://img.shields.io/badge/FastAPI-0.115+-009688.svg?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Electron Desktop](https://img.shields.io/badge/Electron-34+-475569.svg?style=flat-square&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Tests](https://img.shields.io/badge/Tests-64%2F64%20PASS%20(100%25)-10b981.svg?style=flat-square)]()
[![Security Audit](https://img.shields.io/badge/OWASP%20ASVS-Compliant-emerald.svg?style=flat-square)]()
[![Bandit AST](https://img.shields.io/badge/Bandit-0%20Vulnerabilities-success.svg?style=flat-square)]()

---

**ARGUS** — автономный десктопный комплекс тактической разведки, аудита кибербезопасности, OSINT, спутниковой геопространственной телеметрии (GEOINT), радиомониторинга и криминалистического анализа. 

Объединяет возможности профильных утилит информационной безопасности в единый высокопроизводительный центр управления оператора с аппаратной криптографической изоляцией и режимом полной радиотишины (**Air-Gapped Stealth Mode**).

---

## 🗺️ Ключевые тактические станции

```text
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             ARGUS OPERATIONS MATRIX                              │
├──────────────────────┬─────────────────────────────┬─────────────────────────────┤
│ 🛰️ GEOINT & RADAR   │ 🌐 NETWORK AUDIT            │ 🔎 OSINT & GRAPH INTEL      │
│ • NORAD Satellites   │ • Asynchronous Port Matrix  │ • Sherlock 400+ Platforms   │
│ • ADS-B Flight Radar │ • 1-Click LAN Discovery     │ • 2D Synapse Entity Graph   │
│ • AIS Maritime Fleet │ • OUI Vendor Identification │ • Offline K-Anonymity DB    │
│ • NASA FIRMS Thermal │ • RF Waterfall FFT (WebSDR) │ • Tactical Google Dorks     │
│ • USGS Seismic Grid  │ • Offline CVE Correlation   │ • Autonomous Breach Checker │
├──────────────────────┼─────────────────────────────┼─────────────────────────────┤
│ 📹 SURVEILLANCE CCTV │ 🔐 CRYPTOGRAPHY & ENCLAVE   │ 🛡️ FORENSICS & PLAYBOOKS    │
│ • 124 Multi-City Cams│ • W3C WebAuthn L3 Passkeys  │ • EXIF / GPS Scrubber       │
│ • 9 GitHub Feeds Sync│ • Hardware Touch ID / TPM   │ • PDF Dangerzone Inspector  │
│ • RTSP-to-HLS Engine │ • Zero-Width Steganography  │ • YARA / Sigma Rule Engine  │
│ • Full Video Wall    │ • RAM Zeroing Burn Notes    │ • 818 Response Playbooks    │
└──────────────────────┴─────────────────────────────┴─────────────────────────────┘
```

### 1. 🛰️ God's Eye View (GEOINT & Тактическая Карта)
- **Орбитальная группировка:** Расчет траекторий космических аппаратов (МКС, Тяньгун, системы GPS, ГЛОНАСС, Космос, спутники США, РФ, Китая, ЕС, Индии, Израиля) на физическом ядре NORAD.
- **Воздушный эшелон (ADS-B):** Мониторинг стратегической авиации (Boeing E-4B Nightwatch, RC-135W Rivet Joint, Ту-214ПУ, AWACS) и коммерческих бортов в реальном времени.
- **Морской флот (AIS):** Отслеживание флагманов флота, авианосцев, супертанкеров и ледоколов.
- **Глобальные слои:**
  - `🔥 NASA FIRMS:` Спутниковые термоточки высокого разрешения (сенсоры VIIRS / MODIS).
  - `⚡ USGS Earthquakes:` Мониторинг мировой сейсмической активности с магнитудой ≥ 4.0.
  - `🌊 Submarine Cables:` Топология трансокеанских оптоволоконных магистралей связи.

### 2. 📹 Global CCTV Matrix & Video Wall
- Каталог из **124 открытых видеопотоков** по всем федеральным округам РФ (Москва, Санкт-Петербург, Казань, Сочи, Владивосток, Екатеринбург и др.) и ключевым мировым хабам.
- Единый агрегатор **9 проверенных репозиториев GitHub** с поддержкой протоколов HLS, RTSP, GeoJSON и MJPEG.
- Встроенный микро-транскодер **FFmpeg** для конвертации сырых потоков RTSP в HLS с нулевой задержкой.
- Полноэкранный режим **Тактической видеостены** с фильтрацией по городам и статусу камер.

### 3. 🌐 Сетевой аудит и радиоразведка (Network & RF)
- **1-Click LAN Asset Discovery:** Пассивный и активный аудит локального сегмента, чтение ARP-кэша, распознавание вендоров по OUI, мгновенная идентификация сетевых IP-камер (RTSP:554) и шлюзов.
- **Scan Matrix:** Асинхронное ядро зондирования портов с защитой от инъекций аргументов и корреляцией обнаруженных служб с локальной базой CVE.
- **RF Spectrum & WebSDR:** Водопадный спектроанализатор FFT (128 бинов), частотный каталог аварийных диапазонов (VHF Guard 121.5 MHz, Морской канал безопасности Ch 16) и координатная сетка онлайн-приемников WebSDR.

### 4. 🔎 OSINT & Топологический граф Synapse
- **Sherlock Engine:** Мультиплатформенный поиск цифрового следа никнейма по 400+ сервисам.
- **Synapse 2D Canvas Graph:** Интерактивный граф сущностей (никнеймы, email, подтвержденные учетные записи, домены) с динамической физикой пружин на 60 FPS.
- **Offline Breach Intel:** Проверка компрометации паролей и почтовых адресов по локальному хеш-индексу k-Anonymity (SHA-1) с нулевой сетевой утечкой.

### 5. 🔐 Криптографический анклав и хранилище
- **W3C WebAuthn Level 3:** Аппаратная аутентификация через биометрию Apple Secure Enclave (Touch ID) и TPM 2.0. Встроенная защита от Replay-атак с валидацией nonce/challenge и origin.
- **Authenticated AES-256-GCM Vault:** Защищенное локальное хранилище данных с аутентифицированным шифрованием (AEAD).
- **Ephemeral Burn Notes:** Одноразовые записки с гарантированным физическим занулением оперативной памяти через `ctypes.memset (0x00)` после прочтения.
- **Zero-Width Steganography:** Скрытие шифрованных сообщений в открытом тексте с использованием невидимых Unicode-символов нулевой ширины.

### 6. 🚨 Watcher Daemon & Telegram Push
- Фоновый автономный сторож с контролем локальных сетевых сокетов, выявлением неавторизованных открытых портов и проверкой доступности потоков.
- Шифрованные оперативные оповещения в Telegram Bot с настраиваемым порогом критичности (`INFO`, `WARNING`, `CRITICAL`).

### 7. 🛡️ Криминалистика и харденинг
- **Media EXIF Scrubber:** Извлечение и зачистка метаданных изображений, проверка географических координат и защита парсера от DoS-структур.
- **PDF Dangerzone Inspector:** Статический анализ структуры PDF-документов на наличие эксплойтов, макросов, внедренного JavaScript и подозрительных директив `/Launch`.
- **YARA & Sigma Engine:** Анализ файлов по сигнатурам веб-шеллов и правилам детектирования подозрительной активности (LOLBins).
- **Host Hardening Matrix:** Проверка состояния системных механизмов защиты хоста (FileVault / BitLocker, Gatekeeper, SIP, брандмауэр).

### 8. 📚 База плейбуков безопасности
- Хаб из **818 документированных тактических сценариев** расследования инцидентов, реагирования и аудита, заземленных на стандарты MITRE ATT&CK и NIST CSF.

---

## 🔒 Модель безопасности и защиты приложения

Архитектура ARGUS построена в соответствии со стандартами **OWASP ASVS v4.0** и **MASVS**:

```text
[ Electron Desktop Shell ]
       │  (contextIsolation: true, nodeIntegration: false, sandbox: true)
       │  IPC Token Delivery via contextBridge (No executeJavaScript)
       ▼
[ Localhost Transport (127.0.0.1:8800) ]
       │  • Host / Origin Validation (Anti-DNS Rebinding)
       │  • 256-bit Cryptographic IPC Token (Constant-time compare)
       │  • Rate Limiting: 600 req/min per client
       │  • Strict CSP: default-src 'self' (No unsafe-inline)
       ▼
[ FastAPI Core Engine ]
       │  • Subprocess Execution: Array-based args with '--' boundary
       │  • Path Traversal Defense: os.path.commonpath confinement
       │  • Local Secrets: File permissions 0600 (Owner read/write only)
       │  • Air-Gap Stealth Mode: Complete socket egress blocking
       ▼
[ Offline Embedded Databases (CVEs, Bloom Filters, Playbooks) ]
```

---

## 🚀 Установка и быстрый запуск

### Системные требования:
- **macOS** (Apple Silicon M1/M2/M3/M4 или Intel), **Linux** (x86_64, aarch64), **Windows 10/11**.
- Python 3.10+ (рекомендуется Python 3.11 – 3.14).
- Node.js 18+ (для десктопного режима Electron).

### 1. Запуск нативного десктопного приложения:
```bash
# Клонирование репозитория
git clone https://github.com/Evro228/argus.git
cd argus

# Установка зависимостей (однократно)
npm install

# Запуск приложения
npm start
```
*На macOS также доступен запуск двойным кликом по файлу **`Launch ARGUS.command`**.*

### 2. Запуск браузерного интерфейса (Web Cockpit):
```bash
cd argus
./run.sh
```
*Сервер запустится на `http://localhost:8800` и автоматически откроет страницу в браузере.*

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

## 🧪 Проверка безопасности и тестирование

Репозиторий поставляется с полным набором автоматизированных тестов и линтеров:

```bash
# Запуск регрессионного теста безопасности (64 сценария)
python tests/test_suite.py

# Нагрузочный стресс-тест ядра (500 одновременных запросов)
python tests/stress_test.py

# Статический AST-анализ уязвимостей (Bandit)
bandit -r backend/app/ -ll

# Локальный аудит безопасности в 1 клик
./scripts/security_check.sh
```

В CI/CD пайплайн (`.github/workflows/security.yml`) интегрированы:
- **`gitleaks/gitleaks`** — сканирование репозитория на утечки токенов и ключей.
- **`semgrep/semgrep`** — SAST-анализ по правилам OWASP Top 10.
- **`google/osv-scanner`** — проверка цепочки поставок (SCA) по базе Google OSV.

---

## ⌨️ Навигация и горячие клавиши

| Комбинация | Действие |
| :--- | :--- |
| `⌘K` / `Ctrl+K` | Универсальная командная палитра быстрого поиска и действий |
| `⌘1` – `⌘9` | Мгновенное переключение между тактическими станциями |
| `⌘U` | Открыть глобальную видеостену CCTV-камер |
| `⌘,` | Панель управления API-ключами и Live-фидами |
| `⌘S` | Включение / выключение режима строгой изоляции Air-Gap Stealth Mode |
| `⌘L` | Очистка журнала терминала безопасности |

---

## ⚖️ Лицензия и этические нормы

Комплекс распространяется под свободной лицензией **[MIT](LICENSE)**.

Программное обеспечение разработано исключительно для **самодиагностики, аудита защищенности собственной инфраструктуры, этичного анализа открытых данных (OSINT), защиты конфиденциальности и образовательных исследований**. Использование функционала приложения в неправомерных целях категорически запрещено.
