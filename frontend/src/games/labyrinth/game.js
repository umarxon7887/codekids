/**
 * @file Labirint o'yini (server-authoritative, 3D bog', 5 daraja). Oqim:
 *   labyrinth:join {code} -> labyrinth:init -> (kutish: labyrinth:hero {code,hero}) -> labyrinth:start (ustoz)
 *   labyrinth:move {code,direction} -> ack {x,y,finished,question,next}; labyrinth:answer {code,choice} -> ack {..., questions, exit}
 *   labyrinth:update / labyrinth:finished; chiqarish: `kicked` yoki KICKED xatosi; yopish: ROOM_CLOSED.
 * Har darajada qasr yashirin: hamma savolga javob berilgach server `exit` ni yuboradi; qasrga yetgach `next` keladi.
 * Harakat optimistik chiziladi, ack'dagi x,y bilan tuzatiladi. BLOCKED/TOO_FAST/LOCKED jim o'tkaziladi.
 * Boshqaruv: telefonda barmoqni surib ushlab turish (joystik kabi), kompyuterda strelkalar/WASD (bosib tursa yuradi).
 */
import '../../styles/lab.css';
import { connectSocket, emitAck } from '../../core/socket.js';
import { closeRoom, kickPlayer } from '../../core/roomApi.js';
import { MOVE_COOLDOWN_MS, BASE_URL } from '../../core/config.js';
import { showError, toast } from '../../core/toast.js';
import { html, esc, sleep } from '../../utils/dom.js';
import { formatTime } from '../../utils/format.js';
import { t } from '../../i18n/index.js';
import { renderKicked } from '../../ui/endscreen.js';
import { createRenderer } from './factory.js';
import { HEROES, heroUrl, heroInfo, heroOf, getMyHero, setMyHero, avatarHtml } from './heroes.js';
import { I, sortPlayers, renderStudentEnd, renderHostEnd } from './labui.js';

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
const SILENT = new Set(['BLOCKED', 'TOO_FAST', 'LOCKED']);
const REPEAT_MS = MOVE_COOLDOWN_MS + 30; // bosib turganda qadamlar oralig'i
const DEAD_ZONE = 22; // px: shundan kam surilsa yurmaydi
const KEYS = { arrowup: 'up', arrowdown: 'down', arrowleft: 'left', arrowright: 'right', w: 'up', s: 'down', a: 'left', d: 'right' };
/** ISO yoki epoch-ms -> ms. @param {any} v */
const ts = (v) => (v == null ? 0 : typeof v === 'number' ? v : Date.parse(v) || 0);
const DOTS = '<span class="lb-dots" aria-hidden="true"><i></i><i></i><i></i></span>';

const keyCap = (k) => `<kbd>${k}</kbd>`;
const keysGrid = (u, l, d, r) => `<span class="lb-kg"><span></span>${keyCap(u)}<span></span>${keyCap(l)}${keyCap(d)}${keyCap(r)}</span>`;

function studentSide() {
  return `
    <div class="lb-card lb-heroes" id="lb-heroes" hidden>
      <div class="lb-ch"><b>Qahramoningni tanla</b><small class="lb-swipe">suring →</small></div>
      <div class="lb-hgrid" role="radiogroup" aria-label="Qahramonlar">${HEROES.map((h) => `
        <button type="button" class="lb-hero" role="radio" aria-checked="false" data-hero="${h.id}" aria-label="${esc(h.name)}">
          <span class="lb-ph" style="background:${h.bg}"><img src="${heroUrl(h.id)}" alt=""></span><span class="lb-hn">${esc(h.name)}</span></button>`).join('')}
      </div>
    </div>
    <div class="lb-tip lb-tip--touch">${I.swipe}<div><b>Yurish uchun ekranni suring</b><small id="lb-tipt"></small></div></div>
    <div class="lb-card lb-keys"><b>Klaviaturadan yur</b>
      <div class="lb-kk">${keysGrid('↑', '←', '↓', '→')}<span class="lb-or">yoki</span>${keysGrid('W', 'A', 'S', 'D')}</div>
      <small>Tugmani bosib tursang, to'xtamay yuradi</small></div>`;
}

