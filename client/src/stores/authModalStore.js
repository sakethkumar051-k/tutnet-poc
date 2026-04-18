import { create } from 'zustand';

export const useAuthModalStore = create((set) => ({
    isOpen: false,
    mode: 'login', // 'login' | 'register'
    message: '',    // optional prompt message, e.g. "Sign in to book a demo"

    openLogin: (message = '') => set({ isOpen: true, mode: 'login', message }),
    openRegister: (message = '') => set({ isOpen: true, mode: 'register', message }),
    switchMode: (mode) => set({ mode }),
    close: () => set({ isOpen: false, message: '' }),
}));
