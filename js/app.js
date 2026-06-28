import { diff, lvl2Cfg, lvl3Cfg, lvl4Cfg, lvl5Cfg, heroes, makeLvl3World, STAR_GOAL, ABILITY } from './config.js?v=37';
import { initLevel4, updateLevel4, renderLevel4 } from './level4.js?v=37';
import { initLevel5, updateLevel5, renderLevel5, getL5HeroMoveBounds } from './level5.js?v=37';
import { playSFX, toggleMuted } from './audio.js?v=37';
import {
  spawnShieldBurst, spawnShieldBreakBurst, spawnStarBurst, spawnHitBurst,
  updateParticles, drawParticles, clearParticles,
} from './particles.js?v=37';
import { loadScores, saveScores, loadHintFlag, setHintFlag } from './storage.js?v=37';
import { t, loadLocale, setLocale, applyStaticI18n } from './i18n.js?v=37';


let canvas, ctx, dom;
let overlay, scoreStat, starsStat, bestStat, speedStat,
  statusPill, difficultyPill, heroPill, startBtn, restartBtn, overlayStart,
  easyBtn, hardBtn, lvl1Btn, lvl2Btn, lvl3Btn, lvl4Btn, lvl5Btn, duckHint, muteBtn, shieldPill,
  keyHint, touchPad, touchAbility, pauseBtn, pauseOverlay, pauseResume, pauseRestart, lvl3Hint, lvl4Hint, lvl5Hint,
  heroCards, previews, abilityPill;
const starPop = new Array(STAR_GOAL).fill(0); // pop animation timers per pip
const HERO_HOME_X = 120;
const RESTART_DELAY_MS = 2800;
const LOSE_RESTART_DELAY_MS = 1500;
// ─── State ──────────────────────────────────────────────────────────────────
const state={
  running:false,paused:false,score:0,stars:0,best:0,bestByLevel:{one:0,two:0,three:0,four:0,five:0},frame:0,
  speed:4.2,gravity:.52,groundY:430,currentGravity:.52,
  difficulty:'easy',hero:'astro',level:'one',
  robot:{x:HERO_HOME_X,y:370,w:60,h:60,vy:0,jumping:false,airJumps:0,hitsLeft:0,squash:0,flash:0,shieldActive:false,dashOffset:0,footLaser:0},
  obstacles:[],pickups:[],shields:[],beams:[],confetti:[],endAnim:null,nextShieldFrame:0,nextBeamFrame:0,
  screenShake:0,bgStars:[],shootingStar:null,
  // Level 3 platformer state
  l3:{
    camX:0,
    plats:[], stars:[],
    lavaY:520,
    lavaRipple:0,
    volcanoSmoke:[]
  },
  l4:null,
  l5:null,
  keys:{left:false, right:false},
  abilities:{dashCd:0, bubbleActive:0, bubbleCd:0, dashTrail:0, dashDir:1, dashHold:0},
  pendingOverlay:null, restartUnlockAt:0, overlayButtonLabel:'btn.play', uiOverlay:null,
  runEngaged:false,
  reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
};
// pre-generate background stars for level 2
function initBgStars(){
  state.bgStars=[];
  for(let i=0;i<80;i++) state.bgStars.push({x:Math.random()*700,y:Math.random()*360,r:0.6+Math.random()*2.2,twinkle:Math.random()*Math.PI*2,speed:0.3+Math.random()*0.7,layer:Math.floor(Math.random()*3)});
  state.asteroidShapes=[];
  for(let i=0;i<9;i++){
    const pts=6,r=6+i%5*3,jitter=r*0.38;
    const shape=[];
    for(let j=0;j<pts;j++){
      const a=(Math.PI*2*j)/pts,jr=(Math.random()-.5)*jitter;
      shape.push([Math.cos(a)*(r+jr),Math.sin(a)*(r+jr)]);
    }
    state.asteroidShapes.push(shape);
  }
}
initBgStars();

