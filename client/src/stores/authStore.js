import { create } from 'zustand';
import api from '../utils/api';

function decodeTokenPayload(token) {
    try {
        return JSON.parse(atob(token.split('.')[1]));
    } catch {
        return null;
    }
}

function isTokenExpired(token) {
    const payload = decodeTokenPayload(token);
    if (!payload?.exp) return true;
    return payload.exp * 1000 < Date.now() + 60_000;
}

export const useAuthStore = create((set, get) => ({
    user: null,
    loading: true,

    // Hydrate user from stored token on app start
    initialize: async () => {
        const token = localStorage.getItem('token');

        if (!token) {
            set({ loading: false });
            return;
        }

        if (isTokenExpired(token)) {
            localStorage.removeItem('token');
            set({ loading: false });
            return;
        }

        // Set temporary user from token payload while fetching full data
        const payload = decodeTokenPayload(token);
        if (payload?.id) {
            set({ user: { _id: payload.id, _tokenOnly: true } });
        }

        try {
            const { data } = await api.get('/auth/me');
            set({ user: data, loading: false });
        } catch {
            localStorage.removeItem('token');
            set({ user: null, loading: false });
        }
    },

    login: async (credentialsOrToken) => {
        if (typeof credentialsOrToken === 'string') {
            const token = credentialsOrToken;
            localStorage.setItem('token', token);
            try {
                const { data } = await api.get('/auth/me');
                set({ user: data });
                return data;
            } catch (error) {
                localStorage.removeItem('token');
                set({ user: null });
                throw error;
            }
        }

        const { data } = await api.post('/auth/login', credentialsOrToken);
        localStorage.setItem('token', data.token);
        set({ user: data });
        return data;
    },

    register: async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        localStorage.setItem('token', data.token);
        try {
            const { data: fullUser } = await api.get('/auth/me');
            set({ user: fullUser });
            return { ...data, ...fullUser };
        } catch {
            set({ user: data });
            return data;
        }
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null });
    },

    refreshUser: async () => {
        try {
            const { data } = await api.get('/auth/me');
            set({ user: data });
            return data;
        } catch {
            return null;
        }
    },
}));