function hostSide(code) {
  const c = String(code);
  const digits = [...c].map((ch, i) => `${i === 3 && c.length === 6 ? '<i class="lb-dash" aria-hidden="true"></i>' : ''}<span>${esc(ch)}</span>`).join('');
  return `
    <div class="lb-codecard"><span class="lb-cl">Xona kodi</span>
      <div class="lb-digits" aria-label="Xona kodi ${esc(c)}">${digits}</div>
      <small>O'quvchilar shu ${c.length} ta belgini kiritadi</small>
      <div class="lb-cacts"><button type="button" id="lb-copy">${I.copy}Nusxa olish</button><button type="button" id="lb-board">${I.full}Doskaga</button></div>
    </div>
    <button type="button" class="lb-go" id="lb-start" hidden><span class="lb-goi">${I.play}</span><span><b>O'yinni boshlash</b><small id="lb-ready">0 o'quvchi tayyor</small></span></button>
    <div class="lb-live" id="lb-live" hidden><i></i><span><b>O'yin ketmoqda</b><small id="lb-livet"></small></span></div>
    <button type="button" class="lb-close" id="lb-close">${I.xc}Xonani yopish</button>
    <div class="lb-card lb-pl"><div class="lb-ch"><b>O'yinchilar</b><span class="lb-conn" id="lb-conn"><i></i>0 o'quvchi</span></div>
      <ol class="lb-plist" id="lb-plist"></ol></div>`;
}

/**
 * @param {HTMLElement} root
 * @param {{code:string, host?:boolean}} opts host=true: ustoz (o'ynamaydi; boshlaydi, kuzatadi, yopadi, chiqaradi)
 * @returns {Promise<()=>void>} cleanup
 */
