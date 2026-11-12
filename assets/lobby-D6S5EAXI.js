import{C as w,c as A,g as S,s as M}from"./endscreen-BmKASUkf.js";import{f as z,m as L,L as D,l as _,b as O,a as P}from"./game-DuCiqywC.js";import{t,s as x,h as j,g as q,a as G,e as H}from"./index-DfktTF05.js";import"./format-B9Q6Rt0r.js";import"./board-BCNXPxzL.js";import"./coin-Cn2J1bH2.js";const E='<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',R=a=>t("br.cars").split("|")[a-1]||t("ty.carN",{n:a}),K=()=>`
  <div class="g-box">
    <div class="g-top"><span>${t("br.garage")}</span><b data-g-num></b></div>
    <div class="g-stage" data-g-stage tabindex="0" role="listbox" aria-label="${t("ty.car")}">
      <div class="g-floor"></div>
      <div class="g-track" data-g-track>${Array.from({length:w},(a,s)=>`<div class="g-car" role="option" data-n="${s+1}" aria-label="${R(s+1)}"><img src="${A(s+1)}" alt="" draggable="false" decoding="async"></div>`).join("")}</div>
    </div>
    <div class="g-name" data-g-name aria-live="polite"></div>
    <div class="g-ctl">
      <button type="button" class="g-arrow" data-g-prev aria-label="${t("br.prevCar")}">${E}</button>
      <div class="g-dots">${"<i></i>".repeat(w)}</div>
      <button type="button" class="g-arrow g-arrow--next" data-g-next aria-label="${t("br.nextCar")}">${E}</button>
    </div>
    <div class="g-hint">${t("br.swipe")}</div>
  </div>`;function W(a,s){const o=a.querySelector("[data-g-stage]"),c=a.querySelector("[data-g-track]"),d=[...c.children],g=[...a.querySelectorAll(".g-dots i")],i=w-1;let n=(S()||1)-1,u=0,p=null,e=!1;const r=()=>Math.min(200,o.clientWidth*.52),m=l=>Math.max(0,Math.min(i,l));function v(l){const h=r();c.style.setProperty("--slot",`${h}px`),c.classList.toggle("anim",l),c.style.transform=`translateX(${-(n+.5)*h+u}px)`;const y=m(Math.round(n-u/h));d.forEach((f,k)=>{f.classList.toggle("on",k===y),f.classList.toggle("near",Math.abs(k-y)===1),f.setAttribute("aria-selected",String(k===y))}),g.forEach((f,k)=>f.classList.toggle("on",k===y)),a.querySelector("[data-g-num]").textContent=`${y+1} / ${w}`,a.querySelector("[data-g-name]").textContent=R(y+1)}function b(l){const h=m(l);u=0;const y=h!==n;n=h,v(!0),M(n+1),y&&s?.(n+1)}a.querySelector("[data-g-prev]").onclick=()=>b(n-1),a.querySelector("[data-g-next]").onclick=()=>b(n+1),d.forEach((l,h)=>{l.onclick=()=>{e||b(h)}}),o.addEventListener("pointerdown",l=>{p=l.clientX,e=!1,o.setPointerCapture?.(l.pointerId)}),o.addEventListener("pointermove",l=>{p!=null&&(u=l.clientX-p,Math.abs(u)>6&&(e=!0),v(!1))});const $=()=>{p!=null&&(p=null,b(Math.round(n-u/r())))};o.addEventListener("pointerup",$),o.addEventListener("pointercancel",$),o.addEventListener("keydown",l=>{l.key==="ArrowLeft"&&(l.preventDefault(),b(n-1)),l.key==="ArrowRight"&&(l.preventDefault(),b(n+1))});const C=()=>v(!1);return addEventListener("resize",C),S()||M(n+1),v(!1),()=>removeEventListener("resize",C)}const N='<svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/></svg>',T='<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg>',X='<svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex:none"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',B=[["uz","O'zbekcha"],["ru","Русский"],["en","English"]];async function st(a,{guest:s=!1}={}){const o=s?"guest":"solo",c=z(o);if(c)try{return await L(a,{mode:o,language:c.language,contentId:c.contentId})}catch(i){x(i)}if(!s)return Q(a);a.replaceChildren(j(`
    <section class="ty">
      <div class="ty-top">
        <a href="#/" class="ty-back" aria-label="${t("app.backShort")}">${T}</a>
        <h1>${s?t("ty.guestTitle"):"Typing Race"}</h1>
      </div>
      ${s?`<div class="ty-note" role="note">${X}Mehmon rejimida natijalar saqlanmaydi</div>`:""}
      <div class="ty-grid">
        <div class="ty-card">
          <div class="ty-head"><span class="ty-ic">${N}</span>
            <div><b>${s?t("ty.guestPractice"):t("ty.newRace")}</b><small>${s?t("ty.guestD"):t("ty.randomText")}</small></div></div>
          <fieldset class="ty-lang"><legend>${t("tp.textLang")}</legend>
            <div class="ty-opts">${B.map(([i,n])=>`<label><input type="radio" name="lang" value="${i}"${i===q()?" checked":""}><span>${n}</span></label>`).join("")}</div>
          </fieldset>
          <button id="go" class="btn ty-go">▶ ${t("home.start")}</button>
        </div>
        ${s?`<div class="ty-reg">
          <b>${t("ty.saveQ")}</b>
          <p>${t("ty.saveP")}</p>
          <div class="ty-tags"><span>🔒 ${t("pf.rooms")}</span><span>🔒 ${t("pf.lab")}</span><span>🔒 ${t("home.it")}</span></div>
          <a href="#/" class="btn">${t("au.register")}</a>
        </div>`:""}
      </div>
    </section>`));let d=()=>{};const g=i=>a.querySelector(i);return g("#go").onclick=async()=>{try{d();const i=g('input[name="lang"]:checked').value;d=await L(a,{mode:o,language:i,fresh:!0})}catch(i){x(i)}},()=>d()}const I="ck_race_lv",U=()=>{try{const a=Number(localStorage.getItem(I));return a>=1&&a<=4?a:1}catch{return 1}},V=a=>{try{localStorage.setItem(I,String(a))}catch{}},F=a=>`<span class="br-meter" aria-hidden="true">${[1,2,3,4].map(s=>`<i${s<=a?' class="on"':""}></i>`).join("")}</span>`;async function Q(a){let s=U(),o=q(),c={wins:{},unlocked:[1,2,3]};a.replaceChildren(j(`
    <section class="ty">
      <div class="ty-top">
        <a href="#/" class="ty-back" aria-label="${t("app.backShort")}">${T}</a>
        <h1>Typing Race</h1>
      </div>
      <div class="ty-grid">
        <div class="ty-card br-card">
          <div class="ty-head"><span class="ty-ic">${N}</span><div><b>${t("br.title")}</b><small>${t("br.sub")}</small></div></div>
          <div class="br-lab" id="lv-lab">${t("br.pickLevel")}</div>
          <div class="br-lvls" role="radiogroup" aria-labelledby="lv-lab">${D.map(e=>`
            <button type="button" class="br-lvl" role="radio" data-lv="${e.lv}">
              ${F(e.lv)}<span class="br-nm">${_(e.lv)}</span>
              <span class="br-sp">${t("br.botsWpm",{a:e.min,b:e.max})}</span><span class="br-badge" hidden></span>
            </button>`).join("")}
          </div>
          <div class="br-lab">${t("br.pickCar")}</div>
          <div id="garage">${K()}</div>
          <div class="br-rivals"><div class="br-rcars"></div><span></span></div>
          <fieldset class="ty-lang"><legend>${t("tp.textLang")}</legend>
            <div class="ty-opts">${B.map(([e,r])=>`<label><input type="radio" name="lang" value="${e}"${e===o?" checked":""}><span>${r}</span></label>`).join("")}</div>
          </fieldset>
          <button id="go" class="btn ty-go">▶ ${t("br.start")}</button>
        </div>
        <div class="br-side">
          <div class="br-alt"><div><b>${t("br.solo")}</b><small>${t("br.soloD")}</small></div><button type="button" class="btn btn--ghost" id="solo">${t("home.start")}</button></div>
          <div class="br-alt"><div><b>${t("br.friends")}</b><small>${t("br.friendsD")}</small></div><a class="btn btn--ghost" href="#/">${t("br.enterCode")}</a></div>
        </div>
      </div>
    </section>`));const d=e=>a.querySelector(e);let g=()=>{};function i(){c.unlocked.includes(s)||(s=1),a.querySelectorAll(".br-lvl").forEach(r=>{const m=Number(r.dataset.lv),v=!c.unlocked.includes(m),b=c.wins?.[m]||0;r.setAttribute("aria-checked",String(m===s)),r.toggleAttribute("data-locked",v),r.setAttribute("aria-disabled",String(v));const $=r.querySelector(".br-badge");$.hidden=!v&&!b,$.textContent=v?`🔒 ${t("br.lock4")}`:b?t("br.won",{n:b}):"",$.classList.toggle("is-lock",v)});const e=S()||1;d(".br-rcars").innerHTML=O(s,e).map(r=>`<img src="${A(r)}" alt="">`).join(""),d(".br-rivals span").innerHTML=`${t("br.rivals")}: <b>${H(P(s).join(", "))}</b>`}a.querySelectorAll(".br-lvl").forEach(e=>{e.onclick=()=>{const r=Number(e.dataset.lv);c.unlocked.includes(r)&&(s=r,V(r),i())}});const n=W(d("#garage"),()=>i());i(),G.get("/typing/race-stats").then(e=>{c=e,i()}).catch(()=>{});const u=()=>d('input[name="lang"]:checked')?.value||o,p=async e=>{try{g(),n(),o=u(),g=await L(a,{mode:"solo",language:o,fresh:!0,race:{level:e,again:p}})}catch(r){x(r)}};return d("#go").onclick=()=>p(s),d("#solo").onclick=async()=>{try{g(),n(),g=await L(a,{mode:"solo",language:u(),fresh:!0})}catch(e){x(e)}},()=>{n(),g()}}export{st as mountTypingLobby};
