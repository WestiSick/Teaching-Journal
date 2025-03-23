import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { studentTestsService } from '../../../services/testsService';

function TestResults() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const studentId = localStorage.getItem('testStudentId');

    // Verify student is logged in
    useEffect(() => {
        const storedStudentInfo = localStorage.getItem('testStudentInfo');
        if (!studentId || !storedStudentInfo) {
            navigate('/tests/student/login');
            return;
        }

        try {
            setStudentInfo(JSON.parse(storedStudentInfo));
        } catch (error) {
            console.error('Error parsing student info:', error);
            navigate('/tests/student/login');
        }
    }, [navigate, studentId]);

    // Fetch test results
    const { data, isLoading, error } = useQuery({
        queryKey: ['test-results', attemptId],
        queryFn: () => studentTestsService.getTestResults(attemptId),
        enabled: !!attemptId,
        onSuccess: (response) => {
            // Add debug logging to see response structure
            console.log('Test results response:', response);
        }
    });

    // FIXED: Access the correct path in the nested data structure
    const results = data?.data?.data || null;

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error loading test results: {error.message}</div>;
    }

    if (!results || !studentInfo) {
        return (
            <div className="alert alert-warning">
                <h3>Unable to load results</h3>
                <p>The results data couldn't be found. This might be because the test hasn't been completed yet.</p>
                <div className="mt-3">
                    <Link to="/tests/student" className="btn btn-primary">Back to Tests</Link>
                </div>
                {data && (
                    <div className="debug-info mt-4">
                        <h4>Response Data:</h4>
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="test-results-container">
            <div className="results-header">
                <h1 className="results-title">Test Results</h1>
                <div className="test-info">
                    <div className="test-name">{results.test_info.title}</div>
                    <div className="test-subject">{results.test_info.subject}</div>
                </div>
            </div>

            <div className="results-summary">
                <div className="summary-card score-card">
                    <div className="card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="8" r="7"></circle>
                            <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline>
                        </svg>
                    </div>
                    <div className="card-content">
                        <div className="card-label">Your Score</div>
                        <div className="card-value">{results.attempt_info.score_percent.toFixed(1)}%</div>
                        <div className="card-detail">
                            {results.attempt_info.score} / {results.attempt_info.total_questions} correct answers
                        </div>
                    </div>
                </div>

                <div className="summary-card time-card">
                    <div className="card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                    <div className="card-content">
                        <div className="card-label">Time Spent</div>
                        <div className="card-value">{formatDuration(results.attempt_info.duration_seconds)}</div>
                        <div className="card-detail">
                            {formatDate(results.attempt_info.start_time)}
                        </div>
                    </div>
                </div>

                <div className="summary-card status-card">
                    <div className="card-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                    </div>
                    <div className="card-content">
                        <div className="card-label">Status</div>
                        <div className="card-value">{results.attempt_info.completed ? 'Completed' : 'Incomplete'}</div>
                        <div className="card-detail">
                            {results.student_info.name} ({results.student_info.group})
                        </div>
                    </div>
                </div>
            </div>

            <div className="results-details">
                <h2 className="section-title">Question Details</h2>

                <div className="questions-list">
                    {results.responses.map((response, index) => (
                        <div key={response.question_id} className="question-item">
                            <div className="question-header">
                                <div className="question-number">Question {index + 1}</div>
                                <div className={`question-result ${response.is_correct ? 'result-correct' : 'result-incorrect'}`}>
                                    {response.is_correct ? 'Correct' : 'Incorrect'}
                                </div>
                            </div>

                            <div className="question-content">
                                <div className="question-text">{response.question_text}</div>
                                <div className="question-meta">
                                    <span className="question-type">{formatQuestionType(response.question_type)}</span>
                                    <span className="time-spent">Time: {formatDuration(response.time_spent)}</span>
                                </div>
                            </div>

                            <div className="answer-section">
                                <div className="your-answer">
                                    <div className="answer-label">Your Answer:</div>
                                    <div className="answer-value">
                                        {response.answer_id ? (
                                            <div className={`answer-badge ${response.is_correct ? 'badge-correct' : 'badge-incorrect'}`}>
                                                Option selected
                                            </div>
                                        ) : response.text_answer ? (
                                            <div className="text-answer">
                                                {response.text_answer}
                                            </div>
                                        ) : (
                                            <div className="no-answer">No answer provided</div>
                                        )}
                                    </div>
                                </div>

                                <div className="correct-answer">
                                    <div className="answer-label">Correct Answer:</div>
                                    <div className="answer-value">
                                        <div className="text-answer correct">
                                            {response.correct_answer}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="results-actions">
                <Link to="/tests/student" className="btn btn-secondary">
                    Back to Tests
                </Link>
                <Link to="/tests/student/history" className="btn btn-outline">
                    View Test History
                </Link>
            </div>

            <style jsx="true">{`
                .test-results-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                
                .results-header {
                    margin-bottom: 2rem;
                    text-align: center;
                }
                
                .results-title {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                
                .test-info {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                }
                
                .test-name {
                    font-size: 1.25rem;
                    font-weight: 600;
                    margin-bottom: 0.25rem;
                }
                
                .test-subject {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                }
                
                .results-summary {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1.5rem;
                    margin-bottom: 3rem;
                }
                
                .summary-card {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    border: 1px solid var(--border-color);
                }
                
                .card-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 48px;
                    height: 48px;
                    border-radius: var(--radius-full);
                    flex-shrink: 0;
                }
                
                .score-card .card-icon {
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                }
                
                .time-card .card-icon {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .status-card .card-icon {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .card-content {
                    flex: 1;
                }
                
                .card-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }
                
                .card-value {
                    font-size: 1.5rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }
                
                .card-detail {
                    font-size: 0.875rem;
                    color: var(--text-secondary);
                }
                
                .section-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                }
                
                .questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .question-item {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }
                
                .question-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1.5rem;
                    background-color: var(--bg-dark-tertiary);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .question-number {
                    font-weight: 600;
                }
                
                .question-result {
                    font-size: 0.875rem;
                    font-weight: 600;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                }
                
                .result-correct {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .result-incorrect {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .question-content {
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .question-text {
                    font-size: 1.125rem;
                    margin-bottom: 0.75rem;
                }
                
                .question-meta {
                    display: flex;
                    gap: 1rem;
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                }
                
                .answer-section {
                    padding: 1.5rem;
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 1.5rem;
                }
                
                .your-answer, .correct-answer {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .answer-label {
                    font-size: 0.875rem;
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                
                .answer-badge {
                    display: inline-block;
                    padding: 0.375rem 0.75rem;
                    border-radius: var(--radius-full);
                    font-size: 0.875rem;
                }
                
                .badge-correct {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .badge-incorrect {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .text-answer {
                    padding: 0.75rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                
                .text-answer.correct {
                    border-color: var(--success);
                }
                
                .no-answer {
                    font-style: italic;
                    color: var(--text-tertiary);
                }
                
                .results-actions {
                    display: flex;
                    justify-content: center;
                    gap: 1rem;
                }
                
                .debug-info {
                    margin-top: 1rem;
                    padding: 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                    text-align: left;
                    overflow: auto;
                    max-height: 300px;
                }
                
                .debug-info pre {
                    margin: 0;
                    white-space: pre-wrap;
                    font-size: 0.875rem;
                }
                
                .mt-3 {
                    margin-top: 0.75rem;
                }
                
                .mt-4 {
                    margin-top: 1rem;
                }
                
                @media (max-width: 768px) {
                    .test-results-container {
                        padding: 1rem;
                    }
                    
                    .results-summary {
                        grid-template-columns: 1fr;
                    }
                    
                    .answer-section {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper functions
function formatDuration(seconds) {
    if (!seconds) return '0s';

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (minutes === 0) {
        return `${remainingSeconds}s`;
    } else if (remainingSeconds === 0) {
        return `${minutes}m`;
    } else {
        return `${minutes}m ${remainingSeconds}s`;
    }
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatQuestionType(type) {
    if (!type) return '';

    // Convert "multiple_choice" to "Multiple Choice"
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default TestResults;