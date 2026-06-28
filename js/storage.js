const STORAGE_KEY = 'astroBuddy_scores_v1';
const MIGRATE_KEY = 'astroBuddy_bossLvl5_v1';

export function loadScores() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { best: 0, bestByLevel: { one: 0, two: 0, three: 0, four: 0, five: 0 } };
    const data = JSON.parse(raw);
    const bestByLevel = { one: 0, two: 0, three: 0, four: 0, five: 0, ...(data.bestByLevel || {}) };
    // Boss was level 4 before — migrate high scores to level 5 once
    if (!localStorage.getItem(MIGRATE_KEY) && (data.bestByLevel?.four > 0)) {
      bestByLevel.five = Math.max(bestByLevel.five || 0, data.bestByLevel.four);
      bestByLevel.four = 0;
      localStorage.setItem(MIGRATE_KEY, '1');
      saveScores({ best: data.best || 0, bestByLevel });
    }
    return {
      best: data.best || 0,
      bestByLevel,
    };
  } catch {
    return { best: 0, bestByLevel: { one: 0, two: 0, three: 0, four: 0, five: 0 } };
  }
}

export function saveScores(scores) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {}
}

export function loadHintFlag(key) {
  try { return localStorage.getItem('astroBuddy_hint_' + key) === '1'; } catch { return false; }
}

export function setHintFlag(key) {
  try { localStorage.setItem('astroBuddy_hint_' + key, '1'); } catch {}
}
