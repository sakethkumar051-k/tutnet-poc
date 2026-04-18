import { create } from 'zustand';

let toastId = 0;

export const useToastStore = create((set, get) => ({
    toasts: [],

    addToast: (message, type = 'info') => {
        const id = ++toastId;
        set((s) => ({
            toasts: [...s.toasts.slice(-4), { id, message, type }],
        }));
        setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 5000);
    },

    removeToast: (id) => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    },

    showSuccess: (message) => get().addToast(message, 'success'),
    showError: (message) => get().addToast(message, 'error'),
    showWarning: (message) => get().addToast(message, 'warning'),
    showInfo: (message) => get().addToast(message, 'info'),
}));
