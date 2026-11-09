/** @file Ustoz paneli: dashboard, sinflar (+analitika), kontent (matn + CSV), xona yaratish. */
import '../styles/home.css';
import '../styles/teacher.css';
import { api, auth } from '../core/api.js';
import { disconnectSocket } from '../core/socket.js';
import { getUser } from '../core/state.js';
import { showError, toast } from '../core/toast.js';
import { html, esc, table } from '../utils/dom.js';
import { t, getLang, langButton } from '../i18n/index.js';

/** Savollar to'plami tili tanlovi. */
const langSel = (id, v) => `<select id="${id}">${[['uz', "O'zbekcha"], ['ru', 'Русский']].map(([k, l]) => `<option value="${k}"${k === v ? ' selected' : ''}>${l}</option>`).join('')}</select>`;

const TABS = [['dash', t('tp.tab.dash')], ['classes', t('pf.classes')], ['contents', t('tp.tab.contents')], ['rooms', t('tp.tab.rooms')]];
const list = (r, key) => r[key] || r.items || (Array.isArray(r) ? r : []);

/** @param {HTMLElement} root @returns {Promise<()=>void>} */
export async function mountTeacher(root) {
  const name = getUser()?.nickname || t('au.teacher');
  const LOGO = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>';
  const el = html(`
    <section class="tp">
      <header class="tp-top">
        <div class="hm-brand"><span class="hm-logo">${LOGO}</span>CodeKids</div>
        <div class="hm-right">
          ${langButton()}
          <button class="hm-me" id="tp-me"><span class="hm-ava">${esc(name[0].toUpperCase())}</span>${esc(name)}</button>
          <button class="btn btn--ghost tp-out tp-out--top" data-out>${t('app.logout')}</button>
        </div>
      </header>
      <div class="tp-hi"><h1>${t('home.teacherPanel')}</h1><p>${t('home.hi', { name: esc(name) })}</p></div>
      <nav class="tp-tabs" aria-label="${t('tp.sections')}">${TABS.map(([k, l]) => `<button class="tab" data-t="${k}">${l}</button>`).join('')}</nav>
      <div id="tab"></div>
      <button class="btn btn--ghost tp-out" data-out>${t('app.logout')}</button>
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
  const logout = async () => { await auth.logout(); disconnectSocket(); location.hash = '#/'; window.dispatchEvent(new HashChangeEvent('hashchange')); };
  el.querySelectorAll('[data-out]').forEach((b) => { b.onclick = logout; });
  el.querySelector('#tp-me').onclick = async () => {
    const { openProfile } = await import('../ui/profile.js');
    openProfile({
      onLogout: logout,
      onChange: (u) => {
        const n = u.nickname || t('au.teacher');
        el.querySelector('#tp-me').innerHTML = `<span class="hm-ava">${esc(n[0].toUpperCase())}</span>${esc(n)}`;
        el.querySelector('.tp-hi p').textContent = t('home.hi', { name: n });
      },
    });
  };
  open('dash');
  return () => {};
}

/** Panel: faol xonalar, statistika, "Yangi xona". Kalit nomlari backend versiyasiga qarab farq qilishi mumkin. */
async function dash(box) {
  const d = await api.get('/teacher/dashboard');
  const o = d.dashboard || d;
  const v = (...ks) => { for (const k of ks) if (o[k] != null) return o[k]; return 0; };
  box.innerHTML = `
    <button class="tp-live" data-go="rooms"><span><i></i>${t('dash.active_rooms')}</span><b>${esc(v('active_rooms'))}</b></button>
    <div class="tp-stats">
      <button class="tp-stat" data-go="rooms"><b>${esc(v('total_rooms', 'rooms'))}</b><span>${t('dash.total_rooms')}</span></button>
      <button class="tp-stat" data-go="contents"><b>${esc(v('total_contents', 'contents'))}</b><span>${t('tp.contents')}</span></button>
      <button class="tp-stat" data-go="classes"><b>${esc(v('total_classes', 'classes'))}</b><span>${t('pf.classes')}</span></button>
      <button class="tp-stat" data-go="classes"><b>${esc(v('total_students', 'students'))}</b><span>${t('pf.students')}</span></button>
    </div>
    <button class="btn tp-new" id="tp-new">＋ ${t('tp.newRoom')}</button>`;
  const panel = box.closest('.tp');
  box.querySelectorAll('[data-go]').forEach((b) => { b.onclick = () => panel._open(b.dataset.go); });
  box.querySelector('#tp-new').onclick = async () => { await panel._open('rooms'); box.querySelector('#nr-toggle')?.click(); };
}

async function classes(box) {
  const items = list(await api.get('/teacher/classes'), 'classes');
  box.innerHTML = `<div class="row2"><input id="cn" placeholder="${t('tp.newClass')}"><button id="cadd" class="btn">+</button></div>
    ${items.map((c) => `<button class="tile tile--sm" data-id="${esc(c.id)}">${esc(c.name)} <small>${t('hs.students', { n: c.student_count ?? 0 })}</small></button>`).join('')}`;
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
    <div class="row2"><input id="em" type="email" placeholder="${t('tp.studentEmail')}"><button id="ad" class="btn">${t('tp.add')}</button></div>
    ${table(students)}
    ${students.length ? `<div class="row2"><select id="sel">${students.map((s) => `<option value="${esc(s.id)}">${esc(s.nickname || s.email)}</option>`).join('')}</select><button id="rm" class="btn btn--ghost">${t('host.kick')}</button></div>` : ''}
    <div class="row2"><input id="rc" placeholder="room_code (${t('au.optional').toLowerCase()})"><button id="an" class="btn">${t('tp.analyze')}</button></div><div id="out"></div>`;
  const $ = (s) => box.querySelector(s);
  $('#bk').onclick = () => classes(box);
  $('#ad').onclick = async () => {
    try { await api.post(`/teacher/classes/${id}/students`, { email: $('#em').value.trim() }); toast(t('tp.added'), 'success'); await classDetail(box, id); } catch (e) { showError(e); }
  };
  $('#rm')?.addEventListener('click', async () => {
    try { await api.del(`/teacher/classes/${id}/students/${$('#sel').value}`); await classDetail(box, id); } catch (e) { showError(e); }
  });
  $('#an').onclick = async () => {
    try {
      const a = await api.get(`/teacher/classes/${id}/analytics`, { query: { room_code: $('#rc').value.trim() } });
      const sum = a.summary || {};
      $('#out').innerHTML = `<div class="grid2">${Object.entries(sum).filter(([, v]) => typeof v !== 'object').map(([k, v]) => `<div class="stat"><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
        <h4>${t('pf.students')}</h4>${table(a.students)}<h4>${t('tp.weak')}</h4>${table(a.weak_topics)}`;
    } catch (e) { showError(e); }
  };
}

async function contents(box) {
  const SAMPLE = `question,option_a,option_b,option_c,option_d,correct\n${t('tp.sample')}`;
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
    sets.forEach((s) => { const k = s.topic || t('tp.noTopic'); (g[k] = g[k] || []).push(s); });
    const keys = Object.keys(g).sort();
    box.innerHTML = `
      <div class="ct-acts">
        <button class="btn" id="cnew">${ic('plus')}${t('tp.newSet')}</button>
        <button class="btn btn--ghost" id="cbulk">${ic('up')}${t('tp.csvUpload')}</button>
      </div>
      <div id="cform"></div>
      <details class="ct-fmt"><summary>${t('tp.csvHow')}</summary>
        <p>${t('tp.csvCols')}: <code>question,option_a,option_b,option_c,option_d,correct</code></p>
        <p>${t('tp.csvRules')}</p>
        <pre>${esc(SAMPLE)}</pre>
        <button class="btn btn--ghost" id="csample">${t('tp.csvSample')}</button>
      </details>
      ${keys.length ? keys.map((k, i) => `<section class="ct-sec">
        <div class="ct-sh"><i style="background:${COLORS[i % 5]}"></i><h2>${esc(k)}</h2><span>${t('tp.nSets', { n: g[k].length })}</span></div>
        <div class="ct-grid">${g[k].map((s) => `<button class="ct-card" data-open="${esc(s.id)}">
          <span class="ct-ic" style="background:${COLORS[i % 5]}">${ic('doc', 22)}</span>
          <span class="ct-txt"><b>${esc(s.title)}</b><span class="ct-meta">
            <span>${s.language === 'ru' ? 'RU · ' : ''}${t('app.level', { n: esc(s.level || 1) })} · ${t('tp.nQ', { n: (s.data?.questions || []).length })}</span>
            <span class="ct-badge ${s.is_published ? 'is-pub' : ''}">${s.is_published ? ic('ok', 14) + t('tp.pub') : ic('clock', 14) + t('tp.unpub')}</span>
          </span></span></button>`).join('')}</div></section>`).join('')
      : `<p class="ct-empty">${t('tp.noSets')}</p>`}`;
    box.querySelectorAll('[data-open]').forEach((el) => { el.onclick = () => showSet(sets.find((x) => x.id === el.dataset.open)); });
    $('#cnew').onclick = () => showSet(null);
    $('#cbulk').onclick = bulkForm;
    $('#csample').onclick = downloadSample;
  }

  function bulkForm() {
    $('#cform').innerHTML = `<div class="ct-bulk">
      <label><span>${t('tp.setTitle')}</span><input id="bt" placeholder="${t('tp.min3')}"></label>
      <label><span>${t('tp.topic')}</span><input id="bg" placeholder="${t('tp.topicPh')}"></label>
      <label><span>${t('tp.level')}</span><select id="bl">${[1, 2, 3, 4].map((n) => `<option value="${n}">${t('app.level', { n })}</option>`).join('')}</select></label>
      <label><span>${t('tp.lang')}</span>${langSel('bln', getLang())}</label>
      <label><span>${t('tp.csvFile')}</span><input id="bf" type="file" accept=".csv"></label>
      <div class="ct-bulk-b"><button class="btn" id="bsave">${t('tp.upload')}</button><button class="btn btn--ghost" id="bx">${t('app.cancel')}</button></div>
    </div>`;
    $('#bx').onclick = () => { $('#cform').innerHTML = ''; };
    $('#bsave').onclick = async () => {
      const f = $('#bf').files[0];
      if (!f) return toast(t('tp.pickCsv'), 'error');
      const fd = new FormData();
      fd.append('file', f);
      fd.append('title', $('#bt').value.trim());
      fd.append('topic', $('#bg').value.trim() || t('tp.noTopic'));
      fd.append('language', $('#bln').value);
      fd.append('level', $('#bl').value);
      try { await api.post('/contents/bulk-upload', fd); toast(t('tp.uploaded'), 'success'); await load(); }
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
    const meta = { title: s?.title || '', topic: s?.topic || '', level: Number(s?.level) || 1, language: s?.language || getLang() };
    const collect = () => {
      meta.title = $('#et').value.trim(); meta.topic = $('#eg').value.trim(); meta.level = Number($('#el').value); meta.language = $('#eln').value;
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
        if (!r.text || filled.length < 2 || ans < 0) return { error: t('tp.qInvalid', { n: k + 1 }) };
        out.push({ text: r.text, options: filled.map((o) => o.v), answer: ans });
      }
      return { questions: out };
    };
    const qhtml = (q, i) => `<div class="qe">
      <div class="qe-h"><span class="qe-n">${i + 1}</span>
        <textarea rows="2" placeholder="${t('tp.qText')}" aria-label="${t('tp.qTextN', { n: i + 1 })}">${esc(q.text)}</textarea>
        <button class="qe-del" data-qdel="${i}" aria-label="${t('tp.qDel', { n: i + 1 })}">${ic('x')}</button></div>
      ${q.raw.map((v, j) => `<label class="qe-o${q.pick === j ? ' is-ok' : ''}"><input type="radio" name="ans${i}" value="${j}"${q.pick === j ? ' checked' : ''} aria-label="${t('tp.correctOpt', { x: 'ABCD'[j] })}"><span>${'ABCD'[j]}</span><input data-o value="${esc(v)}" placeholder="${t('tp.opt')} ${'ABCD'[j]}${j > 1 ? ` (${t('au.optional').toLowerCase()})` : ''}"></label>`).join('')}
      ${q.pick < 0 ? `<div class="qe-hint">${t('tp.markCorrect')}</div>` : ''}
    </div>`;
    const draw = () => {
      const pub = s?.is_published;
      box.innerHTML = `
        <div class="qe-top"><button class="qe-back" id="back" aria-label="${t('tp.backToContents')}">${ic('back', 20)}</button>
          <div><b>${isNew ? t('tp.newSet') : t('tp.editSet')}</b><small>${t('tp.nQ', { n: qs.length })}${isNew ? '' : ` · <span class="${pub ? 'ok' : 'wait'}">${(pub ? t('tp.pub') : t('tp.unpub')).toLowerCase()}</span>`}</small></div></div>
        <div class="qe-meta">
          <label><span>${t('tp.title')}</span><input id="et" value="${esc(meta.title)}" placeholder="${t('tp.titlePh')}"></label>
          <label><span>${t('tp.topic')}</span><input id="eg" value="${esc(meta.topic)}" placeholder="${t('tp.topicPh2')}"></label>
          <label><span>${t('tp.level')}</span><select id="el">${[1, 2, 3, 4].map((n) => `<option value="${n}"${meta.level === n ? ' selected' : ''}>${t('app.level', { n })}</option>`).join('')}</select></label>
          <label><span>${t('tp.lang')}</span>${langSel('eln', meta.language)}</label>
        </div>
        <div id="qlist">${qs.map(qhtml).join('')}</div>
        <button class="btn btn--ghost qe-add" id="qadd">${ic('plus')}${t('tp.addQ')}</button>
        <div class="qe-bar"><button class="btn" id="qsave">${t('app.save')}</button>${!isNew && !pub ? `<button class="btn qe-pub" id="qpub">${t('tp.publish')}</button>` : ''}</div>
        ${isNew ? '' : `<button class="qe-rm" id="qrm">${t('tp.delSet')}</button>`}`;
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
        if (meta.title.length < 3) return toast(t('tp.titleMin'), 'error');
        if (!qs.length) return toast(t('tp.needQ'), 'error');
        const res = parse();
        if (res.error) return toast(res.error, 'error');
        const body = { title: meta.title, topic: meta.topic || undefined, level: meta.level, language: meta.language, data: { questions: res.questions } };
        try {
          if (isNew) await api.post('/contents', { type: 'questions', ...body });
          else await api.put(`/contents/${s.id}`, body);
          toast(t('app.saved'), 'success'); await load();
        } catch (e) { showError(e); }
      };
      $('#qpub')?.addEventListener('click', async () => {
        try { await api.post(`/contents/${s.id}/publish`, {}); toast(t('tp.published'), 'success'); await load(); } catch (e) { showError(e); }
      });
      $('#qrm')?.addEventListener('click', async () => {
        if (!confirm(t('tp.confirmDel'))) return;
        try { await api.del(`/contents/${s.id}`); toast(t('tp.deleted'), 'success'); await load(); } catch (e) { showError(e); }
      });
    };
    draw();
  }

  await load();
}

async function rooms(box) {
  const GAME = { typing: 'Typing', labyrinth: t('pf.lab') };
  const ST = { waiting: t('hs.waiting'), active: t('hs.active'), finished: t('hs.finished') };
  const SV = (p) => `<svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const MAZE = SV('<path d="M3 3h18v18H3zM8 3v8h8M16 21v-6M3 14h5"/>');
  const KB = SV('<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>');
  const isLive = (x) => x.status !== 'finished' && new Date(x.expires_at) > Date.now();
  let game = 'labyrinth', minutes = 10;
  const pills = (name, items, sel) => `<div class="rm-pills" role="radiogroup">${items.map(([v, l, s]) => `<label><input type="radio" name="${name}" value="${v}"${v === sel ? ' checked' : ''}><span>${l}${s ? `<small>${s}</small>` : ''}</span></label>`).join('')}</div>`;
  box.innerHTML = `
    <section class="rm-new" id="nr-form">
      <h2>${t('tp.newRoom')}</h2>
      <div class="rm-games" role="group" aria-label="${t('tp.game')}">
        <button type="button" data-game="labyrinth" aria-pressed="true"><span class="rm-gi" style="background:var(--mint);color:#1F5C41">${MAZE}</span><span><b>${t('pf.lab')}</b><small>${t('tp.withQ')}</small></span></button>
        <button type="button" data-game="typing" aria-pressed="false"><span class="rm-gi" style="background:var(--sky);color:#1F5C8A">${KB}</span><span><b>Typing</b><small>${t('tp.fastType')}</small></span></button>
      </div>
      <label class="rm-f lab-only"><span>${t('tp.qSet')}</span><select id="nr-content"><option value="">${t('tp.loading')}</option></select><small>${t('tp.onlyPub')}</small></label>
      <div class="rm-f lab-only"><span>${t('tp.labSize')}</span>${pills('sz', [['11', '11×11', t('tp.small')], ['15', '15×15', t('tp.medium')], ['21', '21×21', t('tp.large')]], '15')}</div>
      <div class="rm-f lab-only"><span>${t('tp.mode')}</span>${pills('md', [['standard', t('tp.standard'), t('tp.lives3')], ['kids', t('tp.kids'), t('tp.noLives')]], 'standard')}</div>
      <div class="rm-f typ-only" hidden><span>${t('tp.textLang')}</span>${pills('lng', [['uz', "O'zbekcha", ''], ['ru', 'Русский', ''], ['en', 'English', '']], getLang())}<small>${t('tp.autoText')}</small></div>
      <div class="rm-f"><span>${t('tp.duration')}</span><div class="rm-step"><button type="button" id="mnm" aria-label="${t('tp.less')}">−</button><b id="mn">${t('tp.min', { n: 10 })}</b><button type="button" id="mnp" aria-label="${t('tp.more')}">+</button></div></div>
      <button class="btn rm-go" id="nr-go">${t('tp.createRoom')}</button>
    </section>
    <section class="rm-act">
      <div class="rm-ah"><i></i><h2>${t('dash.active_rooms')}</h2><span id="nr-cnt">0</span></div>
      <div id="rooms-list"></div>
      <small class="rm-note">${t('tp.autoClose')}</small>
    </section>`;
  const $ = (s) => box.querySelector(s);
  const $list = $('#rooms-list');
  const val = (n) => box.querySelector(`input[name="${n}"]:checked`)?.value;

  const card = (x) => {
    const t = x.game_type === 'typing';
    return `<div class="rm-card">
      <div class="rm-ch"><span class="rm-gi" style="background:var(${t ? '--sky' : '--mint'});color:${t ? '#1F5C8A' : '#1F5C41'}">${t ? KB : MAZE}</span>
        <div><b>${esc(x.code)}</b><small>${esc(GAME[x.game_type] || x.game_type)} · ${t('end.players', { n: x.players ?? 0 })}</small></div>
        <span class="rm-st ${x.status === 'active' ? 'is-on' : ''}"><i></i>${esc(ST[x.status] || x.status)}</span></div>
      <div class="rm-cb"><button class="btn" data-open="${esc(x.code)}" data-game="${esc(x.game_type)}">${t('tp.watch')}</button><button class="btn btn--ghost" data-close="${esc(x.code)}">${t('app.close')}</button></div>
    </div>`;
  };
  async function load() {
    const r = await api.get('/rooms/mine');
    const live = (r.items || []).filter(isLive);
    $('#nr-cnt').textContent = live.length;
    $list.innerHTML = live.map(card).join('') || `<p class="ct-empty">${t('tp.noRooms')}</p>`;
  }
  const fillContent = async () => {
    const r = await api.get('/contents', { query: { type: 'questions', limit: 50 } });
    const items = (r.items || []).filter((c) => c.is_published);
    $('#nr-content').innerHTML = items.length ? groupOpts(items) : `<option value="">${t('tp.noPubSets')}</option>`;
  };
  const sync = () => {
    box.querySelectorAll('[data-game]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.game === game)));
    box.querySelectorAll('.lab-only').forEach((el) => { el.hidden = game !== 'labyrinth'; });
    box.querySelectorAll('.typ-only').forEach((el) => { el.hidden = game !== 'typing'; });
  };
  box.querySelectorAll('[data-game]').forEach((b) => { b.onclick = () => { game = b.dataset.game; sync(); }; });
  const setMin = (d) => { minutes = Math.min(120, Math.max(1, minutes + d)); $('#mn').textContent = t('tp.min', { n: minutes }); };
  $('#mnm').onclick = () => setMin(minutes > 10 ? -5 : -1);
  $('#mnp').onclick = () => setMin(minutes >= 10 ? 5 : 1);

  $('#nr-go').onclick = async () => {
    const content_id = $('#nr-content').value;
    if (game === 'labyrinth' && !content_id) { toast(t('tp.pickSet'), 'error'); return; }
    const body = { game_type: game, max_players: 30, duration_minutes: minutes };
    if (game === 'labyrinth') { body.content_id = content_id; body.mode = val('md'); body.labyrinth = { size: Number(val('sz')) }; }
    else body.language = val('lng');
    try {
      const r = await api.post('/rooms', body);
      toast(t('tp.roomCreated', { code: r.room.code }), 'success');
      location.hash = `#/host/${r.room.code}?game=${game}`;
    } catch (e) { showError(e); }
  };

  $list.addEventListener('click', async (e) => {
    const o = e.target.closest('[data-open]');
    const c = e.target.closest('[data-close]');
    if (o) location.hash = `#/host/${o.dataset.open}?game=${o.dataset.game || 'typing'}`;
    if (c) {
      if (!confirm(t('host.confirmClose'))) return;
      try { await api.post(`/rooms/${c.dataset.close}/close`, {}); toast(t('host.closedToast'), 'success'); await load(); }
      catch (err) { showError(err); }
    }
  });

  sync();
  await Promise.all([fillContent(), load()]);
}

function groupOpts(items) {
  const g = {};
  items.forEach((c) => { const k = c.topic || t('tp.noTopic'); (g[k] = g[k] || []).push(c); });
  return Object.keys(g).sort().map((k) => '<optgroup label="' + esc(k) + '">' + g[k].map((c) => '<option value="' + esc(c.id) + '">' + (c.language === 'ru' ? '[RU] ' : '') + esc(c.title) + '</option>').join('') + '</optgroup>').join('');
}
