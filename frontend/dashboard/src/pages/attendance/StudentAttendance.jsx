import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { attendanceService, studentService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function StudentAttendance() {
    const { id } = useParams();
    const { isFree } = useAuth();
    const navigate = useNavigate();

    // Переменные состояния
    const [filters, setFilters] = useState({
        date_from: '',
        date_to: ''
    });
    const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
    const [attendanceData, setAttendanceData] = useState([]);
    const [weeklyAttendance, setWeeklyAttendance] = useState([]);

    // Установка начальных фильтров даты на текущий семестр (примерно 4 месяца)
    useEffect(() => {
        const today = new Date();
        const fourMonthsAgo = new Date();
        fourMonthsAgo.setMonth(today.getMonth() - 4);

        setFilters({
            date_from: fourMonthsAgo.toISOString().split('T')[0],
            date_to: today.toISOString().split('T')[0]
        });
    }, []);

    // Загрузка деталей студента
    const { data: studentData, isLoading: studentLoading, error: studentError } = useQuery({
        queryKey: ['student', id],
        queryFn: () => studentService.getStudent(id)
    });

    // Генерация примера данных о посещаемости для визуализации
    useEffect(() => {
        if (studentData?.data?.data) {
            generateDummyAttendanceData();
            generateWeeklyAttendance();
        }
    }, [studentData, selectedMonth]);

    // Функция для генерации примера данных о посещаемости
    const generateDummyAttendanceData = () => {
        const daysInMonth = new Date(2023, selectedMonth + 1, 0).getDate();
        const data = [];

        // Создаем примеры записей о посещаемости для выбранного месяца
        for (let day = 1; day <= daysInMonth; day++) {
            // Генерируем записи только для рабочих дней (понедельник-пятница)
            const date = new Date(2023, selectedMonth, day);
            const dayOfWeek = date.getDay(); // 0 - воскресенье, 6 - суббота

            if (dayOfWeek > 0 && dayOfWeek < 6) {
                // Случайным образом определяем статус посещаемости (80% присутствия, 20% отсутствия)
                const status = Math.random() < 0.8 ? 'present' : 'absent';

                data.push({
                    id: day,
                    date: date,
                    subject: getRandomSubject(),
                    topic: `Тема на ${date.toLocaleDateString()}`,
                    status: status
                });
            }
        }

        setAttendanceData(data);
    };

    // Функция для генерации еженедельной визуализации посещаемости
    const generateWeeklyAttendance = () => {
        const weeksData = [];

        // Генерируем данные о посещаемости для 4 недель
        for (let week = 0; week < 4; week++) {
            const weekData = {
                weekNumber: week + 1,
                days: []
            };

            // Генерируем посещаемость для каждого дня недели
            for (let day = 0; day < 7; day++) {
                // Воскресенье и суббота обычно не учебные дни, поэтому отмечаем их как пустые
                if (day === 0 || day === 6) {
                    weekData.days.push({ status: 'no-class' });
                } else {
                    // Для будних дней случайным образом определяем посещаемость
                    const status = Math.random() < 0.85 ? 'present' : 'absent';
                    weekData.days.push({ status });
                }
            }

            weeksData.push(weekData);
        }

        setWeeklyAttendance(weeksData);
    };

    // Вспомогательная функция для получения случайного предмета
    const getRandomSubject = () => {
        const subjects = ['Математика', 'Физика', 'Химия', 'Биология', 'Литература', 'История'];
        return subjects[Math.floor(Math.random() * subjects.length)];
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleMonthChange = (month) => {
        setSelectedMonth(month);
    };

    // Это заглушка для данных о посещаемости студента
    // В реальной реализации вы бы загружали это из API
    const attendanceSummary = {
        total_lessons: 20,
        lessons_attended: 17,
        attendance_rate: 85,
        subjects_attendance: [
            { subject: 'Математика', rate: 90 },
            { subject: 'Физика', rate: 85 },
            { subject: 'Химия', rate: 80 },
            { subject: 'Биология', rate: 75 }
        ]
    };

    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Посещаемость студента</h1>
                        <p className="text-secondary">Отслеживание записей о посещаемости для этого студента</p>
                    </div>
                    <Link to="/students" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Назад</span>
                    </Link>
                </div>
                <RequireSubscription />
            </div>
        );
    }

    if (studentLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    if (studentError) {
        return (
            <div className="alert alert-danger mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p>Ошибка загрузки студента: {studentError.message}</p>
                </div>
            </div>
        );
    }

    const student = studentData?.data?.data;

    if (!student) {
        return (
            <div className="alert alert-warning mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>Студент не найден</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Посещаемость студента: {student.fio}</h1>
                    <p className="text-secondary">Группа: {student.group_name}</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/attendance" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Назад</span>
                    </Link>
                    <Link to={`/students/${id}`} className="btn btn-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span className="hidden sm:inline">Просмотр профиля</span>
                    </Link>
                </div>
            </div>

            {/* Карточка информации о студенте */}
            <div className="card p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-primary-lighter text-primary rounded-full flex items-center justify-center text-2xl font-bold">
                        {student.fio.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-semibold mb-1">{student.fio}</h2>
                        <p className="text-secondary">Группа: {student.group_name}</p>
                    </div>
                    <div className="attendance-rate-indicator">
                        <div className="attendance-rate-circle" style={{
                            background: `conic-gradient(var(--success) ${attendanceSummary.attendance_rate}%, transparent 0)`
                        }}>
                            <div className="attendance-rate-inner">
                                <span className="attendance-rate-percentage">{attendanceSummary.attendance_rate}%</span>
                                <span className="attendance-rate-label">Посещаемость</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Фильтры посещаемости */}
            <div className="card mb-6">
                <h3 className="text-lg font-semibold mb-4">Фильтровать по диапазону дат</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="form-group">
                        <label htmlFor="date_from" className="form-label">Дата начала</label>
                        <input
                            type="date"
                            id="date_from"
                            name="date_from"
                            value={filters.date_from}
                            onChange={handleFilterChange}
                            className="form-control"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="date_to" className="form-label">Дата окончания</label>
                        <input
                            type="date"
                            id="date_to"
                            name="date_to"
                            value={filters.date_to}
                            onChange={handleFilterChange}
                            className="form-control"
                        />
                    </div>
                    <div className="flex items-end">
                        <button className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            Применить фильтры
                        </button>
                    </div>
                </div>
            </div>

            {/* Сводка посещаемости */}
            <div className="card mb-6">
                <h3 className="text-lg font-semibold mb-4">Сводка посещаемости</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                    <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                        <div className="stats-card-title">Всего занятий</div>
                        <div className="stats-card-value">{attendanceSummary.total_lessons}</div>
                    </div>
                    <div className="stats-card" style={{ borderLeftColor: 'var(--success)' }}>
                        <div className="stats-card-title">Посещено занятий</div>
                        <div className="stats-card-value">{attendanceSummary.lessons_attended}</div>
                    </div>
                    <div className="stats-card" style={{ borderLeftColor: getAttendanceColor(attendanceSummary.attendance_rate) }}>
                        <div className="stats-card-title">Уровень посещаемости</div>
                        <div className="stats-card-value">{attendanceSummary.attendance_rate}%</div>
                        <div className="stats-card-description">
                            <div className="w-full h-2 bg-bg-dark-tertiary rounded-full mt-2">
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${attendanceSummary.attendance_rate}%`,
                                        backgroundColor: getAttendanceColor(attendanceSummary.attendance_rate)
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Посещаемость по предметам */}
                <div className="mb-6">
                    <h4 className="text-base font-semibold mb-3">Посещаемость по предметам</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {attendanceSummary.subjects_attendance.map((subject, index) => (
                            <div key={index} className="subject-attendance-card">
                                <div className="subject-name">{subject.subject}</div>
                                <div className="subject-rate">{subject.rate}%</div>
                                <div className="w-full h-2 bg-bg-dark-tertiary rounded-full mt-2">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${subject.rate}%`,
                                            backgroundColor: getAttendanceColor(subject.rate)
                                        }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Визуализация еженедельной посещаемости */}
            <div className="card mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                    <h3 className="text-lg font-semibold mb-2 sm:mb-0">Визуализация посещаемости</h3>
                    <div className="flex gap-2">
                        {['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'].map((month, index) => (
                            <button
                                key={index}
                                onClick={() => handleMonthChange(index)}
                                className={`month-button ${selectedMonth === index ? 'active' : ''}`}
                            >
                                {month}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Визуализация сетки посещаемости, похожая на скриншот */}
                <div className="attendance-visualization">
                    <div className="attendance-week-grid">
                        {/* Метки дней недели */}
                        {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day, index) => (
                            <div key={index} className="day-label text-secondary">{day}</div>
                        ))}

                        {/* Генерация ячеек посещаемости для каждой недели */}
                        {weeklyAttendance.map((week) =>
                            week.days.map((day, dayIndex) => (
                                <div
                                    key={`${week.weekNumber}-${dayIndex}`}
                                    className={`attendance-day-cell ${day.status}`}
                                >
                                    {day.status === 'present' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="9 11 12 14 22 4"></polyline>
                                            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                        </svg>
                                    )}
                                    {day.status === 'absent' && (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                        </svg>
                                    )}
                                </div>
                            ))
                        )}
                    </div>

                    {/* Визуализация гистограммы посещаемости */}
                    <div className="attendance-barchart mt-8">
                        <h4 className="text-base font-semibold mb-3">Ежемесячные тенденции посещаемости</h4>
                        <div className="w-full h-40 bg-bg-dark-tertiary rounded-md p-4 flex items-end gap-2">
                            {[...Array(8)].map((_, index) => {
                                // Генерация случайных высот
                                const height = Math.floor(Math.random() * 100) + 20;
                                const color = index % 2 === 0 ? 'var(--success)' : 'var(--primary)';
                                return (
                                    <div key={index} className="flex-1 flex flex-col items-center">
                                        <div className="rounded-t w-full" style={{ height: `${height}px`, backgroundColor: color }}></div>
                                        <div className="text-xs text-tertiary mt-2">Неделя {index + 1}</div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Детали посещаемости */}
            <div className="card">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold">Записи о посещаемости</h3>
                    <div className="alert alert-info px-3 py-2 text-sm inline-flex items-center gap-2 m-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>Это примерные данные для демонстрации</span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="table">
                        <thead>
                        <tr>
                            <th>Дата</th>
                            <th>Предмет</th>
                            <th>Тема</th>
                            <th>Статус</th>
                            <th className="text-right">Действия</th>
                        </tr>
                        </thead>
                        <tbody>
                        {attendanceData.map(record => (
                            <tr key={record.id}>
                                <td>{record.date.toLocaleDateString()}</td>
                                <td>{record.subject}</td>
                                <td>{record.topic}</td>
                                <td>
                                    {record.status === 'present' ? (
                                        <span className="badge bg-success-lighter text-success px-3 py-1 inline-flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                                Присутствует
                                            </span>
                                    ) : (
                                        <span className="badge bg-danger-lighter text-danger px-3 py-1 inline-flex items-center gap-1">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                                Отсутствует
                                            </span>
                                    )}
                                </td>
                                <td className="text-right">
                                    <button className="btn btn-sm btn-secondary">
                                        Просмотр занятия
                                    </button>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <style jsx="true">{`
                .attendance-rate-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .attendance-rate-circle {
                    width: 90px;
                    height: 90px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                }
                
                .attendance-rate-circle::before {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 50%;
                    background-color: var(--bg-dark-tertiary);
                    margin: 4px;
                }
                
                .attendance-rate-inner {
                    position: relative;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    z-index: 2;
                }
                
                .attendance-rate-percentage {
                    font-size: 1.25rem;
                    font-weight: 700;
                    color: var(--success);
                }
                
                .attendance-rate-label {
                    font-size: 0.7rem;
                    color: var(--text-secondary);
                }
                
                .subject-attendance-card {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    padding: 1rem;
                }
                
                .subject-name {
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                    margin-bottom: 0.5rem;
                }
                
                .subject-rate {
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .month-button {
                    padding: 0.25rem 0.5rem;
                    font-size: 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all var(--transition-fast) ease;
                }
                
                .month-button.active {
                    background-color: var(--primary);
                    color: white;
                }
                
                .month-button:hover:not(.active) {
                    background-color: var(--bg-dark-secondary);
                }
                
                /* Стили визуализации посещаемости */
                .attendance-week-grid {
                    display: grid;
                    grid-template-columns: repeat(7, 1fr);
                    gap: 4px;
                }
                
                .day-label {
                    text-align: center;
                    padding: 6px 0;
                    font-size: 0.8rem;
                }
                
                .attendance-day-cell {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 36px;
                    border-radius: 4px;
                    transition: all 0.2s ease;
                }
                
                .attendance-day-cell.present {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .attendance-day-cell.absent {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .attendance-day-cell.no-class {
                    background-color: var(--bg-dark-tertiary);
                }
                
                @media (max-width: 768px) {
                    .attendance-week-grid {
                        grid-template-columns: repeat(7, 1fr);
                        gap: 2px;
                    }
                    
                    .attendance-day-cell {
                        height: 30px;
                    }
                    
                    .month-button {
                        padding: 0.2rem 0.4rem;
                        font-size: 0.7rem;
                    }
                }
            `}</style>
        </div>
    );
}

// Вспомогательная функция для получения цвета на основе уровня посещаемости
function getAttendanceColor(rate) {
    if (rate >= 85) return 'var(--success)';
    if (rate >= 70) return 'var(--warning)';
    return 'var(--danger)';
}

export default StudentAttendance;