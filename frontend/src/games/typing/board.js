/** @file Poyga paneli: har bir o'quvchi uchun yo'lak va mashina. Snapshot kelganda faqat siljish yangilanadi. */
import { esc } from '../../utils/dom.js';

const TRACK_MAX = 12;

/**
 * @param {HTMLElement} el
 * @param {{targetLength?:number, players?:{id:any,nickname:string,correct:number,finished:boolean}[]}} snap
 * @param {{meId?:any}} [opts] o'quvchi o'z ID si (uni ajratib ko'rsatish uchun)
 */
export function renderBoard(el, snap, { meId = null } = {}) {
  const total = snap.targetLength || 1;
  const sorted = [...(snap.players || [])].sort((a, b) =>
    (Number(b.finished) - Number(a.finished)) || (b.correct - a.correct));

  if (!el._lanes) { el._lanes = new Map(); el.classList.add('race'); }
  if (!el._more) {
    el._more = document.createElement('div');
    el._more.className = 'race__more';
    el.appendChild(el._more);
  }
  if (!sorted.length) {
    el._more.hidden = false;
    el._more.textContent = "Hozircha o'quvchi yo'q";
    for (const lane of el._lanes.values()) lane.remove();
    el._lanes.clear();
    return;
  }

  const main = sorted.slice(0, TRACK_MAX);
  const rest = sorted.slice(TRACK_MAX);
  const keep = new Set();

  main.forEach((p, i) => {
    const key = String(p.id ?? p.nickname);
    keep.add(key);
    let lane = el._lanes.get(key);
    if (!lane) {
      lane = document.createElement('div');
      lane.className = 'lane';
      lane.innerHTML = '<span class="lane__name"></span><div class="lane__track"><span class="car" aria-hidden="true">🚗</span></div><b class="lane__pct"></b>';
      el._lanes.set(key, lane);
    }
    const pct = Math.min(100, Math.round((p.correct / total) * 100));
    lane.classList.toggle('lane--me', meId != null && String(p.id) === String(meId));
    lane.classList.toggle('lane--done', !!p.finished);
    lane.querySelector('.lane__name').textContent = `${p.finished ? '🏁 ' : ''}${i + 1}. ${p.nickname}`;
    lane.querySelector('.car').style.left = `calc(${(pct * 0.92).toFixed(2)}% + 4px)`;
    lane.querySelector('.lane__pct').textContent = `${pct}%`;
    el.insertBefore(lane, el._more);
  });

  for (const [key, lane] of el._lanes) {
    if (!keep.has(key)) { lane.remove(); el._lanes.delete(key); }
  }

  el._more.hidden = !rest.length;
  el._more.innerHTML = rest.length
    ? `+${rest.length} ko'proq: ` + rest.map((p) => `${esc(p.nickname)} ${Math.round((p.correct / total) * 100)}%`).join(' · ')
    : '';
}
