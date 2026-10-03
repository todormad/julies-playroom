// Live-tunable movement values. The scene reads `tune` every frame, so slider
// changes apply immediately. Saved per device so a tuned feel survives reloads.

import { PRESETS, TUNE_FIELDS } from './config.js';
import { t } from './i18n.js';

const KEY = 'astrojuli_jumpfeel_v1';
export const tune = { ...PRESETS.easy };
export const tuneMeta = { difficulty: 'easy', custom: false };

let fieldsRoot = null;

function values() {
  const out = {};
  for (const f of TUNE_FIELDS) out[f.key] = tune[f.key];
  return out;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify({ difficulty: tuneMeta.difficulty, custom: tuneMeta.custom, values: values() }));
  } catch {}
}

export function loadTune() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && PRESETS[s.difficulty]) {
      tuneMeta.difficulty = s.difficulty;
      tuneMeta.custom = !!s.custom;
      Object.assign(tune, PRESETS[s.difficulty], s.custom ? s.values : {});
    }
  } catch {}
  return tuneMeta;
}

// Picking a difficulty loads its preset and drops any custom tuning.
export function setDifficulty(d) {
  tuneMeta.difficulty = d;
  tuneMeta.custom = false;
  Object.assign(tune, PRESETS[d]);
  save();
  refreshTunePanel();
}

// Loads preset values without changing the difficulty (Robot catch stays as chosen).
export function loadPresetValues(d) {
  Object.assign(tune, PRESETS[d]);
  tuneMeta.custom = true;
  save();
  refreshTunePanel();
}

function fmt(f, v) {
  return f.step < 1 ? Number(v).toFixed(2) : String(Math.round(v));
}

export function buildTunePanel(root) {
  fieldsRoot = root;
  root.innerHTML = '';
  for (const f of TUNE_FIELDS) {
    const row = document.createElement('label');
    row.className = 'tune-row';
    row.innerHTML = `<span class="tune-label"></span><output></output>
      <input type="range" min="${f.min}" max="${f.max}" step="${f.step}">`;
    const input = row.querySelector('input');
    const out = row.querySelector('output');
    input.dataset.key = f.key;
    input.addEventListener('input', () => {
      tune[f.key] = Number(input.value);
      out.textContent = fmt(f, input.value);
      tuneMeta.custom = true;
      save();
    });
    root.appendChild(row);
  }
  refreshTunePanel();
}

export function refreshTunePanel() {
  if (!fieldsRoot) return;
  fieldsRoot.querySelectorAll('.tune-row').forEach((row, i) => {
    const f = TUNE_FIELDS[i];
    row.querySelector('.tune-label').textContent = t(`f_${f.key}`);
    row.querySelector('input').value = tune[f.key];
    row.querySelector('output').textContent = fmt(f, tune[f.key]);
  });
}

export function tuneJSON() {
  return JSON.stringify({ difficulty: tuneMeta.difficulty, ...values() }, null, 2);
}
