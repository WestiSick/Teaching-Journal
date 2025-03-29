import { Link } from 'react-router-dom';

function NotFound() {
    return (
        <div className="container" style={{ textAlign: 'center', marginTop: '100px' }}>
            <h1>404 - Страница не найдена</h1>
            <p>Страница, которую вы ищете, не существует.</p>
            <Link to="/" className="btn btn-primary">
                На главную
            </Link>
        </div>
    );
}

export default NotFound;