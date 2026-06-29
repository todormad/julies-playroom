let audioCtx = null;
let muted = false;

function getAudio() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

export function playSFX(type){
  if(muted) return;
  try{
    const ac=getAudio(), now=ac.currentTime;
    const osc=ac.createOscillator(), gain=ac.createGain();
    osc.connect(gain); gain.connect(ac.destination);
    if(type==='jump'){
      osc.type='sine'; osc.frequency.setValueAtTime(320,now); osc.frequency.exponentialRampToValueAtTime(560,now+0.12);
      gain.gain.setValueAtTime(0.28,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.18);
      osc.start(now); osc.stop(now+0.18);
    } else if(type==='dbl_jump'){
      osc.type='sine'; osc.frequency.setValueAtTime(480,now); osc.frequency.exponentialRampToValueAtTime(800,now+0.1);
      gain.gain.setValueAtTime(0.22,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.14);
      osc.start(now); osc.stop(now+0.14);
    } else if(type==='star'){
      // bright two-tone pickup
      const o2=ac.createOscillator(), g2=ac.createGain();
      o2.connect(g2); g2.connect(ac.destination);
      osc.type='triangle'; osc.frequency.setValueAtTime(880,now); osc.frequency.exponentialRampToValueAtTime(1320,now+0.08);
      gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.18);
      osc.start(now); osc.stop(now+0.18);
      o2.type='sine'; o2.frequency.setValueAtTime(1100,now+0.06); o2.frequency.exponentialRampToValueAtTime(1760,now+0.18);
      g2.gain.setValueAtTime(0,now+0.06); g2.gain.setValueAtTime(0.2,now+0.08); g2.gain.exponentialRampToValueAtTime(0.001,now+0.22);
      o2.start(now+0.06); o2.stop(now+0.22);
    } else if(type==='hit'){
      osc.type='sawtooth'; osc.frequency.setValueAtTime(180,now); osc.frequency.exponentialRampToValueAtTime(60,now+0.22);
      gain.gain.setValueAtTime(0.35,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.25);
      osc.start(now); osc.stop(now+0.25);
    } else if(type==='win'){
      // ascending fanfare
      const notes=[523,659,784,1047], dur=0.12;
      notes.forEach((freq,i)=>{
        const o=ac.createOscillator(), g=ac.createGain();
        o.connect(g); g.connect(ac.destination);
        o.type='triangle'; o.frequency.value=freq;
        const t=now+i*dur;
        g.gain.setValueAtTime(0.25,t); g.gain.exponentialRampToValueAtTime(0.001,t+dur+0.05);
        o.start(t); o.stop(t+dur+0.06);
      });
    } else if(type==='shield_collect'){
      const o2=ac.createOscillator(),g2=ac.createGain();
      o2.connect(g2);g2.connect(ac.destination);
      osc.type='sine';osc.frequency.setValueAtTime(220,now);osc.frequency.exponentialRampToValueAtTime(440,now+0.2);
      gain.gain.setValueAtTime(0.28,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.35);
      osc.start(now);osc.stop(now+0.35);
      o2.type='triangle';o2.frequency.setValueAtTime(660,now+0.05);o2.frequency.exponentialRampToValueAtTime(880,now+0.25);
      g2.gain.setValueAtTime(0,now+0.05);g2.gain.setValueAtTime(0.22,now+0.08);g2.gain.exponentialRampToValueAtTime(0.001,now+0.4);
      o2.start(now+0.05);o2.stop(now+0.4);
    } else if(type==='shield_break'){
      osc.type='triangle';osc.frequency.setValueAtTime(600,now);osc.frequency.exponentialRampToValueAtTime(120,now+0.4);
      gain.gain.setValueAtTime(0.35,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.45);
      osc.start(now);osc.stop(now+0.45);
    } else if(type==='lose'){
      osc.type='sawtooth'; osc.frequency.setValueAtTime(300,now); osc.frequency.exponentialRampToValueAtTime(80,now+0.5);
      gain.gain.setValueAtTime(0.3,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.5);
      osc.start(now); osc.stop(now+0.5);
    } else if(type==='lava_death'){
      osc.type='sawtooth';osc.frequency.setValueAtTime(180,now);osc.frequency.exponentialRampToValueAtTime(40,now+0.7);
      gain.gain.setValueAtTime(0.4,now);gain.gain.exponentialRampToValueAtTime(0.001,now+0.75);
      osc.start(now);osc.stop(now+0.75);
    } else if(type==='beam_warn'){
      osc.type='square'; osc.frequency.setValueAtTime(220,now); osc.frequency.setValueAtTime(180,now+0.06);
      gain.gain.setValueAtTime(0.18,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.14);
      osc.start(now); osc.stop(now+0.14);
    } else if(type==='dash'){
      osc.type='triangle'; osc.frequency.setValueAtTime(420,now); osc.frequency.exponentialRampToValueAtTime(920,now+0.08);
      gain.gain.setValueAtTime(0.24,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.12);
      osc.start(now); osc.stop(now+0.12);
    } else if(type==='time_bubble'){
      const o2=ac.createOscillator(), g2=ac.createGain();
      o2.connect(g2); g2.connect(ac.destination);
      osc.type='sine'; osc.frequency.setValueAtTime(520,now); osc.frequency.exponentialRampToValueAtTime(260,now+0.35);
      gain.gain.setValueAtTime(0.22,now); gain.gain.exponentialRampToValueAtTime(0.001,now+0.4);
      osc.start(now); osc.stop(now+0.4);
      o2.type='triangle'; o2.frequency.setValueAtTime(780,now+0.05); o2.frequency.exponentialRampToValueAtTime(390,now+0.45);
      g2.gain.setValueAtTime(0,now+0.05); g2.gain.setValueAtTime(0.16,now+0.08); g2.gain.exponentialRampToValueAtTime(0.001,now+0.5);
      o2.start(now+0.05); o2.stop(now+0.5);
    }
  }catch(e){}
}
export function isMuted() { return muted; }
export function setMuted(v) { muted = v; }
export function toggleMuted() { muted = !muted; return muted; }
