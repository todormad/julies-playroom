import {
  loadLocale,
  setLocale,
  applyStaticI18n,
  t,
  LOCALES,
  registerMessages,
} from './shared/locale.js?v=48';
import { platformMessages } from './shared/platform-messages.js?v=48';

registerMessages(platformMessages);

function bindLocaleButtons() {
  document.querySelectorAll('[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => {
      setLocale(btn.dataset.lang);
      applyStaticI18n();
      renderGameGrid();
    });
  });
  window.addEventListener('astro-locale-change', () => {
    applyStaticI18n();
    renderGameGrid();
  });
}

async function loadGames() {
  const res = await fetch('/js/shared/games.json?v=48');
  if (!res.ok) throw new Error('Failed to load games catalog');
  return res.json();
}

function renderGameGrid() {
  const grid = document.getElementById('gameGrid');
  if (!grid || !grid.dataset.loaded) return;
  const games = JSON.parse(grid.dataset.loaded);
  grid.innerHTML = games.map(game => {
    const isLive = game.status === 'live';
    const tags = (game.tags || []).map(tag => `<span class="game-tag">${tag}</span>`).join('');
    const action = isLive
      ? `<a class="game-play" href="${game.path}">${t('platform.play')}</a>`
      : `<span class="game-play game-play--soon" aria-disabled="true">${t('platform.comingSoon')}</span>`;
    return `<article class="game-card${isLive ? '' : ' game-card--soon'}">
      <div class="game-card-body">
        <h2 class="game-card-title">${t(game.titleKey)}</h2>
        <p class="game-card-desc">${t(game.descKey)}</p>
        ${tags ? `<div class="game-card-tags">${tags}</div>` : ''}
      </div>
      ${action}
    </article>`;
  }).join('');
}

async function initPlatform() {
  loadLocale();
  applyStaticI18n();
  bindLocaleButtons();
  try {
    const games = await loadGames();
    const grid = document.getElementById('gameGrid');
    if (grid) {
      grid.dataset.loaded = JSON.stringify(games);
      renderGameGrid();
    }
  } catch (err) {
    console.error('Platform hub failed to load games:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPlatform);
} else {
  initPlatform();
}
