// ============================================================
// BOSS 2: THE ORC WARLORD (Grommash the Wall) — Floor 10
// Patient, Super Armor on all attacks, parry-able 3-hit combo
// ============================================================

class OrcWarlord extends Enemy {
  constructor(config = {}) {
    super({
      id: 'orc_warlord',
      name: 'Orc Warlord Grommash',
      type: 'orc_warlord',
      tier: 'boss',
      width: 56,
      height: 60,
      maxHP: 280,
      damage: 18,
      walkSpeed: 1.0,
      aggression: 80,
      fear: 0,
      greed: 20,
      patience: 95,
      hurtbox: { x: 0, y: 0, w: 56, h: 60 },
      ...config,
    });

    this.superArmor = true;       // 50% damage, no flinch during attacks
    this.comboPhase = 0;          // 0=idle, 1-3=combo hits
    this.comboTimer = 0;
    this.parriedWindow = false;   // Frame where parry staggers
    this.parried = false;
    this.staggerTimer = 0;
    this.tauntCount = 0;

    // Crowd reaction (they cheer/boo)
    this.crowdMood = 0; // -100 to 100
  }

  updateAI() {
    if (this.dead) return;

    if (this.staggerTimer > 0) {
      this.staggerTimer--;
      if (this.staggerTimer <= 0) {
        this.parried = false;
      }
      return;
    }

    const player = GAME.player;
    if (!player || player.dead) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // Patient: waits for player to spam, then punishes
    if (this.comboPhase > 0) {
      this.executeCombo();
      return;
    }

    if (dist < 80 && this.attackCooldown <= 0) {
      this.startCombo();
    } else if (dist > 80) {
      // Slow advance
      this.x += this.facingRight ? this.walkSpeed : -this.walkSpeed;
      this.state = 'walk';
    } else {
      this.state = 'idle';
    }

    // Crowd reaction
    this.crowdMood *= 0.99; // Decay
  }

  startCombo() {
    this.comboPhase = 1;
    this.comboTimer = 0;
    this.attackCooldown = 60;
    this.state = 'attack';
  }

  executeCombo() {
    this.comboTimer++;

    switch (this.comboPhase) {
      case 1: // First swing
        if (this.comboTimer === 18) {
          // Active frames
          this.checkHitPlayer(15, 6);
        }
        if (this.comboTimer >= 35) {
          this.comboPhase = 2;
          this.comboTimer = 0;
        }
        break;
      case 2: // Second swing
        if (this.comboTimer === 15) {
          this.checkHitPlayer(15, 5);
        }
        if (this.comboTimer >= 30) {
          this.comboPhase = 3;
          this.comboTimer = 0;
          this.parriedWindow = true; // 3rd hit can be parried
        }
        break;
      case 3: // Third swing (parriable at frames 10-18)
        if (this.comboTimer === 10) {
          this.parriedWindow = true;
        }
        if (this.comboTimer === 18 && this.parriedWindow) {
          this.parriedWindow = false;
        }
        if (this.comboTimer === 20) {
          this.checkHitPlayer(22, 10);
          this.parriedWindow = false;
        }
        if (this.comboTimer >= 40) {
          this.comboPhase = 0;
          this.comboTimer = 0;
          this.state = 'idle';
          this.parriedWindow = false;
        }
        break;
    }
  }

  checkHitPlayer(damage, knockback) {
    const player = GAME.player;
    if (!player || player.dead) return;

    const hitbox = {
      x: this.x + (this.facingRight ? this.width : -30),
      y: this.y + 10,
      w: 40,
      h: 30,
    };
    const hurtbox = {
      x: player.x,
      y: player.y,
      w: player.width,
      h: player.height,
    };

    if (CMB.rectsOverlap(hitbox, hurtbox)) {
      // Check for parry: if player attacks during 3rd hit's parry window
      if (this.parriedWindow && this.comboPhase === 3 &&
          player.currentAttacks.length > 0) {
        this.getParried();
        return;
      }
      player.takeDamage(damage, this, null);
      GAME.triggerShake(3, 8);
      this.crowdMood += 20; // Crowd cheers
      SFX.playImpact('heavy');
    }
  }

