/* global Phaser */
// Astro: running and jumping (from the jump-feel prototype) plus parkour moves —
// wall slide and wall jump on vine walls, automatic ledge grab — the friends' powers
// (Nova's dash, Stitch's shield, Scout's time bubble), beetle stomps and getting hurt.

import { TILE, HERO_W, HERO_H, MOVES } from '../config.js';
import { input } from '../input.js';
import { tune } from '../tuning.js';
import { sfx } from '../sfx.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));

export class Hero {
  constructor(scene, x, feetY, face = 1) {
    this.s = scene;
    const k = scene.k;
    this.zone = scene.add.zone(x, feetY - HERO_H / 2, HERO_W, HERO_H);
    scene.physics.add.existing(this.zone);
    this.body.setCollideWorldBounds(true);
    this.shadow = scene.add.image(x, feetY, 'shadow').setScale(k).setDepth(14).setAlpha(0.5);
    this.sprite = scene.add.sprite(x, feetY, 'astro', 0).setOrigin(0.5, 70 / 72).setScale(k).setDepth(21);
    this.state = 'normal';            // normal | cutscene | climb | caught | respawn | hidden
    this.facing = face;
    this.onGround = true;
    this.wasOnGround = true;
    this.airVy = 0;
    this.coyote = 0;
    this.buffer = 0;
    this.jumpHeld = false;
    this.jumpLock = 0;
    this.dropUntil = 0;
    this.bonked = false;
    this.runPhase = 0;
    this.lastRunIdx = -1;
    this.sq = { x: 1, y: 1 };
    this.blinkAt = 2500;
    this.wall = { dir: 0, t: -99999 };
    this.wallLock = 0;
    this.dash = { t: 0, cd: 0, airUsed: false };
    this.shield = { t: 0, cd: 0 };
    this.bubbleCd = 0;
    this.shieldFx = scene.add.image(x, feetY, 'shieldFx').setScale(k).setDepth(22).setVisible(false).setBlendMode('ADD');
    this.invuln = 0;
    this.hearts = 3;
    this.lastSafe = { x, y: feetY };
    this.pos = { x, y: feetY };
  }

  get body() { return this.zone.body; }
  get x() { return this.state === 'normal' || this.state === 'cutscene' || this.state === 'respawn' ? this.body.center.x : this.pos.x; }
  get feet() { return this.state === 'normal' || this.state === 'cutscene' || this.state === 'respawn' ? this.body.bottom : this.pos.y; }
  get controllable() { return this.state === 'normal'; }
  get shielded() { return this.shield.t > 0; }

  // Called from the solid-terrain collider: remember vine-wall contact for wall jumps.
  touchWall(solid, now) {
    const b = this.body;
    if (!solid.grip || this.onGround) return;
    if (b.touching.left) this.wall = { dir: -1, t: now };
    else if (b.touching.right) this.wall = { dir: 1, t: now };
  }

