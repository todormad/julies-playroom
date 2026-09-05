export const LANGS = [
  { code: 'bg', label: '🇧🇬 БГ' },
  { code: 'en', label: '🇬🇧 EN' },
  { code: 'fr', label: '🇫🇷 FR' },
];

export let lang = 'bg';

const STRINGS = {
  bg: {
    title_line1: 'ASTRO BUDDY',
    title_line2: 'ВОДНАТА ПЛАНЕТА',
    btn_newgame: 'НОВА ИГРА',
    controls: 'Стрелки — движение    SPACE — говори / меч    X — лък    C — робот',
    dialog_prev: '‹ Назад', dialog_next: 'Напред ›', dialog_close: 'Затвори ✕', dialog_repeat: '↺',
    voice_lang: 'bg',
    radio_name: 'Робот (радио)',
    lvl1_name: 'Ниво 1 — Океанът',
    lvl2_name: 'Ниво 2 — Островът',
    lvl3_name: 'Ниво 3 — Излитане',
    h1_0: 'Събери 5 части край отломките!',
    h1_1: 'Повикай Робота (C) да вдигне камъка!',
    h1_2: 'Внимавай с рибите! Намери крилото!',
    h1_3: 'Стреляй буквите: А-С-Т-Р-О',
    h1_4: 'Роботът да отвори течението на юг!',
    h1_5: 'Влез във водовъртежа на север!',
    h2_0: 'Говори с водача на костенурките!',
    h2_1: (n) => `Събери ${n} кокос${n === 1 ? '' : 'а'}!`,
    h2_2: 'Върни кокосите на водача!',
    h2_3: 'Намери още части. Роботът помага!',
    h2_4: 'Стреляй буквите на храма: Д-О-М',
    h2_5: 'Вземи корпуса от храма!',
    h2_6: 'При отломките: SPACE за ремонт!',
    h3_0: 'Заобикаляй ракетите или ги стреляй!',
    npc_chief: 'Водач Костенурка',
    npc_hermit: 'Отшелник Раче',
    chief_q0: ['Здравей, Астро!', 'Корабът ви падна в морето.', 'Ние пазим кокосите.', 'Донеси ми три кокоса!', 'После ще ти помогна.'],
    chief_q1: ['Още кокоси, моля!', 'Гледай в зелената гора на север.'],
    chief_q2: ['Браво! Три кокоса!', 'Ето ти плоча за корпуса.', 'Още части има в джунглата.', 'Роботът може да вдига палми.'],
    chief_done: ['Храмът е на изток.', 'Стреляй буквите ДОМ!'],
    hermit_early: ['Псс... първо говори с водача!'],
    hermit_gift: ['Ти си добър гост.', 'Ето кристал за навигация!', 'Пази се от старите дронове.'],
    hermit_done: ['Лек път към звездите!'],
    r_crash: 'Астро! Удариха ни! Падаме в океана!',
    r_l1_start: 'Пет части са в океана. Аз съм до теб!',
    r_l1_engine: 'Двигателят! Четири части още!',
    r_l1_lift: 'Голям камък! Натисни C — ще го вдигна!',
    r_l1_antenna: 'Антената е наша! Супер!',
    r_l1_fish: 'Големи риби! Меч или харпун!',
    r_l1_letters: 'Стреляй буквите по ред: А, С, Т, Р, О!',
    r_l1_wrong: 'Грешна буква! Започвай пак от А.',
    r_l1_gate: 'Портата е отворена! Батерията е вътре!',
    r_l1_valve: 'Вентил! Натисни C до камъка на юг!',
    r_l1_all: 'Пет части! Водовъртежът на север е отворен!',
    r_l2_start: 'Остров! Говори с костенурките.',
    r_l2_coconuts: 'Три кокоса в гората на север!',
    r_l2_palm: 'Паднала палма! Натисни C — ще я вдигна!',
    r_l2_crabs: 'Раци на плажа! Пази се!',
    r_l2_temple: 'Храмът! Стреляй Д, О, М по ред.',
    r_l2_wrong: 'Грешна буква! Започвай пак от Д.',
    r_l2_hull: 'Корпусът! Сега към отломките за ремонт!',
    r_l2_repair: 'Държа корпуса. Натисни SPACE!',
    r_l3_start: 'Излитаме! Стреляй ракетите или ги заобикаляй!',
    r_idle: 'Астро, виж съобщението долу на екрана!',
    speak_part: (n) => n > 0 ? `Част! Още ${n}!` : 'Всички части тук!',
    speak_repair: 'Три... две... едно... Готово!',
    speak_lift: 'Хоп! Камъкът мръдна!',
    word_l1: 'АСТРО',
    word_l2: 'ДОМ',
    win_title: 'КЪМ ДОМА!',
    win_sub: 'Астро и Роботът летят към своята планета!',
    win_tease: 'Звездолетът е цял. Пътят продължава!',
    win_restart: 'Натисни, за да играеш пак!',
  },
  en: {
    title_line1: 'ASTRO BUDDY',
    title_line2: 'THE WATER PLANET',
    btn_newgame: 'NEW GAME',
    controls: 'Arrows — move    SPACE — talk / sword    X — bow    C — robot',
    dialog_prev: '‹ Back', dialog_next: 'Next ›', dialog_close: 'Close ✕', dialog_repeat: '↺',
    voice_lang: 'en',
    radio_name: 'Robot (radio)',
    lvl1_name: 'Level 1 — The Ocean',
    lvl2_name: 'Level 2 — The Island',
    lvl3_name: 'Level 3 — Takeoff',
    h1_0: 'Find 5 parts near the wreck!',
    h1_1: 'Call the Robot (C) to lift the rock!',
    h1_2: 'Watch the fish! Find the wing!',
    h1_3: 'Shoot the letters: A-S-T-R-O',
    h1_4: 'Robot opens the current in the south!',
    h1_5: 'Enter the whirlpool in the north!',
    h2_0: 'Talk to the turtle chief!',
    h2_1: (n) => `Find ${n} coconut${n === 1 ? '' : 's'}!`,
    h2_2: 'Bring the coconuts to the chief!',
    h2_3: 'Find more parts. The Robot can help!',
    h2_4: 'Shoot the temple letters: H-O-M-E',
    h2_5: 'Take the hull from the temple!',
    h2_6: 'At the wreck: SPACE to repair!',
    h3_0: 'Dodge the rockets or shoot them!',
    npc_chief: 'Turtle Chief',
    npc_hermit: 'Hermit Crab',
    chief_q0: ['Hello, Astro!', 'Your ship fell in the sea.', 'We keep the coconuts.', 'Bring me three coconuts!', 'Then I will help you.'],
    chief_q1: ['More coconuts, please!', 'Look in the green forest, north.'],
    chief_q2: ['Yes! Three coconuts!', 'Here is a hull plate.', 'More parts are in the jungle.', 'The Robot can lift palms.'],
    chief_done: ['The temple is to the east.', 'Shoot the letters HOME!'],
    hermit_early: ['Pss... talk to the chief first!'],
    hermit_gift: ['You are a kind guest.', 'Here is a nav crystal!', 'Watch out for old drones.'],
    hermit_done: ['Safe trip to the stars!'],
    r_crash: 'Astro! A rocket hit us! We fall into the ocean!',
    r_l1_start: 'Five parts are in the ocean. I am with you!',
    r_l1_engine: 'The engine! Four parts left!',
    r_l1_lift: 'A big rock! Press C — I will lift it!',
    r_l1_antenna: 'The antenna is ours! Super!',
    r_l1_fish: 'Big fish! Use the sword or the bow!',
    r_l1_letters: 'Shoot the letters in order: A, S, T, R, O!',
    r_l1_wrong: 'Wrong letter! Start again from A.',
    r_l1_gate: 'The gate is open! The battery is inside!',
    r_l1_valve: 'A valve! Press C by the south rock!',
    r_l1_all: 'Five parts! The north whirlpool is open!',
    r_l2_start: 'An island! Talk to the turtles.',
    r_l2_coconuts: 'Three coconuts in the north forest!',
    r_l2_palm: 'A fallen palm! Press C — I will lift it!',
    r_l2_crabs: 'Crabs on the beach! Be careful!',
    r_l2_temple: 'The temple! Shoot H, O, M, E in order.',
    r_l2_wrong: 'Wrong letter! Start again from H.',
    r_l2_hull: 'The hull! Now go to the wreck to repair!',
    r_l2_repair: 'I hold the hull. Press SPACE!',
    r_l3_start: 'We fly! Shoot the rockets or dodge them!',
    r_idle: 'Astro, look at the message at the bottom!',
    speak_part: (n) => n > 0 ? `A part! ${n} left!` : 'All the parts here!',
    speak_repair: 'Three... two... one... Done!',
    speak_lift: 'Up! The rock moved!',
    word_l1: 'ASTRO',
    word_l2: 'HOME',
    win_title: 'HOMEWARD!',
    win_sub: 'Astro and the Robot fly to their planet!',
    win_tease: 'The starship is whole. The trip goes on!',
    win_restart: 'Press to play again!',
  },
  fr: {
    title_line1: 'ASTRO BUDDY',
    title_line2: "LA PLANÈTE D'EAU",
    btn_newgame: 'NOUVELLE PARTIE',
    controls: 'Flèches — bouger    ESPACE — parler / épée    X — arc    C — robot',
    dialog_prev: '‹ Retour', dialog_next: 'Suivant ›', dialog_close: 'Fermer ✕', dialog_repeat: '↺',
    voice_lang: 'fr',
    radio_name: 'Robot (radio)',
    lvl1_name: "Niveau 1 — L'océan",
    lvl2_name: "Niveau 2 — L'île",
    lvl3_name: 'Niveau 3 — Décollage',
    h1_0: 'Trouve 5 pièces près de l’épave !',
    h1_1: 'Appelle le Robot (C) pour lever le rocher !',
    h1_2: 'Attention aux poissons ! Trouve l’aile !',
    h1_3: 'Tire les lettres : A-S-T-R-O',
    h1_4: 'Le Robot ouvre le courant au sud !',
    h1_5: 'Entre dans le tourbillon au nord !',
    h2_0: 'Parle au chef des tortues !',
    h2_1: (n) => `Trouve ${n} noix de coco !`,
    h2_2: 'Apporte les noix au chef !',
    h2_3: 'Trouve d’autres pièces. Le Robot aide !',
    h2_4: 'Tire les lettres du temple : A-M-I',
    h2_5: 'Prends la coque dans le temple !',
    h2_6: 'À l’épave : ESPACE pour réparer !',
    h3_0: 'Évite les fusées ou tire dessus !',
    npc_chief: 'Chef Tortue',
    npc_hermit: 'Crabe ermite',
    chief_q0: ['Bonjour, Astro !', 'Votre vaisseau est tombé.', 'Nous gardons les noix de coco.', 'Apporte-moi trois noix !', 'Après, je t’aide.'],
    chief_q1: ['Encore des noix, s’il te plaît !', 'Cherche dans la forêt, au nord.'],
    chief_q2: ['Bravo ! Trois noix !', 'Voici une plaque de coque.', 'D’autres pièces sont dans la jungle.', 'Le Robot peut lever les palmiers.'],
    chief_done: ['Le temple est à l’est.', 'Tire les lettres AMI !'],
    hermit_early: ['Pss... parle d’abord au chef !'],
    hermit_gift: ['Tu es un bon ami.', 'Voici un cristal de route !', 'Attention aux vieux drones.'],
    hermit_done: ['Bon voyage vers les étoiles !'],
    r_crash: 'Astro ! Une fusée nous a touchés ! Nous tombons dans l’océan !',
    r_l1_start: 'Cinq pièces sont dans l’océan. Je suis avec toi !',
    r_l1_engine: 'Le moteur ! Encore quatre pièces !',
    r_l1_lift: 'Un gros rocher ! Appuie sur C — je le lève !',
    r_l1_antenna: 'L’antenne est à nous ! Super !',
    r_l1_fish: 'Gros poissons ! Épée ou arc !',
    r_l1_letters: 'Tire les lettres dans l’ordre : A, S, T, R, O !',
    r_l1_wrong: 'Mauvaise lettre ! Recommence à A.',
    r_l1_gate: 'La porte est ouverte ! La pile est dedans !',
    r_l1_valve: 'Une vanne ! Appuie sur C près du rocher au sud !',
    r_l1_all: 'Cinq pièces ! Le tourbillon au nord est ouvert !',
    r_l2_start: 'Une île ! Parle aux tortues.',
    r_l2_coconuts: 'Trois noix dans la forêt au nord !',
    r_l2_palm: 'Un palmier tombé ! Appuie sur C — je le lève !',
    r_l2_crabs: 'Des crabes sur la plage ! Attention !',
    r_l2_temple: 'Le temple ! Tire A, M, I dans l’ordre.',
    r_l2_wrong: 'Mauvaise lettre ! Recommence à A.',
    r_l2_hull: 'La coque ! Va à l’épave pour réparer !',
    r_l2_repair: 'Je tiens la coque. Appuie sur ESPACE !',
    r_l3_start: 'On décolle ! Tire les fusées ou évite-les !',
    r_idle: 'Astro, regarde le message en bas !',
    speak_part: (n) => n > 0 ? `Une pièce ! Encore ${n} !` : 'Toutes les pièces ici !',
    speak_repair: 'Trois... deux... un... C’est bon !',
    speak_lift: 'Hop ! Le rocher a bougé !',
    word_l1: 'ASTRO',
    word_l2: 'AMI',
    win_title: 'VERS LA MAISON !',
    win_sub: 'Astro et le Robot volent vers leur planète !',
    win_tease: 'Le vaisseau est entier. Le voyage continue !',
    win_restart: 'Appuie pour rejouer !',
  },
};

