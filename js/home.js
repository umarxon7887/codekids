/**
 * HOME MODULE
 * Home sahifasi statistikasi va instrumentlar uchun mas'ul
 */

const Home = {
    // Instrumentlar ro'yxati
      instruments: [
        {
            id: 'typing',
            icon: '⌨️',
            title: 'TezYozuv',
            description: 'Klaviaturada tez yozishni o\'rganing. IT so\'zlar bilan mashq qiling!',
            badge: 'new',
            locked: false
        },
        {
            id: 'labirint',
            icon: '🧩',
            title: 'Labirint',
            description: 'Turli shakldagi labirintlarni yeching. 8 xil shakl, 4 ta qiyinlik!',
            badge: 'new',
            locked: false
        },
        {
            id: 'logic',
            icon: '🧩',
            title: 'Mantiqiy Topishmoqlar',
            description: 'Pattern matching va logik ketma-ketliklarni toping.',
            badge: 'soon',
            locked: true
        },
        {
            id: 'scratch',
            icon: '🎨',
            title: 'Scratch Asoslari',
            description: 'Bloklarni sudrab olib, birinchi kodingizni yozing.',
            badge: 'soon',
            locked: true
        },
        {
            id: 'algorithm',
            icon: '🤖',
            title: 'Algoritm O\'yinlari',
            description: 'Robotni to\'g\'ri yo\'lga solish uchun algoritmlar yozing.',
            badge: 'soon',
            locked: true
        },
        {
            id: 'math',
            icon: '🔢',
            title: 'Matematik Jang',
            description: 'Tez hisoblash orqali dushmanni yenging.',
            badge: 'soon',
            locked: true
        },
        {
            id: 'html-builder',
            icon: '🌐',
            title: 'HTML Builder',
            description: 'Veb sahifalarni vizual tarzda yarating.',
            badge: 'soon',
            locked: true
        }
    ],

    /**
     * Home sahifasini yangilash
     */
    updateStats: () => {
        const results = Storage.getResultsByType('typing');
        
        // O'yinlar soni
        document.getElementById('statGames').textContent = results.length;
        
        // Eng yaxshi WPM
        if (results.length > 0) {
            const bestWpm = Math.max(...results.map(r => r.wpm));
            document.getElementById('statBestWpm').textContent = bestWpm;
            
            // O'rtacha aniqlik
            const avgAccuracy = Math.round(
                results.reduce((sum, r) => sum + r.accuracy, 0) / results.length
            );
            document.getElementById('statAccuracy').textContent = avgAccuracy + '%';
        } else {
            document.getElementById('statBestWpm').textContent = '0';
            document.getElementById('statAccuracy').textContent = '0%';
        }
        
        // Yutuqlar
        let badges = 0;
        if (results.length >= 1) badges++;      // Birinchi o'yin
        if (results.some(r => r.wpm >= 30)) badges++;  // 30+ WPM
        if (results.some(r => r.wpm >= 50)) badges++;  // 50+ WPM
        if (results.some(r => r.accuracy === 100)) badges++; // 100% aniqlik
        document.getElementById('statBadges').textContent = badges;
    },

    /**
     * Foydalanuvchi ma'lumotlarini ko'rsatish
     */
    showUserInfo: (user) => {
        document.getElementById('userNickname').textContent = user.nickname;
        document.getElementById('welcomeName').textContent = user.nickname;
        const tpb=document.getElementById('teacherPanelBtn'); if(tpb) tpb.style.display=(user.role==='teacher')?'inline-block':'none';
        const sub=document.getElementById('welcomeSubtitle'); if(sub) sub.textContent=(user.role==='teacher')?'Bugun nima yaratamiz? 💡':'Bugun qaysi instrument bilan mashq qilamiz?';
        document.getElementById('userAvatar').textContent = user.nickname[0].toUpperCase();
        const gn=document.getElementById('gameUserNickname'); if(gn) gn.textContent = user.nickname;
    },

    /**
     * Instrumentlarni render qilish
     */
    renderInstruments: () => {
        const grid = document.getElementById('instrumentsGrid');
        grid.innerHTML = '';
        
        Home.instruments.forEach(instrument => {
            const card = document.createElement('div');
            card.className = `instrument-card ${instrument.locked ? 'locked' : ''}`;
            
            if (!instrument.locked) {
                card.onclick = () => Navigation.openInstrument(instrument.id);
            }
            
            const badgeClass = instrument.badge === 'new' ? 'new' : 'soon';
            const badgeText = instrument.badge === 'new' ? '✨ Yangi' : '🔜 Tez orada';
            
            card.innerHTML = `
                ${instrument.locked ? '<div class="lock-overlay">🔒</div>' : ''}
                <div class="instrument-icon">${instrument.icon}</div>
                <div class="instrument-title">${instrument.title}</div>
                <div class="instrument-desc">${instrument.description}</div>
                <span class="instrument-badge ${badgeClass}">${badgeText}</span>
            `;
            
            grid.appendChild(card);
        });
    },

    /**
     * Home sahifasini ko'rsatish
     */
    show: (user) => {
        Home.showUserInfo(user);
        Home.renderInstruments();
        Home.updateStats();
        Navigation.showScreen('home');
    }
};
