/** @file O'quvchi bosh sahifasi: Typing, xonaga kirish, IT darslari. */
import '../styles/home.css';
import { auth } from '../core/api.js';
import { disconnectSocket } from '../core/socket.js';
import { toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';

const P = {
  logo: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  kb: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  maze: '<path d="M3 3h18v18H3zM8 3v8h8M16 21v-6M3 14h5"/>',
  term: '<path d="M4 17l6-5-6-5M12 19h8"/>',
};
const svg = (k, s = 26, w = 2) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;

export function mountHome(root, user, reroute) {
  const name = user.nickname || "do'st";
  const view = html(`
    <section class="hm">
      <header class="hm-top">
        <div class="hm-brand"><span class="hm-logo">${svg('logo', 22, 2.2)}</span>CodeKids</div>
        <div class="hm-right">
          <button class="hm-me" id="me"><span class="hm-ava">${esc(name[0].toUpperCase())}</span>${esc(name)}</button>
          <button class="btn btn--ghost hm-out hm-out--top" data-out>Chiqish</button>
        </div>
      </header>
      <div class="hm-hi"><h1>Salom, ${esc(name)}!</h1><p>Bugun nima o'ynaymiz?</p></div>
      <div class="hm-cards">
        <a class="hm-card" href="#/typing" style="background:var(--sky)">
          <span class="hm-ic" style="color:#1F5C8A">${svg('kb')}</span>
          <b>Typing Race</b><span class="d" style="color:#3F5566">Tez va aniq yozishni mashq qil</span>
          <span class="hm-go">Boshlash</span>
        </a>
        <form class="hm-card" id="join" style="background:var(--mint)" novalidate>
          <span class="hm-ic" style="color:#1F5C41">${svg('maze')}</span>
          <b>Xonaga kirish</b><span class="d" style="color:#335646">Ustoz bergan 6 xonali kodni kiriting</span>
          <div class="hm-join">
            <input id="code" maxlength="6" placeholder="6 xonali raqam" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="Xona kodi">
            <button class="btn" type="submit">Kirish</button>
          </div>
        </form>
        <button class="hm-card" id="it" style="background:var(--lav)">
          <span class="hm-row"><span class="hm-ic" style="color:#5B45B0">${svg('term')}</span><span class="hm-new">Yangi</span></span>
          <b>IT darslari</b><span class="d" style="color:#4A3D80">Qisqa darslar va testlar</span>
        </button>
      </div>
      <button class="btn btn--ghost hm-out" data-out>Chiqish</button>
    </section>`);
  const $ = (s) => view.querySelector(s);
  const logout = async () => { await auth.logout(); disconnectSocket(); reroute(); };
  view.querySelectorAll('[data-out]').forEach((b) => { b.onclick = logout; });
  $('#join').onsubmit = (e) => {
    e.preventDefault();
    const c = $('#code').value.trim().toUpperCase();
    if (c.length !== 6) { toast('Kod 6 ta belgidan iborat', 'error'); $('#code').focus(); return; }
    location.hash = `#/room/${c}`;
  };
  $('#it').onclick = () => { location.hash = '#/it'; };
  $('#me').onclick = async () => {
    const { openProfile } = await import('./profile.js');
    openProfile({
      onLogout: logout,
      onChange: (u) => {
        const n = u.nickname || "do'st";
        $('#me').innerHTML = `<span class="hm-ava">${esc(n[0].toUpperCase())}</span>${esc(n)}`;
        $('.hm-hi h1').textContent = `Salom, ${n}!`;
      },
    });
  };
  root.replaceChildren(view);
  return () => {};
}