  update(dt, delta, time) {
    const b = this.body;
    const T = tune;
    this.invuln = Math.max(0, this.invuln - delta);
    this.jumpLock = Math.max(0, this.jumpLock - delta);
    this.wallLock = Math.max(0, this.wallLock - delta);
    this.dash.cd = Math.max(0, this.dash.cd - delta);
    this.bubbleCd = Math.max(0, this.bubbleCd - delta);
    if (this.shield.t > 0) {
      this.shield.t -= delta;
      if (this.shield.t <= 0) { this.shield.cd = MOVES.shieldCooldownMs; sfx.shieldOff(); }
    } else this.shield.cd = Math.max(0, this.shield.cd - delta);
    const scripted = this.state === 'cutscene';
    const grounded = (b.blocked.down || b.touching.down) && this.jumpLock <= 0;
    this.onGround = grounded;
    if (grounded) {
      this.coyote = T.coyoteMs;
      this.dash.airUsed = false;
      if (!this.wasOnGround) this.landed();
    } else {
      this.coyote -= delta;
    }

    // Dash in progress: fly straight, no gravity, smash cracked walls.
    if (this.dash.t > 0) {
      this.dash.t -= delta;
      b.setAllowGravity(false);
      b.velocity.x = this.facing * MOVES.dashSpeed;
      b.velocity.y = 0;
      this.s.dashTrail(b.center.x, b.center.y);
      this.s.dashBreak(this);
      if (this.dash.t <= 0) {
        b.setAllowGravity(true);
        b.velocity.x = this.facing * T.runSpeed;
      }
      this.wasOnGround = grounded;
      return;
    }

    const press = scripted ? null : input;
    if (press?.jumpPressed) this.buffer = T.bufferMs; else this.buffer -= delta;

    if (press?.friendPressed) this.usePower(grounded);

    const now = time;
    const wallRecent = !grounded && now - this.wall.t < MOVES.wallGraceMs ? this.wall.dir : 0;
    const wallNow = !grounded && now - this.wall.t < 60 ? this.wall.dir : 0;
    this.cling = wallNow && b.velocity.y > 0 ? wallNow : 0;

    const dir = press ? (press.right ? 1 : 0) - (press.left ? 1 : 0) : 0;
    const wind = scripted ? 0 : this.s.windAt(b.center.x, b.center.y);
    if (this.wallLock <= 0) {
      if (dir) this.facing = dir;
      let rate = dir ? T.accel : T.decel;
      if (dir && b.velocity.x * dir < 0) rate = T.accel + T.decel;
      if (!grounded) rate *= T.airControl;
      else if (T.iceSlide > 0 && this.s.onIce(this)) {
        // Slippery: braking is soft enough that a full-speed stop slides iceSlide px,
        // getting going is slow, and turning round takes a while.
        const slip = (T.runSpeed * T.runSpeed) / (2 * T.iceSlide);
        rate = !dir ? slip : b.velocity.x * dir < 0 ? slip * 1.6 : Math.min(rate, slip * 2.2);
      }
      b.velocity.x = approach(b.velocity.x, dir * T.runSpeed + wind, rate * dt);
    }

    if (press?.down && press.jumpPressed && grounded && this.s.onOneWay(this)) {
      this.dropUntil = time + 280;
      this.buffer = 0;
      this.coyote = 0;
      this.jumpLock = 120;
    }

    const v0 = Math.sqrt(2 * T.gravity * T.jumpTiles * TILE);
    if (this.buffer > 0 && this.coyote > 0) {
      b.velocity.y = -v0;
      this.buffer = 0;
      this.coyote = 0;
      this.jumpLock = 90;
      this.jumpHeld = true;
      this.jumped();
    } else if (this.buffer > 0 && wallRecent) {
      // Holding toward a vine wall = climb hop straight up it; otherwise kick off to the other side.
      const climbing = dir === wallRecent;
      b.velocity.y = -v0 * (climbing ? MOVES.climbJumpFrac : MOVES.wallJumpFrac);
      b.velocity.x = -wallRecent * (climbing ? MOVES.climbKick : MOVES.wallKick);
      this.facing = climbing ? wallRecent : -wallRecent;
      this.wallLock = climbing ? MOVES.climbLockMs : MOVES.wallLockMs;
      this.wall.t = -99999;
      this.buffer = 0;
      this.jumpHeld = false; // a quick tap still gives a full wall jump
      this.sq.x = 0.8; this.sq.y = 1.18;
      this.s.puff(b.center.x + wallRecent * 14, b.center.y, 5);
      sfx.wallJump();
    }
    if (this.jumpHeld && !input.jumpHeld) {
      if (b.velocity.y < 0) b.velocity.y *= T.jumpCut;
      this.jumpHeld = false;
    }
    if (b.touching.up || b.blocked.up) this.bonked = true;
    if (grounded) this.bonked = false;

    let g = T.gravity;
    if (!grounded && !this.bonked && input.jumpHeld && Math.abs(b.velocity.y) < 110) g *= 1 - T.apexFloat;
    else if (b.velocity.y > 0) g *= T.fallMult;
    b.setGravityY(g);
    b.maxVelocity.y = this.cling ? MOVES.wallSlide : T.maxFall;
    if (this.cling && b.velocity.y > MOVES.wallSlide) b.velocity.y = MOVES.wallSlide;

    if (!grounded && !scripted && b.velocity.y > -260 && this.wallLock <= 0) this.tryLedge(dir);

    if (!grounded) this.airVy = Math.max(this.airVy, b.velocity.y);
    this.wasOnGround = grounded;
    if (grounded && this.s.standingSafe(this)) this.lastSafe = { x: b.center.x, y: b.bottom };
  }

