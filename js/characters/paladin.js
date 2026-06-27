// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — THE PALADIN (Codename: Wrecking Ball)
// The Righteous Storm — mounted combat, holy stampede, aegis aura, last vigil
// ============================================================

class Paladin extends Character {
  constructor(config = {}) {
    super({
      id: 'paladin',
      name: 'The Paladin',
      type: 'paladin',
      width: 48,  // Wider due to horse
      height: 54,
      walkSpeed: 3.2,
      accelFrames: 8,
      decelFrames: 10,
      airControl: 0.5,
      jumpVelocity: -9,
      maxHP: 110,
      baseDamage: 11,
      hurtbox: { x: 0, y: 0, w: 48, h: 54 },
      hiddenAbilityHP: 0.15,
      ...config,
    });

    this.mounted = true;
    this.chargeActive = false;
    this.chargeRecovery = 0;
    this.aegisActive = false;
    this.aegisTimer = 0;
    this.cantabrianCircle = 0; // Turning animation
    this.horseLegPhase = 0;
    this.steamBurst = 0;

    // Last Vigil state
    this.dismounted = false;
    this.vigilTimer = 0;
    this.horseReturnTimer = 0;
    this.flailEquipped = false;
  }

  getLightAttackConfig() {
    return {
      startup: 5, active: 3, recovery: 8, damage: 8,
      hitbox: { x: 36, y: 8, w: 30, h: 22 }, // Lance poke
      knockback: 3, hitstun: 12,
      whooshFrame: 3,
    };
  }

  getHeavyAttackConfig() {
    return {
      startup: 12, active: 6, recovery: 20, damage: 16,
      hitbox: { x: 38, y: 5, w: 34, h: 28 }, // Heavy lance thrust
      knockback: 7, hitstun: 20,
      whooshFrame: 8,
    };
  }

  // Holy Stampede (Special): 18f startup, 30f active, covers full screen
  getSpecialAttackConfig() {
    return {
      startup: 18, active: 30, recovery: 35, damage: 30,
      hitbox: { x: 34, y: 5, w: 40, h: 35 },
      knockback: 12, hitstun: 28,
      whooshFrame: 14,
      animData: 'holyStampede',
      guardCrush: true,
    };
  }

  getGrabConfig() {
    return {
      startup: 8, active: 3, recovery: 16, damage: 10,
      hitbox: { x: 16, y: 5, w: 24, h: 30 },
      knockback: 3, hitstun: 14,
      isGrab: true,
    };
  }

  // --- MOVEMENT (Mounted) ---

  updateMovement() {
    // Can't move normally during charge
    if (this.chargeActive) {
      this.updateCharge();
      return;
    }

    if (this.dismounted) {
      // Dismounted movement - flail
      this.updateDismounted();
      return;
    }

    // Aegis timer
    if (this.aegisTimer > 0) {
      this.aegisTimer--;
      if (this.aegisTimer <= 0) this.aegisActive = false;
    }

    if (this.chargeRecovery > 0) {
      this.chargeRecovery--;
      return;
    }

    super.updateMovement();

    // Aegis Aura: Special without direction = defensive bubble
    if (IN.isBuffered('SPECIAL', 4) && IN.direction.x === 0 && IN.direction.y === 0 && !this.aegisActive) {
      this.activateAegis();
    }

    // Cantabrian Circle: turning animation when changing direction
    if (this.prevDirection && this.prevDirection.x !== 0 &&
        IN.direction.x !== 0 && Math.sign(this.prevDirection.x) !== Math.sign(IN.direction.x)) {
      this.cantabrianCircle = 6; // 6f turning animation
    }
    if (this.cantabrianCircle > 0) this.cantabrianCircle--;
    if (IN.direction.x !== 0) this.prevDirection = { ...IN.direction };
    else if (!this.prevDirection) this.prevDirection = { x: 0, y: 0 };

    // Horse leg phases: four-beat trot
    this.horseLegPhase = (this.horseLegPhase + 0.15) % (Math.PI * 2);

    // Steam from nostrils
    if (GAME.frameCount % 40 === 0) {
      this.steamBurst = 5;
    }
    if (this.steamBurst > 0) this.steamBurst--;
  }

