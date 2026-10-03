// Texture registry: builds what a level needs (once per page load) and makes
// portraits for the HTML overlays.

import { VIEW_W } from '../config.js';
import { makeCanvas } from './paint.js';
import {
  ASTRO_W, ASTRO_H, ASTRO_POSES, drawAstro, ROBOT_FRAMES, drawRobot,
  FRIEND_FRAMES, drawFriend, BEETLE_FRAMES, drawBeetle,
} from './chars.js';
import * as W from './world.js';
import * as P from './planets.js';
import { OTTO_FRAMES } from '../game/otto.js';

export { TERRAIN_PAD, TERRAIN_TOP, THEMES } from './world.js';

export const PARALLAX = [
  { key: 'far', s: 0.15, h: 300, y: 150, draw: W.drawFar },
  { key: 'hills', s: 0.4, h: 260, y: 232, draw: W.drawHills },
  { key: 'near', s: 0.7, h: 220, y: 336, draw: W.drawNear },
];
// Caves also get a roof of stalactites, between the back wall and the terrain.
export const ROOF = { key: 'roof', s: 0.55, h: 200, y: 0, draw: P.drawRoof };

export const blockKey = (letter, done) => `block_${letter.codePointAt(0)}_${done ? 1 : 0}`;

// Ground pieces without a height run down to the bottom of the world.
export const groundRects = (level) => level.ground.map((r) => ({ ...r, h: r.h ?? level.h - r.y }));
export const chunkKey = (levelId, i) => `t_${levelId}_${i}`;
export const layerKey = (levelId, key) => `${key}_${levelId}`;

function addSheet(T, key, canvas, fw, fh, n, R) {
  const tex = T.addCanvas(key, canvas);
  for (let i = 0; i < n; i++) tex.add(i, 0, Math.round(i * fw * R), 0, Math.round(fw * R), Math.round(fh * R));
}

function sheet(T, key, R, fw, fh, items, draw) {
  if (T.exists(key)) return;
  const { c, g } = makeCanvas(fw * items.length, fh, R);
  items.forEach((it, i) => { g.save(); g.translate(i * fw, 0); draw(g, it); g.restore(); });
  addSheet(T, key, c, fw, fh, items.length, R);
}

const faceOf = (who) => (g) => { g.save(); g.translate(2, 0); g.scale(0.92, 0.92); drawFriend(g, who, 'sad'); g.restore(); };

