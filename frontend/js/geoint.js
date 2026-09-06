// ==========================================================================
// ARGUS Tactical Threat Map & Autonomous GEOINT Telemetry Engine
// ==========================================================================
(function () {
  function getIpcToken() {
    if (window.argusNative && typeof window.argusNative.getIpcToken === 'function') {
      try {
        const token = window.argusNative.getIpcToken();
        if (token) return token;
      } catch (_) {}
    }
    return window.__ARGUS_IPC_TOKEN__ || localStorage.getItem('argus_ipc_token') || '';
  }

  function getHeaders() {
    const headers = { 'Accept': 'application/json' };
    const token = getIpcToken();
    if (token) headers['X-ARGUS-Token'] = token;
    return headers;
  }

  function escapeHtml(str) {
    if (typeof str !== 'string') return String(str ?? '');
    return str.replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  class TacticalThreatMap {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      this.width = this.canvas.clientWidth || 900;
      this.height = this.canvas.clientHeight || 550;
      this.canvas.width = this.width * window.devicePixelRatio;
      this.canvas.height = this.height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      this.mode = '2d'; // '2d' or '3d'
      this.layers = {
        sats: true,
        air: true,
        hotspots: true,
        cyber: true
      };

      // Cyber Threat Nodes
      this.nodes = [
        { id: 'frankfurt', name: 'Frankfurt [EU-C1]', ip: '198.51.100.42', lat: 50.1109, lon: 8.6821, type: 'primary_target', ports: [{port: 22, s: 'SSH'}, {port: 80, s: 'HTTP'}, {port: 443, s: 'HTTPS'}], threat: 85 },
        { id: 'nyc', name: 'New York [US-E1]', ip: '198.18.44.12', lat: 40.7128, lon: -74.0060, type: 'hub', ports: [{port: 8080, s: 'Proxy'}, {port: 443, s: 'HTTPS'}], threat: 42 },
        { id: 'london', name: 'London [UK-S1]', ip: '51.140.22.8', lat: 51.5074, lon: -0.1278, type: 'hub', ports: [{port: 443, s: 'HTTPS'}], threat: 28 },
        { id: 'tokyo', name: 'Tokyo [AP-N1]', ip: '133.242.18.5', lat: 35.6762, lon: 139.6503, type: 'hub', ports: [{port: 22, s: 'SSH'}, {port: 3306, s: 'MySQL'}], threat: 64 },
        { id: 'sao_paulo', name: 'Sao Paulo [SA-E1]', ip: '177.71.200.15', lat: -23.5505, lon: -46.6333, type: 'hub', ports: [{port: 80, s: 'HTTP'}], threat: 38 },
        { id: 'sydney', name: 'Sydney [AP-S1]', ip: '13.239.50.2', lat: -33.8688, lon: 151.2093, type: 'hub', ports: [{port: 443, s: 'HTTPS'}], threat: 19 },
        { id: 'beijing', name: 'Beijing [AS-E1]', ip: '202.108.22.5', lat: 39.9042, lon: 116.4074, type: 'source', ports: [{port: 80, s: 'HTTP'}], threat: 75 },
        { id: 'moscow', name: 'Moscow [RU-C1]', ip: '198.51.100.36', lat: 55.7558, lon: 37.6173, type: 'operator', ports: [{port: 443, s: 'HTTPS'}, {port: 22, s: 'SSH'}], threat: 10 },
        { id: 'san_francisco', name: 'San Francisco [US-W1]', ip: '104.244.42.1', lat: 37.7749, lon: -122.4194, type: 'source', ports: [{port: 443, s: 'HTTPS'}], threat: 50 },
        { id: 'singapore', name: 'Singapore [AP-SE1]', ip: '43.252.12.9', lat: 1.3521, lon: 103.8198, type: 'hub', ports: [{port: 443, s: 'HTTPS'}], threat: 31 }
      ];

      // Live Telemetry Collections
      this.satellites = [];
      this.aircraft = [];
      this.hotspots = [];

      this.selectedEntity = { kind: 'node', data: this.nodes[0] };

      this.initAttackArcs();
      this.bindEvents();
      this.bindLayerControls();
      this.fetchTelemetry();
      this.telemetryInterval = setInterval(() => this.fetchTelemetry(), 4000);
      this.animate();
    }

    initAttackArcs() {
      this.arcs = [];
      const target = this.nodes[0];
      const sources = this.nodes.filter(n => n.id !== 'frankfurt');

      for (let i = 0; i < sources.length; i++) {
        const src = sources[i];
        this.arcs.push({
          from: src,
          to: target,
          progress: Math.random(),
          speed: 0.003 + Math.random() * 0.004,
          color: i % 2 === 0 ? '#38bdf8' : '#f59e0b',
        });
      }
    }

    async fetchTelemetry() {
      try {
        const res = await fetch('/api/geoint/telemetry', { headers: getHeaders() });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            this.satellites = data.satellites || [];
            this.aircraft = data.aircraft || [];
            this.hotspots = data.hotspots || [];

            // Update badge counters
            const countSats = document.getElementById('count-sats');
            const countAir = document.getElementById('count-air');
            const countHotspots = document.getElementById('count-hotspots');
            if (countSats) countSats.textContent = this.satellites.length;
            if (countAir) countAir.textContent = this.aircraft.length;
            if (countHotspots) countHotspots.textContent = this.hotspots.length;

            // If selected entity is updated in latest telemetry, refresh HUD
            if (this.selectedEntity && this.selectedEntity.kind === 'sat') {
              const updated = this.satellites.find(s => s.id === this.selectedEntity.data.id);
              if (updated) {
                this.selectedEntity.data = updated;
                this.updateHudCard();
              }
            } else if (this.selectedEntity && this.selectedEntity.kind === 'air') {
              const updated = this.aircraft.find(a => a.icao24 === this.selectedEntity.data.icao24);
              if (updated) {
                this.selectedEntity.data = updated;
                this.updateHudCard();
              }
            }
          }
        }
      } catch (err) {
        // Silent fallback: continues rendering cached or local telemetry
      }
    }

    bindLayerControls() {
      const bind = (id, key) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('click', () => {
          this.layers[key] = !this.layers[key];
          btn.classList.toggle('opacity-40', !this.layers[key]);
          btn.classList.toggle('active', this.layers[key]);
        });
      };
      bind('btn-layer-sats', 'sats');
      bind('btn-layer-air', 'air');
      bind('btn-layer-hotspots', 'hotspots');
      bind('btn-layer-cyber', 'cyber');
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        if (!this.canvas) return;
        this.width = this.canvas.clientWidth || 900;
        this.height = this.canvas.clientHeight || 550;
        this.canvas.width = this.width * window.devicePixelRatio;
        this.canvas.height = this.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      });

      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // 1. Check Satellites (if layer active)
        if (this.layers.sats) {
          for (let sat of this.satellites) {
            const pt = this.project2D(sat.lat, sat.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('sat', sat);
              return;
            }
          }
        }

        // 2. Check Aircraft (if layer active)
        if (this.layers.air) {
          for (let ac of this.aircraft) {
            const pt = this.project2D(ac.lat, ac.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('air', ac);
              return;
            }
          }
        }

        // 3. Check Hotspots (if layer active)
        if (this.layers.hotspots) {
          for (let h of this.hotspots) {
            const pt = this.project2D(h.lat, h.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('hotspot', h);
              return;
            }
          }
        }

        // 4. Check Cyber Nodes (if layer active)
        if (this.layers.cyber) {
          for (let node of this.nodes) {
            const pt = this.project2D(node.lat, node.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('node', node);
              return;
            }
          }
        }
      });
    }

    selectEntity(kind, data) {
      this.selectedEntity = { kind, data };
      this.updateHudCard();
      if (window.argusApp && window.argusApp.log) {
        const label = kind === 'sat' ? `Спутник NORAD: ${data.name}` :
                      kind === 'air' ? `Воздушный борт ADS-B: ${data.callsign} (${data.model})` :
                      kind === 'hotspot' ? `Термическая аномалия: ${data.name}` :
                      `Тактический кибер-узел: ${data.name} (${data.ip})`;
        window.argusApp.log(`[GEOINT HUD] ${label}`, 'threat');
      }
    }

    updateHudCard() {
      const typeBadge = document.getElementById('hud-type-badge');
      const titleLabel = document.getElementById('hud-title-label');
      const targetIp = document.getElementById('hud-target-ip');
      const coordsLabel = document.getElementById('hud-coords-label');
      const targetCoords = document.getElementById('hud-target-coords');
      const detailsLabel = document.getElementById('hud-details-label');
      const portsContainer = document.getElementById('hud-target-ports');
      const threatLabel = document.getElementById('hud-threat-label');
      const threatScore = document.getElementById('hud-target-threat-score');
      const threatFill = document.getElementById('hud-target-threat-fill');

      if (!this.selectedEntity || !typeBadge) return;

      const { kind, data } = this.selectedEntity;

      if (kind === 'node') {
        typeBadge.textContent = 'CYBER THREAT NODE';
        if (titleLabel) titleLabel.textContent = 'NODE IP / TARGET';
        if (targetIp) targetIp.textContent = data.ip;
        if (coordsLabel) coordsLabel.textContent = 'COORDINATES / REGION';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(4)}° N, ${data.lon.toFixed(4)}° E ${data.name}`;
        if (detailsLabel) detailsLabel.textContent = 'OPEN SERVICES / PORTS';
        if (portsContainer) {
          portsContainer.innerHTML = data.ports.map(p => `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-slate-700/80 text-center">
              <div class="text-xs font-bold text-sky-400 font-mono">${escapeHtml(String(p.port))}</div>
              <div class="text-[9px] text-slate-400 font-mono">${escapeHtml(String(p.s))}</div>
            </div>
          `).join('');
        }
        if (threatLabel) threatLabel.textContent = 'THREAT LEVEL';
        if (threatScore) threatScore.textContent = `${data.threat}%`;
        if (threatFill) threatFill.style.width = `${data.threat}%`;

      } else if (kind === 'sat') {
        typeBadge.textContent = 'NORAD ORBITAL ASSET';
        if (titleLabel) titleLabel.textContent = 'SATELLITE / NORAD ID';
        if (targetIp) targetIp.textContent = `${data.name} (#${data.norad_id})`;
        if (coordsLabel) coordsLabel.textContent = 'SUB-SATELLITE POINT';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(2)}° N, ${data.lon.toFixed(2)}° E [Inc: ${data.inclination_deg}°]`;
        if (detailsLabel) detailsLabel.textContent = 'ORBITAL PARAMETERS';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-cyan-500/30 text-center">
              <div class="text-xs font-bold text-cyan-400 font-mono">${data.altitude_km} km</div>
              <div class="text-[9px] text-slate-400 font-mono">Апогей/Высота</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-cyan-500/30 text-center">
              <div class="text-xs font-bold text-sky-300 font-mono">${data.velocity_kms} km/s</div>
              <div class="text-[9px] text-slate-400 font-mono">Скорость</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-cyan-500/30 text-center">
              <div class="text-xs font-bold text-emerald-400 font-mono">${data.type.slice(0, 10)}</div>
              <div class="text-[9px] text-slate-400 font-mono">Назначение</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'MISSION ROLE';
        if (threatScore) threatScore.textContent = data.operator;
        if (threatFill) threatFill.style.width = '100%';

      } else if (kind === 'air') {
        typeBadge.textContent = 'ADS-B AIRBORNE RADAR';
        if (titleLabel) titleLabel.textContent = 'CALLSIGN / ICAO24';
        if (targetIp) targetIp.textContent = `${data.callsign} [${data.icao24.toUpperCase()}]`;
        if (coordsLabel) coordsLabel.textContent = 'AIRSPACE POSITION';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(2)}° N, ${data.lon.toFixed(2)}° E | Hdg: ${data.heading}°`;
        if (detailsLabel) detailsLabel.textContent = 'AVIONICS & KINEMATICS';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-emerald-500/30 text-center">
              <div class="text-xs font-bold text-emerald-400 font-mono">${Math.round(data.altitude_ft).toLocaleString()} ft</div>
              <div class="text-[9px] text-slate-400 font-mono">Эшелон</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-emerald-500/30 text-center">
              <div class="text-xs font-bold text-emerald-300 font-mono">${data.speed_kts} kts</div>
              <div class="text-[9px] text-slate-400 font-mono">Скорость</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-emerald-500/30 text-center">
              <div class="text-xs font-bold text-amber-400 font-mono">${data.squawk}</div>
              <div class="text-[9px] text-slate-400 font-mono">Squawk</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'CATEGORY / AIRFRAME';
        if (threatScore) threatScore.textContent = `${data.model} (${data.category})`;
        if (threatFill) threatFill.style.width = '80%';

      } else if (kind === 'hotspot') {
        typeBadge.textContent = 'THERMAL ANOMALY (NASA FIRMS)';
        if (titleLabel) titleLabel.textContent = 'ANOMALY DESIGNATION';
        if (targetIp) targetIp.textContent = data.name;
        if (coordsLabel) coordsLabel.textContent = 'THERMAL COORDINATES';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(2)}° N, ${data.lon.toFixed(2)}° E`;
        if (detailsLabel) detailsLabel.textContent = 'SPECTRAL SENSOR STATS';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-amber-500/30 text-center">
              <div class="text-xs font-bold text-amber-400 font-mono">${data.brightness_k} K</div>
              <div class="text-[9px] text-slate-400 font-mono">Яркостная t°</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-amber-500/30 text-center">
              <div class="text-xs font-bold text-rose-400 font-mono">${data.confidence.toUpperCase()}</div>
              <div class="text-[9px] text-slate-400 font-mono">Достоверность</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-amber-500/30 text-center">
              <div class="text-xs font-bold text-amber-300 font-mono">VIIRS</div>
              <div class="text-[9px] text-slate-400 font-mono">Датчик</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'SIGNATURE CLASSIFICATION';
        if (threatScore) threatScore.textContent = data.type;
        if (threatFill) threatFill.style.width = '90%';
      }
    }

    project2D(lat, lon) {
      const paddingX = 40;
      const paddingY = 40;
      const w = this.width - paddingX * 2;
      const h = this.height - paddingY * 2;
      const x = paddingX + ((lon + 180) / 360) * w;
      const y = paddingY + ((90 - lat) / 180) * h;
      return { x, y };
    }

    drawWorldMap2D() {
      // Cyber Grid
      this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.40)';
      this.ctx.lineWidth = 0.5;

      const gridSize = 40;
      for (let x = 0; x < this.width; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, this.height);
        this.ctx.stroke();
      }
      for (let y = 0; y < this.height; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(this.width, y);
        this.ctx.stroke();
      }

      // Greenwich and Equator reference axes
      const eq = this.project2D(0, 0);
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(0, eq.y);
      this.ctx.lineTo(this.width, eq.y);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(eq.x, 0);
      this.ctx.lineTo(eq.x, this.height);
      this.ctx.stroke();

      // Latitude Tropics lines
      const tropicN = this.project2D(23.436, 0);
      const tropicS = this.project2D(-23.436, 0);
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      this.ctx.setLineDash([4, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(0, tropicN.y);
      this.ctx.lineTo(this.width, tropicN.y);
      this.ctx.moveTo(0, tropicS.y);
      this.ctx.lineTo(this.width, tropicS.y);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }

    drawAttackArcs() {
      if (!this.layers.cyber) return;

      for (let arc of this.arcs) {
        arc.progress += arc.speed;
        if (arc.progress > 1.0) arc.progress = 0;

        const p1 = this.project2D(arc.from.lat, arc.from.lon);
        const p2 = this.project2D(arc.to.lat, arc.to.lon);

        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const arcHeight = Math.min(dist * 0.4, 120);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 - arcHeight;

        // Base faint arc
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Laser head
        const t = arc.progress;
        const headX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * midX + t * t * p2.x;
        const headY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * midY + t * t * p2.y;

        const grad = this.ctx.createRadialGradient(headX, headY, 1, headX, headY, 6);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.4, arc.color);
        grad.addColorStop(1, 'rgba(0,0,0,0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(headX, headY, 6, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    drawCyberNodes() {
      if (!this.layers.cyber) return;
      const now = Date.now() * 0.003;

      for (let node of this.nodes) {
        const pt = this.project2D(node.lat, node.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'node' && this.selectedEntity.data.id === node.id;
        const isTarget = node.type === 'primary_target';

        const pulse = (Math.sin(now + node.lat) + 1) * 0.5;
        this.ctx.strokeStyle = isTarget ? `rgba(16, 185, 129, ${0.4 + pulse * 0.4})` : `rgba(56, 189, 248, ${0.2 + pulse * 0.3})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 6 + pulse * 8, 0, Math.PI * 2);
        this.ctx.stroke();

        this.ctx.fillStyle = isTarget ? '#10b981' : (isSelected ? '#38bdf8' : '#0ea5e9');
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, isTarget || isSelected ? 4.5 : 3, 0, Math.PI * 2);
        this.ctx.fill();

        if (isSelected || isTarget) {
          this.ctx.fillStyle = '#f8fafc';
          this.ctx.font = 'bold 10px JetBrains Mono, monospace';
          this.ctx.fillText(node.name, pt.x + 10, pt.y - 4);
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.font = '9px JetBrains Mono, monospace';
          this.ctx.fillText(node.ip, pt.x + 10, pt.y + 8);
        }
      }
    }

    drawSatellites() {
      if (!this.layers.sats) return;
      const now = Date.now() * 0.002;

      for (let sat of this.satellites) {
        const pt = this.project2D(sat.lat, sat.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'sat' && this.selectedEntity.data.id === sat.id;

        // 1. Draw Orbit Ground Track if available
        if (sat.ground_track && sat.ground_track.length > 1) {
          this.ctx.strokeStyle = isSelected ? 'rgba(6, 182, 212, 0.45)' : 'rgba(6, 182, 212, 0.15)';
          this.ctx.lineWidth = 1;
          this.ctx.setLineDash([3, 4]);
          this.ctx.beginPath();
          let started = false;
          for (let p of sat.ground_track) {
            const ptTrack = this.project2D(p.lat, p.lon);
            if (!started) {
              this.ctx.moveTo(ptTrack.x, ptTrack.y);
              started = true;
            } else {
              // Prevent wrap-around visual glitches across the dateline
              if (Math.abs(p.lon) < 170) {
                this.ctx.lineTo(ptTrack.x, ptTrack.y);
              } else {
                this.ctx.moveTo(ptTrack.x, ptTrack.y);
              }
            }
          }
          this.ctx.stroke();
          this.ctx.setLineDash([]);
        }

        // 2. Pulsing sweep ring
        const pulse = (Math.sin(now + sat.norad_id) + 1) * 0.5;
        this.ctx.strokeStyle = `rgba(6, 182, 212, ${0.3 + pulse * 0.5})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 8 + pulse * 10, 0, Math.PI * 2);
        this.ctx.stroke();

        // 3. Satellite Diamond Marker
        this.ctx.save();
        this.ctx.translate(pt.x, pt.y);
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillStyle = isSelected ? '#22d3ee' : '#06b6d4';
        this.ctx.shadowColor = '#22d3ee';
        this.ctx.shadowBlur = isSelected ? 12 : 6;
        this.ctx.fillRect(-3.5, -3.5, 7, 7);
        this.ctx.restore();

        // Label
        this.ctx.fillStyle = isSelected ? '#e0f2fe' : '#67e8f9';
        this.ctx.font = 'bold 9px JetBrains Mono, monospace';
        this.ctx.fillText(`🛰️ ${sat.name}`, pt.x + 9, pt.y - 3);
        this.ctx.fillStyle = '#94a3b8';
        this.ctx.font = '8px JetBrains Mono, monospace';
        this.ctx.fillText(`${sat.altitude_km}km`, pt.x + 9, pt.y + 7);
      }
    }

    drawAircraft() {
      if (!this.layers.air) return;

      for (let ac of this.aircraft) {
        const pt = this.project2D(ac.lat, ac.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'air' && this.selectedEntity.data.icao24 === ac.icao24;
        const isRecon = ac.category && (ac.category.includes('Recon') || ac.category.includes('SIGINT') || ac.category.includes('AEW&C'));

        const color = isRecon ? '#fbbf24' : '#10b981';

        // Heading arrow vector
        const headingRad = (ac.heading - 90) * (Math.PI / 180);
        this.ctx.save();
        this.ctx.translate(pt.x, pt.y);
        this.ctx.rotate(headingRad);

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(6, 0);
        this.ctx.lineTo(-4, -4);
        this.ctx.lineTo(-2, 0);
        this.ctx.lineTo(-4, 4);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // Label
        if (isSelected || isRecon || Math.abs(ac.lat) < 55) {
          this.ctx.fillStyle = isSelected ? '#f8fafc' : color;
          this.ctx.font = 'bold 8.5px JetBrains Mono, monospace';
          this.ctx.fillText(`✈️ ${ac.callsign}`, pt.x + 8, pt.y - 2);
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.font = '8px JetBrains Mono, monospace';
          this.ctx.fillText(`${Math.round(ac.altitude_ft / 1000)}k ft`, pt.x + 8, pt.y + 7);
        }
      }
    }

    drawHotspots() {
      if (!this.layers.hotspots) return;
      const now = Date.now() * 0.003;

      for (let h of this.hotspots) {
        const pt = this.project2D(h.lat, h.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'hotspot' && this.selectedEntity.data.name === h.name;

        const pulse = (Math.sin(now + h.lat) + 1) * 0.5;
        const grad = this.ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, 10 + pulse * 6);
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 10 + pulse * 6, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.fillStyle = '#f59e0b';
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        if (isSelected) {
          this.ctx.fillStyle = '#fda4af';
          this.ctx.font = 'bold 9px JetBrains Mono, monospace';
          this.ctx.fillText(`🔥 ${h.name} [${h.brightness_k}K]`, pt.x + 10, pt.y + 3);
        }
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawWorldMap2D();
      this.drawAttackArcs();
      this.drawCyberNodes();
      this.drawSatellites();
      this.drawAircraft();
      this.drawHotspots();
      requestAnimationFrame(() => this.animate());
    }
  }

  window.TacticalThreatMap = TacticalThreatMap;
})();
