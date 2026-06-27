// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Goblin (Tier 1: The Horde)
// Quick, twitchy, cowardly. Swarm coordination, surround, bait.
// Panic dodge only at low HP.
// ============================================================

class Goblin extends Enemy {
  constructor(config = {}) {
    super({
      id: 'goblin',
      name: 'Goblin',
      type: 'goblin',
      tier: 1,
      width: 20,
      height: 28,
      maxHP: 15,
      damage: 4,
      walkSpeed: 2.2,
      aggression: 40,
      fear: 70,
      greed: 50,
      patience: 10,
      hurtbox: { x: 0, y: 0, w: 20, h: 28 },
      ...config,
    });
    this.panicDodgeReady = true;
    this.panicDodgeCooldown = 0;
    this.dodging = false;
    this.rockThrowCooldown = 0;
    this.swarmRole = 'rusher'; // 'bait' or 'rusher' — assigned dynamically
    this._swarmRoleAssigned = false;
  }

  /** Count alive goblins in the current enemy list */
  _countAliveGoblins() {
    if (!GAME.enemies) return 0;
    let count = 0;
    for (const e of GAME.enemies) {
      if (e.type === 'goblin' && !e.dead) count++;
    }
    return count;
  }

  /** Get all alive goblins sorted by id for deterministic role assignment */
  _getAliveGoblins() {
    if (!GAME.enemies) return [];
    const goblins = [];
    for (const e of GAME.enemies) {
      if (e.type === 'goblin' && !e.dead) goblins.push(e);
    }
    goblins.sort((a, b) => a.id.localeCompare(b.id));
    return goblins;
  }

  updateAI() {
    const player = GAME.player;
    if (!player || player.dead) return;

    if (this.panicDodgeCooldown > 0) this.panicDodgeCooldown--;
    if (this.rockThrowCooldown > 0) this.rockThrowCooldown--;

    // === PANIC DODGE: only triggers when HP < 50% (not on every button press) ===
    if (this.hp < this.maxHP * 0.5 && this.panicDodgeCooldown <= 0 && this.state !== 'attack' && !this.dodging) {
      const playerPressed = IN.justPressed && (
        Object.keys(IN.justPressed).some(k => ['j','z','k','x','l','c'].includes(k))
      );
      if (playerPressed && Math.random() < 0.6) {
        this.panicDodge();
      }
    }

    if (this.dodging) return;

    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // === SWARM COORDINATION ===
    const goblinCount = this._countAliveGoblins();
    const aliveGoblins = this._getAliveGoblins();

    // Assign roles: when 3+ goblins alive, one is "bait" (stays far, throws rocks)
    if (goblinCount >= 3 && !this._swarmRoleAssigned) {
      // First goblin by id becomes bait
      const baitIndex = 0;
      aliveGoblins.forEach((g, i) => {
        g.swarmRole = (i === baitIndex) ? 'bait' : 'rusher';
        g._swarmRoleAssigned = true;
      });
    }
    // Re-assign if goblin count drops below 3
    if (goblinCount < 3) {
      this.swarmRole = 'rusher';
      this._swarmRoleAssigned = false;
    }

    // === BAIT BEHAVIOR ===
    if (this.swarmRole === 'bait') {
      // Stay at medium-far range and throw rocks
      const preferredBaitDist = 180;
      if (dist < preferredBaitDist - 40) {
        // Back away to maintain distance
        this.x += this.facingRight ? -this.walkSpeed * 0.8 : this.walkSpeed * 0.8;
        this.state = 'walk';
      } else if (dist > preferredBaitDist + 40) {
        this.x += this.facingRight ? this.walkSpeed * 0.5 : -this.walkSpeed * 0.5;
        this.state = 'walk';
      } else {
        // Strafe side to side while throwing
        const strafe = Math.sin(this.animFrame * 0.08) * 1.2;
        this.x += strafe;
        this.state = 'idle';
      }

      // Throw rocks frequently as bait
      if (this.rockThrowCooldown <= 0) {
        this.throwRock();
      }
      return;
    }

    // === RUSHER / SURROUND BEHAVIOR ===
    // Count how many rushers are already on each side of the player
    let leftSide = 0, rightSide = 0;
    for (const g of aliveGoblins) {
      if (g === this || g.swarmRole !== 'rusher') continue;
      if (g.x < player.x) leftSide++; else rightSide++;
    }

    // Try to position on the less-populated side (surround)
    const iAmLeft = this.x < player.x;
    const mySideCount = iAmLeft ? leftSide : rightSide;
    const otherSideCount = iAmLeft ? rightSide : leftSide;

    // If goblin count is 2+ and my side is crowded, circle around
    if (goblinCount >= 2 && mySideCount > otherSideCount && dist > 60) {
      // Circle: move perpendicular to player to get to the other side
      const circleDir = iAmLeft ? 1 : -1;
      this.y += circleDir * 1.5;
      // Also move past the player
      this.x += this.facingRight ? this.walkSpeed * 0.6 : -this.walkSpeed * 0.6;
      this.state = 'walk';
      return;
    }

    // Rock throw at medium range
    if (this.rockThrowCooldown <= 0 && dist > 80 && dist < 300) {
      this.throwRock();
      return;
    }

    // Zigzag approach when rushing
    if (dist > 50) {
      const zigzag = Math.sin(this.animFrame * 0.3) * 1.5;
      this.x += (this.facingRight ? 1 : -1) * this.walkSpeed + zigzag * 0.3;
      this.state = 'walk';
    } else if (dist < 30 && this.attackCooldown <= 0) {
      this.attackPlayer();
    }
  }

