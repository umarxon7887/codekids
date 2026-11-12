import{h as R,t as e,a as T,s as C,e as l,c as U,m as B,b as N}from"./index-DfktTF05.js";import{a as F}from"./coin-Cn2J1bH2.js";const I={x:'<path d="M6 6l12 12M18 6L6 18"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7"/>',school:'<path d="M3 21h18M6 21V9l6-5 6 5v12M10 21v-5h4v5"/>',book:'<path d="M4 4h13a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4zM4 18a2 2 0 0 1 2-2h13"/>',case:'<path d="M3 8h18v12H3zM9 8V5h6v3"/>',group:'<path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM2 21c0-3.5 3-6 7-6s7 2.5 7 6M17 4a4 4 0 0 1 0 7.5M19 15c2 .8 3 2.5 3 4.5"/>',pen:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',out:'<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',kb:'<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',maze:'<path d="M3 3h18v18H3zM8 3v8h8M16 21v-6M3 14h5"/>',target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',trophy:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',castle:'<path d="M4 21V9l2-1V5h2v2h2V5h4v2h2V5h2v3l2 1v12zM10 21v-4a2 2 0 0 1 4 0v4"/>',fire:'<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 2 1 3 2 3 4"/>'},m=(s,a=20)=>`<svg aria-hidden="true" width="${a}" height="${a}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${I[s]}</svg>`,A=e("date.months").split(","),G=s=>{const a=new Date(s);return Number.isNaN(a.getTime())?"":e("pf.since",{y:a.getFullYear(),m:A[a.getMonth()]})},D=s=>{const a=new Date(s);return Number.isNaN(a.getTime())?"":e("date.day",{d:a.getDate(),m:A[a.getMonth()]})},M=`<span class="pf-none">${e("pf.empty")}</span>`,o=(s,a,n)=>`<div class="pf-row"><span class="pf-ri">${m(s)}</span>
  <div class="pf-rt"><span>${a}</span><b>${n}</b></div></div>`,g=(s,a,n="")=>`<div class="pf-tile"><b>${s}${n?`<small>${n}</small>`:""}</b><span>${a}</span></div>`,v=(s,a,n,t,p="")=>`<div class="pf-f"><label for="${s}">${a}</label>
  <div class="pf-in">${m(n)}<input id="${s}" ${t}></div>${p?`<small id="${s}-h">${p}</small>`:""}</div>`;let b=null;async function se({onLogout:s,onChange:a}={}){if(b)return;const n=document.activeElement,t=R(`<div class="pf-wrap">
    <section class="pf" role="dialog" aria-modal="true" aria-labelledby="pf-title">
      <header class="pf-head"><h1 id="pf-title">${e("pf.title")}</h1>
        <button type="button" class="pf-x" aria-label="${e("app.close")}">${m("x")}</button></header>
      <div class="pf-body"><div class="skeleton pf-skel" aria-busy="true"></div></div>
    </section></div>`),p=t.querySelector(".pf-body");let d=null,x=!1;const f=()=>{b===f&&(b=null,document.removeEventListener("keydown",S),window.removeEventListener("hashchange",f),document.documentElement.classList.remove("pf-lock"),t.remove(),n&&document.contains(n)&&n.focus())};function S(c){c.key==="Escape"&&(x?y():f())}t.addEventListener("click",c=>{c.target===t&&f()}),t.querySelector(".pf-x").onclick=f,document.addEventListener("keydown",S),window.addEventListener("hashchange",f),document.documentElement.classList.add("pf-lock"),document.body.appendChild(t),b=f,t.querySelector(".pf-x").focus();async function E(){p.innerHTML='<div class="skeleton pf-skel" aria-busy="true"></div>';try{d=await T.get("/profile"),b===f&&y()}catch(c){C(c),p.innerHTML=`<div class="pf-card pf-fail"><p>${e("pf.loadFail")}</p>
        <button type="button" class="btn btn--ghost" data-retry>${e("app.retry")}</button></div>`,p.querySelector("[data-retry]").onclick=E}}function y(){x=!1;const{user:c,stats:k}=d,$=c.role==="teacher",i=c.nickname||"";p.innerHTML=`
      <div class="pf-hero ${$?"pf-hero--t":"pf-hero--s"}">
        <span class="pf-ava">${l((i[0]||"?").toUpperCase())}</span>
        <div class="pf-who">
          <h2>${l(i)}</h2>
          <div class="pf-mail">${l(c.email||"")}</div>
          <div class="pf-chips"><span>${$?e("au.teacher"):e("au.student")}</span>${c.created_at?`<span>${l(G(c.created_at))}</span>`:""}</div>
        </div>
      </div>
      ${$?K(c,k):W(k)}
      <div class="pf-actions">
        <button type="button" class="btn" data-edit>${m("pen")}${e("pf.edit")}</button>
        <button type="button" class="btn btn--ghost" data-out>${m("out")}${e("app.logout")}</button>
      </div>`,p.querySelector("[data-edit]").onclick=O,p.querySelector("[data-out]").onclick=()=>{f(),s?.()}}function O(){x=!0;const c=d.user,k=c.role==="teacher";p.innerHTML=`
      <form class="pf-card pf-form" novalidate>
        <h2>${e("pf.editTitle")}</h2>
        ${v("pf-nick",e("au.nick"),"user",`value="${l(c.nickname||"")}" maxlength="40" required autocomplete="nickname"`)}
        ${k?`
          ${v("pf-full",e("au.full"),"user",`value="${l(c.full_name||"")}" maxlength="120" required autocomplete="name"`)}
          ${v("pf-school",e("au.school"),"school",`value="${l(c.school||"")}" maxlength="200" placeholder="${e("au.optional")}"`)}
          ${v("pf-subj",e("au.subj"),"book",`value="${l((c.subjects||[]).join(", "))}" placeholder="math, it" aria-describedby="pf-subj-h"`,e("pf.comma"))}
          <div class="pf-two">
            ${v("pf-exp",e("au.exp"),"case",`value="${c.experience_years??""}" type="number" min="0" max="70" inputmode="numeric" placeholder="0"`)}
            ${v("pf-age",e("au.age"),"group",`value="${l(c.age_group||"")}" maxlength="20" placeholder="7-9"`)}
          </div>`:""}
        <div class="pf-actions">
          <button type="submit" class="btn">${e("app.save")}</button>
          <button type="button" class="btn btn--ghost" data-cancel>${e("app.cancel")}</button>
        </div>
      </form>`;const $=p.querySelector("form"),i=j=>$.querySelector(j);i("[data-cancel]").onclick=y,i("#pf-nick").focus(),$.onsubmit=async j=>{j.preventDefault(),$.querySelectorAll("[aria-invalid]").forEach(r=>r.removeAttribute("aria-invalid"));const L=(r,_)=>{const u=i(r);u.setAttribute("aria-invalid","true"),u.focus(),N(_,"error")},z=i("#pf-nick").value.trim();if(z.length<2)return L("#pf-nick",e("pf.nickMin"));const h={};if(z!==c.nickname&&(h.nickname=z),k){const r=i("#pf-full").value.trim();if(r.length<2)return L("#pf-full",e("pf.fullMin"));const _=i("#pf-exp").value.trim(),u=_===""?null:Number(_);if(u!==null&&(!Number.isInteger(u)||u<0||u>70))return L("#pf-exp",e("pf.expRange"));const q=[...new Set(i("#pf-subj").value.split(",").map(P=>P.trim()).filter(Boolean))],H=i("#pf-school").value.trim(),V=i("#pf-age").value.trim();r!==(c.full_name||"")&&(h.full_name=r),H!==(c.school||"")&&(h.school=H),q.join(`
`)!==(c.subjects||[]).join(`
`)&&(h.subjects=q),u!==(c.experience_years??null)&&(h.experience_years=u),V!==(c.age_group||"")&&(h.age_group=V)}if(!Object.keys(h).length){y();return}const w=i('[type="submit"]');w.disabled=!0,w.textContent=e("app.saving");try{d=await T.put("/profile",h);const r=U();r&&B({...r,nickname:d.user.nickname}),a?.(d.user),N(e("app.saved"),"success"),b===f&&y()}catch(r){C(r),w.disabled=!1,w.textContent=e("app.save")}}}E()}function K(s,a){const n=(s.subjects||[]).length?`<span class="pf-tags">${s.subjects.map(t=>`<i>${l(t)}</i>`).join("")}</span>`:M;return`
    <div class="pf-tiles">${g(a.classes,e("pf.classes"))}${g(a.students,e("pf.students"))}${g(a.rooms,e("pf.rooms"))}</div>
    <section class="pf-card">
      <h3>${e("pf.info")}</h3>
      <div class="pf-rows">
        ${o("user",e("au.full"),s.full_name?l(s.full_name):M)}
        ${o("school",e("au.school"),s.school?l(s.school):M)}
        ${o("book",e("au.subj"),n)}
        ${o("case",e("pf.exp"),s.experience_years!=null?e("pf.years",{n:s.experience_years}):M)}
        ${o("group",e("au.age"),s.age_group?l(s.age_group):M)}
      </div>
    </section>`}function W(s){const a=`<span class="pf-none">${e("pf.notYet")}</span>`,n=(s.typing_wins||0)+(s.lab_wins||0),t=s.classes.length?`<div class="pf-tags pf-tags--lg">${s.classes.map(p=>`<i>${l(p.name)}<small>${l(p.teacher)}</small></i>`).join("")}</div>`:`<p class="pf-empty">${e("pf.noClass")}</p>`;return`
    <div class="pf-tiles">
      ${g(s.typing_games+s.lab_games,e("pf.games"))}
      ${g(s.best_wpm??"—",e("pf.record"),s.best_wpm!=null?e("app.wpm"):"")}
      ${g(s.lab_correct,e("pf.correct"))}
    </div>
    <section class="pf-card">
      <h3>${e("pf.results")}</h3>
      <div class="pf-rows">
        ${o("target",e("pf.avgAcc"),s.avg_accuracy!=null?`${s.avg_accuracy}%`:a)}
        ${o("trophy",e("pf.firsts"),n)}
        ${o("maze",e("pf.labBest"),s.lab_best_level!=null?e("app.level",{n:s.lab_best_level}):a)}
      </div>
    </section>
    ${X(s.typing_lessons)}
    ${J(s.it)}
    <section class="pf-card">
      <h3>${e("pf.myClasses")}</h3>
      ${t}
    </section>
    <section class="pf-card">
      <h3>${e("pf.recent")}</h3>
      ${s.recent.length?`<ul class="pf-list">${s.recent.map(Q).join("")}</ul>`:`<p class="pf-empty">${e("pf.noGames")}</p>`}
    </section>`}function Y(s,a,n){if(!n)return"";const t=n.done?`${n.course_done?e("pf.allDone"):e("app.level",{n:n.level})} · ${e("pf.lessonsOf",n)} · ${n.stars}★`:`<span class="pf-none">${e("pf.notStarted")}</span>`;return o(s==="ru"?"book":"trophy",a,t)}function X(s){if(!s)return"";const a=t=>`<span class="pf-stars" aria-label="${e("app.stars",{n:t})}">${"★".repeat(t)}<i>${"★".repeat(3-t)}</i></span>`,n=s.recent.length?`<ul class="pf-list">${s.recent.map(t=>`<li class="pf-item">
        <span class="pf-ii is-kb">${m(t.kind==="exam"?"trophy":"kb")}</span>
        <div class="pf-it"><b>${t.lang==="ru"?`${e("pf.ruShort")} · `:""}${e("app.level",{n:t.level})} · ${l(t.kind==="exam"?e("tl.exam"):t.title)}</b>
          <span>${l(D(t.at))} · ${t.wpm} ${e("app.wpm")} · ${t.accuracy}%</span></div>
        ${t.stars?a(t.stars):`<span class="pf-place">${e("pf.failed")}</span>`}</li>`).join("")}</ul>`:`<p class="pf-empty">${e("pf.noLessons")}</p>`;return`
    <section class="pf-card pf-tlc">
      <div class="pf-tlh"><h3>${e("home.tl")}</h3><span class="pf-coins">${F(26)}<b>${s.coins}</b> coin</span></div>
      <div class="pf-rows">
        ${Y("uz",e("pf.courseUz"),s.langs?.uz)}
        ${Y("ru",e("pf.courseRu"),s.langs?.ru)}
        ${o("kb",e("pf.bestLessonWpm"),s.best_wpm!=null?`${s.best_wpm} ${e("app.wpm")}`:`<span class="pf-none">${e("pf.notYet")}</span>`)}
        ${o("target",e("pf.avgAcc2"),s.avg_accuracy!=null?`${s.avg_accuracy}%`:`<span class="pf-none">${e("pf.notYet")}</span>`)}
      </div>
      <h3 class="pf-sub">${e("pf.recentLessons")}</h3>
      ${n}
    </section>`}function J(s){if(!s)return"";const a=s.tools.length?`<div class="pf-bag">${s.tools.map(n=>`<span class="pf-tool"><b>${l(n.name)}</b>${n.short?`<small>${l(n.short)}</small>`:""}</span>`).join("")}</div>`:`<p class="pf-empty">${e("pf.noTools")}</p>`;return`
    <section class="pf-card pf-itc">
      <h3>${e("home.it")}</h3>
      <div class="pf-rows">
        ${o("star","XP",s.xp)}
        ${o("castle",e("pf.castles"),s.done)}
        ${o("fire",e("pf.streak"),s.streak)}
      </div>
      <h3 class="pf-sub">${e("pf.bag")}</h3>
      ${a}
    </section>`}function Q(s){const a=s.kind==="labyrinth",n=a?e("pf.lab"):s.mode==="race"?e("pf.race"):e("pf.solo"),t=s.title?` · ${l(s.title)}`:"",p=a?e("pf.labMetric",{c:s.correct??0,s:s.score??0}):`${s.wpm} ${e("app.wpm")} · ${s.accuracy}%`,d=s.place?`<span class="pf-place${s.place===1?" is-gold":""}">${e("pf.place",{n:s.place})}</span>`:"";return`<li class="pf-item">
    <span class="pf-ii ${a?"is-lab":"is-kb"}">${m(a?"maze":"kb")}</span>
    <div class="pf-it"><b>${n}${t}</b><span>${l(D(s.at))} · ${p}</span></div>${d}</li>`}export{se as openProfile};
