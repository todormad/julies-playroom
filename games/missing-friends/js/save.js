// Progress saved on this device: where you are, who you've rescued, which stars you have.

const KEY = 'astrojuli_missingfriends_v1';

function fresh() {
  return {
    v: 1,
    level: 'intro',
    entry: 'start',
    rescued: { nova: false, stitch: false, scout: false },
    power: null,        // the friend power on X / ★
    stars: {},          // levelId -> [star index, ...]
    seen: {},           // one-time story moments
    finished: false,    // Otto came to the party
  };
}

export const save = fresh();

export function hasSave() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function loadSave() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && s.v === 1) Object.assign(save, fresh(), s, { rescued: { ...fresh().rescued, ...s.rescued } });
  } catch {}
  return save;
}

export function resetSave() {
  Object.assign(save, fresh());
  writeSave();
}

export function writeSave() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch {}
}

export function starTaken(levelId, i) {
  return (save.stars[levelId] || []).includes(i);
}

export function takeStar(levelId, i) {
  const list = save.stars[levelId] || (save.stars[levelId] = []);
  if (!list.includes(i)) list.push(i);
  writeSave();
}

export function totalStars(levels) {
  let got = 0, all = 0;
  for (const L of Object.values(levels)) { all += (L.stars || []).length; got += (save.stars[L.id] || []).length; }
  return { got, all };
}

export function rescuedCount() {
  return Object.values(save.rescued).filter(Boolean).length;
}
