/** @file Profil oynasi (ustoz va o'quvchi): mobilda to'liq ekran, kompyuterda markazdagi oyna. Ko'rish va tahrirlash. */
import '../styles/profile.css';
import { api } from '../core/api.js';
import { getUser, setUser } from '../core/state.js';
import { showError, toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';

const P = {
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',
  school: '<path d="M3 21h18M6 21V9l6-5 6 5v12M10 21v-5h4v5"/>',
  book: '<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4zM4 18a2 2 0 0 1 2-2h13"/>',
  case: '<path d="M3 8h18v12H3zM9 8V5h6v3"/>',
  group: '<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.5 3-6 7-6s7 2.5 7 6M17 4a4 4 0 0 1 0 7.5M19 15c2 .8 3 2.5 3 4.5"/>',
  pen: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  out: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  kb: '<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
  maze: '<path d="M3 3h18v18H3zM8 3v8h8M16 21v-6M3 14h5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  trophy: '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  castle: '<path d="M4 21V9l2-1V5h2v2h2V5h4v2h2V5h2v3l2 1v12zM10 21v-4a2 2 0 0 1 4 0v4"/>',
  fire: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 2 3 4"/>',
};
const ic = (k, s = 20) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${P[k]}</svg>`;

const MONTHS = ['yanvar', 'fevral', 'mart', 'aprel', 'may', 'iyun', 'iyul', 'avgust', 'sentyabr', 'oktyabr', 'noyabr', 'dekabr'];
const since = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-yil ${MONTHS[d.getMonth()]}dan beri`;
};
const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : `${d.getDate()}-${MONTHS[d.getMonth()]}`;
};
const EMPTY = '<span class="pf-none">Kiritilmagan</span>';
const row = (icon, label, value) => `<div class="pf-row"><span class="pf-ri">${ic(icon)}</span>
  <div class="pf-rt"><span>${label}</span><b>${value}</b></div></div>`;
const tile = (value, label, unit = '') => `<div class="pf-tile"><b>${value}${unit ? `<small>${unit}</small>` : ''}</b><span>${label}</span></div>`;
const field = (id, label, icon, attrs, hint = '') => `<div class="pf-f"><label for="${id}">${label}</label>
  <div class="pf-in">${ic(icon)}<input id="${id}" ${attrs}></div>${hint ? `<small id="${id}-h">${hint}</small>` : ''}</div>`;

let closeOpen = null; // bir vaqtda faqat bitta profil oynasi

/**
 * Profil oynasini ochadi.
 * @param {{onLogout?:()=>void, onChange?:(user:object)=>void}} [opts]
 */
