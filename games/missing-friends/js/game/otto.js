// Big Otto at the top of his tower. He stands behind the arena (you never fight him):
// he stomps, sending shockwaves along the floor to jump over, and throws star balls at
// a marked spot. Each opened star jar makes him crosser; after the third he gives up.
// In two-player mode the Robot pilot can swat the star balls away.

import { sfx } from '../sfx.js';

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export const OTTO_FRAMES = ['grump', 'stomp', 'throw', 'happy', 'sad'];

export class Otto {
  constructor(sc, cfg) {
    this.s = sc;
    this.cfg = cfg;
    this.x = cfg.x;
    this.floor = cfg.y;
    this.state = 'idle';     // idle (before the fight) | walk | stomp | throw | calm
    this.t = 0;
    this.next = 2600;
    this.anger = 0;          // jars opened so far
    this.attacks = 0;
    this.face = -1;
    const k = sc.k;
    this.sprite = sc.add.sprite(this.x, this.floor + 6, 'otto', 0).setOrigin(0.5, 1).setScale(k).setDepth(3.5);
    this.glow = sc.add.image(this.x, this.floor - 150, 'dot').setScale(k * 9).setTint(0xff5a6e).setBlendMode('ADD').setAlpha(0.18).setDepth(3.4);
    this.waves = [];
    this.balls = [];
    this.marks = [];
  }

  start() { if (this.state === 'idle') { this.state = 'walk'; this.next = 1800; } }

  calm() {
    this.state = 'calm';
    this.sprite.setFrame(4);
    for (const w of this.waves) w.sprite.destroy();
    for (const b of this.balls) b.sprite.destroy();
    for (const m of this.marks) m.destroy();
    this.waves = []; this.balls = []; this.marks = [];
    this.glow.setTint(0x7ad8ff);
  }

  setMood(frame) { this.sprite.setFrame(frame); this.glow.setTint(frame === 3 ? 0xffd54f : frame === 4 ? 0x7ad8ff : 0xff5a6e); }

  update(dt, delta, time) {
    const sc = this.s;
    const ts = sc.ts;
    const d = delta * ts;
    const hero = sc.hero;
    const bob = Math.sin(time / 420) * 2;
    this.updateShots(dt, ts);
    if (this.state === 'idle' || this.state === 'calm') {
      this.sprite.setPosition(this.x, this.floor + 6 + bob);
      this.glow.setPosition(this.x, this.floor - 150 + bob);
      return;
    }
    this.t += d;
    if (this.state === 'walk') {
      const tx = Math.max(this.cfg.min, Math.min(this.cfg.max, hero.x));
      const dx = tx - this.x;
      if (Math.abs(dx) > 8) { this.x += Math.sign(dx) * 55 * dt * ts; this.face = Math.sign(dx); }
      this.sprite.setFrame(0);
      if (this.t >= this.next) {
        this.t = 0;
        this.attacks++;
        // he only starts throwing once a jar is open, and throws more as he gets crosser
        const throwIt = this.anger > 0 && (this.anger >= 2 ? this.attacks % 2 === 0 : this.attacks % 3 === 0);
        this.state = throwIt ? 'throw' : 'stomp';
        this.aim = Math.max(80, Math.min(sc.level.w - 80, hero.x));
        if (throwIt) this.mark(this.aim);
      }
    } else if (this.state === 'stomp') {
      this.sprite.setFrame(1);
      if (this.t >= 650) {
        this.slam();
        this.state = 'walk'; this.t = 0;
        this.next = Math.max(1700, 3000 - this.anger * 450);
      }
    } else if (this.state === 'throw') {
      this.sprite.setFrame(2);
      if (this.t >= 750) {
        this.throwBall(this.aim);
        this.state = 'walk'; this.t = 0;
        this.next = Math.max(1600, 2700 - this.anger * 400);
      }
    }
    const shake = (this.state === 'stomp' && this.t > 350) ? Math.sin(time / 20) * 2 : 0;
    this.sprite.setPosition(this.x + shake, this.floor + 6 + (this.state === 'walk' ? Math.abs(Math.sin(time / 180)) * -5 : bob)).setFlipX(this.face > 0);
    this.glow.setPosition(this.x, this.floor - 150 + bob);
  }

