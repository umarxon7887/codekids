/**
 * NAVIGATION MODULE
 * Sahifalar orasida yurish uchun mas'ul
 */

const Navigation = {
    screens: {
        login: null,
        home: null,
        game: null
    },

    init: () => {
        Navigation.screens.login = document.getElementById('loginScreen');
        Navigation.screens.home = document.getElementById('homeScreen');
        Navigation.screens.game = document.getElementById('gameScreen');
    },

    showScreen: (screenName) => {
        Object.values(Navigation.screens).forEach(screen => {
            if (screen) screen.style.display = 'none';
        });
        const targetScreen = Navigation.screens[screenName];
        if (targetScreen) {
            targetScreen.style.display = screenName === 'login' ? 'flex' : 'block';
        }
    },

    openInstrument: (instrumentId) => {
        switch (instrumentId) {
            case 'typing':
                Navigation.showScreen('game');
                TypingGame.init();
                break;

            case 'labirint':
                window.location.href = 'labirint/game.html';
                break;

            case 'logic':
            case 'scratch':
            case 'algorithm':
            case 'math':
            case 'html-builder':
                alert('Bu instrument tez orada qo\'shiladi! 🔜');
                break;

            default:
                console.warn('Nomalum instrument: ' + instrumentId);
        }
    },

    goHome: () => {
        TypingGame.stop();
        Home.updateStats();
        Navigation.showScreen('home');
    },

    goToLogin: () => {
        Navigation.showScreen('login');
    }
};
