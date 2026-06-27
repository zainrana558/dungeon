// ============================================================
// PIXEL FURY: ETHEREAL SPIRE — Input System
// 10-frame buffer, coyote frames, negative edge, mash protection
// ============================================================

const InputSystem = {
  // Current frame input state
  keys: {},
  justPressed: {},
  justReleased: {},

  // Input buffer: stores inputs for last 10 frames
  buffer: [],
  bufferSize: 10,

  // Negative edge tracking
  heldDuration: {},     // frames each key has been held
  releaseBuffer: {},    // recent releases for negative edge

  // Mash protection
  pressHistory: [],     // timestamps of recent presses
  mashThreshold: 8,     // max presses allowed
  mashWindow: 120,      // frames (2 seconds at 60fps)

  // Coyote buffer for aerial attacks
  coyoteFrames: {},     // tracks frames since leaving ground
  coyoteWindow: 6,      // frames to buffer aerial attacks near landing

  // Directional input
  direction: { x: 0, y: 0 },
  prevDirection: { x: 0, y: 0 },

  // Special input combos
  comboBuffer: [],      // directional + button combos

  init() {
    window.addEventListener('keydown', e => this.onKeyDown(e));
    window.addEventListener('keyup', e => this.onKeyUp(e));
  },

  onKeyDown(e) {
    if (e.repeat) return; // Ignore key repeats

    const key = e.key.toLowerCase();
    if (!this.keys[key]) {
      this.keys[key] = true;
      this.justPressed[key] = true;

      // Track for mash protection
      this.pressHistory.push(GAME.frameCount);
    }
    this.heldDuration[key] = (this.heldDuration[key] || 0) + 1;
  },

  onKeyUp(e) {
    const key = e.key.toLowerCase();
    this.keys[key] = false;
    this.justReleased[key] = true;
    this.releaseBuffer[key] = GAME.frameCount;
    this.heldDuration[key] = 0;
  },

  update() {
    // Apply mash protection
    this.applyMashProtection();

    // Shift input buffer
    const currentInput = {
      frame: GAME.frameCount,
      keys: { ...this.keys },
      justPressed: { ...this.justPressed },
      justReleased: { ...this.justReleased },
      direction: { ...this.direction },
    };

    this.buffer.push(currentInput);
    if (this.buffer.length > this.bufferSize) {
      this.buffer.shift();
    }

    // Update direction
    this.prevDirection = { ...this.direction };
    this.direction.x = 0;
    this.direction.y = 0;
    if (this.keys['a'] || this.keys['arrowleft']) this.direction.x = -1;
    if (this.keys['d'] || this.keys['arrowright']) this.direction.x = 1;
    if (this.keys['w'] || this.keys['arrowup']) this.direction.y = -1;
    if (this.keys['s'] || this.keys['arrowdown']) this.direction.y = 1;

    // Clear justPressed and justReleased for next frame
    this.justPressed = {};
    this.justReleased = {};
  },

  applyMashProtection() {
    // Remove old entries outside the window
    this.pressHistory = this.pressHistory.filter(
      f => GAME.frameCount - f < this.mashWindow
    );

    // If mashing detected, drop the 5th and 6th most recent inputs
    if (this.pressHistory.length >= this.mashThreshold) {
      // We let the inputs through but mark them as "mashed"
      // The combat system will check this flag and ignore them
      GAME._mashActive = true;
    } else {
      GAME._mashActive = false;
    }
  },

  // Check if an input was pressed within the last N frames (buffer)
  isBuffered(action, frames = 10) {
    for (let i = this.buffer.length - 1; i >= Math.max(0, this.buffer.length - frames); i--) {
      const inp = this.buffer[i];
      if (this.matchAction(inp, action)) {
        // Remove consumed input from buffer to prevent double-triggers
        this.clearBufferAction(action, i);
        return true;
      }
    }
    return false;
  },

  matchAction(input, action) {
    switch (action) {
      case 'LIGHT': return input.justPressed['j'] || input.justPressed['z'];
      case 'HEAVY': return input.justPressed['k'] || input.justPressed['x'];
      case 'SPECIAL': return input.justPressed['l'] || input.justPressed['c'];
      case 'GRAB': return input.justPressed['u'] || input.justPressed['v'];
      case 'BLOCK': return input.keys['shift'] || input.keys['shiftleft'] || input.keys['shiftright'];
      case 'LEFT': return input.direction.x < 0;
      case 'RIGHT': return input.direction.x > 0;
      case 'UP': return input.direction.y < 0;
      case 'DOWN': return input.direction.y > 0;
      case 'FORWARD': return GAME.player ? (GAME.player.facingRight ? input.direction.x > 0 : input.direction.x < 0) : input.direction.x > 0;
      case 'BACK': return GAME.player ? (GAME.player.facingRight ? input.direction.x < 0 : input.direction.x > 0) : input.direction.x < 0;
      case 'NEUTRAL': return input.direction.x === 0 && input.direction.y === 0;
      default: return false;
    }
  },

  clearBufferAction(action, index) {
    if (index >= 0 && index < this.buffer.length) {
      const inp = this.buffer[index];
      switch (action) {
        case 'LIGHT':
          inp.justPressed['j'] = false;
          inp.justPressed['z'] = false;
          break;
        case 'HEAVY':
          inp.justPressed['k'] = false;
          inp.justPressed['x'] = false;
          break;
        case 'SPECIAL':
          inp.justPressed['l'] = false;
          inp.justPressed['c'] = false;
          break;
        case 'GRAB':
          inp.justPressed['u'] = false;
          inp.justPressed['v'] = false;
          break;
      }
    }
  },

  // Check if a key was just released (negative edge)
  isNegativeEdge(action, frames = 6) {
    const keys = this.getKeysForAction(action);
    for (const key of keys) {
      if (this.releaseBuffer[key] &&
          GAME.frameCount - this.releaseBuffer[key] <= frames) {
        delete this.releaseBuffer[key];
        return true;
      }
    }
    return false;
  },

  getKeysForAction(action) {
    switch (action) {
      case 'LIGHT': return ['j', 'z'];
      case 'HEAVY': return ['k', 'x'];
      case 'SPECIAL': return ['l', 'c'];
      case 'GRAB': return ['u', 'v'];
      default: return [];
    }
  },

  // Coyote buffer: ground attacks buffered near landing
  setCoyote(entityId, frames = 6) {
    this.coyoteFrames[entityId] = GAME.frameCount + frames;
  },

  checkCoyote(entityId) {
    return this.coyoteFrames[entityId] &&
           GAME.frameCount <= this.coyoteFrames[entityId];
  },

  consumeCoyote(entityId) {
    delete this.coyoteFrames[entityId];
  },

  // Directional combo detection (quarter-circle, etc.)
  // Tracks the last 15 frames of directional input
  detectMotion() {
    const recent = this.buffer.slice(-15);
    const dirs = recent.map(b => b.direction);

    // Quarter-circle forward (down, down-forward, forward)
    if (this.isQuarterCircle(dirs, true)) return 'QCF';
    // Quarter-circle back
    if (this.isQuarterCircle(dirs, false)) return 'QCB';
    // Dragon punch (forward, down, down-forward)
    if (this.isDP(dirs)) return 'DP';
    // Half-circle forward
    if (this.isHalfCircle(dirs, true)) return 'HCF';
    // Half-circle back
    if (this.isHalfCircle(dirs, false)) return 'HCB';

    return null;
  },

  isQuarterCircle(dirs, forward) {
    // Look for down → down-forward → forward sequence
    let foundDown = false, foundDF = false;
    for (const d of dirs) {
      if (!foundDown && d.y > 0 && Math.abs(d.x) < 0.5) foundDown = true;
      else if (foundDown && !foundDF && d.y > 0 && ((forward && d.x > 0) || (!forward && d.x < 0))) foundDF = true;
      else if (foundDF && d.y === 0 && ((forward && d.x > 0) || (!forward && d.x < 0))) return true;
    }
    return false;
  },

  isDP(dirs) {
    // Forward → down → down-forward
    let foundFwd = false, foundDown = false;
    for (const d of dirs) {
      if (!foundFwd && d.x > 0 && d.y === 0) foundFwd = true;
      else if (foundFwd && !foundDown && d.y > 0 && d.x === 0) foundDown = true;
      else if (foundDown && d.y > 0 && d.x > 0) return true;
    }
    return false;
  },

  isHalfCircle(dirs, forward) {
    let stages = 0;
    for (const d of dirs) {
      if (stages === 0 && ((forward && d.x < 0) || (!forward && d.x > 0)) && d.y === 0) stages = 1;
      else if (stages === 1 && d.y > 0 && Math.abs(d.x) < 0.3) stages = 2;
      else if (stages === 2 && ((forward && d.x > 0) || (!forward && d.x < 0)) && d.y === 0) return true;
    }
    return false;
  },

  // Check if we're in a block state
  isBlocking() {
    return this.isBuffered('BLOCK') || this.keys['shift'];
  }
};

// Alias for global access
const IN = InputSystem;
