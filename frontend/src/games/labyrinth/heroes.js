/** @file Labirint qahramonlari: 8 ta rasm, bolaning tanlovi (telefonda saqlanadi), avatar HTML. */
import { BASE_URL } from '../../core/config.js';

export const HEROES = [
  { id: 1, name: "O'rdak", bg: '#FFD98A' },
  { id: 2, name: 'Tulki', bg: '#FFC9A8' },
  { id: 3, name: 'Mushuk', bg: '#F3D9C4' },
  { id: 4, name: 'Robot', bg: '#CFE6F7' },
  { id: 5, name: 'Ajdarcha', bg: '#CDEBDD' },
  { id: 6, name: 'Quyon', bg: '#FFE1EC' },
  { id: 7, name: 'Panda', bg: '#E9E4DE' },
  { id: 8, name: 'Kosmonavt', bg: '#DCD3F5' },
];
export const HERO_COUNT = HEROES.length;

const KEY = 'ck_hero';
const pad = (n) => String(n).padStart(2, '0');
export const heroUrl = (n) => `${BASE_URL}heroes/hero-${pad(n)}.webp`;
/** Yakuniy ekran uchun quvnoq rasm (hozircha faqat o'rdakda alohida pozasi bor). */
export const heroHappyUrl = (n) => (n === 1 ? `${BASE_URL}heroes/hero-01-happy.webp` : heroUrl(n));
export const heroInfo = (n) => HEROES[(Number(n) || 1) - 1] || HEROES[0];

export function getMyHero() {
  try { const n = Number(localStorage.getItem(KEY)); return n >= 1 && n <= HERO_COUNT ? n : 0; } catch { return 0; }
}
export function setMyHero(n) { try { localStorage.setItem(KEY, String(n)); } catch { /* yopiq */ } }

const hash = (s) => { let x = 0; for (const c of String(s)) x = (x * 31 + c.charCodeAt(0)) >>> 0; return x; };

/** Server hero_id yuborsa o'sha; bo'lmasa o'zim — saqlangan tanlovim; boshqalar — ID/ismdan doimiy qahramon. */
export function heroOf(p, me = false) {
  return Number(p?.hero_id) || (me && getMyHero()) || (hash(p?.id ?? p?.nickname ?? '') % HERO_COUNT) + 1;
}

/** Dumaloq avatar (rang foni + qahramon rasmi). */
export const avatarHtml = (n, cls = '') =>
  `<span class="lb-av ${cls}" style="background:${heroInfo(n).bg}"><img src="${heroUrl(n)}" alt="" loading="lazy"></span>`;
