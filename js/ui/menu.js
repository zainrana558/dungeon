// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Menu System
// Main menu, character select, bonfire upgrades
// ============================================================

const MenuSystem = {
  // Main menu state
  menuOption: 0,
  menuOptions: ['START GAME', 'CHARACTERS', 'CONTROLS', 'CREDITS'],
  menuBlink: 0,

  // Character select state
  charSelectIndex: 0,
  characters: [
    { type: 'knight', name: 'KNIGHT', desc: 'The Weight of Oaths' },
    { type: 'assassin', name: 'ASSASSIN', desc: 'A Blade in the Dark' },
    { type: 'mage', name: 'MAGE', desc: 'The Weaver of Reality' },
    { type: 'necromancer', name: 'NECROMANCER', desc: 'The Lord of Rot' },
    { type: 'paladin', name: 'PALADIN', desc: 'The Righteous Storm' },
    { type: 'warrior', name: 'WARRIOR', desc: 'The Unstoppable Rage' },
  ],

  // Bonfire state
  bonfireOption: 0,
  bonfireOptions: ['HEALTH +5', 'DAMAGE +2', 'SPEED +0.2', 'CONTINUE'],

  init() {
    this.menuOption = 0;
    this.charSelectIndex = 0;
    this.bonfireOption = 0;
  },

  update() {
    this.menuBlink++;

    // Navigate menu
    if (IN.isBuffered('UP', 4)) {
      this.menuOption = (this.menuOption - 1 + this.menuOptions.length) % this.menuOptions.length;
      SFX.playUISelect();
    }
    if (IN.isBuffered('DOWN', 4)) {
      this.menuOption = (this.menuOption + 1) % this.menuOptions.length;
      SFX.playUISelect();
    }

    // Confirm
    if (IN.isBuffered('LIGHT', 4) || IN.isBuffered('HEAVY', 4) || IN.isBuffered('SPECIAL', 4)) {
      SFX.playUIConfirm();
      switch (this.menuOption) {
        case 0:
          GAME.state = 'CHAR_SELECT';
          break;
        case 1:
          GAME.state = 'CHAR_SELECT';
          break;
        case 2:
          // Show controls
          break;
        case 3:
          // Show credits
          break;
      }
    }
  },

  render(ctx) {
    // Dark background with subtle pixel noise
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Starfield
    for (let i = 0; i < 50; i++) {
      const sx = (i * 173) % GAME.width;
      const sy = (i * 89) % GAME.height;
      const sAlpha = Math.sin(GAME.frameCount * 0.008 + i) * 0.3 + 0.4;
      ctx.fillStyle = `rgba(255, 255, 255, ${sAlpha})`;
      ctx.fillRect(sx, sy, 1, 1);
    }

    // Title
    const titleY = 120;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';

    // Title glow
    ctx.fillStyle = 'rgba(150, 0, 255, 0.2)';
    ctx.fillText('PIXEL FURY', GAME.width / 2 + 2, titleY + 2);

    ctx.fillStyle = '#ffffff';
    ctx.fillText('PIXEL FURY', GAME.width / 2, titleY);

    ctx.font = '16px monospace';
    ctx.fillStyle = '#8844cc';
    ctx.fillText('ETHEREAL SPIRE', GAME.width / 2, titleY + 28);

    // Menu options
    const menuStartY = 250;
    ctx.font = '14px monospace';

    for (let i = 0; i < this.menuOptions.length; i++) {
      const my = menuStartY + i * 35;

      if (i === this.menuOption) {
        // Selected option — arrow + highlight
        const blinkOn = Math.floor(this.menuBlink / 30) % 2 === 0;
        ctx.fillStyle = blinkOn ? '#ffd700' : '#ffaa00';
        ctx.fillText(`▶ ${this.menuOptions[i]}`, GAME.width / 2, my);
      } else {
        ctx.fillStyle = '#666688';
        ctx.fillText(`  ${this.menuOptions[i]}`, GAME.width / 2, my);
      }
    }

    ctx.textAlign = 'left';

    // Bottom text
    ctx.fillStyle = '#444466';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS J/K/L TO SELECT  •  ARROWS TO NAVIGATE', GAME.width / 2, GAME.height - 40);
    ctx.fillText('A / D : MOVE  |  W : JUMP  |  J : LIGHT  |  K : HEAVY  |  L : SPECIAL  |  SHIFT : BLOCK', GAME.width / 2, GAME.height - 20);
    ctx.textAlign = 'left';
  },

  // ============================================================
  // CHARACTER SELECT
  // ============================================================

  updateCharSelect() {
    if (IN.isBuffered('LEFT', 4)) {
      this.charSelectIndex = (this.charSelectIndex - 1 + this.characters.length) % this.characters.length;
      SFX.playUISelect();
    }
    if (IN.isBuffered('RIGHT', 4)) {
      this.charSelectIndex = (this.charSelectIndex + 1) % this.characters.length;
      SFX.playUISelect();
    }

    if (IN.isBuffered('LIGHT', 4) || IN.isBuffered('HEAVY', 4) || IN.isBuffered('SPECIAL', 4)) {
      SFX.playUIConfirm();
      GAME.startGame(this.characters[this.charSelectIndex].type);
      HUDSystem.reset();
    }

    // Back
    if (IN.isBuffered('GRAB', 4)) {
      GAME.state = 'MENU';
      SFX.playUISelect();
    }
  },

  renderCharSelect(ctx) {
    ctx.fillStyle = '#0a0a12';
    ctx.fillRect(0, 0, GAME.width, GAME.height);

    // Title
    ctx.fillStyle = '#ffffff';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE YOUR CHAMPION', GAME.width / 2, 50);

    const char = this.characters[this.charSelectIndex];

    // Character preview
    const previewX = GAME.width / 2 - 24;
    const previewY = 120;
    const tempChar = CharacterFactory.create(char.type, { x: previewX, y: previewY + 20 });
    tempChar.renderCharacter(ctx, previewX, previewY + 20);

    // Character name
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 24px monospace';
    ctx.fillText(char.name, GAME.width / 2, 240);

    // Character description
    ctx.fillStyle = '#8888aa';
    ctx.font = '13px monospace';
    ctx.fillText(char.desc, GAME.width / 2, 265);

    // Navigation arrows
    ctx.fillStyle = '#ffffff';
    ctx.font = '24px monospace';
    ctx.fillText('◀', GAME.width / 2 - 120, 160);
    ctx.fillText('▶', GAME.width / 2 + 110, 160);

    // Character indicators
    for (let i = 0; i < this.characters.length; i++) {
      const ix = GAME.width / 2 + (i - this.charSelectIndex) * 70;
      if (ix > 100 && ix < GAME.width - 100) {
        ctx.fillStyle = i === this.charSelectIndex ? '#ffd700' : '#444466';
        ctx.font = '10px monospace';
        ctx.fillText(this.characters[i].name, ix, 300);
      }
    }

    // Stats display
    const tempChar2 = CharacterFactory.create(char.type);
    ctx.fillStyle = '#aaaaaa';
    ctx.font = '10px monospace';
    ctx.fillText(`HP: ${tempChar2.maxHP}  |  SPD: ${tempChar2.walkSpeed.toFixed(1)}  |  DMG: ${tempChar2.baseDamage}`, GAME.width / 2, 330);

    // Selection prompt
    ctx.fillStyle = '#666688';
    ctx.font = '10px monospace';
    ctx.fillText('J/K/L TO SELECT  |  ← → TO NAVIGATE  |  U TO BACK', GAME.width / 2, GAME.height - 30);

    ctx.textAlign = 'left';
  },

  // ============================================================
  // BONFIRE MENU
  // ============================================================

  updateBonfire() {
    if (IN.isBuffered('UP', 4)) {
      this.bonfireOption = (this.bonfireOption - 1 + this.bonfireOptions.length) % this.bonfireOptions.length;
      SFX.playUISelect();
    }
    if (IN.isBuffered('DOWN', 4)) {
      this.bonfireOption = (this.bonfireOption + 1) % this.bonfireOptions.length;
      SFX.playUISelect();
    }

    if (IN.isBuffered('LIGHT', 4) || IN.isBuffered('HEAVY', 4) || IN.isBuffered('SPECIAL', 4)) {
      if (this.bonfireOption === 3) {
        // Continue
        TowerSystem.continueFromBonfire();
        HUDSystem.reset();
        SFX.playUIConfirm();
      } else {
        // Upgrade
        const stats = ['health', 'damage', 'speed'];
        if (TowerSystem.upgradeStat(stats[this.bonfireOption])) {
          SFX.playUIConfirm();
        } else {
          SFX.playUISelect();
        }
      }
    }
  },

  renderBonfire(ctx) {
    // Render fire and floor (handled by TowerSystem)
    // Overlay menu
    const mx = GAME.width / 2;
    const my = 180;

    ctx.fillStyle = '#ffd700';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BONFIRE REST', mx, my - 20);

    ctx.fillStyle = '#aaaaaa';
    ctx.font = '11px monospace';
    ctx.fillText(`SOUL SHARDS: ${GAME.soulShards}`, mx, my + 5);

    for (let i = 0; i < this.bonfireOptions.length; i++) {
      const oy = my + 40 + i * 30;
      if (i === this.bonfireOption) {
        ctx.fillStyle = '#ffd700';
        ctx.fillText(`▶ ${this.bonfireOptions[i]}`, mx, oy);
      } else {
        ctx.fillStyle = '#666688';
        ctx.fillText(`  ${this.bonfireOptions[i]}`, mx, oy);
      }
    }

    ctx.fillStyle = '#555577';
    ctx.font = '9px monospace';
    ctx.fillText('J/K/L TO SELECT  |  ARROWS TO NAVIGATE', mx, my + 40 + this.bonfireOptions.length * 30 + 15);

    ctx.textAlign = 'left';
  },
};

const MENU = MenuSystem;
