// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Wyvern Hatchling (Tier 4: The Feral)
// Air superiority: 60% air time. Swoop attack, tail sweep, dive.
// ============================================================

class Wyvern extends Enemy {
  constructor(config = {}) {
    super({
      id: 'wyvern',
      name: 'Wyvern Hatchling',
      type: 'wyvern',
      tier: 4,
      width: 36,
      height: 24,
      maxHP: 35,
      damage: 10,
      walkSpeed: 0,
      aggression: 70,
      fear: 15,
      greed: 20,
      patience: 30,
      hurtbox: { x: 0, y: 0, w: 36, h: 24 },
      ...config,
    });

    this.flying = true;
    this.grounded = false;

    // === BEHAVIOR STATES ===
    // 'airHover' | 'swoop' | 'diving' | 'recovering' | 'landed' | 'tailSweep'
    this.airState = 'airHover';
    this.stateTimer = 0;

    // Hover behavior
    this.hoverTimer = 0;
    this.hoverDuration = 150 + Math.floor(Math.random() * 60);

    // Dive (original behavior, kept)
    this.diveTarget = null;
    this.diveSpeed = 8;

    // === NEW: Swoop attack ===
    // Fly off screen top, then dive at player with high damage
    this.swoopTimer = 0;
    this.swoopPhase = 'rising'; // 'rising' | 'diving' | 'impact'
    this.swoopTargetX = 0;
    this.swoopTargetY = 0;

    // === NEW: Tail sweep ===
    // Wide hitbox attack when player is behind
    this.tailSweepTimer = 120;
    this.tailSweepActive = false;
    this.tailSweepDuration = 0;

    // === NEW: Air superiority ===
    // 60% of time in air, only land briefly
    this.airTimeRatio = 0.6;
    this.landedTimer = 0;
    this.landedDuration = 90; // 1.5 seconds on ground

    // Shadow for dive warning
    this._diveShadow = null;
  }

