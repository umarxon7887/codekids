/** @file Kirish / Ro'yxatdan o'tish (o'quvchi va ustoz) + mehmon kirishi. Soft Milk dizayni. */
import '../styles/auth.css';
import { auth } from '../core/api.js';
import { showError, toast } from '../core/toast.js';
import { html } from '../utils/dom.js';
import { t } from '../i18n/index.js';

const P = {
  logo: '<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',
  mail: '<path d="M3 6h18v12H3zM3 7l9 7 9-7"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  school: '<path d="M3 21h18M6 21V9l6-5 6 5v12M10 21v-5h4v5"/>',
  book: '<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4zM4 18a2 2 0 0 1 2-2h13"/>',
  kb: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  maze: '<path d="M3 3h18v18H3zM8 3v8h8M16 21v-6M3 14h5"/>',
  term: '<path d="M4 17l6-5-6-5M12 19h8"/>',
};
const svg = (k, s = 20) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;
const field = (id, label, icon, attrs, extra = '') => `<div class="au-f"><label for="${id}">${label}</label>
  <div class="au-in">${svg(icon)}<input id="${id}" ${attrs}>${extra}</div></div>`;

/** @param {HTMLElement} root @param {()=>void} onDone @returns {()=>void} */
export function mountAuth(root, onDone) {
  let mode = 'login';
  let role = 'student';
  const view = html(`
    <section class="au">
      <div class="au-hero">
        <div class="au-logo">${svg('logo', 38)}</div>
        <div class="au-name">CodeKids</div>
        <div class="au-tag">${t('au.tag')}</div>
        <div class="au-dots">
          <span style="background:var(--sky);color:#1F5C8A">${svg('kb', 24)}</span>
          <span style="background:var(--mint);color:#1F5C41">${svg('maze', 24)}</span>
          <span style="background:var(--lav);color:#5B45B0">${svg('term', 24)}</span>
        </div>
      </div>
      <form class="au-card" novalidate>
        <h1 id="ttl">${t('au.login')}</h1>
        <div id="reg" hidden>
          <div class="au-role" role="group" aria-label="${t('au.role')}">
            <button type="button" data-role="student" aria-pressed="true">${t('au.student')}</button>
            <button type="button" data-role="teacher" aria-pressed="false">${t('au.teacher')}</button>
          </div>
        </div>
        <div id="nickw" hidden>${field('nick', t('au.nick'), 'user', `maxlength="40" placeholder="${t('au.nickPh')}" autocomplete="nickname"`)}</div>
        ${field('email', 'Email', 'mail', `type="email" placeholder="${t('au.emailPh')}" autocomplete="username"`)}
        ${field('pass', t('au.pass'), 'lock', `type="password" placeholder="${t('au.passPh')}" autocomplete="current-password"`,
          `<button type="button" class="au-eye" id="eye" aria-label="${t('au.show')}" aria-pressed="false">${svg('eye')}</button>`)}
        <div id="teacher" class="au-teach" hidden>
          <b>${t('au.teacherInfo')}</b>
          ${field('full', t('au.full'), 'user', `placeholder="${t('au.fullPh')}" autocomplete="name"`)}
          ${field('school', t('au.school'), 'school', `placeholder="${t('au.optional')}"`)}
          ${field('subj', t('au.subj'), 'book', 'placeholder="math, it"')}
          <div class="au-two">
            ${field('exp', t('au.exp'), 'user', 'type="number" min="0" inputmode="numeric" placeholder="0"')}
            ${field('age', t('au.age'), 'user', 'placeholder="7-9"')}
          </div>
        </div>
        <button id="go" type="submit" class="btn au-go">${t('au.login')}</button>
      </form>
      <a id="guest" class="btn btn--ghost au-guest" href="#/guest">${t('au.guest')}</a>
      <div class="au-alt"><span id="altq">${t('au.noAcc')}</span> <button id="sw" type="button">${t('au.register')}</button></div>
    </section>`);
  const $ = (s) => view.querySelector(s);

  const sync = () => {
    const reg = mode === 'register';
    $('#reg').hidden = !reg;
    $('#nickw').hidden = !reg;
    $('#teacher').hidden = !reg || role !== 'teacher';
    $('#guest').hidden = reg;
    $('#ttl').textContent = reg ? t('au.register') : t('au.login');
    $('#go').textContent = reg ? t('au.register') : t('au.login');
    $('#altq').textContent = reg ? t('au.hasAcc') : t('au.noAcc');
    $('#sw').textContent = reg ? t('au.login') : t('au.register');
    $('#pass').placeholder = reg ? t('au.min8') : t('au.passPh');
    $('#pass').autocomplete = reg ? 'new-password' : 'current-password';
    view.querySelectorAll('[data-role]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.role === role)));
  };
  $('#sw').onclick = () => { mode = mode === 'login' ? 'register' : 'login'; sync(); };
  view.querySelectorAll('[data-role]').forEach((b) => { b.onclick = () => { role = b.dataset.role; sync(); }; });
  $('#eye').onclick = (e) => {
    const show = $('#pass').type === 'password';
    $('#pass').type = show ? 'text' : 'password';
    e.currentTarget.setAttribute('aria-pressed', String(show));
    e.currentTarget.setAttribute('aria-label', show ? t('au.hide') : t('au.show'));
  };

  $('form').onsubmit = async (ev) => {
    ev.preventDefault();
    const btn = $('#go');
    btn.disabled = true;
    try {
      const creds = { email: $('#email').value.trim(), password: $('#pass').value };
      if (mode === 'login') await auth.login(creds);
      else {
        const body = { ...creds, role, nickname: $('#nick').value.trim() };
        if (role === 'teacher') {
          Object.assign(body, {
            full_name: $('#full').value.trim(), school: $('#school').value.trim(),
            subjects: $('#subj').value.split(',').map((s) => s.trim()).filter(Boolean),
            experience_years: Number($('#exp').value) || 0, age_group: $('#age').value.trim(),
          });
        }
        await auth.register(body);
      }
      toast(t('au.welcome'), 'success');
      onDone();
    } catch (e) { showError(e); } finally { btn.disabled = false; }
  };
  sync();
  root.replaceChildren(view);
  return () => {};
}
