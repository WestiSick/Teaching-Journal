import { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testingService } from '../../../services/api';
import { StudentAuthProvider, useStudentAuth } from '../../../context/StudentAuthContext';
import StudentLayout from './StudentLayout';

function TestResultPageContent() {
    const { id } = useParams(); // attempt ID
    const navigate = useNavigate();
    const { isAuthenticated } = useStudentAuth();

    // Fetch test result
    const {
        data,
        isLoading,
        error
    } = useQuery({
        queryKey: ['test-result', id],
        queryFn: () => testingService.getTestResult(id),
    });

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/student-testing/login');
        }
    }, [isAuthenticated, navigate]);

    const result = data?.data?.data;

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading test results...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="alert alert-danger">
                    <h3>Error Loading Results</h3>
                    <p>{error.message || 'Failed to load the test results. Please try again.'}</p>
                    <div className="mt-4">
                        <Link to="/student-testing/tests" className="btn btn-primary">
                            Back to Tests
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    if (!result) {
        return (
            <div className="error-container">
                <div className="alert alert-warning">
                    <h3>Results Not Found</h3>
                    <p>The test results you're looking for could not be found.</p>
                    <div className="mt-4">
                        <Link to="/student-testing/tests" className="btn btn-primary">
                            Back to Tests
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Get score color class
    const getScoreColorClass = (score) => {
        if (score >= 80) return 'text-success';
        if (score >= 60) return 'text-primary-color';
        if (score >= 40) return 'text-warning';
        return 'text-danger';
    };

    return (
        <div className="test-result-container">
            <div className="result-header">
                <h1>Test Results</h1>
                <div className="d-flex gap-3 mt-2">
                    <Link to="/student-testing/tests" className="btn btn-outline">
                        Available Tests
                    </Link>
                    <Link to="/student-testing/history" className="btn btn-outline">
                        Test History
                    </Link>
                </div>
            </div>

            <div className="result-card">
                <div className="result-summary">
                    <h2>{result.test_title}</h2>

                    {result.completed ? (
                        <div className="score-display">
                            <div className={`score-circle ${getScoreColorClass(result.score)}`}>
                                {result.score.toFixed(1)}%
                            </div>
                            <div className="score-label">
                                {result.score >= 80 ? 'Excellent!' :
                                    result.score >= 60 ? 'Good job!' :
                                        result.score >= 40 ? 'Average' : 'Needs improvement'}
                            </div>
                        </div>
                    ) : (
                        <div className="incomplete-badge">
                            <span className="badge badge-warning">Incomplete</span>
                        </div>
                    )}
                </div>

                <div className="result-details">
                    <div className="detail-row">
                        <div className="detail-label">Status</div>
                        <div className="detail-value">
                            {result.completed ?
                                <span className="badge badge-success">Completed</span> :
                                <span className="badge badge-warning">Incomplete</span>
                            }
                        </div>
                    </div>

                    <div className="detail-row">
                        <div className="detail-label">Started</div>
                        <div className="detail-value">{new Date(result.started_at).toLocaleString()}</div>
                    </div>

                    {result.finished_at && (
                        <div className="detail-row">
                            <div className="detail-label">Finished</div>
                            <div className="detail-value">{new Date(result.finished_at).toLocaleString()}</div>
                        </div>
                    )}

                    <div className="detail-row">
                        <div className="detail-label">Time Spent</div>
                        <div className="detail-value">{formatTime(result.total_time)}</div>
                    </div>

                    <div className="detail-row">
                        <div className="detail-label">Questions</div>
                        <div className="detail-value">
                            {result.correct_answers} / {result.total_questions} correct
                            {result.completed && (
                                <span className="text-tertiary ml-2">
                                    ({((result.correct_answers / result.total_questions) * 100).toFixed(0)}%)
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <h3 className="answers-header">Question Breakdown</h3>

                <div className="answers-list">
                    {result.answers && result.answers.length > 0 ? (
                        result.answers.map((answer, index) => (
                            <div key={index} className={`answer-item ${answer.is_correct ? 'answer-correct' : 'answer-incorrect'}`}>
                                <div className="answer-header">
                                    <div className="question-number">Question {answer.question_order}</div>
                                    <div className="answer-status">
                                        {answer.is_correct ? (
                                            <span className="badge badge-success">Correct</span>
                                        ) : (
                                            <span className="badge badge-danger">Incorrect</span>
                                        )}
                                    </div>
                                </div>

                                <div className="question-text">{answer.question_text}</div>

                                <div className="answer-details">
                                    <div className="user-answer">
                                        <div className="answer-label">Your answer:</div>
                                        <div className="answer-value">
                                            {answer.answer_text ? (
                                                <span className={answer.is_correct ? 'text-success' : 'text-danger'}>
                                                    {answer.answer_text}
                                                </span>
                                            ) : (
                                                <span className="text-tertiary">No answer provided</span>
                                            )}
                                        </div>
                                    </div>

                                    {!answer.is_correct && (
                                        <div className="correct-answer">
                                            <div className="answer-label">Correct answer:</div>
                                            <div className="answer-value text-success">
                                                {answer.correct_answer_text}
                                            </div>
                                        </div>
                                    )}

                                    <div className="time-spent">
                                        <div className="answer-label">Time spent:</div>
                                        <div className="answer-value">{answer.time_spent} seconds</div>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="no-answers">
                            <p>No answer details available for this test.</p>
                        </div>
                    )}
                </div>
            </div>

            <div className="result-actions mt-4">
                <Link to="/student-testing/tests" className="btn btn-primary">
                    Back to Tests
                </Link>
            </div>

            <style jsx="true">{`
                .test-result-container {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .result-header {
                    margin-bottom: 2rem;
                }
                
                .result-card {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    padding: 2rem;
                    margin-bottom: 2rem;
                }
                
                .result-summary {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                    padding-bottom: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .score-display {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .score-circle {
                    width: 80px;
                    height: 80px;
                    border-radius: 50%;
                    background-color: var(--bg-dark-tertiary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                
                .text-success {
                    color: var(--success);
                }
                
                .text-primary-color {
                    color: var(--primary);
                }
                
                .text-warning {
                    color: var(--warning);
                }
                
                .text-danger {
                    color: var(--danger);
                }
                
                .score-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .result-details {
                    margin-bottom: 2rem;
                }
                
                .detail-row {
                    display: flex;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .detail-row:last-child {
                    border-bottom: none;
                }
                
                .detail-label {
                    width: 120px;
                    font-weight: 500;
                    color: var(--text-tertiary);
                }
                
                .detail-value {
                    flex: 1;
                    font-weight: 500;
                }
                
                .ml-2 {
                    margin-left: 0.5rem;
                }
                
                .answers-header {
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.75rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .answers-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .answer-item {
                    padding: 1.5rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    border: 1px solid var(--border-color);
                }
                
                .answer-correct {
                    border-left: 4px solid var(--success);
                }
                
                .answer-incorrect {
                    border-left: 4px solid var(--danger);
                }
                
                .answer-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                
                .question-number {
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                
                .question-text {
                    font-size: 1.125rem;
                    margin-bottom: 1.5rem;
                }
                
                .answer-details {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                
                .user-answer, .correct-answer, .time-spent {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .answer-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .answer-value {
                    font-weight: 500;
                }
                
                .loading-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                    padding: 3rem 2rem;
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
                    margin-top: 1.5rem;
                }
                
                .no-answers {
                    text-align: center;
                    padding: 2rem;
                    color: var(--text-tertiary);
                }
                
                @media (max-width: 768px) {
                    .result-summary {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .answer-details {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper to format time
function formatTime(seconds) {
    if (!seconds) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

// Wrapper component with layout
function TestResultPage() {
    return (
        <StudentAuthProvider>
            <StudentLayout>
                <TestResultPageContent />
            </StudentLayout>
        </StudentAuthProvider>
    );
}

export default TestResultPage;