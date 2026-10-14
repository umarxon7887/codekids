/**
 * @file Poyga paneli: har bir o'quvchi uchun yo'l va mashina. Yo'llar o'rin bo'yicha joylashadi va o'rin almashganda silliq ko'chadi.
 * O'quvchi (compact): 3 ta yo'l ko'rinadi (o'zi + bitta oldindagi + bitta orqadagi; oxirida bo'lsa 2 ta oldindagi, birinchi bo'lsa 2 ta orqadagi).
 * Qolganlarini ko'rish uchun poyga maydonini scroll qilish kerak (sichqoncha g'ildiragi yoki barmoq).
 * Ustoz: 8 ta yo'l ko'rinadi, qolganlari scroll bilan; kickable bo'lsa ✕ tugmasi bor.
 */
import '../../styles/race.css';

const VIS_STUDENT = 3; // o'quvchi: bir vaqtda 3 ta yo'l (o'zi + qo'shnilari)
const VIS_HOST = 8; // ustoz: 8 ta yo'l, qolganlari scroll bilan
const MANUAL_MS = 4000; // qo'lda scroll qilgandan keyin avto-markazlash to'xtab turadi
const COLORS = ['#E5383B', '#2EC4B6', '#3A86FF', '#FFB703', '#9D4EDD', '#FF6FB5', '#80ED99', '#FB8500'];
const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };

const CAR = `<svg viewBox="0 0 100 42" aria-hidden="true">
  <ellipse cx="50" cy="40" rx="42" ry="2.6" fill="#0006"/>
  <path d="M2 11h9v3H8v7H2z" style="fill:var(--car)" stroke="#000" stroke-opacity=".5" stroke-width="1"/>
  <rect x="5" y="14" width="3" height="10" fill="#15131f"/>
  <path style="fill:var(--car)" stroke="#000" stroke-opacity=".5" stroke-width="1.2" stroke-linejoin="round" d="M6 29c0-4 2-7 7-8l20-3c5-6 10-9 17-9h8c5 0 9 3 12 7l12 4c8 2 14 4 15 8l-1 4H6z"/>
  <path d="M38 18c4-5 8-7 13-7h7c3 0 6 2 8 6z" fill="#0f1b2d" stroke="#000" stroke-opacity=".4" stroke-width=".8"/>
  <path d="M42 17c3-3 6-4.500 9-4.500" stroke="#7fb4ff" stroke-width="1.200" fill="none" opacity=".7"/>
  <path d="M10 27h84" stroke="#fff" stroke-width="1.600" opacity=".55"/>
  <circle cx="30" cy="24" r="5.200" fill="#fff"/><text class="rc-num" x="30" y="26.800" text-anchor="middle" font-size="7.500" font-weight="800" font-family="system-ui,sans-serif" fill="#15131f">1</text>
  <path d="M90 22l8 3-1 3h-8z" fill="#ffe08a"/>
  <path d="M94 33h5v2h-5z" fill="#15131f"/>
  <g transform="translate(24 31)"><g class="rc-wheel"><circle r="8.5" fill="#15131f"/><circle r="5.6" fill="#c9c6d6"/><circle r="2" fill="#15131f"/><path d="M0-5.2V5.2M-5.2 0H5.2M-3.7-3.7L3.7 3.7M3.7-3.7L-3.7 3.7" stroke="#15131f" stroke-width="1.3"/></g></g>
  <g transform="translate(76 31)"><g class="rc-wheel"><circle r="8.5" fill="#15131f"/><circle r="5.6" fill="#c9c6d6"/><circle r="2" fill="#15131f"/><path d="M0-5.2V5.2M-5.2 0H5.2M-3.7-3.7L3.7 3.7M3.7-3.7L-3.7 3.7" stroke="#15131f" stroke-width="1.3"/></g></g>
  <path class="rc-flame" d="M6 26L-12 22 -4 26 -12 30z" fill="#ffb347"/>
</svg>`;

const LANE_HTML = `<div class="rc-lane__head"><span class="rc-rank"></span><span class="rc-name"></span><b class="rc-pct"></b></div>
<div class="rc-road"><i class="rc-start"></i><i class="rc-finish"></i><i class="rc-trail"></i><div class="rc-car">${CAR}</div></div>`;

/**
 * @param {HTMLElement} el
 * @param {{targetLength?:number, players?:{id?:any,nickname:string,correct:number,finished:boolean,rank?:number}[]}} snap
 * @param {{meId?:any, meNick?:string, kickable?:boolean, compact?:boolean}} [opts]
 */
