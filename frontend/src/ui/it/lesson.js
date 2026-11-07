/**
 * @file IT darslari: mavzu ichi — qahramon (Kibi) dialogi, hikoya, video («Tushundingmi?» bilan),
 * yordamchi karta, fikrlash quroli, mashqlar, termin va yakun.
 */
import '../../styles/it.css';
import { api } from '../../core/api.js';
import { BASE_URL } from '../../core/config.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { ic, castleSrc, asset, kindLabel, shuffle, youtubeEmbed, imgTag } from './common.js';
import { typingUi, mazeUi } from './games.js';
import { runRepair } from './repair.js';

// To'g'ri javobdan keyin Kibining qisqa maqtovi
const PRAISE = ["To'g'ri!", "Zo'r, {ism}!", 'Barakalla!', "To'ppa-to'g'ri!"];

/** @param {HTMLElement} root @param {string} id mavzu ID @returns {Promise<()=>void>} */
export async function mountItLesson(root, id) {
  const view = html('<section class="ls"><div class="skeleton it-skel" aria-busy="true"></div></section>');
  root.replaceChildren(view);
  let data;
  try {
    data = await api.get(`/it/lessons/${id}`);
  } catch (e) {
    const locked = e.code === 'LESSON_LOCKED';
    if (!locked) showError(e);
    view.innerHTML = `<div class="it-empty"><img src="${asset('door-locked')}" alt="" width="96" height="110">
      <p>${locked ? 'Bu eshik hali qulf. Avval oldingi mavzularni tugat.' : "Darsni ochib bo'lmadi."}</p>
      <a class="btn" href="#/it">Qasrlar yo'liga</a></div>`;
    return () => {};
  }
  runLesson(view, data.lesson, {
    learner: data.learner,
    complete: (mistakes) => api.post(`/it/lessons/${id}/complete`, { mistakes }),
    saveName: (name) => api.put('/it/me/name', { name }),
  });
  return () => {};
}

/**
 * Mavzuni ko'rsatadi. O'quvchi darsi ham, muharrirdagi jonli ko'rinish ham shu funksiyadan foydalanadi.
 * @param {HTMLElement} view `.ls` elementi
 * @param {object} L mavzu (GET /it/lessons/:id dagi `lesson` shaklida)
 * @param {{complete?:(mistakes:number)=>Promise<any>, saveName?:(name:string)=>Promise<{name:string}>,
 *   learner?:{name:string|null}, preview?:boolean, start?:string|number, onRestart?:()=>void}} [opts]
 *   preview: serverga hech narsa yuborilmaydi; start: 'dialog'|'story'|'video'|'helper'|'tool'|'finish' yoki mashq raqami (0 dan)
 */
