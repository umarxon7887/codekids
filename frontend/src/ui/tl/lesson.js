/**
 * @file Typing darsi: kirish -> mashqlar (3 ta, imtihonda 1 ta) -> natija (yulduz, coin).
 * Xato harf bosilsa kursor joyida qoladi va xato hisoblanadi. Tezlikni server hisoblaydi.
 * Kompyuterda keydown, telefonda yashirin input'ning input hodisasi ishlatiladi.
 */
import '../../styles/tl.css';
import { api } from '../../core/api.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { coinSvg, coinPill } from './coin.js';
import { ic, starsRow, keyboardHtml, highlightKey, fingerHint } from './common.js';
import { t } from '../../i18n/index.js';
import { BASE_URL } from '../../core/config.js';

const STEP_NAME = { keys: t('tl.s.keys'), words: t('tl.s.words'), text: t('tl.s.text') };
const COIN_REASON = { lesson: t('tl.c.lesson'), exam: t('tl.c.exam'), star: t('tl.c.star'), daily: t('tl.c.daily') };
// Turli klaviaturalardagi apostrof va qo'shtirnoq turlari oddiy belgiga keltiriladi
const NORMALIZE = { '’': "'", '‘': "'", 'ʻ': "'", 'ʼ': "'", '`': "'", '“': '"', '”': '"', '«': '"', '»': '"' };
const norm = (c) => NORMALIZE[c] || c;

/**
 * @param {HTMLElement} root
 * @param {string} lessonId masalan "1-1" yoki "1-x"
 * @returns {Promise<()=>void>}
 */