export function buildTextures(scene, R, level, { word, banner }) {
  const T = scene.textures;
  const add = (key, fn) => { if (!T.exists(key)) T.addCanvas(key, fn()); };
  const theme = level.theme;

  add(`sky_${theme}`, () => W.drawSky(R, theme));
  const layers = W.THEMES[theme].cave ? [...PARALLAX, ROOF] : PARALLAX;
  for (const L of layers) add(layerKey(level.id, L.key), () => L.draw(R, theme, VIEW_W + Math.max(0, level.w - VIEW_W) * L.s));
  add(`fog_${theme}`, () => W.drawFog(R, theme));
  add(`tuft_${theme}`, () => W.drawTuft(R, theme));
  add('cloud', () => W.drawCloud(R));

  groundRects(level).forEach((rect, i) => add(chunkKey(level.id, i), () => W.drawChunk(R, rect, theme, 100 + i * 7 + level.id.length, level.w, level.h)));
  for (const p of level.planks || []) if (p.look !== 'roof') add(`plank_${p.w}`, () => W.drawPlank(R, p.w));
  for (const m of level.movers || []) {
    const look = m.look || 'plank';
    add(`${look}_${m.w}`, () => (look === 'leaf' ? W.drawLeaf(R, m.w) : look === 'plank' ? W.drawPlank(R, m.w) : P.drawPlatformLook(R, look, m.w)));
  }
  for (const m of level.sinkers || []) add(`sinker_${m.w}`, () => P.drawSinker(R, m.w));
  for (const p of level.lava || []) add(`lava_${p.w}_${p.h}`, () => P.drawLava(R, p.w, p.h));
  for (const f of level.flames || []) add(`flame_${f.bottom - f.top}`, () => P.drawFlameColumn(R, f.bottom - f.top));
  for (const c of level.crushers || []) add(`crusher_${c.w}_${c.h}`, () => P.drawCrusher(R, c.w, c.h));
  if (level.cage) add(`cage_${level.theme}`, () => P.drawCageThemed(R, level.theme));
  for (const d of level.doors || []) add(`beam_${d.bottom - d.top}`, () => W.drawBeam(R, d.bottom - d.top));
  for (const b of level.barriers || []) add(`barrier_${b.bottom - b.top}`, () => W.drawBarrier(R, b.bottom - b.top));
  for (const b of level.bridges || []) add(`bridge_${b.w}_${b.h}`, () => W.drawBridge(R, b.w, b.h));
  for (const k of level.cracked || []) add(`cracked_${k.w}_${k.h}`, () => W.drawCracked(R, k.w, k.h));

  add('bouncer', () => W.drawBouncer(R, false));
  add('bouncer_sq', () => W.drawBouncer(R, true));
  add('lantern0', () => W.drawLantern(R, false));
  add('lantern1', () => W.drawLantern(R, true));
  add('plate0', () => W.drawPlate(R, false));
  add('plate1', () => W.drawPlate(R, true));
  add('post', () => W.drawPost(R));
  add('cage', () => W.drawCage(R));
  add('beacon', () => W.drawBeacon(R));
  add('ghost', () => W.drawGhost(R));
  add('shroom', () => W.drawShroom(R));
  add('star', () => W.drawStar(R));
  add('dot', () => W.drawDot(R));
  add('puff', () => W.drawPuff(R));
  add('spark', () => W.drawSpark(R));
  add('flame', () => W.drawFlame(R));
  add('shadow', () => W.drawShadow(R));
  add('ship', () => W.drawShip(R));
  add('vent', () => P.drawVent(R));
  add('fireball', () => P.drawFireball(R));
  add('icicle', () => P.drawIcicle(R));
  add('cannon', () => P.drawCannon(R));
  add('snowball', () => P.drawSnowball(R));
  add('rod', () => P.drawRod(R));
  add('bell', () => P.drawBell(R));
  add('jar0', () => P.drawJar(R, false));
  add('jar1', () => P.drawJar(R, true));
  add('shieldFx', () => P.drawShieldFx(R));
  add('bubbleFx', () => P.drawBubbleFx(R));
  add('wave', () => P.drawWave(R));
  add('target', () => P.drawTarget(R));
  add('streak', () => P.drawStreak(R));
  add('starBall', () => P.drawStarBall(R));

  const decorDraw = {
    pad: () => W.drawPad(R, 'metal'),
    sign: () => W.drawSign(R),
    tree: () => W.drawTree(R),
    bigTree: () => W.drawBigTree(R),
    crystals: () => W.drawCrystals(R),
    gate: () => W.drawGateArch(R),
    gateArch: () => W.drawGateArch(R),
    pole: () => W.drawPole(R),
    table: () => W.drawTable(R, false),
    cake: () => W.drawTable(R, true),
    feet: () => W.drawFeet(R),
    bolt: () => W.drawBolt(R),
    tower: () => W.drawTower(R),
    archWoods: () => W.drawArchWoods(R),
    logArch: () => W.drawLogArch(R),
    crystalPortal: () => W.drawCrystalPortal(R),
    volcano: () => P.drawVolcano(R),
    spikes: () => P.drawSpikes(R),
    caveLava: () => P.drawCaveMouth(R, 'lava'),
    caveIce: () => P.drawCaveMouth(R, 'ice'),
    pine: () => P.drawPine(R),
    snowman: () => P.drawSnowman(R),
    gear: () => P.drawGear(R),
    flag: () => P.drawFlag(R),
    caveExit: () => P.drawCaveExit(R),
    stalagmites: () => P.drawStalagmites(R),
    rocketLava: () => P.drawRocket(R, 'lava'),
    rocketIce: () => P.drawRocket(R, 'ice'),
  };
  for (const d of level.decor || []) {
    if (d.t === 'house') add(`house_${d.w}_${d.h}_${d.color}`, () => W.drawHouse(R, d.w, d.h, d.color));
    else if (d.t === 'banner') add(`banner_${banner}`, () => W.drawBanner(R, banner));
    else if (decorDraw[d.t]) add(`d_${d.t}`, decorDraw[d.t]);
  }
  add('lockLight', () => W.drawLockLight(R));
  add('towerDoor', () => P.drawTowerDoor(R));
  for (const p of level.pads || []) {
    add(`pad_${p.look}`, () => W.drawPad(R, p.look));
    add(`rocket_${p.look}`, () => P.drawRocket(R, p.look));
    add(`poster_${p.friend}`, () => W.drawPortraitSign(R, faceOf(p.friend)));
  }

  sheet(T, 'astro', R, ASTRO_W, ASTRO_H, ASTRO_POSES, drawAstro);
  sheet(T, 'robot', R, 96, 88, ROBOT_FRAMES, drawRobot);
  sheet(T, 'beetle', R, 48, 34, BEETLE_FRAMES, drawBeetle);
  sheet(T, 'beetle_lava', R, 48, 34, BEETLE_FRAMES, (g, m) => drawBeetle(g, m, P.BEETLE_PALETTES.lava));
  sheet(T, 'beetle_ice', R, 48, 34, BEETLE_FRAMES, (g, m) => drawBeetle(g, m, P.BEETLE_PALETTES.ice));
  if (level.otto || (level.npcs || []).some((n) => n.friend === 'otto')) sheet(T, 'otto', R, P.OTTO_W, P.OTTO_H, OTTO_FRAMES, P.drawOtto);
  for (const who of ['nova', 'stitch', 'scout']) sheet(T, `friend_${who}`, R, 64, 72, FRIEND_FRAMES, (g, mood) => drawFriend(g, who, mood));

  for (const ch of new Set(word || [])) {
    add(blockKey(ch, false), () => W.drawBlock(R, ch, false));
    add(blockKey(ch, true), () => W.drawBlock(R, ch, true));
  }
}

// Images for the HTML overlays (start screen, HUD, speech bubbles).
export function portraitURL(kind, mood = 'idle') {
  if (kind === 'astro') {
    const { c, g } = makeCanvas(64, 72, 3);
    drawAstro(g, ASTRO_POSES[10]);
    return c.toDataURL();
  }
  if (kind === 'robot') {
    const { c, g } = makeCanvas(56, 46, 3);
    g.translate(-20, 0);
    drawRobot(g, 'idle');
    return c.toDataURL();
  }
  if (kind === 'otto') {
    const { c, g } = makeCanvas(64, 60, 3);
    g.scale(0.42, 0.42);
    g.translate(-50, -4);
    P.drawOtto(g, mood === 'idle' ? 'grump' : mood);
    return c.toDataURL();
  }
  const { c, g } = makeCanvas(64, 60, 3);
  drawFriend(g, kind, mood);
  return c.toDataURL();
}
