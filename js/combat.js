// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Combat System
// 3-phase attacks, hitstop, hitbox/hurtbox, counter-hit, KO detection
// ============================================================

const CombatSystem = {
  // Active projectiles in the world
  projectiles: [],

  // Active hit effects to render
  hitEffects: [],

  init() {
    this.projectiles = [];
    this.hitEffects = [];
  },

  // --- ATTACK STATE MACHINE ---

  // Create a new attack for an entity
  createAttack(entity, config) {
    return {
      entity: entity,
      // 3 sacred phases
      startupFrames: config.startup || 5,
      activeFrames: config.active || 3,
      recoveryFrames: config.recovery || 8,
      currentFrame: 0,
      phase: 'startup', // startup | active | recovery

      // Hitbox definition (relative to entity position)
      hitbox: config.hitbox || { x: 0, y: 0, w: 40, h: 30 },

      // Damage
      damage: config.damage || 10,
      knockback: config.knockback || 5,
      hitstun: config.hitstun || 15,

      // Properties
      isProjectile: config.isProjectile || false,
      isGrab: config.isGrab || false,
      guardCrush: config.guardCrush || false,
      freezes: config.freezes || false,
      freezeDuration: config.freezeDuration || 20,

      // Sound
      whooshFrame: config.whooshFrame || null, // Frame to play whoosh
      whooshPlayed: false,

      // Hit tracking (prevent multi-hit per swing)
      hasHit: false,
      hitEntities: new Set(),

      // Animation data
      animData: config.animData || null,
    };
  },

  // Advance attack through its phases
  updateAttack(attack) {
    attack.currentFrame++;

    // Phase transitions
    if (attack.phase === 'startup' && attack.currentFrame >= attack.startupFrames) {
      attack.phase = 'active';
    }
    if (attack.phase === 'active' && attack.currentFrame >= attack.startupFrames + attack.activeFrames) {
      attack.phase = 'recovery';
    }
    if (attack.phase === 'recovery' && attack.currentFrame >= attack.startupFrames + attack.activeFrames + attack.recoveryFrames) {
      return false; // Attack complete, remove it
    }

    // Play whoosh on specific frame
    if (attack.whooshFrame && attack.currentFrame === attack.whooshFrame && !attack.whooshPlayed) {
      attack.whooshPlayed = true;
      SFX.playWhoosh(attack.damage > 15 ? 'heavy' : 'light');
    }

    return true; // Attack still active
  },

  // Get the world-space hitbox for an attack
  getAttackHitbox(attack) {
    const e = attack.entity;
    const hb = attack.hitbox;
    const facing = e.facingRight ? 1 : -1;

    return {
      x: e.x + (e.facingRight ? hb.x : e.width - hb.x - hb.w),
      y: e.y + hb.y,
      w: hb.w,
      h: hb.h,
    };
  },

  // --- COLLISION DETECTION ---

  // Check if two rectangles overlap
  rectsOverlap(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  },

  // Check attack hitbox vs target hurtbox
  checkHit(attacker, attack, target) {
    // Can't hit self
    if (attacker === target) return false;

    // Already hit this entity with this attack
    if (attack.hitEntities.has(target.id || target.constructor.name)) return false;

    // Target must be alive
    if (target.dead || target.invincible) return false;

    const atkBox = this.getAttackHitbox(attack);
    const hurtBox = {
      x: target.x + (target.hurtbox ? target.hurtbox.x : 0),
      y: target.y + (target.hurtbox ? target.hurtbox.y : 0),
      w: target.hurtbox ? target.hurtbox.w : target.width,
      h: target.hurtbox ? target.hurtbox.h : target.height,
    };

    return this.rectsOverlap(atkBox, hurtBox);
  },

  // --- DAMAGE & HITSTOP ---

  // Apply a hit
  applyHit(attacker, target, attack, isCounterHit = false) {
    // Mark as hit to prevent multi-hit
    attack.hasHit = true;
    attack.hitEntities.add(target.id || target.constructor.name);

    // Calculate damage
    let damage = attack.damage;
    let hitstopFrames = 8; // Standard hitstop

    // Counter-hit: 1.5x damage, 14f hitstop
    if (isCounterHit) {
      damage = Math.floor(damage * 1.5);
      hitstopFrames = 14;
      GAME.triggerFlash('rgba(255, 50, 50, 0.2)', 8);
    }

    // Check for KO
    const willKill = target.hp - damage <= 0;

    // Apply block if target is blocking
    if (target.isBlocking && target.isBlocking(attacker) && !attack.guardCrush) {
      damage = 0;
      hitstopFrames = 6;
      this.addHitEffect(target.x + target.width / 2, target.y + target.height / 2, 'block');
      SFX.playImpact('light');
      target.blockStun = 10;
      target.onBlocked(attacker, attack);
      GAME.triggerShake(1, 3);
    } else {
      // Apply damage
      target.takeDamage(damage, attacker, attack);

      // Hitstop
      GAME.triggerHitstop(hitstopFrames);

      // Screen shake
      const shakeIntensity = willKill ? 4 : (damage > 15 ? 3 : 2);
      GAME.triggerShake(shakeIntensity, hitstopFrames);

      // Hit effect
      const effectType = isCounterHit ? 'counter' : (willKill ? 'ko' : 'normal');
      const hitX = target.x + target.width / 2;
      const hitY = target.y + target.height * 0.3;
      this.addHitEffect(hitX, hitY, effectType);

      // Sound
      if (willKill) {
        SFX.playImpact('ko');
        // Screen shatter for KO
        GAME.triggerFlash('rgba(255, 255, 255, 0.4)', 20);
      } else if (isCounterHit) {
        SFX.playImpact('counter');
        SFX.playGrunt(target.characterType || 'default', damage);
      } else {
        SFX.playImpact(damage > 12 ? 'heavy' : 'light');
        SFX.playGrunt(target.characterType || 'default', damage);
      }

      // Knockback
      if (attack.knockback > 0) {
        const dir = attacker.x < target.x ? 1 : -1;
        target.applyKnockback(dir * attack.knockback, attack.hitstun);
      }
    }

    return { damage, hitstopFrames, isCounterHit, isKO: willKill };
  },

  // Process all active attacks against all valid targets
  processAttacks(attacker, attacks, potentialTargets) {
    for (let i = attacks.length - 1; i >= 0; i--) {
      const attack = attacks[i];

      // Update attack phase
      if (!this.updateAttack(attack)) {
        attacks.splice(i, 1);
        continue;
      }

      // Only check hits during active phase
      if (attack.phase !== 'active') continue;
      if (attack.hasHit && !attack.isProjectile) continue;

      for (const target of potentialTargets) {
        if (this.checkHit(attacker, attack, target)) {
          // Counter-hit: target is in startup phase of their own attack
          const targetInStartup = target.currentAttacks &&
            target.currentAttacks.some(a => a.phase === 'startup');
          this.applyHit(attacker, target, attack, targetInStartup);
          break; // One hit per attack frame
        }
      }
    }
  },

  // --- PROJECTILES ---

  spawnProjectile(config) {
    this.projectiles.push({
      x: config.x,
      y: config.y,
      vx: config.vx || 0,
      vy: config.vy || 0,
      w: config.w || 8,
      h: config.h || 8,
      damage: config.damage || 10,
      owner: config.owner,
      ownerIsPlayer: config.ownerIsPlayer || false,
      life: config.life || 300,
      hitEntities: new Set(),
      color: config.color || '#ffff00',
      glow: config.glow || null,
      homing: config.homing || false,
      homingTarget: config.homingTarget || null,
      homingStrength: config.homingStrength || 1,
      explodeOnDeath: config.explodeOnDeath || false,
      explodeRadius: config.explodeRadius || 60,
      explodeDamage: config.explodeDamage || 15,
      phaseThrough: config.phaseThrough || false, // Phase through first N frames
      phaseFrames: config.phaseFrames || 0,
      phaseCount: 0,
      onExpire: config.onExpire || null,
    });
  },

  updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];

      // Homing
      if (p.homing && p.homingTarget) {
        const dx = p.homingTarget.x - p.x;
        const dy = p.homingTarget.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          p.vx += (dx / dist) * p.homingStrength * 0.1;
          p.vy += (dy / dist) * p.homingStrength * 0.1;
        }
      }

      p.x += p.vx;
      p.y += p.vy;
      p.life--;

      // Phase through tracking
      if (p.phaseThrough) p.phaseCount++;

      // Check collision with targets
      const targets = p.ownerIsPlayer ? GAME.enemies : [GAME.player];
      if (GAME.boss && !GAME.boss.dead) {
        if (p.ownerIsPlayer) targets.push(GAME.boss);
      }

      for (const target of targets) {
        if (!target || target.dead) continue;
        if (p.hitEntities.has(target.id)) continue;

        // Phase through during phase window
        if (p.phaseThrough && p.phaseCount < p.phaseFrames) continue;

        const hitbox = { x: p.x, y: p.y, w: p.w, h: p.h };
        const hurtbox = {
          x: target.x + (target.hurtbox ? target.hurtbox.x : 0),
          y: target.y + (target.hurtbox ? target.hurtbox.y : 0),
          w: target.hurtbox ? target.hurtbox.w : target.width,
          h: target.hurtbox ? target.hurtbox.h : target.height,
        };

        if (this.rectsOverlap(hitbox, hurtbox)) {
          p.hitEntities.add(target.id);

          // Apply damage
          const willKill = target.hp - p.damage <= 0;
          target.takeDamage(p.damage, p.owner, null);

          // Hit effects
          GAME.triggerHitstop(6);
          GAME.triggerShake(1, 4);
          this.addHitEffect(p.x + p.w / 2, p.y + p.h / 2, 'normal');
          SFX.playImpact('light');

          if (p.explodeOnDeath) {
            this.addExplosion(p.x, p.y, p.explodeRadius, p.explodeDamage, p.owner, p.ownerIsPlayer);
          }

          if (p.onExpire) p.onExpire(target, p);

          // Remove projectile on hit (unless it pierces)
          if (!p.explodeOnDeath) {
            this.projectiles.splice(i, 1);
          }
          break;
        }
      }

      // Check if projectile is off-screen or expired
      if (p.life <= 0 || p.x < -50 || p.x > GAME.width + 50 || p.y < -50 || p.y > GAME.height + 50) {
        if (p.onExpire) p.onExpire(null, p);
        this.projectiles.splice(i, 1);
      }
    }
  },

  // --- EXPLOSIONS ---

  addExplosion(x, y, radius, damage, owner, isPlayer) {
    // Add explosion particle effect
    ParticleSystem.addExplosion(x, y, radius);

    // Damage all targets in radius
    const targets = isPlayer ? [...GAME.enemies] : [GAME.player];
    if (GAME.boss && !GAME.boss.dead) {
      if (isPlayer) targets.push(GAME.boss);
    }

    for (const target of targets) {
      if (!target || target.dead) continue;
      const dx = target.x + target.width / 2 - x;
      const dy = target.y + target.height / 2 - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= radius) {
        target.takeDamage(damage, owner, null);
      }
    }

    GAME.triggerShake(3, 8);
    SFX.playImpact('heavy');
  },

  // --- HIT EFFECTS ---

  addHitEffect(x, y, type) {
    this.hitEffects.push({
      x, y, type,
      life: type === 'ko' ? 20 : 8,
      maxLife: type === 'ko' ? 20 : 8,
    });
  },

  updateHitEffects() {
    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      this.hitEffects[i].life--;
      if (this.hitEffects[i].life <= 0) {
        this.hitEffects.splice(i, 1);
      }
    }
  },

  render(ctx) {
    // Render projectiles
    for (const p of this.projectiles) {
      // Glow
      if (p.glow) {
        ctx.fillStyle = p.glow;
        ctx.globalAlpha = 0.3;
        ctx.fillRect(Math.round(p.x - 2), Math.round(p.y - 2), p.w + 4, p.h + 4);
        ctx.globalAlpha = 1;
      }
      // Projectile body
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x), Math.round(p.y), p.w, p.h);
    }

    // Render hit effects
    for (const e of this.hitEffects) {
      const alpha = e.life / e.maxLife;
      AN.drawHitEffect(ctx, e.x, e.y, e.type);
    }
  },

  update() {
    this.updateProjectiles();
    this.updateHitEffects();
  },
};

const CMB = CombatSystem;
