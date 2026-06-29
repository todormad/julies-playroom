export const LOCALE_KEY = 'astrojuli_locale_v1';
const LEGACY_LOCALE_KEY = 'astroBuddy_locale_v1';
export const DEFAULT_LOCALE = 'bg';
export const LOCALES = ['bg', 'en', 'fr'];

const messageSources = [];
let locale = DEFAULT_LOCALE;

export function registerMessages(messagesByLocale) {
  messageSources.push(messagesByLocale);
}

function getMergedTable(loc) {
  const merged = {};
  for (const src of messageSources) {
    if (src[loc]) Object.assign(merged, src[loc]);
  }
  return merged;
}

function interpolate(str, params = {}) {
  return str.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? String(params[k]) : `{${k}}`));
}

export function t(key, params) {
  const table = getMergedTable(locale);
  const fallback = getMergedTable(DEFAULT_LOCALE);
  const str = table[key] ?? fallback[key] ?? key;
  return interpolate(str, params);
}

export function getLocale() {
  return locale;
}

export function loadLocale() {
  try {
    let saved = localStorage.getItem(LOCALE_KEY);
    if (!saved) saved = localStorage.getItem(LEGACY_LOCALE_KEY);
    if (saved && LOCALES.includes(saved)) locale = saved;
  } catch {}
  document.documentElement.lang = locale;
  return locale;
}

export function setLocale(next) {
  if (!LOCALES.includes(next)) return;
  locale = next;
  try { localStorage.setItem(LOCALE_KEY, next); } catch {}
  document.documentElement.lang = next;
  window.dispatchEvent(new CustomEvent('astro-locale-change', { detail: next }));
}

export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-html]').forEach(el => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.setAttribute('title', t(el.dataset.i18nTitle));
  });
  LOCALES.forEach(code => {
    const btn = root.querySelector(`[data-lang="${code}"]`);
    if (btn) btn.classList.toggle('active', code === locale);
  });
}
