/* global Phaser */
// One generic scene that builds any level from its data file and runs it:
// terrain, props, shared puzzles (buttons, doors, bridges, lifts, robot-only barriers),
// cracked walls, beetles, mushrooms, lanterns, stars, exits, story triggers, the
// friends' powers, and (via hazards.js / otto.js) the lava, ice and tower dangers.

import { VIEW_H, PLATE_OFFSET, MOVES, POWERS, POWER_FRIEND } from '../config.js';
import { LEVELS } from '../levels/index.js';
import { buildTextures, blockKey, chunkKey, layerKey, groundRects, PARALLAX, ROOF, TERRAIN_PAD, TERRAIN_TOP, THEMES } from '../art/index.js';
import { input, clearEdges } from '../input.js';
import { sfx } from '../sfx.js';
import { save, writeSave, starTaken, takeStar } from '../save.js';
import { Hero } from './hero.js';
import { Robot } from './robot.js';
import { Hazards } from './hazards.js';
import { Otto } from './otto.js';
import * as story from './story.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
// Letter blocks are shuffled the same way every time, whatever the word length.
const SCRAMBLE = { 3: [2, 0, 1], 4: [2, 0, 3, 1], 5: [3, 0, 4, 1, 2], 6: [4, 1, 5, 0, 3, 2], 7: [4, 1, 6, 0, 5, 3, 2] };

export class LevelScene extends Phaser.Scene {
  constructor() { super('level'); }

  init(data) {
    this.R = data.R;
    this.k = 1 / data.R;
    this.hooks = data.hooks;
    this.opts = data.opts;
    this.levelId = data.levelId;
    this.entry = data.entry;
    this.word = data.word || [];
    this.banner = data.banner;
  }

