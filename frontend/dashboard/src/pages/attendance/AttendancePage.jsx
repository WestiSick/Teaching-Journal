import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { attendanceService, lessonService, groupService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function AttendancePage() {
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        group: '',
        subject: '',
        date_from: '',
        date_to: ''
    });

    // Получение данных посещаемости с фильтрами
    const { data, isLoading, error } = useQuery({
        queryKey: ['attendance', filters],
        queryFn: () => attendanceService.getAttendance(filters),
        enabled: !isFree // Загружать только если пользователь имеет подписку
    });

    // Загрузка групп для выпадающего списка фильтров
    const { data: groupsData } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    // Загрузка предметов для выпадающего списка фильтров
    const { data: subjectsData } = useQuery({
        queryKey: ['subjects'],
        queryFn: lessonService.getSubjects
    });

    const attendanceRecords = data?.data?.data || [];
    const groups = groupsData?.data?.data || [];
    const subjects = subjectsData?.data?.data || [];

    // Установка начальных фильтров даты на текущий месяц
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters(prev => ({
            ...prev,
            date_from: firstDay.toISOString().split('T')[0],
            date_to: lastDay.toISOString().split('T')[0]
        }));
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters({
            group: '',
            subject: '',
            date_from: firstDay.toISOString().split('T')[0],
            date_to: lastDay.toISOString().split('T')[0]
        });
    };

    /**
     * Форматирование строки даты
     * Обрабатывает как формат "ДД.ММ.ГГГГ", так и строки даты в ISO формате
     */
    const formatDate = (dateString) => {
        if (!dateString) return 'Н/Д';

        try {
            // Проверка, если дата в формате ДД.ММ.ГГГГ
            if (dateString.includes('.')) {
                const [day, month, year] = dateString.split('.');
                return new Date(`${year}-${month}-${day}`).toLocaleDateString();
            }

            // Иначе предполагаем, что это ISO или другой формат, который Date может обработать
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            return dateString; // Возвращаем исходную строку, если анализ не удался
        }
    };

    const getAttendanceColor = (rate) => {
        if (rate >= 90) return 'var(--success)';
        if (rate >= 70) return 'var(--warning)';
        return 'var(--danger)';
    }

    const getAttendanceClass = (rate) => {
        if (rate >= 90) return 'high-attendance';
        if (rate >= 70) return 'medium-attendance';
        return 'low-attendance';
    }

    const handleExport = async () => {
        try {
            // Всегда используем режим 'lesson'
            const response = await attendanceService.exportAttendance('lesson');

            // Создаем blob из ответа
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);

            // Создаем временную ссылку и запускаем скачивание
            const a = document.createElement('a');
            a.href = url;
            a.download = `отчет_посещаемости_занятия_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();

            // Очистка
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            alert('Не удалось экспортировать данные о посещаемости');
        }
    };

    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Посещаемость</h1>
                        <p className="text-secondary">Отслеживание посещаемости и активности студентов</p>
                    </div>
                </div>
                <div className="card p-0 overflow-hidden">
                    <div className="premium-feature">
                        <div className="premium-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Премиум-функция</h3>
                        <p className="mb-2">Отслеживание посещаемости доступно с платной подпиской.</p>
                        <p className="mb-6">Отслеживайте посещаемость студентов, создавайте отчеты и получайте аналитику.</p>
                        <button className="btn btn-primary">Обновить сейчас</button>
                    </div>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p>Ошибка загрузки данных о посещаемости: {error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Посещаемость</h1>
                    <p className="text-secondary">Отслеживание и управление посещаемостью студентов</p>
                </div>
                <RequireSubscription>
                    <div className="flex flex-wrap gap-2">
                        <button
                            className="btn btn-outline flex items-center gap-2"
                            onClick={handleExport}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            <span className="hidden sm:inline">Экспорт</span>
                        </button>

                        <Link to="/attendance/reports" className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="20" x2="18" y2="10"></line>
                                <line x1="12" y1="20" x2="12" y2="4"></line>
                                <line x1="6" y1="20" x2="6" y2="14"></line>
                            </svg>
                            <span className="hidden sm:inline">Отчеты</span>
                        </Link>
                    </div>
                </RequireSubscription>
            </div>

            {/* Компактные фильтры */}
            <div className="bg-dark-secondary rounded-lg mb-6 p-3">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[130px]">
                        <label htmlFor="group" className="form-label text-xs mb-1">Группа</label>
                        <select
                            id="group"
                            name="group"
                            value={filters.group}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        >
                            <option value="">Все группы</option>
                            {groups.map(group => (
                                <option key={group.name} value={group.name}>{group.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[130px]">
                        <label htmlFor="subject" className="form-label text-xs mb-1">Предмет</label>
                        <select
                            id="subject"
                            name="subject"
                            value={filters.subject}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        >
                            <option value="">Все предметы</option>
                            {subjects.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[110px]">
                        <label htmlFor="date_from" className="form-label text-xs mb-1">От</label>
                        <input
                            type="date"
                            id="date_from"
                            name="date_from"
                            value={filters.date_from}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        />
                    </div>

                    <div className="flex-1 min-w-[110px]">
                        <label htmlFor="date_to" className="form-label text-xs mb-1">До</label>
                        <input
                            type="date"
                            id="date_to"
                            name="date_to"
                            value={filters.date_to}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        />
                    </div>

                    <button
                        onClick={clearFilters}
                        className="btn btn-outline py-1 px-3 h-[34px] flex items-center gap-1 text-xs"
                        title="Очистить все фильтры"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 0 1-9 9c-2.39 0-4.68-.94-6.4-2.65L3 16"></path>
                            <path d="M3 12a9 9 0 0 1 9-9c2.39 0 4.68.94 6.4 2.65L21 8"></path>
                            <path d="M3 8h6"></path>
                            <path d="M15 16h6"></path>
                        </svg>
                        Очистить
                    </button>
                </div>
            </div>

            {/* Таблица посещаемости */}
            {attendanceRecords.length === 0 ? (
                <div className="card p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full mx-auto flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <h3 className="text-xl mb-2">Записи о посещаемости не найдены</h3>
                        <p className="text-tertiary mb-6">Попробуйте изменить фильтры или отметить посещаемость на занятиях.</p>
                    </div>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                            <tr>
                                <th width="120">Дата</th>
                                <th>Предмет</th>
                                <th>Группа</th>
                                <th>Тема</th>
                                <th>Посещаемость</th>
                                <th width="100" className="text-right">Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {attendanceRecords.map(record => (
                                <tr key={record.lesson_id}>
                                    <td>{formatDate(record.date)}</td>
                                    <td>{record.subject}</td>
                                    <td>
                                        <Link to={`/groups/${record.group_name}`} className="text-primary hover:text-primary-light hover:underline">
                                            {record.group_name}
                                        </Link>
                                    </td>
                                    <td>{record.topic || 'Н/Д'}</td>
                                    <td>
                                        <div className="attendance-indicator">
                                            <div className="attendance-count">
                                                {record.attended_students} / {record.total_students}
                                            </div>
                                            <div className="progress" style={{ flex: 1, maxWidth: '120px' }}>
                                                <div
                                                    className="progress-bar"
                                                    style={{
                                                        width: `${record.attendance_rate}%`,
                                                        backgroundColor: getAttendanceColor(record.attendance_rate)
                                                    }}
                                                ></div>
                                            </div>
                                            <div className={`attendance-percentage ${getAttendanceClass(record.attendance_rate)}`}>
                                                {record.attendance_rate.toFixed(1)}%
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="flex justify-end">
                                            <Link to={`/attendance/${record.lesson_id}`} className="btn btn-sm btn-primary">
                                                Управление
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Пользовательские стили для посещаемости */}
            <style jsx="true">{`
                .attendance-indicator {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .attendance-count, .attendance-percentage {
                    font-size: 0.875rem;
                    white-space: nowrap;
                }
                
                .attendance-percentage {
                    font-weight: 600;
                    min-width: 50px;
                    border-radius: var(--radius-md);
                    padding: 0.125rem 0.375rem;
                    text-align: center;
                }

                .high-attendance {
                    color: var(--success);
                }
                
                .medium-attendance {
                    color: var(--warning);
                }
                
                .low-attendance {
                    color: var(--danger);
                }

                .premium-feature {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 4rem 2rem;
                }

                .premium-icon {
                    color: var(--warning);
                    margin-bottom: 1.5rem;
                }
            `}</style>
        </div>
    );
}

export default AttendancePage;