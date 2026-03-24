import { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

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

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');

            if (!token) {
                setLoading(false);
                return;
            }

            if (isTokenExpired(token)) {
                localStorage.removeItem('token');
                setLoading(false);
                return;
            }

            const payload = decodeTokenPayload(token);
            if (payload?.id) {
                setUser({ _id: payload.id, _tokenOnly: true });
            }

            try {
                const { data } = await api.get('/auth/me');
                setUser(data);
            } catch (error) {
                console.error('Auth check failed:', error);
                localStorage.removeItem('token');
                setUser(null);
            } finally {
                setLoading(false);
            }
        };

        checkLoggedIn();
    }, []);

    const login = async (credentialsOrToken) => {
        try {
            if (typeof credentialsOrToken === 'string') {
                const token = credentialsOrToken;
                localStorage.setItem('token', token);
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data);
                    return data;
                } catch (error) {
                    console.error('Login with token failed:', error);
                    localStorage.removeItem('token');
                    throw error;
                }
            } else {
                const { data } = await api.post('/auth/login', credentialsOrToken);
                localStorage.setItem('token', data.token);
                setUser(data);
                return data;
            }
        } catch (error) {
            console.error('Login failed:', error);
            localStorage.removeItem('token');
            setUser(null);
            throw error;
        }
    };

    const register = async (userData) => {
        try {
            const { data } = await api.post('/auth/register', userData);
            localStorage.setItem('token', data.token);
            try {
                const { data: fullUserData } = await api.get('/auth/me');
                setUser(fullUserData);
                return { ...data, ...fullUserData };
            } catch {
                setUser(data);
                return data;
            }
        } catch (error) {
            console.error('Registration failed:', error);
            localStorage.removeItem('token');
            setUser(null);
            throw error;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const refreshUser = async () => {
        try {
            const { data } = await api.get('/auth/me');
            setUser(data);
            return data;
        } catch (error) {
            console.error('Refresh user failed:', error);
            return null;
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, refreshUser, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
