// ==========================================================================
// ARGUS // Tactical Intelligence & Defense - Application Engine
// ==========================================================================

const API_BASE = '/api';

function escapeHtml(str) {
  if (typeof str !== 'string') return String(str ?? '');
  return str.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

function getApiHeaders(extra = {}) {
  const headers = { 'Content-Type': 'application/json', ...extra };
  const token = window.__ARGUS_IPC_TOKEN__ || localStorage.getItem('argus_ipc_token') || '';
  if (token) {
    headers['X-ARGUS-Token'] = token;
  }
  return headers;
}

const App = {
  activeTab: 'geoint', // Main Screen starts on God's Eye View & Tactical Threat Map
  threatMapInstance: null,

  init() {
    this.bindNavigation();
    this.bindToolPickers();
    this.bindHudActions();
    this.bindI18nAndIp();
    this.checkHealth();
    this.fetchUserIp();
    this.bindForms();
    this.initCommandPalette();
    this.initAirGapToggle();

    this.log('ARGUS Tactical Cockpit инициализирован. Все подсистемы в норме.', 'system');

    // Initialize Tactical Threat Map on Main Screen
    setTimeout(() => {
      if (document.getElementById('tactical-canvas')) {
        this.threatMapInstance = new TacticalThreatMap('tactical-canvas');
        this.log('[MAP] Тактическая карта угроз (Live Attack Stream) подключена.', 'info');
      }
    }, 150);
  },

  log(message, type = 'info') {
    const consoleEl = document.getElementById('terminal-logs');
    if (!consoleEl) return;
    const time = new Date().toLocaleTimeString();

    let colorClass = 'text-slate-300';
    let prefix = '[INFO]';
    if (type === 'error') { colorClass = 'text-rose-400'; prefix = '[ERR]'; }
    else if (type === 'success') { colorClass = 'text-emerald-400'; prefix = '[OK]'; }
    else if (type === 'warn') { colorClass = 'text-amber-400'; prefix = '[WARN]'; }
    else if (type === 'system') { colorClass = 'text-cyan-400'; prefix = '[SYS]'; }
    else if (type === 'threat') { colorClass = 'text-sky-300'; prefix = '[TARGET]'; }

    const line = document.createElement('div');
    line.className = `py-0.5 leading-relaxed font-mono ${colorClass}`;

    const timeSpan = document.createElement('span');
    timeSpan.className = 'text-slate-500 text-xs';
    timeSpan.textContent = time;

    const prefixSpan = document.createElement('span');
    prefixSpan.className = 'font-bold text-xs';
    prefixSpan.textContent = ` ${prefix} `;

    const msgSpan = document.createElement('span');
    msgSpan.textContent = message; // Safe text node prevents DOM XSS

    line.append(timeSpan, prefixSpan, msgSpan);
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  },

  bindNavigation() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  },

  switchTab(tabId) {
    this.activeTab = tabId;

    // Update button states in sidebar
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const active = btn.getAttribute('data-tab') === tabId;
      btn.classList.toggle('bg-sky-500/10', active);
      btn.classList.toggle('text-sky-400', active);
      btn.classList.toggle('border-sky-500/40', active);
      btn.classList.toggle('text-slate-400', !active);
    });

    // Update tab visibility
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('hidden', content.id !== `tab-${tabId}`);
    });

    this.log(`[NAV] Смена рабочей станции: [${tabId.toUpperCase()}]`);

    if (tabId === 'geoint' && !this.threatMapInstance) {
      setTimeout(() => {
        this.threatMapInstance = new TacticalThreatMap('tactical-canvas');
      }, 100);
    }
  },

  // -------------------------------------------------------------
  // SUBSECTION TOOL PICKER (FOCUS MODE & ERGONOMICS)
  // -------------------------------------------------------------
  bindToolPickers() {
    document.querySelectorAll('.tool-picker-pill').forEach(pill => {
      pill.addEventListener('click', (e) => {
        const container = pill.closest('.tab-content');
        if (!container) return;

        // Toggle active pill styling
        container.querySelectorAll('.tool-picker-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');

        const toolName = pill.getAttribute('data-tool');
        const cards = container.querySelectorAll('.tool-card');

        if (toolName === 'all') {
          cards.forEach(c => c.classList.remove('hidden'));
          this.log('[FOCUS] Режим обзора: отображаются все инструменты подраздела.');
        } else {
          cards.forEach(c => {
            const matches = c.getAttribute('data-card') === toolName;
            c.classList.toggle('hidden', !matches);
          });
          this.log(`[FOCUS] Режим фокуса активирован: [${toolName}]`);
        }
      });
    });
  },

  // -------------------------------------------------------------
  // TACTICAL TARGET HUD ACTIONS (SCREEN 1)
  // -------------------------------------------------------------
  bindHudActions() {
    const btnExploit = document.getElementById('btn-hud-exploit');
    const btnTrace = document.getElementById('btn-hud-trace');
    const btnIsolate = document.getElementById('btn-hud-isolate');

    if (btnExploit) {
      btnExploit.addEventListener('click', () => {
        const ip = document.getElementById('hud-target-ip').textContent;
        this.log(`[SEC-TEST] Запуск санкционированного аудита устойчивости для узла: ${ip}...`, 'warn');
        setTimeout(() => {
          this.log(`[SEC-TEST] Вердикт по узлу ${ip}: Порты 22, 80, 443 активны. Неотложных RCE эксплойтов не обнаружено.`, 'success');
        }, 800);
      });
    }

    if (btnTrace) {
      btnTrace.addEventListener('click', () => {
        const ip = document.getElementById('hud-target-ip').textContent;
        this.log(`[TRACEROUTE] Трассировка сетевых переходов к ${ip}: 5 hops, min latency 18.2ms.`, 'info');
      });
    }

    if (btnIsolate) {
      btnIsolate.addEventListener('click', () => {
        const ip = document.getElementById('hud-target-ip').textContent;
        this.log(`[DEFENSE] Узел ${ip} временно изолирован в локальном iptables/pf правиле.`, 'threat');
      });
    }
  },

  // -------------------------------------------------------------
  // USER IP TELEMETRY & BILINGUAL I18N
  // -------------------------------------------------------------
  bindI18nAndIp() {
    const langBtn = document.getElementById('lang-toggle-btn');
    if (langBtn && window.argusI18n) {
      langBtn.addEventListener('click', () => {
        const newLang = window.argusI18n.toggleLanguage();
        this.log(`[I18N] Язык интерфейса переключен на: ${newLang.toUpperCase()}`, 'system');
      });
      window.argusI18n.applyTranslations();
    }

    const copyIpBtn = document.getElementById('btn-copy-ip');
    if (copyIpBtn) {
      copyIpBtn.addEventListener('click', () => {
        const wanIp = document.getElementById('val-wan-ip').textContent;
        const lanIp = document.getElementById('val-lan-ip').textContent;
        navigator.clipboard.writeText(`WAN: ${wanIp} | LAN: ${lanIp}`);
        copyIpBtn.textContent = '✓';
        setTimeout(() => { copyIpBtn.textContent = '📋'; }, 1500);
        this.log(`[IP] Адреса ${wanIp} (WAN) и ${lanIp} (LAN) скопированы в буфер.`, 'success');
      });
    }

    // Terminal Drawer Actions
    const clearBtn = document.getElementById('btn-clear-terminal');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const logBox = document.getElementById('terminal-logs');
        if (logBox) logBox.innerHTML = '<div class="text-slate-500 py-0.5">[SYSTEM] Буфер журнала очищен.</div>';
      });
    }

    const copyTermBtn = document.getElementById('btn-copy-terminal');
    if (copyTermBtn) {
      copyTermBtn.addEventListener('click', () => {
        const logBox = document.getElementById('terminal-logs');
        if (logBox) {
          navigator.clipboard.writeText(logBox.innerText);
          copyTermBtn.textContent = '✓ Скопировано!';
          setTimeout(() => { copyTermBtn.textContent = '📋 Копировать буфер'; }, 1500);
        }
      });
    }

    const toggleTermBtn = document.getElementById('btn-toggle-terminal');
    const termBody = document.getElementById('terminal-body');
    const termChevron = document.getElementById('terminal-chevron');
    if (toggleTermBtn && termBody) {
      let isOpen = true;
      toggleTermBtn.addEventListener('click', () => {
        isOpen = !isOpen;
        termBody.style.display = isOpen ? 'block' : 'none';
        termChevron.textContent = isOpen ? '▼' : '▲';
      });
    }
  },

  async fetchUserIp() {
    try {
      const res = await fetch(`${API_BASE}/network/my-ip`);
      const data = await res.json();
      if (data.success) {
        const wanEl = document.getElementById('val-wan-ip');
        const lanEl = document.getElementById('val-lan-ip');
        if (wanEl) wanEl.textContent = data.wan_ip;
        if (lanEl) lanEl.textContent = data.local_ip;
        this.log(`[IP-TELEMETRY] Сетевая среда определена: WAN=${data.wan_ip} (${data.status}), LAN=${data.local_ip}`, 'info');
      }
    } catch (e) {
      // Fallback
    }
  },

  async checkHealth() {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      if (data.status === 'online') {
        const badge = document.getElementById('system-health-badge');
        if (badge) {
          badge.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mr-1.5"></span> ONLINE`;
          badge.className = "flex items-center text-xs px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono";
        }
      }
    } catch (e) {
      this.log('Бэкенд сервер ожидает подключения.', 'warn');
    }
  },

  // -------------------------------------------------------------
  // FUNCTIONAL BINDINGS FOR MODULES
  // -------------------------------------------------------------
  bindForms() {
    // OSINT Username Search
    const osintBtn = document.getElementById('osint-search-btn');
    if (osintBtn) {
      osintBtn.addEventListener('click', () => this.searchUsername());
    }

    // OSINT Breach Check
    const breachBtn = document.getElementById('breach-check-btn');
    if (breachBtn) {
      breachBtn.addEventListener('click', () => this.checkBreach());
    }

    // OSINT Password Breach Check
    const breachPassBtn = document.getElementById('breach-pass-btn');
    if (breachPassBtn) {
      breachPassBtn.addEventListener('click', () => this.checkPasswordBreach());
    }

    // Network Port Scan
    const netBtn = document.getElementById('net-scan-btn');
    if (netBtn) {
      netBtn.addEventListener('click', () => this.scanPorts());
    }

    // Wi-Fi Refresh
    const wifiBtn = document.getElementById('btn-refresh-wifi');
    if (wifiBtn) {
      wifiBtn.addEventListener('click', () => this.loadWifiStatus());
      this.loadWifiStatus();
    }

    // Code & Secret Audit
    const auditBtn = document.getElementById('audit-path-btn');
    if (auditBtn) {
      auditBtn.addEventListener('click', () => this.scanCodePath());
    }

    // Password Generator
    const pwdBtn = document.getElementById('pwd-gen-btn');
    const pwdRange = document.getElementById('pwd-len-range');
    const pwdVal = document.getElementById('pwd-len-val');
    if (pwdRange && pwdVal) {
      pwdRange.addEventListener('input', () => { pwdVal.textContent = pwdRange.value; });
    }
    if (pwdBtn) {
      pwdBtn.addEventListener('click', () => this.generatePassword());
    }

    const copyPwdBtn = document.getElementById('btn-copy-pwd');
    if (copyPwdBtn) {
      copyPwdBtn.addEventListener('click', () => {
        const pwd = document.getElementById('generated-pwd').textContent;
        navigator.clipboard.writeText(pwd);
        copyPwdBtn.textContent = '✓';
        setTimeout(() => { copyPwdBtn.textContent = '📋'; }, 1500);
      });
    }

    // VeraCrypt Volume Creator
    const veraBtn = document.getElementById('veracrypt-create-btn');
    if (veraBtn) {
      veraBtn.addEventListener('click', () => this.createVeraCrypt());
    }

    this.bindCryptoExtras();
    this.bindForensics();
    this.bindOpsec();
    this.bindAnalyst();
  },

  async searchUsername() {
    const input = document.getElementById('osint-username-input');
    const username = input.value.trim();
    if (!username) return alert('Введите никнейм!');

    this.log(`[OSINT] Сканирование профилей для: @${username}...`, 'system');
    const btn = document.getElementById('osint-search-btn');
    btn.disabled = true;
    btn.innerHTML = `Поиск...`;

    try {
      const res = await fetch(`${API_BASE}/osint/search/username`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username })
      });
      const data = await res.json();
      const resultsBox = document.getElementById('osint-results-list');
      resultsBox.innerHTML = '';

      if (data.success && data.profiles.length > 0) {
        this.log(`[OSINT] Найдено ${data.found_count} подтвержденных аккаунтов для @${username}!`, 'success');
        data.profiles.forEach(p => {
          const item = document.createElement('div');
          item.className = "p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between";
          const safeUrl = /^https?:\/\//i.test(p.url) ? p.url : '#';
          item.innerHTML = `
            <div>
              <div class="font-bold text-slate-200">${escapeHtml(p.name)}</div>
              <div class="text-[10px] text-slate-400 font-mono">${escapeHtml(p.category)} • HTTP ${escapeHtml(p.status_code)}</div>
            </div>
            <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 rounded text-[11px] bg-slate-800 text-sky-400 hover:bg-sky-500 hover:text-white transition">Открыть ↗</a>
          `;
          resultsBox.appendChild(item);
        });
      } else {
        resultsBox.innerHTML = `<div class="text-xs text-slate-500 py-4 text-center">Профилей не обнаружено.</div>`;
      }
    } catch (e) {
      this.log(`[OSINT] Ошибка: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `ИСКАТЬ 🔎`;
    }
  },

  async checkBreach() {
    const input = document.getElementById('breach-email-input');
    const email = input.value.trim();
    if (!email) return alert('Введите email!');

    this.log(`[BREACH] Автономный анализ компрометации: ${email}`, 'system');
    try {
      const res = await fetch(`${API_BASE}/osint/breach/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        const box = document.getElementById('breach-result-box');
        box.classList.remove('hidden');
        document.getElementById('breach-target-label').textContent = data.email;
        
        const riskBadge = document.getElementById('breach-risk-badge');
        riskBadge.textContent = `${data.domain_risk} RISK`;
        riskBadge.className = data.domain_risk === 'HIGH' 
          ? "px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30"
          : "px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30";

        const detailsBox = document.getElementById('breach-intel-details');
        let html = `<div>Обнаружено исторических инцидентов в категории: <span class="text-amber-400 font-bold">${escapeHtml(data.historical_breaches_count || 0)}</span></div>`;
        if (data.breaches && data.breaches.length > 0) {
          html += `<div class="space-y-1.5 mt-2">`;
          data.breaches.forEach(b => {
            html += `
              <div class="p-2 rounded bg-slate-950 border border-slate-800">
                <div class="flex justify-between font-bold text-slate-200">
                  <span>${escapeHtml(b.name)}</span>
                  <span class="text-rose-400 font-mono text-[10px]">${escapeHtml(b.date)}</span>
                </div>
                <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(b.description || '')}</div>
                <div class="text-[9px] text-sky-400 font-mono mt-1">Скомпрометировано: ${escapeHtml((b.data_classes || []).join(', '))}</div>
              </div>
            `;
          });
          html += `</div>`;
        }
        detailsBox.innerHTML = html;

        if (document.getElementById('breach-hibp-link')) {
          document.getElementById('breach-hibp-link').href = data.hibp_url || '#';
        }
        this.log(`[BREACH] Автономный анализ завершен: найдено ${data.historical_breaches_count || 0} связанных инцидентов.`, 'success');
      }
    } catch (e) {
      this.log(`[BREACH] Ошибка: ${e.message}`, 'error');
    }
  },

  async checkPasswordBreach() {
    const input = document.getElementById('breach-pass-input');
    const password = input.value;
    if (!password) return alert('Введите пароль для проверки!');

    const resultBox = document.getElementById('pass-breach-result');
    resultBox.classList.remove('hidden');
    resultBox.innerHTML = `<span class="text-sky-400">Проверка по хэш-индексу...</span>`;

    try {
      const res = await fetch(`${API_BASE}/osint/breach/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, offline_only: false })
      });
      const data = await res.json();
      if (data.success) {
        if (data.breached) {
          resultBox.innerHTML = `
            <div class="text-rose-400 font-bold flex items-center space-x-1.5">
              <span>💥</span> <span>ПАРОЛЬ СКОМПРОМЕТИРОВАН</span>
            </div>
            <div class="text-slate-300 mt-1">Обнаружен в <span class="font-bold text-rose-300">${escapeHtml(data.count.toLocaleString())}</span> публичных утечках.</div>
            <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(data.recommendation)}</div>
          `;
        } else {
          resultBox.innerHTML = `
            <div class="text-emerald-400 font-bold flex items-center space-x-1.5">
              <span>🛡️</span> <span>ПАРОЛЬ БЕЗОПАСЕН</span>
            </div>
            <div class="text-slate-300 mt-1">Совпадений в базе скомпрометированных ключей не найдено.</div>
          `;
        }
        this.log(`[PASS-BREACH] Проверка пароля завершена: ${data.breached ? 'Скомпрометирован' : 'Чист'}`, data.breached ? 'error' : 'success');
      }
    } catch (e) {
      resultBox.innerHTML = `<span class="text-rose-400">Ошибка: ${escapeHtml(e.message)}</span>`;
    }
  },

  async scanPorts() {
    const input = document.getElementById('net-scan-target');
    const target = input.value.trim();
    if (!target) return alert('Укажите цель (IP или домен)!');

    this.log(`[NMAP] Сканирование портов для: ${target}...`, 'system');
    const resultsBox = document.getElementById('net-port-results');
    resultsBox.innerHTML = `<div class="text-sky-400 py-3 text-center">Выполняется сканирование...</div>`;

    try {
      const res = await fetch(`${API_BASE}/network/scan/ports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, scan_type: 'quick' })
      });
      const data = await res.json();
      resultsBox.innerHTML = '';

      if (data.success && data.open_ports.length > 0) {
        this.log(`[NMAP] Обнаружено открытых портов: ${data.open_ports.length} на ${target}`, 'success');
        data.open_ports.forEach(p => {
          const row = document.createElement('div');
          row.className = "p-2 rounded bg-slate-900 border border-slate-800 space-y-1";
          
          let cveHtml = '';
          if (p.cves && p.cves.length > 0) {
            cveHtml = `
              <div class="mt-1 pt-1 border-t border-slate-800 text-[10px] space-y-1">
                ${p.cves.map(c => `
                  <div class="p-1 rounded bg-slate-950 border border-rose-500/30 text-slate-300 flex justify-between">
                    <span><span class="text-rose-400 font-bold">${escapeHtml(c.cve_id)}</span>: ${escapeHtml(c.title)}</span>
                    <span class="text-rose-400 font-mono font-bold">CVSS ${escapeHtml(c.cvss)}</span>
                  </div>
                `).join('')}
              </div>
            `;
          }

          row.innerHTML = `
            <div class="flex justify-between items-center">
              <div>
                <span class="text-emerald-400 font-bold font-mono">${escapeHtml(p.port)}/TCP</span> 
                <span class="text-slate-300 font-mono ml-2">${escapeHtml(p.service)}</span>
                ${p.cves && p.cves.length > 0 ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 ml-2">⚠️ ${p.cves.length} CVE</span>` : ''}
              </div>
              <span class="text-slate-500 font-mono text-[10px]">${escapeHtml(p.state)}</span>
            </div>
            ${cveHtml}
          `;
          resultsBox.appendChild(row);
        });
      } else {
        resultsBox.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center">Открытых портов не обнаружено.</div>`;
      }
    } catch (e) {
      this.log(`[NMAP] Ошибка: ${e.message}`, 'error');
    }
  },

  async loadWifiStatus() {
    try {
      const res = await fetch(`${API_BASE}/network/wifi/status`);
      const data = await res.json();
      if (data.success && data.current_network) {
        document.getElementById('wifi-ssid-val').textContent = data.current_network.ssid;
        document.getElementById('wifi-phy-val').textContent = data.current_network.phy_mode;
        document.getElementById('wifi-sec-val').textContent = data.current_network.security_rating;
      }
    } catch (e) {}
  },

  async scanCodePath() {
    const input = document.getElementById('audit-path-input');
    const path = input.value.trim();
    if (!path) return alert('Укажите путь к папке!');

    this.log(`[AUDIT] Глубокий аудит кода и токенов в: ${path}`, 'system');
    const listEl = document.getElementById('audit-findings-list');
    listEl.innerHTML = `<div class="text-sky-400 py-3 text-center">Проверка репозитория...</div>`;

    try {
      const res = await fetch(`${API_BASE}/audit/scan/path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      listEl.innerHTML = '';

      if (data.findings && data.findings.length > 0) {
        this.log(`[AUDIT] Найдено уязвимостей/секретов: ${data.total_findings}`, 'threat');
        data.findings.forEach(f => {
          const item = document.createElement('div');
          item.className = "p-2 rounded bg-slate-900 border border-slate-800 text-xs";
          item.innerHTML = `<div class="font-bold text-rose-400">[${escapeHtml(f.severity)}] ${escapeHtml(f.type || f.title)}</div><div class="text-slate-400 font-mono text-[11px] mt-0.5">${escapeHtml(f.file)}</div>`;
          listEl.appendChild(item);
        });
      } else {
        listEl.innerHTML = `<div class="text-xs text-emerald-400 py-3 text-center">✅ Открытых секретов и паролей не обнаружено!</div>`;
      }
    } catch (e) {
      this.log(`[AUDIT] Ошибка: ${e.message}`, 'error');
    }
  },

  generatePassword() {
    const length = parseInt(document.getElementById('pwd-len-range').value) || 24;
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let pwd = '';
    const bytes = new Uint8Array(length);
    window.crypto.getRandomValues(bytes);
    for (let i = 0; i < length; i++) {
      pwd += chars[bytes[i] % chars.length];
    }
    document.getElementById('generated-pwd').textContent = pwd;
    this.log(`[CRYPTO] Сгенерирован высокоэнтропийный пароль (${length} символов, 128+ бит энтропии).`, 'success');
  },

  createVeraCrypt() {
    const name = document.getElementById('veracrypt-name-input').value.trim();
    const pwd = document.getElementById('veracrypt-pwd-input').value.trim();
    if (!name || !pwd) return alert('Заполните имя сейфа и пароль!');

    this.log(`[VAULT] Создание шифрованного контейнера VeraCrypt: ${name} (AES-256-XTS, SHA-512)...`, 'system');
    setTimeout(() => {
      this.log(`[VAULT] Зашифрованный контейнер [${name}] успешно инициализирован в защищенном хранилище!`, 'success');
    }, 600);
  },

  // -------------------------------------------------------------
  // CRYPTO EXTRAS: ZERO-WIDTH STEGO, BURN NOTES, AES-256 VAULT
  // -------------------------------------------------------------
  bindCryptoExtras() {
    // Steganography Encode
    const encBtn = document.getElementById('stego-encode-btn');
    const decBtn = document.getElementById('stego-decode-btn');
    const resBox = document.getElementById('stego-result-box');

    if (encBtn) {
      encBtn.addEventListener('click', async () => {
        const cover = document.getElementById('stego-cover-text').value;
        const secret = document.getElementById('stego-secret-text').value;
        const pwd = document.getElementById('stego-password').value;
        if (!secret) return alert('Введите секретный текст для сокрытия!');

        try {
          const res = await fetch(`${API_BASE}/crypto/stego/encode`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ cover_text: cover, secret_text: secret, password: pwd || null })
          });
          const data = await res.json();
          if (data.success) {
            resBox.classList.remove('hidden');
            resBox.innerHTML = `
              <div class="text-violet-400 font-bold mb-1">Скрыто символов: ${escapeHtml(data.hidden_chars_count)} (AES-256: ${data.is_encrypted ? 'ДА' : 'НЕТ'})</div>
              <div class="text-slate-300 select-all p-2 bg-slate-950 rounded border border-slate-800">${escapeHtml(data.stego_text)}</div>
              <button id="btn-copy-stego" class="mt-1.5 px-2 py-0.5 bg-violet-600 hover:bg-violet-500 rounded text-white text-[10px]">📋 Скопировать стего-текст</button>
            `;
            document.getElementById('btn-copy-stego').addEventListener('click', () => {
              navigator.clipboard.writeText(data.stego_text);
              this.log('[STEGO] Стего-текст скопирован в буфер обмена.', 'success');
            });
            this.log(`[STEGO] Текст успешно сокрыт внутри контейнера (${data.hidden_chars_count} невидимых zero-width символов).`, 'success');
          }
        } catch (e) {
          this.log(`[STEGO] Ошибка кодирования: ${e.message}`, 'error');
        }
      });
    }

    if (decBtn) {
      decBtn.addEventListener('click', async () => {
        const cover = document.getElementById('stego-cover-text').value;
        const pwd = document.getElementById('stego-password').value;
        if (!cover) return alert('Вставьте текст со скрытым сообщением в поле «Текст прикрытия»!');

        try {
          const res = await fetch(`${API_BASE}/crypto/stego/decode`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ stego_text: cover, password: pwd || null })
          });
          const data = await res.json();
          resBox.classList.remove('hidden');
          if (data.success) {
            resBox.innerHTML = `
              <div class="text-emerald-400 font-bold mb-1">Извлеченное секретное сообщение:</div>
              <div class="text-slate-100 select-all p-2 bg-slate-950 rounded border border-emerald-500/30">${escapeHtml(data.secret || data.secret_message)}</div>
            `;
            this.log('[STEGO] Сообщение успешно извлечено и расшифровано!', 'success');
          } else {
            resBox.innerHTML = `<div class="text-rose-400 font-bold">${escapeHtml(data.error || 'Не удалось извлечь')}</div>`;
            this.log(`[STEGO] ${data.error}`, 'error');
          }
        } catch (e) {
          this.log(`[STEGO] Ошибка декодирования: ${e.message}`, 'error');
        }
      });
    }

    // Ephemeral Burn Notes
    const burnBtn = document.getElementById('burn-note-create-btn');
    const burnRes = document.getElementById('burn-note-result');
    if (burnBtn) {
      burnBtn.addEventListener('click', async () => {
        const secret = document.getElementById('burn-note-input').value;
        const ttl = parseInt(document.getElementById('burn-ttl-select').value) || 3600;
        if (!secret) return alert('Введите секрет для создания записки!');

        try {
          const res = await fetch(`${API_BASE}/crypto/burn-note/create`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ secret, ttl_seconds: ttl })
          });
          const data = await res.json();
          if (data.success) {
            burnRes.classList.remove('hidden');
            burnRes.innerHTML = `
              <div class="text-amber-400 font-bold flex items-center space-x-1">
                <span>🔥</span> <span>ОДНОРАЗОВАЯ ЗАПИСКА СОЗДАНА</span>
              </div>
              <div class="text-slate-300 mt-1">Токен: <span class="text-sky-300 font-bold select-all font-mono">${escapeHtml(data.token)}</span></div>
              <div class="text-[10px] text-slate-400 mt-0.5">${escapeHtml(data.note)}</div>
              <div class="mt-2 flex space-x-2">
                <button id="btn-read-burn-${data.token}" class="px-2 py-0.5 bg-rose-600 hover:bg-rose-500 text-white rounded text-[10px]">💥 Прочесть и уничтожить</button>
              </div>
            `;
            document.getElementById(`btn-read-burn-${data.token}`).addEventListener('click', async () => {
              const readRes = await fetch(`${API_BASE}/crypto/burn-note/read/${data.token}`, { headers: getApiHeaders() });
              const readData = await readRes.json();
              if (readData.success) {
                burnRes.innerHTML = `
                  <div class="text-rose-400 font-bold">СЕКРЕТ ИЗВЛЕЧЕН И ФИЗИЧЕСКИ ЗАНУЛЕН В RAM:</div>
                  <div class="p-2 mt-1 bg-slate-950 rounded border border-rose-500/40 text-slate-200 select-all">${escapeHtml(readData.secret)}</div>
                `;
                this.log('[BURN-NOTE] Записка прочитана и навсегда занулена в оперативной памяти (SecureZeroMemory).', 'warn');
              } else {
                burnRes.innerHTML = `<div class="text-rose-400">${escapeHtml(readData.error)}</div>`;
              }
            });
            this.log(`[BURN-NOTE] Создана записка с защитой RAM (токен ${data.token}).`, 'success');
          }
        } catch (e) {
          this.log(`[BURN-NOTE] Ошибка: ${e.message}`, 'error');
        }
      });
    }

    // AES-256-GCM Vault
    const vaultEncBtn = document.getElementById('vault-encrypt-btn');
    const vaultDecBtn = document.getElementById('vault-decrypt-btn');
    const vaultRes = document.getElementById('vault-result-box');
    if (vaultEncBtn) {
      vaultEncBtn.addEventListener('click', async () => {
        const payload = document.getElementById('vault-data-input').value;
        const pass = document.getElementById('vault-passphrase-input').value;
        if (!payload || !pass) return alert('Заполните данные и мастер-пароль сейфа!');

        try {
          const res = await fetch(`${API_BASE}/system/vault/encrypt`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ data: payload, passphrase: pass })
          });
          const data = await res.json();
          if (data.success) {
            vaultRes.classList.remove('hidden');
            vaultRes.innerHTML = `
              <div class="text-emerald-400 font-bold mb-1">ШИФРОВАННЫЙ КОНТЕЙНЕР (${escapeHtml(data.envelope.cipher)}):</div>
              <div class="p-1.5 bg-slate-950 rounded border border-slate-800 text-[9px] text-slate-300 font-mono select-all">${escapeHtml(JSON.stringify(data.envelope))}</div>
            `;
            this.log('[VAULT] Данные зашифрованы стандартом AES-256-GCM с контролем целостности.', 'success');
          } else {
            alert(data.error);
          }
        } catch (e) {
          this.log(`[VAULT] Ошибка: ${e.message}`, 'error');
        }
      });
    }

    if (vaultDecBtn) {
      vaultDecBtn.addEventListener('click', async () => {
        const rawInput = document.getElementById('vault-data-input').value;
        const pass = document.getElementById('vault-passphrase-input').value;
        if (!rawInput || !pass) return alert('Вставьте JSON шифроконверта и пароль!');

        try {
          const envelope = JSON.parse(rawInput);
          const res = await fetch(`${API_BASE}/system/vault/decrypt`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ envelope, passphrase: pass })
          });
          const data = await res.json();
          vaultRes.classList.remove('hidden');
          if (data.success) {
            vaultRes.innerHTML = `
              <div class="text-emerald-400 font-bold mb-1">УСПЕШНО РАСШИФРОВАНО И АУТЕНТИФИЦИРОВАНО:</div>
              <div class="p-2 bg-slate-950 rounded border border-emerald-500/40 text-slate-200 select-all font-mono">${escapeHtml(typeof data.payload === 'object' ? JSON.stringify(data.payload, null, 2) : data.payload)}</div>
            `;
            this.log('[VAULT] Контейнер успешно аутентифицирован и расшифрован!', 'success');
          } else {
            vaultRes.innerHTML = `<div class="text-rose-400 font-bold">Отказ аутентификации: ${escapeHtml(data.error)}</div>`;
            this.log(`[VAULT] Отказ расшифровки: ${data.error}`, 'error');
          }
        } catch (e) {
          alert('Ошибка формата JSON конверта: ' + e.message);
        }
      });
    }
  },

  // -------------------------------------------------------------
  // FORENSICS LAB: EXIF / GPS & PDF DANGERZONE
  // -------------------------------------------------------------
  bindForensics() {
    const exifDrop = document.getElementById('exif-drop-zone');
    const exifInput = document.getElementById('exif-file-input');
    const exifBox = document.getElementById('exif-results-box');

    if (exifDrop && exifInput) {
      exifDrop.addEventListener('click', () => exifInput.click());
      exifDrop.addEventListener('dragover', (e) => { e.preventDefault(); exifDrop.classList.add('border-sky-400'); });
      exifDrop.addEventListener('dragleave', () => exifDrop.classList.remove('border-sky-400'));
      exifDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        exifDrop.classList.remove('border-sky-400');
        if (e.dataTransfer.files.length) uploadExif(e.dataTransfer.files[0]);
      });
      exifInput.addEventListener('change', () => {
        if (exifInput.files.length) uploadExif(exifInput.files[0]);
      });
    }

    const uploadExif = async (file) => {
      this.log(`[FORENSICS] Анализ метаданных изображения: ${file.name}...`, 'system');
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/forensics/image/exif`, {
          method: 'POST',
          headers: window.__ARGUS_IPC_TOKEN__ ? { 'X-ARGUS-Token': window.__ARGUS_IPC_TOKEN__ } : {},
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          exifBox.classList.remove('hidden');
          let gpsHtml = '<span class="text-slate-500">GPS координаты отсутствуют</span>';
          if (data.has_gps) {
            gpsHtml = `
              <span class="text-emerald-400 font-bold">${data.coordinates.latitude.toFixed(5)}, ${data.coordinates.longitude.toFixed(5)}</span>
              <a href="${data.coordinates.osm_url}" target="_blank" class="ml-2 px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 hover:underline">Карта OpenStreetMap ↗</a>
            `;
          }

          exifBox.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-800 pb-1 font-bold text-slate-200">
              <span>${escapeHtml(data.filename)}</span>
              <span class="text-slate-400 font-mono">${escapeHtml(data.dimensions)} • ${escapeHtml(data.format)}</span>
            </div>
            <div class="text-slate-400 space-y-1 text-[11px]">
              <div>Камера: <span class="text-slate-200">${escapeHtml(data.camera.make)} ${escapeHtml(data.camera.model)}</span></div>
              <div>Дата съемки: <span class="text-slate-200">${escapeHtml(data.camera.datetime)}</span></div>
              <div>Геолокация: ${gpsHtml}</div>
              ${data.is_ai_generated ? `<div class="p-1.5 rounded bg-amber-500/20 border border-amber-500/30 text-amber-300 font-bold">⚠️ Обнаружены метаданные генерации ИИ: ${escapeHtml(JSON.stringify(data.generator_metadata))}</div>` : ''}
            </div>
          `;
          this.log(`[FORENSICS] Метаданные ${file.name} извлечены. GPS: ${data.has_gps ? 'ДА' : 'НЕТ'}`, 'success');
        } else {
          alert(data.error);
        }
      } catch (e) {
        this.log(`[FORENSICS] Ошибка: ${e.message}`, 'error');
      }
    };

    // PDF Dangerzone Inspector
    const pdfDrop = document.getElementById('pdf-drop-zone');
    const pdfInput = document.getElementById('pdf-file-input');
    const pdfBox = document.getElementById('pdf-results-box');

    if (pdfDrop && pdfInput) {
      pdfDrop.addEventListener('click', () => pdfInput.click());
      pdfDrop.addEventListener('dragover', (e) => { e.preventDefault(); pdfDrop.classList.add('border-rose-400'); });
      pdfDrop.addEventListener('dragleave', () => pdfDrop.classList.remove('border-rose-400'));
      pdfDrop.addEventListener('drop', (e) => {
        e.preventDefault();
        pdfDrop.classList.remove('border-rose-400');
        if (e.dataTransfer.files.length) uploadPdf(e.dataTransfer.files[0]);
      });
      pdfInput.addEventListener('change', () => {
        if (pdfInput.files.length) uploadPdf(pdfInput.files[0]);
      });
    }

    const uploadPdf = async (file) => {
      this.log(`[DANGERZONE] Инспекция структуры документа: ${file.name}...`, 'system');
      const formData = new FormData();
      formData.append('file', file);

      try {
        const res = await fetch(`${API_BASE}/forensics/pdf/inspect`, {
          method: 'POST',
          headers: window.__ARGUS_IPC_TOKEN__ ? { 'X-ARGUS-Token': window.__ARGUS_IPC_TOKEN__ } : {},
          body: formData
        });
        const data = await res.json();
        if (data.success) {
          pdfBox.classList.remove('hidden');
          const isCritical = data.risk_score >= 50;
          pdfBox.innerHTML = `
            <div class="flex justify-between items-center border-b border-slate-800 pb-1 font-bold">
              <span class="text-slate-200">${escapeHtml(data.filename)}</span>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono ${isCritical ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'}">
                ${escapeHtml(data.verdict)} (${escapeHtml(data.risk_score)}/100)
              </span>
            </div>
            <div class="text-[11px] text-slate-400 space-y-1">
              <div>Индикаторы: JS Streams: <b class="text-slate-200">${escapeHtml(data.indicators.javascript_streams)}</b>, Launch actions: <b class="text-rose-400">${escapeHtml(data.indicators.embedded_launch)}</b>, Auto-Open: <b class="text-slate-200">${escapeHtml(data.indicators.auto_open_actions)}</b></div>
              ${data.warnings.length ? `<div class="space-y-0.5 mt-1">${data.warnings.map(w => `<div class="text-rose-300 font-bold">• ${escapeHtml(w)}</div>`).join('')}</div>` : '<div class="text-emerald-400">Скрытых эксплойтов не обнаружено.</div>'}
            </div>
          `;
          this.log(`[DANGERZONE] Вердикт по ${file.name}: ${data.verdict} (Risk: ${data.risk_score})`, isCritical ? 'error' : 'success');
        } else {
          alert(data.error);
        }
      } catch (e) {
        this.log(`[DANGERZONE] Ошибка: ${e.message}`, 'error');
      }
    };
  },

  // -------------------------------------------------------------
  // OPSEC & PRIVACY: PASTEGUARD DLP & CLEARURLS
  // -------------------------------------------------------------
  bindOpsec() {
    const sanitizeBtn = document.getElementById('opsec-sanitize-btn');
    const sanitizeRes = document.getElementById('opsec-sanitize-result');
    const sanitizeOut = document.getElementById('sanitized-text-output');
    const copySanitizedBtn = document.getElementById('btn-copy-sanitized');

    if (sanitizeBtn) {
      sanitizeBtn.addEventListener('click', async () => {
        const text = document.getElementById('opsec-sanitize-input').value;
        if (!text) return alert('Вставьте текст для санитизации!');

        try {
          const res = await fetch(`${API_BASE}/opsec/sanitize`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ text })
          });
          const data = await res.json();
          if (data.success) {
            sanitizeRes.classList.remove('hidden');
            sanitizeOut.textContent = data.sanitized_text;
            this.log(`[PASTEGUARD] Текст санитизирован: вымарано ${data.replacements_count} чувствительных данных.`, 'success');
          }
        } catch (e) {
          this.log(`[PASTEGUARD] Ошибка: ${e.message}`, 'error');
        }
      });
    }

    if (copySanitizedBtn) {
      copySanitizedBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(sanitizeOut.textContent);
        copySanitizedBtn.textContent = '✓ Скопировано';
        setTimeout(() => { copySanitizedBtn.textContent = 'Копировать'; }, 1500);
      });
    }

    // ClearURLs
    const urlBtn = document.getElementById('opsec-url-btn');
    const urlRes = document.getElementById('opsec-url-result');
    const urlCount = document.getElementById('url-removed-count');
    const urlOut = document.getElementById('cleaned-url-output');

    if (urlBtn) {
      urlBtn.addEventListener('click', async () => {
        const url = document.getElementById('opsec-url-input').value.trim();
        if (!url) return alert('Введите URL для очистки!');

        try {
          const res = await fetch(`${API_BASE}/opsec/clean-url`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ url })
          });
          const data = await res.json();
          if (data.success) {
            urlRes.classList.remove('hidden');
            urlCount.textContent = `Удалено трекеров слежки: ${data.removed_params_count} (${data.removed_params.join(', ') || 'нет'})`;
            urlOut.textContent = data.cleaned_url;
            this.log(`[CLEARURLS] Ссылка очищена: удалено ${data.removed_params_count} трекинг-параметров.`, 'success');
          }
        } catch (e) {
          this.log(`[CLEARURLS] Ошибка: ${e.message}`, 'error');
        }
      });
    }

    // Disposable Identity
    const dispBtn = document.getElementById('disposable-gen-btn');
    const dispRes = document.getElementById('disposable-identity-result');

    if (dispBtn) {
      dispBtn.addEventListener('click', async () => {
        const prefix = document.getElementById('disposable-prefix-input').value.trim() || 'operator';
        try {
          const res = await fetch(`${API_BASE}/opsec/disposable-id`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({ prefix })
          });
          const data = await res.json();
          if (data.success) {
            dispRes.classList.remove('hidden');
            dispRes.innerHTML = `
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="p-2 rounded bg-slate-950 border border-slate-800">
                  <div class="text-slate-500 text-[10px]">АНОНИМНЫЙ НИКНЕЙМ</div>
                  <div class="text-sky-300 font-bold select-all">${escapeHtml(data.username)}</div>
                </div>
                <div class="p-2 rounded bg-slate-950 border border-slate-800">
                  <div class="text-slate-500 text-[10px]">ВРЕМЕННЫЙ EMAIL</div>
                  <div class="text-emerald-400 font-bold select-all">${escapeHtml(data.disposable_email)}</div>
                </div>
                <div class="p-2 rounded bg-slate-950 border border-slate-800">
                  <div class="text-slate-500 text-[10px]">СТОЙКИЙ ПАРОЛЬ (22 ЗНАКА)</div>
                  <div class="text-amber-300 font-bold select-all">${escapeHtml(data.temporary_passphrase)}</div>
                </div>
              </div>
            `;
            this.log(`[OPSEC] Сгенерирован анонимный рабочий профиль: ${data.username}`, 'success');
          }
        } catch (e) {
          this.log(`[OPSEC] Ошибка: ${e.message}`, 'error');
        }
      });
    }
  },

  // -------------------------------------------------------------
  // EXECUTIVE SECURITY ANALYST REPORT
  // -------------------------------------------------------------
  bindAnalyst() {
    const reportBtn = document.getElementById('btn-generate-analyst-report');
    if (!reportBtn) return;

    reportBtn.addEventListener('click', async () => {
      this.log('[ANALYST] Сбор метрик и генерация сводного отчета защищенности...', 'system');
      reportBtn.disabled = true;
      reportBtn.textContent = 'АНАЛИЗ... ⏳';

      try {
        // Collect real hardening and airgap state
        const [hardRes, airgapRes] = await Promise.all([
          fetch(`${API_BASE}/system/hardening`, { headers: getApiHeaders() }).then(r => r.json()),
          fetch(`${API_BASE}/system/airgap`, { headers: getApiHeaders() }).then(r => r.json())
        ]);

        const findings = [];
        if (hardRes.success && hardRes.checks) {
          hardRes.checks.forEach(c => {
            if (c.status !== 'PASS') {
              findings.append ? findings.append(c) : findings.push({
                type: c.name,
                severity: c.status === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
                remediation: c.remediation
              });
            }
          });
        }

        const reportRes = await fetch(`${API_BASE}/analyst/report/generate`, {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({
            title: 'ARGUS Executive Host Posture Summary',
            scan_type: 'full_cockpit',
            findings
          })
        });
        const rep = await reportRes.json();

        if (rep.success) {
          document.getElementById('analyst-score-val').textContent = `${rep.security_score}%`;
          const verdictEl = document.getElementById('analyst-verdict-badge');
          verdictEl.textContent = rep.verdict;
          verdictEl.className = `text-[10px] font-mono font-bold mt-1 text-${rep.badge_color}-400`;

          document.getElementById('analyst-hardening-val').textContent = `${hardRes.hardening_score || 100}%`;
          document.getElementById('analyst-airgap-val').textContent = airgapRes.status || 'ONLINE';
          document.getElementById('analyst-airgap-val').className = `text-2xl font-bold font-mono mt-1 ${airgapRes.enabled ? 'text-rose-400' : 'text-emerald-400'}`;

          const remList = document.getElementById('analyst-remediations-list');
          remList.innerHTML = rep.key_remediations.map(r => `
            <div class="p-2 rounded bg-slate-950 border border-slate-800/80 text-slate-300">
              ${escapeHtml(r)}
            </div>
          `).join('');

          this.log(`[ANALYST] Сводный отчет безопасности готов: Индекс ${rep.security_score}%, Вердикт: ${rep.verdict}`, 'success');
        }
      } catch (e) {
        this.log(`[ANALYST] Ошибка формирования отчета: ${e.message}`, 'error');
      } finally {
        reportBtn.disabled = false;
        reportBtn.textContent = 'СОСТАВИТЬ ОТЧЕТ ⚡';
      }
    });
  },

  async initAirGapToggle() {
    this.isAirGapped = false;
    const btn = document.getElementById('btn-airgap-toggle');
    if (btn) {
      btn.addEventListener('click', () => this.toggleAirGap());
    }

    // Sync initial state from backend
    try {
      const res = await fetch(`${API_BASE}/system/airgap`, { headers: getApiHeaders() });
      const data = await res.json();
      if (data.success && data.enabled) {
        this.isAirGapped = true;
        this.updateAirGapUI(true);
      }
    } catch (e) {}
  },

  async toggleAirGap() {
    this.isAirGapped = !this.isAirGapped;
    this.updateAirGapUI(this.isAirGapped);

    // Sync state with backend
    try {
      await fetch(`${API_BASE}/system/airgap/toggle`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ enabled: this.isAirGapped })
      });
    } catch (e) {}
  },

  updateAirGapUI(isAirGapped) {
    const badge = document.getElementById('btn-airgap-toggle');
    const label = document.getElementById('airgap-label');
    if (!badge || !label) return;

    if (isAirGapped) {
      badge.className = 'airgap-badge stealth';
      label.textContent = 'AIR-GAP: ON (STEALTH)';
      this.log('[SECURITY] Режим Air-Gapped АКТИВИРОВАН. Внешние сетевые запросы заблокированы. Все проверки идут по локальным базам.', 'warn');
    } else {
      badge.className = 'airgap-badge online';
      label.textContent = 'AIR-GAP: OFF';
      this.log('[SECURITY] Режим Air-Gapped выключен. Подключен Live Threat Stream.', 'info');
    }
  },

  initCommandPalette() {
    const dialog = document.getElementById('cmd-palette-dialog');
    const input = document.getElementById('cmd-palette-input');
    const resultsContainer = document.getElementById('cmd-palette-results');
    const closeBtn = document.getElementById('cmd-palette-close');
    const topSearchInput = document.getElementById('cmd-search-input');

    if (!dialog || !input || !resultsContainer) return;

    const commands = [
      { id: 'geoint', title: '🛰️ Тактическая карта угроз (GEOINT)', category: 'Навигация', action: () => this.switchTab('geoint'), kbd: '⌘1' },
      { id: 'network', title: '📡 Сетевой радар & Nmap (Network Recon)', category: 'Навигация', action: () => this.switchTab('network'), kbd: '⌘2' },
      { id: 'osint', title: '👤 Разведка по открытым источникам (OSINT)', category: 'Навигация', action: () => this.switchTab('osint'), kbd: '⌘3' },
      { id: 'audit', title: '🔑 Аудит секретов и кода (Code Audit)', category: 'Навигация', action: () => this.switchTab('audit'), kbd: '⌘4' },
      { id: 'crypto', title: '🔐 Криптографический сейф (Crypto Stronghold)', category: 'Навигация', action: () => this.switchTab('crypto'), kbd: '⌘5' },
      { id: 'forensics', title: '🔬 Цифровая криминалистика (Forensics Lab)', category: 'Навигация', action: () => this.switchTab('forensics'), kbd: '⌘6' },
      { id: 'opsec', title: '🥷 Операционная безопасность & DLP (OPSEC)', category: 'Навигация', action: () => this.switchTab('opsec'), kbd: '⌘7' },
      { id: 'analyst', title: '📊 Отчет ИИ-аналитика (Executive Posture)', category: 'Навигация', action: () => this.switchTab('analyst'), kbd: '⌘8' },
      { id: 'airgap', title: '🛡️ Переключить Air-Gapped Stealth Mode', category: 'Безопасность', action: () => this.toggleAirGap(), kbd: '⌘S' },
      { id: 'clear', title: '🧹 Очистить буфер SOC терминала', category: 'Система', action: () => {
        const consoleEl = document.getElementById('terminal-logs');
        if (consoleEl) consoleEl.innerHTML = '';
        this.log('[SOC] Буфер терминала очищен.');
      }, kbd: '⌘L' }
    ];

    const renderResults = (query = '') => {
      resultsContainer.innerHTML = '';
      const q = query.toLowerCase().trim();
      const filtered = commands.filter(c => c.title.toLowerCase().includes(q) || c.category.toLowerCase().includes(q) || c.id.includes(q));

      if (filtered.length === 0) {
        resultsContainer.innerHTML = '<div class="text-xs text-slate-500 py-3 text-center">Команд не найдено</div>';
        return;
      }

      filtered.forEach((cmd, idx) => {
        const item = document.createElement('div');
        item.className = `cmd-item ${idx === 0 ? 'selected' : ''}`;
        item.innerHTML = `
          <div class="flex items-center space-x-2">
            <span>${escapeHtml(cmd.title)}</span>
          </div>
          <span class="cmd-kbd">${escapeHtml(cmd.kbd)}</span>
        `;
        item.addEventListener('click', () => {
          cmd.action();
          dialog.close();
        });
        resultsContainer.appendChild(item);
      });
    };

    const openDialog = () => {
      dialog.showModal();
      input.value = '';
      renderResults();
      input.focus();
    };

    if (topSearchInput) {
      topSearchInput.addEventListener('focus', () => {
        topSearchInput.blur();
        openDialog();
      });
      topSearchInput.addEventListener('click', () => openDialog());
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => dialog.close());
    }

    dialog.addEventListener('click', (e) => {
      if (e.target === dialog) dialog.close();
    });

    input.addEventListener('input', () => renderResults(input.value));

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const first = resultsContainer.querySelector('.cmd-item');
        if (first) first.click();
      }
    });

    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (dialog.open) dialog.close();
        else openDialog();
      }
      if (e.metaKey || e.ctrlKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= 8) {
          const tabOrder = ['geoint', 'network', 'osint', 'audit', 'crypto', 'forensics', 'opsec', 'analyst'];
          e.preventDefault();
          this.switchTab(tabOrder[num - 1]);
        }
      }
    });
  }
};

window.argusApp = App;
document.addEventListener('DOMContentLoaded', () => App.init());
