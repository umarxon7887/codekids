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
import { t } from '../../i18n/index.js';

// To'g'ri javobdan keyin Kibining qisqa maqtovi
const PRAISE = t('it.l.praise', { ism: '{ism}' }).split('|');

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
      <p>${locked ? t('it.l.locked') : t('tl.openFail')}</p>
      <a class="btn" href="#/it">${t('it.toPath')}</a></div>`;
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
  let combo = 0; // ketma-ket to'g'ri javoblar (yumshoq seriya: xatoda jim nolga tushadi)
  let best = 0;

  view.innerHTML = `
    <header class="ls-top">
      <button type="button" class="ls-x" aria-label="${t('tl.exit')}">${ic('x', 22)}</button>
      <div class="ls-bar" role="progressbar" aria-label="${t('it.l.doneEx')}" aria-valuemin="0" aria-valuemax="${exercises.length}" aria-valuenow="0"><i></i></div>
      <span class="ls-streak" hidden>${ic('fire', 18)}<b>0</b></span>
      <span class="ls-n">0 / ${exercises.length}</span>
    </header>
    <main class="ls-stage" tabindex="-1"></main>
    <footer class="ls-foot"><div class="ls-fb" role="status" hidden></div><div class="ls-btns"></div></footer>`;
  const stage = view.querySelector('.ls-stage');
  const fb = view.querySelector('.ls-fb');
  const foot = view.querySelector('.ls-foot');
  const btns = view.querySelector('.ls-btns');

  view.querySelector('.ls-x').onclick = () => {
    if (preview) { opts.onRestart?.(); return; }
    if (finished || confirm(t('it.l.confirmExit'))) location.hash = `#/it/section/${L.section.id}`;
  };
  if (preview) view.querySelector('.ls-x').setAttribute('aria-label', t('it.l.restart'));

  const progress = () => {
    const n = solved.size;
    view.querySelector('.ls-bar i').style.width = `${exercises.length ? (n / exercises.length) * 100 : 0}%`;
    view.querySelector('.ls-bar').setAttribute('aria-valuenow', String(n));
    view.querySelector('.ls-n').textContent = `${n} / ${exercises.length}`;
  };
  /** Seriya belgisi: 2 tadan boshlab ko'rinadi, 3 dan progress chizig'i "qiziydi". */
  const streakUi = () => {
    const el = view.querySelector('.ls-streak');
    el.hidden = combo < 2;
    el.querySelector('b').textContent = String(combo);
    el.setAttribute('aria-label', t('it.l.comboAria', { n: combo }));
    el.classList.remove('is-bump');
    if (combo >= 2) { void el.offsetWidth; el.classList.add('is-bump'); }
    view.querySelector('.ls-bar').classList.toggle('is-hot', combo >= 3);
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
  const say = (s) => esc(String(s || '')).replace(/\{ism\}/g, `<b>${esc(learnerName || t('it.l.friend'))}</b>`);
  const kibiImg = (pose, cls = 'ls-kibi-img') => `<img class="${cls}" src="${asset(`kibi/${pose}`)}" alt="" draggable="false">`;
  /** Kibi va uning gap pufakchasi. */
  const kibi = (pose, text, extra = '') => `<div class="ls-kibi">
      <div class="ls-bubble"><p>${say(text)}</p>${extra}</div>${kibiImg(pose)}</div>`;
  /** Yordamchi karta matni: bir necha qator bo'lsa, raqamli ro'yxat (masalan, yoqish zanjiri). */
  const helperBody = (s) => {
    const rows = String(s || '').split('\n').map((x) => x.trim()).filter(Boolean);
    if (rows.length > 1) return `<ol class="ls-steps">${rows.map((x) => `<li>${esc(x)}</li>`).join('')}</ol>`;
    return rows.length ? `<p>${esc(rows[0])}</p>` : '';
  };
  const helperCard = () => `<div class="ls-card ls-helper"><span class="ls-chip">${ic('bulb', 16)}${t('it.l.helper')}</span>
    ${c.helper.title ? `<h2>${esc(c.helper.title)}</h2>` : ''}${imgTag(c.helper.image)}${helperBody(c.helper.text)}</div>`;
  const show = (markup) => {
    fb.hidden = true;
    fb.className = 'ls-fb';
    foot.className = 'ls-foot';
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
        <span class="ls-kicker">${esc(L.section.title)} · ${L.kind === 'test' ? t('it.secTest').toLowerCase() : t('it.topicN', { n: L.section.index + 1 })}</span>
        <h1>${esc(L.title)}</h1>${imgTag(c.story_image)}<p>${esc(c.story)}</p></div>`);
      actions([{ label: L.kind === 'test' ? t('it.l.startTest') : t('it.l.letsGo'), onClick: nextIntro }]);
    } else if (k === 'video') {
      playVideo(nextIntro);
    } else if (k === 'helper') {
      show(helperCard());
      actions([{ label: t('it.l.gotIt'), onClick: nextIntro }]);
    } else {
      show(`<div class="ls-card ls-tool"><span class="ls-chip">${ic('tool', 16)}${t('it.l.tool')}</span>
        <h2>${esc(L.tool.name)}</h2><p>${esc(L.tool.body || L.tool.short || '')}</p>
        <small>${t('it.l.toolHint')}</small></div>`);
      actions([{ label: t('it.l.toExercises'), onClick: nextIntro }]);
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
    const bs = d.buttons?.length ? d.buttons : [{ label: t('it.l.next') }];
    actions(bs.map((b, i) => ({
      label: esc(b.label),
      ghost: i > 0,
      onClick: () => {
        if (!b.reply) { next(); return; }
        show(kibi(b.reply_pose || 'maqtash', b.reply));
        actions([{ label: esc(t('it.l.next')), onClick: next }]);
      },
    })));
  }
  const NAME_RE = /^\p{L}[\p{L}\p{M}'’ʻʼ‘` -]*$/u;
  function askName(d, next) {
    show(kibi(d.pose, d.text, `<input class="ls-name-in" maxlength="20" autocomplete="given-name" autocapitalize="words" enterkeyhint="done" placeholder="${t('it.l.namePh')}" aria-label="${t('it.l.name')}">
      <small class="ls-name-msg" role="status"></small>`));
    const inp = stage.querySelector('.ls-name-in');
    const msg = stage.querySelector('.ls-name-msg');
    const value = () => inp.value.trim().replace(/\s+/g, ' ');
    const ok = () => value().length >= 2 && NAME_RE.test(value());
    const btn = actions([{ label: esc(d.buttons?.[0]?.label || t('it.l.next')), disabled: true, onClick: submit }]);
    async function submit() {
      if (!ok()) return;
      btn.disabled = true;
      try {
        learnerName = preview || !opts.saveName ? value() : (await opts.saveName(value())).name;
        next();
      } catch (e) {
        msg.textContent = t('it.l.nameFail');
        btn.disabled = false;
      }
    }
    inp.oninput = () => {
      btn.disabled = !ok();
      msg.textContent = value() && !NAME_RE.test(value()) ? t('it.l.lettersOnly') : '';
    };
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } };
    setTimeout(() => inp.focus(), 50);
  }

  // ---------- Video va «Tushundingmi?» ----------
  // Saytdagi video faylda «Davom» video oxirigacha ko'rilgandan keyin ochiladi (ko'rinishda va qayta o'tishda darhol).
  function playVideo(after, { again = false, plain = false } = {}) {
    const vt = c.video.title || 'Video';
    const file = Boolean(c.video.file);
    const player = file
      ? `<video class="ls-vid" src="${video}" poster="${video.replace(/\.mp4$/, '.jpg')}" controls playsinline preload="metadata"></video>`
      : `<iframe src="${video}" title="${esc(vt)}" loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    const free = !file || preview || L.status === 'done';
    show(`<div class="ls-card ls-video"><span class="ls-chip">${ic('play', 16)}${t('it.l.video')}</span>
      ${c.video.title ? `<h2>${esc(c.video.title)}</h2>` : ''}
      <div class="ls-player${file ? ' is-file' : ''}">${player}</div>
      ${free ? '' : `<small class="ls-vid-note">${t('it.l.vidNote')}</small>`}</div>`);
    const go = () => (checkVideo && !plain ? askUnderstood(after) : after());
    const btn = actions([{ label: checkVideo || plain ? t('it.l.next') : t('it.l.watched'), disabled: !free, onClick: go }]);
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
    show(kibi('oylash', t('it.l.understood', { ism: '{ism}' })));
    actions([
      { label: t('it.l.yes'), onClick: () => {
        show(kibi('maqtash', t('it.l.yesReply')));
        actions([{ label: t('it.l.toQuestions'), onClick: after }]);
      } },
      { label: t('it.l.no'), ghost: true, onClick: () => {
        videoNo += 1;
        if (videoNo >= 2) {
          show(kibi('dalda', t('it.l.helpLater')));
          actions([{ label: t('it.l.next'), onClick: after }]);
          return;
        }
        show(kibi('dalda', t('it.l.simpler')));
        const replay = { label: t('it.l.rewatch'), onClick: () => playVideo(after, { again: true }) };
        actions([{ label: t('it.l.next'), onClick: () => {
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
    if (!ex) return finish();
    const again = ex.wrong ? `<span class="ls-again">${t('it.l.again')}</span>` : '';
    const q = `<div class="ls-q"><span class="ls-chip">${esc(kindLabel(ex))}</span>${again}<h2>${esc(ex.prompt)}</h2>${imgTag(ex.image, 'ls-img ls-q-img')}</div>`;
    const ui = { order: orderUi, match: matchUi, sort: sortUi, typing: typingUi, maze: mazeUi }[ex.type]?.(ex) || choiceUi(ex);
    show(q + ui.markup);
    const checkBtn = actions([{ label: t('it.l.check'), disabled: true, onClick: () => check(ex, ui) }]);
    ui.mount(stage, (ready) => { checkBtn.disabled = !ready; });
  }

  async function check(ex, ui) {
    btns.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    const right = await ui.evaluate();
    ui.lock();
    foot.className = `ls-foot is-${right ? 'ok' : 'bad'}`;
    if (right) {
      solved.add(ex.i);
      queue.shift();
      combo += 1;
      best = Math.max(best, combo);
      fb.className = `ls-fb is-ok${kibiOn ? ' has-kibi' : ''}`;
      const praise = kibiOn ? say(PRAISE[(solved.size + mistakes) % PRAISE.length]) : esc(PRAISE[0]);
      const hot = combo >= 3 ? `<span class="ls-combo">${ic('fire', 16)}${t('it.l.combo', { n: combo })}</span>` : '';
      fb.innerHTML = `${kibiOn ? kibiImg('maqtash', 'ls-fb-kibi') : ''}<div><b>${ic('check', 18)}<span>${praise}</span>${hot}</b>${ex.explain ? `<p>${esc(ex.explain)}</p>` : ''}</div>`;
    } else {
      mistakes += 1;
      combo = 0;
      ex.wrong = true;
      queue.push(queue.shift());
      fb.className = `ls-fb is-bad${kibiOn ? ' has-kibi' : ''}`;
      const tip = ex.hint ? `<p>${esc(ex.hint)}</p>`
        : c.helper?.text ? `<p><span>${t('it.l.helper')}:</span> ${esc(c.helper.text.replace(/\s*\n\s*/g, ' → '))}</p>` : '';
      fb.innerHTML = `${kibiOn ? kibiImg('dalda', 'ls-fb-kibi') : ''}<div><b>${ic('undo', 18)}${t('it.l.notYet')}</b>
        ${tip}<p class="ls-later">${t('it.l.later')}</p></div>`;
    }
    fb.hidden = false;
    streakUi();
    progress();
    actions([{ label: t('it.l.continue'), onClick: nextExercise }]).focus();
  }

  function choiceUi(ex) {
    const order = shuffle(ex.options.map((_, k) => k));
    let pick = null;
    let root2;
    const im = ex.option_images || [];
    const withImg = im.some(Boolean);
    return {
      markup: `<div class="ls-opts${withImg ? ' ls-opts--img' : ''}" role="radiogroup" aria-label="${t('it.l.answers')}">${order.map((k) =>
        `<button type="button" class="ls-opt" role="radio" aria-checked="false" data-k="${k}"${ex.options[k] ? '' : ` aria-label="${t('it.l.imgN', { n: k + 1 })}"`}>${imgTag(im[k], 'ls-opt-img')}${ex.options[k] ? `<span>${esc(ex.options[k])}</span>` : ''}</button>`).join('')}</div>`,
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

  // Tartibla: kartani ushlab sudrab joyiga qo'yiladi, qolganlari silliq suriladi (FLIP).
  // Klaviaturada: kartani tanlab ↑/↓.
  function orderUi(ex) {
    const im = ex.item_images || [];
    let ord = shuffle(ex.items.map((_, k) => k));
    if (ord.length > 1 && ord.every((k, i) => k === i)) ord = [...ord.slice(1), ord[0]];
    let list;
    let locked = false;
    const renumber = () => list.querySelectorAll('.ls-ord-n').forEach((n, i) => { n.textContent = String(i + 1); });
    // DOM o'zgarishidan oldingi joydan yangi joyga boshqa kartalar silliq suriladi
    const flip = (li, change) => {
      const sibs = [...list.children].filter((x) => x !== li);
      const was = new Map(sibs.map((x) => [x, x.getBoundingClientRect().top]));
      change();
      for (const x of sibs) {
        x.style.transition = 'none';
        x.style.transform = '';
        const d = was.get(x) - x.getBoundingClientRect().top;
        if (d) {
          x.style.transform = `translateY(${d}px)`;
          void x.offsetWidth;
        }
        x.style.transition = '';
        x.style.transform = '';
      }
      renumber();
    };
    function drag(e, li) {
      if (locked || e.button > 0) return;
      e.preventDefault();
      li.setPointerCapture(e.pointerId);
      li.focus({ preventScroll: true });
      let startY = e.clientY;
      let base = li.offsetTop;
      li.classList.add('is-drag');
      const follow = (y) => { li.style.transform = `translateY(${y - startY}px) scale(1.03)`; };
      li.onpointermove = (m) => {
        follow(m.clientY);
        const mid = base + (m.clientY - startY) + li.offsetHeight / 2;
        const prev = li.previousElementSibling;
        const next = li.nextElementSibling;
        if (next && mid > next.offsetTop + next.offsetHeight / 2) flip(li, () => list.insertBefore(next, li));
        else if (prev && mid < prev.offsetTop + prev.offsetHeight / 2) flip(li, () => list.insertBefore(li, prev));
        else return;
        startY += li.offsetTop - base;
        base = li.offsetTop;
        follow(m.clientY);
      };
      li.onpointerup = li.onpointercancel = () => {
        li.onpointermove = li.onpointerup = li.onpointercancel = null;
        li.classList.remove('is-drag');
        li.style.transform = '';
        ord = [...list.children].map((x) => Number(x.dataset.k));
      };
    }
    const key = (e, li) => {
      if (locked || (e.key !== 'ArrowUp' && e.key !== 'ArrowDown')) return;
      e.preventDefault();
      const to = e.key === 'ArrowUp' ? li.previousElementSibling : li.nextElementSibling?.nextElementSibling ?? null;
      if (e.key === 'ArrowUp' && !to) return;
      if (e.key === 'ArrowDown' && !li.nextElementSibling) return;
      flip(li, () => list.insertBefore(li, to));
      ord = [...list.children].map((x) => Number(x.dataset.k));
      li.focus();
    };
    return {
      markup: `<p class="ls-hint">${t('it.l.orderHint')}</p>
        <ol class="ls-ords" aria-label="${t('it.l.yourOrder')}">${ord.map((k, i) => `<li class="ls-ord" data-k="${k}" tabindex="0">
          <i class="ls-ord-n">${i + 1}</i>${imgTag(im[k], 'ls-ord-img')}<span class="ls-ord-t">${esc(ex.items[k] || '')}</span>
          <span class="ls-ord-g" aria-hidden="true"></span></li>`).join('')}</ol>`,
      mount(root2, ready) {
        list = root2.querySelector('.ls-ords');
        list.querySelectorAll('.ls-ord').forEach((li) => {
          li.onpointerdown = (e) => drag(e, li);
          li.onkeydown = (e) => key(e, li);
        });
        ready(true);
      },
      evaluate() {
        let all = true;
        list.querySelectorAll('.ls-ord').forEach((li, i) => {
          const ok = Number(li.dataset.k) === i;
          if (!ok) all = false;
          li.classList.add(ok ? 'is-right' : 'is-wrong');
        });
        return all;
      },
      lock() { locked = true; list.querySelectorAll('.ls-ord').forEach((li) => { li.tabIndex = -1; }); },
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
      markup: `<p class="ls-hint">${t('it.l.matchHint')}</p>
        <div class="ls-match">
          <div class="ls-col">${ex.pairs.map((p, k) => `<button type="button" class="ls-mt" data-l="${k}"${p[0] ? '' : ` aria-label="${t('it.l.leftImg', { n: k + 1 })}"`}><i></i>${imgTag(pim[k]?.[0], 'ls-chip-img')}${esc(p[0])}</button>`).join('')}</div>
          <div class="ls-col">${rights.map((k) => `<button type="button" class="ls-mt" data-r="${k}"${ex.pairs[k][1] ? '' : ` aria-label="${t('it.l.rightImg')}"`}><i></i>${imgTag(pim[k]?.[1], 'ls-chip-img')}${esc(ex.pairs[k][1])}</button>`).join('')}</div>
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

  // Saralash: qism bittadan katta kartada chiqadi. Bola kartani rasmli qutiga sudraydi yoki qutini bosadi,
  // karta qutiga uchib kiradi. Qutidagi kichik rasmni bossa, qism kartaga qaytadi.
  function sortUi(ex) {
    const im = ex.item_images || [];
    const gim = ex.group_images || [];
    let deck = shuffle(ex.items.map((_, k) => k));
    const pick = new Map(); // narsa -> tanlangan guruh
    let el;
    let ready;
    let locked = false;
    let busy = false;
    const name = (k) => esc(ex.items[k] || t('it.l.img'));
    const face = (k, cls) => (im[k] ? imgTag(im[k], cls) : `<span class="${cls} is-letter" aria-hidden="true">${esc((ex.items[k] || '?').charAt(0).toUpperCase())}</span>`);
    const zones = () => [...el.querySelectorAll('.ls-sx-z')];
    const draw = (fresh) => {
      const k = deck[0];
      el.querySelector('.ls-sx-deck').innerHTML = k == null
        ? `<p class="ls-sx-done">${t('it.l.allPlaced')}</p>`
        : `<div class="ls-sx-card${deck.length > 1 ? ' is-stack' : ''}" data-k="${k}">${face(k, 'ls-sx-img')}<b>${name(k)}</b></div>
          <small class="ls-sx-left">${t('it.l.sortLeft', { n: deck.length })}</small>`;
      zones().forEach((z) => {
        const g = Number(z.dataset.g);
        z.querySelector('.ls-sx-zb').disabled = locked || k == null;
        z.querySelector('.ls-sx-in').innerHTML = [...pick].filter(([, v]) => v === g).map(([x]) =>
          `<button type="button" class="ls-sx-th${x === fresh ? ' is-new' : ''}" data-k="${x}" title="${name(x)}" aria-label="${name(x)}: ${t('it.l.sortBack')}">${face(x, 'ls-sx-thimg')}</button>`).join('');
      });
      el.querySelectorAll('.ls-sx-th').forEach((b) => {
        b.onclick = () => {
          if (locked || busy) return;
          const x = Number(b.dataset.k);
          pick.delete(x);
          deck = [x, ...deck];
          draw();
        };
      });
      const card = el.querySelector('.ls-sx-card');
      if (card) card.onpointerdown = (e) => drag(e, card);
      ready(pick.size === ex.items.length);
    };
    // Karta qutiga uchib kiradi, keyin qutida kichik rasm paydo bo'ladi
    const place = (g, card, from = [0, 0]) => {
      if (locked || busy || deck[0] == null) return;
      const k = deck[0];
      const z = zones()[g];
      const done = () => { busy = false; pick.set(k, g); deck = deck.slice(1); draw(k); z.classList.remove('is-hit'); void z.offsetWidth; z.classList.add('is-hit'); };
      if (!card || matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }
      busy = true;
      const c = card.getBoundingClientRect();
      const t2 = z.querySelector('.ls-sx-in').getBoundingClientRect();
      const dx = from[0] + (t2.left + t2.width / 2) - (c.left + c.width / 2);
      const dy = from[1] + (t2.top + Math.min(t2.height, 40) / 2) - (c.top + c.height / 2);
      card.classList.add('is-fly');
      card.style.transform = `translate(${dx}px, ${dy}px) scale(.22)`;
      setTimeout(done, 320);
    };
    function drag(e, card) {
      if (locked || busy || e.button > 0) return;
      e.preventDefault();
      card.setPointerCapture(e.pointerId);
      const x0 = e.clientX;
      const y0 = e.clientY;
      let pos = [0, 0];
      let over = null;
      card.classList.add('is-drag');
      card.onpointermove = (m) => {
        pos = [m.clientX - x0, m.clientY - y0];
        card.style.transform = `translate(${pos[0]}px, ${pos[1]}px) rotate(${Math.max(-8, Math.min(8, pos[0] / 12))}deg) scale(1.04)`;
        over = zones().find((z) => { const r = z.getBoundingClientRect(); return m.clientX > r.left && m.clientX < r.right && m.clientY > r.top && m.clientY < r.bottom; }) || null;
        zones().forEach((z) => z.classList.toggle('is-over', z === over));
      };
      card.onpointerup = card.onpointercancel = () => {
        card.onpointermove = card.onpointerup = card.onpointercancel = null;
        card.classList.remove('is-drag');
        zones().forEach((z) => z.classList.remove('is-over'));
        if (over) { card.style.transform = `translate(${pos[0]}px, ${pos[1]}px)`; place(Number(over.dataset.g), card); return; }
        card.style.transform = '';
      };
    }
    return {
      markup: `<p class="ls-hint">${t('it.l.sortHint')}</p>
        <div class="ls-sx">
          <div class="ls-sx-deck" aria-live="polite"></div>
          <div class="ls-sx-zones">${ex.groups.map((g, j) => `<div class="ls-sx-z c${j}" data-g="${j}">
            <button type="button" class="ls-sx-zb">${gim[j] ? imgTag(gim[j], 'ls-sx-zimg') : ''}<b>${esc(g)}</b></button>
            <div class="ls-sx-in"></div></div>`).join('')}</div>
        </div>`,
      mount(root2, r) {
        el = root2; ready = r;
        zones().forEach((z) => {
          z.querySelector('.ls-sx-zb').onclick = () => place(Number(z.dataset.g), el.querySelector('.ls-sx-card'));
        });
        draw();
      },
      evaluate() {
        let all = true;
        el.querySelectorAll('.ls-sx-th').forEach((b) => {
          const k = Number(b.dataset.k);
          const ok = pick.get(k) === ex.item_groups[k];
          if (!ok) all = false;
          b.classList.add(ok ? 'is-right' : 'is-wrong');
        });
        return all;
      },
      lock() { locked = true; el.querySelectorAll('.ls-sx-zb, .ls-sx-th').forEach((b) => { b.disabled = true; }); },
    };
  }

  // ---------- Yakun: termin, XP, qurol ----------
  async function finish() {
    progress();
    show(`<div class="ls-card ls-wait"><div class="skeleton" aria-busy="true"></div><p>${t('it.l.opening')}</p></div>`);
    actions([]);
    let r;
    if (preview) {
      // Ko'rinish: natija serverga yuborilmaydi, birinchi marta o'tgandek ko'rsatiladi
      r = { first: true, xp_gained: L.xp, tool: L.tool, section_done: false, next_lesson_id: null, stats: { streak: 1, today: 1, goal: 2 } };
      finished = true;
      showWin(r);
      actions([{ label: t('it.l.restart'), onClick: () => opts.onRestart?.() }]);
      return;
    }
    try {
      r = await opts.complete(mistakes);
    } catch (e) {
      showError(e);
      show(`<div class="ls-card"><h2>${t('it.l.saveFail')}</h2><p>${t('it.l.checkNet')}</p></div>`);
      actions([{ label: t('app.retry'), onClick: finish }]);
      return;
    }
    finished = true;
    const done = () => {
      showWin(r);
      const next = nextOf(r);
      const hall = `#/it/section/${L.section.id}`;
      // Savollarning yarmidan ko'piga xato javob berilgan bo'lsa, Kibi videoni yana ko'rishni taklif qiladi
      const rewatch = video && kibiOn && mistakes * 2 > exercises.length
        ? [{ label: t('it.l.rewatch2'), ghost: true, onClick: () => { L.status = 'done'; playVideo(done, { plain: true }); } }] : [];
      actions([...(next && r.next_section_id === L.section.id
        ? [{ label: t('it.l.nextDoor'), href: `${hall}?unlock=${next}` }, { label: t('it.l.toHall'), href: hall, ghost: true }]
        : next
          ? [{ label: t('it.l.nextCastle'), href: `#/it?opened=${r.next_section_id}` }, { label: t('it.l.toHall'), href: hall, ghost: true }]
          : [{ label: t('it.l.toPath'), href: '#/it' }]), ...rewatch]);
    };
    done();
  }

  const nextOf = (r) => (r.next_lesson_id && r.next_lesson_id !== id ? r.next_lesson_id : null);
  function showWin(r) {
    const sameNext = nextOf(r) && r.next_section_id === L.section.id;
    const gains = [
      r.first ? `<span class="it-pill is-xp">${ic('star', 16)}<b>+${r.xp_gained} XP</b></span>` : `<span class="it-pill">${t('it.l.repeat')}</span>`,
      `<span class="it-pill is-fire">${ic('fire', 16)}<b>${r.stats.streak}</b>&nbsp;${t('it.l.days', { n: r.stats.streak })}</span>`,
      best >= 3 ? `<span class="it-pill">${ic('check', 16)}<b>${best}</b>&nbsp;${t('it.l.inRow')}</span>` : '',
    ].join('');
    show(`<div class="ls-card ls-win">
      ${kibiOn ? kibiImg('galaba', 'ls-kibi-win ls-pop') : `<img class="ls-castle ls-pop" src="${r.section_done ? castleSrc('open') : asset('door-done')}" alt="" width="140" height="140">`}
      <h1>${r.section_done ? t('it.l.castleWon') : t('it.l.topicDone')}</h1>
      ${r.section_done ? `<p class="ls-sub">${t('it.l.secDone', { s: esc(L.section.title) })}</p>`
        : sameNext ? `<p class="ls-sub">${t('it.l.doorOpened')}</p>` : ''}
      <div class="ls-gains">${gains}</div>
      ${L.term ? `<span class="ls-kicker">${t('it.l.word')}</span><div class="ls-term">${esc(L.term)}</div>` : ''}
      ${imgTag(c.term_image)}
      ${c.term_text ? `<p>${say(c.term_text)}</p>` : ''}
      ${r.tool ? `<div class="ls-newtool">${ic('tool', 18)}<span>${t('it.l.newTool')}: <b>${esc(r.tool.name)}</b></span></div>` : ''}
      ${mistakes === 0 ? `<p class="ls-perfect">${t('it.l.perfect')}</p>` : ''}
      ${kibiOn && video && mistakes * 2 > exercises.length
        ? kibi('dalda', t('it.l.rewatchTip')) : ''}
      ${r.stats.today >= r.stats.goal ? `<p class="ls-goal">${t('it.l.goal')}</p>` : ''}
    </div>`);
  }

  if (!exercises.length && !preview) {
    show(`<div class="it-empty"><p>${t('it.l.noEx')}</p></div>`);
    actions([{ label: t('it.l.toHall'), href: `#/it/section/${L.section.id}` }]);
    return;
  }
  // Ko'rinishda kerakli joydan boshlanadi (muharrirda qaysi maydon tahrirlanayotgan bo'lsa)
  const s = opts.start;
  if (s === 'finish') finish();
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
