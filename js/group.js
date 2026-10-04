/**
 * GURUH O'YINLARI - xona + ID orqali HAQIQIY o'yinlarga ulash
 * GAMES: yangi o'yin qo'shish uchun ro'yxatga obyekt qo'shing
 */
const SUPA_URL='https://gziracvxzqyekeniqlcl.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aXJhY3Z4enF5ZWtlbmlxbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjg5OTYsImV4cCI6MjEwNjYwNDk5Nn0.6tJFqIwi0CtXrumr-AqC2Td87T0wJ0vqjlza_dOnxD0';

const GAMES = [
  { id:"labirint", emoji:"🧩", name:"Labirint o'yini", desc:"Maxluq ustoz yaratgan savollarni beradi",
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
  room:null, role:null, channel:null, players:[], selectedGame:null, myRow:null, lastRep:0,

  deviceId: () => {
    let d=localStorage.getItem('codekids_device');
    if(!d){ d='dev-'+Math.random().toString(36).slice(2,10); localStorage.setItem('codekids_device',d); }
    return d;
  },
  openJoin: () => { const m=document.getElementById('joinModal'); if(m){ m.classList.add('show'); const i=document.getElementById('joinCode'); if(i){ i.value=''; i.focus(); } } },
  msg: (m) => { const e=document.getElementById('joinMsg'); if(e) e.textContent=m||''; },

  // ===== BOLA: ID orqali qo'shilish -> HAQIQIY O'YINGA o'tish =====
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
    document.getElementById('joinModal').classList.remove('show');
    if(room.game_type!=='typing'){
      location.href='labirint/game.html?room='+room.code;
      return;
    }
    // typing
    GroupGame.room=room; GroupGame.role='player';
    TypingGame.initGroup(room);
    Navigation.showScreen('game');
    GroupGame.subscribe();
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

  // ===== USTOZ: xona yaratish =====
  hostCreate: async () => {
    const c=SupaAuth.client(); const t=SupaAuth.getTeacher();
    if(!c||!t) return alert('Avval ustoz sifatida kiring');
    const gtype=GroupGame.selectedGame||'labirint';
    const set=GroupGame.getSettings();
    let topic='matematik', level=1;
    if(gtype==='labirint'){ topic=set.topic||'matematik'; level=parseInt(set.level||'1'); }
    else { topic=set.lang||'uz'; level=parseInt(set.tlen||'1'); }
    const code=String(Math.floor(1000+Math.random()*9000));
    let r=await c.from('rooms').insert({ host_id:t.id, code:code, topic:topic, level:level, status:'waiting', game_type:gtype }).select().single();
    if(r.error){
      if(gtype==='typing') return alert('SQL kerak! Supabase da bajaring: alter table public.rooms add column if not exists game_type text default \'quiz\';');
      r=await c.from('rooms').insert({ host_id:t.id, code:code, topic:topic, level:level, status:'waiting' }).select().single();
    }
    if(r.error) return alert('XATO: '+r.error.message);
    GroupGame.room=r.data; GroupGame.role='host';
    GroupGame.openScreen(); GroupGame.subscribe();
  },

  subscribe: () => {
    const c=SupaAuth.client(); const id=GroupGame.room.id;
    if(GroupGame.channel) c.removeChannel(GroupGame.channel);
    GroupGame.channel=c.channel('room-'+id)
      .on('postgres_changes',{event:'UPDATE',schema:'public',table:'rooms',filter:'id=eq.'+id},ev=>GroupGame.onRoom(ev.new))
      .on('postgres_changes',{event:'*',schema:'public',table:'room_players',filter:'room_id=eq.'+id},()=>{ GroupGame.renderPlayers(); GroupGame.renderBoard(); })
      .subscribe();
    GroupGame.onRoom(GroupGame.room);
  },

  onRoom: (room) => {
    if(!room) return;
    const prev=GroupGame.room;
    GroupGame.room=room;
    const gtype=(room.game_type||'labirint');
    if(GroupGame.role==='host'){
      const st=document.getElementById('gpStatus'); if(st) st.textContent='';
      const hb=document.getElementById('gpHostControls');
      if(hb){
        if(room.status==='waiting') hb.innerHTML='<button class="btn-primary" onclick="GroupGame.hostStart()">🚀 Boshlash</button>';
        else if(room.status==='playing') hb.innerHTML=(gtype==='typing'?'<button class="btn-primary" onclick="GroupGame.hostStart()">➡️ Keyingi tur</button> ':'')+'<button class="btn-secondary" onclick="GroupGame.setStatus(\'finished\')">🏁 Tugatish</button>';
        else hb.innerHTML='<p>🏆 O\'yin tugadi. Yakuniy reyting pastda.</p>';
      }
    } else if(gtype==='typing'){
      if(room.status==='playing' && room.question && room.question.text && (!prev || prev.round!==room.round)){
        TypingGame.loadGroupText(room.question.text);
      }
      if(room.status==='finished'){
        const res=document.getElementById('raceResult');
        if(res && !res.classList.contains('show')){ res.innerHTML='<div class="result-box"><div class="result-medal">🏁</div><h2>O\'yin tugadi!</h2><p style="color:#a6adc8;">Yakuniy reyting o\'qituvchida</p></div>'; res.classList.add('show'); }
      }
    }
    GroupGame.renderPlayers(); GroupGame.renderBoard();
  },

  // ===== HOST boshqaruvi =====
  hostStart: async () => {
    const gtype=(GroupGame.room.game_type||'labirint');
    await GroupGame.setStatus('playing');
    if(gtype==='typing') GroupGame.startTypingRound();
  },
  startTypingRound: async () => {
    const bank=(typeof TYPING_TEXTS!=='undefined' && TYPING_TEXTS[GroupGame.room.topic])?TYPING_TEXTS[GroupGame.room.topic]:null;
    if(!bank||!bank.length) return alert('Matnlar topilmadi!');
    let text=bank[Math.floor(Math.random()*bank.length)];
    if(GroupGame.room.level>=2){ text=text+' '+bank[Math.floor(Math.random()*bank.length)]; }
    const c=SupaAuth.client();
    await c.from('rooms').update({ question:{ text:text }, round:(GroupGame.room.round||0)+1 }).eq('id',GroupGame.room.id);
  },
  setStatus: async (st) => { const c=SupaAuth.client(); await c.from('rooms').update({status:st}).eq('id',GroupGame.room.id); },

  // ===== BALL / PROGRESS yuborish =====
  reportProgress: async (score, done) => {
    const c=SupaAuth.client(); if(!c||!GroupGame.room) return;
    if(!GroupGame.myRow){
      const { data }=await c.from('room_players').select('*').eq('room_id',GroupGame.room.id).eq('device',GroupGame.deviceId()).limit(1);
      GroupGame.myRow=data&&data.length?data[0]:null;
    }
    if(!GroupGame.myRow) return;
    await c.from('room_players').update({ score:score+(done?500:0), correct:done?1:0 }).eq('id',GroupGame.myRow.id);
    GroupGame.renderBoard();
  },

  renderBoard: async () => {
    const el=document.getElementById('groupBoard'); if(!el||!GroupGame.room) return;
    const c=SupaAuth.client(); if(!c) return;
    const { data }=await c.from('room_players').select('*').eq('room_id',GroupGame.room.id).order('score',{ascending:false});
    const max=(GroupGame.room.question&&GroupGame.room.question.text)?GroupGame.room.question.text.length:1;
    el.innerHTML=(data||[]).map((p,i)=>'<span class="gb-chip'+(i===0?' lead':'')+'">'+(i+1)+'. '+p.nickname+' '+Math.min(100,Math.round(p.score/max*100))+'%'+(p.correct?' 🏁':'')+'</span>').join('');
  },

  renderRace: (el, max) => {
    if(!el || !GroupGame.players || !GroupGame.players.length) { if(el) el.innerHTML='<div class="road-line"></div><div class="race-finish">🏁</div>'; return; }
    const order=[...GroupGame.players].sort((a,b)=>a.id-b.id);
    const emojis=['🚗','🚕','🚙','🏎️','🚓','🚑','🚒','🛻','🚜','🏍️'];
    el.style.height=(order.length*46)+'px';
    el.innerHTML='<div class="race-finish">🏁</div>'+order.map((p,i)=>{
      const pct=Math.min(100, Math.round((p.score||0)/max*100));
      return '<div class="race-lane dyn" style="top:'+(i*46)+'px;height:46px;">'+
        '<span class="lane-name">'+emojis[i%10]+' '+p.nickname+(p.correct?' 🏁':'')+'</span>'+
        '<div class="race-car dyn" style="left:'+(pct*0.84)+'%;">'+emojis[i%10]+'</div>'+
        '<span class="lane-pct">'+pct+'%</span></div>';
    }).join('');
  },
  renderPlayers: async () => {
    const c=SupaAuth.client(); if(!c||!GroupGame.room) return;
    const { data } = await c.from('room_players').select('*').eq('room_id',GroupGame.room.id).order('score',{ascending:false});
    GroupGame.players=data||[];
    const el=document.getElementById('gpPlayers'); if(!el) return;
    const gtype=(GroupGame.room.game_type||'labirint');
    const max=(GroupGame.room.question&&GroupGame.room.question.text)?GroupGame.room.question.text.length:1;
    el.innerHTML=GroupGame.players.map((p,i)=>{
      const extra=(gtype==='typing')?(Math.min(100,Math.round(p.score/max*100))+'% '+(p.correct?'🏁':'✍️')):('<b>'+p.score+'</b> ball');
      return '<div class="gp-row">'+(i+1)+'. '+p.nickname+' — '+extra+'</div>';
    }).join('')||'<p>Hali o\'yinchilar yo\'q — kodni bolalarga ayting!</p>';
    GroupGame.renderRace(document.getElementById('hostRace'), max);
    GroupGame.renderRace(document.querySelector('#gameScreen .race-track'), max);
  },

  openScreen: () => {
    Navigation.showScreen('group');
    const el=document.getElementById('groupContent');
    const r=GroupGame.room;
    el.innerHTML='<div class="game-header"><button class="btn-back" onclick="GroupGame.leave()">← Chiqish</button><h2>🌐 '+(GAMES.find(g=>g.id===(r.game_type||'labirint'))||{}).name+'</h2></div>'+
      '<div class="host-code">O\'YIN KODI: <b>'+r.code+'</b></div>'+
      '<p class="gp-hint">Bolalar uy sahifadagi "O\'yinga qo\'shilish" tugmasi orqali shu kodni kiritadilar</p>'+
      '<div class="race-track" id="hostRace" style="margin:12px 0;"></div><div id="gpHostControls"></div>'+
      '<h3>👥 O\'yinchilar</h3><div id="gpPlayers"></div>';
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
