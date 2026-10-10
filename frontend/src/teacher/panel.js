/** @file Ustoz paneli: dashboard, sinflar (+analitika), kontent (matn + CSV), xona yaratish. */
import { api } from '../core/api.js';
import { showError, toast } from '../core/toast.js';
import { html, esc, table } from '../utils/dom.js';
import { t } from '../i18n/index.js';

const TABS = [['dash', 'Panel'], ['classes', 'Sinflar'], ['contents', 'Kontent'], ['rooms', 'Xona']];
const list = (r, key) => r[key] || r.items || (Array.isArray(r) ? r : []);

/** @param {HTMLElement} root @returns {Promise<()=>void>} */
export async function mountTeacher(root) {
  const el = html(`
    <section class="game">
      <div class="game__bar"><a href="#/" class="btn btn--ghost">←</a><h2>Ustoz paneli</h2></div>
      <nav class="tabs">${TABS.map(([k, l]) => `<button class="tab" data-t="${k}">${l}</button>`).join('')}</nav>
      <div id="tab"></div>
    </section>`);
  root.replaceChildren(el);
  const box = el.querySelector('#tab');
  const views = { dash, classes, contents, rooms };

  async function open(k) {
    el.querySelectorAll('.tab').forEach((b) => b.classList.toggle('is-on', b.dataset.t === k));
    box.replaceChildren(html('<div class="skeleton"></div>'));
    try { await views[k](box); } catch (e) { showError(e); box.textContent = ''; }
  }
  el.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => open(b.dataset.t)));
  open('dash');
  return () => {};
}

/** Dashboard: jami xonalar va faol xonalar alohida ko'rsatiladi (`active_rooms`, agar backend bersa). */
async function dash(box) {
  const d = await api.get('/teacher/dashboard');
  const o = d.dashboard || d;
  const LABELS = { contents: 'Kontentlar', classes: 'Sinflar', students: "O'quvchilar", total_rooms: t('dash.total_rooms'), active_rooms: t('dash.active_rooms') };
  const order = (k) => (k === 'active_rooms' ? 0 : 1);
  const entries = Object.entries(o).filter(([, v]) => typeof v !== 'object').sort((a, b) => order(a[0]) - order(b[0]));
  box.innerHTML = `<div class="grid2">${entries.map(([k, v]) => `<div class="stat ${k === 'active_rooms' ? 'stat--live' : ''}"><b>${esc(v)}</b><span>${esc(LABELS[k] || k)}</span></div>`).join('')}</div>`;
}

async function classes(box) {
  const items = list(await api.get('/teacher/classes'), 'classes');
  box.innerHTML = `<div class="row2"><input id="cn" placeholder="Yangi sinf nomi"><button id="cadd" class="btn">+</button></div>
    ${items.map((c) => `<button class="tile tile--sm" data-id="${esc(c.id)}">${esc(c.name)} <small>${esc(c.student_count ?? 0)} o'quvchi</small></button>`).join('')}`;
  box.querySelector('#cadd').onclick = async () => {
    try { await api.post('/teacher/classes', { name: box.querySelector('#cn').value.trim() }); await classes(box); } catch (e) { showError(e); }
  };
  box.querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => classDetail(box, b.dataset.id); });
}

async function classDetail(box, id) {
  const r = await api.get(`/teacher/classes/${id}`);
  const c = r.class || r;
  const students = c.students || r.students || [];
  box.innerHTML = `<button id="bk" class="btn btn--ghost">←</button><h3>${esc(c.name)}</h3>
    <div class="row2"><input id="em" type="email" placeholder="O'quvchi emaili"><button id="ad" class="btn">Qo'shish</button></div>
    ${table(students)}
    ${students.length ? `<div class="row2"><select id="sel">${students.map((s) => `<option value="${esc(s.id)}">${esc(s.nickname || s.email)}</option>`).join('')}</select><button id="rm" class="btn btn--ghost">Chiqarish</button></div>` : ''}
    <div class="row2"><input id="rc" placeholder="room_code (ixtiyoriy)"><button id="an" class="btn">Tahlil</button></div><div id="out"></div>`;
  const $ = (s) => box.querySelector(s);
  $('#bk').onclick = () => classes(box);
  $('#ad').onclick = async () => {
    try { await api.post(`/teacher/classes/${id}/students`, { email: $('#em').value.trim() }); toast("Qo'shildi", 'success'); await classDetail(box, id); } catch (e) { showError(e); }
  };
  $('#rm')?.addEventListener('click', async () => {
    try { await api.del(`/teacher/classes/${id}/students/${$('#sel').value}`); await classDetail(box, id); } catch (e) { showError(e); }
  });
  $('#an').onclick = async () => {
    try {
      const a = await api.get(`/teacher/classes/${id}/analytics`, { query: { room_code: $('#rc').value.trim() } });
      const sum = a.summary || {};
      $('#out').innerHTML = `<div class="grid2">${Object.entries(sum).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
        <h4>O'quvchilar</h4>${table(a.students)}<h4>Zaif mavzular</h4>${table(a.weak_topics)}`;
    } catch (e) { showError(e); }
  };
}

