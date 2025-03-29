import { useAuth } from '../context/AuthContext';

export function RequireSubscription({ children, fallback }) {
    const { isFree } = useAuth();

    if (isFree) {
        return fallback || (
            <div className="card">
                <h3>Требуется подписка</h3>
                <p>Вам нужна платная подписка для доступа к этой функции.</p>
                <p>Пожалуйста, свяжитесь с администратором для повышения уровня вашей учетной записи.</p>
            </div>
        );
    }

    return children;
}