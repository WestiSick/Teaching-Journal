import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { lessonService, attendanceService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';
import { useState } from 'react';

function LessonDetail() {
    const { id } = useParams();
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Получаем данные занятия
    const { data: lessonData, isLoading: lessonLoading, error: lessonError } = useQuery({
        queryKey: ['lesson', id],
        queryFn: () => lessonService.getLesson(id)
    });

    // Получаем данные посещаемости занятия
    const { data: attendanceData, isLoading: attendanceLoading, error: attendanceError } = useQuery({
        queryKey: ['lesson-attendance', id],
        queryFn: () => attendanceService.getLessonAttendance(id),
        enabled: !lessonLoading && !lessonError
    });

    const lesson = lessonData?.data?.data;
    const attendance = attendanceData?.data?.data;

    const handleDelete = async () => {
        try {
            await lessonService.deleteLesson(id);
            navigate('/lessons');
        } catch (error) {
            alert('Не удалось удалить занятие');
        }
    };

    // Вспомогательная функция для получения цвета статуса посещаемости
    const getAttendanceStatusColor = (rate) => {
        if (rate >= 85) return 'var(--success)';
        if (rate >= 70) return 'var(--warning)';
        return 'var(--danger)';
    };

    // Вспомогательная функция для форматирования даты
    const formatDate = (dateString) => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('ru-RU', options);
    };

    // Состояния загрузки
    if (lessonLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    // Состояния ошибок
    if (lessonError) {
        return (
            <div className="alert alert-danger mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p>Ошибка загрузки занятия: {lessonError.message}</p>
                </div>
            </div>
        );
    }

    // Отсутствие данных
    if (!lesson) {
        return (
            <div className="alert alert-warning mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>Занятие не найдено</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Детали занятия</h1>
                    <p className="text-secondary">Просмотр и управление информацией о занятии</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/lessons" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Назад</span>
                    </Link>
                    <RequireSubscription>
                        <Link to={`/lessons/${id}/edit`} className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span className="hidden sm:inline">Редактировать</span>
                        </Link>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="btn btn-danger flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                            <span className="hidden sm:inline">Удалить</span>
                        </button>
                    </RequireSubscription>
                </div>
            </div>

            {/* Карточка деталей занятия */}
            <div className="card p-0 overflow-hidden mb-6">
                <div className="p-6 pb-0">
                    <div className="lesson-header">
                        <div className="lesson-type-badge" style={{ backgroundColor: getLessonTypeColor(lesson.type) }}>
                            {getLessonTypeIcon(lesson.type)}
                            <span>{lesson.type}</span>
                        </div>
                        <h2 className="text-2xl font-semibold mt-2">{lesson.topic}</h2>
                    </div>
                </div>

                <div className="lesson-details-grid">
                    <div className="lesson-detail-item">
                        <div className="detail-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <div>
                            <div className="detail-label">Дата</div>
                            <div className="detail-value">{formatDate(lesson.date)}</div>
                        </div>
                    </div>
                    <div className="lesson-detail-item">
                        <div className="detail-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                        </div>
                        <div>
                            <div className="detail-label">Предмет</div>
                            <div className="detail-value">{lesson.subject}</div>
                        </div>
                    </div>
                    <div className="lesson-detail-item">
                        <div className="detail-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <div>
                            <div className="detail-label">Группа</div>
                            <div className="detail-value">
                                <Link to={`/groups/${encodeURIComponent(lesson.group_name)}`} className="group">
                                    <span className="text-primary group-hover:underline transition-colors">
                                        {lesson.group_name}
                                    </span>
                                </Link>
                            </div>
                        </div>
                    </div>
                    <div className="lesson-detail-item">
                        <div className="detail-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                        </div>
                        <div>
                            <div className="detail-label">Часов</div>
                            <div className="detail-value">
                                {lesson.hours} {lesson.hours === 1 ? 'час' : (lesson.hours >= 2 && lesson.hours <= 4) ? 'часа' : 'часов'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Карточка сводки посещаемости */}
            <div className="card mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-semibold">Посещаемость</h3>
                    <RequireSubscription
                        fallback={
                            <div className="badge badge-premium">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                                <span>Премиум функция</span>
                            </div>
                        }
                    >
                        <Link to={`/attendance/${id}`} className="btn btn-primary btn-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 20h9"></path>
                                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                            </svg>
                            <span>Управление посещаемостью</span>
                        </Link>
                    </RequireSubscription>
                </div>

                <RequireSubscription
                    fallback={
                        <div className="bg-bg-dark-tertiary rounded-lg p-6 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 mb-4 bg-primary-lighter text-primary rounded-full">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                </svg>
                            </div>
                            <h4 className="text-lg font-semibold mb-2">Отслеживание посещаемости</h4>
                            <p className="text-secondary mb-4">Перейдите на платную подписку для отслеживания и управления посещаемостью студентов.</p>
                            <button className="btn btn-primary">Обновить сейчас</button>
                        </div>
                    }
                >
                    {attendanceLoading ? (
                        <div className="flex justify-center py-6">
                            <div className="spinner"></div>
                        </div>
                    ) : attendanceError ? (
                        <div className="alert alert-danger">
                            <div className="flex items-center gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                                <p>Ошибка загрузки данных посещаемости. {attendanceError.message}</p>
                            </div>
                        </div>
                    ) : !attendance ? (
                        <div className="attendance-empty-state">
                            <div className="attendance-empty-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <h4 className="text-lg font-semibold mb-2">Отметки посещаемости еще не внесены</h4>
                            <p className="text-secondary mb-4">Начните отслеживать посещаемость для этого занятия, чтобы увидеть данные об участии студентов.</p>
                            <Link to={`/attendance/${id}`} className="btn btn-primary">
                                Отметить посещаемость
                            </Link>
                        </div>
                    ) : (
                        <div>
                            {/* Статистика посещаемости */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="attendance-stat-card">
                                    <div className="attendance-stat-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    </div>
                                    <div className="attendance-stat-label">Всего студентов</div>
                                    <div className="attendance-stat-value">{attendance.total_students}</div>
                                </div>

                                <div className="attendance-stat-card">
                                    <div className="attendance-stat-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 11 12 14 22 4"></polyline>
                                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                        </svg>
                                    </div>
                                    <div className="attendance-stat-label">Присутствуют</div>
                                    <div className="attendance-stat-value">{attendance.attended_students}</div>
                                </div>

                                <div className="attendance-stat-card">
                                    <div className="attendance-stat-icon">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="15" y1="9" x2="9" y2="15"></line>
                                            <line x1="9" y1="9" x2="15" y2="15"></line>
                                        </svg>
                                    </div>
                                    <div className="attendance-stat-label">Отсутствуют</div>
                                    <div className="attendance-stat-value">{attendance.total_students - attendance.attended_students}</div>
                                </div>
                            </div>

                            <div className="attendance-rate-container mb-6">
                                <div className="flex justify-between mb-2">
                                    <span className="font-medium">Уровень посещаемости</span>
                                    <span className="font-semibold" style={{ color: getAttendanceStatusColor(attendance.attendance_rate) }}>
                                        {attendance.attendance_rate.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="attendance-progress-bar">
                                    <div
                                        className="attendance-progress-fill"
                                        style={{
                                            width: `${attendance.attendance_rate}%`,
                                            backgroundColor: getAttendanceStatusColor(attendance.attendance_rate)
                                        }}
                                    ></div>
                                </div>
                            </div>

                            {/* Список посещаемости студентов */}
                            {attendance.students && attendance.students.length > 0 && (
                                <div>
                                    <h4 className="text-lg font-semibold mb-3">Посещаемость студентов</h4>
                                    <div className="overflow-hidden rounded-lg border border-border-color">
                                        <table className="min-w-full divide-y divide-border-color">
                                            <thead className="bg-bg-dark-tertiary">
                                            <tr>
                                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-secondary uppercase tracking-wider">
                                                    Студент
                                                </th>
                                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-secondary uppercase tracking-wider">
                                                    Статус
                                                </th>
                                            </tr>
                                            </thead>
                                            <tbody className="bg-bg-card divide-y divide-border-color">
                                            {attendance.students.map(student => (
                                                <tr key={student.id} className="hover:bg-bg-dark-tertiary transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-lighter text-primary flex items-center justify-center font-medium">
                                                                {student.fio.charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium">{student.fio}</div>
                                                                <Link
                                                                    to={`/students/${student.id}`}
                                                                    className="text-xs text-primary hover:underline"
                                                                >
                                                                    Просмотреть профиль
                                                                </Link>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                                        {student.attended ? (
                                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-success-lighter text-success">
                                                                    Присутствует
                                                                </span>
                                                        ) : (
                                                            <span className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-danger-lighter text-danger">
                                                                    Отсутствует
                                                                </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </RequireSubscription>
            </div>

            {/* Модальное окно подтверждения удаления */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-bg-dark-secondary p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Подтвердите удаление</h3>
                        <p className="mb-6">Вы уверены, что хотите удалить это занятие? Это действие нельзя отменить.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn btn-secondary"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleDelete}
                                className="btn btn-danger"
                            >
                                Удалить занятие
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                .lesson-header {
                    margin-bottom: 1.5rem;
                }
                
                .lesson-type-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    border-radius: 2rem;
                    font-weight: 500;
                    color: white;
                }
                
                .lesson-details-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 0;
                    border-top: 1px solid var(--border-color);
                }
                
                .lesson-detail-item {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1.25rem;
                    border-right: 1px solid var(--border-color);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .detail-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                    color: var(--text-tertiary);
                }
                
                .detail-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }
                
                .detail-value {
                    font-weight: 500;
                }
                
                .badge-premium {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    padding: 0.375rem 0.75rem;
                    border-radius: 2rem;
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .attendance-empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 3rem 1.5rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-lg);
                }
                
                .attendance-empty-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 64px;
                    height: 64px;
                    background-color: var(--bg-dark-secondary);
                    border-radius: 50%;
                    margin-bottom: 1rem;
                    color: var(--text-tertiary);
                }
                
                .attendance-stat-card {
                    display: flex;
                    flex-direction: column;
                    padding: 1.25rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-lg);
                }
                
                .attendance-stat-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-md);
                    margin-bottom: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .attendance-stat-label {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                    margin-bottom: 0.25rem;
                }
                
                .attendance-stat-value {
                    font-size: 1.5rem;
                    font-weight: 600;
                }
                
                .attendance-rate-container {
                    padding: 1.25rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-lg);
                }
                
                .attendance-progress-bar {
                    height: 8px;
                    background-color: var(--bg-dark-secondary);
                    border-radius: 4px;
                    overflow: hidden;
                }
                
                .attendance-progress-fill {
                    height: 100%;
                    border-radius: 4px;
                    transition: width 0.3s ease;
                }
                
                @media (max-width: 640px) {
                    .lesson-details-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .lesson-detail-item {
                        border-right: none;
                    }
                }
            `}</style>
        </div>
    );
}

// Вспомогательные функции для визуальных элементов типа занятия
function getLessonTypeColor(type) {
    switch (type) {
        case 'Лекция':
            return 'var(--primary)';
        case 'Практика':
            return 'var(--success)';
        case 'Лабораторная работа':
            return 'var(--warning)';
        default:
            return 'var(--primary)';
    }
}

function getLessonTypeIcon(type) {
    switch (type) {
        case 'Лекция':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
            );
        case 'Практика':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 11 12 14 22 4"></polyline>
                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                </svg>
            );
        case 'Лабораторная работа':
            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 2v7.31"></path>
                    <path d="M14 9.3V1.99"></path>
                    <path d="M8.5 2h7"></path>
                    <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                </svg>
            );
        default:
            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>
            );
    }
}

export default LessonDetail;