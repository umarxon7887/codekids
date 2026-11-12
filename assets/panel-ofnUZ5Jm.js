/* empty css             */import{a as T,b as K,s as N,e as k,h as ga,B as xa,c as Ha,d as Ia,f as Ca}from"./index-DfktTF05.js";import{i as p,y as Ya,a as Ka,b as ka}from"./it-k2Rlh6E3.js";import{r as Fa,a as Ua}from"./lesson-C1-rVjWO.js";async function fa(h){try{return await T.del(h),K("O'chirildi"),!0}catch(n){if(n.code!=="HAS_PROGRESS"&&n.code!=="TOOL_IN_USE")return N(n),!1;if(!confirm(`${n.message}

Baribir o'chirilsinmi?`))return!1;try{return await T.del(h,{query:{force:1}}),K("O'chirildi"),!0}catch(d){return N(d),!1}}}const La="ck.ad.fold",Sa=()=>{try{return JSON.parse(localStorage.getItem(La)||"{}")||{}}catch{return{}}},X={get(h,n=!1){const d=Sa()[h];return typeof d=="boolean"?d:n},set(h,n){try{const d=Sa();d[h]=n,localStorage.setItem(La,JSON.stringify(d))}catch{}}},Ra=1280,Pa=450*1024;function za(h,n,d){return new Promise(u=>h.toBlob(u,n,d))}async function Qa(h){const n=await createImageBitmap(h,{imageOrientation:"from-image"}).catch(()=>null);if(!n)throw new Error("decode");let d=Ra;for(let u=0;u<4;u++){const s=Math.min(1,d/Math.max(n.width,n.height)),m=Math.max(1,Math.round(n.width*s)),v=Math.max(1,Math.round(n.height*s)),w=document.createElement("canvas");w.width=m,w.height=v;const x=w.getContext("2d");x.fillStyle="#fff",x.fillRect(0,0,m,v),x.drawImage(n,0,0,m,v);const b=u===0?.82:.72;let z=await za(w,"image/webp",b);if((!z||z.type!=="image/webp")&&(z=await za(w,"image/jpeg",b+.05)),z&&(z.size<=Pa||u===3))return n.close?.(),{blob:z,width:m,height:v};d=Math.round(d*.75)}throw new Error("size")}function Va(h={}){return new Promise(n=>{const d=document.createElement("input");d.type="file",d.accept="image/png,image/jpeg,image/webp,image/gif",d.onchange=async()=>{const u=d.files?.[0];if(!u){n(null);return}h.onStart?.(),n(await Ga(u))},d.addEventListener("cancel",()=>n(null)),d.click()})}async function Ga(h){if(!/^image\//.test(h.type))return K("Faqat rasm fayli (PNG, JPEG, WebP)"),null;let n;try{n=await Qa(h)}catch{return K("Rasmni ochib bo'lmadi. Boshqa rasm tanlang."),null}const d=new FormData;d.append("width",String(n.width)),d.append("height",String(n.height)),d.append("file",n.blob,n.blob.type==="image/webp"?"rasm.webp":"rasm.jpg");try{const{image:u}=await T.post("/it/manage/images",d);return u}catch(u){return N(u),null}}const _a=12,Wa=[["general","Umumiy savol"],["predict","Nima bo'ladi?"],["error","Xatoni top"],["odd","Ortiqchasini top"],["analogy","Hayotdan o'xshatish"]],Ea={choice:"Tanlash",order:"Tartiblash",match:"Moslashtirish",sort:"Saralash",typing:"Typing",maze:"Labirint"},Ja=[["salom","Salom"],["oylash","O'ylayapti / savol"],["maqtash","Maqtayapti"],["oddiy","Oddiy turibdi"],["tushuntirish","Tushuntiryapti"],["usta","Usta"],["galaba","G'alaba"],["dalda","Dalda beryapti"]],Ma=8,Xa=/^it\/video\/[a-z0-9-]{1,60}\.mp4$/,Za=()=>({welcome_back:"Yana xush kelibsan, {ism}!",lines:[{pose:"salom",text:"Salom! Men Kibi, kiber bolakayman. Isming nima?",ask_name:!0,first_only:!0,buttons:[{label:"Davom",reply:""}]},{pose:"oylash",text:"Tanishganimdan xursandman, {ism}! IT ni o'rganishga qaror qildingmi?",ask_name:!1,first_only:!0,buttons:[{label:"Ha!",reply:"Barakalla, {ism}! Bu juda to'g'ri qaror.",reply_pose:"maqtash"},{label:"Hali bilmayman",reply:"Hechqisi yo'q! Keling, birga sinab ko'ramiz. Senga yoqib qolishiga ishonaman.",reply_pose:"dalda"}]},{pose:"tushuntirish",text:"Unday bo'lsa, kel 1-mavzumizni boshlaymiz! Bilasanmi, kompyuterni yoqish tugmasini bosganingda ichida nimalar bo'ladi? Kel, birga ko'ramiz!",ask_name:!1,first_only:!1,buttons:[{label:"Ketdik!",reply:""}]}]}),at=()=>({pose:"oddiy",text:"",ask_name:!1,first_only:!1,buttons:[]}),Ta=["S.#..",".##.#","...#.","#.#..","#...G"],tt={choice:()=>({type:"choice",kind:"general",prompt:"",options:["",""],answer:0,explain:""}),order:()=>({type:"order",prompt:"",items:["","",""],explain:""}),match:()=>({type:"match",prompt:"",pairs:[["",""],["",""]],explain:""}),sort:()=>({type:"sort",prompt:"",groups:["",""],items:["","",""],item_groups:[0,0,1],explain:""}),typing:()=>({type:"typing",prompt:"Quyidagi matnni xatosiz yoz",text:"",min_accuracy:90,case_sensitive:!1,explain:""}),maze:()=>({type:"maze",prompt:"Qahramonni qasrga olib bor",mode:"program",grid:Ta.slice(),max_commands:null,explain:""})},et=[["#","Buta (devor)"],[".","Yo'l"],["S","Qahramon"],["G","Qasr"]],ha=(h,n)=>n.split(".").reduce((d,u)=>d==null?d:d[u],h);function ca(h,n,d){const u=n.split(".");let s=h;u.slice(0,-1).forEach((m,v)=>{s[m]==null&&(s[m]=/^\d+$/.test(u[v+1])?[]:{}),s=s[m]}),s[u[u.length-1]]=d}const ua=(h,n,d,u)=>{const s=Math.round(Number(h));return h===""||h==null||Number.isNaN(s)?u:Math.min(d,Math.max(n,s))},J=(h,n=70)=>{const d=String(h||"").replace(/\s+/g," ").trim();return d.length>n?`${d.slice(0,n-1)}…`:d};function st(h,n){const d=n.lesson.id,u=t=>({title:t.title,kind:t.kind,term:t.term||"",tool_id:t.tool_id||null,minutes:t.minutes,xp:t.xp,content:{story:"",exercises:[],term_text:"",...structuredClone(t.content||{})}});let s=u(n.lesson),m=n.lesson.is_published,v=JSON.stringify(s),w=!1,x="story",b=[];const z=()=>JSON.stringify(s)!==v;n.setDirty(z);const I=n.lesson.learners;let A=new WeakSet;s.content.exercises.length>2&&s.content.exercises.forEach(t=>A.add(t));const F=new WeakMap,B=(t,a,e,l,{n:c,sub:o,def:$=!1}={})=>`
    <section class="ad-card ad-fold${X.get(t,$)?" is-folded":""}" data-fold="${t}" data-step="${a}">
      <button type="button" class="ad-fold-h" data-fold-btn="${t}" aria-expanded="${!X.get(t,$)}">
        ${c?`<span class="ad-n">${c}</span>`:""}<span class="ad-fold-t">${e}${o?` <small>${o}</small>`:""}</span>
        <span class="ad-fold-sum" data-sum="${t}"></span><span class="ad-fold-ic">${p("down",18)}</span>
      </button>
      <div class="ad-card-b">${l}</div>
    </section>`,P=(t,a="Rasm qo'shish")=>`<div class="ad-img" data-img="${t}" data-label="${a}"></div>`;h.innerHTML=`
    <div class="ad-ed">
      <div class="ad-ed-main">
        <header class="ad-ed-head">
          <div class="ad-crumb"><a href="#/admin/section/${n.section.id}" data-go="/section/${n.section.id}">${p("castle",16)}${k(n.section.title)}</a>
            <span>›</span><span>${n.position+1}-eshik</span>${I?`<span class="ad-meta">· ${I} o'quvchi tugatgan</span>`:""}</div>
          <input class="ad-title-in" data-f="title" maxlength="120" aria-label="Mavzu nomi" placeholder="Mavzu nomi">
          <div class="ad-ed-bar">
            <span class="ad-status" data-status></span>
            <span class="ad-save-st" role="status" aria-live="polite"></span>
            <span class="ad-sp"></span>
            <button type="button" class="btn btn--ghost ad-btn-sm ad-pv-btn" data-pv-open>${p("eye",18)}Ko'rish</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-pub></button>
            <button type="button" class="btn ad-btn-sm" data-save>Saqlash</button>
          </div>
        </header>
        <div class="ad-issues" role="alert" hidden></div>
        <p class="ad-note" data-live-note hidden>${p("bulb",18)}<span>Bu mavzu e'lon qilingan: saqlaganingizda o'zgarish darhol o'quvchilarga ko'rinadi.</span></p>
        <div class="ad-ed-tools"><button type="button" class="ad-mini ad-foldall" data-fold-all>${p("fold",16)}<span>Hammasini yig'ish</span></button></div>

        ${B("basic","story","Asosiy",`
          <fieldset class="ad-seg"><legend>Turi</legend>
            <label><input type="radio" name="kind" data-f="kind" value="lesson"><span>${p("door",18)}Oddiy mavzu</span></label>
            <label><input type="radio" name="kind" data-f="kind" value="test"><span>${p("star",18)}Bo'lim testi (tojli eshik)</span></label>
          </fieldset>
          <div class="ad-grid">
            <label class="ad-f"><span>Davomiyligi <small>daqiqa</small></span><input type="number" min="1" max="60" data-f="minutes"></label>
            <label class="ad-f"><span>XP <small>birinchi marta tugatganda</small></span><input type="number" min="0" max="1000" data-f="xp"></label>
            <label class="ad-f"><span>Termin <small>yakunda «bugun o'rgangan so'zing»</small></span><input maxlength="80" data-f="term" placeholder="Masalan: Algoritm"></label>
            <label class="ad-f" data-step="tool"><span>Fikrlash quroli <small><a href="#/admin/tools" data-go="/tools">qurollar</a></small></span>
              <select data-f="tool_id"><option value="">Yo'q</option>${n.tools.map(t=>`<option value="${t.id}">${k(t.name)}</option>`).join("")}</select></label>
          </div>`)}

        ${B("dialog","dialog","Kibi dialogi",`
          <div class="ad-dlg"></div>`,{sub:"ixtiyoriy: qahramon bola bilan gaplashadi, butun dars bo'ylab chiqadi"})}

        ${B("story","story","Hikoya",`
          <textarea data-f="content.story" rows="4" maxlength="1500" aria-label="Hikoya matni" placeholder="Masalan: Oshpaz sho'rva pishirmoqchi. U nimadan boshlaydi?"></textarea>
          <span class="ad-count" data-count="content.story" data-max="1500"></span>
          ${P("content.story_image")}`,{n:1,sub:"vaziyat: bola nimani hal qiladi"})}

        ${B("video","video","Video",`
          <div class="ad-video">
            <div class="ad-video-f">
              <label class="ad-f"><span>Sayt fayli <small>frontend/public ichida, masalan it/video/1-eshik.mp4</small></span>
                <input data-f="content.video.file" data-video-file placeholder="it/video/1-eshik.mp4" autocomplete="off" spellcheck="false"></label>
              <label class="ad-f"><span>yoki YouTube havolasi</span>
                <input data-video-url inputmode="url" placeholder="https://youtu.be/..." autocomplete="off"></label>
              <label class="ad-check"><input type="checkbox" data-f="content.video.check" data-video-check><span>Video tugagach Kibi «Tushundingmi?» deb so'rasin <small>«Yo'q» bo'lsa yordamchi karta va video qayta</small></span></label>
              <label class="ad-f"><span>Video sarlavhasi <small>ixtiyoriy</small></span><input maxlength="120" data-f="content.video.title" data-video-title></label>
              <p class="ad-hint" data-video-msg></p>
            </div>
            <div class="ad-thumb" data-video-thumb hidden></div>
          </div>
          <p class="ad-hint">Sayt fayli tavsiya etiladi: reklama yo'q va «Davom» video oxirigacha ko'rilgandan keyin ochiladi. Yonida bir xil nomli .jpg muqova bo'lsa, u ko'rinadi. YouTube uchun videoni «Ro'yxatsiz» (Unlisted) qilib yuklang.</p>`,{n:2,sub:"ixtiyoriy, hikoyadan keyin chiqadi"})}

        ${B("helper","helper","Yordamchi karta",`
          <label class="ad-f"><span>Sarlavha</span><input maxlength="80" data-f="content.helper.title" placeholder="Masalan: Oshpaz kabi o'yla"></label>
          <label class="ad-f"><span>Matn <small>har qadamni yangi qatorga yozsangiz, raqamli ro'yxat bo'ladi</small></span><textarea rows="4" maxlength="800" data-f="content.helper.text"></textarea></label>
          ${P("content.helper.image")}`,{n:3,sub:"termin ishlatmasdan; xato javobda ham qayta chiqadi"})}

        ${B("exercises","story","Mashqlar",`
          <div class="ad-ex-list"></div>
          <div class="ad-ex-add" data-ex-add>
            <span>Mashq qo'shish:</span>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:choice">${p("plus",16)}Tanlash</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:order">${p("plus",16)}Tartiblash</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:match">${p("plus",16)}Moslashtirish</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:sort">${p("plus",16)}Saralash</button>
            <span class="ad-ex-games">O'yin:</span>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:typing">${p("keyboard",16)}Typing</button>
            <button type="button" class="btn btn--ghost ad-btn-sm" data-act="add-ex:maze">${p("maze",16)}Labirint</button>
          </div>`,{n:4})}

        ${B("finish","finish","Yakun",`
          <textarea data-f="content.term_text" rows="3" maxlength="600" aria-label="Yakun matni" placeholder="Masalan: Bajarilish tartibi aniq yozilgan ko'rsatmalar algoritm deyiladi."></textarea>
          ${P("content.term_image")}`,{n:5,sub:"termin nima ekanini bir-ikki gapda tushuntiring"})}

        ${B("manage","story","Mavzuni boshqarish",`
          <div class="ad-actions">
            <button type="button" class="btn btn--ghost" data-move="up" ${n.position===0?"disabled":""}>${p("up",18)}Oldinga surish</button>
            <button type="button" class="btn btn--ghost" data-move="down" ${n.position>=n.section.total-1?"disabled":""}>${p("down",18)}Orqaga surish</button>
            <button type="button" class="btn btn--ghost ad-danger-btn" data-del>${p("trash",18)}Mavzuni o'chirish</button>
          </div>`,{def:!0})}
      </div>

      <aside class="ad-pv" aria-label="O'quvchi ko'rinishi">
        <div class="ad-pv-h"><b>O'quvchi telefonida</b>
          <button type="button" class="ad-mini" data-pv-restart>${p("undo",16)}Boshidan</button>
          <button type="button" class="ad-ib ad-pv-x" data-pv-close aria-label="Ko'rinishni yopish">${p("x",18)}</button></div>
        <div class="ad-phone"><div class="ad-screen"></div></div>
        <p class="ad-hint">Ko'rinish siz tahrirlayotgan joydan boshlanadi. Natija serverga yuborilmaydi.</p>
      </aside>
    </div>`;const g=h.querySelector(".ad-ed"),D=g.querySelector(".ad-ex-list"),Z=g.querySelector(".ad-screen"),f=g.querySelector("[data-save]"),E=g.querySelector("[data-pub]"),_=g.querySelector(".ad-save-st"),L=g.querySelector(".ad-issues"),q=g.querySelector(".ad-dlg"),j=(t,a)=>`<select class="ad-sel-sm" data-f="${t}" aria-label="Kibi holati">${a?`<option value="">${a}</option>`:""}${Ja.map(([e,l])=>`<option value="${e}">${l}</option>`).join("")}</select>`;function H(){const t=s.content.dialog;if(!t?.lines?.length){q.innerHTML=`<p class="ad-muted">Dialog yo'q. Kibi faqat dialog bo'lsa chiqadi.</p>
        <div class="ad-actions">
          <button type="button" class="btn btn--ghost ad-btn-sm" data-act="dlg-sample">${p("plus",16)}Tanishuv namunasini qo'yish</button>
          <button type="button" class="btn btn--ghost ad-btn-sm" data-act="dlg-add">${p("plus",16)}Bo'sh gap qo'shish</button>
        </div>`;return}const a="content.dialog";q.innerHTML=`
      <label class="ad-f"><span>Qayta kirganda <small>ism allaqachon ma'lum bo'lsa, «faqat birinchi marta» gaplar o'rniga aytiladi</small></span>
        <input maxlength="300" data-f="${a}.welcome_back" placeholder="Yana xush kelibsan, {ism}!"></label>
      <p class="ad-hint">{ism} o'rniga bola yozgan ism qo'yiladi.</p>
      ${t.lines.map((e,l)=>`
        <article class="ad-dlg-ln" data-step="dialog">
          <header class="ad-ex-h"><b>${l+1}-gap</b>${j(`${a}.lines.${l}.pose`)}<span class="ad-sp"></span>
            <button type="button" class="ad-ib" data-act="dlg-up:${l}" ${l===0?"disabled":""} aria-label="${l+1}-gapni yuqoriga">${p("up",18)}</button>
            <button type="button" class="ad-ib" data-act="dlg-down:${l}" ${l===t.lines.length-1?"disabled":""} aria-label="${l+1}-gapni pastga">${p("down",18)}</button>
            <button type="button" class="ad-ib is-danger" data-act="dlg-del:${l}" aria-label="${l+1}-gapni o'chirish">${p("trash",18)}</button></header>
          <textarea rows="2" maxlength="400" data-f="${a}.lines.${l}.text" aria-label="${l+1}-gap matni" placeholder="Kibi nima deydi?"></textarea>
          <div class="ad-grid">
            <label class="ad-check"><input type="checkbox" data-f="${a}.lines.${l}.ask_name"><span>Shu yerda ism so'ralsin</span></label>
            <label class="ad-check"><input type="checkbox" data-f="${a}.lines.${l}.first_only"><span>Faqat birinchi marta</span></label>
          </div>
          <fieldset class="ad-rows"><legend>Tugmalar <small>bo'sh bo'lsa «Davom»; javob yozilsa, Kibi avval shuni aytadi</small></legend>
            ${e.buttons.map((c,o)=>`
              <div class="ad-rowf ad-dlg-btn">
                <input maxlength="40" data-f="${a}.lines.${l}.buttons.${o}.label" placeholder="Tugma" aria-label="${l+1}-gap, ${o+1}-tugma">
                <input maxlength="300" data-f="${a}.lines.${l}.buttons.${o}.reply" placeholder="Kibi javobi (ixtiyoriy)" aria-label="${l+1}-gap, ${o+1}-tugma javobi">
                ${j(`${a}.lines.${l}.buttons.${o}.reply_pose`,"Holat: o'sha")}
                <button type="button" class="ad-ib" data-act="dlg-btn-del:${l}:${o}" aria-label="${o+1}-tugmani o'chirish">${p("x",16)}</button>
              </div>`).join("")}
            <button type="button" class="ad-mini" data-act="dlg-btn-add:${l}" ${e.buttons.length>=3?"disabled":""}>${p("plus",14)}Tugma</button>
          </fieldset>
        </article>`).join("")}
      <div class="ad-actions">
        <button type="button" class="ad-mini" data-act="dlg-add" ${t.lines.length>=Ma?"disabled":""}>${p("plus",14)}Gap qo'shish</button>
        <button type="button" class="ad-mini ad-danger-btn" data-act="dlg-clear">${p("trash",14)}Dialogni olib tashlash</button>
      </div>`,ea(q)}function ma(){const t=s.content.exercises;g.querySelectorAll('[data-act^="add-ex"]').forEach(a=>{a.disabled=t.length>=_a}),D.innerHTML=t.length?t.map(Oa).join(""):`<p class="ad-muted ad-ex-empty">Hali mashq yo'q. Pastdagi tugmalar bilan qo'shing: oddiydan qiyinga.</p>`,ea(D),t.forEach((a,e)=>{a.type==="maze"&&$a(e)})}const Q=(t,a)=>`<div class="ad-img is-sm" data-img="${t}" data-label="${a}"></div>`;function Oa(t,a){const e=`content.exercises.${a}`,l=A.has(t),c=`
      <header class="ad-ex-h">
        <button type="button" class="ad-ex-tg" data-act="tg-ex:${a}" aria-expanded="${!l}">
          <span class="ad-fold-ic">${p("down",16)}</span><b>${a+1}-mashq</b><span class="ad-chip${t.type==="typing"||t.type==="maze"?" is-game":""}">${Ea[t.type]}</span>
          <span class="ad-ex-sum">${k(J(t.prompt)||"(savol yo'q)")}</span>
        </button>
        <span class="ad-sp"></span>
        <button type="button" class="ad-ib" data-act="up-ex:${a}" ${a===0?"disabled":""} aria-label="${a+1}-mashqni yuqoriga">${p("up",18)}</button>
        <button type="button" class="ad-ib" data-act="down-ex:${a}" ${a===s.content.exercises.length-1?"disabled":""} aria-label="${a+1}-mashqni pastga">${p("down",18)}</button>
        <button type="button" class="ad-ib is-danger" data-act="del-ex:${a}" aria-label="${a+1}-mashqni o'chirish">${p("trash",18)}</button>
      </header>`,o=`
      ${t.type==="choice"?`<label class="ad-f ad-f-inline"><span>Savol turi</span><select class="ad-sel-sm" data-f="${e}.kind">${Wa.map(([S,i])=>`<option value="${S}">${i}</option>`).join("")}</select></label>`:""}
      <label class="ad-f"><span>${t.type==="typing"||t.type==="maze"?"Topshiriq":"Savol"}</span><textarea rows="2" maxlength="400" data-f="${e}.prompt"></textarea></label>
      ${P(`${e}.image`,"Savolga rasm")}`;let $="";if(t.type==="choice")$=`<fieldset class="ad-rows"><legend>Javob variantlari <small>to'g'risini belgilang; variant matn, rasm yoki ikkalasi bo'lishi mumkin</small></legend>
        ${t.options.map((S,i)=>`
          <div class="ad-rowf">
            <label class="ad-right" title="To'g'ri javob"><input type="radio" name="ans-${a}" data-f="${e}.answer" value="${i}" aria-label="${i+1}-variant to'g'ri javob"><span>${p("check",16)}</span></label>
            ${Q(`${e}.option_images.${i}`,`${i+1}-variantga rasm`)}
            <input maxlength="160" data-f="${e}.options.${i}" placeholder="${i+1}-variant" aria-label="${a+1}-mashq, ${i+1}-variant">
            <button type="button" class="ad-ib" data-act="del-opt:${a}:${i}" ${t.options.length<=2?"disabled":""} aria-label="${i+1}-variantni o'chirish">${p("x",16)}</button>
          </div>`).join("")}
        <button type="button" class="ad-mini" data-act="add-opt:${a}" ${t.options.length>=5?"disabled":""}>${p("plus",14)}Variant</button>
      </fieldset>`;else if(t.type==="order")$=`<fieldset class="ad-rows"><legend>Qadamlar to'g'ri tartibda <small>o'quvchiga aralashtirib beriladi</small></legend>
        ${t.items.map((S,i)=>`
          <div class="ad-rowf">
            <span class="ad-num">${i+1}</span>
            ${Q(`${e}.item_images.${i}`,`${i+1}-qadamga rasm`)}
            <input maxlength="120" data-f="${e}.items.${i}" placeholder="${i+1}-qadam" aria-label="${a+1}-mashq, ${i+1}-qadam">
            <button type="button" class="ad-ib" data-act="up-item:${a}:${i}" ${i===0?"disabled":""} aria-label="${i+1}-qadamni yuqoriga">${p("up",16)}</button>
            <button type="button" class="ad-ib" data-act="down-item:${a}:${i}" ${i===t.items.length-1?"disabled":""} aria-label="${i+1}-qadamni pastga">${p("down",16)}</button>
            <button type="button" class="ad-ib" data-act="del-item:${a}:${i}" ${t.items.length<=3?"disabled":""} aria-label="${i+1}-qadamni o'chirish">${p("x",16)}</button>
          </div>`).join("")}
        <button type="button" class="ad-mini" data-act="add-item:${a}" ${t.items.length>=6?"disabled":""}>${p("plus",14)}Qadam</button>
      </fieldset>`;else if(t.type==="match")$=`<fieldset class="ad-rows"><legend>Juftliklar <small>o'ng tomoni aralashtiriladi</small></legend>
        ${t.pairs.map((S,i)=>`
          <div class="ad-rowf ad-pair">
            ${Q(`${e}.pair_images.${i}.0`,`${i+1}-juftlik, chapga rasm`)}
            <input maxlength="80" data-f="${e}.pairs.${i}.0" placeholder="Chap" aria-label="${i+1}-juftlik, chap">
            <span class="ad-link-ic" aria-hidden="true">↔</span>
            ${Q(`${e}.pair_images.${i}.1`,`${i+1}-juftlik, o'ngga rasm`)}
            <input maxlength="80" data-f="${e}.pairs.${i}.1" placeholder="O'ng" aria-label="${i+1}-juftlik, o'ng">
            <button type="button" class="ad-ib" data-act="del-pair:${a}:${i}" ${t.pairs.length<=2?"disabled":""} aria-label="${i+1}-juftlikni o'chirish">${p("x",16)}</button>
          </div>`).join("")}
        <button type="button" class="ad-mini" data-act="add-pair:${a}" ${t.pairs.length>=5?"disabled":""}>${p("plus",14)}Juftlik</button>
      </fieldset>`;else if(t.type==="sort"){const S=i=>t.groups.map((r,M)=>`<option value="${M}">${k(r||`${M+1}-guruh`)}</option>`).join("");$=`<fieldset class="ad-rows"><legend>Guruhlar <small>2 yoki 3 ta, masalan: Ichida / Tashqarida</small></legend>
          ${t.groups.map((i,r)=>`
            <div class="ad-rowf">
              ${Q(`${e}.group_images.${r}`,`${r+1}-guruhga rasm`)}
              <input maxlength="40" data-f="${e}.groups.${r}" placeholder="${r+1}-guruh" aria-label="${a+1}-mashq, ${r+1}-guruh">
              <button type="button" class="ad-ib" data-act="del-grp:${a}:${r}" ${t.groups.length<=2?"disabled":""} aria-label="${r+1}-guruhni o'chirish">${p("x",16)}</button>
            </div>`).join("")}
          <button type="button" class="ad-mini" data-act="add-grp:${a}" ${t.groups.length>=3?"disabled":""}>${p("plus",14)}Guruh</button>
        </fieldset>
        <fieldset class="ad-rows"><legend>Narsalar <small>har biriga to'g'ri guruhni tanlang; o'quvchiga aralashtirib beriladi</small></legend>
          ${t.items.map((i,r)=>`
            <div class="ad-rowf">
              ${Q(`${e}.item_images.${r}`,`${r+1}-narsaga rasm`)}
              <input maxlength="80" data-f="${e}.items.${r}" placeholder="${r+1}-narsa" aria-label="${a+1}-mashq, ${r+1}-narsa">
              <select class="ad-sel-sm" data-f="${e}.item_groups.${r}" data-num aria-label="${r+1}-narsaning guruhi">${S()}</select>
              <button type="button" class="ad-ib" data-act="del-sitem:${a}:${r}" ${t.items.length<=2?"disabled":""} aria-label="${r+1}-narsani o'chirish">${p("x",16)}</button>
            </div>`).join("")}
          <button type="button" class="ad-mini" data-act="add-sitem:${a}" ${t.items.length>=8?"disabled":""}>${p("plus",14)}Narsa</button>
        </fieldset>`}else if(t.type==="typing")$=`
        <label class="ad-f"><span>Yoziladigan matn <small>o'quvchi aynan shuni yozadi, 300 belgigacha</small></span><textarea rows="2" maxlength="300" data-f="${e}.text" placeholder="Masalan: Kompyuter buyruqlarni ketma-ket bajaradi."></textarea></label>
        <div class="ad-grid">
          <label class="ad-f"><span>Kerakli aniqlik <small>% (50–100)</small></span><input type="number" min="50" max="100" data-f="${e}.min_accuracy"></label>
          <label class="ad-check"><input type="checkbox" data-f="${e}.case_sensitive"><span>Katta-kichik harf farq qiladi</span></label>
        </div>`;else if(t.type==="maze"){const S=F.get(t)||"#";$=`
        <fieldset class="ad-seg"><legend>O'quvchi qahramonni qanday yurgizadi</legend>
          <label><input type="radio" name="mode-${a}" data-f="${e}.mode" value="program"><span>Buyruqlar tuzib</span></label>
          <label><input type="radio" name="mode-${a}" data-f="${e}.mode" value="direct"><span>O'zi boshqarib</span></label>
        </fieldset>
        <div class="ad-mz">
          <div class="ad-mz-bar">
            <div class="ad-mz-tools" role="group" aria-label="Chizish quroli">${et.map(([i,r])=>`
              <button type="button" class="ad-mz-tool t-${i==="#"?"wall":i==="."?"path":i==="S"?"s":"g"}" data-act="mz-tool:${a}:${i==="#"?"wall":i==="."?"path":i}" aria-pressed="${S===i}"><i></i>${r}</button>`).join("")}
            </div>
            <div class="ad-mz-size">
              <span>Qator</span><button type="button" class="ad-ib" data-act="mz-rows:${a}:-1" aria-label="Qatorni kamaytirish">−</button><b>${t.grid.length}</b><button type="button" class="ad-ib" data-act="mz-rows:${a}:1" aria-label="Qator qo'shish">+</button>
              <span>Ustun</span><button type="button" class="ad-ib" data-act="mz-cols:${a}:-1" aria-label="Ustunni kamaytirish">−</button><b>${t.grid[0]?.length||0}</b><button type="button" class="ad-ib" data-act="mz-cols:${a}:1" aria-label="Ustun qo'shish">+</button>
            </div>
          </div>
          <div class="ad-mz-grid" data-maze="${a}"></div>
          <p class="ad-hint" data-mz-info="${a}"></p>
          ${t.mode==="direct"?"":`<label class="ad-f ad-mz-max"><span>Buyruqlar chegarasi <small>bo'sh qoldirsangiz, chegara yo'q</small></span>
            <input type="number" min="1" max="40" data-f="${e}.max_commands" placeholder="Chegarasiz"></label>`}
        </div>`}return`<article class="ad-ex${l?" is-folded":""}" data-step="ex:${a}">${c}
      <div class="ad-ex-b">${o}${$}
        <label class="ad-f"><span>Izoh <small>to'g'ri javobdan keyin chiqadi, ixtiyoriy</small></span><input maxlength="400" data-f="${e}.explain"></label>
        ${t.type==="typing"||t.type==="maze"?"":`<label class="ad-f"><span>Maslahat <small>xato javobda chiqadi (bo'lmasa yordamchi karta matni), ixtiyoriy</small></span><input maxlength="300" data-f="${e}.hint" placeholder="Masalan: Tok bo'lmasa, boshqa qismlar ishlay oladimi?"></label>`}
      </div>
    </article>`}function $a(t){const a=s.content.exercises[t],e=D.querySelector(`[data-maze="${t}"]`);if(!e||a?.type!=="maze")return;const l=a.grid.length?a.grid:Ta;e.style.setProperty("--cols",l[0].length),e.style.setProperty("--hero",`url('${xa}heroes/hero-01.webp')`),e.style.setProperty("--castle",`url('${xa}lab/castle-top.webp')`),e.innerHTML=l.map(($,S)=>[...$].map((i,r)=>`<button type="button" class="ad-mz-c ${i==="#"?"is-wall":i==="S"?"is-s":i==="G"?"is-g":"is-path"}"
      data-cell="${S}:${r}" aria-label="${S+1}-qator, ${r+1}-ustun: ${i==="#"?"buta":i==="S"?"qahramon":i==="G"?"qasr":"yo'l"}"></button>`).join("")).join("");const c=Ua(l),o=D.querySelector(`[data-mz-info="${t}"]`);o.className=`ad-hint ${c.errors.length?"is-bad":"is-ok"}`,o.textContent=c.errors.length?`Diqqat: ${c.errors.join("; ")}.`:`Eng qisqa yo'l: ${c.shortest} qadam.`}function pa(t,a,e){const l=s.content.exercises[t],c=F.get(l)||"#",o=l.grid.map($=>[...$]);return o[a][e]===c?!1:((c==="S"||c==="G")&&o.forEach($=>$.forEach((S,i)=>{S===c&&($[i]=".")})),o[a][e]=c,l.grid=o.map($=>$.join("")),$a(t),!0)}let U=null;g.addEventListener("pointerdown",t=>{const a=t.target.closest("[data-cell]");if(!a)return;t.preventDefault();const e=Number(a.closest("[data-maze]").dataset.maze),[l,c]=a.dataset.cell.split(":").map(Number);U={i:e,moved:pa(e,l,c)}}),g.addEventListener("pointermove",t=>{if(!U)return;const a=document.elementFromPoint(t.clientX,t.clientY)?.closest?.("[data-cell]");if(!a||Number(a.closest("[data-maze]")?.dataset.maze)!==U.i)return;const[e,l]=a.dataset.cell.split(":").map(Number);pa(U.i,e,l)&&(U.moved=!0)});const aa=()=>{if(!U)return;const t=U;U=null,t.moved&&(x=`ex:${t.i}`,Y())};window.addEventListener("pointerup",aa),window.addEventListener("pointercancel",aa);function ta(t){const a=t.dataset.img,e=ha(s,a),l=t.classList.contains("is-sm"),c=t.dataset.label||"Rasm qo'shish";if(t.dataset.busy){t.innerHTML=`<span class="ad-img-busy" aria-live="polite">${l?"…":"Yuklanmoqda…"}</span>`;return}if(l){t.innerHTML=e?`<button type="button" class="ad-img-sm has" data-act="img-pick:${a}" aria-label="${k(c)}: almashtirish"><img src="${ka(e)}" alt=""></button>
           <button type="button" class="ad-img-x" data-act="img-del:${a}" aria-label="${k(c)}: olib tashlash">${p("x",12)}</button>`:`<button type="button" class="ad-img-sm" data-act="img-pick:${a}" aria-label="${k(c)}" title="${k(c)}">${p("image",18)}</button>`;return}t.innerHTML=e?`<img src="${ka(e)}" alt="" loading="lazy"><span class="ad-img-acts">
          <button type="button" class="ad-mini" data-act="img-pick:${a}">${p("image",14)}Almashtirish</button>
          <button type="button" class="ad-mini ad-danger-btn" data-act="img-del:${a}">${p("x",14)}Olib tashlash</button></span>`:`<button type="button" class="ad-mini" data-act="img-pick:${a}">${p("image",16)}${k(c)}</button>`}function ea(t){t.querySelectorAll("[data-f]").forEach(a=>{const e=ha(s,a.dataset.f);a.type==="radio"?a.checked=String(e)===a.value:a.type==="checkbox"?a.checked=!!e:a.value=e??""}),t.querySelectorAll("[data-img]").forEach(ta),na()}function G(){const t=s.content.video,a=g.querySelector("[data-video-msg]"),e=g.querySelector("[data-video-thumb]");g.querySelector("[data-video-title]").disabled=!t,g.querySelector("[data-video-check]").disabled=!t;const l=t?.file&&!Xa.test(t.file)?"Fayl yo'li shunday bo'lsin: it/video/nom.mp4 (kichik harf, raqam, chiziqcha)":"";if(t?.file){e.hidden=!0,e.innerHTML="",a.textContent=l||"Saytdagi video ishlatiladi.",a.className=`ad-hint ${l?"is-bad":"is-ok"}`;return}t?.id?(e.hidden=!1,e.innerHTML=`<img src="${Ka(t.id)}" alt="Video muqovasi" width="320" height="180" loading="lazy">
        <button type="button" class="ad-mini" data-act="video-clear">${p("x",14)}Videoni olib tashlash</button>`,a.textContent="Video topildi.",a.className="ad-hint is-ok"):(e.hidden=!0,e.innerHTML="")}function sa(){const t=s.content,a=n.tools.find(o=>o.id===s.tool_id),e=o=>o?" · rasm bor":"",l={basic:[s.kind==="test"?"Bo'lim testi":"Oddiy mavzu",`${s.minutes||"?"} daqiqa`,`${s.xp||0} XP`,s.term&&`termin: ${s.term}`,a&&`qurol: ${a.name}`].filter(Boolean).join(" · "),story:(J(t.story,60)||"bo'sh")+e(t.story_image),dialog:t.dialog?.lines?.length?`${t.dialog.lines.length} ta gap${t.dialog.lines.some(o=>o.ask_name)?" · ism so'raladi":""}`:"dialog yo'q",video:t.video?.id||t.video?.file?[t.video.title||(t.video.file?"saytdagi video":"YouTube video"),t.video.check&&"«Tushundingmi?»"].filter(Boolean).join(" · "):"video yo'q",helper:(J(t.helper?.title||t.helper?.text,60)||"bo'sh")+e(t.helper?.image),exercises:t.exercises.length?`${t.exercises.length} ta: ${[...new Set(t.exercises.map(o=>Ea[o.type]))].join(", ")}`:"mashq yo'q",finish:(J(t.term_text,60)||"bo'sh")+e(t.term_image),manage:""};g.querySelectorAll("[data-sum]").forEach(o=>{o.textContent=l[o.dataset.sum]??""}),g.querySelector('[data-fold="exercises"] .ad-fold-t').innerHTML=`Mashqlar <small>${t.exercises.length} / ${_a}</small>`,D.querySelectorAll(".ad-ex").forEach((o,$)=>{const S=o.querySelector(".ad-ex-sum");S&&(S.textContent=J(t.exercises[$]?.prompt)||"(savol yo'q)")});const c=g.querySelector(".ad-fold:not(.is-folded), .ad-ex:not(.is-folded)");g.querySelector("[data-fold-all] span").textContent=c?"Hammasini yig'ish":"Hammasini ochish"}function ia(){const t=z();g.querySelector("[data-status]").textContent=m?"E'lon qilingan":"Qoralama",g.querySelector("[data-status]").className=`ad-status ${m?"is-pub":""}`,g.querySelector("[data-live-note]").hidden=!m,E.textContent=m?"Yashirish":"E'lon qilish",f.disabled=w||!t,E.disabled=w,_.textContent=w?"Saqlanmoqda…":t?"Saqlanmagan o'zgarishlar bor":"Hammasi saqlangan",_.classList.toggle("is-dirty",t&&!w),g.querySelectorAll("[data-count]").forEach(a=>{const e=String(ha(s,a.dataset.count)||"").length;a.textContent=e>Number(a.dataset.max)*.8?`${e} / ${a.dataset.max}`:""}),sa()}function W(t,a){if(t.classList.toggle("is-folded",a),t.querySelector(":scope > .ad-fold-h, :scope > .ad-ex-h .ad-ex-tg")?.setAttribute("aria-expanded",String(!a)),t.dataset.fold)X.set(t.dataset.fold,a);else{const e=s.content.exercises[Array.prototype.indexOf.call(D.children,t)];e&&(a?A.add(e):A.delete(e))}}function Ba(t){let a=t.closest(".ad-ex.is-folded");a&&W(a,!1),a=t.closest(".ad-fold.is-folded"),a&&W(a,!1)}function la(t,{canHide:a=!1}={}){if(b=t||[],!b.length){L.hidden=!0,L.innerHTML="",na();return}L.hidden=!1,L.innerHTML=`
      <b>${m?"Saqlab bo'lmadi: e'lon qilingan mavzu to'liq bo'lishi kerak":"E'lon qilish uchun quyidagilarni to'g'rilang"}</b>
      <ul>${b.map((e,l)=>`<li><button type="button" class="ad-issue" data-issue="${l}">${k(e.message)}</button></li>`).join("")}</ul>
      ${a?'<button type="button" class="btn btn--ghost ad-btn-sm" data-save-draft>Yashirib, qoralama sifatida saqlash</button>':""}`,na(),L.scrollIntoView({block:"nearest",behavior:"smooth"})}const ya=t=>t==="title"?"title":t==="exercises"?null:`content.${t}`;function na(){g.querySelectorAll("[aria-invalid]").forEach(t=>t.removeAttribute("aria-invalid")),g.querySelectorAll(".ad-mz-grid.is-bad").forEach(t=>t.classList.remove("is-bad"));for(const t of b){const a=ya(t.path);a&&(a.endsWith(".grid")&&g.querySelector(`[data-maze="${a.split(".")[2]}"]`)?.classList.add("is-bad"),g.querySelectorAll(`[data-f="${a}"], [data-f^="${a}."]`).forEach(e=>{e.type==="radio"||e.type==="checkbox"||(e.dataset.f===a||!e.value.trim())&&e.setAttribute("aria-invalid","true")}))}}function va(t){const a=ya(t.path);let e=null;if(!a)e=g.querySelector("[data-ex-add] button");else if(a.endsWith(".grid"))e=g.querySelector(`[data-maze="${a.split(".")[2]}"] [data-cell]`);else{const l=[...g.querySelectorAll(`[data-f="${a}"], [data-f^="${a}."]`)].filter(c=>c.type!=="radio");e=l.find(c=>!c.value.trim())||l[0]||g.querySelector(`[data-f^="${a.replace(/\.\w+$/,"")}"]`)}e&&(Ba(e),e.scrollIntoView({block:"center",behavior:"smooth"}),e.focus({preventScroll:!0}))}function qa(t){const a=structuredClone(t);a.video&&(a.video.id||delete a.video.id,a.video.file?.trim()?a.video.file=a.video.file.trim():delete a.video.file,a.video.check=!!a.video.check,!a.video.id&&!a.video.file&&delete a.video),a.dialog&&(a.dialog.lines?.length?(a.dialog.welcome_back=a.dialog.welcome_back||"",a.dialog.lines.forEach(e=>{e.ask_name=!!e.ask_name,e.first_only=!!e.first_only,e.buttons.forEach(l=>{l.reply=l.reply||"",l.reply_pose||delete l.reply_pose})})):delete a.dialog);for(const e of["story_image","term_image"])a[e]||delete a[e];return a.helper&&(a.helper.image||delete a.helper.image,!a.helper.title&&!a.helper.text&&!a.helper.image&&delete a.helper),a.exercises.forEach(e=>{e.image||delete e.image,e.type==="choice"&&(e.answer=Number(e.answer)||0),e.type==="sort"&&(e.item_groups=e.items.map((l,c)=>Number(e.item_groups?.[c])||0)),e.type==="typing"&&(e.min_accuracy=ua(e.min_accuracy,50,100,90),e.case_sensitive=!!e.case_sensitive),e.type==="maze"&&(e.max_commands=ua(e.max_commands,1,40,null));for(const l of["option_images","item_images","group_images","pair_images"])e[l]&&(e[l]=Array.from(e[l],c=>l==="pair_images"?[c?.[0]||null,c?.[1]||null]:c||null))}),a}function Na(t){return{title:s.title.trim()||"Nomsiz mavzu",kind:s.kind,term:s.term,tool_id:s.tool_id||null,minutes:ua(s.minutes,1,60,5),xp:ua(s.xp,0,1e3,0),content:qa(s.content),is_published:t}}async function oa(t=m){if(w)return;if(!s.title.trim()){la([{path:"title",message:"Mavzu nomi bo'sh"}]),va({path:"title"});return}w=!0,ia();const a=m,e=JSON.stringify(s);try{const{lesson:l}=await T.put(`/it/manage/lessons/${d}`,Na(t)),c=u(l);if(m=l.is_published,v=JSON.stringify(c),JSON.stringify(s)===e){const o=s.content.exercises.map($=>A.has($));s=c,A=new WeakSet,s.content.exercises.forEach(($,S)=>{o[S]&&A.add($)}),ea(g),G(),H(),ma()}la([]),await n.reload(),K(m&&!a?"Mavzu e'lon qilindi":!m&&a?"Mavzu yashirildi":"Saqlandi")}catch(l){l.code==="LESSON_NOT_READY"?la(l.details,{canHide:a&&t}):l.code==="VALIDATION_ERROR"&&l.details?.length?la(l.details.map(c=>({path:c.path.replace(/^content\./,""),message:`${c.path}: ${c.message}`}))):N(l)}finally{w=!1,ia()}}let da=0;function C(t=x){clearTimeout(da);const a=qa(s.content),e=n.tools.find($=>$.id===s.tool_id),l={id:"preview",kind:s.kind,title:s.title||"Mavzu nomi",term:s.term,minutes:s.minutes,xp:Number(s.xp)||0,section:{id:n.section.id,title:n.section.title,index:n.position,total:n.section.total},tool:e?{id:e.id,name:e.name,short:e.short,body:e.body}:null,content:a},c=ga('<section class="ls ls--preview"></section>');Z.replaceChildren(c);const o=String(t);Fa(c,l,{preview:!0,start:o.startsWith("ex:")?Number(o.slice(3)):o,onRestart:()=>C(s.content.dialog?.lines?.length?"dialog":"story")})}const Aa=()=>{clearTimeout(da),da=setTimeout(()=>C(),450)};function Y({structure:t=!1}={}){t&&ma(),b.length&&na(),ia(),Aa()}g.addEventListener("input",t=>{const a=t.target;if(a.matches("[data-video-url]")){const c=a.value.trim(),o=Ya(c),$=g.querySelector("[data-video-msg]"),S=s.content.video;o?s.content.video={...S,id:o,title:S?.title||""}:S&&(delete S.id,S.file||delete s.content.video),c?o||($.textContent="Bu YouTube havolasi emas. Masalan: https://youtu.be/abc123XYZ_0",$.className="ad-hint is-bad"):($.textContent="",$.className="ad-hint"),G(),x="video",Y();return}const e=a.dataset.f;if(!e||a.type==="radio")return;let l=a.type==="checkbox"?a.checked:a.value;a.type==="number"&&(l=l===""?"":Number(l)),a.dataset.num!==void 0&&(l=Number(l)),e==="tool_id"&&(l=l||null),ca(s,e,l),a.matches("[data-video-file], [data-video-check]")&&(G(),x="video"),Y()}),g.addEventListener("change",t=>{const a=t.target;a.type==="radio"&&a.dataset.f?(ca(s,a.dataset.f,a.dataset.f.endsWith(".answer")?Number(a.value):a.value),Y({structure:a.dataset.f.endsWith(".mode")})):a.tagName==="SELECT"&&a.dataset.f&&(a.dataset.f==="tool_id"&&(x="tool"),C())}),g.addEventListener("focusin",t=>{const a=t.target.closest("[data-step]")?.dataset.step;a&&a!==x&&(x=a,C())}),g.addEventListener("click",async t=>{const a=t.target.closest("[data-fold-btn]");if(a){const o=a.closest(".ad-fold");W(o,!o.classList.contains("is-folded")),sa();return}if(t.target.closest("[data-fold-all]")){const o=!!g.querySelector(".ad-fold:not(.is-folded), .ad-ex:not(.is-folded)");g.querySelectorAll(".ad-fold, .ad-ex").forEach($=>W($,o)),sa();return}const e=t.target.closest("[data-act]");if(e){const[o,$,S]=e.dataset.act.split(":");if(o==="img-pick"||o==="img-del"){Da(o,$);return}const i=s.content.exercises,r=Number($),M=Number(S),ra=(y,O,R)=>{[y[O],y[R]]=[y[R],y[O]]},V=(y,O,R)=>{if(y[O])for(;y[O].length<R;)y[O].push(O==="pair_images"?[null,null]:null);return y[O]};if(o==="tg-ex"){const y=e.closest(".ad-ex");W(y,!y.classList.contains("is-folded")),sa(),y.classList.contains("is-folded")||(x=`ex:${r}`,C());return}if(o.startsWith("dlg")){ja(o,r,M);return}if(o==="add-ex")i.push(tt[$]()),x=`ex:${i.length-1}`;else if(o==="del-ex"){if((i[r].prompt||"").trim()&&!confirm(`${r+1}-mashq o'chirilsinmi?`))return;i.splice(r,1),x="story"}else if(o==="up-ex")ra(i,r,r-1),x=`ex:${r-1}`;else if(o==="down-ex")ra(i,r,r+1),x=`ex:${r+1}`;else if(o==="add-opt")i[r].options.push("");else if(o==="del-opt")i[r].options.splice(M,1),V(i[r],"option_images",i[r].options.length+1)?.splice(M,1),i[r].answer===M?i[r].answer=0:i[r].answer>M&&(i[r].answer-=1);else if(o==="add-item")i[r].items.push("");else if(o==="del-item")i[r].items.splice(M,1),V(i[r],"item_images",i[r].items.length+1)?.splice(M,1);else if(o==="up-item"||o==="down-item"){const y=o==="up-item"?M-1:M+1;ra(i[r].items,M,y);const O=V(i[r],"item_images",i[r].items.length);O&&ra(O,M,y)}else if(o==="add-grp")i[r].groups.push("");else if(o==="del-grp")i[r].groups.splice(M,1),V(i[r],"group_images",i[r].groups.length+1)?.splice(M,1),i[r].item_groups=i[r].item_groups.map(y=>y===M?0:y>M?y-1:y);else if(o==="add-sitem")i[r].items.push(""),i[r].item_groups.push(0);else if(o==="del-sitem")i[r].items.splice(M,1),i[r].item_groups.splice(M,1),V(i[r],"item_images",i[r].items.length+1)?.splice(M,1);else if(o==="add-pair")i[r].pairs.push(["",""]);else if(o==="del-pair")i[r].pairs.splice(M,1),V(i[r],"pair_images",i[r].pairs.length+1)?.splice(M,1);else if(o==="mz-tool"){F.set(i[r],{wall:"#",path:"."}[S]||S),e.closest(".ad-mz-tools").querySelectorAll("[aria-pressed]").forEach(y=>y.setAttribute("aria-pressed",String(y===e)));return}else if(o==="mz-rows"||o==="mz-cols"){const y=i[r].grid,O=Number(S);o==="mz-rows"?(O>0&&y.length<10&&y.push(".".repeat(y[0].length)),O<0&&y.length>3&&y.pop()):O>0&&y[0].length<10?i[r].grid=y.map(R=>`${R}.`):O<0&&y[0].length>3&&(i[r].grid=y.map(R=>R.slice(0,-1))),x=`ex:${r}`}else if(o==="video-clear"){delete s.content.video,g.querySelector("[data-video-url]").value="",g.querySelector("[data-video-msg]").textContent="",G(),Y();return}if(Y({structure:!0}),o==="add-ex"){const y=D.lastElementChild;y?.scrollIntoView({block:"center",behavior:"smooth"}),y?.querySelector("textarea")?.focus({preventScroll:!0})}else/^add-(opt|item|pair|sitem)$/.test(o)&&D.children[r]?.querySelectorAll(`.ad-rowf input:not([type=radio])${o==="add-sitem"?':not([data-f*=".groups."])':""}`)?.[o==="add-pair"?i[r].pairs.length*2-2:(i[r].options||i[r].items).length-1]?.focus();C();return}const l=t.target.closest("[data-issue]");if(l){va(b[Number(l.dataset.issue)]);return}if(t.target.closest("[data-save-draft]")){oa(!1);return}if(t.target.closest("[data-pv-open]")){g.classList.add("is-pv-open"),C();return}if(t.target.closest("[data-pv-close]")){g.classList.remove("is-pv-open");return}if(t.target.closest("[data-pv-restart]")){C(s.content.dialog?.lines?.length?"dialog":"story");return}const c=t.target.closest("[data-cell]");if(c&&t.detail===0){const o=Number(c.closest("[data-maze]").dataset.maze),[$,S]=c.dataset.cell.split(":").map(Number);pa(o,$,S)&&(x=`ex:${o}`,Y()),D.querySelector(`[data-maze="${o}"] [data-cell="${$}:${S}"]`)?.focus()}});function ja(t,a,e){const l=s.content,c=l.dialog?.lines;if(t==="dlg-sample"){if(c?.length&&!confirm("Hozirgi dialog namunaga almashtirilsinmi?"))return;l.dialog=Za()}else if(t==="dlg-add")l.dialog||(l.dialog={welcome_back:"",lines:[]}),l.dialog.lines.length<Ma&&l.dialog.lines.push(at());else if(t==="dlg-clear"){if(!confirm("Kibi dialogi olib tashlansinmi?"))return;delete l.dialog}else if(t==="dlg-del"){if((c[a].text||"").trim()&&!confirm(`${a+1}-gap o'chirilsinmi?`))return;c.splice(a,1),c.length||delete l.dialog}else if(t==="dlg-up"||t==="dlg-down"){const o=t==="dlg-up"?a-1:a+1;[c[a],c[o]]=[c[o],c[a]]}else t==="dlg-btn-add"?c[a].buttons.length<3&&c[a].buttons.push({label:"",reply:""}):t==="dlg-btn-del"&&c[a].buttons.splice(e,1);x="dialog",H(),Y(),C("dialog")}async function Da(t,a){const e=()=>g.querySelectorAll(`[data-img="${a}"]`);if(t==="img-del"){ca(s,a,null),e().forEach(ta),Y();return}const l=await Va({onStart:()=>e().forEach(c=>{c.dataset.busy="1",ta(c)})});e().forEach(c=>{delete c.dataset.busy}),l&&ca(s,a,l.id),e().forEach(ta),l&&(x=a.startsWith("content.exercises.")?`ex:${a.split(".")[2]}`:a.includes("helper")?"helper":a.includes("term")?"finish":"story",Y())}f.onclick=()=>oa(),E.onclick=()=>oa(!m),g.querySelectorAll("[data-move]").forEach(t=>{t.onclick=async()=>{if(!(z()&&!confirm("Saqlanmagan o'zgarishlar bor. Ularni tashlab, mavzuni surasizmi?")))try{await T.post(`/it/manage/lessons/${d}/move`,{dir:t.dataset.move}),await n.reload(),n.go(`/lesson/${d}`,{push:!1,force:!0})}catch(a){N(a)}}}),g.querySelector("[data-del]").onclick=async()=>{confirm(`«${s.title}» mavzusi o'chirilsinmi? Buni qaytarib bo'lmaydi.`)&&await fa(`/it/manage/lessons/${d}`)&&(await n.reload(),n.go(`/section/${n.section.id}`,{force:!0}))};const wa=t=>{(t.ctrlKey||t.metaKey)&&t.key.toLowerCase()==="s"&&(t.preventDefault(),z()&&oa())};return document.addEventListener("keydown",wa),ea(g),s.content.video?.id&&(g.querySelector("[data-video-url]").value=`https://youtu.be/${s.content.video.id}`),G(),H(),ma(),ia(),C(s.content.dialog?.lines?.length?"dialog":"story"),()=>{clearTimeout(da),document.removeEventListener("keydown",wa),window.removeEventListener("pointerup",aa),window.removeEventListener("pointercancel",aa)}}const it='<svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/></svg>';async function pt(h,n="/"){const d=Ha()?.nickname||"Admin",u=ga(`
    <section class="ad">
      <header class="ad-top">
        <div class="hm-brand"><span class="hm-logo">${it}</span>CodeKids</div>
        <span class="ad-badge">Admin</span>
        <span class="ad-sp"></span>
        <a class="ad-link" href="#/it" target="_blank" rel="noopener">${p("eye",18)}O'quvchi ko'rinishi</a>
        <span class="ad-me" title="Siz">${k(d)}</span>
        <button type="button" class="btn btn--ghost ad-out">Chiqish</button>
      </header>
      <div class="ad-body">
        <aside class="ad-side" aria-label="Bo'limlar va mavzular"></aside>
        <main class="ad-main" tabindex="-1"></main>
      </div>
      <dialog class="ad-dlg"></dialog>
    </section>`);h.replaceChildren(u);const s=u.querySelector(".ad-side"),m=u.querySelector(".ad-main"),v=u.querySelector(".ad-dlg");let w={sections:[],tools:[]},x=n,b=()=>!1,z=()=>{};const I=f=>{b()&&(f.preventDefault(),f.returnValue="")};window.addEventListener("beforeunload",I),u.querySelector(".ad-out").onclick=async()=>{b()&&!confirm("Saqlanmagan o'zgarishlar bor. Baribir chiqasizmi?")||(await Ia.logout(),Ca(),location.hash="#/",window.dispatchEvent(new HashChangeEvent("hashchange")))};async function A(){w=await T.get("/it/manage"),P()}function F(f,{push:E=!0,force:_=!1}={}){return!_&&b()&&!confirm("Saqlanmagan o'zgarishlar bor. Ularni tashlab ketasizmi?")?!1:(E&&`#/admin${f==="/"?"":f}`!==location.hash&&history.pushState(null,"",`#/admin${f==="/"?"":f}`),x=f,Z(f),!0)}const B={go:F,reload:A,toast:K,get data(){return w},setDirty:f=>{b=f},dialog:f=>dt(v,f)};function P(){const f=q=>x===q?' is-on" aria-current="page':"",E=x.startsWith("/section/")?x.slice(9):w.sections.find(q=>q.lessons.some(j=>x===`/lesson/${j.id}`))?.id,_=q=>q.id===E||!X.get(`side:${q.id}`,w.sections.length>3),L=q=>`<span class="ad-dot ${q?"is-pub":""}" title="${q?"E'lon qilingan":"Qoralama"}"></span>`;s.innerHTML=`
      <div class="ad-side-h"><h2>Bo'limlar</h2>
        <button type="button" class="ad-mini" data-new-section>${p("plus",16)}Bo'lim</button></div>
      ${w.sections.length?"":`<p class="ad-side-empty">Hali bo'lim yo'q. Birinchi qasrni yarating.</p>`}
      <ol class="ad-tree">${w.sections.map((q,j)=>`
        <li class="ad-sec${_(q)?"":" is-folded"}">
          <div class="ad-sec-row">
            <button type="button" class="ad-sec-tg" data-side-tg="${q.id}" aria-expanded="${_(q)}" aria-label="${k(q.title)}: mavzular ro'yxati">${p("down",14)}</button>
            <a class="ad-sec-a${f(`/section/${q.id}`)}" href="#/admin/section/${q.id}" data-go="/section/${q.id}">
              ${L(q.is_published)}<span class="ad-t">${j+1}. ${k(q.title)}</span>${q.lang==="ru"?'<em class="ad-crown" title="Ruscha qasr">RU</em>':""}<small>${q.lessons.length}</small></a>
          </div>
          <ol class="ad-les">${q.lessons.map(H=>`
            <li><a class="ad-les-a${f(`/lesson/${H.id}`)}" href="#/admin/lesson/${H.id}" data-go="/lesson/${H.id}">
              ${L(H.is_published)}<span class="ad-t">${k(H.title)}</span>${H.kind==="test"?`<em class="ad-crown" title="Bo'lim testi">test</em>`:""}${H.has_video?`<span class="ad-vid" title="Video bor">${p("play",14)}</span>`:""}</a></li>`).join("")}
          </ol>
          <button type="button" class="ad-add-les" data-new-lesson="${q.id}">${p("plus",14)}Mavzu</button>
        </li>`).join("")}
      </ol>
      <a class="ad-tools-a${f("/tools")}" href="#/admin/tools" data-go="/tools">${p("tool",18)}Fikrlash qurollari <b>${w.tools.length}</b></a>
      <p class="ad-legend"><span class="ad-dot is-pub"></span>e'lon qilingan <span class="ad-dot"></span>qoralama</p>`}u.addEventListener("click",f=>{const E=f.target.closest("[data-go]");if(E&&u.contains(E)){if(f.metaKey||f.ctrlKey||f.shiftKey)return;f.preventDefault(),F(E.dataset.go);return}const _=f.target.closest("[data-side-tg]");if(_){const q=_.closest(".ad-sec"),j=!q.classList.contains("is-folded");q.classList.toggle("is-folded",j),_.setAttribute("aria-expanded",String(!j)),X.set(`side:${_.dataset.sideTg}`,j);return}if(f.target.closest("[data-new-section]")){f.preventDefault(),g();return}const L=f.target.closest("[data-new-lesson]");L&&(f.preventDefault(),D(L.dataset.newLesson))});async function g(){const f=await B.dialog({title:"Yangi bo'lim (qasr)",fields:[{name:"title",label:"Bo'lim nomi",placeholder:"Masalan: Takrorlash",max:120,required:!0},{name:"method",label:"Fikrlash usuli",placeholder:"Masalan: Naqsh ko'rish",max:120,hint:"Bo'limdagi har mavzu shu usul orqali o'rgatiladi"},{name:"lang",label:"Til (qaysi yo'lda chiqadi)",type:"radio",value:"uz",options:[["uz","O'zbekcha"],["ru","Ruscha"]]}],ok:"Yaratish"});if(f)try{const{section:E}=await T.post("/it/manage/sections",f);await A(),F(`/section/${E.id}`,{force:!0}),K("Bo'lim yaratildi. Endi unga mavzular qo'shing.")}catch(E){N(E)}}async function D(f){const E=w.sections.find(L=>L.id===f),_=await B.dialog({title:"Yangi mavzu (eshik)",sub:E?`«${E.title}» bo'limiga`:"",fields:[{name:"title",label:"Mavzu nomi",placeholder:"Masalan: Sikl nima?",max:120,required:!0},{name:"kind",label:"Turi",type:"radio",options:[["lesson","Oddiy mavzu"],["test","Bo'lim testi (tojli eshik)"]],value:"lesson"}],ok:"Yaratish"});if(_)try{const{lesson:L}=await T.post(`/it/manage/sections/${f}/lessons`,_);await A(),F(`/lesson/${L.id}`,{force:!0})}catch(L){N(L)}}async function Z(f){z(),z=()=>{},b=()=>!1,P(),m.replaceChildren(ga('<div class="skeleton ad-skel" aria-busy="true"></div>'));let E;try{if(E=f.match(/^\/section\/([0-9a-f-]{36})$/))await nt(m,E[1],B);else if(E=f.match(/^\/lesson\/([0-9a-f-]{36})$/)){const{lesson:_}=await T.get(`/it/manage/lessons/${E[1]}`),L=w.sections.findIndex(j=>j.id===_.section_id),q=w.sections[L];z=st(m,{lesson:_,tools:w.tools,section:{id:_.section_id,title:_.section_title,index:Math.max(0,L),total:q?.lessons.length||1},position:q?q.lessons.findIndex(j=>j.id===_.id):0,...B})}else f==="/tools"?ot(m,B):await lt(m,B)}catch(_){_.code==="LESSON_NOT_FOUND"||_.code==="SECTION_NOT_FOUND"?m.innerHTML=`<div class="ad-page"><div class="ad-card ad-empty"><h1>Topilmadi</h1><p>Bu bo'lim yoki mavzu o'chirilgan bo'lishi mumkin.</p><a class="btn" href="#/admin" data-go="/">Bosh sahifa</a></div></div>`:(N(_),m.innerHTML=`<div class="ad-page"><div class="ad-card ad-empty"><p>Yuklab bo'lmadi.</p></div></div>`)}m.focus({preventScroll:!0}),window.scrollTo(0,0)}try{await A()}catch(f){return N(f),m.innerHTML=`<div class="ad-page"><div class="ad-card ad-empty"><p>Muharrirni yuklab bo'lmadi. Sahifani yangilang.</p></div></div>`,()=>window.removeEventListener("beforeunload",I)}return Z(x),()=>{z(),window.removeEventListener("beforeunload",I),v.open&&v.close()}}const ba=h=>h>=1024*1024?`${(h/1024/1024).toFixed(1)} MB`:`${Math.max(1,Math.round(h/1024))} KB`;async function lt(h,n){const{data:d}=n;let u=null;try{u=await T.get("/it/manage/images/stats")}catch{}const s=d.sections.flatMap(v=>v.lessons),m=s.filter(v=>v.is_published).length;h.innerHTML=`
    <div class="ad-page">
      <header class="ad-ph"><div><span class="ad-kicker">IT DARSLARI</span><h1>Darslar muharriri</h1></div></header>
      <div class="ad-stats">
        <div class="ad-stat"><b>${d.sections.length}</b><span>bo'lim (qasr)</span></div>
        <div class="ad-stat"><b>${s.length}</b><span>mavzu (eshik)</span></div>
        <div class="ad-stat is-pub"><b>${m}</b><span>e'lon qilingan</span></div>
        <div class="ad-stat"><b>${s.length-m}</b><span>qoralama</span></div>
      </div>
      <section class="ad-card ad-howto">
        <h2>Qanday ishlaydi</h2>
        <ol>
          <li><b>Bo'lim yarating.</b> Har bir bo'lim o'quvchi yo'lidagi bitta qasr, u bitta fikrlash usuliga bag'ishlanadi.</li>
          <li><b>Mavzular qo'shing.</b> Har mavzu qasr zalidagi bitta eshik: hikoya, ixtiyoriy video, yordamchi karta va mashqlar.</li>
          <li><b>E'lon qiling.</b> Avval mavzuni, keyin bo'limni. Qoralamalar o'quvchilarga ko'rinmaydi.</li>
        </ol>
        <p>O'ng tomonda mavzu bola telefonida qanday ko'rinishini darhol ko'rasiz.</p>
      </section>
      ${u?`<section class="ad-card ad-imgs">
        <div class="ad-card-h"><h2>Rasmlar</h2><span class="ad-meta">${u.total} ta · ${ba(u.bytes)} / ${ba(u.limit)}</span></div>
        <div class="ad-bar" role="progressbar" aria-label="Rasmlar uchun joy" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(u.bytes/u.limit*100)}"><i style="width:${Math.min(100,u.bytes/u.limit*100)}%"></i></div>
        <p class="ad-muted">${u.unused?`${u.unused} ta rasm hech bir mavzuda ishlatilmayapti (${ba(u.unused_bytes)}). Ularni o'chirsangiz, joy bo'shaydi.`:"Ishlatilmagan rasm yo'q. Mavzudan olib tashlangan rasm bir soatdan keyin shu yerda tozalashga chiqadi."}</p>
        ${u.unused?'<div class="ad-actions"><button type="button" class="btn btn--ghost ad-btn-sm" data-clean>Ishlatilmaganlarni tozalash</button></div>':""}
      </section>`:""}
      <button type="button" class="btn ad-cta" data-new-section>${p("plus",18)}Yangi bo'lim</button>
    </div>`,h.querySelector("[data-clean]")?.addEventListener("click",async()=>{if(confirm(`${u.unused} ta ishlatilmagan rasm o'chirilsinmi?`))try{const v=await T.del("/it/manage/images/unused");n.toast(`${v.deleted} ta rasm o'chirildi`),n.go("/",{push:!1,force:!0})}catch(v){N(v)}})}async function nt(h,n,d){const u=d.data.sections.findIndex(b=>b.id===n),s=d.data.sections[u];if(!s){const b=new Error("x");throw b.code="SECTION_NOT_FOUND",b}const m=s.lessons.reduce((b,z)=>b+z.learners,0);h.innerHTML=`
    <div class="ad-page">
      <header class="ad-ph">
        <div><span class="ad-kicker">${u+1}-BO'LIM${s.lang==="ru"?" · RUSCHA":""}</span><h1>${k(s.title)}</h1></div>
        <span class="ad-status ${s.is_published?"is-pub":""}">${s.is_published?"E'lon qilingan":"Qoralama"}</span>
      </header>
      <form class="ad-card ad-form" novalidate>
        <h2>Bo'lim ma'lumotlari</h2>
        <label class="ad-f"><span>Bo'lim nomi</span><input name="title" maxlength="120" required value="${k(s.title)}"></label>
        <label class="ad-f"><span>Fikrlash usuli <small>bo'limdagi har mavzu shu usul orqali o'rgatiladi</small></span>
          <input name="method" maxlength="120" value="${k(s.method)}" placeholder="Masalan: Ketma-ketlik"></label>
        <label class="ad-f"><span>Tavsif <small>ixtiyoriy, o'zingiz uchun eslatma</small></span>
          <textarea name="description" rows="3" maxlength="1000">${k(s.description)}</textarea></label>
        <label class="ad-f"><span>Til <small>o'quvchi shu tilni tanlaganda yo'lida chiqadi</small></span>
          <select name="lang"><option value="uz"${s.lang!=="ru"?" selected":""}>O'zbekcha</option><option value="ru"${s.lang==="ru"?" selected":""}>Ruscha</option></select></label>
        <div class="ad-actions"><button type="submit" class="btn">Saqlash</button></div>
      </form>
      <section class="ad-card">
        <div class="ad-card-h"><h2>Mavzular (eshiklar)</h2>
          <button type="button" class="btn btn--ghost ad-btn-sm" data-new-lesson="${s.id}">${p("plus",16)}Mavzu</button></div>
        ${s.lessons.length?`<ol class="ad-list">${s.lessons.map((b,z)=>`
          <li class="ad-row">
            <span class="ad-num">${z+1}</span>
            <a class="ad-row-t" href="#/admin/lesson/${b.id}" data-go="/lesson/${b.id}">${k(b.title)}</a>
            ${b.kind==="test"?`<span class="ad-chip is-test">Bo'lim testi</span>`:""}
            ${b.has_video?`<span class="ad-chip is-video">${p("play",14)}Video</span>`:""}
            <span class="ad-meta">${b.exercises} mashq${b.learners?` · ${b.learners} o'quvchi o'tgan`:""}</span>
            <span class="ad-status ad-status--sm ${b.is_published?"is-pub":""}">${b.is_published?"E'lon":"Qoralama"}</span>
            <span class="ad-move">
              <button type="button" class="ad-ib" data-move="${b.id}:up" ${z===0?"disabled":""} aria-label="${k(b.title)}: yuqoriga">${p("up",18)}</button>
              <button type="button" class="ad-ib" data-move="${b.id}:down" ${z===s.lessons.length-1?"disabled":""} aria-label="${k(b.title)}: pastga">${p("down",18)}</button>
            </span>
          </li>`).join("")}</ol>`:`<p class="ad-muted">Hali mavzu yo'q. «Mavzu» tugmasi bilan birinchi eshikni qo'shing.</p>`}
      </section>
      <section class="ad-card">
        <h2>E'lon qilish va tartib</h2>
        <p class="ad-muted">${s.is_published?"Bo'lim o'quvchilarga ko'rinadi. Unda faqat e'lon qilingan mavzular chiqadi.":"Bo'lim hali qoralama, o'quvchilar uni ko'rmaydi. Avval mavzularni e'lon qiling, keyin bo'limni."}</p>
        <div class="ad-actions">
          <button type="button" class="btn ${s.is_published?"btn--ghost":""}" data-pub>${s.is_published?"Yashirish":"Bo'limni e'lon qilish"}</button>
          <button type="button" class="btn btn--ghost" data-sec-move="up" ${u===0?"disabled":""}>${p("up",18)}Yo'lda oldinga</button>
          <button type="button" class="btn btn--ghost" data-sec-move="down" ${u===d.data.sections.length-1?"disabled":""}>${p("down",18)}Yo'lda orqaga</button>
        </div>
      </section>
      <section class="ad-card ad-danger">
        <h2>Bo'limni o'chirish</h2>
        <p class="ad-muted">Bo'lim ichidagi barcha mavzular ham o'chadi.${m?" Bu bo'limda o'quvchilar mavzu tugatgan, ularning XP'si ham o'chadi. Yashirib qo'yish xavfsizroq.":""}</p>
        <div class="ad-actions"><button type="button" class="btn btn--danger" data-del>${p("trash",18)}O'chirish</button></div>
      </section>
    </div>`;const v=h.querySelector("form");v.onsubmit=async b=>{b.preventDefault();const z=Object.fromEntries(new FormData(v));if(!z.title.trim()){v.title.setAttribute("aria-invalid","true"),v.title.focus(),K("Bo'lim nomi bo'sh bo'lmasin");return}try{await T.put(`/it/manage/sections/${n}`,z),await d.reload(),d.go(`/section/${n}`,{push:!1,force:!0}),d.toast("Saqlandi")}catch(I){N(I)}};const w=()=>JSON.stringify(Object.fromEntries(new FormData(v))),x=w();d.setDirty(()=>w()!==x),h.querySelector("[data-pub]").onclick=async()=>{try{await T.put(`/it/manage/sections/${n}`,{is_published:!s.is_published}),await d.reload(),d.go(`/section/${n}`,{push:!1,force:!0}),d.toast(s.is_published?"Bo'lim yashirildi":s.lessons.some(b=>b.is_published)?"Bo'lim e'lon qilindi":"Bo'lim e'lon qilindi, lekin unda hali e'lon qilingan mavzu yo'q, shuning uchun o'quvchilar uni ko'rmaydi.")}catch(b){N(b)}},h.querySelectorAll("[data-move]").forEach(b=>{b.onclick=async()=>{const[z,I]=b.dataset.move.split(":");try{await T.post(`/it/manage/lessons/${z}/move`,{dir:I}),await d.reload(),d.go(`/section/${n}`,{push:!1,force:!0})}catch(A){N(A)}}}),h.querySelectorAll("[data-sec-move]").forEach(b=>{b.onclick=async()=>{try{await T.post(`/it/manage/sections/${n}/move`,{dir:b.dataset.secMove}),await d.reload(),d.go(`/section/${n}`,{push:!1,force:!0})}catch(z){N(z)}}}),h.querySelector("[data-del]").onclick=async()=>{confirm(`«${s.title}» bo'limi va undagi ${s.lessons.length} ta mavzu o'chirilsinmi? Buni qaytarib bo'lmaydi.`)&&await fa(`/it/manage/sections/${n}`)&&(await d.reload(),d.go("/",{force:!0}))}}function ot(h,n){const d=m=>`
    <form class="ad-card ad-form ad-tool" data-id="${m?m.id:""}" novalidate>
      <div class="ad-card-h"><h2>${m?k(m.name):"Yangi qurol"}</h2>
        ${m?`<span class="ad-meta">${m.used?`${m.used} ta mavzuda`:"hali ishlatilmagan"}</span>`:""}</div>
      <label class="ad-f"><span>Nomi</span><input name="name" maxlength="80" required value="${m?k(m.name):""}" placeholder="Masalan: Teskari o'ylash"></label>
      <label class="ad-f"><span>Qisqa tavsif <small>o'quvchi profilidagi «qurollar sumkasi»da ko'rinadi</small></span>
        <input name="short" maxlength="160" value="${m?k(m.short):""}" placeholder="Bir qatorda: bu qurol nima qiladi"></label>
      <label class="ad-f"><span>Karta matni <small>darsda «Fikrlash quroli» kartasida chiqadi</small></span>
        <textarea name="body" rows="3" maxlength="1000">${m?k(m.body):""}</textarea></label>
      <div class="ad-actions">
        <button type="submit" class="btn">${m?"Saqlash":"Qo'shish"}</button>
        ${m?`<button type="button" class="btn btn--ghost ad-danger-btn" data-del>${p("trash",18)}O'chirish</button>`:""}
      </div>
    </form>`;h.innerHTML=`
    <div class="ad-page">
      <header class="ad-ph"><div><span class="ad-kicker">MENTAL QUROLLAR</span><h1>Fikrlash qurollari</h1></div></header>
      <p class="ad-muted ad-lead">Qurol mavzuga biriktiriladi. O'quvchi mavzuni tugatganda u sumkasiga qo'shiladi va keyingi mavzularda qayta ishlatiladi.</p>
      ${d(null)}
      ${n.data.tools.map(d).join("")}
    </div>`,h.querySelectorAll("form.ad-tool").forEach(m=>{m.onsubmit=async w=>{w.preventDefault();const x=Object.fromEntries(new FormData(m));if(!x.name.trim()){m.name.setAttribute("aria-invalid","true"),m.name.focus(),K("Qurol nomi bo'sh bo'lmasin");return}try{m.dataset.id?await T.put(`/it/manage/tools/${m.dataset.id}`,x):await T.post("/it/manage/tools",x),await n.reload(),n.go("/tools",{push:!1,force:!0}),n.toast(m.dataset.id?"Saqlandi":"Qurol qo'shildi")}catch(b){N(b)}};const v=m.querySelector("[data-del]");v&&(v.onclick=async()=>{confirm(`«${m.name.value}» qurolini o'chirasizmi?`)&&await fa(`/it/manage/tools/${m.dataset.id}`)&&(await n.reload(),n.go("/tools",{push:!1,force:!0}))})});const u=()=>[...h.querySelectorAll("form.ad-tool")].map(m=>JSON.stringify(Object.fromEntries(new FormData(m)))).join("|"),s=u();n.setDirty(()=>u()!==s)}function dt(h,n){return h.innerHTML=`
    <form method="dialog" class="ad-dlg-f" novalidate>
      <h2>${k(n.title)}</h2>${n.sub?`<p class="ad-muted">${k(n.sub)}</p>`:""}
      ${n.fields.map(d=>d.type==="radio"?`<fieldset class="ad-seg"><legend>${k(d.label)}</legend>${d.options.map(([u,s])=>`
            <label><input type="radio" name="${d.name}" value="${u}" ${u===d.value?"checked":""}><span>${k(s)}</span></label>`).join("")}</fieldset>`:`<label class="ad-f"><span>${k(d.label)}${d.hint?` <small>${k(d.hint)}</small>`:""}</span>
            <input name="${d.name}" maxlength="${d.max||120}" placeholder="${k(d.placeholder||"")}" ${d.required?"required":""}></label>`).join("")}
      <div class="ad-actions">
        <button type="submit" class="btn" value="ok">${k(n.ok)}</button>
        <button type="button" class="btn btn--ghost" data-cancel>Bekor qilish</button>
      </div>
    </form>`,new Promise(d=>{const u=h.querySelector("form");let s=null;u.onsubmit=m=>{const v=n.fields.find(w=>w.required&&!u[w.name].value.trim());if(v){m.preventDefault(),u[v.name].setAttribute("aria-invalid","true"),u[v.name].focus();return}s=Object.fromEntries(new FormData(u))},h.querySelector("[data-cancel]").onclick=()=>h.close(),h.addEventListener("close",()=>d(s),{once:!0}),h.showModal(),u.querySelector("input:not([type=radio])")?.focus()})}export{pt as mountAdmin};
