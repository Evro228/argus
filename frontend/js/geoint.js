// ARGUS Tactical Threat Map & God's Eye Engine
(function () {
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

      this.mode = '2d'; // '2d' (Live Threat Map) or '3d' (God's Eye Globe)
      
      // Known Global Nodes
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

      this.activeNode = this.nodes[0]; // Default selected Frankfurt
      this.initAttackArcs();
      this.bindEvents();
      this.animate();
    }

    initAttackArcs() {
      this.arcs = [];
      const target = this.nodes[0]; // Frankfurt
      const sources = this.nodes.filter(n => n.id !== 'frankfurt');

      for (let i = 0; i < sources.length; i++) {
        const src = sources[i];
        this.arcs.push({
          from: src,
          to: target,
          progress: Math.random(),
          speed: 0.004 + Math.random() * 0.005,
          color: i % 2 === 0 ? '#38bdf8' : '#f59e0b',
          trailLength: 0.25
        });
      }
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

        for (let node of this.nodes) {
          const pt = this.project2D(node.lat, node.lon);
          const dist = Math.hypot(mouseX - pt.x, mouseY - pt.y);
          if (dist < 14) {
            this.selectNode(node);
            break;
          }
        }
      });
    }

    selectNode(node) {
      this.activeNode = node;
      this.updateHudCard();
      if (window.argusApp && window.argusApp.log) {
        window.argusApp.log(`[HUD] Выбран тактический узел: ${node.name} (${node.ip})`, 'threat');
      }
    }

    updateHudCard() {
      const ipEl = document.getElementById('hud-target-ip');
      const coordsEl = document.getElementById('hud-target-coords');
      const portsContainer = document.getElementById('hud-target-ports');
      const threatMeter = document.getElementById('hud-target-threat-fill');
      const threatScore = document.getElementById('hud-target-threat-score');

      if (ipEl) ipEl.textContent = this.activeNode.ip;
      if (coordsEl) {
        coordsEl.textContent = `${this.activeNode.lat.toFixed(4)}° N, ${this.activeNode.lon.toFixed(4)}° E ${this.activeNode.name}`;
      }
      if (portsContainer) {
        portsContainer.innerHTML = this.activeNode.ports.map(p => {
          const safePort = String(p.port).replace(/[&<>"']/g, '');
          const safeS = String(p.s).replace(/[&<>"']/g, '');
          return `
          <div class="px-3 py-1.5 rounded-lg bg-slate-900/90 border border-slate-700/80 text-center">
            <div class="text-xs font-bold text-sky-400 font-mono">${safePort}</div>
            <div class="text-[10px] text-slate-400 font-mono">${safeS}</div>
          </div>
        `;
        }).join('');
      }
      if (threatMeter) threatMeter.style.width = `${this.activeNode.threat}%`;
      if (threatScore) threatScore.textContent = `${this.activeNode.threat}%`;
    }

    project2D(lat, lon) {
      // Equirectangular projection centered with padding
      const paddingX = 40;
      const paddingY = 40;
      const w = this.width - paddingX * 2;
      const h = this.height - paddingY * 2;

      const x = paddingX + ((lon + 180) / 360) * w;
      const y = paddingY + ((90 - lat) / 180) * h;
      return { x, y };
    }

    drawWorldMap2D() {
      // Dark cyber grid
      this.ctx.strokeStyle = 'rgba(30, 41, 59, 0.45)';
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

      // Stylized continent outlines & radar rings
      this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.1)';
      this.ctx.lineWidth = 1;

      // Equator and Greenwich lines
      const eq = this.project2D(0, 0);
      this.ctx.beginPath();
      this.ctx.moveTo(0, eq.y);
      this.ctx.lineTo(this.width, eq.y);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(eq.x, 0);
      this.ctx.lineTo(eq.x, this.height);
      this.ctx.stroke();
    }

    drawAttackArcs() {
      const now = Date.now() * 0.001;

      for (let arc of this.arcs) {
        arc.progress += arc.speed;
        if (arc.progress > 1.0) arc.progress = 0;

        const p1 = this.project2D(arc.from.lat, arc.from.lon);
        const p2 = this.project2D(arc.to.lat, arc.to.lon);

        // Curvature control point (tactical parabolic arc)
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy);
        const arcHeight = Math.min(dist * 0.4, 120);

        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 - arcHeight;

        // Draw faint base arc line
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();

        // Draw animated laser head and trail
        const t = arc.progress;
        // Quadratic bezier interpolation: B(t) = (1-t)^2 P0 + 2(1-t)t P1 + t^2 P2
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

    drawNodes() {
      const now = Date.now() * 0.003;

      for (let node of this.nodes) {
        const pt = this.project2D(node.lat, node.lon);
        const isSelected = this.activeNode && this.activeNode.id === node.id;
        const isTarget = node.type === 'primary_target';

        // Outer pulsing wave
        const pulse = (Math.sin(now + node.lat) + 1) * 0.5;
        this.ctx.strokeStyle = isTarget ? `rgba(16, 185, 129, ${0.4 + pulse * 0.4})` : `rgba(56, 189, 248, ${0.2 + pulse * 0.3})`;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, 6 + pulse * 8, 0, Math.PI * 2);
        this.ctx.stroke();

        // Core Dot
        this.ctx.fillStyle = isTarget ? '#10b981' : (isSelected ? '#38bdf8' : '#0ea5e9');
        this.ctx.shadowColor = this.ctx.fillStyle;
        this.ctx.shadowBlur = isSelected ? 12 : 6;
        this.ctx.beginPath();
        this.ctx.arc(pt.x, pt.y, isTarget || isSelected ? 4.5 : 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Label
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

    animate() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.drawWorldMap2D();
      this.drawAttackArcs();
      this.drawNodes();
      requestAnimationFrame(() => this.animate());
    }
  }

  window.TacticalThreatMap = TacticalThreatMap;
})();
