// ============================================================
// BOSS 3: THE UNDEAD LICH (Malachar the Eternal) — Floor 15
// Spell rotation, fake casts, teleport, 10-frame vulnerability window
// Enhanced: spread projectile spam, shield phase, death explosion
// ============================================================

class UndeadLich extends Enemy {
  constructor(config = {}) {
    super({
      id: 'lich',
      name: 'Undead Lich Malachar',
      type: 'lich',
      tier: 'boss',
      width: 34,
      height: 50,
      maxHP: 220,
      damage: 16,
      walkSpeed: 0,
      aggression: 90,
      fear: 10,
      greed: 30,
      patience: 100,
      hurtbox: { x: 0, y: 6, w: 34, h: 44 },
      ...config,
    });

    this.floating = true;
    this.floatHeight = 6;
    this.grounded = false;

    // Spell rotation
    this.spellRotation = ['groundSpikes', 'homingSkull', 'lifeDrain'];
    this.currentSpellIndex = 0;
    this.casting = false;
    this.castTimer = 0;
    this.fakeCast = false;
    this.fakeCastFrame = 0;
    this.spellCooldown = 0;
    this.teleportAfterSpells = 0;
    this.hasTeleported = false;

    // Vulnerability
    this.vulnerable = false;
    this.vulnerableWindow = 0;

    // === NEW: Frequent teleport (every 4-6 seconds) ===
    this.teleportTimer = 240 + Math.floor(Math.random() * 120); // 4-6s at 60fps
    this.teleportCooldownMax = 240;

    // === NEW: Spread projectile spam (every 3 seconds) ===
    this.spreadSpamTimer = 180;

    // === NEW: Shield phase ===
    this.shieldPhase = false;
    this.shieldTimer = 0;
    this.shieldTriggered = false;

    // === NEW: Death explosion flag ===
    this._deathExplosionDone = false;
  }

  updateAI() {
    const player = GAME.player;
    if (!player || player.dead) return;

    // Float
    this.y = this.groundY - this.floatHeight + Math.sin(GAME.frameCount * 0.04) * 4;
    this.facingRight = player.x > this.x;

    // === SHIELD PHASE at 50% HP ===
    if (!this.shieldTriggered && this.hp <= this.maxHP * 0.5) {
      this.shieldTriggered = true;
      this.shieldPhase = true;
      this.shieldTimer = 60;
      this.invincible = true;
      this.casting = false;
      this.state = 'idle';
      ParticleSystem.addExplosion(this.x + this.width / 2, this.y + this.height / 2, 30, '#44ffaa');
      SFX.playSpecial('lich');
    }

    if (this.shieldPhase) {
      this.shieldTimer--;
      // Slowly drift during shield phase
      this.x += (player.x > this.x ? 0.3 : -0.3);
      if (this.shieldTimer <= 0) {
        this.shieldPhase = false;
        this.invincible = false;
        this.spellCooldown = 30; // Brief pause after shield
        ParticleSystem.addExplosion(this.x + this.width / 2, this.y + this.height / 2, 20, '#88ffcc');
      }
      return;
    }

    // === FREQUENT TELEPORT (every 4-6 seconds) ===
    this.teleportTimer--;
    if (this.teleportTimer <= 0) {
      this.teleportTimer = 240 + Math.floor(Math.random() * 120);
      this.teleport();
      this.spellCooldown = 25;
      return;
    }

    // === SPREAD PROJECTILE SPAM (every 3 seconds) ===
    this.spreadSpamTimer--;
    if (this.spreadSpamTimer <= 0 && !this.casting) {
      this.spreadSpamTimer = 180;
      this.fireSpreadProjectiles();
      this.spellCooldown = 20;
      return;
    }

    if (this.spellCooldown > 0) {
      this.spellCooldown--;
      return;
    }

    if (this.casting) {
      this.updateCasting();
      return;
    }

    // Teleport after 2 spells
    if (this.teleportAfterSpells >= 2 && !this.hasTeleported) {
      this.teleport();
      return;
    }

    // Decide: cast spell or fake cast
    if (Math.random() < 0.25 && !this.fakeCast) {
      this.startFakeCast();
    } else {
      this.castCurrentSpell();
    }
  }