  update() {
    if (this.dead) {
      // Fall out of sky, reset special states
      this.y += 4;
      this.deathTimer++;
      this.airState = 'diving';
      if (this.y > GAME.height) {
        this.deathTimer = 999;
      }
      return;
    }

    this.stateTimer++;
    this.animFrame++;

    if (this.flashWhite > 0) this.flashWhite--;

    const player = GAME.player;
    const hasPlayer = player && !player.dead;

    // === AIR SUPERIORITY STATE MACHINE ===
    switch (this.airState) {

      // --- AIR HOVER: float at top, strafe, maybe tail sweep ---
      case 'airHover': {
        this.hoverTimer++;
        this.y = 60 + Math.sin(this.hoverTimer * 0.05) * 20;
        this.x += Math.sin(this.hoverTimer * 0.03) * 1.5;

        // Face player
        if (hasPlayer) this.facingRight = player.x > this.x;

        // TAIL SWEEP: if player is behind the wyvern
        this.tailSweepTimer--;
        if (hasPlayer && this.tailSweepTimer <= 0 && !this.tailSweepActive) {
          const playerBehind = (this.facingRight && player.x < this.x - 30) ||
                               (!this.facingRight && player.x > this.x + 30);
          if (playerBehind) {
            this.airState = 'tailSweep';
            this.tailSweepActive = true;
            this.tailSweepDuration = 20;
            break;
          }
          this.tailSweepTimer = 60 + Math.floor(Math.random() * 60);
        }

        // Choose next action after hover duration
        if (this.hoverTimer >= this.hoverDuration) {
          const roll = Math.random();
          if (roll < 0.35) {
            // Swoop attack (fly off top, dive)
            this.airState = 'swoop';
            this.swoopPhase = 'rising';
            this.swoopTimer = 0;
          } else {
            // Original dive behavior
            this.airState = 'diving';
            this.diveTarget = {
              x: hasPlayer ? player.x + player.width / 2 : GAME.width / 2,
              y: hasPlayer ? player.y : GAME.height - 80,
            };
            this._diveShadow = { x: this.x, life: 30 };
          }
        }
        break;
      }

      // --- SWOOP ATTACK: fly off top, then dive at player position ---
      case 'swoop': {
        this.swoopTimer++;

        if (this.swoopPhase === 'rising') {
          // Fly off the top of the screen
          this.y -= 5;
          if (this.y < -40) {
            // Lock onto player's current X position and dive
            this.swoopTargetX = hasPlayer ? player.x + player.width / 2 : GAME.width / 2;
            this.swoopTargetY = hasPlayer ? player.y : GAME.height - 80;
            this.x = this.swoopTargetX - this.width / 2;
            this.swoopPhase = 'diving';
            this.swoopTimer = 0;
            // Shadow warning
            this._diveShadow = { x: this.swoopTargetX, life: 25 };
          }
        } else if (this.swoopPhase === 'diving') {
          // Dive down fast at player position
          this.y += 10;
          if (hasPlayer) {
            this.swoopTargetX = player.x + player.width / 2;
            this.x += (this.swoopTargetX - this.x - this.width / 2) * 0.05;
          }

          if (this.y >= (hasPlayer ? player.y : GAME.height - 80)) {
            // Impact!
            this.swoopPhase = 'impact';
            this.y = hasPlayer ? player.y : GAME.height - 80;
            GAME.triggerShake(4, 10);
            SFX.playImpact('heavy');
            ParticleSystem.addDustPuff(this.x + this.width / 2, this.y + this.height, 15);

            // Hit player if close
            if (hasPlayer) {
              const pdx = player.x + player.width / 2 - (this.x + this.width / 2);
              const pdy = player.y + player.height / 2 - (this.y + this.height / 2);
              if (Math.sqrt(pdx * pdx + pdy * pdy) < 60) {
                player.takeDamage(this.damage * 1.5, this, null);
                SFX.playImpact('heavy');
              }
            }
          }
        } else if (this.swoopPhase === 'impact') {
          this.swoopTimer++;
          if (this.swoopTimer > 20) {
            // Transition to recovery
            this.airState = 'recovering';
            this.hoverTimer = 0;
          }
        }
        break;
      }

      // --- ORIGINAL DIVE BEHAVIOR ---
      case 'diving': {
        if (!this.diveTarget) {
          this.airState = 'airHover';
          this.hoverTimer = 0;
          break;
        }
        const dx = this.diveTarget.x - this.x;
        const dy = this.diveTarget.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 2) {
          this.x += (dx / dist) * this.diveSpeed;
          this.y += (dy / dist) * this.diveSpeed;
        } else {
          // Impact
          this.airState = 'recovering';
          this.hoverTimer = 0;
          GAME.triggerShake(2, 6);
          SFX.playImpact('heavy');
          ParticleSystem.addDustPuff(this.x + this.width / 2, GAME.height - 80, 10);

          if (hasPlayer) {
            const pdx = player.x + player.width / 2 - this.x;
            const pdy = player.y + player.height / 2 - this.y;
            if (Math.sqrt(pdx * pdx + pdy * pdy) < 50) {
              player.takeDamage(this.damage, this, null);
            }
          }
        }
        break;
      }

      // --- TAIL SWEEP: wide hitbox attack when player is behind ---
      case 'tailSweep': {
        this.tailSweepDuration--;
        if (hasPlayer) this.facingRight = player.x > this.x;

        // Wide tail sweep hitbox (behind the wyvern)
        if (this.tailSweepDuration === 10) {
          SFX.playImpact('light');
          // Check hit on player
          if (hasPlayer) {
            const tailHitbox = {
              x: this.facingRight ? this.x - 40 : this.x + this.width,
              y: this.y,
              w: 50,
              h: this.height + 10,
            };
            const playerBox = {
              x: player.x, y: player.y,
              w: player.width, h: player.height,
            };
            if (CMB.rectsOverlap(tailHitbox, playerBox)) {
              player.takeDamage(this.damage * 0.8, this, null);
              SFX.playImpact('heavy');
            }
          }
        }

        if (this.tailSweepDuration <= 0) {
          this.tailSweepActive = false;
          this.tailSweepTimer = 120 + Math.floor(Math.random() * 60);
          this.airState = 'airHover';
          this.hoverTimer = 0;
        }
        break;
      }

      // --- RECOVERING: rise back into the air ---
      case 'recovering': {
        this.hoverTimer++;
        this.y -= 2;
        if (this.hoverTimer > 30) {
          // 60% chance to stay in air, 40% to briefly land
          if (Math.random() < this.airTimeRatio) {
            this.airState = 'airHover';
          } else {
            this.airState = 'landed';
            this.landedTimer = 0;
            this.grounded = true;
            this.y = this.groundY - this.height;
          }
          this.hoverTimer = 0;
          this.hoverDuration = 120 + Math.floor(Math.random() * 80);
        }
        break;
      }

      // --- LANDED: briefly on the ground, then take off ---
      case 'landed': {
        this.landedTimer++;
        if (hasPlayer) {
          this.facingRight = player.x > this.x;
          // Slow walk toward player while landed
          const ldx = player.x - this.x;
          if (Math.abs(ldx) > 30) {
            this.x += (ldx > 0 ? 1 : -1) * 1.2;
            this.state = 'walk';
          }
          // Quick bite attack while grounded
          if (Math.abs(ldx) < 40 && this.attackCooldown <= 0) {
            this.attackCooldown = 60;
            this.currentAttacks.push(CMB.createAttack(this, {
              startup: 6, active: 4, recovery: 12,
              damage: this.damage * 0.7,
              hitbox: { x: 25, y: 2, w: 20, h: 16 },
              knockback: 3, hitstun: 10,
              whooshFrame: 4,
            }));
          }
        }

        if (this.landedTimer >= this.landedDuration) {
          // Take off!
          this.grounded = false;
          this.airState = 'airHover';
          this.hoverTimer = 0;
          this.hoverDuration = 150 + Math.floor(Math.random() * 60);
          ParticleSystem.addDustPuff(this.x + this.width / 2, this.y + this.height, 8);
        }
        break;
      }
    }

