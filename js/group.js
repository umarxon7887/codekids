/**
 * GURUH O'YINLARI - universal hosting engine (Realtime)
 * YANGI O'YIN qo'shish: GAMES ro'yxatiga obyekt qo'shing + engine branch yozing
 */
const SUPA_URL='https://gziracvxzqyekeniqlcl.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aXJhY3Z4enF5ZWtlbmlxbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjg5OTYsImV4cCI6MjEwNjYwNDk5Nn0.6tJFqIwi0CtXrumr-AqC2Td87T0wJ0vqjlza_dOnxD0';

const GAMES = [
  { id:"quiz", emoji:"🎮", name:"Guruh viktorinasi", desc:"Ustoz savol beradi, bolalar jonli javob beradi",
    settings:[
      { id:"topic", options:[["matematik","➕ Matematika"],["mantiq","🧠 Mantiq"],["it","💻 IT"],["ingliz","🔤 Ingliz"],["fan","🌍 Tabiat"]] },
      { id:"level", options:[["1","1-daraja"],["2","2-daraja"],["3","3-daraja"],["4","4-daraja"]] }
    ]},
  { id:"typing", emoji:"⌨️", name:"Typing poygasi", desc:"Bir xil matn — kim tez va aniq yozsa!",
    settings:[
      { id:"lang", options:[["uz","O'zbekcha"],["ru","Русский"],["en","English"]] },
      { id:"tlen", options:[["1","Bitta matn"],["2","Ikki matn (uzunroq)"]] }
    ]}
];

