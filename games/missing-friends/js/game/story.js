// Story moments, written top-to-bottom as little scripts.

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
  if (L.onEnter) sc.sayOnce(L.onEnter, `${L.id}:enter`);
}

async function introLanding(sc, ship) {
  const k = sc.k;
  const flame = sc.add.particles(0, 0, 'flame', {
    lifespan: 420, speedY: { min: 160, max: 280 }, speedX: { min: -30, max: 30 },
    scale: { start: 1.2 * k, end: 0.2 * k }, alpha: { start: 1, end: 0 },
    tint: [0xfff3a0, 0xffc15a, 0xff8a5c], blendMode: 'ADD', frequency: 14, quantity: 2,
  }).setDepth(12);
  flame.startFollow(ship, 0, -8);
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
    sc.hero.hide(false);
    sc.hero.state = 'cutscene';
    sc.hero.place(196, 548);
    sc.hero.body.setVelocity(150, -400);
    sc.hero.wallLock = 600; // keep the hop going instead of braking
    sc.hero.facing = 1;
    await sc.wait(250);
    sc.robot.x = 170;
    sc.robot.y = 520;
    sc.robot.sprite.setVisible(true);
    sc.robot.thruster.start();
    sc.robot.resume();
    await sc.wait(700);
    sc.cheer = true;
    await sc.say('i_land', { wait: true });
    sc.cheer = false;
    await sc.say('i_race', { wait: true });
  });
}

export function onTrigger(sc, id) {
  switch (id) {
    case 'arrival':
      if (!save.seen.arrival) homeArrival(sc);
      break;
    case 'tower':
      sc.say('h_tower');
      break;
    case 'crackHint':
      if (!save.rescued.nova) sc.say('h_crack');
      break;
    case 'woodsHint':
      sc.sayOnce('h_woods');
      break;
    case 'novaParty':
      sc.say('h_nova_back', { who: 'nova' });
      break;
    case 'cage':
      if (!save.rescued.nova) cageIntro(sc);
      break;
    case 'crack':
      if (sc.cracked.some((c) => !c.broken)) sc.say('w2_crack');
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

async function cageIntro(sc) {
  const c = sc.level.cage;
  await sc.cutscene(async () => {
    await sc.pan(c.x - 160, c.y - 110, 700);
    await sc.say('w2_cage1', { who: c.friend, wait: true });
    await sc.say('w2_cage2', { who: c.friend, args: [sc.word.join('')], wait: true });
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
    sc.hooks.friends();
    sc.hooks.toast('toast_rescued', rescuedCount());
    sc.cheer = true;
    await sc.say('w2_free1', { who, wait: true });
    await sc.say('w2_free2', { who, wait: true });
    sc.cheer = false;
    await sc.say('w2_free3', { who, wait: true });
    sc.spark.explode(16, sc.caged.x, sc.caged.y - 30);
    sfx.dash();
    await sc.tweenP({ targets: sc.caged, y: sc.caged.y - 460, alpha: 0, duration: 1200, ease: 'Cubic.easeIn' });
    await sc.panHome(600);
  });
}
