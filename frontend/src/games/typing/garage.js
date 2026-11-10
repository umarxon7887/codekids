/**
 * @file Garaj: mashina sahnada turadi, lentani chapga/o'ngga surib (yoki strelkalar bilan) tanlanadi.
 * Tanlov telefonda saqlanadi (setMyCar), poyga va xonalarda ham shu mashina chiqadi.
 */
import { CAR_COUNT, carUrl, getMyCar, setMyCar } from './cars.js';
import { t } from '../../i18n/index.js';

const ARROW = '<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>';

export const carName = (n) => t('br.cars').split('|')[n - 1] || t('ty.carN', { n });

export const garageHtml = () => `
  <div class="g-box">
    <div class="g-top"><span>${t('br.garage')}</span><b data-g-num></b></div>
    <div class="g-stage" data-g-stage tabindex="0" role="listbox" aria-label="${t('ty.car')}">
      <div class="g-floor"></div>
      <div class="g-track" data-g-track>${Array.from({ length: CAR_COUNT }, (_, i) =>
        `<div class="g-car" role="option" data-n="${i + 1}" aria-label="${carName(i + 1)}"><img src="${carUrl(i + 1)}" alt="" draggable="false" decoding="async"></div>`).join('')}</div>
    </div>
    <div class="g-name" data-g-name aria-live="polite"></div>
    <div class="g-ctl">
      <button type="button" class="g-arrow" data-g-prev aria-label="${t('br.prevCar')}">${ARROW}</button>
      <div class="g-dots">${'<i></i>'.repeat(CAR_COUNT)}</div>
      <button type="button" class="g-arrow g-arrow--next" data-g-next aria-label="${t('br.nextCar')}">${ARROW}</button>
    </div>
    <div class="g-hint">${t('br.swipe')}</div>
  </div>`;

/**
 * @param {HTMLElement} box garageHtml() joylashgan element
 * @param {(n:number)=>void} [onPick] tanlov o'zgarganda
 * @returns {()=>void} cleanup
 */
export function mountGarage(box, onPick) {
  const stage = box.querySelector('[data-g-stage]');
  const track = box.querySelector('[data-g-track]');
  const cars = [...track.children];
  const dots = [...box.querySelectorAll('.g-dots i')];
  const last = CAR_COUNT - 1;
  let i = (getMyCar() || 1) - 1, dx = 0, x0 = null, moved = false;
  const slot = () => Math.min(200, stage.clientWidth * 0.52);
  const clamp = (k) => Math.max(0, Math.min(last, k));

  function place(anim) {
    const w = slot();
    track.style.setProperty('--slot', `${w}px`);
    track.classList.toggle('anim', anim);
    track.style.transform = `translateX(${-(i + 0.5) * w + dx}px)`;
    const c = clamp(Math.round(i - dx / w));
    cars.forEach((el, k) => {
      el.classList.toggle('on', k === c);
      el.classList.toggle('near', Math.abs(k - c) === 1);
      el.setAttribute('aria-selected', String(k === c));
    });
    dots.forEach((d, k) => d.classList.toggle('on', k === c));
    box.querySelector('[data-g-num]').textContent = `${c + 1} / ${CAR_COUNT}`;
    box.querySelector('[data-g-name]').textContent = carName(c + 1);
  }
  function pick(k) {
    const n = clamp(k);
    dx = 0;
    const changed = n !== i;
    i = n;
    place(true);
    setMyCar(i + 1);
    if (changed) onPick?.(i + 1);
  }

  box.querySelector('[data-g-prev]').onclick = () => pick(i - 1);
  box.querySelector('[data-g-next]').onclick = () => pick(i + 1);
  cars.forEach((el, k) => { el.onclick = () => { if (!moved) pick(k); }; });
  stage.addEventListener('pointerdown', (e) => { x0 = e.clientX; moved = false; stage.setPointerCapture?.(e.pointerId); });
  stage.addEventListener('pointermove', (e) => {
    if (x0 == null) return;
    dx = e.clientX - x0;
    if (Math.abs(dx) > 6) moved = true;
    place(false);
  });
  const up = () => { if (x0 == null) return; x0 = null; pick(Math.round(i - dx / slot())); };
  stage.addEventListener('pointerup', up);
  stage.addEventListener('pointercancel', up);
  stage.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); pick(i - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); pick(i + 1); }
  });
  const onResize = () => place(false);
  addEventListener('resize', onResize);
  if (!getMyCar()) setMyCar(i + 1);
  place(false);
  return () => removeEventListener('resize', onResize);
}
