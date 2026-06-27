// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Core Engine
// Locked 60 FPS game loop, state management, rendering pipeline
// ============================================================

const GAME = {
  // Canvas
  canvas: null,
  ctx: null,
  width: 960,
  height: 540,

  // Frame timing — Fixed-timestep with interpolation
  FPS: 60,
  FIXED_DT: 1000 / 60, // ~16.67ms — physics always runs at this rate
  frameCount: 0,
  lastFrameTime: 0,
  deltaTime: 0,
  accumulator: 0,
  renderAlpha: 0, // 0-1 interpolation factor for rendering between physics steps

  // Game state
  state: 'MENU', // MENU | CHAR_SELECT | PLAYING | PAUSED | BONFIRE | VICTORY | DEFEAT | CONTINUE
  floor: 1,
  score: 0,
  soulShards: 0,

  // Player & enemies
  player: null,
  enemies: [],
  boss: null,

  // Systems (initialized by their respective modules)
  input: null,
  camera: null,
  audio: null,
  combat: null,
  particles: null,
  tower: null,
  hud: null,
  menu: null,
  screens: null,

  // Flags
  debug: false,
  paused: false,

  // Screen effects
  screenShake: { x: 0, y: 0, duration: 0, intensity: 0 },
  screenFlash: { color: null, duration: 0, alpha: 0 },
  hitstop: { active: false, remaining: 0 },

  init() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    // Disable right-click
    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    // Initialize subsystems
    InputSystem.init();
    CameraSystem.init();
    AudioSystem.init();
    ParticleSystem.init();
    CombatSystem.init();
    TowerSystem.init();
    HUDSystem.init();
    MenuSystem.init();
    ScreenSystem.init();

    // Start game loop
    this.lastFrameTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  },

  loop(timestamp) {
    requestAnimationFrame(t => this.loop(t));

    // Calculate delta, cap to prevent spiral of death (max 100ms = ~6 physics steps)
    const frameTime = Math.min(timestamp - this.lastFrameTime, 100);
    this.lastFrameTime = timestamp;
    this.deltaTime = frameTime;

    // Fixed-timestep accumulator: physics always runs at exactly 60Hz
    this.accumulator += frameTime;

    while (this.accumulator >= this.FIXED_DT) {
      this.frameCount++;

      // Process hitstop first — freeze everything during impact
      if (this.hitstop.remaining > 0) {
        this.hitstop.remaining--;
        this.accumulator -= this.FIXED_DT;
        continue;
      }

      this.update();
      this.accumulator -= this.FIXED_DT;
    }

    // Interpolation factor: how far between physics steps are we?
    this.renderAlpha = this.accumulator / this.FIXED_DT;
    this.render();
  },

  update() {
    // Update input buffer (always runs, even during pauses, for menu navigation)
    InputSystem.update();

    switch (this.state) {
      case 'MENU':
        MenuSystem.update();
        break;
      case 'CHAR_SELECT':
        MenuSystem.updateCharSelect();
        break;
      case 'PLAYING':
        this.updateGameplay();
        break;
      case 'BONFIRE':
        MenuSystem.updateBonfire();
        break;
      case 'VICTORY':
        ScreenSystem.updateVictory();
        break;
      case 'DEFEAT':
        ScreenSystem.updateDefeat();
        break;
      case 'CONTINUE':
        ScreenSystem.updateContinue();
        break;
    }

    // Update particles always
    ParticleSystem.update();

    // Update camera
    CameraSystem.update();
  },

  updateGameplay() {
    if (!this.player) return;

    // Update player
    this.player.update();

    // Update enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      this.enemies[i].update();
      if (this.enemies[i].dead && this.enemies[i].deathAnimComplete) {
        this.enemies.splice(i, 1);
      }
    }

    // Update boss if present
    if (this.boss && !this.boss.dead) {
      this.boss.update();
    }

    // Check floor clear condition
    this.checkFloorClear();

    // Update HUD
    HUDSystem.update();
  },

  checkFloorClear() {
    if (this.boss && this.boss.dead && this.boss.deathAnimComplete) {
      // Boss defeated — advance
      this.boss = null;
      this.enemies = [];
      if (this.floor >= 25) {
        this.state = 'VICTORY';
        ScreenSystem.initVictory();
      } else {
        TowerSystem.advanceFloor();
      }
    } else if (!this.boss && this.enemies.length === 0) {
      // All enemies cleared
      TowerSystem.checkNextWave();
    }
  },

  render() {
    const ctx = this.ctx;
    const cam = CameraSystem;

    ctx.save();

    // Apply screen shake
    if (this.screenShake.duration > 0) {
      ctx.translate(this.screenShake.x, this.screenShake.y);
    }

    // Clear
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, this.width, this.height);

    switch (this.state) {
      case 'MENU':
        MenuSystem.render(ctx);
        break;
      case 'CHAR_SELECT':
        MenuSystem.renderCharSelect(ctx);
        break;
      case 'PLAYING':
      case 'PAUSED':
        this.renderGameplay(ctx);
        HUDSystem.render(ctx);
        break;
      case 'BONFIRE':
        TowerSystem.renderBonfire(ctx);
        MenuSystem.renderBonfire(ctx);
        break;
      case 'VICTORY':
        ScreenSystem.renderVictory(ctx);
        break;
      case 'DEFEAT':
        ScreenSystem.renderDefeat(ctx);
        break;
      case 'CONTINUE':
        ScreenSystem.renderContinue(ctx);
        break;
    }

    // Render particles on top of everything
    ParticleSystem.render(ctx);

    // Screen flash overlay
    if (this.screenFlash.duration > 0) {
      ctx.fillStyle = this.screenFlash.color;
      ctx.globalAlpha = this.screenFlash.alpha;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.globalAlpha = 1;
    }

    // Screen effects (CRT scanlines, vignette, chromatic aberration)
    AN.applyScreenEffects(ctx, this.width, this.height,
      this.player ? this.player.hp : 100,
      this.player ? this.player.maxHP : 100);

    ctx.restore();

    // Debug overlay
    if (this.debug) {
      this.renderDebug(ctx);
    }
  },

  renderGameplay(ctx) {
    const alpha = this.renderAlpha;

    // Render background / floor
    TowerSystem.renderFloor(ctx);

    // Render enemies
    for (const enemy of this.enemies) {
      if (!enemy.dead || !enemy.deathAnimComplete) {
        enemy.render(ctx, alpha);
      }
    }

    // Render boss
    if (this.boss && (!this.boss.dead || !this.boss.deathAnimComplete)) {
      this.boss.render(ctx, alpha);
    }

    // Render player
    if (this.player) {
      this.player.render(ctx, alpha);
    }

    // Render projectiles
    CombatSystem.render(ctx, alpha);
  },

  renderDebug(ctx) {
    ctx.fillStyle = '#0f0';
    ctx.font = '10px monospace';
    ctx.fillText(`FPS: ${Math.round(1000 / Math.max(this.deltaTime, 1))}`, 10, 20);
    ctx.fillText(`Frame: ${this.frameCount}`, 10, 32);
    ctx.fillText(`State: ${this.state}`, 10, 44);
    ctx.fillText(`Floor: ${this.floor}`, 10, 56);
    ctx.fillText(`Hitstop: ${this.hitstop.remaining}`, 10, 68);

    // Render hitboxes in debug
    if (this.player) {
      const p = this.player;
      ctx.strokeStyle = '#0f0';
      ctx.strokeRect(p.hurtbox.x, p.hurtbox.y, p.hurtbox.w, p.hurtbox.h);

      if (p.currentHitbox) {
        ctx.strokeStyle = '#f00';
        const hb = p.currentHitbox;
        ctx.strokeRect(hb.x, hb.y, hb.w, hb.h);
      }
    }

    for (const enemy of this.enemies) {
      if (!enemy.dead) {
        ctx.strokeStyle = '#ff0';
        ctx.strokeRect(enemy.hurtbox.x, enemy.hurtbox.y, enemy.hurtbox.w, enemy.hurtbox.h);
      }
    }
  },

  // Trigger hitstop (freeze frames on impact)
  triggerHitstop(frames) {
    this.hitstop.active = true;
    this.hitstop.remaining = frames;
  },

  // Trigger screen shake
  triggerShake(intensity, duration) {
    this.screenShake.intensity = intensity;
    this.screenShake.duration = duration;
  },

  // Trigger screen flash
  triggerFlash(color, duration, alpha = 0.3) {
    this.screenFlash.color = color;
    this.screenFlash.duration = duration;
    this.screenFlash.alpha = alpha;
  },

  // Start a new game
  startGame(characterType) {
    this.floor = 1;
    this.score = 0;
    this.soulShards = 0;
    this.state = 'PLAYING';

    // Create player based on character type
    this.player = CharacterFactory.create(characterType);

    // Load first floor
    TowerSystem.loadFloor(1);
  }
};

// ============================================================
// Camera System
// ============================================================
const CameraSystem = {
  x: 0, y: 0,
  targetX: 0, targetY: 0,

  init() {
    this.x = 0;
    this.y = 0;
  },

  update() {
    // Screen shake decay
    const shake = GAME.screenShake;
    if (shake.duration > 0) {
      shake.x = (Math.random() * 2 - 1) * shake.intensity;
      shake.y = (Math.random() * 2 - 1) * shake.intensity;
      shake.duration--;
      if (shake.duration <= 0) {
        shake.x = 0;
        shake.y = 0;
      }
    }

    // Smooth camera follow
    if (GAME.player) {
      this.targetX = GAME.player.x - GAME.width / 2 + GAME.player.width / 2;
      this.targetY = GAME.player.y - GAME.height / 2 + GAME.player.height / 2;
    }

    this.x += (this.targetX - this.x) * 0.1;
    this.y += (this.targetY - this.y) * 0.1;
  }
};

// Initialize on load
window.addEventListener('load', () => GAME.init());