  // X / ★: use the selected friend's power.
  usePower(grounded) {
    const p = this.s.currentPower();
    if (!p) { this.s.noPower(); return; }
    if (p === 'dash') this.tryDash(grounded);
    else if (p === 'shield') this.tryShield();
    else if (p === 'bubble') this.tryBubble();
  }

  tryShield() {
    if (this.shield.t > 0 || this.shield.cd > 0) return;
    this.shield.t = MOVES.shieldMs;
    this.sq.x = 1.15; this.sq.y = 0.9;
    sfx.shield();
    this.s.spark.explode(10, this.body.center.x, this.body.center.y);
  }

  tryBubble() {
    if (this.bubbleCd > 0 || this.s.slowT > 0) return;
    this.bubbleCd = MOVES.bubbleMs + MOVES.bubbleCooldownMs;
    this.s.startBubble();
  }

  tryDash(grounded) {
    if (this.dash.cd > 0 || (!grounded && this.dash.airUsed)) return;
    this.dash.t = MOVES.dashMs;
    this.dash.cd = MOVES.dashMs + MOVES.dashCooldownMs;
    if (!grounded) this.dash.airUsed = true;
    this.sq.x = 1.3; this.sq.y = 0.82;
    sfx.dash();
  }

  tryLedge(dir) {
    const b = this.body;
    const d = dir || Math.sign(b.velocity.x) || 0;
    if (!d) return;
    for (const r of this.s.grabRects) {
      const near = d > 0 ? Math.abs(b.right - r.x) <= 6 : Math.abs(b.left - (r.x + r.w)) <= 6;
      if (!near) continue;
      if (r.y < b.top - 8 || r.y > b.top + MOVES.ledgeReach) continue;
      const tx = d > 0 ? r.x + 18 : r.x + r.w - 18;
      if (this.s.blockedRect(tx - HERO_W / 2, r.y - HERO_H - 2, HERO_W, HERO_H)) continue;
      this.climb(tx, r.y, d);
      return;
    }
  }

  climb(tx, ty, d) {
    const b = this.body;
    this.state = 'climb';
    this.pos = { x: b.center.x, y: b.bottom };
    b.enable = false;
    this.facing = d;
    sfx.climb();
    this.s.tweens.chain({
      targets: this.pos,
      tweens: [
        { y: ty - 2, duration: 140, ease: 'Quad.easeOut' },
        { x: tx, duration: 110, ease: 'Sine.easeInOut' },
      ],
      onComplete: () => {
        b.enable = true;
        b.reset(tx, ty - HERO_H / 2 - 1);
        b.setVelocity(d * 60, 0);
        this.state = 'normal';
        this.wasOnGround = false;
        this.airVy = 0;
      },
    });
  }

  landed() {
    const p = clamp(this.airVy / 850, 0, 1);
    if (this.airVy > 120) {
      this.sq.x = 1.08 + 0.22 * p;
      this.sq.y = 0.92 - 0.24 * p;
      const b = this.body;
      this.s.puff(b.center.x, b.bottom, 3 + Math.round(p * 8));
      sfx.land(p);
      if (p > 0.85) this.s.cameras.main.shake(80, 0.003);
    }
    this.airVy = 0;
  }

  jumped() {
    this.sq.x = 0.78;
    this.sq.y = 1.2;
    const b = this.body;
    this.s.puff(b.center.x, b.bottom, 4);
    sfx.jump();
  }

  bounce(tiles) {
    const b = this.body;
    b.velocity.y = -Math.sqrt(2 * tune.gravity * tiles * TILE);
    this.jumpHeld = input.jumpHeld;
    this.bonked = false;
    this.dash.airUsed = false;
    this.jumpLock = 90;
    this.sq.x = 0.75; this.sq.y = 1.25;
  }

  // Knocked back without losing a heart (snowballs, Otto's shockwaves on a shield).
  shove(fromX, power = 1) {
    const b = this.body;
    const away = Math.sign(b.center.x - fromX) || -this.facing;
    b.setVelocity(away * 300 * power, -260 * power);
    this.wallLock = 240;
    this.dash.t = 0;
    b.setAllowGravity(true);
    this.sq.x = 1.2; this.sq.y = 0.85;
  }

