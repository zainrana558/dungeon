// ============================================================
// FINAL BOSS: THE ARCHDEMON (Azazoth the Glitch) — Floor 25
// Adaptive AI, Regret System, Tilt State, Hidden Defeat Condition
// ============================================================

class Archdemon extends Enemy {
  constructor(config = {}) {
    super({
      id: 'archdemon',
      name: 'Archdemon Azazoth',
      type: 'archdemon',
      tier: 'boss',
      width: 48,
      height: 56,
      maxHP: 500,
      damage: 18,
      walkSpeed: 2.0,
      aggression: 100,
      fear: 5,
      greed: 0,
      patience: 80,
      hurtbox: { x: 0, y: 0, w: 48, h: 56 },
      ...config,
    });

    // Adaptive Engine
    this.tendencyHistory = [];    // Last 300 frames of player actions
    this.unlockedMoves = [];      // Moves unlocked based on player tendencies

    // Track counts
    this.playerSpecialCount = 0;
    this.playerBlockCount = 0;
    this.playerJumpCount = 0;
    this.playerDashCount = 0;

    // Regret System
    this.punishedMoves = {};      // Moves avoided after punishment
    this.fearDrive = 0;

    // Tilt State
    this.frustrationMeter = 0;
    this.tilted = false;
    this.attackAccuracy = 1.0;

    // Hidden Defeat Condition
    this.searchState = false;
    this.searchTimer = 0;
    this.playerStoppedFrames = 0;

    // Combat
    this.attackTimer = 0;
    this.specialMoveTimer = 0;
    this.reflecting = false;
    this.grabAttempting = false;
    this.minesPlaced = [];

    // Visual
    this.glitchTimer = 0;
    this.glitchOffset = { x: 0, y: 0 };
    this.formShift = 0;
  }

  updateAI() {
    const player = GAME.player;
    if (!player || player.dead) return;

    // Track player tendencies
    this.trackPlayerTendencies();

    // Adaptive unlocking
    this.updateAdaptiveMoves();

    // Glitch visual
    this.glitchTimer++;

    // Search state (hidden defeat condition)
    if (this.searchState) {
      this.searchTimer++;
      if (this.searchTimer >= 30) {
        // Fully vulnerable for 30 frames — only guaranteed Ultimate Combo window
        this.vulnerable = true;
        this.invincible = false;
      }
      return;
    }

    // Normal AI

    // Frustration check
    this.frustrationMeter = Math.max(0, this.frustrationMeter - 0.02);
    if (this.frustrationMeter >= 100 && !this.tilted) {
      this.enterTiltState();
    }

    if (this.tilted) {
      this.updateTilted();
      return;
    }

    // Movement
    const dx = player.x - this.x;
    const dist = Math.abs(dx);
    this.facingRight = dx > 0;

    // Position at medium range
    if (dist > 100) {
      this.x += this.facingRight ? this.walkSpeed : -this.walkSpeed;
    } else if (dist < 40) {
      this.x -= this.facingRight ? this.walkSpeed : -this.walkSpeed;
    }

    // Attack rotation
    this.attackTimer++;
    if (this.attackTimer >= 60 && this.attackCooldown <= 0) {
      this.attackTimer = 0;
      this.chooseAttack();
    }

    // Special move timer
    this.specialMoveTimer++;
    if (this.specialMoveTimer >= 200) {
      this.specialMoveTimer = 0;
      this.useUnlockedMove();
    }

    // Glitch position
    if (Math.random() < 0.02) {
      this.glitchOffset.x = (Math.random() - 0.5) * 8;
      this.glitchOffset.y = (Math.random() - 0.5) * 4;
    } else {
      this.glitchOffset.x *= 0.8;
      this.glitchOffset.y *= 0.8;
    }
  }

