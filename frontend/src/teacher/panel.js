/** @file Ustoz paneli: dashboard, sinflar (+analitika), kontent (matn + CSV), xona yaratish. */
import '../styles/home.css';
import '../styles/teacher.css';
import { api, auth } from '../core/api.js';
import { disconnectSocket } from '../core/socket.js';
import { getUser } from '../core/state.js';
import { showError, toast } from '../core/toast.js';
import { html, esc, table } from '../utils/dom.js';
import { t } from '../i18n/index.js';

const TABS = [['dash', 'Panel'], ['classes', 'Sinflar'], ['contents', 'Kontent'], ['rooms', 'Xona']];
const list = (r, key) => r[key] || r.items || (Array.isArray(r) ? r : []);

/** @param {HTMLElement} root @returns {Promise<()=>void>} */
export async function mountTeacher(root) {
  const name = getUser()?.nickname || 'Ustoz';
  const LOGO = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>';
  const el = html(`
    <section class="tp">
      <header class="tp-top">
        <div class="hm-brand"><span class="hm-logo">${LOGO}</span>CodeKids</div>
        <div class="hm-right">
          <button class="hm-me" id="tp-me"><span class="hm-ava">${esc(name[0].toUpperCase())}</span>${esc(name)}</button>
          <button class="btn btn--ghost tp-out tp-out--top" data-out>Chiqish</button>
        </div>
      </header>
      <div class="tp-hi"><h1>Ustoz paneli</h1><p>Salom, ${esc(name)}!</p></div>
      <nav class="tp-tabs" aria-label="Bo'limlar">${TABS.map(([k, l]) => `<button class="tab" data-t="${k}">${l}</button>`).join('')}</nav>
      <div id="tab"></div>
      <button class="btn btn--ghost tp-out" data-out>Chiqish</button>
    </section>`);
  root.replaceChildren(el);
  const box = el.querySelector('#tab');
  const views = { dash, classes, contents, rooms };

  async function open(k) {
    el.querySelectorAll('.tab').forEach((b) => {
      b.classList.toggle('is-on', b.dataset.t === k);
      if (b.dataset.t === k) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
    });
    box.replaceChildren(html('<div class="skeleton"></div>'));
    try { await views[k](box); } catch (e) { showError(e); box.textContent = ''; }
  }
  el._open = open;
  el.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => open(b.dataset.t)));
  el.querySelectorAll('[data-out]').forEach((b) => {
    b.onclick = async () => { await auth.logout(); disconnectSocket(); location.hash = '#/'; window.dispatchEvent(new HashChangeEvent('hashchange')); };
  });
  el.querySelector('#tp-me').onclick = () => toast('Profil tez orada');
  open('dash');
  return () => {};
}

