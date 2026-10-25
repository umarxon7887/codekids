/** @file Admin paneli: IT darslari muharriri (bo'limlar, mavzular, fikrlash qurollari). */
import '../styles/home.css';
import '../styles/admin.css';
import { api, auth } from '../core/api.js';
import { disconnectSocket } from '../core/socket.js';
import { getUser } from '../core/state.js';
import { showError, toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';
import { ic } from '../ui/it/common.js';
import { mountLessonEditor } from './lessonEditor.js';
import { removeWithProgress } from './common.js';

const LOGO = '<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>';

/**
 * @param {HTMLElement} root
 * @param {string} sub '/', '/section/:id', '/lesson/:id' yoki '/tools'
 * @returns {Promise<()=>void>}
 */
export async function mountAdmin(root, sub = '/') {
  const name = getUser()?.nickname || 'Admin';
  const el = html(`
    <section class="ad">
      <header class="ad-top">
        <div class="hm-brand"><span class="hm-logo">${LOGO}</span>CodeKids</div>
        <span class="ad-badge">Admin</span>
        <span class="ad-sp"></span>
        <a class="ad-link" href="#/it" target="_blank" rel="noopener">${ic('eye', 18)}O'quvchi ko'rinishi</a>
        <span class="ad-me" title="Siz">${esc(name)}</span>
        <button type="button" class="btn btn--ghost ad-out">Chiqish</button>
      </header>
      <div class="ad-body">
        <aside class="ad-side" aria-label="Bo'limlar va mavzular"></aside>
        <main class="ad-main" tabindex="-1"></main>
      </div>
      <dialog class="ad-dlg"></dialog>
    </section>`);
  root.replaceChildren(el);
  const side = el.querySelector('.ad-side');
  const main = el.querySelector('.ad-main');
  const dlg = el.querySelector('.ad-dlg');
  let data = { sections: [], tools: [] };
  let current = sub;
  let dirty = () => false; // ochiq muharrirda saqlanmagan o'zgarish bormi
  let disposeView = () => {};

  const onBeforeUnload = (e) => { if (dirty()) { e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', onBeforeUnload);

  el.querySelector('.ad-out').onclick = async () => {
    if (dirty() && !confirm("Saqlanmagan o'zgarishlar bor. Baribir chiqasizmi?")) return;
    await auth.logout();
    disconnectSocket();
    location.hash = '#/';
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  };

  async function reload() {
    data = await api.get('/it/manage');
    renderSide();
  }

  /** Panel ichida yurish: sahifa qayta yuklanmaydi, manzil yangilanadi (orqaga tugmasi ishlaydi). */
  function go(path, { push = true, force = false } = {}) {
    if (!force && dirty() && !confirm("Saqlanmagan o'zgarishlar bor. Ularni tashlab ketasizmi?")) return false;
    if (push && `#/admin${path === '/' ? '' : path}` !== location.hash) history.pushState(null, '', `#/admin${path === '/' ? '' : path}`);
    current = path;
    show(path);
    return true;
  }
  const ctx = { go, reload, toast, get data() { return data; }, setDirty: (fn) => { dirty = fn; }, dialog: (opts) => openDialog(dlg, opts) };

  // ---------- Chap panel: bo'limlar va mavzular daraxti ----------
  function renderSide() {
    const on = (p) => (current === p ? ' is-on" aria-current="page' : '');
    const dot = (pub) => `<span class="ad-dot ${pub ? 'is-pub' : ''}" title="${pub ? "E'lon qilingan" : 'Qoralama'}"></span>`;
    side.innerHTML = `
      <div class="ad-side-h"><h2>Bo'limlar</h2>
        <button type="button" class="ad-mini" data-new-section>${ic('plus', 16)}Bo'lim</button></div>
      ${data.sections.length ? '' : '<p class="ad-side-empty">Hali bo\'lim yo\'q. Birinchi qasrni yarating.</p>'}
      <ol class="ad-tree">${data.sections.map((s, i) => `
        <li>
          <a class="ad-sec-a${on(`/section/${s.id}`)}" href="#/admin/section/${s.id}" data-go="/section/${s.id}">
            ${dot(s.is_published)}<span class="ad-t">${i + 1}. ${esc(s.title)}</span><small>${s.lessons.length}</small></a>
          <ol class="ad-les">${s.lessons.map((l) => `
            <li><a class="ad-les-a${on(`/lesson/${l.id}`)}" href="#/admin/lesson/${l.id}" data-go="/lesson/${l.id}">
              ${dot(l.is_published)}<span class="ad-t">${esc(l.title)}</span>${l.kind === 'test' ? '<em class="ad-crown" title="Bo\'lim testi">test</em>' : ''}${l.has_video ? `<span class="ad-vid" title="Video bor">${ic('play', 14)}</span>` : ''}</a></li>`).join('')}
          </ol>
          <button type="button" class="ad-add-les" data-new-lesson="${s.id}">${ic('plus', 14)}Mavzu</button>
        </li>`).join('')}
      </ol>
      <a class="ad-tools-a${on('/tools')}" href="#/admin/tools" data-go="/tools">${ic('tool', 18)}Fikrlash qurollari <b>${data.tools.length}</b></a>
      <p class="ad-legend"><span class="ad-dot is-pub"></span>e'lon qilingan <span class="ad-dot"></span>qoralama</p>`;
  }

  // Havolalar va "+" tugmalari (chap panel va asosiy qism uchun umumiy)
  el.addEventListener('click', (e) => {
    const a = e.target.closest('[data-go]');
    if (a && el.contains(a)) {
      if (e.metaKey || e.ctrlKey || e.shiftKey) return; // yangi oynada ochish
      e.preventDefault();
      go(a.dataset.go);
      return;
    }
    if (e.target.closest('[data-new-section]')) { e.preventDefault(); newSection(); return; }
    const nl = e.target.closest('[data-new-lesson]');
    if (nl) { e.preventDefault(); newLesson(nl.dataset.newLesson); }
  });

  async function newSection() {
    const r = await ctx.dialog({
      title: "Yangi bo'lim (qasr)",
      fields: [
        { name: 'title', label: "Bo'lim nomi", placeholder: 'Masalan: Takrorlash', max: 120, required: true },
        { name: 'method', label: 'Fikrlash usuli', placeholder: 'Masalan: Naqsh ko\'rish', max: 120, hint: "Bo'limdagi har mavzu shu usul orqali o'rgatiladi" },
      ],
      ok: 'Yaratish',
    });
    if (!r) return;
    try {
      const { section } = await api.post('/it/manage/sections', r);
      await reload();
      go(`/section/${section.id}`, { force: true });
      toast("Bo'lim yaratildi. Endi unga mavzular qo'shing.");
    } catch (e) { showError(e); }
  }

  async function newLesson(sectionId) {
    const sec = data.sections.find((s) => s.id === sectionId);
    const r = await ctx.dialog({
      title: 'Yangi mavzu (eshik)',
      sub: sec ? `«${sec.title}» bo'limiga` : '',
      fields: [
        { name: 'title', label: 'Mavzu nomi', placeholder: 'Masalan: Sikl nima?', max: 120, required: true },
        { name: 'kind', label: 'Turi', type: 'radio', options: [['lesson', 'Oddiy mavzu'], ['test', "Bo'lim testi (tojli eshik)"]], value: 'lesson' },
      ],
      ok: 'Yaratish',
    });
    if (!r) return;
    try {
      const { lesson } = await api.post(`/it/manage/sections/${sectionId}/lessons`, r);
      await reload();
      go(`/lesson/${lesson.id}`, { force: true });
    } catch (e) { showError(e); }
  }

  // ---------- Asosiy qism ----------
  async function show(path) {
    disposeView();
    disposeView = () => {};
    dirty = () => false;
    renderSide();
    main.replaceChildren(html('<div class="skeleton ad-skel" aria-busy="true"></div>'));
    let m;
    try {
      if ((m = path.match(/^\/section\/([0-9a-f-]{36})$/))) await sectionView(main, m[1], ctx);
      else if ((m = path.match(/^\/lesson\/([0-9a-f-]{36})$/))) {
        const { lesson } = await api.get(`/it/manage/lessons/${m[1]}`);
        const secIdx = data.sections.findIndex((s) => s.id === lesson.section_id);
        const sec = data.sections[secIdx];
        disposeView = mountLessonEditor(main, {
          lesson,
          tools: data.tools,
          section: { id: lesson.section_id, title: lesson.section_title, index: Math.max(0, secIdx), total: sec?.lessons.length || 1 },
          position: sec ? sec.lessons.findIndex((l) => l.id === lesson.id) : 0,
          ...ctx,
        });
      } else if (path === '/tools') toolsView(main, ctx);
      else homeView(main, ctx);
    } catch (e) {
      if (e.code === 'LESSON_NOT_FOUND' || e.code === 'SECTION_NOT_FOUND') {
        main.innerHTML = `<div class="ad-page"><div class="ad-card ad-empty"><h1>Topilmadi</h1><p>Bu bo'lim yoki mavzu o'chirilgan bo'lishi mumkin.</p><a class="btn" href="#/admin" data-go="/">Bosh sahifa</a></div></div>`;
      } else {
        showError(e);
        main.innerHTML = '<div class="ad-page"><div class="ad-card ad-empty"><p>Yuklab bo\'lmadi.</p></div></div>';
      }
    }
    main.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  try {
    await reload();
  } catch (e) {
    showError(e);
    main.innerHTML = '<div class="ad-page"><div class="ad-card ad-empty"><p>Muharrirni yuklab bo\'lmadi. Sahifani yangilang.</p></div></div>';
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }
  show(current);

  return () => {
    disposeView();
    window.removeEventListener('beforeunload', onBeforeUnload);
    if (dlg.open) dlg.close();
  };
}

// ---------- Bosh sahifa ----------
function homeView(main, { data }) {
  const lessons = data.sections.flatMap((s) => s.lessons);
  const pub = lessons.filter((l) => l.is_published).length;
  main.innerHTML = `
    <div class="ad-page">
      <header class="ad-ph"><div><span class="ad-kicker">IT DARSLARI</span><h1>Darslar muharriri</h1></div></header>
      <div class="ad-stats">
        <div class="ad-stat"><b>${data.sections.length}</b><span>bo'lim (qasr)</span></div>
        <div class="ad-stat"><b>${lessons.length}</b><span>mavzu (eshik)</span></div>
        <div class="ad-stat is-pub"><b>${pub}</b><span>e'lon qilingan</span></div>
        <div class="ad-stat"><b>${lessons.length - pub}</b><span>qoralama</span></div>
      </div>
      <section class="ad-card ad-howto">
        <h2>Qanday ishlaydi</h2>
        <ol>
          <li><b>Bo'lim yarating.</b> Har bir bo'lim o'quvchi yo'lidagi bitta qasr, u bitta fikrlash usuliga bag'ishlanadi.</li>
          <li><b>Mavzular qo'shing.</b> Har mavzu qasr zalidagi bitta eshik: hikoya, ixtiyoriy video, yordamchi karta va mashqlar.</li>
          <li><b>E'lon qiling.</b> Avval mavzuni, keyin bo'limni. Qoralamalar o'quvchilarga ko'rinmaydi.</li>
        </ol>
        <p>O'ng tomonda mavzu bola telefonida qanday ko'rinishini darhol ko'rasiz.</p>
      </section>
      <button type="button" class="btn ad-cta" data-new-section>${ic('plus', 18)}Yangi bo'lim</button>
    </div>`;
}

// ---------- Bo'lim sahifasi ----------
async function sectionView(main, id, ctx) {
  const idx = ctx.data.sections.findIndex((s) => s.id === id);
  const s = ctx.data.sections[idx];
  if (!s) { const e = new Error('x'); e.code = 'SECTION_NOT_FOUND'; throw e; }
  const learners = s.lessons.reduce((n, l) => n + l.learners, 0);
  main.innerHTML = `
    <div class="ad-page">
      <header class="ad-ph">
        <div><span class="ad-kicker">${idx + 1}-BO'LIM</span><h1>${esc(s.title)}</h1></div>
        <span class="ad-status ${s.is_published ? 'is-pub' : ''}">${s.is_published ? "E'lon qilingan" : 'Qoralama'}</span>
      </header>
      <form class="ad-card ad-form" novalidate>
        <h2>Bo'lim ma'lumotlari</h2>
        <label class="ad-f"><span>Bo'lim nomi</span><input name="title" maxlength="120" required value="${esc(s.title)}"></label>
        <label class="ad-f"><span>Fikrlash usuli <small>bo'limdagi har mavzu shu usul orqali o'rgatiladi</small></span>
          <input name="method" maxlength="120" value="${esc(s.method)}" placeholder="Masalan: Ketma-ketlik"></label>
        <label class="ad-f"><span>Tavsif <small>ixtiyoriy, o'zingiz uchun eslatma</small></span>
          <textarea name="description" rows="3" maxlength="1000">${esc(s.description)}</textarea></label>
        <div class="ad-actions"><button type="submit" class="btn">Saqlash</button></div>
      </form>
      <section class="ad-card">
        <div class="ad-card-h"><h2>Mavzular (eshiklar)</h2>
          <button type="button" class="btn btn--ghost ad-btn-sm" data-new-lesson="${s.id}">${ic('plus', 16)}Mavzu</button></div>
        ${s.lessons.length ? `<ol class="ad-list">${s.lessons.map((l, i) => `
          <li class="ad-row">
            <span class="ad-num">${i + 1}</span>
            <a class="ad-row-t" href="#/admin/lesson/${l.id}" data-go="/lesson/${l.id}">${esc(l.title)}</a>
            ${l.kind === 'test' ? '<span class="ad-chip is-test">Bo\'lim testi</span>' : ''}
            ${l.has_video ? `<span class="ad-chip is-video">${ic('play', 14)}Video</span>` : ''}
            <span class="ad-meta">${l.exercises} mashq${l.learners ? ` · ${l.learners} o'quvchi o'tgan` : ''}</span>
            <span class="ad-status ad-status--sm ${l.is_published ? 'is-pub' : ''}">${l.is_published ? "E'lon" : 'Qoralama'}</span>
            <span class="ad-move">
              <button type="button" class="ad-ib" data-move="${l.id}:up" ${i === 0 ? 'disabled' : ''} aria-label="${esc(l.title)}: yuqoriga">${ic('up', 18)}</button>
              <button type="button" class="ad-ib" data-move="${l.id}:down" ${i === s.lessons.length - 1 ? 'disabled' : ''} aria-label="${esc(l.title)}: pastga">${ic('down', 18)}</button>
            </span>
          </li>`).join('')}</ol>`
          : '<p class="ad-muted">Hali mavzu yo\'q. «Mavzu» tugmasi bilan birinchi eshikni qo\'shing.</p>'}
      </section>
      <section class="ad-card">
        <h2>E'lon qilish va tartib</h2>
        <p class="ad-muted">${s.is_published
          ? "Bo'lim o'quvchilarga ko'rinadi. Unda faqat e'lon qilingan mavzular chiqadi."
          : "Bo'lim hali qoralama, o'quvchilar uni ko'rmaydi. Avval mavzularni e'lon qiling, keyin bo'limni."}</p>
        <div class="ad-actions">
          <button type="button" class="btn ${s.is_published ? 'btn--ghost' : ''}" data-pub>${s.is_published ? 'Yashirish' : "Bo'limni e'lon qilish"}</button>
          <button type="button" class="btn btn--ghost" data-sec-move="up" ${idx === 0 ? 'disabled' : ''}>${ic('up', 18)}Yo'lda oldinga</button>
          <button type="button" class="btn btn--ghost" data-sec-move="down" ${idx === ctx.data.sections.length - 1 ? 'disabled' : ''}>${ic('down', 18)}Yo'lda orqaga</button>
        </div>
      </section>
      <section class="ad-card ad-danger">
        <h2>Bo'limni o'chirish</h2>
        <p class="ad-muted">Bo'lim ichidagi barcha mavzular ham o'chadi.${learners ? ` Bu bo'limda o'quvchilar mavzu tugatgan, ularning XP'si ham o'chadi. Yashirib qo'yish xavfsizroq.` : ''}</p>
        <div class="ad-actions"><button type="button" class="btn btn--danger" data-del>${ic('trash', 18)}O'chirish</button></div>
      </section>
    </div>`;

  const form = main.querySelector('form');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(form));
    if (!body.title.trim()) { form.title.setAttribute('aria-invalid', 'true'); form.title.focus(); toast("Bo'lim nomi bo'sh bo'lmasin"); return; }
    try {
      await api.put(`/it/manage/sections/${id}`, body);
      await ctx.reload();
      ctx.go(`/section/${id}`, { push: false, force: true });
      ctx.toast('Saqlandi');
    } catch (err) { showError(err); }
  };
  const fresh = () => JSON.stringify(Object.fromEntries(new FormData(form)));
  const saved = fresh();
  ctx.setDirty(() => fresh() !== saved);

  main.querySelector('[data-pub]').onclick = async () => {
    try {
      await api.put(`/it/manage/sections/${id}`, { is_published: !s.is_published });
      await ctx.reload();
      ctx.go(`/section/${id}`, { push: false, force: true });
      ctx.toast(s.is_published ? "Bo'lim yashirildi" : s.lessons.some((l) => l.is_published)
        ? "Bo'lim e'lon qilindi" : "Bo'lim e'lon qilindi, lekin unda hali e'lon qilingan mavzu yo'q, shuning uchun o'quvchilar uni ko'rmaydi.");
    } catch (err) { showError(err); }
  };
  main.querySelectorAll('[data-move]').forEach((b) => {
    b.onclick = async () => {
      const [lid, dir] = b.dataset.move.split(':');
      try {
        await api.post(`/it/manage/lessons/${lid}/move`, { dir });
        await ctx.reload();
        ctx.go(`/section/${id}`, { push: false, force: true });
      } catch (err) { showError(err); }
    };
  });
  main.querySelectorAll('[data-sec-move]').forEach((b) => {
    b.onclick = async () => {
      try {
        await api.post(`/it/manage/sections/${id}/move`, { dir: b.dataset.secMove });
        await ctx.reload();
        ctx.go(`/section/${id}`, { push: false, force: true });
      } catch (err) { showError(err); }
    };
  });
  main.querySelector('[data-del]').onclick = async () => {
    if (!confirm(`«${s.title}» bo'limi va undagi ${s.lessons.length} ta mavzu o'chirilsinmi? Buni qaytarib bo'lmaydi.`)) return;
    if (!(await removeWithProgress(`/it/manage/sections/${id}`))) return;
    await ctx.reload();
    ctx.go('/', { force: true });
  };
}

// ---------- Fikrlash qurollari ----------
function toolsView(main, ctx) {
  const card = (t) => `
    <form class="ad-card ad-form ad-tool" data-id="${t ? t.id : ''}" novalidate>
      <div class="ad-card-h"><h2>${t ? esc(t.name) : 'Yangi qurol'}</h2>
        ${t ? `<span class="ad-meta">${t.used ? `${t.used} ta mavzuda` : 'hali ishlatilmagan'}</span>` : ''}</div>
      <label class="ad-f"><span>Nomi</span><input name="name" maxlength="80" required value="${t ? esc(t.name) : ''}" placeholder="Masalan: Teskari o'ylash"></label>
      <label class="ad-f"><span>Qisqa tavsif <small>o'quvchi profilidagi «qurollar sumkasi»da ko'rinadi</small></span>
        <input name="short" maxlength="160" value="${t ? esc(t.short) : ''}" placeholder="Bir qatorda: bu qurol nima qiladi"></label>
      <label class="ad-f"><span>Karta matni <small>darsda «Fikrlash quroli» kartasida chiqadi</small></span>
        <textarea name="body" rows="3" maxlength="1000">${t ? esc(t.body) : ''}</textarea></label>
      <div class="ad-actions">
        <button type="submit" class="btn">${t ? 'Saqlash' : 'Qo\'shish'}</button>
        ${t ? `<button type="button" class="btn btn--ghost ad-danger-btn" data-del>${ic('trash', 18)}O'chirish</button>` : ''}
      </div>
    </form>`;
  main.innerHTML = `
    <div class="ad-page">
      <header class="ad-ph"><div><span class="ad-kicker">MENTAL QUROLLAR</span><h1>Fikrlash qurollari</h1></div></header>
      <p class="ad-muted ad-lead">Qurol mavzuga biriktiriladi. O'quvchi mavzuni tugatganda u sumkasiga qo'shiladi va keyingi mavzularda qayta ishlatiladi.</p>
      ${card(null)}
      ${ctx.data.tools.map(card).join('')}
    </div>`;
  main.querySelectorAll('form.ad-tool').forEach((f) => {
    f.onsubmit = async (e) => {
      e.preventDefault();
      const body = Object.fromEntries(new FormData(f));
      if (!body.name.trim()) { f.name.setAttribute('aria-invalid', 'true'); f.name.focus(); toast("Qurol nomi bo'sh bo'lmasin"); return; }
      try {
        if (f.dataset.id) await api.put(`/it/manage/tools/${f.dataset.id}`, body);
        else await api.post('/it/manage/tools', body);
        await ctx.reload();
        ctx.go('/tools', { push: false, force: true });
        ctx.toast(f.dataset.id ? 'Saqlandi' : "Qurol qo'shildi");
      } catch (err) { showError(err); }
    };
    const del = f.querySelector('[data-del]');
    if (del) {
      del.onclick = async () => {
        if (!confirm(`«${f.name.value}» qurolini o'chirasizmi?`)) return;
        if (await removeWithProgress(`/it/manage/tools/${f.dataset.id}`)) {
          await ctx.reload();
          ctx.go('/tools', { push: false, force: true });
        }
      };
    }
  });
  const snap = () => [...main.querySelectorAll('form.ad-tool')].map((f) => JSON.stringify(Object.fromEntries(new FormData(f)))).join('|');
  const saved = snap();
  ctx.setDirty(() => snap() !== saved);
}

