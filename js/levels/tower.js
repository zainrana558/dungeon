// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Tower System
// Floor progression, dynamic difficulty, rest floors, enemy spawning
// ============================================================

const TowerSystem = {
  currentFloor: 1,
  floorType: null,
  waveNumber: 0,
  wavesPerFloor: 3,
  enemiesRemainingInWave: 0,
  waveTimer: 0,
  betweenWaves: false,

  // Dynamic difficulty
  playerPerformance: 0, // -100 to 100 (negative = struggling, positive = dominating)
  hitsTaken: 0,
  perfectFloors: 0,
  consecutiveDeaths: 0,

  // Rest floor state
  atBonfire: false,
  bonfireUsed: false,

  init() {
    this.currentFloor = 1;
    this.waveNumber = 0;
    this.playerPerformance = 0;
    this.hitsTaken = 0;
    this.perfectFloors = 0;
    this.consecutiveDeaths = 0;
  },

  loadFloor(floorNum) {
    this.currentFloor = floorNum;
    this.waveNumber = 0;
    this.hitsTaken = 0;
    this.atBonfire = false;
    this.bonfireUsed = false;

    // Determine floor type
    if (floorNum % 5 === 0) {
      this.floorType = 'boss';
    } else if (floorNum % 10 === 0) {
      this.floorType = 'bonfire';
    } else if (floorNum <= 4) {
      this.floorType = 'horde';
    } else if (floorNum <= 9 || floorNum === 10) {
      this.floorType = 'brute';
    } else if (floorNum <= 14 || floorNum === 15) {
      this.floorType = 'plague';
    } else if (floorNum <= 19 || floorNum === 20) {
      this.floorType = 'feral';
    } else {
      this.floorType = 'void';
    }

    GAME.enemies = [];
    GAME.boss = null;

    // Switch ambient audio for new floor type
    SFX.stopAmbient();
    SFX.playAmbient(this.floorType);

    // Rest floor
    if (this.floorType === 'bonfire') {
      this.atBonfire = true;
      GAME.state = 'BONFIRE';
      return;
    }

    // Boss floor
    if (this.floorType === 'boss') {
      this.spawnBoss(floorNum);
      return;
    }

    // Normal floor: spawn first wave
    this.spawnWave();
  },

  spawnWave() {
    this.waveNumber++;
    const count = 2 + this.waveNumber;

    // Apply dynamic difficulty
    const scaling = this.getScaling();

    // Spawn enemies based on floor type
    let EnemyClass;
    switch (this.floorType) {
      case 'horde':
        EnemyClass = Goblin;
        GAME.enemies.push(new Goblin({ x: 200 + Math.random() * 300 }));
        for (let i = 0; i < count; i++) {
          GAME.enemies.push(new Goblin({
            x: 150 + Math.random() * 600,
            y: GAME.height - 140,
            maxHP: Math.floor(15 * scaling),
            damage: Math.floor(4 * scaling),
          }));
        }
        break;
      case 'brute':
        EnemyClass = Orc;
        GAME.enemies.push(new Orc({ x: 300 + Math.random() * 200 }));
        for (let i = 0; i < count - 1; i++) {
          GAME.enemies.push(new Orc({
            x: 150 + Math.random() * 600,
            maxHP: Math.floor(50 * scaling),
            damage: Math.floor(12 * scaling),
          }));
        }
        break;
      case 'plague':
        for (let i = 0; i < count + 1; i++) {
          GAME.enemies.push(new Skeleton({
            x: 150 + Math.random() * 600,
            maxHP: Math.floor(20 * scaling),
            damage: Math.floor(7 * scaling),
          }));
        }
        break;
      case 'feral':
        for (let i = 0; i < count; i++) {
          GAME.enemies.push(new Wyvern({
            x: 100 + Math.random() * 700,
            y: 60 + Math.random() * 100,
            maxHP: Math.floor(35 * scaling),
            damage: Math.floor(10 * scaling),
          }));
        }
        break;
      case 'void':
        for (let i = 0; i < count; i++) {
          GAME.enemies.push(new VoidSpawn({
            x: 150 + Math.random() * 600,
            maxHP: Math.floor(25 * scaling),
            damage: Math.floor(14 * scaling),
          }));
        }
        break;
    }

    this.enemiesRemainingInWave = count;
  },

  spawnBoss(floorNum) {
    GAME.enemies = [];
    const scaling = this.getScaling();

    // Tower rubber band: if player dominated floors 1-4, double boss HP
    const veteranMode = this.perfectFloors > 2;

    switch (floorNum) {
      case 5:
        GAME.boss = new GoblinKing({
          x: GAME.width / 2 - 20,
          maxHP: veteranMode ? 360 : 180 * scaling,
          damage: Math.floor(8 * scaling),
        });
        break;
      case 10:
        GAME.boss = new OrcWarlord({
          x: GAME.width / 2 - 28,
          maxHP: veteranMode ? 560 : 280 * scaling,
          damage: Math.floor(18 * scaling),
        });
        break;
      case 15:
        GAME.boss = new UndeadLich({
          x: GAME.width / 2 - 17,
          maxHP: veteranMode ? 440 : 220 * scaling,
          damage: Math.floor(16 * scaling),
        });
        break;
      case 20:
        GAME.boss = new ElderDragon({
          x: GAME.width / 2 - 48,
          maxHP: veteranMode ? 800 : 400 * scaling,
          damage: Math.floor(20 * scaling),
        });
        break;
      case 25:
        GAME.boss = new Archdemon({
          x: GAME.width / 2 - 24,
          maxHP: veteranMode ? 1000 : 500 * scaling,
          damage: Math.floor(18 * scaling),
        });
        SFX.playBossMusic();
        break;
    }
  },

  getScaling() {
    // Base scaling based on floor
    const baseScale = 1 + (this.currentFloor - 1) * 0.05;

    // Dynamic difficulty adjustments
    let ddScale = 1.0;

    if (this.playerPerformance > 60) {
      // Player dominating: make it harder
      ddScale = 1.0 + this.playerPerformance / 200;
      GAME._towerScalingActive = true;
    } else if (this.playerPerformance < -30) {
      // Player struggling: ease up (subtle teacher mode - design doc)
      ddScale = Math.max(0.9, 1.0 - (Math.abs(this.playerPerformance) / 200));
      GAME._towerScalingActive = false;
    } else {
      GAME._towerScalingActive = false;
    }

    return baseScale * ddScale;
  },

  checkNextWave() {
    if (this.waveNumber >= this.wavesPerFloor) {
      // Floor cleared
      this.advanceFloor();
    } else {
      // Small delay between waves
      if (!this.betweenWaves) {
        this.betweenWaves = true;
        this.waveTimer = 60; // 1 second pause
      }
    }
  },

  advanceFloor() {
    // Calculate performance
    if (this.hitsTaken === 0) {
      this.perfectFloors++;
      this.playerPerformance += 20;
    }

    // Soul shard reward
    GAME.soulShards += Math.max(1, 5 - this.waveNumber);

    this.currentFloor++;
    if (this.currentFloor > 25) {
      GAME.state = 'VICTORY';
      ScreenSystem.initVictory();
      SFX.stopBossMusic();
      return;
    }

    this.loadFloor(this.currentFloor);
  },

  // Called when player takes damage on a floor
  recordHit() {
    this.hitsTaken++;
    this.playerPerformance -= 5;
    this.playerPerformance = Math.max(-100, Math.min(100, this.playerPerformance));
  },

  // Called when player dies
  recordDeath() {
    this.consecutiveDeaths++;
    this.playerPerformance = Math.max(-100, this.playerPerformance - 30);

    // Tower subtly weakens enemies after repeated deaths (design doc: 5% less)
    if (this.consecutiveDeaths >= 2) {
      this.playerPerformance = -50;
    }
  },

  // Rest floor: spend soul shards
  upgradeStat(stat) {
    if (!this.atBonfire || this.bonfireUsed) return false;
    if (GAME.soulShards < 1) return false;

    GAME.soulShards--;
    this.bonfireUsed = true;

    const player = GAME.player;
    switch (stat) {
      case 'health':
        player.maxHP += 5;
        player.hp = Math.min(player.hp + 5, player.maxHP);
        break;
      case 'damage':
        player.baseDamage += 2;
        break;
      case 'speed':
        player.walkSpeed += 0.2;
        break;
    }

    return true;
  },

  continueFromBonfire() {
    this.bonfireUsed = false;
    this.atBonfire = false;
    GAME.state = 'PLAYING';
    this.loadFloor(this.currentFloor + 1);
  },

  update() {
    // Wave timer
    if (this.betweenWaves) {
      this.waveTimer--;
      if (this.waveTimer <= 0) {
        this.betweenWaves = false;
        this.spawnWave();
      }
    }
  },

  // Parallax camera offset — moves slower than foreground
  _parallaxX: 0,
  _parallaxY: 0,

  renderFloor(ctx) {
    if (GAME.state === 'BONFIRE') {
      FloorRenderer.render(ctx, 'bonfire', this.currentFloor);
      this.renderBonfire(ctx);
      return;
    }

    // Update parallax based on player position (distant layers lag behind)
    if (GAME.player) {
      const camX = GAME.player.x - GAME.width / 2;
      this._parallaxX += (camX * 0.15 - this._parallaxX) * 0.05;
      this._parallaxY += ((GAME.player.y - GAME.height / 2) * 0.08 - this._parallaxY) * 0.05;
    }

    // --- PARALLAX BACKGROUND LAYER (far) ---
    ctx.save();
    ctx.translate(-this._parallaxX * 0.3, -this._parallaxY * 0.2);
    this._renderParallaxSky(ctx);
    ctx.restore();

    // --- MIDGROUND — floor-specific atmosphere ---
    ctx.save();
    ctx.translate(-this._parallaxX * 0.6, -this._parallaxY * 0.4);
    this._renderAtmosphericFog(ctx);
    ctx.restore();

    // --- FOREGROUND — enhanced tiled floor via FloorRenderer ---
    FloorRenderer.render(ctx, this.floorType, this.currentFloor);

    // --- FLOOR NUMBER with subtle glow ---
    this._renderFloorHUD(ctx);
  },

  // Distant sky/ambient backdrop with parallax
  _renderParallaxSky(ctx) {
    const tier = Math.ceil(this.currentFloor / 5);
    // Tier colours shift deeper as we ascend
    const skyColors = [
      '#0a0a12', // 1-5: dark cave
      '#121018', // 6-10: colosseum deep
      '#0a0e14', // 11-15: library gloom
      '#140804', // 16-20: volcanic red-black
      '#020412', // 21-25: void / celestial
    ];
    const skyColor = skyColors[Math.min(tier - 1, 4)];

    // Gradient sky
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME.height);
    skyGrad.addColorStop(0, skyColor);
    skyGrad.addColorStop(0.6, '#0a0a0f');
    skyGrad.addColorStop(1, '#111118');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(-100, -100, GAME.width + 200, GAME.height + 200);

    // Distant stars for upper tiers
    if (tier >= 4) {
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137 + 50) % (GAME.width + 100) - 50;
        const sy = (i * 73 + 20) % (GAME.height * 0.4);
        const twinkle = Math.sin(GAME.frameCount * 0.03 + i * 2.7) * 0.3 + 0.6;
        ctx.fillStyle = `rgba(200, 210, 255, ${twinkle})`;
        ctx.fillRect(sx, sy, 1 + (i % 2), 1 + (i % 2));
      }
    }

    // Distant embers for volcanic tier
    if (tier >= 4) {
      for (let i = 0; i < 8; i++) {
        const ex = (i * 173 + GAME.frameCount * 0.1) % (GAME.width + 60) - 30;
        const ey = 30 + Math.sin(GAME.frameCount * 0.02 + i) * 20;
        ctx.fillStyle = 'rgba(255, 80, 10, 0.15)';
        ctx.fillRect(ex, ey, 2, 2);
      }
    }
  },

  // Mid-layer atmospheric fog based on tier
  _renderAtmosphericFog(ctx) {
    const tier = Math.ceil(this.currentFloor / 5);
    const t = GAME.frameCount * 0.005;

    switch (tier) {
      case 1: // Horde tier — cave dust
        for (let i = 0; i < 12; i++) {
          const dx = (i * 97 + t * 15) % (GAME.width + 40) - 20;
          const dy = 100 + Math.sin(t + i) * 60 + (i * 17) % 100;
          ctx.fillStyle = 'rgba(100, 90, 70, 0.08)';
          ctx.fillRect(dx, dy, 3, 2);
        }
        break;
      case 2: // Brute tier — dust motes
        for (let i = 0; i < 10; i++) {
          const dx = (i * 103 + t * 12) % (GAME.width + 40) - 20;
          const dy = 80 + Math.sin(t * 0.7 + i) * 40 + (i * 21) % 80;
          ctx.fillStyle = 'rgba(160, 140, 100, 0.07)';
          ctx.fillRect(dx, dy, 2, 2);
        }
        break;
      case 3: // Plague tier — green miasma
        for (let i = 0; i < 14; i++) {
          const dx = (i * 89 + t * 8) % (GAME.width + 50) - 25;
          const dy = GAME.height - 60 - Math.abs(Math.sin(t + i)) * 50;
          ctx.fillStyle = 'rgba(80, 160, 80, 0.06)';
          ctx.fillRect(dx, dy, 6, 3);
        }
        break;
      case 4: // Feral tier — heat shimmer / ash
        for (let i = 0; i < 16; i++) {
          const dx = (i * 83 + t * 9) % (GAME.width + 40) - 20;
          const dy = 60 + Math.cos(t + i * 1.3) * 50;
          ctx.fillStyle = 'rgba(180, 80, 30, 0.06)';
          ctx.fillRect(dx, dy, 3, 3);
        }
        break;
      case 5: // Void tier — data motes / cold fog
        for (let i = 0; i < 14; i++) {
          const dx = (i * 101 + t * 6) % (GAME.width + 40) - 20;
          const dy = 50 + Math.sin(t * 0.5 + i) * 70;
          ctx.fillStyle = 'rgba(100, 120, 200, 0.07)';
          ctx.fillRect(dx, dy, 2, 2);
        }
        break;
    }
  },

  // Foreground particle effects per tier
  _renderFloorParticles(ctx) {
    const tier = Math.ceil(this.currentFloor / 5);
    const t = GAME.frameCount;

    switch (tier) {
      case 1: // Cave dust motes near ground
        for (let i = 0; i < 6; i++) {
          const px = (i * 140 + t * 0.35) % GAME.width;
          const py = GAME.height - 30 - (t * 0.1 + i * 13) % 40;
          ctx.fillStyle = 'rgba(140, 120, 90, 0.15)';
          ctx.fillRect(px, py, 1, 1);
        }
        break;
      case 2: // Arena dust
        for (let i = 0; i < 8; i++) {
          const px = (i * 120 + t * 0.4) % GAME.width;
          const py = GAME.height - 40 - (t * 0.15 + i * 17) % 50;
          ctx.fillStyle = 'rgba(200, 180, 140, 0.12)';
          ctx.fillRect(px, py, 2, 1);
        }
        break;
      case 3: // Green wisps
        for (let i = 0; i < 7; i++) {
          const px = (i * 150 + Math.sin(t * 0.01 + i) * 60) % GAME.width;
          const py = GAME.height - 50 - (t * 0.08 + i * 19) % 60;
          ctx.fillStyle = 'rgba(80, 200, 80, 0.1)';
          ctx.fillRect(px, py, 2, 2);
        }
        break;
      case 4: // Embers / ash falling
        for (let i = 0; i < 10; i++) {
          const px = (i * 110 + Math.sin(t * 0.02 + i) * 40) % GAME.width;
          const py = (t * 0.3 + i * 31) % (GAME.height + 20) - 10;
          ctx.fillStyle = 'rgba(255, 100, 20, 0.15)';
          ctx.fillRect(px, py, 2, 2);
        }
        break;
      case 5: // Glitch motes
        for (let i = 0; i < 8; i++) {
          const px = (i * 130 + t * 0.5) % GAME.width;
          const py = GAME.height - 50 - (t * 0.2 + i * 23) % 70;
          ctx.fillStyle = `rgba(${i % 2 ? '100,150,255' : '255,100,150'}, 0.12)`;
          ctx.fillRect(px, py, 2, 2);
        }
        break;
    }
  },

  // Floor number with subtle glow effect
  _renderFloorHUD(ctx) {
    const textX = GAME.width - 20;
    const floorText = `FLOOR ${this.currentFloor}`;

    // Glow layers (outer → inner)
    for (let g = 3; g >= 0; g--) {
      ctx.font = '14px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = `rgba(255, 200, 60, ${0.04 + g * 0.03})`;
      ctx.fillText(floorText, textX + g * 0.5, 25 + g * 0.5);
    }

    // Main text
    ctx.fillStyle = 'rgba(255, 220, 80, 0.85)';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(floorText, textX, 25);

    // Floor type label with matching glow
    const typeNames = {
      horde: 'THE HORDE', brute: 'THE BRUTE', plague: 'THE PLAGUE',
      feral: 'THE FERAL', void: 'THE VOID', boss: 'BOSS CHAMBER',
    };
    const typeText = typeNames[this.floorType] || '';

    for (let g = 2; g >= 0; g--) {
      ctx.font = '11px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = `rgba(180, 160, 200, ${0.03 + g * 0.03})`;
      ctx.fillText(typeText, textX + g * 0.5, 42 + g * 0.5);
    }
    ctx.fillStyle = 'rgba(200, 180, 220, 0.6)';
    ctx.font = '11px monospace';
    ctx.fillText(typeText, textX, 42);
    ctx.textAlign = 'left';
  },

  renderBonfire(ctx) {
    const bfx = GAME.width / 2;
    const bfy = GAME.height - 120;
    const t = GAME.frameCount;

    // --- DEEP BACKGROUND GLOOM ---
    const gloomGrad = ctx.createRadialGradient(bfx, bfy, 20, bfx, bfy, GAME.width);
    gloomGrad.addColorStop(0, 'rgba(40, 20, 5, 0)');
    gloomGrad.addColorStop(0.3, 'rgba(20, 10, 2, 0.4)');
    gloomGrad.addColorStop(1, 'rgba(5, 2, 0, 0.85)');
    ctx.fillStyle = gloomGrad;
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // --- DISTANT STARS (faint, through the gloom) ---
    for (let i = 0; i < 15; i++) {
      const sx = (i * 197 + 80) % GAME.width;
      const sy = (i * 83 + 30) % (GAME.height * 0.5);
      const twinkle = Math.sin(t * 0.025 + i * 3.1) * 0.25 + 0.35;
      ctx.fillStyle = `rgba(180, 180, 220, ${twinkle * 0.4})`;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // --- WARM AMBIENT GLOW from fire ---
    const warmGlow = ctx.createRadialGradient(bfx, bfy - 15, 8, bfx, bfy, 350);
    warmGlow.addColorStop(0, 'rgba(255, 160, 30, 0.12)');
    warmGlow.addColorStop(0.3, 'rgba(255, 100, 20, 0.05)');
    warmGlow.addColorStop(0.6, 'rgba(255, 60, 10, 0.02)');
    warmGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = warmGlow;
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // --- STONE CIRCLE / FIRE PIT ---
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const sx = bfx + Math.cos(angle) * 22;
      const sy = bfy + Math.sin(angle) * 8;
      ctx.fillStyle = '#3a3028';
      ctx.fillRect(sx - 3, sy - 2, 7, 5);
      ctx.fillStyle = '#5a5040';
      ctx.fillRect(sx - 2, sy - 2, 3, 2);
    }

    // --- ANIMATED FIRE (core + flicker layers) ---
    const flicker1 = Math.sin(t * 0.22) * 3;
    const flicker2 = Math.sin(t * 0.31 + 1.7) * 4;
    const flicker3 = Math.sin(t * 0.18 + 3.1) * 2;

    // Outer flame glow
    for (let layer = 2; layer >= 0; layer--) {
      const spread = [14, 10, 6][layer];
      const alpha = [0.25, 0.4, 0.7][layer];
      const r = [200, 240, 255][layer];
      const g = [60, 130, 200][layer];
      const b = [10, 20, 50][layer];
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;

      // Flame shape — multiple columns
      for (let col = 0; col < 5; col++) {
        const fx = bfx - 6 + col * 3;
        const colOff = Math.sin(t * 0.25 + col * 1.4) * 2;
        const flameH = 12 + spread + flicker1 * (col === 2 ? 1 : 0.5) + colOff;
        ctx.fillRect(fx - 1, bfy - flameH, 3, flameH);
      }
    }

    // Bright core
    ctx.fillStyle = 'rgba(255, 240, 200, 0.9)';
    ctx.fillRect(bfx - 2, bfy - 6 + flicker3, 4, 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(bfx - 1, bfy - 3 + flicker3, 2, 4);

    AN.drawBonfire(ctx, bfx, bfy);

    // --- FIRE PARTICLES (embers drifting up) ---
    if (t % 3 === 0) {
      ParticleSystem.addFireEffect(bfx + (Math.random() - 0.5) * 14, bfy - 8 + Math.random() * 4);
    }
    if (t % 8 === 0) {
      // Larger ember that drifts higher
      ParticleSystem.addFireEffect(bfx + (Math.random() - 0.5) * 8, bfy - 14);
    }

    // --- LIGHT FLICKER on surrounding walls (subtle colour wash) ---
    const washAlpha = 0.015 + Math.abs(Math.sin(t * 0.15)) * 0.02;
    ctx.fillStyle = `rgba(255, 140, 30, ${washAlpha})`;
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // --- RENDER PLAYER ---
    if (GAME.player) {
      const px = bfx - GAME.player.width / 2;
      const py = bfy - GAME.player.height + 15;
      GAME.player.renderCharacter(ctx, px, py);
    }

    // --- BONFIRE UI HINT ---
    const hintAlpha = 0.3 + Math.sin(t * 0.04) * 0.15;
    ctx.fillStyle = `rgba(255, 200, 100, ${hintAlpha})`;
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('REST AT THE BONFIRE  |  SPEND SOUL SHARDS', bfx, bfy - 55);
    ctx.textAlign = 'left';
  },
};

