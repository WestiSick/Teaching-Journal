import { useAuth } from '../context/AuthContext';

export function RequireSubscription({ children, fallback }) {
    const { isFree } = useAuth();

    if (isFree) {
        return fallback || (
            <div className="card">
                <h3>Subscription Required</h3>
                <p>You need a paid subscription to access this feature.</p>
                <p>Please contact the administrator to upgrade your account.</p>
            </div>
        );
    }

    return children;
}