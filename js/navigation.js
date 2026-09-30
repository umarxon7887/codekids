/**
 * NAVIGATION MODULE
 * Sahifalar orasida yurish uchun mas'ul
 */

const Navigation = {
    // Barcha sahifalar
    screens: {
        login: null,
        home: null,
        game: null
    },

    /**
     * Sahifalarni inicializatsiya qilish
     */
    init: () => {
        Navigation.screens.login = document.getElementById('loginScreen');
        Navigation.screens.home = document.getElementById('homeScreen');
        Navigation.screens.game = document.getElementById('gameScreen');
    },

    /**
     * Sahifani ko'rsatish
     */
    showScreen: (screenName) => {
        // Barcha sahifalarni yashirish
        Object.values(Navigation.screens).forEach(screen => {
            if (screen) screen.style.display = 'none';
        });

        // Kerakli sahifani ko'rsatish
        const targetScreen = Navigation.screens[screenName];
        if (targetScreen) {
            targetScreen.style.display = screenName === 'login' ? 'flex' : 'block';
        }
    },

    /**
     * Instrumentni ochish
     */
     openInstrument: (instrumentId) => {
        switch (instrumentId) {
            case 'typing':
                Navigation.showScreen('game');
                TypingGame.init();
                break;
            
            ase 'labirint':
                window.location.href = 'labirint/index.html';
                break;
       
            // Kelajakdagi instrumentlar
            case 'logic':
            case 'scratch':
            case 'algorithm':
            case 'math':
            case 'html-builder':
                alert('Bu instrument tez orada qo\'shiladi! 🔜');
                break;
            
            default:
                console.warn(`Noma'lum instrument: ${instrumentId}`);
        }
    },

    /**
     * Home sahifasiga qaytish
     */
    goHome: () => {
        TypingGame.stop();
        Home.updateStats();
        Navigation.showScreen('home');
    },

    /**
     * Login sahifasiga qaytish
     */
    goToLogin: () => {
        Navigation.showScreen('login');
    }
};
