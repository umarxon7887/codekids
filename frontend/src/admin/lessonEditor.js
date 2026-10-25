/** @file Admin: mavzu muharriri. Chapda maydonlar, o'ngda mavzu bola telefonida qanday ko'rinishi (jonli). */
import { api } from '../core/api.js';
import { showError, toast } from '../core/toast.js';
import { html, esc } from '../utils/dom.js';
import { ic, youtubeId, youtubeThumb } from '../ui/it/common.js';
import { runLesson } from '../ui/it/lesson.js';
import { removeWithProgress } from './common.js';

const MAX_EX = 12;
const KINDS = [['general', 'Umumiy savol'], ['predict', "Nima bo'ladi?"], ['error', 'Xatoni top'], ['odd', 'Ortiqchasini top'], ['analogy', "Hayotdan o'xshatish"]];
const TYPE = { choice: 'Tanlash', order: 'Tartiblash', match: 'Moslashtirish' };
const NEW_EX = {
  choice: () => ({ type: 'choice', kind: 'general', prompt: '', options: ['', ''], answer: 0, explain: '' }),
  order: () => ({ type: 'order', prompt: '', items: ['', '', ''], explain: '' }),
  match: () => ({ type: 'match', prompt: '', pairs: [['', ''], ['', '']], explain: '' }),
};

const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function set(o, path, v) {
  const ks = path.split('.');
  let a = o;
  ks.slice(0, -1).forEach((k, i) => {
    if (a[k] == null) a[k] = /^\d+$/.test(ks[i + 1]) ? [] : {};
    a = a[k];
  });
  a[ks[ks.length - 1]] = v;
}

/**
 * @param {HTMLElement} box
 * @param {{lesson:object, tools:object[], section:{id:string,title:string,index:number,total:number}, position:number,
 *   go:Function, reload:Function, setDirty:Function}} ctx
 * @returns {()=>void} tozalash
 */
