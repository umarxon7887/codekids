/** @file Admin: mavzu muharriri. Chapda maydonlar, o'ngda mavzu bola telefonida qanday ko'rinishi (jonli). */
import { api } from '../core/api.js';
import { BASE_URL } from '../core/config.js';
import { showError, toast } from '../core/toast.js';
import { esc, html } from '../utils/dom.js';
import { ic, youtubeId, youtubeThumb, imageUrl } from '../ui/it/common.js';
import { analyzeMaze } from '../ui/it/games.js';
import { runLesson } from '../ui/it/lesson.js';
import { removeWithProgress, folds } from './common.js';
import { pickAndUpload } from './images.js';

const MAX_EX = 12;
const KINDS = [['general', 'Umumiy savol'], ['predict', "Nima bo'ladi?"], ['error', 'Xatoni top'], ['odd', 'Ortiqchasini top'], ['analogy', "Hayotdan o'xshatish"]];
const TYPE = { choice: 'Tanlash', order: 'Tartiblash', match: 'Moslashtirish', sort: 'Saralash', typing: 'Typing', maze: 'Labirint' };
// Qahramon (Kibi) holatlari: public/it/kibi/<holat>.webp
const POSES = [['salom', 'Salom'], ['oylash', "O'ylayapti / savol"], ['maqtash', 'Maqtayapti'], ['oddiy', 'Oddiy turibdi'],
  ['tushuntirish', 'Tushuntiryapti'], ['usta', 'Usta'], ['galaba', "G'alaba"], ['dalda', 'Dalda beryapti']];
