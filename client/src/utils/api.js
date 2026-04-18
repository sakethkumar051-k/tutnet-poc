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

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const currentPath = window.location.pathname;

        if (status === 401 && !PUBLIC_PATHS.includes(currentPath)) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        // 403: let components handle permission errors

        return Promise.reject(error);
    }
);

export default api;
