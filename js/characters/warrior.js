// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — THE WARRIOR (Codename: Barrage)
// The Unstoppable Rage — whirlwind, colossal slam, bloodrage
// ============================================================

class Warrior extends Character {
  constructor(config = {}) {
    super({
      id: 'warrior',
      name: 'The Warrior',
      type: 'warrior',
      width: 42,
      height: 56,
      walkSpeed: 3.0,
      accelFrames: 8,
      decelFrames: 15, // Heavy — slides after dashing
      airControl: 0.5,
      jumpVelocity: -12,
      maxHP: 130,
      baseDamage: 15,
      hurtbox: { x: 0, y: 0, w: 42, h: 56 },
      hiddenAbilityHP: 0.01, // 1% HP trigger
      ...config,
    });

    // Visual state
    this.tattooGlow = 0;
    this.rageEyes = false;
    this.beardWave = 0;
    this.spitTimer = 0;
    this.neckCrackTimer = 0;
    this.axeScrapeTimer = 0;

    // Bloodrage state
    this.bloodrageActive = false;
    this.bloodrageTimer = 0;
    this.canBlock = true;

    // Whirlwind state
    this.whirlwindActive = false;
    this.whirlwindHitCount = 0;

    // Colossal slam state
    this.slamActive = false;
    this.leapingUp = false;
    this.crashingDown = false;
  }

  getLightAttackConfig() {
    return {
      startup: 5, active: 3, recovery: 8, damage: 10,
      hitbox: { x: 30, y: 8, w: 30, h: 22 },
      knockback: 4, hitstun: 14,
      whooshFrame: 3,
    };
  }

  getHeavyAttackConfig() {
    return {
      startup: 13, active: 8, recovery: 21, damage: 22,
      hitbox: { x: 32, y: 5, w: 38, h: 32 },
      knockback: 10, hitstun: 24,
      whooshFrame: 9,
    };
  }

  // Whirlwind (Special): 12f startup, 20f active, continuous spinning hitbox
  getSpecialAttackConfig() {
    // If holding up, Colossal Slam instead
    if (IN.isBuffered('UP', 8)) {
      return {
        startup: 8, active: 6, recovery: 15, damage: 25,
        hitbox: { x: -20, y: -10, w: 82, h: 40 }, // 100px radius shockwave
        knockback: 8, hitstun: 22,
        whooshFrame: 5,
        animData: 'colossalSlam',
      };
    }

    return {
      startup: 12, active: 20, recovery: 15, damage: 5,
      hitbox: { x: 10, y: -10, w: 60, h: 60 }, // Wide spinning hitbox
      knockback: 2, hitstun: 10,
      whooshFrame: 8,
      animData: 'whirlwind',
    };
  }

  getGrabConfig() {
    return {
      startup: 8, active: 3, recovery: 16, damage: 14,
      hitbox: { x: 15, y: 5, w: 22, h: 30 },
      knockback: 5, hitstun: 16,
      isGrab: true,
    };
  }

  // --- MOVEMENT (Heavy, stomping) ---

  updateMovement() {
    if (this.bloodrageActive) {
      this.updateBloodrage();
      return;
    }

    if (this.slamActive) {
      this.updateColossalSlam();
      return;
    }

    super.updateMovement();

    // Footsteps: each step causes 1px screen shake
    if (this.grounded && Math.abs(this.currentSpeed) > 0.5 && GAME.frameCount % 15 === 0) {
      GAME.triggerShake(1, 1);
    }

    // Slide after dash (risk/reward trade-off per design doc)
    if (Math.abs(this.currentSpeed) > 0.1 && IN.direction.x === 0 && this.grounded) {
      // Natural decel is slower (15 frames per design doc) — creates slide
    }
  }