async function contents(box) {
  const items = list(await api.get('/contents', { query: { limit: 50 } }), 'contents');
  box.innerHTML = `
    <h4>Typing matni</h4>
    <input id="tt" placeholder="Sarlavha"><textarea id="tx" rows="3" placeholder="Matn (20–2000 belgi)"></textarea>
    <button id="addt" class="btn">Saqlash</button>
    <h4>Savollar (CSV)</h4>
    <p class="muted">Ustunlar: question, option_a, option_b, option_c, option_d, correct (A/B/C/D)</p>
    <input id="ct" placeholder="Sarlavha"><input id="cf" type="file" accept=".csv">
    <button id="addc" class="btn">Yuklash</button>
    <h4>Kontentlar</h4>
    ${items.map((c) => `<div class="row2"><span>${esc(c.title)} <small>${esc(c.type)}${c.is_published ? ' ✅' : ''}</small></span>
      <button class="btn btn--ghost" data-pub="${esc(c.id)}">Nashr</button><button class="btn btn--ghost" data-del="${esc(c.id)}">🗑</button></div>`).join('')}`;
  const $ = (s) => box.querySelector(s);
  const run = (fn) => async () => { try { await fn(); await contents(box); } catch (e) { showError(e); } };

  $('#addt').onclick = run(() => api.post('/contents', { type: 'typing_text', title: $('#tt').value.trim(), data: { text: $('#tx').value.trim() } }));
  $('#addc').onclick = run(async () => {
    const file = $('#cf').files[0];
    if (!file) throw Object.assign(new Error('CSV faylni tanlang'), { code: 'VALIDATION_ERROR' });
    const fd = new FormData();
    fd.append('file', file); fd.append('title', $('#ct').value.trim());
    await api.post('/contents/bulk-upload', fd);
    toast('CSV yuklandi', 'success');
  });
  box.querySelectorAll('[data-pub]').forEach((b) => { b.onclick = run(() => api.post(`/contents/${b.dataset.pub}/publish`, {})); });
  box.querySelectorAll('[data-del]').forEach((b) => { b.onclick = run(() => api.del(`/contents/${b.dataset.del}`)); });
}

async function rooms(box) {
  const items = list(await api.get('/contents', { query: { limit: 50 } }), 'contents');
  const opts = (type) => items.filter((c) => c.type === type).map((c) => `<option value="${esc(c.id)}">${esc(c.title)}</option>`).join('');
  box.innerHTML = `
    <select id="gt"><option value="typing">Typing</option><option value="labyrinth">Labirint</option></select>
    <select id="ci"></select>
    <input id="mp" type="number" min="1" placeholder="Maks. o'yinchi">
    <input id="dm" type="number" min="1" placeholder="Davomiyligi (daqiqa)">
    <div id="lab" hidden>
      <select id="md"><option value="kids">Kids (jon yo'q)</option><option value="standard">Standard (jon bor)</option></select>
      <input id="sz" type="number" min="5" max="41" step="2" value="11" placeholder="Labirint o'lchami (toq 5–41)">
    </div>
    <button id="mk" class="btn btn--big">Xona yaratish</button>`;
  const $ = (s) => box.querySelector(s);
  const sync = () => {
    const lab = $('#gt').value === 'labyrinth';
    $('#lab').hidden = !lab;
    $('#ci').innerHTML = opts(lab ? 'questions' : 'typing_text');
  };
  $('#gt').onchange = sync;
  sync();
  $('#mk').onclick = async () => {
    const game = $('#gt').value;
    const body = { game_type: game, content_id: $('#ci').value };
    if ($('#mp').value) body.max_players = Number($('#mp').value);
    if ($('#dm').value) body.duration_minutes = Number($('#dm').value);
    if (game === 'labyrinth') { body.mode = $('#md').value; body.labyrinth = { size: Number($('#sz').value) }; }
    try {
      const r = await api.post('/rooms', body);
      const room = r.room || r;
      location.hash = `#/host/${room.code}?game=${game}`;
    } catch (e) { showError(e); }
  };
}
