/**
 * TYPING GAME MODULE
 * TezYozuv o'yini uchun mas'ul
 */

const TypingGame = {
    // ==================== CONFIG ====================
    wordsByLang: {
       uz: [
            "kod", "veb", "ilova", "xato", "tuzatish", "mantiq", "oyin", "oynash",
            "yozish", "tez", "sichqoncha", "ekran", "klaviatura", "piton", "java",
            "html", "css", "js", "malumot", "tarmoq", "bulut", "bot", "ai", "robot",
            "funksiya", "ozgaruvchi", "sikl", "massiv", "obyekt", "sinf", "metod",
            "kompyuter", "dastur", "dasturchi", "internet", "sayt", "server", "algoritm"
        ],
        en: [
            "code", "web", "app", "bug", "fix", "logic", "game", "play", 
            "type", "fast", "mouse", "screen", "keyboard", "python", "java", 
            "html", "css", "js", "data", "net", "cloud", "bot", "ai", "robot",
            "function", "variable", "loop", "array", "object", "class", "method"
        ],
        ru: [
            "код", "веб", "приложение", "ошибка", "исправить", "логика", "игра", "играть",
            "печатать", "быстро", "мышь", "экран", "клавиатура", "питон", "джава",
            "хтмл", "цсс", "джс", "данные", "сеть", "облако", "бот", "ии", "робот",
            "функция", "переменная", "цикл", "массив", "объект", "класс", "метод"
        ]
    },

    // ==================== STATE ====================
    state: {
        words: [],
        currentWordIndex: 0,
        currentCharIndex: 0,
        timeLeft: 30,
        totalTime: 30,
        timerInterval: null,
        isGameRunning: false,
        correctChars: 0,
        incorrectChars: 0,
        totalCharsTyped: 0,
        currentLang: 'uz',
        charStates: []
    },

    // ==================== DOM ELEMENTS ====================
    elements: {},

    /**
     * DOM elementlarni saqlash
     */
    cacheElements: () => {
        TypingGame.elements = {
            textDisplay: document.getElementById('textDisplay'),
            inputArea: document.getElementById('inputArea'),
            timerDisplay: document.getElementById('timer'),
            wpmDisplay: document.getElementById('wpm'),
            accuracyDisplay: document.getElementById('accuracy'),
            messageDisplay: document.getElementById('message'),
            restartBtn: document.getElementById('restartBtn'),
            timeControls: document.getElementById('timeControls'),
            langControls: document.getElementById('langControls')
        };
    },

    /**
     * O'yinni boshlash
     */
    init: () => {
        TypingGame.cacheElements();
        TypingGame.reset();
        TypingGame.bindEvents();
        TypingGame.generateWords();
        TypingGame.render();
        setTimeout(() => TypingGame.elements.inputArea.focus(), 100);
    },

    /**
     * O'yinni to'xtatish
     */
    stop: () => {
        if (TypingGame.state.timerInterval) {
            clearInterval(TypingGame.state.timerInterval);
        }
    },

    /**
     * O'yinni qayta boshlash
     */
    reset: () => {
        const state = TypingGame.state;
        
        TypingGame.stop();
        
        state.timeLeft = state.totalTime;
        state.currentWordIndex = 0;
        state.currentCharIndex = 0;
        state.correctChars = 0;
        state.incorrectChars = 0;
        state.totalCharsTyped = 0;
        state.isGameRunning = false;
        state.charStates = [];
        
        const elements = TypingGame.elements;
        elements.inputArea.value = '';
        elements.inputArea.disabled = false;
        elements.messageDisplay.textContent = '';
        elements.timerDisplay.textContent = state.timeLeft;
        elements.wpmDisplay.textContent = '0';
        elements.accuracyDisplay.textContent = '100%';
    },

    /**
     * Hodisalarni bog'lash
     */
    bindEvents: () => {
        const elements = TypingGame.elements;
        
        // Vaqt tugmalari
        elements.timeControls.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                elements.timeControls.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                TypingGame.state.totalTime = parseInt(btn.dataset.time);
                TypingGame.reset();
                TypingGame.generateWords();
                TypingGame.render();
            });
        });
        
        // Til tugmalari
        elements.langControls.querySelectorAll('.control-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                elements.langControls.querySelectorAll('.control-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                TypingGame.state.currentLang = btn.dataset.lang;
                TypingGame.reset();
                TypingGame.generateWords();
                TypingGame.render();
            });
        });
        
        // Input hodisasi
        elements.inputArea.addEventListener('input', TypingGame.handleInput);
        
        // Backspace hodisasi
        elements.inputArea.addEventListener('keydown', TypingGame.handleBackspace);
        
        // Restart tugmasi
        elements.restartBtn.addEventListener('click', () => {
            TypingGame.reset();
            TypingGame.generateWords();
            TypingGame.render();
        });
    },

    /**
     * So'zlarni generatsiya qilish
     */
    generateWords: () => {
        const state = TypingGame.state;
        const wordList = TypingGame.wordsByLang[state.currentLang];
        
        state.words = [];
        for (let i = 0; i < 30; i++) {
            state.words.push(wordList[Math.floor(Math.random() * wordList.length)]);
        }
    },

    /**
     * So'zlarni render qilish
     */
    render: () => {
        const state = TypingGame.state;
        const display = TypingGame.elements.textDisplay;
        
        display.innerHTML = '';
        
        state.words.forEach((word, wordIdx) => {
            const wordSpan = document.createElement('span');
            wordSpan.className = 'word';
            
            word.split('').forEach((char, charIdx) => {
                const charSpan = document.createElement('span');
                charSpan.className = 'char';
                charSpan.textContent = char;
                
                if (wordIdx < state.currentWordIndex) {
                    charSpan.classList.add('correct');
                } else if (wordIdx === state.currentWordIndex) {
                    if (charIdx < state.currentCharIndex) {
                        const charState = state.charStates[charIdx];
                        if (charState && charState.correct) {
                            charSpan.classList.add('correct');
                        } else {
                            charSpan.classList.add('incorrect');
                        }
                    } else if (charIdx === state.currentCharIndex) {
                        charSpan.classList.add('current');
                    }
                }
                
                wordSpan.appendChild(charSpan);
            });
            
            display.appendChild(wordSpan);
        });
    },

    /**
     * Timer ni boshlash
     */
    startTimer: () => {
        const state = TypingGame.state;
        const elements = TypingGame.elements;
        
        state.timerInterval = setInterval(() => {
            state.timeLeft--;
            elements.timerDisplay.textContent = state.timeLeft;
            
            // WPM hisoblash
            const minutes = (state.totalTime - state.timeLeft) / 60;
            if (minutes > 0) {
                const wpm = Math.round((state.correctChars / 5) / minutes);
                elements.wpmDisplay.textContent = wpm;
            }
            
            if (state.timeLeft <= 0) {
                TypingGame.end();
            }
        }, 1000);
    },

    /**
     * Input hodisasini boshqarish
     */
    handleInput: (e) => {
        const state = TypingGame.state;
        const elements = TypingGame.elements;
        
        // Timer ni boshlash (birinchi marta yozilganda)
        if (!state.isGameRunning && state.timeLeft === state.totalTime) {
            state.isGameRunning = true;
            TypingGame.startTimer();
        }
        
        const typedChar = e.data;
        if (typedChar === null) return; // backspace yoki boshqa
        
        const currentWord = state.words[state.currentWordIndex];
        const expectedChar = currentWord[state.currentCharIndex];
        
        state.totalCharsTyped++;
        
        if (typedChar === expectedChar) {
            state.correctChars++;
            state.charStates.push({ char: typedChar, correct: true });
        } else {
            state.incorrectChars++;
            state.charStates.push({ char: typedChar, correct: false });
        }
        
        state.currentCharIndex++;
        
        // Aniqlikni yangilash
        const accuracy = Math.round((state.correctChars / state.totalCharsTyped) * 100);
        elements.accuracyDisplay.textContent = accuracy + '%';
        
        // Input ni tozalash
        elements.inputArea.value = '';
        
        // So'z tugagan bo'lsa
        if (state.currentCharIndex >= currentWord.length) {
            state.currentWordIndex++;
            state.currentCharIndex = 0;
            state.charStates = [];
            
            if (state.currentWordIndex >= state.words.length) {
                TypingGame.end();
                return;
            }
        }
        
        TypingGame.render();
    },

    /**
     * Backspace hodisasini boshqarish
     */
    handleBackspace: (e) => {
        if (e.key !== 'Backspace') return;
        
        e.preventDefault();
        
        const state = TypingGame.state;
        const elements = TypingGame.elements;
        
        if (state.currentCharIndex > 0) {
            state.currentCharIndex--;
            
            const lastState = state.charStates.pop();
            if (lastState) {
                if (lastState.correct) {
                    state.correctChars--;
                } else {
                    state.incorrectChars--;
                }
                state.totalCharsTyped--;
                
                const accuracy = state.totalCharsTyped > 0 
                    ? Math.round((state.correctChars / state.totalCharsTyped) * 100) 
                    : 100;
                elements.accuracyDisplay.textContent = accuracy + '%';
            }
            
            TypingGame.render();
        }
    },

    /**
     * O'yinni tugatish
     */
    end: () => {
        const state = TypingGame.state;
        const elements = TypingGame.elements;
        
        TypingGame.stop();
        state.isGameRunning = false;
        elements.inputArea.disabled = true;
        
        const finalWpm = parseInt(elements.wpmDisplay.textContent);
        const finalAcc = parseInt(elements.accuracyDisplay.textContent);
        
        // Natijani saqlash
        const user = Storage.getUser();
        if (user) {
            Storage.saveResult({
                type: 'typing',
                nickname: user.nickname,
                wpm: finalWpm,
                accuracy: finalAcc,
                time: state.totalTime,
                lang: state.currentLang
            });
        }
        
        // Xabar ko'rsatish
        if (finalWpm > 30) {
            elements.messageDisplay.textContent = `🏆 Ajoyib! Siz haqiqiy IT Qahramonsiz! (${finalWpm} WPM)`;
            elements.messageDisplay.style.color = '#a6e3a1';
        } else {
            elements.messageDisplay.textContent = `💪 Yaxshi urinish! Mashq qilishda davom eting! (${finalWpm} WPM)`;
            elements.messageDisplay.style.color = '#f9e2af';
        }
    }
};
