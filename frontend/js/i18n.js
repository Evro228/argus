// ARGUS // Tactical Intelligence & Defense - Bilingual i18n Engine
(function () {
  const translations = {
    ru: {
      appName: "ARGUS",
      appSubtitle: "Tactical Intelligence & Defense Cockpit",
      searchPlaceholder: "Cmd + K // Выполнить тактическое действие, проверить цель...",
      operatorStatus: "ОПЕРАТОР_01 В СЕТИ",
      defconLevel: "DEFCON ПОЛОЖЕНИЕ: УРОВЕНЬ 3",
      securityPosture: "Индекс защищенности",
      ipBadgeLan: "LAN",
      ipBadgeWan: "WAN",
      ipBadgeCopy: "Копировать IP",
      ipBadgeCopied: "Скопировано!",
      
      // Stations
      stationGodsEye: "God's Eye View",
      stationNetwork: "Аудит сети",
      stationOsint: "OSINT & Разведка",
      stationVuln: "Уязвимости & Hardening",
      stationVault: "Крипто-сейф & Identity",
      stationForensics: "Цифровая криминалистика",
      stationOpsec: "OPSEC & DLP Санитайзер",
      stationAnalyst: "ИИ Сводный Аналитик",
      
      // God's Eye HUD
      liveAttackStream: "ЖИВОЙ ПОТОК АТАК",
      interactiveThreatMap: "Интерактивная карта киберугроз",
      targetInspection: "ТАКТИЧЕСКАЯ ИНСПЕКЦИЯ ЦЕЛИ",
      targetIp: "IP узла",
      targetCoords: "Координаты",
      openPorts: "Открытые порты",
      threatLevel: "Уровень угрозы",
      btnRunExploit: "ЗАПУСТИТЬ ТЕСТ (EXPLOIT)",
      btnTraceRoute: "ТРАССИРОВКА (TRACE ROUTE)",
      btnIsolateNode: "ИЗОЛИРОВАТЬ УЗЕЛ (ISOLATE)",
      
      // Tool Picker
      toolPickerTitle: "Выбор специализированного инструмента",
      focusMode: "Режим фокуса",
      overviewAll: "Все инструменты",
      
      // OSINT Tools
      toolUsername: "Поиск никнейма (Sherlock)",
      toolLeaks: "Проверка утечек (HIBP)",
      toolDomain: "Домен & DNS (theHarvester)",
      toolGeoIp: "Geo-IP & Карта узла",
      
      // Network Tools
      toolPortScan: "Матрица портов (Nmap)",
      toolTopology: "Топология Ingress",
      toolGateway: "Телеметрия шлюза",
      toolTraceroute: "Трассировка узлов",
      toolWifi: "Wi-Fi & Радиоэфир",
      
      // Vuln Tools
      toolCveFeed: "Лента CVE (Nuclei)",
      toolDockerCis: "CIS Docker Hardening",
      toolGitSecrets: "Поиск секретов Git (TruffleHog)",
      
      // Vault Tools
      toolVeraCrypt: "VeraCrypt / LUKS Сейфы",
      toolEntropy: "Энтропия паролей",
      toolWebAuthn: "Аппаратные Passkeys & FIDO2",
      toolKillSwitch: "Master Kill Switch",
      
      // SOC Drawer
      socDrawerTitle: "LIVE SOC ЖУРНАЛ АУДИТА",
      socFilterAll: "Все события",
      socFilterNet: "Сеть",
      socFilterThreats: "Угрозы",
      socFilterErrors: "Ошибки",
      socCopyBuffer: "Скопировать лог",
      
      // General actions
      btnScan: "Сканировать",
      btnExecute: "Выполнить",
      btnCopy: "Копировать",
      btnExport: "Экспорт отчета",
      statusOnline: "В СЕТИ",
      statusOffline: "АВТОНОМНО"
    },
    en: {
      appName: "ARGUS",
      appSubtitle: "Tactical Intelligence & Defense Cockpit",
      searchPlaceholder: "Cmd + K // Execute tactical action, probe target...",
      operatorStatus: "OPERATOR_01 ONLINE",
      defconLevel: "DEFCON POSTURE: LEVEL 3",
      securityPosture: "Security Posture",
      ipBadgeLan: "LAN",
      ipBadgeWan: "WAN",
      ipBadgeCopy: "Copy IP",
      ipBadgeCopied: "Copied!",
      
      // Stations
      stationGodsEye: "God's Eye View",
      stationNetwork: "Network Audit",
      stationOsint: "OSINT & Recon",
      stationVuln: "Vuln & Hardening",
      stationVault: "Identity Vault",
      stationForensics: "Forensics Lab",
      stationOpsec: "OPSEC & DLP Sanitizer",
      stationAnalyst: "Executive AI Analyst",
      
      // God's Eye HUD
      liveAttackStream: "LIVE ATTACK STREAM",
      interactiveThreatMap: "Interactive Dark Threat Map",
      targetInspection: "TACTICAL TARGET INSPECTION",
      targetIp: "Node IP",
      targetCoords: "Coordinates",
      openPorts: "Open Ports",
      threatLevel: "Threat Level",
      btnRunExploit: "RUN EXPLOIT TEST",
      btnTraceRoute: "TRACE ROUTE",
      btnIsolateNode: "ISOLATE NODE",
      
      // Tool Picker
      toolPickerTitle: "Specialized Tool Picker",
      focusMode: "Focus Mode",
      overviewAll: "Overview All",
      
      // OSINT Tools
      toolUsername: "Username Recon (Sherlock)",
      toolLeaks: "Leak Check (HIBP)",
      toolDomain: "Domain & DNS (theHarvester)",
      toolGeoIp: "Geo-IP Map",
      
      // Network Tools
      toolPortScan: "Scan Matrix (Nmap)",
      toolTopology: "Ingress Topology",
      toolGateway: "Gateway Telematics",
      toolTraceroute: "Traceroute Hops",
      toolWifi: "Wi-Fi & RF Monitor",
      
      // Vuln Tools
      toolCveFeed: "CVE Feed (Nuclei)",
      toolDockerCis: "CIS Docker Hardening",
      toolGitSecrets: "Git Secret Scanner (TruffleHog)",
      
      // Vault Tools
      toolVeraCrypt: "VeraCrypt / LUKS Volumes",
      toolEntropy: "Password Entropy",
      toolWebAuthn: "Passkeys & FIDO2 Enclave",
      toolKillSwitch: "Master Kill Switch",
      
      // SOC Drawer
      socDrawerTitle: "LIVE SOC AUDIT DRAWER",
      socFilterAll: "All Events",
      socFilterNet: "Network",
      socFilterThreats: "Threats",
      socFilterErrors: "Errors",
      socCopyBuffer: "Copy Log Buffer",
      
      // General actions
      btnScan: "Scan Target",
      btnExecute: "Execute",
      btnCopy: "Copy",
      btnExport: "Export Report",
      statusOnline: "ONLINE",
      statusOffline: "OFFLINE"
    }
  };

  class I18nManager {
    constructor() {
      this.currentLang = localStorage.getItem('argus_lang') || 'ru';
    }

    t(key) {
      const dict = translations[this.currentLang] || translations.ru;
      return dict[key] || key;
    }

    setLanguage(lang) {
      if (translations[lang]) {
        this.currentLang = lang;
        localStorage.setItem('argus_lang', lang);
        this.applyTranslations();
      }
    }

    toggleLanguage() {
      const newLang = this.currentLang === 'ru' ? 'en' : 'ru';
      this.setLanguage(newLang);
      return newLang;
    }

    applyTranslations() {
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        const text = this.t(key);
        if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          if (el.hasAttribute('placeholder')) {
            el.setAttribute('placeholder', text);
          }
        } else {
          el.textContent = text;
        }
      });

      // Update lang toggle buttons
      const toggleBtn = document.getElementById('lang-toggle-btn');
      if (toggleBtn) {
        toggleBtn.innerHTML = this.currentLang === 'ru' 
          ? '<span class="text-sky-400 font-bold">🇷🇺 RU</span> <span class="text-slate-500">|</span> <span class="text-slate-400 hover:text-white">🇬🇧 EN</span>'
          : '<span class="text-slate-400 hover:text-white">🇷🇺 RU</span> <span class="text-slate-500">|</span> <span class="text-sky-400 font-bold">🇬🇧 EN</span>';
      }

      // Dispatch custom event for dynamic components
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang: this.currentLang } }));
    }
  }

  window.argusI18n = new I18nManager();
})();
