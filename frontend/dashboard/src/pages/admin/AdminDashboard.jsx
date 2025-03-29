import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';
import { useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

function AdminDashboard() {
    useEffect(() => {
        // Убраны отладочные логи
    }, []);

    // Fetch users for basic statistics
    const { data: usersData, isLoading: usersLoading } = useQuery({
        queryKey: ['admin-users'],
        queryFn: adminService.getUsers
    });

    // Fetch recent logs
    const { data: logsData, isLoading: logsLoading } = useQuery({
        queryKey: ['admin-logs'],
        queryFn: () => adminService.getLogs({ limit: 5 })
    });

    const users = usersData?.data?.data || [];
    const logs = logsData?.data?.data?.logs || [];

    // Calculate statistics
    const totalUsers = users.length;
    const teacherCount = users.filter(user => user.role === 'teacher').length;
    const freeUserCount = users.filter(user => user.role === 'free').length;
    const adminCount = users.filter(user => user.role === 'admin').length;

    if (usersLoading && logsLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Панель администратора</h1>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                    <div className="stats-card-title">Всего пользователей</div>
                    <div className="stats-card-value">{totalUsers}</div>
                    <div className="stats-card-description">
                        <span className="text-tertiary">Зарегистрированных аккаунтов</span>
                    </div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <div className="stats-card-title">Преподаватели</div>
                    <div className="stats-card-value">{teacherCount}</div>
                    <div className="stats-card-description">
                        <span className="text-tertiary">Платные аккаунты</span>
                    </div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--warning)' }}>
                    <div className="stats-card-title">Бесплатные пользователи</div>
                    <div className="stats-card-value">{freeUserCount}</div>
                    <div className="stats-card-description">
                        <span className="text-tertiary">Ограниченный доступ</span>
                    </div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--danger)' }}>
                    <div className="stats-card-title">Администраторы</div>
                    <div className="stats-card-value">{adminCount}</div>
                    <div className="stats-card-description">
                        <span className="text-tertiary">Административный доступ</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="col-span-8">
                    <div className="card">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="text-xl font-semibold">Управление пользователями</h2>
                            <Link to="/admin/users" className="btn btn-sm btn-outline">Просмотреть всех пользователей</Link>
                        </div>

                        {usersLoading ? (
                            <p>Загрузка пользователей...</p>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>ID</th>
                                        <th>Имя</th>
                                        <th>Почта</th>
                                        <th>Роль</th>
                                        <th>Действия</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {users.slice(0, 5).map(user => (
                                        <tr key={user.id}>
                                            <td>{user.id}</td>
                                            <td>{user.fio}</td>
                                            <td>{user.login}</td>
                                            <td>
                                                    <span className={`badge ${
                                                        user.role === 'admin' ? 'badge-danger' :
                                                            user.role === 'teacher' ? 'badge-success' :
                                                                'badge-warning'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                            </td>
                                            <td>
                                                {user.role !== 'admin' && (
                                                    <Link to={`/admin/teachers/${user.id}`} className="btn btn-sm btn-outline">
                                                        Подробнее
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Recent System Logs */}
                    <div className="card mt-6">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="text-xl font-semibold">Недавние системные логи</h2>
                            <Link to="/admin/logs" className="btn btn-sm btn-outline">Просмотреть все логи</Link>
                        </div>

                        {logsLoading ? (
                            <p>Загрузка логов...</p>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>Время</th>
                                        <th>Пользователь</th>
                                        <th>Действие</th>
                                        <th>Подробности</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {logs.map(log => (
                                        <tr key={log.id}>
                                            <td>{new Date(log.timestamp).toLocaleString()}</td>
                                            <td>{log.user_fio}</td>
                                            <td>{log.action}</td>
                                            <td>{log.details}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="col-span-4">
                    <div className="card">
                        <h2 className="text-xl font-semibold mb-4">Инструменты администратора</h2>
                        <div className="admin-tools">
                            <Link to="/admin/users" className="tool-card">
                                <div className="tool-icon" style={{ backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                </div>
                                <div className="tool-content">
                                    <h3 className="tool-title">Управление пользователями</h3>
                                    <p className="tool-description">Управление пользователями, обновление ролей и удаление аккаунтов</p>
                                </div>
                            </Link>

                            <Link to="/admin/logs" className="tool-card">
                                <div className="tool-icon" style={{ backgroundColor: 'var(--warning-lighter)', color: 'var(--warning)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                </div>
                                <div className="tool-content">
                                    <h3 className="tool-title">Системные логи</h3>
                                    <p className="tool-description">Просмотр журналов активности и мониторинг системных событий</p>
                                </div>
                            </Link>
                        </div>
                    </div>

                    <div className="card mt-6">
                        <h2 className="text-xl font-semibold mb-4">Активность пользователей</h2>
                        <div className="chart-placeholder">
                            <div className="empty-chart">
                                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tertiary">
                                    <line x1="18" y1="20" x2="18" y2="10"></line>
                                    <line x1="12" y1="20" x2="12" y2="4"></line>
                                    <line x1="6" y1="20" x2="6" y2="14"></line>
                                </svg>
                                <p>Здесь будет отображаться график активности</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .admin-tools {
                    display: grid;
                    grid-template-columns: 1fr;
                    gap: 1rem;
                }
                
                .tool-card {
                    display: flex;
                    align-items: center;
                    padding: 1.25rem;
                    border-radius: var(--radius-lg);
                    background-color: var(--bg-dark-secondary);
                    border: 1px solid var(--border-color);
                    transition: all var(--transition-fast) ease;
                }
                
                .tool-card:hover {
                    border-color: var(--border-color-light);
                    background-color: var(--bg-dark-tertiary);
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                
                .tool-icon {
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    margin-right: 1rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .tool-content {
                    flex: 1;
                }
                
                .tool-title {
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                    color: var(--text-primary);
                }
                
                .tool-description {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin: 0;
                }
                
                .chart-placeholder {
                    height: 200px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .empty-chart {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    color: var(--text-tertiary);
                    text-align: center;
                }
                
                .empty-chart svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .empty-chart p {
                    font-size: 0.875rem;
                }
            `}</style>
        </div>
    );
}

export default AdminDashboard;