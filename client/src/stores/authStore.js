import { create } from 'zustand';
import api from '../utils/api';
import { useNotificationStore } from './notificationStore';
import { useBookingStore } from './bookingStore';
import { teardownSocket } from '../socketClient';
import { getAccessToken, setAccessToken, clearAccessToken } from '../authToken';

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

    // Hydrate user: session access token + HttpOnly refresh cookie
    initialize: async () => {
        let token = getAccessToken();
        if (token && isTokenExpired(token)) {
            clearAccessToken();
            token = null;
        }

        if (!token) {
            try {
                const { data } = await api.post('/auth/refresh');
                if (data?.token) setAccessToken(data.token);
            } catch {
                set({ user: null, loading: false });
                return;
            }
        }

        token = getAccessToken();
        if (!token) {
            set({ user: null, loading: false });
            return;
        }

        const payload = decodeTokenPayload(token);
        if (payload?.id) {
            set({ user: { _id: payload.id, _tokenOnly: true } });
        }

        try {
            const { data } = await api.get('/auth/me');
            set({ user: data, loading: false });
        } catch {
            clearAccessToken();
            set({ user: null, loading: false });
        }
    },

    login: async (credentialsOrToken) => {
        if (typeof credentialsOrToken === 'string') {
            const token = credentialsOrToken;
            setAccessToken(token);
            try {
                const { data } = await api.get('/auth/me');
                set({ user: data });
                return data;
            } catch (error) {
                clearAccessToken();
                set({ user: null });
                throw error;
            }
        }

        const { data } = await api.post('/auth/login', credentialsOrToken);
        if (data.token) setAccessToken(data.token);
        set({ user: data });
        return data;
    },

    register: async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        if (data.token) setAccessToken(data.token);
        try {
            const { data: fullUser } = await api.get('/auth/me');
            set({ user: fullUser });
            return { ...data, ...fullUser };
        } catch {
            set({ user: data });
            return data;
        }
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch {
            /* still clear client */
        }
        clearAccessToken();
        teardownSocket();
        useNotificationStore.getState().reset();
        useBookingStore.getState().reset();
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