// ─── Helpers ─────────────────────────────────────────────────────────────────
function levelJumpCfg(){
  if(state.level==='five') return lvl5Cfg[state.difficulty];
  if(state.level==='four') return lvl4Cfg[state.difficulty];
  if(state.level==='three') return lvl3Cfg[state.difficulty];
  return diff[state.difficulty];
}
function scrollCamX(){
  if(state.level==='three') return state.l3?.camX||0;
  if(state.level==='four') return state.l4?.camX||0;
  return 0;
}
function isPlatformLevel(){
  return state.level==='three'||state.level==='four'||state.level==='five';
}
function l4Deps(){
  return {
    heroes, getTimeScale, tickAbilities, triggerStarPop, endRun,
    updateStats, updateAbilityPill, updateShieldPill,
    drawRobot, drawDashTrail, drawParticles, drawConfetti, drawProgressBar, drawTimeBubbleOverlay, t,
    updateParticles: () => updateParticles(),
  };
}
function l5Deps(){
  return {
    heroes, getTimeScale, tickAbilities, getHeroBounds, triggerStarPop, endRun,
    updateStats, updateAbilityPill, updateShieldPill,
    drawRobot, drawDashTrail, drawParticles, drawConfetti, drawProgressBar, drawTimeBubbleOverlay, t,
    updateParticles: () => updateParticles(),
  };
}
function applyDifficulty(){
  if(state.level==='five'){
    const c5=lvl5Cfg[state.difficulty];
    state.currentGravity=c5.gravity;
    state.speed=0;
    if(difficultyPill) difficultyPill.textContent=t('hud.level5',{diff:t(`diff.${state.difficulty}`)});
  } else if(state.level==='four'){
    const c4=lvl4Cfg[state.difficulty];
    state.currentGravity=c4.gravity;
    state.speed=0;
    if(difficultyPill) difficultyPill.textContent=t('hud.level4',{diff:t(`diff.${state.difficulty}`)});
  } else if(state.level==='three'){
    const c3=lvl3Cfg[state.difficulty];
    state.currentGravity=c3.gravity;
    state.speed=0; // no auto-scroll in platformer
    if(difficultyPill) difficultyPill.textContent=t('hud.level3',{diff:t(`diff.${state.difficulty}`)});
  } else if(state.level==='two'){
    const c2=lvl2Cfg[state.difficulty];
    state.speed=c2.startSpeed;
    state.currentGravity=c2.gravity;
    if(difficultyPill) difficultyPill.textContent=t('hud.level2',{diff:t(`diff.${state.difficulty}`)});
  } else {
    const c=diff[state.difficulty];
    state.speed=c.startSpeed;
    state.currentGravity=c.gravity;
    if(difficultyPill) difficultyPill.textContent=t(`diff.${state.difficulty}`);
  }
  easyBtn?.classList.toggle('active',state.difficulty==='easy');
  hardBtn?.classList.toggle('active',state.difficulty==='hard');
  lvl1Btn?.classList.toggle('active',state.level==='one');
  lvl2Btn?.classList.toggle('active',state.level==='two');
  lvl3Btn?.classList.toggle('active',state.level==='three');
  lvl4Btn?.classList.toggle('active',state.level==='four');
  lvl5Btn?.classList.toggle('active',state.level==='five');
  document.querySelector('.game').classList.toggle('level2',state.level==='two');
  document.querySelector('.game').classList.toggle('level3',state.level==='three');
  document.querySelector('.game').classList.toggle('level4',state.level==='four');
  document.querySelector('.game').classList.toggle('level5',state.level==='five');
  const keyHint=document.getElementById('keyHint');
  updateTouchPad();
}
function setLevel(lv){
  if(lv===state.level) return;
  restartAfterSettingChange(()=>{ state.level=lv; }, 'confirm.level');
}
function setDifficulty(mode){
  if(mode===state.difficulty) return;
  restartAfterSettingChange(()=>{ state.difficulty=mode; }, 'confirm.difficulty');
}
function refreshGameI18n(){
  applyStaticI18n();
  applyDifficulty();
  applyHero();
  updateAbilityPill();
  updateShieldPill();
  if(statusPill){
    if(state.paused) statusPill.textContent=t('hud.pause');
    else if(state.running) statusPill.textContent=t('hud.playing');
    else if(state.endAnim?.type==='win'||state.uiOverlay?.titleKey==='win.title'||state.pendingOverlay?.titleKey==='win.title')
      statusPill.textContent=t('hud.victory');
    else if(state.uiOverlay&&['lose.title','lose.lava.title','lose.pit.title'].includes(state.uiOverlay.titleKey))
      statusPill.textContent=t('hud.tryAgain');
    else statusPill.textContent=t('hud.ready');
  }
  if(state.uiOverlay){
    const k=state.uiOverlay;
    showOverlay(t(k.titleKey,k.params),t(k.textKey,k.params),k.labelKey);
  }
  if(state.pendingOverlay){
    const p=state.pendingOverlay;
    state.pendingOverlay={
      titleKey:p.titleKey,textKey:p.textKey,labelKey:p.labelKey,params:{...p.params},
    };
  }
}
function getLvl3WorldW(l3){
  const last=l3.plats[l3.plats.length-1];
  return last?last.x+last.w:4000;
}
function getHeroBounds(){
  const r=state.robot;
  const x=isPlatformLevel()?r.x:r.x+(r.dashOffset||0);
  return{left:x+4,right:x+r.w-4,top:r.y,bottom:r.y+r.h,cx:x+r.w/2,cy:r.y+r.h/2,x};
}
function resetRunnerPosition(){
  const r=state.robot;
  r.dashOffset=0;
  state.abilities.dashHold=0;
  if(!isPlatformLevel()){
    r.x=HERO_HOME_X;
    r.y=370;
  }
}
function applyHero(){
  const h=heroes[state.hero],r=state.robot;
  r.airJumps=h.extraJumps; r.hitsLeft=h.hitProtection;
  if(h.ability!=='timeBubble'&&state.abilities.bubbleActive>0) state.abilities.bubbleActive=0;
  if(!isPlatformLevel()) r.dashOffset=0;
  if(heroPill) heroPill.textContent=`${h.emoji} ${h.name}`;
  heroCards?.forEach(c=>c.classList.toggle('active',c.dataset.hero===state.hero));
  updateAbilityPill();
}
function getTimeScale(){
  const bubble = Number(state.abilities.bubbleActive) || 0;
  if(state.hero!=='swift'||bubble<=0) return 1;
  return ABILITY.bubbleSlow;
}
function useHeroAbility(){
  if(!state.running||state.paused) return;
  const h=heroes[state.hero];
  if(h.ability==='dash') tryDash();
  else if(h.ability==='timeBubble') tryTimeBubble();
}
function isAbilityKey(e){
  return ['ShiftLeft','ShiftRight','MetaLeft','MetaRight','ControlLeft','ControlRight'].includes(e.code);
}
function markRunEngaged(){
  if(state.running && !state.paused) state.runEngaged=true;
}
function confirmSettingChange(whatKey){
  return window.confirm(t('confirm.change',{what:t(whatKey)}));
}
function restartAfterSettingChange(applyFn, whatKey='confirm.setting'){
  const wasRunning=state.running;
  const needsConfirm=wasRunning&&state.runEngaged;
  if(needsConfirm&&!confirmSettingChange(whatKey)) return;
  applyFn();
  if(needsConfirm){
    resetGame();
    startGame();
  }else{
    state.running=false;
    clearRunState();
    if(statusPill) statusPill.textContent=t('hud.ready');
    updateStats();
    if(state.level==='five') showOverlayI18n('overlay.boss.title','overlay.boss.text','btn.play');
    else if(state.level==='four') showOverlayI18n('overlay.ice.title','overlay.ice.text','btn.play');
    else showOverlayI18n('overlay.start.title','overlay.start.text','btn.play');
    refreshGameI18n();
  }
}
function tickAbilities(){
  const a=state.abilities;
  if(a.dashCd>0) a.dashCd--;
  if(a.bubbleActive>0) a.bubbleActive--;
  else if(a.bubbleCd>0) a.bubbleCd--;
  if(a.dashTrail>0) a.dashTrail--;
  const r=state.robot;
  if(r.footLaser>0) r.footLaser--;
  if(state.level!=='three'&&state.level!=='four'&&state.level!=='five'&&r.dashOffset){
    if(a.dashHold>0){
      a.dashHold--;
    } else {
      const step=Math.max(2,Math.abs(r.dashOffset)*0.14);
      if(r.dashOffset>0) r.dashOffset=Math.max(0,r.dashOffset-step);
      else r.dashOffset=Math.min(0,r.dashOffset+step);
      if(Math.abs(r.dashOffset)<1) r.dashOffset=0;
    }
  }
}
function tryDash(){
  if(state.hero!=='star'||!state.running||state.paused) return;
  if(state.abilities.dashCd>0) return;
  const r=state.robot;
  const dist=(state.level==='three'||state.level==='four'||state.level==='five')?ABILITY.dashDistL3:ABILITY.dashDistL12;
  let dir=1;
  if(state.level==='three'||state.level==='four'||state.level==='five'){
    if(state.keys.left&&!state.keys.right) dir=-1;
    else if(state.keys.right) dir=1;
  } else if(state.keys.left&&!state.keys.right){
    dir=-1;
  }
  if(state.level==='three'||state.level==='four'){
    r.x+=dir*dist;
    if(state.level==='four'&&state.l4){
      const worldW=state.l4.plats[state.l4.plats.length-1].x+state.l4.plats[state.l4.plats.length-1].w+80;
      r.x=Math.max(4,Math.min(worldW-r.w,r.x));
    } else {
      const worldW=getLvl3WorldW(state.l3);
      r.x=Math.max(4,Math.min(worldW-r.w,r.x));
    }
  } else if(state.level==='five'){
    r.x+=dir*dist;
    if(state.l5){
      const bounds=getL5HeroMoveBounds(state.l5,r.w);
      r.x=Math.max(bounds.minX,Math.min(bounds.maxX,r.x));
    }
  } else {
    r.dashOffset=dir*dist;
    state.abilities.dashHold=ABILITY.dashHoldFrames;
  }
  state.abilities.dashCd=ABILITY.dashCooldown;
  state.abilities.dashTrail=14;
  state.abilities.dashDir=dir;
  r.flash=10;
  playSFX('dash');
  markRunEngaged();
  updateAbilityPill();
}
function tryTimeBubble(){
  if(state.hero!=='swift'||!state.running||state.paused) return;
  if(state.abilities.bubbleActive>0||state.abilities.bubbleCd>0) return;
  state.abilities.bubbleActive = ABILITY.bubbleDuration[state.difficulty];
  state.abilities.bubbleCd=ABILITY.bubbleCooldown;
  playSFX('time_bubble');
  markRunEngaged();
  updateAbilityPill();
}
function updateAbilityPill(){
  if(abilityPill){
    const h=heroes[state.hero],a=state.abilities,r=state.robot;
    if(h.ability==='freeHit'){
      abilityPill.style.display=state.running&&r.hitsLeft>0?'':'none';
      abilityPill.textContent=t('ability.freeHit');
    } else if(h.ability==='dash'){
      abilityPill.style.display=state.running?'':'none';
      abilityPill.textContent=a.dashCd>0?t('ability.dashCd',{sec:Math.ceil(a.dashCd/60)}):t('ability.dash');
    } else if(h.ability==='timeBubble'){
      if(!state.running){abilityPill.style.display='none';}
      else{
        abilityPill.style.display='';
        if(a.bubbleActive>0){
          abilityPill.textContent=t('ability.bubbleActive');
          abilityPill.classList.add('bubble-active');
        } else if(a.bubbleCd>0){
          abilityPill.textContent=t('ability.bubbleCd',{sec:Math.ceil(a.bubbleCd/60)});
          abilityPill.classList.remove('bubble-active');
        } else {
          abilityPill.textContent=t('ability.bubble');
          abilityPill.classList.remove('bubble-active');
        }
      }
    } else {
      abilityPill.style.display='none';
    }
  }
  updateTouchAbilityBtn();
}
function updateTouchAbilityBtn() {
  if (!touchAbility) return;
  const h = heroes[state.hero];
  const show = isPlatformLevel() && (h.ability === 'dash' || h.ability === 'timeBubble');
  touchAbility.hidden = !show;
  if (!show) return;
  const a = state.abilities;
  touchAbility.classList.toggle('bubble-active', h.ability === 'timeBubble' && a.bubbleActive > 0);
  if (h.ability === 'dash') {
    touchAbility.textContent = a.dashCd > 0 ? '⏳' : '⚡';
    touchAbility.disabled = !state.running || a.dashCd > 0;
    touchAbility.title = a.dashCd > 0 ? t('ability.dashCd', { sec: Math.ceil(a.dashCd / 60) }) : t('ability.dash');
  } else {
    touchAbility.textContent = a.bubbleActive > 0 ? '🫧' : (a.bubbleCd > 0 ? '⏳' : '🫧');
    touchAbility.disabled = !state.running || a.bubbleActive > 0 || a.bubbleCd > 0;
    if (a.bubbleActive > 0) touchAbility.title = t('ability.bubbleActive');
    else if (a.bubbleCd > 0) touchAbility.title = t('ability.bubbleCd', { sec: Math.ceil(a.bubbleCd / 60) });
    else touchAbility.title = t('ability.bubble');
  }
}
function setHero(hero){
  if(hero===state.hero) return;
  restartAfterSettingChange(()=>{
    state.hero=hero;
    applyHero();
    if(!state.running) showOverlayI18n('pickHero.title','hero.'+hero+'.desc','btn.play',{name:heroes[hero].name});
  }, 'confirm.hero');
}
function showOverlayI18n(titleKey,textKey,labelKey='btn.play',params={}){
  state.uiOverlay={titleKey,textKey,labelKey,params};
  showOverlay(t(titleKey,params),t(textKey,params),labelKey);
}
function updateShieldPill(){
  const active=state.robot.shieldActive;
  shieldPill.classList.toggle('active',active);
  shieldPill.classList.toggle('inactive',!active);
  shieldPill.style.display=state.difficulty==='easy'?'':'none';
}
function clearRunState(){
  state.score=0;state.stars=0;state.frame=0;state.runEngaged=false;
  state.obstacles=[];state.pickups=[];state.shields=[];state.beams=[];state.confetti=[];state.endAnim=null;state.screenShake=0;
  clearParticles();
  state.abilities.dashCd=0;state.abilities.bubbleActive=0;state.abilities.bubbleCd=0;state.abilities.dashTrail=0;state.abilities.dashDir=1;state.abilities.dashHold=0;
  starPop.fill(0);
  state.nextShieldFrame=state.difficulty==='easy'?300+Math.floor(Math.random()*200):Infinity;
  state.nextBeamFrame=state.level==='two'?180+Math.floor(Math.random()*140):Infinity;
  // Level 3 world reset happens after applyHero below
  state.shootingStar=null;
  state.robot.vy=0;state.robot.jumping=false;state.robot.squash=0;state.robot.flash=0;state.robot.shieldActive=false;state.robot.dashOffset=0;state.robot.footLaser=0;
  if(!isPlatformLevel()){state.robot.x=HERO_HOME_X;state.robot.y=370;}
  applyDifficulty();applyHero();
  if(state.level==='three'){
    const world=makeLvl3World(state.difficulty);
    state.l3.plats=world.plats;
    state.l3.stars=world.stars;
    state.l3.camX=0;
    state.l3.lavaRipple=0;
    state.l3.volcanoSmoke=[];
    const p0=state.l3.plats[0];
    state.robot.x=p0.x+40;
    state.robot.y=p0.y-state.robot.h;
    state.robot.vy=0; state.robot.jumping=false;
    state.stars=0;
  } else if(state.level==='four'){
    initLevel4(state, state.difficulty);
  } else if(state.level==='five'){
    initLevel5(state, state.difficulty);
    if(state.difficulty==='easy') state.robot.shieldActive=true;
  }
  updateShieldPill();
}
function showOverlay(title,text,labelKey){
  if (!overlay) return;
  overlay.classList.remove('hidden');
  overlay.querySelector('h2').textContent=title;
  overlay.querySelector('p').textContent=text;
  state.overlayButtonLabel=labelKey;
  updateRestartButton();
}
function canRestart(){
  if(state.running) return true;
  if(state.pendingOverlay) return false;
  return Date.now()>=(state.restartUnlockAt||0);
}
function updateRestartButton(){
  if(!overlayStart) return;
  const locked=!canRestart()&&!state.running;
  overlayStart.disabled=locked;
  if(locked&&state.restartUnlockAt>Date.now()){
    const sec=Math.max(1,Math.ceil((state.restartUnlockAt-Date.now())/1000));
    overlayStart.textContent=`${t(state.overlayButtonLabel)} (${sec})`;
  } else {
    overlayStart.textContent=t(state.overlayButtonLabel);
  }
}
function tickEndCelebration(){
  if(state.confetti.length){
    state.confetti.forEach(c=>{c.x+=c.vx;c.y+=c.vy;c.vy+=.18});
    state.confetti=state.confetti.filter(c=>c.y<canvas.height+30);
  }
  if(!state.endAnim) return;
  state.endAnim.timer--;
  if(state.endAnim.timer<=0){
    state.endAnim=null;
    if(state.pendingOverlay){
      const p=state.pendingOverlay;
      state.pendingOverlay=null;
      showOverlay(t(p.titleKey,p.params),t(p.textKey,p.params),p.labelKey);
      state.restartUnlockAt=Date.now()+RESTART_DELAY_MS;
      state.uiOverlay={titleKey:p.titleKey,textKey:p.textKey,labelKey:p.labelKey,params:{...p.params}};
    }
  }
  if(!canRestart()&&!state.running) updateRestartButton();
}
function resetGame(){
  state.running=false;state.paused=false;state.pendingOverlay=null;state.restartUnlockAt=0;state.uiOverlay=null;
  pauseOverlay?.classList.add('hidden');clearRunState();
  if(statusPill)statusPill.textContent=t('hud.ready');updateStats();
  if(state.level==='five') showOverlayI18n('overlay.boss.title','overlay.boss.text','btn.play');
  else if(state.level==='four') showOverlayI18n('overlay.ice.title','overlay.ice.text','btn.play');
  else showOverlayI18n('overlay.start.title','overlay.start.text','btn.play');
  updateTouchPad();updatePauseBtn();
}
function startGame(){
  if(!state.running&&!canRestart()) return;
  if(!state.running)clearRunState();state.running=true;state.paused=false;state.uiOverlay=null;pauseOverlay?.classList.add('hidden');overlay?.classList.add('hidden');if(statusPill)statusPill.textContent=t('hud.playing');updateStats();showLvl3HintIfNeeded();showLvl4HintIfNeeded();showLvl5HintIfNeeded();updatePauseBtn();updateAbilityPill();}
