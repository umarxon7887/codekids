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

const STEP_NAME = { keys: 'Tugmalar', words: "So'zlar", text: 'Gaplar' };
const COIN_REASON = { lesson: "Dars o'tildi", exam: "Imtihon o'tildi", star: 'Yangi yulduzlar', daily: 'Kunlik bonus' };
// Turli klaviaturalardagi apostrof va qo'shtirnoq turlari oddiy belgiga keltiriladi
const NORMALIZE = { '’': "'", '‘': "'", 'ʻ': "'", 'ʼ': "'", '`': "'", '“': '"', '”': '"', '«': '"', '»': '"' };
const norm = (c) => NORMALIZE[c] || c;

/**
 * @param {HTMLElement} root
 * @param {string} lessonId masalan "1-1" yoki "1-x"
 * @returns {Promise<()=>void>}
 */
export async function mountTypingLesson(root, lessonId) {
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
      view.innerHTML = `<div class="tl-empty"><p>${e.code === 'LESSON_LOCKED' ? 'Bu dars hali yopiq. Avval oldingi darslarni tugat.' : "Darsni ochib bo'lmadi."}</p>
        <a class="btn btn--ghost" href="#/typing-lessons">Darslar xaritasi</a></div>`;
      return;
    }
    if (alive) intro(a);
  }

  function intro(a) {
    const l = a.lesson;
    const exam = l.kind === 'exam';
    const keys = l.keys.filter((k) => k !== 'shift');
    view.innerHTML = `
      ${top(l, null, a.steps.length)}
      <div class="tlx-intro">
        <span class="tlx-tag">${l.level}-daraja · ${esc(l.level_title)}</span>
        <h1>${exam ? `${l.level}-daraja imtihoni` : esc(l.title)}</h1>
        ${keys.length ? `<div class="tlx-keys">${keys.map((k) => `<span>${esc(k.toUpperCase())}</span>`).join('')}</div>` : ''}
        <ul class="tlx-rules">
          ${exam
            ? `<li>Bitta uzun matn. O'tish uchun kamida <b>${l.wpm} so'z/daq</b> va <b>${a.rules.pass_accuracy}%</b> aniqlik kerak.</li>
               <li>O'tsang keyingi daraja ochiladi va <b>50</b> coin olasan.</li>`
            : `<li>${a.steps.length} ta mashq: ${a.steps.map((s) => STEP_NAME[s.kind]).join(', ').toLowerCase()}.</li>
               <li>O'tish uchun aniqlik kamida <b>${a.rules.pass_accuracy}%</b>. 3 yulduz: 98% va ${l.wpm} so'z/daq.</li>`}
          <li>Xato harf bossang kursor joyida turadi. To'g'ri harfni topib bos.</li>
          <li>Barmoqlar asosiy qatorda: chap qo'l <b>A S D F</b>, o'ng qo'l <b>J K L ;</b></li>
        </ul>
        ${l.stars ? `<p class="tlx-best">Oldingi natija: ${starsRow(l.stars, 16)} · ${l.best_wpm} so'z/daq</p>` : ''}
        <button class="btn btn--big tlx-start" type="button">Boshlash</button>
      </div>`;
    view.querySelector('.tlx-start').onclick = () => step(a, 0);
    view.querySelector('.tlx-start').focus();
  }

  function step(a, i) {
    off();
    const l = a.lesson;
    const text = a.steps[i].text;
    view.innerHTML = `
      ${top(l, i, a.steps.length)}
      <div class="tlx-play">
        <div class="tlx-live">
          <span><b data-wpm>0</b> so'z/daq</span>
          <span><b data-acc>100</b>% aniqlik</span>
          <span><b data-err>0</b> xato</span>
        </div>
        <div class="tlx-text" tabindex="-1">
          <div class="tlx-chars">${[...text].map((c) => `<span${c === ' ' ? ' class="sp"' : ''}>${esc(c)}</span>`).join('')}</div>
          <input class="tlx-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next" aria-label="Matnni shu yerga yozing">
        </div>
        <p class="tlx-hint" aria-live="polite"><span data-hint></span></p>
        ${keyboardHtml(l.keys)}
        <p class="tlx-tap">Telefonda yozish uchun matnga bosing</p>
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
      highlightKey(kb, pos < text.length ? text[pos] : null);
      $hint.textContent = pos < text.length ? fingerHint(text[pos]) : '';
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
          `<div class="tlx-fail"><p>Natijani yuborib bo'lmadi.</p><button class="btn" type="button" data-restart>${ic('redo', 18)}Darsni qayta boshlash</button></div>`);
        view.querySelector('[data-restart]').onclick = start;
      }
    }

    const onKey = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Escape') { location.hash = '#/typing-lessons'; return; }
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
        <h2>${s.accuracy >= 95 ? "Zo'r!" : s.accuracy >= 90 ? 'Yaxshi!' : 'Davom et!'}</h2>
        <div class="tlx-nums">
          <div><b>${Math.round(s.wpm)}</b><span>so'z/daq</span></div>
          <div><b>${Math.floor(s.accuracy)}%</b><span>aniqlik</span></div>
          <div><b>${s.errors}</b><span>xato</span></div>
        </div>
        ${s.accuracy < 90 ? '<p class="tlx-warn">Aniqlik 90% dan past. Shoshilma, to\'g\'ri bosishga harakat qil.</p>' : ''}
        <button class="btn btn--big" type="button">${next + 1}-mashq: ${STEP_NAME[a.steps[next].kind]}</button>
      </div>`;
    const btn = view.querySelector('.tlx-between .btn');
    btn.onclick = () => step(a, next);
    btn.focus();
  }

  function result(a, r) {
    off();
    const l = a.lesson;
    const exam = l.kind === 'exam';
    const nextHref = r.next_lesson_id ? `#/typing-lessons/${r.next_lesson_id}` : '#/typing-lessons';
    const coinRows = r.coins.map((c) => `<li><span>${COIN_REASON[c.reason] || c.reason}</span><b>+${c.amount}</b></li>`).join('');
    let title;
    if (r.flagged) title = 'Juda tez! Natija hisobga olinmadi';
    else if (!r.passed) title = exam && r.accuracy >= 90 ? 'Tezlik yetmadi' : 'Yana bir urinish!';
    else if (r.level_unlocked) title = `${r.level_unlocked}-daraja ochildi!`;
    else title = r.stars === 3 ? 'Mukammal!' : 'Dars o\'tildi!';
    const why = r.flagged ? 'Bunday tezlik odatda xato bilan bog\'liq. Qaytadan oddiy yozib ko\'r.'
      : !r.passed ? (exam && r.accuracy >= 90 ? `Imtihon uchun ${l.wpm} so'z/daq kerak. Darslarni takrorlab, qayta urin.` : `O'tish uchun aniqlik kamida ${a.rules.pass_accuracy}% bo'lishi kerak. Shoshilmay yoz.`)
        : r.stars < 3 ? (r.accuracy < 98 ? '3 yulduz uchun aniqlik 98% bo\'lsin.' : `3 yulduz uchun ${exam ? l.wpm + 5 : l.wpm} so'z/daq kerak.`) : '';
    view.innerHTML = `
      <div class="tlx-top"><a class="tl-back" href="#/typing-lessons" aria-label="Darslar xaritasi">${ic('x', 20)}</a><b>${esc(exam ? 'Imtihon' : l.title)}</b>${coinPill(r.coins_total)}</div>
      <div class="tlx-res ${r.passed ? 'is-pass' : 'is-fail'}">
        ${starsRow(r.stars, 46, 'tlx-bigstars')}
        <h1>${title}</h1>
        ${why ? `<p class="tlx-why">${why}</p>` : ''}
        <div class="tlx-nums">
          <div><b>${Math.round(r.wpm)}</b><span>so'z/daq</span></div>
          <div><b>${Math.floor(r.accuracy)}%</b><span>aniqlik</span></div>
          <div><b>${fmtTime(r.time_sec)}</b><span>vaqt</span></div>
        </div>
        ${r.coins_earned ? `<div class="tlx-coins">
            <div class="tlx-coin-big">${coinSvg(64, 'is-pop')}<b>+${r.coins_earned}</b></div>
            <ul>${coinRows}</ul>
          </div>` : r.passed ? '<p class="tlx-why">Bu dars uchun coin avval olingan. Yangi yulduz olsang yana coin beriladi.</p>' : ''}
        <div class="tlx-acts">
          ${r.passed && r.next_lesson_id ? `<a class="btn btn--big" href="${nextHref}">Keyingi dars</a>` : ''}
          <button class="btn ${r.passed ? 'btn--ghost' : 'btn--big'}" type="button" data-again>${ic('redo', 18)}Qayta urinish</button>
          <a class="btn btn--ghost" href="#/typing-lessons${r.level_unlocked ? `?opened=${r.level_unlocked}` : ''}">${ic('map', 18)}Darslar xaritasi</a>
        </div>
      </div>`;
    view.querySelector('[data-again]').onclick = start;
    view.querySelector('.tlx-acts a.btn--big')?.focus();
  }

  start();
  return () => { alive = false; off(); };
}

function top(l, i, total, doneCur = false) {
  const dots = Array.from({ length: total }, (_, k) => {
    const st = i == null ? '' : k < i || (k === i && doneCur) ? ' is-done' : k === i ? ' is-cur' : '';
    return `<i class="${st.trim()}"></i>`;
  }).join('');
  return `<div class="tlx-top">
    <a class="tl-back" href="#/typing-lessons" aria-label="Darsdan chiqish">${ic('x', 20)}</a>
    <b>${esc(l.kind === 'exam' ? `${l.level}-daraja imtihoni` : l.title)}</b>
    <span class="tlx-dots" aria-label="${i == null ? total : i + 1} / ${total} mashq">${dots}</span>
  </div>`;
}

function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}:${String(s).padStart(2, '0')}` : `${s} s`;
}
