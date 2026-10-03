/**
 * SUPABASE - backend ulanmasi (ustoz auth + ma'lumotlar)
 */
const SUPABASE_URL = 'https://gziracvxzqyekeniqlcl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6aXJhY3Z4enF5ZWtlbmlxbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEwMjg5OTYsImV4cCI6MjEwNjYwNDk5Nn0.6tJFqIwi0CtXrumr-AqC2Td87T0wJ0vqjlza_dOnxD0';

let sb = null;

const SupaAuth = {
    client: () => {
        if (!sb && window.supabase) {
            sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        }
        return sb;
    },

    registerTeacher: async (nickname, email, password) => {
        const c = SupaAuth.client();
        if (!c) return { error: 'Kutubxona yuklanmadi - internetni tekshiring' };
        const { data, error } = await c.auth.signUp({
            email: email, password: password,
            options: { data: { nickname: nickname, role: 'teacher' } }
        });
        if (error) return { error: error.message };
        if (data.session) {
            SupaAuth.saveTeacher(data.user, nickname);
            return { ok: true };
        }
        return { error: 'Email tasdiqlash xati yuborildi - pochtangizni tekshiring' };
    },

    loginTeacher: async (email, password) => {
        const c = SupaAuth.client();
        if (!c) return { error: 'Kutubxona yuklanmadi - internetni tekshiring' };
        const { data, error } = await c.auth.signInWithPassword({ email: email, password: password });
        if (error) return { error: 'Email yoki parol noto\'g\'ri' };
        let nickname = email.split('@')[0];
        try {
            const { data: prof } = await c.from('profiles').select('nickname, role').eq('id', data.user.id).single();
            if (prof && prof.nickname) nickname = prof.nickname;
        } catch (e) {}
        SupaAuth.saveTeacher(data.user, nickname);
        return { ok: true };
    },

    saveTeacher: (user, nickname) => {
        localStorage.setItem('codekids_teacher', JSON.stringify({
            id: user.id, email: user.email, nickname: nickname, role: 'teacher'
        }));
    },

    getTeacher: () => {
        try { return JSON.parse(localStorage.getItem('codekids_teacher') || 'null'); }
        catch (e) { return null; }
    },

    logoutTeacher: async () => {
        const c = SupaAuth.client();
        if (c) await c.auth.signOut();
        localStorage.removeItem('codekids_teacher');
    }
};

// ============ UI bog'lash ============
document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('teacherToggleBtn');
    const panel = document.getElementById('teacherAuth');
    const back = document.getElementById('teacherBackBtn');
    const loginBtn = document.getElementById('teacherLoginBtn');
    const regBtn = document.getElementById('teacherRegisterBtn');
    const err = document.getElementById('teacherError');
    if (!toggle || !panel) return;

    const t0 = SupaAuth.getTeacher();
    if (t0) toggle.textContent = '✅ Ustoz: ' + t0.nickname;

    toggle.onclick = () => {
        const show = panel.style.display === 'none' || !panel.style.display;
        panel.style.display = show ? 'flex' : 'none';
        toggle.textContent = show ? '✖ Yopish' : (t0 ? '✅ Ustoz: ' + t0.nickname : '👨‍🏫 Ustozmisiz? Kirish');
    };
    if (back) back.onclick = () => { panel.style.display = 'none'; };

    const showErr = (m) => { if (err) err.textContent = m || ''; };

    if (loginBtn) loginBtn.onclick = async () => {
        showErr('');
        const email = document.getElementById('teacherEmail').value.trim();
        const pass = document.getElementById('teacherPassword').value;
        if (!email || !pass) return showErr('Email va parolni kiriting');
        loginBtn.disabled = true; loginBtn.textContent = '⏳ Tekshirilmoqda...';
        const r = await SupaAuth.loginTeacher(email, pass);
        loginBtn.disabled = false; loginBtn.textContent = '🔑 Kirish';
        if (r.error) return showErr(r.error);
        const t = SupaAuth.getTeacher();
        alert('✅ Xush kelibsiz, ustoz ' + t.nickname + '!');
        location.reload();
    };

    if (regBtn) regBtn.onclick = async () => {
        showErr('');
        const nick = document.getElementById('teacherNickname').value.trim();
        const email = document.getElementById('teacherEmail').value.trim();
        const pass = document.getElementById('teacherPassword').value;
        if (!nick || nick.length < 3) return showErr('Nickname kamida 3 belgi');
        if (!email.includes('@')) return showErr('Email noto\'g\'ri');
        if (pass.length < 6) return showErr('Parol kamida 6 belgi');
        regBtn.disabled = true; regBtn.textContent = '⏳ Yaratilmoqda...';
        const r = await SupaAuth.registerTeacher(nick, email, pass);
        regBtn.disabled = false; regBtn.textContent = '📝 Ro\'yxatdan o\'tish';
        if (r.error) return showErr(r.error);
        alert('✅ Ustoz account yaratildi!');
        location.reload();
    };
});
