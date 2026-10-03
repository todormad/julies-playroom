// Story moments, written top-to-bottom as little scripts.

import { POWERS } from '../config.js';
import { save, writeSave, rescuedCount } from '../save.js';
import { sfx } from '../sfx.js';

export function onEnter(sc) {
  const L = sc.level;
  if (L.id === 'intro') {
    const landed = sc.entry !== 'start';
    const ship = sc.add.image(170, landed ? 602 : -40, 'ship').setOrigin(0.5, 1).setScale(sc.k).setDepth(13);
    if (!landed) introLanding(sc, ship);
    return;
  }
  if ((L.id === 'lava1' || L.id === 'ice1') && sc.entry === 'fromHome') {
    planetLanding(sc, L.id === 'lava1' ? 'rocketLava' : 'rocketIce');
    return;
  }
  if (L.id === 'home' && sc.entry === 'party' && save.finished && !save.seen.ending) { partyEnding(sc); return; }
  if (L.id === 'tower2') { towerTop(sc); return; }
  if (L.onEnter) sc.sayOnce(L.onEnter, `${L.id}:enter`);
}

function flameUnder(sc, target, dy = -6) {
  const k = sc.k;
  const flame = sc.add.particles(0, 0, 'flame', {
    lifespan: 420, speedY: { min: 160, max: 280 }, speedX: { min: -30, max: 30 },
    scale: { start: 1.2 * k, end: 0.2 * k }, alpha: { start: 1, end: 0 },
    tint: [0xfff3a0, 0xffc15a, 0xff8a5c], blendMode: 'ADD', frequency: 14, quantity: 2,
  }).setDepth(12);
  flame.startFollow(target, 0, dy);
  return flame;
}

async function introLanding(sc, ship) {
  const flame = flameUnder(sc, ship, -8);
  await sc.cutscene(async () => {
    sc.hero.hide(true);
    sc.robot.mode = 'script';
    sc.robot.sprite.setVisible(false);
    sc.robot.thruster.stop();
    await sc.tweenP({ targets: ship, y: 602, duration: 2300, ease: 'Cubic.easeOut' });
    flame.stop();
    sfx.land2();
    sc.cameras.main.shake(220, 0.004);
    sc.puff(150, 600, 10);
    sc.puff(190, 600, 10);
    await sc.wait(450);
    hopOut(sc, 196, 548);
    await sc.wait(250);
    robotOut(sc, 170, 520);
    await sc.wait(700);
    sc.cheer = true;
    await sc.say('i_land', { wait: true });
    sc.cheer = false;
    await sc.say('i_race', { wait: true });
  });
}

function hopOut(sc, x, feet) {
  sc.hero.hide(false);
  sc.hero.state = 'cutscene';
  sc.hero.place(x, feet);
  sc.hero.body.setVelocity(150, -400);
  sc.hero.wallLock = 600; // keep the hop going instead of braking
  sc.hero.facing = 1;
}

function robotOut(sc, x, y) {
  sc.robot.x = x;
  sc.robot.y = y;
  sc.robot.sprite.setVisible(true);
  sc.robot.thruster.start();
  sc.robot.resume();
}

// Arriving on the Lava or Ice Planet: the rocket comes down, Astro and the Robot hop out.
async function planetLanding(sc, decorKey) {
  const rocket = sc.decor[decorKey];
  if (!rocket) return;
  const y = rocket.y;
  rocket.y = y - 620;
  const flame = flameUnder(sc, rocket, -8);
  await sc.cutscene(async () => {
    sc.hero.hide(true);
    sc.robot.mode = 'script';
    sc.robot.sprite.setVisible(false);
    sc.robot.thruster.stop();
    await sc.tweenP({ targets: rocket, y, duration: 1700, ease: 'Cubic.easeOut' });
    flame.stop();
    sfx.land2();
    sc.cameras.main.shake(200, 0.004);
    sc.puff(rocket.x - 20, y, 10);
    sc.puff(rocket.x + 20, y, 10);
    await sc.wait(350);
    hopOut(sc, rocket.x + 50, y - 50);
    await sc.wait(250);
    robotOut(sc, rocket.x + 20, y - 90);
    await sc.wait(600);
    const L = sc.level;
    if (L.onEnter && !save.seen[`tip:${L.id}:enter`]) {
      save.seen[`tip:${L.id}:enter`] = true;
      writeSave();
      await sc.say(L.onEnter, { wait: true });
    }
  });
}