export async function openProfile({ onLogout, onChange } = {}) {
  if (closeOpen) return;
  const opener = document.activeElement;
  const wrap = html(`<div class="pf-wrap">
    <section class="pf" role="dialog" aria-modal="true" aria-labelledby="pf-title">
      <header class="pf-head"><h1 id="pf-title">Profil</h1>
        <button type="button" class="pf-x" aria-label="Yopish">${ic('x')}</button></header>
      <div class="pf-body"><div class="skeleton pf-skel" aria-busy="true"></div></div>
    </section></div>`);
  const body = wrap.querySelector('.pf-body');
  let data = null; // { user, stats }
  let editing = false;

  const close = () => {
    if (closeOpen !== close) return;
    closeOpen = null;
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('hashchange', close);
    document.documentElement.classList.remove('pf-lock');
    wrap.remove();
    if (opener && document.contains(opener)) opener.focus();
  };
  function onKey(e) {
    if (e.key !== 'Escape') return;
    if (editing) showView(); else close();
  }
  wrap.addEventListener('click', (e) => { if (e.target === wrap) close(); });
  wrap.querySelector('.pf-x').onclick = close;
  document.addEventListener('keydown', onKey);
  window.addEventListener('hashchange', close);
  document.documentElement.classList.add('pf-lock');
  document.body.appendChild(wrap);
  closeOpen = close;
  wrap.querySelector('.pf-x').focus();

  async function load() {
    body.innerHTML = '<div class="skeleton pf-skel" aria-busy="true"></div>';
    try {
      data = await api.get('/profile');
      if (closeOpen === close) showView();
    } catch (e) {
      showError(e);
      body.innerHTML = `<div class="pf-card pf-fail"><p>Profilni yuklab bo'lmadi.</p>
        <button type="button" class="btn btn--ghost" data-retry>Qayta urinish</button></div>`;
      body.querySelector('[data-retry]').onclick = load;
    }
  }

  function showView() {
    editing = false;
    const { user, stats } = data;
    const teacher = user.role === 'teacher';
    const name = user.nickname || '';
    body.innerHTML = `
      <div class="pf-hero ${teacher ? 'pf-hero--t' : 'pf-hero--s'}">
        <span class="pf-ava">${esc((name[0] || '?').toUpperCase())}</span>
        <div class="pf-who">
          <h2>${esc(name)}</h2>
          <div class="pf-mail">${esc(user.email || '')}</div>
          <div class="pf-chips"><span>${teacher ? 'Ustoz' : "O'quvchi"}</span>${user.created_at ? `<span>${esc(since(user.created_at))}</span>` : ''}</div>
        </div>
      </div>
      ${teacher ? teacherView(user, stats) : studentView(stats)}
      <div class="pf-actions">
        <button type="button" class="btn" data-edit>${ic('pen')}Tahrirlash</button>
        <button type="button" class="btn btn--ghost" data-out>${ic('out')}Chiqish</button>
      </div>`;
    body.querySelector('[data-edit]').onclick = showEdit;
    body.querySelector('[data-out]').onclick = () => { close(); onLogout?.(); };
  }

  function showEdit() {
    editing = true;
    const u = data.user;
    const teacher = u.role === 'teacher';
    body.innerHTML = `
      <form class="pf-card pf-form" novalidate>
        <h2>Ma'lumotlarni tahrirlash</h2>
        ${field('pf-nick', 'Nikneym', 'user', `value="${esc(u.nickname || '')}" maxlength="40" required autocomplete="nickname"`)}
        ${teacher ? `
          ${field('pf-full', "To'liq ism", 'user', `value="${esc(u.full_name || '')}" maxlength="120" required autocomplete="name"`)}
          ${field('pf-school', 'Maktab / markaz', 'school', `value="${esc(u.school || '')}" maxlength="200" placeholder="Ixtiyoriy"`)}
          ${field('pf-subj', 'Fanlar', 'book', `value="${esc((u.subjects || []).join(', '))}" placeholder="math, it" aria-describedby="pf-subj-h"`, 'Vergul bilan ajrating')}
          <div class="pf-two">
            ${field('pf-exp', 'Tajriba (yil)', 'case', `value="${u.experience_years ?? ''}" type="number" min="0" max="70" inputmode="numeric" placeholder="0"`)}
            ${field('pf-age', 'Yosh guruhi', 'group', `value="${esc(u.age_group || '')}" maxlength="20" placeholder="7-9"`)}
          </div>` : ''}
        <div class="pf-actions">
          <button type="submit" class="btn">Saqlash</button>
          <button type="button" class="btn btn--ghost" data-cancel>Bekor qilish</button>
        </div>
      </form>`;
    const form = body.querySelector('form');
    const $ = (s) => form.querySelector(s);
    $('[data-cancel]').onclick = showView;
    $('#pf-nick').focus();

    form.onsubmit = async (ev) => {
      ev.preventDefault();
      form.querySelectorAll('[aria-invalid]').forEach((i) => i.removeAttribute('aria-invalid'));
      const bad = (sel, msg) => { const i = $(sel); i.setAttribute('aria-invalid', 'true'); i.focus(); toast(msg, 'error'); };
      const nick = $('#pf-nick').value.trim();
      if (nick.length < 2) return bad('#pf-nick', "Nikneym kamida 2 belgi bo'lishi kerak");

      const changes = {};
      if (nick !== u.nickname) changes.nickname = nick;
      if (teacher) {
        const full = $('#pf-full').value.trim();
        if (full.length < 2) return bad('#pf-full', "To'liq ism kamida 2 belgi bo'lishi kerak");
        const expRaw = $('#pf-exp').value.trim();
        const exp = expRaw === '' ? null : Number(expRaw);
        if (exp !== null && (!Number.isInteger(exp) || exp < 0 || exp > 70)) return bad('#pf-exp', "Tajriba 0 dan 70 gacha butun son bo'lsin");
        const subjects = [...new Set($('#pf-subj').value.split(',').map((x) => x.trim()).filter(Boolean))];
        const school = $('#pf-school').value.trim();
        const age = $('#pf-age').value.trim();
        if (full !== (u.full_name || '')) changes.full_name = full;
        if (school !== (u.school || '')) changes.school = school;
        if (subjects.join('\n') !== (u.subjects || []).join('\n')) changes.subjects = subjects;
        if (exp !== (u.experience_years ?? null)) changes.experience_years = exp;
        if (age !== (u.age_group || '')) changes.age_group = age;
      }
      if (!Object.keys(changes).length) { showView(); return; }

      const btn = $('[type="submit"]');
      btn.disabled = true;
      btn.textContent = 'Saqlanmoqda...';
      try {
        data = await api.put('/profile', changes);
        const me = getUser();
        if (me) setUser({ ...me, nickname: data.user.nickname });
        onChange?.(data.user);
        toast('Saqlandi', 'success');
        if (closeOpen === close) showView();
      } catch (e) {
        showError(e);
        btn.disabled = false;
        btn.textContent = 'Saqlash';
      }
    };
  }

  load();
}