    // Process attacks for CMB system
    for (let i = this.currentAttacks.length - 1; i >= 0; i--) {
      if (!CMB.updateAttack(this.currentAttacks[i])) {
        this.currentAttacks.splice(i, 1);
      }
    }
    if (this.currentAttacks.length > 0) {
      CMB.processAttacks(this, this.currentAttacks, [GAME.player]);
    }

    if (this.attackCooldown > 0) this.attackCooldown--;

    // Fall off screen guard
    if (this.y > GAME.height + 50) {
      this.dead = true;
      this.deathTimer = 999;
    }
  }

  die() {
    this.dead = true;
    this.deathTimer = 0;
    this.grounded = false;
    this.airState = 'diving';
    ParticleSystem.addBloodSplatter(this.x + this.width / 2, this.y + this.height / 2, 8);
    SFX.playImpact('heavy');
  }

  render(ctx) {
    if (this.dead) {
      if (this.deathTimer > 40) return;
      const alpha = 1 - this.deathTimer / 40;
      ctx.globalAlpha = alpha;
      this.renderWyvern(ctx);
      ctx.globalAlpha = 1;
      return;
    }

    // Dive shadow on ground
    if ((this.airState === 'airHover' || this.airState === 'swoop') && this._diveShadow) {
      const shadowY = GAME.height - 80;
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(this._diveShadow.x - 15, shadowY, 30, 6);
    } else if (this.airState === 'diving' && this.diveTarget) {
      const shadowY = GAME.height - 80;
      const altitudeRatio = Math.max(0, (shadowY - this.y) / (shadowY - (-40)));
      ctx.fillStyle = `rgba(0,0,0,${0.3 * altitudeRatio})`;
      ctx.fillRect(this.x - 15 * altitudeRatio, shadowY, 30 * altitudeRatio, 4);
    }

    if (this.flashWhite > 0 && this.flashWhite % 2 === 0) {
      ctx.globalAlpha = 0.7;
    }

    this.renderWyvern(ctx);
    ctx.globalAlpha = 1;
  }

  renderWyvern(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const timer = this.hoverTimer || this.stateTimer;

    // Wings
    const wingFlap = Math.sin(timer * 0.2) * 8;
    ctx.fillStyle = '#4a3a2a';
    ctx.fillRect(x - 8, y - 6 + wingFlap, 8, 16);
    ctx.fillRect(x + this.width, y - 6 - wingFlap, 8, 16);
    // Wing membrane
    ctx.fillStyle = '#5a4a3a';
    ctx.fillRect(x - 10, y, 10, 10);
    ctx.fillRect(x + this.width, y, 10, 10);

    // Body
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(x + 4, y + 2, this.width - 8, this.height - 6);

    // Head
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(x + (this.facingRight ? this.width - 8 : 0), y - 2, 10, 8);

    // Beak
    ctx.fillStyle = '#cccc44';
    ctx.fillRect(x + (this.facingRight ? this.width : -6), y + 2, 6, 3);

    // Eyes
    ctx.fillStyle = '#ff6600';
    ctx.fillRect(x + (this.facingRight ? this.width - 4 : 4), y, 3, 2);

    // Tail
    ctx.fillStyle = '#3a5a3a';
    ctx.fillRect(x + (this.facingRight ? 0 : this.width - 8), y + this.height - 4, 10, 4);

    // Fire breath hint (diving / swoop diving)
    if (this.airState === 'diving' || (this.airState === 'swoop' && this.swoopPhase === 'diving')) {
      ctx.fillStyle = 'rgba(255, 100, 0, 0.4)';
      ctx.fillRect(x + (this.facingRight ? this.width : -10), y + 6, 10, 3);
    }

    // Tail sweep visual
    if (this.airState === 'tailSweep' && this.tailSweepDuration > 5) {
      const tailDir = this.facingRight ? -1 : 1;
      ctx.fillStyle = 'rgba(200, 150, 50, 0.6)';
      ctx.fillRect(x + (tailDir < 0 ? -30 : this.width), y + 4, 30, 8);
    }

    // Swoop rising visual: speed lines
    if (this.airState === 'swoop' && this.swoopPhase === 'rising') {
      ctx.fillStyle = 'rgba(255, 200, 100, 0.3)';
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + 8 + i * 8, y + this.height, 2, 15);
      }
    }

    // Landed indicator
    if (this.airState === 'landed') {
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(x + 4, y + this.height, this.width - 8, 4);
    }
  }
};
