import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { testingService } from '../../../services/api';
import { StudentAuthProvider, useStudentAuth } from '../../../context/StudentAuthContext';

function TestAttemptPage() {
    const { id } = useParams(); // attempt ID
    const navigate = useNavigate();
    const { isAuthenticated } = useStudentAuth();

    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [timeSpent, setTimeSpent] = useState(0);
    const [timeLeft, setTimeLeft] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const timerRef = useRef(null);

    // Fetch current question
    const {
        data,
        isLoading,
        error,
        refetch
    } = useQuery({
        queryKey: ['current-question', id],
        queryFn: () => testingService.getCurrentQuestion(id),
        refetchOnWindowFocus: false,
    });

    // Submit answer mutation
    const submitAnswerMutation = useMutation({
        mutationFn: ({ questionId, answerId, timeSpent }) =>
            testingService.submitAnswer(id, questionId, { answer_id: answerId, time_spent: timeSpent }),
        onSuccess: (response) => {
            // If all questions are answered, navigate to result page
            if (response.data.data.all_questions_answered) {
                navigate(`/student-testing/result/${id}`);
            } else {
                // Refetch to get next question
                setSelectedAnswer(null);
                setTimeSpent(0);
                refetch();
            }
            setIsSubmitting(false);
        },
        onError: (error) => {
            console.error('Error submitting answer:', error);
            setIsSubmitting(false);
        }
    });

    // Finish test mutation
    const finishTestMutation = useMutation({
        mutationFn: () => testingService.finishTest(id),
        onSuccess: () => {
            navigate(`/student-testing/result/${id}`);
        },
        onError: (error) => {
            console.error('Error finishing test:', error);
            // You could add toast notification here
        }
    });

    const question = data?.data?.data;

    // Set up timer
    useEffect(() => {
        if (question?.time_per_question && !timerRef.current) {
            setTimeLeft(question.time_per_question);

            timerRef.current = setInterval(() => {
                setTimeSpent(prev => prev + 1);
                setTimeLeft(prev => prev - 1);
            }, 1000);
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [question]);

    // Auto-submit when time runs out
    useEffect(() => {
        if (timeLeft === 0 && question) {
            handleSubmitAnswer();
        }
    }, [timeLeft, question]);

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/student-testing/login');
        }
    }, [isAuthenticated, navigate]);

    // Handle selecting an answer
    const handleSelectAnswer = (answerId) => {
        setSelectedAnswer(answerId);
    };

    // Handle submitting answer
    const handleSubmitAnswer = () => {
        if (isSubmitting) return;

        setIsSubmitting(true);
        clearInterval(timerRef.current);
        timerRef.current = null;

        submitAnswerMutation.mutate({
            questionId: question.question_id,
            answerId: selectedAnswer,
            timeSpent: timeSpent
        });
    };

    // Handle finishing test early
    const handleFinishTest = () => {
        if (window.confirm('Are you sure you want to finish this test? Any unanswered questions will be marked as incorrect.')) {
            clearInterval(timerRef.current);
            timerRef.current = null;
            finishTestMutation.mutate();
        }
    };

    // Handle test completed notification
    if (question?.test_completed) {
        return (
            <div className="test-attempt-container">
                <div className="test-complete-card">
                    <div className="complete-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <h2>All Questions Answered!</h2>
                    <p>You have completed all questions in this test.</p>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate(`/student-testing/result/${id}`)}
                    >
                        View Results
                    </button>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="test-attempt-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p>Loading question...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="test-attempt-container">
                <div className="error-container">
                    <div className="alert alert-danger">
                        <h3>Error Loading Question</h3>
                        <p>{error.message || 'Failed to load the question. Please try again.'}</p>
                        <button
                            className="btn btn-primary mt-4"
                            onClick={() => refetch()}
                        >
                            Try Again
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="test-attempt-container">
            <div className="test-header">
                <div className="test-progress">
                    <div className="progress-text">
                        Question {question?.question_order} of {question?.question_order + question?.remaining_questions}
                    </div>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar"
                            style={{
                                width: `${(question?.question_order / (question?.question_order + question?.remaining_questions)) * 100}%`
                            }}
                        ></div>
                    </div>
                </div>

                <div className="test-timer">
                    <div className="timer-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div className="timer-text">
                        Time left: {formatTime(timeLeft)}
                    </div>
                </div>
            </div>

            <div className="question-card">
                <h2 className="question-text">{question?.question_text}</h2>

                <div className="answers-list">
                    {question?.answers && question.answers.map((answer) => (
                        <div
                            key={answer.id}
                            className={`answer-option ${selectedAnswer === answer.id ? 'selected' : ''}`}
                            onClick={() => handleSelectAnswer(answer.id)}
                        >
                            <div className="answer-checkbox">
                                {selectedAnswer === answer.id ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                ) : null}
                            </div>
                            <div className="answer-text">{answer.answer_text}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="test-actions">
                <button
                    className="btn btn-outline"
                    onClick={handleFinishTest}
                >
                    Finish Test
                </button>

                <button
                    className="btn btn-primary"
                    disabled={selectedAnswer === null || isSubmitting}
                    onClick={handleSubmitAnswer}
                >
                    {isSubmitting ? 'Submitting...' : 'Next Question'}
                </button>
            </div>

            <style jsx="true">{`
                .test-attempt-container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .test-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                
                .test-progress {
                    flex: 1;
                }
                
                .progress-text {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }
                
                .progress-bar-container {
                    width: 100%;
                    height: 6px;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-full);
                    overflow: hidden;
                }
                
                .progress-bar {
                    height: 100%;
                    background-color: var(--primary);
                    border-radius: var(--radius-full);
                    transition: width 0.3s ease;
                }
                
                .test-timer {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                }
                
                .timer-text {
                    font-weight: 500;
                    color: ${timeLeft && timeLeft < 10 ? 'var(--danger)' : 'var(--text-primary)'};
                }
                
                .question-card {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    padding: 2rem;
                    margin-bottom: 2rem;
                }
                
                .question-text {
                    font-size: 1.25rem;
                    margin-bottom: 2rem;
                }
                
                .answers-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .answer-option {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    background-color: var(--bg-dark-tertiary);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .answer-option:hover {
                    border-color: var(--border-color-light);
                    background-color: var(--bg-dark);
                }
                
                .answer-option.selected {
                    border-color: var(--primary);
                    background-color: var(--primary-lighter);
                }
                
                .answer-checkbox {
                    width: 24px;
                    height: 24px;
                    border-radius: var(--radius-full);
                    border: 2px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 1rem;
                    color: var(--primary);
                }
                
                .answer-option.selected .answer-checkbox {
                    border-color: var(--primary);
                    background-color: var(--primary);
                    color: white;
                }
                
                .answer-text {
                    flex: 1;
                }
                
                .test-actions {
                    display: flex;
                    justify-content: space-between;
                }
                
                .test-complete-card, .loading-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    padding: 3rem 2rem;
                }
                
                .complete-icon {
                    color: var(--success);
                    margin-bottom: 1.5rem;
                }
                
                .spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid var(--bg-dark-tertiary);
                    border-radius: 50%;
                    border-top-color: var(--primary);
                    animation: spin 1s linear infinite;
                    margin-bottom: 1rem;
                }
                
                @keyframes spin {
                    100% {
                        transform: rotate(360deg);
                    }
                }
                
                .mt-4 {
                    margin-top: 1rem;
                }
                
                @media (max-width: 640px) {
                    .test-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .test-timer {
                        margin-top: 1rem;
                    }
                    
                    .test-actions {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    
                    .test-actions button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper to format time
function formatTime(seconds) {
    if (seconds === null) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default TestAttemptPage;