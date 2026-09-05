// CyberSec & OSINT Studio Application Engine
const API_BASE = '/api';

const App = {
  activeTab: 'osint',
  globeInstance: null,

  init() {
    this.bindNavigation();
    this.checkHealth();
    this.loadSystemStatus();
    this.loadDorks();
    this.bindForms();
    this.log('Система инициализирована. Ядро CyberSec Studio активно.', 'system');

    // Init Tactical Globe if on geoint tab or when switched
    setTimeout(() => {
      if (document.getElementById('globe-canvas')) {
        this.globeInstance = new TacticalGlobe('globe-canvas');
        this.log('GEOINT модуль: 3D Глобус тактической обстановки подключен.', 'info');
      }
    }, 200);
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

    const line = document.createElement('div');
    line.className = `py-0.5 leading-relaxed ${colorClass}`;
    line.innerHTML = `<span class="text-slate-500 font-mono text-xs">${time}</span> <span class="font-bold text-xs">${prefix}</span> ${message}`;
    
    consoleEl.appendChild(line);
    consoleEl.scrollTop = consoleEl.scrollHeight;
  },

  bindNavigation() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-tab');
        this.switchTab(targetTab);
      });
    });
  },

  switchTab(tabId) {
    this.activeTab = tabId;
    
    // Update button states
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

    this.log(`Переключение рабочего стола на: [${tabId.toUpperCase()}]`);

    if (tabId === 'geoint' && !this.globeInstance) {
      setTimeout(() => {
        this.globeInstance = new TacticalGlobe('globe-canvas');
      }, 100);
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
          badge.className = "flex items-center text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400";
        }
      }
    } catch (e) {
      this.log('Бэкенд сервер недоступен. Проверьте запуск run.sh', 'error');
    }
  },

  // -------------------------------------------------------------
  // OSINT MODULE
  // -------------------------------------------------------------
  async searchUsername() {
    const input = document.getElementById('osint-username-input');
    const username = input.value.trim();
    if (!username) return alert('Введите никнейм!');

    this.log(`Запуск OSINT поиска профилей для @${username}...`, 'system');
    const btn = document.getElementById('osint-search-btn');
    btn.disabled = true;
    btn.innerHTML = `<span class="animate-spin inline-block mr-1">⏳</span> Поиск...`;

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
        this.log(`OSINT: Найдено ${data.found_count} подтвержденных аккаунтов по @${username}!`, 'success');
        document.getElementById('osint-found-count').innerText = `${data.found_count} найдено`;

        data.profiles.forEach(p => {
          const item = document.createElement('div');
          item.className = "p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between hover:border-sky-500/40 transition";
          item.innerHTML = `
            <div class="flex items-center space-x-3">
              <div class="w-8 h-8 rounded-md bg-sky-500/10 text-sky-400 flex items-center justify-center font-bold text-xs">
                ${p.name.substring(0, 2).toUpperCase()}
              </div>
              <div>
                <div class="font-medium text-sm text-slate-200">${p.name}</div>
                <div class="text-xs text-slate-500 font-mono">${p.category} • HTTP ${p.status_code}</div>
              </div>
            </div>
            <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 rounded text-xs bg-slate-800 text-sky-400 hover:bg-sky-500 hover:text-white transition flex items-center">
              Открыть ↗
            </a>
          `;
          resultsBox.appendChild(item);
        });
      } else {
        this.log(`Аккаунтов с ником @${username} в проверенных базах не обнаружено.`, 'warn');
        resultsBox.innerHTML = `<div class="text-sm text-slate-500 py-6 text-center">Профилей не обнаружено или доступ ограничен.</div>`;
      }
    } catch (e) {
      this.log(`Ошибка OSINT поиска: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Найти след 🔎`;
    }
  },

  async loadDorks() {
    try {
      const res = await fetch(`${API_BASE}/osint/dorks`);
      const data = await res.json();
      const container = document.getElementById('dorks-list-container');
      if (!container || !data.success) return;

      container.innerHTML = '';
      data.dorks.forEach(d => {
        const item = document.createElement('div');
        item.className = "p-3 rounded-lg bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between";
        item.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-1">
              <span class="text-xs font-semibold text-sky-400">${d.category}</span>
            </div>
            <div class="text-sm font-medium text-slate-200 mb-2">${d.title}</div>
            <div class="p-2 rounded bg-black/40 text-xs font-mono text-slate-400 break-all mb-3 select-all">${d.query}</div>
          </div>
          <a href="${d.google_search_url}" target="_blank" rel="noopener noreferrer" class="text-center py-1.5 px-3 rounded text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 transition font-medium">
            Открыть поиск в Google ↗
          </a>
        `;
        container.appendChild(item);
      });
    } catch (e) {}
  },

  async checkBreach() {
    const input = document.getElementById('breach-email-input');
    const email = input.value.trim();
    if (!email) return alert('Введите email!');

    this.log(`Проверка компрометации email: ${email}`, 'system');
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
        this.log(`Верификационные ссылки HIBP сформированы для ${email}.`, 'success');
      }
    } catch (e) {
      this.log(`Ошибка проверки утечек: ${e.message}`, 'error');
    }
  },

  // -------------------------------------------------------------
  // CODE AUDIT MODULE
  // -------------------------------------------------------------
  async scanCodePath() {
    const input = document.getElementById('audit-path-input');
    const path = input.value.trim();
    if (!path) return alert('Укажите путь к папке!');

    this.log(`Запуск глубокого аудита кода и секретов в: ${path}`, 'system');
    const btn = document.getElementById('audit-path-btn');
    btn.disabled = true;
    btn.innerHTML = `Сканирование...`;

    try {
      const res = await fetch(`${API_BASE}/audit/scan/path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path })
      });
      const data = await res.json();

      if (!data.success) {
        this.log(`Ошибка аудита: ${data.error}`, 'error');
        alert(data.error);
        return;
      }

      this.log(`Аудит завершен! Проверено файлов: ${data.files_scanned}. Найдено уязвимостей: ${data.total_findings}`, data.critical_count > 0 ? 'error' : 'success');

      document.getElementById('audit-summary-bar').classList.remove('hidden');
      document.getElementById('audit-count-critical').innerText = data.critical_count;
      document.getElementById('audit-count-high').innerText = data.high_count;
      document.getElementById('audit-count-medium').innerText = data.medium_count;

      const listEl = document.getElementById('audit-findings-list');
      listEl.innerHTML = '';

      if (data.findings.length === 0) {
        listEl.innerHTML = `<div class="p-6 text-center text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm">✅ В коде не обнаружено открытых секретов, токенов или паролей!</div>`;
      } else {
        data.findings.forEach(f => {
          const item = document.createElement('div');
          const badgeClass = f.severity === 'CRITICAL' ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : (f.severity === 'HIGH' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-sky-500/10 text-sky-400 border-sky-500/30');
          
          item.className = "p-4 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col space-y-2";
          item.innerHTML = `
            <div class="flex items-center justify-between">
              <span class="text-xs px-2 py-0.5 rounded border font-mono font-bold ${badgeClass}">${f.severity}</span>
              <span class="text-xs text-slate-400 font-mono">${f.file}:${f.line}</span>
            </div>
            <div class="font-medium text-slate-200 text-sm">${f.type}</div>
            <div class="p-2 bg-black/40 rounded font-mono text-xs text-rose-300 break-all">${f.context}</div>
            <div class="text-xs text-slate-400"><span class="text-amber-400 font-semibold">Рекомендация:</span> ${f.remediation}</div>
          `;
          listEl.appendChild(item);
        });
      }
    } catch (e) {
      this.log(`Ошибка выполнения аудита: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Запустить аудит 🔍`;
    }
  },

  // -------------------------------------------------------------
  // NETWORK & PORT SCANNER
  // -------------------------------------------------------------
  async scanTargetPorts() {
    const input = document.getElementById('net-target-input');
    const select = document.getElementById('net-scantype-select');
    const target = input.value.trim();
    if (!target) return alert('Введите целевой IP или домен!');

    this.log(`Сетевой аудит: проверка портов хоста ${target} (режим: ${select.value})...`, 'system');
    const btn = document.getElementById('net-scan-btn');
    btn.disabled = true;
    btn.innerHTML = `Сканирование...`;

    try {
      const res = await fetch(`${API_BASE}/network/scan/ports`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, scan_type: select.value })
      });
      const data = await res.json();

      const tableBody = document.getElementById('net-ports-tbody');
      tableBody.innerHTML = '';

      if (data.raw_output) {
        tableBody.innerHTML = `<tr><td colspan="4" class="p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap">${data.raw_output}</td></tr>`;
        this.log(`Nmap завершил сканирование ${target}.`, 'success');
      } else if (data.open_ports) {
        this.log(`Сетевой скан завершен. Открыто портов: ${data.open_ports_count}`, data.open_ports_count > 0 ? 'warn' : 'success');
        if (data.open_ports.length === 0) {
          tableBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500">Все популярные порты закрыты или фильтруются файрволом.</td></tr>`;
        } else {
          data.open_ports.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = "border-b border-slate-800/60 hover:bg-slate-800/30";
            tr.innerHTML = `
              <td class="py-2.5 px-3 font-mono font-bold text-sky-400">${p.port}</td>
              <td class="py-2.5 px-3 text-slate-300">${p.service}</td>
              <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-xs bg-emerald-500/10 text-emerald-400 font-mono">OPEN</span></td>
              <td class="py-2.5 px-3"><span class="px-2 py-0.5 rounded text-xs ${p.risk === 'HIGH' ? 'bg-rose-500/10 text-rose-400 font-bold' : 'bg-slate-800 text-slate-400'}">${p.risk}</span></td>
            `;
            tableBody.appendChild(tr);
          });
        }
      }
    } catch (e) {
      this.log(`Ошибка сканирования сети: ${e.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Сканировать 🌐`;
    }
  },

  async inspectCert() {
    const host = document.getElementById('net-cert-input').value.trim();
    if (!host) return alert('Введите домен!');

    this.log(`Аудит SSL/TLS сертификата для ${host}...`, 'system');
    try {
      const res = await fetch(`${API_BASE}/network/cert/inspect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host })
      });
      const data = await res.json();
      if (!data.success) {
        this.log(`Ошибка SSL: ${data.error}`, 'error');
        alert(data.error);
        return;
      }

      this.log(`Сертификат для ${host} проверен: действителен еще ${data.days_until_expiration} дней.`, 'success');
      document.getElementById('cert-result-box').classList.remove('hidden');
      document.getElementById('cert-subject').innerText = data.subject_common_name || host;
      document.getElementById('cert-issuer').innerText = data.issuer_organization || 'Не указан';
      document.getElementById('cert-days').innerText = `${data.days_until_expiration} дн.`;
      document.getElementById('cert-tls').innerText = data.tls_version;
    } catch (e) {
      this.log(`Ошибка аудита сертификата: ${e.message}`, 'error');
    }
  },

  // -------------------------------------------------------------
  // CRYPTO & STEGCLOAK MODULE
  // -------------------------------------------------------------
  async encodeStego() {
    const cover_text = document.getElementById('stego-cover-text').value;
    const secret_text = document.getElementById('stego-secret-text').value;
    const password = document.getElementById('stego-password').value;

    if (!secret_text.trim()) return alert('Введите секретный текст!');

    this.log('Стеганография: скрытие текста в невидимых Unicode-символах нулевой ширины...', 'system');
    try {
      const res = await fetch(`${API_BASE}/crypto/stego/encode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cover_text, secret_text, password })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('stego-result-area').value = data.stego_text;
        document.getElementById('stego-result-stats').innerText = `Скрыто символов: ${data.hidden_chars_count} | AES-256: ${data.is_encrypted ? 'ВКЛ' : 'ВЫКЛ'}`;
        this.log(`Секрет успешно замаскирован! Видимый размер: ${data.visible_length}, полный размер: ${data.total_length}`, 'success');
      }
    } catch (e) {
      this.log(`Ошибка стеганографии: ${e.message}`, 'error');
    }
  },

  async decodeStego() {
    const stego_text = document.getElementById('stego-decode-input').value;
    const password = document.getElementById('stego-decode-password').value;

    if (!stego_text.trim()) return alert('Вставьте текст со скрытым сообщением!');

    this.log('Стеганография: извлечение невидимых символов и расшифровка...', 'system');
    try {
      const res = await fetch(`${API_BASE}/crypto/stego/decode`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stego_text, password })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('stego-revealed-text').value = data.secret;
        this.log('Скрытое сообщение успешно расшифровано!', 'success');
      } else {
        this.log(`Ошибка: ${data.error}`, 'error');
        alert(data.error);
      }
    } catch (e) {
      this.log(`Ошибка декодирования: ${e.message}`, 'error');
    }
  },

  async generatePassword() {
    const length = parseInt(document.getElementById('pass-len-input').value) || 20;
    try {
      const res = await fetch(`${API_BASE}/crypto/password/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ length })
      });
      const data = await res.json();
      document.getElementById('pass-output').value = data.password;
      document.getElementById('pass-entropy').innerText = `Энтропия: ${data.entropy_bits} бит (${data.strength})`;
      this.log(`Сгенерирован криптографически стойкий пароль (${length} симв, ${data.entropy_bits} бит).`, 'success');
    } catch (e) {}
  },

  // -------------------------------------------------------------
  // FORENSICS MODULE
  // -------------------------------------------------------------
  async analyzePhoto() {
    const fileInput = document.getElementById('forensics-photo-input');
    if (!fileInput.files || fileInput.files.length === 0) return alert('Выберите изображение!');

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    this.log(`Криминалистика: извлечение EXIF и GPS координат из ${fileInput.files[0].name}...`, 'system');
    try {
      const res = await fetch(`${API_BASE}/forensics/image/exif`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (!data.success) return alert(data.error);

      document.getElementById('forensics-result-card').classList.remove('hidden');
      document.getElementById('exif-camera').innerText = `${data.camera.make} ${data.camera.model}`;
      document.getElementById('exif-time').innerText = data.camera.datetime;

      const gpsEl = document.getElementById('exif-gps');
      if (data.has_gps) {
        gpsEl.innerHTML = `<span class="text-emerald-400 font-bold font-mono">${data.coordinates.latitude.toFixed(6)}, ${data.coordinates.longitude.toFixed(6)}</span> <a href="${data.coordinates.google_maps_url}" target="_blank" class="ml-2 text-sky-400 underline">Карта ↗</a>`;
        this.log(`GPS координаты обнаружены в фото: ${data.coordinates.latitude}, ${data.coordinates.longitude}`, 'success');
      } else {
        gpsEl.innerHTML = `<span class="text-slate-500">Координаты отсутствуют (очищены или отключены)</span>`;
      }

      const aiEl = document.getElementById('exif-ai');
      if (data.is_ai_generated) {
        aiEl.innerHTML = `<span class="text-amber-400 font-bold">⚠️ Обнаружены метаданные нейросети (SD/ComfyUI)!</span>`;
      } else {
        aiEl.innerHTML = `<span class="text-slate-400">Стандартное цифровое фото</span>`;
      }
    } catch (e) {
      this.log(`Ошибка анализа фото: ${e.message}`, 'error');
    }
  },

  // -------------------------------------------------------------
  // OPSEC & PRIVACY
  // -------------------------------------------------------------
  async sanitizeData() {
    const text = document.getElementById('opsec-input-text').value;
    if (!text.trim()) return;

    try {
      const res = await fetch(`${API_BASE}/opsec/sanitize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.success) {
        document.getElementById('opsec-sanitized-output').value = data.sanitized_text;
        document.getElementById('opsec-stat').innerText = `Обезврежено персональных записей: ${data.replacements_count}`;
        this.log(`Pasteguard: Очищен текст от утечки ${data.replacements_count} персональных данных.`, 'success');
      }
    } catch (e) {}
  },

  async checkCurrentIP() {
    this.log('Проверка внешнего IP адреса...', 'system');
    try {
      const res = await fetch(`${API_BASE}/opsec/ip/check`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        document.getElementById('opsec-my-ip').innerText = data.ip;
        this.log(`Текущий публичный IP: ${data.ip}`, 'info');
      }
    } catch (e) {}
  },

  // -------------------------------------------------------------
  // SYSTEM STATUS
  // -------------------------------------------------------------
  async loadSystemStatus() {
    try {
      const res = await fetch(`${API_BASE}/system/status`);
      const data = await res.json();
      const container = document.getElementById('system-tools-grid');
      if (!container) return;

      container.innerHTML = '';
      data.tools.forEach(t => {
        const card = document.createElement('div');
        card.className = "p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between";
        card.innerHTML = `
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="font-bold text-slate-100 text-sm">${t.name}</span>
              <span class="px-2 py-0.5 rounded text-xs font-mono ${t.installed ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-800 text-slate-500'}">
                ${t.installed ? 'INSTALLED' : 'NOT FOUND'}
              </span>
            </div>
            <p class="text-xs text-slate-400 mb-3">${t.description}</p>
          </div>
          <div class="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <span class="text-[10px] text-slate-500 font-mono">${t.installed ? t.version || 'Готов' : t.brew}</span>
            <a href="${t.doc}" target="_blank" class="text-xs text-sky-400 hover:underline">Инфо ↗</a>
          </div>
        `;
        container.appendChild(card);
      });
    } catch (e) {}
  },

  bindForms() {
    document.getElementById('osint-search-btn')?.addEventListener('click', () => this.searchUsername());
    document.getElementById('breach-check-btn')?.addEventListener('click', () => this.checkBreach());
    document.getElementById('audit-path-btn')?.addEventListener('click', () => this.scanCodePath());
    document.getElementById('net-scan-btn')?.addEventListener('click', () => this.scanTargetPorts());
    document.getElementById('net-cert-btn')?.addEventListener('click', () => this.inspectCert());
    document.getElementById('stego-encode-btn')?.addEventListener('click', () => this.encodeStego());
    document.getElementById('stego-decode-btn')?.addEventListener('click', () => this.decodeStego());
    document.getElementById('pass-gen-btn')?.addEventListener('click', () => this.generatePassword());
    document.getElementById('forensics-analyze-btn')?.addEventListener('click', () => this.analyzePhoto());
    document.getElementById('opsec-sanitize-btn')?.addEventListener('click', () => this.sanitizeData());
    document.getElementById('opsec-check-ip-btn')?.addEventListener('click', () => this.checkCurrentIP());
  }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());