  hurt(fromX) {
    if (this.invuln > 0 || this.state !== 'normal') return false;
    if (this.shielded) { this.shove(fromX, 0.7); sfx.shieldHit(); return false; }
    const b = this.body;
    this.hearts--;
    this.invuln = MOVES.hurtMs;
    const away = Math.sign(b.center.x - fromX) || -this.facing;
    b.setVelocity(away * 260, -340);
    this.wallLock = 260;
    this.dash.t = 0;
    b.setAllowGravity(true);
    sfx.hurt();
    this.s.cameras.main.shake(120, 0.004);
    return true;
  }

  hide(on) {
    this.state = on ? 'hidden' : 'normal';
    this.body.enable = !on;
    this.sprite.setVisible(!on);
    this.shadow.setVisible(!on);
  }

  // Teleport (respawns, level starts).
  place(x, feetY) {
    const b = this.body;
    b.enable = true;
    b.reset(x, feetY - HERO_H / 2 - 1);
    b.setAllowGravity(true);
    this.dash.t = 0;
    this.shield.t = 0;
    this.pos = { x, y: feetY };
    this.wasOnGround = false;
    this.airVy = 0;
  }

  sync(dt, time) {
    const s = this.sprite;
    const b = this.body;
    const k = this.s.k;
    let x, y;
    if (this.state === 'normal' || this.state === 'cutscene' || this.state === 'respawn') {
      x = b.center.x; y = b.bottom;
    } else {
      x = this.pos.x; y = this.pos.y;
      this.zone.setPosition(x, y - HERO_H / 2);
    }
    s.setPosition(x, y + 1);
    const a = Math.min(1, dt * 12);
    this.sq.x += (1 - this.sq.x) * a;
    this.sq.y += (1 - this.sq.y) * a;
    s.setScale(k * this.sq.x, k * this.sq.y);

    const vx = b.velocity.x, vy = b.velocity.y;
    let f;
    let face = this.facing;
    if (this.state === 'caught') f = this.s.robot.carrying ? 8 : 7;
    else if (this.state === 'climb') f = 13;
    else if (this.dash.t > 0) f = 12;
    else if (this.invuln > MOVES.hurtMs - 320) f = 14;
    else if (this.cling) { f = 11; face = this.cling; }
    else if (!this.onGround) f = vy < -60 ? 6 : 7;
    else if (Math.abs(vx) > 30) {
      this.runPhase += (Math.abs(vx) * dt) / 16;
      const idx = Math.floor(this.runPhase) % 4;
      f = 2 + idx;
      if (idx !== this.lastRunIdx && (idx === 0 || idx === 2)) {
        sfx.step();
        if (Math.abs(vx) > tune.runSpeed * 0.7) this.s.puff(x - this.facing * 6, y, 1);
      }
      this.lastRunIdx = idx;
    } else {
      f = Math.floor(time / 700) % 2;
      if (time > this.blinkAt) {
        f = 9;
        if (time > this.blinkAt + 130) this.blinkAt = time + 2200 + Math.random() * 2500;
      }
    }
    if (this.s.cheer) f = 10;
    s.setFrame(f);
    s.setFlipX(face < 0);
    const lean = clamp(vx / tune.runSpeed, -1, 1);
    s.rotation = this.state === 'normal' && this.dash.t <= 0 ? lean * (this.onGround ? 0.06 : 0.1) : 0;
    s.setAlpha(this.invuln > 0 && this.state === 'normal' ? (Math.floor(time / 80) % 2 ? 0.45 : 1) : 1);
    this.s.placeShadow(this.shadow, x, y, this.state === 'hidden' ? null : this.s.groundBelow(x, y - 2), 0.5);
    const fx = this.shieldFx;
    const on = this.shield.t > 0 && this.state !== 'hidden';
    fx.setVisible(on);
    if (on) {
      const blink = this.shield.t < 600 && Math.floor(time / 90) % 2;
      fx.setPosition(x, y - 30).setAlpha(blink ? 0.25 : 0.8 + 0.15 * Math.sin(time / 90));
      fx.setScale(k * (1 + 0.04 * Math.sin(time / 120)));
    }
  }
}