export function Sfor(locale, key, ...args) {
  const table = STRINGS[locale] || STRINGS.bg;
  const val = table[key] ?? STRINGS.bg[key] ?? key;
  return typeof val === 'function' ? val(...args) : val;
}

export function S(key, ...args) {
  return Sfor(lang, key, ...args);
}

export function setLang(next) {
  if (!LANGS.some((l) => l.code === next)) return;
  lang = next;
  try { localStorage.setItem('astrojuli_locale_v1', next); } catch {}
  document.documentElement.lang = next;
}

export function loadLang() {
  try {
    const saved = localStorage.getItem('astrojuli_locale_v1')
      || localStorage.getItem('astroBuddy_locale_v1');
    if (saved && LANGS.some((l) => l.code === saved)) lang = saved;
  } catch {}
  document.documentElement.lang = lang;
  return lang;
}

let speaking = false;
let speakSeq = 0;
let primePending = false;
let speechPrimed = false;
let voicesHooked = false;
let lastCancelAt = -9999;

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

export function speak(text) {
  if (!window.speechSynthesis || text == null || text === '') return;
  warmVoices();
  const id = ++speakSeq;
  const say = (attempt) => {
    if (id !== speakSeq) return;
    const u = new SpeechSynthesisUtterance(String(text));
    const vlang = S('voice_lang');
    const pref = pickVoice(vlang);
    if (pref) {
      u.voice = pref;
      u.lang = pref.lang;
    } else {
      u.lang = vlang;
    }
    u.rate = 0.80;
    u.pitch = 1.1;
    let started = false;
    u.onstart = () => { started = true; speaking = true; };
    u.onend = () => { speaking = false; };
    u.onerror = () => { speaking = false; };
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

export function isSpeaking() { return speaking; }
