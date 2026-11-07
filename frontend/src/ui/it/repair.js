/**
 * @file Tuzatish o'yini («Kibining ustaxonasi»): bola buzilgan qurilmani qismma-qism tuzatadi.
 * Har qism: buzilish → Kibi tushuntiradi → 1–3 harakat (sudrash, bosish, surtish, yozish) → natija.
 * Hamma harakat sichqoncha, barmoq va klaviatura bilan ishlaydi: sudrash o'rniga «narsani bos, keyin joyni bos» ham bo'ladi.
 */
import { esc } from '../../utils/dom.js';
import { ic, imgTag, imageUrl } from './common.js';

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * @param {object} x
 * @param {HTMLElement} x.stage
 * @param {HTMLElement} x.fb pastdagi izoh qutisi
 * @param {(markup:string)=>void} x.show
 * @param {(list:object[])=>HTMLElement} x.actions
 * @param {(pose:string, text:string, extra?:string)=>string} x.kibi
 * @param {(pose:string, cls?:string)=>string} x.kibiImg
 * @param {(t:string)=>string} x.say
 * @param {object} x.game content.game
 * @param {()=>string|null} x.name bolaning ismi
 * @param {(n:number)=>void} x.onMistake
 * @param {()=>void} x.done
 * @param {number} [x.startPart] muharrir ko'rinishi uchun: shu qismdan boshlanadi
 */