// --- NEW COMPREHENSIVE SUITE EXTENSIONS ---

// 1. ClearURLs Link Cleaner
App.cleanUrl = async function() {
  const url = document.getElementById('clearurls-input')?.value.trim();
  if (!url) return alert('Введите URL для очистки!');

  this.log(`ClearURLs: очистка трекинг-параметров для ${url}...`, 'system');
  try {
    const res = await fetch(`${API_BASE}/opsec/clean-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('clearurls-output').value = data.cleaned_url;
      document.getElementById('clearurls-stats').innerText = `Удалено шпионских меток: ${data.removed_params_count} (${data.removed_params.join(', ') || 'нет'})`;
      this.log(`ClearURLs: Ссылка очищена! Удалено параметров: ${data.removed_params_count}`, 'success');
    }
  } catch (e) {
    this.log(`Ошибка ClearURLs: ${e.message}`, 'error');
  }
};

// 2. Disposable Identity Generator (OpenTrashmail)
App.generateDisposableId = async function() {
  this.log('Генерация временного защищенного профиля...', 'system');
  try {
    const res = await fetch(`${API_BASE}/opsec/disposable-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prefix: 'agent' })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('disp-email').value = data.disposable_email;
      document.getElementById('disp-pass').value = data.temporary_passphrase;
      document.getElementById('disp-user').value = data.username;
      this.log(`Временный профиль сгенерирован: ${data.disposable_email}`, 'success');
    }
  } catch (e) {}
};

