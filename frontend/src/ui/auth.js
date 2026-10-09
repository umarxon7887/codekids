/** @file Login / Register ekrani (student va teacher rollari) + mehmon kirishi. */
import { auth } from '../core/api.js';
import { showError, toast } from '../core/toast.js';
import { html } from '../utils/dom.js';

/** @param {HTMLElement} root @param {()=>void} onDone @returns {()=>void} */
export function mountAuth(root, onDone) {
  let mode = 'login';
  const view = html(`
    <section class="card">
      <h1>CodeKids 🚀</h1>
      <div id="reg" hidden>
        <select id="role"><option value="student">O'quvchi</option><option value="teacher">Ustoz</option></select>
        <input id="nick" placeholder="Nikneym (masalan, Ali)" />
        <div id="teacher" hidden>
          <input id="full" placeholder="To'liq ism" />
          <input id="school" placeholder="Maktab / markaz" />
          <input id="subj" placeholder="Fanlar (vergul bilan: math, it)" />
          <input id="exp" type="number" min="0" placeholder="Tajriba (yil)" />
          <input id="age" placeholder="Yosh guruhi (masalan 7-9)" />
        </div>
      </div>
      <input id="email" type="email" placeholder="Email" autocomplete="username" />
      <input id="pass" type="password" placeholder="Parol (kamida 8 belgi)" autocomplete="current-password" />
      <button id="go" class="btn btn--big">Kirish</button>
      <button id="sw" class="btn btn--ghost">Ro'yxatdan o'tish</button>
      <a class="btn btn--ghost" href="#/guest">Mehmon sifatida mashq qilish</a>
    </section>`);
  const $ = (s) => view.querySelector(s);

  const sync = () => {
    $('#reg').hidden = mode === 'login';
    $('#teacher').hidden = $('#role').value !== 'teacher';
    $('#go').textContent = mode === 'login' ? 'Kirish' : "Ro'yxatdan o'tish";
    $('#sw').textContent = mode === 'login' ? "Ro'yxatdan o'tish" : 'Kirish';
  };
  $('#sw').onclick = () => { mode = mode === 'login' ? 'register' : 'login'; sync(); };
  $('#role').onchange = sync;

  $('#go').onclick = async () => {
    const btn = $('#go');
    btn.disabled = true;
    try {
      const creds = { email: $('#email').value.trim(), password: $('#pass').value };
      if (mode === 'login') await auth.login(creds);
      else {
        const role = $('#role').value;
        const body = { ...creds, role, nickname: $('#nick').value.trim() };
        if (role === 'teacher') {
          Object.assign(body, {
            full_name: $('#full').value.trim(), school: $('#school').value.trim(),
            subjects: $('#subj').value.split(',').map((s) => s.trim()).filter(Boolean),
            experience_years: Number($('#exp').value) || 0, age_group: $('#age').value.trim(),
          });
        }
        await auth.register(body);
      }
      toast('Xush kelibsiz!', 'success');
      location.hash = '#/';
      onDone();
    } catch (e) { showError(e); } finally { btn.disabled = false; }
  };
  sync();
  root.replaceChildren(view);
  return () => {};
}