// ---------- Kichik oyna (yangi bo'lim / mavzu) ----------
/**
 * @param {HTMLDialogElement} dlg
 * @param {{title:string, sub?:string, ok:string, fields:{name:string,label:string,type?:string,placeholder?:string,max?:number,required?:boolean,hint?:string,options?:[string,string][],value?:string}[]}} o
 * @returns {Promise<Record<string,string>|null>}
 */
function openDialog(dlg, o) {
  dlg.innerHTML = `
    <form method="dialog" class="ad-dlg-f" novalidate>
      <h2>${esc(o.title)}</h2>${o.sub ? `<p class="ad-muted">${esc(o.sub)}</p>` : ''}
      ${o.fields.map((f) => (f.type === 'radio'
        ? `<fieldset class="ad-seg"><legend>${esc(f.label)}</legend>${f.options.map(([v, l]) => `
            <label><input type="radio" name="${f.name}" value="${v}" ${v === f.value ? 'checked' : ''}><span>${esc(l)}</span></label>`).join('')}</fieldset>`
        : `<label class="ad-f"><span>${esc(f.label)}${f.hint ? ` <small>${esc(f.hint)}</small>` : ''}</span>
            <input name="${f.name}" maxlength="${f.max || 120}" placeholder="${esc(f.placeholder || '')}" ${f.required ? 'required' : ''}></label>`)).join('')}
      <div class="ad-actions">
        <button type="submit" class="btn" value="ok">${esc(o.ok)}</button>
        <button type="button" class="btn btn--ghost" data-cancel>Bekor qilish</button>
      </div>
    </form>`;
  return new Promise((resolve) => {
    const form = dlg.querySelector('form');
    let result = null;
    form.onsubmit = (e) => {
      const miss = o.fields.find((f) => f.required && !form[f.name].value.trim());
      if (miss) {
        e.preventDefault();
        form[miss.name].setAttribute('aria-invalid', 'true');
        form[miss.name].focus();
        return;
      }
      result = Object.fromEntries(new FormData(form));
    };
    dlg.querySelector('[data-cancel]').onclick = () => dlg.close();
    dlg.addEventListener('close', () => resolve(result), { once: true });
    dlg.showModal();
    form.querySelector('input:not([type=radio])')?.focus();
  });
}