  trackPlayerTendencies() {
    const player = GAME.player;
    if (!player) return;

    // Record last 300 frames
    this.tendencyHistory.push({
      frame: GAME.frameCount,
      attacking: player.state === 'attack',
      blocking: player.isBlocking,
      jumping: !player.grounded,
      dashing: Math.abs(player.currentSpeed) > player.walkSpeed,
      usingSpecial: player.specialCooldown === 1, // Just used
    });

    if (this.tendencyHistory.length > 300) {
      this.tendencyHistory.shift();
    }

    // Count recent tendencies
    const recent = this.tendencyHistory.slice(-60);
    this.playerSpecialCount = recent.filter(t => t.usingSpecial).length;
    this.playerBlockCount = recent.filter(t => t.blocking).length;
    this.playerJumpCount = recent.filter(t => t.jumping).length;
    this.playerDashCount = recent.filter(t => t.dashing).length;

    // Hidden defeat condition: player just walks forward for 60 frames
    if (player.currentSpeed > 0 && Math.abs(player.currentSpeed) < player.walkSpeed * 1.2
        && !player.isBlocking && player.state !== 'attack') {
      this.playerStoppedFrames++;
    } else if (player.state === 'attack' || player.isBlocking || Math.abs(player.currentSpeed) > player.walkSpeed * 1.5) {
      this.playerStoppedFrames = 0;
    }

    if (this.playerStoppedFrames >= 60 && !this.searchState) {
      this.enterSearchState();
    }
  }

  updateAdaptiveMoves() {
    // Spam specials → unlock REFLECT_STANCE
    if (this.playerSpecialCount > 8 && !this.unlockedMoves.includes('reflect')) {
      this.unlockedMoves.push('reflect');
    }

    // Block too much → unlock GRAB_ATTEMPT
    if (this.playerBlockCount > 30 && !this.unlockedMoves.includes('grab')) {
      this.unlockedMoves.push('grab');
      this.frustrationMeter += 10;
    }

    // Dash/jump constantly → unlock ZONE_TRAP
    if (this.playerJumpCount + this.playerDashCount > 30 && !this.unlockedMoves.includes('zone')) {
      this.unlockedMoves.push('zone');
    }
  }

  enterSearchState() {
    this.searchState = true;
    this.searchTimer = 0;
    this.invincible = true;
    this.state = 'idle';
  }

  enterTiltState() {
    this.tilted = true;
    this.walkSpeed *= 1.2; // 20% faster
    this.attackAccuracy = 0.5; // 50% less accurate
    GAME.triggerFlash('rgba(255, 0, 0, 0.1)', 30);
  }

  updateTilted() {
    const player = GAME.player;
    if (!player) return;

    // Wild heavy attacks with huge whiff windows
    this.attackCooldown--;
    if (this.attackCooldown <= 0) {
      this.attackCooldown = 30;

      // Randomly whiff (50% less accurate)
      if (Math.random() < this.attackAccuracy) {
        this.heavyAttack();
      } else {
        // Whiff — just swing wildly, massive recovery
        this.currentAttacks.push(CMB.createAttack(this, {
          startup: 15, active: 8, recovery: 30,
          damage: 25,
          hitbox: { x: -10, y: -5, w: 70, h: 50 },
          knockback: 12, hitstun: 24,
          whooshFrame: 12,
        }));
      }
    }

    // Move forward
    this.x += this.facingRight ? this.walkSpeed : -this.walkSpeed;

    // Tilt wears off after 10 seconds
    if (this.attackTimer > 600) {
      this.tilted = false;
      this.walkSpeed /= 1.2;
      this.frustrationMeter = 0;
    }
  }

  chooseAttack() {
    const attacks = ['light', 'heavy', 'special'];

    // Regret: avoid moves that got punished
    for (const move of Object.keys(this.punishedMoves)) {
      if (this.punishedMoves[move] > 0) {
        const idx = attacks.indexOf(move);
        if (idx >= 0 && Math.random() < 0.7) {
          attacks.splice(idx, 1);
        }
      }
    }

    const choice = attacks[Math.floor(Math.random() * attacks.length)];

    // Add unlocked moves to pool
    if (this.unlockedMoves.includes('reflect') && Math.random() < 0.3) {
      this.reflectStance();
      return;
    }
    if (this.unlockedMoves.includes('grab') && Math.random() < 0.3) {
      this.grabAttempt();
      return;
    }
    if (this.unlockedMoves.includes('zone') && Math.random() < 0.2) {
      this.placeZoneTrap();
      return;
    }

    switch (choice) {
      case 'light':
        this.lightAttack();
        break;
      case 'heavy':
        this.heavyAttack();
        break;
      case 'special':
        this.specialAttack();
        break;
    }
  }

