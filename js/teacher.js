/**
 * O'QITUVCHI PANELI - savol yaratish va boshqarish
 */
const TeacherPanel = {
    open: () => {
        Navigation.showScreen('teacher');
        TeacherPanel.load();
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
});
