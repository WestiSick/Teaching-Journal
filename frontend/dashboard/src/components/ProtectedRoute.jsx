import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function ProtectedRoute({ children, requireAdmin = false }) {
    const { isAuthenticated, isAdmin, currentUser } = useAuth();
    const location = useLocation();

    console.log("Protected route check:", {
        isAuthenticated,
        isAdmin,
        requireAdmin,
        currentUser,
        pathname: location.pathname
    });

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (requireAdmin && !isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    return children;
}