function jump(){
  if(!state.running){
    if(!canRestart()) return;
    startGame();
  }
  markRunEngaged();
  const r=state.robot;
  if(!r.jumping){
    const jumpVy = levelJumpCfg().jump;
    r.vy=jumpVy;
    r.jumping=true;
    playSFX('jump');
  } else if(r.airJumps>0){
    const baseJump = isPlatformLevel() ? levelJumpCfg().jump : heroes[state.hero].jump;
    r.vy=baseJump*0.72;
    r.airJumps--;
    if(state.hero==='astro') r.footLaser=28;
    playSFX('dbl_jump');
  }
}
// Returns true if [x, x+w] overlaps any active beam or obstacle on screen (with margin)
function wouldOverlap(x, w, margin){
  const m = margin||80;
  for(const b of state.beams){
    if(x < b.x+b.w+m && x+w > b.x-m) return true;
  }
  for(const o of state.obstacles){
    if(x < o.x+o.w+m && x+w > o.x-m) return true;
  }
  return false;
}
function spawnObstacle(){
  const w=28+Math.random()*18;
  const spawnX=canvas.width+30;
  if(state.level==='two' && wouldOverlap(spawnX, w, 180)) return; // skip — beam is too close
  const h=34+Math.random()*38;
  if(state.level==='two'){
    const baseY=state.groundY-h;
    state.obstacles.push({x:spawnX,y:baseY,w,h,
      moving:true,baseY,phase:Math.random()*Math.PI*2,amp:30+Math.random()*40,freq:0.03+Math.random()*0.02});
  } else {
    state.obstacles.push({x:spawnX,y:state.groundY-h,w,h});
  }
}
function spawnBeam(){
  const w=120+Math.random()*100;
  const spawnX=canvas.width+20;
  if(wouldOverlap(spawnX, w, 180)) return; // skip — obstacle too close
  const clearance = state.robot.h + 14;
  const beamBottomY = state.groundY - clearance;
  state.beams.push({x:spawnX, w, beamBottomY, warned:false});
}
function spawnPickup(){state.pickups.push({x:canvas.width+10,y:280+Math.random()*80,r:14,taken:false})}
function spawnShield(){state.shields.push({x:canvas.width+10,y:220+Math.random()*110,r:16,taken:false})}
function endRun(type, opts={}){
  state.running=false;state.paused=false;
  let textKey, params={stars:state.stars,score:state.score};
  if(type==='win'){
    if(state.level==='five'){
      textKey='win.boss.text';
      params={stars:state.stars,score:state.score};
    } else if(state.level==='three'){
      const timeBonus=Math.max(0,Math.floor((4800-state.frame)/8));
      state.score+=timeBonus;
      params={stars:state.stars,score:state.score,bonus:timeBonus};
      textKey='win.textL3';
    } else {
      textKey='win.text';
      params.score=state.score;
    }
  } else if(opts.lava){
    textKey='lose.lava.text';
  } else if(opts.pit){
    textKey='lose.pit.text';
  } else {
    textKey='lose.text';
    params.score=state.score;
  }
  state.best=Math.max(state.best,state.score);
  const lvlKey=state.level==='five'?'five':state.level==='four'?'four':state.level==='three'?'three':state.level==='two'?'two':'one';
  state.bestByLevel[lvlKey]=Math.max(state.bestByLevel[lvlKey]||0,state.score);
  saveScores({best:state.best,bestByLevel:state.bestByLevel});
  updateStats();
  const titleKey=type==='win'?'win.title':(opts.lava?'lose.lava.title':opts.pit?'lose.pit.title':'lose.title');
  const statusKey=type==='win'?'hud.victory':'hud.tryAgain';
  const labelKey='btn.playAgain';
  statusPill.textContent=t(statusKey);
  if(type==='win'){
    playSFX('win');
    state.endAnim={type:'win',timer:90};
    const cam=scrollCamX();
    const cx=state.level==='three'||state.level==='four'?state.robot.x-cam+state.robot.w/2:canvas.width/2;
    const cy=state.level==='three'||state.level==='four'||state.level==='five'?state.robot.y+20:130;
    for(let i=0;i<54;i++) state.confetti.push({x:cx,y:cy,vx:(Math.random()-.5)*7,vy:Math.random()*-5-1,size:6+Math.random()*6,color:['#ffbf3c','#00a8cc','#7a5cff','#2dbd77','#ff6b7a'][i%5]});
    state.pendingOverlay={titleKey,textKey,labelKey,params:{...params}};
    state.uiOverlay=null;
    overlay?.classList.add('hidden');
  } else {
    playSFX('lose');
    state.endAnim={type:'lose',timer:42};
    state.robot.flash=42;state.robot.squash=16;
    showOverlayI18n(titleKey,textKey,labelKey,params);
    state.restartUnlockAt=Date.now()+LOSE_RESTART_DELAY_MS;
  }
  updatePauseBtn();
  updateAbilityPill();
  if(!isPlatformLevel()) resetRunnerPosition();
}

// ─── Update ──────────────────────────────────────────────────────────────────
function updateLevel3(){
  const h=heroes[state.hero],r=state.robot,l3=state.l3;
  if(!state.running||state.paused) return;
  state.frame++;
  tickAbilities();
  const ts=getTimeScale();
  const cfg=lvl3Cfg[state.difficulty];
  const moveSpeed=cfg.moveSpeed*ts;

  // Horizontal movement
  if(state.keys.left)  r.x -= moveSpeed;
  if(state.keys.right) r.x += moveSpeed;

  // Gravity
  r.vy += state.currentGravity*ts;
  r.y  += r.vy*ts;
  if(r.squash>0) r.squash--;
  if(r.flash>0)  r.flash--;
  if(state.screenShake>0) state.screenShake--;

  // Platform collision — stand on top surface
  let onGround = false;
  for(const p of l3.plats){
    const hl=r.x+4, hr=r.x+r.w-4;
    const heroBottom=r.y+r.h, heroTop=r.y;
    const prevBottom=heroBottom-r.vy; // where bottom was last frame
    if(hr>p.x && hl<p.x+p.w){
      // landing on top — hero bottom crosses platform top from above
      if(prevBottom<=p.y+4 && heroBottom>=p.y-4 && r.vy>=0){
        r.y=p.y-r.h; r.vy=0; r.jumping=false; r.airJumps=h.extraJumps;
        onGround=true; break;
      }
      // Already sitting on top (spawn case: hero placed exactly on surface)
      if(Math.abs(heroBottom-p.y)<=2 && r.vy>=0){
        r.y=p.y-r.h; r.vy=0; r.jumping=false; r.airJumps=h.extraJumps;
        onGround=true; break;
      }
    }
  }

  // World bounds — don't go past left edge (x=0)
  if(r.x<4) r.x=4;
  // Don't exceed world right end
  const worldW=getLvl3WorldW(l3);
  if(r.x+r.w>worldW) r.x=worldW-r.w;

  // Camera: follow hero, clamp to world
  const targetCam=r.x-canvas.width*0.35;
  l3.camX=Math.max(0,Math.min(worldW-canvas.width, targetCam));

  // Lava — fall detection (y > 520 in world = into lava)
  if(r.y > 510){
    if(r.shieldActive){
      // shield absorbs one lava touch
      r.shieldActive=false; r.flash=28;
      playSFX('shield_break'); spawnShieldBreakBurst(r.x+r.w/2,r.y+r.h/2);
      updateShieldPill();
      // respawn on nearest platform above
      const nearest=l3.plats.reduce((best,p)=>{
        const dx=Math.abs((p.x+p.w/2)-(r.x+r.w/2)); return dx<Math.abs((best.x+best.w/2)-(r.x+r.w/2))?p:best;
      },l3.plats[0]);
      r.x=nearest.x+nearest.w/2-r.w/2; r.y=nearest.y-r.h; r.vy=0;
      return;
    }
    if(r.hitsLeft>0){
      r.hitsLeft--; r.flash=24;
      playSFX('hit'); spawnHitBurst(r.x+r.w/2,r.y+r.h/2);
      state.screenShake=14; updateAbilityPill();
      const nearest=l3.plats.reduce((best,p)=>{
        const dx=Math.abs((p.x+p.w/2)-(r.x+r.w/2)); return dx<Math.abs((best.x+best.w/2)-(r.x+r.w/2))?p:best;
      },l3.plats[0]);
      r.x=nearest.x+nearest.w/2-r.w/2; r.y=nearest.y-r.h; r.vy=0;
      return;
    }
    playSFX('lava_death');
    spawnHitBurst(r.x+r.w/2,r.y+r.h/2);
    state.screenShake=20;
    endRun('lose',{lava:true});
    return;
  }

  // Star collection
  for(const s of l3.stars){
    if(s.taken) continue;
    const sx=s.x-l3.camX, sy=s.y;
    const rx2=r.x-l3.camX+r.w/2, ry2=r.y+r.h/2;
    const dx=rx2-sx,dy=ry2-sy;
    if(Math.sqrt(dx*dx+dy*dy)<34){
      s.taken=true;
      triggerStarPop(state.stars);
      state.stars++;state.score+=25;
      playSFX('star');
      spawnStarBurst(sx,sy);
      if(state.stars>=15){
        endRun('win');
        return;
      }
    }
  }

  // Shield pickup spawned randomly (easy only) — reuse state.shields array
  if(state.difficulty==='easy'&&state.frame>=state.nextShieldFrame){
    // Place shield on a random uncollected star's platform
    const uncollected=l3.plats.filter((_,i)=>i>0&&i<l3.plats.length-1);
    if(uncollected.length>0){
      const p=uncollected[Math.floor(Math.random()*uncollected.length)];
      state.shields.push({x:p.x+p.w/2,y:p.y-24,r:16,taken:false,world:true});
    }
    state.nextShieldFrame=state.frame+300+Math.floor(Math.random()*200);
  }
  // Move shields in world coords (no scroll for level 3)
  for(const s of state.shields){
    if(s.taken) continue;
    if(s.world){
      const sx=s.x-l3.camX,sy=s.y;
      const rx2=r.x-l3.camX+r.w/2,ry2=r.y+r.h/2;
      if(Math.sqrt((rx2-sx)**2+(ry2-sy)**2)<44){
        s.taken=true;r.shieldActive=true;
        playSFX('shield_collect');
        spawnShieldBurst(sx,sy);
        updateShieldPill();
      }
    }
  }
  state.shields=state.shields.filter(s=>!s.taken);

  // Volcano smoke puffs
  l3.lavaRipple+=ts;
  while(l3.lavaRipple>=40){
    l3.lavaRipple-=40;
    l3.volcanoSmoke.push({x:3060,y:115,size:6+Math.random()*8,vx:(Math.random()-.5)*0.6,vy:-0.8-Math.random()*0.5,life:1,decay:0.008+Math.random()*0.006});
  }
  l3.volcanoSmoke.forEach(s=>{s.x+=s.vx*ts;s.y+=s.vy*ts;s.size+=0.3*ts;s.life-=s.decay*ts;});
  l3.volcanoSmoke=l3.volcanoSmoke.filter(s=>s.life>0);

  updateParticles();
  updateStats();
  updateAbilityPill();
}

