// Game configuration and level layouts
export const STAR_GOAL = 15;

export const SCORE = {
  perFrame: 1,
  perStar: 25,
  perBossHit: 25,
  timeBonus: {
    three: { refFrames: 4800, divisor: 8 },
    four: { refFrames: 5400, divisor: 8 },
    five: { refFrames: 3600, divisor: 8 },
  },
};

export function calcTimeBonus(level, frame) {
  const cfg = SCORE.timeBonus[level];
  if (!cfg) return 0;
  return Math.max(0, Math.floor((cfg.refFrames - frame) / cfg.divisor));
}

export const ABILITY = {
  dashDistL12: 78,
  dashDistL3: 108,
  dashCooldown: 120,
  dashHoldFrames: 24,
  bubbleDuration: { easy: 480, hard: 240 },
  bubbleCooldown: 360,
  bubbleSlow: 0.32,
};

export const diff={
  easy:{label:'easy',startSpeed:2.2,boost:.10,jump:-14.5,obs:145,pick:85,gravity:.36},
  hard:{label:'hard',startSpeed:4.2,boost:.25,jump:-11.5,obs:95,pick:140,gravity:.52}
};
// Level 2 "Космическа буря" — faster, moving+beam obstacles
export const lvl2Cfg={
  easy:{startSpeed:2.2,boost:.10,jump:-14.5,obs:150,pick:85,gravity:.36,beamInterval:420},
  hard:{startSpeed:3.8,boost:.22,jump:-11.5,obs:110,pick:110,gravity:.50,beamInterval:320}
};
// Level 3 "Лавена планета" — platformer config
export const lvl3Cfg={
  easy:{jump:-15.5,gravity:.40,moveSpeed:4.2},
  hard:{jump:-13.0,gravity:.52,moveSpeed:5.2}
};

// Platform layout for Level 3 — world coords (camera scrolls)
// Each platform: {x, y, w} — y is top surface y in world coords (ground=430)

function spreadLvl3Stars(plats, { count = STAR_GOAL, skipFirst = 3 } = {}) {
  const above = (i, offX = 0) => ({
    x: plats[i].x + plats[i].w / 2 + offX,
    y: plats[i].y - 30,
    taken: false,
  });
  if (!plats.length) return [];

  const last = plats.length - 1;
  const start = Math.min(skipFirst, last);
  const startX = plats[start].x + plats[start].w / 2;
  const endX = plats[last].x + plats[last].w / 2;
  const stars = [];
  const used = new Set();

  for (let i = 0; i < count; i++) {
    const t = count <= 1 ? 0 : i / (count - 1);
    const targetX = startX + t * (endX - startX);
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let p = start; p <= last; p++) {
      if (used.has(p)) continue;
      const cx = plats[p].x + plats[p].w / 2;
      const dist = Math.abs(cx - targetX);
      if (dist < bestDist) {
        bestDist = dist;
        bestIdx = p;
      }
    }
    if (bestIdx < 0) break;
    used.add(bestIdx);
    stars.push(above(bestIdx));
  }
  return stars;
}