  panicDodge() {
    this.dodging = true;
    this.invincible = true;
    this.invincibleTimer = 10;
    this.panicDodgeCooldown = 60;

    // Roll sideways
    const dir = Math.random() > 0.5 ? 1 : -1;
    const rollDist = 40;
    const startX = this.x;

    const rollFrames = 10;
    let frame = 0;
    const rollInterval = setInterval(() => {
      if (frame >= rollFrames || this.dead) {
        this.dodging = false;
        clearInterval(rollInterval);
        return;
      }
      this.x += (rollDist / rollFrames) * dir;
      this.y += Math.sin((frame / rollFrames) * Math.PI) * 8;
      frame++;
    }, 16);
  }

  throwRock() {
    this.rockThrowCooldown = 50;
    CMB.spawnProjectile({
      x: this.x + this.width / 2,
      y: this.y + this.height * 0.3,
      vx: this.facingRight ? 4 : -4,
      vy: -3,
      w: 6, h: 6,
      damage: 3,
      owner: this,
      ownerIsPlayer: false,
      life: 90,
      color: '#8a8a7a',
    });
  }

  renderEnemy(ctx) {
    const x = Math.round(this.x);
    const y = Math.round(this.y);
    const bob = Math.sin(this.animFrame * 0.3) * 2;
    const lean = this.facingRight ? 1 : -1;

    // Body
    ctx.fillStyle = '#5a8a3a';
    ctx.fillRect(x + 2, y + 6 + bob, this.width - 4, this.height - 10);

    // Legs (quick, twitchy)
    ctx.fillStyle = '#4a6a2a';
    ctx.fillRect(x + 3, y + this.height - 8, 5, 8);
    ctx.fillRect(x + this.width - 8, y + this.height - 8, 5, 8);

    // Head (big for small body)
    ctx.fillStyle = '#6a9a4a';
    ctx.fillRect(x + 1, y - 4, this.width - 2, 12);

    // Ears
    ctx.fillStyle = '#4a7a2a';
    ctx.fillRect(x - 2, y - 8, 5, 6);
    ctx.fillRect(x + this.width - 3, y - 8, 5, 6);

    // Eyes (beady, yellow)
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(x + 4, y + 1, 3, 3);
    ctx.fillRect(x + this.width - 7, y + 1, 3, 3);

    // Chattering teeth
    ctx.fillStyle = '#dddddd';
    const teethChatter = Math.sin(this.animFrame * 0.8) > 0;
    ctx.fillRect(x + this.width / 2 - 2, y + 6, 4, teethChatter ? 2 : 1);

    // Weapon (small club or dagger)
    ctx.fillStyle = '#8a7a6a';
    ctx.fillRect(x + (this.facingRight ? this.width : -6), y + 8, 6, 3);

    // Bait role indicator: small rock in hand
    if (this.swarmRole === 'bait' && !this.dead) {
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(x + (this.facingRight ? this.width + 1 : -5), y + 4, 4, 4);
    }
  }
};