  getParried() {
    this.parried = true;
    this.staggerTimer = 60;
    this.comboPhase = 0;
    this.state = 'hitstun';
    this.crowdMood -= 40; // Crowd boos
    GAME.triggerHitstop(14);
    GAME.triggerFlash('rgba(255, 255, 0, 0.3)', 8);
    SFX.playImpact('counter');
  }

  takeDamage(amount, attacker, attack) {
    if (this.dead || this.invincible) return;

    // Super Armor: 50% damage, no flinch during attacks
    if (this.comboPhase > 0 && !this.parried) {
      amount *= 0.5;
      this.hp -= amount;
      this.flashWhite = 3;
      // No hitstun - keeps attacking
      if (this.hp <= 0) {
        this.hp = 0;
        this.dead = true;
        this.die();
      }
      return;
    }

    super.takeDamage(amount, attacker, attack);
  }

  die() {
    super.die();
    this.crowdMood = -100;
  }

  render(ctx) {
    if (this.dead) {
      if (this.deathTimer > 60) return;
      const alpha = 1 - this.deathTimer / 60;
      ctx.globalAlpha = alpha;
    }

    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(x + 4, y + this.height - 3, this.width - 8, 5);

    // Legs
    ctx.fillStyle = '#5a7a4a';
    ctx.fillRect(x + 10, y + this.height - 22, 12, 22);
    ctx.fillRect(x + this.width - 22, y + this.height - 22, 12, 22);

    // Body
    ctx.fillStyle = '#7a9a6a';
    ctx.fillRect(x + 6, y + 14, this.width - 12, this.height - 38);

    // Iron spiked pauldrons
    ctx.fillStyle = '#6a6a6a';
    ctx.fillRect(x, y + 8, this.width, 12);
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(x + 2 + i * 12, y + 4, 3, 6);
    }

    // Chest armor
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(x + 10, y + 20, this.width - 20, 16);

    // Head
    ctx.fillStyle = '#7a9a6a';
    ctx.fillRect(x + this.width / 2 - 10, y - 8, 20, 22);

    // Broken tusks (yellow, thick)
    ctx.fillStyle = '#ddcc88';
    ctx.fillRect(x + this.width / 2 - 6, y + 6, 5, 8);
    ctx.fillRect(x + this.width / 2 + 6, y + 6, 4, 7);

    // Eyes (glowing red)
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x + this.width / 2 - 6, y + 1, 3, 3);
    ctx.fillRect(x + this.width / 2 + 3, y + 1, 3, 3);

    // Two-handed axe
    const axeX = x + (this.facingRight ? this.width : -20);
    ctx.fillStyle = '#5a5a5a';
    ctx.fillRect(axeX, y + 4, 5, 40);
    ctx.fillStyle = '#7a7a7a';
    ctx.fillRect(axeX - 6, y - 2, 17, 14);

    // Super armor glow
    if (this.comboPhase > 0 && !this.parried) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.15)';
      ctx.fillRect(x - 4, y - 4, this.width + 8, this.height + 8);
    }

    // Parried state
    if (this.parried) {
      ctx.fillStyle = 'rgba(255, 255, 0, 0.2)';
      ctx.fillRect(x - 4, y - 4, this.width + 8, this.height + 8);
    }

    ctx.globalAlpha = 1;

    // Crowd silhouettes (in colosseum background)
    if (GAME.state === 'PLAYING') {
      ctx.fillStyle = `rgba(0,0,0,${0.15 + this.crowdMood * 0.001})`;
      for (let i = 0; i < 8; i++) {
        const cx = 50 + i * 120;
        if (Math.abs(this.crowdMood) > 30) {
          // Arms raised
          ctx.fillRect(cx, 30, 8, 16);
          ctx.fillRect(cx - 4, 38, 6, 3);
          ctx.fillRect(cx + 6, 38, 6, 3);
        } else {
          ctx.fillRect(cx, 30, 8, 16);
        }
      }
    }
  }
};
