import{c as v,s as w,i as d}from"./it-k2Rlh6E3.js";import{h as x,a as S,s as M,t,e as h}from"./index-DfktTF05.js";const u=[8,62,22,70,4,48,14,56],m=262,y=e=>e==="current"?104:80,L=(e,s)=>e+146-y(s)/2;async function H(e,s={}){const i=x('<section class="it"><div class="skeleton it-skel" aria-busy="true"></div></section>');e.replaceChildren(i);let o;try{o=await S.get("/it/path")}catch(n){return M(n),i.innerHTML=`<div class="it-empty"><p>${t("tl.loadFail")}</p><a class="btn btn--ghost" href="#/">${t("app.backShort")}</a></div>`,()=>{}}return C(i,o,s.opened),()=>{}}function C(e,{sections:s,stats:i},o){if(!s.length){e.innerHTML=`${k(i)}<div class="it-empty"><img src="${v("locked")}" alt="" width="96" height="96">
      <p>${t("it.soon")}</p><a class="btn btn--ghost" href="#/">${t("ty.home")}</a></div>`;return}const n=s.map(w);let a=n.indexOf("current");a<0&&(a=s.length-1);const l=s[a],r=s.some(c=>c.done>0),$=n.every(c=>c==="done"),g=Math.min(100,Math.round(i.today/i.goal*100));e.innerHTML=`
    <div class="it-main">
      ${k(i)}
      <div class="it-sec">
        <div class="it-sec-t"><span>${t("it.secN",{n:a+1}).toUpperCase()}${l.method?` · ${h(l.method.toUpperCase())}`:""}</span><b>${h(l.title)}</b></div>
        <div class="it-prog"><div class="it-bar"><i style="width:${Math.round(l.done/l.lessons.length*100)}%"></i></div>
          <span>${l.done} / ${l.lessons.length}</span></div>
      </div>
      <div class="it-road" role="list" aria-label="${t("it.road")}">${q(s,n,o)}</div>
      ${s.length>3?`<div class="it-swipe" aria-hidden="true">${d("left",16)}${t("it.swipe")}${d("right",16)}</div>`:""}
    </div>
    <aside class="it-side">
      <div class="it-tiles">
        <div class="it-tile is-fire"><b>${i.streak}</b><span>${t("it.streak")}</span></div>
        <div class="it-tile is-xp"><b>${i.xp}</b><span>XP</span></div>
      </div>
      <div class="it-card it-goal">
        <h2>${t("it.goal")}</h2>
        <div class="it-prog"><div class="it-bar is-ink"><i style="width:${g}%"></i></div><span>${Math.min(i.today,i.goal)} / ${i.goal} ${t("it.topics")}</span></div>
        ${i.today>=i.goal?`<p class="it-done">${t("it.goalDone")}</p>`:""}
      </div>
      <div class="it-card it-secs">
        <h2>${t("tp.sections")}</h2>
        <ul>${s.map((c,f)=>n[f]==="locked"?`<li class="is-off"><span>${f+1}. ${h(c.title)}</span><span class="it-lock" aria-label="${t("tl.locked")}">${d("lock",18)}</span></li>`:`<li><a href="#/it/section/${c.id}">${f+1}. ${h(c.title)}</a><b>${c.done} / ${c.lessons.length}</b></li>`).join("")}</ul>
      </div>
      ${$?`<p class="it-alldone">${t("it.allDone")}</p>`:`<a class="btn it-go" href="#/it/section/${l.id}">${r?t("tl.continue"):t("home.start")}</a>`}
    </aside>`;const p=e.querySelector(".it-road"),b=p.querySelector(".is-opening")||p.querySelector(".is-current");b&&(p.scrollLeft=b.offsetLeft-(p.clientWidth-b.offsetWidth)/2)}function k(e){return`<div class="it-head">
    <a class="it-back" href="#/" aria-label="${t("app.backShort")}">${d("left",20)}</a>
    <h1>${t("home.it")}</h1>
    <div class="it-pills">
      <span class="it-pill is-fire" title="${t("pf.streak")}">${d("fire",16)}<b>${e.streak}</b><span class="sr">${t("it.streak")}</span></span>
      <span class="it-pill is-xp" title="XP">${d("star",16)}<b>${e.xp}</b><span class="sr">XP</span></span>
    </div>
  </div>`}function q(e,s,i){const o=[];let n=null;return e.forEach((a,l)=>{const r=u[l%u.length],$=L(r,s[l]);n!=null&&o.push(`<svg class="it-link" aria-hidden="true" width="22" height="${m}" viewBox="0 0 22 ${m}"><path d="M-6 ${n} C 11 ${n}, 11 ${$}, 28 ${$}"/></svg>`),o.push(P(a,l,s[l],r,i===a.id)),n=$}),o.join("")}function P(e,s,i,o,n){const a=y(i),l=i==="done"?t("it.conquered"):i==="locked"?`${e.lessons.length} ${t("it.topics")}`:`${e.done} / ${e.lessons.length} ${t("it.topics")}`,r=i==="done"?`<span class="it-badge is-ok" aria-hidden="true">${d("check",16)}</span>`:i==="locked"?`<span class="it-badge is-lock" aria-hidden="true">${d("lock",14)}</span>`:"",$=`<img src="${v("open")}" alt="" width="${a}" height="${a}" draggable="false">
    ${n?`<img class="it-was" src="${v("locked")}" alt="" width="${a}" height="${a}" draggable="false">`:""}${r}`,g=`${t("it.secN",{n:s+1})}: ${h(e.title)}${i==="done"?` (${t("it.conquered").toLowerCase()})`:i==="locked"?` (${t("tl.locked")})`:""}`,p=i==="locked"?`<span class="it-art" style="width:${a}px;height:${a}px" role="img" aria-label="${g}"><img src="${v("locked")}" alt="" width="${a}" height="${a}" draggable="false">${r}</span>`:`<a class="it-art" style="width:${a}px;height:${a}px" href="#/it/section/${e.id}" aria-label="${g} — ${t("home.enter").toLowerCase()}">${$}</a>`;return`<div class="it-c is-${i}${n?" is-opening":""}" role="listitem" style="padding-top:${o}px">
    ${i==="current"?`<span class="it-now">${t("it.current")}</span>`:'<span class="it-now is-empty"></span>'}
    <div class="it-box">${p}</div>
    <b>${h(e.title)}</b><small>${l}</small>
  </div>`}export{H as mountItPath};
