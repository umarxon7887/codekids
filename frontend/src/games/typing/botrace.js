/**
 * @file Botlar bilan poyga: darajalar, botlar harakati (faqat ko'rsatish) va natija ekrani.
 * Botlar tezligi serverdan keladi (sessiya bilan), o'rin va coinni server hisoblaydi.
 * Bot T = matn uzunligi / (wpm*5/60) soniyada marraga yetadi; yo'lda biroz tebranadi, lekin vaqti aniq.
 */
import '../../styles/botrace.css';
import { esc } from '../../utils/dom.js';
import { round } from '../../utils/format.js';
import { t } from '../../i18n/index.js';
import { carUrl, CAR_COUNT } from './cars.js';
import { coinSvg } from '../../ui/tl/coin.js';

/** Daraja: botlar WPM oralig'i (backend services/botRace.js BOT_LEVELS bilan bir xil bo'lishi kerak). */
export const LEVELS = [
  { lv: 1, min: 8, max: 14, cars: [5, 8, 11] },
  { lv: 2, min: 15, max: 22, cars: [3, 9, 6] },
  { lv: 3, min: 23, max: 32, cars: [2, 10, 7] },
  { lv: 4, min: 33, max: 45, cars: [12, 4, 1] },
];
export const levelName = (lv) => t(`br.lv${lv}`);
export const botNames = (lv) => t(`br.bots${lv}`).split('|');

/** Bot mashinalari: bolaning mashinasi bilan bir xil bo'lsa, boshqasi beriladi. */
export function botCars(lv, myCar) {
  const base = LEVELS[lv - 1].cars;
  const free = Array.from({ length: CAR_COUNT }, (_, i) => i + 1).filter((n) => n !== myCar && !base.includes(n));
  return base.map((c) => (c === myCar ? free[0] : c));
}

/**
 * Botlar simulyatsiyasi.
 * @param {{wpm:number}[]} bots serverdan
 * @param {number} len matn uzunligi
 */
export function makeBots(bots, len, lv, myCar) {
  const names = botNames(lv), cars = botCars(lv, myCar);
  return bots.map((b, i) => ({
    id: `bot${i}`, nickname: names[i] || `Bot ${i + 1}`, car_id: cars[i], wpm: b.wpm,
    T: len / ((b.wpm * 5) / 60), phase: Math.random() * 6.28, correct: 0, finished: false, at: 0,
  }));
}

/** t soniyada bot nechta belgi yozgan: tekis tezlik + boshida/oxirida yo'qoladigan tebranish. */
export function botPos(b, sec, len) {
  const f = Math.min(1, Math.max(0, sec / b.T));
  const wob = 0.04 * Math.sin(sec * 1.7 + b.phase) * f * (1 - f) * 4;
  return Math.round(len * Math.min(1, Math.max(0, f + wob)));
}

/** Natija ekrani (server natijasi bilan). */
export function raceResultHtml(r, { lv, me, bots, unlockedNext }) {
  const race = r.race;
  const place = race.place;
  const rows = [
    { me: true, nickname: me.nickname, car_id: me.car_id, wpm: r.wpm },
    ...bots.map((b) => ({ nickname: b.nickname, car_id: b.car_id, wpm: b.wpm })),
  ].sort((a, b) => (b.wpm - a.wpm) || (a.me ? -1 : b.me ? 1 : 0));
  const next = lv < 4 && place === 1 && unlockedNext ? lv + 1 : 0;
  return `<div class="br-res">
    <div class="br-hero${place === 1 ? '' : ' br-hero--lose'}">
      <div class="br-medal" data-m="${place}">${place}</div>
      <h1>${t(`br.place${place}`)}</h1>
      <p>${t('br.levelLine', { lv: levelName(lv), wpm: esc(round(r.wpm)) })}</p>
      ${race.coins_earned ? `<span class="br-coin">${coinSvg(26)}+${race.coins_earned}</span>` : ''}
      ${race.capped ? `<small class="br-cap">${t('br.capped')}</small>` : ''}
    </div>
    <div class="br-three">
      <div><b>${esc(round(r.wpm))}</b><span>WPM</span></div>
      <div><b>${esc(round(r.accuracy))}%</b><span>${t('ty.acc')}</span></div>
      <div><b>${esc(round(r.time_sec, 1))} ${t('tl.sec')}</b><span>${t('ty.time')}</span></div>
    </div>
    ${r.flagged ? `<div class="tr-warn">⚠️ ${t('ty.flagged')}</div>` : ''}
    <div class="br-table">${rows.map((p, i) => `<div class="br-row${p.me ? ' br-row--me' : ''}">
      <span class="br-r">${i + 1}</span><img src="${carUrl(p.car_id)}" alt=""><span class="br-n">${esc(p.nickname)}${p.me ? ` (${t('br.you')})` : ''}</span><span class="br-v">${esc(round(p.wpm))} WPM</span></div>`).join('')}
    </div>
    <div class="br-btns">
      ${next ? `<button class="btn br-up" data-lv="${next}">${t('br.next', { lv: levelName(next) })}</button>` : ''}
      <button class="btn" data-lv="${lv}">${t('br.again')}</button>
      <a class="btn btn--ghost" href="#/typing">${t('br.change')}</a>
    </div>
  </div>`;
}