// ============================================================
// Room System — Immersive boss room backgrounds
// ============================================================
const RoomSystem = {
  // Ember particle pool shared across rooms
  _embers: [],
  _initEmbers() {
    if (this._embers.length > 0) return;
    for (let i = 0; i < 60; i++) {
      this._embers.push({
        x: Math.random() * GAME.width,
        y: Math.random() * GAME.height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -(Math.random() * 0.8 + 0.2),
        life: Math.random() * 60,
        maxLife: 30 + Math.random() * 60,
      });
    }
  },

  renderRoom(ctx, floorNum) {
    this._initEmbers();
    switch (floorNum) {
      case 5:  this.renderGoblinWarrens(ctx); break;
      case 10: this.renderColosseum(ctx); break;
      case 15: this.renderDarkLibrary(ctx); break;
      case 20: this.renderVolcano(ctx); break;
      case 25: this.renderCelestialSpire(ctx); break;
    }
  },

  // ──────────────────────────────────────────────
  // FLOOR 5 — GOBLIN WARRENS (Gold & Torchlight)
  // ──────────────────────────────────────────────
  renderGoblinWarrens(ctx) {
    const t = GAME.frameCount;

    // --- CAVE WALLS with jagged stalactites ---
    ctx.fillStyle = '#1a1210';
    ctx.fillRect(0, 0, GAME.width, 140);

    // Jagged ceiling line
    ctx.fillStyle = '#1f1612';
    ctx.beginPath();
    ctx.moveTo(0, 130);
    for (let x = 0; x <= GAME.width; x += 12) {
      const spikeH = (Math.sin(x * 0.15 + 1) * 0.5 + 0.5) * 40 + (x % 24 === 0 ? 25 : 0);
      ctx.lineTo(x, 130 - spikeH);
    }
    ctx.lineTo(GAME.width, 140);
    ctx.lineTo(0, 140);
    ctx.fill();

    // Stalactite highlights
    ctx.fillStyle = '#2a1f18';
    for (let x = 4; x < GAME.width; x += 24) {
      const h = (Math.sin(x * 0.2 + 2) * 0.5 + 0.5) * 35 + 5;
      ctx.fillRect(x, 130 - h, 3, h);
    }

    // Dripping water from stalactites
    for (let i = 0; i < 5; i++) {
      const dx = 60 + i * 170;
      const dripOffset = (t * 0.4 + i * 73) % 120;
      if (dripOffset < 40) {
        const dripY = 100 + dripOffset * 3;
        ctx.fillStyle = 'rgba(100, 160, 200, 0.3)';
        ctx.fillRect(dx, dripY, 1, 3);
      }
    }

    // --- MOUNTAINS OF GOLD ---
    const goldPiles = [
      { x: 30, w: 70, h: 55 },
      { x: 150, w: 90, h: 70 },
      { x: 280, w: 65, h: 50 },
      { x: 400, w: 100, h: 80 },
      { x: 540, w: 75, h: 60 },
      { x: 660, w: 85, h: 65 },
      { x: 770, w: 55, h: 45 },
    ];

    for (const pile of goldPiles) {
      const gy = GAME.height - 90;

      // Shadow under pile (cast by torchlight)
      ctx.fillStyle = 'rgba(10, 6, 2, 0.4)';
      ctx.fillRect(pile.x - 4, gy - pile.h + 4, pile.w, pile.h);

      // Gold pile body (dark gold base)
      const goldGrad = ctx.createLinearGradient(pile.x, gy - pile.h, pile.x, gy);
      goldGrad.addColorStop(0, '#8B6914');
      goldGrad.addColorStop(0.4, '#B8860B');
      goldGrad.addColorStop(1, '#6B4E0A');
      ctx.fillStyle = goldGrad;

      // Pile shape — triangular-ish mound
      ctx.beginPath();
      ctx.moveTo(pile.x, gy);
      ctx.quadraticCurveTo(pile.x + pile.w * 0.4, gy - pile.h - 8, pile.x + pile.w * 0.5, gy - pile.h);
      ctx.quadraticCurveTo(pile.x + pile.w * 0.8, gy - pile.h + 5, pile.x + pile.w, gy);
      ctx.fill();

      // Individual gold coins / nuggets (flickering sparkle)
      const seed = pile.x * 7 + pile.w * 13;
      for (let j = 0; j < 12; j++) {
        const gx = pile.x + 5 + ((seed + j * 31) % (pile.w - 10));
        const gyOff = ((seed + j * 47) % pile.h) * 0.7;
        const sparkle = Math.sin(t * 0.12 + j * 2.3 + seed * 0.01) * 0.5 + 0.5;
        const bright = 0.3 + sparkle * 0.7;

        // Gold base
        ctx.fillStyle = `rgba(255, 200, 40, ${bright})`;
        ctx.fillRect(gx, gy - gyOff, 2, 2);

        // Extra bright sparkle on some frames
        if (sparkle > 0.85) {
          ctx.fillStyle = `rgba(255, 255, 180, ${sparkle})`;
          ctx.fillRect(gx - 1, gy - gyOff - 1, 4, 2);
        }
      }

      // Scattered coins on floor near pile
      for (let j = 0; j < 5; j++) {
        const cx = pile.x - 8 + ((seed + j * 19) % (pile.w + 16));
        const cy = gy + 3 + ((seed + j * 29) % 10);
        ctx.fillStyle = 'rgba(220, 170, 30, 0.5)';
        ctx.fillRect(cx, cy, 1, 1);
      }
    }

    // --- CRUDE WOODEN TORCHES ---
    const torchPositions = [
      { x: 55, y: 55 },
      { x: 310, y: 40 },
      { x: 580, y: 50 },
      { x: 750, y: 42 },
    ];

    for (let i = 0; i < torchPositions.length; i++) {
      const tx = torchPositions[i].x;
      const ty = torchPositions[i].y;
      const phase = i * 1.7;

      // Torch bracket (iron ring on wall)
      ctx.fillStyle = '#3a2a1a';
      ctx.fillRect(tx - 2, ty - 2, 5, 4);
      ctx.fillStyle = '#4a3520';
      ctx.fillRect(tx - 1, ty - 1, 3, 2);

      // Wooden shaft
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(tx + 5, ty, 3, 22);
      ctx.fillStyle = '#6b4a2a';
      ctx.fillRect(tx + 5, ty, 1, 22);

      // Flame animation — multi-layer flicker
      const flickA = Math.sin(t * 0.18 + phase) * 3;
      const flickB = Math.sin(t * 0.25 + phase + 1.2) * 2;
      const flickC = Math.sin(t * 0.14 + phase + 2.5) * 2.5;
      const baseH = 8 + flickA + flickB;

      // Outer flame (orange-red)
      ctx.fillStyle = 'rgba(255, 100, 10, 0.5)';
      for (let col = 0; col < 3; col++) {
        const fx = tx + 4 + col * 2;
        ctx.fillRect(fx - 1, ty - baseH - 4, 3, baseH + 6);
      }

      // Mid flame (orange)
      ctx.fillStyle = 'rgba(255, 150, 20, 0.7)';
      for (let col = 0; col < 3; col++) {
        const fx = tx + 4 + col * 2;
        const h = baseH + flickC * 0.6;
        ctx.fillRect(fx, ty - h - 1, 2, h + 2);
      }

      // Inner flame (yellow-white core)
      ctx.fillStyle = 'rgba(255, 220, 80, 0.8)';
      ctx.fillRect(tx + 5, ty - baseH + 2, 2, baseH - 4);
      ctx.fillStyle = '#fff';
      ctx.fillRect(tx + 5, ty - 2 + flickC * 0.5, 2, 3);

      // Ember particles drifting up from torch
      if (t % 3 === 0) {
        this._embers.push({
          x: tx + 5 + Math.random() * 4,
          y: ty - baseH - 2,
          vx: (Math.random() - 0.5) * 0.4,
          vy: -(Math.random() * 1.2 + 0.3),
          life: 0,
          maxLife: 25 + Math.random() * 35,
        });
      }

      // Torchlight glow on surroundings
      const glowGrad = ctx.createRadialGradient(tx + 5, ty - 3, 4, tx + 5, ty - 3, 80);
      glowGrad.addColorStop(0, 'rgba(255, 140, 20, 0.08)');
      glowGrad.addColorStop(0.5, 'rgba(255, 100, 10, 0.03)');
      glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(tx - 75, ty - 75, 160, 160);
    }

    // --- AMBIENT SHADOWS (cast away from torchlight) ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.fillRect(0, GAME.height - 40, GAME.width, 40);

    this._renderEmbers(ctx, t);
  },

  // ──────────────────────────────────────────────
  // FLOOR 10 — SPIKED COLOSSEUM
  // ──────────────────────────────────────────────
  renderColosseum(ctx) {
    const t = GAME.frameCount;

    // --- SKY (hazy arena sky) ---
    const skyGrad = ctx.createLinearGradient(0, 20, 0, 180);
    skyGrad.addColorStop(0, '#4a6080');
    skyGrad.addColorStop(0.5, '#7a8ea0');
    skyGrad.addColorStop(1, '#b8a880');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME.width, 180);

    // Sunlight beams
    for (let i = 0; i < 3; i++) {
      const bx = 100 + i * 300;
      const beamGrad = ctx.createLinearGradient(bx, 0, bx - 40, 200);
      beamGrad.addColorStop(0, 'rgba(255, 250, 200, 0.08)');
      beamGrad.addColorStop(1, 'rgba(255, 250, 200, 0)');
      ctx.fillStyle = beamGrad;
      ctx.beginPath();
      ctx.moveTo(bx - 8, 0);
      ctx.lineTo(bx + 8, 0);
      ctx.lineTo(bx - 30, 200);
      ctx.lineTo(bx - 46, 200);
      ctx.fill();
    }

    // --- SANDY ARENA FLOOR ---
    for (let y = GAME.height - 80; y < GAME.height; y++) {
      const sandShade = 180 + Math.sin(y * 0.3) * 8 + Math.sin(y * 0.7 + t * 0.01) * 4;
      ctx.fillStyle = `rgb(${sandShade}, ${sandShade * 0.78}, ${sandShade * 0.35})`;
      ctx.fillRect(0, y, GAME.width, 1);
    }

    // Sand texture dots
    for (let i = 0; i < 30; i++) {
      const sx = (i * 137 + 20) % GAME.width;
      const sy = GAME.height - 60 + (i * 53) % 55;
      ctx.fillStyle = 'rgba(140, 110, 60, 0.25)';
      ctx.fillRect(sx, sy, 2, 1);
    }

    // --- IRON SPIKES on walls ---
    for (let i = 0; i < GAME.width; i += 35) {
      const spikeX = i + 8;
      const spikeBaseY = GAME.height - 82;

      // Shadow
      ctx.fillStyle = 'rgba(20, 15, 5, 0.3)';
      ctx.fillRect(spikeX + 1, spikeBaseY - 6, 5, 10);

      // Spike body (dark iron)
      ctx.fillStyle = '#4a4a4e';
      ctx.fillRect(spikeX, spikeBaseY - 5, 6, 10);
      ctx.fillRect(spikeX + 1, spikeBaseY - 8, 4, 6);
      ctx.fillRect(spikeX + 2, spikeBaseY - 11, 2, 5);

      // Metallic glint (top edge catches light)
      const glint = Math.sin(t * 0.05 + i * 0.7) * 0.3 + 0.5;
      ctx.fillStyle = `rgba(180, 180, 190, ${glint})`;
      ctx.fillRect(spikeX + 1, spikeBaseY - 6, 1, 8);
      ctx.fillRect(spikeX + 2, spikeBaseY - 9, 1, 4);

      // Glint spark on some frames
      if (Math.sin(t * 0.08 + i * 1.3) > 0.92) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillRect(spikeX + 1, spikeBaseY - 7, 2, 2);
      }
    }

    // --- CROWD SILHOUETTES in stands ---
    const crowdMood = (GAME.boss && GAME.boss.crowdMood) ? GAME.boss.crowdMood : 0.5;
    const crowdBias = crowdMood > 0.6 ? 1 : crowdMood < 0.4 ? -1 : 0;

    for (let i = 0; i < 16; i++) {
      const cx = 25 + i * 52;
      const cyBase = 25 + (i % 3) * 22;
      const animPhase = t * 0.1 + i * 1.7;

      // Body
      const bobY = Math.sin(animPhase) * (1 + Math.abs(crowdBias));
      ctx.fillStyle = 'rgba(15, 12, 10, 0.7)';
      ctx.fillRect(cx, cyBase + bobY, 10, 16);

      // Head
      ctx.fillRect(cx + 2, cyBase - 4 + bobY, 6, 7);

      // Arms — banging fists when crowd is excited, waving when neutral
      if (crowdBias >= 0) {
        // Cheering — arms up
        const armY = -4 - Math.abs(Math.sin(animPhase * 2)) * 3 * (0.5 + crowdBias * 0.5);
        ctx.fillRect(cx - 2, cyBase + 2 + armY, 3, 6);
        ctx.fillRect(cx + 9, cyBase + 2 + armY, 3, 6);
      } else {
        // Displeased — arms crossed or booing
        ctx.fillRect(cx - 1, cyBase + 4, 3, 5);
        ctx.fillRect(cx + 8, cyBase + 4, 3, 5);
      }
    }

    // Crowd mood indicator text
    if (GAME.boss && GAME.boss.crowdMood !== undefined) {
      const moodText = crowdBias > 0 ? '👑 CHEER!' : crowdBias < 0 ? '👎 BOO!' : '';
      if (moodText) {
        const moodAlpha = 0.3 + Math.abs(crowdMood - 0.5) * 1.0;
        ctx.fillStyle = `rgba(255, ${crowdBias > 0 ? '220, 40' : '60, 40'}, ${moodAlpha})`;
        ctx.font = 'bold 18px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(moodText, GAME.width / 2, 50);
        ctx.textAlign = 'left';
      }
    }

    // --- DUST PARTICLES in sunlight beams ---
    const dustCount = 25;
    for (let i = 0; i < dustCount; i++) {
      const dx = (i * 113 + t * 0.15 + Math.sin(i * 2.7) * 30) % GAME.width;
      const dy = 80 + (i * 37 + Math.sin(t * 0.02 + i) * 20) % 120;
      const dustAlpha = 0.08 + Math.abs(Math.sin(t * 0.03 + i)) * 0.08;
      ctx.fillStyle = `rgba(255, 250, 210, ${dustAlpha})`;
      ctx.fillRect(dx, dy, 1, 1);
    }

    // --- SHADOW under boss area ---
    ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
    ctx.fillRect(GAME.width / 2 - 80, GAME.height - 80, 160, 20);
  },

  // ──────────────────────────────────────────────
  // FLOOR 15 — DARK LIBRARY
  // ──────────────────────────────────────────────
  renderDarkLibrary(ctx) {
    const t = GAME.frameCount;

    // --- STONE FLOOR ---
    for (let y = GAME.height - 80; y < GAME.height; y++) {
      const stoneShade = 30 + Math.sin(y * 0.5 + t * 0.003) * 4;
      ctx.fillStyle = `rgb(${stoneShade}, ${stoneShade * 0.8}, ${stoneShade * 1.1})`;
      ctx.fillRect(0, y, GAME.width, 1);
    }

    // Stone cracks
    for (let i = 0; i < 8; i++) {
      const cx = (i * 137 + 30) % GAME.width;
      ctx.fillStyle = 'rgba(15, 12, 20, 0.4)';
      ctx.fillRect(cx, GAME.height - 60 + (i * 41) % 20, 14, 1);
    }

    // --- ANIMATED GREEN MIST covering the floor ---
    for (let i = 0; i < 20; i++) {
      const mx = (i * 93 + t * 0.12 + Math.sin(i * 2.1 + t * 0.008) * 40) % GAME.width;
      const my = GAME.height - 40 + Math.sin(t * 0.015 + i * 1.4) * 20;
      const mistAlpha = 0.04 + Math.abs(Math.sin(t * 0.02 + i)) * 0.06;
      ctx.fillStyle = `rgba(60, 200, 80, ${mistAlpha})`;
      ctx.fillRect(mx - 8, my - 2, 20, 6);
      // Mist highlight
      ctx.fillStyle = `rgba(100, 240, 100, ${mistAlpha * 0.5})`;
      ctx.fillRect(mx - 4, my - 1, 8, 2);
    }

    // --- BACKGROUND GLOOM ---
    const gloomGrad = ctx.createLinearGradient(0, 0, 0, GAME.height - 70);
    gloomGrad.addColorStop(0, '#0a0610');
    gloomGrad.addColorStop(0.5, '#120c18');
    gloomGrad.addColorStop(1, '#1a1020');
    ctx.fillStyle = gloomGrad;
    ctx.fillRect(0, 0, GAME.width, GAME.height - 70);

    // --- FLOATING BOOKSHELVES (slowly rotating/oscillating) ---
    for (let i = 0; i < 5; i++) {
      const bx = 30 + i * 170;
      const floatY = Math.sin(t * 0.008 + i * 1.3) * 8;
      const by = 60 + floatY;
      const swayAngle = Math.sin(t * 0.006 + i * 0.9) * 0.08;

      ctx.save();
      ctx.translate(bx + 8, by + 30);
      ctx.rotate(swayAngle);

      // Shelf shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(2, 2, 16, 55);

      // Shelf body
      const shelfGrad = ctx.createLinearGradient(0, 0, 16, 0);
      shelfGrad.addColorStop(0, '#2a1a3a');
      shelfGrad.addColorStop(0.5, '#3a2848');
      shelfGrad.addColorStop(1, '#1f1228');
      ctx.fillStyle = shelfGrad;
      ctx.fillRect(0, 0, 16, 55);

      // Shelf dividers
      ctx.fillStyle = '#1a0e20';
      for (let s = 0; s < 4; s++) {
        ctx.fillRect(1, 5 + s * 12, 14, 2);
      }

      // Books — tiny coloured rectangles
      const bookColors = ['#4a3a6a', '#5a4a3a', '#3a5a4a', '#6a3a3a', '#4a4a6a', '#3a3a5a'];
      for (let s = 0; s < 4; s++) {
        const rowY = 7 + s * 12;
        for (let b = 0; b < 5; b++) {
          const bookW = 1 + (b % 3);
          ctx.fillStyle = bookColors[(s * 5 + b) % bookColors.length];
          ctx.fillRect(2 + b * 3, rowY, bookW, 8);
        }
      }

      ctx.restore();

      // Green glow aura around shelf
      const auraGrad = ctx.createRadialGradient(bx + 8, by + 27, 10, bx + 8, by + 27, 50);
      auraGrad.addColorStop(0, 'rgba(40, 180, 60, 0.06)');
      auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = auraGrad;
      ctx.fillRect(bx - 40, by - 20, 100, 100);
    }

    // --- GLOWING GREEN PAGES fluttering ---
    for (let i = 0; i < 8; i++) {
      const px = (i * 130 + t * 0.25 + Math.sin(t * 0.012 + i) * 50) % (GAME.width + 20) - 10;
      const py = 50 + Math.sin(t * 0.025 + i * 1.5) * 60 + Math.cos(t * 0.018 + i) * 20;
      const pageAlpha = 0.15 + Math.abs(Math.sin(t * 0.03 + i)) * 0.10;

      // Page body
      ctx.fillStyle = `rgba(40, 200, 80, ${pageAlpha})`;
      ctx.fillRect(px, py, 7, 9);

      // Glow border
      ctx.fillStyle = `rgba(80, 240, 100, ${pageAlpha * 0.6})`;
      ctx.fillRect(px - 1, py - 1, 9, 1);
      ctx.fillRect(px - 1, py + 9, 9, 1);

      // Faint text lines on page
      ctx.fillStyle = `rgba(150, 255, 150, ${pageAlpha * 0.4})`;
      ctx.fillRect(px + 1, py + 2, 5, 1);
      ctx.fillRect(px + 1, py + 4, 4, 1);
      ctx.fillRect(px + 1, py + 6, 3, 1);
    }

    // --- GREEN-FLAME CANDLES ---
    const candlePositions = [
      { x: 60, y: 150 },
      { x: 350, y: 140 },
      { x: 580, y: 145 },
      { x: 760, y: 135 },
    ];

    for (let i = 0; i < candlePositions.length; i++) {
      const cx = candlePositions[i].x;
      const cy = candlePositions[i].y;

      // Candle body
      ctx.fillStyle = '#3a3040';
      ctx.fillRect(cx, cy, 4, 12);
      ctx.fillStyle = '#4a3a50';
      ctx.fillRect(cx, cy, 2, 12);

      // Wax drip
      ctx.fillStyle = '#4a3a48';
      ctx.fillRect(cx + 1, cy + 2, 1, 3);

      // Green flame
      const gFlameH = 5 + Math.sin(t * 0.2 + i * 1.9) * 2;
      ctx.fillStyle = 'rgba(40, 200, 60, 0.6)';
      ctx.fillRect(cx, cy - gFlameH, 4, gFlameH + 2);
      ctx.fillStyle = 'rgba(60, 240, 80, 0.7)';
      ctx.fillRect(cx + 1, cy - gFlameH + 2, 2, gFlameH);
      ctx.fillStyle = 'rgba(180, 255, 180, 0.8)';
      ctx.fillRect(cx + 1, cy - 1, 2, 3);

      // Faint green glow
      const candleGlow = ctx.createRadialGradient(cx + 2, cy, 4, cx + 2, cy, 60);
      candleGlow.addColorStop(0, 'rgba(40, 200, 60, 0.06)');
      candleGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = candleGlow;
      ctx.fillRect(cx - 55, cy - 55, 115, 115);
    }

    // --- WHISPERED TEXT appearing and fading ---
    const whisperPhrases = [
      '...knowledge is power...',
      '...the old ones wait...',
      '...turn back...',
      '...secrets in the dark...',
      '...he knows you are here...',
      '...the pages remember...',
    ];
    const whisperIndex = Math.floor(t / 200) % whisperPhrases.length;
    const whisperProgress = (t % 200) / 200;
    const whisperAlpha = whisperProgress < 0.3
      ? whisperProgress / 0.3 * 0.5
      : (1 - whisperProgress) / 0.7 * 0.5;

    if (whisperAlpha > 0.01) {
      ctx.fillStyle = `rgba(80, 220, 80, ${whisperAlpha})`;
      ctx.font = 'italic 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(whisperPhrases[whisperIndex], GAME.width / 2, 180);
      ctx.textAlign = 'left';
    }
  },

  // ──────────────────────────────────────────────
  // FLOOR 20 — VOLCANO
  // ──────────────────────────────────────────────
  _lastEruption: 0,
  _smokeParticles: [],

  renderVolcano(ctx) {
    const t = GAME.frameCount;
    const volcanoX = GAME.width / 2;
    const volcanoPeakY = 30;

    // --- SKY (ash-choked red-black) ---
    const skyGrad = ctx.createLinearGradient(0, 0, 0, GAME.height);
    skyGrad.addColorStop(0, '#1a0804');
    skyGrad.addColorStop(0.3, '#2a0e06');
    skyGrad.addColorStop(0.7, '#3a1408');
    skyGrad.addColorStop(1, '#1a0802');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // --- MASSIVE VOLCANO SHAPE ---
    // Main cone
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.moveTo(volcanoX - 180, GAME.height - 80);
    ctx.lineTo(volcanoX - 50, volcanoPeakY + 40);
    ctx.lineTo(volcanoX - 25, volcanoPeakY + 15);
    ctx.lineTo(volcanoX, volcanoPeakY);
    ctx.lineTo(volcanoX + 30, volcanoPeakY + 18);
    ctx.lineTo(volcanoX + 60, volcanoPeakY + 45);
    ctx.lineTo(volcanoX + 200, GAME.height - 80);
    ctx.fill();

    // Volcano texture — jagged rock strata
    for (let y = volcanoPeakY + 20; y < GAME.height - 60; y += 18) {
      const widthAtY = 100 + (y - volcanoPeakY) * 2.2;
      const shade = 16 - Math.sin(y * 0.05 + t * 0.002) * 4;
      ctx.fillStyle = `rgb(${shade}, ${shade * 0.5}, ${shade * 0.3})`;
      const lx = volcanoX - widthAtY / 2;
      ctx.fillRect(lx + Math.sin(y * 0.03) * 6, y, widthAtY + Math.sin(y * 0.04) * 8, 4);
    }

    // Crater rim highlight
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(volcanoX - 28, volcanoPeakY - 2, 60, 6);

    // --- PULSING LAVA AT PEAK ---
    const lavaPulse = Math.sin(t * 0.06) * 0.3 + 0.7;

    // Lava pool in crater
    for (let layer = 3; layer >= 0; layer--) {
      const radius = [20, 15, 10, 5][layer];
      const alpha = [0.3, 0.5, 0.7, 0.9][layer];
      const r = [255, 255, 255, 255][layer];
      const g = [40, 100, 180, 240][layer];
      const b = [0, 0, 30, 80][layer];
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha * lavaPulse})`;
      ctx.beginPath();
      ctx.arc(volcanoX, volcanoPeakY + 2, radius + lavaPulse * 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Lava glow on surroundings
    const lavaGlow = ctx.createRadialGradient(volcanoX, volcanoPeakY + 5, 5, volcanoX, volcanoPeakY + 5, 200);
    lavaGlow.addColorStop(0, `rgba(255, 40, 0, ${0.15 * lavaPulse})`);
    lavaGlow.addColorStop(0.3, `rgba(255, 20, 0, ${0.06 * lavaPulse})`);
    lavaGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = lavaGlow;
    ctx.fillRect(volcanoX - 200, volcanoPeakY - 50, 400, 300);

    // --- LAVA RIVERS flowing down the volcano ---
    const lavaPaths = [
      { startX: volcanoX - 8, offset: -20, width: 6 },
      { startX: volcanoX + 5, offset: 25, width: 4 },
    ];

    for (const path of lavaPaths) {
      for (let seg = 0; seg < 8; seg++) {
        const sy = volcanoPeakY + 15 + seg * 20;
        const sx = volcanoX + path.offset + Math.sin(sy * 0.02 + t * 0.03) * 8;
        const flowBright = Math.sin(t * 0.08 + seg * 0.7) * 0.3 + 0.6;

        // River bed (dark rock edge)
        ctx.fillStyle = 'rgba(10, 5, 2, 0.6)';
        ctx.fillRect(sx - 1, sy, path.width + 2, 22);

        // Flowing lava
        ctx.fillStyle = `rgba(255, ${Math.floor(60 * flowBright + 20)}, 0, 0.7)`;
        ctx.fillRect(sx, sy + 2, path.width, 18);

        // Lava highlights
        ctx.fillStyle = `rgba(255, ${Math.floor(160 * flowBright + 40)}, 20, 0.6)`;
        ctx.fillRect(sx + 1, sy + 3, path.width - 1, 2);
        ctx.fillRect(sx + 1, sy + 10, path.width - 2, 2);
      }
    }

    // --- STEAM VENTS ---
    const ventPositions = [
      { x: volcanoX - 90, y: GAME.height - 50 },
      { x: volcanoX + 80, y: GAME.height - 55 },
      { x: volcanoX + 20, y: GAME.height - 35 },
    ];
    const secondsSinceEruption = (t % 1800) / 60; // 30 seconds at 60fps

    for (let i = 0; i < ventPositions.length; i++) {
      const vx = ventPositions[i].x;
      const vy = ventPositions[i].y;
      const ventPhase = (secondsSinceEruption + i * 10) % 30;
      const isErupting = ventPhase < 3; // erupt for 3 seconds

      // Crack in ground
      ctx.fillStyle = '#0a0502';
      ctx.fillRect(vx, vy, 8, 3);
      ctx.fillStyle = 'rgba(255, 60, 10, 0.2)';
      ctx.fillRect(vx + 1, vy, 6, 2);

      if (isErupting) {
        // Steam burst
        const burstProgress = ventPhase / 3;
        const burstAlpha = 1 - burstProgress;

        for (let j = 0; j < 8; j++) {
          const sx = vx + (j - 4) * 3 + Math.sin(t * 0.1 + j) * 2;
          const sy = vy - burstProgress * 40 - j * 3;
          ctx.fillStyle = `rgba(200, 200, 210, ${burstAlpha * 0.15})`;
          ctx.fillRect(sx, sy, 3, 3);
        }

        // Lava splash dots
        for (let j = 0; j < 3; j++) {
          ctx.fillStyle = `rgba(255, 80, 10, ${burstAlpha * 0.5})`;
          ctx.fillRect(vx + Math.random() * 6, vy - Math.random() * 15, 2, 2);
        }
      } else {
        // Gentle fume
        const fumeAlpha = 0.03 + Math.sin(t * 0.02 + i) * 0.02;
        ctx.fillStyle = `rgba(150, 150, 160, ${fumeAlpha})`;
        ctx.fillRect(vx - 1, vy - 3, 10, 4);
      }
    }

    // --- PIXELATED SMOKE RISING from volcano ---
    if (t % 3 === 0) {
      this._smokeParticles.push({
        x: volcanoX + (Math.random() - 0.5) * 40,
        y: volcanoPeakY - Math.random() * 10,
        vy: -(Math.random() * 0.6 + 0.2),
        vx: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 80 + Math.random() * 80,
        size: 2 + Math.random() * 3,
      });
    }

    for (let i = this._smokeParticles.length - 1; i >= 0; i--) {
      const p = this._smokeParticles[i];
      p.y += p.vy;
      p.x += p.vx;
      p.life++;

      if (p.life > p.maxLife || p.y < -10) {
        this._smokeParticles.splice(i, 1);
        continue;
      }

      const alpha = (1 - p.life / p.maxLife) * 0.3;
      ctx.fillStyle = `rgba(60, 55, 50, ${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
      ctx.fillStyle = `rgba(40, 35, 32, ${alpha * 0.7})`;
      ctx.fillRect(p.x + 1, p.y, p.size - 1, p.size - 1);
    }

    // --- HEAT DISTORTION near lava rivers ---
    // Subtle screen wobble using per-pixel offset (simulated with shifted rects)
    for (let i = 0; i < 4; i++) {
      const hx = volcanoX - 40 + i * 25;
      const hy = volcanoPeakY + 40 + Math.sin(t * 0.04 + i) * 4;
      const wobbleX = Math.sin(t * 0.07 + i * 1.7) * 1.5;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.fillRect(hx + wobbleX, hy, 6, 30);
    }

    // Eruption fire particles
    if (t % 6 === 0) {
      ParticleSystem.addFireEffect(volcanoX + (Math.random() - 0.5) * 24, volcanoPeakY + Math.random() * 8);
    }
  },

  // ──────────────────────────────────────────────
  // FLOOR 25 — CELESTIAL SPIRE (GLITCHED)
  // ──────────────────────────────────────────────
  _glitchLines: [],
  _corruptedArtifacts: [],
  _starfieldPhase: 0,

  renderCelestialSpire(ctx) {
    const t = GAME.frameCount;

    // --- STARFIELD BACKGROUND ---
    // Flashes between red and blue
    const colorPhase = Math.sin(t * 0.008) * 0.5 + 0.5; // 0=red, 1=blue
    const starColorR = Math.floor(60 + colorPhase * 195);
    const starColorG = Math.floor(40 + colorPhase * 160);
    const starColorB = Math.floor(120 + (1 - colorPhase) * 135);

    // Deep space gradient
    const spaceGrad = ctx.createLinearGradient(0, 0, 0, GAME.height);
    spaceGrad.addColorStop(0, `rgb(${Math.floor(4 + colorPhase * 6)}, ${Math.floor(2 + colorPhase * 4)}, ${Math.floor(12 + (1 - colorPhase) * 12)})`);
    spaceGrad.addColorStop(0.5, `rgb(${Math.floor(8 + colorPhase * 10)}, ${Math.floor(4 + colorPhase * 6)}, ${Math.floor(18 + (1 - colorPhase) * 16)})`);
    spaceGrad.addColorStop(1, '#080810');
    ctx.fillStyle = spaceGrad;
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Twinkling stars
    for (let i = 0; i < 60; i++) {
      const sx = (i * 97 + 13) % GAME.width;
      const sy = (i * 53 + 7) % (GAME.height - 100);
      const twinkleSpeed = 0.015 + (i % 5) * 0.008;
      const brightness = Math.sin(t * twinkleSpeed + i * 2.3) * 0.4 + 0.5;
      const size = (i % 4 === 0) ? 2 : 1;

      // Star core
      ctx.fillStyle = `rgba(${starColorR}, ${starColorG}, ${starColorB}, ${brightness})`;
      ctx.fillRect(sx, sy, size, size);

      // Cross sparkle for bright stars
      if (brightness > 0.85 && size === 2) {
        ctx.fillStyle = `rgba(${starColorR}, ${starColorG}, ${starColorB}, ${(brightness - 0.85) * 3})`;
        ctx.fillRect(sx - 2, sy, 5, 1);
        ctx.fillRect(sx, sy - 2, 1, 5);
      }
    }

    // --- FLOOR TILES that swap positions ---
    const swapCycle = Math.floor(t / 900) % 4; // 15s cycles
    const swapProgress = (t % 900) / 900; // 0→1 within cycle
    const tileCount = Math.floor(GAME.width / 48) + 1;

    for (let i = 0; i < tileCount; i++) {
      // Which tile to render at position i
      let srcIndex = i;
      if (swapCycle === 1) srcIndex = tileCount - 1 - i;
      else if (swapCycle === 2) srcIndex = (i + Math.floor(tileCount / 2)) % tileCount;
      else if (swapCycle === 3) srcIndex = (i * 3) % tileCount;

      const colorA = srcIndex % 2 === 0 ? '#0a0a2a' : '#1a0a3a';
      const colorB = srcIndex % 2 === 0 ? '#1a0a3a' : '#0a0a2a';

      ctx.fillStyle = i % 2 === 0 ? colorA : colorB;
      ctx.fillRect(i * 48, GAME.height - 80, 48, 80);

      // Tile edge highlight
      ctx.fillStyle = 'rgba(60, 60, 120, 0.2)';
      ctx.fillRect(i * 48, GAME.height - 80, 48, 1);
    }

    // --- SCREEN GLITCH LINES ---
    if (t % 40 < 3 || (t % 137 < 2)) {
      const glitchY = Math.floor(Math.random() * GAME.height);
      const glitchH = 2 + Math.floor(Math.random() * 8);
      const glitchColor = Math.random() > 0.5
        ? `rgba(255, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 0.3)`
        : `rgba(${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 100)}, 255, 0.3)`;

      ctx.fillStyle = glitchColor;
      ctx.fillRect(0, glitchY, GAME.width, glitchH);

      // Glitch displacement — shift a slice of screen
      const shiftX = (Math.random() - 0.5) * 20;
      if (Math.abs(shiftX) > 5) {
        // Simulate by drawing a displaced strip
        ctx.drawImage(ctx.canvas,
          Math.max(0, -shiftX), glitchY, GAME.width, glitchH,
          Math.max(0, shiftX), glitchY, GAME.width, glitchH
        );
      }
    }

    // --- CORRUPTED DATA ARTIFACTS ---
    if (t % 60 === 0 && this._corruptedArtifacts.length < 8) {
      this._corruptedArtifacts.push({
        x: Math.random() * GAME.width,
        y: 30 + Math.random() * 150,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.3,
        life: 0,
        maxLife: 120 + Math.random() * 180,
        data: this._generateGlitchData(),
      });
    }

    for (let i = this._corruptedArtifacts.length - 1; i >= 0; i--) {
      const a = this._corruptedArtifacts[i];
      a.x += a.vx;
      a.y += a.vy;
      a.life++;

      if (a.life > a.maxLife) {
        this._corruptedArtifacts.splice(i, 1);
        continue;
      }

      const alpha = Math.min(0.4, (1 - a.life / a.maxLife) * 0.5);

      // Glitch artifact — block of corrupted "data"
      ctx.fillStyle = `rgba(${a.data.r}, ${a.data.g}, ${a.data.b}, ${alpha})`;
      ctx.fillRect(a.x, a.y, a.data.w, a.data.h);

      // Scanline effect within artifact
      for (let sl = 0; sl < a.data.h; sl += 2) {
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha * 0.3})`;
        ctx.fillRect(a.x, a.y + sl, a.data.w, 1);
      }

      // Flicker
      if (Math.random() > 0.7) {
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.fillRect(a.x + Math.floor(Math.random() * a.data.w), a.y, 1, a.data.h);
      }
    }

    // --- NEBULA / COSMIC DUST ---
    for (let i = 0; i < 10; i++) {
      const nx = (i * 143 + Math.sin(t * 0.006 + i) * 30) % GAME.width;
      const ny = 40 + Math.cos(t * 0.008 + i) * 20 + (i * 27) % 150;
      ctx.fillStyle = `rgba(${starColorR}, ${starColorG}, ${starColorB}, 0.04)`;
      ctx.fillRect(nx - 4, ny - 2, 10, 6);
    }
  },

  // Generate random glitch artifact data
  _generateGlitchData() {
    const colors = [
      { r: 255, g: 40, b: 80 },
      { r: 40, g: 255, b: 80 },
      { r: 40, g: 80, b: 255 },
      { r: 255, g: 40, b: 255 },
      { r: 255, g: 255, b: 40 },
    ];
    return {
      ...colors[Math.floor(Math.random() * colors.length)],
      w: 6 + Math.floor(Math.random() * 14),
      h: 4 + Math.floor(Math.random() * 16),
    };
  },

  // Shared ember particle renderer
  _renderEmbers(ctx, t) {
    for (let i = this._embers.length - 1; i >= 0; i--) {
      const e = this._embers[i];
      e.x += e.vx;
      e.y += e.vy;
      e.life++;

      if (e.life > e.maxLife) {
        this._embers.splice(i, 1);
        continue;
      }

      const alpha = (1 - e.life / e.maxLife) * 0.7;
      const phase = e.life / e.maxLife;

      // Fade from yellow-white to orange-red
      const r = Math.floor(255);
      const g = Math.floor(220 * (1 - phase) + 80 * phase);
      const b = Math.floor(100 * (1 - phase));
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.fillRect(e.x, e.y, 1.5, 1.5);
    }
  },
};
