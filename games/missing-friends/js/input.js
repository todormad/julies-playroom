// Keyboard + on-screen button input, read once per frame by the scene.
// Solo: arrows/WASD run, Space/Up/W/Z jump, Down (+ jump) drops through planks,
//       C calls the Robot, X uses a friend's power.
// Co-op: Astro keeps arrows + Space/Up/Z + X; the Robot pilot uses W A S D + E (or mouse / finger).

export const input = {
  left: false, right: false, down: false, jumpHeld: false,
  jumpPressed: false, robotPressed: false, friendPressed: false,
  p2: { up: false, down: false, left: false, right: false, toggle: false },
  coop: false,
};

const held = new Set();
const touchHeld = { left: false, right: false, down: false, jump: false };
const GAME_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyZ', 'KeyC', 'KeyE', 'KeyQ', 'KeyX',
]);

function isFormTarget(e) {
  const tag = e.target && e.target.tagName;
  return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA';
}

function isJumpKey(code) {
  return code === 'Space' || code === 'ArrowUp' || code === 'KeyZ' || (!input.coop && code === 'KeyW');
}

export function recompute() {
  const c = input.coop;
  input.left = held.has('ArrowLeft') || (!c && held.has('KeyA')) || touchHeld.left;
  input.right = held.has('ArrowRight') || (!c && held.has('KeyD')) || touchHeld.right;
  input.down = held.has('ArrowDown') || (!c && held.has('KeyS')) || touchHeld.down;
  input.jumpHeld = held.has('Space') || held.has('ArrowUp') || held.has('KeyZ')
    || (!c && held.has('KeyW')) || touchHeld.jump;
  input.p2.up = c && held.has('KeyW');
  input.p2.down = c && held.has('KeyS');
  input.p2.left = c && held.has('KeyA');
  input.p2.right = c && held.has('KeyD');
}

export function setCoop(on) {
  input.coop = on;
  recompute();
}

export function clearEdges() {
  input.jumpPressed = false;
  input.robotPressed = false;
  input.friendPressed = false;
  input.p2.toggle = false;
}

export function bindKeyboard(onKey) {
  window.addEventListener('keydown', (e) => {
    if (isFormTarget(e)) return;
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    if (e.repeat) return;
    held.add(e.code);
    if (isJumpKey(e.code)) input.jumpPressed = true;
    if (e.code === 'KeyC' && !input.coop) input.robotPressed = true;
    if (e.code === 'KeyX') input.friendPressed = true;
    if ((e.code === 'KeyE' || e.code === 'KeyQ') && input.coop) input.p2.toggle = true;
    recompute();
    onKey?.(e);
  });
  window.addEventListener('keyup', (e) => { held.delete(e.code); recompute(); });
  window.addEventListener('blur', () => { held.clear(); recompute(); });
}

export function bindTouchButtons(root, onPress) {
  root.querySelectorAll('[data-key]').forEach((btn) => {
    const key = btn.dataset.key;
    const down = (e) => {
      e.preventDefault();
      try { btn.setPointerCapture(e.pointerId); } catch {}
      btn.classList.add('on');
      if (key === 'robot') input.robotPressed = true;
      else if (key === 'friend') input.friendPressed = true;
      else {
        touchHeld[key] = true;
        if (key === 'jump') input.jumpPressed = true;
      }
      recompute();
      onPress?.(key);
    };
    const up = () => {
      btn.classList.remove('on');
      if (key in touchHeld) touchHeld[key] = false;
      recompute();
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}
