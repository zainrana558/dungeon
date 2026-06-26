// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Sprite Page Renderer
// Deterministic canvas pixel-art reference sheets for heroes and monsters.
// ============================================================

(function() {
  'use strict';

  const SCALE = 4;
  const CELL_W = 56;
  const CELL_H = 64;
  const HERO_POSES = ['Idle', 'Walk', 'Dash', 'Special', 'Victory', 'Defeat'];
  const MONSTER_POSES = ['Idle', 'Tell', 'Attack', 'Enrage', 'Stagger', 'Defeat'];

  const heroes = [
    { name: 'Knight', code: 'Anvil', body: '#6e7483', trim: '#b32632', glow: '#ffd45a', accent: '#303846', cloth: 'cloak' },
    { name: 'Assassin', code: 'Razor', body: '#31204d', trim: '#f26b2d', glow: '#f5f1ff', accent: '#a8a9ff', cloth: 'scarf' },
    { name: 'Mage', code: 'Conductor', body: '#2b2c83', trim: '#d5a642', glow: '#65f1ff', accent: '#f4f4ff', cloth: 'robe' },
    { name: 'Necromancer', code: 'Puppeteer', body: '#66705b', trim: '#54d65c', glow: '#ff3c47', accent: '#e7dec2', cloth: 'wisps' },
    { name: 'Paladin', code: 'Wrecking Ball', body: '#c7d3de', trim: '#2e75d6', glow: '#ffe278', accent: '#7b5637', cloth: 'horse' },
    { name: 'Warrior', code: 'Barrage', body: '#9b6048', trim: '#ff7b22', glow: '#ff391f', accent: '#4b2d24', cloth: 'tattoos' }
  ];

  const monsters = [
    { name: 'Goblin', code: 'Panic Horde', body: '#5fb85f', trim: '#c07a2c', glow: '#f6df54', accent: '#33402b', type: 'goblin' },
    { name: 'Goblin King', code: 'Gitz the Greedy', body: '#6ccc62', trim: '#ffd04f', glow: '#ff6933', accent: '#7b2f35', type: 'goblinKing' },
    { name: 'Orc Grunt', code: 'The Brute', body: '#617a58', trim: '#858b91', glow: '#f6e08d', accent: '#3b332f', type: 'orc' },
    { name: 'Orc Warlord', code: 'Grommash the Wall', body: '#6e8061', trim: '#b9b0a0', glow: '#ff5148', accent: '#2e2a28', type: 'warlord' },
    { name: 'Skeleton', code: 'Restless Bone', body: '#d6d0b8', trim: '#7ddf73', glow: '#74ff7b', accent: '#70675a', type: 'skeleton' },
    { name: 'Lich', code: 'Malachar the Eternal', body: '#3f305f', trim: '#70e05e', glow: '#69ff68', accent: '#d5bd58', type: 'lich' },
    { name: 'Wyvern', code: 'Feral Hatchling', body: '#465a79', trim: '#7aa0ff', glow: '#ff8c3a', accent: '#1e2237', type: 'wyvern' },
    { name: 'Elder Dragon', code: 'Ignis the Ashen', body: '#3d3d45', trim: '#ff6b23', glow: '#ffd04f', accent: '#191920', type: 'dragon' },
    { name: 'Void Spawn', code: 'Phasing Horror', body: '#3b235c', trim: '#e34dff', glow: '#8df6ff', accent: '#0b0714', type: 'voidSpawn' },
    { name: 'Archdemon', code: 'Azazoth the Glitch', body: '#26103e', trim: '#ff33c7', glow: '#ffffff', accent: '#1717ff', type: 'archdemon' }
  ];

  function px(ctx, x, y, w, h, color) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  }

  function drawSword(ctx, x, y, color) {
    px(ctx, x + 28, y + 24, 4, 30, '#d9dde7');
    px(ctx, x + 27, y + 21, 6, 4, color);
    px(ctx, x + 24, y + 31, 12, 3, '#7f4f2d');
  }

  function drawHero(ctx, hero, poseIndex, x, y) {
    const phase = poseIndex;
    const bob = [0, -2, 0, -1, -3, 5][phase];
    const lean = [0, 1, 4, -2, 0, 6][phase];
    const defeated = phase === 5;
    const victory = phase === 4;

    if (hero.cloth === 'horse') {
      px(ctx, x + 7 + lean, y + 38 + bob, 34, 12, hero.accent);
      px(ctx, x + 36 + lean, y + 32 + bob, 9, 9, hero.accent);
      px(ctx, x + 11 + lean, y + 50 + bob, 4, 9, '#2b1d18');
      px(ctx, x + 31 + lean, y + 50 + bob, 4, 9, '#2b1d18');
      px(ctx, x + 5 + lean, y + 40 + bob, 5, 4, hero.trim);
    }

    const baseY = y + (hero.cloth === 'horse' ? 17 : 20) + bob;
    const baseX = x + 22 + lean;

    if (defeated) {
      px(ctx, x + 13, y + 48, 28, 7, hero.body);
      px(ctx, x + 38, y + 49, 8, 5, hero.accent);
      px(ctx, x + 15, y + 55, 24, 3, hero.trim);
      return;
    }

    // Cloth / aura silhouettes first.
    if (hero.cloth === 'cloak') px(ctx, baseX - 8, baseY + 10, 24, 29, hero.trim);
    if (hero.cloth === 'scarf') px(ctx, baseX - 16 - phase, baseY + 5, 20 + phase * 2, 4, hero.trim);
    if (hero.cloth === 'robe') px(ctx, baseX - 8, baseY + 18, 22, 29, hero.body);
    if (hero.cloth === 'wisps') {
      px(ctx, baseX - 15, baseY + 2, 4, 4, hero.trim);
      px(ctx, baseX + 18, baseY - 4, 3, 5, hero.trim);
    }

    // Body, head, limbs.
    px(ctx, baseX - 6, baseY + 12, 16, 22, hero.body);
    px(ctx, baseX - 5, baseY + 2, 14, 12, hero.body);
    px(ctx, baseX - 3, baseY + 6, 3, 2, hero.glow);
    px(ctx, baseX + 5, baseY + 6, 3, 2, hero.glow);
    px(ctx, baseX - 10, baseY + 15, 5, 15, hero.body);
    px(ctx, baseX + 10, baseY + 15, 5, 15, hero.body);
    px(ctx, baseX - 5, baseY + 34, 5, 14, hero.accent);
    px(ctx, baseX + 5, baseY + 34, 5, 14, hero.accent);
    px(ctx, baseX - 8, baseY + 48, 9, 3, '#15151f');
    px(ctx, baseX + 4, baseY + 48, 9, 3, '#15151f');

    // Class-defining silhouettes.
    if (hero.name === 'Knight') {
      px(ctx, baseX - 13, baseY + 16, 7, 16, '#4b5260');
      drawSword(ctx, x, y, hero.trim);
    } else if (hero.name === 'Assassin') {
      px(ctx, baseX - 14, baseY + 22, 12, 3, '#d7d7ed');
      px(ctx, baseX + 12, baseY + 20, 12, 3, '#d7d7ed');
      px(ctx, baseX - 2, baseY, 12, 3, hero.glow);
    } else if (hero.name === 'Mage') {
      px(ctx, baseX + 16, baseY - 4, 3, 36, '#8a6232');
      px(ctx, baseX + 13, baseY - 8, 9, 9, hero.glow);
      px(ctx, baseX - 9, baseY + 43, 24, 3, 'rgba(101,241,255,0.45)');
    } else if (hero.name === 'Necromancer') {
      px(ctx, baseX + 15, baseY, 3, 34, '#d4d0b6');
      px(ctx, baseX + 11, baseY - 5, 10, 8, hero.trim);
      px(ctx, baseX - 7, baseY - 2, 18, 3, '#d7d0ad');
    } else if (hero.name === 'Paladin') {
      px(ctx, baseX + 13, baseY + 12, 25, 3, '#d9dde7');
      px(ctx, baseX + 34, baseY + 9, 4, 7, hero.trim);
    } else if (hero.name === 'Warrior') {
      px(ctx, baseX - 18, baseY + 24, 14, 8, '#bfc3ca');
      px(ctx, baseX + 14, baseY + 24, 14, 8, '#bfc3ca');
      px(ctx, baseX - 2, baseY + 18, 3, 14, hero.trim);
      px(ctx, baseX + 5, baseY + 18, 3, 14, hero.trim);
    }

    if (phase === 3) {
      px(ctx, x + 7, y + 12, 42, 4, hero.glow);
      px(ctx, x + 11, y + 16, 34, 3, hero.trim);
    }
    if (victory) {
      px(ctx, baseX - 15, baseY - 5, 30, 3, hero.glow);
      px(ctx, baseX - 2, baseY - 10, 5, 5, hero.trim);
    }
  }

  function renderSheet(hero, drawFn, poses) {
    const canvas = document.createElement('canvas');
    canvas.width = CELL_W * poses.length * SCALE;
    canvas.height = (CELL_H + 16) * SCALE;
    canvas.className = 'sprite-sheet-canvas';
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.scale(SCALE, SCALE);
    px(ctx, 0, 0, CELL_W * poses.length, CELL_H + 16, '#11111b');

    poses.forEach((pose, i) => {
      const x = i * CELL_W;
      px(ctx, x + 4, 8, CELL_W - 8, CELL_H - 6, i % 2 ? '#171724' : '#1c1b2b');
      px(ctx, x + 4, 60, CELL_W - 8, 2, '#33334a');
      drawFn(ctx, hero, i, x, 8);
      ctx.fillStyle = '#d8d4ff';
      ctx.font = '6px monospace';
      ctx.fillText(pose.toUpperCase(), x + 6, 75);
    });
    return canvas;
  }

  function drawMonster(ctx, monster, poseIndex, x, y) {
    const phase = poseIndex;
    const bob = [0, -1, 1, -2, 2, 6][phase];
    const lean = [0, -2, 3, 1, -4, 5][phase];
    const defeated = phase === 5;
    const enrage = phase === 3;
    const baseX = x + 25 + lean;
    const baseY = y + 21 + bob;

    if (defeated) {
      px(ctx, x + 13, y + 50, 29, 7, monster.body);
      px(ctx, x + 21, y + 45, 15, 5, monster.trim);
      px(ctx, x + 8, y + 56, 39, 2, monster.glow);
      return;
    }

    if (monster.type === 'dragon') {
      px(ctx, x + 4, y + 35 + bob, 43, 15, monster.body);
      px(ctx, x + 37, y + 26 + bob, 13, 13, monster.body);
      px(ctx, x + 8, y + 24 + bob, 18, 14, monster.accent);
      px(ctx, x + 26, y + 27 + bob, 18, 16, monster.accent);
      px(ctx, x + 14, y + 40 + bob, 26, 4, monster.trim);
      px(ctx, x + 45, y + 31 + bob, 3, 2, monster.glow);
      if (enrage) px(ctx, x + 7, y + 17, 42, 4, monster.trim);
      return;
    }

    if (monster.type === 'wyvern') {
      px(ctx, baseX - 13, baseY + 12, 24, 13, monster.body);
      px(ctx, baseX + 7, baseY + 7, 10, 8, monster.body);
      px(ctx, baseX - 24, baseY + 4, 18, 12, monster.accent);
      px(ctx, baseX + 1, baseY - 1, 21, 13, monster.accent);
      px(ctx, baseX + 14, baseY + 10, 2, 2, monster.glow);
      px(ctx, baseX - 6, baseY + 25, 5, 8, monster.trim);
      return;
    }

    if (monster.type === 'voidSpawn' || monster.type === 'archdemon') {
      px(ctx, baseX - 12, baseY + 7, 25, 25, monster.body);
      px(ctx, baseX - 18, baseY + 13, 9, 13, monster.trim);
      px(ctx, baseX + 10, baseY + 2, 12, 18, monster.trim);
      px(ctx, baseX - 5, baseY + 13, 4, 2, monster.glow);
      px(ctx, baseX + 5, baseY + 13, 4, 2, monster.glow);
      px(ctx, baseX - 17, baseY + 33, 34, 3, monster.accent);
      if (monster.type === 'archdemon') {
        px(ctx, x + 6, y + 12, 14, 3, '#3355ff');
        px(ctx, x + 35, y + 17, 12, 3, '#ff3355');
      }
      return;
    }

    const tall = monster.type === 'warlord' || monster.type === 'lich';
    const wide = monster.type === 'goblinKing' || monster.type === 'warlord';
    px(ctx, baseX - (wide ? 9 : 7), baseY + 14, wide ? 20 : 15, tall ? 26 : 19, monster.body);
    px(ctx, baseX - 6, baseY + 3, 14, 12, monster.body);
    px(ctx, baseX - 3, baseY + 8, 3, 2, monster.glow);
    px(ctx, baseX + 5, baseY + 8, 3, 2, monster.glow);
    px(ctx, baseX - 12, baseY + 17, 5, 15, monster.body);
    px(ctx, baseX + 11, baseY + 17, 5, 15, monster.body);
    px(ctx, baseX - 6, baseY + 36, 5, 12, monster.accent);
    px(ctx, baseX + 5, baseY + 36, 5, 12, monster.accent);

    if (monster.type === 'goblinKing') {
      px(ctx, baseX - 8, baseY - 1, 18, 4, monster.trim);
      px(ctx, baseX + 13, baseY + 23, 8, 8, '#d79a35');
    } else if (monster.type === 'orc' || monster.type === 'warlord') {
      px(ctx, baseX - 18, baseY + 23, 36, 5, monster.trim);
      px(ctx, baseX - 10, baseY + 13, 24, 4, monster.accent);
    } else if (monster.type === 'skeleton' || monster.type === 'lich') {
      px(ctx, baseX + 15, baseY + 2, 3, 34, monster.trim);
      if (monster.type === 'lich') px(ctx, baseX - 9, baseY - 2, 21, 4, monster.accent);
    } else {
      px(ctx, baseX + 12, baseY + 22, 11, 3, monster.trim);
    }

    if (enrage) {
      px(ctx, x + 8, y + 14, 40, 4, monster.glow);
      px(ctx, x + 12, y + 18, 32, 3, monster.trim);
    }
  }

  function appendSection(titleText, entries, drawFn, poses) {
    const sectionTitle = document.createElement('h2');
    sectionTitle.className = 'sprite-section-title';
    sectionTitle.textContent = titleText;
    grid.appendChild(sectionTitle);

    entries.forEach((entry) => {
      const card = document.createElement('article');
      card.className = 'sprite-card';
      const title = document.createElement('h3');
      title.textContent = `${entry.name} / ${entry.code}`;
      const meta = document.createElement('p');
      meta.textContent = '64px-cell atlas, deterministic palette, animation-key pose strip.';
      card.append(title, meta, renderSheet(entry, drawFn, poses));
      grid.appendChild(card);
    });
  }

  const grid = document.getElementById('sprite-atlas-grid');
  appendSection('Heroes', heroes, drawHero, HERO_POSES);
  appendSection('Monsters & Bosses', monsters, drawMonster, MONSTER_POSES);
}());
