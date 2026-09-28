/**
 * APP MODULE
 * Asosiy boshqaruv moduli
 */

const App = {
    init: () => {
        try {
            Navigation.init();

            const user = Auth.checkAuth();
            if (user) {
                Home.show(user);
            } else {
                Navigation.showScreen('login');
                document.getElementById('nicknameInput').focus();
            }

            App.bindEvents();
        } catch (err) {
            alert('XATO (init): ' + err.message);
        }
    },

    bindEvents: () => {
        const startBtn = document.getElementById('startBtn');
        const nicknameInput = document.getElementById('nicknameInput');
        const errorMessage = document.getElementById('errorMessage');
        const logoutBtn = document.getElementById('logoutBtn');
        const backBtn = document.getElementById('backBtn');

        // KIRISH tugmasi
        startBtn.addEventListener('click', () => {
            try {
                const nickname = nicknameInput.value.trim();
                const result = Auth.login(nickname);

                if (result.valid) {
                    errorMessage.textContent = '';
                    Home.show(result.user);
                } else {
                    errorMessage.textContent = result.error;
                }
            } catch (err) {
                errorMessage.textContent = 'XATO: ' + err.message;
            }
        });

        nicknameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') startBtn.click();
        });

        logoutBtn.addEventListener('click', () => {
            if (confirm('Haqiqatan ham chiqmoqchimisiz?')) {
                Auth.logout();
                TypingGame.stop();
                nicknameInput.value = '';
                Navigation.showScreen('login');
                nicknameInput.focus();
            }
        });

        backBtn.addEventListener('click', () => {
            Navigation.goHome();
        });

        document.addEventListener('click', () => {
            try {
                const gameScreen = document.getElementById('gameScreen');
                const inputArea = document.getElementById('inputArea');
                if (gameScreen.style.display === 'block' && !inputArea.disabled) {
                    inputArea.focus();
                }
            } catch (e) { /* e'tiborsiz */ }
        });
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', App.init);
} else {
    App.init();
}
