// Backward-compatible wrapper — delegates to Zustand toastStore
import { useToastStore } from '../stores/toastStore';

export const useToast = () => {
    const store = useToastStore();
    return {
        showSuccess: store.showSuccess,
        showError: store.showError,
        showWarning: store.showWarning,
        showInfo: store.showInfo,
    };
};

// No-op provider — Zustand is global, no React tree wrapping needed
export const ToastProvider = ({ children }) => children;
