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
};

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