export function runRepair(x) {
  const { stage, fb, show, actions, kibi, kibiImg, say, game } = x;
  const parts = game.parts || [];
  const xpEach = game.part_xp ?? 5;
  const fixed = new Set();
  let typed = ''; // «yozish» harakatida bola yozgan matn (ekranda chiqadi)

  const chain = (cur) => `<ol class="rp-chain" aria-label="Qismlar">${parts.map((p, i) => {
    const st = fixed.has(i) ? 'is-done' : i === cur ? 'is-cur' : '';
    return `<li class="${st}" aria-current="${i === cur ? 'step' : 'false'}"><i>${fixed.has(i) ? ic('check', 14) : i + 1}</i><span>${esc(p.name)}</span></li>`;
  }).join('')}</ol>`;
  const head = (i, label) => `${chain(i)}<span class="ls-chip">${ic('tool', 16)}${esc(label)}</span>`;
  const tip = (pose, text, cls) => {
    fb.className = `ls-fb ${cls} has-kibi`;
    fb.innerHTML = `${kibiImg(pose, 'ls-fb-kibi')}<div><p>${say(text)}</p></div>`;
    fb.hidden = false;
  };

  function intro() {
    show(`${chain(-1)}${kibi('usta', game.intro || "Kel, {ism}, buzilgan kompyuterni birga tuzatamiz!")}`);
    actions([{ label: 'Boshladik', onClick: () => part(0) }]);
  }

  function part(i) {
    const p = parts[i];
    if (!p) { win(); return; }
    show(`${head(i, `${i + 1}-qism: ${p.name}`)}
      <div class="rp-broken">${imgTag(p.image, 'rp-broken-img')}<div><b>Muammo</b><p>${say(p.broken)}</p></div></div>
      ${kibi('tushuntirish', p.explain)}`);
    actions([{ label: 'Tuzatamiz', onClick: () => step(i, 0) }]);
  }

  function step(i, k) {
    const p = parts[i];
    const s = p.steps[k];
    if (!s) { fixedPart(i); return; }
    const next = () => step(i, k + 1);
    show(`${head(i, `${i + 1}-qism: ${p.name}`)}<h2 class="rp-q">${say(s.prompt)}</h2><div class="rp-ws"></div>`);
    const ws = stage.querySelector('.rp-ws');
    const ui = { drag: dragUi, tap: tapUi, wipe: wipeUi, type: typeUi }[s.kind](ws, s, {
      ok: () => { fb.hidden = true; setTimeout(next, reduced() ? 0 : 450); },
      bad: (t) => { x.onMistake(1); tip('dalda', t || p.hint || "Hechqisi yo'q, yana bir urinib ko'r!", 'is-bad'); },
    });
    actions([{ label: `${ic('bulb', 18)}Yordam`, ghost: true, onClick: () => ui.help() }]);
  }

  function fixedPart(i) {
    const p = parts[i];
    fixed.add(i);
    show(`${head(i, `${i + 1}-qism tuzatildi`)}
      ${effect(p.effect)}
      ${kibi('maqtash', p.done || 'Zo\'r! Bu qism ishlayapti.')}
      ${xpEach ? `<p class="rp-xp ls-pop">${ic('star', 18)}<b>+${xpEach} XP</b></p>` : ''}`);
    actions([{ label: parts[i + 1] ? 'Keyingi qism' : 'Yakunlash', onClick: () => part(i + 1) }]);
  }

  function win() {
    show(`<div class="ls-card rp-win">${kibiImg('galaba', 'ls-kibi-win ls-pop')}
      <div class="rp-screen is-on"><p class="rp-thanks">${say(game.outro || 'Rahmat, usta {ism}!')}</p></div>
      <span class="ls-kicker">To'plamingga qo'shildi</span>
      <ul class="rp-cards">${parts.map((p) => `<li>${imgTag(p.image, 'rp-card-img')}<span>${esc(p.name)}</span></li>`).join('')}</ul>
      ${xpEach ? `<p class="rp-xp">${ic('star', 18)}<b>O'yin uchun +${parts.length * xpEach} XP</b></p>` : ''}</div>`);
    actions([{ label: 'Davom', onClick: x.done }]);
  }

  // ---------- Natija ko'rinishlari (kod bilan chiziladi) ----------
  function effect(kind) {
    const nm = typed || x.name() || '';
    switch (kind) {
      case 'power': return `<div class="rp-fx rp-power"><span class="rp-led"></span><span class="rp-fan">${ic('rotate', 40)}</span><small>Chiroqcha yondi, sovutgichlar aylanyapti</small></div>`;
      case 'cool': return `<div class="rp-fx rp-cool"><div class="rp-temp"><i></i></div><small>Harorat me'yorda</small></div>`;
      case 'check': return `<div class="rp-fx rp-check"><span class="rp-mark">${ic('check', 44)}</span><small>Tekshiruvdan o'tdi</small></div>`;
      case 'load': return `<div class="rp-fx rp-load"><div class="rp-bar"><i></i></div><small>Windows xotiraga yuklanmoqda…</small></div>`;
      case 'screen': return `<div class="rp-fx"><div class="rp-screen is-boot"><span class="rp-logo"></span><div class="rp-desk"><i></i><i></i><i></i><b></b></div></div></div>`;
      case 'type': return `<div class="rp-fx"><div class="rp-screen is-on"><p class="rp-typed">${esc(nm)}</p></div><small>Kirish → ishlov → chiqish</small></div>`;
      default: return '';
    }
  }

  // ---------- Harakatlar ----------
  /** Narsa(lar)ni to'g'ri joyga olib borish. rotate: narsa teskari turadi, avval burish kerak. */
  function dragUi(ws, s, r) {
    const thing = (t, cls) => `${imgTag(t.image, `${cls}-img`)}${t.label ? `<span>${esc(t.label)}</span>` : ''}`;
    ws.innerHTML = `<div class="rp-tgs">${s.targets.map((t, j) => `<button type="button" class="rp-tg" data-t="${j}" aria-label="${esc(t.label || `${j + 1}-joy`)}">${thing(t, 'rp-tg')}<em class="rp-in"></em></button>`).join('')}</div>
      <p class="ls-hint">Narsani joyiga sudrab olib bor yoki avval narsani, keyin joyni bos.</p>
      <div class="rp-tray">${s.items.map((t, j) => `<div class="rp-it-w" data-w="${j}">
        <button type="button" class="rp-it" data-i="${j}" data-rot="${s.rotate ? 180 : 0}" aria-label="${esc(t.label || `${j + 1}-narsa`)}${s.rotate ? ', teskari turibdi' : ''}">${thing(t, 'rp-it')}</button>
        ${s.rotate ? `<button type="button" class="rp-rot" data-r="${j}" aria-label="Burish">${ic('rotate', 18)}</button>` : ''}</div>`).join('')}</div>`;
    const left = new Set(s.items.map((_, j) => j));
    let sel = null;
    const tgs = [...ws.querySelectorAll('.rp-tg')];
    const select = (j) => {
      sel = sel === j ? null : j;
      ws.querySelectorAll('.rp-it').forEach((b) => b.classList.toggle('is-sel', Number(b.dataset.i) === sel));
    };
    const drop = (j, t) => {
      const it = ws.querySelector(`[data-i="${j}"]`);
      sel = null;
      it.classList.remove('is-sel');
      if (t == null) return;
      const tg = tgs[t];
      if (t !== s.answer) { shake(tg); r.bad(); return; }
      if (it.dataset.rot !== '0') { shake(it); r.bad("Planka teskari turibdi. Avval uni ↻ tugmasi bilan bur."); return; }
      left.delete(j);
      ws.querySelector(`[data-w="${j}"]`).hidden = true;
      tg.classList.add('is-filled');
      tg.querySelector('.rp-in').insertAdjacentHTML('beforeend', imgTag(s.items[j].image, 'rp-in-img') || `<span>${esc(s.items[j].label)}</span>`);
      if (!left.size) { tg.classList.add('is-ok'); r.ok(); }
    };
    ws.querySelectorAll('.rp-rot').forEach((b) => {
      b.onclick = () => {
        const it = ws.querySelector(`[data-i="${b.dataset.r}"]`);
        it.dataset.rot = it.dataset.rot === '0' ? '180' : '0';
        it.setAttribute('aria-label', `${s.items[b.dataset.r].label || 'Narsa'}${it.dataset.rot === '0' ? ", to'g'ri turibdi" : ', teskari turibdi'}`);
      };
    });
    tgs.forEach((tg) => { tg.onclick = () => { if (sel != null) drop(sel, Number(tg.dataset.t)); else tg.focus(); }; });
    ws.querySelectorAll('.rp-it').forEach((it) => {
      const j = Number(it.dataset.i);
      it.onclick = () => { if (!it.dataset.dragged) select(j); delete it.dataset.dragged; };
      it.onpointerdown = (e) => {
        if (e.button !== 0) return;
        e.preventDefault(); // matn belgilanib ketmasin
        const r0 = it.getBoundingClientRect();
        const sx = e.clientX;
        const sy = e.clientY;
        let ghost = null;
        const move = (ev) => {
          const dx = ev.clientX - sx;
          const dy = ev.clientY - sy;
          if (!ghost && Math.hypot(dx, dy) < 8) return;
          if (!ghost) {
            ghost = it.cloneNode(true);
            ghost.classList.add('rp-ghost');
            Object.assign(ghost.style, { width: `${r0.width}px`, height: `${r0.height}px`, left: `${r0.left}px`, top: `${r0.top}px` });
            document.body.append(ghost);
            it.classList.add('is-lifted');
          }
          ghost.style.transform = `translate(${dx}px, ${dy}px)`;
          const over = hit(ev.clientX, ev.clientY);
          tgs.forEach((tg, t) => tg.classList.toggle('is-over', t === over));
        };
        const up = (ev) => {
          removeEventListener('pointermove', move);
          removeEventListener('pointerup', up);
          removeEventListener('pointercancel', up);
          if (!ghost) return;
          it.dataset.dragged = '1';
          setTimeout(() => { delete it.dataset.dragged; }, 50);
          ghost.remove();
          it.classList.remove('is-lifted');
          tgs.forEach((tg) => tg.classList.remove('is-over'));
          if (ev.type === 'pointerup') drop(j, hit(ev.clientX, ev.clientY));
        };
        addEventListener('pointermove', move);
        addEventListener('pointerup', up);
        addEventListener('pointercancel', up);
      };
    });
    const hit = (cx, cy) => {
      const t = tgs.findIndex((tg) => {
        const b = tg.getBoundingClientRect();
        return cx >= b.left && cx <= b.right && cy >= b.top && cy <= b.bottom;
      });
      return t < 0 ? null : t;
    };
    return {
      help() {
        const wrongWay = [...left].find((j) => ws.querySelector(`[data-i="${j}"]`).dataset.rot !== '0');
        flash(wrongWay != null ? ws.querySelector(`[data-r="${wrongWay}"]`) : tgs[s.answer]);
      },
    };
  }

  function tapUi(ws, s, r) {
    ws.innerHTML = `<button type="button" class="rp-tap">${imgTag(s.image, 'rp-tap-img')}${s.label ? `<span>${ic('power', 18)}${esc(s.label)}</span>` : ''}</button>`;
    const b = ws.querySelector('.rp-tap');
    b.onclick = () => { b.disabled = true; b.classList.add('is-on'); r.ok(); };
    return { help: () => flash(b) };
  }

  /** Surtib tozalash: iflos rasm canvas'da, ostida toza rasm. Rasm boshqa domendan kelishi mumkin, shuning uchun
   *  pikselni o'qimaymiz: tozalangan joy 10x10 to'rda hisoblanadi. */
  function wipeUi(ws, s, r) {
    const N = 10;
    ws.innerHTML = `<div class="rp-wipe" tabindex="0" role="img" aria-label="Iflos qism. Barmog'ing bilan surtib tozala (klaviaturada Enter)">
      ${imgTag(s.clean, 'rp-wipe-img')}<canvas></canvas><span class="rp-wipe-hand" aria-hidden="true"></span></div>`;
    const box = ws.querySelector('.rp-wipe');
    const cv = box.querySelector('canvas');
    const g = cv.getContext('2d');
    const seen = new Set();
    let done = false;
    const img = new Image();
    img.onload = () => {
      box.classList.add('is-ready');
      const w = box.clientWidth;
      const h = box.clientHeight;
      cv.width = w * devicePixelRatio;
      cv.height = h * devicePixelRatio;
      g.scale(devicePixelRatio, devicePixelRatio);
      const k = Math.min(w / img.width, h / img.height);
      g.drawImage(img, (w - img.width * k) / 2, (h - img.height * k) / 2, img.width * k, img.height * k);
      g.globalCompositeOperation = 'destination-out';
    };
    img.src = imageUrl(s.dirty);
    const rub = (px, py) => {
      if (done) return;
      const w = box.clientWidth;
      const h = box.clientHeight;
      const rad = Math.max(w, h) * 0.11;
      g.beginPath();
      g.arc(px, py, rad, 0, Math.PI * 2);
      g.fill();
      for (let a = 0; a < N; a++) {
        for (let b = 0; b < N; b++) {
          const cx = ((a + 0.5) / N) * w;
          const cy = ((b + 0.5) / N) * h;
          if (Math.hypot(cx - px, cy - py) < rad) seen.add(a * N + b);
        }
      }
      // Chetlari odatda bo'sh fon: 70% yetarli
      if (seen.size >= N * N * 0.7) {
        done = true;
        cv.classList.add('is-gone');
        box.classList.add('is-clean');
        r.ok();
      }
    };
    let down = false;
    const at = (e) => { const b = cv.getBoundingClientRect(); rub(e.clientX - b.left, e.clientY - b.top); };
    cv.onpointerdown = (e) => { down = true; box.classList.add('is-busy'); cv.setPointerCapture(e.pointerId); at(e); };
    cv.onpointermove = (e) => { if (down) at(e); };
    cv.onpointerup = () => { down = false; };
    cv.onpointercancel = () => { down = false; };
    box.onkeydown = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      const free = [...Array(N * N).keys()].filter((q) => !seen.has(q));
      const q = free[Math.floor(Math.random() * free.length)] ?? 0;
      rub(((Math.floor(q / N) + 0.5) / N) * box.clientWidth, ((q % N + 0.5) / N) * box.clientHeight);
    };
    return { help: () => { box.classList.remove('is-busy'); flash(box); } };
  }

  function typeUi(ws, s, r) {
    ws.innerHTML = `<div class="rp-screen is-on"><p class="rp-typed" aria-hidden="true"></p></div>
      <input class="ls-name-in rp-type-in" maxlength="20" autocomplete="off" enterkeyhint="done" placeholder="${esc(x.name() || 'Ismingni yoz')}" aria-label="Klaviaturada yoz">
      <button type="button" class="btn rp-type-ok" disabled>Tayyor</button>`;
    const inp = ws.querySelector('input');
    const out = ws.querySelector('.rp-typed');
    const ok = ws.querySelector('.rp-type-ok');
    inp.oninput = () => { out.textContent = inp.value; ok.disabled = inp.value.trim().length < 2; };
    const go = () => { if (ok.disabled) return; typed = inp.value.trim(); inp.disabled = true; ok.disabled = true; r.ok(); };
    ok.onclick = go;
    inp.onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); go(); } };
    setTimeout(() => inp.focus(), 50);
    return { help: () => { flash(inp); inp.focus(); } };
  }

  const start = x.startPart;
  if (typeof start === 'number' && parts[start]) {
    for (let k = 0; k < start; k++) fixed.add(k);
    part(start);
  } else intro();
}

function flash(el) {
  if (!el) return;
  el.classList.remove('is-flash');
  void el.offsetWidth;
  el.classList.add('is-flash');
  setTimeout(() => el.classList.remove('is-flash'), 1100);
}
function shake(el) {
  el.classList.remove('is-shake');
  void el.offsetWidth;
  el.classList.add('is-shake');
}