/** Panel: faol xonalar, statistika, "Yangi xona". Kalit nomlari backend versiyasiga qarab farq qilishi mumkin. */
async function dash(box) {
  const d = await api.get('/teacher/dashboard');
  const o = d.dashboard || d;
  const v = (...ks) => { for (const k of ks) if (o[k] != null) return o[k]; return 0; };
  box.innerHTML = `
    <button class="tp-live" data-go="rooms"><span><i></i>Faol xonalar</span><b>${esc(v('active_rooms'))}</b></button>
    <div class="tp-stats">
      <button class="tp-stat" data-go="rooms"><b>${esc(v('total_rooms', 'rooms'))}</b><span>Jami xonalar</span></button>
      <button class="tp-stat" data-go="contents"><b>${esc(v('total_contents', 'contents'))}</b><span>Kontentlar</span></button>
      <button class="tp-stat" data-go="classes"><b>${esc(v('total_classes', 'classes'))}</b><span>Sinflar</span></button>
      <button class="tp-stat" data-go="classes"><b>${esc(v('total_students', 'students'))}</b><span>O'quvchilar</span></button>
    </div>
    <button class="btn tp-new" id="tp-new">＋ Yangi xona</button>`;
  const panel = box.closest('.tp');
  box.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => panel._open(b.dataset.go); });
  box.querySelector('#tp-new').onclick = async () => { await panel._open('rooms'); box.querySelector('#nr-toggle')?.click(); };
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
  const SAMPLE = 'question,option_a,option_b,option_c,option_d,correct\n2+2 nechta?,3,4,5,,B\nSuv qaysi formulada yoziladi?,H2O,CO2,O2,,A';
  const IC = {
    plus: '<path d="M12 5v14M5 12h14"/>', up: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    doc: '<path d="M6 3h9l4 4v14H6zM14 3v5h5M9 13h6M9 17h4"/>', back: '<path d="M15 5l-7 7 7 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>', ok: '<path d="M5 12l5 5 9-10"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  };
  const ic = (k, s = 18) => `<svg aria-hidden="true" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${IC[k]}</svg>`;
  const COLORS = ['var(--sky)', 'var(--mint)', 'var(--lav)', 'var(--peach)', 'var(--butter)'];
  const $ = (s) => box.querySelector(s);
  let sets = [];

  const load = async () => {
    const r = await api.get('/contents/mine');
    sets = (r.items || []).filter((s) => s.type !== 'typing_text');
    showList();
  };

  function showList() {
    const g = {};
    sets.forEach((s) => { const k = s.topic || 'Mavzusiz'; (g[k] = g[k] || []).push(s); });
    const keys = Object.keys(g).sort();
    box.innerHTML = `
      <div class="ct-acts">
        <button class="btn" id="cnew">${ic('plus')}Yangi to'plam</button>
        <button class="btn btn--ghost" id="cbulk">${ic('up')}CSV yuklash</button>
      </div>
      <div id="cform"></div>
      <details class="ct-fmt"><summary>CSV fayl qanday bo'lishi kerak?</summary>
        <p>Ustunlar aynan shu tartibda: <code>question,option_a,option_b,option_c,option_d,correct</code></p>
        <p>correct: A, B, C yoki D. option_c va option_d bo'sh bo'lishi mumkin. Bir faylda 1–100 savol.</p>
        <pre>${esc(SAMPLE)}</pre>
        <button class="btn btn--ghost" id="csample">Namuna CSV yuklab olish</button>
      </details>
      ${keys.length ? keys.map((k, i) => `<section class="ct-sec">
        <div class="ct-sh"><i style="background:${COLORS[i % 5]}"></i><h2>${esc(k)}</h2><span>${g[k].length} ta to'plam</span></div>
        <div class="ct-grid">${g[k].map((s) => `<button class="ct-card" data-open="${esc(s.id)}">
          <span class="ct-ic" style="background:${COLORS[i % 5]}">${ic('doc', 22)}</span>
          <span class="ct-txt"><b>${esc(s.title)}</b><span class="ct-meta">
            <span>${esc(s.level || 1)}-daraja · ${(s.data?.questions || []).length} ta savol</span>
            <span class="ct-badge ${s.is_published ? 'is-pub' : ''}">${s.is_published ? ic('ok', 14) + 'Nashr etilgan' : ic('clock', 14) + 'Nashr qilinmagan'}</span>
          </span></span></button>`).join('')}</div></section>`).join('')
      : `<p class="ct-empty">Hali savollar to'plami yo'q. «Yangi to'plam» yoki «CSV yuklash» bilan boshlang.</p>`}`;
    box.querySelectorAll('[data-open]').forEach((el) => { el.onclick = () => showSet(sets.find((x) => x.id === el.dataset.open)); });
    $('#cnew').onclick = () => showSet(null);
    $('#cbulk').onclick = bulkForm;
    $('#csample').onclick = downloadSample;
  }

  function bulkForm() {
    $('#cform').innerHTML = `<div class="ct-bulk">
      <label><span>To'plam sarlavhasi</span><input id="bt" placeholder="Kamida 3 belgi"></label>
      <label><span>Mavzu</span><input id="bg" placeholder="Masalan: Matematika"></label>
      <label><span>Daraja</span><select id="bl">${[1, 2, 3, 4].map((n) => `<option value="${n}">${n}-daraja</option>`).join('')}</select></label>
      <label><span>CSV fayl</span><input id="bf" type="file" accept=".csv"></label>
      <div class="ct-bulk-b"><button class="btn" id="bsave">Yuklash</button><button class="btn btn--ghost" id="bx">Bekor qilish</button></div>
    </div>`;
    $('#bx').onclick = () => { $('#cform').innerHTML = ''; };
    $('#bsave').onclick = async () => {
      const f = $('#bf').files[0];
      if (!f) return toast('CSV fayl tanlang', 'error');
      const fd = new FormData();
      fd.append('file', f);
      fd.append('title', $('#bt').value.trim());
      fd.append('topic', $('#bg').value.trim() || 'Mavzusiz');
      fd.append('level', $('#bl').value);
      try { await api.post('/contents/bulk-upload', fd); toast('Yuklandi. Endi nashr qiling.', 'success'); await load(); }
      catch (e) { showError(e); }
    };
  }

  function downloadSample() {
    const blob = new Blob(['\ufeff' + SAMPLE + '\n'], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'savollar-namuna.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  function showSet(s) {
    const isNew = !s;
    const blank = () => ({ text: '', raw: ['', '', '', ''], pick: -1 });
    let qs = isNew ? [blank()] : (s.data?.questions || []).map((q) => ({
      text: q.text || '', raw: [0, 1, 2, 3].map((j) => (q.options || [])[j] || ''), pick: q.answer ?? -1,
    }));
    const meta = { title: s?.title || '', topic: s?.topic || '', level: Number(s?.level) || 1 };
    const collect = () => {
      meta.title = $('#et').value.trim(); meta.topic = $('#eg').value.trim(); meta.level = Number($('#el').value);
      qs = [...box.querySelectorAll('.qe')].map((c) => {
        const r = c.querySelector('input[type=radio]:checked');
        return { text: c.querySelector('textarea').value.trim(), raw: [...c.querySelectorAll('[data-o]')].map((i) => i.value.trim()), pick: r ? Number(r.value) : -1 };
      });
    };
    const parse = () => {
      const out = [];
      for (let k = 0; k < qs.length; k++) {
        const r = qs[k];
        const filled = r.raw.map((v, j) => ({ v, j })).filter((o) => o.v);
        const ans = filled.findIndex((o) => o.j === r.pick);
        if (!r.text || filled.length < 2 || ans < 0) return { error: `${k + 1}-savol: matn, kamida 2 variant va to'g'ri javob kerak` };
        out.push({ text: r.text, options: filled.map((o) => o.v), answer: ans });
      }
      return { questions: out };
    };
    const qhtml = (q, i) => `<div class="qe">
      <div class="qe-h"><span class="qe-n">${i + 1}</span>
        <textarea rows="2" placeholder="Savol matni" aria-label="${i + 1}-savol matni">${esc(q.text)}</textarea>
        <button class="qe-del" data-qdel="${i}" aria-label="${i + 1}-savolni o'chirish">${ic('x')}</button></div>
      ${q.raw.map((v, j) => `<label class="qe-o${q.pick === j ? ' is-ok' : ''}"><input type="radio" name="ans${i}" value="${j}"${q.pick === j ? ' checked' : ''} aria-label="${'ABCD'[j]} to'g'ri javob"><span>${'ABCD'[j]}</span><input data-o value="${esc(v)}" placeholder="Variant ${'ABCD'[j]}${j > 1 ? ' (ixtiyoriy)' : ''}"></label>`).join('')}
      ${q.pick < 0 ? `<div class="qe-hint">To'g'ri javobni belgilang</div>` : ''}
    </div>`;
    const draw = () => {
      const pub = s?.is_published;
      box.innerHTML = `
        <div class="qe-top"><button class="qe-back" id="back" aria-label="Kontentlarga qaytish">${ic('back', 20)}</button>
          <div><b>${isNew ? "Yangi to'plam" : "To'plamni tahrirlash"}</b><small>${qs.length} ta savol${isNew ? '' : ` · <span class="${pub ? 'ok' : 'wait'}">${pub ? 'nashr etilgan' : 'nashr qilinmagan'}</span>`}</small></div></div>
        <div class="qe-meta">
          <label><span>Sarlavha</span><input id="et" value="${esc(meta.title)}" placeholder="Masalan: Kompyuter qismlari"></label>
          <label><span>Mavzu</span><input id="eg" value="${esc(meta.topic)}" placeholder="Masalan: Informatika"></label>
          <label><span>Daraja</span><select id="el">${[1, 2, 3, 4].map((n) => `<option value="${n}"${meta.level === n ? ' selected' : ''}>${n}-daraja</option>`).join('')}</select></label>
        </div>
        <div id="qlist">${qs.map(qhtml).join('')}</div>
        <button class="btn btn--ghost qe-add" id="qadd">${ic('plus')}Savol qo'shish</button>
        <div class="qe-bar"><button class="btn" id="qsave">Saqlash</button>${!isNew && !pub ? '<button class="btn qe-pub" id="qpub">Nashr qilish</button>' : ''}</div>
        ${isNew ? '' : `<button class="qe-rm" id="qrm">To'plamni o'chirish</button>`}`;
      $('#back').onclick = showList;
      $('#qadd').onclick = () => { collect(); qs.push(blank()); draw(); };
      $('#qlist').addEventListener('click', (e) => {
        const b = e.target.closest('[data-qdel]');
        if (!b) return;
        collect(); qs.splice(Number(b.dataset.qdel), 1); draw();
      });
      $('#qlist').addEventListener('change', (e) => {
        if (e.target.type !== 'radio') return;
        const card = e.target.closest('.qe');
        card.querySelectorAll('.qe-o').forEach((l) => l.classList.toggle('is-ok', l.contains(e.target)));
        card.querySelector('.qe-hint')?.remove();
      });
      $('#qsave').onclick = async () => {
        collect();
        if (meta.title.length < 3) return toast('Sarlavha kamida 3 belgi', 'error');
        if (!qs.length) return toast('Kamida bitta savol kerak', 'error');
        const res = parse();
        if (res.error) return toast(res.error, 'error');
        const body = { title: meta.title, topic: meta.topic || undefined, level: meta.level, data: { questions: res.questions } };
        try {
          if (isNew) await api.post('/contents', { type: 'questions', ...body });
          else await api.put(`/contents/${s.id}`, body);
          toast('Saqlandi', 'success'); await load();
        } catch (e) { showError(e); }
      };
      $('#qpub')?.addEventListener('click', async () => {
        try { await api.post(`/contents/${s.id}/publish`, {}); toast('Nashr etildi', 'success'); await load(); } catch (e) { showError(e); }
      });
      $('#qrm')?.addEventListener('click', async () => {
        if (!confirm("To'plam o'chirilsinmi?")) return;
        try { await api.del(`/contents/${s.id}`); toast("O'chirildi", 'success'); await load(); } catch (e) { showError(e); }
      });
    };
    draw();
  }

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
      <select id="nr-lang" class="typ-only" aria-label="Til"><option value="uz">O'zbekcha</option><option value="ru">Русский</option><option value="en">English</option></select>
      <select id="nr-content" class="lab-only"><option value="">yuklanmoqda…</option></select>
      <select id="nr-mode" class="lab-only"><option value="standard">Standart (3 jon)</option><option value="kids">Bolalar (jonsiz)</option></select>
      <input id="nr-min" type="number" min="20" max="120" value="20" placeholder="daqiqa">
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
    const body = { game_type: game, max_players: 30, duration_minutes: Math.max(20, Number(box.querySelector('#nr-min').value) || 20) };
    if (game === 'labyrinth') body.content_id = content_id;
    else body.language = box.querySelector('#nr-lang').value;
    if (game === 'labyrinth') { body.mode = box.querySelector('#nr-mode').value; }
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