export function makeLvl3World(difficulty){
  // Canvas 700x520. Platforms: {x,y,w} — y is top-surface, lava death at y>510.
  // HARD (default): 30 platforms, narrow ledges (55-90px), tall jumps, two tiers, backtrack detours
  // EASY: 24 platforms, wide platforms (130-300px), short gentle gaps, same 5 sections, 15 stars

  if(difficulty==='easy'){
    // EASY LAYOUT
    // Sections:
    //  A. Comfy runway  (x 0-1100)   — huge platforms, no stars on first few
    //  B. Gentle hills  (x 1050-1990) — two wide paths, optional back-spur
    //  C. Wide steps    (x 1990-3100) — broad ledges zigzagging gently
    //  D. Rest & bonus  (x 3100-3640) — huge rest, optional upper detour
    //  E. Grand finale  (x 3640-4520) — broad staircase
    //  F. Extended ridge (x 4520-8010) — gentle wide steps to finish
    // Stars: 15 evenly spaced (skip first 3 platforms)

    const plats = [
      // A. Comfy runway
      {x:0,    y:360, w:270},  // 0  — huge start
      {x:330,  y:340, w:210},  // 1  — wide step up
      {x:600,  y:370, w:180},  // 2  — gentle drop
      {x:840,  y:330, w:200},  // 3  — wide platform
      {x:1100, y:350, w:160},  // 4  — bridge

      // B. Gentle hills — lower path (y~340-370)
      {x:1320, y:360, w:170},  // 5  — lower entry
      {x:1540, y:345, w:190},  // 6  — lower wide
      {x:1780, y:360, w:160},  // 7  — lower continue
      // upper path (y~250-275) — optional
      {x:1270, y:268, w:150},  // 8  — upper entry
      {x:1460, y:248, w:170},  // 9  — upper wide
      // back-spur: easy short hop back-left
      {x:1080, y:258, w:140},  // 10 — back-spur
      // merge rest
      {x:1990, y:300, w:230},  // 11 — wide merge rest

      // C. Wide steps
      {x:2280, y:268, w:160},  // 12 — step up
      {x:2490, y:308, w:160},  // 13 — step down
      {x:2700, y:255, w:150},  // 14 — step up
      {x:2900, y:295, w:160},  // 15 — step down
      {x:3100, y:248, w:150},  // 16 — step up

      // D. Rest & bonus
      {x:3300, y:318, w:290},  // 17 — huge rest platform
      {x:3380, y:208, w:170},  // 18 — easy upper bonus

      // E. Grand finale
      {x:3640, y:290, w:170},  // 19 — step 1
      {x:3860, y:250, w:170},  // 20 — step 2
      {x:4080, y:210, w:170},  // 21 — step 3
      {x:4300, y:170, w:170},  // 22 — step 4

      // F. Extended ridge — canyon run, skyline hops, wide landings
      {x:4520, y:230, w:155},  // 23
      {x:4760, y:310, w:220},  // 24 — wide low pad after long hop
      {x:5060, y:245, w:115},  // 25
      {x:5280, y:175, w:280},  // 26 — huge rest ledge mid-air
      {x:5640, y:295, w:140},  // 27 — drop to lower route
      {x:5860, y:215, w:95},   // 28
      {x:6060, y:305, w:205},  // 29 — wide canyon floor
      {x:6340, y:205, w:125},  // 30 — climb out
      {x:6560, y:275, w:110},  // 31
      {x:6760, y:170, w:150},  // 32 — high skyline ledge
      {x:6980, y:250, w:185},  // 33
      {x:7240, y:190, w:130},  // 34 — long leap
      {x:7460, y:290, w:245},  // 35 — wide low safety
      {x:7760, y:215, w:120},  // 36
      {x:7960, y:265, w:155},  // 37
      // Victory
      {x:8180, y:195, w:330},  // 38 — mega finish platform
    ];

    return { plats, stars: spreadLvl3Stars(plats) };
  }

  // HARD LAYOUT
  //  A. Opening run (x 0-960)    — no stars on first few platforms
  //  B. Two-tier maze (x 960-1700)
  //  C. Narrow gauntlet (x 1700-2540)
  //  D. Rest & fork (x 2540-2970)
  //  E. Final climb (x 2970-3520)
  //  F. Extended gauntlet (x 3520-7040) — plunges, pillars, lava skim, summit
  // Stars: 15 evenly spaced (skip first 3 platforms)

  const plats = [
    // A. Opening run
    {x:0,    y:380, w:220},   // 0  — wide start
    {x:280,  y:350, w:130},   // 1  — easy hop up
    {x:470,  y:390, w:80},    // 2  — drop
    {x:610,  y:340, w:160},   // 3  — wide medium
    {x:830,  y:370, w:70},    // 4  — stepping stone
    {x:960,  y:310, w:90},    // 5  — up

    // B. Two-tier maze
    {x:1110, y:370, w:80},    // 6  — lower tier
    {x:1250, y:380, w:100},   // 7  — lower tier
    {x:1410, y:360, w:70},    // 8  — lower tier
    {x:1080, y:250, w:70},    // 9  — upper tier entry
    {x:1200, y:210, w:80},    // 10 — upper peak
    {x:1330, y:240, w:60},    // 11 — upper tier
    {x:950,  y:230, w:60},    // 12 — back-left spur
    {x:1500, y:300, w:180},   // 13 — wide merge rest

    // C. Narrow gauntlet — mixed widths and big vertical swings
    {x:1740, y:255, w:52},    // 14
    {x:1860, y:325, w:75},    // 15 — wider, drops low
    {x:2000, y:225, w:48},    // 16 — tiny high perch
    {x:2130, y:165, w:58},    // 17 — peak needle
    {x:2260, y:295, w:68},    // 18 — deep drop
    {x:2400, y:205, w:50},    // 19
    {x:2530, y:335, w:85},    // 20 — wide low cap before rest

    // D. Rest & fork
    {x:2660, y:330, w:220},   // 21 — wide rest
    {x:2720, y:200, w:70},    // 22 — upper fork entry
    {x:2840, y:170, w:80},    // 23 — upper fork peak
    {x:2940, y:290, w:90},    // 24 — continue right

    // E. Final climb
    {x:3090, y:250, w:80},    // 25 — step 1
    {x:3230, y:210, w:80},    // 26 — step 2
    {x:3370, y:170, w:80},    // 27 — step 3
    {x:3500, y:130, w:80},    // 28 — step 4

    // F. Extended gauntlet — varied sizes, long leaps, vertical extremes
    // F1 — plunge from the peak
    {x:3620, y:305, w:105},   // 29 — wide landing after long drop
    // F2 — ricochet line
    {x:3860, y:235, w:50},    // 30 — tiny perch
    {x:4050, y:355, w:44},    // 31 — low crumb
    {x:4280, y:195, w:58},    // 32 — long leap up (~185px gap)
    {x:4490, y:325, w:190},   // 33 — wide rest after hard jump
    // F3 — pillar hop
    {x:4760, y:175, w:52},    // 34
    {x:4940, y:115, w:46},    // 35 — highest needle
    {x:5140, y:255, w:54},    // 36 — swing down
    {x:5360, y:145, w:62},    // 37 — long hop up
    // F4 — lava skim
    {x:5570, y:385, w:68},    // 38 — near lava
    {x:5770, y:295, w:50},    // 39
    {x:5960, y:375, w:46},    // 40 — low skim
    {x:6160, y:210, w:72},    // 41 — climb out of canyon
    // F5 — summit sprint
    {x:6380, y:285, w:55},    // 42 — dip before final push
    {x:6550, y:125, w:88},    // 43 — high perch
    {x:6720, y:200, w:55},    // 44 — small hop to finish
    // Victory
    {x:6920, y:165, w:260},   // 45 — wide finish
  ];

  return { plats, stars: spreadLvl3Stars(plats) };
}