function teacherView(u, s) {
  const subjects = (u.subjects || []).length
    ? `<span class="pf-tags">${u.subjects.map((x) => `<i>${esc(x)}</i>`).join('')}</span>` : EMPTY;
  return `
    <div class="pf-tiles">${tile(s.classes, 'Sinflar')}${tile(s.students, "O'quvchilar")}${tile(s.rooms, 'Xonalar')}</div>
    <section class="pf-card">
      <h3>Ma'lumotlar</h3>
      <div class="pf-rows">
        ${row('user', "To'liq ism", u.full_name ? esc(u.full_name) : EMPTY)}
        ${row('school', 'Maktab / markaz', u.school ? esc(u.school) : EMPTY)}
        ${row('book', 'Fanlar', subjects)}
        ${row('case', 'Tajriba', u.experience_years != null ? `${u.experience_years} yil` : EMPTY)}
        ${row('group', 'Yosh guruhi', u.age_group ? esc(u.age_group) : EMPTY)}
      </div>
    </section>`;
}

function studentView(s) {
  const notYet = '<span class="pf-none">Hali yo\'q</span>';
  const wins = (s.typing_wins || 0) + (s.lab_wins || 0);
  const classes = s.classes.length
    ? `<div class="pf-tags pf-tags--lg">${s.classes.map((c) => `<i>${esc(c.name)}<small>${esc(c.teacher)}</small></i>`).join('')}</div>`
    : '<p class="pf-empty">Hali sinfga qo\'shilmagansan. Ustozingdan seni sinfga qo\'shishini so\'ra.</p>';
  return `
    <div class="pf-tiles">
      ${tile(s.typing_games + s.lab_games, "O'yinlar")}
      ${tile(s.best_wpm ?? '—', 'Rekord tezlik', s.best_wpm != null ? "so'z/daq" : '')}
      ${tile(s.lab_correct, "To'g'ri javob")}
    </div>
    <section class="pf-card">
      <h3>Natijalarim</h3>
      <div class="pf-rows">
        ${row('target', "Yozishdagi o'rtacha aniqlik", s.avg_accuracy != null ? `${s.avg_accuracy}%` : notYet)}
        ${row('trophy', "1-o'rinlar", wins)}
        ${row('maze', 'Labirintda eng yuqori daraja', s.lab_best_level != null ? `${s.lab_best_level}-daraja` : notYet)}
      </div>
    </section>
    ${itCard(s.it)}
    <section class="pf-card">
      <h3>Sinflarim</h3>
      ${classes}
    </section>
    <section class="pf-card">
      <h3>So'nggi o'yinlar</h3>
      ${s.recent.length ? `<ul class="pf-list">${s.recent.map(recentItem).join('')}</ul>`
        : '<p class="pf-empty">Hali o\'yin o\'ynamading. Typing Race yoki ustoz xonasidan boshla!</p>'}
    </section>`;
}

function itCard(it) {
  if (!it) return '';
  const tools = it.tools.length
    ? `<div class="pf-bag">${it.tools.map((t) => `<span class="pf-tool"><b>${esc(t.name)}</b>${t.short ? `<small>${esc(t.short)}</small>` : ''}</span>`).join('')}</div>`
    : '<p class="pf-empty">Hali qurol yo\'q. IT darslarida qasr ochib, fikrlash qurollarini yig\'.</p>';
  return `
    <section class="pf-card pf-itc">
      <h3>IT darslari</h3>
      <div class="pf-rows">
        ${row('star', 'XP', it.xp)}
        ${row('castle', 'Ochilgan qasrlar', it.done)}
        ${row('fire', 'Ketma-ket kunlar', it.streak)}
      </div>
      <h3 class="pf-sub">Qurollar sumkasi</h3>
      ${tools}
    </section>`;
}

function recentItem(r) {
  const lab = r.kind === 'labyrinth';
  const name = lab ? 'Labirint' : r.mode === 'race' ? 'Poyga' : 'Yakka mashq';
  const title = r.title ? ` · ${esc(r.title)}` : '';
  const metric = lab ? `${r.correct ?? 0} to'g'ri · ${r.score ?? 0} ball` : `${r.wpm} so'z/daq · ${r.accuracy}%`;
  const place = r.place ? `<span class="pf-place${r.place === 1 ? ' is-gold' : ''}">${r.place}-o'rin</span>` : '';
  return `<li class="pf-item">
    <span class="pf-ii ${lab ? 'is-lab' : 'is-kb'}">${ic(lab ? 'maze' : 'kb')}</span>
    <div class="pf-it"><b>${name}${title}</b><span>${esc(day(r.at))} · ${metric}</span></div>${place}</li>`;
}