// 3. Burn-After-Reading Notes (Privnote / Send)
App.createBurnNote = async function() {
  const secret = document.getElementById('burn-note-secret')?.value.trim();
  if (!secret) return alert('Введите секретный текст!');

  this.log('Создание самоуничтожающейся записки...', 'system');
  try {
    const res = await fetch(`${API_BASE}/crypto/burn-note/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('burn-note-token-output').value = data.token;
      document.getElementById('burn-note-status').innerText = 'Записка создана! Она будет уничтожена сразу после первого прочтения.';
      this.log(`Записка сохранена во временной памяти. Токен: ${data.token}`, 'success');
    }
  } catch (e) {
    this.log(`Ошибка создания записки: ${e.message}`, 'error');
  }
};

App.readBurnNote = async function() {
  const token = document.getElementById('burn-note-read-token')?.value.trim();
  if (!token) return alert('Введите токен записки!');

  this.log(`Чтение и уничтожение записки с токеном ${token}...`, 'system');
  try {
    const res = await fetch(`${API_BASE}/crypto/burn-note/read/${token}`);
    const data = await res.json();
    if (data.success) {
      document.getElementById('burn-note-read-result').value = data.secret;
      document.getElementById('burn-note-read-badge').innerText = 'УНИЧТОЖЕНО НАВСЕГДА';
      this.log('Записка прочитана и навсегда удалена из памяти сервера!', 'warn');
    } else {
      alert(data.error);
      this.log(data.error, 'error');
    }
  } catch (e) {
    this.log(`Ошибка чтения: ${e.message}`, 'error');
  }
};

// 4. Dangerzone & PDF Inspector
App.inspectPdf = async function() {
  const fileInput = document.getElementById('pdf-inspect-input');
  if (!fileInput.files || fileInput.files.length === 0) return alert('Выберите PDF-файл!');

  const formData = new FormData();
  formData.append('file', fileInput.files[0]);

  this.log(`Инспекция структуры PDF: ${fileInput.files[0].name}...`, 'system');
  try {
    const res = await fetch(`${API_BASE}/forensics/pdf/inspect`, {
      method: 'POST',
      body: formData
    });
    const data = await res.json();
    if (!data.success) return alert(data.error);

    document.getElementById('pdf-result-box').classList.remove('hidden');
    document.getElementById('pdf-risk-score').innerText = `${data.risk_score} / 100`;
    document.getElementById('pdf-verdict').innerText = data.verdict;

    const warnEl = document.getElementById('pdf-warnings');
    warnEl.innerHTML = '';
    if (data.warnings.length === 0) {
      warnEl.innerHTML = '<div class="text-emerald-400">✅ Подозрительных макросов, JavaScript или автоматических действий не обнаружено.</div>';
    } else {
      data.warnings.forEach(w => {
        const d = document.createElement('div');
        d.className = 'text-rose-400 font-semibold';
        d.innerText = `⚠️ ${w}`;
        warnEl.appendChild(d);
      });
    }
    this.log(`PDF аудит завершен. Вердикт: ${data.verdict}`, data.risk_score > 20 ? 'warn' : 'success');
  } catch (e) {
    this.log(`Ошибка PDF инспектора: ${e.message}`, 'error');
  }
};

// 5. WireTapper Wi-Fi Status
App.loadWifiStatus = async function() {
  try {
    const res = await fetch(`${API_BASE}/network/wifi/status`);
    const data = await res.json();
    if (data.success && data.connected) {
      document.getElementById('wifi-ssid').innerText = data.current_network.ssid;
      document.getElementById('wifi-phy').innerText = data.current_network.phy_mode;
      document.getElementById('wifi-channel').innerText = data.current_network.channel;
      document.getElementById('wifi-security').innerText = data.current_network.security_rating;
      this.log(`WireTapper: подключено к сети ${data.current_network.ssid} (${data.current_network.security_rating})`, 'info');
    }
  } catch (e) {}
};

// 6. Hardening & Compliance Matrix
App.loadHardening = async function() {
  try {
    const res = await fetch(`${API_BASE}/system/hardening`);
    const data = await res.json();
    const container = document.getElementById('hardening-list');
    if (!container || !data.success) return;

    container.innerHTML = '';
    document.getElementById('hardening-score').innerText = `${data.hardening_score}%`;

    data.checks.forEach(c => {
      const isPass = c.status === 'PASS';
      const row = document.createElement('div');
      row.className = "p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between";
      row.innerHTML = `
        <div>
          <div class="font-semibold text-xs text-slate-200">${c.name}</div>
          <div class="text-[11px] text-slate-500 font-mono mt-0.5">${c.detail}</div>
          ${!isPass ? `<div class="text-[11px] text-amber-400 mt-1 font-medium">${c.remediation}</div>` : ''}
        </div>
        <span class="px-2 py-0.5 rounded text-xs font-mono font-bold ${isPass ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}">
          ${c.status}
        </span>
      `;
      container.appendChild(row);
    });
  } catch (e) {}
};

// 7. Knowledge Hub Reader
App.loadKnowledgeHub = async function() {
  try {
    const res = await fetch(`${API_BASE}/system/knowledge`);
    const data = await res.json();
    const container = document.getElementById('knowledge-hub-container');
    if (!container || !data.success) return;

    container.innerHTML = '';
    data.items.forEach(k => {
      const card = document.createElement('div');
      card.className = "p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col justify-between hover:border-sky-500/40 transition";
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs font-bold text-sky-400">${k.category}</span>
            <span class="text-xs font-mono text-amber-400">${k.stars}</span>
          </div>
          <div class="font-bold text-sm text-slate-100 mb-1">${k.title}</div>
          <p class="text-xs text-slate-400 leading-relaxed mb-3">${k.desc}</p>
        </div>
        <a href="${k.url}" target="_blank" rel="noopener noreferrer" class="text-xs py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-center text-slate-200 font-medium transition">
          Открыть репозиторий ↗
        </a>
      `;
      container.appendChild(card);
    });
  } catch (e) {}
};

