/**
 * TYPING RACE v2 - TypeRacer uslubidagi sifatli poyga
 */
const TypingGame = {
    currentText:'', userInput:'', startTime:null, errors:0,
    timer:null, rivalTimer:null, rivalProgress:0, rivalWpm:32,
    finished:false, rivalFinished:false, group:false, groupRoom:null, _lastRep:0, lastTextIdx:-1,

    words: {
        uz: ['kompyuter','dastur','algoritm','funksiya','ozgaruvchi','tsikl','shart','massiv','obyekt','sinf','metod','klaviatura','monitor','protsessor','xotira','internet','brauzer','sayt','kod','server','malumot','fayl','papka','dasturchi','test','xato','tuzatish','loyiha','natija','tezlik'],
        ru: ['компьютер','программа','алгоритм','функция','переменная','цикл','условие','массив','объект','класс','метод','клавиатура','монитор','процессор','память','интернет','браузер','сайт','код','сервер','данные','файл','папка','программист','тест','ошибка','проект','результат','скорость'],
        en: ['computer','program','algorithm','function','variable','loop','condition','array','object','class','method','keyboard','monitor','processor','memory','internet','browser','website','code','server','data','file','folder','developer','test','error','debug','project','result','speed']
    },

    init: () => {
        const user = JSON.parse(localStorage.getItem('codekids_user')||'null');
        const lang = (user && user.language) ? user.language : 'uz';
        const bank = (typeof TYPING_TEXTS !== 'undefined' && TYPING_TEXTS[lang] && TYPING_TEXTS[lang].length) ? TYPING_TEXTS[lang] : null;
        if (bank) {
            let idx = Math.floor(Math.random()*bank.length);
            if (bank.length > 1 && idx === TypingGame.lastTextIdx) idx = (idx+1) % bank.length;
            TypingGame.lastTextIdx = idx;
            TypingGame.currentText = bank[idx];
        } else {
            const pool = TypingGame.words[lang] || TypingGame.words.uz;
            const sel=[];
            for(let i=0;i<8;i++) sel.push(pool[Math.floor(Math.random()*pool.length)]);
            TypingGame.currentText = sel.join(' ');
        }
        TypingGame.userInput=''; TypingGame.errors=0; TypingGame.startTime=null;
        TypingGame.finished=false; TypingGame.rivalFinished=false; TypingGame.rivalProgress=0;
        TypingGame.rivalWpm = 28 + Math.floor(Math.random()*10);

        const target=document.getElementById('raceTarget');
        const input=document.getElementById('raceInput');
        const result=document.getElementById('raceResult');
        if(result){ result.classList.remove('show'); result.innerHTML=''; }
        if(target){ target.innerHTML=''; target.scrollTop=0; }
        if(input){ input.value=''; input.disabled=true; input.oninput=e=>TypingGame.handleInput(e); }

        const my=document.getElementById('raceMyName');
        if(my) my.textContent='🚗 '+(user?user.nickname:'Siz');
        const rv=document.getElementById('raceRivalName');
        if(rv) rv.textContent='🚙 Raqib ('+TypingGame.rivalWpm+' WPM)';

        TypingGame.updateDisplay();
        TypingGame.setCar('raceCar',0);
        TypingGame.setCar('raceRival',0);
        TypingGame.updateStats(0,100,0);
        TypingGame.countdown();
    },

    countdown: () => {
        const cd=document.getElementById('raceCountdown');
        if(!cd){ TypingGame.startRace(); return; }
        const seq=['3','2','1','🏁'];
        let i=0;
        cd.classList.add('show');
        cd.textContent=seq[0];
        const t=setInterval(()=>{
            i++;
            if(i>=seq.length){
                clearInterval(t);
                setTimeout(()=>{ cd.classList.remove('show'); TypingGame.startRace(); },450);
            } else {
                cd.textContent=seq[i];
            }
        },700);
    },

    startRace: () => {
        const input=document.getElementById('raceInput');
        if(input){ input.disabled=false; input.focus(); }
        clearInterval(TypingGame.rivalTimer);
        TypingGame.rivalTimer=setInterval(()=>{
            if(TypingGame.rivalFinished || !TypingGame.startTime || TypingGame.finished) return;
            const total=TypingGame.currentText.length;
            const cps=TypingGame.rivalWpm*5/60;
            TypingGame.rivalProgress += (cps*0.2)/total;
            if(TypingGame.rivalProgress>=1){ TypingGame.rivalProgress=1; TypingGame.rivalFinished=true; }
            TypingGame.setCar('raceRival',TypingGame.rivalProgress);
        },200);
    },

    handleInput: (e) => {
        if(TypingGame.finished) return;
        const typed=e.target.value;
        const target=TypingGame.currentText;
        if(!TypingGame.startTime && typed.length>0){
            TypingGame.startTime=Date.now();
            TypingGame.timer=setInterval(TypingGame.updateTimer,100);
        }
        let errors=0;
        for(let i=0;i<typed.length;i++){ if(typed[i]!==target[i]) errors++; }
        TypingGame.errors=errors;
        TypingGame.userInput=typed;
        TypingGame.updateDisplay();
        TypingGame.setCar('raceCar', Math.max(0,(typed.length-errors))/target.length);
        if(errors>0){
            const car=document.getElementById('raceCar');
            if(car){ car.style.animation='shake .3s'; setTimeout(()=>{ if(car) car.style.animation='engine .35s infinite alternate'; },300); }
        }
        if(TypingGame.group){ TypingGame.groupReport(typed, target); }
        if(typed.length>=target.length) TypingGame.finish();
    },

    updateDisplay: () => {
        const target=document.getElementById('raceTarget');
        if(!target) return;
        const typed=TypingGame.userInput, text=TypingGame.currentText;
        let html='';
        for(let i=0;i<text.length;i++){
            let cls='future';
            if(i<typed.length) cls = typed[i]===text[i] ? 'correct':'wrong';
            else if(i===typed.length) cls='current';
            html+='<span class="char '+cls+'">'+text[i]+'</span>';
        }
        target.innerHTML=html;
        const cur=target.querySelector('.char.current');
        if(cur){ target.scrollTop=Math.max(0, cur.offsetTop - target.clientHeight + 60); }
    },

    setCar: (id,p) => {
        const el=document.getElementById(id);
        if(el) el.style.left=(Math.min(1,p)*88)+'%';
    },

    updateTimer: () => {
        if(!TypingGame.startTime) return;
        const el=(Date.now()-TypingGame.startTime)/1000;
        const typed=TypingGame.userInput.length;
        const wpm=Math.round((typed/5)/(el/60))||0;
        const acc=typed?Math.max(0,Math.round(((typed-TypingGame.errors)/typed)*100)):100;
        TypingGame.updateStats(wpm,acc,el);
    },

    updateStats: (wpm,acc,time) => {
        const w=document.getElementById('raceWpm');
        const a=document.getElementById('raceAcc');
        const t=document.getElementById('raceTime');
        if(w) w.textContent=wpm;
        if(a) a.textContent=acc+'%';
        if(t) t.textContent=time.toFixed(1)+'s';
    },

    confetti: () => {
        let h='';
        const colors=['#89b4fa','#a6e3a1','#f9e2af','#f38ba8','#cba6f7'];
        for(let i=0;i<30;i++){
            const l=Math.random()*100, d=(Math.random()*2+1.5).toFixed(2), del=(Math.random()*0.8).toFixed(2);
            h+='<span class="confetti" style="left:'+l+'%;background:'+colors[i%5]+';animation-duration:'+d+'s;animation-delay:'+del+'s"></span>';
        }
        return h;
    },

    finish: () => {
        if(TypingGame.finished) return;
        if(TypingGame.group){
            clearInterval(TypingGame.timer);
            const el2=(Date.now()-TypingGame.startTime)/1000;
            const wpm2=Math.round((TypingGame.currentText.length/5)/(el2/60));
            GroupGame.reportProgress(TypingGame.currentText.length, true);
            const res=document.getElementById('raceResult');
            if(res){ res.innerHTML='<div class="result-box"><div class="result-medal">🏁</div><h2>Siz tugatdingiz!</h2><div class="result-stats"><div>🚀 '+wpm2+' WPM</div><div>⏱ '+el2.toFixed(1)+'s</div></div><p style="color:#a6adc8;">Jonli reyting yuqorida va o'qituvchi ekranida</p></div>'; res.classList.add('show'); }
            return;
        }
        TypingGame.finished=true;
        clearInterval(TypingGame.timer); clearInterval(TypingGame.rivalTimer);
        TypingGame.setCar('raceCar',1);
        const el=(Date.now()-TypingGame.startTime)/1000;
        const wpm=Math.round((TypingGame.currentText.length/5)/(el/60));
        const acc=Math.round(((TypingGame.userInput.length-TypingGame.errors)/TypingGame.userInput.length)*100);
        const won=!TypingGame.rivalFinished;
        let medal='🏅'; if(wpm>=40) medal='🥇'; else if(wpm>=25) medal='🥈'; else if(wpm>=15) medal='🥉';
        const result=document.getElementById('raceResult');
        if(result){
            result.innerHTML=TypingGame.confetti()+
                '<div class="result-box">'+
                '<div class="result-medal">'+medal+'</div>'+
                '<h2>'+(won?'🎉 Siz yutdingiz!':'😅 Raqib yutdi')+'</h2>'+
                '<div class="result-stats">'+
                '<div>🚀 Tezlik: <b>'+wpm+' WPM</b> (raqib: '+TypingGame.rivalWpm+')</div>'+
                '<div>🎯 Aniqlik: <b>'+acc+'%</b></div>'+
                '<div>⏱ Vaqt: <b>'+el.toFixed(1)+'s</b></div>'+
                '</div>'+
                '<button onclick="TypingGame.restart()">🔄 Qayta poyga</button>'+
                '<button onclick="Navigation.goHome()">🏠 Home</button>'+
                '</div>';
            result.classList.add('show');
        }
        const user=JSON.parse(localStorage.getItem('codekids_user')||'null');
        if(user){
            const res=JSON.parse(localStorage.getItem('codekids_results')||'[]');
            res.push({type:'typing',nickname:user.nickname,wpm:wpm,accuracy:acc,time:el,won:won,timestamp:new Date().toISOString()});
            localStorage.setItem('codekids_results',JSON.stringify(res));
        }
    },

    initGroup: (room) => {
        TypingGame.group=true; TypingGame.groupRoom=room;
        clearInterval(TypingGame.timer); clearInterval(TypingGame.rivalTimer);
        const rv=document.getElementById('raceRival'); if(rv) rv.style.display='none';
        const rn=document.getElementById('raceRivalName'); if(rn) rn.style.display='none';
        TypingGame.currentText=''; TypingGame.userInput=''; TypingGame.startTime=null; TypingGame.finished=false;
        const target=document.getElementById('raceTarget');
        if(target) target.innerHTML='<span class="char future">⏳ O'qituvchi o'yinni boshlashini kuting...</span>';
        const input=document.getElementById('raceInput'); if(input){ input.disabled=true; input.value=''; }
        TypingGame.updateStats(0,100,0);
        if(!document.getElementById('groupBoard')){
            const b=document.createElement('div'); b.id='groupBoard'; b.className='group-board';
            const track=document.querySelector('.race-track'); if(track) track.parentNode.insertBefore(b, track);
        }
    },
    loadGroupText: (text) => {
        TypingGame.currentText=text; TypingGame.userInput=''; TypingGame.errors=0;
        TypingGame.startTime=null; TypingGame.finished=true; TypingGame.rivalFinished=true;
        TypingGame.updateDisplay(); TypingGame.setCar('raceCar',0);
        const input=document.getElementById('raceInput');
        if(input){ input.disabled=false; input.value=''; input.focus(); input.oninput=e=>TypingGame.handleInput(e); }
        TypingGame.finished=false;
    },
    groupReport: (typed, text) => {
        let correct=0; for(let i=0;i<typed.length;i++){ if(typed[i]===text[i]) correct++; }
        const done=typed.length>=text.length;
        const now=Date.now();
        if(done || now-(TypingGame._lastRep||0)>1000){ TypingGame._lastRep=now; GroupGame.reportProgress(correct, done); }
    },
    restart: () => { TypingGame.init(); },

    stop: () => {
        clearInterval(TypingGame.timer); clearInterval(TypingGame.rivalTimer);
        const result=document.getElementById('raceResult');
        if(result) result.classList.remove('show');
        const cd=document.getElementById('raceCountdown');
        if(cd) cd.classList.remove('show');
    }
};
