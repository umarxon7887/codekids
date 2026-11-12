import{i as u,s as D}from"./common-DR30kViI.js";import{h as F,a as C,s as _,t,g as E,l as S,e as d,B as f}from"./index-DfktTF05.js";import{c as A}from"./coin-Cn2J1bH2.js";async function U(s,e={}){const n=F('<section class="tl"><div class="skeleton tl-skel" aria-busy="true"></div></section>');s.replaceChildren(n);const a=E();let o;try{o=await C.get("/typing-lessons",{query:{lang:a}})}catch(l){return _(l),n.innerHTML=`<div class="tl-empty"><p>${t("tl.loadFail")}</p><a class="btn btn--ghost" href="#/">${t("app.backShort")}</a></div>`,()=>{}}return M(n,o,Number(e.opened)||null),()=>{}}const g=[["#FFD98A","#E0B24E"],["#CFE6F7","#A9CBE6"],["#CDEBDD","#9FD3BA"],["#DCD3F5","#B9ACE6"],["#FFDFCB","#F0BC9C"],["#FAD4DD","#E9A9B9"]],k=[[20,27],[81,43],[19,61],[80,77],[48,92]],y=s=>`${f}tl/map-${s}.webp`,v=s=>`${f}it/kibi/${s}.webp`,x=s=>(s.keys||[]).filter(e=>e!=="shift"),L=s=>s.map(e=>`<b>${d(e.toUpperCase())}</b>`).join(" ");function j(s,e){if(!e.current_lesson_id)return t("tl.k.allDone");const n=s.find(c=>c.lessons.some(r=>r.id===e.current_lesson_id)),a=n.lessons.find(c=>c.id===e.current_lesson_id);if(a.kind==="exam")return t("tl.k.exam",{n:n.n,w:n.wpm});const o=x(a),l=e.done===0?`${t("tl.k.hello")} `:"";return o.length?l+t("tl.k.keys",{keys:L(o)}):(a.keys||[]).includes("shift")?l+t("tl.k.shift"):l+t("tl.k.words",{title:`<b>${d(a.title)}</b>`})}function M(s,{levels:e,stats:n,lang:a},o){const l=e.find(i=>i.status==="current")||e[e.length-1],c=n.current_lesson_id,r=Math.round(n.done/n.total*100),p=n.done>0;s.innerHTML=`
    <div class="tl-head">
      <a class="tl-back" href="#/" aria-label="${t("app.backShort")}">${u("left",20)}</a>
      <h1>${t("home.tl")}</h1>
      ${S("tl-lang")}
      ${A(n.coins)}
    </div>
    <section class="tl-hero">
      <div class="tl-hero-top">
        <p class="tl-bubble">${j(e,n)}</p>
        <img class="tl-hero-kibi" src="${v(c?p?"tushuntirish":"salom":"galaba")}" alt="" draggable="false">
      </div>
      <div class="tl-hero-t"><span>${t("app.level",{n:l.n})}</span><b>${d(l.title)}</b></div>
      <div class="tl-prog"><div class="tl-bar"><i style="width:${r}%"></i></div><span>${t("tl.doneOf",n)}</span></div>
      <div class="tl-hero-f">
        <span class="tl-stars-total">${u("star",18)}<b>${n.stars}</b> / ${n.max_stars}</span>
        ${c?`<a class="tl-chunky tl-go" href="#/typing-lessons/${c}">${p?t("tl.continue"):t("home.start")}</a>`:""}
      </div>
    </section>
    ${a==="ru"?`<p class="tl-tip">${u("kb",20)}<span>${t("tl.needRuKb")}</span></p>`:""}
    <div class="tl-levels">${e.map((i,$)=>O(i,$,o===i.n,c)).join("")}</div>`;const h=s.querySelector(".tl-lv.is-opening")||s.querySelector(".tl-spot.is-current");h&&(o||p)&&h.scrollIntoView({block:"center"})}function O(s,e,n,a){const o=s.status==="locked",l=s.lessons.filter(i=>i.status==="done").length,[c,r]=g[e%g.length],p=`<header class="tl-lv-h">
      <span class="tl-lv-n">${o?u("lock",20):s.status==="done"?u("check",22):s.n}</span>
      <div class="tl-lv-t"><small>${t("app.level",{n:s.n})}</small><b>${d(s.title)}</b><span>${d(s.desc)}</span></div>
      <span class="tl-lv-c">${l}/${s.lessons.length}</span>
    </header>`,h=o?`<div class="tl-mini" aria-hidden="true">${s.lessons.map((i,$)=>`<span>${i.kind==="exam"?u("trophy",18):$+1}</span>`).join("")}</div>
       <p class="tl-lv-note">${t("tl.unlockBy",{n:s.n-1})} · ${t("tl.examWpm",{n:s.wpm})}</p>`:`<div class="tl-map" style="background-image:url(${y("bg")})">${s.lessons.map((i,$)=>R(i,$,i.id===a)).join("")}</div>
       <p class="tl-lv-note">${t("tl.examWpm",{n:s.wpm})}</p>`;return`<section class="tl-lv is-${s.status}${n?" is-opening":""}" style="--c:${c};--cd:${r}" aria-label="${t("app.level",{n:s.n})}: ${d(s.title)}${o?` (${t("tl.locked")})`:""}">
    ${p}${h}
  </section>`}function R(s,e,n){const a=s.kind==="exam",o=a?t("tl.exam"):s.title,l=x(s),c=l.length&&l.length<=5&&l.every(B=>B.length===1),r=s.status==="locked",p=a?"exam":s.status==="done"?"done":r?"locked":"current",h=r||a?"":`<span class="tl-face">${c?d(l.join("").toUpperCase()):u("book",22)}</span>`,[i,$]=k[Math.min(e,k.length-1)],m=`${a?t("tl.exam"):t("tl.lessonN",{n:e+1})}: ${d(s.title)}${s.status==="done"?`, ${t("app.stars",{n:s.stars})}`:r?` (${t("tl.locked")})`:""}`,b=`<img src="${y(p)}" alt="" draggable="false">${h}`,w=!(c&&!r);return`<div class="tl-spot is-${s.status}${a?" is-exam":""}" style="left:${i}%;top:${$}%">
    ${n?`<img class="tl-spot-kibi" src="${v("oddiy")}" alt="" draggable="false">`:""}
    ${r?`<span class="tl-tile" aria-label="${m}">${b}</span>`:`<a class="tl-tile" href="#/typing-lessons/${s.id}" aria-label="${m}">${b}</a>`}
    <div class="tl-spot-lbl ${i<50?"is-r":"is-l"}">
      ${w?`<b>${d(o)}</b>`:""}
      ${s.status==="done"?`<span class="tl-spot-stars">${D(s.stars,13)}</span>`:""}
      ${n?`<a class="tl-spot-go" href="#/typing-lessons/${s.id}" tabindex="-1">${t("home.start")}</a>`:""}
    </div>
  </div>`}export{U as mountTypingMap};