  updateBloodrage() {
    this.bloodrageTimer--;

    // Always walk forward, cannot block
    this.currentSpeed = this.facingRight ? this.walkSpeed * 1.3 : -this.walkSpeed * 1.3;
    this.x += this.currentSpeed;
    this.x = Math.max(0, Math.min(this.x, GAME.width - this.width));

    // Auto-attack when near enemy
    const targets = [...GAME.enemies];
    if (GAME.boss && !GAME.boss.dead) targets.push(GAME.boss);

    for (const target of targets) {
      if (!target || target.dead) continue;
      const dist = Math.abs(target.x - this.x);
      if (dist < 60 && this.attackCooldown <= 0 && this.state !== 'attack') {
        this.heavyAttack();
        this.attackCooldown = 10;
        break;
      }
    }

    // Tattoo glow
    this.tattooGlow = Math.sin(this.animFrame * 0.2) * 0.4 + 0.6;

    if (this.bloodrageTimer <= 0) {
      this.bloodrageActive = false;
      this.rageEyes = false;
      this.tattooGlow = 0;
      this.canBlock = true;
    }
  }

  updateColossalSlam() {
    this.slamTimer--;
    if (this.leapingUp) {
      this.y -= 3;
      if (this.y < this.groundY - 15) {
        this.leapingUp = false;
        this.crashingDown = true;
      }
    } else if (this.crashingDown) {
      this.y += 8;
      if (this.y >= this.groundY) {
        this.y = this.groundY;
        this.crashingDown = false;
        this.slamActive = false;

        // Impact!
        GAME.triggerHitstop(4);
        GAME.triggerShake(4, 10);
        SFX.playImpact('heavy');

        // Shockwave damage in 100px radius
        const slamX = this.x + this.width / 2;
        const slamY = this.groundY;
        CMB.addExplosion(slamX, slamY, 100, 25, this, true);

        // Shockwave visual
        ParticleSystem.addDustPuff(slamX, slamY, 20);
        ParticleSystem.addExplosion(slamX, slamY, 50, '#ff8800');
      }
    }
  }

  // --- SPECIAL ATTACKS ---

  specialAttack() {
    if (this.specialCooldown > 0) return;

    const config = this.getSpecialAttackConfig();
    const attack = this.startAttack(config);

    if (attack) {
      this.specialCooldown = 50;

      if (config.animData === 'whirlwind') {
        this.whirlwindActive = true;
        this.whirlwindHitCount = 0;
        // Pull enemies in from 80px away (vortex)
        this.startWhirlwindVortex();
      } else if (config.animData === 'colossalSlam') {
        this.slamActive = true;
        this.leapingUp = true;
        this.crashingDown = false;
        this.slamTimer = 30;
      }
    }

    return attack;
  }

  startWhirlwindVortex() {
    // Apply vortex pull to nearby enemies every few frames
    const pullInterval = setInterval(() => {
      if (!this.whirlwindActive) {
        clearInterval(pullInterval);
        return;
      }

      const targets = [...GAME.enemies];
      if (GAME.boss && !GAME.boss.dead) targets.push(GAME.boss);

      for (const target of targets) {
        if (!target || target.dead) continue;
        const dx = (this.x + this.width / 2) - (target.x + target.width / 2);
        const dy = (this.y + this.height / 2) - (target.y + target.height / 2);
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 80 && dist > 10) {
          target.x += (dx / dist) * 3;
          target.y += (dy / dist) * 1.5;
        }
      }
    }, 50);