  slam() {
    const sc = this.s;
    sfx.thud();
    sfx.stompBig();
    sc.cameras.main.shake(220, 0.007);
    sc.puff(this.x - 60, this.floor, 10);
    sc.puff(this.x + 60, this.floor, 10);
    for (const dir of [-1, 1]) {
      const sprite = sc.add.image(this.x + dir * 70, this.floor + 2, 'wave').setOrigin(0.5, 1).setScale(sc.k).setDepth(20).setFlipX(dir < 0);
      this.waves.push({ x: this.x + dir * 70, dir, sprite, speed: 300 + this.anger * 40 });
    }
  }

  mark(x) {
    const sc = this.s;
    const m = sc.add.image(x, this.floor + 2, 'target').setOrigin(0.5, 1).setScale(sc.k).setDepth(13).setAlpha(0);
    sc.tweens.add({ targets: m, alpha: 1, duration: 200 });
    sc.tweens.add({ targets: m, scaleX: sc.k * 1.2, scaleY: sc.k * 1.2, duration: 300, yoyo: true, repeat: -1 });
    this.marks.push(m);
  }

  throwBall(tx) {
    const sc = this.s;
    const x0 = this.x + this.face * 70, y0 = this.floor - 260;
    const T = 1.15;
    const g = 900;
    const vx = (tx - x0) / T;
    const vy = (this.floor - 20 - y0 - 0.5 * g * T * T) / T;
    const sprite = sc.add.image(x0, y0, 'starBall').setScale(sc.k).setDepth(19);
    this.balls.push({ x: x0, y: y0, vx, vy, g, sprite, tx });
    sfx.throwBall();
  }

  updateShots(dt, ts) {
    const sc = this.s, hero = sc.hero, hb = hero.body;
    const playing = hero.state === 'normal';
    const hr = { x: hb.left, y: hb.top, w: hb.width, h: hb.height };
    for (const w of this.waves) {
      w.x += w.dir * w.speed * dt * ts;
      w.sprite.setPosition(w.x, this.floor + 2);
      if (playing && hero.onGround && hb.bottom > this.floor - 4 && Math.abs(hero.x - w.x) < 22) this.hit(w.x);
      if (w.x < 40 || w.x > sc.level.w - 40 || sc.blockedRect(w.x - 4 + w.dir * 16, this.floor - 30, 8, 20)) w.dead = true;
    }
    for (const b of this.balls) {
      b.vy += b.g * dt * ts;
      b.x += b.vx * dt * ts;
      b.y += b.vy * dt * ts;
      b.sprite.setPosition(b.x, b.y).setRotation(b.sprite.rotation + dt * ts * 6);
      const box = { x: b.x - 18, y: b.y - 18, w: 36, h: 36 };
      const r = sc.robot;
      if (r.mode === 'coop' && overlap(r.rect(), box)) { b.dead = true; sfx.bump(); sc.spark.explode(10, b.x, b.y); sc.sayCooldown('r_swat', 8000); continue; }
      if (playing && overlap(hr, box)) { b.dead = true; this.hit(b.x); sc.spark.explode(10, b.x, b.y); continue; }
      if (b.y >= this.floor - 16) { b.dead = true; sc.spark.explode(12, b.x, this.floor - 10); sc.puff(b.x, this.floor, 6); sfx.land(0.6); }
    }
    for (const b of this.balls) if (b.dead) {
      b.sprite.destroy();
      const m = this.marks.shift();
      m?.destroy();
    }
    for (const w of this.waves) if (w.dead) w.sprite.destroy();
    this.waves = this.waves.filter((w) => !w.dead);
    this.balls = this.balls.filter((b) => !b.dead);
  }

  hit(fromX) {
    const sc = this.s;
    if (sc.hero.shielded) { sc.hero.shove(fromX, 0.6); sfx.shieldHit(); return; }
    if (sc.hz.hurt(fromX, 'r_ouch_otto') && this.anger === 0) sc.sayCooldown('r_jump_waves', 9000);
  }
}
