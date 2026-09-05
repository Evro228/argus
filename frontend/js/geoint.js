// Interactive 3D Tactical Globe (Inspired by God's Eye View)
class TacticalGlobe {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = this.width * window.devicePixelRatio;
    this.canvas.height = this.height * window.devicePixelRatio;
    this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    this.radius = Math.min(this.width, this.height) * 0.38;
    this.rotation = { x: 0.3, y: 0 };
    this.targetRotation = { x: 0.3, y: 0 };
    this.isDragging = false;
    this.lastMouse = { x: 0, y: 0 };
    this.zoom = 1.0;

    // Tactical Layers Data
    this.layers = {
      satellites: true,
      flights: true,
      ships: true,
      fires: true
    };

    this.initEntities();
    this.bindEvents();
    this.animate();
  }

  initEntities() {
    this.entities = [];
    
    // Satellites (Orbiting Earth)
    const satNames = ["ISS (ZARYA)", "STARLINK-30129", "NOAA-20", "SENTINEL-2B", "COSMOS-2550", "USA-326"];
    for (let i = 0; i < satNames.length; i++) {
      this.entities.push({
        type: 'satellite',
        name: satNames[i],
        lat: (Math.random() - 0.5) * 140,
        lon: (Math.random() - 0.5) * 360,
        altitude: 1.15 + (i * 0.05),
        speed: 0.002 + (i * 0.001),
        color: '#38bdf8'
      });
    }

    // Flights (Civil & Transport)
    const flights = ["AFR124 (A350)", "UAE16 (B777)", "DLH400 (B748)", "THY05 (A330)", "UAL959 (B789)"];
    for (let f of flights) {
      this.entities.push({
        type: 'flight',
        name: f,
        lat: (Math.random() - 0.5) * 110,
        lon: (Math.random() - 0.5) * 360,
        altitude: 1.03,
        speed: 0.0008,
        color: '#eab308'
      });
    }

    // Maritime Vessels
    const ships = ["EVER GIVEN", "CMA CGM ANTOINE", "MAERSK MC-KINNEY", "MSC IRIS"];
    for (let s of ships) {
      this.entities.push({
        type: 'ship',
        name: s,
        lat: (Math.random() - 0.5) * 70,
        lon: (Math.random() - 0.5) * 300,
        altitude: 1.0,
        speed: 0.0003,
        color: '#10b981'
      });
    }

    // FIRMS Fire thermal spots
    for (let i = 0; i < 5; i++) {
      this.entities.push({
        type: 'fire',
        name: `NASA FIRMS Hotspot #${1024 + i}`,
        lat: -10 + (Math.random() * 40),
        lon: -60 + (Math.random() * 120),
        altitude: 1.0,
        color: '#ef4444'
      });
    }
  }

  bindEvents() {
    this.canvas.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.lastMouse.x;
      const dy = e.clientY - this.lastMouse.y;
      this.rotation.y += dx * 0.005;
      this.rotation.x = Math.max(-1.4, Math.min(1.4, this.rotation.x + dy * 0.005));
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    // Resize
    window.addEventListener('resize', () => {
      this.width = this.canvas.clientWidth;
      this.height = this.canvas.clientHeight;
      this.canvas.width = this.width * window.devicePixelRatio;
      this.canvas.height = this.height * window.devicePixelRatio;
      this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      this.radius = Math.min(this.width, this.height) * 0.38;
    });
  }

  project(lat, lon, alt = 1.0) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180) + this.rotation.y;

    const r = this.radius * alt * this.zoom;
    let x = r * Math.sin(phi) * Math.cos(theta);
    let y = r * Math.cos(phi);
    let z = r * Math.sin(phi) * Math.sin(theta);

    // Rotate around X axis
    const cosX = Math.cos(this.rotation.x);
    const sinX = Math.sin(this.rotation.x);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;

    const centerX = this.width / 2;
    const centerY = this.height / 2;

    return {
      x: centerX + x,
      y: centerY - y1,
      z: z1,
      visible: z1 > -this.radius * 0.2
    };
  }

  drawGlobe() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    const r = this.radius * this.zoom;

    // Atmospheric Glow
    const glow = this.ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.3);
    glow.addColorStop(0, 'rgba(14, 165, 233, 0.25)');
    glow.addColorStop(0.5, 'rgba(56, 189, 248, 0.08)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    this.ctx.fillStyle = glow;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
    this.ctx.fill();

    // Dark Earth Body
    const earthGrad = this.ctx.createRadialGradient(cx - r*0.3, cy - r*0.3, 5, cx, cy, r);
    earthGrad.addColorStop(0, '#0f172a');
    earthGrad.addColorStop(0.7, '#070d19');
    earthGrad.addColorStop(1, '#020617');
    this.ctx.fillStyle = earthGrad;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.fill();

    // Parallels (Latitudes)
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
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

    // Meridians (Longitudes)
    for (let lon = -180; lon < 180; lon += 45) {
      this.ctx.beginPath();
      let first = true;
      for (let lat = -80; lat <= 80; lat += 5) {
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

    // Rim ring
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, r, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  drawEntities() {
    for (let e of this.entities) {
      // Advance coordinates slightly
      if (e.speed) {
        e.lon += e.speed * 20;
        if (e.lon > 180) e.lon -= 360;
      }

      if (!this.layers[e.type + 's']) continue;

      const p = this.project(e.lat, e.lon, e.altitude || 1.0);
      if (!p.visible) continue;

      // Draw Marker
      this.ctx.save();
      this.ctx.fillStyle = e.color;
      this.ctx.shadowColor = e.color;
      this.ctx.shadowBlur = 8;

      if (e.type === 'satellite') {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        this.ctx.fill();

        // Orbit trail ring
        this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
        this.ctx.lineWidth = 1;
        this.ctx.beginPath();
        this.ctx.arc(this.width/2, this.height/2, this.radius * e.altitude, 0, Math.PI * 2);
        this.ctx.stroke();
      } else if (e.type === 'flight') {
        this.ctx.beginPath();
        this.ctx.moveTo(p.x, p.y - 4);
        this.ctx.lineTo(p.x + 3, p.y + 4);
        this.ctx.lineTo(p.x - 3, p.y + 4);
        this.ctx.closePath();
        this.ctx.fill();
      } else if (e.type === 'ship') {
        this.ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
      } else if (e.type === 'fire') {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Label
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      this.ctx.font = '9px JetBrains Mono, monospace';
      this.ctx.fillText(e.name, p.x + 6, p.y + 3);

      this.ctx.restore();
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Auto-rotate if not dragging
    if (!this.isDragging) {
      this.rotation.y += 0.001;
    }

    this.drawGlobe();
    this.drawEntities();

    requestAnimationFrame(() => this.animate());
  }

  toggleLayer(layerName) {
    if (this.layers.hasOwnProperty(layerName)) {
      this.layers[layerName] = !this.layers[layerName];
    }
  }
}

window.TacticalGlobe = TacticalGlobe;