    setTimeout(() => {
      this.whirlwindActive = false;
      clearInterval(pullInterval);
    }, 333); // 20 frames
  }

  updateAttacking() {
    if (this.currentAttacks.length > 0) {
      const atk = this.currentAttacks[0];

      if (atk.animData === 'whirlwind') {
        // Apply damage every 5 frames (4 hits total in 20 frames)
        if (atk.phase === 'active' && atk.currentFrame % 5 === 0) {
          this.whirlwindHitCount++;
          const targets = [...GAME.enemies];
          if (GAME.boss && !GAME.boss.dead) targets.push(GAME.boss);

          for (const target of targets) {
            if (!target || target.dead) continue;
            if (Math.abs(target.x - this.x) < 80 && Math.abs(target.y - this.y) < 60) {
              target.takeDamage(5, this, atk);
            }
          }
        }
        if (atk.phase === 'recovery') {
          this.whirlwindActive = false;
        }
      }
    }
  }

  // --- HIDDEN ABILITY: Bloodrage ---
  // At 1% HP: health bar locks, cannot die for 10 seconds, cannot block, walks forward

  activateHiddenAbility() {
    super.activateHiddenAbility();
    this.bloodrageActive = true;
    this.bloodrageTimer = 600; // 10 seconds (600 frames)
    this.rageEyes = true;
    this.canBlock = false;
    this.hiddenAbilityTimer = 600;
    this.hiddenAbilityActive = true;

    // Health locking is handled in takeDamage
    this._bloodrageHP = this.hp;

    SFX.playSpecial('warrior');
  }

  deactivateHiddenAbility() {
    super.deactivateHiddenAbility();
    this.bloodrageActive = false;
    this.rageEyes = false;
    this.canBlock = true;
    this.tattooGlow = 0;

    // Collapse from exhaustion
    this.state = 'dead';
    this.poseTimer = 0;
  }

  takeDamage(amount, attacker, attack) {
    // Bloodrage: health bar locks — cannot die
    if (this.bloodrageActive) {
      // Still take damage but can't go below 1
      this.hp = Math.max(1, this.hp - amount * 0.5);
      this.flashWhite = 4;
      ParticleSystem.addBloodSplatter(this.x + this.width / 2, this.y + this.height * 0.3, 3);
      return;
    }

    super.takeDamage(amount, attacker, attack);
  }

  getFootstepWeight() { return 'heavy'; }

  isBlocking() {
    if (this.bloodrageActive) return false;
    return super.isBlocking();
  }

  // --- RENDERING ---

  renderCharacter(ctx, x, y) {
    // Heavy shadow
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(x - 2, y + this.height - 3, this.width + 4, 6);

    // Legs (tree trunks)
    ctx.fillStyle = '#6a4a3a';
    ctx.fillRect(x + 8, y + this.height - 22, 10, 22);
    ctx.fillRect(x + this.width - 18, y + this.height - 22, 10, 22);

    // Boots (heavy)
    ctx.fillStyle = '#3a2a1a';
    ctx.fillRect(x + 7, y + this.height - 2, 12, 4);
    ctx.fillRect(x + this.width - 19, y + this.height - 2, 12, 4);

    // Body (bare chest, scar tissue)
    ctx.fillStyle = '#c4956b';
    ctx.fillRect(x + 6, y + 10, this.width - 12, this.height - 34);

    // Ritual tattoos that glow orange when angry
    if (this.tattooGlow > 0) {
      ctx.fillStyle = `rgba(255, 100, 0, ${this.tattooGlow})`;
    } else {
      ctx.fillStyle = '#8a5030';
    }
    // Tattoo lines
    ctx.fillRect(x + 10, y + 16, this.width - 20, 2);
    ctx.fillRect(x + 10, y + 22, this.width - 20, 2);
    ctx.fillRect(x + 14, y + 26, this.width - 28, 2);
    // Angular symbol
    ctx.fillRect(x + this.width / 2 - 3, y + 14, 6, 10);
    ctx.fillRect(x + this.width / 2 - 1, y + 12, 2, 14);

    // Scar tissue
    ctx.fillStyle = '#b08060';
    ctx.fillRect(x + 8, y + 20, 3, 8);
    ctx.fillRect(x + this.width - 12, y + 15, 4, 12);

    // Arms (massive)
    ctx.fillStyle = '#c4956b';
    ctx.fillRect(x + 2, y + 14, 8, 16);
    ctx.fillRect(x + this.width - 10, y + 14, 8, 16);

    // Fists gripping axes (always visible)
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(x + 2, y + 28, 10, 8);
    ctx.fillRect(x + this.width - 12, y + 28, 10, 8);

    // Head
    ctx.fillStyle = '#c4956b';
    ctx.fillRect(x + this.width / 2 - 6, y - 4, 12, 12);

    // Shaved head
    ctx.fillStyle = '#a08060';
    ctx.fillRect(x + this.width / 2 - 6, y - 6, 12, 4);

    // Tangled beard
    ctx.fillStyle = '#6a4a30';
    const beardWave = Math.sin(this.animFrame * 0.15);
    ctx.fillRect(x + this.width / 2 - 4, y + 6 + beardWave, 8, 6);

    // Rage eyes
    if (this.rageEyes) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x + this.width / 2 - 3, y, 3, 2);
      ctx.fillRect(x + this.width / 2 + 1, y, 3, 2);
    } else {
      ctx.fillStyle = '#3a2010';
      ctx.fillRect(x + this.width / 2 - 3, y, 3, 2);
      ctx.fillRect(x + this.width / 2 + 1, y, 3, 2);
    }

    // Pixelated veins on forehead (when angry)
    if (this.tattooGlow > 0.3 || this.rageEyes) {
      ctx.fillStyle = `rgba(255, 0, 0, ${this.tattooGlow * 0.5})`;
      ctx.fillRect(x + this.width / 2 - 4, y - 5, 2, 2);
      ctx.fillRect(x + this.width / 2 + 2, y - 4, 2, 2);
    }

    // Axes (both hands)
    // Left axe
    ctx.fillStyle = '#808080';
    ctx.fillRect(x + 2, y + 8, 3, 22);
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(x - 4, y - 4, 12, 14);

    // Right axe
    ctx.fillStyle = '#808080';
    ctx.fillRect(x + this.width - 5, y + 8, 3, 22);
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(x + this.width - 8, y - 4, 12, 14);

    // Whirlwind visual
    if (this.whirlwindActive) {
      const vortexAlpha = 0.3 + Math.sin(this.animFrame * 0.5) * 0.1;
      ctx.fillStyle = `rgba(255, 150, 50, ${vortexAlpha})`;
      ctx.beginPath();
      ctx.arc(x + this.width / 2, y + this.height / 2, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    // Idle habits from design doc
    if (this.state === 'idle') {
      // Spit
      this.spitTimer++;
      if (this.spitTimer > 200) {
        this.spitTimer = 0;
      }
      if (this.spitTimer < 5) {
        ctx.fillStyle = '#aaa';
        ctx.fillRect(x + this.width / 2 + 4, y + 4, 2, 2);
      }

      // Neck crack
      this.neckCrackTimer++;
      if (this.neckCrackTimer > 250) {
        this.neckCrackTimer = 0;
      }
      if (this.neckCrackTimer < 3) {
        // 3-pixel upward jerk
        ctx.fillStyle = '#c4956b';
        ctx.fillRect(x + this.width / 2 - 5, y - 7, 11, 12);
      }

      // Axe scrape on floor
      if (GAME.frameCount % 120 < 3) {
        ParticleSystem.addSparks(x + 2, y + this.height, 2);
      }
    }

    // Heavy breathing with pixelated veins
    if (this.state === 'idle' || this.state === 'walk') {
      const breathIntensity = this.rageEyes ? 2 : 1;
      if (this.breathPhase === 0) {
        ctx.fillRect(x + this.width / 2 - 4, y + this.height - 34 + breathIntensity, this.width - 16, breathIntensity);
      }
    }
  }

  // Victory: plants axe, throws fists up, bellows, picks up enemy body and shakes it
  renderVictoryPose(ctx, x, y, timer) {
    this.renderCharacter(ctx, x, y);
    if (timer > 20 && timer < 40) {
      // Arms raised
      ctx.fillStyle = '#c4956b';
      ctx.fillRect(x + 2, y - 10, 8, 16);
      ctx.fillRect(x + this.width - 10, y - 10, 8, 16);
    }
  }

  die() {
    super.die();
    this.rageEyes = false;
    this.tattooGlow = 0;
  }
};