export const heroes={
  astro:{name:'Astro Buddy',emoji:'🤖',jump:-11.5,extraJumps:1,reach:1,hitProtection:0,ability:'doubleJump'},
  star:{name:'Nova Glide',emoji:'🛠️',jump:-11.5,extraJumps:0,reach:1,hitProtection:0,ability:'dash'},
  stitch:{name:'Stitch Comet',emoji:'🧵',jump:-11.5,extraJumps:0,reach:1,hitProtection:1,ability:'freeHit'},
  swift:{name:'Star Scout',emoji:'⚙️',jump:-11.5,extraJumps:0,reach:1,hitProtection:0,ability:'timeBubble'},
};

// Level 4 — Ice Planet platformer
export const lvl4Cfg = {
  easy: { jump: -15.0, gravity: 0.38, moveSpeed: 4.0, iceFriction: 0.984, iceAccel: 0.24 },
  hard: { jump: -12.8, gravity: 0.50, moveSpeed: 5.0, iceFriction: 0.988, iceAccel: 0.30 },
};

export function makeLvl4World(difficulty) {
  if (difficulty === 'easy') {
    const plats = [
      { x: 0, y: 370, w: 240, ice: true },
      { x: 290, y: 340, w: 180, ice: true },
      { x: 520, y: 310, w: 160, ice: true, crack: true },
      { x: 720, y: 350, w: 200, ice: false },
      { x: 960, y: 300, w: 170, ice: true },
      { x: 1180, y: 270, w: 150, ice: true, crack: true },
      { x: 1380, y: 320, w: 190, ice: true },
      { x: 1620, y: 280, w: 160, ice: true },
      { x: 1820, y: 340, w: 200, ice: false },
      { x: 2060, y: 290, w: 175, ice: true, crack: true },
      { x: 2280, y: 250, w: 140, ice: true },
      { x: 2460, y: 300, w: 180, ice: true },
      { x: 2680, y: 330, w: 200, ice: true },
      { x: 2920, y: 280, w: 160, ice: true, crack: true },
      { x: 3120, y: 240, w: 150, ice: true },
      { x: 3300, y: 290, w: 190, ice: true },
      { x: 3540, y: 320, w: 210, ice: true },
      { x: 3800, y: 270, w: 170, ice: true },
      { x: 4010, y: 310, w: 200, ice: false },
      { x: 4260, y: 260, w: 160, ice: true },
      { x: 4460, y: 300, w: 180, ice: true, crack: true },
      { x: 4680, y: 250, w: 150, ice: true },
      { x: 4880, y: 290, w: 200, ice: true },
      { x: 5120, y: 330, w: 220, ice: true },
    ];
    return { plats, stars: spreadLvl3Stars(plats), pitY: 520 };
  }

  const plats = [
    { x: 0, y: 375, w: 180, ice: true },
    { x: 220, y: 340, w: 120, ice: true, crack: true },
    { x: 380, y: 300, w: 100, ice: true },
    { x: 520, y: 350, w: 110, ice: true, crack: true },
    { x: 670, y: 310, w: 95, ice: true },
    { x: 810, y: 270, w: 100, ice: true },
    { x: 960, y: 320, w: 120, ice: false },
    { x: 1120, y: 280, w: 90, ice: true, crack: true },
    { x: 1250, y: 240, w: 85, ice: true },
    { x: 1380, y: 290, w: 100, ice: true },
    { x: 1520, y: 340, w: 110, ice: true, crack: true },
    { x: 1670, y: 300, w: 95, ice: true },
    { x: 1810, y: 260, w: 90, ice: true },
    { x: 1940, y: 310, w: 100, ice: true, crack: true },
    { x: 2080, y: 270, w: 85, ice: true },
    { x: 2200, y: 230, w: 80, ice: true },
    { x: 2320, y: 280, w: 95, ice: true, crack: true },
    { x: 2460, y: 320, w: 100, ice: false },
    { x: 2600, y: 270, w: 90, ice: true },
    { x: 2730, y: 230, w: 85, ice: true, crack: true },
    { x: 2860, y: 280, w: 95, ice: true },
    { x: 2990, y: 240, w: 80, ice: true },
    { x: 3110, y: 290, w: 100, ice: true, crack: true },
    { x: 3250, y: 250, w: 85, ice: true },
    { x: 3370, y: 300, w: 95, ice: true },
    { x: 3500, y: 260, w: 80, ice: true, crack: true },
    { x: 3620, y: 220, w: 75, ice: true },
    { x: 3730, y: 270, w: 90, ice: true },
    { x: 3860, y: 310, w: 100, ice: true, crack: true },
    { x: 4000, y: 270, w: 85, ice: true },
    { x: 4120, y: 230, w: 80, ice: true },
    { x: 4240, y: 280, w: 95, ice: true, crack: true },
    { x: 4370, y: 240, w: 85, ice: true },
    { x: 4490, y: 290, w: 100, ice: false },
    { x: 4630, y: 250, w: 85, ice: true, crack: true },
    { x: 4750, y: 300, w: 110, ice: true },
    { x: 4900, y: 260, w: 90, ice: true },
    { x: 5020, y: 310, w: 120, ice: true },
    { x: 5180, y: 270, w: 100, ice: true },
    { x: 5320, y: 320, w: 130, ice: true },
  ];
  return { plats, stars: spreadLvl3Stars(plats), pitY: 520 };
}