  /** NEW: Fire 3 homing projectiles in a spread pattern */
  fireSpreadProjectiles() {
    const player = GAME.player;
    if (!player) return;
    this.state = 'attack';
    SFX.playSpecial('lich');

    const cx = this.x + this.width / 2;
    const cy = this.y + this.height / 2;
    const baseAngle = Math.atan2(player.y - cy, player.x - cx);
    const spreadAngle = 0.35; // ~20 degrees between each

    for (let i = -1; i <= 1; i++) {
      const angle = baseAngle + i * spreadAngle;
      CMB.spawnProjectile({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 3,
        vy: Math.sin(angle) * 3,
        w: 8, h: 8,
        damage: 8,
        owner: this,
        ownerIsPlayer: false,
        life: 180,
        color: '#66ff66',
        glow: 'rgba(0, 255, 100, 0.4)',
        homing: true,
        homingTarget: player,
        homingStrength: 0.5,
      });
    }

    // Reset state after brief visual
    setTimeout(() => { if (!this.dead) this.state = 'idle'; }, 200);
  }

  startFakeCast() {
    this.fakeCast = true;
    this.casting = true;
    this.castTimer = 0;
    this.state = 'attack';
  }

  castCurrentSpell() {
    this.casting = true;
    this.castTimer = 0;
    this.fakeCast = false;
    this.state = 'attack';
  }

  updateCasting() {
    this.castTimer++;

    // Fake cast: cancel at frame 14 to bait interrupt
    if (this.fakeCast && this.castTimer >= 14) {
      this.casting = false;
      this.fakeCast = false;
      this.spellCooldown = 20;
      this.state = 'idle';
      return;
    }

    // Real cast: spell executes at frame 15
    if (!this.fakeCast && this.castTimer === 15) {
      // Vulnerable window: frames 15-25
      this.vulnerable = true;
      this.vulnerableWindow = 10;
      this.executeSpell();
    }

    // Recovery
    if (!this.fakeCast && this.castTimer >= 40) {
      this.casting = false;
      this.vulnerable = false;
      this.state = 'idle';
      this.spellCooldown = 30;

      // Advance rotation
      this.currentSpellIndex = (this.currentSpellIndex + 1) % this.spellRotation.length;
      this.teleportAfterSpells++;
    }

    if (this.vulnerableWindow > 0) {
      this.vulnerableWindow--;
      if (this.vulnerableWindow <= 0) this.vulnerable = false;
    }
  }

  executeSpell() {
    const player = GAME.player;
    if (!player) return;

    const spell = this.spellRotation[this.currentSpellIndex];

    switch (spell) {
      case 'groundSpikes':
        // Spikes rise from ground at player position
        for (let i = 0; i < 5; i++) {
          const spikeX = player.x - 40 + i * 20;
          ParticleSystem.addExplosion(spikeX, this.groundY, 10, '#884488');
          // Damage check
          if (Math.abs(player.x - spikeX) < 15 && player.y > this.groundY - 30) {
            player.takeDamage(12, this, null);
          }
        }
        SFX.playSpecial('lich');
        GAME.triggerShake(2, 6);
        break;

      case 'homingSkull':
        CMB.spawnProjectile({
          x: this.x + this.width / 2,
          y: this.y + this.height / 2,
          vx: 2, vy: 0,
          w: 10, h: 10,
          damage: 10,
          owner: this,
          ownerIsPlayer: false,
          life: 200,
          color: '#44ff44',
          glow: 'rgba(0, 255, 100, 0.4)',
          homing: true,
          homingTarget: player,
          homingStrength: 0.8,
        });
        break;

      case 'lifeDrain':
        // Green beam, drains HP
        this.currentAttacks.push(CMB.createAttack(this, {
          startup: 1, active: 20, recovery: 5,
          damage: 2,
          hitbox: { x: 0, y: 20, w: 300, h: 6 },
          knockback: 0, hitstun: 2,
        }));
        // Life drain beam active
        this._lifeDrainActive = 20;
        break;
    }
  }