  lightAttack() {
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 6, active: 3, recovery: 10,
      damage: 12,
      hitbox: { x: 30, y: 10, w: 30, h: 20 },
      knockback: 4, hitstun: 14,
      whooshFrame: 4,
    }));
  }

  heavyAttack() {
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 14, active: 6, recovery: 25,
      damage: 24,
      hitbox: { x: 35, y: 5, w: 40, h: 30 },
      knockback: 10, hitstun: 24,
      whooshFrame: 10,
    }));
  }

  specialAttack() {
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 10, active: 5, recovery: 20,
      damage: 18,
      hitbox: { x: 20, y: -5, w: 50, h: 40 },
      knockback: 8, hitstun: 20,
      whooshFrame: 8,
    }));
  }

  reflectStance() {
    this.reflecting = true;
    this.state = 'attack';

    // If player uses special, parry and deal 20 damage back
    const checkReflect = setInterval(() => {
      if (!this.reflecting || this.dead) {
        clearInterval(checkReflect);
        return;
      }
    }, 16);

    setTimeout(() => {
      this.reflecting = false;
      clearInterval(checkReflect);
    }, 1000);
  }

  grabAttempt() {
    this.grabAttempting = true;
    this.state = 'attack';
    this.currentAttacks.push(CMB.createAttack(this, {
      startup: 10, active: 4, recovery: 15,
      damage: 15,
      hitbox: { x: 15, y: 5, w: 22, h: 30 },
      knockback: 6, hitstun: 18,
      isGrab: true,
    }));
  }

  placeZoneTrap() {
    const player = GAME.player;
    if (!player) return;

    const trapX = player.x + player.width / 2;
    const trapY = player.y + player.height;
    this.minesPlaced.push({ x: trapX, y: trapY, life: 180 });

    // Mine explodes after 3 seconds or on contact
    setTimeout(() => {
      const idx = this.minesPlaced.findIndex(m => m.x === trapX && m.y === trapY);
      if (idx >= 0) {
        CMB.addExplosion(trapX, trapY, 50, 12, this, false);
        this.minesPlaced.splice(idx, 1);
      }
    }, 3000);
  }

  useUnlockedMove() {
    if (this.unlockedMoves.length === 0) return;

    const move = this.unlockedMoves[Math.floor(Math.random() * this.unlockedMoves.length)];
    switch (move) {
      case 'reflect': this.reflectStance(); break;
      case 'grab': this.grabAttempt(); break;
      case 'zone': this.placeZoneTrap(); break;
    }
  }

  takeDamage(amount, attacker, attack) {
    if (this.dead) return;

    // Regret system: if punished successfully, fear drive spikes
    if (this.currentAttacks.length > 0) {
      const currentMove = this.currentAttacks[0].damage > 20 ? 'heavy' :
                          this.currentAttacks[0].damage > 12 ? 'special' : 'light';
      this.punishedMoves[currentMove] = 20; // Avoid this move for 20 seconds
      this.fearDrive = Math.min(100, this.fearDrive + 30);
    }

    // Reflection: parry special back at player
    if (this.reflecting && attack && attack.damage >= 14) {
      // Parry!
      GAME.player.takeDamage(20, this, null);
      ParticleSystem.addSparks(this.x + this.width / 2, this.y + this.height / 2, 10);
      SFX.playImpact('counter');
      this.reflecting = false;
      return;
    }

    super.takeDamage(amount, attacker, attack);

    // Frustration increases
    this.frustrationMeter += 3;
  }

  onBlocked(attacker, attack) {
    super.onBlocked(attacker, attack);
    this.frustrationMeter += 5; // Blocking his attacks makes him angry
  }

  render(ctx) {
    if (this.dead) {
      // Glitch death
      ctx.fillStyle = ['#ff0000', '#00ff00', '#0000ff', '#ffffff'][Math.floor(Math.random() * 4)];
      ctx.fillRect(0, 0, GAME.width, GAME.height);
      return;
    }

    const x = Math.round(this.x + this.glitchOffset.x);
    const y = Math.round(this.y + this.glitchOffset.y);

    // Search state — completely still
    if (this.searchState) {
      // Silhouette only
      ctx.fillStyle = 'rgba(80, 0, 100, 0.3)';
      ctx.fillRect(x, y, this.width, this.height);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.fillRect(x + this.width / 2 - 2, y + this.height / 2 - 2, 4, 4);
      return;
    }

    // Form shifting
    this.formShift += 0.05;

    // Body — shifting mass of purple/black/magenta pixels
    const hue = (Math.sin(this.formShift) * 30 + 280) % 360;
    ctx.fillStyle = `hsl(${hue}, 80%, 15%)`;
    ctx.fillRect(x + 4, y + 6, this.width - 8, this.height - 12);

    // Jagged edges
    for (let i = 0; i < 12; i++) {
      const jx = x + i * 4;
      const jLen = 4 + Math.sin(i * 1.5 + this.formShift) * 3;
      ctx.fillStyle = `hsl(${hue + 20}, 90%, 25%)`;
      ctx.fillRect(jx, y, 3, jLen);
      ctx.fillRect(jx, y + this.height - jLen, 3, jLen);
    }

    // Glitch pixels
    for (let i = 0; i < 5; i++) {
      const gx = x + Math.random() * this.width;
      const gy = y + Math.random() * this.height;
      ctx.fillStyle = ['#ff00ff', '#00ffff', '#ffff00', '#ff0000'][i % 4];
      ctx.fillRect(gx, gy, 2, 2);
    }

    // White slash eyes (blink in and out)
    if (Math.floor(this.glitchTimer / 8) % 5 !== 0) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + this.width / 2 - 6, y + 14, 5, 2);
      ctx.fillRect(x + this.width / 2 + 2, y + 14, 5, 2);
    }

    // Negative-color player silhouette (half opacity)
    if (GAME.player) {
      ctx.save();
      ctx.globalAlpha = 0.15;
      const px = x + (GAME.player.x - x) * 0.3;
      const py = y + (GAME.player.y - y) * 0.3;
      ctx.fillStyle = '#ff00ff';
      ctx.fillRect(px, py, GAME.player.width, GAME.player.height);
      ctx.restore();
    }

    // Mines
    for (const mine of this.minesPlaced) {
      const pulse = Math.sin(GAME.frameCount * 0.2) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(255, 0, 100, ${pulse})`;
      ctx.fillRect(mine.x - 4, mine.y - 4, 8, 8);
      ctx.fillStyle = '#ff0066';
      ctx.fillRect(mine.x - 2, mine.y - 2, 4, 4);
    }

    // Reflect stance visual
    if (this.reflecting) {
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x + this.width / 2, y + this.height / 2, 35, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Tilt state visual
    if (this.tilted) {
      ctx.fillStyle = 'rgba(255, 0, 0, 0.08)';
      ctx.fillRect(x - 6, y - 6, this.width + 12, this.height + 12);
    }

    // Frustration meter (subtle)
    const frustBarW = this.width;
    ctx.fillStyle = `rgba(255, ${255 - this.frustrationMeter * 2}, 0, 0.3)`;
    ctx.fillRect(x, y - 8, frustBarW * (this.frustrationMeter / 100), 3);
  }

  die() {
    this.dead = true;
    this.deathTimer = 0;

    // Glitches wildly, shatters into colored fragments
    GAME.triggerFlash('rgba(255, 255, 255, 0.5)', 30);
    for (let i = 0; i < 20; i++) {
      ParticleSystem.addExplosion(
        this.x + Math.random() * this.width,
        this.y + Math.random() * this.height,
        40 + Math.random() * 60,
        ['#ff00ff', '#00ffff', '#ffff00', '#ff0000', '#0000ff'][i % 5]
      );
    }

    SFX.playImpact('ko');
  }
};