// 8. Anthropic Cybersecurity Skills Hub
App.loadSkills = async function(query = '') {
  try {
    const url = query ? `${API_BASE}/system/skills?q=${encodeURIComponent(query)}` : `${API_BASE}/system/skills?limit=30`;
    const res = await fetch(url);
    const data = await res.json();
    const container = document.getElementById('skills-list-container');
    const badge = document.getElementById('skills-total-badge');
    if (!container || !data.success) return;

    if (badge && data.total) {
      badge.textContent = `${data.total} playbooks`;
    }

    container.innerHTML = '';
    if (!data.skills || data.skills.length === 0) {
      container.innerHTML = `<div class="col-span-full py-8 text-center text-xs text-slate-500">Навыков по запросу "${query}" не найдено</div>`;
      return;
    }

    data.skills.forEach(s => {
      const card = document.createElement('div');
      card.className = "p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between hover:border-cyan-500/40 transition group";
      card.innerHTML = `
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-[10px] font-mono uppercase text-cyan-400 font-bold">${s.domain || 'cybersecurity'}</span>
          </div>
          <div class="font-mono font-bold text-xs text-slate-100 mb-1 group-hover:text-cyan-300 transition">${s.name}</div>
          <p class="text-[11px] text-slate-400 line-clamp-3 leading-snug mb-2">${s.description || ''}</p>
        </div>
        <button onclick="App.openSkillModal('${s.name}')" class="text-[11px] py-1 px-2.5 rounded bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 font-medium border border-cyan-800/60 transition text-center w-full">
          📜 Изучить плейбук
        </button>
      `;
      container.appendChild(card);
    });
  } catch (e) {}
};

