import axios from 'axios';

// Ensure baseURL always ends with /api
export const getBaseURL = () => {
    const envURL = import.meta.env.VITE_API_URL;
    let baseURL;

    if (envURL) {
        // If VITE_API_URL is provided, ensure it ends with /api
        baseURL = envURL.endsWith('/api') ? envURL : `${envURL.replace(/\/$/, '')}/api`;
    } else {
        // Default to localhost for same-machine development (frontend + backend on one machine)
        // For other devices on your network, create client/.env with VITE_API_URL=http://YOUR_IP:5001
        baseURL = 'http://localhost:5001/api';
    }

    // Log to help debug (both dev and prod)
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

// Request interceptor - combines logging and token injection
api.interceptors.request.use(
    (config) => {
        // Log the actual request URL (both dev and prod for debugging)
        const fullURL = config.baseURL + config.url;
        console.log('API Request:', config.method?.toUpperCase(), fullURL);

        // Add authorization token if available
        const token = localStorage.getItem('token');
        console.log('Has token:', !!token);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
