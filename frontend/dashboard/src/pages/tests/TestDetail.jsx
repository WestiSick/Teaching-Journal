import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminTestsService } from '../../services/testsService';

function TestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState(null);

    const { data: testData, isLoading, error } = useQuery({
        queryKey: ['test', id],
        queryFn: () => adminTestsService.getTestDetails(id),
        retry: 1
    });

    const deleteTestMutation = useMutation({
        mutationFn: () => adminTestsService.deleteTest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            navigate('/tests');
        }
    });

    const deleteQuestionMutation = useMutation({
        mutationFn: (questionId) => adminTestsService.deleteQuestion(id, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
            setQuestionToDelete(null);
            setShowDeleteModal(false);
        }
    });

    const toggleActiveMutation = useMutation({
        mutationFn: (isActive) => adminTestsService.updateTest(id, { is_active: isActive }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
        }
    });

    const test = testData?.data?.data;

    const handleDeleteTest = () => {
        if (window.confirm('Вы уверены, что хотите удалить этот тест? Это действие нельзя отменить.')) {
            deleteTestMutation.mutate();
        }
    };

    const confirmDeleteQuestion = (questionId) => {
        setQuestionToDelete(questionId);
        setShowDeleteModal(true);
    };

    const handleDeleteQuestion = () => {
        if (questionToDelete) {
            deleteQuestionMutation.mutate(questionToDelete);
        }
    };

    const toggleTestActive = () => {
        if (test) {
            toggleActiveMutation.mutate(!test.is_active);
        }
    };

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Ошибка загрузки теста: {error.message}</div>;
    }

    if (!test) {
        return <div className="alert alert-danger">Тест не найден</div>;
    }

    const questions = Array.isArray(test.questions) ? test.questions : [];

    const stats = test.stats || {
        total_attempts: 0,
        completed_count: 0,
        average_score: 0,
        average_duration: 0
    };

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Детали теста</h1>
                <div className="header-actions">
                    <button
                        className={`btn ${test.is_active ? 'btn-warning' : 'btn-success'} mr-2`}
                        onClick={toggleTestActive}
                        disabled={toggleActiveMutation.isPending}
                    >
                        {toggleActiveMutation.isPending ? 'Обновление...' : (test.is_active ? 'Деактивировать' : 'Активировать')}
                    </button>
                    <Link to={`/tests/${id}/edit`} className="btn btn-primary mr-2">Редактировать тест</Link>
                    <Link to={`/tests/${id}/statistics`} className="btn btn-secondary mr-2">Просмотр статистики</Link>
                    <button
                        className="btn btn-danger"
                        onClick={handleDeleteTest}
                        disabled={deleteTestMutation.isPending}
                    >
                        {deleteTestMutation.isPending ? 'Удаление...' : 'Удалить тест'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8">
                    <div className="card mb-6">
                        <div className="test-header">
                            <div className="test-title-section">
                                <h2 className="test-title">{test.title}</h2>
                                <div className="test-meta">
                                    <span className="test-subject">{test.subject}</span>
                                    <span className="test-status">
                                        <span className={`status-dot ${test.is_active ? 'status-active' : 'status-inactive'}`}></span>
                                        {test.is_active ? 'Активен' : 'Неактивен'}
                                    </span>
                                </div>
                            </div>
                            <div className="test-stats">
                                <div className="stat-item">
                                    <div className="stat-value">{questions.length}</div>
                                    <div className="stat-label">Вопросов</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{stats.total_attempts}</div>
                                    <div className="stat-label">Попыток</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{test.max_attempts}</div>
                                    <div className="stat-label">Макс. попыток</div>
                                </div>
                                <div className="stat-item">
                                    <div className="stat-value">{test.time_per_question}с</div>
                                    <div className="stat-label">На вопрос</div>
                                </div>
                            </div>
                        </div>

                        <div className="test-description">
                            <h3 className="text-lg font-semibold mb-2">Описание</h3>
                            <p>{test.description || 'Описание не предоставлено.'}</p>
                        </div>
                    </div>

                    <div className="card">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h3 className="text-lg font-semibold">Вопросы</h3>
                            <Link to={`/tests/${id}/edit`} className="btn btn-sm btn-outline">Добавить вопросы</Link>
                        </div>

                        {questions.length === 0 ? (
                            <div className="empty-state">
                                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="8" y1="12" x2="16" y2="12"></line>
                                </svg>
                                <h3>Нет добавленных вопросов</h3>
                                <p>В этом тесте пока нет вопросов.</p>
                                <Link to={`/tests/${id}/edit`} className="btn btn-primary mt-3">Добавить вопросы</Link>
                            </div>
                        ) : (
                            <div className="questions-list">
                                {questions.map((question, index) => (
                                    <div key={question.id || index} className="question-item">
                                        <div className="question-header">
                                            <div className="question-number">Вопрос {index + 1}</div>
                                            <div className="question-actions">
                                                <button
                                                    className="btn btn-sm btn-danger"
                                                    onClick={() => confirmDeleteQuestion(question.id)}
                                                >
                                                    Удалить
                                                </button>
                                            </div>
                                        </div>
                                        <div className="question-content">
                                            <div className="question-text">{question.question_text}</div>
                                            <div className="question-meta">
                                                <span className="question-type">{formatQuestionType(question.question_type || '')}</span>
                                            </div>
                                        </div>
                                        <div className="answer-list">
                                            {(Array.isArray(question.answers) ? question.answers : []).map((answer, ansIndex) => (
                                                <div
                                                    key={answer.id || ansIndex}
                                                    className={`answer-item ${answer.is_correct ? 'answer-correct' : ''}`}
                                                >
                                                    <div className="answer-indicator">{String.fromCharCode(65 + ansIndex)}</div>
                                                    <div className="answer-text">{answer.answer_text}</div>
                                                    {answer.is_correct && (
                                                        <div className="answer-badge">Верно</div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="col-span-4">
                    <div className="card mb-6">
                        <h3 className="text-lg font-semibold mb-3">Статистика теста</h3>
                        <div className="stats-overview">
                            <div className="stat-row">
                                <div className="stat-label">Всего попыток</div>
                                <div className="stat-value">{stats.total_attempts}</div>
                            </div>
                            <div className="stat-row">
                                <div className="stat-label">Завершенные попытки</div>
                                <div className="stat-value">{stats.completed_count}</div>
                            </div>
                            <div className="stat-row">
                                <div className="stat-label">Средний балл</div>
                                <div className="stat-value">{stats.average_score.toFixed(1)}%</div>
                            </div>
                            <div className="stat-row">
                                <div className="stat-label">Среднее время</div>
                                <div className="stat-value">{formatDuration(stats.average_duration)}</div>
                            </div>
                        </div>
                        <div className="mt-3">
                            <Link to={`/tests/${id}/statistics`} className="btn btn-outline w-full">
                                Подробная статистика
                            </Link>
                        </div>
                    </div>

                    <div className="card">
                        <h3 className="text-lg font-semibold mb-3">Информация о тесте</h3>
                        <div className="info-list">
                            <div className="info-item">
                                <div className="info-label">Создан</div>
                                <div className="info-value">{new Date(test.created_at).toLocaleString()}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Последнее обновление</div>
                                <div className="info-value">{new Date(test.updated_at).toLocaleString()}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">ID создателя</div>
                                <div className="info-value">{test.creator_id}</div>
                            </div>
                            <div className="info-item">
                                <div className="info-label">Ограничение по времени</div>
                                <div className="info-value">{formatDuration(test.time_per_question * questions.length)}</div>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="d-flex gap-2">
                                <Link to="/tests" className="btn btn-secondary">
                                    Назад к тестам
                                </Link>
                                <button
                                    className="btn btn-danger"
                                    onClick={handleDeleteTest}
                                    disabled={deleteTestMutation.isPending}
                                >
                                    {deleteTestMutation.isPending ? 'Удаление...' : 'Удалить тест'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Модальное окно удаления вопроса */}
            {showDeleteModal && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3>Удалить вопрос</h3>
                            <button
                                className="modal-close"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                &times;
                            </button>
                        </div>
                        <div className="modal-body">
                            <p>Вы уверены, что хотите удалить этот вопрос? Это действие нельзя отменить.</p>
                        </div>
                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowDeleteModal(false)}
                            >
                                Отмена
                            </button>
                            <button
                                className="btn btn-danger"
                                onClick={handleDeleteQuestion}
                                disabled={deleteQuestionMutation.isPending}
                            >
                                {deleteQuestionMutation.isPending ? 'Удаление...' : 'Удалить вопрос'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                .header-actions {
                    display: flex;
                }
                
                .test-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 1.5rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .test-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                
                .test-meta {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    color: var(--text-tertiary);
                }
                
                .test-subject {
                    font-weight: 500;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                }
                
                .test-status {
                    display: flex;
                    align-items: center;
                    gap: 0.375rem;
                }
                
                .status-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                
                .status-active {
                    background-color: var(--success);
                }
                
                .status-inactive {
                    background-color: var(--warning);
                }
                
                .test-stats {
                    display: flex;
                    gap: 1.5rem;
                }
                
                .stat-item {
                    text-align: center;
                }
                
                .stat-value {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .stat-label {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .test-description {
                    margin-top: 1rem;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
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
                
                .questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .question-item {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                }
                
                .question-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .question-number {
                    font-weight: 600;
                }
                
                .question-content {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .question-text {
                    font-size: 1rem;
                    margin-bottom: 0.5rem;
                }
                
                .question-meta {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .question-type {
                    text-transform: capitalize;
                }
                
                .answer-list {
                    padding: 1rem;
                }
                
                .answer-item {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    margin-bottom: 0.5rem;
                }
                
                .answer-item:last-child {
                    margin-bottom: 0;
                }
                
                .answer-correct {
                    background-color: var(--success-lighter);
                }
                
                .answer-indicator {
                    width: 2rem;
                    height: 2rem;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background-color: var(--bg-dark);
                    border-radius: var(--radius-full);
                    margin-right: 0.75rem;
                    font-weight: 600;
                }
                
                .answer-correct .answer-indicator {
                    background-color: var(--success);
                    color: white;
                }
                
                .answer-text {
                    flex: 1;
                }
                
                .answer-badge {
                    padding: 0.25rem 0.5rem;
                    background-color: var(--success);
                    color: white;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                    font-weight: 600;
                }
                
                .stats-overview, .info-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .stat-row, .info-item {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .stat-row:last-child, .info-item:last-child {
                    border-bottom: none;
                }
                
                .info-label {
                    color: var(--text-tertiary);
                }
                
                .info-value {
                    font-weight: 500;
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
                
                .modal-container {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    width: 100%;
                    max-width: 500px;
                    border: 1px solid var(--border-color);
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .modal-header h3 {
                    margin: 0;
                    font-size: 1.25rem;
                }
                
                .modal-close {
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
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    padding: 1rem 1.5rem;
                    border-top: 1px solid var(--border-color);
                }
                
                .mr-2 {
                    margin-right: 0.5rem;
                }
                
                .mt-3 {
                    margin-top: 0.75rem;
                }
                
                .mt-4 {
                    margin-top: 1rem;
                }
                
                .gap-2 {
                    gap: 0.5rem;
                }
                
                .d-flex {
                    display: flex;
                }
                
                .w-full {
                    width: 100%;
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

function formatQuestionType(type) {
    const typeMap = {
        'multiple_choice': 'Множественный выбор',
        'single_choice': 'Одиночный выбор',
        'text': 'Текстовый ответ'
    };

    return typeMap[type] || type.replace('_', ' ');
}

export default TestDetail;