function update(){
  if(state.paused) return;
  if(state.running && (state.keys.left || state.keys.right)) markRunEngaged();
  if(state.level==='three'){updateLevel3();return;}
  if(state.level==='four'){updateLevel4(state,canvas,l4Deps());return;}
  if(state.level==='five'){updateLevel5(state,canvas,l5Deps());return;}
  tickAbilities();
  state.frame++;
  const d=diff[state.difficulty],h=heroes[state.hero],r=state.robot;
  const ts=getTimeScale();
  if(state.running){
    state.score++;
    if(state.level==='two'){
      const cfg=lvl2Cfg[state.difficulty];
      if(state.frame%cfg.obs===0){state.speed+=cfg.boost;spawnObstacle();}
      if(state.frame%cfg.pick===0) spawnPickup();
      if(state.frame>=state.nextBeamFrame){spawnBeam();state.nextBeamFrame=state.frame+cfg.beamInterval+Math.floor(Math.random()*180);}
      if(state.difficulty==='easy'&&state.frame>=state.nextShieldFrame){spawnShield();state.nextShieldFrame=state.frame+300+Math.floor(Math.random()*200);}
    } else {
      if(state.frame%d.obs===0){state.speed+=d.boost; spawnObstacle();}
      if(state.frame%d.pick===0) spawnPickup();
      if(state.difficulty==='easy'&&state.frame>=state.nextShieldFrame){spawnShield();state.nextShieldFrame=state.frame+300+Math.floor(Math.random()*200);}
    }
  }
  r.vy+=state.currentGravity*ts;
  r.y+=r.vy*ts;
  if(r.y>=370){r.y=370;r.vy=0;r.jumping=false;r.airJumps=h.extraJumps}
  if(r.squash>0) r.squash--;
  if(r.flash>0) r.flash--;
  if(state.screenShake>0) state.screenShake--;
  state.obstacles.forEach(o=>{
    o.x-=state.speed*ts;
    if(o.moving) o.y=o.baseY+Math.sin(state.frame*o.freq*ts+o.phase)*o.amp;
  });
  state.pickups.forEach(p=>p.x-=state.speed*ts);
  state.shields.forEach(s=>s.x-=state.speed*ts);
  state.beams.forEach(b=>{
    b.x-=state.speed*ts;
    // warn player when beam enters screen and hero is near jump height
    if(!b.warned&&b.x<520){b.warned=true;playSFX('beam_warn');showDuckHint();}
  });
  state.obstacles=state.obstacles.filter(o=>o.x+o.w>-20);
  state.pickups=state.pickups.filter(p=>p.x+p.r>-20&&!p.taken);
  state.shields=state.shields.filter(s=>s.x+s.r>-20&&!s.taken);
  state.beams=state.beams.filter(b=>b.x+b.w>-20);
  updateParticles();
  if(!state.running){updateStats();return}
  const hb=getHeroBounds();
  // Collision — beams (overhead)
  for(const b of state.beams){
    // The beam occupies: ceiling (0 to gapY), and gapY+gapH to gapY+gapH+beamH
    // Hero must stay in the gap zone
    const beamRight=b.x+b.w, beamLeft=b.x;
    if(hb.right>beamLeft&&hb.left<beamRight){
      // Beam is solid from y=0 down to beamBottomY.
      // Hero collides if any part of them is above beamBottomY while overlapping horizontally.
      const hitsBeam = hb.top < b.beamBottomY;
      if(hitsBeam){
        if(r.shieldActive){
          r.shieldActive=false;b.x=-9999;r.flash=22;
          playSFX('shield_break');spawnShieldBreakBurst(hb.cx,hb.cy);
          state.screenShake=10;updateShieldPill();return;
        }
        if(r.hitsLeft>0){
          r.hitsLeft--;r.flash=20;b.x=-9999;playSFX('hit');
          spawnHitBurst(hb.cx,hb.cy);state.screenShake=12;updateAbilityPill();return;
        }
        playSFX('lose');spawnHitBurst(hb.cx,hb.cy);state.screenShake=18;
        endRun('lose');
        return;
      }
    }
  }
  // Collision — obstacles
  for(const o of state.obstacles){
    if(hb.left<o.x+o.w&&hb.right>o.x&&hb.top<o.y+o.h&&hb.bottom>o.y){
      if(r.shieldActive){
        r.shieldActive=false;o.x=-9999;r.flash=22;
        playSFX('shield_break');
        spawnShieldBreakBurst(hb.cx,hb.cy);
        state.screenShake=10;
        updateShieldPill();
        return;
      }
      if(r.hitsLeft>0){
        r.hitsLeft--;r.flash=20;o.x=-9999;
        playSFX('hit');
        spawnHitBurst(hb.cx,hb.cy);
        state.screenShake=12;
        updateAbilityPill();
        return;
      }
      playSFX('lose');
      spawnHitBurst(hb.cx,hb.cy);
      state.screenShake=18;
      endRun('lose');
      return;
    }
  }
  // Collision — pickups
  for(const p of state.pickups){
    const dx=hb.cx-p.x,dy=hb.cy-p.y;
    if(Math.sqrt(dx*dx+dy*dy)<38){
      p.taken=true;
      triggerStarPop(state.stars); // pop the next pip before incrementing
      state.stars++;state.score+=25;
      playSFX('star');
      spawnStarBurst(p.x,p.y);
      if(state.stars>=15){endRun('win');return}
    }
  }
  // Collision — shield pickups
  for(const s of state.shields){
    if(s.taken) continue;
    const dx=hb.cx-s.x,dy=hb.cy-s.y;
    if(Math.sqrt(dx*dx+dy*dy)<46){
      s.taken=true;r.shieldActive=true;
      playSFX('shield_collect');
      spawnShieldBurst(s.x,s.y);
      updateShieldPill();
    }
  }
  updateStats();
  updateAbilityPill();
}

