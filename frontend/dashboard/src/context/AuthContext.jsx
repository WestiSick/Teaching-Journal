import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';
import api from '../services/api'; // Добавлен импорт api инстанса

const AuthContext = createContext();

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }) {
    const [currentUser, setCurrentUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to initialize authentication state
    const initAuth = useCallback(async () => {
        const storedToken = localStorage.getItem('token');

        if (!storedToken) {
            setCurrentUser(null);
            setLoading(false);
            return;
        }

        try {
            // Set the token in axios headers immediately - UPDATED: Set on both instances
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
            api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;

            // Attempt to decode the token
            const decoded = jwtDecode(storedToken);
            const currentTime = Date.now() / 1000;

            console.log("Token expiry check:", decoded.exp, currentTime, decoded.exp > currentTime);

            if (decoded.exp < currentTime) {
                // Token is expired
                console.log("Token expired, logging out");
                localStorage.removeItem('token');
                setToken(null);
                setCurrentUser(null);
                delete axios.defaults.headers.common['Authorization'];
                delete api.defaults.headers.common['Authorization']; // ADDED: Also delete from api instance
            } else {
                // Token is valid
                console.log("Token is valid, setting user", decoded);
                setToken(storedToken);
                setCurrentUser({
                    id: decoded.user_id,
                    role: decoded.user_role,
                    email: decoded.user_email
                });

                // Double-check that the header is set (redundant but ensures it's set)
                axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
                api.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`; // ADDED: Also set on api instance
                console.log("Auth header set:", axios.defaults.headers.common['Authorization']);
                console.log("API instance header set:", api.defaults.headers.common['Authorization']); // ADDED: Log api headers
            }
        } catch (error) {
            console.error('Invalid token', error);
            setError('Authentication error: Invalid token');
            localStorage.removeItem('token');
            setToken(null);
            setCurrentUser(null);
            delete axios.defaults.headers.common['Authorization'];
            delete api.defaults.headers.common['Authorization']; // ADDED: Also delete from api instance
        }

        setLoading(false);
    }, []);

    // Run initialization when component mounts or token changes
    useEffect(() => {
        initAuth();
    }, [initAuth]);

    // Login function
    const login = useCallback((newToken, user) => {
        console.log("Login called with:", newToken, user);

        // Store token in localStorage
        localStorage.setItem('token', newToken);

        // Set Authorization header - UPDATED: Set on both instances
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

        // Update state
        setToken(newToken);
        setCurrentUser(user);
        setError(null);

        console.log("After login:", {
            token: newToken,
            user,
            axiosHeaders: axios.defaults.headers.common['Authorization'],
            apiHeaders: api.defaults.headers.common['Authorization'] // ADDED: Log api headers
        });
    }, []);

    // Logout function
    const logout = useCallback(() => {
        console.log("Logout called");
        localStorage.removeItem('token');
        delete axios.defaults.headers.common['Authorization'];
        delete api.defaults.headers.common['Authorization']; // ADDED: Also delete from api instance
        setToken(null);
        setCurrentUser(null);
    }, []);

    // Context value with authentication state and functions
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

    console.log("Auth context value:", value);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
}

// Custom hook to check if user is authorized for a specific role
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

// Custom hook to protect paid features
export function usePaidFeature() {
    const { isFree } = useAuth();
    return !isFree;
}