/* global Phaser */
// The playable room: Astro's platforming controller, the Robot partner (solo AI,
// co-op pilot, rescue), the letter-block puzzle, stars, gate and ship.

import {
  WORLD_W, WORLD_H, GROUND_Y, TILE, SPAWN, TERRAIN, ROCKS, ONE_WAY,
  HELP_SPOTS, BLOCKS, GATE, SHIP, STARS, TIPS,
} from './config.js';
import { buildTextures, blockKey, TERRAIN_PAD, TERRAIN_TOP } from './art.js';
import { input, clearEdges } from './input.js';
import { sfx } from './sfx.js';
import { tune } from './tuning.js';

const HERO_W = 26;
const HERO_H = 58;
const PLATE_OFFSET = 44;   // Robot platform surface sits this far above the Robot's centre
const HANG = 75;           // Astro's feet below the Robot's centre while carried
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

export class PlayScene extends Phaser.Scene {
  constructor() { super('play'); }

  init(data) {
    this.R = data.R;
    this.opts = data.opts;
    this.hooks = data.hooks;
    this.word = data.word;
  }

  create() {
    const R = this.R;
    this.k = 1 / R;
    buildTextures(this, R, this.word);
    clearEdges();

    this.heroState = 'normal';   // normal | caught | respawn | win
    this.facing = 1;
    this.onGround = true;
    this.wasOnGround = true;
    this.airVy = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.jumpHeld = false;
    this.jumpLock = 0;
    this.dropUntil = 0;
    this.runPhase = 0;
    this.lastRunIdx = -1;
    this.sq = { x: 1, y: 1 };
    this.lookX = 0;
    this.blinkAt = 2500;
    this.robotBlinkAt = 3200;
    this.lastSafe = { x: SPAWN.x, y: SPAWN.y };
    this.hearts = 3;
    this.progress = 0;
    this.solved = false;
    this.wrongStreak = 0;
    this.lastWrongSay = -99999;
    this.stepSays = 0;
    this.seenTips = new Set();
    this.bumps = [];
    this.carrying = false;
    this.plateActive = false;
    this.p2Target = null;
    this.p2Toggle = false;
    this.elapsed = 0;
    this.stats = { stars: 0, steps: 0, catches: 0, falls: 0, wrong: 0 };
    this.surfaces = [...TERRAIN, ...ROCKS, ...ONE_WAY];

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H + 400);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.buildBackground();
    this.buildTerrain();
    this.buildProps();
    this.buildHero();
    this.buildRobot();
    this.buildFx();
    this.buildColliders();
    this.bindPointer();

