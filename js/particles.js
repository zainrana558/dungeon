// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Particle System
// Directional sparks, impact rings, blood decals, glass shatter
// Screen flash, ground cracks, speed lines, screen-shake debris
// ============================================================

const ParticleSystem = {
  particles: [],
  screenShatter: null,
  bloodDecals: [],     // Persistent blood on ground

  init() {
    this.particles = [];
    this.screenShatter = null;
    this.bloodDecals = [];
  },

  // ═══════════════════════════════════════════
  // EXISTING API (preserved & enhanced)
  // ═══════════════════════════════════════════

  // --- Explosion: radial burst ---
  addExplosion(x, y, radius, color = '#ff6600') {
    const count = Math.floor(radius / 2.5);
    const colors = ['#ff4400', '#ff8800', '#ffcc00', '#ffaa44', '#ffffff'];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 2 + Math.random() * 4,
        h: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 12 + Math.random() * 14,
        maxLife: 26,
        gravity: 0.06,
        type: 'explosion',
      });
    }
    // Core flash particles (slower, larger)
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 0.5,
        vy: Math.sin(angle) * 0.5,
        w: 6 + Math.random() * 6,
        h: 6 + Math.random() * 6,
        color: '#ffffff',
        life: 6 + Math.random() * 5,
        maxLife: 11,
        gravity: 0,
        type: 'explosion_flash',
      });
    }
  },

  // --- Directional hit sparks (fly in hit direction) ---
  // angle: direction of hit in radians (0 = right)
  // spread: cone spread in radians (default 0.8)
  addSparks(x, y, count = 8, angle = null, spread = 1.0) {
    // If no angle given, pick random (backward-compatible)
    for (let i = 0; i < count; i++) {
      const a = angle !== null
        ? angle + (Math.random() - 0.5) * spread
        : Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 5;
      this.particles.push({
        x, y,
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - Math.random() * 1.5,
        w: 1 + Math.random() * 2,
        h: 1 + Math.random() * 2,
        color: ['#ffdd44', '#ffff88', '#ffcc22', '#ffffff'][Math.floor(Math.random() * 4)],
        life: 8 + Math.random() * 10,
        maxLife: 18,
        gravity: 0.1,
        type: 'spark',
        trail: true,
        trailPositions: [],
      });
    }
  },

  // --- Blood splatter → stays on ground as decals ---
  addBloodSplatter(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      // Airborne blood droplets
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y + (Math.random() - 0.5) * 8,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5 - 1,
        w: 1 + Math.random() * 3,
        h: 1 + Math.random() * 2,
        color: ['#cc0000', '#990000', '#ff2222', '#aa0000'][Math.floor(Math.random() * 4)],
        life: 12 + Math.random() * 15,
        maxLife: 27,
        gravity: 0.12,
        type: 'blood',
        floorStick: true,
      });
    }
    // Ground decals (persistent, fade over ~5 seconds)
    const groundY = GAME.height - 65;
    for (let i = 0; i < 3 + Math.floor(count / 3); i++) {
      this.bloodDecals.push({
        x: x + (Math.random() - 0.5) * 20 + (Math.random() - 0.5) * 8,
        y: groundY + Math.random() * 10,
        w: 2 + Math.random() * 6,
        h: 1 + Math.random() * 3,
        life: 250 + Math.random() * 50,  // ~5 seconds at 60fps
        maxLife: 300,
        color: ['#880000', '#aa1111', '#771111'][Math.floor(Math.random() * 3)],
      });
    }
  },

  // --- Dust puff ---
  addDustPuff(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + Math.random() * 4,
        vx: (Math.random() - 0.5) * 1.5,
        vy: -Math.random() * 2.5,
        w: 3 + Math.random() * 5,
        h: 2 + Math.random() * 4,
        color: ['rgba(180,160,140,0.6)', 'rgba(200,180,160,0.5)', 'rgba(160,140,120,0.7)'][Math.floor(Math.random() * 3)],
        life: 12 + Math.random() * 12,
        maxLife: 24,
        gravity: -0.03,
        type: 'dust',
      });
    }
  },

  // --- Teleport effect ---
  addTeleportEffect(x, y, color = '#8800ff') {
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 2, h: 2,
        color: color,
        life: 10 + Math.random() * 6,
        maxLife: 16,
        gravity: -0.01,
        type: 'teleport',
      });
    }
    // Center flash
    this.particles.push({
      x, y, vx: 0, vy: 0, w: 12, h: 12,
      color: '#ffffff',
      life: 6, maxLife: 6, gravity: 0,
      type: 'teleport_flash',
    });
  },

  // --- Freeze crystals ---
  addFreezeEffect(x, y) {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 22;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -Math.random() * 1.2,
        w: 2 + Math.random() * 4,
        h: 2 + Math.random() * 4,
        color: ['#88ccff', '#aaddff', '#ffffff', '#66aadd'][Math.floor(Math.random() * 4)],
        life: 18 + Math.random() * 12,
        maxLife: 30,
        gravity: 0.02,
        type: 'freeze',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.03,
      });
    }
  },

  // --- Shadow crows ---
  addShadowCrows(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2.5;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: -Math.random() * 4 - 1,
        w: 3, h: 3,
        color: '#440066',
        life: 14 + Math.random() * 10,
        maxLife: 24,
        gravity: -0.04,
        type: 'crow',
      });
    }
  },

  // --- Holy light rays ---
  addHolyLight(x, y) {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * Math.PI * 2;
      const dist = Math.random() * 35;
      this.particles.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist - Math.random() * 10,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -Math.random() * 2 - 0.5,
        w: 1 + Math.random() * 3,
        h: 1 + Math.random() * 3,
        color: '#ffdd88',
        life: 22 + Math.random() * 16,
        maxLife: 38,
        gravity: -0.02,
        type: 'holy',
      });
    }
  },

  // --- Fire rising ---
  addFireEffect(x, y) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 12,
        y: y,
        vx: (Math.random() - 0.5) * 0.7,
        vy: -Math.random() * 3.5 - 1.5,
        w: 3 + Math.random() * 5,
        h: 3 + Math.random() * 5,
        color: ['#ff4400', '#ff8800', '#ffcc00', '#ff6622'][Math.floor(Math.random() * 4)],
        life: 12 + Math.random() * 12,
        maxLife: 24,
        gravity: -0.06,
        type: 'fire',
      });
    }
  },

  // ═══════════════════════════════════════════
  // NEW EFFECTS
  // ═══════════════════════════════════════════

  // --- Full-screen color flash overlay ---
  addScreenFlash(color, duration) {
    this.particles.push({
      x: 0, y: 0,
      vx: 0, vy: 0,
      w: GAME.width, h: GAME.height,
      color: color,
      life: duration,
      maxLife: duration,
      gravity: 0,
      type: 'screen_flash',
    });
  },

  // --- Expanding impact ring (big hit shockwave) ---
  addImpactRing(x, y, maxRadius, color = '#ffffff') {
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      radius: 4,
      maxRadius: maxRadius || 60,
      innerRadius: 0,
      color: color,
      life: 14,
      maxLife: 14,
      gravity: 0,
      type: 'impact_ring',
    });
    // Secondary ring (slightly delayed visual)
    this.particles.push({
      x, y,
      vx: 0, vy: 0,
      radius: 2,
      maxRadius: (maxRadius || 60) * 0.5,
      innerRadius: 0,
      color: 'rgba(255, 255, 255, 0.5)',
      life: 10,
      maxLife: 10,
      gravity: 0,
      type: 'impact_ring',
    });
  },

  // --- Ground crack lines (heavy impact) ---
  addGroundCrack(x, y) {
    const groundY = GAME.height - 65;
    const count = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < count; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI;  // mostly downward
      const length = 20 + Math.random() * 40;
      const points = [];
      let cx = 0, cy = 0;
      const segments = 4 + Math.floor(Math.random() * 5);
      for (let s = 0; s < segments; s++) {
        const t = s / segments;
        cx += (Math.random() - 0.45) * 8;
        cy += length / segments;
        points.push({ x: cx, y: cy });
      }
      this.particles.push({
        x, y: groundY,
        vx: 0, vy: 0,
        points: points,
        color: '#1a1008',
        life: 80 + Math.random() * 60,
        maxLife: 140,
        gravity: 0,
        type: 'ground_crack',
      });
    }
    // Crack dust
    this.addDustPuff(x, groundY, 5);
  },

  // --- Anime-style speed lines (during dash) ---
  // direction: angle in radians the character is moving
  addSpeedLines(direction, count = 8) {
    for (let i = 0; i < count; i++) {
      const offsetAngle = direction + Math.PI; // opposite of movement
      const perpOffset = (Math.random() - 0.5) * GAME.height * 1.5;
      const startX = GAME.width / 2 + Math.cos(offsetAngle) * 500 + Math.cos(direction + Math.PI / 2) * perpOffset;
      const startY = GAME.height / 2 + Math.sin(offsetAngle) * 500 + Math.sin(direction + Math.PI / 2) * perpOffset;
      const length = 30 + Math.random() * 70;

      this.particles.push({
        x: startX,
        y: startY,
        vx: Math.cos(direction) * (4 + Math.random() * 6),
        vy: Math.sin(direction) * (4 + Math.random() * 6),
        w: 1 + Math.random() * 1.5,
        h: length,
        angle: direction,
        color: 'rgba(255, 255, 255, 0.5)',
        life: 6 + Math.random() * 8,
        maxLife: 14,
        gravity: 0,
        type: 'speed_line',
      });
    }
  },

  // --- Screen-shake debris (falls from top) ---
  addShakeDebris(count = 15) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * GAME.width,
        y: -Math.random() * 40,
        vx: (Math.random() - 0.5) * 2,
        vy: 2 + Math.random() * 4,
        w: 1 + Math.random() * 4,
        h: 1 + Math.random() * 3,
        color: ['#555', '#444', '#666', '#3a3028'][Math.floor(Math.random() * 4)],
        life: 30 + Math.random() * 30,
        maxLife: 60,
        gravity: 0.15,
        type: 'debris',
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.1,
      });
    }
  },

  // ═══════════════════════════════════════════
  // SCREEN SHATTER (KO) — real glass shard polygons
  // ═══════════════════════════════════════════

  triggerScreenShatter() {
    // Create triangular glass shards across the screen
    const shards = [];
    const grid = 36;
    for (let gx = 0; gx < GAME.width; gx += grid) {
      for (let gy = 0; gy < GAME.height; gy += grid) {
        const cx = gx + grid / 2 + (Math.random() - 0.5) * grid * 0.3;
        const cy = gy + grid / 2 + (Math.random() - 0.5) * grid * 0.3;
        const size = grid * (0.6 + Math.random() * 0.6);

        // Generate a triangular shard
        const angle = Math.random() * Math.PI * 2;
        const points = [];
        for (let v = 0; v < 3; v++) {
          const va = angle + (v / 3) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
          const vd = size * (0.5 + Math.random() * 0.5);
          points.push({
            x: Math.cos(va) * vd,
            y: Math.sin(va) * vd,
          });
        }

        shards.push({
          cx, cy,
          points,
          vx: (Math.random() - 0.5) * 5,
          vy: -Math.random() * 4 - 1,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.12,
          color: ['#334455', '#445566', '#556677', '#3a4a5a', '#4a5a6a'][Math.floor(Math.random() * 5)],
          innerColor: ['#556677', '#667788', '#778899'][Math.floor(Math.random() * 3)],
          life: 35 + Math.random() * 15,
          maxLife: 50,
        });
      }
    }
    this.screenShatter = { shards, life: 50, maxLife: 50 };
  },

  // ═══════════════════════════════════════════
  // UPDATE
  // ═══════════════════════════════════════════

  update() {
    // --- Regular particles ---
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      // Skip screen_flash — it just sits there
      if (p.type === 'screen_flash') {
        p.life--;
        if (p.life <= 0) this.particles.splice(i, 1);
        continue;
      }

      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;

      // Trail tracking for sparks
      if (p.trail) {
        if (!p.trailPositions) p.trailPositions = [];
        p.trailPositions.push({ x: p.x, y: p.y });
        if (p.trailPositions.length > 3) p.trailPositions.shift();
      }

      // Impact ring expansion
      if (p.type === 'impact_ring') {
        const progress = 1 - (p.life / p.maxLife);
        p.radius = 4 + (p.maxRadius - 4) * progress;
        p.innerRadius = Math.max(0, p.radius - 6);
      }

      // Speed line movement
      if (p.type === 'speed_line') {
        p.vx *= 0.92;
        p.vy *= 0.92;
      }

      // Rotation for certain types
      if (p.rotSpeed) {
        p.rotation = (p.rotation || 0) + (p.rotSpeed || 0);
      }

      // Floor stick for blood
      if (p.floorStick && p.y >= GAME.height - 60) {
        p.y = GAME.height - 60;
        p.vy = 0;
        p.vx *= 0.25;
        p.gravity = 0;
        p.life = Math.min(p.life, 8);
      }

      // Ground crack stays put
      if (p.type === 'ground_crack') {
        p.vx = 0; p.vy = 0;
      }

      // Remove dead particles
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // --- Blood decals (ground, persistent) ---
    for (let i = this.bloodDecals.length - 1; i >= 0; i--) {
      this.bloodDecals[i].life--;
      if (this.bloodDecals[i].life <= 0) {
        this.bloodDecals.splice(i, 1);
      }
    }

    // --- Screen shatter ---
    if (this.screenShatter) {
      const ss = this.screenShatter;
      ss.life--;
      for (const shard of ss.shards) {
        shard.cx += shard.vx;
        shard.cy += shard.vy;
        shard.vy += 0.12;
        shard.vx *= 0.97;
        shard.rotation += shard.rotSpeed;
        shard.life--;
      }
      ss.shards = ss.shards.filter(s => s.life > 0);
      if (ss.life <= 0 || ss.shards.length === 0) {
        this.screenShatter = null;
      }
    }
  },

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════

  render(ctx) {
    // --- Screen flash (rendered as full-screen overlay) ---
    for (const p of this.particles) {
      if (p.type !== 'screen_flash') continue;
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, GAME.width, GAME.height);
      ctx.globalAlpha = 1;
    }

    // --- Blood decals (on ground, behind other particles) ---
    for (const d of this.bloodDecals) {
      const alpha = d.life / d.maxLife;
      ctx.fillStyle = d.color;
      ctx.globalAlpha = alpha;
      ctx.fillRect(Math.round(d.x), Math.round(d.y), Math.round(d.w), Math.round(d.h));
    }
    ctx.globalAlpha = 1;

    // --- Ground cracks ---
    for (const p of this.particles) {
      if (p.type !== 'ground_crack') continue;
      const alpha = p.life / p.maxLife;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 1.5;
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      for (let s = 0; s < p.points.length; s++) {
        ctx.lineTo(p.x + p.points[s].x, p.y + p.points[s].y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // --- Impact rings ---
    for (const p of this.particles) {
      if (p.type !== 'impact_ring') continue;
      const alpha = p.life / p.maxLife;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = alpha * 0.8;

      // Outer ring
      ctx.beginPath();
      ctx.arc(Math.round(p.x), Math.round(p.y), p.radius, 0, Math.PI * 2);
      ctx.stroke();

      // Inner glow ring
      if (p.innerRadius > 0) {
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(Math.round(p.x), Math.round(p.y), Math.max(1, p.innerRadius), 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // --- Speed lines ---
    for (const p of this.particles) {
      if (p.type !== 'speed_line') continue;
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.translate(Math.round(p.x), Math.round(p.y));
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      // Core bright line
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(-0.5, -p.h / 2, 1, p.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // --- Regular particles ---
    for (const p of this.particles) {
      const alpha = Math.min(1, p.life / p.maxLife);

      switch (p.type) {
        case 'screen_flash':
        case 'impact_ring':
        case 'ground_crack':
        case 'speed_line':
          continue; // Handled above

        case 'explosion':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;

        case 'explosion_flash':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillRect(Math.round(p.x - p.w / 2), Math.round(p.y - p.h / 2), Math.round(p.w), Math.round(p.h));
          break;

        case 'spark':
          // Trail rendering
          if (p.trailPositions && p.trailPositions.length > 1) {
            ctx.globalAlpha = alpha * 0.3;
            for (let t = 0; t < p.trailPositions.length - 1; t++) {
              const tp = p.trailPositions[t];
              ctx.fillStyle = p.color;
              ctx.fillRect(Math.round(tp.x), Math.round(tp.y), p.w, p.h);
            }
          }
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.9;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;

        case 'blood':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;

        case 'dust':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;

        case 'teleport':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 4, 4);
          break;

        case 'teleport_flash':
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.4;
          ctx.fillRect(Math.round(p.x - p.w / 2), Math.round(p.y - p.h / 2), p.w, p.h);
          break;

        case 'freeze':
          ctx.save();
          ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h / 2));
          ctx.rotate(p.rotation || 0);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
          break;

        case 'crow':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 3);
          break;

        case 'holy':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.55;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          ctx.fillStyle = '#ffffff';
          ctx.globalAlpha = alpha * 0.3;
          ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), Math.round(p.w + 2), Math.round(p.h + 2));
          break;

        case 'fire':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.8;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;

        case 'debris':
          ctx.save();
          ctx.translate(Math.round(p.x + p.w / 2), Math.round(p.y + p.h / 2));
          ctx.rotate(p.rotation || 0);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
          ctx.restore();
          break;

        default:
          ctx.fillStyle = p.color || '#ffffff';
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
      }
    }
    ctx.globalAlpha = 1;

    // --- Screen shatter (glass shard polygons) ---
    if (this.screenShatter) {
      const ss = this.screenShatter;
      for (const shard of ss.shards) {
        const alpha = shard.life / shard.maxLife;
        ctx.save();
        ctx.translate(Math.round(shard.cx), Math.round(shard.cy));
        ctx.rotate(shard.rotation);

        // Draw triangular shard
        if (shard.points.length >= 3) {
          ctx.beginPath();
          ctx.moveTo(shard.points[0].x, shard.points[0].y);
          for (let v = 1; v < shard.points.length; v++) {
            ctx.lineTo(shard.points[v].x, shard.points[v].y);
          }
          ctx.closePath();

          // Outer fill
          ctx.fillStyle = shard.color;
          ctx.globalAlpha = alpha * 0.8;
          ctx.fill();

          // Inner highlight (simulates glass reflection)
          const cx = shard.points.reduce((s, p) => s + p.x, 0) / shard.points.length;
          const cy = shard.points.reduce((s, p) => s + p.y, 0) / shard.points.length;
          ctx.fillStyle = shard.innerColor;
          ctx.globalAlpha = alpha * 0.5;
          ctx.fillRect(cx - 2, cy - 2, 4, 5);

          // Edge stroke
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 0.5;
          ctx.globalAlpha = alpha * 0.5;
          ctx.stroke();
        }

        ctx.restore();
      }
      ctx.globalAlpha = 1;
    }
  },
};

const PS = ParticleSystem;
