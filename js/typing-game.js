/**
 * TYPING RACE GAME (TypeRacer uslubida)
 */
const TypingGame = {
    lang: null,
    currentText: '',
    userInput: '',
    startTime: null,
    errors: 0,
    timer: null,
    words: {
        uz: ['kompyuter','dastur','algoritm','funksiya','ozgaruvchi','tsikl','shart','massiv','obyekt','sinf','metod','klaviatura','monitor','protsessor','xotira','internet','brauzer','sayt','kod','server','malumot','fayl','papka','dasturchi','test','xato','tuzatish','loyiha','natija','tezlik'],
        ru: ['компьютер','программа','алгоритм','функция','переменная','цикл','условие','массив','объект','класс','метод','клавиатура','монитор','процессор','память','интернет','браузер','сайт','код','сервер','данные','файл','папка','программист','тест','ошибка','проект','результат','скорость'],
        en: ['computer','program','algorithm','function','variable','loop','condition','array','object','class','method','keyboard','monitor','processor','memory','internet','browser','website','code','server','data','file','folder','developer','test','error','debug','project','result','speed']
    },

    init: function() {
        var user = JSON.parse(localStorage.getItem('codekids_user') || 'null');
        if (!TypingGame.lang) TypingGame.lang = (user && user.language) || 'uz';
        var ru = document.getElementById('raceUser');
        if (ru && user) ru.textContent = user.nickname;
        TypingGame.markLang();
        var pool = TypingGame.words[TypingGame.lang] || TypingGame.words.uz;
        var selected = [];
        for (var i = 0; i < 10; i++) selected.push(pool[Math.floor(Math.random() * pool.length)]);
        TypingGame.currentText = selected.join(' ');
        TypingGame.userInput = '';
        TypingGame.errors = 0;
        TypingGame.startTime = null;
        clearInterval(TypingGame.timer);
        var input = document.getElementById('raceInput');
        if (input) input.value = '';
        var result = document.getElementById('raceResult');
        if (result) result.classList.remove('show');
        TypingGame.updateDisplay();
        TypingGame.updateCar(0);
        TypingGame.updateStats(0, 100, 0);
        if (input) {
            input.oninput = function(e) { TypingGame.handleInput(e); };
            setTimeout(function(){ input.focus(); }, 150);
        }
    },

    setLang: function(l) { TypingGame.lang = l; TypingGame.init(); },

    markLang: function() {
        document.querySelectorAll('.lang-btn').forEach(function(b){
            b.classList.toggle('active', b.getAttribute('data-lang') === TypingGame.lang);
        });
    },

    handleInput: function(e) {
        var typed = e.target.value;
        var target = TypingGame.currentText;
        if (!TypingGame.startTime && typed.length > 0) {
            TypingGame.startTime = Date.now();
            TypingGame.timer = setInterval(TypingGame.updateTimer, 200);
        }
        var errors = 0;
        for (var i = 0; i < typed.length; i++) {
            if (typed[i] !== target[i]) errors++;
        }
        TypingGame.errors = errors;
        TypingGame.userInput = typed;
        TypingGame.updateDisplay();
        TypingGame.updateCar(typed.length / target.length);
        var car = document.getElementById('raceCar');
        if (errors > 0 && car) {
            car.classList.add('shake');
            setTimeout(function(){ car.classList.remove('shake'); }, 300);
        }
        if (typed.length >= target.length) TypingGame.finish();
    },

    updateDisplay: function() {
        var target = document.getElementById('raceTarget');
        if (!target) return;
        var typed = TypingGame.userInput;
        var text = TypingGame.currentText;
        var html = '';
        for (var i = 0; i < text.length; i++) {
            var cls = 'future';
            if (i < typed.length) cls = (typed[i] === text[i]) ? 'correct' : 'wrong';
            else if (i === typed.length) cls = 'current';
            html += '<span class="char ' + cls + '">' + (text[i] === ' ' ? '&nbsp;' : text[i]) + '</span>';
        }
        target.innerHTML = html;
    },

    updateCar: function(progress) {
        var car = document.getElementById('raceCar');
        if (!car) return;
        car.style.left = Math.min(94, progress * 94) + '%';
    },

    updateTimer: function() {
        if (!TypingGame.startTime) return;
        var elapsed = (Date.now() - TypingGame.startTime) / 1000;
        var typed = TypingGame.userInput.length;
        var wpm = Math.round((typed / 5) / (elapsed / 60)) || 0;
        var acc = typed > 0 ? Math.max(0, Math.round(((typed - TypingGame.errors) / typed) * 100)) : 100;
        TypingGame.updateStats(wpm, acc, elapsed);
    },

    updateStats: function(wpm, acc, time) {
        var w = document.getElementById('raceWpm');
        var a = document.getElementById('raceAcc');
        var t = document.getElementById('raceTime');
        if (w) w.textContent = wpm;
        if (a) a.textContent = acc + '%';
        if (t) t.textContent = time.toFixed(1) + 's';
    },

    finish: function() {
        clearInterval(TypingGame.timer);
        var elapsed = (Date.now() - TypingGame.startTime) / 1000;
        var typed = TypingGame.userInput.length;
        var wpm = Math.round((typed / 5) / (elapsed / 60));
        var acc = Math.max(0, Math.round(((typed - TypingGame.errors) / typed) * 100));
        var result = document.getElementById('raceResult');
        if (result) {
            result.innerHTML = '<div class="result-box">' +
                '<h2>🏁 Poyga tugadi!</h2>' +
                '<div class="result-stats">' +
                '<div>🚀 Tezlik: <b>' + wpm + ' WPM</b></div>' +
                '<div>🎯 Aniqlik: <b>' + acc + '%</b></div>' +
                '<div>⏱ Vaqt: <b>' + elapsed.toFixed(1) + 's</b></div>' +
                '</div>' +
                '<button onclick="TypingGame.restart()">🔄 Qayta</button>' +
                '<button onclick="Navigation.goHome()">🏠 Home</button>' +
                '</div>';
            result.classList.add('show');
        }
        var user = JSON.parse(localStorage.getItem('codekids_user') || 'null');
        if (user) {
            var res = JSON.parse(localStorage.getItem('codekids_results') || '[]');
            res.push({ type:'typing', nickname:user.nickname, wpm:wpm, accuracy:acc, time:elapsed, timestamp:new Date().toISOString() });
            localStorage.setItem('codekids_results', JSON.stringify(res));
        }
    },

    restart: function() { TypingGame.init(); },

    stop: function() {
        clearInterval(TypingGame.timer);
        var result = document.getElementById('raceResult');
        if (result) result.classList.remove('show');
    }
};
