// ============================================================
// BOSS 1: THE GOBLIN KING (Gitz the Greedy) — Floor 5
// Coward, boomerang daggers, exploding gold coins, greed drive
// ============================================================

class GoblinKing extends Enemy {
  constructor(config = {}) {
    super({
      id: 'goblin_king',
      name: 'Goblin King Gitz',
      type: 'goblin_king',
      tier: 'boss',
      width: 40,
      height: 40,
      maxHP: 180,
      damage: 8,
      walkSpeed: 3.0,
      aggression: 30,
      fear: 80,
      greed: 60,
      patience: 15,
      hurtbox: { x: 0, y: 0, w: 40, h: 40 },
      ...config,
    });

    this.boomerangOut = false;
    this.goldCoinsOnGround = [];
    this.greedTriggered = false;
    this.greedPhase = false;
    this.runTimer = 0;
    this.tauntTimer = 0;
  }

  updateAI() {
    if (this.dead) return;

    const player = GAME.player;
    if (!player || player.dead) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // Greed triggered: abandon strategy, charge recklessly
    if (this.greedTriggered && !this.greedPhase) {
      this.greedPhase = true;
      this.drives.greed = 100;
      this.drives.fear = 0;
      this.walkSpeed *= 1.5;
      this.damage *= 1.3;
    }

    if (this.greedPhase) {
      // Reckless charge
      if (dist > 50) {
        this.x += this.facingRight ? this.walkSpeed : -this.walkSpeed;
        this.state = 'walk';
      } else if (this.attackCooldown <= 0) {
        this.meleeSwipe();
      }
      return;
    }

    // Normal coward strategy: run away, throw boomerangs
    if (dist < 100) {
      // Run away from player
      this.x += this.facingRight ? -this.walkSpeed : this.walkSpeed;
      this.state = 'walk';
    }

    // Throw boomerang dagger
    if (!this.boomerangOut && this.attackCooldown <= 0 && dist < 300) {
      this.throwBoomerang();
    }

    // Drop exploding gold coins
    if (GAME.frameCount % 150 < 5 && this.goldCoinsOnGround.length < 3) {
      this.dropGoldCoin();
    }

    // Taunt occasionally
    this.tauntTimer++;
    if (this.tauntTimer > 200) {
      this.tauntTimer = 0;
      // Taunt animation — stands still, chattering
    }

    // Check if player picks up gold
    this.checkGoldPickup();
  }

