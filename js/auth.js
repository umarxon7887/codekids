/**
 * AUTH MODULE
 * Foydalanuvchi autentifikatsiyasi uchun mas'ul
 */

const Auth = {
    /**
     * Nickname ni tekshirish
     */
    validateNickname: (nickname) => {
        if (!nickname || nickname.trim().length === 0) {
            return { valid: false, error: "Nickname kiritish majburiy" };
        }
        
        const trimmed = nickname.trim();
        
        if (trimmed.length < 3) {
            return { valid: false, error: "Nickname kamida 3 belgi bo'lishi kerak" };
        }
        
        if (trimmed.length > 20) {
            return { valid: false, error: "Nickname 20 belgidan oshmasligi kerak" };
        }
        
        // Faqat harflar, raqamlar va _ belgisi
        if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) {
            return { valid: false, error: "Faqat harflar, raqamlar va _ belgisi mumkin" };
        }
        
        return { valid: true };
    },

    /**
     * Login qilish
     */
    login: (nickname) => {
        const validation = Auth.validateNickname(nickname);
        if (!validation.valid) {
            return validation;
        }
        
        const user = Storage.saveUser(nickname.trim());
        return { valid: true, user };
    },

    /**
     * Autentifikatsiyani tekshirish
     */
    checkAuth: () => {
        return Storage.getUser();
    },

    /**
     * Logout qilish
     */
    logout: () => {
        Storage.removeUser();
        return true;
    },

    /**
     * Foydalanuvchi ma'lumotlarini olish
     */
    getCurrentUser: () => {
        return Storage.getUser();
    }
};
