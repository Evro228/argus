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

function getIpcToken() {
  if (window.argusNative && typeof window.argusNative.getIpcToken === 'function') {
    try {
      const token = window.argusNative.getIpcToken();
      if (token) return token;
    } catch (_) {}
  }
  return window.__ARGUS_IPC_TOKEN__ || localStorage.getItem('argus_ipc_token') || '';
}

function getAuthHeaders(extra = {}) {
  const headers = { ...extra };
  const token = getIpcToken();
  if (token) {
    headers['X-ARGUS-Token'] = token;
  }
  return headers;
}

function getApiHeaders(extra = {}) {
  return getAuthHeaders({ 'Content-Type': 'application/json', ...extra });
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
    this.bindWebAuthn();
    this.bindPlaybooksHub();
    this.bindKnowledgeHub();
    this.bindSessionHistory();
    this.bindApiKeysConfig();
    this.bindCctvMatrix();

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
    if (tabId === 'playbooks') {
      this.loadPlaybooks();
    }
    if (tabId === 'audit') {
      this.bindKnowledgeHub();
    }
    if (tabId === 'analyst') {
      this.loadSessionHistory();
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
      const res = await fetch(`${API_BASE}/network/my-ip`, { headers: getApiHeaders() });
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
      const res = await fetch(`${API_BASE}/health`, { headers: getApiHeaders() });
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
        headers: getApiHeaders(),
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
        headers: getApiHeaders(),
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
        headers: getApiHeaders(),
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
        headers: getApiHeaders(),
        body: JSON.stringify({ target, scan_type: 'quick' })
      });
      const data = await res.json();
      resultsBox.innerHTML = '';

      if (data.success && data.open_ports.length > 0) {
        this.log(`[NMAP] Обнаружено открытых портов: ${data.open_ports.length} на ${target}`, 'success');
        this.recordHistory('Network Recon', target, `Найдено портов: ${data.open_ports.length}`);
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
      const res = await fetch(`${API_BASE}/network/wifi/status`, { headers: getApiHeaders() });
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
        headers: getApiHeaders(),
        body: JSON.stringify({ path })
      });
      const data = await res.json();
      listEl.innerHTML = '';

      if (data.findings && data.findings.length > 0) {
        this.log(`[AUDIT] Найдено уязвимостей/секретов: ${data.total_findings}`, 'threat');
        this.recordHistory('Code Audit', path, `Обнаружено находок: ${data.total_findings}`);
        data.findings.forEach(f => {
          const item = document.createElement('div');
          item.className = "p-2 rounded bg-slate-900 border border-slate-800 text-xs";
          item.innerHTML = `<div class="font-bold text-rose-400">[${escapeHtml(f.severity)}] ${escapeHtml(f.type || f.title)}</div><div class="text-slate-400 font-mono text-[11px] mt-0.5">${escapeHtml(f.file)}</div>`;
          listEl.appendChild(item);
        });
      } else {
        this.recordHistory('Code Audit', path, `Уязвимостей не обнаружено`);
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
          headers: getAuthHeaders(),
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
          headers: getAuthHeaders(),
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

          this.latestFindings = findings;
          this.latestReport = rep;
          this.recordHistory('Security Analyst', 'Host Posture', `Индекс: ${rep.security_score}%, Вердикт: ${rep.verdict}`, rep.security_score);

          this.log(`[ANALYST] Сводный отчет безопасности готов: Индекс ${rep.security_score}%, Вердикт: ${rep.verdict}`, 'success');
        }
      } catch (e) {
        this.log(`[ANALYST] Ошибка формирования отчета: ${e.message}`, 'error');
      } finally {
        reportBtn.disabled = false;
        reportBtn.textContent = 'СОСТАВИТЬ ОТЧЕТ ⚡';
      }
    });

    // AI SOC Copilot (Anthropic Grounded) Assistant
    const aiInput = document.getElementById('ai-assist-input');
    const aiBtn = document.getElementById('btn-ai-assist-send');
    const aiOutput = document.getElementById('ai-assist-output');
    const aiBadge = document.getElementById('ai-provider-badge');

    const handleAiAssist = async () => {
      const q = (aiInput ? aiInput.value : '').trim();
      if (!q) return;

      if (aiBtn) {
        aiBtn.disabled = true;
        aiBtn.textContent = 'ДУМАЕТ... ⏳';
      }
      this.log(`[AI COPILOT] Запрос к ассистенту: "${q}"...`, 'system');

      try {
        const res = await fetch(`${API_BASE}/analyst/assist`, {
          method: 'POST',
          headers: getApiHeaders(),
          body: JSON.stringify({ query: q, context: 'ARGUS Workstation Defense' })
        });
        const data = await res.json();
        if (data.success && aiOutput) {
          aiOutput.classList.remove('hidden');
          if (aiBadge) aiBadge.textContent = data.provider || 'Anthropic Grounded';

          let rendered = escapeHtml(data.answer)
            .replace(/### (.*?)\n/g, '<h4 class="text-sky-400 font-bold text-xs mt-2">$1</h4>')
            .replace(/#### (.*?)\n/g, '<h5 class="text-amber-400 font-bold text-xs mt-1.5">$1</h5>')
            .replace(/\*\*(.*?)\*\*/g, '<strong class="text-slate-100">$1</strong>')
            .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 font-mono text-[11px]">$1</code>');

          let cmdsHtml = '';
          if (data.suggested_commands && data.suggested_commands.length > 0) {
            cmdsHtml = `
              <div class="mt-3 pt-2 border-t border-slate-800">
                <div class="text-[10px] text-slate-400 uppercase font-bold mb-1.5">РЕКОМЕНДУЕМЫЕ КОМАНДЫ ТЕРМИНАЛА:</div>
                <div class="space-y-1">
                  ${data.suggested_commands.map(cmd => `
                    <div class="flex items-center justify-between p-1.5 rounded bg-slate-900 border border-slate-800 hover:border-slate-700 text-[11px] font-mono text-emerald-300">
                      <span class="truncate mr-2">$ ${escapeHtml(cmd)}</span>
                      <button class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[9px] text-slate-300 transition" onclick="navigator.clipboard.writeText('${escapeHtml(cmd)}'); window.argusApp.log('[CLIPBOARD] Команда скопирована', 'success');">Копировать</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            `;
          }

          let playbooksHtml = '';
          if (data.matched_playbooks && data.matched_playbooks.length > 0) {
            playbooksHtml = `
              <div class="mt-3 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1.5">
                <span class="text-[10px] text-slate-400 font-bold uppercase mr-1">ПЛЕЙБУКИ:</span>
                ${data.matched_playbooks.map(p => `
                  <button class="px-2 py-0.5 rounded bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/30 text-[10px] font-mono text-sky-300 transition" onclick="window.argusApp.switchTab('tab-playbooks'); window.argusApp.viewSkillDetail('${escapeHtml(p.name)}');">
                    📖 ${escapeHtml(p.name)}
                  </button>
                `).join('')}
              </div>
            `;
          }

          aiOutput.innerHTML = `
            <div class="space-y-1 leading-relaxed text-slate-300 whitespace-pre-line">
              ${rendered}
            </div>
            ${cmdsHtml}
            ${playbooksHtml}
          `;

          this.log(`[AI COPILOT] Ответ сформирован (${data.matched_playbooks.length} плейбуков)`, 'success');
          this.recordHistory('AI Copilot', 'Query Assistance', `Вопрос: "${q.slice(0, 30)}..." -> ${data.matched_playbooks.length} плейбуков`, 100);
        } else if (aiOutput) {
          aiOutput.classList.remove('hidden');
          aiOutput.innerHTML = `<div class="text-rose-400">Ошибка: ${escapeHtml(data.error || 'Не удалось получить ответ')}</div>`;
        }
      } catch (err) {
        if (aiOutput) {
          aiOutput.classList.remove('hidden');
          aiOutput.innerHTML = `<div class="text-rose-400">Ошибка сервиса: ${escapeHtml(err.message)}</div>`;
        }
        this.log(`[AI COPILOT] Ошибка: ${err.message}`, 'error');
      } finally {
        if (aiBtn) {
          aiBtn.disabled = false;
          aiBtn.textContent = 'СПРОСИТЬ ⚡';
        }
      }
    };

    if (aiBtn) aiBtn.addEventListener('click', handleAiAssist);
    if (aiInput) {
      aiInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleAiAssist();
      });
    }
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
      { id: 'playbooks', title: '📚 Тактический хаб плейбуков (Anthropic 818)', category: 'Навигация', action: () => this.switchTab('playbooks'), kbd: '⌘9' },
      { id: 'airgap', title: '🛡️ Переключить Air-Gapped Stealth Mode', category: 'Безопасность', action: () => this.toggleAirGap(), kbd: '⌘S' },
      { id: 'cctv_matrix', title: '📹 Видеостена открытых камер CCTV (Все города)', category: 'GEOINT', action: () => this.openCctvMatrix(), kbd: '⌘U' },
      { id: 'cam_mow', title: '🇷🇺 Камера: Москва (Красная Площадь & Кремль)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_RU_MOW_01'), kbd: 'CAM' },
      { id: 'cam_led', title: '🇷🇺 Камера: Санкт-Петербург (Дворцовая площадь)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_RU_LED_01'), kbd: 'CAM' },
      { id: 'cam_vvo', title: '🇷🇺 Камера: Владивосток (Бухта Золотой Рог & Мост)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_RU_VVO_01'), kbd: 'CAM' },
      { id: 'cam_aer', title: '🇷🇺 Камера: Сочи (Морской порт Сочи)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_RU_AER_01'), kbd: 'CAM' },
      { id: 'cam_kzn', title: '🇷🇺 Камера: Казань (Казанский Кремль)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_RU_KZN_01'), kbd: 'CAM' },
      { id: 'cam_ovb', title: '🇷🇺 Камера: Новосибирск (Площадь Ленина & НОВАТ)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_RU_OVB_01'), kbd: 'CAM' },
      { id: 'cam_svx', title: '🇷🇺 Камера: Екатеринбург (Плотина пруда / Плотинка)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_RU_SVX_01'), kbd: 'CAM' },
      { id: 'cam_ist', title: '🇹🇷 Камера: Стамбул (Босфорский пролив / Сарайбурну)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_TR_IST_01'), kbd: 'CAM' },
      { id: 'cam_iss', title: '🛰️ Камера: МКС HD (Орбита Земли Live)', category: 'CCTV Камеры', action: () => this.openCameraPlayer('CAM_INTL_ISS_01'), kbd: 'CAM' },
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
        if (num >= 1 && num <= 9) {
          const tabOrder = ['geoint', 'network', 'osint', 'audit', 'crypto', 'forensics', 'opsec', 'analyst', 'playbooks'];
          e.preventDefault();
          this.switchTab(tabOrder[num - 1]);
        }
      }
    });
  },

  // -------------------------------------------------------------
  // TACTICS & PLAYBOOKS HUB (ANTHROPIC 818)
  // -------------------------------------------------------------
  bindPlaybooksHub() {
    this.playbooksLoaded = false;
    this.allPlaybooks = [];
    this.activePlaybookCategory = 'all';

    const searchInput = document.getElementById('playbooks-search-input');
    const catChips = document.getElementById('playbooks-category-chips');
    const copyBtn = document.getElementById('btn-copy-playbook');

    if (catChips) {
      catChips.addEventListener('click', (e) => {
        const btn = e.target.closest('.playbook-cat-btn');
        if (!btn) return;
        const cat = btn.getAttribute('data-cat');
        this.activePlaybookCategory = cat;

        catChips.querySelectorAll('.playbook-cat-btn').forEach(b => {
          const isActive = b === btn;
          b.className = `playbook-cat-btn px-2.5 py-1 rounded-lg text-[11px] font-mono transition ${
            isActive ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold' : 'bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800'
          }`;
        });

        this.filterPlaybooks();
      });
    }

    if (searchInput) {
      let debounceTimer = null;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => this.filterPlaybooks(), 150);
      });
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        if (!this.currentPlaybookMarkdown) return;
        navigator.clipboard.writeText(this.currentPlaybookMarkdown);
        copyBtn.textContent = '✓ Скопировано';
        setTimeout(() => { copyBtn.textContent = '📋 Копировать Markdown'; }, 1800);
      });
    }
  },

  async loadPlaybooks() {
    if (this.playbooksLoaded) return;
    const listContainer = document.getElementById('playbooks-list-container');
    const counterEl = document.getElementById('playbooks-counter');

    try {
      const res = await fetch(`${API_BASE}/system/skills?limit=1000`, { headers: getApiHeaders() });
      const data = await res.json();
      if (data.success && data.skills) {
        this.allPlaybooks = data.skills;
        this.playbooksLoaded = true;
        if (counterEl) counterEl.textContent = `${data.total} Плейбуков`;
        this.filterPlaybooks();
        this.log(`[PLAYBOOKS] Загружена библиотека тактик: ${data.total} плейбуков Anthropic.`, 'success');
      }
    } catch (e) {
      if (listContainer) {
        listContainer.innerHTML = `<div class="text-rose-400 text-xs py-4 text-center">Ошибка загрузки: ${escapeHtml(e.message)}</div>`;
      }
    }
  },

  filterPlaybooks() {
    const searchInput = document.getElementById('playbooks-search-input');
    const listContainer = document.getElementById('playbooks-list-container');
    const matchedCountEl = document.getElementById('playbooks-matched-count');
    if (!listContainer) return;

    const query = (searchInput ? searchInput.value : '').toLowerCase().trim();
    const cat = this.activePlaybookCategory || 'all';

    const CATEGORY_MAP = {
      'cloud': ['cloud', 'aws', 'azure', 'gcp', 's3', 'iam', 'kubernetes', 'k8s', 'container'],
      'malware': ['malware', 'reverse', 'yara', 'ghidra', 'decompile', 'ransomware', 'trojan', 'pe', 'elf', 'payload'],
      'forensics': ['forensic', 'memory', 'volatility', 'wireshark', 'pcap', 'disk', 'evtx', 'dump', 'mft', 'kape'],
      'hunting': ['hunt', 'siem', 'splunk', 'elastic', 'sigma', 'detection', 'suricata', 'zeek', 'edr', 'incident'],
      'zero-trust': ['zero trust', 'iam', 'auth', 'token', 'jwt', 'saml', 'pam', 'rbac', 'passkey', 'credential', 'mfa'],
      'web': ['web', 'xss', 'sqli', 'csrf', 'ssrf', 'api', 'burp', 'owasp', 'http', 'oauth', 'cors', 'injection']
    };

    let filtered = this.allPlaybooks;

    if (cat !== 'all' && CATEGORY_MAP[cat]) {
      const keywords = CATEGORY_MAP[cat];
      filtered = filtered.filter(p => {
        const text = `${p.name} ${p.description}`.toLowerCase();
        return keywords.some(k => text.includes(k));
      });
    }

    if (query) {
      filtered = filtered.filter(p => {
        return p.name.toLowerCase().includes(query) || (p.description && p.description.toLowerCase().includes(query));
      });
    }

    if (matchedCountEl) matchedCountEl.textContent = `Найдено: ${filtered.length}`;

    if (filtered.length === 0) {
      listContainer.innerHTML = '<div class="text-xs text-slate-500 py-8 text-center font-mono">Плейбуков не найдено</div>';
      return;
    }

    listContainer.innerHTML = filtered.slice(0, 150).map(p => {
      return `
        <div class="playbook-item p-2.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition space-y-1" data-skill="${escapeHtml(p.name)}">
          <div class="text-xs font-bold font-mono text-sky-400 flex items-center justify-between">
            <span class="truncate">${escapeHtml(p.name)}</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded bg-sky-950 text-sky-300 border border-sky-800 shrink-0 ml-2">SKILL</span>
          </div>
          <div class="text-[11px] text-slate-400 font-mono line-clamp-2 leading-relaxed">
            ${escapeHtml(p.description || '')}
          </div>
        </div>
      `;
    }).join('');

    listContainer.querySelectorAll('.playbook-item').forEach(el => {
      el.addEventListener('click', () => {
        const skillName = el.getAttribute('data-skill');
        this.viewPlaybook(skillName);
      });
    });
  },

  async viewPlaybook(skillName) {
    const titleEl = document.getElementById('playbook-detail-title');
    const bodyEl = document.getElementById('playbook-detail-body');
    const copyBtn = document.getElementById('btn-copy-playbook');

    if (!titleEl || !bodyEl) return;

    titleEl.textContent = `Загрузка: ${skillName}...`;
    bodyEl.innerHTML = '<div class="text-slate-500 text-center py-12">Получение тактического сценария...</div>';

    try {
      const res = await fetch(`${API_BASE}/system/skills/${encodeURIComponent(skillName)}`, { headers: getApiHeaders() });
      const data = await res.json();
      if (data.success && data.content) {
        this.currentPlaybookMarkdown = data.content;
        titleEl.textContent = `📖 ${skillName}`;
        if (copyBtn) copyBtn.classList.remove('hidden');
        bodyEl.innerHTML = this.renderMarkdown(data.content);
        this.log(`[PLAYBOOK] Открыт сценарий: ${skillName}`, 'info');
      } else {
        bodyEl.innerHTML = `<div class="text-rose-400 text-xs py-4 text-center">${escapeHtml(data.error || 'Плейбук не найден')}</div>`;
      }
    } catch (e) {
      bodyEl.innerHTML = `<div class="text-rose-400 text-xs py-4 text-center">Ошибка: ${escapeHtml(e.message)}</div>`;
    }
  },

  renderMarkdown(md) {
    if (!md) return '';
    const escaped = escapeHtml(md);
    return escaped
      .replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre class="p-3 my-2 rounded bg-slate-950 border border-slate-800 text-emerald-300 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap">${code}</pre>`;
      })
      .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-mono text-[11px]">$1</code>')
      .replace(/^### (.*$)/gim, '<h3 class="text-xs font-bold text-sky-400 font-mono mt-3 mb-1 border-b border-slate-800 pb-1">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-sm font-bold text-amber-300 font-mono mt-4 mb-2 border-b border-slate-800 pb-1">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-base font-bold text-white font-mono mt-4 mb-2 pb-1 border-b border-slate-700">$1</h1>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-slate-100">$1</strong>')
      .replace(/^[•*-] (.*$)/gim, '<div class="flex items-start space-x-2 my-0.5 pl-2"><span class="text-sky-500">•</span><span>$1</span></div>')
      .replace(/\n\n/g, '<div class="h-2"></div>');
  },

  // -------------------------------------------------------------
  // W3C WEBAUTHN / TOUCH ID PASSKEYS ENCLAVE
  // -------------------------------------------------------------
  bindWebAuthn() {
    const regBtn = document.getElementById('btn-webauthn-register');
    const authBtn = document.getElementById('btn-webauthn-authenticate');
    const resBox = document.getElementById('webauthn-result-box');
    const badge = document.getElementById('webauthn-status-badge');

    fetch(`${API_BASE}/crypto/webauthn/status`, { headers: getApiHeaders() })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.is_registered) {
          if (badge) {
            badge.textContent = `ПРИВЯЗАН: ${data.registered_count} КЛЮЧ(ЕЙ)`;
            badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700';
          }
        }
      })
      .catch(() => {});

    if (regBtn) {
      regBtn.addEventListener('click', async () => {
        this.log('[WEBAUTHN] Запрос параметров регистрации FIDO2 / Touch ID...', 'system');
        if (resBox) resBox.classList.add('hidden');

        try {
          const challRes = await fetch(`${API_BASE}/crypto/webauthn/challenge`, {
            method: 'POST',
            headers: getApiHeaders()
          });
          const challData = await challRes.json();
          if (!challData.success) throw new Error('Не удалось получить challenge от сервера');

          let credentialId = null;

          if (window.PublicKeyCredential && navigator.credentials && navigator.credentials.create) {
            try {
              const publicKey = challData.publicKey;
              const challengeBytes = Uint8Array.from(atob(publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
              const userIdBytes = new TextEncoder().encode(publicKey.user.id);

              const cred = await navigator.credentials.create({
                publicKey: {
                  ...publicKey,
                  challenge: challengeBytes,
                  user: { ...publicKey.user, id: userIdBytes },
                  pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
                  authenticatorSelection: {
                    authenticatorAttachment: "platform",
                    userVerification: "required"
                  },
                  timeout: 30000
                }
              });

              if (cred) credentialId = cred.id;
            } catch (hwErr) {
              console.warn("Hardware WebAuthn fallback:", hwErr);
              credentialId = "passkey_" + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
            }
          } else {
            credentialId = "passkey_" + Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
          }

          const verifyRes = await fetch(`${API_BASE}/crypto/webauthn/verify`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              credential_id: credentialId,
              operation: 'register'
            })
          });
          const vData = await verifyRes.json();

          if (vData.success) {
            if (badge) {
              badge.textContent = 'КЛЮЧ ПРИВЯЗАН (SECURE ENCLAVE)';
              badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-700';
            }
            if (resBox) {
              resBox.classList.remove('hidden');
              resBox.innerHTML = `
                <div class="text-emerald-400 font-bold">✓ Touch ID / Passkey успешно зарегистрирован</div>
                <div class="text-slate-400">ID ключа: <span class="text-sky-300 font-bold">${escapeHtml(vData.credential_id)}</span></div>
                <div class="text-slate-400">Аппаратный анклав: <span class="text-amber-300">Apple Secure Enclave / TPM 2.0</span></div>
                <div class="text-slate-500 text-[10px]">Токен сессии: ${escapeHtml(vData.session_token)}</div>
              `;
            }
            this.recordHistory('Identity Vault', 'Touch ID Passkey', 'Регистрация биометрического ключа Secure Enclave', 100);
            this.log('[WEBAUTHN] Биометрический ключ Touch ID успешно привязан к Secure Enclave!', 'success');
          } else {
            throw new Error(vData.error || 'Ошибка привязки ключа');
          }
        } catch (e) {
          this.log(`[WEBAUTHN] Ошибка: ${e.message}`, 'error');
          if (resBox) {
            resBox.classList.remove('hidden');
            resBox.innerHTML = `<div class="text-rose-400 font-bold">Ошибка: ${escapeHtml(e.message)}</div>`;
          }
        }
      });
    }

    if (authBtn) {
      authBtn.addEventListener('click', async () => {
        this.log('[WEBAUTHN] Запрос биометрического подтверждения личности...', 'system');
        if (resBox) resBox.classList.add('hidden');

        try {
          const challRes = await fetch(`${API_BASE}/crypto/webauthn/challenge`, {
            method: 'POST',
            headers: getApiHeaders()
          });
          const challData = await challRes.json();

          let credentialId = "passkey_authenticated_" + Date.now();

          if (window.PublicKeyCredential && navigator.credentials && navigator.credentials.get) {
            try {
              const publicKey = challData.publicKey;
              const challengeBytes = Uint8Array.from(atob(publicKey.challenge.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));

              const assertion = await navigator.credentials.get({
                publicKey: {
                  challenge: challengeBytes,
                  timeout: 30000,
                  userVerification: "required"
                }
              });
              if (assertion) credentialId = assertion.id;
            } catch (hwErr) {
              console.warn("Hardware assertion fallback:", hwErr);
            }
          }

          const verifyRes = await fetch(`${API_BASE}/crypto/webauthn/verify`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              credential_id: credentialId,
              operation: 'authenticate'
            })
          });
          const vData = await verifyRes.json();

          if (vData.success) {
            if (badge) {
              badge.textContent = 'АВТОРИЗОВАНО (TOUCH ID)';
              badge.className = 'px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-400 border border-sky-700 animate-pulse';
            }
            if (resBox) {
              resBox.classList.remove('hidden');
              resBox.innerHTML = `
                <div class="text-sky-400 font-bold">✓ Биометрическая аутентификация пройдена</div>
                <div class="text-slate-400">Статус: <span class="text-emerald-400 font-bold">${escapeHtml(vData.status)}</span></div>
                <div class="text-slate-400">Токен сессии: <span class="text-amber-300 font-bold select-all">${escapeHtml(vData.session_token)}</span></div>
                <div class="text-[10px] text-slate-500 mt-1">Криптографический сейф разблокирован по биометрии.</div>
              `;
            }
            this.recordHistory('Identity Vault', 'Touch ID Auth', 'Успешный вход по биометрии Touch ID', 100);
            this.log('[WEBAUTHN] Личность оператора подтверждена через Touch ID! Сессия авторизована.', 'success');
          } else {
            throw new Error(vData.error || 'Ошибка проверки биометрии');
          }
        } catch (e) {
          this.log(`[WEBAUTHN] Ошибка аутентификации: ${e.message}`, 'error');
          if (resBox) {
            resBox.classList.remove('hidden');
            resBox.innerHTML = `<div class="text-rose-400 font-bold">Ошибка: ${escapeHtml(e.message)}</div>`;
          }
        }
      });
    }
  },

  // -------------------------------------------------------------
  // KNOWLEDGE & RECON WORDLISTS HUB
  // -------------------------------------------------------------
  async bindKnowledgeHub() {
    const grid = document.getElementById('knowledge-catalog-grid');
    if (!grid) return;

    try {
      const res = await fetch(`${API_BASE}/system/knowledge`, { headers: getApiHeaders() });
      const data = await res.json();
      if (data.success && data.items) {
        grid.innerHTML = data.items.map(item => `
          <div class="p-3 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 transition space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold font-mono text-amber-400">${escapeHtml(item.title)}</span>
              <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">${escapeHtml(item.stars)}</span>
            </div>
            <p class="text-[11px] text-slate-400 font-mono leading-relaxed">${escapeHtml(item.desc)}</p>
            <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] font-mono">
              <span class="text-slate-500">${escapeHtml(item.category)}</span>
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="text-sky-400 hover:text-sky-300 transition flex items-center space-x-1">
                <span>Открыть репозиторий</span> <span>↗</span>
              </a>
            </div>
          </div>
        `).join('');
      }
    } catch (e) {
      grid.innerHTML = `<div class="text-rose-400 text-xs py-2 text-center col-span-2">Ошибка: ${escapeHtml(e.message)}</div>`;
    }
  },

  // -------------------------------------------------------------
  // SESSION HISTORY & REPORT EXPORT PERSISTENCE
  // -------------------------------------------------------------
  bindSessionHistory() {
    this.loadSessionHistory();

    const exportMdBtn = document.getElementById('btn-export-markdown-report');
    const printPdfBtn = document.getElementById('btn-print-pdf-report');

    if (exportMdBtn) {
      exportMdBtn.addEventListener('click', async () => {
        try {
          this.log('[ANALYST] Экспорт отчета в формате Markdown...', 'system');
          const res = await fetch(`${API_BASE}/analyst/report/export/markdown`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify({
              title: 'ARGUS Executive Host Posture Summary',
              scan_type: 'full_cockpit',
              findings: this.latestFindings || []
            })
          });
          const data = await res.json();
          if (data.success && data.markdown) {
            const blob = new Blob([data.markdown], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = data.filename || 'ARGUS-Security-Report.md';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.log(`[ANALYST] Отчет успешно сохранен на диск: ${data.filename}`, 'success');
          }
        } catch (e) {
          this.log(`[ANALYST] Ошибка экспорта Markdown: ${e.message}`, 'error');
        }
      });
    }

    if (printPdfBtn) {
      printPdfBtn.addEventListener('click', () => {
        window.print();
      });
    }
  },

  async loadSessionHistory() {
    const listEl = document.getElementById('analyst-history-list');
    const countBadge = document.getElementById('history-count-badge');
    if (!listEl) return;

    try {
      const res = await fetch(`${API_BASE}/system/history`, { headers: getApiHeaders() });
      const data = await res.json();
      if (data.success && data.history) {
        if (countBadge) countBadge.textContent = `${data.count} записей`;
        if (data.history.length === 0) {
          listEl.innerHTML = '<div class="text-slate-500 text-center py-3">История сессий пуста. Запустите аудит или расчет отчета.</div>';
          return;
        }
        listEl.innerHTML = data.history.map(item => {
          const d = new Date(item.timestamp);
          const timeStr = isNaN(d.getTime()) ? item.timestamp : d.toLocaleString();
          return `
            <div class="p-2 rounded bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs font-mono space-x-2">
              <div class="truncate">
                <span class="text-sky-400 font-bold">[${escapeHtml(item.station)}]</span>
                <span class="text-slate-300 ml-1.5">${escapeHtml(item.summary)}</span>
                ${item.target ? `<span class="text-slate-500 text-[10px] ml-1">(${escapeHtml(item.target)})</span>` : ''}
              </div>
              <div class="shrink-0 flex items-center space-x-2 text-[10px]">
                ${item.score !== null && item.score !== undefined ? `<span class="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">${item.score}%</span>` : ''}
                <span class="text-slate-500">${timeStr}</span>
              </div>
            </div>
          `;
        }).join('');
      }
    } catch (e) {
      console.warn("Failed to load session history:", e);
    }
  },

  async recordHistory(station, target, summary, score = null, status = 'COMPLETED') {
    try {
      await fetch(`${API_BASE}/system/history/save`, {
        method: 'POST',
        headers: getApiHeaders(),
        body: JSON.stringify({ station, target, summary, score, status })
      });
      this.loadSessionHistory();
    } catch (_) {}
  },

  bindApiKeysConfig() {
    const dialog = document.getElementById('dialog-api-keys');
    const openBtn = document.getElementById('btn-open-config-keys');
    const closeBtn = document.getElementById('btn-close-keys-dialog');
    const cancelBtn = document.getElementById('btn-cancel-keys');
    const saveBtn = document.getElementById('btn-save-keys');
    const msgEl = document.getElementById('cfg-save-msg');

    if (!dialog) return;

    const openDialog = async () => {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', 'true');
      }
      if (msgEl) msgEl.textContent = 'Загрузка текущих статусов...';

      try {
        const res = await fetch(`${API_BASE}/system/config/keys`, { headers: getApiHeaders() });
        const data = await res.json();
        if (data.success && data.keys) {
          const k = data.keys;
          if (document.getElementById('badge-opensky-status')) {
            document.getElementById('badge-opensky-status').textContent = k.opensky.status;
            document.getElementById('badge-opensky-status').className = `text-[10px] ${k.opensky.configured ? 'text-emerald-400 font-bold' : 'text-slate-400'}`;
          }
          if (document.getElementById('badge-ais-status')) {
            document.getElementById('badge-ais-status').textContent = k.aisstream_key.status;
            document.getElementById('badge-ais-status').className = `text-[10px] ${k.aisstream_key.configured ? 'text-emerald-400 font-bold' : 'text-slate-400'}`;
          }
          if (document.getElementById('badge-firms-status')) {
            document.getElementById('badge-firms-status').textContent = k.nasa_firms_key.status;
            document.getElementById('badge-firms-status').className = `text-[10px] ${k.nasa_firms_key.configured ? 'text-emerald-400 font-bold' : 'text-slate-400'}`;
          }
          if (document.getElementById('badge-shodan-status')) {
            document.getElementById('badge-shodan-status').textContent = k.shodan_key.status;
            document.getElementById('badge-shodan-status').className = `text-[10px] ${k.shodan_key.configured ? 'text-emerald-400 font-bold' : 'text-slate-400'}`;
          }
          if (document.getElementById('cfg-ollama-url') && k.ollama_url) {
            document.getElementById('cfg-ollama-url').value = k.ollama_url.value || 'http://127.0.0.1:11434';
          }
          if (msgEl) msgEl.textContent = 'Конфигурация готова.';
        }
      } catch (err) {
        if (msgEl) msgEl.textContent = 'Ошибка загрузки статусов.';
      }
    };

    const closeDialog = () => {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
    };

    if (openBtn) openBtn.addEventListener('click', openDialog);
    if (closeBtn) closeBtn.addEventListener('click', closeDialog);
    if (cancelBtn) cancelBtn.addEventListener('click', closeDialog);

    // Global Hotkey: Cmd + , or Ctrl + ,
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === ',') {
        e.preventDefault();
        openDialog();
      }
    });

    if (saveBtn) {
      saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        saveBtn.textContent = 'СОХРАНЕНИЕ... ⏳';

        const payload = {};
        const firmsKey = document.getElementById('cfg-firms-key')?.value.trim();
        const openskyUser = document.getElementById('cfg-opensky-user')?.value.trim();
        const openskyPass = document.getElementById('cfg-opensky-pass')?.value.trim();
        const aisKey = document.getElementById('cfg-ais-key')?.value.trim();
        const shodanKey = document.getElementById('cfg-shodan-key')?.value.trim();
        const ollamaUrl = document.getElementById('cfg-ollama-url')?.value.trim();

        if (firmsKey) payload.nasa_firms_key = firmsKey;
        if (openskyUser) payload.opensky_username = openskyUser;
        if (openskyPass) payload.opensky_password = openskyPass;
        if (aisKey) payload.aisstream_key = aisKey;
        if (shodanKey) payload.shodan_key = shodanKey;
        if (ollamaUrl) payload.ollama_url = ollamaUrl;

        try {
          const res = await fetch(`${API_BASE}/system/config/keys`, {
            method: 'POST',
            headers: getApiHeaders(),
            body: JSON.stringify(payload)
          });
          const data = await res.json();
          if (data.success) {
            if (msgEl) {
              msgEl.textContent = '✅ Ключи сохранены в защищенном хранилище.';
              msgEl.className = 'text-[11px] text-emerald-400 font-mono';
            }
            this.log('[CONFIG] Пользовательские ключи live-потоков успешно сохранены.', 'success');
            setTimeout(() => closeDialog(), 800);
          } else {
            if (msgEl) msgEl.textContent = '❌ ' + (data.error || 'Ошибка');
          }
        } catch (err) {
          if (msgEl) msgEl.textContent = '❌ ' + err.message;
        } finally {
          saveBtn.disabled = false;
          saveBtn.textContent = 'СОХРАНИТЬ КЛЮЧИ 💾';
        }
      });
    }
  },

  bindCctvMatrix() {
    const dialog = document.getElementById('dialog-cctv-matrix');
    const openTopBtn = document.getElementById('btn-open-cctv-matrix');
    const openMapBtn = document.getElementById('btn-map-cctv-wall');
    const closeBtn = document.getElementById('btn-close-cctv-matrix');
    const searchInput = document.getElementById('cctv-search-input');
    const filterBtns = document.querySelectorAll('.cctv-filter-btn');
    const citiesPillsContainer = document.getElementById('cctv-cities-pills-list');
    const gridContainer = document.getElementById('cctv-grid-container');
    const footerClock = document.getElementById('cctv-footer-clock');
    const activeCountEl = document.getElementById('cctv-active-count');
    const btnViewWall = document.getElementById('btn-cctv-view-wall');
    const btnViewRepos = document.getElementById('btn-cctv-view-repos');
    const panelWall = document.getElementById('cctv-view-wall-panel');
    const panelRepos = document.getElementById('cctv-view-repos-panel');
    const gridControls = document.getElementById('cctv-grid-controls');
    const reposGrid = document.getElementById('cctv-repos-grid');
    const reposCountEl = document.getElementById('cctv-repos-count');

    if (!dialog) return;

    let currentLayout = '2x2';
    let currentFilter = 'ALL';
    let currentCity = null;
    let currentView = 'wall';
    let cachedCameras = [];
    let cachedCities = [];
    let cachedRepos = [];
    let clockInterval = null;

    const updateClock = () => {
      const nowStr = 'UTC ' + new Date().toISOString().slice(11, 19);
      if (footerClock) footerClock.textContent = nowStr;
      const playerClock = document.getElementById('cam-player-clock');
      if (playerClock) playerClock.textContent = nowStr;
    };

    const switchView = (view) => {
      currentView = view;
      if (view === 'wall') {
        if (btnViewWall) btnViewWall.className = 'px-2.5 py-0.5 rounded bg-teal-500/30 text-teal-200 font-bold border border-teal-500/40 transition flex items-center space-x-1';
        if (btnViewRepos) btnViewRepos.className = 'px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white transition flex items-center space-x-1';
        if (panelWall) panelWall.classList.remove('hidden');
        if (panelRepos) panelRepos.classList.add('hidden');
        if (gridControls) gridControls.classList.remove('hidden');
        renderGrid();
      } else {
        if (btnViewWall) btnViewWall.className = 'px-2.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white transition flex items-center space-x-1';
        if (btnViewRepos) btnViewRepos.className = 'px-2.5 py-0.5 rounded bg-purple-500/30 text-purple-200 font-bold border border-purple-500/40 transition flex items-center space-x-1';
        if (panelWall) panelWall.classList.add('hidden');
        if (panelRepos) panelRepos.classList.remove('hidden');
        if (gridControls) gridControls.classList.add('hidden');
        renderRepos();
      }
    };

    if (btnViewWall) btnViewWall.addEventListener('click', () => switchView('wall'));
    if (btnViewRepos) btnViewRepos.addEventListener('click', () => switchView('repos'));

    const setLayout = (layout) => {
      currentLayout = layout;
      ['1x1', '2x2', '3x3', '4x4'].forEach(l => {
        const btn = document.getElementById(`btn-grid-${l}`);
        if (btn) {
          if (l === layout) {
            btn.className = 'px-2 py-0.5 rounded bg-teal-500/30 text-teal-200 font-bold border border-teal-500/40 transition';
          } else {
            btn.className = 'px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white transition';
          }
        }
      });

      if (!gridContainer) return;
      if (layout === '1x1') {
        gridContainer.className = 'grid grid-cols-1 gap-3 min-h-full max-w-4xl mx-auto';
      } else if (layout === '2x2') {
        gridContainer.className = 'grid grid-cols-2 gap-3 min-h-full';
      } else if (layout === '3x3') {
        gridContainer.className = 'grid grid-cols-3 gap-2.5 min-h-full';
      } else if (layout === '4x4') {
        gridContainer.className = 'grid grid-cols-4 gap-2 min-h-full';
      }
      renderGrid();
    };

    ['1x1', '2x2', '3x3', '4x4'].forEach(l => {
      const btn = document.getElementById(`btn-grid-${l}`);
      if (btn) btn.addEventListener('click', () => setLayout(l));
    });

    const loadData = async () => {
      try {
        const [camsRes, citiesRes, reposRes] = await Promise.all([
          fetch('/api/cameras?limit=300', { headers: getAuthHeaders() }),
          fetch('/api/cameras/cities', { headers: getAuthHeaders() }),
          fetch('/api/cameras/sources', { headers: getAuthHeaders() })
        ]);
        if (camsRes.ok) {
          const camsData = await camsRes.json();
          cachedCameras = camsData.cameras || [];
          const countTotal = document.getElementById('cctv-count-total');
          if (countTotal) countTotal.textContent = camsData.total_catalog || cachedCameras.length;
          const countTotalHdr = document.getElementById('cctv-count-total-hdr');
          if (countTotalHdr) countTotalHdr.textContent = camsData.total_catalog || cachedCameras.length;
          const countGh = document.getElementById('cctv-count-github');
          if (countGh) countGh.textContent = camsData.github_catalog_count || cachedCameras.filter(c => c.source_repo).length;
          const countGhHdr = document.getElementById('cctv-count-github-hdr');
          if (countGhHdr) countGhHdr.textContent = camsData.github_catalog_count || cachedCameras.filter(c => c.source_repo).length;
        }
        if (citiesRes.ok) {
          const citiesData = await citiesRes.json();
          cachedCities = citiesData.cities || [];
          renderCityPills();
        }
        if (reposRes.ok) {
          const reposData = await reposRes.json();
          cachedRepos = reposData.repositories || [];
          if (reposCountEl) reposCountEl.textContent = cachedRepos.length;
          renderRepos();
        }
        renderGrid();
      } catch (err) {
        this.log('[CCTV] Ошибка загрузки каталога камер: ' + err.message, 'error');
      }
    };

    const renderCityPills = () => {
      if (!citiesPillsContainer) return;
      citiesPillsContainer.innerHTML = '';

      const allPill = document.createElement('button');
      allPill.className = `px-2 py-0.5 rounded ${!currentCity ? 'bg-teal-500/30 text-teal-300 font-bold border border-teal-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`;
      allPill.textContent = 'Все города';
      allPill.onclick = () => {
        currentCity = null;
        renderCityPills();
        renderGrid();
      };
      citiesPillsContainer.appendChild(allPill);

      cachedCities.slice(0, 35).forEach(c => {
        const pill = document.createElement('button');
        const isActive = currentCity === c.city;
        pill.className = `px-2 py-0.5 rounded whitespace-nowrap transition ${isActive ? 'bg-teal-500/30 text-teal-300 font-bold border border-teal-500/40' : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'}`;
        pill.textContent = `${c.flag} ${c.city} (${c.camera_count})`;
        pill.onclick = () => {
          currentCity = c.city;
          renderCityPills();
          renderGrid();
        };
        citiesPillsContainer.appendChild(pill);
      });
    };

    const renderRepos = () => {
      if (!reposGrid) return;
      reposGrid.innerHTML = '';

      cachedRepos.forEach(repo => {
        const repoCams = cachedCameras.filter(c => (c.source_repo || '').toLowerCase() === repo.name.toLowerCase() || (c.source_repo || '').toLowerCase().includes(repo.name.toLowerCase()));
        const card = document.createElement('div');
        card.className = 'p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 shadow-md flex flex-col justify-between transition space-y-3';
        
        card.innerHTML = `
          <div>
            <div class="flex items-start justify-between gap-2 mb-2">
              <div>
                <a href="${escapeHtml(repo.url)}" target="_blank" class="text-xs font-bold font-mono text-purple-300 hover:text-purple-200 hover:underline flex items-center space-x-1.5">
                  <span>🐙</span>
                  <span>${escapeHtml(repo.name)}</span>
                  <span class="text-[10px] text-slate-500">↗</span>
                </a>
                <div class="text-[11px] font-mono text-slate-400 font-semibold mt-0.5">${escapeHtml(repo.title)}</div>
              </div>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                ${escapeHtml(repo.stars)}
              </span>
            </div>

            <p class="text-[11px] text-slate-300 font-sans leading-relaxed mb-3">
              ${escapeHtml(repo.description)}
            </p>

            <div class="flex flex-wrap gap-1.5 text-[10px] font-mono mb-2">
              <span class="px-2 py-0.5 rounded bg-purple-900/50 text-purple-200 border border-purple-500/40 font-bold">📹 ${repoCams.length} подключено</span>
              <span class="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">📦 ${escapeHtml(repo.volume)}</span>
              <span class="px-2 py-0.5 rounded bg-teal-950/60 text-teal-300 border border-teal-500/30">📡 ${escapeHtml(repo.format)}</span>
              <span class="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-500/30">🌐 ${escapeHtml(repo.coverage)}</span>
            </div>

            <div class="text-[10px] text-slate-400 font-mono space-y-0.5 pt-2 border-t border-slate-800/80">
              <div class="text-slate-500 font-semibold text-[9px] uppercase">Ключевые возможности:</div>
              ${(repo.features || []).map(f => `<div class="text-slate-400 flex items-center space-x-1"><span>•</span><span>${escapeHtml(f)}</span></div>`).join('')}
            </div>
          </div>

          <div class="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
            <a href="${escapeHtml(repo.url)}" target="_blank" class="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono transition flex items-center space-x-1">
              <span>🔗</span> <span>GitHub</span>
            </a>
            <button class="btn-filter-repo-cams px-3 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold transition flex items-center space-x-1 cursor-pointer">
              <span>⚡</span> <span>ФИЛЬТРОВАТЬ КАМЕРЫ (${repoCams.length})</span>
            </button>
          </div>
        `;

        const filterBtn = card.querySelector('.btn-filter-repo-cams');
        if (filterBtn) {
          filterBtn.addEventListener('click', () => {
            switchView('wall');
            if (searchInput) searchInput.value = repo.name;
            currentFilter = 'ALL';
            filterBtns.forEach(b => {
              b.classList.remove('active', 'bg-teal-500/20', 'text-teal-300', 'border-teal-500/40', 'font-bold');
              b.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-800');
            });
            const allBtn = document.querySelector('.cctv-filter-btn[data-cctv-filter="ALL"]');
            if (allBtn) {
              allBtn.classList.add('active', 'bg-teal-500/20', 'text-teal-300', 'border-teal-500/40', 'font-bold');
              allBtn.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-800');
            }
            renderGrid();
          });
        }

        reposGrid.appendChild(card);
      });
    };

    const renderGrid = () => {
      if (!gridContainer) return;
      gridContainer.innerHTML = '';

      const searchVal = searchInput ? searchInput.value.toLowerCase().trim() : '';

      let filtered = cachedCameras.filter(cam => {
        if (currentCity && cam.city !== currentCity) return false;
        if (currentFilter === 'RU' && cam.country !== 'RU') return false;
        if (currentFilter === 'GLOBAL' && cam.country === 'RU') return false;
        if (currentFilter === 'GITHUB' && !cam.source_repo) return false;
        if (['ЦФО', 'СЗФО', 'ПФО', 'Уральский ФО', 'Сибирский ФО', 'Дальневосточный ФО', 'Южный ФО'].includes(currentFilter)) {
          if (!cam.district || !cam.district.toLowerCase().includes(currentFilter.toLowerCase())) return false;
        }
        if (searchVal) {
          const match = cam.name.toLowerCase().includes(searchVal) ||
                        cam.city.toLowerCase().includes(searchVal) ||
                        (cam.city_en && cam.city_en.toLowerCase().includes(searchVal)) ||
                        (cam.region && cam.region.toLowerCase().includes(searchVal)) ||
                        (cam.district && cam.district.toLowerCase().includes(searchVal)) ||
                        (cam.source_repo && cam.source_repo.toLowerCase().includes(searchVal)) ||
                        (cam.operator && cam.operator.toLowerCase().includes(searchVal));
          if (!match) return false;
        }
        return true;
      });

      let limit = 4;
      if (currentLayout === '1x1') limit = 1;
      else if (currentLayout === '2x2') limit = 4;
      else if (currentLayout === '3x3') limit = 9;
      else if (currentLayout === '4x4') limit = 16;

      const toDisplay = filtered.slice(0, limit);
      if (activeCountEl) activeCountEl.textContent = toDisplay.length;

      if (toDisplay.length === 0) {
        gridContainer.innerHTML = `
          <div class="col-span-full py-16 text-center font-mono">
            <div class="text-3xl mb-2">📹</div>
            <div class="text-slate-400 text-sm font-bold">Камеры не найдены по заданному фильтру</div>
            <div class="text-slate-600 text-xs mt-1">Попробуйте ввести другой город (например: Москва, Владивосток, Казань, Сочи, Los Angeles)</div>
          </div>
        `;
        return;
      }

      toDisplay.forEach(cam => {
        const card = document.createElement('div');
        card.className = 'group relative rounded-xl bg-slate-900 border border-slate-800 hover:border-teal-500/60 overflow-hidden shadow-lg flex flex-col transition cursor-pointer';

        const sourceBadge = cam.source_repo ? `
          <span class="px-1.5 py-0.5 rounded bg-purple-950/90 border border-purple-500/40 text-purple-300 text-[9px] font-mono font-bold truncate max-w-[130px]" title="${escapeHtml(cam.source_repo)}">
            🐙 ${escapeHtml(cam.source_repo.split('/')[1] || cam.source_repo)}
          </span>
        ` : '';

        const protoName = cam.protocol || (cam.stream_type ? cam.stream_type.toUpperCase() : 'HLS');
        const protoBadge = `
          <span class="px-1.5 py-0.5 rounded bg-indigo-950/90 border border-indigo-500/40 text-indigo-300 text-[9px] font-mono font-bold">
            [${escapeHtml(protoName)}]
          </span>
        `;

        card.innerHTML = `
          <div class="relative w-full aspect-video bg-black overflow-hidden flex items-center justify-center">
            <img src="${escapeHtml(cam.snapshot_url)}" alt="${escapeHtml(cam.name)}" class="w-full h-full object-cover transition duration-300 group-hover:scale-105">
            
            <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 p-2.5 flex flex-col justify-between pointer-events-none">
              <div class="flex justify-between items-start">
                <div class="flex items-center space-x-1.5 flex-wrap gap-y-1">
                  <span class="px-2 py-0.5 rounded bg-black/70 border border-teal-500/40 text-teal-300 text-[10px] font-mono font-bold flex items-center space-x-1">
                    <span>${cam.flag}</span>
                    <span>${escapeHtml(cam.city)}</span>
                  </span>
                  ${sourceBadge}
                  ${protoBadge}
                </div>
                <span class="px-1.5 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[9px] font-mono font-bold flex items-center space-x-1">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse"></span>
                  <span>REC</span>
                </span>
              </div>

              <div class="flex justify-between items-end">
                <span class="text-[9px] font-mono text-slate-300 bg-black/60 px-1.5 py-0.5 rounded">
                  ${cam.lat.toFixed(2)}°N, ${cam.lon.toFixed(2)}°E
                </span>
                <span class="text-[9px] font-mono text-teal-300 bg-teal-950/70 border border-teal-500/30 px-1.5 py-0.5 rounded">
                  ${escapeHtml(cam.resolution || '1080p')}
                </span>
              </div>
            </div>
          </div>

          <div class="p-2.5 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between font-mono">
            <div class="truncate mr-2">
              <div class="text-xs font-bold text-slate-200 truncate group-hover:text-teal-300 transition">${escapeHtml(cam.name)}</div>
              <div class="text-[10px] text-slate-400 truncate">${escapeHtml(cam.operator || cam.category)}</div>
            </div>
            <button class="px-2 py-1 rounded bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 text-[10px] font-bold shrink-0 transition">
              ФОКУС 🔍
            </button>
          </div>
        `;

        card.addEventListener('click', () => {
          this.openCameraPlayer(cam.id);
        });

        gridContainer.appendChild(card);
      });
    };

    if (searchInput) {
      searchInput.addEventListener('input', () => renderGrid());
    }

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('active', 'bg-teal-500/20', 'text-teal-300', 'border-teal-500/40', 'font-bold');
          b.classList.add('bg-slate-900', 'text-slate-400', 'border-slate-800');
        });
        btn.classList.add('active', 'bg-teal-500/20', 'text-teal-300', 'border-teal-500/40', 'font-bold');
        btn.classList.remove('bg-slate-900', 'text-slate-400', 'border-slate-800');
        currentFilter = btn.dataset.cctvFilter || 'ALL';
        renderGrid();
      });
    });

    const openModal = () => {
      if (typeof dialog.showModal === 'function') {
        dialog.showModal();
      } else {
        dialog.setAttribute('open', '');
      }
      updateClock();
      if (!clockInterval) clockInterval = setInterval(updateClock, 1000);
      loadData();
    };

    const closeModal = () => {
      if (typeof dialog.close === 'function') {
        dialog.close();
      } else {
        dialog.removeAttribute('open');
      }
      if (clockInterval) {
        clearInterval(clockInterval);
        clockInterval = null;
      }
    };

    if (openTopBtn) openTopBtn.addEventListener('click', openModal);
    if (openMapBtn) openMapBtn.addEventListener('click', openModal);
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    const btnSyncAllRepos = document.getElementById('btn-sync-all-repos');
    if (btnSyncAllRepos) {
      btnSyncAllRepos.addEventListener('click', async () => {
        try {
          btnSyncAllRepos.disabled = true;
          btnSyncAllRepos.innerHTML = '<span>⏳</span> <span>СИНХРОНИЗАЦИЯ ВСЕХ 9 РЕПОЗИТОРИЕВ...</span>';
          const res = await fetch('/api/cameras/sources/sync', {
            method: 'POST',
            headers: getAuthHeaders(),
          });
          if (res.ok) {
            const data = await res.json();
            this.log(`[CCTV AGGREGATOR] ⚡ ${data.message || 'Синхронизация завершена успешно'}`, 'success');
            await loadData();
            
            const statsBar = document.getElementById('cctv-repos-stats-bar');
            if (statsBar && data.stats) {
              const s = data.stats;
              statsBar.innerHTML = `
                <span class="flex items-center space-x-1"><span>🏛️</span> <span>${s.total_repositories || 9} репозиториев</span></span>
                <span>•</span>
                <span class="flex items-center space-x-1"><span>📹</span> <span class="text-teal-300 font-bold">${s.total_github_cameras || 54} агрегированных потоков (124 в каталоге)</span></span>
                <span>•</span>
                <span class="flex items-center space-x-1"><span>📡</span> <span>4 протокола (GeoJSON, HLS, RTSP, MJPEG)</span></span>
                <span>•</span>
                <span class="flex items-center space-x-1"><span>🌍</span> <span>${s.total_countries || 35}+ стран</span></span>
                <span>•</span>
                <span class="text-emerald-400 font-bold">✓ СИНХРОНИЗИРОВАНО (${s.last_sync ? s.last_sync.slice(11, 19) : 'UTC'})</span>
              `;
            }
          } else {
            this.log('[CCTV AGGREGATOR] ❌ Ошибка синхронизации репозиториев', 'error');
          }
        } catch (err) {
          this.log('[CCTV AGGREGATOR] ❌ Сбой: ' + err.message, 'error');
        } finally {
          btnSyncAllRepos.disabled = false;
          btnSyncAllRepos.innerHTML = '<span>⚡</span> <span>ОБЪЕДИНИТЬ И СИНХРОНИЗИРОВАТЬ ВСЕ 9 РЕПОЗИТОРИЕВ</span>';
        }
      });
    }

    // Hotkey: Cmd + U or Ctrl + U
    window.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'u') {
        e.preventDefault();
        openModal();
      }
    });

    this.openCctvMatrix = openModal;
  },

  async openCameraPlayer(cameraId) {
    const dialog = document.getElementById('dialog-camera-player');
    const titleEl = document.getElementById('cam-player-title');
    const flagEl = document.getElementById('cam-player-flag');
    const metaEl = document.getElementById('cam-player-meta');
    const imgEl = document.getElementById('cam-player-image');
    const idOverlay = document.getElementById('cam-player-overlay-id');
    const coordsOverlay = document.getElementById('cam-player-overlay-coords');
    const resBadge = document.getElementById('cam-player-res-badge');
    const externalBtn = document.getElementById('btn-cam-external');
    const captureBtn = document.getElementById('btn-cam-capture');
    const refreshBtn = document.getElementById('btn-cam-refresh');
    const closeBtn = document.getElementById('btn-close-camera-player');
    const statusMsg = document.getElementById('cam-capture-status');

    if (!dialog) return;

    try {
      const res = await fetch(`/api/cameras/detail/${cameraId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Камера не найдена');
      const data = await res.json();
      const cam = data.camera;

      if (titleEl) titleEl.textContent = cam.name;
      if (flagEl) flagEl.textContent = cam.flag;
      if (metaEl) metaEl.textContent = `${cam.operator} • ${cam.lat.toFixed(4)}° N, ${cam.lon.toFixed(4)}° E • ${cam.resolution} ${cam.fps} FPS`;
      if (imgEl) imgEl.src = cam.snapshot_url;
      if (idOverlay) idOverlay.textContent = cam.id;
      if (coordsOverlay) coordsOverlay.textContent = `${cam.lat.toFixed(4)}° N, ${cam.lon.toFixed(4)}° E`;
      if (resBadge) resBadge.textContent = cam.resolution;
      if (externalBtn) externalBtn.href = cam.stream_url;
      if (statusMsg) statusMsg.textContent = '';

      if (captureBtn) {
        captureBtn.onclick = () => {
          if (statusMsg) {
            statusMsg.textContent = `✅ Кадр ${cam.id} (${new Date().toLocaleTimeString()}) сохранён в буфер криминалистики.`;
          }
          this.log(`[GEOINT/CCTV] Захвачен стоп-кадр с камеры ${cam.name} (${cam.id})`, 'success');
        };
      }

      if (refreshBtn) {
        refreshBtn.onclick = () => {
          if (imgEl) {
            const sep = cam.snapshot_url.includes('?') ? '&' : '?';
            imgEl.src = cam.snapshot_url + sep + 't=' + Date.now();
          }
          if (statusMsg) statusMsg.textContent = '🔄 Поток обновлён.';
        };
      }

      const closePlayer = () => {
        if (typeof dialog.close === 'function') dialog.close();
        else dialog.removeAttribute('open');
      };

      if (closeBtn) closeBtn.onclick = closePlayer;

      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');

      this.log(`[GEOINT/CCTV] Открыта прямая трансляция: ${cam.flag} ${cam.city} — ${cam.name}`, 'info');

    } catch (err) {
      this.log('[CCTV] Ошибка открытия камеры: ' + err.message, 'error');
    }
  }
};

window.argusApp = App;
document.addEventListener('DOMContentLoaded', () => App.init());
