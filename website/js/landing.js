// ==========================================================================
// ARGUS Landing // Interactive Module Switcher & Download Vault
// ==========================================================================

const MODULE_DATA = {
  geoint: {
    title: "01 // GEOINT & TACTICAL THREAT MAP",
    subtitle: "3D глобальный мониторинг космического, воздушного и киберпространства",
    description: "Мгновенное обнаружение узлов ботнетов, спутниковых орбит CelesTrak по модели SGP4 и радиоперехватов авиации ADS-B. Командный пункт оператора класса God\x27s Eye View с нулевой задержкой.",
    badge: "ORBITAL & SATELLITE TELEMETRY",
    specs: ["SGP4 Satellite Propagator", "Real-time ADS-B Ingress", "Kinetic Cyber Attack Arcs", "DEFCON Posture Dial"],
    codePreview: `[GEOINT TELEMETRY]
Target: Frankfurt [EU-C1] (50.1109° N, 8.6821° E)
Active Satellites overhead: 14 (STARLINK-3120, ISS, USA-245)
Inbound Kinetic Attacks: 1,420 pkts/sec (SYN Flood mitigate: ACTIVE)`
  },
  network: {
    title: "02 // NETWORK RECON & LOCAL CVE ENGINE",
    subtitle: "Асинхронный радар периметра и встроенный сигнатурный анализ",
    description: "Высокоскоростной асинхронный сканер портов и сервисов с автоматической локальной корреляцией CVE (regreSSHion, RCE, SambaCry, MySQL auth bypass) без единого внешнего обращения.",
    badge: "ZERO-DEPENDENCY SOCKET SCAN",
    specs: ["Native Python Async Sockets", "Embedded CVE B-Tree Index", "SSL/TLS Cipher Inspector", "Wi-Fi 802.11ax RF Recon"],
    codePreview: `[NETWORK RADAR SCAN]
Target: 192.168.1.1 [Internal Gateway]
PORT 22/TCP  OPEN  OpenSSH 8.9p1  ⚠️ CVE-2024-6387 (CVSS 8.1 HIGH)
PORT 80/TCP  OPEN  Apache 2.4.49  🚨 CVE-2021-41773 (CVSS 9.8 CRITICAL)
Verdict: Immediate Patch Required`
  },
  osint: {
    title: "03 // OSINT FOOTPRINT & K-ANONYMITY HUB",
    subtitle: "Глубокая разведка по открытым источникам и анонимная проверка утечек",
    description: "Автономный поиск цифрового следа по 400+ сервисам и проверка компрометации паролей через протокол k-Anonymity и локальный Bloom Filter без передачи паролей в сеть.",
    badge: "100% PRIVATE K-ANONYMITY",
    specs: ["400+ Platform Sherlock Engine", "k-Anonymity Zero-Leakage Protocol", "Offline Bloom Filter (1M+ Hashes)", "Curated Google Dorks Library"],
    codePreview: `[OSINT DOSSIER]
Target: operator_x
GitHub: https://github.com/operator_x (DEV)
Telegram: https://t.me/operator_x (MESSENGER)
Breach Status: 2 Historical incidents (LinkedIn, Canva)
Password Hash: CLEAN (0 matches in 1B+ breach dataset)`
  },
  crypto: {
    title: "04 // CRYPTO STRONGHOLD & FIDO2 ENCLAVE",
    subtitle: "Швейцарский криптографический сейф и аппаратная аутентификация",
    description: "Аппаратные ключи WebAuthn / Passkeys, невидимая стеганография Zero-Width, измерение энтропии Шеннона в битах и самоуничтожающиеся записки в оперативной памяти.",
    badge: "W3C WEBAUTHN LEVEL 3",
    specs: ["AES-256-GCM Military Standard", "Ephemeral Self-Destruct Memory", "Zero-Width Steganography", "Shannon Entropy Meter"],
    codePreview: `[CRYPTO ENCLAVE]
Algorithm: AES-256-GCM + PBKDF2 (600,000 rounds)
WebAuthn: FIDO2 Hardware Token Linked
Entropy: 153.2 bits (Maximum Defense Posture)
Ephemeral Note: Self-destructed in RAM on read.`
  },
  audit: {
    title: "05 // CODE AUDIT & SECRET SCANNER",
    subtitle: "Глубокая инспекция репозиториев на утечки API-ключей и токенов",
    description: "Автономное сканирование файлов и git-коммитов на наличие утекших ключей AWS, OpenAI, GitHub, токенов Slack и приватных RSA/ED25519 ключей.",
    badge: "AIR-GAPPED STATIC ANALYSIS",
    specs: ["Regex Signature Engine", "High-Entropy Secret Detection", "DEFCON Risk Categorization", "Zero False-Positive Filter"],
    codePreview: `[AUDIT REPORT]
Scanned Files: 142
Potential Leaks: 0 Critical, 0 High
Security Posture: CLEAN
Integrity SHA-256: 9b2a1e0f...`
  },
  opsec: {
    title: "06 // OPSEC & PRIVACY SANITIZER",
    subtitle: "Предотвращение утечек данных и очистка следящих параметров",
    description: "Автоматическое обезличивание персональных данных (DLP), удаление трекеров маркетологов из ссылок (ClearURLs) и мгновенный генератор анонимных профилей.",
    badge: "CLIENT-SIDE DLP FILTER",
    specs: ["Auto Redact PII (Cards, Phones, Emails)", "Surveillance Tracker Stripper", "Ghost Identity Generator", "Clipboard Auto-Wipe"],
    codePreview: `[DLP SANITIZED PAYLOAD]
Original: api_key=sk-12345, email=ceo@corp.com, tel=+79991234567
Sanitized: [REDACTED_TOKEN], email=[REDACTED_EMAIL], tel=[REDACTED_PHONE]
Trackers removed: utm_source, fbclid, gclid (3 Cleaned)`
  }
};

document.addEventListener("DOMContentLoaded", () => {
  const tabs = document.querySelectorAll(".tool-nav-btn");
  const titleEl = document.getElementById("module-title");
  const subtitleEl = document.getElementById("module-subtitle");
  const descEl = document.getElementById("module-desc");
  const badgeEl = document.getElementById("module-badge");
  const specsEl = document.getElementById("module-specs");
  const codeEl = document.getElementById("module-code");

  function updateModule(key) {
    const data = MODULE_DATA[key];
    if (!data) return;

    tabs.forEach(t => t.classList.toggle("active", t.getAttribute("data-module") === key));

    titleEl.textContent = data.title;
    subtitleEl.textContent = data.subtitle;
    descEl.textContent = data.description;
    badgeEl.textContent = data.badge;
    codeEl.textContent = data.codePreview;

    specsEl.innerHTML = "";
    data.specs.forEach(s => {
      const li = document.createElement("li");
      li.className = "flex items-center space-x-2 text-xs font-mono text-slate-300";
      li.innerHTML = `<span class="text-sky-400">✓</span> <span>\${s}</span>`;
      specsEl.appendChild(li);
    });
  }

  tabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const key = tab.getAttribute("data-module");
      updateModule(key);
    });
  });

  // Copy SHA-256 Button
  const copyBtn = document.getElementById("btn-copy-sha");
  if (copyBtn) {
    copyBtn.addEventListener("click", () => {
      const sha = document.getElementById("dmg-sha256").textContent;
      navigator.clipboard.writeText(sha).then(() => {
        copyBtn.textContent = "СКОПИРОВАНО! ✓";
        setTimeout(() => copyBtn.textContent = "КОПИРОВАТЬ ХЭШ", 2000);
      });
    });
  }
});
