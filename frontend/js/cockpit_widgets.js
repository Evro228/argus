// ==========================================================================
// ARGUS // Tactical Defense Cockpit - Auxiliary Canvas Widgets
// Energy-Efficient Canvas Architecture (Strict 30 FPS, 0% CPU Idle)
// Concept #01: Cockpit (Mirroring Image 1)
// ==========================================================================
(function () {
  'use strict';

  // Simplified continental polygon paths for 2D mini-maps (scaled to [0..1, 0..1])
  const CONTINENTS_NORMALIZED = [[[0.0667, 0.1], [0.1111, 0.1056], [0.125, 0.1167], [0.1667, 0.1222], [0.2222, 0.1389], [0.25, 0.1667], [0.2778, 0.1556], [0.3194, 0.1556], [0.3333, 0.1944], [0.3444, 0.2222], [0.3528, 0.2389], [0.3222, 0.2556], [0.3056, 0.2667], [0.2889, 0.2944], [0.2778, 0.3222], [0.2778, 0.3611], [0.2722, 0.3611], [0.2667, 0.3389], [0.2556, 0.3333], [0.2333, 0.3444], [0.2306, 0.3778], [0.2333, 0.3944], [0.2417, 0.4111], [0.2556, 0.4167], [0.2583, 0.4278], [0.2694, 0.45], [0.2861, 0.4556], [0.275, 0.4611], [0.2639, 0.4444], [0.2444, 0.4222], [0.2278, 0.4111], [0.2083, 0.3889], [0.1944, 0.3611], [0.175, 0.3222], [0.1611, 0.2944], [0.1556, 0.2667], [0.1528, 0.2333], [0.1389, 0.2], [0.1222, 0.1778], [0.0972, 0.1667], [0.0694, 0.1778], [0.0417, 0.1667], [0.0333, 0.1333], [0.05, 0.1111], [0.0667, 0.1]], [[0.3, 0.4333], [0.3278, 0.4444], [0.3389, 0.4667], [0.3556, 0.4722], [0.3611, 0.5], [0.3889, 0.5167], [0.4028, 0.5333], [0.3972, 0.5667], [0.3917, 0.6], [0.3806, 0.6278], [0.3667, 0.6556], [0.3528, 0.6889], [0.3417, 0.7111], [0.3194, 0.75], [0.3111, 0.7889], [0.3167, 0.8056], [0.3, 0.8], [0.2917, 0.7667], [0.2944, 0.7222], [0.3, 0.6833], [0.3056, 0.6278], [0.2917, 0.5889], [0.2833, 0.5556], [0.275, 0.5278], [0.2806, 0.4889], [0.2861, 0.4556], [0.3, 0.4333]], [[0.5722, 0.1056], [0.5417, 0.1222], [0.5139, 0.1556], [0.5167, 0.1778], [0.525, 0.2], [0.5139, 0.2056], [0.5056, 0.2167], [0.4889, 0.2333], [0.4972, 0.2556], [0.4778, 0.2611], [0.475, 0.2944], [0.4833, 0.3], [0.4944, 0.2944], [0.5028, 0.2722], [0.5111, 0.2611], [0.525, 0.2556], [0.5417, 0.2722], [0.5417, 0.2889], [0.55, 0.2778], [0.5667, 0.2778], [0.5639, 0.2944], [0.5722, 0.2833], [0.5806, 0.2722], [0.5806, 0.2556], [0.5861, 0.2444], [0.6083, 0.2389], [0.6028, 0.25], [0.5944, 0.2556], [0.5833, 0.2389], [0.5556, 0.2], [0.5361, 0.1889], [0.5306, 0.1722], [0.5528, 0.1667], [0.5639, 0.1389], [0.5778, 0.1111], [0.5722, 0.1056]], [[0.4861, 0.1778], [0.4944, 0.1778], [0.5, 0.2], [0.5028, 0.2167], [0.4861, 0.2222], [0.4861, 0.2056], [0.4833, 0.1944], [0.4861, 0.1778]], [[0.4861, 0.3], [0.5278, 0.2944], [0.5306, 0.3167], [0.5556, 0.3222], [0.5889, 0.3278], [0.5944, 0.3444], [0.6028, 0.3778], [0.6222, 0.4333], [0.6417, 0.4333], [0.6333, 0.4722], [0.6139, 0.5111], [0.6111, 0.5611], [0.5917, 0.6389], [0.5722, 0.6889], [0.55, 0.6889], [0.5444, 0.6556], [0.5389, 0.6222], [0.5333, 0.5833], [0.5333, 0.5278], [0.525, 0.4778], [0.5, 0.4722], [0.4806, 0.4722], [0.4639, 0.4556], [0.4556, 0.4333], [0.4556, 0.4111], [0.4528, 0.3778], [0.4639, 0.3444], [0.475, 0.3167], [0.4861, 0.3]], [[0.6361, 0.5667], [0.6389, 0.5889], [0.6306, 0.6389], [0.6222, 0.6389], [0.6222, 0.5944], [0.6361, 0.5667]], [[0.7917, 0.0722], [0.7222, 0.0944], [0.6667, 0.1111], [0.6389, 0.1222], [0.6111, 0.1667], [0.6111, 0.2222], [0.6306, 0.25], [0.6389, 0.2778], [0.6389, 0.2944], [0.6333, 0.3333], [0.6528, 0.3611], [0.6667, 0.3667], [0.6861, 0.3611], [0.6944, 0.3889], [0.7111, 0.4444], [0.7139, 0.4556], [0.7222, 0.4278], [0.7306, 0.4], [0.7472, 0.3778], [0.7556, 0.3778], [0.7611, 0.4111], [0.775, 0.4444], [0.7861, 0.4722], [0.7889, 0.4944], [0.8, 0.4667], [0.8028, 0.4389], [0.7972, 0.3889], [0.8167, 0.3778], [0.8306, 0.3611], [0.8389, 0.3278], [0.8278, 0.2889], [0.8444, 0.2778], [0.8583, 0.3056], [0.8583, 0.2889], [0.8639, 0.2667], [0.875, 0.2333], [0.8806, 0.1944], [0.9028, 0.1667], [0.9444, 0.1778], [0.9722, 0.1389], [0.9972, 0.1333], [0.9944, 0.1111], [0.9167, 0.1], [0.875, 0.0833], [0.7917, 0.0722]], [[0.8944, 0.25], [0.9028, 0.2611], [0.8889, 0.3056], [0.8639, 0.3167], [0.8694, 0.3111], [0.8861, 0.2889], [0.8917, 0.2722], [0.8944, 0.25]], [[0.8667, 0.5667], [0.8778, 0.5667], [0.8861, 0.5944], [0.8944, 0.5667], [0.9056, 0.6], [0.925, 0.6389], [0.9222, 0.6833], [0.9056, 0.7111], [0.8889, 0.7111], [0.8778, 0.6944], [0.8667, 0.6778], [0.8472, 0.6778], [0.825, 0.6944], [0.8194, 0.6778], [0.8139, 0.6389], [0.8278, 0.6111], [0.8417, 0.5889], [0.8583, 0.5833], [0.8667, 0.5667]], [[0.4167, 0.0444], [0.4444, 0.0778], [0.4306, 0.1111], [0.3778, 0.1667], [0.3556, 0.1389], [0.3444, 0.1], [0.3111, 0.0667], [0.3611, 0.0444], [0.4167, 0.0444]]];

  // ==========================================================================
  // 1. DEFCON CIRCULAR GAUGE
  // ==========================================================================
  class DefconGauge {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.value = 3; // DEFCON 3
      this.init();
    }

    init() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth || 150;
      const h = this.canvas.clientHeight || 130;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
      this.w = w;
      this.h = h;
      this.render();
    }

    render() {
      const ctx = this.ctx;
      const cx = this.w * 0.5;
      const cy = this.h * 0.52;
      const radius = Math.min(cx, cy) - 16;

      ctx.clearRect(0, 0, this.w, this.h);

      const startAngle = 0.78 * Math.PI;
      const endAngle = 2.22 * Math.PI;
      const totalSpan = endAngle - startAngle;

      // Outer background arc
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, endAngle);
      ctx.stroke();

      // Active amber arc for DEFCON 3 (~45% of span)
      const activeAngle = startAngle + totalSpan * 0.48;
      ctx.strokeStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, activeAngle);
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Tick marks and numbers: 0, 10, 20, 30, 40, 50, 100
      const labels = [
        { label: '0', p: 0 },
        { label: '10', p: 0.15 },
        { label: '20', p: 0.30 },
        { label: '30', p: 0.48 },
        { label: '40', p: 0.65 },
        { label: '50', p: 0.80 },
        { label: '100', p: 1.0 }
      ];

      ctx.font = '8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748b';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      labels.forEach(item => {
        const ang = startAngle + totalSpan * item.p;
        const tickInner = radius - 8;
        const tickOuter = radius - 4;
        const x1 = cx + Math.cos(ang) * tickInner;
        const y1 = cy + Math.sin(ang) * tickInner;
        const x2 = cx + Math.cos(ang) * tickOuter;
        const y2 = cy + Math.sin(ang) * tickOuter;

        ctx.strokeStyle = item.p <= 0.48 ? '#f59e0b' : 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        const lx = cx + Math.cos(ang) * (radius - 15);
        const ly = cy + Math.sin(ang) * (radius - 15);
        ctx.fillText(item.label, lx, ly);
      });

      // Center text: DEFCON 3 COLOR
      ctx.textAlign = 'center';
      ctx.font = '500 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('DEFCON', cx, cy - 14);

      ctx.font = '700 24px "JetBrains Mono", monospace';
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 6;
      ctx.fillText('3', cx, cy + 6);
      ctx.shadowBlur = 0;

      ctx.font = '500 8px "JetBrains Mono", monospace';
      ctx.fillStyle = '#64748b';
      ctx.fillText('COLOR', cx, cy + 20);
    }
  }

  // ==========================================================================
  // 2. NETWORK TELEMETRY SPLINE WAVE
  // ==========================================================================
  class NetworkTelemetryWave {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.points1 = [70, 85, 95, 80, 130, 140, 100, 120, 155, 140, 160, 145];
      this.points2 = [40, 50, 60, 45, 75, 80, 65, 70, 95, 85, 90, 80];
      this.phase = 0;
      this.init();
      this.start();
    }

    init() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth || 240;
      const h = this.canvas.clientHeight || 100;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
      this.w = w;
      this.h = h;
    }

    start() {
      this.interval = setInterval(() => {
        if (document.hidden) return;
        this.phase += 0.05;
        this.render();
      }, 150);
    }

    stop() {
      if (this.interval) clearInterval(this.interval);
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      const step = this.w / (this.points1.length - 1);

      // Primary wave (amber/white)
      ctx.beginPath();
      for (let i = 0; i < this.points1.length; i++) {
        const x = i * step;
        const wobble = Math.sin(this.phase + i * 0.7) * 4;
        const val = this.points1[i] + wobble;
        const y = this.h - (val / 200) * this.h;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevX = (i - 1) * step;
          const prevWobble = Math.sin(this.phase + (i - 1) * 0.7) * 4;
          const prevVal = this.points1[i - 1] + prevWobble;
          const prevY = this.h - (prevVal / 200) * this.h;
          const cx = (prevX + x) / 2;
          ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
        }
      }

      ctx.lineWidth = 1.8;
      ctx.strokeStyle = '#e2e8f0';
      ctx.stroke();

      ctx.lineTo(this.w, this.h);
      ctx.lineTo(0, this.h);
      ctx.closePath();
      const grad = ctx.createLinearGradient(0, 0, 0, this.h);
      grad.addColorStop(0, 'rgba(245, 158, 11, 0.18)');
      grad.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
      ctx.fillStyle = grad;
      ctx.fill();

      // Secondary subtle wave (cyan)
      ctx.beginPath();
      for (let i = 0; i < this.points2.length; i++) {
        const x = i * step;
        const wobble = Math.cos(this.phase + i * 0.6) * 3;
        const val = this.points2[i] + wobble;
        const y = this.h - (val / 200) * this.h;
        if (i === 0) ctx.moveTo(x, y);
        else {
          const prevX = (i - 1) * step;
          const prevWobble = Math.cos(this.phase + (i - 1) * 0.6) * 3;
          const prevVal = this.points2[i - 1] + prevWobble;
          const prevY = this.h - (prevVal / 200) * this.h;
          const cx = (prevX + x) / 2;
          ctx.bezierCurveTo(cx, prevY, cx, y, x, y);
        }
      }
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
      ctx.stroke();
    }
  }

  // ==========================================================================
  // 3. CYBER ATTACK VECTORS MINI MAP
  // ==========================================================================
  class AttackVectorsMap {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.arcs = [
        { x1: 0.22, y1: 0.32, x2: 0.48, y2: 0.28, color: '#f59e0b', progress: 0.2 },
        { x1: 0.48, y1: 0.28, x2: 0.78, y2: 0.32, color: '#38bdf8', progress: 0.6 },
        { x1: 0.18, y1: 0.38, x2: 0.78, y2: 0.32, color: '#f59e0b', progress: 0.8 },
        { x1: 0.48, y1: 0.28, x2: 0.24, y2: 0.65, color: '#38bdf8', progress: 0.4 }
      ];
      this.init();
      this.start();
    }

    init() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth || 300;
      const h = this.canvas.clientHeight || 135;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
      this.w = w;
      this.h = h;
    }

    start() {
      this.interval = setInterval(() => {
        if (document.hidden) return;
        this.arcs.forEach(a => {
          a.progress = (a.progress + 0.02) % 1.0;
        });
        this.render();
      }, 100);
    }

    stop() {
      if (this.interval) clearInterval(this.interval);
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 0.8;
      CONTINENTS_NORMALIZED.forEach(poly => {
        ctx.beginPath();
        poly.forEach(([px, py], idx) => {
          const x = px * this.w;
          const y = py * this.h;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      this.arcs.forEach(arc => {
        const x1 = arc.x1 * this.w;
        const y1 = arc.y1 * this.h;
        const x2 = arc.x2 * this.w;
        const y2 = arc.y2 * this.h;
        const midX = (x1 + x2) / 2;
        const midY = Math.min(y1, y2) - 25;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(midX, midY, x2, y2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = arc.color === '#f59e0b' ? 'rgba(245, 158, 11, 0.35)' : 'rgba(56, 189, 248, 0.35)';
        ctx.stroke();

        const t = arc.progress;
        const bx = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
        const by = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * y2;

        ctx.fillStyle = arc.color;
        ctx.shadowColor = arc.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(bx, by, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.arc(x1, y1, 1.8, 0, Math.PI * 2);
        ctx.arc(x2, y2, 1.8, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  // ==========================================================================
  // 4. GEOSPATIAL EVENT MAPPING MINI MAP (Radial Arcs)
  // ==========================================================================
  class GeospatialEventMap {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.epicenter = { x: 0.48, y: 0.30 };
      this.targets = [
        { x: 0.18, y: 0.32 },
        { x: 0.22, y: 0.42 },
        { x: 0.26, y: 0.65 },
        { x: 0.52, y: 0.62 },
        { x: 0.68, y: 0.45 },
        { x: 0.82, y: 0.32 },
        { x: 0.84, y: 0.72 }
      ];
      this.pulse = 0;
      this.init();
      this.start();
    }

    init() {
      if (!this.canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = this.canvas.clientWidth || 300;
      const h = this.canvas.clientHeight || 125;
      this.canvas.width = w * dpr;
      this.canvas.height = h * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
      this.w = w;
      this.h = h;
    }

    start() {
      this.interval = setInterval(() => {
        if (document.hidden) return;
        this.pulse = (this.pulse + 0.03) % 1.0;
        this.render();
      }, 100);
    }

    stop() {
      if (this.interval) clearInterval(this.interval);
    }

    render() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.w, this.h);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.lineWidth = 0.8;
      CONTINENTS_NORMALIZED.forEach(poly => {
        ctx.beginPath();
        poly.forEach(([px, py], idx) => {
          const x = px * this.w;
          const y = py * this.h;
          if (idx === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      const ex = this.epicenter.x * this.w;
      const ey = this.epicenter.y * this.h;

      this.targets.forEach((tgt, idx) => {
        const tx = tgt.x * this.w;
        const ty = tgt.y * this.h;
        const midX = (ex + tx) / 2;
        const midY = Math.min(ey, ty) - 18;

        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.quadraticCurveTo(midX, midY, tx, ty);
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
        ctx.stroke();

        const t = (this.pulse + idx * 0.15) % 1.0;
        const px = (1 - t) * (1 - t) * ex + 2 * (1 - t) * t * midX + t * t * tx;
        const py = (1 - t) * (1 - t) * ey + 2 * (1 - t) * t * midY + t * t * ty;

        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(px, py, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = '#f59e0b';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(ex, ey, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  // ==========================================================================
  // INITIALIZATION & LIFECYCLE CONTROLLER
  // ==========================================================================
  window.ArgusCockpitWidgets = {
    defconGauge: null,
    telemetryWave: null,
    attackVectorsMap: null,
    geospatialEventMap: null,

    initAll() {
      try {
        if (!this.defconGauge) this.defconGauge = new DefconGauge('defcon-gauge-canvas');
        if (!this.telemetryWave) this.telemetryWave = new NetworkTelemetryWave('net-telemetry-canvas');
        if (!this.attackVectorsMap) this.attackVectorsMap = new AttackVectorsMap('attack-vectors-canvas');
        if (!this.geospatialEventMap) this.geospatialEventMap = new GeospatialEventMap('geospatial-event-canvas');
      } catch (err) {
        console.warn('[CockpitWidgets] Init warning:', err);
      }
    },

    resizeAll() {
      if (this.defconGauge) this.defconGauge.init();
      if (this.telemetryWave) this.telemetryWave.init();
      if (this.attackVectorsMap) this.attackVectorsMap.init();
      if (this.geospatialEventMap) this.geospatialEventMap.init();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.ArgusCockpitWidgets.initAll());
  } else {
    setTimeout(() => window.ArgusCockpitWidgets.initAll(), 50);
  }

  window.addEventListener('resize', () => window.ArgusCockpitWidgets.resizeAll());

})();