    const cam = this.cameras.main;
    cam.setZoom(R);
    cam.setBounds(0, 0, WORLD_W, WORLD_H);
    cam.setBackgroundColor('#0f1640');
    cam.startFollow(this.hero, false, 1, 1);
    cam.setFollowOffset(0, 40);
    cam.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.updateParallax, this);
    this.time.delayedCall(60, () => cam.setLerp(0.12, 0.12));

    this.hooks.ready(this);
    this.hooks.hearts(this.hearts);
    this.hooks.stars(0, STARS.length);
    this.hooks.word(0);
    this.setCoop(!!this.opts.coop, true);
    this.time.delayedCall(500, () => {
      this.say('r_start');
      this.say('r_jump');
      if (this.opts.coop) this.say('r_coop');
    });
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  buildBackground() {
    const k = this.k;
    this.layers = [];
    const layer = (key, s, baseY, depth) => {
      const img = this.add.image(0, baseY, key).setOrigin(0, 0).setScale(k).setDepth(depth);
      this.layers.push({ img, s, baseY });
    };
    layer('sky', 0, 0, 0);
    layer('far', 0.15, 150, 1);
    layer('hills', 0.4, 232, 2);
    layer('near', 0.7, 336, 3);
    this.add.image(0, 470, 'fog').setOrigin(0, 0).setDisplaySize(WORLD_W, 130).setDepth(4);
    for (const [a, b] of [[520, 640], [1000, 1300]]) {
      for (let i = 0; i < (b - a) / 45; i++) {
        const cloud = this.add.image(a + 20 + Math.random() * (b - a - 40), 556 + Math.random() * 30, 'cloud')
          .setScale(k * (0.6 + Math.random() * 0.5)).setAlpha(0.8).setDepth(4);
        this.tweens.add({ targets: cloud, x: cloud.x + 14, duration: 2800 + Math.random() * 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
    this.add.image(0, 548, 'fog').setOrigin(0, 0).setDisplaySize(WORLD_W, 60).setAlpha(0.5).setDepth(26);
  }

  updateParallax(cam) {
    const v = cam.worldView;
    for (const L of this.layers) {
      L.img.x = v.x * (1 - L.s);
      L.img.y = v.y * (1 - L.s) + L.baseY;
    }
  }

  addSolid(x, y, w, h) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.physics.add.existing(z, true);
    return z;
  }

  buildTerrain() {
    const k = this.k;
    this.solids = [];
    TERRAIN.forEach((r, i) => {
      this.add.image(r.x - TERRAIN_PAD, r.y - TERRAIN_TOP, `terrain${i}`).setOrigin(0, 0).setScale(k).setDepth(10);
      this.solids.push(this.addSolid(r.x, r.y, r.w, r.h));
    });
    ROCKS.forEach((r, i) => {
      this.add.image(r.x - 6, r.y - 10, `rock${i}`).setOrigin(0, 0).setScale(k).setDepth(11);
      this.solids.push(this.addSolid(r.x, r.y, r.w, r.h));
    });
    ONE_WAY.forEach((p, i) => {
      this.add.image(p.x - 6, p.y - 4, `plank${i}`).setOrigin(0, 0).setScale(k).setDepth(11);
      const z = this.addSolid(p.x, p.y, p.w, 14);
      z.oneWay = true;
      z.body.checkCollision.down = false;
      z.body.checkCollision.left = false;
      z.body.checkCollision.right = false;
      this.solids.push(z);
    });
  }

  buildProps() {
    const k = this.k;
    const shrooms = [[40, 480], [292, 480], [700, 480], [940, 480], [1360, 480], [1612, 280], [1790, 280], [1930, 480], [2330, 480], [2540, 480]];
    shrooms.forEach(([x, y], i) => {
      this.add.image(x, y + 2, 'shroom').setOrigin(0.5, 1).setScale(k * (0.8 + (i % 3) * 0.15)).setDepth(12).setFlipX(i % 2 === 1);
    });
    for (const r of TERRAIN) {
      for (let x = r.x + 14; x < r.x + r.w - 14; x += 60 + Math.random() * 70) {
        this.add.image(x, r.y + 4, 'tuft').setOrigin(0.5, 1).setScale(k * (0.8 + Math.random() * 0.4)).setDepth(25).setFlipX(Math.random() < 0.5);
      }
    }
    this.add.image(470, GROUND_Y + 2, 'sign').setOrigin(0.5, 1).setScale(k).setDepth(12);

    this.spots = HELP_SPOTS.map((s) => {
      const beacon = this.add.image(s.beaconX, GROUND_Y + 2, 'beacon').setOrigin(0.5, 1).setScale(k).setDepth(12);
      const ghost = this.add.image(s.x, s.top - 2, 'ghost').setOrigin(0.5, 0).setScale(k).setDepth(13).setAlpha(0);
      this.tweens.add({ targets: beacon, alpha: { from: 0.7, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
      return { ...s, beacon, ghost };
    });

    this.starObjs = STARS.map((p) => {
      const glow = this.add.image(p.x, p.y, 'dot').setScale(k * 1.7).setTint(0xffd54f).setBlendMode('ADD').setAlpha(0.55).setDepth(15);
      const img = this.add.image(p.x, p.y, 'star').setScale(k).setDepth(16);
      this.tweens.add({ targets: [img, glow], y: p.y - 6, duration: 1100 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: img, angle: { from: -8, to: 8 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const z = this.add.zone(p.x, p.y, 28, 28);
      this.physics.add.existing(z, true);
      return { img, glow, z, taken: false };
    });

    this.blocks = this.word.map((_, i) => {
      const x = BLOCKS.xs[i];
      const letter = this.word[BLOCKS.order[i] ?? i];
      const glow = this.add.image(x, BLOCKS.cy, 'dot').setScale(k * 2.8).setTint(0x7af0ff).setBlendMode('ADD').setAlpha(0).setDepth(11);
      const sprite = this.add.image(x, BLOCKS.cy, blockKey(letter, false)).setScale(k).setDepth(12);
      const z = this.add.zone(x, BLOCKS.cy, BLOCKS.size, BLOCKS.size);
      this.physics.add.existing(z, true);
      const blk = { letter, sprite, glow, z, baseY: BLOCKS.cy, done: false, cool: 0, hint: null };
      z.blk = blk;
      return blk;
    });
    this.blockZones = this.blocks.map((b) => b.z);

    const gy = (GATE.top + GATE.bottom) / 2;
    this.gateBeam = this.add.image(GATE.x, gy, 'gateBeam').setScale(k).setDepth(13).setBlendMode('ADD');
    this.gateTop = this.add.image(GATE.x, GATE.top, 'gatePost').setScale(k).setDepth(14);
    this.gateBottom = this.add.image(GATE.x, GATE.bottom - 10, 'gatePost').setScale(k).setFlipY(true).setDepth(14);
    this.gateFlicker = this.tweens.add({ targets: this.gateBeam, alpha: { from: 0.6, to: 1 }, duration: 240, yoyo: true, repeat: -1 });
    this.gateZone = this.add.zone(GATE.x, gy, GATE.w, GATE.bottom - GATE.top);
    this.physics.add.existing(this.gateZone, true);

    this.ship = this.add.image(SHIP.x, SHIP.y, 'ship').setOrigin(0.5, 1).setScale(k).setDepth(13);
    this.shipZone = this.add.zone(SHIP.x, SHIP.y - 50, 60, 100);
    this.physics.add.existing(this.shipZone, true);
  }

  buildHero() {
    const k = this.k;
    this.hero = this.add.zone(SPAWN.x, SPAWN.y - HERO_H / 2, HERO_W, HERO_H);
    this.physics.add.existing(this.hero);
    this.hero.body.setCollideWorldBounds(true);
    this.heroShadow = this.add.image(SPAWN.x, SPAWN.y, 'shadow').setScale(k).setDepth(14).setAlpha(0.5);
    this.heroSprite = this.add.sprite(SPAWN.x, SPAWN.y, 'astro', 0).setOrigin(0.5, 70 / 72).setScale(k).setDepth(21);
  }

  buildRobot() {
    const k = this.k;
    this.rb = { x: SPAWN.x - 60, y: SPAWN.y - 110, mode: 'follow', tx: 0, ty: 0, vx: 0, face: 1 };
    this.robotFly = this.add.zone(this.rb.x, this.rb.y, 56, 60);
    this.physics.add.existing(this.robotFly);
    this.robotFly.body.setAllowGravity(false);
    this.robotFly.body.setCollideWorldBounds(true);
    this.robotPlate = this.add.zone(-500, -500, 88, 10);
    this.physics.add.existing(this.robotPlate);
    const pb = this.robotPlate.body;
    pb.setAllowGravity(false);
    pb.setImmovable(true);
    pb.checkCollision.down = false;
    pb.checkCollision.left = false;
    pb.checkCollision.right = false;
    this.robotShadow = this.add.image(0, 0, 'shadow').setScale(k).setDepth(14).setAlpha(0.35);
    this.robotSprite = this.add.sprite(this.rb.x, this.rb.y, 'robot', 0).setScale(k).setDepth(19);
  }

  buildFx() {
    const k = this.k;
    this.dust = this.add.particles(0, 0, 'puff', {
      lifespan: 420, speed: { min: 20, max: 90 }, angle: { min: 200, max: 340 }, gravityY: -30,
      scale: { start: 0.5 * k, end: 0.12 * k }, alpha: { start: 0.75, end: 0 }, tint: 0xe6dcff, emitting: false,
    }).setDepth(22);
    this.spark = this.add.particles(0, 0, 'spark', {
      lifespan: 600, speed: { min: 60, max: 200 }, scale: { start: 0.7 * k, end: 0 }, rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 }, tint: [0xfff59d, 0x7af0ff, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(23);
    this.thruster = this.add.particles(0, 0, 'flame', {
      lifespan: 280, speedY: { min: 70, max: 130 }, speedX: { min: -14, max: 14 },
      scale: { start: 0.55 * k, end: 0 }, alpha: { start: 0.95, end: 0 },
      tint: [0xfff3a0, 0xffc15a, 0xff8a5c], blendMode: 'ADD', frequency: 34,
    }).setDepth(18);
    this.thruster.startFollow(this.robotSprite, 0, 31);
    this.shipFlame = this.add.particles(0, 0, 'flame', {
      lifespan: 520, speedY: { min: 180, max: 320 }, speedX: { min: -30, max: 30 },
      scale: { start: 1.3 * k, end: 0.2 * k }, alpha: { start: 1, end: 0 },
      tint: [0xfff3a0, 0xffc15a, 0xff8a5c], blendMode: 'ADD', frequency: 12, quantity: 2, emitting: false,
    }).setDepth(12);
    this.shipFlame.startFollow(this.ship, 0, -8);
    this.add.particles(0, 0, 'dot', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 60, WORLD_W, 470) },
      lifespan: 7000, speedX: { min: -10, max: 10 }, speedY: { min: -16, max: -4 },
      scale: { start: 0.16 * k, end: 0.05 * k }, alpha: { start: 0.9, end: 0 },
      tint: [0xfff0a0, 0x9ff5ff, 0xffb3e6], blendMode: 'ADD', frequency: 140, advance: 7000,
    }).setDepth(24);
  }

  buildColliders() {
    const P = this.physics;
    P.add.collider(this.hero, this.solids, null, this.solidProcess, this);
    P.add.collider(this.hero, this.blockZones, (h, z) => {
      if (h.body.touching.up && h.body.top >= z.body.bottom - 10) this.bumps.push({ z, who: 'hero' });
    });
    this.gateCollider = P.add.collider(this.hero, this.gateZone);
    P.add.collider(this.hero, this.robotPlate, null, (h, p) => this.plateActive
      && h.body.velocity.y >= 0 && h.body.prev.y + h.body.height <= p.body.top + 6);
    P.add.overlap(this.hero, this.starObjs.map((s) => s.z), (h, z) => this.collectStar(z));
    P.add.overlap(this.hero, this.shipZone, () => this.enterShip());
    const solidOnly = this.solids.filter((z) => !z.oneWay);
    this.robotColliders = [
      P.add.collider(this.robotFly, solidOnly),
      P.add.collider(this.robotFly, this.blockZones, (r, z) => { if (r.body.touching.up) this.bumps.push({ z, who: 'robot' }); }),
      P.add.collider(this.robotFly, this.gateZone),
    ];
    this.robotColliders.forEach((c) => { c.active = false; });
  }

  solidProcess(hero, solid) {
    if (!solid.oneWay) return true;
    if (this.time.now < this.dropUntil) return false;
    const b = hero.body;
    return b.velocity.y >= 0 && b.prev.y + b.height <= solid.body.top + 4;
  }

  bindPointer() {
    this.input.on('pointermove', (p) => {
      if (!input.coop) return;
      if (p.wasTouch && !p.isDown) return;
      this.p2Target = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerdown', (p) => {
      if (!input.coop) return;
      this.p2Down = { x: p.x, y: p.y, t: this.time.now };
      if (this.rb.mode === 'coop') this.p2Target = { x: p.worldX, y: p.worldY };
    });
    this.input.on('pointerup', (p) => {
      if (!input.coop || !this.p2Down) return;
      const moved = Math.hypot(p.x - this.p2Down.x, p.y - this.p2Down.y);
      const quick = this.time.now - this.p2Down.t < 320;
      this.p2Down = null;
      if (moved < 16 * this.R && quick) this.p2Toggle = true;
    });
  }

  // ── Frame ─────────────────────────────────────────────────────────────────

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    if (this.heroState !== 'win') this.elapsed += delta;
    if (this.heroState === 'normal') this.updateHero(dt, delta, time);
    this.updateRobot(dt);
    this.resolveBumps(time);
    this.checkFall();
    this.checkTips();
    this.updateSpots(time);
    this.updateLook(dt);
    this.syncHero(dt, time);
    this.syncRobot(time);
    clearEdges();
    this.p2Toggle = false;
  }

  updateHero(dt, delta, time) {
    const b = this.hero.body;
    const T = tune;
    this.jumpLock = Math.max(0, this.jumpLock - delta);
    const grounded = (b.blocked.down || b.touching.down) && this.jumpLock <= 0;
    this.onGround = grounded;
    if (grounded) {
      this.coyote = T.coyoteMs;
      if (!this.wasOnGround) this.landed();
    } else {
      this.coyote -= delta;
    }
    if (input.jumpPressed) this.buffer = T.bufferMs; else this.buffer -= delta;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) this.facing = dir;
    let rate = dir ? T.accel : T.decel;
    if (dir && b.velocity.x * dir < 0) rate = T.accel + T.decel;
    if (!grounded) rate *= T.airControl;
    b.velocity.x = approach(b.velocity.x, dir * T.runSpeed, rate * dt);

    if (input.down && input.jumpPressed && grounded && this.onOneWay()) {
      this.dropUntil = time + 280;
      this.buffer = 0;
      this.coyote = 0;
      this.jumpLock = 120;
    }
    if (this.buffer > 0 && this.coyote > 0) {
      b.velocity.y = -Math.sqrt(2 * T.gravity * T.jumpTiles * TILE);
      this.buffer = 0;
      this.coyote = 0;
      this.jumpLock = 90;
      this.jumpHeld = true;
      this.jumped();
    }
    if (this.jumpHeld && !input.jumpHeld) {
      if (b.velocity.y < 0) b.velocity.y *= T.jumpCut;
      this.jumpHeld = false;
    }
    // A head bump ends the jump: no floating under the block.
    if (b.touching.up || b.blocked.up) this.bonked = true;
    if (grounded) this.bonked = false;

    let g = T.gravity;
    if (!grounded && !this.bonked && input.jumpHeld && Math.abs(b.velocity.y) < 110) g *= 1 - T.apexFloat;
    else if (b.velocity.y > 0) g *= T.fallMult;
    b.setGravityY(g);
    b.maxVelocity.y = T.maxFall;

    if (!grounded) this.airVy = Math.max(this.airVy, b.velocity.y);
    this.wasOnGround = grounded;
    if (grounded && this.standingSafe()) this.lastSafe = { x: b.center.x, y: b.bottom };
  }

  supportedAt(px, bottom) {
    return this.surfaces.some((r) => px >= r.x && px <= r.x + r.w && Math.abs(r.y - bottom) < 3);
  }

  standingSafe() {
    const b = this.hero.body;
    return this.supportedAt(b.left + 3, b.bottom) && this.supportedAt(b.right - 3, b.bottom);
  }

  onOneWay() {
    const b = this.hero.body;
    return ONE_WAY.some((p) => b.right > p.x && b.left < p.x + p.w && Math.abs(p.y - b.bottom) < 3);
  }

  landed() {
    const p = clamp(this.airVy / 850, 0, 1);
    this.sq.x = 1.08 + 0.22 * p;
    this.sq.y = 0.92 - 0.24 * p;
    const b = this.hero.body;
    this.dust.explode(3 + Math.round(p * 8), b.center.x, b.bottom);
    sfx.land(p);
    if (p > 0.8) this.cameras.main.shake(80, 0.003);
    this.airVy = 0;
  }

  jumped() {
    this.sq.x = 0.78;
    this.sq.y = 1.2;
    const b = this.hero.body;
    this.dust.explode(4, b.center.x, b.bottom);
    sfx.jump();
  }

  // ── Robot ─────────────────────────────────────────────────────────────────

  updateRobot(dt) {
    const rb = this.rb;
    const hb = this.hero.body;
    const prevX = rb.x;
    switch (rb.mode) {
      case 'follow': {
        const view = this.cameras.main.worldView;
        const tx = clamp(hb.center.x - this.facing * 58, view.x + 44, view.right - 44);
        const ty = hb.top - 34;
        const a = 1 - Math.exp(-dt * 5);
        rb.x += (tx - rb.x) * a;
        rb.y += (ty - rb.y) * a;
        if (input.robotPressed && !input.coop && this.heroState === 'normal') this.robotHelp();
        break;
      }
      case 'goto': {
        const dx = rb.tx - rb.x, dy = rb.ty - rb.y, d = Math.hypot(dx, dy);
        const step = Math.min(950, 220 + d * 6) * dt;
        if (d <= step) {
          rb.x = rb.tx;
          rb.y = rb.ty;
          this.setRobotMode('platform');
        } else {
          rb.x += (dx / d) * step;
          rb.y += (dy / d) * step;
        }
        if (input.robotPressed && !input.coop) this.setRobotMode('follow');
        break;
      }
      case 'platform':
        if (input.robotPressed && !input.coop) {
          // Pressing C near a new spot moves the step there; pressing it by the same step sends the Robot home.
          const next = this.helpTarget();
          if (Math.hypot(next.tx - rb.x, next.top + PLATE_OFFSET - rb.y) < 40) {
            sfx.robotOff();
            this.setRobotMode('follow');
          } else {
            this.robotHelp();
          }
        } else if (Math.abs(hb.center.x - rb.x) > 380 && this.onGround) {
          sfx.robotOff();
          this.setRobotMode('follow');
        }
        break;
      case 'coop': {
        const body = this.robotFly.body;
        rb.x = body.center.x;
        rb.y = body.center.y;
        const k = input.p2;
        let vx = 0, vy = 0;
        if (k.left || k.right || k.up || k.down) {
          vx = ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * 380;
          vy = ((k.down ? 1 : 0) - (k.up ? 1 : 0)) * 380;
          this.p2Target = null;
        } else if (this.p2Target) {
          vx = (this.p2Target.x - rb.x) * 7;
          vy = (this.p2Target.y - rb.y) * 7;
          const m = Math.hypot(vx, vy);
          if (m > 600) { vx *= 600 / m; vy *= 600 / m; }
        }
        body.setVelocity(vx, vy);
        if (this.p2Toggle || k.toggle) {
          body.setVelocity(0, 0);
          this.stats.steps++;
          this.setRobotMode('coopPlatform');
        }
        break;
      }
      case 'coopPlatform':
        if (this.p2Toggle || input.p2.toggle) {
          sfx.robotOff();
          this.setRobotMode('coop');
        }
        break;
      default:
        break;
    }
    if (rb.mode !== 'coop') this.robotFly.body.reset(rb.x, rb.y);
    rb.vx = (rb.x - prevX) / Math.max(dt, 0.001);
    if (Math.abs(rb.vx) > 20) rb.face = Math.sign(rb.vx);
    else if (rb.mode === 'follow') rb.face = this.facing;
  }

  setRobotMode(mode) {
    const rb = this.rb;
    rb.mode = mode;
    const plate = mode === 'platform' || mode === 'coopPlatform';
    this.plateActive = plate;
    if (plate) {
      this.robotPlate.body.reset(rb.x, rb.y - PLATE_OFFSET + 5);
      sfx.robotStep();
      this.dust.explode(6, rb.x, rb.y - PLATE_OFFSET);
      if (this.stepSays < 2) { this.stepSays++; this.say('r_step'); }
    } else {
      this.robotPlate.body.reset(-500, -500);
    }
    const flying = mode === 'coop';
    this.robotColliders.forEach((c) => { c.active = flying; });
    if (!flying) this.robotFly.body.setVelocity(0, 0);
  }

  // Where a Robot step should go: a marked help spot if Astro is near one,
  // otherwise a step up just ahead (or a catch platform under Astro mid-air).
  helpTarget() {
    const hb = this.hero.body;
    const spot = this.spots.find((s) => hb.center.x >= s.from && hb.center.x <= s.to);
    let tx, top;
    if (spot) {
      tx = spot.x;
      top = spot.top;
    } else if (this.onGround) {
      tx = hb.center.x + this.facing * 86;
      top = hb.bottom - 74;
    } else {
      tx = hb.center.x + hb.velocity.x * 0.12;
      top = hb.bottom + 26;
    }
    tx = clamp(tx, 60, WORLD_W - 60);
    for (let i = 0; i < 8 && this.plateBlocked(tx, top); i++) top -= 18;
    return { tx, top };
  }

  robotHelp() {
    const { tx, top } = this.helpTarget();
    this.rb.tx = tx;
    this.rb.ty = top + PLATE_OFFSET;
    this.setRobotMode('goto');
    this.stats.steps++;
    sfx.robotGo();
  }

  plateBlocked(x, top) {
    return this.surfaces.some((r) => x + 44 > r.x && x - 44 < r.x + r.w && top + 10 > r.y && top < r.y + (r.h ?? 14));
  }

  setCoop(on, initial = false) {
    if (this.heroState !== 'normal') return;
    if (on) {
      this.p2Target = null;
      this.setRobotMode('coop');
      if (!initial) this.say('r_coop');
    } else {
      this.setRobotMode('follow');
    }
  }

  // ── Falling ───────────────────────────────────────────────────────────────

  checkFall() {
    if (this.heroState !== 'normal') return;
    const b = this.hero.body;
    if (this.opts.difficulty === 'easy') {
      if (b.bottom > GROUND_Y + 64 && b.velocity.y > 0) this.startCatch();
    } else if (b.top > WORLD_H + 20) {
      this.startHardFall();
    }
  }

  startCatch() {
    this.heroState = 'caught';
    this.stats.catches++;
    const hb = this.hero.body;
    this.heroPos = { x: hb.center.x, y: hb.bottom };
    hb.enable = false;
    this.setRobotMode('rescue');
    sfx.whoosh();
    this.say(this.stats.catches === 1 ? 'r_catch' : 'r_catch_short');
    const safe = this.awayFromEdge(this.lastSafe);
    this.tweens.add({
      targets: this.rb, x: this.heroPos.x, y: this.heroPos.y + 20 - HANG, duration: 280, ease: 'Quad.easeIn',
      onUpdate: () => { this.heroPos.y += 0.8; },
      onComplete: () => {
        this.carrying = true;
        this.dust.explode(6, this.rb.x, this.rb.y + 30);
        this.tweens.add({
          targets: this.rb, x: safe.x, y: safe.y - 80 - HANG, duration: 950, ease: 'Sine.easeInOut',
          onComplete: () => {
            this.carrying = false;
            this.releaseHero(safe.x, safe.y - 80);
          },
        });
      },
    });
  }

  // Put Astro back a little way in from the ledge, so a held arrow key doesn't walk straight off again.
  awayFromEdge(pos) {
    const r = this.surfaces.find((s) => pos.x >= s.x && pos.x <= s.x + s.w && Math.abs(s.y - pos.y) < 3);
    if (!r) return { ...pos };
    const margin = Math.min(56, r.w / 2);
    return { x: clamp(pos.x, r.x + margin, r.x + r.w - margin), y: pos.y };
  }

  releaseHero(x, feetY) {
    const hb = this.hero.body;
    hb.enable = true;
    hb.reset(x, feetY - HERO_H / 2);
    this.heroState = 'normal';
    this.airVy = 0;
    this.wasOnGround = false;
    this.setRobotMode(input.coop ? 'coop' : 'follow');
  }

  startHardFall() {
    this.heroState = 'respawn';
    this.stats.falls++;
    this.hearts--;
    this.hooks.hearts(this.hearts);
    sfx.hurt();
    this.hero.body.enable = false;
    const cam = this.cameras.main;
    cam.fadeOut(260, 12, 10, 40);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      let tgt = this.awayFromEdge(this.lastSafe);
      if (this.hearts <= 0) {
        this.hearts = 3;
        this.hooks.hearts(3);
        tgt = { ...SPAWN };
        this.lastSafe = { ...SPAWN };
        this.say('r_restart_hard');
      } else {
        this.say('r_fall_hard');
      }
      this.rb.x = tgt.x - 60;
      this.rb.y = tgt.y - 110;
      this.robotFly.body.reset(this.rb.x, this.rb.y);
      this.releaseHero(tgt.x, tgt.y - 2);
      cam.fadeIn(320, 12, 10, 40);
    });
  }

  // ── Letter blocks ─────────────────────────────────────────────────────────

  resolveBumps(time) {
    if (!this.bumps.length) return;
    let best = null, bestD = Infinity;
    for (const c of this.bumps) {
      const src = c.who === 'hero' ? this.hero.body.center.x : this.robotFly.body.center.x;
      const d = Math.abs(c.z.x - src);
      if (d < bestD) { bestD = d; best = c; }
    }
    this.bumps.length = 0;
    const blk = best.z.blk;
    if (time < blk.cool) return;
    blk.cool = time + 320;
    this.bumpBlock(blk);
  }

  bumpBlock(blk) {
    this.tweens.add({ targets: blk.sprite, y: blk.baseY - 10, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
    this.spark.explode(5, blk.z.x, blk.z.body.bottom);
    if (this.solved || blk.done) { sfx.bump(); return; }
    const need = this.word[this.progress];
    if (blk.letter === need) {
      blk.done = true;
      blk.sprite.setTexture(blockKey(blk.letter, true));
      this.progress++;
      this.wrongStreak = 0;
      this.clearHints();
      sfx.good(this.progress);
      this.spark.explode(14, blk.z.x, blk.z.y);
      this.hooks.word(this.progress);
      if (this.progress >= this.word.length) this.solve();
    } else {
      sfx.bad();
      this.stats.wrong++;
      this.wrongStreak++;
      blk.sprite.setTint(0xff9a9a);
      this.time.delayedCall(240, () => blk.sprite.clearTint());
      this.tweens.add({ targets: blk.sprite, x: blk.z.x + 4, duration: 50, yoyo: true, repeat: 2 });
      if (this.time.now - this.lastWrongSay > 2500) {
        this.lastWrongSay = this.time.now;
        this.say('r_wrong', need);
      }
      if (this.wrongStreak >= 2) this.showHint(need);
    }
  }

  showHint(letter) {
    this.clearHints();
    for (const b of this.blocks) {
      if (b.done || b.letter !== letter) continue;
      b.hint = this.tweens.add({ targets: b.glow, alpha: { from: 0, to: 0.8 }, duration: 520, yoyo: true, repeat: -1 });
    }
  }

  clearHints() {
    for (const b of this.blocks) {
      if (b.hint) { b.hint.stop(); b.hint = null; }
      b.glow.setAlpha(0);
    }
  }

  solve() {
    this.solved = true;
    this.say('r_solved', this.word.join(''));
    sfx.gate();
    this.gateFlicker.stop();
    this.tweens.add({ targets: this.gateBeam, alpha: 0, duration: 600 });
    this.gateCollider.active = false;
    this.gateZone.body.enable = false;
    for (let y = GATE.top; y < GATE.bottom; y += 40) this.spark.explode(3, GATE.x, y);
    this.gateTop.setTint(0x9dffc4);
    this.gateBottom.setTint(0x9dffc4);
  }

  // ── Stars, tips, ship ─────────────────────────────────────────────────────

  collectStar(z) {
    const s = this.starObjs.find((o) => o.z === z);
    if (!s || s.taken) return;
    s.taken = true;
    z.body.enable = false;
    this.tweens.killTweensOf([s.img, s.glow]);
    this.tweens.add({
      targets: [s.img, s.glow], y: s.img.y - 30, alpha: 0, duration: 380, ease: 'Quad.easeOut',
      onComplete: () => { s.img.destroy(); s.glow.destroy(); },
    });
    this.spark.explode(12, z.x, z.y);
    sfx.star();
    this.stats.stars++;
    this.hooks.stars(this.stats.stars, STARS.length);
    if (this.stats.stars === STARS.length) this.say('r_stars_all');
  }

  checkTips() {
    if (this.heroState !== 'normal') return;
    const x = this.hero.body.center.x;
    for (const tip of TIPS) {
      if (this.seenTips.has(tip.key) || x < tip.x) continue;
      if (tip.unlessSolved && this.solved) continue;
      this.seenTips.add(tip.key);
      this.say(tip.key, this.word.join(''));
    }
  }

  enterShip() {
    if (!this.solved || this.heroState !== 'normal') return;
    this.heroState = 'win';
    const hb = this.hero.body;
    this.heroPos = { x: hb.center.x, y: hb.bottom };
    hb.enable = false;
    const cam = this.cameras.main;
    cam.stopFollow();
    this.setRobotMode('rescue');
    this.tweens.add({ targets: this.heroPos, x: SHIP.x, y: SHIP.y - 46, duration: 420, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: this.heroSprite, alpha: 0, duration: 200, delay: 320 });
    this.tweens.add({ targets: this.rb, x: SHIP.x - 8, y: SHIP.y - 70, duration: 520, ease: 'Sine.easeInOut' });
    this.tweens.add({ targets: this.robotSprite, alpha: 0, duration: 200, delay: 420 });
    this.time.delayedCall(700, () => {
      this.thruster.stop();
      sfx.launch();
      cam.shake(1500, 0.004);
      this.shipFlame.start();
      this.tweens.add({ targets: this.ship, y: SHIP.y - 640, duration: 2300, ease: 'Cubic.easeIn' });
    });
    this.time.delayedCall(2400, () => {
      sfx.win();
      this.hooks.win({ ...this.stats, time: this.elapsed, difficulty: this.opts.difficulty });
    });
  }

  goalKey() {
    if (this.solved) return 'goal_ship';
    if (this.hero.body.center.x > 1880) return 'goal_letters';
    return 'goal_run';
  }

  say(key, ...args) {
    this.hooks.say(key, ...args);
  }

  // ── Visuals ───────────────────────────────────────────────────────────────

  updateSpots(time) {
    const hx = this.hero.body.center.x;
    for (const s of this.spots) {
      const near = this.heroState === 'normal' && hx >= s.from - 60 && hx <= s.to;
      const occupied = this.plateActive && Math.abs(this.rb.x - s.x) < 30 && Math.abs(this.rb.y - PLATE_OFFSET - s.top) < 30;
      const target = near && !occupied ? 0.45 + 0.3 * Math.sin(time / 240) : 0;
      s.ghost.alpha += (target - s.ghost.alpha) * 0.15;
    }
  }

  updateLook(dt) {
    const want = this.heroState === 'normal' ? this.facing * 80 : 0;
    this.lookX += (want - this.lookX) * Math.min(1, dt * 2.2);
    this.cameras.main.setFollowOffset(-this.lookX, 40);
  }

  groundBelow(x, y) {
    let best = null;
    for (const r of this.surfaces) {
      if (x >= r.x && x <= r.x + r.w && r.y >= y && (best === null || r.y < best)) best = r.y;
    }
    if (this.plateActive) {
      const top = this.rb.y - PLATE_OFFSET;
      if (Math.abs(x - this.rb.x) <= 44 && top >= y && (best === null || top < best)) best = top;
    }
    return best;
  }

  placeShadow(img, x, y, gy, maxAlpha) {
    if (gy === null) { img.setVisible(false); return; }
    const d = gy - y;
    img.setVisible(true).setPosition(x, gy + 1)
      .setAlpha(clamp(maxAlpha - d / 300, 0.06, maxAlpha))
      .setScale(this.k * clamp(1 - d / 400, 0.4, 1));
  }

  syncHero(dt, time) {
    const s = this.heroSprite;
    const hb = this.hero.body;
    let x, y;
    if (this.heroState === 'normal' || this.heroState === 'respawn') {
      x = hb.center.x;
      y = hb.bottom;
    } else {
      if (this.carrying) { this.heroPos.x = this.rb.x; this.heroPos.y = this.rb.y + HANG; }
      x = this.heroPos.x;
      y = this.heroPos.y;
      this.hero.setPosition(x, y - HERO_H / 2);
    }
    s.setPosition(x, y + 1);
    const a = Math.min(1, dt * 12);
    this.sq.x += (1 - this.sq.x) * a;
    this.sq.y += (1 - this.sq.y) * a;
    s.setScale(this.k * this.sq.x, this.k * this.sq.y);
    s.setFlipX(this.facing < 0);

    const vx = hb.velocity.x, vy = hb.velocity.y;
    let f;
    if (this.heroState === 'caught') f = this.carrying ? 8 : 7;
    else if (this.heroState === 'win') f = 10;
    else if (!this.onGround) f = vy < -60 ? 6 : 7;
    else if (Math.abs(vx) > 30) {
      this.runPhase += (Math.abs(vx) * dt) / 16;
      const idx = Math.floor(this.runPhase) % 4;
      f = 2 + idx;
      if (idx !== this.lastRunIdx && (idx === 0 || idx === 2)) {
        sfx.step();
        if (Math.abs(vx) > tune.runSpeed * 0.7) this.dust.explode(1, x - this.facing * 6, y);
      }
      this.lastRunIdx = idx;
    } else {
      f = Math.floor(time / 700) % 2;
      if (time > this.blinkAt) {
        f = 9;
        if (time > this.blinkAt + 130) this.blinkAt = time + 2200 + Math.random() * 2500;
      }
    }
    s.setFrame(f);
    const lean = clamp(vx / tune.runSpeed, -1, 1);
    s.rotation = this.heroState === 'normal' ? lean * (this.onGround ? 0.06 : 0.1) : 0;
    this.placeShadow(this.heroShadow, x, y, this.heroState === 'win' ? null : this.groundBelow(x, y - 2), 0.5);
  }

  syncRobot(time) {
    const rb = this.rb;
    const s = this.robotSprite;
    const flying = rb.mode !== 'platform' && rb.mode !== 'coopPlatform';
    const bob = flying ? Math.sin(time / 260) * 3 : 0;
    s.setPosition(rb.x, rb.y + bob);
    s.setFlipX(rb.face < 0);
    s.rotation = flying ? clamp(rb.vx / 1500, -0.22, 0.22) : 0;
    let f = 0;
    if (!flying) f = 2;
    else if (this.carrying || (rb.mode === 'rescue' && this.heroState === 'caught')) f = 3;
    else if (time > this.robotBlinkAt) {
      f = 1;
      if (time > this.robotBlinkAt + 140) this.robotBlinkAt = time + 2600 + Math.random() * 2600;
    }
    s.setFrame(f);
    this.thruster.setFrequency(flying ? (Math.abs(rb.vx) > 200 ? 16 : 34) : 70);
    this.placeShadow(this.robotShadow, rb.x, rb.y + 31, this.heroState === 'win' ? null : this.groundBelow(rb.x, rb.y + 31), 0.3);
  }
}
