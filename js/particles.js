// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Particle System
// Explosions, sparkles, screen shatter, character effects
// ============================================================

const ParticleSystem = {
  particles: [],
  screenShatter: null,

  init() {
    this.particles = [];
    this.screenShatter = null;
  },

  // --- PARTICLE TYPES ---

  addExplosion(x, y, radius, color = '#ff6600') {
    const count = Math.floor(radius / 3);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 2 + Math.random() * 3,
        h: 2 + Math.random() * 3,
        color: ['#ff4400', '#ff8800', '#ffcc00', '#ffffff'][Math.floor(Math.random() * 4)],
        life: 10 + Math.random() * 15,
        maxLife: 25,
        gravity: 0.05,
        type: 'explosion',
      });
    }
  },

  addSparks(x, y, count = 5) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        w: 1 + Math.random() * 2,
        h: 1 + Math.random() * 2,
        color: '#ffdd44',
        life: 6 + Math.random() * 8,
        maxLife: 14,
        gravity: 0.08,
        type: 'spark',
      });
    }
  },

  addBloodSplatter(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 3,
        vy: -Math.random() * 4 - 1,
        w: 1 + Math.random() * 2,
        h: 1 + Math.random() * 2,
        color: ['#cc0000', '#990000', '#ff2222'][Math.floor(Math.random() * 3)],
        life: 15 + Math.random() * 20,
        maxLife: 35,
        gravity: 0.1,
        type: 'blood',
        floorStick: true,
      });
    }
  },

  addDustPuff(x, y, count = 6) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + Math.random() * 4,
        vx: (Math.random() - 0.5) * 1,
        vy: -Math.random() * 2,
        w: 2 + Math.random() * 4,
        h: 2 + Math.random() * 3,
        color: 'rgba(180, 160, 140, 0.6)',
        life: 10 + Math.random() * 10,
        maxLife: 20,
        gravity: -0.02,
        type: 'dust',
      });
    }
  },

  addTeleportEffect(x, y, color = '#8800ff') {
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        w: 2, h: 2,
        color: color,
        life: 8 + Math.random() * 4,
        maxLife: 12,
        gravity: 0,
        type: 'teleport',
      });
    }
  },

  addFreezeEffect(x, y) {
    for (let i = 0; i < 10; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 1,
        w: 2 + Math.random() * 3,
        h: 2 + Math.random() * 3,
        color: '#88ccff',
        life: 15 + Math.random() * 10,
        maxLife: 25,
        gravity: 0.02,
        type: 'freeze',
      });
    }
  },

  addShadowCrows(x, y, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: -Math.random() * 3,
        w: 3, h: 3,
        color: '#440066',
        life: 12 + Math.random() * 8,
        maxLife: 20,
        gravity: -0.03,
        type: 'crow',
      });
    }
  },

  addHolyLight(x, y) {
    for (let i = 0; i < 15; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 2 - 0.5,
        w: 1 + Math.random() * 3,
        h: 1 + Math.random() * 3,
        color: '#ffdd88',
        life: 20 + Math.random() * 15,
        maxLife: 35,
        gravity: -0.01,
        type: 'holy',
      });
    }
  },

  addFireEffect(x, y) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 3 - 1,
        w: 2 + Math.random() * 4,
        h: 2 + Math.random() * 4,
        color: ['#ff4400', '#ff8800', '#ffcc00'][Math.floor(Math.random() * 3)],
        life: 10 + Math.random() * 10,
        maxLife: 20,
        gravity: -0.05,
        type: 'fire',
      });
    }
  },

  // Screen shatter effect (for KO)
  triggerScreenShatter() {
    const shards = [];
    const gridSize = 40;
    for (let x = 0; x < GAME.width; x += gridSize) {
      for (let y = 0; y < GAME.height; y += gridSize) {
        shards.push({
          x, y,
          w: gridSize + Math.random() * 10,
          h: gridSize + Math.random() * 10,
          vx: (Math.random() - 0.5) * 4,
          vy: -Math.random() * 3 - 1,
          rotation: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.1,
          life: 30 + Math.random() * 10,
          maxLife: 40,
        });
      }
    }
    this.screenShatter = { shards, life: 40, maxLife: 40 };
  },

  // --- UPDATE ---

  update() {
    // Regular particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.life--;

      // Floor stick for blood
      if (p.floorStick && p.y >= GAME.height - 60) {
        p.y = GAME.height - 60;
        p.vy = 0;
        p.vx *= 0.3;
        p.gravity = 0;
        p.life = Math.min(p.life, 5); // Fade quickly once on ground
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Screen shatter
    if (this.screenShatter) {
      const ss = this.screenShatter;
      ss.life--;
      for (const shard of ss.shards) {
        shard.x += shard.vx;
        shard.y += shard.vy;
        shard.vy += 0.1; // Gravity
        shard.rotation += shard.rotSpeed;
        shard.vx *= 0.98; // Air resistance
      }
      if (ss.life <= 0) {
        this.screenShatter = null;
      }
    }
  },

  // --- RENDER ---

  render(ctx) {
    // Regular particles
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;

      switch (p.type) {
        case 'explosion':
        case 'spark':
        case 'blood':
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;
        case 'dust':
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;
        case 'teleport':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.6;
          ctx.fillRect(Math.round(p.x - 1), Math.round(p.y - 1), 4, 4);
          break;
        case 'freeze':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.7;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
          break;
        case 'crow':
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 3);
          break;
        case 'holy':
          ctx.fillStyle = p.color;
          ctx.globalAlpha = alpha * 0.5;
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
        default:
          ctx.fillStyle = p.color;
          ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.round(p.w), Math.round(p.h));
      }
    }
    ctx.globalAlpha = 1;

    // Screen shatter
    if (this.screenShatter) {
      const ss = this.screenShatter;
      ctx.save();
      for (const shard of ss.shards) {
        const alpha = shard.life / shard.maxLife;
        ctx.globalAlpha = alpha * 0.7;
        ctx.save();
        ctx.translate(shard.x + shard.w / 2, shard.y + shard.h / 2);
        ctx.rotate(shard.rotation);
        ctx.fillStyle = '#334';
        ctx.fillRect(-shard.w / 2, -shard.h / 2, shard.w, shard.h);
        ctx.fillStyle = '#445';
        ctx.fillRect(-shard.w / 2 + 1, -shard.h / 2 + 1, shard.w - 2, shard.h - 2);
        ctx.restore();
      }
      ctx.restore();
    }
  },
};

const PS = ParticleSystem;