  create() {
    const L = this.level = LEVELS[this.levelId];
    this.alive = true;
    this.events.once('shutdown', () => { this.alive = false; });
    buildTextures(this, this.R, L, { word: this.word, banner: this.banner });
    clearEdges();
    this.stats = { steps: 0, catches: 0, falls: 0, wrong: 0 };
    this.lookX = 0;
    this.bumps = [];
    this.fired = new Set();
    this.cooldowns = {};
    this.progress = 0;
    this.solved = false;
    this.wrongStreak = 0;
    this.lastWrongSay = -99999;
    this.cheer = false;
    this.inCutscene = false;
    this.traveling = false;
    this.slowT = 0;
    this.zonePower = null;
    this.askedExits = new Set();
    this.startedAt = this.time.now;

    this.physics.world.setBounds(0, 0, L.w, L.h + 400);
    this.physics.world.setBoundsCollision(true, true, true, false);

    this.buildBackground();
    this.buildTerrain();
    this.buildProps();
    const e = L.entries[this.entry] || Object.values(L.entries)[0];
    this.hero = new Hero(this, e.x, e.y, e.face || 1);
    this.checkpoint = { x: e.x, y: e.y };
    this.robot = new Robot(this, e.x - (e.face || 1) * 60, e.y - 110);
    this.buildFx();
    this.hz = new Hazards(this);
    this.otto = L.otto ? new Otto(this, L.otto) : null;
    this.buildColliders();
    this.hz.bind();
    this.robot.bindPointer();

    const cam = this.cameras.main;
    cam.setZoom(this.R);
    cam.setBounds(0, 0, L.w, L.h);
    cam.setBackgroundColor(THEMES[L.theme].bg);
    // The camera follows a "rig" point: normally it tracks Astro (with look-ahead);
    // cutscenes move the rig and hold it, so the camera never drifts back mid-scene.
    this.rig = { x: e.x, y: e.y - 70 };
    this.rigHeld = false;
    cam.startFollow(this.rig, false, 1, 1);
    cam.on(Phaser.Cameras.Scene2D.Events.FOLLOW_UPDATE, this.updateParallax, this);
    this.time.delayedCall(60, () => cam.setLerp(0.12, 0.12));
    cam.fadeIn(350, 10, 8, 30);

    save.level = L.id;
    save.entry = this.entry;
    writeSave();

    this.hooks.ready(this);
    this.hooks.hearts(this.hero.hearts);
    this.updateStarHud();
    this.hooks.word(this.word.length ? this.progress : null);
    this.hooks.levelName(`lvl_${L.id}`);
    this.setCoop(!!this.opts.coop, true);
    if (L.power && this.hasPower(L.power)) this.selectPower(L.power, true);
    this.hooks.power();
    story.onEnter(this);
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  buildBackground() {
    const L = this.level, k = this.k;
    this.layers = [{ img: this.add.image(0, 0, `sky_${L.theme}`).setOrigin(0, 0).setScale(k).setDepth(0), s: 0, base: 0 }];
    const cave = THEMES[L.theme].cave;
    (cave ? [...PARALLAX, ROOF] : PARALLAX).forEach((P, i) => {
      const img = this.add.image(0, 0, layerKey(L.id, P.key)).setOrigin(0, 0).setScale(k).setDepth(1 + i);
      this.layers.push({ img, s: P.s, fixY: !!P.fixY, base: P.fixY ? P.y : P.y + P.s * Math.max(0, L.h - VIEW_H) });
    });
    this.add.image(0, L.h - 130, `fog_${L.theme}`).setOrigin(0, 0).setDisplaySize(L.w, 130).setDepth(4);
    this.add.image(0, L.h - 60, `fog_${L.theme}`).setOrigin(0, 0).setDisplaySize(L.w, 60).setAlpha(0.5).setDepth(26);
    // clouds drifting in the pits (wherever no ground reaches the bottom)
    const floor = L.ground.filter((r) => (r.h === undefined || r.y + r.h >= L.h - 1) && r.kind !== 'trunk').sort((a, b) => a.x - b.x);
    let x = 0;
    const gaps = [];
    for (const r of floor) { if (r.x > x + 20) gaps.push([x, r.x]); x = Math.max(x, r.x + r.w); }
    if (x < L.w - 20) gaps.push([x, L.w]);
    for (const [a, b] of gaps) {
      for (let i = 0; i < (b - a) / 45; i++) {
        const c = this.add.image(a + 20 + Math.random() * Math.max(1, b - a - 40), L.h - 44 + Math.random() * 30, 'cloud')
          .setScale(k * (0.6 + Math.random() * 0.5)).setAlpha(THEMES[L.theme].cave ? 0.5 : 0.8).setDepth(5);
        if (THEMES[L.theme].mist) c.setTint(THEMES[L.theme].mist); // caves: mist or smoke instead of clouds
        this.tweens.add({ targets: c, x: c.x + 14, duration: 2800 + Math.random() * 2200, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }
    }
  }

  updateParallax(cam) {
    const v = cam.worldView;
    for (const L of this.layers) {
      L.img.x = v.x * (1 - L.s);
      L.img.y = L.fixY ? v.y + L.base : v.y * (1 - L.s) + L.base;
    }
  }

  addZone(x, y, w, h, isStatic = true) {
    const z = this.add.zone(x + w / 2, y + h / 2, w, h);
    this.physics.add.existing(z, isStatic);
    return z;
  }

  buildTerrain() {
    const L = this.level, k = this.k;
    this.solids = [];
    this.grabRects = [];
    this.surfaces = [];
    this.ground = groundRects(L);
    this.ground.forEach((r, i) => {
      this.add.image(r.x - TERRAIN_PAD, r.y - TERRAIN_TOP, chunkKey(L.id, i)).setOrigin(0, 0).setScale(k)
        .setDepth(r.kind === 'trunk' && r.y === 0 ? 9 : 10);
      const z = this.addZone(r.x, r.y, r.w, r.h);
      z.grip = !!r.grip;
      this.solids.push(z);
      this.grabRects.push(r);
      if (r.y > 0) this.surfaces.push({ ...r, ice: r.kind === 'ice' });
      if ((r.kind || 'soil') === 'soil' && r.y > 0) {
        for (let x = r.x + 14; x < r.x + r.w - 14; x += 60 + Math.random() * 70) {
          this.add.image(x, r.y + 4, `tuft_${L.theme}`).setOrigin(0.5, 1).setScale(k * (0.8 + Math.random() * 0.4)).setDepth(25).setFlipX(Math.random() < 0.5);
        }
      }
    });
    for (const p of L.planks || []) {
      if (p.look !== 'roof') this.add.image(p.x - 6, p.y - 4, `plank_${p.w}`).setOrigin(0, 0).setScale(k).setDepth(11);
      const z = this.addZone(p.x, p.y, p.w, 14);
      z.oneWay = true;
      z.body.checkCollision.down = false;
      z.body.checkCollision.left = false;
      z.body.checkCollision.right = false;
      this.solids.push(z);
      this.surfaces.push({ x: p.x, y: p.y, w: p.w, h: 14, oneWay: true });
    }
  }

  buildProps() {
    const L = this.level, k = this.k;
    const decorDepth = { feet: 12, bolt: 12, table: 12, cake: 12, sign: 9, pad: 11, rocket: 11, snowman: 12 };
    this.decor = {};
    for (const d of L.decor || []) {
      let key = `d_${d.t}`;
      if (d.t === 'house') key = `house_${d.w}_${d.h}_${d.color}`;
      if (d.t === 'banner') key = `banner_${this.banner}`;
      const img = this.add.image(d.x, d.y + (d.t === 'banner' ? 0 : 2), key).setScale(k * (d.s || 1)).setDepth(decorDepth[d.t] ?? 6);
      img.setOrigin(0.5, d.t === 'banner' ? 0.5 : 1);
      if (d.t === 'house') img.setPosition(d.x + d.w / 2, d.y + 2);
      this.decor[d.t] = img;
    }
    // tower locks light up for each friend at home; the door opens once all three are back
    if (this.decor.tower) {
      const tw = this.decor.tower;
      [['nova', -15, -86], ['stitch', 15, -86], ['scout', 0, -58]].forEach(([who, dx, dy]) => {
        if (save.rescued[who]) this.add.image(tw.x + dx, tw.y - 2 + dy, 'lockLight').setScale(k).setDepth(7);
      });
      this.towerDoor = this.add.image(tw.x, tw.y + 2, 'towerDoor').setOrigin(0.5, 1).setScale(k).setDepth(7)
        .setAlpha(save.seen.towerOpen ? 1 : 0);
    }

    this.spots = (L.spots || []).map((s) => {
      const beacon = this.add.image(s.beaconX, s.top + 100 + 2, 'beacon').setOrigin(0.5, 1).setScale(k).setDepth(12);
      const ghost = this.add.image(s.x, s.top - 2, 'ghost').setOrigin(0.5, 0).setScale(k).setDepth(13).setAlpha(0);
      this.tweens.add({ targets: beacon, alpha: { from: 0.7, to: 1 }, duration: 900, yoyo: true, repeat: -1 });
      return { ...s, ghost };
    });

    this.starObjs = (L.stars || []).map((p, i) => {
      if (starTaken(L.id, i)) return null;
      const glow = this.add.image(p.x, p.y, 'dot').setScale(k * 1.7).setTint(0xffd54f).setBlendMode('ADD').setAlpha(0.55).setDepth(15);
      const img = this.add.image(p.x, p.y, 'star').setScale(k).setDepth(16);
      this.tweens.add({ targets: [img, glow], y: p.y - 6, duration: 1100 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.tweens.add({ targets: img, angle: { from: -8, to: 8 }, duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      const z = this.addZone(p.x - 14, p.y - 14, 28, 28);
      z.starIndex = i;
      return { img, glow, z, taken: false };
    }).filter(Boolean);

    this.lanterns = (L.lanterns || []).map((p) => ({ ...p, lit: false, img: this.add.image(p.x, p.y + 2, 'lantern0').setOrigin(0.5, 1).setScale(k).setDepth(12) }));

    // mushrooms are solid: hop on top and they launch you
    this.bouncers = (L.bouncers || []).map((p) => {
      const z = this.addZone(p.x - 30, p.y - 44, 60, 44);
      const b = { ...p, z, img: this.add.image(p.x, p.y + 2, 'bouncer').setOrigin(0.5, 1).setScale(k).setDepth(12) };
      z.bouncer = b;
      return b;
    });

    // flying planks, lifts (`when`: only rise while a button is held) and sinking rocks
    const platform = (m, kind) => {
      const z = this.addZone(m.x, m.y, m.w, 14, false);
      z.body.setAllowGravity(false);
      z.body.setImmovable(true);
      z.body.checkCollision.down = false;
      z.body.checkCollision.left = false;
      z.body.checkCollision.right = false;
      const look = kind === 'sinker' ? `sinker_${m.w}` : m.look ? `${m.look}_${m.w}` : `plank_${m.w}`;
      const img = this.add.image(0, 0, look).setOrigin(0, 0).setScale(k).setDepth(kind === 'sinker' ? 8 : 11);
      return { ...m, kind, z, img, dir: 1, wait: 0, state: 'idle', t: 0, ox: m.look === 'leaf' ? 10 : 6 };
    };
    this.movers = [...(L.movers || []).map((m) => platform(m, m.when ? 'lift' : 'mover')), ...(L.sinkers || []).map((m) => platform(m, 'sinker'))];

    const beetleTex = { lava: 'beetle_lava', lavacave: 'beetle_lava', ice: 'beetle_ice', icecave: 'beetle_ice' }[L.theme] || 'beetle';
    this.beetles = (L.beetles || []).map((b) => ({
      ...b, dir: 1, state: 'walk', t: 0,
      sprite: this.add.sprite(b.x, b.y + 1, beetleTex, 0).setOrigin(0.5, 32 / 34).setScale(k).setDepth(20),
    }));

    this.plates = {};
    for (const p of L.plates || []) {
      const img = this.add.image(p.x, p.y + 2, 'plate0').setOrigin(0.5, 1).setScale(k).setDepth(12).setVisible(!p.hidden);
      this.plates[p.id] = { ...p, pressed: false, img };
    }

    this.doors = {};
    for (const d of L.doors || []) {
      const h = d.bottom - d.top;
      const beam = this.add.image(d.x, d.top + h / 2, `beam_${h}`).setScale(k).setDepth(13).setBlendMode('ADD');
      const top = this.add.image(d.x, d.top, 'post').setScale(k).setDepth(14);
      const bottom = this.add.image(d.x, d.bottom - 10, 'post').setScale(k).setFlipY(true).setDepth(14);
      const flicker = this.tweens.add({ targets: beam, alpha: { from: 0.6, to: 1 }, duration: 240, yoyo: true, repeat: -1 });
      const z = this.addZone(d.x - 13, d.top, 26, h);
      this.doors[d.id] = { ...d, cond: d.open, kind: 'door', open: false, latched: false, closeAt: 0, beam, top, bottom, flicker, z };
    }
    for (const b of L.bridges || []) {
      const img = this.add.image(b.x - 4, b.y - 4, `bridge_${b.w}_${b.h}`).setOrigin(0, 0).setScale(k).setDepth(11).setAlpha(0.12);
      const z = this.addZone(b.x, b.y, b.w, b.h);
      z.body.enable = false;
      this.doors[b.id] = { ...b, cond: b.open, kind: 'bridge', open: false, latched: false, img, z };
    }

    this.barriers = (L.barriers || []).map((b) => {
      const h = b.bottom - b.top;
      const img = this.add.image(b.x, b.top + h / 2, `barrier_${h}`).setScale(k).setDepth(13).setBlendMode('ADD');
      this.tweens.add({ targets: img, alpha: { from: 0.65, to: 1 }, duration: 500, yoyo: true, repeat: -1 });
      return { ...b, z: this.addZone(b.x - 10, b.top, 20, h) };
    });

    this.cracked = (L.cracked || []).map((c) => ({
      ...c, broken: false,
      img: this.add.image(c.x - 4, c.y - 4, `cracked_${c.w}_${c.h}`).setOrigin(0, 0).setScale(k).setDepth(11),
      z: this.addZone(c.x, c.y, c.w, c.h),
    }));

    // pads in the village: rockets to the other planets (a friend's poster until they're home)
    this.pads = (L.pads || []).map((p) => {
      this.add.image(p.x, p.y + 4, `pad_${p.look}`).setOrigin(0.5, 1).setScale(k).setDepth(11);
      const rocket = this.add.image(p.x, p.y - 6, `rocket_${p.look}`).setOrigin(0.5, 1).setScale(k).setDepth(13);
      if (!save.rescued[p.friend]) this.add.image(p.x - 84, p.y + 2, `poster_${p.friend}`).setOrigin(0.5, 1).setScale(k).setDepth(9);
      return { ...p, rocket };
    });

    // friends (and, at the very end, Otto) at the party
    const met = (need) => (need === 'finished' ? save.finished : save.rescued[need]);
    this.npcs = (L.npcs || []).filter((n) => met(n.needs)).map((n) => {
      const big = n.friend === 'otto';
      const sprite = this.add.sprite(n.x, n.y + 1, big ? 'otto' : `friend_${n.friend}`, big ? 3 : 1)
        .setOrigin(0.5, big ? 1 : 70 / 72).setScale(k * (big ? 0.62 : 1)).setDepth(big ? 7 : 17).setFlipX(!!n.flip);
      this.tweens.add({ targets: sprite, y: sprite.y - (big ? 4 : 3), duration: 700 + Math.random() * 300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      return { ...n, sprite };
    });

    // letter blocks + cage
    this.blocks = [];
    if (L.letters && this.word.length) {
      const n = this.word.length;
      const order = SCRAMBLE[n] || [...this.word.keys()].reverse();
      const gap = L.letters.gap || 76;
      this.blocks = this.word.map((_, i) => {
        const x = L.letters.xs ? L.letters.xs[i] : L.letters.x + (i - (n - 1) / 2) * gap;
        const letter = this.word[(L.letters.order || order)[i] ?? i];
        const done = save.rescued[L.cage?.friend];
        const glow = this.add.image(x, L.letters.y, 'dot').setScale(k * 2.8).setTint(0x7af0ff).setBlendMode('ADD').setAlpha(0).setDepth(11);
        const sprite = this.add.image(x, L.letters.y, blockKey(letter, done)).setScale(k).setDepth(12);
        const z = this.addZone(x - 24, L.letters.y - 24, 48, 48);
        const blk = { letter, sprite, glow, z, baseY: L.letters.y, done, cool: 0, hint: null };
        z.blk = blk;
        return blk;
      });
      if (save.rescued[L.cage?.friend]) { this.solved = true; this.progress = this.word.length; }
    }
    this.blockZones = this.blocks.map((b) => b.z);
    if (L.cage) {
      const freed = save.rescued[L.cage.friend];
      this.cage = this.add.image(L.cage.x, L.cage.y + 2, `cage_${L.theme}`).setOrigin(0.5, 1).setScale(k).setDepth(18).setVisible(!freed);
      this.caged = this.add.sprite(L.cage.x, L.cage.y - 9, `friend_${L.cage.friend}`, 2).setOrigin(0.5, 70 / 72).setScale(k * 0.95).setDepth(17).setVisible(!freed);
      this.tweens.add({ targets: this.caged, y: L.cage.y - 13, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }
  }

  buildFx() {
    const k = this.k, L = this.level;
    this.dust = this.add.particles(0, 0, 'puff', {
      lifespan: 420, speed: { min: 20, max: 90 }, angle: { min: 200, max: 340 }, gravityY: -30,
      scale: { start: 0.5 * k, end: 0.12 * k }, alpha: { start: 0.75, end: 0 }, tint: 0xe6dcff, emitting: false,
    }).setDepth(22);
    this.spark = this.add.particles(0, 0, 'spark', {
      lifespan: 600, speed: { min: 60, max: 200 }, scale: { start: 0.7 * k, end: 0 }, rotate: { min: 0, max: 360 },
      alpha: { start: 1, end: 0 }, tint: [0xfff59d, 0x7af0ff, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(23);
    this.trail = this.add.particles(0, 0, 'dot', {
      lifespan: 260, speed: 10, scale: { start: 0.9 * k, end: 0 }, alpha: { start: 0.7, end: 0 },
      tint: [0xffb07c, 0xffd470, 0xffffff], blendMode: 'ADD', emitting: false,
    }).setDepth(20);
    this.add.particles(0, 0, 'dot', {
      emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 40, L.w, L.h - 80) },
      lifespan: 7000, speedX: { min: -10, max: 10 }, speedY: { min: -16, max: -4 },
      scale: { start: 0.16 * k, end: 0.05 * k }, alpha: { start: 0.9, end: 0 },
      tint: THEMES[L.theme].pollen, blendMode: 'ADD', frequency: Math.max(40, 140 * (2560 / L.w)), advance: 7000,
    }).setDepth(24);
  }

  buildColliders() {
    const P = this.physics, hero = this.hero, robot = this.robot;
    P.add.collider(hero.zone, this.solids, (h, s) => hero.touchWall(s, this.time.now), this.solidProcess, this);
    P.add.collider(hero.zone, this.bouncers.map((m) => m.z), (h, z) => { if (h.body.touching.down) this.bounceOn(z.bouncer); });
    P.add.collider(hero.zone, this.cracked.map((c) => c.z));
    P.add.collider(hero.zone, Object.values(this.doors).map((d) => d.z));
    P.add.collider(hero.zone, this.barriers.map((b) => b.z));
    P.add.collider(hero.zone, this.blockZones, (h, z) => {
      if (h.body.touching.up && h.body.top >= z.body.bottom - 10) this.bumps.push({ z, who: 'hero' });
    });
    // one-way, measured relative to the platform (a rising lift pushes Astro up with it)
    P.add.collider(hero.zone, this.movers.map((m) => m.z), null,
      (h, m) => h.body.velocity.y - m.body.velocity.y >= -40 && h.body.prev.y + h.body.height <= m.body.prev.y + 10);
    P.add.collider(hero.zone, robot.plate, null, (h, p) => robot.plateActive && h.body.velocity.y >= 0 && h.body.prev.y + h.body.height <= p.body.top + 6);
    P.add.overlap(hero.zone, this.starObjs.map((s) => s.z), (h, z) => this.collectStar(z));
    const solid = this.solids.filter((z) => !z.oneWay);
    robot.colliders = [
      P.add.collider(robot.fly, solid),
      P.add.collider(robot.fly, this.cracked.map((c) => c.z)),
      P.add.collider(robot.fly, Object.values(this.doors).map((d) => d.z)),
      P.add.collider(robot.fly, this.blockZones, (r, z) => { if (r.body.touching.up) this.bumps.push({ z, who: 'robot' }); }),
    ];
    robot.colliders.forEach((c) => { c.active = false; });
  }

  solidProcess(heroZone, solid) {
    if (!solid.oneWay) return true;
    if (this.time.now < this.hero.dropUntil) return false;
    const b = heroZone.body;
    return b.velocity.y >= 0 && b.prev.y + b.height <= solid.body.top + 4;
  }

  // ── Frame ─────────────────────────────────────────────────────────────────

  // Hazards run on slow time inside Scout's bubble (Astro and the Robot don't).
  get ts() { return this.slowT > 0 ? MOVES.bubbleSlow : 1; }

  update(time, delta) {
    const dt = Math.min(delta, 50) / 1000;
    const hero = this.hero;
    this.slowT = Math.max(0, this.slowT - delta);
    if (hero.state === 'normal' || hero.state === 'cutscene') hero.update(dt, delta, time);
    this.robot.update(dt);
    this.updateMovers(delta);
    this.updateBeetles(dt, time);
    this.updatePlates(time);
    this.resolveBumps(time);
    this.hz.update(dt, delta, time);
    this.otto?.update(dt, delta, time);
    if (hero.state === 'normal') {
      this.checkLanterns();
      this.checkExits();
      this.checkTips();
      this.checkTriggers(time);
      this.checkPads(delta);
      this.checkPowerZones();
      this.checkFall();
    }
    this.updateSpots(time);
    this.updateLook(dt);
    hero.sync(dt, time);
    this.robot.sync(time);
    clearEdges();
  }

  updateLook(dt) {
    // look ahead of Astro while playing; hold it steady in cutscenes, climbs and rescues
    if (this.hero.state === 'normal') this.lookX += (this.hero.facing * 80 - this.lookX) * Math.min(1, dt * 2.2);
    if (!this.rigHeld) {
      this.rig.x = this.hero.x + this.lookX;
      this.rig.y = this.hero.feet - 70;
    }
  }

  // ── Movers, mushrooms, beetles ────────────────────────────────────────────

  updateMovers(delta) {
    const ts = this.ts;
    const hb = this.hero.body;
    for (const m of this.movers) {
      const b = m.z.body;
      if (m.kind === 'sinker') { this.updateSinker(m, delta * ts); continue; }
      let to;
      if (m.kind === 'lift') {
        // rises while its button is held, sinks back when it isn't
        to = this.condition(m.when) ? { x: m.x2, y: m.y2 } : { x: m.x, y: m.y };
      } else to = m.dir > 0 ? { x: m.x2, y: m.y2 } : { x: m.x, y: m.y };
      if (m.wait > 0) {
        m.wait -= delta * ts;
        b.setVelocity(0, 0);
      } else {
        const dx = to.x - b.x, dy = to.y - b.y, d = Math.hypot(dx, dy);
        if (d < 3) {
          b.setVelocity(0, 0);
          if (m.kind === 'lift' && d > 0.01) b.reset(to.x + m.w / 2, to.y + 7);
          if (m.kind === 'mover') { m.dir *= -1; m.wait = m.pause || 600; }
        } else {
          const sp = Math.min(m.speed, d * 6 + 20) * ts;
          b.setVelocity((dx / d) * sp, (dy / d) * sp);
        }
      }
      m.img.setPosition(b.x - m.ox, b.y - 4);
    }
    this.heroOnSinker = null;
    for (const m of this.movers) {
      if (m.kind !== 'sinker') continue;
      const b = m.z.body;
      if (this.hero.onGround && hb.right > b.x + 4 && hb.left < b.right - 4 && Math.abs(hb.bottom - b.top) < 4) this.heroOnSinker = m;
    }
  }

  // Cooling rocks on lava: stand on one and it slowly sinks, then floats back up.
  updateSinker(m, d) {
    const b = m.z.body;
    const on = this.heroOnSinker === m;
    if (m.state === 'idle' && on) { m.state = 'wait'; m.t = 450; }
    else if (m.state === 'wait') { m.t -= d; if (m.t <= 0) m.state = 'sink'; }
    let vy = 0;
    if (m.state === 'sink') {
      vy = 70;
      if (b.y >= m.y + 100) { m.state = 'under'; m.t = 1600; vy = 0; }
    } else if (m.state === 'under') {
      m.t -= d;
      if (m.t <= 0) m.state = 'rise';
    } else if (m.state === 'rise') {
      vy = -90;
      if (b.y <= m.y) { m.state = 'idle'; vy = 0; b.reset(m.x + m.w / 2, m.y + 7); }
    }
    b.setVelocity(0, vy * this.ts);
    const shake = m.state === 'wait' ? Math.sin(this.time.now / 30) * 1.5 : 0;
    m.img.setPosition(b.x - m.ox + shake, b.y - 4);
    m.img.setTint(m.state === 'idle' ? 0xffffff : 0xffb38a);
  }

  bounceOn(m) {
    if (this.hero.state !== 'normal') return;
    this.hero.bounce(input.jumpHeld ? MOVES.bounceHoldTiles : MOVES.bounceTiles);
    sfx.bounce();
    m.img.setTexture('bouncer_sq');
    this.time.delayedCall(140, () => m.img.setTexture('bouncer'));
    this.spark.explode(6, m.x, m.y - 44);
  }

  updateBeetles(dt, time) {
    const hero = this.hero, hb = hero.body, rb = this.robot;
    for (const e of this.beetles) {
      if (e.state === 'gone') continue;
      if (e.state === 'flat') {
        e.t -= dt * 1000;
        if (e.t <= 0) { e.state = 'gone'; this.tweens.add({ targets: e.sprite, alpha: 0, duration: 300, onComplete: () => e.sprite.destroy() }); }
        continue;
      }
      if (e.state === 'dizzy') { e.t -= dt * 1000 * this.ts; if (e.t <= 0) e.state = 'walk'; }
      if (e.state === 'walk') {
        e.x += e.dir * 46 * dt * this.ts;
        if (e.x < e.min) { e.x = e.min; e.dir = 1; }
        if (e.x > e.max) { e.x = e.max; e.dir = -1; }
      }
      e.sprite.setPosition(e.x, e.y + 1).setFlipX(e.dir < 0);
      e.sprite.setFrame(e.state === 'dizzy' ? 3 : Math.floor(time * this.ts / 180) % 2);
      const box = { x: e.x - 18, y: e.y - 22, w: 36, h: 22 };
      if (input.coop && rb.mode === 'coop' && e.state === 'walk' && overlap(rb.rect(), box)) {
        e.state = 'dizzy'; e.t = 2600; sfx.stomp(); this.spark.explode(5, e.x, e.y - 20);
      }
      if (hero.state !== 'normal') continue;
      const hr = { x: hb.left, y: hb.top, w: hb.width, h: hb.height };
      if (!overlap(hr, box)) continue;
      if (hero.shielded && e.state !== 'flat') {
        // Stitch's shield bowls beetles over
        e.state = 'flat'; e.t = 600;
        e.sprite.setFrame(2);
        sfx.stomp();
        this.spark.explode(8, e.x, e.y - 10);
      } else if (hb.velocity.y > 40 && hb.prev.y + hb.height <= e.y - 12) {
        e.state = 'flat'; e.t = 600;
        e.sprite.setFrame(2);
        hero.bounce(MOVES.stompTiles + (input.jumpHeld ? 1 : 0));
        sfx.stomp();
        this.spark.explode(8, e.x, e.y - 10);
        this.sayOnce('r_stomp');
      } else if (e.state === 'walk' && hero.hurt(e.x)) {
        this.hooks.hearts(hero.hearts);
        if (time - (this.cooldowns.ouch || -1e9) > 6000) { this.cooldowns.ouch = time; this.say(this.level.theme.startsWith('ice') ? 'r_ouch_snow' : 'r_ouch'); }
        if (hero.hearts <= 0) this.outOfHearts();
      }
    }
  }

  // ── Shared puzzles ────────────────────────────────────────────────────────

  updatePlates(time) {
    const hb = this.hero.body;
    const rr = this.robot.rect();
    const heroOn = this.hero.state === 'normal' || this.hero.state === 'cutscene';
    for (const p of Object.values(this.plates)) {
      const pz = { x: p.x - 30, y: p.y - 30, w: 60, h: 34 };
      const byHero = heroOn && hb.bottom > p.y - 8 && hb.bottom < p.y + 4 && hb.right > p.x - 28 && hb.left < p.x + 28;
      const byRobot = this.robot.mode !== 'rescue' && overlap(rr, pz);
      const pressed = byHero || byRobot;
      if (pressed !== p.pressed) {
        p.pressed = pressed;
        p.img.setTexture(pressed ? 'plate1' : 'plate0');
        if (pressed) sfx.plateOn(); else sfx.plateOff();
      }
    }
    for (const d of Object.values(this.doors)) {
      if (d.latched) continue;
      if (this.condition(d.cond)) {
        if (!d.open) this.setDoor(d, true);
        if (d.cond.latch || d.cond.all) d.latched = true;
        d.closeAt = 0;
      } else if (d.open) {
        // "hold" doors close shortly after the button is released — never on top of Astro
        const heroIn = overlap({ x: hb.left, y: hb.top, w: hb.width, h: hb.height }, { x: d.x - 16, y: d.top, w: 32, h: d.bottom - d.top });
        if (!d.closeAt) d.closeAt = time + 380;
        if (time >= d.closeAt && !heroIn) { this.setDoor(d, false); d.closeAt = 0; }
      }
    }
  }

  condition(cond) {
    if (cond.timer) return this.hz.timerOpen(cond.timer);
    if (cond.hold) return !!this.plates[cond.hold]?.pressed;
    const list = cond.all || cond.latch || [];
    return list.length > 0 && list.every((id) => this.plates[id]?.pressed);
  }

  setDoor(d, open) {
    d.open = open;
    if (d.kind === 'bridge') {
      d.z.body.enable = open;
      this.tweens.add({ targets: d.img, alpha: open ? 1 : 0.12, duration: 300 });
      if (open) { sfx.doorOpen(); for (let x = d.x; x < d.x + d.w; x += 40) this.spark.explode(2, x, d.y); }
      return;
    }
    d.z.body.enable = !open;
    if (open) {
      d.flicker.pause();
      this.tweens.add({ targets: d.beam, alpha: 0.05, duration: 220 });
      d.top.setTint(0x9dffc4); d.bottom.setTint(0x9dffc4);
      sfx.doorOpen();
    } else {
      d.beam.setAlpha(1);
      d.flicker.resume();
      d.top.clearTint(); d.bottom.clearTint();
      sfx.doorClose();
    }
  }

  // Is the Robot still needed on this button? It stays until Astro is through the door /
  // across the bridge, or has wandered far away — not just until the door opens.
  holdDone(spot) {
    if (!spot) return false;
    const d = this.doors[spot.door];
    const p = this.plates[spot.plate];
    const hx = this.hero.x;
    if (p && Math.abs(hx - p.x) > 700) return true;
    if (spot.until) return hx > spot.until.x && (spot.until.above === undefined || this.hero.feet < spot.until.above);
    if (!d) return false;
    return d.kind === 'door' ? hx > d.x + 90 : hx > d.x + d.w + 30;
  }

  // The button under the Robot (used to snap onto it in two-player mode).
  plateAt(rect) {
    const cx = rect.x + rect.w / 2;
    return Object.values(this.plates).find((p) => Math.abs(cx - p.x) < 34
      && overlap(rect, { x: p.x - 30, y: p.y - 30, w: 60, h: 34 })) || null;
  }

  // Where the Robot should go when C is pressed.
  helpTarget() {
    const hero = this.hero;
    const hx = hero.x;
    for (const hs of this.level.holdSpots || []) {
      if (this.doors[hs.door]?.latched) continue; // solved for good: C makes a step again
      if (hx >= hs.from && hx <= hs.to && !this.holdDone(hs)) {
        const p = this.plates[hs.plate];
        return { kind: 'hold', x: p.x, y: p.y - 33, spot: hs };
      }
    }
    const sp = this.spots.find((s) => hx >= s.from && hx <= s.to);
    if (sp) return { kind: 'step', x: sp.x, y: sp.top + PLATE_OFFSET };
    const b = hero.body;
    let tx, top;
    if (hero.onGround) { tx = hx + hero.facing * 86; top = hero.feet - 74; } else { tx = hx + b.velocity.x * 0.12; top = hero.feet + 26; }
    tx = clamp(tx, 60, this.level.w - 60);
    for (let i = 0; i < 8 && this.blockedRect(tx - 44, top, 88, 10); i++) top -= 18;
    return { kind: 'step', x: tx, y: top + PLATE_OFFSET };
  }

  blockedRect(x, y, w, h) {
    const r = { x, y, w, h };
    if (this.ground.some((g) => overlap(r, g))) return true;
    if (this.cracked.some((c) => !c.broken && overlap(r, c))) return true;
    return Object.values(this.doors).some((d) => d.kind === 'door' && !d.open && overlap(r, { x: d.x - 13, y: d.top, w: 26, h: d.bottom - d.top }));
  }

  dashBreak(hero) {
    const b = hero.body;
    const r = { x: b.left - 12, y: b.top, w: b.width + 24, h: b.height };
    for (const c of this.cracked) {
      if (c.broken || !overlap(r, c)) continue;
      c.broken = true;
      c.z.body.enable = false;
      sfx.crack();
      this.cameras.main.shake(140, 0.005);
      for (let y = c.y; y < c.y + c.h; y += 24) this.spark.explode(4, c.x + c.w / 2, y);
      this.tweens.add({ targets: c.img, alpha: 0, scaleX: this.k * 1.3, scaleY: this.k * 1.1, duration: 260, onComplete: () => c.img.destroy() });
    }
  }

  dashTrail(x, y) { this.trail.explode(1, x, y); }

  hasPower(p) { return !!save.rescued[POWER_FRIEND[p]]; }

  // The power on X / ★: the one picked (1 2 3 or a friend's face), else the first friend home.
  currentPower() {
    if (save.power && this.hasPower(save.power)) return save.power;
    for (const f of ['nova', 'stitch', 'scout']) if (save.rescued[f]) return POWERS[f];
    return null;
  }

  selectPower(p, quiet = false) {
    if (!this.hasPower(p)) return false;
    const changed = save.power !== p;
    save.power = p;
    writeSave();
    this.hooks.power();
    if (changed && !quiet) { sfx.select(); this.spark.explode(6, this.hero.x, this.hero.feet - 60); }
    return true;
  }

  noPower() {
    const near = this.cracked.some((c) => !c.broken && Math.abs(c.x - this.hero.x) < 200);
    if (near) this.sayCooldown('r_no_dash', 5000);
    else this.sayCooldown('r_no_power', 8000);
  }

  startBubble() {
    this.slowT = MOVES.bubbleMs;
    sfx.bubble();
    this.time.delayedCall(MOVES.bubbleMs - 650, () => { if (this.alive && this.slowT > 0) sfx.bubbleEnd(); });
    const fx = this.hz.bubbleFx;
    fx.setScale(this.k * 0.2);
    this.tweens.add({ targets: fx, scaleX: this.k, scaleY: this.k, duration: 260, ease: 'Back.easeOut' });
    this.sayOnce('r_bubble_first');
  }

  windAt(x, y) { return this.hz ? this.hz.windAt(x, y) : 0; }

  onIce(hero) {
    const b = hero.body;
    return this.surfaces.some((r) => r.ice && b.right > r.x && b.left < r.x + r.w && Math.abs(r.y - b.bottom) < 3);
  }

  // Crossing into a part of a level that needs a certain power picks it automatically.
  checkPowerZones() {
    const hx = this.hero.x;
    let zone = null;
    for (const z of this.level.powerZones || []) if (hx >= z.x) zone = z;
    if (!zone || zone === this.zonePower) return;
    this.zonePower = zone;
    if (this.selectPower(zone.power)) this.sayOnce(`p_${zone.power}`, `${this.level.id}:${zone.x}`);
  }

  // A star jar in Otto's room has been opened.
  openJar(j) {
    (this.jarsOpen ||= new Set()).add(j.id);
    j.sprite.setTexture('jar1');
    this.tweens.killTweensOf(j.glow);
    j.glow.setAlpha(0);
    sfx.crack();
    this.spark.explode(20, j.x, j.y - 40);
    for (let i = 0; i < 7; i++) {
      const st = this.add.image(j.x, j.y - 40, 'star').setScale(this.k * 0.8).setDepth(30);
      this.tweens.add({ targets: st, x: j.x + (Math.random() - 0.5) * 300, y: j.y - 380 - Math.random() * 120, alpha: 0, angle: 360, duration: 1400 + i * 90, ease: 'Cubic.easeOut', onComplete: () => st.destroy() });
    }
    story.onJar(this, j);
  }

  // ── Letters ───────────────────────────────────────────────────────────────

  resolveBumps(time) {
    if (!this.bumps.length) return;
    let best = null, bestD = Infinity;
    for (const c of this.bumps) {
      const src = c.who === 'hero' ? this.hero.body.center.x : this.robot.x;
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
      if (this.progress >= this.word.length) { this.solved = true; story.onWordSolved(this); }
    } else {
      sfx.bad();
      this.stats.wrong++;
      this.wrongStreak++;
      blk.sprite.setTint(0xff9a9a);
      this.time.delayedCall(240, () => blk.sprite.clearTint());
      this.tweens.add({ targets: blk.sprite, x: blk.z.x + 4, duration: 50, yoyo: true, repeat: 2 });
      if (this.time.now - this.lastWrongSay > 2500) { this.lastWrongSay = this.time.now; this.say('r_wrong', { args: [need] }); }
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

  // ── Pickups, lanterns, exits, tips ────────────────────────────────────────

  collectStar(z) {
    const s = this.starObjs.find((o) => o.z === z);
    if (!s || s.taken || this.hero.state !== 'normal') return;
    s.taken = true;
    z.body.enable = false;
    this.tweens.killTweensOf([s.img, s.glow]);
    this.tweens.add({ targets: [s.img, s.glow], y: s.img.y - 30, alpha: 0, duration: 380, ease: 'Quad.easeOut', onComplete: () => { s.img.destroy(); s.glow.destroy(); } });
    this.spark.explode(12, z.x, z.y);
    sfx.star();
    takeStar(this.level.id, z.starIndex);
    this.updateStarHud();
  }

  updateStarHud() {
    const total = (this.level.stars || []).length;
    this.hooks.stars((save.stars[this.level.id] || []).length, total);
  }

  checkLanterns() {
    const hx = this.hero.x, hy = this.hero.feet;
    for (const l of this.lanterns) {
      if (l.lit || Math.abs(hx - l.x) > 30 || Math.abs(hy - l.y) > 60) continue;
      l.lit = true;
      l.img.setTexture('lantern1');
      this.checkpoint = { x: l.x, y: l.y };
      this.hero.hearts = 3;
      this.hooks.hearts(3);
      sfx.checkpoint();
      this.spark.explode(8, l.x, l.y - 70);
      this.sayOnce('r_checkpoint');
    }
  }

  checkExits() {
    if (this.traveling) return;
    const b = this.hero.body;
    const hr = { x: b.left, y: b.top, w: b.width, h: b.height };
    for (const ex of this.level.exits || []) {
      if (ex.needs === 'all' && !save.seen.towerOpen) continue;
      if (ex.needs === 'finished' && !save.finished) continue;
      const inside = overlap(hr, ex);
      if (ex.ask) {
        // big steps (the tower) ask first; "not now" waits until Astro has stepped out again
        if (!inside) { this.askedExits.delete(ex); continue; }
        if (this.askedExits.has(ex)) continue;
        this.askedExits.add(ex);
        this.hooks.ask({ key: ex.ask, face: ex.face, yes: () => this.travel(ex.to, ex.entry) });
        return;
      }
      if (inside) { this.travel(ex.to, ex.entry); return; }
    }
  }

  travel(to, entry) {
    if (this.traveling) return;
    this.traveling = true;
    this.hero.state = 'cutscene';
    const cam = this.cameras.main;
    cam.fadeOut(320, 10, 8, 30);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.hooks.travel(to, entry));
  }

  checkTips() {
    const hx = this.hero.x, hy = this.hero.feet;
    for (const tip of this.level.tips || []) {
      if (tip.dir < 0 ? hx > tip.x : hx < tip.x) continue;
      if (tip.minY !== undefined && (hy < tip.minY || hy > tip.maxY)) continue;
      this.sayOnce(tip.key, `${this.level.id}:${tip.key}`);
    }
  }

  checkTriggers(time) {
    const hx = this.hero.x;
    for (const tr of this.level.triggers || []) {
      if (hx < tr.x || (tr.w && hx > tr.x + tr.w)) continue;
      if (tr.needs && !(tr.needs === 'finished' ? save.finished : save.rescued[tr.needs])) continue;
      if (tr.repeat) {
        if (time < (this.cooldowns[tr.id] || 0)) continue;
        this.cooldowns[tr.id] = time + 6000;
      } else if (this.fired.has(tr.id)) continue;
      this.fired.add(tr.id);
      story.onTrigger(this, tr.id);
    }
  }

  // Stand still on a rocket pad for a moment to take off (running across it doesn't).
  checkPads(delta) {
    const hero = this.hero;
    if (this.traveling || this.time.now < this.startedAt + 1800) return; // not straight after landing back home
    for (const p of this.pads) {
      const on = hero.onGround && Math.abs(hero.x - p.x) < 40;
      if (!on) { p.t = 0; p.asked = false; continue; }
      if (p.asked) continue; // said "not now": ask again only after stepping off
      this.sayOnce('h_pad');
      if (Math.abs(hero.body.velocity.x) > 25) { p.t = 0; continue; }
      p.t = (p.t || 0) + delta;
      if (Math.floor(p.t / 180) !== Math.floor((p.t - delta) / 180)) {
        this.spark.explode(3, p.x + (Math.random() - 0.5) * 80, p.y - 4);
        sfx.tick();
      }
      if (p.t >= 700) {
        p.t = 0;
        p.asked = true;
        const face = `${p.friend}_${save.rescued[p.friend] ? 'happy' : 'sad'}`;
        this.hooks.ask({ key: p.ask, face, yes: () => story.launch(this, p) });
        return;
      }
    }
  }

  updateSpots(time) {
    const hx = this.hero.x;
    for (const s of this.spots) {
      const near = this.hero.state === 'normal' && hx >= s.from - 60 && hx <= s.to;
      const r = this.robot;
      const occupied = r.plateActive && Math.abs(r.x - s.x) < 30 && Math.abs(r.y - PLATE_OFFSET - s.top) < 30;
      const target = near && !occupied ? 0.45 + 0.3 * Math.sin(time / 240) : 0;
      s.ghost.alpha += (target - s.ghost.alpha) * 0.15;
    }
  }

  // ── Falling & respawning ──────────────────────────────────────────────────

  checkFall() {
    const b = this.hero.body;
    const H = this.level.h;
    if (this.opts.difficulty === 'easy') {
      if (b.bottom > H - 30 && b.velocity.y > 0) this.startCatch();
    } else if (b.top > H + 20) {
      this.hardFall();
    }
  }

  awayFromEdge(pos) {
    const r = this.surfaces.find((s) => pos.x >= s.x && pos.x <= s.x + s.w && Math.abs(s.y - pos.y) < 3);
    if (!r) return { ...pos };
    const margin = Math.min(56, r.w / 2);
    return { x: clamp(pos.x, r.x + margin, r.x + r.w - margin), y: pos.y };
  }

  startCatch(line) {
    const hero = this.hero;
    hero.state = 'caught';
    this.stats.catches++;
    hero.pos = { x: hero.body.center.x, y: hero.body.bottom };
    hero.body.enable = false;
    this.say(line || (this.stats.catches === 1 ? 'r_catch' : 'r_catch_short'));
    const safe = this.awayFromEdge(hero.lastSafe);
    this.robot.rescue(hero, safe, () => {
      hero.place(safe.x, safe.y - 80);
      hero.state = 'normal';
      this.robot.resume();
    });
  }

  hardFall(line) {
    const hero = this.hero;
    hero.state = 'respawn';
    this.stats.falls++;
    hero.hearts--;
    this.hooks.hearts(hero.hearts);
    sfx.hurt();
    hero.body.enable = false;
    this.respawn(hero.hearts <= 0 ? null : this.awayFromEdge(hero.lastSafe), hero.hearts <= 0 ? 'r_out_of_hearts' : line || 'r_fall_hard');
  }

  outOfHearts() {
    const hero = this.hero;
    hero.state = 'respawn';
    hero.body.enable = false;
    this.time.delayedCall(350, () => this.respawn(null, 'r_out_of_hearts'));
  }

  respawn(to, line) {
    const cam = this.cameras.main;
    const hero = this.hero;
    cam.fadeOut(260, 12, 10, 40);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      if (!this.alive) return;
      const tgt = to || this.checkpoint;
      if (!to) { hero.hearts = 3; this.hooks.hearts(3); }
      this.robot.x = tgt.x - 60;
      this.robot.y = tgt.y - 110;
      hero.place(tgt.x, tgt.y - 2);
      hero.state = 'normal';
      hero.invuln = 900;
      this.robot.resume();
      this.say(line);
      cam.fadeIn(320, 12, 10, 40);
    });
  }

  // ── Helpers used by the hero, robot and story ─────────────────────────────

  setCoop(on, initial = false) {
    if (this.robot.mode === 'rescue' || this.robot.mode === 'script') return;
    if (on) {
      this.robot.p2Target = null;
      this.robot.setMode('coop');
      if (!initial) this.say('r_coop');
    } else {
      this.robot.setMode('follow');
    }
  }

  supportedAt(px, bottom) {
    return this.surfaces.some((r) => px >= r.x && px <= r.x + r.w && Math.abs(r.y - bottom) < 3);
  }

  standingSafe(hero) {
    const b = hero.body;
    return this.supportedAt(b.left + 3, b.bottom) && this.supportedAt(b.right - 3, b.bottom);
  }

  onOneWay(hero) {
    const b = hero.body;
    return this.surfaces.some((p) => p.oneWay && b.right > p.x && b.left < p.x + p.w && Math.abs(p.y - b.bottom) < 3);
  }

  groundBelow(x, y) {
    let best = null;
    for (const r of this.surfaces) if (x >= r.x && x <= r.x + r.w && r.y >= y && (best === null || r.y < best)) best = r.y;
    for (const d of Object.values(this.doors)) if (d.kind === 'bridge' && d.open && x >= d.x && x <= d.x + d.w && d.y >= y && (best === null || d.y < best)) best = d.y;
    for (const m of this.movers) { const b = m.z.body; if (x >= b.x && x <= b.right && b.y >= y && (best === null || b.y < best)) best = b.y; }
    const r = this.robot;
    if (r.plateActive) { const top = r.y - PLATE_OFFSET; if (Math.abs(x - r.x) <= 44 && top >= y && (best === null || top < best)) best = top; }
    return best;
  }

  placeShadow(img, x, y, gy, maxAlpha) {
    if (gy === null || gy === undefined) { img.setVisible(false); return; }
    const d = gy - y;
    img.setVisible(true).setPosition(x, gy + 1)
      .setAlpha(clamp(maxAlpha - d / 300, 0.06, maxAlpha))
      .setScale(this.k * clamp(1 - d / 400, 0.4, 1));
  }

  puff(x, y, n) { this.dust.explode(n, x, y); }

  say(key, opts = {}) { return this.hooks.say(key, opts); }

  sayOnce(key, id = key) {
    if (save.seen[`tip:${id}`]) return;
    save.seen[`tip:${id}`] = true;
    writeSave();
    this.say(key);
  }

  sayCooldown(key, ms) {
    const now = this.time.now;
    if (now < (this.cooldowns[`say_${key}`] || 0)) return;
    this.cooldowns[`say_${key}`] = now + ms;
    this.say(key);
  }

  goalKey() {
    const id = this.level.id;
    const R = save.rescued;
    const word = this.word.join('');
    switch (id) {
      case 'intro': return ['g_intro'];
      case 'home': {
        if (!save.seen.arrival) return ['g_home'];
        if (save.finished) return ['g_done'];
        const left = ['nova', 'stitch', 'scout'].filter((f) => !R[f]);
        if (!left.length) return ['g_tower'];
        return [left.length === 3 ? 'g_choose' : `g_left_${left.join('_')}`];
      }
      case 'woods1': return ['g_woods1'];
      case 'woods2': return R.nova ? ['g_woods2b'] : ['g_woods2', word];
      case 'lava1': return ['g_lava1'];
      case 'lava2': return R.stitch ? ['g_lava2b'] : ['g_lava2', word];
      case 'ice1': return ['g_ice1'];
      case 'ice2': return R.scout ? ['g_ice2b'] : ['g_ice2', word];
      case 'tower1': return ['g_tower1'];
      case 'tower2': return [save.finished ? 'g_done' : 'g_tower2'];
      default: return ['g_intro'];
    }
  }

  // Cutscene helpers (promises so story scripts can be written top-to-bottom).
  wait(ms) { return new Promise((res) => this.time.delayedCall(ms, res)); }

  // Glide the camera to (x, y) and keep it there until the cutscene ends.
  pan(x, y, ms) {
    this.rigHeld = true;
    this.tweens.killTweensOf(this.rig);
    return this.tweenP({ targets: this.rig, x, y, duration: ms, ease: 'Sine.easeInOut' });
  }

  // Glide back to Astro; the camera resumes following when the cutscene ends.
  panHome(ms = 700) {
    return this.pan(this.hero.x + this.lookX, this.hero.feet - 70, ms);
  }

  tweenP(cfg) { return new Promise((res) => this.tweens.add({ ...cfg, onComplete: res })); }

  async cutscene(fn) {
    if (this.inCutscene) return;
    this.inCutscene = true;
    if (this.hero.state === 'normal') this.hero.state = 'cutscene';
    try { await fn(); } finally {
      if (this.alive) {
        this.rigHeld = false;
        if (this.hero.state === 'cutscene') this.hero.state = 'normal';
        this.inCutscene = false;
        clearEdges();
      }
    }
  }
}