export function mountLessonEditor(box, ctx) {
  const id = ctx.lesson.id;
  const fields = (l) => ({
    title: l.title, kind: l.kind, term: l.term || '', tool_id: l.tool_id || null, minutes: l.minutes, xp: l.xp,
    content: { story: '', exercises: [], term_text: '', ...structuredClone(l.content || {}) },
  });
  let st = fields(ctx.lesson);
  let published = ctx.lesson.is_published;
  let saved = JSON.stringify(st);
  let busy = false;
  let step = 'story'; // ko'rinish qaysi qadamdan boshlanadi (tahrirlanayotgan maydon)
  let issues = [];
  const isDirty = () => JSON.stringify(st) !== saved;
  ctx.setDirty(isDirty);
  const learners = ctx.lesson.learners;

  box.innerHTML = `
    <div class="ad-ed">
      <div class="ad-ed-main">
        <header class="ad-ed-head">
          <div class="ad-crumb"><a href="#/admin/section/${ctx.section.id}" data-go="/section/${ctx.section.id}">${ic('castle', 16)}${esc(ctx.section.title)}</a>
            <span>›</span><span>${ctx.position + 1}-eshik</span>${learners ? `<span class="ad-meta">· ${learners} o'quvchi tugatgan</span>` : ''}</div>
          <input class="ad-title-in" data-f="title" maxlength="120" aria-label="Mavzu nomi" placeholder="Mavzu nomi">
          <div class="ad-ed-bar">
            <span class="ad-status" data-status></span>
            <span class="ad-save-st" role="status" aria-live="polite"></span>
            <span class="ad-sp"></span>
            <button type="button" class="btn btn--ghost ad-btn-sm ad-pv-btn" data-pv-open>${ic('eye', 18)}Ko'rish</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-pub></button>
            <button type="button" class="btn ad-btn-sm" data-save>Saqlash</button>
          </div>
        </header>
        <div class="ad-issues" role="alert" hidden></div>
        <p class="ad-note" data-live-note hidden>${ic('bulb', 18)}<span>Bu mavzu e'lon qilingan: saqlaganingizda o'zgarish darhol o'quvchilarga ko'rinadi.</span></p>

        <section class="ad-card" data-step="story">
          <h2>Asosiy</h2>
          <fieldset class="ad-seg"><legend>Turi</legend>
            <label><input type="radio" name="kind" data-f="kind" value="lesson"><span>${ic('door', 18)}Oddiy mavzu</span></label>
            <label><input type="radio" name="kind" data-f="kind" value="test"><span>${ic('star', 18)}Bo'lim testi (tojli eshik)</span></label>
          </fieldset>
          <div class="ad-grid">
            <label class="ad-f"><span>Davomiyligi <small>daqiqa</small></span><input type="number" min="1" max="60" data-f="minutes"></label>
            <label class="ad-f"><span>XP <small>birinchi marta tugatganda</small></span><input type="number" min="0" max="1000" data-f="xp"></label>
            <label class="ad-f"><span>Termin <small>yakunda «bugun o'rgangan so'zing»</small></span><input maxlength="80" data-f="term" placeholder="Masalan: Algoritm"></label>
            <label class="ad-f" data-step="tool"><span>Fikrlash quroli <small><a href="#/admin/tools" data-go="/tools">qurollar</a></small></span>
              <select data-f="tool_id"><option value="">Yo'q</option>${ctx.tools.map((t) => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label>
          </div>
        </section>

        <section class="ad-card" data-step="story">
          <h2><span class="ad-n">1</span>Hikoya <small>vaziyat: bola nimani hal qiladi</small></h2>
          <textarea data-f="content.story" rows="4" maxlength="1500" placeholder="Masalan: Oshpaz sho'rva pishirmoqchi. U nimadan boshlaydi?"></textarea>
          <span class="ad-count" data-count="content.story" data-max="1500"></span>
        </section>

        <section class="ad-card" data-step="video">
          <h2><span class="ad-n">2</span>Video <small>ixtiyoriy, hikoyadan keyin chiqadi</small></h2>
          <div class="ad-video">
            <div class="ad-video-f">
              <label class="ad-f"><span>YouTube havolasi</span>
                <input data-video-url inputmode="url" placeholder="https://youtu.be/..." autocomplete="off"></label>
              <label class="ad-f"><span>Video sarlavhasi <small>ixtiyoriy</small></span><input maxlength="120" data-f="content.video.title" data-video-title></label>
              <p class="ad-hint" data-video-msg></p>
            </div>
            <div class="ad-thumb" data-video-thumb hidden></div>
          </div>
          <p class="ad-hint">Videoni YouTube'ga «Ro'yxatsiz» (Unlisted) qilib yuklang: unda u faqat havola orqali ochiladi va qidiruvda chiqmaydi.</p>
        </section>

        <section class="ad-card" data-step="helper">
          <h2><span class="ad-n">3</span>Yordamchi karta <small>termin ishlatmasdan; xato javobda ham qayta chiqadi</small></h2>
          <label class="ad-f"><span>Sarlavha</span><input maxlength="80" data-f="content.helper.title" placeholder="Masalan: Oshpaz kabi o'yla"></label>
          <label class="ad-f"><span>Matn</span><textarea rows="3" maxlength="800" data-f="content.helper.text"></textarea></label>
        </section>

        <section class="ad-card ad-exs">
          <div class="ad-card-h"><h2><span class="ad-n">4</span>Mashqlar <small data-ex-count></small></h2></div>
          <div class="ad-ex-list"></div>
          <div class="ad-ex-add" data-ex-add>
            <span>Mashq qo'shish:</span>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:choice">${ic('plus', 16)}Tanlash</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:order">${ic('plus', 16)}Tartiblash</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:match">${ic('plus', 16)}Moslashtirish</button>
          </div>
        </section>

        <section class="ad-card" data-step="finish">
          <h2><span class="ad-n">5</span>Yakun <small>termin nima ekanini bir-ikki gapda tushuntiring</small></h2>
          <textarea data-f="content.term_text" rows="3" maxlength="600" placeholder="Masalan: Bajarilish tartibi aniq yozilgan ko'rsatmalar algoritm deyiladi."></textarea>
        </section>

        <section class="ad-card ad-danger">
          <h2>Mavzuni boshqarish</h2>
          <div class="ad-actions">
            <button type="button" class="btn btn--ghost" data-move="up" ${ctx.position === 0 ? 'disabled' : ''}>${ic('up', 18)}Oldinga surish</button>
            <button type="button" class="btn btn--ghost" data-move="down" ${ctx.position >= ctx.section.total - 1 ? 'disabled' : ''}>${ic('down', 18)}Orqaga surish</button>
            <button type="button" class="btn btn--ghost ad-danger-btn" data-del>${ic('trash', 18)}Mavzuni o'chirish</button>
          </div>
        </section>
      </div>

      <aside class="ad-pv" aria-label="O'quvchi ko'rinishi">
        <div class="ad-pv-h"><b>O'quvchi telefonida</b>
          <button type="button" class="ad-mini" data-pv-restart>${ic('undo', 16)}Boshidan</button>
          <button type="button" class="ad-ib ad-pv-x" data-pv-close aria-label="Ko'rinishni yopish">${ic('x', 18)}</button></div>
        <div class="ad-phone"><div class="ad-screen"></div></div>
        <p class="ad-hint">Ko'rinish siz tahrirlayotgan joydan boshlanadi. Natija serverga yuborilmaydi.</p>
      </aside>
    </div>`;

  const root = box.querySelector('.ad-ed');
  const exList = root.querySelector('.ad-ex-list');
  const screen = root.querySelector('.ad-screen');
  const saveBtn = root.querySelector('[data-save]');
  const pubBtn = root.querySelector('[data-pub]');
  const saveSt = root.querySelector('.ad-save-st');
  const issuesBox = root.querySelector('.ad-issues');

  // ---------- Mashqlar ro'yxati ----------
  function renderExercises() {
    const ex = st.content.exercises;
    root.querySelector('[data-ex-count]').textContent = `${ex.length} / ${MAX_EX}`;
    root.querySelectorAll('[data-act^="add-ex"]').forEach((b) => { b.disabled = ex.length >= MAX_EX; });
    exList.innerHTML = ex.length ? ex.map(exCard).join('') : '<p class="ad-muted ad-ex-empty">Hali mashq yo\'q. Pastdagi tugmalar bilan qo\'shing: oddiydan qiyinga.</p>';
    fill(exList);
  }

  function exCard(e, i) {
    const p = `content.exercises.${i}`;
    const head = `
      <header class="ad-ex-h">
        <b>${i + 1}-mashq</b><span class="ad-chip">${TYPE[e.type]}</span>
        ${e.type === 'choice' ? `<select class="ad-sel-sm" data-f="${p}.kind" aria-label="${i + 1}-mashq: savol turi">${KINDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>` : ''}
        <span class="ad-sp"></span>
        <button type="button" class="ad-ib" data-act="up-ex:${i}" ${i === 0 ? 'disabled' : ''} aria-label="${i + 1}-mashqni yuqoriga">${ic('up', 18)}</button>
        <button type="button" class="ad-ib" data-act="down-ex:${i}" ${i === st.content.exercises.length - 1 ? 'disabled' : ''} aria-label="${i + 1}-mashqni pastga">${ic('down', 18)}</button>
        <button type="button" class="ad-ib is-danger" data-act="del-ex:${i}" aria-label="${i + 1}-mashqni o'chirish">${ic('trash', 18)}</button>
      </header>
      <label class="ad-f"><span>Savol</span><textarea rows="2" maxlength="400" data-f="${p}.prompt"></textarea></label>`;
    let body = '';
    if (e.type === 'choice') {
      body = `<fieldset class="ad-rows"><legend>Javob variantlari <small>to'g'risini belgilang, o'quvchiga aralashtirib ko'rsatiladi</small></legend>
        ${e.options.map((_, k) => `
          <div class="ad-rowf">
            <label class="ad-right" title="To'g'ri javob"><input type="radio" name="ans-${i}" data-f="${p}.answer" value="${k}" aria-label="${k + 1}-variant to'g'ri javob"><span>${ic('check', 16)}</span></label>
            <input maxlength="160" data-f="${p}.options.${k}" placeholder="${k + 1}-variant" aria-label="${i + 1}-mashq, ${k + 1}-variant">
            <button type="button" class="ad-ib" data-act="del-opt:${i}:${k}" ${e.options.length <= 2 ? 'disabled' : ''} aria-label="${k + 1}-variantni o'chirish">${ic('x', 16)}</button>
          </div>`).join('')}
        <button type="button" class="ad-mini" data-act="add-opt:${i}" ${e.options.length >= 5 ? 'disabled' : ''}>${ic('plus', 14)}Variant</button>
      </fieldset>`;
    } else if (e.type === 'order') {
      body = `<fieldset class="ad-rows"><legend>Qadamlar to'g'ri tartibda <small>o'quvchiga aralashtirib beriladi</small></legend>
        ${e.items.map((_, k) => `
          <div class="ad-rowf">
            <span class="ad-num">${k + 1}</span>
            <input maxlength="120" data-f="${p}.items.${k}" placeholder="${k + 1}-qadam" aria-label="${i + 1}-mashq, ${k + 1}-qadam">
            <button type="button" class="ad-ib" data-act="up-item:${i}:${k}" ${k === 0 ? 'disabled' : ''} aria-label="${k + 1}-qadamni yuqoriga">${ic('up', 16)}</button>
            <button type="button" class="ad-ib" data-act="down-item:${i}:${k}" ${k === e.items.length - 1 ? 'disabled' : ''} aria-label="${k + 1}-qadamni pastga">${ic('down', 16)}</button>
            <button type="button" class="ad-ib" data-act="del-item:${i}:${k}" ${e.items.length <= 3 ? 'disabled' : ''} aria-label="${k + 1}-qadamni o'chirish">${ic('x', 16)}</button>
          </div>`).join('')}
        <button type="button" class="ad-mini" data-act="add-item:${i}" ${e.items.length >= 6 ? 'disabled' : ''}>${ic('plus', 14)}Qadam</button>
      </fieldset>`;
    } else {
      body = `<fieldset class="ad-rows"><legend>Juftliklar <small>o'ng tomoni aralashtiriladi</small></legend>
        ${e.pairs.map((_, k) => `
          <div class="ad-rowf ad-pair">
            <input maxlength="80" data-f="${p}.pairs.${k}.0" placeholder="Chap" aria-label="${k + 1}-juftlik, chap">
            <span class="ad-link-ic" aria-hidden="true">↔</span>
            <input maxlength="80" data-f="${p}.pairs.${k}.1" placeholder="O'ng" aria-label="${k + 1}-juftlik, o'ng">
            <button type="button" class="ad-ib" data-act="del-pair:${i}:${k}" ${e.pairs.length <= 2 ? 'disabled' : ''} aria-label="${k + 1}-juftlikni o'chirish">${ic('x', 16)}</button>
          </div>`).join('')}
        <button type="button" class="ad-mini" data-act="add-pair:${i}" ${e.pairs.length >= 5 ? 'disabled' : ''}>${ic('plus', 14)}Juftlik</button>
      </fieldset>`;
    }
    return `<article class="ad-ex" data-step="ex:${i}">${head}${body}
      <label class="ad-f"><span>Izoh <small>to'g'ri javobdan keyin chiqadi, ixtiyoriy</small></span><input maxlength="400" data-f="${p}.explain"></label>
    </article>`;
  }

  /** Maydonlarga holatdagi qiymatlarni qo'yadi. */
  function fill(scope) {
    scope.querySelectorAll('[data-f]').forEach((inp) => {
      const v = get(st, inp.dataset.f);
      if (inp.type === 'radio') inp.checked = String(v) === inp.value;
      else inp.value = v ?? '';
    });
    markIssues();
  }

  function updateVideoUi() {
    const v = st.content.video;
    const msg = root.querySelector('[data-video-msg]');
    const thumb = root.querySelector('[data-video-thumb]');
    root.querySelector('[data-video-title]').disabled = !v;
    if (v?.id) {
      thumb.hidden = false;
      thumb.innerHTML = `<img src="${youtubeThumb(v.id)}" alt="Video muqovasi" width="320" height="180" loading="lazy">
        <button type="button" class="ad-mini" data-act="video-clear">${ic('x', 14)}Videoni olib tashlash</button>`;
      msg.textContent = 'Video topildi.';
      msg.className = 'ad-hint is-ok';
    } else {
      thumb.hidden = true;
      thumb.innerHTML = '';
    }
  }

  function refreshBar() {
    const d = isDirty();
    root.querySelector('[data-status]').textContent = published ? "E'lon qilingan" : 'Qoralama';
    root.querySelector('[data-status]').className = `ad-status ${published ? 'is-pub' : ''}`;
    root.querySelector('[data-live-note]').hidden = !published;
    pubBtn.textContent = published ? 'Yashirish' : "E'lon qilish";
    saveBtn.disabled = busy || !d;
    pubBtn.disabled = busy;
    saveSt.textContent = busy ? 'Saqlanmoqda…' : d ? "Saqlanmagan o'zgarishlar bor" : 'Hammasi saqlangan';
    saveSt.classList.toggle('is-dirty', d && !busy);
    root.querySelectorAll('[data-count]').forEach((c) => {
      const n = String(get(st, c.dataset.count) || '').length;
      c.textContent = n > Number(c.dataset.max) * 0.8 ? `${n} / ${c.dataset.max}` : '';
    });
  }

  // ---------- Xatolar (e'lon qilishdan oldingi tekshiruv) ----------
  function showIssues(list, { canHide = false } = {}) {
    issues = list || [];
    if (!issues.length) { issuesBox.hidden = true; issuesBox.innerHTML = ''; markIssues(); return; }
    issuesBox.hidden = false;
    issuesBox.innerHTML = `
      <b>${published ? 'Saqlab bo\'lmadi: e\'lon qilingan mavzu to\'liq bo\'lishi kerak' : "E'lon qilish uchun quyidagilarni to'g'rilang"}</b>
      <ul>${issues.map((x, k) => `<li><button type="button" class="ad-issue" data-issue="${k}">${esc(x.message)}</button></li>`).join('')}</ul>
      ${canHide ? '<button type="button" class="btn btn--ghost ad-btn-sm" data-save-draft>Yashirib, qoralama sifatida saqlash</button>' : ''}`;
    markIssues();
    issuesBox.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  const fieldFor = (path) => {
    if (path === 'title') return 'title';
    if (path === 'exercises') return null;
    return `content.${path}`;
  };
  function markIssues() {
    root.querySelectorAll('[aria-invalid]').forEach((x) => x.removeAttribute('aria-invalid'));
    for (const x of issues) {
      const f = fieldFor(x.path);
      if (!f) continue;
      root.querySelectorAll(`[data-f="${f}"], [data-f^="${f}."]`).forEach((inp) => {
        if (inp.type === 'radio') return;
        if (inp.dataset.f === f || !inp.value.trim()) inp.setAttribute('aria-invalid', 'true');
      });
    }
  }
  function focusIssue(x) {
    const f = fieldFor(x.path);
    let el = null;
    if (!f) el = root.querySelector('[data-ex-add] button');
    else {
      const cands = [...root.querySelectorAll(`[data-f="${f}"], [data-f^="${f}."]`)].filter((i) => i.type !== 'radio');
      el = cands.find((i) => !i.value.trim()) || cands[0] || root.querySelector(`[data-f^="${f.replace(/\.\w+$/, '')}"]`);
    }
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }); el.focus({ preventScroll: true }); }
  }

  // ---------- Saqlash ----------
  function payload(publish) {
    const c = structuredClone(st.content);
    if (!c.video?.id) delete c.video;
    if (c.helper && !c.helper.title && !c.helper.text) delete c.helper;
    c.exercises.forEach((e) => { if (e.type === 'choice') e.answer = Number(e.answer) || 0; });
    return {
      title: st.title.trim() || 'Nomsiz mavzu',
      kind: st.kind,
      term: st.term,
      tool_id: st.tool_id || null,
      minutes: Math.min(60, Math.max(1, Number(st.minutes) || 5)),
      xp: Math.min(1000, Math.max(0, Number(st.xp) || 0)),
      content: c,
      is_published: publish,
    };
  }

  async function save(publish = published) {
    if (busy) return;
    if (!st.title.trim()) {
      showIssues([{ path: 'title', message: "Mavzu nomi bo'sh" }]);
      focusIssue({ path: 'title' });
      return;
    }
    busy = true;
    refreshBar();
    const wasPublished = published;
    const sent = JSON.stringify(st);
    try {
      const { lesson } = await api.put(`/it/manage/lessons/${id}`, payload(publish));
      const server = fields(lesson);
      published = lesson.is_published;
      saved = JSON.stringify(server);
      // Saqlash davomida yozilgan narsa bo'lmasa, serverdagi (tozalangan) holatni olamiz;
      // bo'lsa, foydalanuvchi matni qoladi va "saqlanmagan" bo'lib ko'rinadi
      if (JSON.stringify(st) === sent) {
        st = server;
        fill(root);
        updateVideoUi();
      }
      showIssues([]);
      await ctx.reload();
      toast(published && !wasPublished ? "Mavzu e'lon qilindi" : !published && wasPublished ? 'Mavzu yashirildi' : 'Saqlandi');
    } catch (e) {
      if (e.code === 'LESSON_NOT_READY') showIssues(e.details, { canHide: wasPublished && publish });
      else if (e.code === 'VALIDATION_ERROR' && e.details?.length) {
        showIssues(e.details.map((d) => ({ path: d.path.replace(/^content\./, ''), message: `${d.path}: ${d.message}` })));
      } else showError(e);
    } finally {
      busy = false;
      refreshBar();
    }
  }

  // ---------- Jonli ko'rinish ----------
  let pvTimer = 0;
  function preview(start = step) {
    clearTimeout(pvTimer);
    const c = payload(published).content;
    const tool = ctx.tools.find((t) => t.id === st.tool_id);
    const L = {
      id: 'preview', kind: st.kind, title: st.title || 'Mavzu nomi', term: st.term, minutes: st.minutes, xp: Number(st.xp) || 0,
      section: { id: ctx.section.id, title: ctx.section.title, index: ctx.position, total: ctx.section.total },
      tool: tool ? { id: tool.id, name: tool.name, short: tool.short, body: tool.body } : null,
      content: c,
    };
    const view = html('<section class="ls ls--preview"></section>');
    screen.replaceChildren(view);
    const s = String(start);
    runLesson(view, L, {
      preview: true,
      start: s.startsWith('ex:') ? Number(s.slice(3)) : s,
      onRestart: () => preview('story'),
    });
  }
  const previewSoon = () => { clearTimeout(pvTimer); pvTimer = setTimeout(() => preview(), 450); };

  // ---------- Hodisalar ----------
  function changed({ structure = false } = {}) {
    if (structure) renderExercises();
    if (issues.length) markIssues();
    refreshBar();
    previewSoon();
  }

  root.addEventListener('input', (e) => {
    const t = e.target;
    if (t.matches('[data-video-url]')) {
      const raw = t.value.trim();
      const vid = youtubeId(raw);
      const msg = root.querySelector('[data-video-msg]');
      if (vid) st.content.video = { id: vid, title: st.content.video?.title || '' };
      else delete st.content.video;
      if (!raw) { msg.textContent = ''; msg.className = 'ad-hint'; }
      else if (!vid) { msg.textContent = "Bu YouTube havolasi emas. Masalan: https://youtu.be/abc123XYZ_0"; msg.className = 'ad-hint is-bad'; }
      updateVideoUi();
      step = 'video';
      changed();
      return;
    }
    const f = t.dataset.f;
    if (!f || t.type === 'radio') return;
    let v = t.value;
    if (t.type === 'number') v = v === '' ? '' : Number(v);
    if (f === 'tool_id') v = v || null;
    set(st, f, v);
    changed();
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'radio' && t.dataset.f) {
      set(st, t.dataset.f, t.dataset.f.endsWith('.answer') ? Number(t.value) : t.value);
      changed();
    } else if (t.tagName === 'SELECT' && t.dataset.f) {
      if (t.dataset.f === 'tool_id') step = 'tool';
      preview();
    }
  });
  root.addEventListener('focusin', (e) => {
    const s = e.target.closest('[data-step]')?.dataset.step;
    if (s && s !== step) { step = s; preview(); }
  });

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (b) {
      const [act, a, k] = b.dataset.act.split(':');
      const ex = st.content.exercises;
      const i = Number(a);
      const j = Number(k);
      const swap = (list, x, y) => { [list[x], list[y]] = [list[y], list[x]]; };
      if (act === 'add-ex') { ex.push(NEW_EX[a]()); step = `ex:${ex.length - 1}`; }
      else if (act === 'del-ex') {
        if ((ex[i].prompt || '').trim() && !confirm(`${i + 1}-mashq o'chirilsinmi?`)) return;
        ex.splice(i, 1); step = 'story';
      } else if (act === 'up-ex') { swap(ex, i, i - 1); step = `ex:${i - 1}`; }
      else if (act === 'down-ex') { swap(ex, i, i + 1); step = `ex:${i + 1}`; }
      else if (act === 'add-opt') ex[i].options.push('');
      else if (act === 'del-opt') {
        ex[i].options.splice(j, 1);
        if (ex[i].answer === j) ex[i].answer = 0; else if (ex[i].answer > j) ex[i].answer -= 1;
      } else if (act === 'add-item') ex[i].items.push('');
      else if (act === 'del-item') ex[i].items.splice(j, 1);
      else if (act === 'up-item') swap(ex[i].items, j, j - 1);
      else if (act === 'down-item') swap(ex[i].items, j, j + 1);
      else if (act === 'add-pair') ex[i].pairs.push(['', '']);
      else if (act === 'del-pair') ex[i].pairs.splice(j, 1);
      else if (act === 'video-clear') {
        delete st.content.video;
        root.querySelector('[data-video-url]').value = '';
        root.querySelector('[data-video-msg]').textContent = '';
        updateVideoUi();
        changed();
        return;
      }
      changed({ structure: true });
      if (act === 'add-ex') {
        const card = exList.lastElementChild;
        card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        card?.querySelector('textarea')?.focus({ preventScroll: true });
      } else if (/^add-(opt|item|pair)$/.test(act)) {
        exList.children[i]?.querySelectorAll('.ad-rowf input:not([type=radio])')
          [act === 'add-pair' ? ex[i].pairs.length * 2 - 2 : (ex[i].options || ex[i].items).length - 1]?.focus();
      }
      preview();
      return;
    }
    const iss = e.target.closest('[data-issue]');
    if (iss) { focusIssue(issues[Number(iss.dataset.issue)]); return; }
    if (e.target.closest('[data-save-draft]')) { save(false); return; }
    if (e.target.closest('[data-pv-open]')) { root.classList.add('is-pv-open'); preview(); return; }
    if (e.target.closest('[data-pv-close]')) { root.classList.remove('is-pv-open'); return; }
    if (e.target.closest('[data-pv-restart]')) { preview('story'); }
  });

  saveBtn.onclick = () => save();
  pubBtn.onclick = () => save(!published);
  root.querySelectorAll('[data-move]').forEach((b) => {
    b.onclick = async () => {
      if (isDirty() && !confirm("Saqlanmagan o'zgarishlar bor. Ularni tashlab, mavzuni surasizmi?")) return;
      try {
        await api.post(`/it/manage/lessons/${id}/move`, { dir: b.dataset.move });
        await ctx.reload();
        ctx.go(`/lesson/${id}`, { push: false, force: true });
      } catch (err) { showError(err); }
    };
  });
  root.querySelector('[data-del]').onclick = async () => {
    if (!confirm(`«${st.title}» mavzusi o'chirilsinmi? Buni qaytarib bo'lmaydi.`)) return;
    if (await removeWithProgress(`/it/manage/lessons/${id}`)) {
      await ctx.reload();
      ctx.go(`/section/${ctx.section.id}`, { force: true });
    }
  };
  const onKey = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (isDirty()) save(); }
  };
  document.addEventListener('keydown', onKey);

  // Boshlang'ich holat
  fill(root);
  if (st.content.video?.id) root.querySelector('[data-video-url]').value = `https://youtu.be/${st.content.video.id}`;
  updateVideoUi();
  renderExercises();
  refreshBar();
  preview('story');

  return () => {
    clearTimeout(pvTimer);
    document.removeEventListener('keydown', onKey);
  };
}
