import axios from 'axios';

// Ensure baseURL always ends with /api
export const getBaseURL = () => {
    const envURL = import.meta.env.VITE_API_URL;
    let baseURL;

    if (envURL) {
        baseURL = envURL.endsWith('/api') ? envURL : `${envURL.replace(/\/$/, '')}/api`;
    } else {
        baseURL = 'http://localhost:5001/api';
    }

    console.log('API Base URL:', baseURL);
    return baseURL;
};

const baseURL = getBaseURL();

const api = axios.create({
    baseURL: baseURL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — injects Bearer token into every request
api.interceptors.request.use(
    (config) => {
        const fullURL = config.baseURL + config.url;
        console.log('API Request:', config.method?.toUpperCase(), fullURL);

        const token = localStorage.getItem('token');
        console.log('Has token:', !!token);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// FIX: Added response interceptor to handle auth errors globally.
//
// 401 Unauthorized — token is missing, expired, or invalid.
//   → Clear stored token and redirect to /login so the user re-authenticates.
//   → Skip redirect if already on a public page to avoid redirect loops.
//
// 403 Forbidden — user IS authenticated but does not own the resource.
//   → Do NOT redirect to login (they are logged in, just not authorized).
//   → Let the individual component handle and show the error message.
//   → Previously there was no interceptor at all, so 401s failed silently
//     and stale tokens would never get cleared automatically.
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const currentPath = window.location.pathname;
        const publicPaths = ['/login', '/register', '/oauth-success', '/complete-profile', '/admin-login'];

        if (status === 401) {
            // Token expired or invalid — clear it and force re-login
            localStorage.removeItem('token');
            if (!publicPaths.includes(currentPath)) {
                window.location.href = '/login';
            }
        }
        // 403: don't redirect — components display their own permission error

        return Promise.reject(error);
    }
);

export default api;
