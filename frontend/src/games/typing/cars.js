/** @file Poyga mashinalari: 12 ta rasm, bolaning tanlovi (telefonda saqlanadi), kutish vaqtidagi tanlash oynasi. */
import '../../styles/typing.css';
import { BASE_URL } from '../../core/config.js';

export const CAR_COUNT = 12;
const KEY = 'ck_car';
export const carUrl = (n) => `${BASE_URL}cars/car-${String(n).padStart(2, '0')}.webp`;
export function getMyCar() {
  try { const n = Number(localStorage.getItem(KEY)); return n >= 1 && n <= CAR_COUNT ? n : 0; } catch { return 0; }
}
export function setMyCar(n) { try { localStorage.setItem(KEY, String(n)); } catch { /* yopiq */ } }
const hash = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };

/** Backend car_id yuborsa o'shani, bo'lmasa: o'zim — tanlovim; boshqalar — ismdan doimiy mashina. */
export function carSrc(p, key, me) {
  const n = Number(p?.car_id) || (me && getMyCar()) || (hash(key) % CAR_COUNT) + 1;
  return carUrl(n);
}

/** Kutish vaqtida #t-pick ichiga mashina tanlash oynasini bir marta chizadi. */
export function ensurePicker(root) {
  const box = root.querySelector('#t-pick');
  if (!box || box.childElementCount) { if (box) box.hidden = false; return; }
  box.hidden = false;
  const cur = getMyCar();
  box.innerHTML = `<div class="cp">
    <div class="cp-h"><b>Mashinangni tanla</b><small>Poyga boshlanguncha almashtirsa bo'ladi</small></div>
    <div class="cp-grid" role="radiogroup" aria-label="Mashina">${Array.from({ length: CAR_COUNT }, (_, i) => i + 1).map((n) =>
      `<button type="button" class="cp-car" role="radio" aria-checked="${n === cur}" data-car="${n}" aria-label="${n}-mashina"><img src="${carUrl(n)}" alt="" loading="lazy"></button>`).join('')}</div>
  </div>`;
  box.querySelectorAll('[data-car]').forEach((b) => {
    b.onclick = () => {
      const n = Number(b.dataset.car);
      setMyCar(n);
      box.querySelectorAll('[data-car]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
      document.querySelectorAll('.rc-lane--me .rc-img').forEach((im) => { im.src = carUrl(n); });
    };
  });
}
