/**
 * STORAGE LAYER
 * Ma'lumotlarni saqlash uchun mas'ul modul
 * Hozircha: LocalStorage
 * Kelajakda: Supabase ga o'tish mumkin
 */

const Storage = {
    // ==================== USER ====================
    getUser: () => {
        const user = localStorage.getItem('codekids_user');
        return user ? JSON.parse(user) : null;
    },

    saveUser: (nickname) => {
        const user = {
            nickname: nickname,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString()
        };
        localStorage.setItem('codekids_user', JSON.stringify(user));
        return user;
    },

    updateUser: (updates) => {
        const user = Storage.getUser();
        if (user) {
            Object.assign(user, updates);
            localStorage.setItem('codekids_user', JSON.stringify(user));
        }
        return user;
    },

    removeUser: () => {
        localStorage.removeItem('codekids_user');
    },

    // ==================== RESULTS ====================
    getResults: () => {
        const results = localStorage.getItem('codekids_results');
        return results ? JSON.parse(results) : [];
    },

    saveResult: (result) => {
        const results = Storage.getResults();
        results.push({
            ...result,
            timestamp: new Date().toISOString()
        });
        localStorage.setItem('codekids_results', JSON.stringify(results));
    },

    getResultsByType: (type) => {
        return Storage.getResults().filter(r => r.type === type);
    },

    clearResults: () => {
        localStorage.removeItem('codekids_results');
    },

    // ==================== SETTINGS ====================
    getSettings: () => {
        const settings = localStorage.getItem('codekids_settings');
        return settings ? JSON.parse(settings) : {
            defaultTime: 30,
            defaultLang: 'en'
        };
    },

    saveSettings: (settings) => {
        localStorage.setItem('codekids_settings', JSON.stringify(settings));
    }
};
