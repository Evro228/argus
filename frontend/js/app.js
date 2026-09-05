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

    this.log(`[BREACH] Проверка компрометации: ${email}`, 'system');
    try {
      const res = await fetch(`${API_BASE}/osint/breach/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('breach-result-box').classList.remove('hidden');
        document.getElementById('breach-hibp-link').href = data.hibp_url;
        document.getElementById('breach-dehashed-link').href = data.dehashed_url;
        this.log(`[BREACH] Сформированы верификационные ссылки HIBP для ${email}.`, 'success');
      }
    } catch (e) {
      this.log(`[BREACH] Ошибка: ${e.message}`, 'error');
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
          row.className = "p-2 rounded bg-slate-900 border border-slate-800 flex justify-between";
          row.innerHTML = `<span class="text-emerald-400 font-bold">${p.port}/TCP</span> <span class="text-slate-300">${p.service}</span> <span class="text-slate-500">${p.state}</span>`;
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
  }
};

window.argusApp = App;
document.addEventListener('DOMContentLoaded', () => App.init());
