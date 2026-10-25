/** @file IT darslari: umumiy ikonkalar va yordamchilar. */
import { BASE_URL } from '../../core/config.js';

const P = {
  left: '<path d="M15 5l-7 7 7 7"/>',
  right: '<path d="M9 5l7 7-7 7"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12l5 5 9-10"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 2 3 4"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.4-.4-2.4z"/>',
  book: '<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4zM4 18a2 2 0 0 1 2-2h13"/>',
  undo: '<path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3"/>',
  play: '<rect x="3" y="5" width="18" height="14" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',
  up: '<path d="M6 15l6-6 6 6"/>',
  down: '<path d="M6 9l6 6 6-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  door: '<path d="M6 21V8a6 6 0 0 1 12 0v13M4 21h16M14 14h.01"/>',
  castle: '<path d="M4 21V9l2-2 2 2V6h3V4h2v2h3v3l2-2 2 2v12zM10 21v-4a2 2 0 0 1 4 0v4"/>',
};

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

/**
 * YouTube havolasidan video ID'sini oladi. Qabul qilinadi: youtu.be/ID, youtube.com/watch?v=ID,
 * /shorts/ID, /embed/ID, /live/ID (www, m. va youtube-nocookie.com bilan), yoki ID'ning o'zi.
 * @param {string} input @returns {string|null}
 */
export function youtubeId(input) {
  const s = String(input || '').trim();
  if (YT_ID.test(s)) return s;
  let u;
  try { u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`); } catch { return null; }
  const host = u.hostname.replace(/^(www\.|m\.|music\.)/, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const [, first, second] = u.pathname.split('/');
    if (first === 'watch') id = u.searchParams.get('v');
    else if (['shorts', 'embed', 'live', 'v'].includes(first)) id = second;
  }
  return id && YT_ID.test(id) ? id : null;
}

/** Xavfsiz pleyer manzili (faqat to'g'ri ID bo'lsa). @param {string} id @returns {string|null} */
export const youtubeEmbed = (id) => (YT_ID.test(id || '')
  ? `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1` : null);

/** Video muqovasi (muharrirda). @param {string} id */
export const youtubeThumb = (id) => `https://i.ytimg.com/vi/${id}/mqdefault.jpg`;

/** Chiziqli ikonka (dekor: ekran o'quvchisidan yashirin). */
export const ic = (k, s = 20) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;

/** @param {'open'|'locked'|'boss'} k */
export const castleSrc = (k) => `${BASE_URL}it/castle-${k}.webp`;

/** IT darslari rasmi (public/it/*.webp). */
export const asset = (n) => `${BASE_URL}it/${n}.webp`;

/**
 * Bo'lim (qasr) holati qasrlaridagi mavzular holatidan: hammasi tugagan -> done,
 * hozirgi mavzu shu yerda -> current, bironta ochiq mavzu yo'q -> locked, aks holda open.
 */
export function sectionStatus(s) {
  if (s.lessons.length && s.lessons.every((l) => l.status === 'done')) return 'done';
  if (s.lessons.some((l) => l.status === 'current')) return 'current';
  if (s.lessons.every((l) => l.status === 'locked')) return 'locked';
  return 'open';
}

/** Savol turi yorlig'i (mashq tepasida). */
export function kindLabel(e) {
  if (e.type === 'order') return 'Tartibla';
  if (e.type === 'match') return 'Moslashtir';
  return { predict: "Nima bo'ladi?", error: 'Xatoni top', odd: 'Ortiqchasini top', analogy: "Hayotdan o'xshatish" }[e.kind] || 'Savol';
}

/** Fisher-Yates; tartib o'zgarmay qolsa (2+ element bo'lsa) yana aralashtiradi. */
export function shuffle(list) {
  const a = list.slice();
  for (let n = 0; n < 6; n++) {
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    if (a.length < 2 || a.some((x, i) => x !== list[i])) break;
  }
  return a;
}
