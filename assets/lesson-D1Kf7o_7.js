import{k as N,i as f,s as R,h as Q,f as V}from"./common-DR30kViI.js";import{h as X,a as A,s as W,t,e as k,B as Y}from"./index-DfktTF05.js";import{c as tt,a as st}from"./coin-Cn2J1bH2.js";const B={keys:t("tl.s.keys"),words:t("tl.s.words"),text:t("tl.s.text")},et={lesson:t("tl.c.lesson"),exam:t("tl.c.exam"),star:t("tl.c.star"),daily:t("tl.c.daily")},lt={"’":"'","‘":"'",ʻ:"'",ʼ:"'","`":"'","“":'"',"”":'"',"«":'"',"»":'"'},at=d=>lt[d]||d;async function rt(d,u){const p=l=>`#/typing-lessons${l?`?opened=${l}`:""}`,n=X('<section class="tlx"><div class="skeleton tl-skel" aria-busy="true"></div></section>');d.replaceChildren(n);let b=()=>{},h=!0;async function w(){b(),n.innerHTML='<div class="skeleton tl-skel" aria-busy="true"></div>';let l;try{l=await A.post("/typing-lessons/attempts",{lesson_id:u})}catch(s){W(s),n.innerHTML=`<div class="tl-empty"><p>${s.code==="LESSON_LOCKED"?t("tl.lockedMsg"):t("tl.openFail")}</p>
        <a class="btn btn--ghost" href="${p()}">${t("tl.map")}</a></div>`;return}h&&x(l)}function x(l){const s=l.lesson,a=s.kind==="exam",i=s.keys.filter($=>$!=="shift"),o=i.map($=>`<b>${k($.toUpperCase())}</b>`).join(", "),v=a?t("tl.i.exam",{w:s.wpm,a:l.rules.pass_accuracy}):i.length?t("tl.i.keys",{keys:o}):s.keys.includes("shift")?t("tl.i.shift"):t("tl.i.words"),r=a?s.wpm+5:s.wpm;n.innerHTML=`
      ${C(s,null,l.steps.length)}
      <div class="tlx-intro">
        <span class="tlx-tag">${t("app.level",{n:s.level})} · ${k(s.level_title)}</span>
        <div class="tlx-kibi">
          <img src="${Y}it/kibi/${a?"usta":"tushuntirish"}.webp" alt="" draggable="false">
          <p class="tl-bubble">${v}</p>
        </div>
        ${s.keys.length?`<div class="tlx-card"><h3>${t("tl.i.kbTitle")}</h3>${N(s.keys,s.lang)}</div>`:""}
        <div class="tlx-card"><h3>${a?t("tl.i.examTitle"):t("tl.i.steps",{n:l.steps.length})}</h3>
          <div class="tlx-steps">${l.steps.map(($,m)=>`<div><em>${m+1}</em><b>${a?t("tl.i.examText"):B[$.kind]}</b></div>`).join("")}</div>
        </div>
        <div class="tlx-card"><h3>${t("tl.i.goal")}</h3>
          <div class="tlx-goal"><span class="is-pass">${f("target",22)}</span><div><b>${a?t("tl.i.passExam",{w:s.wpm,a:l.rules.pass_accuracy}):t("tl.i.pass",{a:l.rules.pass_accuracy})}</b><small>${a?t("tl.i.passExamS"):t("tl.i.passS")}</small></div></div>
          <div class="tlx-goal"><span class="is-star">${f("star",22)}</span><div><b>${t("tl.i.stars",{w:r})}</b><small>${a?t("tl.i.coinsExam"):t("tl.i.coins")}</small></div></div>
          ${s.stars?`<p class="tlx-best">${t("tl.prev")}: ${R(s.stars,16)} · ${s.best_wpm} ${t("app.wpm")}</p>`:""}
        </div>
        <p class="tl-tip">${f("bulb",20)}<span>${t("tl.r.cursor")}</span></p>
        <p class="tl-tip is-sky">${f("kb",20)}<span>${t(s.lang==="ru"?"tl.r.homeRu":"tl.r.homeUz")}</span></p>
        <div class="tlx-startbar"><button class="tl-chunky tlx-start" type="button">${t("home.start")}</button></div>
      </div>`,n.querySelector(".tlx-start").onclick=()=>L(l,0),n.querySelector(".tlx-start").focus({preventScroll:!0})}function L(l,s){b();const a=l.lesson,i=l.steps[s].text;n.innerHTML=`
      ${C(a,s,l.steps.length)}
      <div class="tlx-play">
        <div class="tlx-live">
          <span><b data-wpm>0</b> ${t("app.wpm")}</span>
          <span><b data-acc>100</b>% ${t("tl.acc")}</span>
          <span><b data-err>0</b> ${t("tl.err")}</span>
        </div>
        <div class="tlx-text" tabindex="-1">
          <div class="tlx-chars">${[...i].map(e=>`<span${e===" "?' class="sp"':""}>${k(e)}</span>`).join("")}</div>
          <input class="tlx-input" type="text" autocomplete="off" autocorrect="off" autocapitalize="none" spellcheck="false" enterkeyhint="next" aria-label="${t("tl.typeHere")}">
        </div>
        <p class="tlx-hint" aria-live="polite"><span data-hint></span></p>
        ${N(a.keys,a.lang)}
        <p class="tlx-tap">${t("tl.tap")}</p>
      </div>`;const o=[...n.querySelectorAll(".tlx-chars span")],v=n.querySelector(".tlx-input"),r=n.querySelector(".tlx-text"),$=n.querySelector(".tl-kb"),m=n.querySelector("[data-wpm]"),F=n.querySelector("[data-acc]"),P=n.querySelector("[data-err]"),Z=n.querySelector("[data-hint]");let c=0,S=0,_=0,M=null,D=!1,y="",E=0,O=0;const j=()=>{if(o.forEach((e,g)=>e.classList.toggle("is-done",g<c)),o[c-1]?.classList.remove("is-cur","is-bad"),o[c]){o[c].classList.add("is-cur");const e=o[c].offsetTop;(e>r.scrollTop+r.clientHeight-40||e<r.scrollTop)&&(r.scrollTop=Math.max(0,e-40))}Q($,c<i.length?i[c]:null,a.lang),Z.textContent=c<i.length?V(i[c],a.lang):""},I=()=>{if(!_)return;const e=Math.max((Date.now()-_)/6e4,1/60);m.textContent=String(Math.round(c/5/e)),F.textContent=String(Math.floor(c/Math.max(c+S,1)*100)),P.textContent=String(S)};function T(e){if(D)return;const g=at(e);if(_||(_=Date.now(),M=A.post(`/typing-lessons/attempts/${l.attempt_id}/steps/${s}/begin`),M.catch(()=>{}),E=setInterval(I,500)),g===i[c])c+=1,j(),c===i.length&&G();else{S+=1;const H=o[c];H.classList.remove("is-bad"),H.offsetWidth,H.classList.add("is-bad")}I()}async function G(){D=!0,clearInterval(E),v.blur();try{await M;const e=await A.post(`/typing-lessons/attempts/${l.attempt_id}/steps/${s}`,{typed:i,errors:S});if(!h)return;e.finished?z(l,e.result):U(l,s,e.step)}catch(e){if(W(e),!h)return;n.querySelector(".tlx-play").insertAdjacentHTML("beforeend",`<div class="tlx-fail"><p>${t("tl.sendFail")}</p><button class="btn" type="button" data-restart>${f("redo",18)}${t("tl.restart")}</button></div>`),n.querySelector("[data-restart]").onclick=w}}const K=e=>{if(!(e.ctrlKey||e.metaKey||e.altKey)){if(e.key==="Escape"){location.hash=p();return}if(e.key.length!==1){(e.key==="Backspace"||e.key==="Tab"||e.key==="Enter")&&e.preventDefault();return}e.preventDefault(),O=Date.now(),T(e.key)}},J=()=>{const e=v.value;if(Date.now()-O<80){y=e;return}if(e.length>y.length&&e.startsWith(y))for(const g of e.slice(y.length))T(g);else e.length>y.length&&T(e[e.length-1]);y=e,e.length>60&&(v.value="",y="")},q=()=>v.focus({preventScroll:!0});r.addEventListener("click",q),n.querySelector(".tlx-tap").addEventListener("click",q),document.addEventListener("keydown",K),v.addEventListener("input",J),b=()=>{document.removeEventListener("keydown",K),clearInterval(E),b=()=>{}},j(),q()}function U(l,s,a){b();const i=s+1;n.innerHTML=`
      ${C(l.lesson,s,l.steps.length,!0)}
      <div class="tlx-between">
        <h2>${a.accuracy>=95?t("tl.great"):a.accuracy>=90?t("tl.good"):t("tl.keepOn")}</h2>
        <div class="tlx-nums">
          <div><b>${Math.round(a.wpm)}</b><span>${t("app.wpm")}</span></div>
          <div><b>${Math.floor(a.accuracy)}%</b><span>${t("tl.acc")}</span></div>
          <div><b>${a.errors}</b><span>${t("tl.err")}</span></div>
        </div>
        ${a.accuracy<90?`<p class="tlx-warn">${t("tl.low90")}</p>`:""}
        <button class="btn btn--big" type="button">${t("tl.stepN",{n:i+1})}: ${B[l.steps[i].kind]}</button>
      </div>`;const o=n.querySelector(".tlx-between .btn");o.onclick=()=>L(l,i),o.focus()}function z(l,s){b();const a=l.lesson,i=a.kind==="exam",o=s.next_lesson_id?`#/typing-lessons/${s.next_lesson_id}`:p(),v=s.coins.map(m=>`<li><span>${et[m.reason]||m.reason}</span><b>+${m.amount}</b></li>`).join("");let r;s.flagged?r=t("tl.t.flagged"):s.passed?s.level_unlocked?r=t("tl.t.unlocked",{n:s.level_unlocked}):r=s.stars===3?t("tl.t.perfect"):t("tl.t.passed"):r=i&&s.accuracy>=90?t("tl.t.slow"):t("tl.t.again");const $=s.flagged?t("tl.w.flagged"):s.passed?s.stars<3?s.accuracy<98?t("tl.w.star98"):t("tl.w.starWpm",{w:i?a.wpm+5:a.wpm}):"":i&&s.accuracy>=90?t("tl.w.slow",{w:a.wpm}):t("tl.w.acc",{a:l.rules.pass_accuracy});n.innerHTML=`
      <div class="tlx-top"><a class="tl-back" href="${p()}" aria-label="${t("tl.map")}">${f("x",20)}</a><b>${k(i?t("tl.exam"):a.title)}</b>${tt(s.coins_total)}</div>
      <div class="tlx-res ${s.passed?"is-pass":"is-fail"}">
        ${R(s.stars,46,"tlx-bigstars")}
        <h1>${r}</h1>
        ${$?`<p class="tlx-why">${$}</p>`:""}
        <div class="tlx-nums">
          <div><b>${Math.round(s.wpm)}</b><span>${t("app.wpm")}</span></div>
          <div><b>${Math.floor(s.accuracy)}%</b><span>${t("tl.acc")}</span></div>
          <div><b>${nt(s.time_sec)}</b><span>${t("tl.time")}</span></div>
        </div>
        ${s.coins_earned?`<div class="tlx-coins">
            <div class="tlx-coin-big">${st(64,"is-pop")}<b>+${s.coins_earned}</b></div>
            <ul>${v}</ul>
          </div>`:s.passed?`<p class="tlx-why">${t("tl.coinTaken")}</p>`:""}
        <div class="tlx-acts">
          ${s.passed&&s.next_lesson_id?`<a class="btn btn--big" href="${o}">${t("tl.next")}</a>`:""}
          <button class="btn ${s.passed?"btn--ghost":"btn--big"}" type="button" data-again>${f("redo",18)}${t("app.retry")}</button>
          <a class="btn btn--ghost" href="${p(s.level_unlocked)}">${f("map",18)}${t("tl.map")}</a>
        </div>
      </div>`,n.querySelector("[data-again]").onclick=w,n.querySelector(".tlx-acts a.btn--big")?.focus()}return w(),()=>{h=!1,b()}}function C(d,u,p,n=!1){const b="#/typing-lessons",h=Array.from({length:p},(w,x)=>`<i class="${(u==null?"":x<u||x===u&&n?" is-done":x===u?" is-cur":"").trim()}"></i>`).join("");return`<div class="tlx-top">
    <a class="tl-back" href="${b}" aria-label="${t("tl.exit")}">${f("x",20)}</a>
    <b>${k(d.kind==="exam"?t("tl.examOf",{n:d.level}):d.title)}</b>
    <span class="tlx-dots" aria-label="${u==null?p:u+1} / ${p} ${t("tl.steps")}">${h}</span>
  </div>`}function nt(d){const u=Math.floor(d/60),p=d%60;return u?`${u}:${String(p).padStart(2,"0")}`:`${p} ${t("tl.sec")}`}export{rt as mountTypingLesson};