const MAX_LINES = 8;
const VIDEO_FILE = /^it\/video\/[a-z0-9-]{1,60}\.mp4$/;
// Tanishuv dialogi namunasi (1-eshik ssenariysidan)
const DIALOG_SAMPLE = () => ({
  welcome_back: 'Yana xush kelibsan, {ism}!',
  lines: [
    { pose: 'salom', text: 'Salom! Men Kibi, kiber bolakayman. Isming nima?', ask_name: true, first_only: true, buttons: [{ label: 'Davom', reply: '' }] },
    { pose: 'oylash', text: "Tanishganimdan xursandman, {ism}! IT ni o'rganishga qaror qildingmi?", ask_name: false, first_only: true,
      buttons: [{ label: 'Ha!', reply: "Barakalla, {ism}! Bu juda to'g'ri qaror.", reply_pose: 'maqtash' },
        { label: 'Hali bilmayman', reply: "Hechqisi yo'q! Keling, birga sinab ko'ramiz. Senga yoqib qolishiga ishonaman.", reply_pose: 'dalda' }] },
    { pose: 'tushuntirish', text: "Unday bo'lsa, kel 1-mavzumizni boshlaymiz! Bilasanmi, kompyuterni yoqish tugmasini bosganingda ichida nimalar bo'ladi? Kel, birga ko'ramiz!",
      ask_name: false, first_only: false, buttons: [{ label: 'Ketdik!', reply: '' }] },
  ],
});
const NEW_LINE = () => ({ pose: 'oddiy', text: '', ask_name: false, first_only: false, buttons: [] });
const DEFAULT_MAZE = ['S.#..', '.##.#', '...#.', '#.#..', '#...G'];
const NEW_EX = {
  choice: () => ({ type: 'choice', kind: 'general', prompt: '', options: ['', ''], answer: 0, explain: '' }),
  order: () => ({ type: 'order', prompt: '', items: ['', '', ''], explain: '' }),
  match: () => ({ type: 'match', prompt: '', pairs: [['', ''], ['', '']], explain: '' }),
  sort: () => ({ type: 'sort', prompt: '', groups: ['', ''], items: ['', '', ''], item_groups: [0, 0, 1], explain: '' }),
  typing: () => ({ type: 'typing', prompt: 'Quyidagi matnni xatosiz yoz', text: '', min_accuracy: 90, case_sensitive: false, explain: '' }),
  maze: () => ({ type: 'maze', prompt: 'Qahramonni qasrga olib bor', mode: 'program', grid: DEFAULT_MAZE.slice(), max_commands: null, explain: '' }),
};
const TOOLS = [['#', 'Buta (devor)'], ['.', "Yo'l"], ['S', 'Qahramon'], ['G', 'Qasr']];

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
const clampInt = (v, lo, hi, def) => {
  const n = Math.round(Number(v));
  return v === '' || v == null || Number.isNaN(n) ? def : Math.min(hi, Math.max(lo, n));
};
const short = (s, n = 70) => { const t = String(s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

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
  // Mashq kartalari: yig'ilganlari (mashq obyekti bo'yicha, tartib o'zgarsa ham saqlanadi)
  let exFolded = new WeakSet();
  if (st.content.exercises.length > 2) st.content.exercises.forEach((e) => exFolded.add(e));
  const mazeTool = new WeakMap(); // labirint: tanlangan chizish quroli

  /** Yig'iladigan karta. */
  const card = (key, stepKey, title, body, { n, sub, def = false } = {}) => `
    <section class="ad-card ad-fold${folds.get(key, def) ? ' is-folded' : ''}" data-fold="${key}" data-step="${stepKey}">
      <button type="button" class="ad-fold-h" data-fold-btn="${key}" aria-expanded="${!folds.get(key, def)}">
        ${n ? `<span class="ad-n">${n}</span>` : ''}<span class="ad-fold-t">${title}${sub ? ` <small>${sub}</small>` : ''}</span>
        <span class="ad-fold-sum" data-sum="${key}"></span><span class="ad-fold-ic">${ic('down', 18)}</span>
      </button>
      <div class="ad-card-b">${body}</div>
    </section>`;
  const imgSlot = (path, label = "Rasm qo'shish") => `<div class="ad-img" data-img="${path}" data-label="${label}"></div>`;

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
        <div class="ad-ed-tools"><button type="button" class="ad-mini ad-foldall" data-fold-all>${ic('fold', 16)}<span>Hammasini yig'ish</span></button></div>

        ${card('basic', 'story', 'Asosiy', `
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
          </div>`)}

        ${card('dialog', 'dialog', 'Kibi dialogi', `
          <div class="ad-dlg"></div>`, { sub: 'ixtiyoriy: qahramon bola bilan gaplashadi, butun dars bo\'ylab chiqadi' })}

        ${card('story', 'story', 'Hikoya', `
          <textarea data-f="content.story" rows="4" maxlength="1500" aria-label="Hikoya matni" placeholder="Masalan: Oshpaz sho'rva pishirmoqchi. U nimadan boshlaydi?"></textarea>
          <span class="ad-count" data-count="content.story" data-max="1500"></span>
          ${imgSlot('content.story_image')}`, { n: 1, sub: 'vaziyat: bola nimani hal qiladi' })}

        ${card('video', 'video', 'Video', `
          <div class="ad-video">
            <div class="ad-video-f">
              <label class="ad-f"><span>Sayt fayli <small>frontend/public ichida, masalan it/video/1-eshik.mp4</small></span>
                <input data-f="content.video.file" data-video-file placeholder="it/video/1-eshik.mp4" autocomplete="off" spellcheck="false"></label>
              <label class="ad-f"><span>yoki YouTube havolasi</span>
                <input data-video-url inputmode="url" placeholder="https://youtu.be/..." autocomplete="off"></label>
              <label class="ad-check"><input type="checkbox" data-f="content.video.check" data-video-check><span>Video tugagach Kibi «Tushundingmi?» deb so'rasin <small>«Yo'q» bo'lsa yordamchi karta va video qayta</small></span></label>
              <label class="ad-f"><span>Video sarlavhasi <small>ixtiyoriy</small></span><input maxlength="120" data-f="content.video.title" data-video-title></label>
              <p class="ad-hint" data-video-msg></p>
            </div>
            <div class="ad-thumb" data-video-thumb hidden></div>
          </div>
          <p class="ad-hint">Sayt fayli tavsiya etiladi: reklama yo'q va «Davom» video oxirigacha ko'rilgandan keyin ochiladi. Yonida bir xil nomli .jpg muqova bo'lsa, u ko'rinadi. YouTube uchun videoni «Ro'yxatsiz» (Unlisted) qilib yuklang.</p>`, { n: 2, sub: 'ixtiyoriy, hikoyadan keyin chiqadi' })}

        ${card('helper', 'helper', 'Yordamchi karta', `
          <label class="ad-f"><span>Sarlavha</span><input maxlength="80" data-f="content.helper.title" placeholder="Masalan: Oshpaz kabi o'yla"></label>
          <label class="ad-f"><span>Matn <small>har qadamni yangi qatorga yozsangiz, raqamli ro'yxat bo'ladi</small></span><textarea rows="4" maxlength="800" data-f="content.helper.text"></textarea></label>
          ${imgSlot('content.helper.image')}`, { n: 3, sub: 'termin ishlatmasdan; xato javobda ham qayta chiqadi' })}

        ${card('exercises', 'story', 'Mashqlar', `
          <div class="ad-ex-list"></div>
          <div class="ad-ex-add" data-ex-add>
            <span>Mashq qo'shish:</span>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:choice">${ic('plus', 16)}Tanlash</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:order">${ic('plus', 16)}Tartiblash</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:match">${ic('plus', 16)}Moslashtirish</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:sort">${ic('plus', 16)}Saralash</button>
            <span class="ad-ex-games">O'yin:</span>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:typing">${ic('keyboard', 16)}Typing</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:maze">${ic('maze', 16)}Labirint</button>
          </div>`, { n: 4 })}

        ${card('finish', 'finish', 'Yakun', `
          <textarea data-f="content.term_text" rows="3" maxlength="600" aria-label="Yakun matni" placeholder="Masalan: Bajarilish tartibi aniq yozilgan ko'rsatmalar algoritm deyiladi."></textarea>
          ${imgSlot('content.term_image')}`, { n: 5, sub: 'termin nima ekanini bir-ikki gapda tushuntiring' })}

        ${card('manage', 'story', 'Mavzuni boshqarish', `
          <div class="ad-actions">
            <button type="button" class="btn btn--ghost" data-move="up" ${ctx.position === 0 ? 'disabled' : ''}>${ic('up', 18)}Oldinga surish</button>
            <button type="button" class="btn btn--ghost" data-move="down" ${ctx.position >= ctx.section.total - 1 ? 'disabled' : ''}>${ic('down', 18)}Orqaga surish</button>
            <button type="button" class="btn btn--ghost ad-danger-btn" data-del>${ic('trash', 18)}Mavzuni o'chirish</button>
          </div>`, { def: true })}
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
  const dlgBox = root.querySelector('.ad-dlg');

  // ---------- Kibi dialogi ----------
  const poseSel = (path, blank) => `<select class="ad-sel-sm" data-f="${path}" aria-label="Kibi holati">${blank ? `<option value="">${blank}</option>` : ''}${POSES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>`;
  function renderDialog() {
    const d = st.content.dialog;
    if (!d?.lines?.length) {
      dlgBox.innerHTML = `<p class="ad-muted">Dialog yo'q. Kibi faqat dialog bo'lsa chiqadi.</p>
        <div class="ad-actions">
          <button type="button" class="btn btn--ghost ad-btn-sm" data-act="dlg-sample">${ic('plus', 16)}Tanishuv namunasini qo'yish</button>
          <button type="button" class="btn btn--ghost ad-btn-sm" data-act="dlg-add">${ic('plus', 16)}Bo'sh gap qo'shish</button>
        </div>`;
      return;
    }
    const P = 'content.dialog';
    dlgBox.innerHTML = `
      <label class="ad-f"><span>Qayta kirganda <small>ism allaqachon ma'lum bo'lsa, «faqat birinchi marta» gaplar o'rniga aytiladi</small></span>
        <input maxlength="300" data-f="${P}.welcome_back" placeholder="Yana xush kelibsan, {ism}!"></label>
      <p class="ad-hint">{ism} o'rniga bola yozgan ism qo'yiladi.</p>
      ${d.lines.map((ln, i) => `
        <article class="ad-dlg-ln" data-step="dialog">
          <header class="ad-ex-h"><b>${i + 1}-gap</b>${poseSel(`${P}.lines.${i}.pose`)}<span class="ad-sp"></span>
            <button type="button" class="ad-ib" data-act="dlg-up:${i}" ${i === 0 ? 'disabled' : ''} aria-label="${i + 1}-gapni yuqoriga">${ic('up', 18)}</button>
            <button type="button" class="ad-ib" data-act="dlg-down:${i}" ${i === d.lines.length - 1 ? 'disabled' : ''} aria-label="${i + 1}-gapni pastga">${ic('down', 18)}</button>
            <button type="button" class="ad-ib is-danger" data-act="dlg-del:${i}" aria-label="${i + 1}-gapni o'chirish">${ic('trash', 18)}</button></header>
          <textarea rows="2" maxlength="400" data-f="${P}.lines.${i}.text" aria-label="${i + 1}-gap matni" placeholder="Kibi nima deydi?"></textarea>
          <div class="ad-grid">
            <label class="ad-check"><input type="checkbox" data-f="${P}.lines.${i}.ask_name"><span>Shu yerda ism so'ralsin</span></label>
            <label class="ad-check"><input type="checkbox" data-f="${P}.lines.${i}.first_only"><span>Faqat birinchi marta</span></label>
          </div>
          <fieldset class="ad-rows"><legend>Tugmalar <small>bo'sh bo'lsa «Davom»; javob yozilsa, Kibi avval shuni aytadi</small></legend>
            ${ln.buttons.map((_, k) => `
              <div class="ad-rowf ad-dlg-btn">
                <input maxlength="40" data-f="${P}.lines.${i}.buttons.${k}.label" placeholder="Tugma" aria-label="${i + 1}-gap, ${k + 1}-tugma">
                <input maxlength="300" data-f="${P}.lines.${i}.buttons.${k}.reply" placeholder="Kibi javobi (ixtiyoriy)" aria-label="${i + 1}-gap, ${k + 1}-tugma javobi">
                ${poseSel(`${P}.lines.${i}.buttons.${k}.reply_pose`, 'Holat: o\'sha')}
                <button type="button" class="ad-ib" data-act="dlg-btn-del:${i}:${k}" aria-label="${k + 1}-tugmani o'chirish">${ic('x', 16)}</button>
              </div>`).join('')}
            <button type="button" class="ad-mini" data-act="dlg-btn-add:${i}" ${ln.buttons.length >= 3 ? 'disabled' : ''}>${ic('plus', 14)}Tugma</button>
          </fieldset>
        </article>`).join('')}
      <div class="ad-actions">
        <button type="button" class="ad-mini" data-act="dlg-add" ${d.lines.length >= MAX_LINES ? 'disabled' : ''}>${ic('plus', 14)}Gap qo'shish</button>
        <button type="button" class="ad-mini ad-danger-btn" data-act="dlg-clear">${ic('trash', 14)}Dialogni olib tashlash</button>
      </div>`;
    fill(dlgBox);
  }

  // ---------- Mashqlar ro'yxati ----------
  function renderExercises() {
    const ex = st.content.exercises;
    root.querySelectorAll('[data-act^="add-ex"]').forEach((b) => { b.disabled = ex.length >= MAX_EX; });
    exList.innerHTML = ex.length ? ex.map(exCard).join('') : '<p class="ad-muted ad-ex-empty">Hali mashq yo\'q. Pastdagi tugmalar bilan qo\'shing: oddiydan qiyinga.</p>';
    fill(exList);
    ex.forEach((e, i) => { if (e.type === 'maze') drawMaze(i); });
  }

  const rowImg = (path, label) => `<div class="ad-img is-sm" data-img="${path}" data-label="${label}"></div>`;

  function exCard(e, i) {
    const p = `content.exercises.${i}`;
    const folded = exFolded.has(e);
    const head = `
      <header class="ad-ex-h">
        <button type="button" class="ad-ex-tg" data-act="tg-ex:${i}" aria-expanded="${!folded}">
          <span class="ad-fold-ic">${ic('down', 16)}</span><b>${i + 1}-mashq</b><span class="ad-chip${e.type === 'typing' || e.type === 'maze' ? ' is-game' : ''}">${TYPE[e.type]}</span>
          <span class="ad-ex-sum">${esc(short(e.prompt) || "(savol yo'q)")}</span>
        </button>
        <span class="ad-sp"></span>
        <button type="button" class="ad-ib" data-act="up-ex:${i}" ${i === 0 ? 'disabled' : ''} aria-label="${i + 1}-mashqni yuqoriga">${ic('up', 18)}</button>
        <button type="button" class="ad-ib" data-act="down-ex:${i}" ${i === st.content.exercises.length - 1 ? 'disabled' : ''} aria-label="${i + 1}-mashqni pastga">${ic('down', 18)}</button>
        <button type="button" class="ad-ib is-danger" data-act="del-ex:${i}" aria-label="${i + 1}-mashqni o'chirish">${ic('trash', 18)}</button>
      </header>`;
    const top = `
      ${e.type === 'choice' ? `<label class="ad-f ad-f-inline"><span>Savol turi</span><select class="ad-sel-sm" data-f="${p}.kind">${KINDS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></label>` : ''}
      <label class="ad-f"><span>${e.type === 'typing' || e.type === 'maze' ? 'Topshiriq' : 'Savol'}</span><textarea rows="2" maxlength="400" data-f="${p}.prompt"></textarea></label>
      ${imgSlot(`${p}.image`, "Savolga rasm")}`;
    let body = '';
    if (e.type === 'choice') {
      body = `<fieldset class="ad-rows"><legend>Javob variantlari <small>to'g'risini belgilang; variant matn, rasm yoki ikkalasi bo'lishi mumkin</small></legend>
        ${e.options.map((_, k) => `
          <div class="ad-rowf">
            <label class="ad-right" title="To'g'ri javob"><input type="radio" name="ans-${i}" data-f="${p}.answer" value="${k}" aria-label="${k + 1}-variant to'g'ri javob"><span>${ic('check', 16)}</span></label>
            ${rowImg(`${p}.option_images.${k}`, `${k + 1}-variantga rasm`)}
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
            ${rowImg(`${p}.item_images.${k}`, `${k + 1}-qadamga rasm`)}
            <input maxlength="120" data-f="${p}.items.${k}" placeholder="${k + 1}-qadam" aria-label="${i + 1}-mashq, ${k + 1}-qadam">
            <button type="button" class="ad-ib" data-act="up-item:${i}:${k}" ${k === 0 ? 'disabled' : ''} aria-label="${k + 1}-qadamni yuqoriga">${ic('up', 16)}</button>
            <button type="button" class="ad-ib" data-act="down-item:${i}:${k}" ${k === e.items.length - 1 ? 'disabled' : ''} aria-label="${k + 1}-qadamni pastga">${ic('down', 16)}</button>
            <button type="button" class="ad-ib" data-act="del-item:${i}:${k}" ${e.items.length <= 3 ? 'disabled' : ''} aria-label="${k + 1}-qadamni o'chirish">${ic('x', 16)}</button>
          </div>`).join('')}
        <button type="button" class="ad-mini" data-act="add-item:${i}" ${e.items.length >= 6 ? 'disabled' : ''}>${ic('plus', 14)}Qadam</button>
      </fieldset>`;
    } else if (e.type === 'match') {
      body = `<fieldset class="ad-rows"><legend>Juftliklar <small>o'ng tomoni aralashtiriladi</small></legend>
        ${e.pairs.map((_, k) => `
          <div class="ad-rowf ad-pair">
            ${rowImg(`${p}.pair_images.${k}.0`, `${k + 1}-juftlik, chapga rasm`)}
            <input maxlength="80" data-f="${p}.pairs.${k}.0" placeholder="Chap" aria-label="${k + 1}-juftlik, chap">
            <span class="ad-link-ic" aria-hidden="true">↔</span>
            ${rowImg(`${p}.pair_images.${k}.1`, `${k + 1}-juftlik, o'ngga rasm`)}
            <input maxlength="80" data-f="${p}.pairs.${k}.1" placeholder="O'ng" aria-label="${k + 1}-juftlik, o'ng">
            <button type="button" class="ad-ib" data-act="del-pair:${i}:${k}" ${e.pairs.length <= 2 ? 'disabled' : ''} aria-label="${k + 1}-juftlikni o'chirish">${ic('x', 16)}</button>
          </div>`).join('')}
        <button type="button" class="ad-mini" data-act="add-pair:${i}" ${e.pairs.length >= 5 ? 'disabled' : ''}>${ic('plus', 14)}Juftlik</button>
      </fieldset>`;
    } else if (e.type === 'sort') {
      const opts = (k) => e.groups.map((g, j) => `<option value="${j}">${esc(g || `${j + 1}-guruh`)}</option>`).join('');
      body = `<fieldset class="ad-rows"><legend>Guruhlar <small>2 yoki 3 ta, masalan: Ichida / Tashqarida</small></legend>
          ${e.groups.map((_, j) => `
            <div class="ad-rowf">
              <span class="ad-num">${j + 1}</span>
              <input maxlength="40" data-f="${p}.groups.${j}" placeholder="${j + 1}-guruh" aria-label="${i + 1}-mashq, ${j + 1}-guruh">
              <button type="button" class="ad-ib" data-act="del-grp:${i}:${j}" ${e.groups.length <= 2 ? 'disabled' : ''} aria-label="${j + 1}-guruhni o'chirish">${ic('x', 16)}</button>
            </div>`).join('')}
          <button type="button" class="ad-mini" data-act="add-grp:${i}" ${e.groups.length >= 3 ? 'disabled' : ''}>${ic('plus', 14)}Guruh</button>
        </fieldset>
        <fieldset class="ad-rows"><legend>Narsalar <small>har biriga to'g'ri guruhni tanlang; o'quvchiga aralashtirib beriladi</small></legend>
          ${e.items.map((_, k) => `
            <div class="ad-rowf">
              ${rowImg(`${p}.item_images.${k}`, `${k + 1}-narsaga rasm`)}
              <input maxlength="80" data-f="${p}.items.${k}" placeholder="${k + 1}-narsa" aria-label="${i + 1}-mashq, ${k + 1}-narsa">
              <select class="ad-sel-sm" data-f="${p}.item_groups.${k}" data-num aria-label="${k + 1}-narsaning guruhi">${opts(k)}</select>
              <button type="button" class="ad-ib" data-act="del-sitem:${i}:${k}" ${e.items.length <= 2 ? 'disabled' : ''} aria-label="${k + 1}-narsani o'chirish">${ic('x', 16)}</button>
            </div>`).join('')}
          <button type="button" class="ad-mini" data-act="add-sitem:${i}" ${e.items.length >= 8 ? 'disabled' : ''}>${ic('plus', 14)}Narsa</button>
        </fieldset>`;
    } else if (e.type === 'typing') {
      body = `
        <label class="ad-f"><span>Yoziladigan matn <small>o'quvchi aynan shuni yozadi, 300 belgigacha</small></span><textarea rows="2" maxlength="300" data-f="${p}.text" placeholder="Masalan: Kompyuter buyruqlarni ketma-ket bajaradi."></textarea></label>
        <div class="ad-grid">
          <label class="ad-f"><span>Kerakli aniqlik <small>% (50–100)</small></span><input type="number" min="50" max="100" data-f="${p}.min_accuracy"></label>
          <label class="ad-check"><input type="checkbox" data-f="${p}.case_sensitive"><span>Katta-kichik harf farq qiladi</span></label>
        </div>`;
    } else if (e.type === 'maze') {
      const tool = mazeTool.get(e) || '#';
      body = `
        <fieldset class="ad-seg"><legend>O'quvchi qahramonni qanday yurgizadi</legend>
          <label><input type="radio" name="mode-${i}" data-f="${p}.mode" value="program"><span>Buyruqlar tuzib</span></label>
          <label><input type="radio" name="mode-${i}" data-f="${p}.mode" value="direct"><span>O'zi boshqarib</span></label>
        </fieldset>
        <div class="ad-mz">
          <div class="ad-mz-bar">
            <div class="ad-mz-tools" role="group" aria-label="Chizish quroli">${TOOLS.map(([v, l]) => `
              <button type="button" class="ad-mz-tool t-${v === '#' ? 'wall' : v === '.' ? 'path' : v === 'S' ? 's' : 'g'}" data-act="mz-tool:${i}:${v === '#' ? 'wall' : v === '.' ? 'path' : v}" aria-pressed="${tool === v}"><i></i>${l}</button>`).join('')}
            </div>
            <div class="ad-mz-size">
              <span>Qator</span><button type="button" class="ad-ib" data-act="mz-rows:${i}:-1" aria-label="Qatorni kamaytirish">−</button><b>${e.grid.length}</b><button type="button" class="ad-ib" data-act="mz-rows:${i}:1" aria-label="Qator qo'shish">+</button>
              <span>Ustun</span><button type="button" class="ad-ib" data-act="mz-cols:${i}:-1" aria-label="Ustunni kamaytirish">−</button><b>${e.grid[0]?.length || 0}</b><button type="button" class="ad-ib" data-act="mz-cols:${i}:1" aria-label="Ustun qo'shish">+</button>
            </div>
          </div>
          <div class="ad-mz-grid" data-maze="${i}"></div>
          <p class="ad-hint" data-mz-info="${i}"></p>
          ${e.mode === 'direct' ? '' : `<label class="ad-f ad-mz-max"><span>Buyruqlar chegarasi <small>bo'sh qoldirsangiz, chegara yo'q</small></span>
            <input type="number" min="1" max="40" data-f="${p}.max_commands" placeholder="Chegarasiz"></label>`}
        </div>`;
    }
    return `<article class="ad-ex${folded ? ' is-folded' : ''}" data-step="ex:${i}">${head}
      <div class="ad-ex-b">${top}${body}
        <label class="ad-f"><span>Izoh <small>to'g'ri javobdan keyin chiqadi, ixtiyoriy</small></span><input maxlength="400" data-f="${p}.explain"></label>
        ${e.type === 'typing' || e.type === 'maze' ? '' : `<label class="ad-f"><span>Maslahat <small>xato javobda chiqadi (bo'lmasa yordamchi karta matni), ixtiyoriy</small></span><input maxlength="300" data-f="${p}.hint" placeholder="Masalan: Tok bo'lmasa, boshqa qismlar ishlay oladimi?"></label>`}
      </div>
    </article>`;
  }

  // ---------- Labirint xaritasi ----------
  function drawMaze(i) {
    const e = st.content.exercises[i];
    const g = exList.querySelector(`[data-maze="${i}"]`);
    if (!g || e?.type !== 'maze') return;
    const grid = e.grid.length ? e.grid : DEFAULT_MAZE;
    g.style.setProperty('--cols', grid[0].length);
    g.style.setProperty('--hero', `url('${BASE_URL}heroes/hero-01.webp')`);
    g.style.setProperty('--castle', `url('${BASE_URL}lab/castle-top.webp')`);
    g.innerHTML = grid.map((r, y) => [...r].map((c, x) => `<button type="button" class="ad-mz-c ${c === '#' ? 'is-wall' : c === 'S' ? 'is-s' : c === 'G' ? 'is-g' : 'is-path'}"
      data-cell="${y}:${x}" aria-label="${y + 1}-qator, ${x + 1}-ustun: ${c === '#' ? 'buta' : c === 'S' ? 'qahramon' : c === 'G' ? 'qasr' : "yo'l"}"></button>`).join('')).join('');
    const info = analyzeMaze(grid);
    const el = exList.querySelector(`[data-mz-info="${i}"]`);
    el.className = `ad-hint ${info.errors.length ? 'is-bad' : 'is-ok'}`;
    el.textContent = info.errors.length ? `Diqqat: ${info.errors.join('; ')}.` : `Eng qisqa yo'l: ${info.shortest} qadam.`;
  }
  function paint(i, y, x) {
    const e = st.content.exercises[i];
    const tool = mazeTool.get(e) || '#';
    const g = e.grid.map((r) => [...r]);
    if (g[y][x] === tool) return false;
    if (tool === 'S' || tool === 'G') g.forEach((r) => r.forEach((c, k) => { if (c === tool) r[k] = '.'; }));
    g[y][x] = tool;
    e.grid = g.map((r) => r.join(''));
    drawMaze(i);
    return true;
  }
  let painting = null; // { i } sichqoncha/barmoq bosilgan holda chizish
  root.addEventListener('pointerdown', (e) => {
    const c = e.target.closest('[data-cell]');
    if (!c) return;
    e.preventDefault();
    const i = Number(c.closest('[data-maze]').dataset.maze);
    const [y, x] = c.dataset.cell.split(':').map(Number);
    painting = { i, moved: paint(i, y, x) };
  });
  root.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const c = document.elementFromPoint(e.clientX, e.clientY)?.closest?.('[data-cell]');
    if (!c || Number(c.closest('[data-maze]')?.dataset.maze) !== painting.i) return;
    const [y, x] = c.dataset.cell.split(':').map(Number);
    if (paint(painting.i, y, x)) painting.moved = true;
  });
  const endPaint = () => {
    if (!painting) return;
    const was = painting;
    painting = null;
    if (was.moved) { step = `ex:${was.i}`; changed(); }
  };
  window.addEventListener('pointerup', endPaint);
  window.addEventListener('pointercancel', endPaint);

  // ---------- Rasm joylari ----------
  function drawImg(slot) {
    const path = slot.dataset.img;
    const imgId = get(st, path);
    const sm = slot.classList.contains('is-sm');
    const label = slot.dataset.label || "Rasm qo'shish";
    if (slot.dataset.busy) {
      slot.innerHTML = `<span class="ad-img-busy" aria-live="polite">${sm ? '…' : 'Yuklanmoqda…'}</span>`;
      return;
    }
    if (sm) {
      slot.innerHTML = imgId
        ? `<button type="button" class="ad-img-sm has" data-act="img-pick:${path}" aria-label="${esc(label)}: almashtirish"><img src="${imageUrl(imgId)}" alt=""></button>
           <button type="button" class="ad-img-x" data-act="img-del:${path}" aria-label="${esc(label)}: olib tashlash">${ic('x', 12)}</button>`
        : `<button type="button" class="ad-img-sm" data-act="img-pick:${path}" aria-label="${esc(label)}" title="${esc(label)}">${ic('image', 18)}</button>`;
      return;
    }
    slot.innerHTML = imgId
      ? `<img src="${imageUrl(imgId)}" alt="" loading="lazy"><span class="ad-img-acts">
          <button type="button" class="ad-mini" data-act="img-pick:${path}">${ic('image', 14)}Almashtirish</button>
          <button type="button" class="ad-mini ad-danger-btn" data-act="img-del:${path}">${ic('x', 14)}Olib tashlash</button></span>`
      : `<button type="button" class="ad-mini" data-act="img-pick:${path}">${ic('image', 16)}${esc(label)}</button>`;
  }

  /** Maydonlarga holatdagi qiymatlarni qo'yadi. */
  function fill(scope) {
    scope.querySelectorAll('[data-f]').forEach((inp) => {
      const v = get(st, inp.dataset.f);
      if (inp.type === 'radio') inp.checked = String(v) === inp.value;
      else if (inp.type === 'checkbox') inp.checked = Boolean(v);
      else inp.value = v ?? '';
    });
    scope.querySelectorAll('[data-img]').forEach(drawImg);
    markIssues();
  }

  function updateVideoUi() {
    const v = st.content.video;
    const msg = root.querySelector('[data-video-msg]');
    const thumb = root.querySelector('[data-video-thumb]');
    root.querySelector('[data-video-title]').disabled = !v;
    root.querySelector('[data-video-check]').disabled = !v;
    const fileMsg = v?.file && !VIDEO_FILE.test(v.file) ? "Fayl yo'li shunday bo'lsin: it/video/nom.mp4 (kichik harf, raqam, chiziqcha)" : '';
    if (v?.file) {
      thumb.hidden = true;
      thumb.innerHTML = '';
      msg.textContent = fileMsg || 'Saytdagi video ishlatiladi.';
      msg.className = `ad-hint ${fileMsg ? 'is-bad' : 'is-ok'}`;
      return;
    }
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

  // Yig'ilgan karta sarlavhasida qisqa xulosa
  function refreshSums() {
    const c = st.content;
    const tool = ctx.tools.find((t) => t.id === st.tool_id);
    const pic = (x) => (x ? ' · rasm bor' : '');
    const sums = {
      basic: [st.kind === 'test' ? "Bo'lim testi" : 'Oddiy mavzu', `${st.minutes || '?'} daqiqa`, `${st.xp || 0} XP`, st.term && `termin: ${st.term}`, tool && `qurol: ${tool.name}`].filter(Boolean).join(' · '),
      story: (short(c.story, 60) || "bo'sh") + pic(c.story_image),
      dialog: c.dialog?.lines?.length ? `${c.dialog.lines.length} ta gap${c.dialog.lines.some((x) => x.ask_name) ? ' · ism so\'raladi' : ''}` : "dialog yo'q",
      video: c.video?.id || c.video?.file ? [c.video.title || (c.video.file ? 'saytdagi video' : 'YouTube video'), c.video.check && '«Tushundingmi?»'].filter(Boolean).join(' · ') : "video yo'q",
      helper: (short(c.helper?.title || c.helper?.text, 60) || "bo'sh") + pic(c.helper?.image),
      exercises: c.exercises.length ? `${c.exercises.length} ta: ${[...new Set(c.exercises.map((e) => TYPE[e.type]))].join(', ')}` : "mashq yo'q",
      finish: (short(c.term_text, 60) || "bo'sh") + pic(c.term_image),
      manage: '',
    };
    root.querySelectorAll('[data-sum]').forEach((s) => { s.textContent = sums[s.dataset.sum] ?? ''; });
    root.querySelector('[data-fold="exercises"] .ad-fold-t').innerHTML = `Mashqlar <small>${c.exercises.length} / ${MAX_EX}</small>`;
    exList.querySelectorAll('.ad-ex').forEach((card2, i) => {
      const s = card2.querySelector('.ad-ex-sum');
      if (s) s.textContent = short(c.exercises[i]?.prompt) || "(savol yo'q)";
    });
    const anyOpen = root.querySelector('.ad-fold:not(.is-folded), .ad-ex:not(.is-folded)');
    root.querySelector('[data-fold-all] span').textContent = anyOpen ? "Hammasini yig'ish" : 'Hammasini ochish';
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
    refreshSums();
  }

  // ---------- Yig'ish / ochish ----------
  function setFold(cardEl, folded) {
    cardEl.classList.toggle('is-folded', folded);
    cardEl.querySelector(':scope > .ad-fold-h, :scope > .ad-ex-h .ad-ex-tg')?.setAttribute('aria-expanded', String(!folded));
    if (cardEl.dataset.fold) folds.set(cardEl.dataset.fold, folded);
    else {
      const e = st.content.exercises[Array.prototype.indexOf.call(exList.children, cardEl)];
      if (e) { if (folded) exFolded.add(e); else exFolded.delete(e); }
    }
  }
  /** Element yig'ilgan karta ichida bo'lsa, kartani ochadi. */
  function reveal(el) {
    let c = el.closest('.ad-ex.is-folded');
    if (c) setFold(c, false);
    c = el.closest('.ad-fold.is-folded');
    if (c) setFold(c, false);
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
    root.querySelectorAll('.ad-mz-grid.is-bad').forEach((x) => x.classList.remove('is-bad'));
    for (const x of issues) {
      const f = fieldFor(x.path);
      if (!f) continue;
      if (f.endsWith('.grid')) root.querySelector(`[data-maze="${f.split('.')[2]}"]`)?.classList.add('is-bad');
      root.querySelectorAll(`[data-f="${f}"], [data-f^="${f}."]`).forEach((inp) => {
        if (inp.type === 'radio' || inp.type === 'checkbox') return;
        if (inp.dataset.f === f || !inp.value.trim()) inp.setAttribute('aria-invalid', 'true');
      });
    }
  }
  function focusIssue(x) {
    const f = fieldFor(x.path);
    let el = null;
    if (!f) el = root.querySelector('[data-ex-add] button');
    else if (f.endsWith('.grid')) el = root.querySelector(`[data-maze="${f.split('.')[2]}"] [data-cell]`);
    else {
      const cands = [...root.querySelectorAll(`[data-f="${f}"], [data-f^="${f}."]`)].filter((i) => i.type !== 'radio');
      el = cands.find((i) => !i.value.trim()) || cands[0] || root.querySelector(`[data-f^="${f.replace(/\.\w+$/, '')}"]`);
    }
    if (el) {
      reveal(el);
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
      el.focus({ preventScroll: true });
    }
  }

  // ---------- Saqlash ----------
  function cleanContent(content) {
    const c = structuredClone(content);
    if (c.video) {
      if (!c.video.id) delete c.video.id;
      if (!c.video.file?.trim()) delete c.video.file; else c.video.file = c.video.file.trim();
      c.video.check = Boolean(c.video.check);
      if (!c.video.id && !c.video.file) delete c.video;
    }
    if (c.dialog) {
      if (!c.dialog.lines?.length) delete c.dialog;
      else {
        c.dialog.welcome_back = c.dialog.welcome_back || '';
        c.dialog.lines.forEach((ln) => {
          ln.ask_name = Boolean(ln.ask_name);
          ln.first_only = Boolean(ln.first_only);
          ln.buttons.forEach((b) => { b.reply = b.reply || ''; if (!b.reply_pose) delete b.reply_pose; });
        });
      }
    }
    for (const k of ['story_image', 'term_image']) if (!c[k]) delete c[k];
    if (c.helper) {
      if (!c.helper.image) delete c.helper.image;
      if (!c.helper.title && !c.helper.text && !c.helper.image) delete c.helper;
    }
    c.exercises.forEach((e) => {
      if (!e.image) delete e.image;
      if (e.type === 'choice') e.answer = Number(e.answer) || 0;
      if (e.type === 'sort') e.item_groups = e.items.map((_, k) => Number(e.item_groups?.[k]) || 0);
      if (e.type === 'typing') { e.min_accuracy = clampInt(e.min_accuracy, 50, 100, 90); e.case_sensitive = Boolean(e.case_sensitive); }
      if (e.type === 'maze') e.max_commands = clampInt(e.max_commands, 1, 40, null);
      for (const k of ['option_images', 'item_images', 'pair_images']) {
        if (!e[k]) continue;
        e[k] = Array.from(e[k], (x) => (k === 'pair_images' ? [x?.[0] || null, x?.[1] || null] : x || null));
      }
    });
    return c;
  }
  function payload(publish) {
    return {
      title: st.title.trim() || 'Nomsiz mavzu',
      kind: st.kind,
      term: st.term,
      tool_id: st.tool_id || null,
      minutes: clampInt(st.minutes, 1, 60, 5),
      xp: clampInt(st.xp, 0, 1000, 0),
      content: cleanContent(st.content),
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
        const foldedIdx = st.content.exercises.map((e) => exFolded.has(e));
        st = server;
        exFolded = new WeakSet();
        st.content.exercises.forEach((e, k) => { if (foldedIdx[k]) exFolded.add(e); });
        fill(root);
        updateVideoUi();
        renderDialog();
        renderExercises();
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
    const c = cleanContent(st.content);
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
      onRestart: () => preview(st.content.dialog?.lines?.length ? 'dialog' : 'story'),
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
      const cur = st.content.video;
      if (vid) st.content.video = { ...cur, id: vid, title: cur?.title || '' };
      else if (cur) { delete cur.id; if (!cur.file) delete st.content.video; }
      if (!raw) { msg.textContent = ''; msg.className = 'ad-hint'; }
      else if (!vid) { msg.textContent = "Bu YouTube havolasi emas. Masalan: https://youtu.be/abc123XYZ_0"; msg.className = 'ad-hint is-bad'; }
      updateVideoUi();
      step = 'video';
      changed();
      return;
    }
    const f = t.dataset.f;
    if (!f || t.type === 'radio') return;
    let v = t.type === 'checkbox' ? t.checked : t.value;
    if (t.type === 'number') v = v === '' ? '' : Number(v);
    if (t.dataset.num !== undefined) v = Number(v);
    if (f === 'tool_id') v = v || null;
    set(st, f, v);
    if (t.matches('[data-video-file], [data-video-check]')) { updateVideoUi(); step = 'video'; }
    changed();
  });
  root.addEventListener('change', (e) => {
    const t = e.target;
    if (t.type === 'radio' && t.dataset.f) {
      set(st, t.dataset.f, t.dataset.f.endsWith('.answer') ? Number(t.value) : t.value);
      // Labirint rejimi o'zgarsa, buyruqlar chegarasi maydoni chiqadi/yo'qoladi
      changed({ structure: t.dataset.f.endsWith('.mode') });
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
    const fb = e.target.closest('[data-fold-btn]');
    if (fb) { const c = fb.closest('.ad-fold'); setFold(c, !c.classList.contains('is-folded')); refreshSums(); return; }
    if (e.target.closest('[data-fold-all]')) {
      const close = Boolean(root.querySelector('.ad-fold:not(.is-folded), .ad-ex:not(.is-folded)'));
      root.querySelectorAll('.ad-fold, .ad-ex').forEach((c) => setFold(c, close));
      refreshSums();
      return;
    }
    const b = e.target.closest('[data-act]');
    if (b) {
      const [act, a, k] = b.dataset.act.split(':');
      if (act === 'img-pick' || act === 'img-del') { imageAction(act, a); return; }
      const ex = st.content.exercises;
      const i = Number(a);
      const j = Number(k);
      const swap = (list, x, y) => { [list[x], list[y]] = [list[y], list[x]]; };
      // Variant/qadam bilan birga uning rasmi ham ko'chadi yoki o'chadi
      const imgs = (e2, key, n) => { if (e2[key]) while (e2[key].length < n) e2[key].push(key === 'pair_images' ? [null, null] : null); return e2[key]; };
      if (act === 'tg-ex') {
        const c = b.closest('.ad-ex');
        setFold(c, !c.classList.contains('is-folded'));
        refreshSums();
        if (!c.classList.contains('is-folded')) { step = `ex:${i}`; preview(); }
        return;
      }
      if (act.startsWith('dlg')) { dialogAction(act, i, j); return; }
      if (act === 'add-ex') { ex.push(NEW_EX[a]()); step = `ex:${ex.length - 1}`; }
      else if (act === 'del-ex') {
        if ((ex[i].prompt || '').trim() && !confirm(`${i + 1}-mashq o'chirilsinmi?`)) return;
        ex.splice(i, 1); step = 'story';
      } else if (act === 'up-ex') { swap(ex, i, i - 1); step = `ex:${i - 1}`; }
      else if (act === 'down-ex') { swap(ex, i, i + 1); step = `ex:${i + 1}`; }
      else if (act === 'add-opt') ex[i].options.push('');
      else if (act === 'del-opt') {
        ex[i].options.splice(j, 1);
        imgs(ex[i], 'option_images', ex[i].options.length + 1)?.splice(j, 1);
        if (ex[i].answer === j) ex[i].answer = 0; else if (ex[i].answer > j) ex[i].answer -= 1;
      } else if (act === 'add-item') ex[i].items.push('');
      else if (act === 'del-item') { ex[i].items.splice(j, 1); imgs(ex[i], 'item_images', ex[i].items.length + 1)?.splice(j, 1); }
      else if (act === 'up-item' || act === 'down-item') {
        const o = act === 'up-item' ? j - 1 : j + 1;
        swap(ex[i].items, j, o);
        const im = imgs(ex[i], 'item_images', ex[i].items.length);
        if (im) swap(im, j, o);
      } else if (act === 'add-grp') ex[i].groups.push('');
      else if (act === 'del-grp') {
        ex[i].groups.splice(j, 1);
        ex[i].item_groups = ex[i].item_groups.map((g) => (g === j ? 0 : g > j ? g - 1 : g));
      } else if (act === 'add-sitem') { ex[i].items.push(''); ex[i].item_groups.push(0); }
      else if (act === 'del-sitem') {
        ex[i].items.splice(j, 1);
        ex[i].item_groups.splice(j, 1);
        imgs(ex[i], 'item_images', ex[i].items.length + 1)?.splice(j, 1);
      } else if (act === 'add-pair') ex[i].pairs.push(['', '']);
      else if (act === 'del-pair') { ex[i].pairs.splice(j, 1); imgs(ex[i], 'pair_images', ex[i].pairs.length + 1)?.splice(j, 1); }
      else if (act === 'mz-tool') {
        mazeTool.set(ex[i], { wall: '#', path: '.' }[k] || k);
        b.closest('.ad-mz-tools').querySelectorAll('[aria-pressed]').forEach((t) => t.setAttribute('aria-pressed', String(t === b)));
        return;
      } else if (act === 'mz-rows' || act === 'mz-cols') {
        const g = ex[i].grid;
        const d = Number(k);
        if (act === 'mz-rows') {
          if (d > 0 && g.length < 10) g.push('.'.repeat(g[0].length));
          if (d < 0 && g.length > 3) g.pop();
        } else if (d > 0 && g[0].length < 10) ex[i].grid = g.map((r) => `${r}.`);
        else if (d < 0 && g[0].length > 3) ex[i].grid = g.map((r) => r.slice(0, -1));
        step = `ex:${i}`;
      } else if (act === 'video-clear') {
        delete st.content.video;
        root.querySelector('[data-video-url]').value = '';
        root.querySelector('[data-video-msg]').textContent = '';
        updateVideoUi();
        changed();
        return;
      }
      changed({ structure: true });
      if (act === 'add-ex') {
        const card2 = exList.lastElementChild;
        card2?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        card2?.querySelector('textarea')?.focus({ preventScroll: true });
      } else if (/^add-(opt|item|pair|sitem)$/.test(act)) {
        const ins = exList.children[i]?.querySelectorAll(`.ad-rowf input:not([type=radio])${act === 'add-sitem' ? ':not([data-f*=".groups."])' : ''}`);
        ins?.[act === 'add-pair' ? ex[i].pairs.length * 2 - 2 : (ex[i].options || ex[i].items).length - 1]?.focus();
      }
      preview();
      return;
    }
    const iss = e.target.closest('[data-issue]');
    if (iss) { focusIssue(issues[Number(iss.dataset.issue)]); return; }
    if (e.target.closest('[data-save-draft]')) { save(false); return; }
    if (e.target.closest('[data-pv-open]')) { root.classList.add('is-pv-open'); preview(); return; }
    if (e.target.closest('[data-pv-close]')) { root.classList.remove('is-pv-open'); return; }
    if (e.target.closest('[data-pv-restart]')) { preview(st.content.dialog?.lines?.length ? 'dialog' : 'story'); return; }
    // Klaviatura bilan katak tanlansa (Enter/Space) ham chiziladi
    const cell = e.target.closest('[data-cell]');
    if (cell && e.detail === 0) {
      const i = Number(cell.closest('[data-maze]').dataset.maze);
      const [y, x] = cell.dataset.cell.split(':').map(Number);
      if (paint(i, y, x)) { step = `ex:${i}`; changed(); }
      exList.querySelector(`[data-maze="${i}"] [data-cell="${y}:${x}"]`)?.focus();
    }
  });

  function dialogAction(act, i, k) {
    const c = st.content;
    const lines = c.dialog?.lines;
    if (act === 'dlg-sample') {
      if (lines?.length && !confirm('Hozirgi dialog namunaga almashtirilsinmi?')) return;
      c.dialog = DIALOG_SAMPLE();
    } else if (act === 'dlg-add') {
      if (!c.dialog) c.dialog = { welcome_back: '', lines: [] };
      if (c.dialog.lines.length < MAX_LINES) c.dialog.lines.push(NEW_LINE());
    } else if (act === 'dlg-clear') {
      if (!confirm("Kibi dialogi olib tashlansinmi?")) return;
      delete c.dialog;
    } else if (act === 'dlg-del') {
      if ((lines[i].text || '').trim() && !confirm(`${i + 1}-gap o'chirilsinmi?`)) return;
      lines.splice(i, 1);
      if (!lines.length) delete c.dialog;
    } else if (act === 'dlg-up' || act === 'dlg-down') {
      const o = act === 'dlg-up' ? i - 1 : i + 1;
      [lines[i], lines[o]] = [lines[o], lines[i]];
    } else if (act === 'dlg-btn-add') {
      if (lines[i].buttons.length < 3) lines[i].buttons.push({ label: '', reply: '' });
    } else if (act === 'dlg-btn-del') lines[i].buttons.splice(k, 1);
    step = 'dialog';
    renderDialog();
    changed();
    preview('dialog');
  }

  async function imageAction(act, path) {
    const slots = () => root.querySelectorAll(`[data-img="${path}"]`);
    if (act === 'img-del') {
      set(st, path, null);
      slots().forEach(drawImg);
      changed();
      return;
    }
    const r = await pickAndUpload({ onStart: () => slots().forEach((s) => { s.dataset.busy = '1'; drawImg(s); }) });
    slots().forEach((s) => { delete s.dataset.busy; });
    if (r) set(st, path, r.id);
    slots().forEach(drawImg);
    if (r) { step = path.startsWith('content.exercises.') ? `ex:${path.split('.')[2]}` : path.includes('helper') ? 'helper' : path.includes('term') ? 'finish' : 'story'; changed(); }
  }

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
  renderDialog();
  renderExercises();
  refreshBar();
  preview(st.content.dialog?.lines?.length ? 'dialog' : 'story');

  return () => {
    clearTimeout(pvTimer);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('pointerup', endPaint);
    window.removeEventListener('pointercancel', endPaint);
  };
}
