import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminRoute = () => {
    const { currentUser, isAdmin } = useAuth();

    // If not authenticated or not an admin, redirect to dashboard
    if (!currentUser || !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    // Otherwise, render the child routes
    return <Outlet />;
};