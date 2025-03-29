import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import api from '../services/api';

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const initAuth = useCallback(async () => {
        const storedToken = localStorage.getItem('token');

        if (!storedToken) {
            setCurrentUser(null);
            setLoading(false);
            return;
        }

        try {
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

            const decoded = jwtDecode(storedToken);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
                localStorage.removeItem('token');
                setToken(null);
                setCurrentUser(null);
                delete axios.defaults.headers.common['Authorization'];
                delete api.defaults.headers.common['Authorization'];
            } else {
                setToken(storedToken);
                setCurrentUser({
                    id: decoded.user_id,
                    role: decoded.user_role,
                    email: decoded.user_email
                });

                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            }
        } catch (error) {
            setError('Ошибка аутентификации: Неверный токен');
            localStorage.removeItem('token');
            setToken(null);
            setCurrentUser(null);
            delete axios.defaults.headers.common['Authorization'];
            delete api.defaults.headers.common['Authorization'];
        }

        setLoading(false);
    }, []);

    useEffect(() => {
        initAuth();
    }, [initAuth]);

    const login = useCallback((newToken, user) => {
        localStorage.setItem('token', newToken);

        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        setToken(newToken);
        setCurrentUser(user);
        setError(null);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common['Authorization']; // ДОБАВЛЕНО: Также удаляем из экземпляра api
        setToken(null);
        setCurrentUser(null);
    }, []);

    const value = {
        currentUser,
        token,
        login,
        logout,
        isAuthenticated: !!currentUser,
        isAdmin: currentUser?.role === 'admin',
        isFree: currentUser?.role === 'free',
        error
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

export function useAuthorization(requiredRole = null) {
    const { currentUser, isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return false;
    }

    if (requiredRole && currentUser.role !== requiredRole) {
        return false;
    }

    return true;
}

export function usePaidFeature() {
    const { isFree } = useAuth();
    return !isFree;
}