  throwBoomerang() {
    this.boomerangOut = true;
    this.attackCooldown = 40;
    this.state = 'attack';

    // Boomerang: curves in the air
    const startX = this.x + this.width / 2;
    const startY = this.y + this.height / 2;
    const dir = this.facingRight ? 1 : -1;

    // Triple dagger if scaled up by tower
    const count = GAME._towerScalingActive ? 3 : 1;

    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        if (this.dead) return;
        CMB.spawnProjectile({
          x: startX, y: startY + (i - 1) * 8,
          vx: dir * 3, vy: -2,
          w: 8, h: 4,
          damage: 6,
          owner: this,
          ownerIsPlayer: false,
          life: 80,
          color: '#cccc44',
          onExpire: () => { this.boomerangOut = false; },
        });
      }, i * 100);
    }
  }

  dropGoldCoin() {
    const coin = {
      x: this.x + Math.random() * this.width,
      y: this.groundY - 20,
      w: 6, h: 6,
      life: 180,
      collected: false,
    };
    this.goldCoinsOnGround.push(coin);

    // Coin explodes after life expires
    setTimeout(() => {
      const idx = this.goldCoinsOnGround.indexOf(coin);
      if (idx >= 0 && !coin.collected) {
        CMB.addExplosion(coin.x, coin.y, 40, 8, this, false);
        this.goldCoinsOnGround.splice(idx, 1);
      }
    }, 3000);
  }

  checkGoldPickup() {
    const player = GAME.player;
    if (!player) return;

    for (let i = this.goldCoinsOnGround.length - 1; i >= 0; i--) {
      const coin = this.goldCoinsOnGround[i];
      const pdx = Math.abs(player.x + player.width / 2 - coin.x);
      const pdy = Math.abs(player.y + player.height / 2 - coin.y);
      if (pdx < 30 && pdy < 30 && !coin.collected) {
        coin.collected = true;
        this.goldCoinsOnGround.splice(i, 1);

        // Greed Drive flips — he abandons strategy and charges
        if (!this.greedTriggered) {
          this.greedTriggered = true;
        }

        // Player gets score
        GAME.score += 100;
        SFX.playUISelect();
      }
    }
  }

  meleeSwipe() {
    this.attackCooldown = 25;
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 8, active: 4, recovery: 12,
      damage: this.damage * 1.5,
      hitbox: { x: 28, y: 5, w: 30, h: 20 },
      knockback: 5, hitstun: 14,
      whooshFrame: 6,
    }));
  }

  die() {
    super.die();
    // Leaves only his crown
    this._crownLeft = true;
  }

  get deathAnimComplete() {
    return this.deathTimer > 50;
  }

  render(ctx) {
    if (this.dead) {
      if (this.deathTimer > 50) {
        // Just crown remaining
        if (this._crownLeft) {
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(this.x + this.width / 2 - 6, this.groundY + 10, 12, 6);
        }
        return;
      }
      const alpha = 1 - this.deathTimer / 50;
      ctx.globalAlpha = alpha;
      this.renderKing(ctx);
      ctx.globalAlpha = 1;
      return;
    }

    // Render gold coins on ground
    for (const coin of this.goldCoinsOnGround) {
      const pulse = Math.sin(GAME.frameCount * 0.1) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 215, 0, ${pulse})`;
      ctx.fillRect(coin.x, coin.y, coin.w, coin.h);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(coin.x + 1, coin.y + 1, coin.w - 2, coin.h - 2);
    }

    if (this.flashWhite > 0 && this.flashWhite % 2 === 0) {
      ctx.globalAlpha = 0.7;
    }

    this.renderKing(ctx);
    ctx.globalAlpha = 1;
  }

  renderKing(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);

    // Body (slightly larger goblin)
    ctx.fillStyle = '#6a9a4a';
    ctx.fillRect(x + 4, y + 10, this.width - 8, this.height - 14);

    // Velvet cape (tattered)
    const capeWave = Math.sin(this.animFrame * 0.2) * 2;
    ctx.fillStyle = '#8a2a4a';
    ctx.fillRect(x + 2, y + 14, this.width - 4 + capeWave, this.height - 20);

    // Legs
    ctx.fillStyle = '#5a8a3a';
    ctx.fillRect(x + 6, y + this.height - 12, 8, 12);
    ctx.fillRect(x + this.width - 14, y + this.height - 12, 8, 12);

    // Head
    ctx.fillStyle = '#6a9a4a';
    ctx.fillRect(x + this.width / 2 - 8, y - 6, 16, 16);

    // Ears (big)
    ctx.fillStyle = '#4a7a2a';
    ctx.fillRect(x + 4, y - 12, 7, 10);
    ctx.fillRect(x + this.width - 11, y - 12, 7, 10);

    // Golden crown (lopsided)
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(x + this.width / 2 - 8, y - 10, 16, 6);
    // Crown spikes
    ctx.fillStyle = '#ffcc00';
    ctx.fillRect(x + this.width / 2 - 6, y - 14, 3, 6);
    ctx.fillRect(x + this.width / 2, y - 12, 3, 4);
    ctx.fillRect(x + this.width / 2 + 3, y - 13, 3, 5);

    // Yellow chattering teeth
    ctx.fillStyle = '#dddd88';
    const chatter = Math.sin(this.animFrame * 1.5) > 0;
    ctx.fillRect(x + this.width / 2 - 3, y + 6, 6, chatter ? 2 : 3);

    // Eyes
    ctx.fillStyle = '#ffff44';
    ctx.fillRect(x + this.width / 2 - 5, y + 1, 3, 3);
    ctx.fillRect(x + this.width / 2 + 2, y + 1, 3, 3);

    // Gold sack (clinking)
    if (!this.greedTriggered || this.greedPhase) {
      ctx.fillStyle = '#B8860B';
      ctx.fillRect(x + this.width / 2 - 4, y + 12, 8, 6);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(x + this.width / 2 - 2, y + 13, 4, 2);
    }
  }
};
