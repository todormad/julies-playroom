// Progress saved on this device: where you are, who you've rescued, which stars you have.

const KEY = 'astrojuli_missingfriends_v1';

function fresh() {
  return {
    v: 1,
    level: 'intro',
    entry: 'start',
    rescued: { nova: false, stitch: false, scout: false },
    stars: {},          // levelId -> [star index, ...]
    seen: {},           // one-time story moments
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

export function rescuedCount() {
  return Object.values(save.rescued).filter(Boolean).length;
}