  updateCharge() {
    // Charging across the screen
    this.x += (this.facingRight ? 8 : -8);
    this.chargeActive--;

    // Shake screen while charging
    if (GAME.frameCount % 2 === 0) {
      GAME.triggerShake(1, 1);
    }

    // Check collision with enemies/walls
    const chargeBox = {
      x: this.x,
      y: this.y,
      w: this.width + 40,
      h: this.height,
    };

    // Wall pin: 30 bonus damage if pinned to edge
    if (this.x <= 0 || this.x >= GAME.width - this.width) {
      // Bonked into wall, extra damage applied to all enemies in range
    }

    const targets = [...GAME.enemies];
    if (GAME.boss && !GAME.boss.dead) targets.push(GAME.boss);

    for (const target of targets) {
      if (!target || target.dead) continue;
      const hurtbox = {
        x: target.x + (target.hurtbox ? target.hurtbox.x : 0),
        y: target.y + (target.hurtbox ? target.hurtbox.y : 0),
        w: target.hurtbox ? target.hurtbox.w : target.width,
        h: target.hurtbox ? target.hurtbox.h : target.height,
      };
      if (CMB.rectsOverlap(chargeBox, hurtbox)) {
        const isPinned = (this.x <= 10 || this.x >= GAME.width - this.width - 10);
        target.takeDamage(isPinned ? 30 : 18, this, null);
        GAME.triggerHitstop(6);
        ParticleSystem.addDustPuff(target.x + target.width / 2, target.y + target.height);
      }
    }

    if (this.chargeActive <= 0) {
      this.chargeRecovery = 35;
      this.chargeActive = false;
    }
  }

  updateDismounted() {
    // Flail combat - doubled attack speed
    super.updateMovement();
    this.walkSpeed = 3.5;
    this.vigilTimer--;

    if (this.vigilTimer <= 0) {
      // Remount - horse returns, trampling enemy from behind
      this.dismounted = false;
      this.flailEquipped = false;
      this.horseReturnTrample();
    }
  }

  horseReturnTrample() {
    // Horse gallops back, hitting enemy from behind
    const targets = [...GAME.enemies];
    if (GAME.boss && !GAME.boss.dead) targets.push(GAME.boss);

    for (const target of targets) {
      if (!target || target.dead) continue;
      target.takeDamage(20, this, null);
      target.applyKnockback(this.facingRight ? 6 : -6, 15);
    }

    ParticleSystem.addDustPuff(this.x + this.width / 2, this.y + this.height);
    SFX.playImpact('heavy');
    GAME.triggerShake(3, 8);
  }

  // --- SPECIAL: Holy Stampede ---

  specialAttack() {
    if (this.specialCooldown > 0) return;

    if (this.dismounted) {
      // Flail special: spinning flail attack
      return this.startAttack({
        startup: 8, active: 10, recovery: 15, damage: 18,
        hitbox: { x: 20, y: 5, w: 40, h: 30 },
        knockback: 6, hitstun: 18,
        whooshFrame: 5,
      });
    }

    const result = this.startAttack(this.getSpecialAttackConfig());
    if (result) {
      this.specialCooldown = 90; // Long cooldown
    }
    return result;
  }

  updateAttacking() {
    if (this.currentAttacks.length > 0) {
      const atk = this.currentAttacks[0];

      if (atk.animData === 'holyStampede') {
        // Phase transitions:
        // Startup: horse rears up
        if (atk.phase === 'startup' && atk.currentFrame >= 16) {
          // Rearing animation
          this.y -= 5;
        }
        // Active: charge across screen
        if (atk.phase === 'active' && !this.chargeActive) {
          this.chargeActive = atk.activeFrames;
          // Horse rears and charges
          this.y += 5;
        }
      }
    }
  }

  // --- AEGIS AURA ---

  activateAegis() {
    this.aegisActive = true;
    this.aegisTimer = 120; // 2 seconds
    SFX.playSpecial('paladin');
  }

  takeDamage(amount, attacker, attack) {
    // Aegis: reflect next projectile back at double speed
    if (this.aegisActive && attack && attack.isProjectile) {
      this.aegisActive = false;
      this.aegisTimer = 0;

      // Reflect projectile
      if (attack.entity && attack.entity.vx !== undefined) {
        attack.entity.vx *= -2;
        attack.entity.vy *= -2;
        attack.entity.ownerIsPlayer = !attack.entity.ownerIsPlayer;
        attack.entity.owner = this;
      }

      ParticleSystem.addHolyLight(this.x + this.width / 2, this.y + this.height / 2);
      SFX.playSpecial('paladin');
      return;
    }

    super.takeDamage(amount, attacker, attack);
  }

  // --- HIDDEN ABILITY: Last Vigil ---
  // At 15% HP: thrown from horse, fights with flail at 2x speed for 10s
  // Horse returns after 3s, trampling enemy

