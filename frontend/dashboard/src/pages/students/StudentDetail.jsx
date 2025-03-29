import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentService, attendanceService, labService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function StudentDetail() {
    const { id } = useParams();
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const [attendanceSummary, setAttendanceSummary] = useState(null);
    const [labSummary, setLabSummary] = useState(null);
    const [loadingAttendance, setLoadingAttendance] = useState(false);
    const [loadingLabs, setLoadingLabs] = useState(false);
    const [attendanceError, setAttendanceError] = useState(null);
    const [labError, setLabError] = useState(null);
    const [activeTab, setActiveTab] = useState('attendance');

    // Загрузка данных о студенте
    const { data: studentData, isLoading: studentLoading, error: studentError } = useQuery({
        queryKey: ['student', id],
        queryFn: () => studentService.getStudent(id)
    });

    const student = studentData?.data?.data;

    // Загрузка данных о посещаемости для этого студента, когда данные о студенте загружены
    useEffect(() => {
        if (!student || isFree) return;

        const fetchAttendanceData = async () => {
            setLoadingAttendance(true);
            setAttendanceError(null);

            try {
                // Получаем занятия для группы студента
                const lessonsResponse = await lessonService.getLessons({ group: student.group_name });
                const lessons = lessonsResponse.data.data || [];

                // Инициализируем счетчики
                let totalLessons = 0;
                let attendedLessons = 0;
                const recentAttendance = [];

                // Для каждого занятия проверяем, присутствовал ли студент
                for (const lesson of lessons) {
                    try {
                        const attendanceResponse = await attendanceService.getLessonAttendance(lesson.id);
                        const attendance = attendanceResponse.data.data;

                        if (attendance && attendance.students) {
                            totalLessons++;

                            // Находим этого студента в записях о посещаемости
                            const studentAttendance = attendance.students.find(s => s.id === parseInt(id));
                            if (studentAttendance) {
                                if (studentAttendance.attended) {
                                    attendedLessons++;
                                }

                                // Добавляем в последние посещения (ограничено до 5)
                                if (recentAttendance.length < 5) {
                                    recentAttendance.push({
                                        id: lesson.id,
                                        date: lesson.date,
                                        subject: lesson.subject,
                                        topic: lesson.topic,
                                        status: studentAttendance.attended ? 'present' : 'absent'
                                    });
                                }
                            }
                        }
                    } catch (err) {
                        // Пропускаем ошибку для отдельного занятия
                    }
                }

                // Вычисляем уровень посещаемости
                const attendanceRate = totalLessons > 0 ? (attendedLessons / totalLessons) * 100 : 0;

                // Устанавливаем сводку посещаемости
                setAttendanceSummary({
                    total_lessons: totalLessons,
                    lessons_attended: attendedLessons,
                    attendance_rate: attendanceRate,
                    lessons: recentAttendance.sort((a, b) => new Date(b.date) - new Date(a.date))
                });
            } catch (error) {
                setAttendanceError('Не удалось загрузить данные о посещаемости');
            } finally {
                setLoadingAttendance(false);
            }
        };

        fetchAttendanceData();
    }, [student, id, isFree]);

    // Загрузка оценок за лабораторные для этого студента, когда данные о студенте загружены
    useEffect(() => {
        if (!student || isFree) return;

        const fetchLabData = async () => {
            setLoadingLabs(true);
            setLabError(null);

            try {
                // Получаем все предметы с лабораторными и группы
                const labsResponse = await labService.getLabs();
                const subjects = labsResponse.data.data || [];

                const studentGrades = [];
                let totalLabs = 0;
                let completedLabs = 0;
                let gradeSum = 0;

                // Для каждого предмета, который имеет группу этого студента
                for (const subject of subjects) {
                    const groupWithStudent = subject.groups.find(g => g.name === student.group_name);

                    if (groupWithStudent) {
                        try {
                            // Получаем детальные оценки за лабораторные для этого предмета и группы
                            const gradesResponse = await labService.getLabGrades(subject.subject, student.group_name);
                            const gradesData = gradesResponse.data.data;

                            // Находим оценки этого студента
                            const studentData = gradesData.students.find(s => s.student_id === parseInt(id));

                            if (studentData) {
                                // Считаем статистику
                                const numLabs = studentData.grades.length;
                                totalLabs += numLabs;

                                // Считаем ненулевые оценки как выполненные лабораторные
                                const completed = studentData.grades.filter(g => g > 0).length;
                                completedLabs += completed;

                                // Суммируем оценки для вычисления среднего
                                const sum = studentData.grades.reduce((acc, grade) => acc + grade, 0);
                                gradeSum += sum;

                                // Добавляем данные о предмете в коллекцию
                                studentGrades.push({
                                    subject: subject.subject,
                                    grades: studentData.grades,
                                    average: studentData.average || 0,
                                    completed: completed,
                                    total: numLabs
                                });
                            }
                        } catch (err) {
                            // Пропускаем ошибку для отдельного предмета
                        }
                    }
                }

                // Вычисляем общее среднее
                const overallAverage = completedLabs > 0 ? gradeSum / completedLabs : 0;

                // Устанавливаем сводку по лабораторным
                setLabSummary({
                    subjects: studentGrades,
                    total_labs: totalLabs,
                    completed_labs: completedLabs,
                    completion_rate: totalLabs > 0 ? (completedLabs / totalLabs) * 100 : 0,
                    overall_average: overallAverage
                });
            } catch (error) {
                setLabError('Не удалось загрузить данные по лабораторным');
            } finally {
                setLoadingLabs(false);
            }
        };

        fetchLabData();
    }, [student, id, isFree]);

    const handleDelete = async () => {
        if (window.confirm(`Вы уверены, что хотите удалить студента "${student.fio}"?`)) {
            try {
                await studentService.deleteStudent(id);
                navigate('/students');
            } catch (error) {
                alert('Не удалось удалить студента');
            }
        }
    };

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
                    <h1 className="page-title">{student.fio}</h1>
                    <p className="text-secondary">Профиль и прогресс студента</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/students" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Назад</span>
                    </Link>
                    <RequireSubscription>
                        <Link to={`/students/${id}/edit`} className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            <span className="hidden sm:inline">Редактировать</span>
                        </Link>
                        <button
                            onClick={handleDelete}
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

            {/* Карточка профиля студента */}
            <div className="card p-6 mb-6">
                <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
                    <div className="w-24 h-24 bg-primary-lighter text-primary rounded-full flex items-center justify-center text-4xl font-bold">
                        {student.fio.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-2xl font-semibold mb-2">{student.fio}</h2>
                        <div className="flex flex-col sm:flex-row gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span>Группа: </span>
                                <Link to={`/groups/${encodeURIComponent(student.group_name)}`} className="text-primary hover:text-primary-light hover:underline">
                                    {student.group_name}
                                </Link>
                            </div>

                            {(!isFree && attendanceSummary) && (
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                    <span>Посещаемость: </span>
                                    <span className={`font-medium ${attendanceSummary.attendance_rate >= 85 ? 'text-success' : attendanceSummary.attendance_rate >= 70 ? 'text-warning' : 'text-danger'}`}>
                                        {attendanceSummary.attendance_rate.toFixed(1)}%
                                    </span>
                                </div>
                            )}

                            {(!isFree && labSummary) && (
                                <div className="flex items-center gap-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                        <path d="M10 2v7.31"></path>
                                        <path d="M14 9.3V1.99"></path>
                                        <path d="M8.5 2h7"></path>
                                        <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                    </svg>
                                    <span>Средняя оценка: </span>
                                    <span className={`font-medium ${labSummary.overall_average >= 4 ? 'text-success' : labSummary.overall_average >= 3 ? 'text-warning' : 'text-danger'}`}>
                                        {labSummary.overall_average.toFixed(1)}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="mt-4">
                            <Link to={`/groups/${encodeURIComponent(student.group_name)}`} className="btn btn-secondary btn-sm">
                                Просмотр группы
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Навигация по вкладкам */}
            <div className="mb-6 border-b border-border-color">
                <div className="flex gap-4">
                    <button
                        className={`py-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent hover:border-border-color-light'}`}
                        onClick={() => setActiveTab('attendance')}
                    >
                        Посещаемость
                    </button>
                    <button
                        className={`py-3 px-4 font-medium border-b-2 transition-colors ${activeTab === 'labs' ? 'border-primary text-primary' : 'border-transparent hover:border-border-color-light'}`}
                        onClick={() => setActiveTab('labs')}
                    >
                        Лабораторные работы
                    </button>
                </div>
            </div>

            {/* Содержимое вкладок */}
            {activeTab === 'attendance' && (
                <div>
                    <RequireSubscription
                        fallback={
                            <div className="card premium-feature-card p-8">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary-lighter text-primary flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Премиум-функция</h3>
                                    <p className="text-secondary mb-6">Отслеживание посещаемости требует оплаченной подписки</p>
                                    <button className="btn btn-primary">Обновить сейчас</button>
                                </div>
                            </div>
                        }
                    >
                        {loadingAttendance ? (
                            <div className="card p-8 flex justify-center">
                                <div className="spinner"></div>
                            </div>
                        ) : attendanceError ? (
                            <div className="alert alert-danger">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    <p>{attendanceError}</p>
                                </div>
                            </div>
                        ) : attendanceSummary ? (
                            <div>
                                {/* Статистика посещаемости */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                    <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                                        <div className="stats-card-title">Всего занятий</div>
                                        <div className="stats-card-value">{attendanceSummary.total_lessons}</div>
                                    </div>
                                    <div className="stats-card" style={{ borderLeftColor: 'var(--success)' }}>
                                        <div className="stats-card-title">Посещено занятий</div>
                                        <div className="stats-card-value">{attendanceSummary.lessons_attended}</div>
                                    </div>
                                    <div className="stats-card" style={{ borderLeftColor: `${attendanceSummary.attendance_rate >= 85 ? 'var(--success)' : attendanceSummary.attendance_rate >= 70 ? 'var(--warning)' : 'var(--danger)'}` }}>
                                        <div className="stats-card-title">Уровень посещаемости</div>
                                        <div className="stats-card-value">{attendanceSummary.attendance_rate.toFixed(1)}%</div>
                                        <div className="stats-card-description">
                                            <div className="w-full h-2 bg-bg-dark-tertiary rounded-full mt-2">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${attendanceSummary.attendance_rate}%`,
                                                        backgroundColor: `${attendanceSummary.attendance_rate >= 85 ? 'var(--success)' : attendanceSummary.attendance_rate >= 70 ? 'var(--warning)' : 'var(--danger)'}`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Недавняя посещаемость */}
                                <div className="card">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xl font-semibold">Недавняя посещаемость</h3>
                                        <Link to={`/attendance`} className="btn btn-sm btn-outline flex items-center gap-2">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                            Смотреть все
                                        </Link>
                                    </div>

                                    {attendanceSummary.lessons && attendanceSummary.lessons.length > 0 ? (
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
                                                {attendanceSummary.lessons.map(lesson => (
                                                    <tr key={lesson.id}>
                                                        <td>{new Date(lesson.date).toLocaleDateString()}</td>
                                                        <td>{lesson.subject}</td>
                                                        <td>{lesson.topic}</td>
                                                        <td>
                                                            {lesson.status === 'present' ? (
                                                                <span className="badge bg-success-lighter text-success">Присутствует</span>
                                                            ) : (
                                                                <span className="badge bg-danger-lighter text-danger">Отсутствует</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <div className="flex justify-end">
                                                                <Link to={`/attendance/${lesson.id}`} className="btn btn-sm btn-secondary flex items-center gap-1">
                                                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                                        <circle cx="12" cy="12" r="3"></circle>
                                                                    </svg>
                                                                    Просмотр
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="alert alert-info">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                            </svg>
                                            Записи о посещаемости для этого студента не найдены.
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="alert alert-info">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                Записи о посещаемости для этого студента не найдены.
                            </div>
                        )}
                    </RequireSubscription>
                </div>
            )}

            {activeTab === 'labs' && (
                <div>
                    <RequireSubscription
                        fallback={
                            <div className="card premium-feature-card p-8">
                                <div className="flex flex-col items-center text-center">
                                    <div className="w-16 h-16 rounded-full bg-primary-lighter text-primary flex items-center justify-center mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                                        </svg>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2">Премиум-функция</h3>
                                    <p className="text-secondary mb-6">Отслеживание лабораторных работ требует оплаченной подписки</p>
                                    <button className="btn btn-primary">Обновить сейчас</button>
                                </div>
                            </div>
                        }
                    >
                        {loadingLabs ? (
                            <div className="card p-8 flex justify-center">
                                <div className="spinner"></div>
                            </div>
                        ) : labError ? (
                            <div className="alert alert-danger">
                                <div className="flex items-center gap-3">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                        <line x1="12" y1="9" x2="12" y2="13"></line>
                                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                                    </svg>
                                    <p>{labError}</p>
                                </div>
                            </div>
                        ) : labSummary ? (
                            <div>
                                {/* Статистика лабораторных */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                    <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                                        <div className="stats-card-title">Всего лабораторных</div>
                                        <div className="stats-card-value">{labSummary.total_labs}</div>
                                    </div>
                                    <div className="stats-card" style={{ borderLeftColor: 'var(--success)' }}>
                                        <div className="stats-card-title">Выполнено лабораторных</div>
                                        <div className="stats-card-value">{labSummary.completed_labs}</div>
                                    </div>
                                    <div className="stats-card" style={{ borderLeftColor: `${labSummary.completion_rate >= 80 ? 'var(--success)' : labSummary.completion_rate >= 50 ? 'var(--warning)' : 'var(--danger)'}` }}>
                                        <div className="stats-card-title">Уровень выполнения</div>
                                        <div className="stats-card-value">{labSummary.completion_rate.toFixed(1)}%</div>
                                        <div className="stats-card-description">
                                            <div className="w-full h-2 bg-bg-dark-tertiary rounded-full mt-2">
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${labSummary.completion_rate}%`,
                                                        backgroundColor: `${labSummary.completion_rate >= 80 ? 'var(--success)' : labSummary.completion_rate >= 50 ? 'var(--warning)' : 'var(--danger)'}`
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="stats-card" style={{ borderLeftColor: `${labSummary.overall_average >= 4 ? 'var(--success)' : labSummary.overall_average >= 3 ? 'var(--warning)' : 'var(--danger)'}` }}>
                                        <div className="stats-card-title">Общая средняя оценка</div>
                                        <div className="stats-card-value">{labSummary.overall_average.toFixed(1)}</div>
                                    </div>
                                </div>

                                {/* Лабораторные по предметам */}
                                {labSummary.subjects && labSummary.subjects.length > 0 ? (
                                    <div>
                                        {labSummary.subjects.map((subject, index) => (
                                            <div key={index} className="card mb-6">
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
                                                    <div>
                                                        <h3 className="text-xl font-semibold flex items-center gap-2">
                                                            <span className="w-3 h-3 rounded-full" style={{backgroundColor: getSubjectColor(index)}}></span>
                                                            {subject.subject}
                                                        </h3>
                                                        <p className="text-secondary">
                                                            Выполнено: {subject.completed} из {subject.total} |
                                                            Средний балл: <span className={`font-medium ${subject.average >= 4 ? 'text-success' : subject.average >= 3 ? 'text-warning' : 'text-danger'}`}>
                                                                {subject.average.toFixed(1)}
                                                            </span>
                                                        </p>
                                                    </div>
                                                    <Link to={`/labs/${encodeURIComponent(subject.subject)}/${encodeURIComponent(student.group_name)}`} className="btn btn-sm btn-secondary flex items-center gap-1 mt-2 md:mt-0">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M10 2v7.31"></path>
                                                            <path d="M14 9.3V1.99"></path>
                                                            <path d="M8.5 2h7"></path>
                                                            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                                        </svg>
                                                        Подробности лабораторных
                                                    </Link>
                                                </div>
                                                <div className="overflow-x-auto">
                                                    <table className="table-sm w-full">
                                                        <thead>
                                                        <tr>
                                                            {subject.grades.map((_, i) => (
                                                                <th key={i} className="text-center px-2 py-2 text-sm">Лаб. {i+1}</th>
                                                            ))}
                                                        </tr>
                                                        </thead>
                                                        <tbody>
                                                        <tr>
                                                            {subject.grades.map((grade, i) => (
                                                                <td key={i} className="text-center">
                                                                    <div className={`lab-grade ${grade > 0 ? getGradeClass(grade) : 'grade-0'}`}>
                                                                        {grade || '–'}
                                                                    </div>
                                                                </td>
                                                            ))}
                                                        </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="alert alert-info">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <line x1="12" y1="16" x2="12" y2="12"></line>
                                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                        </svg>
                                        Результаты лабораторных для этого студента не найдены.
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="alert alert-info">
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="16" x2="12" y2="12"></line>
                                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                                </svg>
                                Результаты лабораторных для этого студента не найдены.
                            </div>
                        )}
                    </RequireSubscription>
                </div>
            )}

            {/* Пользовательские стили */}
            <style jsx="true">{`
                .lab-grade {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-full);
                    font-weight: 600;
                }

                .grade-0 {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-tertiary);
                }

                .grade-1, .grade-2 {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }

                .grade-3 {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }

                .grade-4, .grade-5 {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .premium-feature-card {
                    background: linear-gradient(to bottom right, var(--bg-dark-secondary), var(--bg-dark-tertiary));
                    border-left: 4px solid var(--primary);
                }
            `}</style>
        </div>
    );
}

// Вспомогательная функция для получения последовательного цвета для предмета
function getSubjectColor(index) {
    const colors = [
        'var(--primary)',
        'var(--accent)',
        'var(--success)',
        'var(--warning)',
        '#9333ea', // фиолетовый
        '#ec4899', // розовый
        '#14b8a6', // бирюзовый
    ];

    return colors[index % colors.length];
}

// Вспомогательная функция для получения класса оценки
function getGradeClass(grade) {
    if (grade <= 2) return 'grade-1';
    if (grade === 3) return 'grade-3';
    return 'grade-4';
}

export default StudentDetail;