export function renderBoard(el, snap, { meId = null, meNick = '', kickable = false, compact = false } = {}) {
  const total = snap.targetLength || 1;
  const players = snap.players || [];
  const key = (p) => String(p.id ?? p.nickname);
  const isMe = (p) => (meId != null && p.id != null && String(p.id) === String(meId)) || (!!meNick && p.nickname === meNick);
  const pctOf = (p) => Math.min(100, Math.round((p.correct / total) * 100));

  if (!el._lanes) {
    el._lanes = new Map(); el._seen = new Map(); el._manual = 0;
    el.classList.add('rc-board');
    el.innerHTML = '<div class="rc-leader" hidden></div><div class="rc-view"><div class="rc-list"></div></div><div class="rc-more" hidden></div>';
    el._leader = el.querySelector('.rc-leader');
    el._view = el.querySelector('.rc-view');
    el._list = el.querySelector('.rc-list');
    el._more = el.querySelector('.rc-more');
    const hold = () => { el._manual = Date.now() + MANUAL_MS; };
    ['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) => el._view.addEventListener(ev, hold, { passive: true }));
  }

  if (!players.length) {
    for (const lane of el._lanes.values()) lane.remove();
    el._lanes.clear();
    el._leader.hidden = true;
    el._view.hidden = true;
    el._more.hidden = false;
    el._more.textContent = "Hozircha o'quvchi yo'q";
    return;
  }
  el._view.hidden = false;

  // O'rinlar: avval marraga yetganlar, keyin ko'proq to'g'ri belgi yozganlar; teng bo'lsa qo'shilish tartibi (sakramaydi)
  players.forEach((p) => { if (!el._seen.has(key(p))) el._seen.set(key(p), el._seen.size); });
  const ranked = [...players].sort((a, b) =>
    (Number(b.finished) - Number(a.finished)) || ((a.rank || 1e9) - (b.rank || 1e9)) || (b.correct - a.correct) || (el._seen.get(key(a)) - el._seen.get(key(b))));
  const n = ranked.length;
  const vis = Math.min(n, compact ? VIS_STUDENT : VIS_HOST);

  el._list.style.setProperty('--n', n);
  el._view.style.setProperty('--vis', vis);
  el._view.classList.toggle('is-scroll', n > vis);

  const keep = new Set();
  ranked.forEach((p, i) => {
    const k = key(p);
    keep.add(k);
    let lane = el._lanes.get(k);
    if (!lane) {
      lane = document.createElement('div');
      lane.className = 'rc-lane';
      lane.innerHTML = LANE_HTML;
      lane.style.setProperty('--car', COLORS[hash(k) % COLORS.length]);
      lane.querySelector('.rc-num').textContent = el._seen.get(k) + 1;
      el._lanes.set(k, lane);
      el._list.appendChild(lane);
    }
    const pct = pctOf(p);
    lane.style.setProperty('--i', i);
    lane.classList.toggle('rc-lane--me', isMe(p));
    lane.classList.toggle('is-done', !!p.finished);
    const rk = lane.querySelector('.rc-rank');
    rk.textContent = i + 1;
    rk.dataset.m = p.finished ? (i < 3 ? i + 1 : 'f') : '';
    lane.querySelector('.rc-name').textContent = p.nickname;
    lane.querySelector('.rc-pct').textContent = `${pct}%`;
    lane.style.setProperty('--p', (pct / 100).toFixed(4));

    // oldinga siljisa: qisqa "yurish" animatsiyasi
    if (pct > (lane._pct ?? 0)) {
      lane.classList.add('is-go');
      clearTimeout(lane._go);
      lane._go = setTimeout(() => lane.classList.remove('is-go'), 950);
    }
    lane._pct = pct;

    // ustoz uchun "chiqarish" tugmasi (faqat o'yinchi id si bo'lsa)
    let kick = lane.querySelector('.rc-kick');
    if (kickable && p.id != null) {
      if (!kick) {
        kick = document.createElement('button');
        kick.className = 'kick rc-kick';
        kick.type = 'button';
        kick.textContent = '✕';
        kick.setAttribute('aria-label', 'Chiqarish');
        lane.querySelector('.rc-lane__head').appendChild(kick);
      }
      kick.dataset.kick = String(p.id);
    } else if (kick) kick.remove();
  });
  for (const [k, lane] of el._lanes) {
    if (!keep.has(k)) { lane.remove(); el._lanes.delete(k); }
  }

  // O'quvchi: o'zi markazda (birinchi bo'lsa tepada, oxirgi bo'lsa pastda) qilib scroll qilamiz
  const myIdx = ranked.findIndex(isMe);
  const laneH = el._lanes.values().next().value?.offsetHeight || 0;
  let start = 0;
  if (myIdx >= 0) start = Math.max(0, Math.min(myIdx - 1, n - vis));
  if (laneH && myIdx >= 0 && Date.now() > el._manual) {
    const top = start * laneH;
    if (Math.abs(el._view.scrollTop - top) > 2) {
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      el._view.scrollTo({ top, behavior: calm ? 'auto' : 'smooth' });
    }
  }

  // O'quvchi: yetakchi ko'rinish oynasidan tashqarida bo'lsa, tepada qisqa yozuv
  const lead = ranked[0];
  const leadHidden = compact && n > vis && myIdx >= 0 && start > 0 && !isMe(lead);
  el._leader.hidden = !leadHidden;
  if (leadHidden) el._leader.textContent = `🥇 ${lead.nickname} · ${pctOf(lead)}%`;

  el._more.hidden = n <= vis;
  el._more.textContent = n > vis ? `${n} ta o'quvchi · hammasini ko'rish uchun aylantiring ↕` : '';
}