export function runLesson(view, L, opts = {}) {
  const preview = Boolean(opts.preview);
  const c = L.content || {};
  const id = L.id;
  const exercises = (c.exercises || []).map((e, i) => ({ ...e, i }));
  const video = c.video?.file ? `${BASE_URL}${c.video.file}` : youtubeEmbed(c.video?.id);
  const hasHelper = Boolean(c.helper?.text || c.helper?.image);
  // Qahramon dialogi bo'lsa, Kibi butun dars bo'ylab chiqadi (maqtaydi, maslahat beradi)
  const kibiOn = Boolean(c.dialog?.lines?.length);
  // «Tushundingmi?» bo'lsa, yordamchi karta faqat «Yo'q» javobida ko'rsatiladi
  const checkVideo = Boolean(video && c.video.check);
  const intro = [kibiOn && 'dialog', (c.story || c.story_image) && 'story', video && 'video',
    hasHelper && !checkVideo && 'helper', L.tool && 'tool'].filter(Boolean);
  let learnerName = opts.learner?.name || null;
  let videoNo = 0; // «Tushundingmi?» savoliga necha marta «Yo'q» deyildi
  let queue = exercises.slice(); // xato javob berilgan mashq oxiriga qaytadi
  const solved = new Set();
  let mistakes = 0;
  let finished = false;
  const hasGame = Boolean(c.game?.parts?.length);
  let gameMistakes = 0;

  view.innerHTML = `
    <header class="ls-top">
      <button type="button" class="ls-x" aria-label="Darsdan chiqish">${ic('x', 22)}</button>
      <div class="ls-bar" role="progressbar" aria-label="Bajarilgan mashqlar" aria-valuemin="0" aria-valuemax="${exercises.length}" aria-valuenow="0"><i></i></div>
      <span class="ls-n">0 / ${exercises.length}</span>
    </header>
    <main class="ls-stage" tabindex="-1"></main>
    <footer class="ls-foot"><div class="ls-fb" role="status" hidden></div><div class="ls-btns"></div></footer>`;
  const stage = view.querySelector('.ls-stage');
  const fb = view.querySelector('.ls-fb');
  const btns = view.querySelector('.ls-btns');

  view.querySelector('.ls-x').onclick = () => {
    if (preview) { opts.onRestart?.(); return; }
    if (finished || confirm("Darsdan chiqasanmi? Bu mavzu hali tugamaydi.")) location.hash = `#/it/section/${L.section.id}`;
  };
  if (preview) view.querySelector('.ls-x').setAttribute('aria-label', 'Boshidan ko\'rish');

  const progress = () => {
    const n = solved.size;
    view.querySelector('.ls-bar i').style.width = `${exercises.length ? (n / exercises.length) * 100 : 0}%`;
    view.querySelector('.ls-bar').setAttribute('aria-valuenow', String(n));
    view.querySelector('.ls-n').textContent = `${n} / ${exercises.length}`;
  };
  /** Pastki tugma(lar)ni o'rnatadi. */
  const actions = (list) => {
    btns.innerHTML = list.map((a, k) => (a.href
      ? `<a class="btn ${a.ghost ? 'btn--ghost' : ''}" href="${a.href}" data-k="${k}">${a.label}</a>`
      : `<button type="button" class="btn ${a.ghost ? 'btn--ghost' : ''}" data-k="${k}" ${a.disabled ? 'disabled' : ''}>${a.label}</button>`)).join('');
    list.forEach((a, k) => { if (a.onClick) btns.querySelector(`[data-k="${k}"]`).onclick = a.onClick; });
    return btns.querySelector('[data-k="0"]');
  };
  /** Matn: {ism} o'rniga bolaning ismi. */
  const say = (t) => esc(String(t || '')).replace(/\{ism\}/g, `<b>${esc(learnerName || "do'stim")}</b>`);
  const kibiImg = (pose, cls = 'ls-kibi-img') => `<img class="${cls}" src="${asset(`kibi/${pose}`)}" alt="" draggable="false">`;
  /** Kibi va uning gap pufakchasi. */
  const kibi = (pose, text, extra = '') => `<div class="ls-kibi">
      <div class="ls-bubble"><p>${say(text)}</p>${extra}</div>${kibiImg(pose)}</div>`;
  /** Yordamchi karta matni: bir necha qator bo'lsa, raqamli ro'yxat (masalan, yoqish zanjiri). */
  const helperBody = (t) => {
    const rows = String(t || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (rows.length > 1) return `<ol class="ls-steps">${rows.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    return rows.length ? `<p>${esc(rows[0])}</p>` : '';
  };
  const helperCard = () => `<div class="ls-card ls-helper"><span class="ls-chip">${ic('bulb', 16)}Yordamchi karta</span>
    ${c.helper.title ? `<h2>${esc(c.helper.title)}</h2>` : ''}${imgTag(c.helper.image)}${helperBody(c.helper.text)}</div>`;
  const show = (markup) => {
    fb.hidden = true;
    fb.className = 'ls-fb';
    stage.innerHTML = markup;
    stage.scrollTop = 0;
    stage.focus({ preventScroll: true });
  };

  // ---------- Kirish kartalari ----------
  let step = 0;
  function nextIntro() {
    const k = intro[step++];
    if (!k) return nextExercise();
    if (k === 'dialog') runDialog(nextIntro);
    else if (k === 'story') {
      show(`<div class="ls-card ls-story">
        <img class="ls-castle" src="${L.kind === 'test' ? castleSrc('boss') : asset('door-ready')}" alt="" width="112" height="112">
        <span class="ls-kicker">${esc(L.section.title)} · ${L.kind === 'test' ? "bo'lim testi" : `${L.section.index + 1}-mavzu`}</span>
        <h1>${esc(L.title)}</h1>${imgTag(c.story_image)}<p>${esc(c.story)}</p></div>`);
      actions([{ label: L.kind === 'test' ? 'Testni boshlash' : 'Boshladik', onClick: nextIntro }]);
    } else if (k === 'video') {
      playVideo(nextIntro);
    } else if (k === 'helper') {
      show(helperCard());
      actions([{ label: 'Tushundim', onClick: nextIntro }]);
    } else {
      show(`<div class="ls-card ls-tool"><span class="ls-chip">${ic('tool', 16)}Fikrlash quroli</span>
        <h2>${esc(L.tool.name)}</h2><p>${esc(L.tool.body || L.tool.short || '')}</p>
        <small>Mavzuni tugatsang, bu qurol sumkangga qo'shiladi.</small></div>`);
      actions([{ label: "Mashqlarga o'tish", onClick: nextIntro }]);
    }
  }

  // ---------- Qahramon dialogi ----------
  /** Ism avval saqlangan bo'lsa, first_only gaplar va ism so'rash o'tkazib yuboriladi, o'rniga welcome_back aytiladi. */
  function runDialog(done) {
    const known = Boolean(learnerName);
    const all = c.dialog.lines;
    const lines = all.filter((d) => !(known && (d.first_only || d.ask_name)));
    const list = known && lines.length < all.length && c.dialog.welcome_back
      ? [{ pose: 'salom', text: c.dialog.welcome_back, buttons: [] }, ...lines] : lines;
    let k = 0;
    const next = () => {
      const d = list[k++];
      if (!d) { done(); return; }
      if (d.ask_name) askName(d, next);
      else line(d, next);
    };
    next();
  }
  function line(d, next) {
    show(kibi(d.pose, d.text));
    const bs = d.buttons?.length ? d.buttons : [{ label: 'Davom' }];
    actions(bs.map((b, i) => ({
      label: esc(b.label),
      ghost: i > 0,
      onClick: () => {
        if (!b.reply) { next(); return; }
        show(kibi(b.reply_pose || 'maqtash', b.reply));
        actions([{ label: 'Davom', onClick: next }]);
      },
    })));
  }
  const NAME_RE = /^\p{L}[\p{L}\p{M}'’ʻʼ‘` -]*$/u;
  function askName(d, next) {
    show(kibi(d.pose, d.text, `<input class="ls-name-in" maxlength="20" autocomplete="given-name" autocapitalize="words" enterkeyhint="done" placeholder="Ismingni yoz" aria-label="Isming">
      <small class="ls-name-msg" role="status"></small>`));
    const inp = stage.querySelector('.ls-name-in');
    const msg = stage.querySelector('.ls-name-msg');
    const value = () => inp.value.trim().replace(/\s+/g, ' ');
    const ok = () => value().length >= 2 && NAME_RE.test(value());
    const btn = actions([{ label: esc(d.buttons?.[0]?.label || 'Davom'), disabled: true, onClick: submit }]);
    async function submit() {
      if (!ok()) return;
      btn.disabled = true;
      try {
        learnerName = preview || !opts.saveName ? value() : (await opts.saveName(value())).name;
        next();
      } catch (e) {
        msg.textContent = e.message || "Ismni saqlab bo'lmadi, qayta urinib ko'r";
        btn.disabled = false;
      }
    }
    inp.oninput = () => {
      btn.disabled = !ok();
      msg.textContent = value() && !NAME_RE.test(value()) ? 'Faqat harflar bilan yoz' : '';
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
    setTimeout(() => inp.focus(), 50);
  }

  // ---------- Video va «Tushundingmi?» ----------
  // Saytdagi video faylda «Davom» video oxirigacha ko'rilgandan keyin ochiladi (ko'rinishda va qayta o'tishda darhol).
  function playVideo(after, { again = false, plain = false } = {}) {
    const t = c.video.title || 'Video';
    const file = Boolean(c.video.file);
    const player = file
      ? `<video class="ls-vid" src="${video}" poster="${video.replace(/\.mp4$/, '.jpg')}" controls playsinline preload="metadata"></video>`
      : `<iframe src="${video}" title="${esc(t)}" loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    const free = !file || preview || L.status === 'done';
    show(`<div class="ls-card ls-video"><span class="ls-chip">${ic('play', 16)}Video</span>
      ${c.video.title ? `<h2>${esc(c.video.title)}</h2>` : ''}
      <div class="ls-player${file ? ' is-file' : ''}">${player}</div>
      ${free ? '' : '<small class="ls-vid-note">Video tugagach «Davom» tugmasi ochiladi.</small>'}</div>`);
    const go = () => (checkVideo && !plain ? askUnderstood(after) : after());
    const btn = actions([{ label: checkVideo || plain ? 'Davom' : "Ko'rdim, davom etamiz", disabled: !free, onClick: go }]);
    if (!file) return;
    const el = stage.querySelector('video');
    const open = () => {
      if (!btn.disabled) return;
      btn.disabled = false;
      stage.querySelector('.ls-vid-note')?.remove();
    };
    el.onended = open;
    el.ontimeupdate = () => { if (el.duration && el.currentTime >= el.duration - 0.5) open(); };
    if (again) el.play().catch(() => {});
  }
  function askUnderstood(after) {
    show(kibi('oylash', "Xo'sh, {ism}, mavzuni tushundingmi?"));
    actions([
      { label: 'Ha', onClick: () => {
        show(kibi('maqtash', "Zo'r! Unda kel, davom etamiz. Endi navbat savollarga!"));
        actions([{ label: 'Savollarga', onClick: after }]);
      } },
      { label: "Yo'q", ghost: true, onClick: () => {
        videoNo += 1;
        if (videoNo >= 2) {
          show(kibi('dalda', 'Mayli, savollar davomida senga yordam beraman.'));
          actions([{ label: 'Davom', onClick: after }]);
          return;
        }
        show(kibi('dalda', "Hechqisi yo'q, keling, oddiyroq tushuntiraman."));
        const replay = { label: "Videoni yana ko'raman", onClick: () => playVideo(after, { again: true }) };
        actions([{ label: 'Davom', onClick: () => {
          if (!hasHelper) { playVideo(after, { again: true }); return; }
          show(helperCard());
          actions([replay]);
        } }]);
      } },
    ]);
  }

  // ---------- Mashqlar ----------
  function nextExercise() {
    progress();
    const ex = queue[0];
    if (!ex) return hasGame ? playGame() : finish();
    const again = ex.wrong ? '<span class="ls-again">Yana bir bor</span>' : '';
    const q = `<div class="ls-q"><span class="ls-chip">${esc(kindLabel(ex))}</span>${again}<h2>${esc(ex.prompt)}</h2>${imgTag(ex.image, 'ls-img ls-q-img')}</div>`;
    const ui = { order: orderUi, match: matchUi, sort: sortUi, typing: typingUi, maze: mazeUi }[ex.type]?.(ex) || choiceUi(ex);
    show(q + ui.markup);
    const checkBtn = actions([{ label: 'Tekshirish', disabled: true, onClick: () => check(ex, ui) }]);
    ui.mount(stage, (ready) => { checkBtn.disabled = !ready; });
  }

  // ---------- Tuzatish o'yini ----------
  function playGame(startPart) {
    const bar = view.querySelector('.ls-n');
    bar.textContent = "O'yin";
    const go = () => runRepair({
      stage, fb, show, actions, kibi, kibiImg, say,
      game: c.game,
      name: () => learnerName,
      onMistake: (n) => { gameMistakes += n; },
      done: finish,
      startPart,
    });
    if (startPart != null || !exercises.length) { go(); return; }
    show(kibi('maqtash', 'Barakalla! Endi eng qiziq qismi: o\'yin!'));
    actions([{ label: "O'yinga", onClick: go }]);
  }

  async function check(ex, ui) {
    btns.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const right = await ui.evaluate();
    ui.lock();
    if (right) {
      solved.add(ex.i);
      queue.shift();
      fb.className = `ls-fb is-ok${kibiOn ? ' has-kibi' : ''}`;
      const praise = kibiOn ? say(PRAISE[(solved.size + mistakes) % PRAISE.length]) : "To'g'ri!";
      fb.innerHTML = `${kibiOn ? kibiImg('maqtash', 'ls-fb-kibi') : ''}<div><b>${ic('check', 18)}${praise}</b>${ex.explain ? `<p>${esc(ex.explain)}</p>` : ''}</div>`;
    } else {
      mistakes += 1;
      ex.wrong = true;
      queue.push(queue.shift());
      fb.className = `ls-fb is-bad${kibiOn ? ' has-kibi' : ''}`;
      const tip = ex.hint ? `<p>${esc(ex.hint)}</p>`
        : c.helper?.text ? `<p><span>Yordamchi karta:</span> ${esc(c.helper.text.replace(/\s*\n\s*/g, ' → '))}</p>` : '';
      fb.innerHTML = `${kibiOn ? kibiImg('dalda', 'ls-fb-kibi') : ''}<div><b>${ic('undo', 18)}Hali emas, hechqisi yo'q</b>
        ${tip}<p class="ls-later">Bu savol dars oxirida yana chiqadi.</p></div>`;
    }
    fb.hidden = false;
    progress();
    actions([{ label: 'Davom etish', onClick: nextExercise }]).focus();
  }

  function choiceUi(ex) {
    const order = shuffle(ex.options.map((_, k) => k));
    let pick = null;
    let root2;
    const im = ex.option_images || [];
    const withImg = im.some(Boolean);
    return {
      markup: `<div class="ls-opts${withImg ? ' ls-opts--img' : ''}" role="radiogroup" aria-label="Javoblar">${order.map((k) =>
        `<button type="button" class="ls-opt" role="radio" aria-checked="false" data-k="${k}"${ex.options[k] ? '' : ` aria-label="${k + 1}-rasm"`}>${imgTag(im[k], 'ls-opt-img')}${ex.options[k] ? `<span>${esc(ex.options[k])}</span>` : ''}</button>`).join('')}</div>`,
      mount(el, ready) {
        root2 = el;
        el.querySelectorAll('.ls-opt').forEach((b) => {
          b.onclick = () => {
            pick = Number(b.dataset.k);
            el.querySelectorAll('.ls-opt').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
            ready(true);
          };
        });
      },
      evaluate() {
        const ok = pick === ex.answer;
        root2.querySelector(`.ls-opt[data-k="${pick}"]`).classList.add(ok ? 'is-right' : 'is-wrong');
        return ok;
      },
      lock() { root2.querySelectorAll('.ls-opt').forEach((b) => { b.disabled = true; }); },
    };
  }

  function orderUi(ex) {
    const im = ex.item_images || [];
    const lbl = (k) => `${imgTag(im[k], 'ls-chip-img')}${esc(ex.items[k])}`;
    const pool = shuffle(ex.items.map((_, k) => k));
    const ans = [];
    let el;
    let ready;
    let locked = false;
    const draw = () => {
      el.querySelector('.ls-slots').innerHTML = ex.items.map((_, idx) => (ans[idx] != null
        ? `<li><button type="button" class="ls-chipbtn is-placed" data-a="${idx}" aria-label="${idx + 1}-qadam: ${esc(ex.items[ans[idx]] || 'rasm')}. Qaytarish uchun bosing"><i>${idx + 1}</i>${lbl(ans[idx])}</button></li>`
        : `<li><span class="ls-slot"><i>${idx + 1}</i></span></li>`)).join('');
      el.querySelector('.ls-pool').innerHTML = pool.map((k) =>
        `<button type="button" class="ls-chipbtn" data-p="${k}"${ex.items[k] ? '' : ` aria-label="Rasmli qadam"`}>${lbl(k)}</button>`).join('')
        || '<span class="ls-pool-done">Hammasi joyida. Tekshirib ko\'r!</span>';
      el.querySelectorAll('[data-p]').forEach((b) => { b.onclick = () => { if (locked) return; const k = Number(b.dataset.p); pool.splice(pool.indexOf(k), 1); ans.push(k); draw(); }; });
      el.querySelectorAll('[data-a]').forEach((b) => { b.onclick = () => { if (locked) return; const idx = Number(b.dataset.a); pool.push(ans[idx]); ans.splice(idx, 1); draw(); }; });
      ready(pool.length === 0);
    };
    return {
      markup: `<ol class="ls-slots" aria-label="Sening tartibing"></ol>
        <div class="ls-pool" aria-label="Qadamlar: bosib tartibga qo'y"></div>`,
      mount(root2, r) { el = root2; ready = r; draw(); },
      evaluate() {
        let all = true;
        el.querySelectorAll('[data-a]').forEach((b) => {
          const idx = Number(b.dataset.a);
          const ok = ans[idx] === idx;
          if (!ok) all = false;
          b.classList.add(ok ? 'is-right' : 'is-wrong');
        });
        return all;
      },
      lock() { locked = true; el.querySelectorAll('.ls-chipbtn').forEach((b) => { b.disabled = true; }); },
    };
  }

  function matchUi(ex) {
    const pim = ex.pair_images || [];
    const n = ex.pairs.length;
    const rights = shuffle(ex.pairs.map((_, k) => k));
    const pairOf = new Map(); // chap k -> o'ng k
    let sel = null;
    let el;
    let ready;
    let locked = false;
    const leftOf = (r) => [...pairOf].find(([, v]) => v === r)?.[0];
    const draw = () => {
      el.querySelectorAll('[data-l]').forEach((b) => {
        const k = Number(b.dataset.l);
        const p = pairOf.has(k);
        b.className = `ls-mt${p ? ` is-paired c${k}` : ''}${sel === k ? ' is-sel' : ''}`;
        b.setAttribute('aria-pressed', String(sel === k));
        b.querySelector('i').textContent = p ? String(k + 1) : '';
      });
      el.querySelectorAll('[data-r]').forEach((b) => {
        const l = leftOf(Number(b.dataset.r));
        b.className = `ls-mt${l != null ? ` is-paired c${l}` : ''}`;
        b.querySelector('i').textContent = l != null ? String(l + 1) : '';
      });
      ready(pairOf.size === n);
    };
    return {
      markup: `<p class="ls-hint">Chapdan birini, keyin o'ngdan unga mosini bos.</p>
        <div class="ls-match">
          <div class="ls-col">${ex.pairs.map((p, k) => `<button type="button" class="ls-mt" data-l="${k}"${p[0] ? '' : ` aria-label="Chap, ${k + 1}-rasm"`}><i></i>${imgTag(pim[k]?.[0], 'ls-chip-img')}${esc(p[0])}</button>`).join('')}</div>
          <div class="ls-col">${rights.map((k) => `<button type="button" class="ls-mt" data-r="${k}"${ex.pairs[k][1] ? '' : ` aria-label="O'ng, rasm"`}><i></i>${imgTag(pim[k]?.[1], 'ls-chip-img')}${esc(ex.pairs[k][1])}</button>`).join('')}</div>
        </div>`,
      mount(root2, r) {
        el = root2; ready = r;
        el.querySelectorAll('[data-l]').forEach((b) => {
          b.onclick = () => {
            if (locked) return;
            const k = Number(b.dataset.l);
            if (pairOf.has(k)) pairOf.delete(k);
            sel = sel === k ? null : k;
            draw();
          };
        });
        el.querySelectorAll('[data-r]').forEach((b) => {
          b.onclick = () => {
            if (locked) return;
            const r2 = Number(b.dataset.r);
            const had = leftOf(r2);
            if (sel == null) { if (had != null) pairOf.delete(had); draw(); return; }
            if (had != null) pairOf.delete(had);
            pairOf.set(sel, r2);
            sel = null;
            draw();
          };
        });
        draw();
      },
      evaluate() {
        let all = true;
        for (const [l, r] of pairOf) {
          const ok = l === r;
          if (!ok) all = false;
          el.querySelector(`[data-l="${l}"]`).classList.add(ok ? 'is-right' : 'is-wrong');
          el.querySelector(`[data-r="${r}"]`).classList.add(ok ? 'is-right' : 'is-wrong');
        }
        return all;
      },
      lock() { locked = true; el.querySelectorAll('.ls-mt').forEach((b) => { b.disabled = true; }); },
    };
  }

  function sortUi(ex) {
    const im = ex.item_images || [];
    const order = shuffle(ex.items.map((_, k) => k));
    const pick = new Map(); // narsa -> tanlangan guruh
    let el;
    let locked = false;
    return {
      markup: `<p class="ls-hint">Har birini to'g'ri guruhga ajrat.</p>
        <div class="ls-sort">${order.map((k) => `
          <div class="ls-srt" data-k="${k}">
            <span class="ls-srt-l">${imgTag(im[k], 'ls-srt-img')}${ex.items[k] ? `<span>${esc(ex.items[k])}</span>` : ''}</span>
            <span class="ls-srt-g" role="radiogroup" aria-label="${esc(ex.items[k] || 'Rasm')}: qaysi guruhga?">${ex.groups.map((g, j) =>
              `<button type="button" class="ls-srt-b c${j}" role="radio" aria-checked="false" data-g="${j}">${esc(g)}</button>`).join('')}</span>
          </div>`).join('')}</div>`,
      mount(root2, ready) {
        el = root2;
        el.querySelectorAll('.ls-srt').forEach((row) => {
          const k = Number(row.dataset.k);
          row.querySelectorAll('[data-g]').forEach((b) => {
            b.onclick = () => {
              if (locked) return;
              pick.set(k, Number(b.dataset.g));
              row.querySelectorAll('[data-g]').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
              row.classList.add('is-set');
              ready(pick.size === ex.items.length);
            };
          });
        });
      },
      evaluate() {
        let all = true;
        el.querySelectorAll('.ls-srt').forEach((row) => {
          const k = Number(row.dataset.k);
          const ok = pick.get(k) === ex.item_groups[k];
          if (!ok) all = false;
          row.classList.add(ok ? 'is-right' : 'is-wrong');
        });
        return all;
      },
      lock() { locked = true; el.querySelectorAll('.ls-srt-b').forEach((b) => { b.disabled = true; }); },
    };
  }

  // ---------- Yakun: termin, XP, qurol ----------
  async function finish() {
    progress();
    show('<div class="ls-card ls-wait"><div class="skeleton" aria-busy="true"></div><p>Qasr ochilmoqda...</p></div>');
    actions([]);
    let r;
    if (preview) {
      // Ko'rinish: natija serverga yuborilmaydi, birinchi marta o'tgandek ko'rsatiladi
      r = { first: true, xp_gained: L.xp + (c.game?.parts?.length || 0) * (c.game?.part_xp ?? 5), tool: L.tool, section_done: false, next_lesson_id: null, stats: { streak: 1, today: 1, goal: 2 } };
      finished = true;
      showWin(r);
      actions([{ label: "Boshidan ko'rish", onClick: () => opts.onRestart?.() }]);
      return;
    }
    try {
      r = await opts.complete(mistakes);
    } catch (e) {
      showError(e);
      show(`<div class="ls-card"><h2>Natijani saqlab bo'lmadi</h2><p>Internetni tekshirib, qayta urinib ko'r.</p></div>`);
      actions([{ label: 'Qayta urinish', onClick: finish }]);
      return;
    }
    finished = true;
    const done = () => {
      showWin(r);
      const next = nextOf(r);
      const hall = `#/it/section/${L.section.id}`;
      // Savollarning yarmidan ko'piga xato javob berilgan bo'lsa, Kibi videoni yana ko'rishni taklif qiladi
      const rewatch = video && kibiOn && mistakes * 2 > exercises.length
        ? [{ label: "Videoni yana ko'rish", ghost: true, onClick: () => { L.status = 'done'; playVideo(done, { plain: true }); } }] : [];
      actions([...(next && r.next_section_id === L.section.id
        ? [{ label: 'Keyingi eshik', href: `${hall}?unlock=${next}` }, { label: 'Zalga qaytish', href: hall, ghost: true }]
        : next
          ? [{ label: 'Keyingi qasr', href: `#/it?opened=${r.next_section_id}` }, { label: 'Zalga qaytish', href: hall, ghost: true }]
          : [{ label: "Qasrlar yo'liga qaytish", href: '#/it' }]), ...rewatch]);
    };
    done();
  }

  const nextOf = (r) => (r.next_lesson_id && r.next_lesson_id !== id ? r.next_lesson_id : null);
  function showWin(r) {
    const sameNext = nextOf(r) && r.next_section_id === L.section.id;
    const gains = [
      r.first ? `<span class="it-pill is-xp">${ic('star', 16)}<b>+${r.xp_gained} XP</b></span>` : '<span class="it-pill">Takrorlash</span>',
      `<span class="it-pill is-fire">${ic('fire', 16)}<b>${r.stats.streak}</b>&nbsp;kun</span>`,
    ].join('');
    show(`<div class="ls-card ls-win">
      ${kibiOn ? kibiImg('galaba', 'ls-kibi-win ls-pop') : `<img class="ls-castle ls-pop" src="${r.section_done ? castleSrc('open') : asset('door-done')}" alt="" width="140" height="140">`}
      <h1>${r.section_done ? 'Qasr zabt etildi!' : 'Mavzu o\'zlashtirildi!'}</h1>
      ${r.section_done ? `<p class="ls-sub">«${esc(L.section.title)}» bo'limi to'liq tugatildi.</p>`
        : sameNext ? '<p class="ls-sub">Keyingi eshikning qulfi ochildi!</p>' : ''}
      ${L.term ? `<span class="ls-kicker">Bugun o'rgangan so'zing</span><div class="ls-term">${esc(L.term)}</div>` : ''}
      ${imgTag(c.term_image)}
      ${c.term_text ? `<p>${say(c.term_text)}</p>` : ''}
      <div class="ls-gains">${gains}</div>
      ${r.tool ? `<div class="ls-newtool">${ic('tool', 18)}<span>Sumkangga yangi qurol: <b>${esc(r.tool.name)}</b></span></div>` : ''}
      ${mistakes === 0 ? '<p class="ls-perfect">Bitta ham xatosiz!</p>' : ''}
      ${kibiOn && video && mistakes * 2 > exercises.length
        ? kibi('dalda', "Videoni yana bir ko'rib chiqsang, hammasi yanada oydinlashadi.") : ''}
      ${r.stats.today >= r.stats.goal ? '<p class="ls-goal">Bugungi maqsad bajarildi!</p>' : ''}
    </div>`);
  }

  if (!exercises.length && !preview) {
    show('<div class="it-empty"><p>Bu mavzuda hali mashq yo\'q.</p></div>');
    actions([{ label: 'Zalga qaytish', href: `#/it/section/${L.section.id}` }]);
    return;
  }
  // Ko'rinishda kerakli joydan boshlanadi (muharrirda qaysi maydon tahrirlanayotgan bo'lsa)
  const s = opts.start;
  if (s === 'finish') finish();
  else if (typeof s === 'string' && s.startsWith('game') && hasGame) {
    exercises.forEach((e) => solved.add(e.i));
    queue = [];
    progress();
    playGame(s === 'game' ? undefined : Number(s.slice(5)));
  }
  else if (typeof s === 'number' && exercises[s]) {
    for (let k = 0; k < s; k++) solved.add(k);
    queue = exercises.slice(s);
    step = intro.length;
    nextExercise();
  } else {
    if (typeof s === 'string' && intro.includes(s)) step = intro.indexOf(s);
    nextIntro();
  }
}
