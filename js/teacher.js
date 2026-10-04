/**
 * O'QITUVCHI PANELI - savol yaratish va boshqarish
 */
const TeacherPanel = {
    open: () => {
        Navigation.showScreen('teacher');
        TeacherPanel.load();
        if (window.GroupGame) GroupGame.renderGames();
    },

    save: async () => {
        const c = SupaAuth.client();
        const t = SupaAuth.getTeacher();
        const msg = document.getElementById('qMsg');
        if (!c || !t) { if (msg) msg.textContent = '❌ Avval ustoz sifatida kiring'; return; }
        const topic = document.getElementById('qTopic').value;
        const level = parseInt(document.getElementById('qLevel').value);
        const q = document.getElementById('qText').value.trim();
        const opts = [0,1,2,3].map(i => document.getElementById('qOpt'+i).value.trim());
        const a = parseInt(document.getElementById('qAnswer').value);
        if (q.length < 5) { if (msg) msg.textContent = '❌ Savol matni juda qisqa'; return; }
        if (opts.some(o => !o)) { if (msg) msg.textContent = '❌ Barcha 4 variantni to\'ldiring'; return; }
        const btn = document.getElementById('qSaveBtn');
        if (btn) { btn.disabled = true; btn.textContent = '⏳ Saqlanmoqda...'; }
        const { error } = await c.from('questions').insert({ teacher_id: t.id, topic: topic, question: q, options: opts, answer: a, level: level });
        if (btn) { btn.disabled = false; btn.textContent = '💾 Saqlash'; }
        if (error) { if (msg) msg.textContent = '❌ ' + error.message; return; }
        if (msg) msg.textContent = '✅ Savol saqlandi! Endi labirint o\'yinida chiqadi.';
        ['qText','qOpt0','qOpt1','qOpt2','qOpt3'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
        TeacherPanel.load();
    },

    // ============ CSV YUKLASH ============
    parseCSV: (text) => {
        const firstLine=(text.split(/\r?\n/)[0])||'';
        const delim=((firstLine.match(/;/g)||[]).length>(firstLine.match(/,/g)||[]).length)?';':',';
        const rows=[]; let row=[], cur='', inQ=false;
        for(let i=0;i<text.length;i++){
            const ch=text[i];
            if(inQ){
                if(ch=='"'){ if(text[i+1]=='"'){ cur+='"'; i++; } else inQ=false; }
                else cur+=ch;
            } else {
                if(ch=='"') inQ=true;
                else if(ch===delim){ row.push(cur); cur=''; }
                else if(ch=='\n'){ row.push(cur); rows.push(row); row=[]; cur=''; }
                else if(ch!='\r') cur+=ch;
            }
        }
        if(cur!==''||row.length){ row.push(cur); rows.push(row); }
        return rows.filter(r=>r.some(c=>c.trim()!==''));
    },

    template: () => {
        const csv='mavzu;daraja;savol;1-variant;2-variant;3-variant;4-variant;togri_javob\n'+
            'matematik;1;12 va 10 ning EKUK i nechaga teng?;60;120;240;12;1\n'+
            'mantiq;2;Davom eting: 2, 4, 8, 16, ...;24;32;18;20;2\n'+
            'it;1;Kompyuterning "miyasi" qaysi?;Monitor;Protsessor;Klaviatura;Printer;2\n'+
            'ingliz;1;"Apple" so\'zining tarjimasi?;Nok;Olma;Uzum;Sabzi;2\n';
        const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});
        const a=document.createElement('a');
        a.href=URL.createObjectURL(blob);
        a.download='codekids_savollar_namuna.csv';
        a.click();
    },

    uploadCSV: async () => {
        const c=SupaAuth.client(); const t=SupaAuth.getTeacher();
        const msg=document.getElementById('csvMsg');
        const fi=document.getElementById('csvFile');
        if(!c||!t){ if(msg) msg.textContent='❌ Avval ustoz sifatida kiring'; return; }
        if(!fi.files.length){ if(msg) msg.textContent='❌ Avval CSV fayl tanlang'; return; }
        msg.textContent='⏳ O\'qilmoqda...';
        const text=await fi.files[0].text();
        const rows=TeacherPanel.parseCSV(text);
        if(!rows.length){ msg.textContent='❌ Fayl bo\'sh'; return; }
        let start=0;
        const f0=rows[0].map(x=>(x||'').toLowerCase());
        if(f0.some(x=>x.includes('mavzu')||x.includes('topic')||x.includes('savol')||x.includes('question'))) start=1;
        const topics=['matematik','mantiq','it','ingliz','fan'];
        const alias={'matematika':'matematik','math':'matematik','mantiqiy':'mantiq','logic':'mantiq','informatika':'it','computer':'it','english':'ingliz','ingliz tili':'ingliz','tabiat':'fan','biologiya':'fan'};
        const valid=[], errors=[];
        rows.slice(start).forEach((r,i)=>{
            const n=i+start+1;
            if(r.length<8){ errors.push(n+'-qator: ustunlar kam ('+r.length+'/8)'); return; }
            let topic=r[0].trim().toLowerCase();
            if(alias[topic]) topic=alias[topic];
            if(!topics.includes(topic)){ errors.push(n+'-qator: noma\'lum mavzu "'+r[0]+'"'); return; }
            const level=parseInt(r[1]);
            if(!(level>=1&&level<=4)){ errors.push(n+'-qator: daraja 1-4 bo\'lsin'); return; }
            const question=r[2].trim();
            if(question.length<5){ errors.push(n+'-qator: savol juda qisqa'); return; }
            const opts=[r[3],r[4],r[5],r[6]].map(x=>(x||'').trim());
            if(opts.some(o=>!o)){ errors.push(n+'-qator: variantlar bo\'sh'); return; }
            let ans=parseInt(r[7]);
            if(ans>=1&&ans<=4) ans=ans-1;
            else if(!(ans>=0&&ans<=3)){ errors.push(n+'-qator: javob 1-4 raqami'); return; }
            valid.push({ teacher_id:t.id, topic:topic, question:question, options:opts, answer:ans, level:level });
        });
        if(!valid.length){ msg.innerHTML='❌ Yaroqli savol topilmadi:<br>'+errors.slice(0,6).join('<br>'); return; }
        const { error } = await c.from('questions').insert(valid);
        if(error){ msg.textContent='❌ '+error.message; return; }
        msg.innerHTML='✅ <b>'+valid.length+'</b> ta savol qo\'shildi!'+(errors.length?'<br>⚠️ '+errors.length+' ta xatoli qator:<br>'+errors.slice(0,6).join('<br>'):'');
        fi.value='';
        TeacherPanel.load();
    },
    del: async (id) => {
        if (!confirm('Savolni o\'chirasizmi?')) return;
        const c = SupaAuth.client();
        if (!c) return;
        await c.from('questions').delete().eq('id', id);
        TeacherPanel.load();
    },

    load: async () => {
        const c = SupaAuth.client();
        const t = SupaAuth.getTeacher();
        const list = document.getElementById('qList');
        if (!c || !t || !list) return;
        list.innerHTML = '<p>⏳ Yuklanmoqda...</p>';
        const { data, error } = await c.from('questions').select('*').eq('teacher_id', t.id).order('id', { ascending: false });
        if (error) { list.innerHTML = '<p>❌ ' + error.message + '</p>'; return; }
        if (!data || !data.length) { list.innerHTML = '<p>Hali savollar yo\'q. Yuqorida birinchi savolni yarating! ➕</p>'; return; }
        const names = { matematik:'➕ Matematika', mantiq:'🧠 Mantiq', it:'💻 IT', ingliz:'🔤 Ingliz', fan:'🌍 Tabiat' };
        list.innerHTML = data.map(r =>
            '<div class="q-item"><div class="q-text"><b>' + (names[r.topic]||r.topic) + ' • ' + r.level + '-daraja</b><br>' +
            r.question + '<br><small>✅ ' + ((r.options||[])[r.answer] || '') + '</small></div>' +
            '<button class="q-del" onclick="TeacherPanel.del(' + r.id + ')">🗑️</button></div>'
        ).join('');
    }
};

document.addEventListener('DOMContentLoaded', () => {
    const b = document.getElementById('qSaveBtn');
    if (b) b.onclick = TeacherPanel.save;
    const cu=document.getElementById('csvUploadBtn'); if(cu) cu.onclick=()=>TeacherPanel.uploadCSV();
    const ct=document.getElementById('csvTemplateBtn'); if(ct) ct.onclick=()=>TeacherPanel.template();
});
