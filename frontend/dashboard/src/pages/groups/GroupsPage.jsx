import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { groupService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function GroupsPage() {
    const { isFree } = useAuth();
    const navigate = useNavigate();

    // Получаем все группы
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    const groups = data?.data?.data || [];

    const handleDelete = async (name) => {
        if (window.confirm(`Вы уверены, что хотите удалить группу "${name}"? Это действие удалит все связанные данные.`)) {
            try {
                await groupService.deleteGroup(name);
                refetch(); // Обновляем список после удаления
            } catch (error) {
                alert('Не удалось удалить группу');
            }
        }
    };

    if (isLoading) {
        return <div className="loader">Загрузка...</div>;
    }

    if (error) {
        return <div className="alert alert-danger">Ошибка загрузки групп: {error.message}</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Группы</h1>
                <RequireSubscription
                    fallback={
                        <button className="btn btn-primary" disabled>
                            Добавить группу (требуется подписка)
                        </button>
                    }
                >
                    <Link to="/groups/new" className="btn btn-primary">Добавить группу</Link>
                </RequireSubscription>
            </div>

            {/* Список групп */}
            {groups.length === 0 ? (
                <div className="card">
                    <h3>Группы не найдены</h3>
                    <p>Создайте свою первую группу, чтобы начать управление студентами и занятиями.</p>
                    <RequireSubscription>
                        <Link to="/groups/new" className="btn btn-primary">Создать группу</Link>
                    </RequireSubscription>
                </div>
            ) : (
                <div className="card">
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Название группы</th>
                                <th>Студентов</th>
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {groups.map(group => (
                                <tr key={group.name}>
                                    <td>{group.name}</td>
                                    <td>{group.student_count || 0}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={() => navigate(`/groups/${encodeURIComponent(group.name)}`)}
                                                className="btn btn-sm btn-secondary"
                                            >
                                                Просмотр
                                            </button>

                                            <RequireSubscription
                                                fallback={
                                                    <button className="btn btn-sm btn-primary" disabled>
                                                        Редактировать
                                                    </button>
                                                }
                                            >
                                                <button
                                                    onClick={() => navigate(`/groups/${encodeURIComponent(group.name)}/edit`)}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Редактировать
                                                </button>
                                            </RequireSubscription>

                                            <RequireSubscription
                                                fallback={
                                                    <button className="btn btn-sm btn-danger" disabled>
                                                        Удалить
                                                    </button>
                                                }
                                            >
                                                <button
                                                    onClick={() => handleDelete(group.name)}
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    Удалить
                                                </button>
                                            </RequireSubscription>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GroupsPage;