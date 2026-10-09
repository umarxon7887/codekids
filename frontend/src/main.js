/** @file Entry point: sessiyani tiklash, hash-router (rol bo'yicha), SW ro'yxatdan o'tkazish. */
import './styles/style.css';
import { auth } from './core/api.js';
import { getUser, getAccessToken } from './core/state.js';
import { disconnectSocket } from './core/socket.js';
import { mountAuth } from './ui/auth.js';
import { html } from './utils/dom.js';

const app = document.getElementById('app');
let cleanup = () => {};
let seq = 0; // eskirgan (kechikkan) render natijalarini bekor qilish uchun

function parseHash() {
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  return { path, query: Object.fromEntries(new URLSearchParams(qs || '')) };
}

function home(root, user) {
  const teacher = user.role === 'teacher';
  root.replaceChildren(html(`
    <section class="home">
      <h1>Salom, ${user.nickname ? user.nickname.replace(/[<>&"']/g, '') : 'do\'st'}! 👋</h1>
      ${teacher ? '<a class="tile" href="#/teacher">👩‍🏫 Ustoz paneli</a>' : `
        <a class="tile" href="#/typing">⌨️ Typing Race</a>
        <div class="tile tile--form"><span>🧩 Xonaga kirish</span>
          <input id="code" maxlength="6" placeholder="6 belgili kod" autocapitalize="characters">
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
    if (mine !== seq) c(); else cleanup = c; // yangi navigatsiya boshlangan bo'lsa, eskisini tozalaymiz
  } catch (e) { console.error(e); }
}

window.addEventListener('hashchange', route);
window.addEventListener('auth:expired', () => { disconnectSocket(); route(); });

(async () => {
  await auth.restore(); // httpOnly cookie orqali (muvaffaqiyatsiz bo'lsa login ekrani)
  route();
})();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));
}
