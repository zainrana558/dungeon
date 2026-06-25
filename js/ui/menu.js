// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Menu System
// Main menu, character select, bonfire upgrades
// ============================================================

const MenuSystem = {
  // Main menu state
  menuOption: 0,
  menuOptions: ['START GAME', 'CHARACTERS', 'CONTROLS', 'CREDITS'],
  menuBlink: 0,

  // Smooth highlight bar position (lerp target)
  menuHighlightY: 0,
  menuHighlightTargetY: 0,
  menuHighlightX: 0,

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

  // Smooth carousel position
  carouselOffset: 0,
  carouselTarget: 0,
  carouselDirection: 0, // -1, 0, or 1 for transition direction

  // Typewriter effect
  typewriterProgress: 0,
  typewriterText: '',

  // Bonfire state
  bonfireOption: 0,
  bonfireOptions: ['VITALITY +5', 'MIGHT +2', 'CELERITY +0.2', 'ASCEND'],
  bonfireHighlightY: 0,
  bonfireHighlightTargetY: 0,

  // Bonfire particle tracking
  bonfireEmbers: [],

  init() {
    this.menuOption = 0;
    this.charSelectIndex = 0;
    this.bonfireOption = 0;
    this.carouselOffset = 0;
    this.carouselTarget = 0;
    this.typewriterProgress = 0;
    this.typewriterText = '';
    this.menuHighlightY = 0;
    this.menuHighlightTargetY = 0;

    // Initialize highlight positions
    const menuStartY = 250;
    this.menuHighlightY = menuStartY + this.menuOption * 35;
    this.menuHighlightTargetY = this.menuHighlightY;

    const bonfireMy = 180;
    this.bonfireHighlightY = bonfireMy + 40 + this.bonfireOption * 30;
    this.bonfireHighlightTargetY = this.bonfireHighlightY;
  },

  update() {
    this.menuBlink++;

    // Smooth highlight bar lerp
    this.menuHighlightY += (this.menuHighlightTargetY - this.menuHighlightY) * 0.2;
    this.bonfireHighlightY += (this.bonfireHighlightTargetY - this.bonfireHighlightY) * 0.2;

    // Smooth carousel lerp
    this.carouselOffset += (this.carouselTarget - this.carouselOffset) * 0.15;

    // Typewriter progress
    if (this.typewriterProgress < this.typewriterText.length) {
      if (GAME.frameCount % 3 === 0) this.typewriterProgress++;
    }

    // Navigate menu
    if (IN.isBuffered('UP', 4)) {
      this.menuOption = (this.menuOption - 1 + this.menuOptions.length) % this.menuOptions.length;
      const menuStartY = 250;
      this.menuHighlightTargetY = menuStartY + this.menuOption * 35;
      SFX.playUISelect();
    }
    if (IN.isBuffered('DOWN', 4)) {
      this.menuOption = (this.menuOption + 1) % this.menuOptions.length;
      const menuStartY = 250;
      this.menuHighlightTargetY = menuStartY + this.menuOption * 35;
      SFX.playUISelect();
    }

    // Confirm
    if (IN.isBuffered('LIGHT', 4) || IN.isBuffered('HEAVY', 4) || IN.isBuffered('SPECIAL', 4)) {
      SFX.playUIConfirm();
      switch (this.menuOption) {
        case 0:
          GAME.state = 'CHAR_SELECT';
          this.resetCharSelect();
          break;
        case 1:
          GAME.state = 'CHAR_SELECT';
          this.resetCharSelect();
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

  // ============================================================
  // TITLE SCREEN RENDER
  // ============================================================

  render(ctx) {
    const w = GAME.width;
    const h = GAME.height;
    const t = GAME.frameCount;
    const titleY = 120;

    // ---------- AMBIENT BACKGROUND COLOR CYCLE ----------
    // deep purple → dark blue → black cycle
    const cyclePhase = Math.sin(t * 0.001) * 0.5 + 0.5; // 0..1 over ~10s
    const r = Math.floor(10 + cyclePhase * 15);
    const g = Math.floor(5 + cyclePhase * 8);
    const b = Math.floor(18 + cyclePhase * 24);
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    ctx.fillRect(0, 0, w, h);

    // Subtle upper gradient
    const grad = ctx.createLinearGradient(0, 0, 0, h * 0.6);
    grad.addColorStop(0, `rgba(30, 5, 60, 0.3)`);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h * 0.6);

    // ---------- STARS ----------
    for (let i = 0; i < 80; i++) {
      const sx = (i * 173 + 53) % w;
      const sy = (i * 89 + 11) % (h * 0.7);
      const twinkle = Math.sin(t * 0.012 + i * 2.7) * 0.4 + 0.6;
      const starSize = (i % 5 === 0) ? 2 : 1;
      ctx.fillStyle = `rgba(200, 210, 255, ${twinkle * 0.9})`;
      ctx.fillRect(Math.round(sx), Math.round(sy), starSize, starSize);

      // Occasional larger twinkle star
      if (i % 13 === 0 && twinkle > 0.85) {
        ctx.fillStyle = `rgba(255, 255, 255, ${twinkle})`;
        ctx.fillRect(Math.round(sx - 1), Math.round(sy - 1), starSize + 2, starSize + 2);
      }
    }

    // ---------- THE SPIRE (silhouetted tower) ----------
    this.drawSpire(ctx, w, h, t);

    // ---------- AMBIENT PARTICLES FLOATING UP ----------
    for (let i = 0; i < 15; i++) {
      const px = (i * 211 + 79) % w;
      const py = h - ((t * 0.4 + i * 43) % (h * 0.8));
      const palpha = 0.08 + Math.sin(t * 0.03 + i) * 0.05;
      ctx.fillStyle = `rgba(180, 140, 255, ${palpha})`;
      ctx.fillRect(Math.round(px), Math.round(py), 2, 3);
    }

    // ---------- TITLE WITH GLOW PULSE ----------
    const glowPhase = Math.sin(t * 0.04) * 0.5 + 0.5; // pulse

    // Outer glow
    ctx.fillStyle = `rgba(150, 0, 255, ${0.15 + glowPhase * 0.15})`;
    ctx.font = 'bold 36px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PIXEL FURY', w / 2 + 3, titleY + 3);
    ctx.fillText('PIXEL FURY', w / 2 - 2, titleY - 1);
    ctx.fillText('PIXEL FURY', w / 2 + 4, titleY - 2);
    ctx.fillText('PIXEL FURY', w / 2 - 3, titleY + 2);

    // Mid glow
    ctx.fillStyle = `rgba(200, 100, 255, ${0.4 + glowPhase * 0.3})`;
    ctx.fillText('PIXEL FURY', w / 2 + 1, titleY + 1);
    ctx.fillText('PIXEL FURY', w / 2 - 1, titleY);

    // Main text
    ctx.fillStyle = '#ffffff';
    ctx.fillText('PIXEL FURY', w / 2, titleY);

    // Subtitle
    const subGlow = Math.sin(t * 0.05 + 1) * 0.2 + 0.6;
    ctx.fillStyle = `rgba(136, 68, 204, ${subGlow})`;
    ctx.font = '16px monospace';
    ctx.fillText('ETHEREAL SPIRE', w / 2, titleY + 28);

    // Decorative line under title
    const lineWidth = 80 + Math.sin(t * 0.03) * 20;
    ctx.fillStyle = `rgba(180, 100, 255, ${0.3 + glowPhase * 0.2})`;
    ctx.fillRect(w / 2 - lineWidth / 2, titleY + 36, lineWidth, 1);

    // ---------- MENU OPTIONS WITH SMOOTH HIGHLIGHT BAR ----------
    const menuStartY = 250;
    ctx.font = '14px monospace';

    // Draw highlight bar behind selected option (lerped)
    const barH = 22;
    const barW = 200;
    const barX = w / 2 - barW / 2;
    const barAlpha = 0.08 + Math.sin(t * 0.06) * 0.03;
    ctx.fillStyle = `rgba(200, 160, 255, ${barAlpha * 2})`;
    ctx.fillRect(barX, Math.round(this.menuHighlightY) - barH / 2 - 1, barW, barH);
    // Edge glow lines
    ctx.fillStyle = `rgba(180, 120, 255, ${0.15 + Math.sin(t * 0.05) * 0.08})`;
    ctx.fillRect(barX, Math.round(this.menuHighlightY) - barH / 2 - 1, barW, 1);
    ctx.fillRect(barX, Math.round(this.menuHighlightY) + barH / 2, barW, 1);

    for (let i = 0; i < this.menuOptions.length; i++) {
      const my = menuStartY + i * 35;
      if (i === this.menuOption) {
        // Selected: golden text
        ctx.fillStyle = '#ffd700';
        ctx.fillText(this.menuOptions[i], w / 2, my);
        // Small diamond indicators
        const diamondPulse = Math.sin(t * 0.08) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 200, 50, ${diamondPulse})`;
        ctx.fillText('◆', w / 2 - barW / 2 + 8, my);
        ctx.fillText('◆', w / 2 + barW / 2 - 16, my);
      } else {
        ctx.fillStyle = '#555577';
        ctx.fillText(this.menuOptions[i], w / 2, my);
      }
    }

    ctx.textAlign = 'left';

    // ---------- PRESS J/K/L PROMPT (pulsing) ----------
    const promptPulse = Math.sin(t * 0.05) * 0.4 + 0.6;
    ctx.fillStyle = `rgba(200, 180, 255, ${0.3 + promptPulse * 0.4})`;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('PRESS  J / K / L  TO SELECT', w / 2, h - 52);
    ctx.fillStyle = `rgba(150, 140, 200, 0.35)`;
    ctx.fillText('↑ ↓ TO NAVIGATE', w / 2, h - 38);
    ctx.textAlign = 'left';
  },

  // Draw the silhouetted Spire tower
  drawSpire(ctx, w, h, t) {
    // Tower centered, rising from below title area
    const spireX = w / 2;
    const spireBaseY = h * 0.65;
    const spireHeight = 280;
    const spireTopY = spireBaseY - spireHeight;

    // Main tower body (trapezoid via stacked rectangles)
    const levels = 14;
    for (let i = 0; i < levels; i++) {
      const ly = spireBaseY - i * (spireHeight / levels);
      const levelW = 30 + (i / levels) * 80;
      const lx = spireX - levelW / 2;
      const lh = spireHeight / levels;

      // Tower body
      ctx.fillStyle = `rgba(15, 10, 25, 0.5)`;
      ctx.fillRect(Math.round(lx), Math.round(ly), Math.round(levelW), Math.round(lh + 1));

      // Battlements at wider levels
      if (i % 3 === 0) {
        ctx.fillRect(Math.round(lx), Math.round(ly - 1), Math.round(levelW), 1);
      }
    }

    // Spire tip
    ctx.fillStyle = 'rgba(20, 10, 30, 0.5)';
    const tipW = 6;
    ctx.fillRect(Math.round(spireX - tipW / 2), Math.round(spireTopY - 30), tipW, 30);
    // Tip point
    ctx.fillStyle = 'rgba(30, 15, 40, 0.4)';
    ctx.fillRect(Math.round(spireX - 1), Math.round(spireTopY - 36), 2, 8);

    // Windows — flickering with light
    for (let i = 0; i < 18; i++) {
      const winLevel = i % levels;
      const winY = spireBaseY - winLevel * (spireHeight / levels) - spireHeight / levels * 0.4;
      const levelW = 30 + (winLevel / levels) * 80;
      const winXOff = (i - 9) * (levelW / 12);
      const winX = spireX + winXOff;
      const winSize = 4 + Math.random() * 3;

      // Only draw windows within tower bounds
      if (Math.abs(winXOff) < levelW / 2 - 6) {
        const flicker = Math.sin(t * 0.07 + i * 1.8) * 0.4 + 0.6;
        const flicker2 = Math.sin(t * 0.11 + i * 2.3 + 1) * 0.3 + 0.4;
        const bright = flicker * flicker2;

        // Window glow
        if (bright > 0.15) {
          ctx.fillStyle = `rgba(255, 180, 60, ${bright * 0.6})`;
          ctx.fillRect(
            Math.round(winX - winSize / 2 - 1),
            Math.round(winY - winSize / 2 - 1),
            Math.round(winSize + 2),
            Math.round(winSize + 2)
          );
        }

        // Window core
        ctx.fillStyle = `rgba(255, 200, 100, ${bright * 0.8})`;
        ctx.fillRect(
          Math.round(winX - winSize / 2),
          Math.round(winY - winSize / 2),
          Math.round(winSize),
          Math.round(winSize)
        );
      }
    }

    // Ground base
    ctx.fillStyle = 'rgba(10, 8, 20, 0.3)';
    ctx.fillRect(Math.round(spireX - 70), Math.round(spireBaseY), 140, 4);
  },

  // ============================================================
  // CHARACTER SELECT
  // ============================================================

  resetCharSelect() {
    this.charSelectIndex = 0;
    this.carouselOffset = 0;
    this.carouselTarget = 0;
    this.typewriterProgress = 0;
    this.typewriterText = this.characters[0].desc;
  },

  updateCharSelect() {
    if (IN.isBuffered('LEFT', 4)) {
      this.charSelectIndex = (this.charSelectIndex - 1 + this.characters.length) % this.characters.length;
      this.carouselDirection = -1;
      this.carouselTarget -= 70;
      this.typewriterProgress = 0;
      this.typewriterText = this.characters[this.charSelectIndex].desc;
      SFX.playUISelect();
    }
    if (IN.isBuffered('RIGHT', 4)) {
      this.charSelectIndex = (this.charSelectIndex + 1) % this.characters.length;
      this.carouselDirection = 1;
      this.carouselTarget += 70;
      this.typewriterProgress = 0;
      this.typewriterText = this.characters[this.charSelectIndex].desc;
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

    // When carousel has moved far enough, wrap
    const totalChars = this.characters.length;
    const wrapAt = totalChars * 70;
    if (Math.abs(this.carouselTarget) > wrapAt) {
      this.carouselTarget = 0;
      this.carouselOffset = 0;
    }
  },

  renderCharSelect(ctx) {
    const w = GAME.width;
    const h = GAME.height;
    const t = GAME.frameCount;

    // Dark atmospheric background
    ctx.fillStyle = '#0a0812';
    ctx.fillRect(0, 0, w, h);

    // Subtle background particles
    for (let i = 0; i < 20; i++) {
      const px = (i * 147 + 37) % w;
      const py = (i * 73 + 23) % h;
      const pa = Math.sin(t * 0.015 + i) * 0.08 + 0.1;
      ctx.fillStyle = `rgba(200, 180, 255, ${pa})`;
      ctx.fillRect(Math.round(px), Math.round(py), 1 + (i % 3), 1 + (i % 3));
    }

    // Title
    ctx.fillStyle = '#ddddee';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CHOOSE YOUR CHAMPION', w / 2, 42);
    // Underline
    ctx.fillStyle = 'rgba(180, 120, 255, 0.3)';
    ctx.fillRect(w / 2 - 100, 48, 200, 1);

    const char = this.characters[this.charSelectIndex];

    // ---------- CHARACTER SILHOUETTE CAROUSEL ----------
    const carouselY = 195;
    const previewScale = 0.7;

    ctx.save();
    // Show adjacent characters as dim silhouettes
    for (let i = -2; i <= 2; i++) {
      const idx = (this.charSelectIndex + i + this.characters.length) % this.characters.length;
      const ci = this.characters[idx];
      const cx = w / 2 + i * 70 + (this.carouselTarget - this.carouselOffset);
      const dist = Math.abs(i + (this.carouselTarget - this.carouselOffset) / 70);

      // Only render if on screen
      if (cx > 50 && cx < w - 50) {
        const alpha = Math.max(0.08, 1 - dist * 0.5);
        const isCenter = dist < 0.3;

        if (!isCenter) {
          // Dim silhouette for adjacent characters
          const tempChar = CharacterFactory.create(ci.type, { x: cx - 16, y: carouselY - 20 });
          ctx.globalAlpha = alpha * 0.4;
          ctx.save();
          ctx.translate(cx, carouselY);
          tempChar.renderCharacter(ctx, cx - 16, carouselY - 20);
          ctx.restore();
        }
      }
    }

    // Active character (bright, centered)
    const centerX = w / 2;
    const tempChar = CharacterFactory.create(char.type, { x: centerX - 24, y: carouselY - 25 });
    ctx.globalAlpha = 1;
    // Idle bounce animation
    const idleBounce = Math.sin(t * 0.06) * 2;
    tempChar.renderCharacter(ctx, centerX - 24, carouselY - 25 + idleBounce);
    ctx.restore();

    // ---------- CHARACTER NAME (large dramatic text) ----------
    const namePulse = Math.sin(t * 0.04) * 0.15 + 0.85;
    ctx.fillStyle = `rgba(255, 215, 0, ${namePulse})`;
    ctx.font = 'bold 28px monospace';
    ctx.textAlign = 'center';

    // Name glow layers
    ctx.fillStyle = `rgba(255, 180, 0, ${namePulse * 0.3})`;
    ctx.fillText(char.name, w / 2 + 2, 260);
    ctx.fillText(char.name, w / 2 - 1, 258);
    ctx.fillStyle = '#ffd700';
    ctx.fillText(char.name, w / 2, 258);

    // ---------- TYPEWRITER DESCRIPTION ----------
    ctx.fillStyle = '#9988bb';
    ctx.font = '12px monospace';
    const displayText = this.typewriterText ? char.desc.substring(0, this.typewriterProgress) : '';
    ctx.fillText(displayText + (this.typewriterProgress < char.desc.length && GAME.frameCount % 60 < 30 ? '▌' : ''), w / 2, 280);

    // ---------- STAT BARS ----------
    const tempStats = CharacterFactory.create(char.type);
    const statBarX = w / 2 - 100;
    const statBarY = 305;
    const statBarW = 200;
    const statBarH = 8;
    const statNames = ['HP', 'SPD', 'DMG'];
    const statValues = [tempStats.maxHP, tempStats.walkSpeed, tempStats.baseDamage || tempStats.damage];
    const statMaxs = [150, 5, 20]; // Reference maxes for bar scaling

    for (let s = 0; s < 3; s++) {
      const sy = statBarY + s * 22;

      // Stat label
      ctx.fillStyle = '#8888aa';
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(statNames[s], statBarX - 8, sy + statBarH);

      // Bar background
      ctx.fillStyle = '#1a1a2a';
      ctx.fillRect(statBarX, sy, statBarW, statBarH);

      // Bar fill with gradient-like segments
      const fillRatio = Math.min(1, statValues[s] / statMaxs[s]);

      // Segmented fill for pixel aesthetic
      const segments = 10;
      for (let seg = 0; seg < segments; seg++) {
        const segFill = Math.min(1, Math.max(0, (fillRatio * segments - seg)));
        if (segFill > 0) {
          const segX = statBarX + seg * (statBarW / segments);
          const segW = statBarW / segments;

          // Color varies by stat
          let segColor;
          if (s === 0) segColor = `rgb(${Math.floor(200 * segFill)}, ${Math.floor(40 * segFill)}, ${Math.floor(40 * segFill)})`;
          else if (s === 1) segColor = `rgb(${Math.floor(40 * segFill)}, ${Math.floor(180 * segFill)}, ${Math.floor(220 * segFill)})`;
          else segColor = `rgb(${Math.floor(220 * segFill)}, ${Math.floor(180 * segFill)}, ${Math.floor(40 * segFill)})`;

          ctx.fillStyle = segColor;
          ctx.fillRect(Math.round(segX) + 1, sy + 1, Math.round(segW) - 2, statBarH - 2);
        }
      }

      // Bar border
      ctx.strokeStyle = '#333355';
      ctx.lineWidth = 1;
      ctx.strokeRect(statBarX, sy, statBarW, statBarH);

      // Numeric value
      ctx.fillStyle = '#ccccdd';
      ctx.font = '9px monospace';
      ctx.textAlign = 'left';
      const displayVal = s === 1 ? statValues[s].toFixed(1) : statValues[s];
      ctx.fillText(displayVal, statBarX + statBarW + 8, sy + statBarH);
    }

    // ---------- NAVIGATION ARROWS ----------
    ctx.fillStyle = '#8888cc';
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    const arrowPulse = Math.sin(t * 0.06) * 3;
    ctx.fillText('◀', w / 2 - 130, carouselY + arrowPulse);
    ctx.fillText('▶', w / 2 + 120, carouselY + arrowPulse);

    // ---------- CHARACTER INDICATORS (dots) ----------
    for (let i = 0; i < this.characters.length; i++) {
      const dx = w / 2 + (i - this.charSelectIndex) * 18;
      const dotAlpha = i === this.charSelectIndex ? 1 : 0.3;
      ctx.fillStyle = i === this.charSelectIndex ? '#ffd700' : `rgba(100, 80, 150, ${dotAlpha})`;
      ctx.fillRect(Math.round(dx - 2), 375, 4, 4);
    }

    // ---------- BOTTOM PROMPT ----------
    ctx.fillStyle = '#555577';
    ctx.font = '10px monospace';
    ctx.fillText('J/K/L TO SELECT  |  ← → TO NAVIGATE  |  U TO BACK', w / 2, h - 20);

    ctx.textAlign = 'left';
  },

  // ============================================================
  // BONFIRE MENU
  // ============================================================

  updateBonfire() {
    if (IN.isBuffered('UP', 4)) {
      this.bonfireOption = (this.bonfireOption - 1 + this.bonfireOptions.length) % this.bonfireOptions.length;
      const bonfireMy = 170;
      this.bonfireHighlightTargetY = bonfireMy + 40 + this.bonfireOption * 30;
      SFX.playUISelect();
    }
    if (IN.isBuffered('DOWN', 4)) {
      this.bonfireOption = (this.bonfireOption + 1) % this.bonfireOptions.length;
      const bonfireMy = 170;
      this.bonfireHighlightTargetY = bonfireMy + 40 + this.bonfireOption * 30;
      SFX.playUISelect();
    }

    // Spawn bonfire embers
    if (GAME.frameCount % 3 === 0) {
      const bfx = GAME.width / 2;
      const bfy = GAME.height - 120;
      this.bonfireEmbers.push({
        x: bfx + (Math.random() - 0.5) * 25,
        y: bfy - 20 - Math.random() * 20,
        vx: (Math.random() - 0.5) * 0.6,
        vy: -Math.random() * 1.5 - 0.5,
        life: 30 + Math.random() * 40,
        maxLife: 70,
        size: 1 + Math.random() * 2,
        color: ['#ff4400', '#ff8800', '#ffcc00', '#ffaa00'][Math.floor(Math.random() * 4)],
      });
    }

    // Update embers
    for (let i = this.bonfireEmbers.length - 1; i >= 0; i--) {
      const e = this.bonfireEmbers[i];
      e.x += e.vx;
      e.y += e.vy;
      e.vx += (Math.random() - 0.5) * 0.05;
      e.life--;
      if (e.life <= 0) this.bonfireEmbers.splice(i, 1);
    }

    // Navigate
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
          // Sparkle burst on upgrade
          ParticleSystem.addSparks(GAME.width / 2, GAME.height - 80, 12);
        } else {
          SFX.playUISelect();
        }
      }
    }
  },

  renderBonfire(ctx) {
    const w = GAME.width;
    const h = GAME.height;
    const t = GAME.frameCount;

    // ---------- WARM AMBER GLOW OVERLAY ----------
    const glowAlpha = 0.04 + Math.sin(t * 0.04) * 0.015;
    ctx.fillStyle = `rgba(255, 120, 20, ${glowAlpha})`;
    ctx.fillRect(0, 0, w, h);

    // Vignette effect (darker edges)
    const vignette = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(10, 5, 0, 0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    // ---------- DRAMATIC BONFIRE ----------
    const bfx = w / 2;
    const bfy = h - 80;

    // Logs
    ctx.fillStyle = '#3a2010';
    ctx.fillRect(bfx - 18, bfy + 16, 36, 8);
    ctx.fillRect(bfx - 14, bfy + 12, 28, 8);
    // Log details
    ctx.fillStyle = '#4a3020';
    ctx.fillRect(bfx - 16, bfy + 18, 32, 2);

    // Large flame layers
    const flame1 = Math.sin(t * 0.12) * 0.5 + 0.5;
    const flame2 = Math.sin(t * 0.17 + 1.5) * 0.5 + 0.5;
    const flame3 = Math.sin(t * 0.09 + 3) * 0.5 + 0.5;

    // Outer flame (orange, large)
    ctx.fillStyle = `rgba(255, ${60 + Math.floor(flame1 * 60)}, 0, 0.6)`;
    ctx.fillRect(bfx - 10, bfy - 8 - flame1 * 18, 20, 28 + flame1 * 18);

    // Mid flame (amber)
    ctx.fillStyle = `rgba(255, ${140 + Math.floor(flame2 * 80)}, 30, 0.7)`;
    ctx.fillRect(bfx - 7, bfy - 4 - flame2 * 14, 14, 20 + flame2 * 14);

    // Core flame (white-hot)
    const coreH = 10 + flame3 * 8;
    ctx.fillStyle = `rgba(255, 255, ${180 + Math.floor(flame3 * 75)}, 0.9)`;
    ctx.fillRect(bfx - 3, bfy + 2 - coreH, 6, coreH + 4);

    // Flame tips (separate licks)
    for (let l = 0; l < 3; l++) {
      const lx = bfx - 6 + l * 6;
      const lh = 6 + Math.sin(t * 0.2 + l) * 4;
      ctx.fillStyle = `rgba(255, ${180 + Math.floor(Math.sin(t * 0.3 + l) * 60)}, 80, 0.5)`;
      ctx.fillRect(lx, bfy - lh, 3, lh + 2);
    }

    // Bonfire glow (radial)
    const glow = ctx.createRadialGradient(bfx, bfy, 5, bfx, bfy, 70);
    glow.addColorStop(0, 'rgba(255, 150, 30, 0.15)');
    glow.addColorStop(0.5, 'rgba(255, 100, 10, 0.05)');
    glow.addColorStop(1, 'rgba(255, 50, 0, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(bfx - 70, bfy - 70, 140, 140);

    // ---------- EMBERS FLOATING UP ----------
    for (const ember of this.bonfireEmbers) {
      const alpha = ember.life / ember.maxLife;
      ctx.fillStyle = ember.color;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillRect(Math.round(ember.x), Math.round(ember.y), ember.size, ember.size);
    }
    ctx.globalAlpha = 1;

    // ---------- CHARACTER BY THE FIRE ----------
    if (GAME.player) {
      const px = bfx - GAME.player.width / 2;
      const py = bfy - GAME.player.height + 18;

      // Sitting pose: slightly lower, facing fire
      ctx.save();
      GAME.player.renderCharacter(ctx, px, py);

      // Fire light on character
      ctx.fillStyle = `rgba(255, 140, 30, 0.06)`;
      ctx.fillRect(px - 4, py - 4, GAME.player.width + 8, GAME.player.height + 8);

      ctx.restore();
    }

    // ---------- BONFIRE HEADER ----------
    ctx.fillStyle = '#ffcc66';
    ctx.font = '18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BONFIRE REST', w / 2, 45);

    // ---------- SOUL SHARD GLOWING COUNTER ----------
    const shardPulse = Math.sin(t * 0.05) * 0.2 + 0.8;
    const shardX = w / 2;
    const shardY = 68;

    // Shard icon (diamond shape via rectangles)
    ctx.fillStyle = `rgba(255, 200, 100, ${shardPulse})`;
    ctx.fillRect(shardX - 3, shardY - 4, 6, 8);
    ctx.fillStyle = `rgba(255, 255, 200, ${shardPulse * 0.7})`;
    ctx.fillRect(shardX - 1, shardY - 3, 2, 6);

    // Counter text
    ctx.fillStyle = `rgba(255, 215, 100, ${0.7 + Math.sin(t * 0.05) * 0.3})`;
    ctx.font = '13px monospace';
    ctx.fillText(`SOUL SHARDS: ${GAME.soulShards}`, shardX, shardY + 16);

    // Counter glow
    ctx.fillStyle = `rgba(255, 180, 40, 0.08)`;
    ctx.fillRect(shardX - 40, shardY - 16, 80, 40);

    // ---------- UPGRADE OPTIONS AS FLOATING RUNE CARDS ----------
    const cardBaseY = 140;
    const cardH = 42;
    const cardW = 180;
    const cardX = w / 2 - cardW / 2;

    // Rune icons for each option
    const runeIcons = ['❤', '⚔', '⚡', '▲'];
    const runeLabels = ['VITALITY', 'MIGHT', 'CELERITY', 'ASCEND'];
    const runeSubs = ['+5 MAX HP', '+2 DAMAGE', '+0.2 SPEED', 'NEXT FLOOR'];

    for (let i = 0; i < this.bonfireOptions.length; i++) {
      const cy = cardBaseY + i * (cardH + 10);
      const isSelected = i === this.bonfireOption;

      // Card background
      if (isSelected) {
        const cardGlow = Math.sin(t * 0.06) * 0.1 + 0.2;
        ctx.fillStyle = `rgba(60, 30, 20, 0.9)`;
        ctx.fillRect(cardX, cy, cardW, cardH);
        // Gold border
        ctx.fillStyle = `rgba(255, 200, 60, ${0.5 + cardGlow})`;
        ctx.fillRect(cardX, cy, cardW, 1);
        ctx.fillRect(cardX, cy + cardH - 1, cardW, 1);
        ctx.fillRect(cardX, cy, 1, cardH);
        ctx.fillRect(cardX + cardW - 1, cy, 1, cardH);
        // Corner diamonds
        const cornerPulse = Math.sin(t * 0.08) * 0.3 + 0.7;
        ctx.fillStyle = `rgba(255, 180, 40, ${cornerPulse})`;
        ctx.fillRect(cardX + 2, cy + 2, 3, 3);
        ctx.fillRect(cardX + cardW - 5, cy + 2, 3, 3);
        ctx.fillRect(cardX + 2, cy + cardH - 5, 3, 3);
        ctx.fillRect(cardX + cardW - 5, cy + cardH - 5, 3, 3);
      } else {
        ctx.fillStyle = 'rgba(20, 15, 10, 0.7)';
        ctx.fillRect(cardX, cy, cardW, cardH);
        ctx.fillStyle = 'rgba(80, 50, 20, 0.3)';
        ctx.fillRect(cardX, cy, cardW, 1);
        ctx.fillRect(cardX, cy + cardH - 1, cardW, 1);
        ctx.fillRect(cardX, cy, 1, cardH);
        ctx.fillRect(cardX + cardW - 1, cy, 1, cardH);
      }

      // Rune icon
      ctx.fillStyle = isSelected ? '#ffcc44' : '#665544';
      ctx.font = '16px monospace';
      ctx.fillText(runeIcons[i], cardX + 20, cy + 30);

      // Label
      ctx.fillStyle = isSelected ? '#ffd700' : '#776655';
      ctx.font = '12px monospace';
      ctx.fillText(runeLabels[i], cardX + 45, cy + 22);

      // Sub text
      ctx.fillStyle = isSelected ? '#cc9944' : '#554433';
      ctx.font = '9px monospace';
      ctx.fillText(runeSubs[i], cardX + 45, cy + 36);
    }

    // Bottom prompt
    ctx.fillStyle = '#554433';
    ctx.font = '9px monospace';
    ctx.fillText('J/K/L TO SELECT  |  ↑ ↓ TO NAVIGATE', w / 2, h - 15);

    ctx.textAlign = 'left';
  },
};

const MENU = MenuSystem;
