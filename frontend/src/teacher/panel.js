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
  const GO = { total_contents: 'contents', published_contents: 'contents', total_classes: 'classes', total_students: 'classes', total_rooms: 'rooms', active_rooms: 'rooms' };
  box.innerHTML = `<div class="grid2">${entries.map(([k, v]) => `<div class="stat ${k === 'active_rooms' ? 'stat--live' : ''} stat--go" role="button" tabindex="0" data-go="${GO[k] || ''}"><b>${esc(v)}</b><span>${esc(LABELS[k] || k)}</span></div>`).join('')}</div>`;
  box.querySelectorAll('[data-go]').forEach((el) => {
    const go = () => { if (el.dataset.go) document.querySelector(`.tab[data-t="${el.dataset.go}"]`)?.click(); };
    el.onclick = go;
    el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
  });
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
  const SAMPLE = 'question,option_a,option_b,option_c,option_d,correct\n'
    + '2+2 nechta?,3,4,5,,B\n'
    + 'Suv qaysi formulada yoziladi?,H2O,CO2,O2,,A';
  box.innerHTML = `
    <div class="row2">
      <button id="cbulk" class="btn">+ CSV yuklash</button>
      <button id="csample" class="btn btn--ghost">Namuna CSV</button>
    </div>
    <details class="ct-fmt"><summary>CSV formati</summary>
      <p>Ustunlar aynan shu tartibda: <code>question,option_a,option_b,option_c,option_d,correct</code></p>
      <p>correct: A, B, C yoki D. option_c va option_d bo'sh bo'lishi mumkin. Bir faylda 1–100 savol, har biriga kamida 2 variant.</p>
      <pre>${esc(SAMPLE)}</pre>
    </details>
    <div id="cform"></div><div id="cbody"></div>`;
  const $ = (s) => box.querySelector(s);
  let sets = [];

  const load = async () => { const r = await api.get('/contents/mine'); sets = r.items || []; showList(); };

  function showList() {
    const g = {};
    sets.forEach((s) => { const k = s.topic || 'Mavzusiz'; (g[k] = g[k] || []).push(s); });
    const keys = Object.keys(g).sort();
    $('#cbody').innerHTML = keys.length ? keys.map((k) => `
      <h3 class="ct-topic">${esc(k)}</h3>
      <div class="ct-grid">${g[k].map((s) => `
        <div class="ct-card" data-open="${esc(s.id)}" role="button" tabindex="0">
          <b>${esc(s.title)}</b>
          <small>${esc(s.level || 1)}-daraja · savollar: ${(s.data?.questions || []).length}</small>
          <span class="ct-badge">${s.is_published ? '✅ nashr etilgan' : '⏳ nashr qilinmagan'}</span>
        </div>`).join('')}</div>`).join('')
      : '<p class="muted">Hali savollar to\'plami yo\'q. CSV yuklang.</p>';
    $('#cbody').querySelectorAll('[data-open]').forEach((el) => {
      el.onclick = () => showSet(el.dataset.open);
      el.onkeydown = (e) => { if (e.key === 'Enter') showSet(el.dataset.open); };
    });
  }

  function showSet(id) {
    const s = sets.find((x) => x.id === id);
    if (!s) return;
    let qs = (s.data?.questions || []).map((q) => ({
      text: q.text || '',
      raw: [0, 1, 2, 3].map((j) => (q.options || [])[j] || ''),
      pick: q.answer ?? -1,
    }));
    const collect = () => [...$('#qlist').querySelectorAll('.ct-q')].map((card) => {
      const c = card.querySelector('input[type=radio]:checked');
      return {
        text: card.querySelector('[data-qtext]').value.trim(),
        raw: [...card.querySelectorAll('[data-o]')].map((i) => i.value.trim()),
        pick: c ? Number(c.value) : -1,
      };
    });
    const qhtml = (q, i) => `<div class="ct-q">
      <div class="row2"><b>${i + 1}.</b><input data-qtext value="${esc(q.text)}" placeholder="Savol matni">
        <button class="btn btn--ghost" data-qdel="${i}" aria-label="Savolni o'chirish">✕</button></div>
      ${q.raw.map((v, j) => `<label class="ct-opt"><input type="radio" name="ans${i}" value="${j}" ${q.pick === j ? 'checked' : ''}>
        <input data-o value="${esc(v)}" placeholder="Variant ${'ABCD'[j]}"></label>`).join('')}
    </div>`;
    const parse = (rows) => {
      const out = [];
      for (let k = 0; k < rows.length; k++) {
        const r = rows[k];
        const filled = r.raw.map((v, j) => ({ v, j })).filter((o) => o.v);
        const ans = filled.findIndex((o) => o.j === r.pick);
        if (!r.text || filled.length < 2 || ans < 0) return { error: `${k + 1}-savol: matn, kamida 2 variant va to'g'ri javob kerak` };
        out.push({ text: r.text, options: filled.map((o) => o.v), answer: ans });
      }
      return { questions: out };
    };
    const save = async () => {
      const rows = collect();
      if (!rows.length) return toast('Kamida bitta savol kerak', 'error');
      const res = parse(rows);
      if (res.error) return toast(res.error, 'error');
      try {
        await api.put(`/contents/${s.id}`, {
          title: $('#et').value.trim(), topic: $('#eg').value.trim() || undefined,
          level: Number($('#el').value), data: { questions: res.questions },
        });
        toast('Saqlandi', 'success'); await load();
      } catch (e) { showError(e); }
    };
    const publish = async () => {
      try { await api.post(`/contents/${s.id}/publish`, {}); toast('Nashr etildi', 'success'); await load(); }
      catch (e) { showError(e); }
    };
    const removeSet = async () => {
      if (!confirm("To'plam o'chirilsinmi?")) return;
      try { await api.del(`/contents/${s.id}`); toast("O'chirildi", 'success'); await load(); }
      catch (e) { showError(e); }
    };
    const draw = () => {
      $('#cbody').innerHTML = `
        <button id="back" class="btn btn--ghost">← Orqaga</button>
        <div class="ct-edit">
          <input id="et" value="${esc(s.title)}" aria-label="Sarlavha">
          <input id="eg" value="${esc(s.topic || '')}" placeholder="Mavzu" aria-label="Mavzu">
          <select id="el" aria-label="Daraja">${[1, 2, 3, 4].map((n) => `<option value="${n}"${Number(s.level) === n ? ' selected' : ''}>${n}-daraja</option>`).join('')}</select>
        </div>
        <div id="qlist">${qs.map(qhtml).join('') || "<p class=\"muted\">Savol yo'q. Qo'shing.</p>"}</div>
        <div class="row2">
          <button id="qadd" class="btn btn--ghost">+ Savol qo'shish</button>
          <button id="qsave" class="btn">Saqlash</button>
          ${s.is_published ? '' : '<button id="qpub" class="btn">Nashr</button>'}
          <button id="qdel" class="btn btn--ghost">To'plamni o'chirish</button>
        </div>`;
      $('#back').onclick = showList;
      $('#qadd').onclick = () => { qs = collect(); qs.push({ text: '', raw: ['', '', '', ''], pick: -1 }); draw(); };
      $('#qlist').onclick = (e) => {
        const b = e.target.closest('[data-qdel]');
        if (!b) return;
        qs = collect(); qs.splice(Number(b.dataset.qdel), 1); draw();
      };
      $('#qsave').onclick = save;
      $('#qpub')?.addEventListener('click', publish);
      $('#qdel').onclick = removeSet;
    };
    draw();
  }

  $('#cbulk').onclick = () => {
    $('#cform').innerHTML = `<div class="row2">
      <input id="bt" placeholder="To'plam sarlavhasi (3+ belgi)">
      <input id="bg" placeholder="Mavzu (masalan: Matematika)">
      <select id="bl" aria-label="Daraja">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n}-daraja</option>`).join('')}</select>
      <input id="bf" type="file" accept=".csv">
      <button id="bsave" class="btn">Yuklash</button></div>`;
    $('#bsave').onclick = async () => {
      const f = $('#bf').files[0];
      if (!f) return toast('CSV fayl tanlang', 'error');
      const fd = new FormData();
      fd.append('file', f);
      fd.append('title', $('#bt').value.trim());
      fd.append('topic', $('#bg').value.trim() || 'Mavzusiz');
      fd.append('level', $('#bl').value);
      try { await api.post('/contents/bulk-upload', fd); toast('Yuklandi. Nashr qiling.', 'success'); $('#cform').innerHTML = ''; await load(); }
      catch (e) { showError(e); }
    };
  };

  $('#csample').onclick = () => {
    const blob = new Blob(['\ufeff' + SAMPLE + '\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'savollar-namuna.csv';
    document.body.appendChild(a); a.click(); a.remove();
  };

  await load();
}


async function rooms(box) {
  const GAME = { typing: 'Typing', labyrinth: 'Labirint' };
  const ST = { waiting: 'kutilmoqda', active: 'faol', finished: 'tugagan' };
  const isLive = (x) => x.status !== 'finished' && new Date(x.expires_at) > Date.now();
  const card = (x, live) => `<div class="row2 room-card">
      <span><b>${esc(x.code)}</b> ${esc(GAME[x.game_type] || x.game_type)} · ${esc(ST[x.status] || x.status)} · o'yinchi: ${esc(x.players)}</span>
      <button class="btn" data-open="${esc(x.code)}" data-game="${esc(x.game_type)}">${live ? 'Kuzatish' : "Ko'rish"}</button>
      ${live ? `<button class="btn btn--ghost" data-close="${esc(x.code)}">Yopish</button>` : ''}
    </div>`;

  async function load() {
    const r = await api.get('/rooms/mine');
    const items = r.items || [];
    const live = items.filter(isLive);
    const done = items.filter((x) => !isLive(x)).slice(0, 15);
    $list.innerHTML = `<h3>Faol xonalar (${live.length})</h3>${live.map((x) => card(x, true)).join('') || '<p class="muted">Faol xona yo\'q</p>'}