function drawProgressBar(){
  const stars = state.stars;

  // Layout constants
  const barH  = 34;          // pill height
  const pipR  = 7;           // star radius
  const gap   = 18;          // centre-to-centre
  const padH  = 10;          // horizontal inner padding each side
  const labelW = 44;         // width reserved for "⭐ 0/15" label on left

  // Total pill width: label + 15 pips + padding
  const pipsW  = (STAR_GOAL - 1) * gap + pipR * 2;  // 14*18 + 14 = 266
  const barW   = padH + labelW + padH + pipsW + padH; // 10+44+10+266+10 = 340
  const bx = 14, by = 14;
  const cy = by + barH / 2;

  // update pop timers
  for(let i = 0; i < STAR_GOAL; i++){
    if(starPop[i] > 0) starPop[i] = Math.max(0, starPop[i] - 0.08);
  }

  ctx.save();

  // Pill background
  ctx.beginPath();
  const rr = barH / 2;
  ctx.moveTo(bx + rr, by);
  ctx.arcTo(bx + barW, by, bx + barW, by + barH, rr);
  ctx.arcTo(bx + barW, by + barH, bx, by + barH, rr);
  ctx.arcTo(bx, by + barH, bx, by, rr);
  ctx.arcTo(bx, by, bx + barW, by, rr);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(12,77,115,0.13)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Left label: "⭐ 0/15"
  ctx.fillStyle = '#557089';
  ctx.font = '700 12px Nunito, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('⭐ ' + stars + '/' + STAR_GOAL, bx + padH, cy);

  // Thin divider
  const divX = bx + padH + labelW + padH / 2;
  ctx.strokeStyle = 'rgba(12,77,115,0.10)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(divX, by + 6);
  ctx.lineTo(divX, by + barH - 6);
  ctx.stroke();

  // 15 star pips — start after the label area
  const pipsStartX = bx + padH + labelW + padH + pipR;
  for(let i = 0; i < STAR_GOAL; i++){
    const cx = pipsStartX + i * gap;
    const filled = i < stars;
    const pop = starPop[i];
    const scale = 1 + pop * 0.5;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    if(filled){
      ctx.fillStyle = '#ffbf3c';
      ctx.strokeStyle = '#e89a00';
      ctx.lineWidth = 0.8;
      drawPip(ctx, 0, 0, pipR);
      ctx.fill();
      ctx.stroke();
      // shimmer highlight
      ctx.fillStyle = 'rgba(255,255,210,0.6)';
      drawPip(ctx, -0.5, -1.5, pipR * 0.42);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(175,210,230,0.55)';
      ctx.strokeStyle = 'rgba(100,155,195,0.45)';
      ctx.lineWidth = 1;
      drawPip(ctx, 0, 0, pipR);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawPip(g, ox, oy, r){
  const pts = 5;
  g.beginPath();
  for(let i = 0; i < pts; i++){
    const outer = r, inner = r * 0.42;
    const a = (Math.PI * 2 * i) / pts - Math.PI / 2;
    const a2 = a + Math.PI / pts;
    if(i === 0) g.moveTo(ox + Math.cos(a)*outer, oy + Math.sin(a)*outer);
    else        g.lineTo(ox + Math.cos(a)*outer, oy + Math.sin(a)*outer);
    g.lineTo(ox + Math.cos(a2)*inner, oy + Math.sin(a2)*inner);
  }
  g.closePath();
}

// Called when a star is collected — trigger pop for that pip
function triggerStarPop(index){
  if(index >= 0 && index < STAR_GOAL) starPop[index] = 1.0;
}

// ─── Background ──────────────────────────────────────────────────────────────
function bg(){
  if(state.level==='two'){bgLevel2();return;}
  ctx.clearRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#c8f2ff';
  ctx.beginPath();ctx.arc(560,88,48,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#fff';
  cloud(110,80,1.1);cloud(280,130,.9);cloud(530,150,1.15);
  for(let i=0;i<7;i++){const x=(i*118-(state.frame*.45))%820;planet((x+820)%820-60,65+(i%3)*28,9+(i%2)*5,i%2?'#7a5cff':'#00a8cc')}
  ctx.fillStyle='#7dd36d';ctx.fillRect(0,state.groundY,canvas.width,canvas.height-state.groundY);
  ctx.fillStyle='#58b64a';for(let i=0;i<canvas.width;i+=34)ctx.fillRect(i,state.groundY+26,18,42);
}
function bgLevel2(){
  // Deep space: dark gradient sky
  const skyGrad=ctx.createLinearGradient(0,0,0,canvas.height);
  skyGrad.addColorStop(0,'#080820');
  skyGrad.addColorStop(0.55,'#12103a');
  skyGrad.addColorStop(1,'#1a0e2e');
  ctx.fillStyle=skyGrad;
  ctx.fillRect(0,0,canvas.width,canvas.height);

  // Nebula blobs — slow parallax
  const t=state.frame;
  nebula(160+(t*.08)%820,130,130,90,'rgba(120,40,200,0.13)');
  nebula(490+(t*.05)%820,80,100,70,'rgba(0,160,200,0.11)');
  nebula(320+(t*.06)%820,200,80,60,'rgba(180,0,140,0.10)');

  // Twinkling stars — two parallax layers
  state.bgStars.forEach(s=>{
    const px=(s.x-state.frame*s.speed*0.4*(1+s.layer*0.5)+3000)%700;
    const tw=0.5+0.5*Math.sin(t*0.04+s.twinkle);
    ctx.globalAlpha=0.3+tw*(s.layer===2?0.7:0.5);
    ctx.fillStyle='#fff';
    ctx.beginPath();ctx.arc(px,s.y,s.r*(0.7+tw*0.35),0,Math.PI*2);ctx.fill();
  });
  ctx.globalAlpha=1;

  // Shooting star
  if(!state.shootingStar&&Math.random()<0.002){
    state.shootingStar={x:Math.random()*600+50,y:Math.random()*120+20,vx:-6-Math.random()*4,vy:2+Math.random()*3,life:1};
  }
  if(state.shootingStar){
    const ss=state.shootingStar;
    ctx.save();ctx.globalAlpha=ss.life;
    ctx.strokeStyle='rgba(255,255,220,0.95)';ctx.lineWidth=1.8;
    ctx.beginPath();ctx.moveTo(ss.x,ss.y);ctx.lineTo(ss.x-ss.vx*7,ss.y-ss.vy*7);ctx.stroke();
    ss.x+=ss.vx;ss.y+=ss.vy;ss.life-=0.045;
    ctx.restore();
    if(ss.life<=0) state.shootingStar=null;
  }

  // Distant glowing planets
  const p1x=((560-state.frame*0.12)+2000)%820-60;
  planetGlow(p1x,70,36,'#ff8c4a','#3a1200');
  const p2x=((220-state.frame*0.07)+2000)%820-60;
  planetGlow(p2x,55,22,'#4accff','#003050');

  // Asteroid field — faster parallax
  ctx.fillStyle='rgba(160,140,200,0.55)';
  for(let i=0;i<9;i++){
    const ax=((i*88+40-state.frame*(1.1+i*0.15)+3000)%760)-30;
    const ay=40+(i%5)*50;
    ctx.save();ctx.translate(ax,ay);ctx.rotate(state.frame*0.008*((i%3)-1));
    asteroid(0,0,i);ctx.restore();
  }

  // Ground: glowing metallic platform
  const gGrad=ctx.createLinearGradient(0,state.groundY,0,canvas.height);
  gGrad.addColorStop(0,'#2a1a50');
  gGrad.addColorStop(0.08,'#1a0e38');
  gGrad.addColorStop(1,'#0d0a22');
  ctx.fillStyle=gGrad;
  ctx.fillRect(0,state.groundY,canvas.width,canvas.height-state.groundY);
  // neon edge line
  ctx.strokeStyle='rgba(140,80,255,0.7)';ctx.lineWidth=2;
  ctx.beginPath();ctx.moveTo(0,state.groundY);ctx.lineTo(canvas.width,state.groundY);ctx.stroke();
  // grid lines on ground
  ctx.strokeStyle='rgba(100,60,180,0.25)';ctx.lineWidth=1;
  for(let i=0;i<canvas.width;i+=40){
    const gx=((i-state.frame*state.speed*0.5)+5000)%canvas.width;
    ctx.beginPath();ctx.moveTo(gx,state.groundY);ctx.lineTo(gx,canvas.height);ctx.stroke();
  }
}
function nebula(cx,cy,rx,ry,color){
  const g=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.max(rx,ry));
  g.addColorStop(0,color);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.save();ctx.scale(1,ry/rx);
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(cx,cy*rx/ry,rx,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function planetGlow(x,y,r,cInner,cOuter){
  const g=ctx.createRadialGradient(x,y,r*0.2,x,y,r*2.2);
  g.addColorStop(0,cInner);g.addColorStop(0.45,cInner);g.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*2.2,0,Math.PI*2);ctx.fill();
  ctx.fillStyle=cInner;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  // ring
  ctx.save();ctx.strokeStyle='rgba(255,255,255,0.28)';ctx.lineWidth=1.5;
  ctx.beginPath();ctx.ellipse(x,y,r*1.7,r*.42,-.25,0,Math.PI*2);ctx.stroke();
  // highlight
  ctx.fillStyle='rgba(255,255,255,0.22)';ctx.beginPath();ctx.ellipse(x-r*.28,y-r*.3,r*.28,r*.18,-.4,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function asteroid(x,y,shapeIdx){
  const shape=state.asteroidShapes[shapeIdx%state.asteroidShapes.length];
  ctx.beginPath();
  shape.forEach(([px,py],i)=>{ i===0?ctx.moveTo(x+px,y+py):ctx.lineTo(x+px,y+py); });
  ctx.closePath();
  ctx.fillStyle='rgba(130,110,170,0.7)';ctx.fill();
  ctx.strokeStyle='rgba(200,180,255,0.4)';ctx.lineWidth=1;ctx.stroke();
}
function bgLevel3(){
  const camX=state.l3.camX;
  // Dark volcanic sky
  const skyG=ctx.createLinearGradient(0,0,0,canvas.height);
  skyG.addColorStop(0,'#0d0205');
  skyG.addColorStop(0.5,'#2a0608');
  skyG.addColorStop(0.8,'#3d1008');
  skyG.addColorStop(1,'#5a1804');
  ctx.fillStyle=skyG; ctx.fillRect(0,0,canvas.width,canvas.height);

  // Distant mountains / volcano silhouettes — parallax 0.2x
  ctx.fillStyle='#1a0504';
  for(let i=0;i<5;i++){
    const mx=((i*280+60-camX*0.18)+4000)%1400-100;
    const mh=80+i%3*60;
    ctx.beginPath();ctx.moveTo(mx,canvas.height);ctx.lineTo(mx+80,canvas.height-mh);ctx.lineTo(mx+160,canvas.height);ctx.fill();
  }

  // Main volcano — world x=3060, fixed in world, parallax 0.5x
  const vx=3060-camX*0.5-camX*0.5;
  // Actually full parallax: volcano is a world landmark
  const vwx=3060-camX;
  drawVolcano(vwx,canvas.height);

  // Lava glow from below
  const lavaG=ctx.createLinearGradient(0,canvas.height-80,0,canvas.height);
  lavaG.addColorStop(0,'rgba(255,80,0,0)');
  lavaG.addColorStop(0.5,'rgba(255,80,10,0.18)');
  lavaG.addColorStop(1,'rgba(255,120,0,0.45)');
  ctx.fillStyle=lavaG; ctx.fillRect(0,0,canvas.width,canvas.height);

  // Floating embers
  const t=state.frame;
  for(let i=0;i<18;i++){
    const ex=((i*78+t*0.6*(1+(i%3)*.4))-camX*0.3+5000)%canvas.width;
    const ey=canvas.height-40-((t*0.9*(0.5+i%4*.3)+i*60)%(canvas.height-80));
    const alpha=0.3+0.4*Math.sin(t*0.07+i);
    ctx.fillStyle=`rgba(255,${100+i%5*20},0,${alpha.toFixed(2)})`;
    ctx.beginPath();ctx.arc(ex,ey,1.2+i%3*0.8,0,Math.PI*2);ctx.fill();
  }

  // Volcano smoke puffs
  state.l3.volcanoSmoke.forEach(s=>{
    const sx=s.x-camX;
    ctx.save();ctx.globalAlpha=s.life*0.5;
    ctx.fillStyle='rgba(80,30,20,0.7)';
    ctx.beginPath();ctx.arc(sx,s.y,s.size,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });

  // Lava at bottom — animated surface
  drawLava(camX);
}

function drawVolcano(vx,groundY){
  ctx.save();
  // Body
  ctx.fillStyle='#1a0504';
  ctx.beginPath();ctx.moveTo(vx,groundY);ctx.lineTo(vx-90,groundY-160);ctx.lineTo(vx-30,groundY-200);ctx.lineTo(vx+30,groundY-200);ctx.lineTo(vx+90,groundY-160);ctx.closePath();ctx.fill();
  // Rim glow
  ctx.strokeStyle='rgba(255,60,0,0.7)';ctx.lineWidth=3;
  ctx.beginPath();ctx.moveTo(vx-30,groundY-200);ctx.lineTo(vx+30,groundY-200);ctx.stroke();
  // Lava glow inside crater
  const cg=ctx.createRadialGradient(vx,groundY-195,2,vx,groundY-195,36);
  cg.addColorStop(0,'rgba(255,160,0,0.9)');cg.addColorStop(0.5,'rgba(255,60,0,0.5)');cg.addColorStop(1,'rgba(0,0,0,0)');
  ctx.fillStyle=cg;ctx.beginPath();ctx.arc(vx,groundY-195,36,0,Math.PI*2);ctx.fill();
  ctx.restore();
}

function drawLava(camX){
  const t=state.frame;
  const lavaY=canvas.height-52;
  // Wave surface
  ctx.save();
  ctx.beginPath();ctx.moveTo(0,lavaY);
  for(let x=0;x<=canvas.width;x+=8){
    const wave=Math.sin((x+camX*0.6+t*1.4)*0.035)*5+Math.sin((x+camX*0.4+t*0.9)*0.06)*3;
    ctx.lineTo(x,lavaY+wave);
  }
  ctx.lineTo(canvas.width,canvas.height);ctx.lineTo(0,canvas.height);ctx.closePath();
  const lavG=ctx.createLinearGradient(0,lavaY,0,canvas.height);
  lavG.addColorStop(0,'#ff6a00');lavG.addColorStop(0.15,'#ff3200');lavG.addColorStop(0.5,'#c01400');lavG.addColorStop(1,'#600800');
  ctx.fillStyle=lavG;ctx.fill();
  // Bright surface cracks
  ctx.strokeStyle=`rgba(255,${160+Math.sin(t*0.05)*40|0},0,0.85)`;ctx.lineWidth=2;
  for(let i=0;i<5;i++){
    const cx=((i*160+t*0.4)-camX*0.6+5000)%canvas.width;
    ctx.beginPath();ctx.moveTo(cx,lavaY+4);ctx.bezierCurveTo(cx+20,lavaY+12,cx+40,lavaY+8,cx+60,lavaY+4);ctx.stroke();
  }
  ctx.restore();
}

function drawLevel3World(){
  const camX=state.l3.camX;
  const r=state.robot;

  // Draw platforms
  state.l3.plats.forEach((p,i)=>{
    const px=p.x-camX;
    if(px>canvas.width+20||px+p.w<-20) return; // off screen
    // Platform body — dark rocky
    const pG=ctx.createLinearGradient(0,p.y,0,p.y+18);
    pG.addColorStop(0,'#5a3020');pG.addColorStop(0.4,'#3a1a0c');pG.addColorStop(1,'#200a04');
    ctx.fillStyle=pG;
    rrg(ctx,px,p.y,p.w,18,6,true);
    // Top glowing edge (lava-lit)
    const edgeAlpha=0.5+0.3*Math.sin(state.frame*0.04+i*0.8);
    ctx.fillStyle=`rgba(255,100,20,${edgeAlpha.toFixed(2)})`;
    ctx.fillRect(px+4,p.y,p.w-8,3);
    // Rock texture lines
    ctx.strokeStyle='rgba(100,50,20,0.5)';ctx.lineWidth=1;
    for(let rx=8;rx<p.w-8;rx+=22){
      ctx.beginPath();ctx.moveTo(px+rx,p.y+5);ctx.lineTo(px+rx+10,p.y+14);ctx.stroke();
    }
  });

  // Draw stars (world coords)
  state.l3.stars.forEach(s=>{
    if(s.taken) return;
    const sx=s.x-camX, sy=s.y;
    if(sx<-20||sx>canvas.width+20) return;
    const bob=Math.sin(state.frame*0.07+s.x*0.01)*4;
    ctx.save();ctx.translate(sx,sy+bob);
    // Glow
    const sg=ctx.createRadialGradient(0,0,0,0,0,22);
    sg.addColorStop(0,'rgba(255,210,50,0.6)');sg.addColorStop(1,'rgba(255,160,0,0)');
    ctx.fillStyle=sg;ctx.beginPath();ctx.arc(0,0,22,0,Math.PI*2);ctx.fill();
    // Star shape
    ctx.fillStyle='#ffbf3c';ctx.strokeStyle='#e89a00';ctx.lineWidth=1;
    drawPip(ctx,0,0,11);ctx.fill();ctx.stroke();
    ctx.fillStyle='rgba(255,255,200,0.7)';drawPip(ctx,-1,-2,4.5);ctx.fill();
    ctx.restore();
  });

  // Draw shields (world coords)
  state.shields.forEach(s=>{
    if(s.taken||!s.world) return;
    const sx=s.x-camX;
    if(sx<-30||sx>canvas.width+30) return;
    const spin=state.frame*0.06;
    ctx.save();ctx.translate(sx,s.y);ctx.rotate(spin);
    const sg2=ctx.createRadialGradient(0,0,0,0,0,s.r+8);
    sg2.addColorStop(0,'rgba(0,220,255,0.6)');sg2.addColorStop(1,'rgba(0,200,255,0)');
    ctx.fillStyle=sg2;ctx.beginPath();ctx.arc(0,0,s.r+8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='#00e5ff';ctx.strokeStyle='#ffffff';ctx.lineWidth=1.5;
    ctx.beginPath();
    for(let k=0;k<6;k++){const a=k*Math.PI/3;ctx.lineTo(Math.cos(a)*s.r,Math.sin(a)*s.r);}
    ctx.closePath();ctx.fill();ctx.stroke();
    ctx.restore();
  });

  // Draw hero — drawRobot applies camera offset via scrollCamX()
  drawRobot();
}

function cloud(x,y,s){ctx.save();ctx.translate(x,y);ctx.scale(s,s);ctx.beginPath();ctx.arc(0,0,18,Math.PI*.5,Math.PI*1.5);ctx.arc(18,-10,20,Math.PI,Math.PI*2);ctx.arc(44,0,18,Math.PI*1.5,Math.PI*.5);ctx.closePath();ctx.fill();ctx.restore()}
function planet(x,y,r,c){ctx.fillStyle=c;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.strokeStyle='rgba(255,255,255,.6)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,r+6,r*.45,-.2,0,Math.PI*2);ctx.stroke()}
function rr(x,y,w,h,r,f=true){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);f?ctx.fill():ctx.stroke()}

// ─── Hero Drawing ─────────────────────────────────────────────────────────────
// All hero drawing uses LOCAL coords (origin at 0,0), then the caller translates.
function drawHeroLocal(g, key){
  // Each hero fits roughly in a 52×52 box starting at (0,0)
  if(key==='astro'){
    g.fillStyle='#f7fbff'; rrg(g,4,4,44,40,10,true);
    g.fillStyle='#c7f2ff'; rrg(g,9,0,24,12,5,true);
    g.fillStyle='#17324a';
    g.beginPath();g.arc(18,16,3,0,Math.PI*2);g.arc(34,16,3,0,Math.PI*2);g.fill();
    g.strokeStyle='#00a8cc';g.lineWidth=3;
    g.beginPath();g.arc(26,24,7,.15,Math.PI-.15);g.stroke();
    g.strokeStyle='#7a5cff';g.lineWidth=3.5;
    g.beginPath();g.moveTo(10,40);g.lineTo(7,52);g.moveTo(42,40);g.lineTo(45,52);g.stroke();
    g.strokeStyle='#c7f2ff';g.lineWidth=2;
    g.beginPath();g.moveTo(4,28);g.lineTo(-4,32);g.moveTo(48,28);g.lineTo(56,32);g.stroke();
  } else if(key==='star'){
    g.fillStyle='#eb7b4d';
    g.beginPath();
    g.moveTo(26,0);g.quadraticCurveTo(42,6,42,22);g.lineTo(38,26);g.lineTo(40,38);g.lineTo(30,38);g.lineTo(30,26);g.lineTo(22,26);g.lineTo(22,38);g.lineTo(12,38);g.lineTo(14,26);g.lineTo(10,22);g.quadraticCurveTo(10,6,26,0);
    g.fill();
    g.fillStyle='#7f4d2e';g.fillRect(14,14,26,14);
    g.fillStyle='#17324a';
    g.beginPath();g.arc(20,20,3,0,Math.PI*2);g.arc(32,20,3,0,Math.PI*2);g.fill();
    g.strokeStyle='#ffd470';g.lineWidth=4;
    g.beginPath();g.moveTo(18,42);g.lineTo(14,52);g.moveTo(34,42);g.lineTo(38,52);g.stroke();
  } else if(key==='stitch'){
    g.fillStyle='#a26c3d';
    g.beginPath();g.ellipse(26,18,18,16,0,0,Math.PI*2);g.fill();
    g.fillRect(14,30,26,14);
    g.strokeStyle='#7a4f2d';g.lineWidth=2;
    for(let i=0;i<5;i++){g.beginPath();g.moveTo(14+i*5,22);g.lineTo(18+i*5,27);g.stroke()}
    g.fillStyle='#111';
    g.beginPath();g.arc(19,17,3.5,0,Math.PI*2);g.arc(33,17,3.5,0,Math.PI*2);g.fill();
    g.strokeStyle='#f7b0be';g.lineWidth=2.3;
    g.beginPath();g.arc(26,24,7,.2,Math.PI-.2);g.stroke();
    g.strokeStyle='#7a4f2d';g.lineWidth=4;
    g.beginPath();g.moveTo(18,44);g.lineTo(16,53);g.moveTo(34,44);g.lineTo(36,53);g.stroke();
  } else {
    // swift
    g.fillStyle='#f1b44c';
    g.beginPath();g.ellipse(26,20,18,18,0,0,Math.PI*2);g.fill();
    g.fillStyle='#c8830a';g.fillRect(14,30,26,12);
    g.fillStyle='#fff';
    g.beginPath();g.arc(19,18,4,0,Math.PI*2);g.arc(33,18,4,0,Math.PI*2);g.fill();
    g.fillStyle='#222';
    g.beginPath();g.arc(20,18,2.2,0,Math.PI*2);g.arc(34,18,2.2,0,Math.PI*2);g.fill();
    g.strokeStyle='#222';g.lineWidth=2.2;
    g.beginPath();g.arc(26,26,5,.1,Math.PI-.1);g.stroke();
    // lightning bolt detail
    g.fillStyle='#fff176';
    g.beginPath();g.moveTo(22,4);g.lineTo(18,14);g.lineTo(23,14);g.lineTo(19,24);g.lineTo(30,11);g.lineTo(24,11);g.lineTo(30,4);g.closePath();g.fill();
    g.strokeStyle='#f1b44c';g.lineWidth=4;
    g.beginPath();g.moveTo(18,44);g.lineTo(16,53);g.moveTo(34,44);g.lineTo(36,53);g.stroke();
  }
}

// Helper: rounded rect using a local graphics context (no external x,y)
function rrg(g,x,y,w,h,r,f=true){
  g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);
  f?g.fill():g.stroke();
}

// Draw hero at (x,y) on canvas ctx, scaled
function drawHeroAt(g,key,x,y,scale=1){
  g.save();
  g.translate(x,y);
  g.scale(scale,scale);
  drawHeroLocal(g,key);
  g.restore();
}

// Render hero preview icon into a container element (62×62).
// Uses a two-pass approach: draw to an oversized temp canvas first to get
// the true pixel extents (including stroke width), then fit into the icon.
function drawHeroIcon(el, key){
  // Pass 1 — draw at 2× scale on a generous canvas to get real pixel bounds
  const tmp = document.createElement('canvas');
  const S = 2; // oversample scale
  const OFF = 60; // offset so negative coords don’t get clipped
  tmp.width = 300; tmp.height = 300;
  const tg = tmp.getContext('2d');
  tg.save();
  tg.translate(OFF, OFF);
  tg.scale(S, S);
  drawHeroLocal(tg, key);
  tg.restore();
  const px = tg.getImageData(0, 0, 300, 300).data;
  let x0=300, y0=300, x1=0, y1=0;
  for (let y=0; y<300; y++) for (let x=0; x<300; x++) {
    if (px[(y*300+x)*4+3] > 6) {
      if (x<x0) x0=x; if (x>x1) x1=x;
      if (y<y0) y0=y; if (y>y1) y1=y;
    }
  }
  // Convert back to hero-local coords (undo S and OFF)
  const bx0=(x0-OFF)/S, by0=(y0-OFF)/S;
  const bw=(x1-x0)/S, bh=(y1-y0)/S;

  // Pass 2 — fit into the 62×62 icon with 5px padding
  const SIZE = 62, pad = 5, avail = SIZE - pad*2;
  const scale = Math.min(avail/bw, avail/bh);
  const ox = pad + (avail - bw*scale)/2 - bx0*scale;
  const oy = pad + (avail - bh*scale)/2 - by0*scale;

  const c = document.createElement('canvas');
  c.width = SIZE; c.height = SIZE;
  c.style.width = SIZE + 'px';
  c.style.height = SIZE + 'px';
  c.style.display = 'block';
  const g = c.getContext('2d');
  g.save();
  g.translate(ox, oy);
  g.scale(scale, scale);
  drawHeroLocal(g, key);
  g.restore();
  el.appendChild(c);
}

function drawDashTrail(){
  if(state.abilities.dashTrail<=0||state.hero!=='star') return;
  const hb=getHeroBounds();
  const cx=hb.cx-scrollCamX();
  const cy=hb.cy;
  const alpha=state.abilities.dashTrail/14;
  const dir=state.abilities.dashDir||1;
  ctx.save();
  ctx.globalAlpha=alpha*0.55;
  ctx.fillStyle='#7a5cff';
  ctx.beginPath();
  ctx.ellipse(cx-dir*18,cy,28,16,0,0,Math.PI*2);
  ctx.fill();
  ctx.restore();
}

function drawAstroFootLaser(){
  const r=state.robot;
  if(state.hero!=='astro'||r.footLaser<=0) return;
  const cam=scrollCamX();
  const footY=r.y+r.h-4;
  const feet=[r.x+14-cam, r.x+r.w-14-cam];
  const life=r.footLaser/28;
  const pulse=0.75+0.25*Math.sin(state.frame*0.55);
  const len=(42+18*pulse)*life;

  feet.forEach((fx, i) => {
    const wobble=Math.sin(state.frame*0.45+i*1.7)*2.5;
    ctx.save();
    const beam=ctx.createLinearGradient(fx, footY, fx+wobble, footY+len);
    beam.addColorStop(0, 'rgba(180,255,255,0.95)');
    beam.addColorStop(0.25, 'rgba(0,200,255,0.85)');
    beam.addColorStop(0.65, 'rgba(0,168,204,0.45)');
    beam.addColorStop(1, 'rgba(122,92,255,0)');
    ctx.strokeStyle=beam;
    ctx.lineWidth=6*pulse;
    ctx.lineCap='round';
    ctx.shadowColor='#00e5ff';
    ctx.shadowBlur=14*pulse;
    ctx.beginPath();
    ctx.moveTo(fx, footY);
    ctx.lineTo(fx+wobble, footY+len);
    ctx.stroke();
    ctx.lineWidth=2.5;
    ctx.strokeStyle='rgba(255,255,255,0.92)';
    ctx.shadowBlur=8;
    ctx.stroke();
    ctx.fillStyle='rgba(0,230,255,0.7)';
    ctx.beginPath();
    ctx.arc(fx, footY+2, 4*pulse, 0, Math.PI*2);
    ctx.fill();
    ctx.restore();
  });
}
function drawTimeBubbleOverlay(){
  if(state.abilities.bubbleActive<=0) return;
  const hb=getHeroBounds();
  const cx=hb.cx-scrollCamX();
  const cy=hb.cy;
  const pulse=0.12+0.06*Math.sin(state.frame*0.14);
  ctx.save();
  ctx.fillStyle=`rgba(120,180,255,${pulse})`;
  ctx.fillRect(0,0,canvas.width,canvas.height);
  const rad=58+6*Math.sin(state.frame*0.1);
  const g=ctx.createRadialGradient(cx,cy,8,cx,cy,rad);
  g.addColorStop(0,'rgba(200,230,255,0.35)');
  g.addColorStop(1,'rgba(120,180,255,0)');
  ctx.fillStyle=g;
  ctx.beginPath();ctx.arc(cx,cy,rad,0,Math.PI*2);ctx.fill();
  ctx.restore();
}
function drawShieldGlow(){
  const r=state.robot;
  if(!r.shieldActive) return;
  const hb=getHeroBounds();
  const cx=hb.cx-scrollCamX(),cy=hb.cy;
  const pulse=0.78+0.22*Math.sin(state.frame*0.18);
  const radius=40*pulse;
  const grad=ctx.createRadialGradient(cx,cy,16,cx,cy,radius+12);
  grad.addColorStop(0,'rgba(0,220,255,0.32)');
  grad.addColorStop(0.5,'rgba(0,180,255,0.15)');
  grad.addColorStop(1,'rgba(0,180,255,0)');
  ctx.save();
  ctx.beginPath();ctx.arc(cx,cy,radius+12,0,Math.PI*2);
  ctx.fillStyle=grad;ctx.fill();
  ctx.beginPath();ctx.arc(cx,cy,radius,0,Math.PI*2);
  ctx.strokeStyle=`rgba(0,230,255,${0.5+0.38*Math.sin(state.frame*0.18)})`;
  ctx.lineWidth=3;ctx.stroke();
  ctx.beginPath();ctx.arc(cx,cy-5,radius-7,-Math.PI*0.65,-Math.PI*0.1);
  ctx.strokeStyle='rgba(255,255,255,0.5)';ctx.lineWidth=2;ctx.stroke();
  ctx.restore();
}
function drawRobot(){
  const r=state.robot;
  const hb=getHeroBounds();
  drawAstroFootLaser();
  drawShieldGlow();
  ctx.save();
  ctx.translate(hb.cx-scrollCamX(),hb.cy);
  const squash=r.squash>0?1+r.squash/60:1, stretch=r.squash>0?1-r.squash/90:1;
  ctx.scale(stretch,squash);
  ctx.translate(-(r.w/2),-(r.h/2));
  if(r.flash>0&&r.flash%6<3) ctx.globalAlpha=.45;
  drawHeroLocal(ctx,state.hero);
  ctx.restore();
}

function drawObstacles(){
  state.obstacles.forEach(o=>{
    if(o.moving){
      // Level 2 moving block: dark purple with neon outline + glow
      const grd=ctx.createLinearGradient(o.x,o.y,o.x,o.y+o.h);
      grd.addColorStop(0,'#3d1f80');grd.addColorStop(1,'#1a0a40');
      ctx.fillStyle=grd; rrg(ctx,o.x,o.y,o.w,o.h,10,true);
      // neon border
      ctx.strokeStyle=`rgba(180,100,255,${0.7+0.3*Math.sin(state.frame*0.12+o.phase)})`; ctx.lineWidth=2.5;
      rrg(ctx,o.x,o.y,o.w,o.h,10,false);
      // highlight bar
      ctx.fillStyle='rgba(200,160,255,0.25)'; rrg(ctx,o.x+5,o.y+6,o.w-10,8,4,true);
      // hazard stripes
      ctx.save();ctx.beginPath();rrg(ctx,o.x,o.y,o.w,o.h,10,false);ctx.clip();
      ctx.strokeStyle='rgba(255,80,80,0.22)';ctx.lineWidth=5;
      for(let s=-o.h;s<o.w+o.h;s+=18){ctx.beginPath();ctx.moveTo(o.x+s,o.y);ctx.lineTo(o.x+s+o.h,o.y+o.h);ctx.stroke();}
      ctx.restore();
    } else {
      ctx.fillStyle='#7a5cff'; rrg(ctx,o.x,o.y,o.w,o.h,10,true);
      ctx.fillStyle='#9c85ff'; rrg(ctx,o.x+6,o.y+8,o.w-12,10,6,true);
    }
  });
}
function drawBeams(){
  state.beams.forEach(b=>{
    const slabH = b.beamBottomY; // from y=0 down to beamBottomY
    ctx.save();

    // Side glow / fade-in at edges
    const glow=ctx.createLinearGradient(b.x,0,b.x+b.w,0);
    glow.addColorStop(0,'rgba(255,60,60,0)');
    glow.addColorStop(0.15,'rgba(255,40,60,0.22)');
    glow.addColorStop(0.85,'rgba(255,40,60,0.22)');
    glow.addColorStop(1,'rgba(255,60,60,0)');
    ctx.fillStyle=glow;
    ctx.fillRect(b.x,0,b.w,slabH+10);

    // Main solid beam from ceiling to beamBottomY
    const beamGrd=ctx.createLinearGradient(0,0,0,slabH);
    beamGrd.addColorStop(0,'#1a0808');
    beamGrd.addColorStop(0.7,'#3a1010');
    beamGrd.addColorStop(1,'#5a1a1a');
    ctx.fillStyle=beamGrd;
    ctx.fillRect(b.x, 0, b.w, slabH);

    // Glowing danger stripe on bottom edge
    ctx.fillStyle='rgba(255,50,50,0.95)';
    ctx.fillRect(b.x, slabH-5, b.w, 5);
    // extra glow below stripe
    const edgeGlow=ctx.createLinearGradient(0,slabH,0,slabH+18);
    edgeGlow.addColorStop(0,'rgba(255,80,50,0.55)');
    edgeGlow.addColorStop(1,'rgba(255,60,40,0)');
    ctx.fillStyle=edgeGlow;
    ctx.fillRect(b.x, slabH, b.w, 18);

    // Warning chevrons pointing down toward the gap
    ctx.strokeStyle='rgba(255,210,50,0.75)';ctx.lineWidth=2;
    for(let cx=b.x+18;cx<b.x+b.w-10;cx+=32){
      ctx.beginPath();
      ctx.moveTo(cx,    slabH-22);
      ctx.lineTo(cx+10, slabH-10);
      ctx.lineTo(cx+20, slabH-22);
      ctx.stroke();
    }

    // Interior panel lines (tech look)
    ctx.strokeStyle='rgba(120,40,40,0.45)';ctx.lineWidth=1;
    for(let py=20;py<slabH-10;py+=22){
      ctx.beginPath();ctx.moveTo(b.x+4,py);ctx.lineTo(b.x+b.w-4,py);ctx.stroke();
    }

    // Label in the gap below beam
    const gapMidY = b.beamBottomY + (state.groundY - b.beamBottomY)/2;
    ctx.fillStyle='rgba(255,180,180,0.7)';
    ctx.font='bold 10px Nunito,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(t('hint.duckCanvas'), b.x+b.w/2, gapMidY);

    ctx.restore();
  });
}
function drawPickups(){
  state.pickups.forEach(p=>{
    ctx.save();ctx.translate(p.x,p.y);ctx.rotate(state.frame/40);
    ctx.fillStyle='#ffbf3c';
    ctx.beginPath();
    for(let i=0;i<5;i++){
      const outer=p.r,inner=p.r*.45,a=(Math.PI*2*i)/5-Math.PI/2,a2=a+Math.PI/5;
      if(i===0)ctx.moveTo(Math.cos(a)*outer,Math.sin(a)*outer);
      else ctx.lineTo(Math.cos(a)*outer,Math.sin(a)*outer);
      ctx.lineTo(Math.cos(a2)*inner,Math.sin(a2)*inner);
    }
    ctx.closePath();ctx.fill();
    ctx.restore();
  });
}
function drawShields(){
  state.shields.forEach(s=>{
    ctx.save();ctx.translate(s.x,s.y);
    const pulse=0.82+0.18*Math.sin(state.frame*0.14);
    // glow halo
    const glowGrad=ctx.createRadialGradient(0,0,8,0,0,s.r*1.9*pulse);
    glowGrad.addColorStop(0,'rgba(0,220,255,0.42)');glowGrad.addColorStop(1,'rgba(0,180,255,0)');
    ctx.beginPath();ctx.arc(0,0,s.r*1.9*pulse,0,Math.PI*2);ctx.fillStyle=glowGrad;ctx.fill();
    // spinning hexagon
    ctx.beginPath();
    for(let i=0;i<6;i++){
      const a=(Math.PI/3)*i+state.frame*0.015;
      i===0?ctx.moveTo(Math.cos(a)*s.r,Math.sin(a)*s.r):ctx.lineTo(Math.cos(a)*s.r,Math.sin(a)*s.r);
    }
    ctx.closePath();
    ctx.fillStyle='rgba(0,210,255,0.18)';ctx.fill();
    ctx.strokeStyle='#00e5ff';ctx.lineWidth=2.5;ctx.stroke();
    // kite shield icon
    ctx.fillStyle='rgba(0,230,255,0.92)';
    ctx.beginPath();
    ctx.moveTo(0,-7);ctx.lineTo(6,-2);ctx.lineTo(6,3);ctx.lineTo(0,9);ctx.lineTo(-6,3);ctx.lineTo(-6,-2);
    ctx.closePath();ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.65)';
    ctx.beginPath();ctx.arc(0,-2,1.8,0,Math.PI*2);ctx.fill();
    ctx.restore();
  });
}
function drawConfetti(){
  state.confetti.forEach(c=>{ctx.fillStyle=c.color;ctx.fillRect(c.x,c.y,c.size,c.size*.6)});
}

// ─── Render ───────────────────────────────────────────────────────────────────
function renderLevel3(){
  ctx.save();
  if(state.screenShake>0&&!state.reducedMotion){const s=state.screenShake;ctx.translate((Math.random()-.5)*s,(Math.random()-.5)*s*0.5);}
  bgLevel3();
  drawLevel3World();
  drawDashTrail();
  drawParticles(ctx);
  drawConfetti();
  drawProgressBar();
  drawTimeBubbleOverlay();
  ctx.restore();
}

function render(){
  if(state.level==='three'){renderLevel3();return;}
  if(state.level==='four'){renderLevel4(state,ctx,canvas,l4Deps());return;}
  if(state.level==='five'){renderLevel5(state,ctx,canvas,l5Deps());return;}
  if(state.screenShake>0&&!state.reducedMotion){
    const s=state.screenShake;
    ctx.save();
    ctx.translate((Math.random()-.5)*s*.6,(Math.random()-.5)*s*.4);
  }
  bg();
  drawBeams();
  drawShields();
  drawPickups();
  drawObstacles();
  drawDashTrail();
  drawRobot();
  drawParticles(ctx);
  drawConfetti();
  drawProgressBar();
  drawTimeBubbleOverlay();
  if(state.screenShake>0) ctx.restore();
}
function loop(){tickEndCelebration();update();render();requestAnimationFrame(loop);}

function updateStats(){
  if(scoreStat) scoreStat.textContent=state.score;
  if(starsStat) starsStat.textContent=state.stars;
  if(bestStat) bestStat.textContent=state.best;
  if(speedStat) speedStat.textContent=state.speed.toFixed(1);
}
let duckHintTimer=0;
function showDuckHint(){
  duckHint.classList.add('show');
  clearTimeout(duckHintTimer);
  duckHintTimer=setTimeout(()=>duckHint.classList.remove('show'),2200);
}



function updatePauseBtn() {
  if (!pauseBtn) return;
  pauseBtn.hidden = !state.running;
}

function updateTouchPad() {
  if (!touchPad) return;
  const show = isPlatformLevel();
  touchPad.hidden = !show;
  if (keyHint) keyHint.style.display = show && !('ontouchstart' in window) ? 'block' : 'none';
  updateTouchAbilityBtn();
}

function togglePause() {
  if (!state.running || overlay.classList.contains('hidden') === false) return;
  state.paused = !state.paused;
  if (state.paused) {
    pauseOverlay?.classList.remove('hidden');
    statusPill.textContent = t('hud.pause');
  } else {
    pauseOverlay?.classList.add('hidden');
    statusPill.textContent = t('hud.playing');
  }
}

function resumeGame() {
  state.paused = false;
  pauseOverlay?.classList.add('hidden');
  if (state.running) statusPill.textContent = t('hud.playing');
}

function showLvl3HintIfNeeded() {
  if (state.level !== 'three' || loadHintFlag('lvl3')) return;
  lvl3Hint?.classList.add('show');
  setHintFlag('lvl3');
  setTimeout(() => lvl3Hint?.classList.remove('show'), 4000);
}

function showLvl4HintIfNeeded() {
  if (state.level !== 'four' || loadHintFlag('lvl4ice')) return;
  lvl4Hint?.classList.add('show');
  setHintFlag('lvl4ice');
  setTimeout(() => lvl4Hint?.classList.remove('show'), 5000);
}
function showLvl5HintIfNeeded() {
  if (state.level !== 'five' || loadHintFlag('lvl5')) return;
  lvl5Hint?.classList.add('show');
  setHintFlag('lvl5');
  setTimeout(() => lvl5Hint?.classList.remove('show'), 5000);
}

function bindTouchHold(btn, key) {
  if (!btn) return;
  const down = (e) => { e.preventDefault(); state.keys[key] = true; };
  const up = (e) => { e.preventDefault(); state.keys[key] = false; };
  btn.addEventListener('pointerdown', down);
  btn.addEventListener('pointerup', up);
  btn.addEventListener('pointerleave', up);
  btn.addEventListener('pointercancel', up);
}

function bindEvents() {
  let lastTap=0;
  const handlePrimaryTap=()=>{
    const now=Date.now();
    if(now-lastTap<320){useHeroAbility();lastTap=0;return;}
    lastTap=now;
    jump();
  };
  document.addEventListener('keydown', e => {
    if (e.code === 'Escape') { e.preventDefault(); togglePause(); return; }
    if (state.paused && e.code !== 'Escape') return;
    if (isAbilityKey(e) && !e.repeat) { e.preventDefault(); useHeroAbility(); return; }
    if (e.code === 'Enter' && !e.repeat) {
      e.preventDefault();
      if (!state.running && canRestart() && overlay && !overlay.classList.contains('hidden')) startGame();
      return;
    }
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { state.keys.left = true; e.preventDefault(); return; }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { state.keys.right = true; e.preventDefault(); return; }
    if (['Space', 'ArrowUp'].includes(e.code)) {
      e.preventDefault();
      if (!state.running && !canRestart()) return;
      jump();
    }
  });
  document.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') { state.keys.left = false; return; }
    if (e.code === 'ArrowRight' || e.code === 'KeyD') { state.keys.right = false; return; }
  });
  canvas.addEventListener('pointerdown', (e) => {
    if (state.level !== 'three' && state.level !== 'four' && state.level !== 'five') handlePrimaryTap();
  });
  startBtn?.addEventListener('click', startGame);
  restartBtn?.addEventListener('click', resetGame);
  overlayStart?.addEventListener('click', startGame);
  easyBtn?.addEventListener('click', () => setDifficulty('easy'));
  hardBtn?.addEventListener('click', () => setDifficulty('hard'));
  lvl1Btn?.addEventListener('click', () => setLevel('one'));
  lvl2Btn?.addEventListener('click', () => setLevel('two'));
  lvl3Btn?.addEventListener('click', () => setLevel('three'));
  lvl4Btn?.addEventListener('click', () => setLevel('four'));
  lvl5Btn?.addEventListener('click', () => setLevel('five'));
  heroCards.forEach(c => c.addEventListener('click', () => setHero(c.dataset.hero)));
  muteBtn?.addEventListener('click', () => {
    const m = toggleMuted();
    muteBtn.textContent = m ? '🔇' : '🔊';
  });
  pauseBtn?.addEventListener('click', togglePause);
  pauseResume?.addEventListener('click', resumeGame);
  pauseRestart?.addEventListener('click', () => { state.paused = false; pauseOverlay?.classList.add('hidden'); resetGame(); });
  bindTouchHold(dom.touchLeft, 'left');
  bindTouchHold(dom.touchRight, 'right');
  dom.touchJump?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (isPlatformLevel()) jump();
    else handlePrimaryTap();
  });
  dom.touchAbility?.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    useHeroAbility();
  });
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => setLocale(btn.dataset.lang));
  });
  window.addEventListener('astro-locale-change', refreshGameI18n);
}