  teleport() {
    ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#44ff44');

    // Teleport to opposite corner
    const player = GAME.player;
    const corners = [60, GAME.width - 100];
    const targetX = player.x < GAME.width / 2 ? corners[1] : corners[0];
    this.x = targetX;

    this.teleportAfterSpells = 0;
    this.hasTeleported = true;
    ParticleSystem.addTeleportEffect(this.x + this.width / 2, this.y + this.height / 2, '#44ff44');

    // Reset hasTeleported after brief delay
    setTimeout(() => { this.hasTeleported = false; }, 500);
  }

  takeDamage(amount, attacker, attack) {
    // Shield phase: completely invincible
    if (this.shieldPhase) {
      ParticleSystem.addSparks(this.x + this.width / 2, this.y + this.height / 2, 5);
      SFX.playImpact('light');
      return;
    }

    // Fake cast: if player tries to interrupt, they wasted their move
    if (this.fakeCast && this.casting) {
      // Successfully baited!
      return;
    }

    // Real cast: only vulnerable during frames 15-25
    if (this.casting && !this.vulnerable) {
      // Invincible during most of the cast
      ParticleSystem.addSparks(this.x + this.width / 2, this.y + this.height / 2, 3);
      return;
    }

    super.takeDamage(amount, attacker, attack);
  }