// Taking off from a village pad to another planet.
export async function launch(sc, pad) {
  sc.traveling = true;
  await sc.cutscene(async () => {
    sc.say(pad.line);
    sc.hero.hide(true);
    sc.robot.mode = 'script';
    sc.robot.sprite.setVisible(false);
    sc.robot.thruster.stop();
    sc.puff(pad.x, pad.y, 8);
    await sc.wait(500);
    const flame = flameUnder(sc, pad.rocket, -8);
    sfx.rocket();
    sc.cameras.main.shake(900, 0.003);
    sc.pan(pad.x, pad.y - 250, 1400);
    await sc.tweenP({ targets: pad.rocket, y: pad.rocket.y - 700, duration: 1500, ease: 'Cubic.easeIn' });
    flame.stop();
  });
  sc.rigHeld = true; // keep the camera where the rocket left while the screen fades
  const cam = sc.cameras.main;
  cam.fadeOut(320, 10, 8, 30);
  cam.once('camerafadeoutcomplete', () => sc.hooks.travel(pad.to, pad.entry));
}

export function onTrigger(sc, id) {
  switch (id) {
    case 'arrival':
      if (!save.seen.arrival) homeArrival(sc);
      break;
    case 'tower':
      if (rescuedCount() === 3 && !save.seen.towerOpen) towerOpens(sc);
      else if (rescuedCount() < 3) sc.say('h_tower');
      break;
    case 'crackHint':
      if (!save.rescued.nova) sc.say('h_crack');
      break;
    case 'woodsHint':
      sc.sayOnce('h_woods');
      break;
    case 'novaParty':
      if (!save.finished) sc.say('h_nova_back');
      break;
    case 'stitchParty':
      if (!save.finished) sc.say('h_stitch_back');
      break;
    case 'scoutParty':
      if (!save.finished) sc.say('h_scout_back');
      break;
    case 'ottoParty':
      sc.say('e_otto');
      break;
    case 'cage': {
      const friend = sc.level.cage?.friend;
      if (friend && !save.rescued[friend]) cageIntro(sc);
      break;
    }
    case 'crack':
      if (sc.cracked.some((c) => !c.broken)) sc.say('w2_crack');
      break;
    case 'fire':
      sc.say('l2_fire');
      break;
    case 'gate':
      sc.say('f2_gate');
      break;
    default:
      break;
  }
}

async function homeArrival(sc) {
  await sc.cutscene(async () => {
    await sc.wait(250);
    sc.cheer = true;
    await sc.say('h_arrive1', { wait: true });
    sc.cheer = false;
    await sc.say('h_arrive2', { wait: true });
    await sc.say('h_arrive3', { wait: true });
    await sc.pan(1580, 520, 900);
    await sc.say('h_clue1', { wait: true });
    await sc.say('h_clue2', { wait: true });
    await sc.pan(2520, 470, 1100);
    await sc.say('h_clue3', { wait: true });
    await sc.pan(3330, 470, 1000);
    await sc.say('h_clue4', { wait: true });
    await sc.panHome(900);
    save.seen.arrival = true;
    writeSave();
  });
}

async function towerOpens(sc) {
  const tw = sc.decor.tower;
  await sc.cutscene(async () => {
    await sc.pan(tw.x, tw.y - 160, 700);
    sfx.gate();
    for (const [dx, dy] of [[-15, -86], [15, -86], [0, -58]]) sc.spark.explode(10, tw.x + dx, tw.y + dy);
    await sc.wait(500);
    sc.cameras.main.shake(300, 0.004);
    await sc.tweenP({ targets: sc.towerDoor, alpha: 1, duration: 600 });
    save.seen.towerOpen = true;
    writeSave();
    sc.cheer = true;
    await sc.say('h_tower_open', { wait: true });
    sc.cheer = false;
    await sc.panHome(600);
  });
}

async function cageIntro(sc) {
  const c = sc.level.cage;
  await sc.cutscene(async () => {
    await sc.pan(c.x - 160, c.y - 110, 700);
    await sc.say(`${c.prefix}_cage1`, { who: c.friend, wait: true });
    await sc.say(`${c.prefix}_cage2`, { who: c.friend, args: [sc.word.join('')], wait: true });
    await sc.panHome(600);
  });
}

export async function onWordSolved(sc) {
  const c = sc.level.cage;
  const who = c.friend;
  await sc.cutscene(async () => {
    await sc.wait(300);
    await sc.pan(c.x - 80, c.y - 110, 600);
    sfx.rescue();
    sc.cameras.main.shake(200, 0.004);
    for (let i = 0; i < 6; i++) sc.spark.explode(5, c.x - 40 + i * 16, c.y - 60 + (i % 2) * 30);
    sc.tweens.add({ targets: sc.cage, alpha: 0, scaleX: sc.k * 1.25, scaleY: sc.k * 1.25, duration: 380 });
    sc.tweens.killTweensOf(sc.caged);
    sc.caged.setFrame(1);
    await sc.tweenP({ targets: sc.caged, y: c.y - 60, duration: 260, ease: 'Quad.easeOut', yoyo: true });
    save.rescued[who] = true;
    writeSave();
    sc.selectPower(POWERS[who], true);
    sc.hooks.friends();
    sc.hooks.toast(`toast_${who}`, rescuedCount());
    sc.cheer = true;
    await sc.say(`${c.prefix}_free1`, { who, wait: true });
    await sc.say(`${c.prefix}_free2`, { who, wait: true });
    sc.cheer = false;
    await sc.say(`${c.prefix}_free3`, { who, wait: true });
    sc.spark.explode(16, sc.caged.x, sc.caged.y - 30);
    sfx.dash();
    await sc.tweenP({ targets: sc.caged, y: sc.caged.y - 460, alpha: 0, duration: 1200, ease: 'Cubic.easeIn' });
    await sc.panHome(600);
  });
}

