import axios from 'axios';
import { getAccessToken, setAccessToken, clearAccessToken } from '../authToken';

export const getBaseURL = () => {
    const envURL = import.meta.env.VITE_API_URL;
    if (envURL) {
        return envURL.endsWith('/api') ? envURL : `${envURL.replace(/\/$/, '')}/api`;
    }
    return 'http://localhost:5001/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
    timeout: 15_000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true
});

api.interceptors.request.use((config) => {
    const token = getAccessToken();
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    const u = config.url || '';
    const isCreateBooking =
        (config.method === 'post' || config.method === 'POST') &&
        /\/bookings\/?(\?.*)?$/.test(u) &&
        !u.includes('/makeup');
    if (isCreateBooking && !config.headers['Idempotency-Key']) {
        const uuid =
            typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
        config.headers['Idempotency-Key'] = uuid;
    }
    return config;
});

const PUBLIC_PATHS = ['/login', '/register', '/oauth-success', '/complete-profile', '/admin-login', '/', '/terms', '/tutor-agreement', '/pricing', '/how-it-works'];
const PUBLIC_PATH_PREFIXES = ['/find-tutors', '/tutor/', '/about', '/courses', '/contact', '/onboarding'];

const isPublicPath = (path) =>
    PUBLIC_PATHS.includes(path) || PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p));

api.interceptors.response.use(
    (response) => {
        const url = response.config?.url || '';
        const t = response.data?.token;
        if (typeof t === 'string' && t.length > 0) {
            if (
                url.includes('/auth/login') ||
                url.includes('/auth/register') ||
                url.includes('/auth/refresh') ||
                (url.includes('/auth/profile') && response.config?.method?.toLowerCase() === 'put') ||
                url.includes('/oauth-token')
            ) {
                setAccessToken(t);
            }
        }
        return response;
    },
    async (error) => {
        const status = error.response?.status;
        const currentPath = window.location.pathname;
        const originalRequest = error.config;

        if (status === 401 && originalRequest && !originalRequest._retryAfterRefresh) {
            const reqUrl = originalRequest.url || '';
            const skipRefresh =
                reqUrl.includes('/auth/login') ||
                reqUrl.includes('/auth/register') ||
                reqUrl.includes('/auth/refresh');

            if (!skipRefresh) {
                originalRequest._retryAfterRefresh = true;
                try {
                    const { data } = await api.post('/auth/refresh');
                    if (data?.token) {
                        setAccessToken(data.token);
                        originalRequest.headers = originalRequest.headers || {};
                        originalRequest.headers.Authorization = `Bearer ${data.token}`;
                    }
                    return api.request(originalRequest);
                } catch {
                    clearAccessToken();
                }
            } else if (reqUrl.includes('/auth/refresh')) {
                clearAccessToken();
            }
        }

        if (error.response?.status === 401) {
            if (isPublicPath(currentPath)) {
                if (originalRequest && !originalRequest._retriedAsGuest) {
                    originalRequest._retriedAsGuest = true;
                    if (originalRequest.headers) delete originalRequest.headers.Authorization;
                    return api.request(originalRequest);
                }
            } else {
                window.location.href = '/login';
            }
        }

        const d = error.response?.data;
        if (d && typeof d === 'object') {
            const nested = d.error && typeof d.error === 'object' ? d.error.message : null;
            error.normalizedMessage = nested || d.message || error.message;
        }
        return Promise.reject(error);
    }
);

export function getApiErrorMessage(error) {
    if (error?.normalizedMessage) return error.normalizedMessage;
    const d = error?.response?.data;
    if (d?.error && typeof d.error === 'object' && d.error.message) return d.error.message;
    if (typeof d?.message === 'string') return d.message;
    return error?.message || 'Request failed';
}

export default api;