  update() {
    super.update();

    // Life drain beam active
    if (this._lifeDrainActive > 0) {
      this._lifeDrainActive--;
      const player = GAME.player;
      if (player && !player.dead) {
        const beamBox = { x: this.x, y: this.y + this.height / 2 - 3, w: GAME.width, h: 6 };
        const playerBox = { x: player.x, y: player.y, w: player.width, h: player.height };
        if (CMB.rectsOverlap(beamBox, playerBox)) {
          player.takeDamage(2, this, null);
          this.hp = Math.min(this.maxHP, this.hp + 2);
        }
      }
    }

    // Death explosion: 8 projectiles in all directions
    if (this.dead && !this._deathExplosionDone) {
      this._deathExplosionDone = true;
      const cx = this.x + this.width / 2;
      const cy = this.y + this.height / 2;
      const player = GAME.player;
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 / 8) * i;
        CMB.spawnProjectile({
          x: cx,
          y: cy,
          vx: Math.cos(angle) * 3.5,
          vy: Math.sin(angle) * 3.5,
          w: 8, h: 8,
          damage: 12,
          owner: this,
          ownerIsPlayer: false,
          life: 120,
          color: '#44ff88',
          glow: 'rgba(0, 255, 100, 0.5)',
        });
      }
      ParticleSystem.addExplosion(cx, cy, 50, '#44ff44');
      GAME.triggerShake(4, 12);
      SFX.playImpact('ko');
      // Reset special states on death
      this.shieldPhase = false;
      this.invincible = false;
      this.casting = false;
    }
  }

  render(ctx) {
    if (this.dead) {
      if (this.deathTimer > 50) return;
      const alpha = 1 - this.deathTimer / 50;
      ctx.globalAlpha = alpha;
      this.renderLich(ctx);
      ctx.globalAlpha = 1;
      return;
    }

    if (this.flashWhite > 0 && this.flashWhite % 2 === 0) {
      ctx.globalAlpha = 0.7;
    }

    this.renderLich(ctx);

    // Green mist floor
    ctx.fillStyle = 'rgba(0, 255, 50, 0.04)';
    ctx.fillRect(0, this.groundY, GAME.width, 60);

    // Floating bookshelves (background)
    for (let i = 0; i < 4; i++) {
      const bx = i * 250 + Math.sin(GAME.frameCount * 0.02 + i) * 40;
      const by = 100 + Math.sin(GAME.frameCount * 0.01 + i * 2) * 20;
      ctx.fillStyle = '#3a2a5a';
      ctx.fillRect(bx, by, 20, 40);
      ctx.fillStyle = '#4a3a6a';
      ctx.fillRect(bx - 2, by - 2, 24, 4);
    }

    // Glowing candles (green)
    for (let i = 0; i < 6; i++) {
      const cx = 100 + i * 150;
      const cy = 40;
      const flame = Math.sin(GAME.frameCount * 0.08 + i) * 2;
      ctx.fillStyle = 'rgba(0, 255, 50, 0.4)';
      ctx.fillRect(cx, cy + flame, 3, 5);
    }

    // Casting visual
    if (this.casting) {
      const glowAlpha = this.fakeCast ? 0.15 : (0.2 + Math.sin(this.castTimer * 0.5) * 0.1);
      ctx.fillStyle = `rgba(0, 255, 50, ${glowAlpha})`;
      ctx.fillRect(this.x - 6, this.y - 6, this.width + 12, this.height + 12);

      // Casting circle
      ctx.strokeStyle = `rgba(0, 255, 50, ${glowAlpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 30 + this.castTimer * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Shield phase visual
    if (this.shieldPhase) {
      const shieldPulse = Math.sin(GAME.frameCount * 0.15) * 0.2 + 0.5;
      ctx.strokeStyle = `rgba(100, 255, 200, ${shieldPulse})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = `rgba(100, 255, 200, ${shieldPulse * 0.15})`;
      ctx.fillRect(this.x - 8, this.y - 8, this.width + 16, this.height + 16);
    }

    // Vulnerable window visual
    if (this.vulnerable) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(this.x - 2, this.y - 2, this.width + 4, this.height + 4);
    }

    ctx.globalAlpha = 1;
  }

  renderLich(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Robes (purple, tattered)
    ctx.fillStyle = '#3a1a5a';
    ctx.fillRect(x + 2, y + 12, this.width - 4, this.height - 12);

    // Robe details
    ctx.fillStyle = '#4a2a6a';
    ctx.fillRect(x + 4, y + 20, this.width - 8, 2);
    ctx.fillRect(x + 4, y + 32, this.width - 8, 2);

    // Skeletal body (blackened)
    ctx.fillStyle = '#2a2a2a';
    ctx.fillRect(x + this.width / 2 - 5, y + 8, 10, 16);

    // Skull
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(x + this.width / 2 - 6, y - 4, 12, 12);

    // Bottomless green fire eyes
    ctx.fillStyle = '#00ff44';
    ctx.fillRect(x + this.width / 2 - 4, y, 3, 3);
    ctx.fillRect(x + this.width / 2 + 2, y, 3, 3);
    const eyeGlow = Math.sin(GAME.frameCount * 0.1) * 0.2 + 0.5;
    ctx.fillStyle = `rgba(0, 255, 100, ${eyeGlow})`;
    ctx.fillRect(x + this.width / 2 - 5, y - 1, 5, 5);
    ctx.fillRect(x + this.width / 2 + 1, y - 1, 5, 5);

    // Crown of jagged ice
    ctx.fillStyle = '#88ccff';
    ctx.fillRect(x + this.width / 2 - 8, y - 9, 4, 7);
    ctx.fillRect(x + this.width / 2 - 4, y - 11, 3, 9);
    ctx.fillRect(x + this.width / 2, y - 10, 3, 8);
    ctx.fillRect(x + this.width / 2 + 4, y - 8, 4, 6);

    // Golden amulet
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + this.width / 2 - 3, y + 22, 6, 6);
    ctx.fillRect(x + this.width / 2 - 1, y + 28, 2, 6);
  }

  die() {
    super.die();
    // Green fire dims and goes out
    this._lichDeath = true;
    // Reset special states
    this.shieldPhase = false;
    this.invincible = false;
    this.casting = false;
  }
};