export async function mountLabyrinth(root, { code, host = false }) {
  root.classList.remove('lab-host', 'lab-board-open'); // eski dizayn qoldiqlari
  root.onclick = null;
  root.replaceChildren(html(`
    <section class="lb${host ? ' lb--host' : ''}">
      <header class="lb-top">
        <a class="lb-back" href="${host ? '#/teacher' : '#/'}" aria-label="${host ? 'Ustoz paneliga qaytish' : 'Xonadan chiqish'}">${I.back}</a>
        <div class="lb-tt"><h1>${host ? 'Labirint xonasi' : 'Labirint'}</h1>${host ? '' : `<span class="lb-code">${esc(code)}</span>`}</div>
        <span class="lb-time" id="lb-timebox">${I.clock}<b id="lb-time">--:--</b></span>
      </header>
      ${host ? '<div class="lb-chips" id="lb-chips"></div>' : ''}
      <div class="lb-main" id="lb-main">
        <div class="lb-play">
          ${host ? '' : '<div class="lb-lvl"><b id="lb-lvl">1-daraja</b><span class="lb-pips" id="lb-pips"></span><span class="lb-qn" id="lb-qn"></span></div>'}
          <div class="lb-stage${host ? ' is-map' : ''}" id="lb-stage">
            <canvas id="maze"></canvas>
            <div class="lb-skel" id="lb-skel"><span>Labirint yuklanmoqda…</span></div>
            ${host ? `<span class="lb-glass lb-view">Ustoz ko'rinishi<span class="lb-view2"> · butun labirint</span></span>
              <div class="lb-glass lb-levels" id="lb-levels" role="group" aria-label="Daraja"></div>` : `
              <div class="lb-hud"><span class="lb-glass lb-lives" id="lb-lives"></span><span class="lb-glass lb-score">${I.star()}<b id="lb-score">0</b></span></div>
              <div class="lb-glass lb-cam" role="group" aria-label="Kamera">
                <button type="button" data-cam="follow" aria-pressed="true">${I.me}Men</button><button type="button" data-cam="map" aria-pressed="false">${I.map}Xarita</button></div>
              <span class="lb-metag" id="lb-metag" hidden><span>Sen shu yerdasan</span></span>`}
            <div class="lb-glass lb-zoom" id="lb-zoom" role="group" aria-label="Xaritani yaqinlashtirish"${host ? '' : ' hidden'}>
              <button type="button" data-z="in" aria-label="Yaqinlashtirish">${I.plus}</button><span class="lb-zt" aria-hidden="true"><i id="lb-zk"></i></span><button type="button" data-z="out" aria-label="Uzoqlashtirish">${I.minus}</button></div>
            <div class="lb-status" id="lb-status" role="status"></div>
          </div>
        </div>
        <aside class="lb-side">${host ? hostSide(code) : studentSide()}</aside>
      </div>
      <div id="lb-end" hidden></div>
      <div id="lb-modal" class="modal lb-modal" hidden></div>
    </section>`));

  const $ = (s) => root.querySelector(s);
  const stage = $('#lb-stage');
  const canvas = $('#maze');
  const socket = connectSocket();
  const cleanups = [];
  let renderer = null;

  let offset = 0, status = 'waiting', endsAt = 0, lockedUntil = 0, playerId = null;
  let pos = { x: 0, y: 0 }, grid = null, me = null, info = null, mode = 'follow';
  let finished = false, eliminated = false, busy = false, lastStep = 0, question = null, joinedOnce = false;
  let lastPlayers = [], endShown = false, kickStop = () => {};
  let level = 1, levels = 5, qInfo = { total: 0, left: 0 }, exitShown = false, lives = null;
  let allLevels = null, hostView = 1; // faqat ustoz: hamma darajani almashtirib ko'radi
  let hostPinned = false; // ustoz darajani o'zi tanlasa, xarita endi o'zi almashmaydi
  let myHero = getMyHero();

  const now = () => Date.now() + offset;
  const syncClock = (serverNow) => { if (serverNow != null) offset = ts(serverNow) - Date.now(); };
  const locked = () => now() < lockedUntil;
  const active = () => lastPlayers.filter((p) => !p.kicked);

  // ---------- ko'rinish ----------

  function setStatus(s, e) {
    if (s) status = s;
    if (e != null) endsAt = ts(e);
    if (!host) {
      const hb = $('#lb-heroes'), was = hb.hidden;
      hb.hidden = status !== 'waiting';
      if (was && !hb.hidden) markHero(myHero); // ko'ringach tanlangan qahramonga suriladi
    }
    if (host) {
      $('#lb-start').hidden = status !== 'waiting';
      $('#lb-live').hidden = status !== 'active';
    }
    renderStatus();
  }

  /** Sahnaning pastidagi holat kartasi (kutish, qulf, qasr haqida maslahat, tugatdi). */
  function renderStatus() {
    const el = $('#lb-status');
    if (!el || endShown) { if (el) el.innerHTML = ''; return; }
    el.className = 'lb-status';
    if (host) {
      const onLevel = active().filter((p) => (p.level ?? 1) === hostView && !p.finished).length;
      el.innerHTML = status === 'waiting'
        ? `<span><b>O'quvchilar kirgach «Boshlash»ni bosing</b></span>`
        : status === 'active' ? `<span><b>${hostView}-darajada ${onLevel} ta o'quvchi o'ynayapti</b></span>` : '';
      return;
    }
    if (status === 'waiting') {
      const others = active().filter((p) => p.id !== playerId).slice(0, 4);
      el.innerHTML = `${others.length ? `<span class="lb-avs">${others.map((p) => avatarHtml(heroOf(p))).join('')}</span>` : ''}
        <span class="lb-st"><b>Ustoz boshlashini kuting</b><small>Xonada ${active().length || 1} o'quvchi</small></span>${DOTS}`;
      return;
    }
    if (status !== 'active') { el.innerHTML = ''; return; }
    const left = Math.ceil((lockedUntil - now()) / 1000);
    if (eliminated) {
      el.classList.add('is-bad');
      el.innerHTML = `<span class="lb-st"><b>Jonlaring tugadi</b><small>Boshqalar tugatishini kutyapmiz</small></span>${DOTS}`;
    } else if (finished) {
      el.classList.add('is-ok');
      el.innerHTML = `<span class="lb-sti">${I.castle}</span><span class="lb-st"><b>Barakalla! Hamma darajani o'tding</b><small>Boshqalar tugatishini kutyapmiz</small></span>${DOTS}`;
    } else if (left > 0) {
      el.classList.add('is-warn', 'is-pill');
      el.innerHTML = `<span class="lb-st"><b>Noto'g'ri javob · ${left} s kut</b><small>Oxirgi to'g'ri javob joyiga qaytding</small></span>`;
    } else if (qInfo.left > 0) {
      el.classList.add('is-pill');
      el.innerHTML = `<span class="lb-sti">${I.q}</span><span class="lb-st"><b>Qasr yashirin: yana ${qInfo.left} ta savol</b><small>«?» belgili joylarni top</small></span>`;
    } else if (exitShown) {
      el.classList.add('is-ok', 'is-pill');
      el.innerHTML = `<span class="lb-sti">${I.castle}</span><span class="lb-st"><b>Qasr ochildi! Unga bor</b><small>Xaritada qasr qayerdaligini ko'r</small></span>`;
    } else el.innerHTML = '';
  }

  /** Daraja nuqtalari, savollar soni, jonlar va ball. */
  function renderHud(p) {
    if (host) return;
    if (p) {
      if (p.lives !== undefined) lives = p.lives;
      if (p.score != null) $('#lb-score').textContent = String(p.score);
    }
    const lv = $('#lb-lives');
    lv.hidden = lives == null;
    if (lives != null) lv.innerHTML = Array.from({ length: Math.max(3, lives) }, (_, i) => (i < lives ? I.heart : I.heartOff)).join('');
    lv.setAttribute('aria-label', lives == null ? '' : `${lives} ta jon`);
    $('#lb-lvl').textContent = `${level}-daraja`;
    const pips = $('#lb-pips');
    pips.innerHTML = Array.from({ length: levels }, (_, i) => `<i class="${i + 1 < level ? 'is-done' : i + 1 === level ? 'is-on' : ''}"></i>`).join('');
    pips.setAttribute('aria-label', `${levels} darajadan ${level}-chisi`);
    $('#lb-qn').textContent = `Savollar ${qInfo.total - qInfo.left} / ${qInfo.total}`;
    renderStatus();
  }

  function renderTip() {
    if (host) return;
    const name = heroInfo(myHero || heroOf(me || { id: playerId }, true)).name.toLowerCase();
    $('#lb-tipt').textContent = `Barmoqni qaysi tomonga sursang, ${name} o'sha tomonga yuradi${mode === 'map' ? '. Xaritani ikki barmoq bilan yaqinlashtir' : ''}`;
  }

  function markHero(n) {
    root.querySelectorAll('[data-hero]').forEach((b) => b.setAttribute('aria-checked', String(Number(b.dataset.hero) === n)));
    // telefonda ro'yxat yonga suriladi: tanlangan qahramon ko'rinib tursin
    const box = root.querySelector('.lb-hgrid'), on = root.querySelector('[data-hero][aria-checked="true"]');
    if (box && on && box.scrollWidth > box.clientWidth) box.scrollLeft = on.offsetLeft - box.offsetLeft - (box.clientWidth - on.clientWidth) / 2;
  }

  function pickHero(n, send = true) {
    myHero = n;
    setMyHero(n);
    markHero(n);
    renderer?.setMyHero(n);
    renderTip();
    if (send && status === 'waiting') emitAck('labyrinth:hero', { code, hero: n }).catch(() => {});
  }

  /** Boshqa darajadagi o'yinchilar bu labirintda ko'rinmaydi (koordinatalari boshqa xarita uchun). */
  function pushPlayers() {
    if (!renderer) return;
    const view = host ? hostView : level;
    renderer.setPlayers(lastPlayers.filter((p) => (p.level ?? 1) === view && !(host && p.finished && p.rank))
      .map((p) => ({ ...p, hero: heroOf(p) })), playerId);
  }

  /** Daraja ma'lumotini (init yoki `next`) renderer'ga yuklaydi. */
  function loadLevel(p) {
    level = p.level || 1;
    levels = p.levels || 5;
    grid = p.grid;
    qInfo = p.questions || { total: 0, left: 0 };
    exitShown = !!p.exit;
    renderer.load({ grid: p.grid, size: p.size, start: p.start, exit: p.exit, checkpoints: p.checkpoints });
    renderHud();
  }

  // ---------- ustoz ----------

  function hostChips() {
    const el = $('#lb-chips');
    if (!el || !info) return;
    const items = [info.title, `${info.questions} savol`, `${info.levels} daraja`, info.lives ? `Standart · ${info.lives} jon` : 'Bolalar · jonsiz', `${info.minutes} daqiqa`];
    el.innerHTML = items.filter(Boolean).map((x) => `<span>${esc(x)}</span>`).join('');
  }

  /** Har darajada hozir o'ynayotganlar soni (qasrga yetganlar va joni tugaganlar hisobga olinmaydi). */
  const playingOn = (lv) => active().filter((p) => (p.level ?? 1) === lv && !p.finished).length;

  function levelTabs() {
    const nav = $('#lb-levels');
    if (!host || !nav || !allLevels?.length) return;
    nav.innerHTML = `<small>Daraja</small>${allLevels.map((l) => {
      const n = playingOn(l.level);
      return `<button type="button" data-l="${l.level}" aria-pressed="${l.level === hostView}" aria-label="${l.level}-daraja, ${n} o'quvchi">${l.level}${n ? `<i>${n}</i>` : ''}</button>`;
    }).join('')}`;
  }

  /** Ustoz biror darajani tanlamaguncha xarita ko'pchilik o'ynayotgan darajaga o'zi o'tadi. */
  function followCrowd() {
    if (!host || hostPinned || !allLevels?.length || status !== 'active') return;
    let best = hostView, bestN = playingOn(hostView);
    allLevels.forEach((l) => { const n = playingOn(l.level); if (n > bestN || (n === bestN && n > 0 && l.level > best)) { best = l.level; bestN = n; } });
    if (best !== hostView && bestN > 0) { hostView = best; loadLevel(allLevels[best - 1]); }
  }

  function hostBoard() {
    const list = sortPlayers(lastPlayers);
    const n = list.length;
    $('#lb-conn').innerHTML = `<i></i>${n} o'quvchi`;
    $('#lb-ready').textContent = `${n} o'quvchi tayyor`;
    const fin = list.filter((p) => p.finished && p.rank && !p.eliminated).length;
    $('#lb-livet').textContent = `${fin} / ${n} qasrga yetdi`;
    const el = $('#lb-plist');
    if (!n) { el.innerHTML = `<li class="lb-empty">Hali o'quvchi yo'q. Kodni kiritganlar shu yerda chiqadi.</li>`; return; }
    el.innerHTML = list.map((p) => {
      const sub = p.eliminated ? `<span class="lb-badge is-out">${I.broken}jon tugadi</span>`
        : p.finished && p.rank ? `<span class="lb-badge">${I.flag}finish · ${p.rank}-o'rin</span>`
          : status === 'waiting' ? '' : `<small>${p.level ?? 1}-daraja</small>`;
      return `<li class="lb-prow">${avatarHtml(heroOf(p))}
        <span class="lb-rnm"><span class="lb-nm">${esc(p.nickname)}</span>${sub ? `<span>${sub}</span>` : ''}</span>
        <span class="lb-psc">${esc(p.score ?? 0)} ball</span>
        <button type="button" class="lb-kick" data-kick="${esc(p.id)}" aria-label="${t('host.kick')}: ${esc(p.nickname)}">${I.x}</button></li>`;
    }).join('');
  }

  // ---------- yakun ----------

  /** @param {any[]} players @param {'time'|'all_done'|'closed'} [reason] */
  function showEnd(players, reason = 'time') {
    if (endShown) return;
    endShown = true;
    stopHold();
    $('#lb-modal').hidden = true;
    renderStatus();
    if (host) {
      root.querySelector('.lb').classList.add('is-ended');
      renderHostEnd($('#lb-end'), { players, code, info, reason });
    } else {
      renderStudentEnd($('#lb-end'), { players, meId: playerId, levels, reason });
    }
  }

  function showKicked() {
    if (host || endShown) return;
    endShown = true; finished = true;
    stopHold();
    $('#lb-modal').hidden = true;
    kickStop = renderKicked($('#lb-end'));
  }

  /** Xato kodlariga qarab holat o'zgarishi. @returns {boolean} xato qayta ishlandimi */
  function handleStateError(e) {
    if (e.code === 'KICKED' || e.code === 'NOT_A_PARTICIPANT') { showKicked(); return true; }
    if (e.code === 'ROOM_CLOSED' || e.code === 'ROOM_FINISHED') { showEnd(lastPlayers, e.code === 'ROOM_CLOSED' ? 'closed' : 'time'); return true; }
    return false;
  }

  // ---------- savol ----------

  function showQuestion(q) {
    question = q;
    stopHold();
    const m = $('#lb-modal');
    m.hidden = false;
    const n = Math.min(qInfo.total, qInfo.total - qInfo.left + 1);
    m.innerHTML = `<div class="lb-qcard" role="dialog" aria-modal="true" aria-labelledby="lb-qt">
      <div class="lb-qh"><span class="lb-qb">?</span><span>${level}-daraja · savol</span><span class="lb-qc">${n} / ${qInfo.total}</span></div>
      <h2 id="lb-qt">${esc(q.text)}</h2>
      <div class="lb-opts">${q.options.map((o, i) => `<button type="button" class="lb-opt" data-i="${i}"><span>${'ABCD'[i]}</span>${esc(o)}</button>`).join('')}</div>
      <p class="lb-fb" id="lb-fb" role="status"></p></div>`;
    m.querySelectorAll('.lb-opt').forEach((b) => { b.onclick = () => answer(Number(b.dataset.i)); });
  }

  async function answer(choice) {
    const m = $('#lb-modal');
    const btns = [...m.querySelectorAll('.lb-opt')];
    if (!btns.length || btns[0].disabled) return;
    btns.forEach((b) => { b.disabled = true; });
    try {
      const r = await emitAck('labyrinth:answer', { code, choice });
      btns[r.correctIndex]?.classList.add('is-right');
      if (!r.correct) btns[choice]?.classList.add('is-wrong');
      const opens = r.correct && r.exit && !exitShown;
      const fb = $('#lb-fb');
      fb.className = `lb-fb ${r.correct ? 'is-ok' : 'is-bad'}`;
      fb.textContent = r.correct ? (opens ? "To'g'ri! +10 ball. Qasr ochildi!" : "To'g'ri! +10 ball")
        : r.eliminated ? "Noto'g'ri. Jonlaring tugadi" : `Noto'g'ri.${r.lives != null ? ' −1 jon,' : ''} 5 soniya kutasan`;
      await sleep(r.correct ? 1100 : 1500);
      m.hidden = true;
      question = null;
      pos = { x: r.x, y: r.y };
      if (r.correct) renderer.markCleared(r.x, r.y);
      renderer.setMe(r.x, r.y);
      lockedUntil = ts(r.lockedUntil);
      if (r.questions) qInfo = r.questions;
      if (r.exit && !exitShown) { exitShown = true; renderer.revealExit?.(r.exit); }
      if (r.eliminated) { eliminated = true; finished = true; }
      renderHud(r);
    } catch (e) {
      if (handleStateError(e)) return;
      showError(e);
      btns.forEach((b) => { b.disabled = false; });
    }
  }

  /** Qasrga yetildi: qisqa tabrik, keyin yangi labirint. `busy` shu vaqtda harakatni to'sib turadi. */
  async function levelUp(r) {
    stopHold();
    const m = $('#lb-modal');
    m.hidden = false;
    m.innerHTML = `<div class="lb-qcard lb-lvup" role="dialog" aria-live="polite"><img src="${BASE_URL}lab/castle.webp" alt="">
      <h2>${level}-daraja tugadi!</h2><p>Keyingisi: ${esc(r.next.level)}-daraja · ${esc(r.next.questions?.total ?? '')} ta savol</p></div>`;
    await sleep(1700);
    m.hidden = true;
    pos = { x: r.x, y: r.y };
    loadLevel(r.next);
    renderer.setMe(r.x, r.y, true);
    renderer.setCleared([]);
    pushPlayers();
  }

  // ---------- harakat ----------

  /** @param {keyof typeof DIRS} dir */
  async function step(dir) {
    if (host || busy || finished || endShown || status !== 'active' || locked() || !grid) return;
    if (question) { if ($('#lb-modal').hidden) showQuestion(question); return; }
    const tNow = performance.now();
    if (tNow - lastStep < MOVE_COOLDOWN_MS) return;
    const [dx, dy] = DIRS[dir];
    const nx = pos.x + dx, ny = pos.y + dy;
    if (grid[ny]?.[nx] === undefined || String(grid[ny][nx]) === '1') return;
    lastStep = tNow;
    busy = true;
    renderer.setMe(nx, ny); // optimistik
    try {
      const r = await emitAck('labyrinth:move', { code, direction: dir });
      if (r.next) { await levelUp(r); return; }
      pos = { x: r.x, y: r.y };
      renderer.setMe(r.x, r.y);
      if (r.finished) { finished = true; stopHold(); renderStatus(); toast(`Hamma ${levels} daraja tugadi! 🏆`, 'success'); }
      if (r.question) showQuestion(r.question);
    } catch (e) {
      renderer.setMe(pos.x, pos.y); // silliq qaytish (uzoq bo'lsa renderer o'zi sakraydi)
      if (!handleStateError(e) && !SILENT.has(e.code)) showError(e);
    } finally { busy = false; }
  }

  // bosib turish (barmoq yoki klaviatura): yo'nalish o'zgarmaguncha qadamlar takrorlanadi.
  // Keyingi qadam oldingisiga server javob bergach rejalanadi: internet sekin bo'lsa ham qadam tushib qolmaydi.
  // Qisqa bosish (tap) ham yo'qolmaydi: tugma qo'yib yuborilsa ham bitta qadam baribir yuriladi.
  let holdDir = null, pendingTap = null, holdTimer = 0;
  async function holdTick() {
    const d = holdDir || pendingTap;
    pendingTap = null;
    if (!d) return;
    const t0 = performance.now();
    await step(d);
    if (!holdDir && !pendingTap) return;
    clearTimeout(holdTimer);
    holdTimer = setTimeout(holdTick, Math.max(0, REPEAT_MS - (performance.now() - t0)));
  }
  function hold(dir) {
    if (!dir || dir === holdDir) return;
    holdDir = dir;
    pendingTap = dir;
    if (busy) return; // yo'ldagi qadam tugagach yangi yo'nalish o'zi olinadi
    clearTimeout(holdTimer);
    const wait = MOVE_COOLDOWN_MS - (performance.now() - lastStep);
    if (wait <= 0) holdTick(); else holdTimer = setTimeout(holdTick, wait);
  }
  /** Tugma yoki barmoq qo'yib yuborildi: takrorlash to'xtaydi (boshlangan qadam yuriladi). */
  function release(dir) { if (!dir || dir === holdDir) holdDir = null; }
  /** To'liq to'xtatish (savol, yangi daraja, yakun). */
  function stopHold() { holdDir = null; pendingTap = null; clearTimeout(holdTimer); }
  cleanups.push(stopHold);

  // ---------- server eventlari ----------

  const onInit = (init) => {
    $('#lb-skel')?.remove();
    syncClock(init.serverNow);
    info = init.info || info;
    allLevels = init.allLevels || null;
    hostView = 1;
    loadLevel(init);
    renderer.start();
    const you = init.you;
    if (you) {
      me = you;
      playerId = you.id;
      pos = { x: you.x, y: you.y };
      renderer.setMe(pos.x, pos.y, true);
      renderer.setCleared(you.cleared);
      finished = !!(you.finished || you.eliminated);
      eliminated = !!you.eliminated;
      lockedUntil = ts(you.lockedUntil);
      // qahramon: serverdagi tanlov ustun; bo'lmasa telefonda saqlangani; bo'lmasa xonada hali band bo'lmagani
      const used = new Set((init.players || []).filter((p) => p.id !== you.id && p.hero_id).map((p) => Number(p.hero_id)));
      let auto = heroOf(you);
      for (let i = 0; i < HEROES.length && used.has(auto); i++) auto = (auto % HEROES.length) + 1;
      const chosen = Number(you.hero_id) || myHero || auto;
      pickHero(chosen, init.status === 'waiting' && Number(you.hero_id) !== chosen);
      renderHud(you);
      if (you.question) showQuestion(you.question);
    }
    lastPlayers = init.players || [];
    setStatus(init.status, init.endsAt);
    pushPlayers();
    hostChips();
    levelTabs();
    if (host) hostBoard();
    if (init.status === 'finished') showEnd(lastPlayers);
  };
  const onUpdate = (u) => {
    syncClock(u.serverNow);
    lastPlayers = u.players || lastPlayers;
    setStatus(u.status, u.endsAt);
    pushPlayers();
    const mine = lastPlayers.find((p) => p.id === playerId);
    if (mine) {
      if (mine.kicked) showKicked();
      if (mine.finished) finished = true;
      if (mine.eliminated) eliminated = true;
      renderHud(mine);
    }
    if (host && !endShown) { followCrowd(); pushPlayers(); levelTabs(); hostBoard(); }
  };
  const onFinished = ({ players, reason }) => { status = 'finished'; lastPlayers = players?.length ? players : lastPlayers; showEnd(lastPlayers, reason); };
  const onKicked = () => showKicked();
  const onReconnect = () => { if (joinedOnce && !endShown) emitAck('labyrinth:join', { code }).catch((e) => { if (!handleStateError(e)) showError(e); }); };

  const handlers = {
    'labyrinth:init': onInit, 'labyrinth:update': onUpdate, 'labyrinth:finished': onFinished,
    kicked: onKicked, connect: onReconnect,
  };
  Object.entries(handlers).forEach(([ev, fn]) => socket.on(ev, fn));
  cleanups.push(() => Object.entries(handlers).forEach(([ev, fn]) => socket.off(ev, fn)));

  // ---------- renderer (3D, WebGL bo'lmasa 2D) ----------
  new Image().src = `${BASE_URL}lab/castle.webp`; // daraja tugaganda chiqadigan oyna uchun oldindan yuklanadi
  renderer = await createRenderer(canvas, { host });
  renderer.setTag?.($('#lb-metag'));
  renderer.onZoom = (z) => {
    const k = $('#lb-zk');
    if (k) k.style.bottom = `${Math.round(((z - 1) / 2.5) * 100)}%`;
    root.querySelector('[data-z="out"]')?.toggleAttribute('disabled', z <= 1.01);
    root.querySelector('[data-z="in"]')?.toggleAttribute('disabled', z >= 3.49);
  };
  renderer.onZoom(1);
  if (myHero) renderer.setMyHero(myHero);
  const onLowPower = (e) => renderer.setLowPower(e.detail);
  window.addEventListener('ck:lowpower', onLowPower);
  cleanups.push(() => window.removeEventListener('ck:lowpower', onLowPower));

  // ---------- boshqaruv ----------
  const onKeyDown = (e) => {
    if (e.target.closest?.('input, textarea, select')) return;
    if (question && !$('#lb-modal').hidden && /^[1-4]$/.test(e.key)) { answer(Number(e.key) - 1); return; }
    const d = KEYS[e.key.toLowerCase()];
    if (!d) return;
    e.preventDefault();
    if (!e.repeat) hold(d);
  };
  const onKeyUp = (e) => { const d = KEYS[e.key.toLowerCase()]; if (d) release(d); };
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', stopHold);
  cleanups.push(() => { window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keyup', onKeyUp); window.removeEventListener('blur', stopHold); });

  // barmoq: surib ushlab tursa — joystik; ikki barmoq — xaritani yaqinlashtirish (renderer o'zi)
  let joy = null;
  stage.addEventListener('touchstart', (e) => {
    if (host || e.target.closest('button, a, .lb-glass')) return;
    if (e.touches.length > 1) { joy = null; stopHold(); return; }
    joy = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }, { passive: true });
  stage.addEventListener('touchmove', (e) => {
    if (!joy) return;
    if (e.touches.length > 1) { joy = null; stopHold(); return; }
    const dx = e.touches[0].clientX - joy.x, dy = e.touches[0].clientY - joy.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < DEAD_ZONE) return;
    hold(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  }, { passive: true });
  const endJoy = () => { joy = null; release(); };
  stage.addEventListener('touchend', endJoy, { passive: true });
  stage.addEventListener('touchcancel', endJoy, { passive: true });

  // kamera va zoom tugmalari
  root.querySelectorAll('[data-cam]').forEach((b) => {
    b.onclick = () => {
      mode = b.dataset.cam;
      renderer.setMode(mode);
      root.querySelectorAll('[data-cam]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      stage.classList.toggle('is-map', mode === 'map');
      $('#lb-zoom').hidden = mode !== 'map';
      renderTip();
    };
  });
  root.querySelectorAll('[data-z]').forEach((b) => { b.onclick = () => renderer.zoomBy(b.dataset.z === 'in' ? 1.5 : 1 / 1.5, true); });

  if (!host) {
    root.querySelectorAll('[data-hero]').forEach((b) => { b.onclick = () => pickHero(Number(b.dataset.hero)); });
    markHero(myHero);
    renderTip();
    renderHud();
  }

  // ---------- ustoz amallari ----------
  if (host) {
    $('#lb-start').onclick = async () => {
      const b = $('#lb-start');
      b.disabled = true;
      try { const r = await emitAck('labyrinth:start', { code }); setStatus(r.status, r.endsAt); hostBoard(); }
      catch (e) { showError(e); }
      finally { b.disabled = false; }
    };
    $('#lb-close').onclick = async () => {
      if (!confirm(t('host.confirmClose'))) return;
      try {
        await closeRoom(code);
        toast(t('host.closedToast'), 'success');
        setTimeout(() => showEnd(lastPlayers, 'closed'), 1200); // server event kelmasa ham
      } catch (e) { showError(e); }
    };
    $('#lb-plist').addEventListener('click', async (ev) => {
      const b = ev.target.closest('[data-kick]');
      if (!b || !confirm(t('host.confirmKick'))) return;
      try { await kickPlayer(code, b.dataset.kick); toast(t('host.kicked'), 'success'); } catch (e) { showError(e); }
    });
    $('#lb-levels').addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-l]');
      const L = b && allLevels?.[Number(b.dataset.l) - 1];
      if (!L) return;
      hostPinned = true;
      hostView = L.level;
      loadLevel(L);
      pushPlayers();
      levelTabs();
      renderStatus();
    });
    $('#lb-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(code); toast('Kod nusxalandi', 'success'); } catch { toast(`Kod: ${code}`); }
    };
    $('#lb-board').onclick = () => {
      const o = html(`<div class="lb-full" role="dialog" aria-label="Xona kodi"><span>Xona kodi</span><b>${esc(code)}</b><small>Bosh sahifa → «Xonaga kirish»</small><button type="button" class="btn">Yopish</button></div>`);
      document.body.appendChild(o);
      o.requestFullscreen?.().catch(() => {});
      o.querySelector('button').onclick = () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); o.remove(); };
    };
  }

  // taymer + qulf (har 250 ms)
  let lastLock = 0;
  const clock = setInterval(() => {
    const left = status === 'active' && endsAt ? endsAt - now() : null;
    $('#lb-time').textContent = left != null ? formatTime(left) : '--:--';
    $('#lb-timebox').classList.toggle('is-low', left != null && left < 60_000);
    const lk = Math.ceil((lockedUntil - now()) / 1000);
    const isLocked = lk > 0 && !finished;
    renderer?.setLocked(isLocked);
    if (lk !== lastLock) { lastLock = lk; if (!host) renderStatus(); }
  }, 250);
  cleanups.push(() => clearInterval(clock));

  // ---------- qo'shilish ----------
  try {
    await emitAck('labyrinth:join', { code });
    joinedOnce = true;
  } catch (e) {
    if (!handleStateError(e)) showError(e);
    $('#lb-skel')?.replaceChildren(document.createTextNode("Xonaga qo'shilib bo'lmadi"));
  }
  const initTimeout = setTimeout(() => {
    const s = $('#lb-skel');
    if (s) s.textContent = "Xona ma'lumoti kelmadi. Qayta urinib ko'ring.";
  }, 10000);
  cleanups.push(() => clearTimeout(initTimeout));

  return () => { cleanups.forEach((fn) => fn()); kickStop(); renderer?.destroy(); };
}
