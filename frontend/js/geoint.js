// ==========================================================================
// ARGUS Tactical Threat Map & Autonomous GEOINT Telemetry Engine
// Multi-Domain: NORAD Satellites, ADS-B Aviation, AIS Maritime & NASA FIRMS
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
        maritime: true,
        cameras: true,
        hotspots: true,
        firms: true,
        earthquakes: true,
        cables: true,
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
      this.maritime = [];
      this.cameras = [];
      this.hotspots = [];
      this.firms = [];
      this.earthquakes = [];
      this.cables = [];

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
            this.maritime = data.maritime || [];
            this.cameras = data.cameras || [];
            this.hotspots = data.hotspots || [];
            this.firms = data.firms || [];
            this.earthquakes = data.earthquakes || [];
            this.cables = data.cables || [];

            // Update badge counters
            const countSats = document.getElementById('count-sats');
            const countAir = document.getElementById('count-air');
            const countShips = document.getElementById('count-ships');
            const countCameras = document.getElementById('count-cameras');
            const countHotspots = document.getElementById('count-hotspots');
            const countFirms = document.getElementById('count-firms');
            const countEarthquakes = document.getElementById('count-earthquakes');
            const countCables = document.getElementById('count-cables');
            if (countSats) countSats.textContent = this.satellites.length;
            if (countAir) countAir.textContent = this.aircraft.length;
            if (countShips) countShips.textContent = this.maritime.length;
            if (countCameras) countCameras.textContent = this.cameras.length;
            if (countHotspots) countHotspots.textContent = this.hotspots.length;
            if (countFirms) countFirms.textContent = this.firms.length;
            if (countEarthquakes) countEarthquakes.textContent = this.earthquakes.length;
            if (countCables) countCables.textContent = this.cables.length;

            // Update selected entity if present in latest telemetry
            if (this.selectedEntity) {
              const { kind, data } = this.selectedEntity;
              if (kind === 'sat') {
                const updated = this.satellites.find(s => s.id === data.id);
                if (updated) { this.selectedEntity.data = updated; this.updateHudCard(); }
              } else if (kind === 'air') {
                const updated = this.aircraft.find(a => a.icao24 === data.icao24);
                if (updated) { this.selectedEntity.data = updated; this.updateHudCard(); }
              } else if (kind === 'maritime') {
                const updated = this.maritime.find(m => m.mmsi === data.mmsi);
                if (updated) { this.selectedEntity.data = updated; this.updateHudCard(); }
              } else if (kind === 'camera') {
                const updated = this.cameras.find(c => c.id === data.id);
                if (updated) { this.selectedEntity.data = updated; this.updateHudCard(); }
              } else if (kind === 'firms') {
                const updated = this.firms.find(f => f.id === data.id);
                if (updated) { this.selectedEntity.data = updated; this.updateHudCard(); }
              } else if (kind === 'earthquake') {
                const updated = this.earthquakes.find(e => e.id === data.id);
                if (updated) { this.selectedEntity.data = updated; this.updateHudCard(); }
              } else if (kind === 'cable') {
                const updated = this.cables.find(c => c.id === data.id);
                if (updated) { this.selectedEntity.data = updated; this.updateHudCard(); }
              }
            }
          }
        }
      } catch (err) {
        // Fallback: continues rendering without throwing
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
      bind('btn-layer-maritime', 'maritime');
      bind('btn-layer-cameras', 'cameras');
      bind('btn-layer-hotspots', 'hotspots');
      bind('btn-layer-firms', 'firms');
      bind('btn-layer-earthquakes', 'earthquakes');
      bind('btn-layer-cables', 'cables');
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

        // 1. Check Satellites
        if (this.layers.sats) {
          for (let sat of this.satellites) {
            const pt = this.project2D(sat.lat, sat.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('sat', sat);
              return;
            }
          }
        }

        // 2. Check Aircraft
        if (this.layers.air) {
          for (let ac of this.aircraft) {
            const pt = this.project2D(ac.lat, ac.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('air', ac);
              return;
            }
          }
        }

        // 3. Check Maritime (Ships)
        if (this.layers.maritime) {
          for (let ship of this.maritime) {
            const pt = this.project2D(ship.lat, ship.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('maritime', ship);
              return;
            }
          }
        }

        // 4. Check Cameras
        if (this.layers.cameras && this.cameras) {
          for (let cam of this.cameras) {
            const pt = this.project2D(cam.lat, cam.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 14) {
              this.selectEntity('camera', cam);
              return;
            }
          }
        }

        // 5. Check Hotspots
        if (this.layers.hotspots) {
          for (let h of this.hotspots) {
            const pt = this.project2D(h.lat, h.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('hotspot', h);
              return;
            }
          }
        }

        // 6. Check NASA FIRMS Hotspots
        if (this.layers.firms && this.firms) {
          for (let f of this.firms) {
            const pt = this.project2D(f.lat, f.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 16) {
              this.selectEntity('firms', f);
              return;
            }
          }
        }

        // 7. Check USGS Earthquakes
        if (this.layers.earthquakes && this.earthquakes) {
          for (let eq of this.earthquakes) {
            const pt = this.project2D(eq.lat, eq.lon);
            if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 18) {
              this.selectEntity('earthquake', eq);
              return;
            }
          }
        }

        // 8. Check Submarine Cables Landing Hubs & Waypoints
        if (this.layers.cables && this.cables) {
          for (let c of this.cables) {
            if (c.landing_points) {
              for (let lp of c.landing_points) {
                const pt = this.project2D(lp.lat, lp.lon);
                if (Math.hypot(mouseX - pt.x, mouseY - pt.y) < 14) {
                  this.selectEntity('cable', c);
                  return;
                }
              }
            }
          }
        }

        // 9. Check Cyber Nodes
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

      // Double-click to directly open full CCTV player
      this.canvas.addEventListener('dblclick', () => {
        if (this.selectedEntity && this.selectedEntity.kind === 'camera') {
          if (window.argusApp && typeof window.argusApp.openCameraPlayer === 'function') {
            window.argusApp.openCameraPlayer(this.selectedEntity.data.id);
          }
        }
      });
    }

    selectEntity(kind, data) {
      this.selectedEntity = { kind, data };
      this.updateHudCard();
      if (window.argusApp && window.argusApp.log) {
        const label = kind === 'sat' ? `[NORAD] ${data.name} (${data.operator})` :
                      kind === 'air' ? `[ADS-B] ${data.callsign} (${data.model})` :
                      kind === 'maritime' ? `[AIS] ${data.flag} ${data.name} (${data.type})` :
                      kind === 'camera' ? `[CCTV] ${data.flag} ${data.city} (${data.name})` :
                      kind === 'hotspot' ? `[FIRMS] ${data.name} [${data.brightness_k}K]` :
                      kind === 'firms' ? `[NASA FIRMS] ${data.name} [${data.brightness_k}K, FRP ${data.frp_mw}MW]` :
                      kind === 'earthquake' ? `[USGS EQ] M${data.magnitude} ${data.place} [${data.depth_km}km]` :
                      kind === 'cable' ? `[SUBSEA CABLE] ${data.name} (${data.capacity_tbps} Tbps)` :
                      `[CYBER] ${data.name} (${data.ip})`;
        window.argusApp.log(`[GEOINT HUD] Выбран объект: ${label}`, 'threat');
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
        typeBadge.textContent = `NORAD ORBITAL ASSET [${data.country}]`;
        if (titleLabel) titleLabel.textContent = 'SPACECRAFT / NORAD ID';
        if (targetIp) targetIp.textContent = `${data.name} (#${data.norad_id})`;
        if (coordsLabel) coordsLabel.textContent = 'SUB-SATELLITE GROUND POINT';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(2)}° N, ${data.lon.toFixed(2)}° E [Inc: ${data.inclination_deg}°]`;
        if (detailsLabel) detailsLabel.textContent = 'ORBITAL PARAMETERS & APOGEE';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-cyan-500/30 text-center">
              <div class="text-xs font-bold text-cyan-400 font-mono">${data.altitude_km} km</div>
              <div class="text-[9px] text-slate-400 font-mono">Высота</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-cyan-500/30 text-center">
              <div class="text-xs font-bold text-sky-300 font-mono">${data.velocity_kms} km/s</div>
              <div class="text-[9px] text-slate-400 font-mono">Скорость</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-cyan-500/30 text-center">
              <div class="text-xs font-bold text-emerald-400 font-mono">${escapeHtml(data.type.slice(0, 10))}</div>
              <div class="text-[9px] text-slate-400 font-mono">Тип</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'MISSION ROLE & OPERATOR';
        if (threatScore) threatScore.textContent = `${data.operator} (${data.role.slice(0, 32)})`;
        if (threatFill) threatFill.style.width = '100%';

      } else if (kind === 'air') {
        typeBadge.textContent = `ADS-B AIRBORNE RADAR [${data.country}]`;
        if (titleLabel) titleLabel.textContent = 'CALLSIGN / ICAO24';
        if (targetIp) targetIp.textContent = `${data.callsign} [${data.icao24.toUpperCase()}]`;
        if (coordsLabel) coordsLabel.textContent = 'AIRSPACE POSITION & HEADING';
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
              <div class="text-xs font-bold text-amber-400 font-mono">${escapeHtml(data.squawk)}</div>
              <div class="text-[9px] text-slate-400 font-mono">Squawk</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'MODEL & OPERATOR';
        if (threatScore) threatScore.textContent = `${data.model} // ${data.operator}`;
        if (threatFill) threatFill.style.width = '85%';

      } else if (kind === 'maritime') {
        typeBadge.textContent = `AIS MARITIME COMBATANT // ${data.flag} ${data.country}`;
        if (titleLabel) titleLabel.textContent = 'VESSEL NAME & CALLSIGN';
        if (targetIp) targetIp.textContent = `${data.flag} ${data.name} [${data.callsign}]`;
        if (coordsLabel) coordsLabel.textContent = 'COORDINATES & SEAWAY HEADING';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(2)}° N, ${data.lon.toFixed(2)}° E | Course: ${data.heading}°`;
        if (detailsLabel) detailsLabel.textContent = 'FLEET SPECS & TONNAGE';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-indigo-500/30 text-center">
              <div class="text-xs font-bold text-indigo-400 font-mono">${data.speed_kts} kts</div>
              <div class="text-[9px] text-slate-400 font-mono">Ход</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-indigo-500/30 text-center">
              <div class="text-xs font-bold text-sky-300 font-mono">${data.displacement_t.toLocaleString()} t</div>
              <div class="text-[9px] text-slate-400 font-mono">Тоннаж</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-indigo-500/30 text-center">
              <div class="text-xs font-bold text-emerald-400 font-mono">${data.draught_m} m</div>
              <div class="text-[9px] text-slate-400 font-mono">Осадка</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'DESTINATION & FORMATION';
        if (threatScore) threatScore.textContent = `${data.destination} (${data.fleet})`;
        if (threatFill) threatFill.style.width = '95%';

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

      } else if (kind === 'camera') {
        typeBadge.textContent = `OPEN CCTV // ${data.flag} ${data.city} (${data.country})`;
        if (titleLabel) titleLabel.textContent = 'CAMERA SENSOR ID / LOCATION';
        if (targetIp) targetIp.textContent = `${data.flag} ${data.name}`;
        if (coordsLabel) coordsLabel.textContent = 'COORDINATES & DISTRICT';
        const distStr = data.district ? ` [${data.district}]` : '';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(4)}° N, ${data.lon.toFixed(4)}° E${distStr}`;
        if (detailsLabel) detailsLabel.textContent = 'RESOLUTION & SPECS';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-teal-500/30 text-center">
              <div class="text-xs font-bold text-teal-400 font-mono">${escapeHtml(data.resolution || '1080p')}</div>
              <div class="text-[9px] text-slate-400 font-mono">Качество</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-teal-500/30 text-center">
              <div class="text-xs font-bold text-emerald-400 font-mono">${data.status === 'AIR_GAPPED_STEALTH' ? 'STEALTH' : 'ONLINE'}</div>
              <div class="text-[9px] text-slate-400 font-mono">Статус</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-teal-500/30 text-center">
              <div class="text-xs font-bold text-sky-300 font-mono">${data.category ? escapeHtml(data.category.slice(0, 10)) : 'CCTV'}</div>
              <div class="text-[9px] text-slate-400 font-mono">Тип</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'OPERATOR / PUBLIC PROVIDER';
        if (threatScore) threatScore.textContent = data.operator || 'Public Feed';
        if (threatFill) threatFill.style.width = '100%';

      } else if (kind === 'firms') {
        typeBadge.textContent = `NASA FIRMS // THERMAL ANOMALY [${escapeHtml(data.satellite || 'VIIRS')}]`;
        if (titleLabel) titleLabel.textContent = 'THERMAL DESIGNATION';
        if (targetIp) targetIp.textContent = `${data.name}`;
        if (coordsLabel) coordsLabel.textContent = 'COORDINATES & REGION';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(2)}° N, ${data.lon.toFixed(2)}° E // ${escapeHtml(data.region || '')}`;
        if (detailsLabel) detailsLabel.textContent = 'FIRE RADIATIVE POWER & SENSOR';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-rose-500/30 text-center">
              <div class="text-xs font-bold text-rose-400 font-mono">${data.brightness_k} K</div>
              <div class="text-[9px] text-slate-400 font-mono">Яркость</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-amber-500/30 text-center">
              <div class="text-xs font-bold text-amber-400 font-mono">${data.frp_mw} MW</div>
              <div class="text-[9px] text-slate-400 font-mono">FRP Мощность</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-rose-500/30 text-center">
              <div class="text-xs font-bold text-emerald-400 font-mono">${escapeHtml(data.confidence || 'HIGH')}</div>
              <div class="text-[9px] text-slate-400 font-mono">Точность</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'ACQUISITION TIME & DAY/NIGHT';
        if (threatScore) threatScore.textContent = `${data.acq_time || 'N/A'} (Режим: ${data.daynight === 'D' ? 'Дневной' : 'Ночной'})`;
        if (threatFill) threatFill.style.width = '95%';

      } else if (kind === 'earthquake') {
        const mag = data.magnitude || 5.0;
        typeBadge.textContent = `USGS SEISMIC ACTIVITY // MAGNITUDE M${mag.toFixed(1)}`;
        if (titleLabel) titleLabel.textContent = 'EPICENTER / SEISMIC ZONE';
        if (targetIp) targetIp.textContent = `${data.place || 'Unknown Epicenter'}`;
        if (coordsLabel) coordsLabel.textContent = 'COORDINATES & HYPOCENTER DEPTH';
        if (targetCoords) targetCoords.textContent = `${data.lat.toFixed(2)}° N, ${data.lon.toFixed(2)}° E // Глубина: ${data.depth_km} км`;
        if (detailsLabel) detailsLabel.textContent = 'RICHTER MAGNITUDE & TSUNAMI RISK';
        if (portsContainer) {
          portsContainer.innerHTML = `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-amber-500/30 text-center">
              <div class="text-xs font-bold text-amber-400 font-mono">M${mag.toFixed(1)}</div>
              <div class="text-[9px] text-slate-400 font-mono">Магнитуда</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-amber-500/30 text-center">
              <div class="text-xs font-bold text-cyan-300 font-mono">${data.depth_km} km</div>
              <div class="text-[9px] text-slate-400 font-mono">Глубина</div>
            </div>
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-amber-500/30 text-center">
              <div class="text-xs font-bold ${data.tsunami_alert ? 'text-rose-400 animate-pulse' : 'text-emerald-400'} font-mono">${data.tsunami_alert ? 'WARNING' : 'NONE'}</div>
              <div class="text-[9px] text-slate-400 font-mono">Цунами</div>
            </div>
          `;
        }
        if (threatLabel) threatLabel.textContent = 'TECTONIC FAULT & SIGNIFICANCE';
        if (threatScore) threatScore.textContent = `${data.fault_zone || 'Fault'} (Score: ${data.significance || 500})`;
        if (threatFill) threatFill.style.width = `${Math.min(100, Math.round(mag * 12))}%`;

      } else if (kind === 'cable') {
        typeBadge.textContent = `SUBMARINE FIBER OPTIC BACKBONE // ${data.capacity_tbps} TBPS`;
        if (titleLabel) titleLabel.textContent = 'SUBSEA CABLE SYSTEM';
        if (targetIp) targetIp.textContent = `${data.name}`;
        if (coordsLabel) coordsLabel.textContent = 'LENGTH & OPERATIONAL DATE';
        if (targetCoords) targetCoords.textContent = `${data.length_km.toLocaleString()} km // RFS Год: ${data.rfs_year}`;
        if (detailsLabel) detailsLabel.textContent = 'KEY LANDING STATIONS';
        if (portsContainer) {
          const lps = (data.landing_points || []).slice(0, 3);
          portsContainer.innerHTML = lps.map(lp => `
            <div class="px-2 py-1 rounded bg-slate-900/90 border border-blue-500/30 text-center">
              <div class="text-xs font-bold text-blue-400 font-mono truncate">${escapeHtml(lp.name.slice(0, 14))}</div>
              <div class="text-[9px] text-slate-400 font-mono">Хаб</div>
            </div>
          `).join('');
        }
        if (threatLabel) threatLabel.textContent = 'CONSORTIUM / OPERATORS';
        if (threatScore) threatScore.textContent = `${data.owners || 'Global Telecom'}`;
        if (threatFill) threatFill.style.width = '100%';
      }

      // Show/hide open live camera action button
      const btnOpenCam = document.getElementById('btn-hud-open-camera');
      if (btnOpenCam) {
        if (kind === 'camera') {
          btnOpenCam.classList.remove('hidden');
          btnOpenCam.onclick = () => {
            if (window.argusApp && typeof window.argusApp.openCameraPlayer === 'function') {
              window.argusApp.openCameraPlayer(data.id);
            }
          };
        } else {
          btnOpenCam.classList.add('hidden');
        }
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

        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

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

        // Ground track
        if (sat.ground_track && sat.ground_track.length > 1) {
          this.ctx.strokeStyle = isSelected ? 'rgba(6, 182, 212, 0.45)' : 'rgba(6, 182, 212, 0.12)';
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

        // Radar beacon
        const pulse = (Math.sin(now + sat.norad_id) + 1) * 0.5;
        this.ctx.strokeStyle = `rgba(6, 182, 212, ${0.25 + pulse * 0.45})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 7 + pulse * 8, 0, Math.PI * 2);
        this.ctx.stroke();

        // Diamond
        this.ctx.save();
        this.ctx.translate(pt.x, pt.y);
        this.ctx.rotate(Math.PI / 4);
        this.ctx.fillStyle = isSelected ? '#22d3ee' : '#06b6d4';
        this.ctx.shadowColor = '#22d3ee';
        this.ctx.shadowBlur = isSelected ? 12 : 5;
        this.ctx.fillRect(-3, -3, 6, 6);
        this.ctx.restore();

        if (isSelected || Math.abs(sat.lat) < 55) {
          this.ctx.fillStyle = isSelected ? '#e0f2fe' : '#67e8f9';
          this.ctx.font = 'bold 8.5px JetBrains Mono, monospace';
          this.ctx.fillText(`🛰️ ${sat.name}`, pt.x + 8, pt.y - 3);
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.font = '7.5px JetBrains Mono, monospace';
          this.ctx.fillText(`${sat.altitude_km}km [${sat.country}]`, pt.x + 8, pt.y + 6);
        }
      }
    }

    drawAircraft() {
      if (!this.layers.air) return;

      for (let ac of this.aircraft) {
        const pt = this.project2D(ac.lat, ac.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'air' && this.selectedEntity.data.icao24 === ac.icao24;
        const isDoomsdayOrVip = ac.category && (ac.category.includes('Doomsday') || ac.category.includes('Presidential'));
        const isRecon = ac.category && (ac.category.includes('Recon') || ac.category.includes('SIGINT') || ac.category.includes('AWACS'));

        const color = isDoomsdayOrVip ? '#f43f5e' : (isRecon ? '#fbbf24' : '#10b981');

        const headingRad = (ac.heading - 90) * (Math.PI / 180);
        this.ctx.save();
        this.ctx.translate(pt.x, pt.y);
        this.ctx.rotate(headingRad);

        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(5.5, 0);
        this.ctx.lineTo(-3.5, -3.5);
        this.ctx.lineTo(-1.5, 0);
        this.ctx.lineTo(-3.5, 3.5);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        if (isSelected || isDoomsdayOrVip || isRecon || Math.abs(ac.lat) < 50) {
          this.ctx.fillStyle = isSelected ? '#f8fafc' : color;
          this.ctx.font = 'bold 8.5px JetBrains Mono, monospace';
          this.ctx.fillText(`✈️ ${ac.callsign}`, pt.x + 7, pt.y - 2);
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.font = '7.5px JetBrains Mono, monospace';
          this.ctx.fillText(`${Math.round(ac.altitude_ft / 1000)}k ft [${ac.country}]`, pt.x + 7, pt.y + 6);
        }
      }
    }

    drawMaritime() {
      if (!this.layers.maritime) return;

      for (let ship of this.maritime) {
        const pt = this.project2D(ship.lat, ship.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'maritime' && this.selectedEntity.data.mmsi === ship.mmsi;
        const isCarrier = ship.type && ship.type.includes('Carrier');
        const isIcebreaker = ship.type && ship.type.includes('Icebreaker');
        const isTanker = ship.type && (ship.type.includes('LNG') || ship.type.includes('VLCC'));

        const color = isCarrier ? '#f59e0b' : (isIcebreaker ? '#22d3ee' : (isTanker ? '#ec4899' : '#818cf8'));

        // Draw wake trail
        const headingRad = (ship.heading - 90) * (Math.PI / 180);
        const wakeLength = 12;
        const wakeX = pt.x - Math.cos(headingRad) * wakeLength;
        const wakeY = pt.y - Math.sin(headingRad) * wakeLength;
        this.ctx.strokeStyle = 'rgba(129, 140, 248, 0.25)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.moveTo(pt.x, pt.y);
        this.ctx.lineTo(wakeX, wakeY);
        this.ctx.stroke();

        // Draw ship hull chevron
        this.ctx.save();
        this.ctx.translate(pt.x, pt.y);
        this.ctx.rotate(headingRad);
        this.ctx.fillStyle = color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = isSelected ? 10 : 4;
        this.ctx.beginPath();
        this.ctx.moveTo(6, 0);
        this.ctx.lineTo(-4, -3);
        this.ctx.lineTo(-2, 0);
        this.ctx.lineTo(-4, 3);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        // Label
        if (isSelected || isCarrier || isIcebreaker || Math.abs(ship.lat) < 45) {
          this.ctx.fillStyle = isSelected ? '#ffffff' : color;
          this.ctx.font = 'bold 8.5px JetBrains Mono, monospace';
          this.ctx.fillText(`${ship.flag} ${ship.name}`, pt.x + 8, pt.y - 2);
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.font = '7.5px JetBrains Mono, monospace';
          this.ctx.fillText(`${ship.speed_kts} kts // ${ship.type.slice(0, 14)}`, pt.x + 8, pt.y + 6);
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
        const grad = this.ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, 9 + pulse * 5);
        grad.addColorStop(0, '#f43f5e');
        grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.4)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 9 + pulse * 5, 0, Math.PI * 2);
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

    drawCameras() {
      if (!this.layers.cameras || !this.cameras) return;
      const now = Date.now() * 0.003;

      for (let cam of this.cameras) {
        const pt = this.project2D(cam.lat, cam.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'camera' && this.selectedEntity.data.id === cam.id;
        const isRu = cam.country === 'RU';
        const baseColor = isRu ? '#14b8a6' : '#f59e0b';
        const ringColor = isSelected ? '#38bdf8' : baseColor;

        // Aperture circle
        this.ctx.strokeStyle = ringColor;
        this.ctx.lineWidth = isSelected ? 2 : 1;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, isSelected ? 6.5 : 4, 0, Math.PI * 2);
        this.ctx.stroke();

        // Pulsing red REC dot
        const pulse = (Math.sin(now + cam.lat * 5) + 1) * 0.5;
        this.ctx.fillStyle = isSelected ? '#ef4444' : `rgba(239, 68, 68, ${0.4 + pulse * 0.6})`;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, isSelected ? 2.5 : 1.5, 0, Math.PI * 2);
        this.ctx.fill();

        // Label for selected or key regional cities
        if (isSelected) {
          this.ctx.fillStyle = '#f0fdfa';
          this.ctx.font = 'bold 8.5px JetBrains Mono, monospace';
          this.ctx.fillText(`📹 ${cam.flag} ${cam.city}`, pt.x + 8, pt.y - 2);
          this.ctx.fillStyle = '#94a3b8';
          this.ctx.font = '7.5px JetBrains Mono, monospace';
          this.ctx.fillText(`CCTV [${cam.id}]`, pt.x + 8, pt.y + 7);
        }
      }
    }

    drawSubmarineCables() {
      if (!this.layers.cables || !this.cables) return;
      const now = Date.now() * 0.002;

      for (let cable of this.cables) {
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'cable' && this.selectedEntity.data.id === cable.id;

        // 1. Draw subsea cable fiber route
        if (cable.waypoints && cable.waypoints.length > 1) {
          this.ctx.save();
          this.ctx.strokeStyle = isSelected ? '#38bdf8' : 'rgba(14, 165, 233, 0.50)';
          this.ctx.lineWidth = isSelected ? 2.5 : 1.2;
          this.ctx.shadowColor = isSelected ? '#38bdf8' : '#0284c7';
          this.ctx.shadowBlur = isSelected ? 12 : 4;
          this.ctx.setLineDash(isSelected ? [] : [4, 3]);

          this.ctx.beginPath();
          let started = false;
          let prevLon = 0;

          for (let wp of cable.waypoints) {
            const lat = wp[0];
            const lon = wp[1];
            const pt = this.project2D(lat, lon);

            if (!started) {
              this.ctx.moveTo(pt.x, pt.y);
              started = true;
            } else {
              // Handle antimeridian jump (wrap-around)
              if (Math.abs(lon - prevLon) > 180) {
                this.ctx.moveTo(pt.x, pt.y);
              } else {
                this.ctx.lineTo(pt.x, pt.y);
              }
            }
            prevLon = lon;
          }
          this.ctx.stroke();
          this.ctx.restore();
        }

        // 2. Draw cable landing stations
        if (cable.landing_points) {
          for (let lp of cable.landing_points) {
            const pt = this.project2D(lp.lat, lp.lon);
            const pulse = (Math.sin(now + lp.lat) + 1) * 0.5;

            this.ctx.fillStyle = isSelected ? '#38bdf8' : '#0284c7';
            this.ctx.beginPath();
            this.ctx.arc(pt.x, pt.y, isSelected ? 4 : 2.5, 0, Math.PI * 2);
            this.ctx.fill();

            if (isSelected) {
              this.ctx.strokeStyle = `rgba(56, 189, 248, ${0.4 + pulse * 0.5})`;
              this.ctx.lineWidth = 1;
              this.ctx.beginPath();
              this.ctx.arc(pt.x, pt.y, 6 + pulse * 6, 0, Math.PI * 2);
              this.ctx.stroke();

              this.ctx.fillStyle = '#bae6fd';
              this.ctx.font = 'bold 8px JetBrains Mono, monospace';
              this.ctx.fillText(`⚓ ${lp.name}`, pt.x + 6, pt.y + 3);
            }
          }
        }
      }
    }

    drawFirmsHotspots() {
      if (!this.layers.firms || !this.firms) return;
      const now = Date.now() * 0.003;

      for (let f of this.firms) {
        const pt = this.project2D(f.lat, f.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'firms' && this.selectedEntity.data.id === f.id;
        const pulse = (Math.sin(now + f.lat * 3) + 1) * 0.5;

        // Radiant heat aura
        const radius = isSelected ? 12 + pulse * 6 : 8 + pulse * 4;
        const grad = this.ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, radius);
        grad.addColorStop(0, '#ff4d4f');
        grad.addColorStop(0.4, 'rgba(244, 63, 94, 0.45)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Core thermal ember
        this.ctx.fillStyle = isSelected ? '#ffffff' : '#f59e0b';
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, isSelected ? 3 : 2, 0, Math.PI * 2);
        this.ctx.fill();

        if (isSelected || f.brightness_k > 360) {
          this.ctx.fillStyle = isSelected ? '#ffffff' : '#fda4af';
          this.ctx.font = 'bold 8.5px JetBrains Mono, monospace';
          this.ctx.fillText(`🔥 ${f.name}`, pt.x + 8, pt.y - 2);
          this.ctx.fillStyle = '#fca5a5';
          this.ctx.font = '7.5px JetBrains Mono, monospace';
          this.ctx.fillText(`${f.brightness_k}K [FRP ${f.frp_mw}MW]`, pt.x + 8, pt.y + 7);
        }
      }
    }

    drawEarthquakes() {
      if (!this.layers.earthquakes || !this.earthquakes) return;
      const now = Date.now() * 0.002;

      for (let eq of this.earthquakes) {
        const pt = this.project2D(eq.lat, eq.lon);
        const isSelected = this.selectedEntity && this.selectedEntity.kind === 'earthquake' && this.selectedEntity.data.id === eq.id;
        const mag = eq.magnitude || 5.0;

        const color = mag >= 6.5 ? '#ef4444' : (mag >= 5.5 ? '#f97316' : '#eab308');

        // Concentric seismic shockwave rings
        const waveProgress = ((now * 12 + mag * 5) % 24) / 24;
        const ringRadius = 4 + waveProgress * (mag * 4);
        const ringAlpha = Math.max(0, 1 - waveProgress) * (isSelected ? 0.9 : 0.6);

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = isSelected ? 1.8 : 1.2;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, ringRadius, 0, Math.PI * 2);
        this.ctx.stroke();

        // Epicenter core
        this.ctx.fillStyle = isSelected ? '#ffffff' : color;
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = isSelected ? 10 : 4;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, isSelected ? 3.5 : 2.5, 0, Math.PI * 2);
        this.ctx.fill();

        if (isSelected || mag >= 6.0) {
          this.ctx.fillStyle = isSelected ? '#ffffff' : color;
          this.ctx.font = 'bold 8.5px JetBrains Mono, monospace';
          this.ctx.fillText(`⚡ M${mag.toFixed(1)} ${eq.place.slice(0, 20)}`, pt.x + 8, pt.y - 2);
          this.ctx.fillStyle = '#cbd5e1';
          this.ctx.font = '7.5px JetBrains Mono, monospace';
          this.ctx.fillText(`Глубина: ${eq.depth_km}км`, pt.x + 8, pt.y + 7);
        }
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawWorldMap2D();
      this.drawSubmarineCables();
      this.drawAttackArcs();
      this.drawCyberNodes();
      this.drawSatellites();
      this.drawAircraft();
      this.drawMaritime();
      this.drawCameras();
      this.drawHotspots();
      this.drawFirmsHotspots();
      this.drawEarthquakes();
      requestAnimationFrame(() => this.animate());
    }
  }

  window.TacticalThreatMap = TacticalThreatMap;
})();
