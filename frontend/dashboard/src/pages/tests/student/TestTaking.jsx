import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studentTestsService } from '../../../services/testsService';

function TestTaking() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [selectedAnswerId, setSelectedAnswerId] = useState(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [timer, setTimer] = useState(0);
    const timerRef = useRef(null);
    const questionIdRef = useRef(null);
    const studentId = localStorage.getItem('testStudentId');

    useEffect(() => {
        if (!studentId) {
            navigate('/tests/student/login');
        }
    }, [navigate, studentId]);

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['current-question', attemptId],
        queryFn: async () => {
            return await studentTestsService.getNextQuestion(attemptId);
        },
        onSuccess: (response) => {
            const responseData = response.data;

            if (responseData.data && responseData.data.completed) {
                navigate(`/tests/student/results/${attemptId}`);
                return;
            }

            if (!responseData.data || !responseData.data.question) {
                return;
            }

            const questionData = responseData.data.question;

            if (questionData && questionData.id) {
                questionIdRef.current = questionData.id;
            }

            setSelectedAnswerId(null);
            setTextAnswer('');

            setTimer(0);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            timerRef.current = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        },
        retry: 1,
        refetchOnWindowFocus: false
    });

    const submitAnswerMutation = useMutation({
        mutationFn: async () => {
            const questionId = questionIdRef.current;

            if (!questionId) {
                throw new Error('Отсутствует ID вопроса');
            }

            // Строим данные ответа
            const answerData = {
                question_id: questionId,
                answer_id: selectedAnswerId,
                text_answer: textAnswer,
                time_spent: timer
            };

            return studentTestsService.submitAnswer(attemptId, answerData);
        },
        onSuccess: (response) => {
            if (response.data.data?.completed) {
                navigate(`/tests/student/results/${attemptId}`);
                return;
            }

            refetch();
        },
        onError: (error) => {
            alert('Не удалось отправить ответ: ' + (error.message || 'Неизвестная ошибка'));
        }
    });

    // Очищаем таймер при размонтировании
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const handleAnswerSelect = (answerId) => {
        setSelectedAnswerId(answerId);
        setTextAnswer('');
    };

    const handleTextChange = (e) => {
        setTextAnswer(e.target.value);
        setSelectedAnswerId(null);
    };

    const handleSubmit = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Извлекаем данные вопроса из ответа
        const responseData = data?.data?.data || {};
        const questionData = responseData.question || null;

        // Если ID вопроса отсутствует, пытаемся получить его из текущих данных вопроса
        if (!questionIdRef.current && questionData && questionData.id) {
            questionIdRef.current = questionData.id;
        }

        submitAnswerMutation.mutate();
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    const responseData = data?.data?.data || {};
    const questionData = responseData.question || null;
    const progressData = responseData.progress || { answered: 0, total: 1 };

    if (isLoading) {
        return (
            <div className="loader-container">
                <div className="loader">
                    <div className="spinner"></div>
                </div>
                <div className="loading-text">Загрузка вопроса...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="alert alert-danger">
                    <h3>Ошибка загрузки вопроса</h3>
                    <p>{error.message || 'Не удалось загрузить следующий вопрос'}</p>
                </div>
                <div className="error-actions">
                    <button className="btn btn-primary" onClick={() => refetch()}>
                        Попробовать снова
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/tests/student')}>
                        Назад к тестам
                    </button>
                </div>
            </div>
        );
    }

    if (!questionData) {
        return (
            <div className="error-container">
                <div className="alert alert-warning">
                    <h3>Вопрос недоступен</h3>
                    <p>Не удалось загрузить следующий вопрос. Возможно, тест завершен или возникла проблема с данными теста.</p>
                </div>
                <div className="error-actions">
                    <button className="btn btn-primary" onClick={() => refetch()}>
                        Попробовать снова
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/tests/student/history')}>
                        История тестов
                    </button>
                    <button className="btn btn-outline" onClick={() => navigate('/tests/student')}>
                        Назад к тестам
                    </button>
                </div>
            </div>
        );
    }

    const question = questionData;
    const progress = progressData;

    if (question && question.id && questionIdRef.current !== question.id) {
        questionIdRef.current = question.id;
    }

    return (
        <div className="test-taking-container">
            <div className="test-taking-header">
                <div className="test-progress">
                    <div className="progress-text">
                        Вопрос {progress.answered + 1} из {progress.total}
                    </div>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${(progress.answered / progress.total) * 100}%` }}
                        ></div>
                    </div>
                </div>
                <div className="test-timer">
                    <div className="timer-display">
                        {formatTime(timer)}
                    </div>
                    <div className="timer-label">Прошло времени</div>
                </div>
            </div>

            <div className="question-container">
                <div className="question-header">
                    <div className="question-number">Вопрос {progress.answered + 1}</div>
                    <div className="question-type">{formatQuestionType(question.question_type)}</div>
                </div>

                <div className="question-content">
                    <h2 className="question-text">{question.question_text}</h2>

                    <div className="answer-options">
                        {(question.question_type === 'multiple_choice' || question.question_type === 'single_choice') && (
                            <div className="multiple-choice-options">
                                {Array.isArray(question.answers) && question.answers.length > 0 ? (
                                    question.answers.map(option => (
                                        <div
                                            key={option.id}
                                            className={`answer-option ${selectedAnswerId === option.id ? 'answer-selected' : ''}`}
                                            onClick={() => handleAnswerSelect(option.id)}
                                        >
                                            <div className="option-indicator">
                                                {question.question_type === 'multiple_choice' ? (
                                                    <span className="checkbox">
                                                        {selectedAnswerId === option.id && '✓'}
                                                    </span>
                                                ) : (
                                                    <span className="radio-button">
                                                        {selectedAnswerId === option.id && (
                                                            <span className="radio-filled"></span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="option-text">{option.answer_text}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="answer-error">Нет вариантов ответа для этого вопроса</div>
                                )}
                            </div>
                        )}

                        {question.question_type === 'text' && (
                            <div className="text-answer">
                                <textarea
                                    className="text-answer-input"
                                    placeholder="Введите ваш ответ здесь..."
                                    value={textAnswer}
                                    onChange={handleTextChange}
                                    rows="4"
                                ></textarea>
                            </div>
                        )}
                    </div>
                </div>

                <div className="question-actions">
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={submitAnswerMutation.isPending || (
                            !selectedAnswerId && !textAnswer
                        )}
                    >
                        {submitAnswerMutation.isPending ? 'Отправка...' : 'Отправить ответ'}
                    </button>
                </div>
            </div>

            <style jsx="true">{`
                .test-taking-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                
                .loader-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    text-align: center;
                }
                
                .loading-text {
                    margin-top: 1rem;
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                }
                
                .error-actions {
                    margin-top: 1.5rem;
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                
                .test-taking-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                
                .test-progress {
                    flex: 1;
                }
                
                .progress-text {
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                }
                
                .progress-bar-container {
                    height: 8px;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-full);
                    overflow: hidden;
                    width: 100%;
                    max-width: 300px;
                }
                
                .progress-bar-fill {
                    height: 100%;
                    background-color: var(--primary);
                    border-radius: var(--radius-full);
                    transition: width 0.3s ease;
                }
                
                .test-timer {
                    text-align: center;
                }
                
                .timer-display {
                    font-size: 1.75rem;
                    font-weight: 700;
                    font-family: var(--font-mono);
                    padding: 0.5rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                    margin-bottom: 0.25rem;
                }
                
                .timer-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .question-container {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }
                
                .question-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    background-color: var(--bg-dark-tertiary);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .question-number {
                    font-weight: 600;
                }
                
                .question-type {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .question-content {
                    padding: 2rem;
                }
                
                .question-text {
                    font-size: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .answer-options {
                    margin-bottom: 1.5rem;
                }
                
                .multiple-choice-options {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .answer-option {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all var(--transition-normal) ease;
                }
                
                .answer-option:hover {
                    background-color: var(--bg-dark-tertiary);
                }
                
                .answer-selected {
                    border-color: var(--primary);
                    background-color: var(--primary-lighter);
                }
                
                .option-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .checkbox {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-color);
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: var(--primary);
                }
                
                .answer-selected .checkbox {
                    border-color: var(--primary);
                    background-color: var(--primary-lighter);
                }
                
                .radio-button {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-color);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .answer-selected .radio-button {
                    border-color: var(--primary);
                }
                
                .radio-filled {
                    width: 10px;
                    height: 10px;
                    background-color: var(--primary);
                    border-radius: 50%;
                }
                
                .option-text {
                    flex: 1;
                }
                
                .text-answer {
                    margin-top: 1rem;
                }
                
                .text-answer-input {
                    width: 100%;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-primary);
                    resize: vertical;
                    min-height: 120px;
                }
                
                .text-answer-input:focus {
                    outline: none;
                    border-color: var(--primary);
                }
                
                .question-actions {
                    padding: 1.5rem;
                    background-color: var(--bg-dark-tertiary);
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                }
                
                .answer-error {
                    padding: 1rem;
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                    border-radius: var(--radius-md);
                    text-align: center;
                }
                
                @media (max-width: 768px) {
                    .test-taking-container {
                        padding: 1rem;
                    }
                    
                    .test-taking-header {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: flex-start;
                    }
                    
                    .question-text {
                        font-size: 1.25rem;
                    }
                }
            `}</style>
        </div>
    );
}

function formatQuestionType(type) {
    if (!type) return '';

    const typeMap = {
        'multiple_choice': 'Множественный выбор',
        'single_choice': 'Одиночный выбор',
        'text': 'Текстовый ответ'
    };

    return typeMap[type] || type.split('_').join(' ');
}

export default TestTaking;