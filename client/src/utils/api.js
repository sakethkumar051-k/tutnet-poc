import axios from 'axios';

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
});

// Request interceptor — injects Bearer token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor — handle auth errors globally
const PUBLIC_PATHS = ['/login', '/register', '/oauth-success', '/complete-profile', '/admin-login', '/'];
const PUBLIC_PATH_PREFIXES = ['/find-tutors', '/tutor/', '/about', '/courses', '/contact', '/onboarding'];

const isPublicPath = (path) =>
    PUBLIC_PATHS.includes(path) || PUBLIC_PATH_PREFIXES.some((p) => path.startsWith(p));

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const status = error.response?.status;
        const currentPath = window.location.pathname;
        const originalRequest = error.config;

        if (status === 401) {
            // Drop the stale token — it's no longer valid.
            localStorage.removeItem('token');

            if (isPublicPath(currentPath)) {
                // On public pages, retry the original request once as a guest
                // (no Authorization header) so the UI can still render data.
                if (originalRequest && !originalRequest._retriedAsGuest) {
                    originalRequest._retriedAsGuest = true;
                    if (originalRequest.headers) delete originalRequest.headers.Authorization;
                    return api.request(originalRequest);
                }
            } else {
                window.location.href = '/login';
            }
        }
        // 403: let components handle permission errors

        return Promise.reject(error);
    }
);

export default api;
