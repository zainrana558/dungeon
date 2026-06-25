// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Main Entry Point
// Game initialization, debug toggle, input mapping
// ============================================================

(function() {
  'use strict';

  // ---- Ensure AudioContext is ready (requires user gesture) ----
  document.addEventListener('click', () => {
    if (SFX && SFX.ctx && SFX.ctx.state === 'suspended') {
      SFX.ctx.resume();
    }
  }, { once: true });

  document.addEventListener('keydown', () => {
    if (SFX && SFX.ctx && SFX.ctx.state === 'suspended') {
      SFX.ctx.resume();
    }
  }, { once: true });

  // ---- Debug toggle ----
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === '~') {
      GAME.debug = !GAME.debug;
    }
    if (e.key === 'm' && e.ctrlKey) {
      SFX.toggleMute();
    }
    // Pause
    if (e.key === 'Escape') {
      if (GAME.state === 'PLAYING') {
        GAME.state = 'PAUSED';
      } else if (GAME.state === 'PAUSED') {
        GAME.state = 'PLAYING';
      }
    }
  });

  // ---- Player input handling hook ----
  // Extend Character.update() to read inputs
  const originalCharacterUpdate = Character.prototype.update;
  Character.prototype.update = function() {
    originalCharacterUpdate.call(this);

    // Only process inputs for the player character
    if (this !== GAME.player || GAME.state !== 'PLAYING') return;

    // Cannot act during hitstun, dead, or block stun
    if (this.state === 'hitstun' || this.state === 'dead' || this.blockStun > 0) return;

    // Check for attacks
    if (IN.isBuffered('LIGHT', 10)) {
      this.lightAttack();
    }
    if (IN.isBuffered('HEAVY', 10)) {
      this.heavyAttack();
    }
    if (IN.isBuffered('SPECIAL', 10)) {
      this.specialAttack();
    }
    if (IN.isBuffered('GRAB', 8)) {
      this.grabAttack();
    }

    // Coyote buffer: attack near ground
    if (!this.grounded && IN.checkCoyote(this.id) && (
      IN.isBuffered('LIGHT', 6) || IN.isBuffered('HEAVY', 6)
    )) {
      // Ground attack executes immediately upon landing
      if (IN.isBuffered('HEAVY', 6)) {
        this.heavyAttack();
      }
      IN.consumeCoyote(this.id);
    }
  };

  // ---- Enemy AI hook for skeletons ----
  // Update necro skeletons each frame
  const originalGameUpdate = GAME.updateGameplay;
  GAME.updateGameplay = function() {
    originalGameUpdate.call(this);

    // Update necromancer skeletons
    if (this.player && this.player.characterType === 'necromancer') {
      for (const skel of this.player.skeletons) {
        skel.update();
      }
    }
  };

  // ---- Tower update hook ----
  const originalUpdate = GAME.update;
  GAME.update = function() {
    originalUpdate.call(this);

    // Update tower wave system
    if (this.state === 'PLAYING') {
      TowerSystem.update();
    }
  };

  // ---- Player death handler ----
  const originalDie = Character.prototype.die;
  Character.prototype.die = function() {
    originalDie.call(this);

    if (this === GAME.player) {
      // Transition to defeat screen after death animation
      setTimeout(() => {
        if (GAME.state === 'PLAYING') {
          GAME.state = 'DEFEAT';
          ScreenSystem.initDefeat();
        }
      }, 1200);
    }
  };

  // ---- Boss death handler ----
  // Override enemy death to check if it's a boss
  const originalEnemyDie = Enemy.prototype.die;
  Enemy.prototype.die = function() {
    originalEnemyDie.call(this);

    if (this.tier === 'boss') {
      // Boss defeated!
      GAME.score += 1000 * (TowerSystem.currentFloor / 5);

      if (this.constructor.name === 'Archdemon') {
        // Archdemon: soft-reboot to menu after dramatic defeat
        setTimeout(() => {
          if (GAME.state === 'PLAYING') {
            GAME.state = 'VICTORY';
            ScreenSystem.initVictory();
          }
        }, 3000);
      }
    }
  };

  // ---- Player damage tracking for tower ----
  const originalTakeDamage = Character.prototype.takeDamage;
  Character.prototype.takeDamage = function(amount, attacker, attack) {
    originalTakeDamage.call(this, amount, attacker, attack);

    if (this === GAME.player && GAME.state === 'PLAYING') {
      TowerSystem.recordHit();
    }
  };

  // ---- Keyboard shortcut for quick character testing ----
  window.addEventListener('keydown', (e) => {
    const numKeys = { '1': 'knight', '2': 'assassin', '3': 'mage',
                      '4': 'necromancer', '5': 'paladin', '6': 'warrior' };
    if (numKeys[e.key] && GAME.state === 'MENU') {
      GAME.startGame(numKeys[e.key]);
      HUDSystem.reset();
    }
  });

  console.log('⚔️  PIXEL FURY: ETHEREAL SPIRE — Ready');
  console.log('   Controls: WASD = Move | J = Light | K = Heavy | L = Special | U = Grab | Shift = Block');
  console.log('   Debug: press ` (backtick) to toggle hitboxes');
  console.log('   Quick start: press 1-6 at menu for characters');
})();