App.openSkillModal = async function(skillName) {
  const modal = document.getElementById('skill-modal');
  const title = document.getElementById('modal-skill-name');
  const content = document.getElementById('modal-skill-content');
  if (!modal || !title || !content) return;

  title.textContent = skillName;
  content.textContent = 'Загрузка плейбука...';
  modal.classList.remove('hidden');

  try {
    const res = await fetch(`${API_BASE}/system/skills/${encodeURIComponent(skillName)}`);
    const data = await res.json();
    if (data.success) {
      content.textContent = data.content;
    } else {
      content.textContent = `Ошибка: ${data.error || 'Не удалось прочитать плейбук'}`;
    }
  } catch (e) {
    content.textContent = `Ошибка сетевого запроса: ${e.message}`;
  }
};

// Hook into App.init
const originalInit = App.init;
App.init = function() {
  originalInit.call(this);
  this.loadWifiStatus();
  this.loadHardening();
  this.loadKnowledgeHub();
  this.loadSkills();
  
  // Bind new action buttons
  document.getElementById('clearurls-btn')?.addEventListener('click', () => this.cleanUrl());
  document.getElementById('disp-gen-btn')?.addEventListener('click', () => this.generateDisposableId());
  document.getElementById('burn-create-btn')?.addEventListener('click', () => this.createBurnNote());
  document.getElementById('burn-read-btn')?.addEventListener('click', () => this.readBurnNote());
  document.getElementById('pdf-inspect-btn')?.addEventListener('click', () => this.inspectPdf());

  // Skills Hub listeners
  document.getElementById('skill-search-btn')?.addEventListener('click', () => {
    const q = document.getElementById('skill-search-input')?.value.trim();
    this.loadSkills(q);
  });
  document.getElementById('skill-search-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = e.target.value.trim();
      this.loadSkills(q);
    }
  });
  document.getElementById('skill-reset-btn')?.addEventListener('click', () => {
    const input = document.getElementById('skill-search-input');
    if (input) input.value = '';
    this.loadSkills();
  });
  document.getElementById('modal-skill-close')?.addEventListener('click', () => {
    document.getElementById('skill-modal')?.classList.add('hidden');
  });
};

