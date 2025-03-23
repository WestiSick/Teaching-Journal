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

                // Extract group information from token
                const studentInfo = {
                    id: decoded.student_id,
                    fio: decoded.fio || '',
                    group: decoded.group_name || ''
                };

                console.log("Student auth initialized with info:", studentInfo);
                setCurrentStudent(studentInfo);
                axios.defaults.headers.common['X-Student-Token'] = storedToken;

                // Log successful auth initialization
                console.log("Student auth initialized with token:", storedToken.substring(0, 15) + '...');
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

        console.log("Student logged in, setting token:", newToken.substring(0, 15) + '...');
        console.log("Student info:", student);

        try {
            // Try to decode the token to get the group if not provided
            const decoded = jwtDecode(newToken);
            if (!student.group && decoded.group_name) {
                student.group = decoded.group_name;
                console.log("Updated student group from token:", student.group);
            }
        } catch (err) {
            console.error("Error extracting data from token:", err);
        }

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
        console.log("Student logged out");
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