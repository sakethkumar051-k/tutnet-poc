// Backward-compatible wrapper — delegates to Zustand authStore
// Existing components can keep importing `useAuth` from here
import { useAuthStore } from '../stores/authStore';

export const useAuth = () => {
    const store = useAuthStore();
    return {
        user: store.user,
        loading: store.loading,
        login: store.login,
        register: store.register,
        logout: store.logout,
        refreshUser: store.refreshUser,
    };
};

// Thin provider — just initializes the store on mount
import { useEffect } from 'react';

export const AuthProvider = ({ children }) => {
    const initialize = useAuthStore((s) => s.initialize);

    useEffect(() => {
        initialize();
    }, [initialize]);

    return children;
};
