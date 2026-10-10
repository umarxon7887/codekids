/** @file Entry point: tema, sozlamalar paneli, sessiyani tiklash, hash-router (rol bo'yicha), SW. */
import './styles/style.css';
import { auth } from './core/api.js';
import { getUser, getAccessToken } from './core/state.js';
import { disconnectSocket } from './core/socket.js';
import { initTheme, toggleTheme, isLowPower, setLowPower } from './core/settings.js';
import { toast } from './core/toast.js';
import { BASE_URL } from './core/config.js';
import { t } from './i18n/index.js';
import { mountAuth } from './ui/auth.js';
import { html } from './utils/dom.js';

initTheme();
const app = document.getElementById('app');
let cleanup = () => {};
let seq = 0; // kechikkan render natijalarini bekor qilish

function mountSettings() {
  const bar = html(`<div id="settings">
    <button id="btn-theme" aria-label="${t('theme.toggle')}" title="${t('theme.toggle')}">🌓</button>
    <button id="btn-lp" aria-label="${t('lowpower.toggle')}" title="${t('lowpower.toggle')}" aria-pressed="${isLowPower()}">🔋</button></div>`);
  document.body.appendChild(bar);
  bar.querySelector('#btn-theme').onclick = toggleTheme;
  bar.querySelector('#btn-lp').onclick = (e) => {
    const on = !isLowPower();
    setLowPower(on);
    e.currentTarget.setAttribute('aria-pressed', String(on));
    toast(t(on ? 'lowpower.on' : 'lowpower.off'));
  };
}

function parseHash() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function home(root, user) {
  const teacher = user.role === 'teacher';
  const name = (user.nickname || "do'st").replace(/[<>&"']/g, '');
  root.replaceChildren(html(`
    <section class="home">
      <h1>${t('home.hello', { name })}</h1>
      ${teacher ? '<a class="tile" href="#/teacher">👩‍🏫 Ustoz paneli</a>' : `
        <a class="tile" href="#/typing">⌨️ Typing Race</a>
        <div class="tile tile--form"><span>🧩 Xonaga kirish</span>
          <input id="code" maxlength="6" placeholder="6 belgili kod" autocapitalize="characters" aria-label="Xona kodi">
          <button id="join" class="btn">Kirish</button></div>`}
      <button id="out" class="btn btn--ghost">Chiqish</button>
    </section>`));
  root.querySelector('#out').onclick = async () => { await auth.logout(); disconnectSocket(); route(); };
  root.querySelector('#join')?.addEventListener('click', () => {
    const c = root.querySelector('#code').value.trim().toUpperCase();
    if (c) location.hash = `#/room/${c}`;
  });
  return () => {};
}

async function render({ path, query }) {
  if (path === '/guest') return (await import('./games/typing/lobby.js')).mountTypingLobby(app, { guest: true });

  const user = getAccessToken() && getUser();
  if (!user) return mountAuth(app, route);

  const teacherOnly = path === '/teacher' || path.startsWith('/host/');
  if (teacherOnly && user.role !== 'teacher') { location.hash = '#/'; return () => {}; }

  if (path === '/typing') return (await import('./games/typing/lobby.js')).mountTypingLobby(app);
  if (path === '/teacher') return (await import('./teacher/panel.js')).mountTeacher(app);

  let m = path.match(/^\/room\/([A-Za-z0-9]+)$/);
  if (m) return (await import('./ui/room.js')).mountRoom(app, m[1]);
  m = path.match(/^\/host\/([A-Za-z0-9]+)$/);
  if (m) return (await import('./teacher/host.js')).mountHost(app, { code: m[1], game: query.game || 'typing' });

  return home(app, user);
}

async function route() {
  const mine = ++seq;
  cleanup();
  cleanup = () => {};
  app.replaceChildren(html('<div class="skeleton skeleton--page"></div>'));
  try {
    const c = (await render(parseHash())) || (() => {});
    if (mine !== seq) c(); else cleanup = c;
  } catch (e) { console.error(e); }
}

window.addEventListener('hashchange', route);
window.addEventListener('auth:expired', () => { disconnectSocket(); route(); });

mountSettings();
(async () => {
  await auth.restore(); // httpOnly cookie orqali (muvaffaqiyatsiz bo'lsa login ekrani)
  route();
})();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register(`${BASE_URL}sw.js`).catch(() => {}));
}
