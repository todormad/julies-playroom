/* global Phaser */
// Hazards for the Lava Planet, the Ice Planet and Otto's tower, all built from level data:
//
//   lava:      [{ x, y, w, h }]                    hot pool; a shielded Astro bounces off it
//   flames:    [{ x, top, bottom, cycle?, offset?, off? }]
//              a fire column: cycle [offMs, onMs] makes a jet, otherwise it burns all the
//              time; `off` is a button condition that puts it out (a valve)
//   fireballs: [{ x, y, h, period, offset? }]      jump out of the lava and fall back
//   icicles:   [{ x, y }]                          fall when Astro walks underneath
//   cannons:   [{ x, y, dir, period, plug?, range? }] shoot snowballs; the Robot can sit on one
//   winds:     [{ x, y, w, h, force, cycle? }]     a blizzard pushing Astro back
//   crushers:  [{ x, top, w, h, floor, cycle: [upMs, downMs], offset?, rise? }] stomp down, rise again
//   bells:     [{ x, y, timer, ms }]               hit from below: opens the gates of `timer`
//   jars:      [{ id, x, y }]                      Otto's star jars (the finale)
//
// Scout's time bubble slows all of them (sc.ts < 1).

import { MOVES } from '../config.js';
import { sfx } from '../sfx.js';

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export class Hazards {
  constructor(sc) {
    this.s = sc;
    const L = sc.level, k = sc.k;
    this.clock = 0; // hazard time: runs slower inside the time bubble

    this.lava = (L.lava || []).map((p) => {
      const img = sc.add.image(p.x - 6, p.y - 10, `lava_${p.w}_${p.h}`).setOrigin(0, 0).setScale(k).setDepth(9);
      const glow = sc.add.image(p.x + p.w / 2, p.y, 'dot').setDisplaySize(p.w * 1.3, 120).setTint(0xff7a2a).setBlendMode('ADD').setAlpha(0.45).setDepth(8);
      sc.tweens.add({ targets: glow, alpha: 0.25, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      sc.tweens.add({ targets: img, y: p.y - 7, duration: 1300, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      sc.add.particles(0, 0, 'dot', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(p.x + 6, p.y - 2, p.w - 12, 6) },
        lifespan: 900, speedY: { min: -60, max: -20 }, speedX: { min: -8, max: 8 },
        scale: { start: 0.35 * k, end: 0 }, alpha: { start: 0.9, end: 0 },
        tint: [0xffe08a, 0xff9a3c, 0xff5a2a], blendMode: 'ADD', frequency: Math.max(40, 9000 / p.w),
      }).setDepth(10);
      return { ...p };
    });

    this.flames = (L.flames || []).map((f) => {
      const h = f.bottom - f.top;
      const wall = !f.cycle; // a wall of fire is wider and wilder than a jet
      const col = sc.add.image(f.x, f.top + h / 2, `flame_${h}`).setScale(k * (wall ? 1.5 : 1), k).setDepth(13).setBlendMode('ADD').setAlpha(0);
      const vent = sc.add.image(f.x, f.bottom + 2, 'vent').setOrigin(0.5, 1).setScale(k * (wall ? 1.3 : 1), k).setDepth(12);
      const fx = sc.add.particles(0, 0, 'flame', {
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(f.x - (wall ? 16 : 10), f.top + 6, wall ? 32 : 20, h - 10) },
        lifespan: 380, speedY: { min: -120, max: -40 }, speedX: { min: -20, max: 20 },
        scale: { start: 1.1 * k, end: 0.1 * k }, alpha: { start: 0.95, end: 0 },
        tint: [0xfff3a0, 0xffb347, 0xff6a2a], blendMode: 'ADD', frequency: 22, quantity: 2,
      }).setDepth(14);
      fx.emitting = false;
      return { ...f, h, col, vent, fx, on: false, warn: false };
    });

    this.fireballs = (L.fireballs || []).map((f) => ({
      ...f, sprite: sc.add.image(f.x, f.y + 40, 'fireball').setScale(k).setDepth(16).setVisible(false), was: false,
    }));

    this.icicles = (L.icicles || []).map((c) => ({
      ...c, state: 'hang', t: 0, vy: 0, y0: c.y,
      sprite: sc.add.image(c.x, c.y - 2, 'icicle').setOrigin(0.5, 0).setScale(k).setDepth(15),
    }));

    this.cannons = (L.cannons || []).map((c) => {
      const sprite = sc.add.image(c.x, c.y + 2, 'cannon').setOrigin(0.5, 1).setScale(k).setDepth(13).setFlipX(c.dir > 0);
      return { ...c, sprite, t: (c.offset || 0) };
    });
    this.snowballs = [];

    this.winds = (L.winds || []).map((w) => {
      // streaks of snow while the wind blows, a few lazy flakes while it rests
      const zone = { type: 'random', source: new Phaser.Geom.Rectangle(w.x + (w.force < 0 ? w.w * 0.3 : 0), w.y, w.w * 0.7 + 200, w.h) };
      const fx = sc.add.particles(0, 0, 'streak', {
        emitZone: zone, lifespan: 900, speedX: { min: w.force * 3.4, max: w.force * 2.4 }, speedY: { min: 20, max: 70 },
        scale: { start: k, end: 0.6 * k }, alpha: { start: 0.95, end: 0 }, frequency: 9, quantity: 2,
      }).setDepth(24);
      const calm = sc.add.particles(0, 0, 'dot', {
        emitZone: zone, lifespan: 2400, speedX: { min: -12, max: 12 }, speedY: { min: 20, max: 40 },
        scale: { start: 0.3 * k, end: 0.15 * k }, alpha: { start: 0.9, end: 0 }, frequency: 70,
      }).setDepth(24);
      return { ...w, fx, calm, on: true };
    });

    this.crushers = (L.crushers || []).map((c) => {
      const rod = sc.add.image(c.x + c.w / 2, 0, 'rod').setOrigin(0.5, 0).setScale(k).setDepth(8);
      const sprite = sc.add.image(c.x - 4, c.top - 4, `crusher_${c.w}_${c.h}`).setOrigin(0, 0).setScale(k).setDepth(12);
      const z = sc.addZone(c.x, c.top, c.w, c.h, false);
      z.body.setAllowGravity(false);
      z.body.setImmovable(true);
      return { ...c, y: c.top, phase: 'up', t: c.offset || 0, sprite, rod, z };
    });

    this.bells = (L.bells || []).map((b) => {
      const sprite = sc.add.image(b.x, b.y, 'bell').setScale(k).setDepth(12);
      const z = sc.addZone(b.x - 24, b.y - 24, 48, 48);
      z.bell = b;
      return { ...b, sprite, z, cool: 0 };
    });
    this.timers = {};

    this.jars = (L.jars || []).map((j) => {
      const open = sc.jarsOpen?.has(j.id);
      const glow = sc.add.image(j.x, j.y - 34, 'dot').setScale(k * 3).setTint(0xffd54f).setBlendMode('ADD').setAlpha(open ? 0 : 0.5).setDepth(11);
      const sprite = sc.add.image(j.x, j.y + 2, open ? 'jar1' : 'jar0').setOrigin(0.5, 1).setScale(k).setDepth(12);
      if (!open) sc.tweens.add({ targets: glow, alpha: 0.2, duration: 700, yoyo: true, repeat: -1 });
      return { ...j, sprite, glow, open };
    });

    this.bubbleTint = sc.add.rectangle(0, 0, 4000, 4000, 0x7ad8ff, 0.12).setScrollFactor(0).setDepth(40).setVisible(false).setBlendMode('ADD');
    this.bubbleFx = sc.add.image(0, 0, 'bubbleFx').setScale(k).setDepth(23).setVisible(false).setBlendMode('ADD');
  }

  // Colliders that need the hero (called once from the scene).
  bind() {
    const sc = this.s, P = sc.physics, hero = sc.hero, robot = sc.robot;
    // crushers are solid, except while they are slamming down
    P.add.collider(hero.zone, this.crushers.map((c) => c.z), null, (h, z) => this.crushers.find((c) => c.z === z)?.phase !== 'drop');
    P.add.collider(hero.zone, this.bells.map((b) => b.z), (h, z) => {
      if (h.body.touching.up && h.body.top >= z.body.bottom - 10) this.ring(z.bell);
    });
    robot.colliders.push(P.add.collider(robot.fly, this.bells.map((b) => b.z), (r, z) => { if (r.body.touching.up) this.ring(z.bell); }));
    robot.colliders.push(P.add.collider(robot.fly, this.crushers.map((c) => c.z)));
    robot.colliders.forEach((c) => { c.active = robot.mode === 'coop'; });
  }

  update(dt, delta, time) {
    const sc = this.s;
    const ts = sc.ts;
    const d = delta * ts;
    this.clock += d;
    const hero = sc.hero;
    const playing = hero.state === 'normal';
    const hb = hero.body;
    const hr = { x: hb.left, y: hb.top, w: hb.width, h: hb.height };

    // ── lava ──
    if (playing) {
      for (const p of this.lava) {
        if (hb.right < p.x + 4 || hb.left > p.x + p.w - 4 || hb.bottom < p.y + 8) continue;
        this.lavaTouch(p);
        break;
      }
    }

    // ── fire columns ──
    for (const f of this.flames) {
      let on = true, warn = false;
      if (f.off && sc.condition(f.off)) on = false;
      else if (f.cycle) {
        const [offMs, onMs] = f.cycle;
        const ph = (this.clock + (f.offset || 0)) % (offMs + onMs);
        on = ph >= offMs;
        warn = !on && ph > offMs - 550;
      }
      if (on !== f.on) {
        f.on = on;
        f.fx.emitting = on;
        sc.tweens.killTweensOf(f.col);
        sc.tweens.add({ targets: f.col, alpha: on ? 1 : 0, duration: on ? 120 : 260 });
        if (on && f.cycle && Math.abs(f.x - hero.x) < 600) sfx.whooshFire();
      }
      f.fx.frequency = 22 / Math.max(ts, 0.3);
      if (warn !== f.warn) { f.warn = warn; f.vent.setTint(warn ? 0xffb070 : 0xffffff); }
      if (warn && Math.random() < 0.3 * ts) sc.spark.explode(1, f.x + (Math.random() - 0.5) * 16, f.bottom - 6);
      if (on && playing && overlap(hr, { x: f.x - 13, y: f.top, w: 26, h: f.h })) this.burn(f.x);
    }

    // ── fireballs ──
    for (const f of this.fireballs) {
      const air = f.air || 1500;
      const ph = (this.clock + (f.offset || 0)) % f.period;
      const flying = ph < air;
      const s = f.sprite;
      s.setVisible(flying);
      if (flying) {
        const p = ph / air;
        const y = f.y - f.h * 4 * p * (1 - p);
        s.setPosition(f.x, y).setFlipY(p > 0.5);
        if (!f.was) { sc.spark.explode(4, f.x, f.y); if (Math.abs(f.x - hero.x) < 500) sfx.fireball(); }
        if (Math.random() < 0.5) sc.trail.explode(1, f.x, y + (p > 0.5 ? -10 : 10));
        if (playing && overlap(hr, { x: f.x - 14, y: y - 14, w: 28, h: 28 })) this.burn(f.x);
      } else if (f.was) sc.spark.explode(3, f.x, f.y);
      f.was = flying;
    }

    // ── icicles ──
    for (const c of this.icicles) {
      const s = c.sprite;
      if (c.state === 'hang') {
        if (playing && Math.abs(hero.x - c.x) < 70 && hero.feet > c.y) { c.state = 'shake'; c.t = 520; sfx.creak(); }
      } else if (c.state === 'shake') {
        c.t -= d;
        s.x = c.x + Math.sin(time / 22) * 2.2;
        if (c.t <= 0) { c.state = 'fall'; c.vy = 0; s.x = c.x; c.floor = sc.groundBelow(c.x, c.y + 10) ?? sc.level.h; }
      } else if (c.state === 'fall') {
        c.vy += 2000 * dt * ts;
        s.y += c.vy * dt * ts;
        const tip = s.y + 46;
        if (playing && overlap(hr, { x: c.x - 9, y: s.y + 8, w: 18, h: 40 })) {
          if (hero.shielded) this.shatter(c, s.y + 30);
          else if (this.hurt(c.x, 'r_ouch_ice')) this.shatter(c, s.y + 30);
        }
        if (c.state === 'fall' && tip >= c.floor) this.shatter(c, c.floor);
      } else if (c.state === 'gone') {
        c.t -= d;
        if (c.t <= 0) {
          c.state = 'hang';
          s.setPosition(c.x, c.y - 2).setVisible(true).setAlpha(0).setScale(sc.k, 0.2 * sc.k);
          sc.tweens.add({ targets: s, alpha: 1, scaleY: sc.k, duration: 500 });
        }
      }
    }

    // ── snow cannons ──
    for (const c of this.cannons) {
      c.t += d;
      const plugged = c.plug && sc.plates[c.plug]?.pressed;
      c.sprite.setTint(plugged ? 0xbfd8ff : 0xffffff);
      if (c.t >= c.period) {
        c.t = 0;
        if (!plugged) this.fire(c);
        else if (Math.abs(c.x - hero.x) < 700) { sfx.bump(); sc.puff(c.x + c.dir * 30, c.y - 34, 3); }
      }
    }
    for (const b of this.snowballs) {
      if (b.dead) continue;
      b.x += b.vx * dt * ts;
      b.dist += Math.abs(b.vx * dt * ts);
      b.sprite.setPosition(b.x, b.y).setRotation(b.sprite.rotation + b.vx * dt * ts * 0.02);
      const box = { x: b.x - 14, y: b.y - 14, w: 28, h: 28 };
      if (playing && overlap(hr, box)) {
        if (!hero.shielded) { hero.shove(b.x, 1.15); sfx.snowHit(); sc.sayCooldown('r_snowball', 7000); } else sfx.shieldHit();
        this.pop(b);
      } else if (b.dist > b.range || sc.blockedRect(box.x + 6, box.y + 6, 16, 16)) this.pop(b);
    }
    this.snowballs = this.snowballs.filter((b) => !b.dead);

    // ── wind ──
    for (const w of this.winds) {
      let on = true;
      if (w.cycle) on = (this.clock + (w.offset || 0)) % (w.cycle[0] + w.cycle[1]) >= w.cycle[0];
      if (on !== w.on) { w.on = on; if (on && hero.x > w.x - 200 && hero.x < w.x + w.w + 200) sfx.wind(); }
      w.fx.emitting = on && ts > 0.5;
      w.calm.emitting = !w.fx.emitting;
    }

    // ── crushers ──
    for (const c of this.crushers) {
      const [waitMs, downMs] = c.cycle;
      const body = c.z.body;
      const bottom = c.floor - c.h;
      if (c.phase === 'up') {
        c.t += d;
        c.shake = c.t > waitMs - 450;
        if (c.t >= waitMs) { c.phase = 'drop'; c.vy = 0; }
      } else if (c.phase === 'drop') {
        c.vy += 3200 * dt * ts;
        c.y = Math.min(bottom, c.y + c.vy * dt * ts);
        if (playing && overlap(hr, { x: c.x + 2, y: c.y, w: c.w - 4, h: c.h + 4 })) {
          // never squash Astro: push them out to the nearer side
          const left = hero.x < c.x + c.w / 2;
          hero.place(left ? c.x - 18 : c.x + c.w + 18, hero.feet);
          this.hurt(c.x + c.w / 2, 'r_ouch_crush');
        }
        if (c.y >= bottom) {
          c.phase = 'down'; c.t = 0;
          if (Math.abs(c.x - hero.x) < 700) { sfx.thud(); sc.cameras.main.shake(90, 0.004); }
          sc.puff(c.x + 8, c.floor, 4); sc.puff(c.x + c.w - 8, c.floor, 4);
        }
      } else if (c.phase === 'down') {
        c.t += d;
        if (c.t >= downMs) c.phase = 'rise';
      } else if (c.phase === 'rise') {
        c.y = Math.max(c.top, c.y - (c.rise || 420) * dt * ts);
        if (c.y <= c.top) { c.phase = 'up'; c.t = 0; }
      }
      const jig = c.phase === 'up' && c.shake ? Math.sin(time / 25) * 1.6 : 0;
      body.reset(c.x + c.w / 2, c.y + c.h / 2);
      body.velocity.y = c.phase === 'rise' ? -(c.rise || 420) * ts : 0;
      c.sprite.setPosition(c.x - 4 + jig, c.y - 4);
      c.rod.setPosition(c.x + c.w / 2 + jig, 0).setDisplaySize(14, c.y + 6);
    }

    // ── bell timers (gates that close again) ──
    for (const id of Object.keys(this.timers)) {
      const before = this.timers[id];
      this.timers[id] = Math.max(0, before - d);
      if (this.timers[id] > 0 && Math.floor(before / 300) !== Math.floor(this.timers[id] / 300)) sfx.tick();
    }
    for (const b of this.bells) b.cool = Math.max(0, b.cool - delta);

    // ── star jars ──
    if (playing) {
      for (const j of this.jars) {
        if (j.open || !overlap(hr, { x: j.x - 26, y: j.y - 70, w: 52, h: 70 })) continue;
        j.open = true;
        sc.openJar(j);
      }
    }

    // ── the time bubble ──
    const on = sc.slowT > 0;
    this.bubbleTint.setVisible(on);
    this.bubbleFx.setVisible(on && hero.state !== 'hidden');
    if (on) {
      this.bubbleTint.setAlpha(sc.slowT < 700 && Math.floor(time / 110) % 2 ? 0.04 : 0.12);
      this.bubbleFx.setPosition(hero.x, hero.feet - 30).setRotation(time / 1400).setAlpha(sc.slowT < 700 ? 0.4 : 0.85);
    }
  }

  // Hazard time in the bubble runs slowly; the bell gates read it through sc.condition().
  timerOpen(id) { return (this.timers[id] || 0) > 0; }

  ring(b) {
    const bell = this.bells.find((x) => x.x === b.x && x.y === b.y);
    if (!bell || bell.cool > 0) return;
    bell.cool = 400;
    this.timers[b.timer] = b.ms;
    sfx.bell();
    this.s.tweens.add({ targets: bell.sprite, angle: { from: -18, to: 18 }, duration: 90, yoyo: true, repeat: 3, onComplete: () => bell.sprite.setAngle(0) });
    this.s.spark.explode(8, b.x, b.y + 20);
    this.s.sayCooldown(this.s.hasPower('bubble') ? 'r_bell' : 'r_bell_fast', 6000);
  }

  windAt(x, y) {
    let f = 0;
    for (const w of this.winds) {
      if (!w.on || x < w.x || x > w.x + w.w || y < w.y || y > w.y + w.h) continue;
      // a tall rock between Astro and the wind is a shelter
      const dir = Math.sign(w.force);
      const sheltered = this.s.ground.some((r) => r.y < y - 10 && r.y + r.h > y - 4
        && (dir < 0 ? r.x > x && r.x - x < 90 : r.x + r.w < x && x - (r.x + r.w) < 90));
      if (!sheltered) f += w.force;
    }
    return f * this.s.ts;
  }

  fire(c) {
    const sc = this.s;
    const x = c.x + c.dir * 40, y = c.y - 30;
    const sprite = sc.add.image(x, y, 'snowball').setScale(sc.k).setDepth(16);
    this.snowballs.push({ x, y, vx: c.dir * 330, dist: 0, range: c.range || 900, sprite, dead: false });
    sc.puff(x, y, 4);
    if (Math.abs(c.x - sc.hero.x) < 700) sfx.cannon();
  }

  pop(b) {
    b.dead = true;
    this.s.puff(b.x, b.y, 6);
    b.sprite.destroy();
  }

  shatter(c, y) {
    c.state = 'gone';
    c.t = 2600;
    c.sprite.setVisible(false);
    this.s.spark.explode(8, c.x, y);
    this.s.puff(c.x, y, 4);
    if (Math.abs(c.x - this.s.hero.x) < 600) sfx.shatter();
  }

  lavaTouch(p) {
    const sc = this.s, hero = sc.hero;
    sfx.sizzle();
    for (let i = 0; i < 3; i++) sc.spark.explode(3, hero.x + (i - 1) * 12, p.y);
    if (hero.shielded) {
      hero.bounce(MOVES.lavaBounceTiles);
      sc.sayCooldown('r_lava_bounce', 9000);
      return;
    }
    if (sc.opts.difficulty === 'easy') sc.startCatch('r_hot');
    else sc.hardFall('r_hot_hard');
  }

  burn(fromX) {
    const hero = this.s.hero;
    if (hero.shielded) {
      if (Math.random() < 0.3) this.s.spark.explode(1, hero.x, hero.feet - 30);
      return;
    }
    this.hurt(fromX, this.s.hasPower('shield') ? 'r_ouch_fire_shield' : 'r_ouch_fire');
  }

  hurt(fromX, line) {
    const sc = this.s, hero = sc.hero;
    if (!hero.hurt(fromX)) return false;
    sc.hooks.hearts(hero.hearts);
    sc.sayCooldown(line, 6000);
    if (hero.hearts <= 0) sc.outOfHearts();
    return true;
  }
}
