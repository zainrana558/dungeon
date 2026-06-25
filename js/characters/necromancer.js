// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — THE NECROMANCER (Codename: Puppeteer)
// The Lord of Rot — phase dash, soul leech beam, grave risen, death burst
// ============================================================

class Necromancer extends Character {
  constructor(config = {}) {
    super({
      id: 'necromancer',
      name: 'The Necromancer',
      type: 'necromancer',
      width: 30,
      height: 50,
      walkSpeed: 2.5,
      accelFrames: 10,
      decelFrames: 10,
      airControl: 0.55,
      jumpVelocity: -10,
      maxHP: 85,
      baseDamage: 9,
      hurtbox: { x: 2, y: 0, w: 26, h: 50 },
      hiddenAbilityHP: 0.3,
      ...config,
    });

    this.skeletons = [];      // Active skeleton minions
    this.maxSkeletons = 2;
    this.phaseCooldown = 0;
    this.soulLeechActive = false;
    this.leechBeamFrame = 0;
    this.swayPhase = 0;
    this.crownAdjustTimer = 0;

    this._phaseDashing = false;
    this._summoning = false;
  }

  getLightAttackConfig() {
    return {
      startup: 6, active: 3, recovery: 8, damage: 7,
      hitbox: { x: 22, y: 8, w: 24, h: 16 },
      knockback: 2, hitstun: 11,
      whooshFrame: 4,
    };
  }

  getHeavyAttackConfig() {
    return {
      startup: 12, active: 6, recovery: 18, damage: 15,
      hitbox: { x: 24, y: 6, w: 30, h: 22 },
      knockback: 5, hitstun: 18,
      whooshFrame: 8,
    };
  }

  // Soul Leech (Special - Close): 4px-wide green beam, 1dmg/frame, heals 1HP/frame
  // 0 knockback, enemies can walk through it - used to bait into minions
  getSpecialAttackConfig() {
    // If holding down, summon skeleton instead
    if (IN.isBuffered('DOWN', 8)) {
      return this.getSummonConfig();
    }
    return {
      startup: 6, active: 45, recovery: 12, damage: 1,
      hitbox: { x: 24, y: 10, w: 80, h: 4 }, // 4px wide beam, long range
      knockback: 0, hitstun: 3,
      whooshFrame: 4,
      animData: 'soulLeech',
    };
  }

  // Grave Risen (Summon): 20f startup ritual, spawns skeleton
  getSummonConfig() {
    return {
      startup: 20, active: 1, recovery: 10, damage: 0,
      hitbox: { x: 0, y: 0, w: 0, h: 0 },
      knockback: 0, hitstun: 0,
      whooshFrame: null,
      animData: 'summon',
    };
  }

  getGrabConfig() {
    return {
      startup: 8, active: 3, recovery: 14, damage: 10,
      hitbox: { x: 12, y: 5, w: 18, h: 26 },
      knockback: 3, hitstun: 14,
      isGrab: true,
    };
  }

  // --- MOVEMENT ---

  updateMovement() {
    super.updateMovement();

    // Phase (Dash): double-tap back
    if (this.phaseCooldown > 0) this.phaseCooldown--;

    if (this.grounded && this.state !== 'attack' && this.phaseCooldown <= 0) {
      if (this._lastBackFrame && GAME.frameCount - this._lastBackFrame < 12) {
        if (IN.isBuffered('BACK', 3)) {
          this.startPhaseDash();
        }
      }
      if (IN.isBuffered('BACK', 3)) {
        this._lastBackFrame = GAME.frameCount;
      }
    }
  }

  startPhaseDash() {
    // Turn intangible for 12f, move 50px, 0 physical damage, still vulnerable to projectiles
    this._phaseDashing = true;
    this.phaseCooldown = 30;

    const dashDist = this.facingRight ? -50 : 50;
    const startX = this.x;

    // Instantly move
    this.x += dashDist;
    ParticleSystem.addShadowCrows(startX + this.width / 2, this.y + this.height / 2, 8);

    setTimeout(() => {
      this._phaseDashing = false;
    }, 200);
  }

  // --- SPECIAL: Soul Leech ---

