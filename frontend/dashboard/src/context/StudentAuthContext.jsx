import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const StudentAuthContext = createContext();

export function useStudentAuth() {
    return useContext(StudentAuthContext);
}

export function StudentAuthProvider({ children }) {
    const [currentStudent, setCurrentStudent] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('studentToken'));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Function to initialize authentication state
    const initAuth = useCallback(async () => {
        const storedToken = localStorage.getItem('studentToken');

        if (!storedToken) {
            setCurrentStudent(null);
            setLoading(false);
            return;
        }

        try {
            // Set the token in axios headers for student endpoints
            axios.defaults.headers.common['X-Student-Token'] = storedToken;

            // Attempt to decode the token
            const decoded = jwtDecode(storedToken);
            const currentTime = Date.now() / 1000;

            if (decoded.exp < currentTime) {
                // Token is expired
                console.log("Student token expired, logging out");
                localStorage.removeItem('studentToken');
                setToken(null);
                setCurrentStudent(null);
                delete axios.defaults.headers.common['X-Student-Token'];
            } else {
                // Token is valid
                setToken(storedToken);
                setCurrentStudent({
                    id: decoded.student_id,
                    fio: decoded.fio || '',
                    group: decoded.group_name || ''
                });
                axios.defaults.headers.common['X-Student-Token'] = storedToken;
            }
        } catch (error) {
            console.error('Invalid student token', error);
            setError('Authentication error: Invalid token');
            localStorage.removeItem('studentToken');
            setToken(null);
            setCurrentStudent(null);
            delete axios.defaults.headers.common['X-Student-Token'];
        }

        setLoading(false);
    }, []);

    // Run initialization when component mounts or token changes
    useEffect(() => {
        initAuth();
    }, [initAuth]);

    // Login function
    const login = useCallback((newToken, student) => {
        // Store token in localStorage
        localStorage.setItem('studentToken', newToken);

        // Set Authorization header
        axios.defaults.headers.common['X-Student-Token'] = newToken;

        // Update state
        setToken(newToken);
        setCurrentStudent(student);
        setError(null);
    }, []);

    // Logout function
    const logout = useCallback(() => {
        localStorage.removeItem('studentToken');
        delete axios.defaults.headers.common['X-Student-Token'];
        setToken(null);
        setCurrentStudent(null);
    }, []);

    // Context value with authentication state and functions
    const value = {
        currentStudent,
        token,
        login,
        logout,
        isAuthenticated: !!currentStudent,
        error
    };

    return (
        <StudentAuthContext.Provider value={value}>
            {!loading && children}
        </StudentAuthContext.Provider>
    );
}