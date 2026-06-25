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

  renderFloor(ctx) {
    if (GAME.state === 'BONFIRE') {
      AN.drawFloor(ctx, 'bonfire');
      this.renderBonfire(ctx);
      return;
    }

    if (this.floorType === 'boss') {
      // Boss room — use specific room type
      RoomSystem.renderRoom(ctx, this.currentFloor);
      AN.drawFloor(ctx, 'boss');
    } else {
      AN.drawFloor(ctx, this.floorType);
    }

    // Floor number display
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.font = '14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FLOOR ${this.currentFloor}`, GAME.width - 15, 25);

    // Floor type label
    const typeNames = {
      horde: 'THE HORDE', brute: 'THE BRUTE', plague: 'THE PLAGUE',
      feral: 'THE FERAL', void: 'THE VOID', boss: 'BOSS CHAMBER',
    };
    ctx.fillText(typeNames[this.floorType] || '', GAME.width - 15, 42);
    ctx.textAlign = 'left';
  },

  renderBonfire(ctx) {
    const bfx = GAME.width / 2;
    const bfy = GAME.height - 120;
    AN.drawBonfire(ctx, bfx, bfy);

    // Warm ambient glow
    ctx.fillStyle = 'rgba(255, 120, 20, 0.03)';
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Render player sitting
    if (GAME.player) {
      const px = bfx - GAME.player.width / 2;
      const py = bfy - GAME.player.height + 15;
      GAME.player.renderCharacter(ctx, px, py);

      // Bonfire-specific idle animations:
      // Knight removes helmet, Assassin sharpens dagger, etc.
      // (Simplified - just show character near fire)
    }

    // Fire particles
    if (GAME.frameCount % 5 === 0) {
      ParticleSystem.addFireEffect(bfx + (Math.random() - 0.5) * 8, bfy - 10);
    }
  },
};

// ============================================================
// Room System — Boss room backgrounds
// ============================================================
const RoomSystem = {
  renderRoom(ctx, floorNum) {
    switch (floorNum) {
      case 5:
        this.renderGoblinWarrens(ctx);
        break;
      case 10:
        this.renderColosseum(ctx);
        break;
      case 15:
        this.renderDarkLibrary(ctx);
        break;
      case 20:
        this.renderVolcano(ctx);
        break;
      case 25:
        this.renderCelestialSpire(ctx);
        break;
    }
  },

  renderGoblinWarrens(ctx) {
    // Mountains of gold
    for (let i = 0; i < 8; i++) {
      const gx = 40 + i * 120;
      const gy = GAME.height - 90;
      const pileH = 20 + Math.random() * 40;
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(gx, gy - pileH, 30, pileH);
      ctx.fillStyle = '#ffd700';
      // Flickering gold pixels
      for (let j = 0; j < 5; j++) {
        if (Math.random() > 0.6) {
          ctx.fillRect(gx + Math.random() * 28, gy - Math.random() * pileH, 2, 2);
        }
      }
    }

    // Crude torches
    for (let i = 0; i < 4; i++) {
      const tx = 80 + i * 260;
      const ty = 40;
      ctx.fillStyle = '#5a3a1a';
      ctx.fillRect(tx, ty, 3, 20);
      const flameSize = Math.sin(GAME.frameCount * 0.15 + i) * 2 + 4;
      ctx.fillStyle = '#ff8800';
      ctx.fillRect(tx - 1, ty - flameSize, 5, flameSize);
      ctx.fillStyle = '#ffcc00';
      ctx.fillRect(tx + 1, ty - flameSize + 1, 1, flameSize - 2);
    }
  },

  renderColosseum(ctx) {
    // Sandy floor
    ctx.fillStyle = '#c4a44a';
    ctx.fillRect(0, GAME.height - 80, GAME.width, 80);

    // Spiked walls
    for (let i = 0; i < GAME.width; i += 40) {
      ctx.fillStyle = '#6a6a6a';
      ctx.fillRect(i, GAME.height - 85, 6, 10);
      ctx.fillStyle = '#8a8a8a';
      ctx.fillRect(i + 2, GAME.height - 89, 2, 6);
    }

    // Crowd (flickering silhouettes in stands)
    for (let i = 0; i < 12; i++) {
      const cx = 30 + i * 78;
      const cy = 30 + Math.sin(i) * 10;
      ctx.fillStyle = `rgba(20, 20, 20, ${0.3 + Math.random() * 0.2})`;
      ctx.fillRect(cx, cy, 12, 20);
      ctx.fillRect(cx + 3, cy - 4, 6, 8);
    }
  },

  renderDarkLibrary(ctx) {
    // Bookshelves
    for (let i = 0; i < 5; i++) {
      const bx = 40 + i * 200;
      const by = 60 + Math.sin(GAME.frameCount * 0.01 + i) * 10;
      ctx.fillStyle = '#2a1a3a';
      ctx.fillRect(bx, by, 16, 50);
      // Book rows
      for (let j = 0; j < 4; j++) {
        ctx.fillStyle = ['#4a3a5a', '#5a4a6a', '#3a2a4a', '#6a5a7a'][j];
        ctx.fillRect(bx + 1, by + 4 + j * 11, 14, 2);
      }
    }

    // Floating pages
    for (let i = 0; i < 6; i++) {
      const px = (i * 160 + GAME.frameCount * 0.2) % GAME.width;
      const py = 80 + Math.sin(GAME.frameCount * 0.03 + i) * 30;
      ctx.fillStyle = 'rgba(100, 200, 100, 0.2)';
      ctx.fillRect(px, py, 6, 8);
    }
  },

  renderVolcano(ctx) {
    // Volcano in background
    const volcanoX = GAME.width / 2;
    ctx.fillStyle = '#1a1008';
    ctx.beginPath();
    ctx.moveTo(volcanoX - 120, GAME.height - 80);
    ctx.lineTo(volcanoX, 40);
    ctx.lineTo(volcanoX + 140, GAME.height - 80);
    ctx.fill();

    // Lava glow at peak
    ctx.fillStyle = 'rgba(255, 60, 0, 0.3)';
    ctx.beginPath();
    ctx.arc(volcanoX, 50, 30, 0, Math.PI * 2);
    ctx.fill();

    // Eruption particles (subtle)
    if (GAME.frameCount % 8 === 0) {
      ParticleSystem.addFireEffect(volcanoX + (Math.random() - 0.5) * 20, 40);
    }
  },

  renderCelestialSpire(ctx) {
    // Starfield
    for (let i = 0; i < 40; i++) {
      const sx = (i * 97) % GAME.width;
      const sy = (i * 53) % (GAME.height - 100);
      const brightness = Math.sin(GAME.frameCount * 0.02 + i) * 0.3 + 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fillRect(sx, sy, 1 + (i % 3), 1 + (i % 3));
    }

    // Floor tiles swap positions every 15 seconds
    const tileShift = Math.floor(GAME.frameCount / 900) % 2; // 15 seconds at 60fps
    for (let i = 0; i < GAME.width; i += 48) {
      const ti = tileShift ? (GAME.width / 48 - 1 - i / 48) : i / 48;
      ctx.fillStyle = ti % 2 === 0 ? '#0a0a2a' : '#1a0a3a';
      ctx.fillRect(i, GAME.height - 80, 48, 80);
    }
  },
};
