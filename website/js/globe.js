// ==========================================================================
// ARGUS Landing // Interactive 3D Tactical Threat Globe (Quantum Obsidian)
// ==========================================================================

class LandingGlobe {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext("2d");
    
    this.rotationX = 0.2;
    this.rotationY = 0;
    this.isDragging = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    
    this.nodes = [
      { name: "Frankfurt [EU-C1]", lat: 50.11, lon: 8.68, status: "critical", attacks: 1420 },
      { name: "New York [US-E1]", lat: 40.71, lon: -74.00, status: "active", attacks: 980 },
      { name: "Tokyo [AP-N1]", lat: 35.67, lon: 139.65, status: "normal", attacks: 420 },
      { name: "London [UK-S1]", lat: 51.50, lon: -0.12, status: "active", attacks: 850 },
      { name: "Singapore [SG-1]", lat: 1.35, lon: 103.81, status: "critical", attacks: 1650 },
      { name: "Sydney [AU-E1]", lat: -33.86, lon: 151.20, status: "normal", attacks: 310 },
      { name: "Sao Paulo [SA-E1]", lat: -23.55, lon: -46.63, status: "active", attacks: 590 }
    ];

    this.arcs = [
      { from: 0, to: 1, progress: 0.1, speed: 0.007 },
      { from: 4, to: 0, progress: 0.4, speed: 0.009 },
      { from: 2, to: 4, progress: 0.7, speed: 0.008 },
      { from: 3, to: 6, progress: 0.2, speed: 0.006 }
    ];

    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.bindEvents();
    this.animate();
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width * window.devicePixelRatio;
    this.canvas.height = rect.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    this.width = rect.width;
    this.height = rect.height;
    this.radius = Math.min(this.width, this.height) * 0.38;
  }

  bindEvents() {
    this.canvas.addEventListener("mousedown", (e) => {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });

    window.addEventListener("mouseup", () => this.isDragging = false);

    window.addEventListener("mousemove", (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.rotationY += dx * 0.005;
      this.rotationX += dy * 0.005;
      this.rotationX = Math.max(-1.2, Math.min(1.2, this.rotationX));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    });
  }

  project(lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180) + this.rotationY;

    let x = -this.radius * Math.sin(phi) * Math.cos(theta);
    let z = this.radius * Math.sin(phi) * Math.sin(theta);
    let y = this.radius * Math.cos(phi);

    // Rotate around X axis
    const radX = this.rotationX;
    const y1 = y * Math.cos(radX) - z * Math.sin(radX);
    const z1 = y * Math.sin(radX) + z * Math.cos(radX);

    return {
      x: this.width / 2 + x,
      y: this.height / 2 - y1,
      z: z1,
      visible: z1 > 0
    };
  }

  draw() {
    this.ctx.clearRect(0, 0, this.width, this.height);
    const cx = this.width / 2;
    const cy = this.height / 2;

    // Atmospheric Glow
    const glow = this.ctx.createRadialGradient(cx, cy, this.radius * 0.8, cx, cy, this.radius * 1.25);
    glow.addColorStop(0, "rgba(0, 240, 255, 0.06)");
    glow.addColorStop(0.7, "rgba(0, 240, 255, 0.02)");
    glow.addColorStop(1, "rgba(0, 0, 0, 0)");
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, this.radius * 1.3, 0, Math.PI * 2);
    this.ctx.fill();

    // Wireframe Latitudes
    this.ctx.strokeStyle = "rgba(0, 240, 255, 0.07)";
    this.ctx.lineWidth = 1;
    for (let lat = -60; lat <= 60; lat += 30) {
      this.ctx.beginPath();
      let first = true;
      for (let lon = -180; lon <= 180; lon += 10) {
        const p = this.project(lat, lon);
        if (p.visible) {
          if (first) { this.ctx.moveTo(p.x, p.y); first = false; }
          else { this.ctx.lineTo(p.x, p.y); }
        } else {
          first = true;
        }
      }
      this.ctx.stroke();
    }

    // Wireframe Longitudes
    for (let lon = -180; lon < 180; lon += 30) {
      this.ctx.beginPath();
      let first = true;
      for (let lat = -90; lat <= 90; lat += 5) {
        const p = this.project(lat, lon);
        if (p.visible) {
          if (first) { this.ctx.moveTo(p.x, p.y); first = false; }
          else { this.ctx.lineTo(p.x, p.y); }
        } else {
          first = true;
        }
      }
      this.ctx.stroke();
    }

    // Kinetic Attack Arcs
    this.arcs.forEach(arc => {
      const fromNode = this.nodes[arc.from];
      const toNode = this.nodes[arc.to];
      const p1 = this.project(fromNode.lat, fromNode.lon);
      const p2 = this.project(toNode.lat, toNode.lon);

      if (p1.visible || p2.visible) {
        this.ctx.strokeStyle = "rgba(244, 63, 94, 0.35)";
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2 - 40;
        this.ctx.quadraticCurveTo(midX, midY, p2.x, p2.y);
        this.ctx.stroke();

        // Moving Missile / Packet Dot
        const t = arc.progress;
        const curX = (1 - t) * (1 - t) * p1.x + 2 * (1 - t) * t * midX + t * t * p2.x;
        const curY = (1 - t) * (1 - t) * p1.y + 2 * (1 - t) * t * midY + t * t * p2.y;

        this.ctx.fillStyle = "#00f0ff";
        this.ctx.shadowColor = "#00f0ff";
        this.ctx.shadowBlur = 10;
        this.ctx.beginPath();
        this.ctx.arc(curX, curY, 3, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        arc.progress += arc.speed;
        if (arc.progress > 1) arc.progress = 0;
      }
    });

    // Pinging Threat Nodes
    this.nodes.forEach((n, idx) => {
      const p = this.project(n.lat, n.lon);
      if (p.visible) {
        const color = n.status === "critical" ? "#f43f5e" : (n.status === "active" ? "#ff9f0a" : "#10b981");
        
        // Halo
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        const pulse = 4 + Math.sin(Date.now() * 0.005 + idx) * 3;
        this.ctx.arc(p.x, p.y, pulse, 0, Math.PI * 2);
        this.ctx.stroke();

        // Center dot
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Label
        this.ctx.fillStyle = "#cbd5e1";
        this.ctx.font = "10px JetBrains Mono";
        this.ctx.fillText(n.name, p.x + 8, p.y + 3);
      }
    });
  }

  animate() {
    if (!this.isDragging) {
      this.rotationY += 0.002;
    }
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new LandingGlobe("landing-globe-canvas");
});