  activateHiddenAbility() {
    super.activateHiddenAbility();
    this.dismounted = true;
    this.flailEquipped = true;
    this.mounted = false;
    this.hiddenAbilityTimer = 600; // 10 seconds
    this.vigilTimer = 600;
    this.horseReturnTimer = 180; // 3 seconds

    // Thrown from horse
    this.y += 10;
    this.vy = -5;
    this.grounded = false;

    // Horse gallops off-screen
    ParticleSystem.addDustPuff(this.x + this.width / 2, this.y + this.height);

    SFX.playSpecial('paladin');
  }

  deactivateHiddenAbility() {
    super.deactivateHiddenAbility();
    if (this.dismounted) {
      this.dismounted = false;
      this.flailEquipped = false;
      this.mounted = true;
    }
  }

  // --- RENDERING ---

  renderCharacter(ctx, x, y, alpha = 0) {
    if (this.dismounted) {
      this.renderDismounted(ctx, x, y);
      return;
    }

    // Four-beat horse trot from animation system
    const trotFrame = AN.getAnimFrame(AN.SPRITES.paladin, this.animFrame, 1);

    // Base sprite from animation system
    AN.drawSprite(ctx, AN.SPRITES.paladin, x, y, 1, trotFrame, !this.facingRight);

    // Steam from nostrils
    if (this.steamBurst > 0) {
      const headX = x + (this.facingRight ? this.width : -10);
      ctx.fillStyle = `rgba(255, 255, 255, ${this.steamBurst / 10})`;
      ctx.fillRect(headX + (this.facingRight ? 10 : -4), y + 8, 4, 3);
    }

    // Iron shoes sparks
    if (this.grounded && Math.abs(this.currentSpeed) > 0.3 && GAME.frameCount % 10 === 0) {
      ParticleSystem.addSparks(x + 8, y + this.height, 1);
    }

    // Aegis bubble
    if (this.aegisActive) {
      ctx.strokeStyle = `rgba(255, 215, 0, ${0.3 + Math.sin(this.animFrame * 0.2) * 0.2})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + this.width / 2, y + this.height / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Cantabrian Circle turning (horse rears)
    if (this.cantabrianCircle > 0) {
      ctx.save();
      ctx.translate(x + this.width / 2, y + this.height / 2);
      ctx.rotate((this.cantabrianCircle / 6) * Math.PI);
      ctx.fillStyle = '#5a4530';
      ctx.fillRect(-20, -15, 40, 25);
      ctx.restore();
    }
  }

  renderDismounted(ctx, x, y) {
    // On foot, wielding flail
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(x + 4, y + this.height - 2, this.width - 8, 3);

    // Legs (armored)
    ctx.fillStyle = '#8a8a9a';
    ctx.fillRect(x + 6, y + this.height - 20, 8, 20);
    ctx.fillRect(x + this.width - 14, y + this.height - 20, 8, 20);

    // Body
    ctx.fillStyle = '#c0c0d0';
    ctx.fillRect(x + 4, y + 8, this.width - 8, this.height - 30);

    // Tired face (helm removed)
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(x + this.width / 2 - 5, y, 10, 10);
    // Grey beard
    ctx.fillStyle = '#999';
    ctx.fillRect(x + this.width / 2 - 3, y + 8, 6, 4);

    // Flail (spiked ball on chain)
    const flailAngle = Math.sin(this.animFrame * 0.3) * 0.5;
    const flailArmX = x + (this.facingRight ? this.width : -8);
    // Chain
    ctx.fillStyle = '#888';
    ctx.fillRect(flailArmX, y + 12, 14, 2);
    // Spiked ball
    ctx.fillStyle = '#666';
    ctx.fillRect(flailArmX + (this.facingRight ? 10 : -10) + flailAngle * 4, y + 8, 8, 8);
    // Spikes
    ctx.fillStyle = '#999';
    ctx.fillRect(flailArmX + (this.facingRight ? 12 : -8), y + 6, 2, 2);
    ctx.fillRect(flailArmX + (this.facingRight ? 14 : -6), y + 10, 2, 2);
  }

  // Victory: rides circle, lance raised, dismounts and prays
  renderVictoryPose(ctx, x, y, timer) {
    if (this.dismounted) {
      this.renderDismounted(ctx, x, y);
      if (timer > 40) {
        // Kneeling, praying
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(x + this.width / 2 - 2, y - 15, 4, 6);
      }
    } else {
      this.renderCharacter(ctx, x, y);
      // Lance raised in salute
      ctx.fillStyle = '#c0c0c0';
      ctx.fillRect(x + this.width / 2 - 1, y - 30, 2, 40);
    }
  }
};