const GroupGame = {
  room:null, role:null, channel:null, pool:[], asked:[], locked:false, players:[],
  selectedGame:null, myRow:null, tState:null, lastUpd:0,

  deviceId: () => {
    let d=localStorage.getItem('codekids_device');
    if(!d){ d='dev-'+Math.random().toString(36).slice(2,10); localStorage.setItem('codekids_device',d); }
    return d;
  },
  openJoin: () => { const m=document.getElementById('joinModal'); if(m){ m.classList.add('show'); const i=document.getElementById('joinCode'); if(i){ i.value=''; i.focus(); } } },
  msg: (m) => { const e=document.getElementById('joinMsg'); if(e) e.textContent=m||''; },

  // ===== BOLA: kod orqali qo'shilish =====
  join: async (code) => {
    const c=SupaAuth.client();
    const user=JSON.parse(localStorage.getItem('codekids_user')||'null');
    if(!c) return GroupGame.msg('Internet yo\'q');
    if(!user) return GroupGame.msg('Avval nickname bilan kiring');
    if(!code) return GroupGame.msg('Kod kiriting');
    const { data, error } = await c.from('rooms').select('*').eq('code', code.trim()).limit(1);
    if(error || !data || !data.length) return GroupGame.msg('Bunday o\'yin topilmadi');
    const room=data[0];
    if(room.status==='finished') return GroupGame.msg('Bu o\'yin tugagan');
    await c.from('room_players').delete().eq('room_id', room.id).eq('device', GroupGame.deviceId());
    const { error:e2 } = await c.from('room_players').insert({ room_id:room.id, user_id:null, device:GroupGame.deviceId(), nickname:user.nickname, score:0, correct:0 });
    if(e2) return GroupGame.msg(e2.message);
    GroupGame.room=room; GroupGame.role='player';
    document.getElementById('joinModal').classList.remove('show');
    GroupGame.openScreen(); GroupGame.subscribe();
  },

  // ===== O'YINLAR PANELI =====
  renderGames: () => {
    const g=document.getElementById('gamesGrid'); if(!g) return;
    g.innerHTML=GAMES.map(x=>'<div class="game-card'+(GroupGame.selectedGame===x.id?' selected':'')+'" onclick="GroupGame.selectGame(\''+x.id+'\')">'+x.emoji+' <b>'+x.name+'</b><small>'+x.desc+'</small></div>').join('');
  },
  selectGame: (id) => {
    GroupGame.selectedGame=id; GroupGame.renderGames();
    const st=document.getElementById('gameSettings'); if(!st) return;
    const game=GAMES.find(x=>x.id===id);
    st.style.display='flex';
    st.innerHTML=game.settings.map(s=>'<select id="gs_'+s.id+'">'+s.options.map(o=>'<option value="'+o[0]+'">'+o[1]+'</option>').join('')+'</select>').join('')+'<button class="btn-primary" id="hostStartBtn">🚀 O\'yinni boshlash</button>';
    document.getElementById('hostStartBtn').onclick=()=>GroupGame.hostCreate();
  },
  getSettings: () => {
    const game=GAMES.find(x=>x.id===GroupGame.selectedGame); const out={};
    (game?game.settings:[]).forEach(s=>{ const el=document.getElementById('gs_'+s.id); out[s.id]=el?el.value:null; });
    return out;
  },

  // ===== USTOZ: o'yin yaratish =====
  hostCreate: async () => {
    const c=SupaAuth.client(); const t=SupaAuth.getTeacher();
    if(!c||!t) return alert('Avval ustoz sifatida kiring');
    const gtype=GroupGame.selectedGame||'quiz';
    const set=GroupGame.getSettings();
    let topic='matematik', level=1;
    if(gtype==='quiz'){ topic=set.topic||'matematik'; level=parseInt(set.level||'1'); }
    else { topic=set.lang||'uz'; level=parseInt(set.tlen||'1'); }
    const code=String(Math.floor(1000+Math.random()*9000));
    let r=await c.from('rooms').insert({ host_id:t.id, code:code, topic:topic, level:level, status:'waiting', game_type:gtype }).select().single();
    if(r.error){
      if(gtype==='typing') return alert('SQL kerak! Supabase da: alter table public.rooms add column if not exists game_type text default \'quiz\';');
      r=await c.from('rooms').insert({ host_id:t.id, code:code, topic:topic, level:level, status:'waiting' }).select().single();
    }
    if(r.error) return alert('XATO: '+r.error.message);
    GroupGame.room=r.data; GroupGame.role='host';
    if(gtype==='quiz'){
      const resp=await fetch(SUPA_URL+'/rest/v1/questions?topic=eq.'+topic+'&level=eq.'+level+'&select=question,options,answer', { headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY } });
      GroupGame.pool=resp.ok?await resp.json():[];
      if(!GroupGame.pool.length) alert('Diqqat: bu mavzuda savollaringiz yo\'q! Avval savol yarating.');
    }
    GroupGame.openScreen(); GroupGame.subscribe();
  },

  subscribe: () => {
    const c=SupaAuth.client(); const id=GroupGame.room.id;
    GroupGame.channel=c.channel('room-'+id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:'id=eq.'+id},ev=>GroupGame.onRoom(ev.new))
      .on('postgres_changes',{event:'*',schema:'public',table:'room_players',filter:'room_id=eq.'+id},()=>GroupGame.renderPlayers())
      .subscribe();
    GroupGame.onRoom(GroupGame.room);
  },

  onRoom: (room) => {
    if(!room) return;
    const prev=GroupGame.room;
    GroupGame.room=room;
    const st=document.getElementById('gpStatus');
    if(st) st.textContent = room.status==='waiting' ? '⏳ O\'qituvchi boshlashini kutmoqdamiz...' : (room.status==='playing' ? '🎮 O\'yin ketmoqda!' : '🏁 O\'yin tugadi');
    if(GroupGame.role==='host'){
      const hb=document.getElementById('gpHostControls');
      if(hb){
        if(room.status==='waiting') hb.innerHTML='<button class="btn-primary" onclick="GroupGame.hostStart()">🚀 Boshlash</button>';
        else if(room.status==='playing') hb.innerHTML='<button class="btn-primary" onclick="GroupGame.hostStart()">➡️ Keyingi savol / tur</button> <button class="btn-secondary" onclick="GroupGame.setStatus(\'finished\')">🏁 Tugatish</button>';
        else hb.innerHTML='<p>🏆 O\'yin tugadi. Yakuniy reyting pastda.</p>';
      }
    } else {
      if(room.status==='playing' && room.question && (!prev || prev.round!==room.round)){
        if((room.game_type||'quiz')==='typing') GroupGame.showTyping(room.question.text);
        else GroupGame.showQuestion(room.question);
      }
      if(room.status==='finished'){ const qc=document.getElementById('gpQuestion'); if(qc) qc.innerHTML='<h3>🏁 O\'yin tugadi! Yakuniy natijalar pastda.</h3>'; }
    }
    GroupGame.renderPlayers();
  },

  // ===== QUIZ engine =====
  showQuestion: (q) => {
    GroupGame.locked=false;
    const qc=document.getElementById('gpQuestion'); if(!qc) return;
    qc.innerHTML='<h3>'+q.q+'</h3><div class="gp-opts">'+q.options.map((o,i)=>'<button class="gp-opt" onclick="GroupGame.answer('+i+')">'+o+'</button>').join('')+'</div><div class="feedback" id="gpFeedback"></div>';
  },
  answer: async (i) => {
    if(GroupGame.locked) return; GroupGame.locked=true;
    const q=GroupGame.room.question; const ok=(i===q.a);
    const c=SupaAuth.client();
    const { data } = await c.from('room_players').select('*').eq('room_id',GroupGame.room.id).eq('device',GroupGame.deviceId()).limit(1);
    if(data && data.length){
      const row=data[0];
      await c.from('room_players').update({ score: row.score+(ok?100:0), correct: row.correct+(ok?1:0) }).eq('id', row.id);
    }
    const fb=document.getElementById('gpFeedback');
    if(fb){ fb.textContent=ok?'✅ To\'g\'ri! +100 ball':'❌ Noto\'g\'ri'; fb.className='feedback '+(ok?'correct':'wrong'); }
    GroupGame.renderPlayers();
  },
  nextQuestion: async () => {
    if(!GroupGame.pool.length) return alert('Savollar yo\'q! Avval panelda savol yarating.');
    let fresh=GroupGame.pool.filter(q=>GroupGame.asked.indexOf(q.question)===-1);
    if(!fresh.length){ GroupGame.asked=[]; fresh=GroupGame.pool; }
    const q=fresh[Math.floor(Math.random()*fresh.length)];
    GroupGame.asked.push(q.question);
    const c=SupaAuth.client();
    await c.from('rooms').update({ question:{ q:q.question, options:q.options, a:q.answer }, round:(GroupGame.room.round||0)+1 }).eq('id',GroupGame.room.id);
  },

  // ===== TYPING engine =====
  startTypingRound: async () => {
    const bank=(typeof TYPING_TEXTS!=='undefined' && TYPING_TEXTS[GroupGame.room.topic])?TYPING_TEXTS[GroupGame.room.topic]:null;
    if(!bank||!bank.length) return alert('Matnlar topilmadi!');
    let text=bank[Math.floor(Math.random()*bank.length)];
    if(GroupGame.room.level>=2){ text=text+' '+bank[Math.floor(Math.random()*bank.length)]; }
    const c=SupaAuth.client();
    await c.from('rooms').update({ question:{ text:text }, round:(GroupGame.room.round||0)+1 }).eq('id',GroupGame.room.id);
  },
  showTyping: async (text) => {
    GroupGame.tState={ text:text, done:false };
    const qc=document.getElementById('gpQuestion'); if(!qc) return;
    qc.innerHTML='<div class="race-text" id="gpText" style="max-height:120px;overflow-y:auto;background:#181825;padding:12px;border-radius:10px;line-height:1.9;white-space:pre-wrap;"></div><input type="text" class="race-input" id="gpInput" placeholder="Shu yerdan yozing..." autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false"><div class="feedback" id="gpFeedback"></div>';
    GroupGame.renderTypingText('');
    const c=SupaAuth.client();
    const { data }=await c.from('room_players').select('*').eq('room_id',GroupGame.room.id).eq('device',GroupGame.deviceId()).limit(1);
    GroupGame.myRow=data&&data.length?data[0]:null;
    const inp=document.getElementById('gpInput');
    if(inp){ inp.focus(); inp.oninput=()=>GroupGame.typingInput(inp.value); }
  },
  renderTypingText: (typed) => {
    const el=document.getElementById('gpText'); if(!el||!GroupGame.tState) return;
    const text=GroupGame.tState.text; let html='';
    for(let i=0;i<text.length;i++){
      let cls='future';
      if(i<typed.length) cls=typed[i]===text[i]?'correct':'wrong';
      else if(i===typed.length) cls='current';
      html+='<span class="char '+cls+'" style="padding:1px 0;border-radius:3px;">'+(text[i]===' '?'&nbsp;':text[i])+'</span>';
    }
    el.innerHTML=html;
    const cur=el.querySelector('.char.current');
    if(cur) el.scrollTop=Math.max(0, cur.offsetTop-el.clientHeight+60);
  },
  typingInput: (typed) => {
    const st=GroupGame.tState; if(!st||st.done) return;
    const text=st.text; let correct=0;
    for(let i=0;i<typed.length;i++){ if(typed[i]===text[i]) correct++; }
    GroupGame.renderTypingText(typed);
    const done=typed.length>=text.length;
    const now=Date.now();
    if(done || now-GroupGame.lastUpd>1000){
      GroupGame.lastUpd=now;
      if(done && !st.done){
        st.done=true; GroupGame.updRow(correct+500,1);
        const fb=document.getElementById('gpFeedback'); if(fb){ fb.textContent='🏁 Tayyor! +500 bonus'; fb.className='feedback correct'; }
        const inp=document.getElementById('gpInput'); if(inp) inp.disabled=true;
      } else if(!done){ GroupGame.updRow(correct,0); }
      GroupGame.renderPlayers();
    }
  },
  updRow: async (score, fin) => {
    if(!GroupGame.myRow) return;
    const c=SupaAuth.client();
    await c.from('room_players').update({ score:score, correct:fin }).eq('id',GroupGame.myRow.id);
  },

  // ===== UMUMIY =====
  hostStart: async () => {
    await GroupGame.setStatus('playing');
    if((GroupGame.room.game_type||'quiz')==='typing') GroupGame.startTypingRound();
    else GroupGame.nextQuestion();
  },
  setStatus: async (st) => { const c=SupaAuth.client(); await c.from('rooms').update({status:st}).eq('id',GroupGame.room.id); },

  renderPlayers: async () => {
    const c=SupaAuth.client(); if(!c||!GroupGame.room) return;
    const { data } = await c.from('room_players').select('*').eq('room_id',GroupGame.room.id).order('score',{ascending:false});
    GroupGame.players=data||[];
    const el=document.getElementById('gpPlayers'); if(!el) return;
    const typing=(GroupGame.room.game_type||'quiz')==='typing';
    const max=(GroupGame.room.question&&GroupGame.room.question.text)?GroupGame.room.question.text.length:1;
    el.innerHTML=GroupGame.players.map((p,i)=>{
      const extra=typing?(Math.min(100,Math.round(p.score/max*100))+'% '+(p.correct?'🏁':'✍️')):('<b>'+p.score+'</b> ball ✅'+p.correct);
      return '<div class="gp-row">'+(i+1)+'. '+p.nickname+' — '+extra+'</div>';
    }).join('')||'<p>Hali o\'yinchilar yo\'q</p>';
  },

  openScreen: () => {
    Navigation.showScreen('group');
    const el=document.getElementById('groupContent');
    const r=GroupGame.room;
    if(GroupGame.role==='host'){
      el.innerHTML='<div class="game-header"><button class="btn-back" onclick="GroupGame.leave()">← Chiqish</button><h2>🌐 Guruh o\'yini</h2></div>'+
        '<div class="host-code">O\'YIN KODI: <b>'+r.code+'</b></div>'+
        '<p class="gp-hint">Bolalar uy sahifadagi "O\'yinga qo\'shilish" tugmasi orqali shu kodni kiritadilar</p>'+
        '<div id="gpHostControls"></div>'+
        '<h3>👥 O\'yinchilar</h3><div id="gpPlayers"></div>';
    } else {
      el.innerHTML='<div class="game-header"><button class="btn-back" onclick="GroupGame.leave()">← Chiqish</button><h2>🎮 Guruh o\'yini</h2></div>'+
        '<div id="gpStatus" class="gp-status"></div>'+
        '<div id="gpQuestion" class="gp-question"></div>'+
        '<h3>🏆 Jonli reyting</h3><div id="gpPlayers"></div>';
    }
    GroupGame.onRoom(r);
  },

  leave: () => {
    if(GroupGame.channel){ const c=SupaAuth.client(); if(c) c.removeChannel(GroupGame.channel); GroupGame.channel=null; }
    GroupGame.room=null; GroupGame.role=null;
    Navigation.goHome();
  }
};

document.addEventListener('DOMContentLoaded', () => {
  GroupGame.renderGames();
  const jb=document.getElementById('joinBtn');
  if(jb) jb.onclick=()=>GroupGame.join(document.getElementById('joinCode').value);
});
