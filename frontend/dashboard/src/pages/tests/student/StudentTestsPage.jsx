import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { studentTestsService } from '../../../services/testsService';

function StudentTestsPage() {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const studentId = localStorage.getItem('testStudentId');

    useEffect(() => {
        const storedStudentInfo = localStorage.getItem('testStudentInfo');
        if (!studentId || !storedStudentInfo) {
            navigate('/tests/student/login');
            return;
        }

        try {
            setStudentInfo(JSON.parse(storedStudentInfo));
        } catch (error) {
            navigate('/tests/student/login');
        }
    }, [navigate, studentId]);

    const { data, isLoading, error } = useQuery({
        queryKey: ['available-tests', studentId],
        queryFn: () => studentTestsService.getAvailableTests(studentId),
        enabled: !!studentId,
    });

    const { data: historyData, isLoading: historyLoading } = useQuery({
        queryKey: ['test-history', studentId],
        queryFn: () => studentTestsService.getTestHistory(studentId),
        enabled: !!studentId,
    });

    const availableTests = data?.data?.data || [];
    const testHistory = historyData?.data?.data?.attempts || [];

    const handleLogout = () => {
        localStorage.removeItem('testStudentId');
        localStorage.removeItem('testStudentInfo');
        navigate('/tests/student/login');
    };

    const handleStartTest = async (testId) => {
        try {
            const studentIdNum = parseInt(studentId, 10);

            const response = await studentTestsService.startTest(testId, studentIdNum);

            const attemptId = response.data?.data?.attempt_id;

            if (!attemptId) {
                alert('Не удалось начать тест: не возвращен ID попытки. Пожалуйста, попробуйте снова.');
                return;
            }

            navigate(`/tests/student/take/${attemptId}`);
        } catch (error) {
            const errorMessage = error.response?.data?.error || 'Произошла неизвестная ошибка';
            alert(`Не удалось начать тест: ${errorMessage}. Пожалуйста, попробуйте снова.`);
        }
    };

    if (isLoading || historyLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Не удалось загрузить доступные тесты: {error.message}</div>;
    }

    if (!studentInfo) {
        return null;
    }

    return (
        <div className="student-dashboard-container">
            <div className="student-dashboard-header">
                <div className="student-profile">
                    <div className="student-avatar">
                        {studentInfo.fio.charAt(0).toUpperCase()}
                    </div>
                    <div className="student-info">
                        <h2 className="student-name">{studentInfo.fio}</h2>
                        <div className="student-details">
                            <span className="student-email">{studentInfo.email}</span>
                            {studentInfo.group && (
                                <>
                                    <span className="details-separator">•</span>
                                    <span className="student-group">{studentInfo.group}</span>
                                </>
                            )}
                        </div>
                    </div>
                </div>
                <button
                    className="btn btn-outline"
                    onClick={handleLogout}
                >
                    Выйти
                </button>
            </div>

            <div className="dashboard-content">
                <h3 className="section-title">Доступные тесты</h3>

                {availableTests.length === 0 ? (
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <h3>Нет доступных тестов</h3>
                        <p>На данный момент для вас нет доступных тестов.</p>
                    </div>
                ) : (
                    <div className="tests-grid">
                        {availableTests.map(test => (
                            <div key={test.id} className="test-card">
                                <div className="test-card-content">
                                    <h3 className="test-title">{test.title}</h3>
                                    <div className="test-subject">{test.subject}</div>
                                    <p className="test-description">{test.description || 'Описание отсутствует.'}</p>

                                    <div className="test-meta">
                                        <div className="meta-item">
                                            <span className="meta-label">Вопросов:</span>
                                            <span className="meta-value">{test.questions_count}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-label">Время:</span>
                                            <span className="meta-value">{formatDuration(test.time_per_question * test.questions_count)}</span>
                                        </div>
                                        <div className="meta-item">
                                            <span className="meta-label">Попытки:</span>
                                            <span className="meta-value">
                                                {test.attempts_used} / {test.max_attempts}
                                            </span>
                                        </div>
                                    </div>

                                    {test.highest_score > 0 && (
                                        <div className="previous-score">
                                            Лучший результат: <span className={`score-badge ${getScoreBadgeClass(test.highest_score)}`}>
                                                {test.highest_score}%
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="test-card-actions">
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => handleStartTest(test.id)}
                                        disabled={!test.can_attempt}
                                    >
                                        {test.can_attempt ? 'Начать тест' : 'Нет доступных попыток'}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {testHistory.length > 0 && (
                    <div className="test-history-section">
                        <h3 className="section-title">История тестов</h3>

                        <div className="table-container">
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>Тест</th>
                                    <th>Предмет</th>
                                    <th>Дата</th>
                                    <th>Результат</th>
                                    <th>Статус</th>
                                    <th>Длительность</th>
                                    <th>Действия</th>
                                </tr>
                                </thead>
                                <tbody>
                                {testHistory.map(attempt => (
                                    <tr key={attempt.attempt_id}>
                                        <td>{attempt.test_title}</td>
                                        <td>{attempt.subject}</td>
                                        <td>{new Date(attempt.start_time).toLocaleString()}</td>
                                        <td>
                                                <span className={`score-badge ${getScoreBadgeClass(attempt.score_percent)}`}>
                                                    {attempt.score_percent.toFixed(1)}%
                                                </span>
                                        </td>
                                        <td>
                                                <span className={`status-badge ${attempt.completed ? 'status-completed' : 'status-incomplete'}`}>
                                                    {attempt.completed ? 'Завершен' : 'Не завершен'}
                                                </span>
                                        </td>
                                        <td>{formatDuration(attempt.duration_seconds)}</td>
                                        <td>
                                            <Link to={`/tests/student/results/${attempt.attempt_id}`} className="btn btn-sm btn-outline">
                                                Результаты
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="history-view-all">
                            <Link to="/tests/student/history" className="btn btn-secondary">
                                Вся история
                            </Link>
                        </div>
                    </div>
                )}
            </div>

            <style jsx="true">{`
                .student-dashboard-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                
                .student-dashboard-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .student-profile {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .student-avatar {
                    width: 60px;
                    height: 60px;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: 600;
                }
                
                .student-name {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .student-details {
                    display: flex;
                    align-items: center;
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                }
                
                .details-separator {
                    margin: 0 0.5rem;
                }
                
                .section-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    color: var(--text-tertiary);
                }
                
                .empty-state svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .empty-state h3 {
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                
                .tests-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                }
                
                .test-card {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                    display: flex;
                    flex-direction: column;
                    transition: transform var(--transition-normal) ease, box-shadow var(--transition-normal) ease;
                }
                
                .test-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-lg);
                }
                
                .test-card-content {
                    padding: 1.5rem;
                    flex: 1;
                }
                
                .test-title {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                
                .test-subject {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                    font-size: 0.875rem;
                    margin-bottom: 1rem;
                }
                
                .test-description {
                    margin-bottom: 1.5rem;
                    color: var(--text-secondary);
                    display: -webkit-box;
                    -webkit-line-clamp: 3;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .test-meta {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 0.5rem;
                    margin-bottom: 1rem;
                }
                
                .meta-item {
                    display: flex;
                    flex-direction: column;
                }
                
                .meta-label {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .meta-value {
                    font-weight: 600;
                }
                
                .previous-score {
                    margin-top: 0.5rem;
                    font-size: 0.875rem;
                }
                
                .score-badge {
                    font-weight: 600;
                    padding: 0.125rem 0.5rem;
                    border-radius: var(--radius-full);
                    margin-left: 0.25rem;
                }
                
                .score-badge-high {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .score-badge-medium {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .score-badge-low {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .test-card-actions {
                    padding: 1rem 1.5rem;
                    border-top: 1px solid var(--border-color);
                    background-color: var(--bg-dark-tertiary);
                }
                
                .test-history-section {
                    margin-top: 3rem;
                }
                
                .status-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .status-completed {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .status-incomplete {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .history-view-all {
                    margin-top: 1.5rem;
                    text-align: center;
                }
                
                @media (max-width: 768px) {
                    .student-dashboard-container {
                        padding: 1rem;
                    }
                    
                    .student-dashboard-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .test-meta {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
            `}</style>
        </div>
    );
}

function formatDuration(seconds) {
    if (!seconds) return '0с';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (minutes === 0) {
        return `${remainingSeconds}с`;
    } else if (remainingSeconds === 0) {
        return `${minutes}м`;
    } else {
        return `${minutes}м ${remainingSeconds}с`;
    }
}

function getScoreBadgeClass(score) {
    if (score >= 80) return 'score-badge-high';
    if (score >= 60) return 'score-badge-medium';
    return 'score-badge-low';
}

export default StudentTestsPage;