import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AdminRoute = () => {
    const { currentUser, isAdmin } = useAuth();

    if (!currentUser || !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return <Outlet />;
};