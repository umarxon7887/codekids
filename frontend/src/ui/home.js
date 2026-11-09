/** @file O'quvchi bosh sahifasi: Typing Race, Typing darslari, xonaga kirish, IT darslari. */
import '../styles/home.css';
import { auth, api } from '../core/api.js';
import { disconnectSocket } from '../core/socket.js';
import { toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';
import { coinSvg } from './tl/coin.js';
import { t, langButton, getLang } from '../i18n/index.js';

const P = {
  logo: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  kb: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  maze: '<path d="M3 3h18v18H3zM8 3v8h8M16 21v-6M3 14h5"/>',
  term: '<path d="M4 17l6-5-6-5M12 19h8"/>',
};
const svg = (k, s = 26, w = 2) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;

export function mountHome(root, user, reroute) {
  const name = user.nickname || t('app.friend');
  const view = html(`
    <section class="hm">
      <header class="hm-top">
        <div class="hm-brand"><span class="hm-logo">${svg('logo', 22, 2.2)}</span>CodeKids</div>
        <div class="hm-right">
          ${langButton()}
          <a class="ck-coins hm-coins" href="#/typing-lessons" title="${t('home.coins')}" hidden>${coinSvg(22)}<b>0</b><span class="sr">coin</span></a>
          <button class="hm-me" id="me"><span class="hm-ava">${esc(name[0].toUpperCase())}</span>${esc(name)}</button>
          <button class="btn btn--ghost hm-out hm-out--top" data-out>${t('app.logout')}</button>
        </div>
      </header>
      <div class="hm-hi"><h1>${t('home.hi', { name: esc(name) })}</h1><p>${t('home.today')}</p></div>
      <div class="hm-cards">
        <a class="hm-card" href="#/typing" style="background:var(--sky)">
          <span class="hm-ic" style="color:#1F5C8A">${svg('kb')}</span>
          <b>Typing Race</b><span class="d" style="color:#3F5566">${t('home.raceD')}</span>
          <span class="hm-go">${t('home.start')}</span>
        </a>
        <a class="hm-card" href="#/typing-lessons" style="background:var(--butter)">
          <span class="hm-row"><span class="hm-ic">${coinSvg(34)}</span><span class="hm-new" style="color:#7A5A00">${t('home.new')}</span></span>
          <b>${t('home.tl')}</b><span class="d" data-tl style="color:#6B4E00">${t('home.tlD')}</span>
          <span class="hm-go">${t('home.toLessons')}</span>
        </a>
        <form class="hm-card" id="join" style="background:var(--mint)" novalidate>
          <span class="hm-ic" style="color:#1F5C41">${svg('maze')}</span>
          <b>${t('home.join')}</b><span class="d" style="color:#335646">${t('home.joinD')}</span>
          <div class="hm-join">
            <input id="code" maxlength="6" placeholder="${t('home.codePh')}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="${t('home.codeLabel')}">
            <button class="btn" type="submit">${t('home.enter')}</button>
          </div>
        </form>
        <button class="hm-card" id="it" style="background:var(--lav)">
          <span class="hm-row"><span class="hm-ic" style="color:#5B45B0">${svg('term')}</span><span class="hm-new">${t('home.new')}</span></span>
          <b>${t('home.it')}</b><span class="d" style="color:#4A3D80">${t('home.itD')}</span>
        </button>
      </div>
      <button class="btn btn--ghost hm-out" data-out>${t('app.logout')}</button>
    </section>`);
  const $ = (s) => view.querySelector(s);
  const logout = async () => { await auth.logout(); disconnectSocket(); reroute(); };
  view.querySelectorAll('[data-out]').forEach((b) => { b.onclick = logout; });
  $('#join').onsubmit = (e) => {
    e.preventDefault();
    const c = $('#code').value.trim().toUpperCase();
    if (c.length !== 6) { toast(t('home.code6'), 'error'); $('#code').focus(); return; }
    location.hash = `#/room/${c}`;
  };
  $('#it').onclick = () => { location.hash = '#/it'; };
  $('#me').onclick = async () => {
    const { openProfile } = await import('./profile.js');
    openProfile({
      onLogout: logout,
      onChange: (u) => {
        const n = u.nickname || t('app.friend');
        $('#me').innerHTML = `<span class="hm-ava">${esc(n[0].toUpperCase())}</span>${esc(n)}`;
        $('.hm-hi h1').textContent = t('home.hi', { name: n });
      },
    });
  };
  root.replaceChildren(view);
  // Coinlar va darslar holati (sahifa yuklanishini kutmasdan)
  api.get('/typing-lessons', { query: { lang: getLang() } }).then(({ stats }) => {
    const pill = $('.hm-coins');
    pill.querySelector('b').textContent = String(stats.coins);
    pill.hidden = false;
    $('[data-tl]').textContent = stats.done ? t('home.tlProgress', stats) : t('home.tlD');
  }).catch(() => {});
  return () => {};
}