export async function mountTypingLesson(root, lessonId) {
  /** Xarita manzili (kurs tili = sayt tili). */
  const mapHref = (opened) => `#/typing-lessons${opened ? `?opened=${opened}` : ''}`;
  const view = html('<section class="tlx"><div class="skeleton tl-skel" aria-busy="true"></div></section>');
  root.replaceChildren(view);
  let off = () => {}; // joriy mashq tinglovchilarini olib tashlash
  let alive = true;

  async function start() {
    off();
    view.innerHTML = '<div class="skeleton tl-skel" aria-busy="true"></div>';
    let a;
    try {
      a = await api.post('/typing-lessons/attempts', { lesson_id: lessonId });
    } catch (e) {
      showError(e);
      view.innerHTML = `<div class="tl-empty"><p>${e.code === 'LESSON_LOCKED' ? t('tl.lockedMsg') : t('tl.openFail')}</p>
        <a class="btn btn--ghost" href="${mapHref()}">${t('tl.map')}</a></div>`;
      return;
    }
    if (alive) intro(a);
  }

  function intro(a) {
    const l = a.lesson;
    const exam = l.kind === 'exam';
    const keys = l.keys.filter((k) => k !== 'shift');
    const keyList = keys.map((k) => `<b>${esc(k.toUpperCase())}</b>`).join(', ');
    const say = exam ? t('tl.i.exam', { w: l.wpm, a: a.rules.pass_accuracy })
      : keys.length ? t('tl.i.keys', { keys: keyList })
        : l.keys.includes('shift') ? t('tl.i.shift') : t('tl.i.words');
    const starWpm = exam ? l.wpm + 5 : l.wpm;
    view.innerHTML = `
      ${top(l, null, a.steps.length)}
      <div class="tlx-intro">
        <span class="tlx-tag">${t('app.level', { n: l.level })} · ${esc(l.level_title)}</span>
        <div class="tlx-kibi">
          <img src="${BASE_URL}it/kibi/${exam ? 'usta' : 'tushuntirish'}.webp" alt="" draggable="false">
          <p class="tl-bubble">${say}</p>
        </div>
        ${l.keys.length ? `<div class="tlx-card"><h3>${t('tl.i.kbTitle')}</h3>${keyboardHtml(l.keys, l.lang)}</div>` : ''}
        <div class="tlx-card"><h3>${exam ? t('tl.i.examTitle') : t('tl.i.steps', { n: a.steps.length })}</h3>
          <div class="tlx-steps">${a.steps.map((s, k) => `<div><em>${k + 1}</em><b>${exam ? t('tl.i.examText') : STEP_NAME[s.kind]}</b></div>`).join('')}</div>
        </div>
        <div class="tlx-card"><h3>${t('tl.i.goal')}</h3>
          <div class="tlx-goal"><span class="is-pass">${ic('target', 22)}</span><div><b>${exam ? t('tl.i.passExam', { w: l.wpm, a: a.rules.pass_accuracy }) : t('tl.i.pass', { a: a.rules.pass_accuracy })}</b><small>${exam ? t('tl.i.passExamS') : t('tl.i.passS')}</small></div></div>
          <div class="tlx-goal"><span class="is-star">${ic('star', 22)}</span><div><b>${t('tl.i.stars', { w: starWpm })}</b><small>${exam ? t('tl.i.coinsExam') : t('tl.i.coins')}</small></div></div>
          ${l.stars ? `<p class="tlx-best">${t('tl.prev')}: ${starsRow(l.stars, 16)} · ${l.best_wpm} ${t('app.wpm')}</p>` : ''}
        </div>
        <p class="tl-tip">${ic('bulb', 20)}<span>${t('tl.r.cursor')}</span></p>
        <p class="tl-tip is-sky">${ic('kb', 20)}<span>${t(l.lang === 'ru' ? 'tl.r.homeRu' : 'tl.r.homeUz')}</span></p>
        <div class="tlx-startbar"><button class="tl-chunky tlx-start" type="button">${t('home.start')}</button></div>
      </div>`;
    view.querySelector('.tlx-start').onclick = () => step(a, 0);
    view.querySelector('.tlx-start').focus({ preventScroll: true });
  }

  function step(a, i) {
    off();
    const l = a.lesson;
    const text = a.steps[i].text;
    view.innerHTML = `
      ${top(l, i, a.steps.length)}
      <div class="tlx-play">
        <div class="tlx-live">
          <span><b data-wpm>0</b> ${t('app.wpm')}</span>
          <span><b data-acc>100</b>% ${t('tl.acc')}</span>
          <span><b data-err>0</b> ${t('tl.err')}</span>
        </div>
        <div class="tlx-text" tabindex="-1">
          <div class="tlx-chars">${[...text].map((c) => `<span${c === ' ' ? ' class="sp"' : ''}>${esc(c)}</span>`).join('')}</div>
          <input class="tlx-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next" aria-label="${t('tl.typeHere')}">
        </div>
        <p class="tlx-hint" aria-live="polite"><span data-hint></span></p>
        ${keyboardHtml(l.keys, l.lang)}
        <p class="tlx-tap">${t('tl.tap')}</p>
      </div>`;
    const chars = [...view.querySelectorAll('.tlx-chars span')];
    const input = view.querySelector('.tlx-input');
    const box = view.querySelector('.tlx-text');
    const kb = view.querySelector('.tl-kb');
    const $wpm = view.querySelector('[data-wpm]');
    const $acc = view.querySelector('[data-acc]');
    const $err = view.querySelector('[data-err]');
    const $hint = view.querySelector('[data-hint]');
    let pos = 0;
    let errors = 0;
    let startedAt = 0;
    let began = null; // begin so'rovi (submit undan keyin yuboriladi)
    let done = false;
    let last = ''; // input qiymati (telefon klaviaturasi uchun farqni topish)
    let tick = 0;
    let keyAt = 0; // keydown belgini qabul qilgan vaqt (input hodisasi uni ikkinchi marta sanamasin)

    const paint = () => {
      chars.forEach((s, k) => s.classList.toggle('is-done', k < pos));
      chars[pos - 1]?.classList.remove('is-cur', 'is-bad');
      if (chars[pos]) {
        chars[pos].classList.add('is-cur');
        // Uzun matnda joriy qator ko'rinib tursin
        const top = chars[pos].offsetTop;
        if (top > box.scrollTop + box.clientHeight - 40 || top < box.scrollTop) box.scrollTop = Math.max(0, top - 40);
      }
      highlightKey(kb, pos < text.length ? text[pos] : null, l.lang);
      $hint.textContent = pos < text.length ? fingerHint(text[pos], l.lang) : '';
    };
    const live = () => {
      if (!startedAt) return;
      const min = Math.max((Date.now() - startedAt) / 60000, 1 / 60);
      $wpm.textContent = String(Math.round(pos / 5 / min));
      $acc.textContent = String(Math.floor((pos / Math.max(pos + errors, 1)) * 100));
      $err.textContent = String(errors);
    };

    function press(raw) {
      if (done) return;
      const c = norm(raw);
      if (!startedAt) {
        startedAt = Date.now();
        began = api.post(`/typing-lessons/attempts/${a.attempt_id}/steps/${i}/begin`);
        began.catch(() => {}); // xato submit paytida ko'rsatiladi
        tick = setInterval(live, 500);
      }
      if (c === text[pos]) {
        pos += 1;
        paint();
        if (pos === text.length) finishStep();
      } else {
        errors += 1;
        const el = chars[pos];
        el.classList.remove('is-bad');
        void el.offsetWidth; // animatsiyani qayta boshlash
        el.classList.add('is-bad');
      }
      live();
    }

    async function finishStep() {
      done = true;
      clearInterval(tick);
      input.blur();
      try {
        await began;
        const r = await api.post(`/typing-lessons/attempts/${a.attempt_id}/steps/${i}`, { typed: text, errors });
        if (!alive) return;
        if (r.finished) result(a, r.result);
        else between(a, i, r.step);
      } catch (e) {
        showError(e);
        if (!alive) return;
        view.querySelector('.tlx-play').insertAdjacentHTML('beforeend',
          `<div class="tlx-fail"><p>${t('tl.sendFail')}</p><button class="btn" type="button" data-restart>${ic('redo', 18)}${t('tl.restart')}</button></div>`);
        view.querySelector('[data-restart]').onclick = start;
      }
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { location.hash = mapHref(); return; }
      if (e.key.length !== 1) {
        if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Enter') e.preventDefault();
        return; // telefon klaviaturasi: "Unidentified" -> input hodisasi
      }
      e.preventDefault();
      keyAt = Date.now();
      press(e.key);
    };
    const onInput = () => {
      const v = input.value;
      if (Date.now() - keyAt < 80) { last = v; return; }
      if (v.length > last.length && v.startsWith(last)) {
        for (const ch of v.slice(last.length)) press(ch);
      } else if (v.length > last.length) {
        // Klaviatura so'zni almashtirdi: faqat oxirgi qo'shilgan belgini olamiz
        press(v[v.length - 1]);
      }
      last = v;
      if (v.length > 60) { input.value = ''; last = ''; }
    };
    const focus = () => input.focus({ preventScroll: true });
    box.addEventListener('click', focus);
    view.querySelector('.tlx-tap').addEventListener('click', focus);
    document.addEventListener('keydown', onKey);
    input.addEventListener('input', onInput);
    off = () => {
      document.removeEventListener('keydown', onKey);
      clearInterval(tick);
      off = () => {};
    };
    paint();
    focus();
  }

  function between(a, i, s) {
    off();
    const next = i + 1;
    view.innerHTML = `
      ${top(a.lesson, i, a.steps.length, true)}
      <div class="tlx-between">
        <h2>${s.accuracy >= 95 ? t('tl.great') : s.accuracy >= 90 ? t('tl.good') : t('tl.keepOn')}</h2>
        <div class="tlx-nums">
          <div><b>${Math.round(s.wpm)}</b><span>${t('app.wpm')}</span></div>
          <div><b>${Math.floor(s.accuracy)}%</b><span>${t('tl.acc')}</span></div>
          <div><b>${s.errors}</b><span>${t('tl.err')}</span></div>
        </div>
        ${s.accuracy < 90 ? `<p class="tlx-warn">${t('tl.low90')}</p>` : ''}
        <button class="btn btn--big" type="button">${t('tl.stepN', { n: next + 1 })}: ${STEP_NAME[a.steps[next].kind]}</button>
      </div>`;
    const btn = view.querySelector('.tlx-between .btn');
    btn.onclick = () => step(a, next);
    btn.focus();
  }

  function result(a, r) {
    off();
    const l = a.lesson;
    const exam = l.kind === 'exam';
    const nextHref = r.next_lesson_id ? `#/typing-lessons/${r.next_lesson_id}` : mapHref();
    const coinRows = r.coins.map((c) => `<li><span>${COIN_REASON[c.reason] || c.reason}</span><b>+${c.amount}</b></li>`).join('');
    let title;
    if (r.flagged) title = t('tl.t.flagged');
    else if (!r.passed) title = exam && r.accuracy >= 90 ? t('tl.t.slow') : t('tl.t.again');
    else if (r.level_unlocked) title = t('tl.t.unlocked', { n: r.level_unlocked });
    else title = r.stars === 3 ? t('tl.t.perfect') : t('tl.t.passed');
    const why = r.flagged ? t('tl.w.flagged')
      : !r.passed ? (exam && r.accuracy >= 90 ? t('tl.w.slow', { w: l.wpm }) : t('tl.w.acc', { a: a.rules.pass_accuracy }))
        : r.stars < 3 ? (r.accuracy < 98 ? t('tl.w.star98') : t('tl.w.starWpm', { w: exam ? l.wpm + 5 : l.wpm })) : '';
    view.innerHTML = `
      <div class="tlx-top"><a class="tl-back" href="${mapHref()}" aria-label="${t('tl.map')}">${ic('x', 20)}</a><b>${esc(exam ? t('tl.exam') : l.title)}</b>${coinPill(r.coins_total)}</div>
      <div class="tlx-res ${r.passed ? 'is-pass' : 'is-fail'}">
        ${starsRow(r.stars, 46, 'tlx-bigstars')}
        <h1>${title}</h1>
        ${why ? `<p class="tlx-why">${why}</p>` : ''}
        <div class="tlx-nums">
          <div><b>${Math.round(r.wpm)}</b><span>${t('app.wpm')}</span></div>
          <div><b>${Math.floor(r.accuracy)}%</b><span>${t('tl.acc')}</span></div>
          <div><b>${fmtTime(r.time_sec)}</b><span>${t('tl.time')}</span></div>
        </div>
        ${r.coins_earned ? `<div class="tlx-coins">
            <div class="tlx-coin-big">${coinSvg(64, 'is-pop')}<b>+${r.coins_earned}</b></div>
            <ul>${coinRows}</ul>
          </div>` : r.passed ? `<p class="tlx-why">${t('tl.coinTaken')}</p>` : ''}
        <div class="tlx-acts">
          ${r.passed && r.next_lesson_id ? `<a class="btn btn--big" href="${nextHref}">${t('tl.next')}</a>` : ''}
          <button class="btn ${r.passed ? 'btn--ghost' : 'btn--big'}" type="button" data-again>${ic('redo', 18)}${t('app.retry')}</button>
          <a class="btn btn--ghost" href="${mapHref(r.level_unlocked)}">${ic('map', 18)}${t('tl.map')}</a>
        </div>
      </div>`;
    view.querySelector('[data-again]').onclick = start;
    view.querySelector('.tlx-acts a.btn--big')?.focus();
  }

  start();
  return () => { alive = false; off(); };
}

function top(l, i, total, doneCur = false) {
  const href = '#/typing-lessons';
  const dots = Array.from({ length: total }, (_, k) => {
    const st = i == null ? '' : k < i || (k === i && doneCur) ? ' is-done' : k === i ? ' is-cur' : '';
    return `<i class="${st.trim()}"></i>`;
  }).join('');
  return `<div class="tlx-top">
    <a class="tl-back" href="${href}" aria-label="${t('tl.exit')}">${ic('x', 20)}</a>
    <b>${esc(l.kind === 'exam' ? t('tl.examOf', { n: l.level }) : l.title)}</b>
    <span class="tlx-dots" aria-label="${i == null ? total : i + 1} / ${total} ${t('tl.steps')}">${dots}</span>
  </div>`;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s} ${t('tl.sec')}`;
}
