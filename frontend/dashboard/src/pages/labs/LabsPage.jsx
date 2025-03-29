import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { labService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function LabsPage() {
    const { isFree } = useAuth();
    const navigate = useNavigate();
    // State to store recalculated averages that exclude zeros
    const [recalculatedAverages, setRecalculatedAverages] = useState({});

    // Fetch all labs
    const { data, isLoading, error } = useQuery({
        queryKey: ['labs'],
        queryFn: labService.getLabs,
        enabled: !isFree // Only fetch if user has subscription
    });

    const subjects = data?.data?.data || [];

    // Helper function to calculate average excluding zeros - same as in LabGrades.jsx
    const calculateAverageExcludingZeros = (grades) => {
        if (!grades || !grades.length) return 0;

        // Only include grades > 0 in the calculation
        const validGrades = grades.filter(grade => grade > 0);
        if (validGrades.length === 0) return 0;

        const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
        return sum / validGrades.length;
    };

    // Fetch detailed grade data and recalculate averages for each group
    useEffect(() => {
        if (isFree || !subjects || subjects.length === 0) return;

        const fetchGradesAndRecalculateAverages = async () => {
            const newAverages = {};

            // Process each subject and group
            for (const subject of subjects) {
                for (const group of subject.groups) {
                    try {
                        // Create a unique key for this subject/group pair
                        const key = `${subject.subject}-${group.name}`;

                        // Fetch detailed grade data for this subject/group
                        const response = await labService.getLabGrades(subject.subject, group.name);
                        const gradeData = response.data.data;

                        if (gradeData?.students && gradeData.students.length > 0) {
                            // Calculate new average excluding zeros for each student
                            const studentAverages = gradeData.students.map(student => {
                                const nonZeroGrades = student.grades.filter(grade => grade > 0);
                                if (nonZeroGrades.length === 0) return 0;

                                const sum = nonZeroGrades.reduce((acc, grade) => acc + grade, 0);
                                return sum / nonZeroGrades.length;
                            });

                            // Calculate group average from student averages (only for students with grades)
                            const validStudentAverages = studentAverages.filter(avg => avg > 0);
                            if (validStudentAverages.length > 0) {
                                const groupAvg = validStudentAverages.reduce((acc, avg) => acc + avg, 0) / validStudentAverages.length;
                                newAverages[key] = groupAvg;
                            }
                        }
                    } catch (error) {
                        // Ошибка при получении оценок для этой группы, продолжаем с другими
                    }
                }
            }

            setRecalculatedAverages(newAverages);
        };

        fetchGradesAndRecalculateAverages();
    }, [subjects, isFree]);

    const navigateToLabGrades = (subject, group) => {
        navigate(`/labs/${encodeURIComponent(subject)}/${encodeURIComponent(group)}`);
    };

    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Лабораторные работы</h1>
                        <p className="text-secondary">Управление и оценка лабораторных работ</p>
                    </div>
                </div>
                <div className="premium-feature-card card p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary-lighter text-primary flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Премиум-функция</h3>
                        <p className="text-secondary mb-4">Оценка лабораторных работ — это премиум-функция, доступная с платной подпиской.</p>
                        <p className="text-secondary mb-6">Отслеживайте прогресс студентов в лабораторных работах, делитесь отчетами об оценках и анализируйте показатели успеваемости.</p>
                        <button className="btn btn-primary px-6">Обновить сейчас</button>
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
                    <p>Ошибка загрузки лабораторных работ: {error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Лабораторные работы</h1>
                    <p className="text-secondary">Управление и оценка лабораторных работ</p>
                </div>
                <div>
                    <Link to="/labs/shared" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                        <span className="hidden sm:inline">Общие ссылки</span>
                    </Link>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="card p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                <path d="M10 2v7.31"></path>
                                <path d="M14 9.3V1.99"></path>
                                <path d="M8.5 2h7"></path>
                                <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                <path d="M5.17 14.83l4.24-4.24"></path>
                                <path d="M14.83 14.83l-4.24-4.24"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Лабораторные работы не найдены</h3>
                        <p className="text-secondary mb-6">Вы ещё не настроили оценки лабораторных работ. Создайте занятия с типом "лабораторная работа", а затем настройте оценки для своих групп.</p>
                        <Link to="/lessons/new" className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Создать лабораторное занятие
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {subjects.map((subject, index) => (
                        <div key={index} className="card overflow-hidden">
                            <div className="p-6 border-b border-border-color mb-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{backgroundColor: getSubjectColor(index)}}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                            <path d="M10 2v7.31"></path>
                                            <path d="M14 9.3V1.99"></path>
                                            <path d="M8.5 2h7"></path>
                                            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold">{subject.subject}</h2>
                                </div>
                            </div>

                            {subject.groups.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="table w-full">
                                        <thead>
                                        <tr>
                                            <th>Группа</th>
                                            <th>Студенты</th>
                                            <th>Всего лабораторных</th>
                                            <th>Средняя оценка</th>
                                            <th className="text-right">Действия</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {subject.groups.map((group, groupIndex) => (
                                            <tr key={groupIndex} className="hover:bg-bg-dark-tertiary transition-colors">
                                                <td className="font-medium">{group.name}</td>
                                                <td>{group.student_count || '-'}</td>
                                                <td>{group.total_labs || '-'}</td>
                                                <td>
                                                    {(() => {
                                                        // Get the recalculated average if available
                                                        const key = `${subject.subject}-${group.name}`;
                                                        const recalculatedAvg = recalculatedAverages[key];

                                                        // Use recalculated average if available, otherwise fall back to API average
                                                        const displayAverage = recalculatedAvg !== undefined ? recalculatedAvg : group.group_average;

                                                        return displayAverage ? (
                                                            <div className="flex items-center gap-2">
                                                                <span className={getAverageClass(displayAverage)}>
                                                                    {displayAverage.toFixed(1)}
                                                                </span>
                                                                <div className="w-20 h-2 bg-bg-dark-tertiary rounded-full">
                                                                    <div
                                                                        className="h-full rounded-full"
                                                                        style={{
                                                                            width: `${(displayAverage / 5) * 100}%`,
                                                                            backgroundColor: getAverageColor(displayAverage)
                                                                        }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-tertiary">Н/Д</span>
                                                        );
                                                    })()}
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => navigateToLabGrades(subject.subject, group.name)}
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        Управление оценками
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 pt-0">
                                    <p className="text-secondary">Нет групп с лабораторными работами для этого предмета</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style jsx="true">{`
                .premium-feature-card {
                    background: linear-gradient(to bottom right, var(--bg-dark-secondary), var(--bg-dark-tertiary));
                    border-left: 4px solid var(--primary);
                }
            `}</style>
        </div>
    );
}

// Helper function to get color for subject
function getSubjectColor(index) {
    const colors = [
        'var(--primary)',
        'var(--accent)',
        'var(--success)',
        'var(--warning)',
        '#9333ea', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
    ];

    return colors[index % colors.length];
}

// Helper function to get color class for average grade
function getAverageClass(average) {
    if (average >= 4) return 'text-success font-medium';
    if (average >= 3) return 'text-warning font-medium';
    return 'text-danger font-medium';
}

// Helper function to get color for average grade
function getAverageColor(average) {
    if (average >= 4) return 'var(--success)';
    if (average >= 3) return 'var(--warning)';
    return 'var(--danger)';
}

export default LabsPage;