export function initGame(elements) {
  dom = elements;
  canvas = elements.canvas;
  ctx = canvas.getContext('2d');
  overlay = elements.overlay;
  scoreStat = elements.scoreStat;
  starsStat = elements.starsStat;
  bestStat = elements.bestStat;
  speedStat = elements.speedStat;
  statusPill = elements.statusPill;
  difficultyPill = elements.difficultyPill;
  heroPill = elements.heroPill;
  startBtn = elements.startBtn;
  restartBtn = elements.restartBtn;
  overlayStart = elements.overlayStart;
  easyBtn = elements.easyBtn;
  hardBtn = elements.hardBtn;
  lvl1Btn = elements.lvl1Btn;
  lvl2Btn = elements.lvl2Btn;
  lvl3Btn = elements.lvl3Btn;
  lvl4Btn = elements.lvl4Btn;
  lvl5Btn = elements.lvl5Btn;
  duckHint = elements.duckHint;
  muteBtn = elements.muteBtn;
  shieldPill = elements.shieldPill;
  keyHint = elements.keyHint;
  touchPad = elements.touchPad;
  touchAbility = elements.touchAbility;
  pauseBtn = elements.pauseBtn;
  pauseOverlay = elements.pauseOverlay;
  pauseResume = elements.pauseResume;
  pauseRestart = elements.pauseRestart;
  lvl3Hint = elements.lvl3Hint;
  lvl4Hint = elements.lvl4Hint;
  lvl5Hint = elements.lvl5Hint;
  heroCards = [...elements.heroCards];
  previews = elements.previews;
  abilityPill = elements.abilityPill;

  // Expose controls immediately so onclick handlers work even if later init steps fail
  window.startAstroGame = startGame;
  window.resetAstroGame = resetGame;
  window.resumeAstroGame = resumeGame;

  const scores = loadScores();
  state.best = scores.best;
  state.bestByLevel = scores.bestByLevel;

  bindEvents();
  loadLocale();
  refreshGameI18n();
  try {
    Object.entries(previews).forEach(([k, el]) => { if (el) drawHeroIcon(el, k); });
  } catch (err) {
    console.warn('Hero preview icons skipped:', err);
  }
  try {
    resetGame();
    updateShieldPill();
    updateTouchPad();
  } catch (err) {
    console.error('Astro Buddy Jump reset failed:', err);
  }
  requestAnimationFrame(loop);
}
