import { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkLoggedIn = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const { data } = await api.get('/auth/me');
                    setUser(data);
                } catch (error) {
                    console.error('Auth check failed:', error);
                    localStorage.removeItem('token');
                }
            }
            setLoading(false);
        };

        checkLoggedIn();
    }, []);

    const login = async (credentialsOrToken) => {
        try {
            // If argument is a string, it's a token (from OAuth or Onboarding)
            if (typeof credentialsOrToken === 'string') {
                const token = credentialsOrToken;
                localStorage.setItem('token', token);
                // Immediately fetch user data with this new token
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
                // Standard credentials login
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
            // Fetch full user data to get all fields including role
            try {
                const { data: fullUserData } = await api.get('/auth/me');
                setUser(fullUserData);
                return { ...data, ...fullUserData }; // Return combined data with role
            } catch (fetchError) {
                // If fetch fails, use the registration response
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
