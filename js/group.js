/**
 * GURUH O'YINI - ustoz hosting + bolalar qo'shilish (Realtime)
 */
const SUPA_URL='https://gziracvxzqyekeniqlcl.supabase.co';
const SUPA_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aXJhY3Z4enF5ZWtlbmlxbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjg5OTYsImV4cCI6MjEwNjYwNDk5Nn0.6tJFqIwi0CtXrumr-AqC2Td87T0wJ0vqjlza_dOnxD0';

const GroupGame = {
    room:null, role:null, channel:null, pool:[], asked:[], locked:false, players:[],

    deviceId: () => {
        let d=localStorage.getItem('codekids_device');
        if(!d){ d='dev-'+Math.random().toString(36).slice(2,10); localStorage.setItem('codekids_device',d); }
        return d;
    },
    openJoin: () => { const m=document.getElementById('joinModal'); if(m){ m.classList.add('show'); const i=document.getElementById('joinCode'); if(i){ i.value=''; i.focus(); } } },
    openHost: () => { const m=document.getElementById('hostModal'); if(m) m.classList.add('show'); },
    msg: (m) => { const e=document.getElementById('joinMsg'); if(e) e.textContent=m||''; },

    // ===== BOLA: kod orqali qo'shilish =====
    join: async (code) => {
        const c=SupaAuth.client();
        const user=JSON.parse(localStorage.getItem('codekids_user')||'null');
        if(!c) return GroupGame.msg('❌ Internet yo\'q');
        if(!user) return GroupGame.msg('❌ Avval nickname bilan kiring');
        if(!code) return GroupGame.msg('❌ Kod kiriting');
        const { data, error } = await c.from('rooms').select('*').eq('code', code.trim()).limit(1);
        if(error || !data || !data.length) return GroupGame.msg('❌ Bunday o\'yin topilmadi');
        const room=data[0];
        if(room.status==='finished') return GroupGame.msg('❌ Bu o\'yin tugagan');
        await c.from('room_players').delete().eq('room_id', room.id).eq('device', GroupGame.deviceId());
        const { error:e2 } = await c.from('room_players').insert({ room_id:room.id, user_id:null, device:GroupGame.deviceId(), nickname:user.nickname, score:0, correct:0 });
        if(e2) return GroupGame.msg('❌ '+e2.message);
        GroupGame.room=room; GroupGame.role='player';
        document.getElementById('joinModal').classList.remove('show');
        GroupGame.openScreen(); GroupGame.subscribe();
    },

    // ===== USTOZ: o'yin yaratish =====
    hostCreate: async () => {
        const c=SupaAuth.client(); const t=SupaAuth.getTeacher();
        if(!c || !t) return alert('❌ Avval ustoz sifatida kiring');
        const topic=document.getElementById('hostTopic').value;
        const level=parseInt(document.getElementById('hostLevel').value);
        const code=String(Math.floor(1000+Math.random()*9000));
        const { data, error } = await c.from('rooms').insert({ host_id:t.id, code:code, topic:topic, level:level, status:'waiting' }).select().single();
        if(error) return alert('❌ '+error.message);
        GroupGame.room=data; GroupGame.role='host';
        const r=await fetch(SUPA_URL+'/rest/v1/questions?topic=eq.'+topic+'&level=eq.'+level+'&select=question,options,answer', { headers:{ apikey:SUPA_KEY, Authorization:'Bearer '+SUPA_KEY } });
        GroupGame.pool = r.ok ? await r.json() : [];
        if(!GroupGame.pool.length) alert('⚠️ Bu mavzu+darajada savollaringiz yo\'q! Avval panelda savol yarating.');
        document.getElementById('hostModal').classList.remove('show');
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
        if(st) st.textContent = room.status==='waiting' ? '⏳ O\'qituvchi boshlashini kutmoqdamiz...' : (room.status==='playing' ? '🎮 Savol '+room.round : '🏁 O\'yin tugadi');
        if(GroupGame.role==='host'){
            const hb=document.getElementById('gpHostControls');
            if(hb){
                if(room.status==='waiting') hb.innerHTML='<button class="btn-primary" onclick="GroupGame.hostStart()">🚀 O\'yinni boshlash</button>';
                else if(room.status==='playing') hb.innerHTML='<button class="btn-primary" onclick="GroupGame.nextQuestion()">➡️ Keyingi savol</button> <button class="btn-secondary" onclick="GroupGame.setStatus(\'finished\')">🏁 Tugatish</button>';
                else hb.innerHTML='<p>🏆 O\'yin tugadi. Yakuniy reyting pastda.</p>';
            }
        } else {
            if(room.status==='playing' && room.question && (!prev || prev.round!==room.round)) GroupGame.showQuestion(room.question);
            if(room.status==='finished'){ const qc=document.getElementById('gpQuestion'); if(qc) qc.innerHTML='<h3>🏁 O\'yin tugadi! Yakuniy natijalar pastda.</h3>'; }
        }
        GroupGame.renderPlayers();
    },

    showQuestion: (q) => {
        GroupGame.locked=false;
        const qc=document.getElementById('gpQuestion');
        if(!qc) return;
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

    hostStart: async () => {
        await GroupGame.setStatus('playing');
        await GroupGame.nextQuestion();
    },
    nextQuestion: async () => {
        if(!GroupGame.pool.length) return alert('❌ Savollar yo\'q! Avval panelda savol yarating.');
        let fresh=GroupGame.pool.filter(q=>GroupGame.asked.indexOf(q.question)===-1);
        if(!fresh.length){ GroupGame.asked=[]; fresh=GroupGame.pool; }
        const q=fresh[Math.floor(Math.random()*fresh.length)];
        GroupGame.asked.push(q.question);
        const c=SupaAuth.client();
        await c.from('rooms').update({ question:{ q:q.question, options:q.options, a:q.answer }, round:(GroupGame.room.round||0)+1 }).eq('id',GroupGame.room.id);
    },
    setStatus: async (st) => { const c=SupaAuth.client(); await c.from('rooms').update({status:st}).eq('id',GroupGame.room.id); },

    renderPlayers: async () => {
        const c=SupaAuth.client(); if(!c||!GroupGame.room) return;
        const { data } = await c.from('room_players').select('*').eq('room_id',GroupGame.room.id).order('score',{ascending:false});
        GroupGame.players=data||[];
        const el=document.getElementById('gpPlayers');
        if(el) el.innerHTML = GroupGame.players.map((p,i)=>'<div class="gp-row">'+(i+1)+'. '+p.nickname+' — <b>'+p.score+'</b> ball ✅'+p.correct+'</div>').join('') || '<p>Hali o\'yinchilar yo\'q</p>';
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
                '<h3>👥 O\'yinchilar ('+0+')</h3><div id="gpPlayers"></div>';
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
    const jb=document.getElementById('joinBtn');
    if(jb) jb.onclick=()=>GroupGame.join(document.getElementById('joinCode').value);
    const hb=document.getElementById('hostCreateBtn');
    if(hb) hb.onclick=()=>GroupGame.hostCreate();
});