// Level 5 — Big Otto boss arena
export const lvl5Cfg = {
  easy: { jump: -15.5, gravity: 0.40, moveSpeed: 4.8 },
  hard: { jump: -13.0, gravity: 0.52, moveSpeed: 5.4 },
};

export const BOSS = {
  maxHp: STAR_GOAL,
  phase2At: 10,
  phase3At: 5,
  introFrames: 90,
  idleMin: 45,
  idleMax: 75,
  telegraphEasy: 72,
  telegraphHard: 48,
  staggerEasy: 192,
  staggerHard: 132,
  hitDamageEasy: 3,
  hitDamageHard: 1,
};

export function makeLvl5Arena() {
  return {
    platforms: [
      { x: 30, y: 400, w: 200 },
      { x: 200, y: 318, w: 175 },
      { x: 60, y: 228, w: 155 },
    ],
    pitY: 488,
    heroMinX: 16,
    heroMaxX: 400,
  };
}

export function createBoss() {
  return {
    hp: STAR_GOAL,
    phase: 1,
    mode: 'intro',
    attack: null,
    timer: 0,
    anim: 0,
    weakOpen: false,
    x: 468,
    y: 118,
    w: 210,
    h: 248,
    eyeSpin: 0,
    steam: [],
    hitFlash: 0,
    attackIdx: 0,
    defeated: false,
  };
}