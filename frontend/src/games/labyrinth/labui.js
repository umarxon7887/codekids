/** @file Labirint ekranlari uchun umumiy bo'laklar: ikonkalar, reyting tartibi va qatorlari, yakuniy ekranlar. */
import { esc } from '../../utils/dom.js';
import { heroOf, heroHappyUrl, avatarHtml } from './heroes.js';

const svg = (d, { w = 20, sw = 2.2, fill = 'none' } = {}) =>
  `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24" fill="${fill}" stroke="${fill === 'none' ? 'currentColor' : 'none'}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;

const HEART = 'M12 21s-7.5-4.6-9.6-9.1C.9 8.6 3 5 6.5 5c2 0 3.6 1.1 5.5 3 1.9-1.9 3.5-3 5.5-3C21 5 23.1 8.6 21.6 11.9 19.5 16.4 12 21 12 21z';
const STAR = 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z';

export const I = {
  back: svg('<path d="M15 5l-7 7 7 7"/>', { sw: 2.4 }),
  clock: svg('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2M9 2h6"/>', { w: 18 }),
  heart: `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="${HEART}" fill="#F0626E" stroke="#3B2F2F" stroke-width="1.4"/></svg>`,
  heartOff: `<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24"><path d="${HEART}" fill="#E5D5C3" stroke="#B9A999" stroke-width="1.4"/></svg>`,
  star: (w = 20) => `<svg aria-hidden="true" width="${w}" height="${w}" viewBox="0 0 24 24"><path d="${STAR}" fill="#FFD98A" stroke="#3B2F2F" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
  me: svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.5" fill="currentColor"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>', { w: 18 }),
  map: svg('<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2zM9 4v14M15 6v14"/>', { w: 18 }),
  plus: svg('<path d="M12 5v14M5 12h14"/>', { w: 18, sw: 2.6 }),
  minus: svg('<path d="M5 12h14"/>', { w: 18, sw: 2.6 }),
  swipe: svg('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10m0-1.5a1.5 1.5 0 0 1 3 0V11m0-1a1.5 1.5 0 0 1 3 0v4.5a6 6 0 0 1-6 6h-.7a5 5 0 0 1-3.9-1.9L4.6 15a1.5 1.5 0 0 1 2.3-1.9L9 15"/><path d="M3 5h4M5 3l-2 2 2 2M21 5h-4M19 3l2 2-2 2"/>', { w: 28, sw: 2 }),
  flag: svg('<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>', { w: 14, sw: 2.4 }),
  broken: svg('<path d="M12 20s-7-4.4-9-8.6C1.6 8.3 3.6 5 7 5c1.9 0 3.4 1 5 2.8l-2 3 3 2-2 3"/><path d="M12 7.8C13.6 6 15.1 5 17 5c3.4 0 5.4 3.3 4 6.4-1.3 2.8-4.7 5.6-7 7.2"/>', { w: 14 }),
  copy: svg('<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a1 1 0 0 1 1-1h10"/>', { w: 18 }),
  full: svg('<path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4"/>', { w: 18 }),
  play: '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13a1 1 0 0 0 1.5.86l10.5-6.5a1 1 0 0 0 0-1.72L9.5 4.64A1 1 0 0 0 8 5.5z"/></svg>',
  xc: svg('<circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/>', { w: 16, sw: 2.4 }),
  x: svg('<path d="M6 6l12 12M18 6L6 18"/>', { w: 14, sw: 3 }),
  castle: svg('<path d="M4 21V9l2-1V5h2v2h2V5h4v2h2V5h2v3l2 1v12zM10 21v-4a2 2 0 0 1 4 0v4"/>', { w: 18 }),
  q: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01"/>', { w: 18 }),
};

/** Reyting: qasrga yetganlar o'rni bo'yicha, qolganlar ball (keyin daraja) bo'yicha. Chiqarilganlar yo'q. */
export function sortPlayers(list) {
  return [...(list || [])].filter((p) => !p.kicked).sort((a, b) => {
    const ra = a.rank || 0, rb = b.rank || 0;
    if (ra && rb) return ra - rb;
    if (ra || rb) return ra ? -1 : 1;
    return (b.score || 0) - (a.score || 0) || (b.level || 1) - (a.level || 1);
  });
}

/** Qator ostidagi belgi: finish / jon tugadi. */
export function badgeHtml(p) {
  if (p.eliminated) return `<span class="lb-badge is-out">${I.broken}jon tugadi</span>`;
  if (p.finished && p.rank) return `<span class="lb-badge">${I.flag}finish</span>`;
  return '';
}

/** @param {any[]} sorted @param {{meId?:any, sub?:(p:any)=>string}} [o] */
export function rankRows(sorted, { meId = null, sub } = {}) {
  return sorted.map((p, i) => {
    const me = meId != null && String(p.id) === String(meId);
    const extra = sub ? sub(p) : badgeHtml(p);
    return `<li class="lb-row${me ? ' is-me' : ''}">
      <span class="lb-rn" data-m="${i < 3 ? i + 1 : 0}">${i + 1}</span>${avatarHtml(heroOf(p, me))}
      <span class="lb-rnm"><span class="lb-nm">${esc(p.nickname)}${me ? ' <small>(Sen)</small>' : ''}</span>${extra ? `<span>${extra}</span>` : ''}</span>
      <b class="lb-rsc">${esc(p.score ?? 0)} <small>ball</small></b></li>`;
  }).join('');
}

const CONFETTI = [[8, 20, '#FF8FB1', 20], [18, 8, '#FFD98A', -30], [80, 12, '#7FD1A8', 45], [90, 30, '#B9A5F0', 10], [70, 4, '#FF8FB1', -15],
  [28, 32, '#7EC8E3', 60], [62, 26, '#FFD98A', 30], [12, 44, '#7FD1A8', -40], [88, 48, '#FFD98A', 70]];

/**
 * O'quvchining yakuniy ekrani (o'yin ustida oyna): qahramon, o'rin, ball, daraja va reyting.
 * @param {HTMLElement} el
 * @param {{players:any[], meId:any, levels:number, reason?:string}} o reason: time | all_done | closed
 */
export function renderStudentEnd(el, { players, meId, levels = 5, reason = 'time' }) {
  const sorted = sortPlayers(players);
  const idx = sorted.findIndex((p) => String(p.id) === String(meId));
  const me = sorted[idx] || players.find((p) => String(p.id) === String(meId)) || { score: 0, level: 1 };
  const place = idx >= 0 ? idx + 1 : null;
  const placeTxt = place ? `${place}-o'rin` : '—';
  let sub = place ? `${place}-o'rinni olding` : "O'yin yakunlandi";
  if (me.finished && me.rank && !me.eliminated) sub = `Qasrga yetding va ${place}-o'rinni olding`;
  else if (me.eliminated) sub = `Jonlaring tugadi. ${placeTxt}`;
  else if (reason === 'closed') sub = `Ustoz o'yinni yakunladi. ${placeTxt}`;
  else if (place && reason === 'time') sub = `Vaqt tugadi. ${placeTxt}`;
  const lvl = me.finished && me.rank ? levels : Math.min(me.level || 1, levels);
  el.className = 'lb-end';
  el.hidden = false;
  el.innerHTML = `<section class="lb-endc" role="dialog" aria-modal="true" aria-labelledby="lb-endt">
    <div class="lb-endh">${CONFETTI.map(([x, y, c, r]) => `<i style="left:${x}%;top:${y}%;background:${c};transform:rotate(${r}deg)"></i>`).join('')}
      <img src="${heroHappyUrl(heroOf(me, true))}" alt="">
      <h2 id="lb-endt">O'yin tugadi!</h2><p>${esc(sub)}</p></div>
    <div class="lb-estats">
      <div><b>${esc(placeTxt)}</b><small>Sening o'rning</small></div>
      <div><b>${I.star(18)}${esc(me.score ?? 0)}</b><small>ball</small></div>
      <div><b>${lvl} / ${levels}</b><small>daraja</small></div>
    </div>
    <div class="lb-rkh"><b>Reyting</b><small>${sorted.length} ta o'yinchi${sorted.length > 5 ? ' · suring ↓' : ''}</small></div>
    <ol class="lb-rk" tabindex="0" aria-label="O'yinchilar o'rni">${rankRows(sorted, { meId })}</ol>
    <a class="btn lb-endb" href="#/">Asosiy ekranga qaytish</a>
  </section>`;
  const list = el.querySelector('.lb-rk'), row = el.querySelector('.is-me');
  if (list && row) list.scrollTop = Math.max(0, row.offsetTop - list.offsetTop - list.clientHeight / 2 + row.clientHeight / 2);
  el.querySelector('.lb-endb')?.focus({ preventScroll: true });
}