// ── Otto ────────────────────────────────────────────────────────────────────

async function towerTop(sc) {
  const otto = sc.otto;
  if (save.finished) {
    // a visit after the party: everything is calm
    otto.calm();
    otto.setMood(3);
    for (const j of sc.hz.jars) { j.open = true; j.sprite.setTexture('jar1'); j.glow.setAlpha(0); }
    for (const c of sc.cracked) { c.broken = true; c.z.body.enable = false; c.img.setVisible(false); }
    return;
  }
  await sc.cutscene(async () => {
    await sc.wait(300);
    await sc.pan(otto.x, 360, 900);
    sc.cameras.main.shake(300, 0.005);
    sfx.thud();
    await sc.say('t2_otto1', { who: 'otto', wait: true });
    await sc.panHome(700);
    await sc.say('t2_robot1', { wait: true });
  });
  otto.start();
}

export async function onJar(sc, j) {
  const otto = sc.otto;
  const opened = sc.hz.jars.filter((x) => x.open).length;
  sfx.star();
  if (!otto) return;
  otto.anger = opened;
  if (opened < 3) {
    sc.say(opened === 1 ? 't2_otto_jar1' : 't2_otto_jar2', { who: 'otto' });
    return;
  }
  otto.calm();
  await sc.wait(600);
  await finale(sc);
}

async function finale(sc) {
  const otto = sc.otto;
  const hero = sc.hero;
  // let Astro land before the scene starts
  for (let i = 0; i < 40 && !hero.onGround; i++) await sc.wait(50);
  await sc.cutscene(async () => {
    sfx.sad();
    await sc.pan(otto.x, 380, 900);
    await sc.say('t2_otto_sad1', { who: 'otto_sad', wait: true });
    await sc.say('t2_otto_sad2', { who: 'otto_sad', wait: true });
    await sc.say('t2_robot2', { wait: true });
    // the friends arrive
    const xs = [otto.x - 210, otto.x - 130, otto.x + 140];
    const friends = ['nova', 'stitch', 'scout'].map((f, i) => {
      const s = sc.add.sprite(xs[i], 601, `friend_${f}`, 1).setOrigin(0.5, 70 / 72).setScale(sc.k).setDepth(17).setAlpha(0);
      sc.spark.explode(12, xs[i], 560);
      sc.tweens.add({ targets: s, alpha: 1, duration: 400 });
      return s;
    });
    sfx.gate();
    await sc.wait(500);
    await sc.say('t2_nova', { who: 'nova', wait: true });
    await sc.say('t2_stitch', { who: 'stitch', wait: true });
    await sc.say('t2_scout', { who: 'scout', wait: true });
    otto.setMood(3);
    sfx.party();
    for (const s of friends) sc.tweens.add({ targets: s, y: 580, duration: 220, yoyo: true, repeat: 3 });
    await sc.say('t2_otto_happy', { who: 'otto_happy', wait: true });
    save.finished = true;
    writeSave();
    await sc.wait(400);
  });
  sc.travel('home', 'party');
}

// Back in the village: everybody is at the party.
async function partyEnding(sc) {
  const L = sc.level;
  const fireworks = sc.time.addEvent({
    delay: 650, loop: true,
    callback: () => {
      const x = 1100 + Math.random() * 900, y = 160 + Math.random() * 160;
      sfx.firework();
      sc.spark.explode(26, x, y);
      sc.trail.explode(14, x, y);
    },
  });
  await sc.cutscene(async () => {
    await sc.wait(500);
    await sc.pan(1520, 470, 900);
    sfx.party();
    sc.cheer = true;
    await sc.say('e_robot1', { wait: true });
    await sc.say('e_otto', { who: 'otto_happy', wait: true });
    await sc.say('e_nova', { who: 'nova', wait: true });
    sc.cheer = false;
    await sc.panHome(800);
  });
  save.seen.ending = true;
  writeSave();
  sc.time.delayedCall(4000, () => fireworks.remove());
  if (L.id === 'home') sc.hooks.ending();
}
