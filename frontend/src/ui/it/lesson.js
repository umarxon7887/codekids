/** @file IT darslari: qasr ichi — hikoya, yordamchi karta, fikrlash quroli, mashqlar, termin va yakun. */
import '../../styles/it.css';
import { api } from '../../core/api.js';
import { showError } from '../../core/toast.js';
import { html, esc } from '../../utils/dom.js';
import { ic, castleSrc, asset, kindLabel, shuffle } from './common.js';

/** @param {HTMLElement} root @param {string} id qasr ID @returns {Promise<()=>void>} */
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

  const L = data.lesson;
  const c = L.content || {};
  const exercises = (c.exercises || []).map((e, i) => ({ ...e, i }));
  const intro = [c.story && 'story', c.helper?.text && 'helper', L.tool && 'tool'].filter(Boolean);
  const queue = exercises.slice(); // xato javob berilgan mashq oxiriga qaytadi
  const solved = new Set();
  let mistakes = 0;
  let finished = false;

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
    if (finished || confirm("Darsdan chiqasanmi? Bu mavzu hali tugamaydi.")) location.hash = `#/it/section/${L.section.id}`;
  };

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
    if (k === 'story') {
      show(`<div class="ls-card ls-story">
        <img class="ls-castle" src="${L.kind === 'test' ? castleSrc('boss') : asset('door-ready')}" alt="" width="112" height="112">
        <span class="ls-kicker">${esc(L.section.title)} · ${L.kind === 'test' ? "bo'lim testi" : `${L.section.index + 1}-mavzu`}</span>
        <h1>${esc(L.title)}</h1><p>${esc(c.story)}</p></div>`);
      actions([{ label: L.kind === 'test' ? 'Testni boshlash' : 'Boshladik', onClick: nextIntro }]);
    } else if (k === 'helper') {
      show(`<div class="ls-card ls-helper"><span class="ls-chip">${ic('bulb', 16)}Yordamchi karta</span>
        ${c.helper.title ? `<h2>${esc(c.helper.title)}</h2>` : ''}<p>${esc(c.helper.text)}</p></div>`);
      actions([{ label: 'Tushundim', onClick: nextIntro }]);
    } else {
      show(`<div class="ls-card ls-tool"><span class="ls-chip">${ic('tool', 16)}Fikrlash quroli</span>
        <h2>${esc(L.tool.name)}</h2><p>${esc(L.tool.body || L.tool.short || '')}</p>
        <small>Mavzuni tugatsang, bu qurol sumkangga qo'shiladi.</small></div>`);
      actions([{ label: "Mashqlarga o'tish", onClick: nextIntro }]);
    }
  }

  // ---------- Mashqlar ----------
  function nextExercise() {
    progress();
    const ex = queue[0];
    if (!ex) return finish();
    const again = ex.wrong ? '<span class="ls-again">Yana bir bor</span>' : '';
    const q = `<div class="ls-q"><span class="ls-chip">${esc(kindLabel(ex))}</span>${again}<h2>${esc(ex.prompt)}</h2></div>`;
    const ui = ex.type === 'order' ? orderUi(ex) : ex.type === 'match' ? matchUi(ex) : choiceUi(ex);
    show(q + ui.markup);
    const checkBtn = actions([{ label: 'Tekshirish', disabled: true, onClick: () => check(ex, ui) }]);
    ui.mount(stage, (ready) => { checkBtn.disabled = !ready; });
  }

  function check(ex, ui) {
    const right = ui.evaluate();
    ui.lock();
    if (right) {
      solved.add(ex.i);
      queue.shift();
      fb.className = 'ls-fb is-ok';
      fb.innerHTML = `<b>${ic('check', 18)}To'g'ri!</b>${ex.explain ? `<p>${esc(ex.explain)}</p>` : ''}`;
    } else {
      mistakes += 1;
      ex.wrong = true;
      queue.push(queue.shift());
      fb.className = 'ls-fb is-bad';
      fb.innerHTML = `<b>${ic('undo', 18)}Hali emas, hechqisi yo'q</b>
        ${c.helper?.text ? `<p><span>Yordamchi karta:</span> ${esc(c.helper.text)}</p>` : ''}
        <p class="ls-later">Bu savol dars oxirida yana chiqadi.</p>`;
    }
    fb.hidden = false;
    progress();
    actions([{ label: 'Davom etish', onClick: nextExercise }]).focus();
  }

  function choiceUi(ex) {
    const order = shuffle(ex.options.map((_, k) => k));
    let pick = null;
    let root2;
    return {
      markup: `<div class="ls-opts" role="radiogroup" aria-label="Javoblar">${order.map((k) =>
        `<button type="button" class="ls-opt" role="radio" aria-checked="false" data-k="${k}">${esc(ex.options[k])}</button>`).join('')}</div>`,
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
    const pool = shuffle(ex.items.map((_, k) => k));
    const ans = [];
    let el;
    let ready;
    let locked = false;
    const draw = () => {
      el.querySelector('.ls-slots').innerHTML = ex.items.map((_, idx) => (ans[idx] != null
        ? `<li><button type="button" class="ls-chipbtn is-placed" data-a="${idx}" aria-label="${idx + 1}-qadam: ${esc(ex.items[ans[idx]])}. Qaytarish uchun bosing"><i>${idx + 1}</i>${esc(ex.items[ans[idx]])}</button></li>`
        : `<li><span class="ls-slot"><i>${idx + 1}</i></span></li>`)).join('');
      el.querySelector('.ls-pool').innerHTML = pool.map((k) =>
        `<button type="button" class="ls-chipbtn" data-p="${k}">${esc(ex.items[k])}</button>`).join('')
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
          <div class="ls-col">${ex.pairs.map((p, k) => `<button type="button" class="ls-mt" data-l="${k}"><i></i>${esc(p[0])}</button>`).join('')}</div>
          <div class="ls-col">${rights.map((k) => `<button type="button" class="ls-mt" data-r="${k}"><i></i>${esc(ex.pairs[k][1])}</button>`).join('')}</div>
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

  // ---------- Yakun: termin, XP, qurol ----------
  async function finish() {
    progress();
    show('<div class="ls-card ls-wait"><div class="skeleton" aria-busy="true"></div><p>Qasr ochilmoqda...</p></div>');
    actions([]);
    let r;
    try {
      r = await api.post(`/it/lessons/${id}/complete`, { mistakes });
    } catch (e) {
      showError(e);
      show(`<div class="ls-card"><h2>Natijani saqlab bo'lmadi</h2><p>Internetni tekshirib, qayta urinib ko'r.</p></div>`);
      actions([{ label: 'Qayta urinish', onClick: finish }]);
      return;
    }
    finished = true;
    const next = r.next_lesson_id && r.next_lesson_id !== id ? r.next_lesson_id : null;
    const sameNext = next && r.next_section_id === L.section.id;
    const gains = [
      r.first ? `<span class="it-pill is-xp">${ic('star', 16)}<b>+${r.xp_gained} XP</b></span>` : '<span class="it-pill">Takrorlash</span>',
      `<span class="it-pill is-fire">${ic('fire', 16)}<b>${r.stats.streak}</b>&nbsp;kun</span>`,
    ].join('');
    show(`<div class="ls-card ls-win">
      <img class="ls-castle ls-pop" src="${r.section_done ? castleSrc('open') : asset('door-done')}" alt="" width="140" height="140">
      <h1>${r.section_done ? 'Qasr zabt etildi!' : 'Mavzu o\'zlashtirildi!'}</h1>
      ${r.section_done ? `<p class="ls-sub">«${esc(L.section.title)}» bo'limi to'liq tugatildi.</p>`
        : sameNext ? '<p class="ls-sub">Keyingi eshikning qulfi ochildi!</p>' : ''}
      ${L.term ? `<span class="ls-kicker">Bugun o'rgangan so'zing</span><div class="ls-term">${esc(L.term)}</div>` : ''}
      ${c.term_text ? `<p>${esc(c.term_text)}</p>` : ''}
      <div class="ls-gains">${gains}</div>
      ${r.tool ? `<div class="ls-newtool">${ic('tool', 18)}<span>Sumkangga yangi qurol: <b>${esc(r.tool.name)}</b></span></div>` : ''}
      ${mistakes === 0 ? '<p class="ls-perfect">Bitta ham xatosiz!</p>' : ''}
      ${r.stats.today >= r.stats.goal ? '<p class="ls-goal">Bugungi maqsad bajarildi!</p>' : ''}
    </div>`);
    const hall = `#/it/section/${L.section.id}`;
    actions(sameNext
      ? [{ label: 'Keyingi eshik', href: `${hall}?unlock=${next}` }, { label: 'Zalga qaytish', href: hall, ghost: true }]
      : next
        ? [{ label: 'Keyingi qasr', href: `#/it?opened=${r.next_section_id}` }, { label: 'Zalga qaytish', href: hall, ghost: true }]
        : [{ label: "Qasrlar yo'liga qaytish", href: '#/it' }]);
  }

  if (!exercises.length) {
    show('<div class="it-empty"><p>Bu mavzuda hali mashq yo\'q.</p></div>');
    actions([{ label: 'Zalga qaytish', href: `#/it/section/${L.section.id}` }]);
  } else nextIntro();
  return () => {};
}
