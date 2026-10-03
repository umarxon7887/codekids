/**
 * TYPING RACE GAME
 * TypeRacer uslubidagi poyga rejimi
 */

const TypingGame = {
    currentText: '',
    userInput: '',
    startTime: null,
    errors: 0,
    timer: null,
    words: {
        uz: ['kompyuter','dastur','algoritm','funksiya','o\'zgaruvchi','tsikl','shart','massiv','obyekt','sinflar','metod','klaviatura','monitor','protsessor','xotira','internet','brauzer','sayt','kod','server','ma\'lumot','fayl','papka','dasturchi','test','xato','tuzatish','loyiha','tashabbus','natija'],
        ru: ['компьютер','программа','алгоритм','функция','переменная','цикл','условие','массив','объект','класс','метод','клавиатура','монитор','процессор','память','интернет','браузер','сайт','код','сервер','данные','файл','папка','программист','тест','ошибка','исправление','проект','инициатива','результат'],
        en: ['computer','program','algorithm','function','variable','loop','condition','array','object','class','method','keyboard','monitor','processor','memory','internet','browser','website','code','server','data','file','folder','developer','test','error','debug','project','initiative','result']
    },
    
    init: () => {
        const user = JSON.parse(localStorage.getItem('codekids_user') || 'null');
        const lang = user ? user.language : 'uz';
        
        // 10 ta tasodifiy so'z tanlash
        const pool = TypingGame.words[lang] || TypingGame.words.uz;
        const selected = [];
        for(let i=0; i<10; i++){
            selected.push(pool[Math.floor(Math.random()*pool.length)]);
        }
        TypingGame.currentText = selected.join(' ');
        TypingGame.userInput = '';
        TypingGame.errors = 0;
        TypingGame.startTime = null;
        
        // UI ni yangilash
        const target = document.getElementById('raceTarget');
        const input = document.getElementById('raceInput');
        if(target) target.textContent = TypingGame.currentText;
        if(input){ input.value=''; input.focus(); }
        
        TypingGame.updateDisplay();
        TypingGame.updateCar(0);
        TypingGame.updateStats(0, 100, 0);
        
        // Input listener
        if(input){
            input.oninput = (e) => TypingGame.handleInput(e);
        }
    },
    
    handleInput: (e) => {
        const typed = e.target.value;
        const target = TypingGame.currentText;
        
        // Birinchi harf bosilganda taymer boshlash
        if(!TypingGame.startTime && typed.length > 0){
            TypingGame.startTime = Date.now();
            TypingGame.timer = setInterval(TypingGame.updateTimer, 100);
        }
        
        // Har bir harfni tekshirish
        let errors = 0;
        for(let i=0; i<typed.length; i++){
            if(typed[i] !== target[i]) errors++;
        }
        TypingGame.errors = errors;
        TypingGame.userInput = typed;
        
        TypingGame.updateDisplay();
        TypingGame.updateCar(typed.length / target.length);
        
        // Xato bo'lsa - mashina titraydi
        const car = document.getElementById('raceCar');
        if(errors > 0 && car){
            car.style.animation = 'shake 0.3s';
            setTimeout(() => { if(car) car.style.animation = ''; }, 300);
        }
        
        // Finish
        if(typed.length >= target.length){
            TypingGame.finish();
        }
    },
    
    updateDisplay: () => {
        const target = document.getElementById('raceTarget');
        if(!target) return;
        
        const typed = TypingGame.userInput;
        const text = TypingGame.currentText;
        let html = '';
        
        for(let i=0; i<text.length; i++){
            let cls = 'future';
            if(i < typed.length){
                cls = typed[i] === text[i] ? 'correct' : 'wrong';
            } else if(i === typed.length){
                cls = 'current';
            }
            html += `<span class="char ${cls}">${text[i] === ' ' ? '&nbsp;' : text[i]}</span>`;
        }
        target.innerHTML = html;
    },
    
    updateCar: (progress) => {
        const car = document.getElementById('raceCar');
        if(!car) return;
        const percent = Math.min(100, progress * 100);
        car.style.left = percent + '%';
    },
    
    updateTimer: () => {
        if(!TypingGame.startTime) return;
        const elapsed = (Date.now() - TypingGame.startTime) / 1000;
        const typed = TypingGame.userInput.length;
        const total = TypingGame.currentText.length;
        const wpm = Math.round((typed / 5) / (elapsed / 60)) || 0;
        const acc = Math.max(0, Math.round(((typed - TypingGame.errors) / typed) * 100)) || 100;
        TypingGame.updateStats(wpm, acc, elapsed);
    },
    
    updateStats: (wpm, acc, time) => {
        const w = document.getElementById('raceWpm');
        const a = document.getElementById('raceAcc');
        const t = document.getElementById('raceTime');
        if(w) w.textContent = wpm;
        if(a) a.textContent = acc + '%';
        if(t) t.textContent = time.toFixed(1) + 's';
    },
    
    finish: () => {
        clearInterval(TypingGame.timer);
        const elapsed = (Date.now() - TypingGame.startTime) / 1000;
        const wpm = Math.round((TypingGame.userInput.length / 5) / (elapsed / 60));
        const acc = Math.round(((TypingGame.userInput.length - TypingGame.errors) / TypingGame.userInput.length) * 100);
        
        // Natija ekranini ko'rsatish
        const result = document.getElementById('raceResult');
        if(result){
            result.innerHTML = `
                <h2>🏁 Poyga tugadi!</h2>
                <div class="result-stats">
                    <div>🚀 Tezlik: <b>${wpm} WPM</b></div>
                    <div>🎯 Aniqlik: <b>${acc}%</b></div>
                    <div>⏱ Vaqt: <b>${elapsed.toFixed(1)}s</b></div>
                </div>
                <button onclick="TypingGame.restart()">🔄 Qayta</button>
                <button onclick="Navigation.goHome()">🏠 Home</button>
            `;
            result.classList.add('show');
        }
        
        // Statistika saqlash
        const user = JSON.parse(localStorage.getItem('codekids_user') || 'null');
        if(user){
            const res = JSON.parse(localStorage.getItem('codekids_results') || '[]');
            res.push({type:'typing', nickname:user.nickname, wpm:wpm, accuracy:acc, 
                      time:elapsed, timestamp:new Date().toISOString()});
            localStorage.setItem('codekids_results', JSON.stringify(res));
        }
    },
    
    restart: () => {
        const result = document.getElementById('raceResult');
        if(result) result.classList.remove('show');
        TypingGame.init();
    },
    
    stop: () => {
        clearInterval(TypingGame.timer);
        const result = document.getElementById('raceResult');
        if(result) result.classList.remove('show');
    }
};
