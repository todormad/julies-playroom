const MOBILE_MQ = '(max-width: 980px)';

export function initMobileMenu() {
  const menuBtn = document.getElementById('menuBtn');
  const menuClose = document.getElementById('menuClose');
  const menuBackdrop = document.getElementById('menuBackdrop');
  const menuSheet = document.getElementById('menuSheet');
  const menuSheetBody = document.getElementById('menuSheetBody');
  const controls = document.querySelector('.top .controls');
  const panel = document.querySelector('.content .panel');
  const footer = document.querySelector('.site-footer');
  if (!menuBtn || !menuSheet || !menuSheetBody || !controls || !panel || !footer) return;

  const home = {
    controls: controls.parentElement,
    panel: panel.parentElement,
    footer: footer.parentElement,
  };

  function isMobile() {
    return window.matchMedia(MOBILE_MQ).matches;
  }

  function setOpen(open) {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    menuSheet.hidden = !open;
    menuBackdrop.hidden = !open;
  }

  function closeMenu() {
    if (!isMobile()) return;
    home.controls.append(controls);
    home.panel.append(panel);
    home.footer.append(footer);
    setOpen(false);
  }

  function openMenu() {
    if (!isMobile()) return;
    menuSheetBody.append(controls, panel, footer);
    setOpen(true);
  }

  function toggleMenu() {
    if (document.body.classList.contains('menu-open')) closeMenu();
    else openMenu();
  }

  function restoreDesktopLayout() {
    home.controls.append(controls);
    home.panel.append(panel);
    home.footer.append(footer);
    setOpen(false);
  }

  menuBtn.addEventListener('click', toggleMenu);
  menuClose?.addEventListener('click', closeMenu);
  menuBackdrop?.addEventListener('click', closeMenu);
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && document.body.classList.contains('menu-open')) {
      e.preventDefault();
      closeMenu();
    }
  });

  panel.addEventListener('click', (e) => {
    if (!document.body.classList.contains('menu-open')) return;
    if (e.target.closest('.hero-card, #startBtn, #restartBtn, [data-lang]')) closeMenu();
  });
  controls.addEventListener('click', (e) => {
    if (!document.body.classList.contains('menu-open')) return;
    if (e.target.closest('button')) closeMenu();
  });

  window.matchMedia(MOBILE_MQ).addEventListener('change', (e) => {
    if (!e.matches) restoreDesktopLayout();
  });

  menuSheet.hidden = true;
  menuBackdrop.hidden = true;
}
