// Web Speech voiceover, carried over from The Water Planet (iOS priming, Chrome
// cancel/speak race, stalled-utterance watchdog). Candidate for a shared module.

let speakSeq = 0;
let primePending = false;
let speechPrimed = false;
let voicesHooked = false;
let lastCancelAt = -9999;
let enabled = true;

export function setSpeechEnabled(on) {
  enabled = on;
  if (!on) stopSpeech();
}

function doCancel() {
  lastCancelAt = performance.now();
  speechSynthesis.cancel();
}

function pickVoice(vlang) {
  const voices = speechSynthesis.getVoices();
  const want = String(vlang || 'en').toLowerCase();
  return voices.find((v) => v.lang.toLowerCase().startsWith(want))
    || voices.find((v) => v.lang.toLowerCase().startsWith('en'))
    || voices[0]
    || null;
}

export function speak(text, vlang) {
  if (!enabled || !window.speechSynthesis || text == null || text === '') return;
  warmVoices();
  const id = ++speakSeq;
  const say = (attempt) => {
    if (id !== speakSeq) return;
    const u = new SpeechSynthesisUtterance(String(text));
    const pref = pickVoice(vlang);
    if (pref) {
      u.voice = pref;
      u.lang = pref.lang;
    } else {
      u.lang = vlang;
    }
    u.rate = 0.85;
    u.pitch = 1.1;
    let started = false;
    u.onstart = () => { started = true; };
    speechSynthesis.speak(u);
    speechSynthesis.resume();
    if (attempt < 2) {
      setTimeout(() => {
        if (id !== speakSeq || started) return;
        doCancel();
        setTimeout(() => {
          if (id === speakSeq && !started) {
            speechSynthesis.resume();
            say(attempt + 1);
          }
        }, 150);
      }, 1000 + attempt * 500);
    }
  };
  const kick = () => {
    if (id !== speakSeq) return;
    const since = performance.now() - lastCancelAt;
    if (since < 80) { setTimeout(kick, 90 - since); return; }
    say(0);
  };
  if (primePending) say(0);
  else if (speechSynthesis.speaking || speechSynthesis.pending) {
    doCancel();
    setTimeout(kick, 90);
  } else kick();
}

export function stopSpeech() {
  if (window.speechSynthesis) {
    speakSeq++;
    lastCancelAt = performance.now();
    speechSynthesis.cancel();
  }
}

export function warmVoices() {
  if (!window.speechSynthesis) return;
  speechSynthesis.getVoices();
  if (voicesHooked) return;
  voicesHooked = true;
  speechSynthesis.addEventListener('voiceschanged', () => speechSynthesis.getVoices());
}

export function primeSpeech() {
  if (speechPrimed || !window.speechSynthesis) return;
  speechPrimed = true;
  warmVoices();
  try {
    const u = new SpeechSynthesisUtterance(' ');
    u.volume = 0;
    primePending = true;
    const done = () => { primePending = false; };
    u.onend = done; u.onerror = done;
    setTimeout(done, 400);
    speechSynthesis.speak(u);
  } catch { primePending = false; }
}
