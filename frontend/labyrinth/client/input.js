const KEY_DIR = { ArrowUp: [0, -1], w: [0, -1], ArrowDown: [0, 1], s: [0, 1], ArrowLeft: [-1, 0], a: [-1, 0], ArrowRight: [1, 0], d: [1, 0] };

/**
 * Desktop: WASD / strelkalar (bosib turilsa yuradi).
 * Mobil: 'swipe' (surib yo'nalish berish; keyingi surishgacha davom etadi, bosish = to'xtash) yoki 'joystick'
 * (barmoq turgan paytda yuradi). pull() -> {dx,dy} | null. Faqat 4 ta yo'nalish.
 */
export class InputController {
  #keys = []; #dir = null; #origin = null; #moved = false;

  constructor(el, { mode = 'swipe', deadzone = 22, onStick } = {}) {
    this.mode = mode; this.deadzone = deadzone; this.onStick = onStick;
    const norm = (e) => (e.key.length === 1 ? e.key.toLowerCase() : e.key);
    addEventListener('keydown', (e) => { const k = norm(e); if (KEY_DIR[k]) { e.preventDefault(); if (!this.#keys.includes(k)) this.#keys.push(k); } });
    addEventListener('keyup', (e) => { const k = norm(e); this.#keys = this.#keys.filter((x) => x !== k); });
    addEventListener('blur', () => { this.#keys = []; });

    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', (e) => { this.#origin = { x: e.clientX, y: e.clientY }; this.#moved = false; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', (e) => {
      if (!this.#origin) return;
      const vx = e.clientX - this.#origin.x, vy = e.clientY - this.#origin.y;
      if (Math.hypot(vx, vy) < this.deadzone) return;
      this.#moved = true;
      this.#dir = Math.abs(vx) > Math.abs(vy) ? [Math.sign(vx), 0] : [0, Math.sign(vy)];
      this.onStick?.({ origin: this.#origin, pos: { x: e.clientX, y: e.clientY } });
      if (this.mode === 'swipe') this.#origin = { x: e.clientX, y: e.clientY };
    });
    const end = () => { if (this.mode === 'joystick' || !this.#moved) this.#dir = null; this.#origin = null; this.onStick?.(null); };
    el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
  }

  pull() { const k = this.#keys.at(-1), d = k ? KEY_DIR[k] : this.#dir; return d ? { dx: d[0], dy: d[1] } : null; }
  stop() { this.#dir = null; this.#keys = []; }
}
