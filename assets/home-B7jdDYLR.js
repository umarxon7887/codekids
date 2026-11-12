const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/profile-HYBJqgxQ.js","assets/index-DfktTF05.js","assets/index-CMtrLwpu.css","assets/coin-Cn2J1bH2.js","assets/profile-CWIoCVcP.css"])))=>i.map(i=>d[i]);
import{t as s,h as b,l as $,e as r,b as y,_ as k,a as d,d as v,f,g as w}from"./index-DfktTF05.js";/* empty css             */import{a as u}from"./coin-Cn2J1bH2.js";const M={logo:'<path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>',kb:'<rect x="2" y="6" width="20" height="12" rx="3"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',maze:'<path d="M3 3h18v18H3zM8 3v8h8M16 21v-6M3 14h5"/>',term:'<path d="M4 17l6-5-6-5M12 19h8"/>',blocks:'<rect x="3" y="4" width="11" height="6" rx="2"/><rect x="7" y="14" width="14" height="6" rx="2"/><path d="M8 10v4"/>'},i=(c,o=26,n=2)=>`<svg aria-hidden="true" width="${o}" height="${o}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${n}" stroke-linecap="round" stroke-linejoin="round">${M[c]}</svg>`;function g(c){let o={};try{o=JSON.parse(localStorage.getItem(`ck_kl_${c?.id??"guest"}`)||"{}")||{}}catch{}const n=Object.keys(o).length,l=Object.values(o).reduce((h,a)=>h+(Number(a)||0),0);return n?s("home.klProgress",{done:n,stars:l}):s("home.klD")}function S(c,o,n){const l=o.nickname||s("app.friend"),h=b(`
    <section class="hm">
      <header class="hm-top">
        <div class="hm-brand"><span class="hm-logo">${i("logo",22,2.2)}</span>CodeKids</div>
        <div class="hm-right">
          ${$()}
          <a class="ck-coins hm-coins" href="#/typing-lessons" title="${s("home.coins")}" hidden>${u(22)}<b>0</b><span class="sr">coin</span></a>
          <button class="hm-me" id="me"><span class="hm-ava">${r(l[0].toUpperCase())}</span>${r(l)}</button>
          <button class="btn btn--ghost hm-out hm-out--top" data-out>${s("app.logout")}</button>
        </div>
      </header>
      <div class="hm-hi"><h1>${s("home.hi",{name:r(l)})}</h1><p>${s("home.today")}</p></div>
      <div class="hm-cards">
        <a class="hm-card" href="#/typing" style="background:var(--sky)">
          <span class="hm-ic" style="color:#1F5C8A">${i("kb")}</span>
          <b>Typing Race</b><span class="d" style="color:#3F5566">${s("home.raceD")}</span>
          <span class="hm-go">${s("home.start")}</span>
        </a>
        <a class="hm-card" href="#/typing-lessons" style="background:var(--butter)">
          <span class="hm-row"><span class="hm-ic">${u(34)}</span><span class="hm-new" style="color:#7A5A00">${s("home.new")}</span></span>
          <b>${s("home.tl")}</b><span class="d" data-tl style="color:#6B4E00">${s("home.tlD")}</span>
          <span class="hm-go">${s("home.toLessons")}</span>
        </a>
        <form class="hm-card" id="join" style="background:var(--mint)" novalidate>
          <span class="hm-ic" style="color:#1F5C41">${i("maze")}</span>
          <b>${s("home.join")}</b><span class="d" style="color:#335646">${s("home.joinD")}</span>
          <div class="hm-join">
            <input id="code" maxlength="6" placeholder="${s("home.codePh")}" inputmode="numeric" pattern="[0-9]*" autocomplete="off" aria-label="${s("home.codeLabel")}">
            <button class="btn" type="submit">${s("home.enter")}</button>
          </div>
        </form>
        <a class="hm-card" href="#/kod-labirint" style="background:var(--peach)">
          <span class="hm-row"><span class="hm-ic" style="color:#2F63C9">${i("blocks")}</span><span class="hm-new" style="color:#2F63C9">${s("home.new")}</span></span>
          <b>${s("home.kl")}</b><span class="d" data-kl style="color:#3F5566">${g(o)}</span>
          <span class="hm-go">${s("home.start")}</span>
        </a>
        <button class="hm-card" id="it" style="background:var(--lav)">
          <span class="hm-row"><span class="hm-ic" style="color:#5B45B0">${i("term")}</span><span class="hm-new">${s("home.new")}</span></span>
          <b>${s("home.it")}</b><span class="d" style="color:#4A3D80">${s("home.itD")}</span>
        </button>
      </div>
      <button class="btn btn--ghost hm-out" data-out>${s("app.logout")}</button>
    </section>`),a=t=>h.querySelector(t),p=async()=>{await v.logout(),f(),n()};return h.querySelectorAll("[data-out]").forEach(t=>{t.onclick=p}),a("#join").onsubmit=t=>{t.preventDefault();const e=a("#code").value.trim().toUpperCase();if(e.length!==6){y(s("home.code6"),"error"),a("#code").focus();return}location.hash=`#/room/${e}`},a("#it").onclick=()=>{location.hash="#/it"},a("#me").onclick=async()=>{const{openProfile:t}=await k(async()=>{const{openProfile:e}=await import("./profile-HYBJqgxQ.js");return{openProfile:e}},__vite__mapDeps([0,1,2,3,4]));t({onLogout:p,onChange:e=>{const m=e.nickname||s("app.friend");a("#me").innerHTML=`<span class="hm-ava">${r(m[0].toUpperCase())}</span>${r(m)}`,a(".hm-hi h1").textContent=s("home.hi",{name:m})}})},c.replaceChildren(h),d.get("/typing-lessons",{query:{lang:w()}}).then(({stats:t})=>{const e=a(".hm-coins");e.querySelector("b").textContent=String(t.coins),e.hidden=!1,a("[data-tl]").textContent=t.done?s("home.tlProgress",t):s("home.tlD")}).catch(()=>{}),d.get("/kodlab").then(({progress:t})=>{try{localStorage.setItem(`ck_kl_${o?.id??"guest"}`,JSON.stringify(t))}catch{}a("[data-kl]").textContent=g(o)}).catch(()=>{}),()=>{}}export{S as mountHome};