`;
  }

  box.innerHTML = `<button id="nr-toggle" class="btn">+ Yangi xona</button>
    <div id="nr-form" class="row2" hidden>
      <select id="nr-game"><option value="labyrinth">Labirint</option><option value="typing">Typing</option></select>
      <select id="nr-lang" class="typ-only" aria-label="Til"><option value="uz">O'zbekcha</option><option value="ru">Русский</option></select>
      <select id="nr-content" class="lab-only"><option value="">yuklanmoqda…</option></select>
      <select id="nr-size" class="lab-only"><option value="11">11×11</option><option value="15" selected>15×15</option><option value="21">21×21</option></select>
      <select id="nr-mode" class="lab-only"><option value="standard">Standart (3 jon)</option><option value="kids">Bolalar (jonsiz)</option></select>
      <input id="nr-min" type="number" min="1" max="120" value="10" placeholder="daqiqa">
      <button id="nr-go" class="btn">Yaratish</button>
    </div>
    <div id="rooms-list"></div>`;
  const $list = box.querySelector('#rooms-list');

  const fillContent = async () => {
    const type = box.querySelector('#nr-game').value === 'typing' ? 'typing_text' : 'questions';
    const r = await api.get('/contents', { query: { type, limit: 50 } });
    const items = (r.items || []).filter((c) => c.is_published);
    box.querySelector('#nr-content').innerHTML = items.length
      ? groupOpts(items)
      : '<option value="">Nashr etilgan kontent yo\'q</option>';
    box.querySelectorAll('.lab-only').forEach((el) => { el.hidden = box.querySelector('#nr-game').value !== 'labyrinth'; });
    box.querySelectorAll('.typ-only').forEach((el) => { el.hidden = box.querySelector('#nr-game').value !== 'typing'; });
  };

  box.querySelector('#nr-toggle').onclick = async () => {
    const f = box.querySelector('#nr-form');
    f.hidden = !f.hidden;
    if (!f.hidden) await fillContent();
  };
  box.querySelector('#nr-game').onchange = fillContent;

  box.querySelector('#nr-go').onclick = async () => {
    const game = box.querySelector('#nr-game').value;
    const content_id = box.querySelector('#nr-content').value;
    if (game === 'labyrinth' && !content_id) { toast('Avval nashr etilgan savollar to\'plamini tanlang', 'error'); return; }
    const body = { game_type: game, max_players: 30, duration_minutes: Number(box.querySelector('#nr-min').value) || 10 };
    if (game === 'labyrinth') body.content_id = content_id;
    else body.language = box.querySelector('#nr-lang').value;
    if (game === 'labyrinth') { body.mode = box.querySelector('#nr-mode').value; body.labyrinth = { size: Number(box.querySelector('#nr-size').value) }; }
    try {
      const r = await api.post('/rooms', body);
      toast('Xona yaratildi: ' + r.room.code, 'success');
      location.hash = `#/host/${r.room.code}?game=${game}`;
    } catch (e) { showError(e); }
  };

  $list.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]');
    const c = e.target.closest('[data-close]');
    if (o) location.hash = `#/host/${o.dataset.open}?game=${o.dataset.game || 'typing'}`;
    if (c) {
      if (!confirm("Xonani yopasizmi? O'yin tugaydi.")) return;
      try { await api.post(`/rooms/${c.dataset.close}/close`, {}); toast('Xona yopildi', 'success'); await load(); }
      catch (err) { showError(err); }
    }
  });

  await load();
}


async function roomsOld(box) {
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

function groupOpts(items) {
  const g = {};
  items.forEach((c) => { const k = c.topic || 'Mavzusiz'; (g[k] = g[k] || []).push(c); });
  return Object.keys(g).sort().map((k) => '<optgroup label="' + esc(k) + '">' + g[k].map((c) => '<option value="' + esc(c.id) + '">' + esc(c.title) + '</option>').join('') + '</optgroup>').join('');
}
