import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';

function UserManagement() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [userToDelete, setUserToDelete] = useState(null);
    const [userToModify, setUserToModify] = useState(null);
    const [selectedRole, setSelectedRole] = useState('');

    // Fetch all users
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-users'],
        queryFn: adminService.getUsers
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: (userId) => adminService.deleteUser(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setShowConfirmation(false);
            setUserToDelete(null);
        }
    });

    // Update user role mutation
    const updateRoleMutation = useMutation({
        mutationFn: ({ id, role }) => adminService.updateUserRole(id, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            setUserToModify(null);
        }
    });

    const users = data?.data?.data || [];

    // Apply filters
    const filteredUsers = users.filter(user => {
        const matchesSearch = searchTerm === '' ||
            user.fio.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.login.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter === '' || user.role === roleFilter;

        return matchesSearch && matchesRole;
    });

    const confirmDeleteUser = (user) => {
        setUserToDelete(user);
        setShowConfirmation(true);
    };

    const handleDeleteUser = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
        }
    };

    const openRoleModal = (user) => {
        setUserToModify(user);
        setSelectedRole(user.role);
    };

    const handleUpdateRole = () => {
        if (userToModify && selectedRole) {
            updateRoleMutation.mutate({ id: userToModify.id, role: selectedRole });
        }
    };

    const handleViewTeacher = (userId) => {
        navigate(`/admin/teachers/${userId}`);
    };

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Ошибка загрузки пользователей: {error.message}</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Управление пользователями</h1>
                <Link to="/admin" className="btn btn-secondary">Назад к панели администратора</Link>
            </div>

            <div className="card">
                <div className="filter-container d-flex justify-content-between align-items-center mb-4">
                    <div className="d-flex gap-3 align-items-center">
                        <div className="search-container">
                            <input
                                type="text"
                                placeholder="Поиск по имени или email..."
                                className="form-control"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="role-filter">
                            <select
                                className="form-control"
                                value={roleFilter}
                                onChange={(e) => setRoleFilter(e.target.value)}
                            >
                                <option value="">Все роли</option>
                                <option value="admin">Администратор</option>
                                <option value="teacher">Преподаватель</option>
                                <option value="free">Бесплатный аккаунт</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <span className="badge badge-info">{filteredUsers.length} пользователей</span>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Имя</th>
                            <th>Email</th>
                            <th>Роль</th>
                            <th>Статистика</th>
                            <th>Действия</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredUsers.map(user => (
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
                                            {user.role === 'admin' ? 'Администратор' :
                                                user.role === 'teacher' ? 'Преподаватель' :
                                                    'Бесплатный'}
                                        </span>
                                </td>
                                <td>
                                    {(user.role === 'teacher' || user.role === 'free') && (
                                        <div>
                                            <small>Занятия: {user.total_lessons || 0}</small><br />
                                            <small>Часы: {user.total_hours || 0}</small>
                                        </div>
                                    )}
                                </td>
                                <td>
                                    <div className="d-flex gap-2">
                                        {(user.role === 'teacher' || user.role === 'free') && (
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => handleViewTeacher(user.id)}
                                            >
                                                Просмотр
                                            </button>
                                        )}
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={() => openRoleModal(user)}
                                        >
                                            Изменить роль
                                        </button>
                                        {user.role !== 'admin' && (
                                            <button
                                                className="btn btn-sm btn-danger"
                                                onClick={() => confirmDeleteUser(user)}
                                            >
                                                Удалить
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Delete Confirmation Modal */}
            {showConfirmation && (
                <div className="modal-overlay">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title">Удаление пользователя</h3>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowConfirmation(false)}
                                >
                                    &times;
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>Вы уверены, что хотите удалить пользователя <strong>{userToDelete?.fio}</strong>?</p>
                                <p className="text-danger">Это действие нельзя отменить, и все связанные данные будут удалены!</p>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setShowConfirmation(false)}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-danger"
                                    onClick={handleDeleteUser}
                                    disabled={deleteUserMutation.isPending}
                                >
                                    {deleteUserMutation.isPending ? 'Удаление...' : 'Удалить пользователя'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Role Modal */}
            {userToModify && (
                <div className="modal-overlay">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title">Изменение роли пользователя</h3>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setUserToModify(null)}
                                >
                                    &times;
                                </button>
                            </div>
                            <div className="modal-body">
                                <p>Изменить роль для пользователя <strong>{userToModify?.fio}</strong></p>
                                <div className="form-group">
                                    <label htmlFor="role-select">Выберите роль</label>
                                    <select
                                        id="role-select"
                                        className="form-control"
                                        value={selectedRole}
                                        onChange={(e) => setSelectedRole(e.target.value)}
                                    >
                                        <option value="admin">Администратор</option>
                                        <option value="teacher">Преподаватель</option>
                                        <option value="free">Бесплатный аккаунт</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={() => setUserToModify(null)}
                                >
                                    Отмена
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleUpdateRole}
                                    disabled={updateRoleMutation.isPending}
                                >
                                    {updateRoleMutation.isPending ? 'Обновление...' : 'Сохранить изменения'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                .filter-container {
                    margin-bottom: 1.5rem;
                }
                
                .search-container {
                    width: 300px;
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .modal-dialog {
                    width: 100%;
                    max-width: 500px;
                }
                
                .modal-content {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-lg);
                }
                
                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                }
                
                .btn-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--text-tertiary);
                    cursor: pointer;
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .modal-footer {
                    padding: 1rem 1.5rem;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                }
            `}</style>
        </div>
    );
}

export default UserManagement;