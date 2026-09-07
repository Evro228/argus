/**
 * ARGUS Tactical Synapse Entity Graph (OSINT 2D Force-Directed Visualization)
 * High-performance, energy-efficient tactical radar visualizer for identity footprint,
 * social clusters, and verified cross-platform intelligence.
 */

(function () {
  'use strict';

  class SynapseGraph {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext('2d');
      this.nodes = [];
      this.links = [];
      this.particles = [];
      this.isSimulating = true;
      this.scale = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.draggedNode = null;
      this.hoveredNode = null;
      this.selectedNode = null;
      this.isPanning = false;
      this.lastMouse = { x: 0, y: 0 };
      this.pulseTime = 0;
      this.sleepCount = 0;

      this.initEvents();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width || 800;
      this.height = rect.height || 500;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.resetTransform();
      this.ctx.scale(dpr, dpr);
    }

    setData(graphData) {
      if (!graphData || !graphData.nodes) return;
      const cx = this.width / 2;
      const cy = this.height / 2;

      this.nodes = graphData.nodes.map((n, i) => {
        let x = cx;
        let y = cy;
        if (n.type === 'category') {
          const angle = (i * Math.PI * 2) / Math.max(1, (graphData.nodes.filter(x => x.type === 'category').length || 3));
          x += Math.cos(angle) * 145;
          y += Math.sin(angle) * 145;
        } else if (n.type === 'platform') {
          const angle = Math.random() * Math.PI * 2;
          const r = 190 + (i % 3) * 35;
          x += Math.cos(angle) * r;
          y += Math.sin(angle) * r;
        }
        return {
          ...n,
          x: n.x || x,
          y: n.y || y,
          vx: 0,
          vy: 0,
        };
      });

      const nodeMap = new Map(this.nodes.map((n) => [n.id, n]));
      this.links = (graphData.links || [])
        .map((l) => ({
          ...l,
          sourceNode: nodeMap.get(l.source),
          targetNode: nodeMap.get(l.target),
        }))
        .filter((l) => l.sourceNode && l.targetNode);

      // Spawn energy particles along confirmed links
      this.particles = [];
      this.links.forEach(l => {
        if (l.sourceNode && l.targetNode) {
          const count = l.targetNode.glow ? 2 : 1;
          for (let p = 0; p < count; p++) {
            this.particles.push({
              link: l,
              t: Math.random(),
              speed: 0.005 + Math.random() * 0.005,
              color: l.targetNode.glow ? '#10b981' : '#38bdf8'
            });
          }
        }
      });

      this.panX = 0;
      this.panY = 0;
      this.scale = 1.0;
      this.isSimulating = true;
      this.sleepCount = 0;
    }

    initEvents() {
      if (!this.canvas) return;

      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left - this.panX) / this.scale,
          y: (e.clientY - rect.top - this.panY) / this.scale,
        };
      };

      const findNodeAt = (pos) => {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
          const n = this.nodes[i];
          const dist = Math.hypot(n.x - pos.x, n.y - pos.y);
          if (dist <= n.size + 8) return n;
        }
        return null;
      };

      this.canvas.addEventListener('mousedown', (e) => {
        const pos = getPos(e);
        const node = findNodeAt(pos);
        if (node) {
          this.draggedNode = node;
          this.isSimulating = true;
          this.sleepCount = 0;
        } else {
          this.isPanning = true;
          this.lastMouse = { x: e.clientX, y: e.clientY };
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (this.draggedNode) {
          const pos = getPos(e);
          this.draggedNode.x = pos.x;
          this.draggedNode.y = pos.y;
          this.draggedNode.vx = 0;
          this.draggedNode.vy = 0;
          this.isSimulating = true;
          this.sleepCount = 0;
        } else if (this.isPanning) {
          const dx = e.clientX - this.lastMouse.x;
          const dy = e.clientY - this.lastMouse.y;
          this.panX += dx;
          this.panY += dy;
          this.lastMouse = { x: e.clientX, y: e.clientY };
        } else {
          const pos = getPos(e);
          this.hoveredNode = findNodeAt(pos);
          this.canvas.style.cursor = this.hoveredNode ? 'pointer' : (this.isPanning ? 'grabbing' : 'grab');
        }
      });

      window.addEventListener('mouseup', () => {
        this.draggedNode = null;
        this.isPanning = false;
      });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
        this.scale = Math.min(Math.max(0.4, this.scale * zoomFactor), 2.5);
      });

      this.canvas.addEventListener('click', (e) => {
        const pos = getPos(e);
        const node = findNodeAt(pos);
        if (node) {
          this.selectedNode = node;
          if (node.url && /^https?:\/\//i.test(node.url)) {
            window.open(node.url, '_blank', 'noopener,noreferrer');
          }
        }
      });
    }

    updatePhysics() {
      if (!this.isSimulating) return;

      const cx = this.width / 2;
      const cy = this.height / 2;
      let totalKineticEnergy = 0;

      // 1. Repulsion between all nodes
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n1 = this.nodes[i];
          const n2 = this.nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = n1.size + n2.size + 42;

          if (dist < minDist * 2.8) {
            const force = (minDist * minDist) / (dist * dist) * 0.35;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            if (n1 !== this.draggedNode) {
              n1.vx -= fx;
              n1.vy -= fy;
            }
            if (n2 !== this.draggedNode) {
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // 2. Link Spring Forces
      for (const link of this.links) {
        const s = link.sourceNode;
        const t = link.targetNode;
        const dx = t.x - s.x;
        const dy = t.y - s.y;
        const dist = Math.hypot(dx, dy) || 1;
        const targetDist = link.type === 'hierarchy' ? 115 : 75;
        const spring = (dist - targetDist) * 0.03 * (link.weight || 1);

        const fx = (dx / dist) * spring;
        const fy = (dy / dist) * spring;

        if (s !== this.draggedNode) {
          s.vx += fx;
          s.vy += fy;
        }
        if (t !== this.draggedNode) {
          t.vx -= fx;
          t.vy -= fy;
        }
      }

      // 3. Center gravity and damping
      for (const node of this.nodes) {
        if (node === this.draggedNode) continue;
        const dx = cx - node.x;
        const dy = cy - node.y;
        node.vx += dx * 0.002;
        node.vy += dy * 0.002;

        // High damping for quick stabilization
        node.vx *= 0.78;
        node.vy *= 0.78;

        node.x += node.vx;
        node.y += node.vy;

        totalKineticEnergy += (node.vx * node.vx + node.vy * node.vy);
      }

      // Auto-freeze simulation when resting
      if (totalKineticEnergy < 0.02) {
        this.sleepCount++;
        if (this.sleepCount > 20) {
          this.isSimulating = false;
        }
      } else {
        this.sleepCount = 0;
      }
    }

    render() {
      const w = this.width;
      const h = this.height;
      const ctx = this.ctx;

      ctx.clearRect(0, 0, w, h);

      ctx.save();
      ctx.translate(this.panX, this.panY);
      ctx.scale(this.scale, this.scale);

      const cx = w / 2;
      const cy = h / 2;

      // 1. Tactical Radar Background Rings & Coordinates
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      [80, 150, 220, 290].forEach(r => {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.beginPath();
      ctx.moveTo(cx - 300, cy);
      ctx.lineTo(cx + 300, cy);
      ctx.moveTo(cx, cy - 300);
      ctx.lineTo(cx, cy + 300);
      ctx.stroke();

      // 2. Render Links
      for (const link of this.links) {
        const s = link.sourceNode;
        const t = link.targetNode;

        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(t.x, t.y);
        ctx.strokeStyle = link.color || 'rgba(56, 189, 248, 0.2)';
        ctx.lineWidth = link.type === 'hierarchy' ? 1.5 : 1.0;
        if (link.type === 'potential') {
          ctx.setLineDash([3, 3]);
        } else {
          ctx.setLineDash([]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Flowing energy particles
      this.particles.forEach(p => {
        p.t = (p.t + p.speed) % 1.0;
        const s = p.link.sourceNode;
        const t = p.link.targetNode;
        const px = s.x + (t.x - s.x) * p.t;
        const py = s.y + (t.y - s.y) * p.t;

        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(px, py, 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // 4. Render Nodes
      this.pulseTime += 0.035;
      for (const node of this.nodes) {
        const isHovered = this.hoveredNode === node;
        const isSelected = this.selectedNode === node;
        const isTarget = node.type === 'target';

        // Outer glow
        if (node.glow || isHovered || isSelected || isTarget) {
          const pulse = Math.sin(this.pulseTime) * 3;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size + (isTarget ? 7 + pulse : 4), 0, Math.PI * 2);
          ctx.fillStyle = isTarget ? 'rgba(56, 189, 248, 0.15)' : `${node.color}25`;
          ctx.fill();
        }

        // Main node core
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        ctx.fillStyle = node.color || '#38bdf8';
        ctx.fill();
        ctx.lineWidth = (isHovered || isSelected) ? 2.5 : 1.5;
        ctx.strokeStyle = '#05070a';
        ctx.stroke();

        // Inner pip for target
        if (isTarget) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        }

        // Text label with dark backplate for crisp readability
        const labelText = node.label || '';
        ctx.font = isTarget ? '700 12px "JetBrains Mono", monospace' : '500 10px "JetBrains Mono", sans-serif';
        const textMetrics = ctx.measureText(labelText);
        const tw = textMetrics.width;
        const ty = node.y + node.size + 14;

        ctx.fillStyle = 'rgba(5, 7, 10, 0.85)';
        ctx.beginPath();
        ctx.roundRect(node.x - tw / 2 - 4, ty - 9, tw + 8, 14, 3);
        ctx.fill();

        ctx.fillStyle = isHovered ? '#38bdf8' : (isTarget ? '#ffffff' : '#cbd5e1');
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(labelText, node.x, ty - 2);

        // Sublabel or status badge
        if (node.status) {
          const statusText = node.status === 'Found' ? 'ПОДТВЕРЖДЕН' : node.status;
          ctx.font = '700 8px "JetBrains Mono", monospace';
          const sw = ctx.measureText(statusText).width;
          const sy = node.y + node.size + 27;

          const isPositive = node.status === 'Found' || node.status === 'READY';
          ctx.fillStyle = isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)';
          ctx.strokeStyle = isPositive ? 'rgba(16, 185, 129, 0.4)' : 'rgba(100, 116, 139, 0.3)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.roundRect(node.x - sw / 2 - 4, sy - 7, sw + 8, 12, 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = isPositive ? '#34d399' : '#94a3b8';
          ctx.fillText(statusText, node.x, sy - 1);
        }
      }

      // 5. Hover Tooltip
      if (this.hoveredNode) {
        const hn = this.hoveredNode;
        const tipText = hn.url ? `${hn.label}: ${hn.url}` : `${hn.category || hn.type}: ${hn.label}`;
        ctx.font = '10px "JetBrains Mono", monospace';
        const textWidth = ctx.measureText(tipText).width;
        const tooltipX = hn.x;
        const tooltipY = hn.y - hn.size - 18;

        ctx.fillStyle = 'rgba(7, 10, 15, 0.95)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(tooltipX - textWidth / 2 - 8, tooltipY - 11, textWidth + 16, 20, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tipText, tooltipX, tooltipY - 1);
      }

      ctx.restore();
    }

    animate() {
      if (!document.hidden) {
        this.updatePhysics();
        this.render();
      }
      requestAnimationFrame(this.animate);
    }
  }

  // Export to window
  window.SynapseGraph = SynapseGraph;
})();
