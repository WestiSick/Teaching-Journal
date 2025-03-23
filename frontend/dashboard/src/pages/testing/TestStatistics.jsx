import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testingService } from '../../services/api';

function TestStatistics() {
    const { id } = useParams();

    const { data, isLoading, error } = useQuery({
        queryKey: ['test-statistics', id],
        queryFn: () => testingService.getTestStatistics(id),
    });

    // Also fetch test details to get title, subject etc.
    const { data: testData, isLoading: isTestLoading } = useQuery({
        queryKey: ['test', id],
        queryFn: () => testingService.getTest(id),
    });

    if (isLoading || isTestLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error loading test statistics: {error.message}</div>;
    }

    const statistics = data?.data?.data;
    const test = testData?.data?.data;

    if (!statistics || !test) {
        return <div className="alert alert-warning">Statistics not available for this test</div>;
    }

    return (
        <div>
            <div className="page-header">
                <div className="d-flex align-items-center gap-3">
                    <Link to={`/tests/${id}`} className="btn btn-outline btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span>Back to Test</span>
                    </Link>
                    <h1 className="page-title">Statistics: {test.title}</h1>
                </div>
                <div className="d-flex gap-2">
                    <Link to={`/tests/${id}/attempts`} className="btn btn-outline">
                        View All Attempts
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                    <div className="stats-card-title">Total Questions</div>
                    <div className="stats-card-value">{statistics.total_questions}</div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <div className="stats-card-title">Total Attempts</div>
                    <div className="stats-card-value">{statistics.total_attempts}</div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--accent)' }}>
                    <div className="stats-card-title">Completed Attempts</div>
                    <div className="stats-card-value">{statistics.completed_attempts}</div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--warning)' }}>
                    <div className="stats-card-title">Average Score</div>
                    <div className="stats-card-value">{statistics.avg_score.toFixed(1)}%</div>
                </div>
            </div>

            <div className="card mb-6">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-xl font-semibold">Time Analytics</h2>
                </div>

                <div className="d-flex flex-column gap-3">
                    <div className="stat-row">
                        <div className="stat-label">Average Time per Test</div>
                        <div className="stat-value">{formatTime(statistics.avg_time)}</div>
                    </div>
                    <div className="stat-row">
                        <div className="stat-label">Time per Question</div>
                        <div className="stat-value">{test.time_per_question} seconds (allowed)</div>
                    </div>
                    <div className="stat-row">
                        <div className="stat-label">Actual Avg. Time per Question</div>
                        <div className="stat-value">{(statistics.avg_time / statistics.total_questions).toFixed(1)} seconds</div>
                    </div>
                </div>
            </div>

            <h2 className="text-xl font-semibold mb-4">Question Performance</h2>

            {statistics.question_stats && statistics.question_stats.length > 0 ? (
                <div className="table-container">
                    <table>
                        <thead>
                        <tr>
                            <th>Question</th>
                            <th>Correct %</th>
                            <th>Avg. Time</th>
                            <th>Attempts</th>
                            <th>Difficulty</th>
                        </tr>
                        </thead>
                        <tbody>
                        {statistics.question_stats.map((question, idx) => (
                            <tr key={idx}>
                                <td>
                                    <div className="question-preview">
                                        <span className="question-number">Q{idx + 1}:</span>
                                        <span className="question-text">{question.question_text}</span>
                                    </div>
                                </td>
                                <td>
                                    <div className="d-flex align-items-center gap-2">
                                        <div className="progress" style={{ width: '100px' }}>
                                            <div
                                                className={`progress-bar ${getProgressColorClass(question.correct_percent)}`}
                                                style={{ width: `${question.correct_percent}%` }}
                                            ></div>
                                        </div>
                                        <span>{question.correct_percent.toFixed(1)}%</span>
                                    </div>
                                </td>
                                <td>{question.avg_time_to_answer.toFixed(1)} sec</td>
                                <td>{question.attempt_count}</td>
                                <td>
                                        <span className={`badge ${getDifficultyBadgeClass(question.correct_percent)}`}>
                                            {getDifficultyLabel(question.correct_percent)}
                                        </span>
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="card">
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h3>No Question Statistics Available</h3>
                        <p>This test hasn't been taken by any students yet</p>
                    </div>
                </div>
            )}

            <div className="mt-6">
                <Link to={`/tests/${id}`} className="btn btn-outline">
                    Back to Test
                </Link>
            </div>

            <style jsx="true">{`
                .stat-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 0.75rem 0;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .stat-row:last-child {
                    border-bottom: none;
                }
                
                .stat-label {
                    color: var(--text-secondary);
                    font-weight: 500;
                }
                
                .stat-value {
                    color: var(--text-primary);
                    font-weight: 600;
                }
                
                .question-preview {
                    display: flex;
                    gap: 0.5rem;
                    max-width: 400px;
                }
                
                .question-number {
                    color: var(--text-tertiary);
                    font-weight: 600;
                    flex-shrink: 0;
                }
                
                .question-text {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .progress {
                    height: 0.5rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-full);
                    overflow: hidden;
                }
                
                .progress-bar {
                    height: 100%;
                    border-radius: var(--radius-full);
                }
                
                .progress-bar-success {
                    background-color: var(--success);
                }
                
                .progress-bar-warning {
                    background-color: var(--warning);
                }
                
                .progress-bar-danger {
                    background-color: var(--danger);
                }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 2rem;
                    color: var(--text-tertiary);
                    text-align: center;
                }
                
                .empty-state svg {
                    color: var(--text-tertiary);
                    margin-bottom: 1.5rem;
                    opacity: 0.6;
                }
                
                @media (max-width: 768px) {
                    .grid-cols-4 {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .question-preview {
                        max-width: 200px;
                    }
                }
                
                @media (max-width: 640px) {
                    .grid-cols-4 {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper functions
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
}

function getProgressColorClass(percentage) {
    if (percentage >= 70) return 'progress-bar-success';
    if (percentage >= 40) return 'progress-bar-warning';
    return 'progress-bar-danger';
}

function getDifficultyBadgeClass(percentage) {
    if (percentage >= 70) return 'badge-success';
    if (percentage >= 40) return 'badge-warning';
    return 'badge-danger';
}

function getDifficultyLabel(percentage) {
    if (percentage >= 70) return 'Easy';
    if (percentage >= 40) return 'Medium';
    return 'Hard';
}

export default TestStatistics;