/**
 * Ustozning yakuniy ekrani: shohsupa (1-3), statistika va to'liq reyting.
 * @param {HTMLElement} el
 * @param {{players:any[], code:string, info?:any, reason?:string}} o
 */
export function renderHostEnd(el, { players, code, info = null, reason = 'time' }) {
  const sorted = sortPlayers(players);
  const fin = sorted.filter((p) => p.finished && p.rank && !p.eliminated).length;
  const out = sorted.filter((p) => p.eliminated).length;
  const answered = sorted.reduce((s, p) => s + (p.answered || 0), 0);
  const right = sorted.reduce((s, p) => s + (p.right || 0), 0);
  const pct = answered ? `${Math.round((right / answered) * 100)}%` : '—';
  const meta = ['Labirint', `xona ${code}`, info?.title, info?.minutes ? `${info.minutes} daqiqa` : ''].filter(Boolean).map(esc).join(' · ');
  // shohsupa tartibi: 2-o'rin, 1-o'rin, 3-o'rin — [indeks, avatar o'lchami, ustun balandligi]
  const order = [[1, 44, 86], [0, 52, 110], [2, 44, 66]].filter(([i]) => sorted[i]).map(([i, a, h]) => [sorted[i], i, a, h]);
  el.hidden = false;
  el.className = 'lb-hend';
  el.innerHTML = `
    <div class="lb-hendt"><div><h1>O'yin tugadi</h1><p>${meta}</p></div><span class="lb-hclosed">${{ closed: 'Xona yopildi', all_done: 'Hamma tugatdi' }[reason] || 'Vaqt tugadi'}</span></div>
    ${order.length ? `<div class="lb-podium">${order.map(([p, i, a, h]) => `<div class="lb-pod">
      ${avatarHtml(heroOf(p), `lb-av--${a}`)}<b class="lb-podn">${esc(p.nickname)}</b>
      <div class="lb-podb" data-m="${i + 1}" style="height:${h}px"><b>${i + 1}</b><small>${esc(p.score ?? 0)} ball</small></div></div>`).join('')}</div>` : ''}
    <div class="lb-hstats">
      <div><b>${sorted.length}</b><small>o'quvchi</small></div>
      <div><b>${fin}</b><small>qasrga yetdi</small></div>
      <div><b>${out}</b><small>jon tugadi</small></div>
      <div><b>${pct}</b><small>to'g'ri javob</small></div>
    </div>
    <div class="lb-rkh"><b>To'liq reyting</b><small>${sorted.length} ta o'quvchi</small></div>
    <ol class="lb-rk lb-rk--host" aria-label="O'quvchilar o'rni">${sorted.length ? rankRows(sorted) : '<li class="lb-empty">O\'quvchilar qatnashmadi</li>'}</ol>
    <a class="btn lb-endb" href="#/teacher">Panelga qaytish</a>`;
}
