// Shared constants for "Astro Buddy: Where Are My Friends?".
// World units: 1 tile = 40. Feet positions are the bottom of Astro's body.

export const VIEW_W = 960;
export const VIEW_H = 540;
export const TILE = 40;
export const HERO_W = 26;
export const HERO_H = 58;

// Robot geometry (relative to its centre)
export const PLATE_OFFSET = 44;  // its platform surface sits this far above the centre
export const HANG = 75;          // Astro's feet below the centre while carried
export const ROBOT_BOTTOM = 31;  // nozzle bottom below the centre

// Movement feel. Easy is tuned for ages 5–8; every value is adjustable in the ⚙ panel.
export const PRESETS = {
  easy: {
    runSpeed: 250, accel: 2400, decel: 3000, airControl: 0.75,
    jumpTiles: 3.3, gravity: 1600, fallMult: 1.35, apexFloat: 0.45,
    coyoteMs: 120, bufferMs: 150, jumpCut: 0.45, maxFall: 900,
  },
  hard: {
    runSpeed: 280, accel: 2600, decel: 3200, airControl: 0.65,
    jumpTiles: 3.0, gravity: 1900, fallMult: 1.5, apexFloat: 0.2,
    coyoteMs: 80, bufferMs: 100, jumpCut: 0.4, maxFall: 1000,
  },
};

export const TUNE_FIELDS = [
  { key: 'runSpeed', min: 140, max: 380, step: 10 },
  { key: 'accel', min: 600, max: 5000, step: 100 },
  { key: 'decel', min: 600, max: 6000, step: 100 },
  { key: 'airControl', min: 0.2, max: 1, step: 0.05 },
  { key: 'jumpTiles', min: 1.5, max: 4.8, step: 0.1 },
  { key: 'gravity', min: 800, max: 3000, step: 50 },
  { key: 'fallMult', min: 1, max: 2.5, step: 0.05 },
  { key: 'apexFloat', min: 0, max: 0.8, step: 0.05 },
  { key: 'coyoteMs', min: 0, max: 250, step: 10 },
  { key: 'bufferMs', min: 0, max: 300, step: 10 },
  { key: 'jumpCut', min: 0.1, max: 1, step: 0.05 },
];

// Parkour moves and powers (not exposed in the tuning panel).
export const MOVES = {
  wallSlide: 130,        // max slide speed on a climbing wall
  wallKick: 290,         // sideways push of a wall jump
  wallJumpFrac: 0.92,    // wall jump height vs a normal jump
  wallLockMs: 150,       // steering ignored right after a wall jump
  wallGraceMs: 130,      // can still wall-jump this long after leaving the wall
  climbJumpFrac: 0.82,   // holding toward the wall: hop straight up it
  climbKick: 70,
  climbLockMs: 90,
  ledgeReach: 28,        // how far below the head a ledge can be grabbed
  bounceTiles: 6,        // mushroom bounce height
  bounceHoldTiles: 7.5,  // ... while holding jump
  stompTiles: 2.2,       // bounce after squashing a beetle
  dashSpeed: 660,
  dashMs: 170,
  dashCooldownMs: 450,
  hurtMs: 1400,
};

export const FRIENDS = ['nova', 'stitch', 'scout'];
