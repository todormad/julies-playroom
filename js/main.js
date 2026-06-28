import { initGame } from './app.js?v=44';
import { loadLocale, applyStaticI18n } from './i18n.js?v=44';
import { initMobileMenu } from './mobile-menu.js?v=44';

loadLocale();
applyStaticI18n();
initMobileMenu();

function boot() {
  const canvas = document.getElementById('game');
  if (!canvas) {
    console.error('Astro Buddy Jump: canvas #game not found');
    return;
  }

  try {
    initGame({
      canvas,
      overlay: document.getElementById('overlay'),
      scoreStat: document.getElementById('scoreStat'),
      starsStat: document.getElementById('starsStat'),
      bestStat: document.getElementById('bestStat'),
      speedStat: document.getElementById('speedStat'),
      statusPill: document.getElementById('statusPill'),
      difficultyPill: document.getElementById('difficultyPill'),
      heroPill: document.getElementById('heroPill'),
      startBtn: document.getElementById('startBtn'),
      restartBtn: document.getElementById('restartBtn'),
      overlayStart: document.getElementById('overlayStart'),
      easyBtn: document.getElementById('easyBtn'),
      hardBtn: document.getElementById('hardBtn'),
      lvl1Btn: document.getElementById('lvl1Btn'),
      lvl2Btn: document.getElementById('lvl2Btn'),
      lvl3Btn: document.getElementById('lvl3Btn'),
      lvl4Btn: document.getElementById('lvl4Btn'),
      lvl5Btn: document.getElementById('lvl5Btn'),
      duckHint: document.getElementById('duckHint'),
      muteBtn: document.getElementById('muteBtn'),
      shieldPill: document.getElementById('shieldPill'),
      keyHint: document.getElementById('keyHint'),
      touchPad: document.getElementById('touchPad'),
      touchLeft: document.getElementById('touchLeft'),
      touchRight: document.getElementById('touchRight'),
      touchJump: document.getElementById('touchJump'),
      touchAbility: document.getElementById('touchAbility'),
      pauseBtn: document.getElementById('pauseBtn'),
      pauseOverlay: document.getElementById('pauseOverlay'),
      pauseResume: document.getElementById('pauseResume'),
      pauseRestart: document.getElementById('pauseRestart'),
      lvl3Hint: document.getElementById('lvl3Hint'),
      lvl4Hint: document.getElementById('lvl4Hint'),
      lvl5Hint: document.getElementById('lvl5Hint'),
      abilityPill: document.getElementById('abilityPill'),
      heroCards: document.querySelectorAll('.hero-card'),
      previews: {
        astro: document.getElementById('prev-astro'),
        star: document.getElementById('prev-star'),
        stitch: document.getElementById('prev-stitch'),
        swift: document.getElementById('prev-swift'),
      },
    });
  } catch (err) {
    console.error('Astro Buddy Jump failed to start:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
