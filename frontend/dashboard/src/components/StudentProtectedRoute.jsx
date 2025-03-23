import { Navigate, Outlet } from 'react-router-dom';
import { useState, useEffect } from 'react';

export function StudentProtectedRoute() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const studentId = localStorage.getItem('testStudentId');
        const studentInfo = localStorage.getItem('testStudentInfo');

        setIsAuthenticated(!!studentId && !!studentInfo);
        setIsLoading(false);
    }, []);

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/tests/student/login" replace />;
    }

    return <Outlet />;
}

export default StudentProtectedRoute;