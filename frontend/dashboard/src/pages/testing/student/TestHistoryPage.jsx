import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testingService } from '../../../services/api';
import { StudentAuthProvider, useStudentAuth } from '../../../context/StudentAuthContext';
import StudentLayout from './StudentLayout';

function TestHistoryPageContent() {
    const { currentStudent } = useStudentAuth();
    const [filter, setFilter] = useState('all'); // 'all', 'completed', 'incomplete'

    // Fetch test attempt history
    const { data, isLoading, error } = useQuery({
        queryKey: ['test-attempt-history', filter],
        queryFn: () => {
            const params = {};
            if (filter === 'completed') params.completed = true;
            if (filter === 'incomplete') params.completed = false;
            return testingService.getAttemptHistory(params);
        },
    });

    const attempts = data?.data?.data || [];

    // Group attempts by test
    const attemptsByTest = attempts.reduce((acc, attempt) => {
        if (!acc[attempt.test_id]) {
            acc[attempt.test_id] = {
                test_id: attempt.test_id,
                title: attempt.title,
                subject: attempt.subject,
                attempts: []
            };
        }
        acc[attempt.test_id].attempts.push(attempt);
        return acc;
    }, {});

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading test history...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="alert alert-danger">
                    <h3>Error Loading Test History</h3>
                    <p>{error.message || 'Failed to load test history. Please try again later.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="test-history-page">
            <div className="page-header">
                <h1>Test History</h1>
                <p className="welcome-text">View your previous test attempts, {currentStudent?.fio || 'Student'}</p>
            </div>

            <div className="filter-controls mb-4">
                <div className="d-flex gap-2">
                    <button
                        className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFilter('all')}
                    >
                        All
                    </button>
                    <button
                        className={`btn ${filter === 'completed' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFilter('completed')}
                    >
                        Completed
                    </button>
                    <button
                        className={`btn ${filter === 'incomplete' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setFilter('incomplete')}
                    >
                        In Progress
                    </button>
                </div>
                <div className="filter-info">
                    Showing {attempts.length} {filter !== 'all' ? `${filter}` : ''} attempt{attempts.length !== 1 ? 's' : ''}
                </div>
            </div>

            {Object.keys(attemptsByTest).length === 0 ? (
                <div className="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                    <h2>No Test Attempts Found</h2>
                    <p>
                        {filter === 'all'
                            ? 'You have not attempted any tests yet.'
                            : `You don't have any ${filter} test attempts.`}
                    </p>
                    <Link to="/student-testing/tests" className="btn btn-primary mt-4">
                        Browse Available Tests
                    </Link>
                </div>
            ) : (
                <div className="history-list">
                    {Object.values(attemptsByTest).map((testData) => (
                        <div key={testData.test_id} className="test-history-card">
                            <div className="test-header">
                                <div className="test-title-section">
                                    <h3 className="test-title">{testData.title}</h3>
                                    <div className="test-subject">{testData.subject}</div>
                                </div>
                                <div className="test-count">
                                    {testData.attempts.length} attempt{testData.attempts.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            <div className="attempt-list">
                                {testData.attempts.map((attempt, index) => (
                                    <div key={attempt.id} className="attempt-item">
                                        <div className="attempt-header">
                                            <div className="attempt-number">Attempt #{index + 1}</div>
                                            <div className="attempt-date">{formatDate(attempt.started_at)}</div>
                                        </div>

                                        <div className="attempt-details">
                                            <div className="detail-item">
                                                <div className="detail-label">Status</div>
                                                <div className="detail-value">
                                                    {attempt.completed ? (
                                                        <span className="badge badge-success">Completed</span>
                                                    ) : (
                                                        <span className="badge badge-warning">In Progress</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="detail-item">
                                                <div className="detail-label">Score</div>
                                                <div className="detail-value">
                                                    {attempt.completed ? (
                                                        <span className={getScoreColorClass(attempt.score)}>
                                                            {attempt.score.toFixed(1)}%
                                                        </span>
                                                    ) : (
                                                        <span className="text-tertiary">-</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="detail-item">
                                                <div className="detail-label">Time Spent</div>
                                                <div className="detail-value">{formatTime(attempt.total_time)}</div>
                                            </div>

                                            <div className="detail-item">
                                                <div className="detail-label">Correct</div>
                                                <div className="detail-value">
                                                    {attempt.correct_answers} / {attempt.total_questions}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="attempt-actions">
                                            <Link
                                                to={`/student-testing/result/${attempt.id}`}
                                                className="btn btn-outline"
                                            >
                                                View Details
                                            </Link>

                                            {!attempt.completed && (
                                                <Link
                                                    to={`/student-testing/attempt/${attempt.id}`}
                                                    className="btn btn-primary"
                                                >
                                                    Continue Test
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx="true">{`
                .test-history-page {
                    max-width: 800px;
                    margin: 0 auto;
                }
                
                .page-header {
                    margin-bottom: 2rem;
                }
                
                .page-header h1 {
                    margin-bottom: 0.5rem;
                }
                
                .welcome-text {
                    color: var(--text-tertiary);
                }
                
                .filter-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                }
                
                .filter-info {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                }
                
                .history-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .test-history-card {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }
                
                .test-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .test-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .test-subject {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                }
                
                .test-count {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .attempt-list {
                    padding: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .attempt-item {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                }
                
                .attempt-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    font-size: 0.875rem;
                }
                
                .attempt-number {
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                
                .attempt-date {
                    color: var(--text-tertiary);
                }
                
                .attempt-details {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    padding: 1rem;
                }
                
                .detail-label {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }
                
                .detail-value {
                    font-weight: 500;
                }
                
                .attempt-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    border-top: 1px solid var(--border-color);
                }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 2rem;
                    text-align: center;
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                }
                
                .empty-state svg {
                    color: var(--text-tertiary);
                    margin-bottom: 1.5rem;
                    opacity: 0.6;
                }
                
                .empty-state h2 {
                    margin-bottom: 0.5rem;
                }
                
                .empty-state p {
                    color: var(--text-tertiary);
                    max-width: 500px;
                }
                
                .loading-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 2rem;
                    text-align: center;
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
                
                .text-success {
                    color: var(--success);
                }
                
                .text-warning {
                    color: var(--warning);
                }
                
                .text-danger {
                    color: var(--danger);
                }
                
                .mt-4 {
                    margin-top: 1.5rem;
                }
                
                .mb-4 {
                    margin-bottom: 1.5rem;
                }
                
                @media (max-width: 768px) {
                    .filter-controls {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .attempt-details {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 640px) {
                    .test-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }
                    
                    .attempt-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.25rem;
                    }
                    
                    .attempt-details {
                        grid-template-columns: 1fr;
                    }
                    
                    .attempt-actions {
                        flex-direction: column;
                    }
                    
                    .attempt-actions .btn {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
}

function formatTime(seconds) {
    if (!seconds) return '0m 0s';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

function getScoreColorClass(score) {
    if (score >= 70) return 'text-success';
    if (score >= 40) return 'text-warning';
    return 'text-danger';
}

// Wrapper component with layout
function TestHistoryPage() {
    return (
        <StudentAuthProvider>
            <StudentLayout>
                <TestHistoryPageContent />
            </StudentLayout>
        </StudentAuthProvider>
    );
}

export default TestHistoryPage;