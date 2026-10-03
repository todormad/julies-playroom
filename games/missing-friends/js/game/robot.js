/* global Phaser */
// The Robot partner. Solo: follows Astro and, on C, flies to make a step or to hold
// a button for a shared puzzle; catches falls on Easy. Co-op: a second player flies
// it (mouse / finger / W A S D) and clicks to turn it into a step.

import { PLATE_OFFSET, HANG, ROBOT_BOTTOM } from '../config.js';
import { input } from '../input.js';
import { sfx } from '../sfx.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Robot {
  constructor(scene, x, y) {
    this.s = scene;
    const k = scene.k;
    this.x = x;
    this.y = y;
    this.mode = 'follow';  // follow | goto | platform | hold | rescue | coop | coopPlatform | script
    this.tx = x; this.ty = y;
    this.after = 'platform';
    this.spot = null;
    this.vx = 0;
    this.face = 1;
    this.carrying = false;
    this.blinkAt = 3200;
    this.stepSays = 0;
    this.p2Target = null;
    this.p2Toggle = false;
    this.fly = scene.add.zone(x, y, 56, 60);
    scene.physics.add.existing(this.fly);
    this.fly.body.setAllowGravity(false);
    this.fly.body.setCollideWorldBounds(true);
    this.plate = scene.add.zone(-500, -500, 88, 10);
    scene.physics.add.existing(this.plate);
    const pb = this.plate.body;
    pb.setAllowGravity(false);
    pb.setImmovable(true);
    pb.checkCollision.down = false;
    pb.checkCollision.left = false;
    pb.checkCollision.right = false;
    this.plateActive = false;
    this.shadow = scene.add.image(0, 0, 'shadow').setScale(k).setDepth(14).setAlpha(0.3);
    this.sprite = scene.add.sprite(x, y, 'robot', 0).setScale(k).setDepth(19);
    this.thruster = scene.add.particles(0, 0, 'flame', {
      lifespan: 280, speedY: { min: 70, max: 130 }, speedX: { min: -14, max: 14 },
      scale: { start: 0.55 * k, end: 0 }, alpha: { start: 0.95, end: 0 },
      tint: [0xfff3a0, 0xffc15a, 0xff8a5c], blendMode: 'ADD', frequency: 34,
    }).setDepth(18);
    this.thruster.startFollow(this.sprite, 0, ROBOT_BOTTOM);
    this.colliders = [];
  }

  bindPointer() {
    const sc = this.s;
    sc.input.on('pointermove', (p) => {
      if (!input.coop) return;
      if (p.wasTouch && !p.isDown) return;
      if (this.mode === 'coopHold') {
        // a mouse just passing by doesn't pull the Robot off its button; a finger drag does
        if (p.wasTouch && this.p2Down && Math.hypot(p.x - this.p2Down.x, p.y - this.p2Down.y) > 20 * sc.R) {
          this.p2Dragged = true;
          this.p2Target = { x: p.worldX, y: p.worldY };
        }
        return;
      }
      this.p2Target = { x: p.worldX, y: p.worldY };
    });
    sc.input.on('pointerdown', (p) => {
      if (!input.coop) return;
      this.p2Down = { x: p.x, y: p.y, t: sc.time.now };
      if (this.mode === 'coop') this.p2Target = { x: p.worldX, y: p.worldY };
    });
    sc.input.on('pointerup', (p) => {
      if (!input.coop || !this.p2Down) return;
      const moved = Math.hypot(p.x - this.p2Down.x, p.y - this.p2Down.y);
      const quick = sc.time.now - this.p2Down.t < 320;
      this.p2Down = null;
      if (moved < 16 * sc.R && quick) this.p2Toggle = true;
    });
  }

  get flying() { return !['platform', 'coopPlatform', 'hold', 'coopHold'].includes(this.mode); }

  // A box around the Robot's body, for pressing buttons and bumping beetles.
  rect() { return { x: this.x - 26, y: this.y - 32, w: 52, h: 32 + ROBOT_BOTTOM }; }

  update(dt) {
    const hero = this.s.hero;
    const prevX = this.x;
    const solo = !input.coop;
    switch (this.mode) {
      case 'follow': {
        const view = this.s.cameras.main.worldView;
        const tx = clamp(hero.x - hero.facing * 58, view.x + 44, view.right - 44);
        const ty = hero.feet - 92;
        const a = 1 - Math.exp(-dt * 5);
        this.x += (tx - this.x) * a;
        this.y += (ty - this.y) * a;
        if (input.robotPressed && solo && hero.controllable) this.help();
        break;
      }
      case 'goto': {
        const dx = this.tx - this.x, dy = this.ty - this.y, d = Math.hypot(dx, dy);
        const step = Math.min(950, 220 + d * 6) * dt;
        if (d <= step) {
          this.x = this.tx; this.y = this.ty;
          this.setMode(this.after);
        } else {
          this.x += (dx / d) * step;
          this.y += (dy / d) * step;
        }
        // C again cancels a step, but never a trip to hold a button
        if (input.robotPressed && solo) {
          if (this.after === 'hold') this.s.sayCooldown('r_hold', 2500);
          else this.setMode('follow');
        }
        break;
      }
      case 'platform':
        if (input.robotPressed && solo) {
          const next = this.s.helpTarget();
          if (next.kind === 'step' && Math.hypot(next.x - this.x, next.y - this.y) < 40) {
            sfx.robotOff();
            this.setMode('follow');
          } else this.help();
        } else if (Math.abs(hero.x - this.x) > 380 && hero.onGround) {
          sfx.robotOff();
          this.setMode('follow');
        }
        break;
      case 'hold':
        // Stay on the button until Astro is through (or has wandered far away).
        if (this.s.holdDone(this.spot)) {
          sfx.robotOff();
          this.setMode('follow');
        } else if (input.robotPressed && solo) {
          this.s.sayCooldown('r_hold', 2500);
        }
        break;
      case 'coop': {
        const body = this.fly.body;
        this.x = body.center.x;
        this.y = body.center.y;
        const k = input.p2;
        let vx = 0, vy = 0;
        if (k.left || k.right || k.up || k.down) {
          vx = ((k.right ? 1 : 0) - (k.left ? 1 : 0)) * 380;
          vy = ((k.down ? 1 : 0) - (k.up ? 1 : 0)) * 380;
          this.p2Target = null;
        } else if (this.p2Target) {
          vx = (this.p2Target.x - this.x) * 7;
          vy = (this.p2Target.y - this.y) * 7;
          const m = Math.hypot(vx, vy);
          if (m > 600) { vx *= 600 / m; vy *= 600 / m; }
        }
        body.setVelocity(vx, vy);
        // Flying onto a button snaps the Robot onto it, and it stays there.
        const plate = this.s.plateAt(this.rect());
        if (!plate) this.releasedFrom = null;
        if (plate && plate !== this.releasedFrom) {
          this.holdPlate = plate;
          this.x = plate.x;
          this.y = plate.y - 33;
          this.p2Target = null;
          this.setMode('coopHold');
        } else if (this.p2Toggle || k.toggle) {
          body.setVelocity(0, 0);
          this.s.stats.steps++;
          this.setMode('coopPlatform');
        }
        break;
      }
      case 'coopHold': {
        const k = input.p2;
        if (this.p2Toggle || k.toggle || k.left || k.right || k.up || k.down || this.p2Dragged) {
          this.releasedFrom = this.holdPlate;
          this.p2Dragged = false;
          sfx.robotOff();
          this.setMode('coop');
        }
        break;
      }
      case 'coopPlatform':
        if (this.p2Toggle || input.p2.toggle) {
          sfx.robotOff();
          this.setMode('coop');
        }
        break;
      default:
        break;
    }
    if (this.mode !== 'coop') this.fly.body.reset(this.x, this.y);
    this.vx = (this.x - prevX) / Math.max(dt, 0.001);
    if (Math.abs(this.vx) > 20) this.face = Math.sign(this.vx);
    else if (this.mode === 'follow') this.face = hero.facing;
    this.p2Toggle = false;
  }

  // C pressed: go where the level says help is needed, or make a step ahead.
  help() {
    const t = this.s.helpTarget();
    this.spot = t.spot || null;
    this.tx = t.x;
    this.ty = t.y;
    this.after = t.kind === 'hold' ? 'hold' : 'platform';
    this.setMode('goto');
    this.s.stats.steps++;
    sfx.robotGo();
  }

  setMode(mode) {
    this.mode = mode;
    const plate = mode === 'platform' || mode === 'coopPlatform';
    this.plateActive = plate;
    if (plate) {
      this.plate.body.reset(this.x, this.y - PLATE_OFFSET + 5);
      sfx.robotStep();
      this.s.puff(this.x, this.y - PLATE_OFFSET, 6);
      if (this.stepSays < 2) { this.stepSays++; this.s.say('r_step'); }
    } else {
      this.plate.body.reset(-500, -500);
    }
    if (mode === 'hold' || mode === 'coopHold') {
      sfx.robotStep();
      this.s.sayCooldown('r_hold', 4000);
    }
    const flying = mode === 'coop';
    for (const c of this.colliders) c.active = flying;
    if (!flying) this.fly.body.setVelocity(0, 0);
  }

  // Swoop down, grab Astro, carry them back to safe ground.
  rescue(hero, safe, done) {
    this.setMode('rescue');
    sfx.whoosh();
    this.s.tweens.add({
      targets: this, x: hero.pos.x, y: hero.pos.y + 20 - HANG, duration: 280, ease: 'Quad.easeIn',
      onUpdate: () => { hero.pos.y += 0.8; },
      onComplete: () => {
        this.carrying = true;
        this.s.puff(this.x, this.y + 30, 6);
        this.s.tweens.add({
          targets: this, x: safe.x, y: safe.y - 80 - HANG, duration: 950, ease: 'Sine.easeInOut',
          onComplete: () => { this.carrying = false; done(); },
        });
      },
    });
  }

  resume() {
    this.setMode(input.coop ? 'coop' : 'follow');
  }

  sync(time) {
    const s = this.sprite;
    const flying = this.flying;
    const bob = flying ? Math.sin(time / 260) * 3 : 0;
    s.setPosition(this.x, this.y + bob);
    s.setFlipX(this.face < 0);
    s.rotation = flying ? clamp(this.vx / 1500, -0.22, 0.22) : 0;
    let f = 0;
    if (this.mode === 'platform' || this.mode === 'coopPlatform') f = 2;
    else if (this.mode === 'hold' || this.mode === 'coopHold') f = 4;
    else if (this.carrying || (this.mode === 'rescue' && this.s.hero.state === 'caught')) f = 3;
    else if (time > this.blinkAt) {
      f = 1;
      if (time > this.blinkAt + 140) this.blinkAt = time + 2600 + Math.random() * 2600;
    }
    s.setFrame(f);
    this.thruster.setFrequency(flying ? (Math.abs(this.vx) > 200 ? 16 : 34) : 70);
    this.s.placeShadow(this.shadow, this.x, this.y + ROBOT_BOTTOM, s.visible ? this.s.groundBelow(this.x, this.y + ROBOT_BOTTOM) : null, 0.3);
  }
}
