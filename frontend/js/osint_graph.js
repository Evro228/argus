/**
 * ARGUS Tactical Synapse Entity Graph (OSINT 2D Force-Directed Visualization)
 * High-performance 60 FPS Canvas visualizer for identity footprint, social clusters, and cross-platform intelligence.
 */

(function () {
  class SynapseGraph {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;
      this.ctx = this.canvas.getContext("2d");
      this.nodes = [];
      this.links = [];
      this.isSimulating = true;
      this.scale = 1.0;
      this.panX = 0;
      this.panY = 0;
      this.draggedNode = null;
      this.hoveredNode = null;
      this.isPanning = false;
      this.lastMouse = { x: 0, y: 0 };
      this.pulseTime = 0;

      this.initEvents();
      this.resize();
      window.addEventListener("resize", () => this.resize());
      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    resize() {
      if (!this.canvas) return;
      const rect = this.canvas.parentElement.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.width = rect.width || 800;
      this.height = rect.height || 500;
      this.canvas.width = this.width * dpr;
      this.canvas.height = this.height * dpr;
      this.ctx.scale(dpr, dpr);
    }

    setData(graphData) {
      if (!graphData || !graphData.nodes) return;
      const dpr = window.devicePixelRatio || 1;
      const cx = (this.canvas.width / dpr) / 2;
      const cy = (this.canvas.height / dpr) / 2;

      // Assign initial positions in radial clusters
      this.nodes = graphData.nodes.map((n, i) => {
        let x = cx;
        let y = cy;
        if (n.type === "category") {
          const angle = (i * Math.PI * 2) / (graphData.nodes.length || 1);
          x += Math.cos(angle) * 140;
          y += Math.sin(angle) * 140;
        } else if (n.type === "platform") {
          const angle = Math.random() * Math.PI * 2;
          const r = 180 + Math.random() * 80;
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

      // Map links to direct node references
      const nodeMap = new Map(this.nodes.map((n) => [n.id, n]));
      this.links = (graphData.links || [])
        .map((l) => ({
          ...l,
          sourceNode: nodeMap.get(l.source),
          targetNode: nodeMap.get(l.target),
        }))
        .filter((l) => l.sourceNode && l.targetNode);

      this.panX = 0;
      this.panY = 0;
      this.scale = 1.0;
    }

    initEvents() {
      if (!this.canvas) return;

      const getPos = (e) => {
        const rect = this.canvas.getBoundingClientRect();
        return {
          x: (e.clientX - rect.left - this.panX) / this.scale,
          y: (e.clientY - rect.top - this.panY) / this.scale,
          rawX: e.clientX - rect.left,
          rawY: e.clientY - rect.top,
        };
      };

      const findNodeAt = (pos) => {
        for (let i = this.nodes.length - 1; i >= 0; i--) {
          const n = this.nodes[i];
          const dist = Math.hypot(n.x - pos.x, n.y - pos.y);
          if (dist <= n.size + 6) return n;
        }
        return null;
      };

      this.canvas.addEventListener("mousedown", (e) => {
        const pos = getPos(e);
        const node = findNodeAt(pos);
        if (node) {
          this.draggedNode = node;
        } else {
          this.isPanning = true;
          this.lastMouse = { x: e.clientX, y: e.clientY };
        }
      });

      window.addEventListener("mousemove", (e) => {
        if (this.draggedNode) {
          const pos = getPos(e);
          this.draggedNode.x = pos.x;
          this.draggedNode.y = pos.y;
          this.draggedNode.vx = 0;
          this.draggedNode.vy = 0;
        } else if (this.isPanning) {
          const dx = e.clientX - this.lastMouse.x;
          const dy = e.clientY - this.lastMouse.y;
          this.panX += dx;
          this.panY += dy;
          this.lastMouse = { x: e.clientX, y: e.clientY };
        } else {
          const pos = getPos(e);
          this.hoveredNode = findNodeAt(pos);
          this.canvas.style.cursor = this.hoveredNode ? "pointer" : "default";
        }
      });

      window.addEventListener("mouseup", () => {
        this.draggedNode = null;
        this.isPanning = false;
      });

      this.canvas.addEventListener("wheel", (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
        this.scale = Math.min(Math.max(0.4, this.scale * zoomFactor), 3.0);
      });

      this.canvas.addEventListener("click", (e) => {
        const pos = getPos(e);
        const node = findNodeAt(pos);
        if (node && node.url) {
          window.open(node.url, "_blank");
        }
      });
    }

    updatePhysics() {
      if (!this.isSimulating) return;

      const dpr = window.devicePixelRatio || 1;
      const cx = (this.canvas.width / dpr) / 2;
      const cy = (this.canvas.height / dpr) / 2;

      // 1. Repulsion between all nodes
      for (let i = 0; i < this.nodes.length; i++) {
        for (let j = i + 1; j < this.nodes.length; j++) {
          const n1 = this.nodes[i];
          const n2 = this.nodes[j];
          const dx = n2.x - n1.x;
          const dy = n2.y - n1.y;
          const dist = Math.hypot(dx, dy) || 1;
          const minDist = n1.size + n2.size + 45;

          if (dist < minDist * 3) {
            const force = (minDist * minDist) / (dist * dist) * 0.45;
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
        const targetDist = link.type === "hierarchy" ? 110 : 75;
        const spring = (dist - targetDist) * 0.035 * (link.weight || 1);

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
        node.vx += dx * 0.003;
        node.vy += dy * 0.003;

        // Damping
        node.vx *= 0.82;
        node.vy *= 0.82;

        node.x += node.vx;
        node.y += node.vy;
      }
    }

    render() {
      const dpr = window.devicePixelRatio || 1;
      const w = this.canvas.width / dpr;
      const h = this.canvas.height / dpr;

      this.ctx.clearRect(0, 0, w, h);

      this.ctx.save();
      this.ctx.translate(this.panX, this.panY);
      this.ctx.scale(this.scale, this.scale);

      // Render Links
      for (const link of this.links) {
        const s = link.sourceNode;
        const t = link.targetNode;

        this.ctx.beginPath();
        this.ctx.moveTo(s.x, s.y);
        this.ctx.lineTo(t.x, t.y);
        this.ctx.strokeStyle = link.color || "#38bdf830";
        this.ctx.lineWidth = link.type === "hierarchy" ? 1.5 : 1.0;
        if (link.type === "potential") {
          this.ctx.setLineDash([3, 3]);
        } else {
          this.ctx.setLineDash([]);
        }
        this.ctx.stroke();
        this.ctx.setLineDash([]);
      }

      // Render Nodes
      this.pulseTime += 0.04;
      for (const node of this.nodes) {
        const isHovered = this.hoveredNode === node;
        const isTarget = node.type === "target";

        // Glow effect
        if (node.glow || isHovered || isTarget) {
          const pulse = Math.sin(this.pulseTime) * 3;
          this.ctx.beginPath();
          this.ctx.arc(node.x, node.y, node.size + (isTarget ? 6 + pulse : 4), 0, Math.PI * 2);
          this.ctx.fillStyle = `${node.color}25`;
          this.ctx.fill();
        }

        // Main node circle
        this.ctx.beginPath();
        this.ctx.arc(node.x, node.y, node.size, 0, Math.PI * 2);
        this.ctx.fillStyle = node.color || "#38bdf8";
        this.ctx.fill();
        this.ctx.lineWidth = isHovered ? 2.5 : 1.5;
        this.ctx.strokeStyle = "#0f172a";
        this.ctx.stroke();

        // Inner core for target
        if (isTarget) {
          this.ctx.beginPath();
          this.ctx.arc(node.x, node.y, node.size * 0.45, 0, Math.PI * 2);
          this.ctx.fillStyle = "#ffffff";
          this.ctx.fill();
        }

        // Label
        this.ctx.fillStyle = isHovered ? "#38bdf8" : (isTarget ? "#f8fafc" : "#cbd5e1");
        this.ctx.font = isTarget ? "bold 13px Inter, monospace" : "11px Inter, sans-serif";
        this.ctx.textAlign = "center";
        this.ctx.fillText(node.label, node.x, node.y + node.size + 14);

        // Sublabel or status badge
        if (node.status && node.status !== "Unknown") {
          this.ctx.fillStyle = node.status === "Found" ? "#34d399" : "#94a3b8";
          this.ctx.font = "9px monospace";
          this.ctx.fillText(node.status.toUpperCase(), node.x, node.y + node.size + 24);
        }
      }

      // Tooltip on Hover
      if (this.hoveredNode) {
        const hn = this.hoveredNode;
        const tooltipX = hn.x;
        const tooltipY = hn.y - hn.size - 22;

        const tipText = hn.url ? `${hn.label}: ${hn.url}` : `${hn.category || hn.type}: ${hn.label}`;
        this.ctx.font = "10px monospace";
        const textWidth = this.ctx.measureText(tipText).width;

        this.ctx.fillStyle = "#0f172aee";
        this.ctx.strokeStyle = "#38bdf860";
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.roundRect(tooltipX - textWidth / 2 - 8, tooltipY - 14, textWidth + 16, 20, 4);
        this.ctx.fill();
        this.ctx.stroke();

        this.ctx.fillStyle = "#38bdf8";
        this.ctx.textAlign = "center";
        this.ctx.fillText(tipText, tooltipX, tooltipY);
      }

      this.ctx.restore();
    }

    animate() {
      this.updatePhysics();
      this.render();
      requestAnimationFrame(this.animate);
    }
  }

  // Export to window
  window.SynapseGraph = SynapseGraph;
})();