  specialAttack() {
    if (this.specialCooldown > 0) return;

    const config = this.getSpecialAttackConfig();
    const attack = this.startAttack(config);

    if (attack) {
      if (config.animData === 'soulLeech') {
        this.soulLeechActive = true;
        this.specialCooldown = 60;
        this.leechBeamFrame = 0;
      } else if (config.animData === 'summon') {
        this.specialCooldown = 45;
        this._summoning = true;
      }
    }

    return attack;
  }

  updateAttacking() {
    if (this.currentAttacks.length > 0) {
      const atk = this.currentAttacks[0];

      if (atk.animData === 'soulLeech') {
        this.leechBeamFrame++;

        // Beam deals 1 damage per frame and heals 1 HP per frame
        const beamBox = CMB.getAttackHitbox(atk);

        // Check collision with enemies
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
          if (CMB.rectsOverlap(beamBox, hurtbox)) {
            target.takeDamage(1, this, atk);
            this.hp = Math.min(this.maxHP, this.hp + 1);
            break;
          }
        }

        if (atk.phase === 'recovery') {
          this.soulLeechActive = false;
        }
      }

      if (atk.animData === 'summon' && atk.phase === 'active' && this._summoning) {
        this.summonSkeleton();
        this._summoning = false;
      }
    }
  }

  summonSkeleton() {
    if (this.skeletons.length >= this.maxSkeletons) return;

    const skel = {
      x: this.x + (this.facingRight ? this.width + 20 : -40),
      y: this.groundY,
      width: 24,
      height: 38,
      hp: 20,
      maxHP: 20,
      facingRight: this.facingRight,
      attackTimer: 0,
      attackInterval: 45, // Attacks every 45 frames, 5 damage
      dead: false,
      deathAnimComplete: false,
      hurtbox: { x: 0, y: 0, w: 24, h: 38 },
      characterType: 'skeleton',
      id: 'skel_' + Math.random().toString(36).substr(2, 6),

      update() {
        if (this.dead) {
          this.deathAnimComplete = true;
          return;
        }

        this.attackTimer++;

        // Simple AI: walk toward nearest enemy
        const targets = [...GAME.enemies];
        if (GAME.boss && !GAME.boss.dead) targets.push(GAME.boss);

        if (targets.length > 0) {
          const target = targets[0];
          const dx = target.x - this.x;
          this.facingRight = dx > 0;
          if (Math.abs(dx) > 50) {
            this.x += this.facingRight ? 1.5 : -1.5;
          }

          // Attack when close and timer ready
          if (this.attackTimer >= this.attackInterval && Math.abs(dx) < 40) {
            this.attackTimer = 0;
            target.takeDamage(5, GAME.player, null);
            SFX.playImpact('light');
          }
        }
      },

      takeDamage(amount, attacker, attack) {
        this.hp -= amount;
        if (this.hp <= 0) {
          this.hp = 0;
          this.dead = true;
          // DEATH BURST: explodes in 150px AOE for 25 damage
          // Only if this skeleton was killed by an enemy (not timer)
          if (!this._dyingNaturally) {
            CMB.addExplosion(this.x + this.width / 2, this.y + this.height / 2, 150, 25, GAME.player, true);
            ParticleSystem.addExplosion(this.x + this.width / 2, this.y + this.height / 2, 80, '#00ff00');
          }
        }
      },

      isBlocking() { return false; },
      applyKnockback() {},
      render(ctx) {
        if (this.dead && this.deathAnimComplete) return;
        const fx = Math.round(this.x);
        const fy = Math.round(this.y);
        AN.drawSkeletalCharacter(ctx, fx, fy, this.width, this.height, '#d4c8a0', '#444444');
      },
    };

    this.skeletons.push(skel);

    // Register skeleton in the enemy list for hit detection
    // We hook it into the game loop
    if (!GAME._necroSkeletons) GAME._necroSkeletons = [];
    GAME._necroSkeletons.push(skel);
  }

  update() {
    super.update();

    // Update skeletons
    for (let i = this.skeletons.length - 1; i >= 0; i--) {
      this.skeletons[i].update();
      if (this.skeletons[i].dead) {
        this.skeletons.splice(i, 1);
      }
    }

    // Sway idle
    if (this.state === 'idle') {
      this.swayPhase = (this.swayPhase + 0.05) % (Math.PI * 2);
    }

    // Crown adjustment habit
    this.crownAdjustTimer++;
  }

  // --- HIDDEN ABILITY: Death Burst ---
  // When any skeleton dies to enemy, it explodes. Amplified by hidden ability.

  activateHiddenAbility() {
    super.activateHiddenAbility();
    // All current skeletons explode immediately
    for (const skel of this.skeletons) {
      if (!skel.dead) {
        skel.hp = 0;
        skel.dead = true;
        skel._dyingNaturally = true;
        CMB.addExplosion(skel.x + skel.width / 2, skel.y + skel.height / 2, 180, 30, this, true);
        ParticleSystem.addExplosion(skel.x + skel.width / 2, skel.y + skel.height / 2, 90, '#00ff44');
      }
    }
    this.skeletons = [];
  }

  takeDamage(amount, attacker, attack) {
    // Phase dash: 0 physical damage but vulnerable to projectiles
    if (this._phaseDashing && (!attack || !attack.isProjectile)) {
      return;
    }
    super.takeDamage(amount, attacker, attack);
  }

  getFootstepWeight() { return 'light'; }

  // --- RENDERING ---

  renderCharacter(ctx, x, y, alpha = 0) {
    // Green wisps behind (rendered BEFORE sprite)
    const swayOffset = Math.sin(this.swayPhase * 2) * 5;
    const wispAlpha = 0.08 + Math.sin(this.swayPhase * 2) * 0.04;
    ctx.fillStyle = `rgba(0, 255, 100, ${wispAlpha})`;
    ctx.fillRect(x - 8, y + 10 + swayOffset, 4, 8);
    ctx.fillRect(x + this.width + 4, y + 20 + Math.cos(this.swayPhase) * 5, 3, 6);

    // Base sprite from animation system
    const frameIdx = AN.getAnimFrame(AN.SPRITES.necromancer, this.animFrame, 1);
    AN.drawSprite(ctx, AN.SPRITES.necromancer, x, y, 1, frameIdx, !this.facingRight);

    // Soul leech beam visual (rendered on top)
    if (this.soulLeechActive) {
      const beamX = x + (this.facingRight ? this.width : -80);
      const beamY = y + this.height * 0.4;
      ctx.fillStyle = 'rgba(0, 255, 50, 0.6)';
      ctx.fillRect(beamX, beamY, 80, 4);
      ctx.fillStyle = 'rgba(0, 255, 100, 0.3)';
      ctx.fillRect(beamX, beamY - 1, 80, 6);
    }

    // Black miasma cough (periodic)
    if (this.state === 'idle' && this.animFrame % 120 > 115) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.fillRect(x + this.width / 2 - 2, y + 6, 4, 3);
      ctx.fillRect(x + this.width / 2 + 2, y + 8, 3, 2);
    }

    // Glowing skull atop staff
    const skullGlow = Math.sin(this.animFrame * 0.08) * 0.3 + 0.5;
    const staffX = x + (this.facingRight ? -6 : this.width);
    ctx.fillStyle = `rgba(0, 255, 50, ${skullGlow})`;
    ctx.fillRect(staffX - 2, y - 8, 8, 8);
    ctx.fillStyle = '#00ff22';
    ctx.fillRect(staffX, y - 5, 3, 3);
  }

  render(ctx, alpha = 0) {
    // Render skeletons
    for (const skel of this.skeletons) {
      skel.render(ctx);
    }
    super.render(ctx, alpha);
  }

  // Victory: kneels, pulls green soul from corpse, absorbs into staff
  renderVictoryPose(ctx, x, y, timer) {
    this.renderCharacter(ctx, x, y);
    if (timer > 30 && timer < 70) {
      // Pulling soul
      const soulY = y + 10 - (timer - 30);
      ctx.fillStyle = '#00ff44';
      ctx.globalAlpha = (timer - 30) / 40;
      ctx.fillRect(x + (this.facingRight ? this.width + 15 : -20), soulY, 4, 4);
      ctx.globalAlpha = 1;
    }
    // Finger to lips at end
    if (timer > 70) {
      ctx.fillStyle = '#8a9a7a';
      ctx.fillRect(x + this.width / 2 + 3, y + 2, 3, 1);
    }
  }
};
