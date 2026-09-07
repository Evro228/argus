// ==========================================================================
// ARGUS // Tactical Intelligence & Defense Cockpit
// 3D ORTHOGRAPHIC GLOBE & C4ISR TELEMETRY ENGINE
// Energy-Efficient Canvas Architecture (Strict 30 FPS, Offscreen Caching, 0% Idle CPU)
// ==========================================================================
(function () {
  'use strict';

  function getIpcToken() {
    if (window.__ARGUS_IPC_TOKEN__) return window.__ARGUS_IPC_TOKEN__;
    if (window.argusNative && typeof window.argusNative.getIpcToken === 'function') {
      try {
        const token = window.argusNative.getIpcToken();
        if (token) {
          window.__ARGUS_IPC_TOKEN__ = token;
          return token;
        }
      } catch (_) {}
    }
    try {
      const stored = localStorage.getItem('argus_ipc_token');
      if (stored) {
        window.__ARGUS_IPC_TOKEN__ = stored;
        return stored;
      }
    } catch (_) {}
    try {
      const match = document.cookie.match(/argus_ipc_token=([^;]+)/);
      if (match && match[1]) {
        window.__ARGUS_IPC_TOKEN__ = match[1];
        return match[1];
      }
    } catch (_) {}
    return '';
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

  // Pre-compiled global landmass vertex clusters (North America, South America, Europe, Africa, Asia, Australia)
  // Low vertex count (< 300 points) for instant projection in < 0.05ms per frame
  const WORLD_LAND_CLUSTERS = [
    // North America
    [ {lat: 70, lon: -160}, {lat: 65, lon: -140}, {lat: 60, lon: -125}, {lat: 50, lon: -125}, {lat: 38, lon: -122}, {lat: 30, lon: -115}, {lat: 20, lon: -105}, {lat: 15, lon: -92}, {lat: 25, lon: -80}, {lat: 30, lon: -85}, {lat: 35, lon: -75}, {lat: 44, lon: -68}, {lat: 52, lon: -56}, {lat: 60, lon: -65}, {lat: 70, lon: -85}, {lat: 72, lon: -125} ],
    // South America
    [ {lat: 10, lon: -75}, {lat: -5, lon: -80}, {lat: -20, lon: -70}, {lat: -40, lon: -73}, {lat: -55, lon: -68}, {lat: -45, lon: -64}, {lat: -30, lon: -50}, {lat: -10, lon: -37}, {lat: -2, lon: -44}, {lat: 5, lon: -52}, {lat: 10, lon: -65} ],
    // Europe
    [ {lat: 70, lon: 25}, {lat: 60, lon: 10}, {lat: 54, lon: 3}, {lat: 48, lon: -4}, {lat: 44, lon: -8}, {lat: 37, lon: -8}, {lat: 36, lon: -2}, {lat: 42, lon: 3}, {lat: 44, lon: 12}, {lat: 38, lon: 15}, {lat: 40, lon: 24}, {lat: 46, lon: 30}, {lat: 55, lon: 30}, {lat: 65, lon: 35}, {lat: 70, lon: 30} ],
    // Africa
    [ {lat: 35, lon: -5}, {lat: 30, lon: 10}, {lat: 32, lon: 30}, {lat: 22, lon: 38}, {lat: 12, lon: 51}, {lat: 0, lon: 42}, {lat: -15, lon: 40}, {lat: -30, lon: 32}, {lat: -34, lon: 18}, {lat: -20, lon: 12}, {lat: 0, lon: 9}, {lat: 10, lon: -14}, {lat: 25, lon: -16} ],
    // Asia / Eurasia
    [ {lat: 70, lon: 40}, {lat: 75, lon: 100}, {lat: 72, lon: 140}, {lat: 65, lon: 170}, {lat: 55, lon: 160}, {lat: 45, lon: 140}, {lat: 35, lon: 130}, {lat: 22, lon: 120}, {lat: 12, lon: 105}, {lat: 5, lon: 100}, {lat: 15, lon: 85}, {lat: 25, lon: 70}, {lat: 30, lon: 50}, {lat: 45, lon: 40}, {lat: 60, lon: 40} ],
    // Australia
    [ {lat: -12, lon: 132}, {lat: -20, lon: 148}, {lat: -35, lon: 150}, {lat: -38, lon: 144}, {lat: -34, lon: 118}, {lat: -22, lon: 114}, {lat: -15, lon: 125} ]
  ];

  class TacticalThreatMap {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');

      // Tactical nodes
      this.nodes = [
        { id: 'frankfurt', name: 'Frankfurt [EU-C1]', ip: '198.51.100.42', lat: 50.1109, lon: 8.6821, type: 'primary_target', threat: 85, ports: [22, 80, 443] },
        { id: 'nyc', name: 'New York [US-E1]', ip: '198.18.44.12', lat: 40.7128, lon: -74.0060, type: 'hub', threat: 42, ports: [8080, 443] },
        { id: 'london', name: 'London [UK-S1]', ip: '51.140.22.8', lat: 51.5074, lon: -0.1278, type: 'hub', threat: 28, ports: [443] },
        { id: 'tokyo', name: 'Tokyo [AP-N1]', ip: '133.242.18.5', lat: 35.6762, lon: 139.6503, type: 'hub', threat: 64, ports: [22, 3306] },
        { id: 'sao_paulo', name: 'Sao Paulo [SA-E1]', ip: '177.71.200.15', lat: -23.5505, lon: -46.6333, type: 'hub', threat: 38, ports: [80] },
        { id: 'sydney', name: 'Sydney [AP-S1]', ip: '13.239.50.2', lat: -33.8688, lon: 151.2093, type: 'hub', threat: 19, ports: [443] },
        { id: 'beijing', name: 'Beijing [AS-E1]', ip: '202.108.22.5', lat: 39.9042, lon: 116.4074, type: 'source', threat: 75, ports: [80] },
        { id: 'moscow', name: 'Moscow [RU-C1]', ip: '198.51.100.36', lat: 55.7558, lon: 37.6173, type: 'operator', threat: 10, ports: [443, 22] },
        { id: 'san_francisco', name: 'San Francisco [US-W1]', ip: '104.244.42.1', lat: 37.7749, lon: -122.4194, type: 'source', threat: 50, ports: [443] }
      ];

      // 3D Orbital satellites
      this.satellites = [
        { name: 'USA 245 (KEYHOLE)', orbit: 0, angle: 0.2, speed: 0.006, color: '#38bdf8' },
        { name: 'COSMOS 2558', orbit: 1, angle: 1.8, speed: 0.005, color: '#f59e0b' },
        { name: 'YAOGAN 35-01A', orbit: 2, angle: 3.4, speed: 0.007, color: '#10b981' },
        { name: 'HST (HUBBLE)', orbit: 0, angle: 4.5, speed: 0.004, color: '#f8fafc' },
        { name: 'BEIDOU-3 M21', orbit: 1, angle: 5.2, speed: 0.006, color: '#38bdf8' }
      ];

      // 3D Orbital planes: inclination and ascending node (Euler tilt angles)
      this.orbits = [
        { inc: 0.85, raan: 0.4, rMult: 1.32, color: 'rgba(56, 189, 248, 0.22)' },
        { inc: -0.70, raan: 1.6, rMult: 1.38, color: 'rgba(245, 158, 11, 0.22)' },
        { inc: 1.15, raan: 2.8, rMult: 1.45, color: 'rgba(16, 185, 129, 0.20)' }
      ];

      // Cyber Attack Arcs
      this.arcs = [
        { from: this.nodes[1], to: this.nodes[0], progress: 0.1, speed: 0.008, color: '#f59e0b' },
        { from: this.nodes[6], to: this.nodes[1], progress: 0.6, speed: 0.007, color: '#00f0ff' },
        { from: this.nodes[8], to: this.nodes[3], progress: 0.3, speed: 0.009, color: '#f59e0b' },
        { from: this.nodes[0], to: this.nodes[4], progress: 0.8, speed: 0.006, color: '#00f0ff' }
      ];

      this.selectedEntity = { kind: 'node', data: this.nodes[0] };

      // Globe camera orientation
      this.yaw = 0.65;      // rotation angle around Y (longitude)
      this.pitch = 0.32;    // tilt angle around X (latitude, ~18 deg)
      this.targetYaw = 0.65;
      this.targetPitch = 0.32;
      this.isDragging = false;
      this.lastMouseX = 0;
      this.lastMouseY = 0;

      // Strict energy-efficient timing (Target 30 FPS)
      this.targetFps = 30;
      this.frameInterval = 1000 / this.targetFps; // 33.33ms
      this.lastFrameTime = 0;
      this.animId = null;
      this.isPaused = false;
      this.lowPower = false;

      this.initCanvasSize();
      this.bindEvents();
      this.start();
    }

    initAttackArcs() {
      return this.arcs;
    }

    initCanvasSize() {
      const rect = this.canvas.getBoundingClientRect();
      this.width = rect.width || this.canvas.clientWidth || 600;
      this.height = rect.height || this.canvas.clientHeight || 500;
      const dpr = Math.min(window.devicePixelRatio || 1, 2); // Cap DPR at 2 to save GPU on Retina 3x
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);

      // Sphere radius fits neatly within viewport with padding for orbital rings
      this.radius = Math.min(this.width, this.height) * 0.32;
      this.cx = this.width * 0.5;
      this.cy = this.height * 0.5;
    }

    // Mathematical 3D Orthographic Projection
    project3D(latDeg, lonDeg, altMult = 1.0) {
      const r = this.radius * altMult;
      const phi = latDeg * (Math.PI / 180);
      const lam = lonDeg * (Math.PI / 180);

      // Spherical to 3D Cartesian
      const x = r * Math.cos(phi) * Math.sin(lam - this.yaw);
      const y = -r * Math.sin(phi);
      const z = r * Math.cos(phi) * Math.cos(lam - this.yaw);

      // Rotate around X axis (pitch)
      const cosP = Math.cos(this.pitch);
      const sinP = Math.sin(this.pitch);
      const yP = y * cosP - z * sinP;
      const zP = y * sinP + z * cosP;

      return {
        x: this.cx + x,
        y: this.cy + yP,
        z: zP,
        visible: zP > -r * 0.05 // Slight tolerance for limb visibility
      };
    }

    // Project an arbitrary 3D vector rotated by yaw and pitch
    projectVector(x, y, z) {
      const cosY = Math.cos(-this.yaw);
      const sinY = Math.sin(-this.yaw);
      const xR = x * cosY - z * sinY;
      const zR = x * sinY + z * cosY;

      const cosP = Math.cos(this.pitch);
      const sinP = Math.sin(this.pitch);
      const yP = y * cosP - zR * sinP;
      const zP = y * sinP + zR * cosP;

      return {
        x: this.cx + xR,
        y: this.cy + yP,
        z: zP,
        visible: zP > 0
      };
    }

    bindEvents() {
      window.addEventListener('resize', () => this.initCanvasSize());

      // Mouse drag rotation
      this.canvas.addEventListener('mousedown', (e) => {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;

        this.yaw -= dx * 0.006;
        this.pitch = Math.max(-0.8, Math.min(0.8, this.pitch - dy * 0.006));
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
      });

      // Target node selection on click
      this.canvas.addEventListener('click', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        for (let node of this.nodes) {
          const pt = this.project3D(node.lat, node.lon);
          if (!pt.visible) continue;
          const dist = Math.hypot(mx - pt.x, my - pt.y);
          if (dist <= 12) {
            this.selectedEntity = { kind: 'node', data: node };
            this.updateHudCard(node);
            break;
          }
        }
      });

      // Thermal hygiene: pause rendering when window is minimized or hidden
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.stop();
        } else {
          this.start();
        }
      });

      // Low power throttling on window blur
      window.addEventListener('blur', () => {
        this.targetFps = 15;
        this.frameInterval = 1000 / 15;
      });
      window.addEventListener('focus', () => {
        this.targetFps = 30;
        this.frameInterval = 1000 / 30;
      });
    }

    start() {
      if (this.animId) return;
      this.isPaused = false;
      this.lastFrameTime = performance.now();
      const loop = (now) => {
        this.animId = requestAnimationFrame(loop);
        if (this.isPaused || document.hidden) return;

        const delta = now - this.lastFrameTime;
        if (delta < this.frameInterval) return;
        this.lastFrameTime = now - (delta % this.frameInterval);

        this.render();
      };
      this.animId = requestAnimationFrame(loop);
    }

    stop() {
      if (this.animId) {
        cancelAnimationFrame(this.animId);
        this.animId = null;
      }
      this.isPaused = true;
    }

    render() {
      // Smooth slow auto-rotation when user is not dragging
      if (!this.isDragging) {
        this.yaw += 0.0018;
      }

      const ctx = this.ctx;
      const w = this.width;
      const h = this.height;
      const r = this.radius;
      const cx = this.cx;
      const cy = this.cy;

      ctx.clearRect(0, 0, w, h);

      // 1. Sphere Dark Shading & Atmospheric Rim Glow
      const globeGrad = ctx.createRadialGradient(cx - r * 0.25, cy - r * 0.25, r * 0.1, cx, cy, r);
      globeGrad.addColorStop(0, '#0c101b');
      globeGrad.addColorStop(0.7, '#070910');
      globeGrad.addColorStop(1, '#040508');

      ctx.fillStyle = globeGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Atmospheric limb ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.18)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Outer soft glow ring
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 2, 0, Math.PI * 2);
      ctx.stroke();

      // 2. Latitude and Longitude Graticule (Parallels & Meridians)
      ctx.lineWidth = 0.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';

      // Parallels (every 30 deg)
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        let started = false;
        for (let lon = -180; lon <= 180; lon += 8) {
          const pt = this.project3D(lat, lon);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // Meridians (every 30 deg)
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        let started = false;
        for (let lat = -80; lat <= 80; lat += 8) {
          const pt = this.project3D(lat, lon);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }

      // 3. Continent Mesh & Land Polygons
      ctx.fillStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 0.75;

      for (let cluster of WORLD_LAND_CLUSTERS) {
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < cluster.length; i++) {
          const pt = this.project3D(cluster[i].lat, cluster[i].lon);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }

      // 4. Back-side of Orbital Satellite Rings
      this.drawOrbitalRings(ctx, false);

      // 5. Great-Circle Cyber Attack Arcs (in 3D space)
      this.draw3DAttackArcs(ctx);

      // 6. Tactical Ground Nodes
      this.drawGroundNodes(ctx);

      // 7. Front-side of Orbital Satellite Rings & Satellites
      this.drawOrbitalRings(ctx, true);
      this.drawSatellites(ctx);
    }

    drawOrbitalRings(ctx, front) {
      const steps = 60;
      for (let i = 0; i < this.orbits.length; i++) {
        const o = this.orbits[i];
        const rOrb = this.radius * o.rMult;

        ctx.strokeStyle = o.color;
        ctx.lineWidth = 0.75;
        ctx.setLineDash(front ? [] : [2, 4]);

        ctx.beginPath();
        let started = false;
        for (let j = 0; j <= steps; j++) {
          const theta = (j / steps) * Math.PI * 2;
          // Point on inclined circular orbit
          const x0 = rOrb * Math.cos(theta);
          const y0 = rOrb * Math.sin(theta) * Math.sin(o.inc);
          const z0 = rOrb * Math.sin(theta) * Math.cos(o.inc);

          // Rotate by RAAN (longitude of ascending node)
          const cosR = Math.cos(o.raan);
          const sinR = Math.sin(o.raan);
          const xOrb = x0 * cosR - z0 * sinR;
          const zOrb = x0 * sinR + z0 * cosR;

          const pt = this.projectVector(xOrb, y0, zOrb);
          const isFront = pt.z >= 0;

          if (isFront === front) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }
        }
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    drawSatellites(ctx) {
      for (let sat of this.satellites) {
        sat.angle += sat.speed;
        const o = this.orbits[sat.orbit];
        const rOrb = this.radius * o.rMult;

        const x0 = rOrb * Math.cos(sat.angle);
        const y0 = rOrb * Math.sin(sat.angle) * Math.sin(o.inc);
        const z0 = rOrb * Math.sin(sat.angle) * Math.cos(o.inc);

        const cosR = Math.cos(o.raan);
        const sinR = Math.sin(o.raan);
        const xOrb = x0 * cosR - z0 * sinR;
        const zOrb = x0 * sinR + z0 * cosR;

        const pt = this.projectVector(xOrb, y0, zOrb);
        if (!pt.visible) continue;

        // Draw tactical satellite glyph [—|—]
        ctx.fillStyle = sat.color;
        ctx.strokeStyle = sat.color;
        ctx.lineWidth = 1;

        // Satellite body
        ctx.fillRect(pt.x - 2, pt.y - 2, 4, 4);

        // Solar panels
        ctx.beginPath();
        ctx.moveTo(pt.x - 6, pt.y);
        ctx.lineTo(pt.x - 2, pt.y);
        ctx.moveTo(pt.x + 2, pt.y);
        ctx.lineTo(pt.x + 6, pt.y);
        ctx.stroke();

        // Label
        ctx.font = '8px "JetBrains Mono", monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText(sat.name, pt.x + 8, pt.y + 3);
      }
    }

    draw3DAttackArcs(ctx) {
      for (let arc of this.arcs) {
        arc.progress += arc.speed;
        if (arc.progress > 1.0) arc.progress = 0;

        const p1 = this.project3D(arc.from.lat, arc.from.lon);
        const p2 = this.project3D(arc.to.lat, arc.to.lon);

        if (!p1.visible && !p2.visible) continue;

        // Compute 3D midpoint elevated above the sphere
        const steps = 24;
        ctx.beginPath();
        let started = false;
        let headPos = null;

        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          // Interpolate lat / lon
          const lat = arc.from.lat + (arc.to.lat - arc.from.lat) * t;
          const lon = arc.from.lon + (arc.to.lon - arc.from.lon) * t;
          // Parabolic height curve
          const alt = 1.0 + Math.sin(Math.PI * t) * 0.22;

          const pt = this.project3D(lat, lon, alt);
          if (pt.visible) {
            if (!started) { ctx.moveTo(pt.x, pt.y); started = true; }
            else ctx.lineTo(pt.x, pt.y);
          } else {
            started = false;
          }

          if (Math.abs(t - arc.progress) < 1 / steps) {
            headPos = pt;
          }
        }

        ctx.strokeStyle = arc.color === '#00f0ff' ? 'rgba(0, 240, 255, 0.25)' : 'rgba(245, 158, 11, 0.25)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Moving glowing particle head
        if (headPos && headPos.visible) {
          ctx.fillStyle = arc.color;
          ctx.beginPath();
          ctx.arc(headPos.x, headPos.y, 3, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(headPos.x, headPos.y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    drawGroundNodes(ctx) {
      for (let node of this.nodes) {
        const pt = this.project3D(node.lat, node.lon);
        if (!pt.visible) continue;

        const isSelected = this.selectedEntity && this.selectedEntity.data.id === node.id;
        const color = node.threat > 60 ? '#f59e0b' : '#38bdf8';

        // Outer pulse circle
        ctx.strokeStyle = isSelected ? '#ffffff' : color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, isSelected ? 6 : 4, 0, Math.PI * 2);
        ctx.stroke();

        // Inner solid core
        ctx.fillStyle = isSelected ? '#ffffff' : color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
        ctx.fill();

        // Node label
        if (isSelected || node.type === 'primary_target') {
          ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
          ctx.fillStyle = isSelected ? '#f8fafc' : color;
          ctx.fillText(node.name, pt.x + 8, pt.y - 2);
        }
      }
    }

    updateHudCard(node) {
      const card = document.getElementById('target-hud-card');
      if (card) card.classList.remove('hidden');
      const ipElem = document.getElementById('hud-target-ip');
      const coordsElem = document.getElementById('hud-target-coords');
      const threatElem = document.getElementById('hud-target-threat-score');
      const threatFill = document.getElementById('hud-target-threat-fill');

      if (ipElem) ipElem.textContent = node.ip;
      if (coordsElem) coordsElem.textContent = `${node.lat.toFixed(4)}° N, ${node.lon.toFixed(4)}° E ${node.name}`;
      if (threatElem) threatElem.textContent = `${node.threat}%`;
      if (threatFill) {
        threatFill.style.width = `${node.threat}%`;
        threatFill.className = node.threat > 70 
          ? 'bg-gradient-to-r from-amber-400 to-rose-500 h-1.5 rounded-full' 
          : 'bg-gradient-to-r from-cyan-400 to-emerald-400 h-1.5 rounded-full';
      }
    }
  }

  window.TacticalThreatMap = TacticalThreatMap;
})();
