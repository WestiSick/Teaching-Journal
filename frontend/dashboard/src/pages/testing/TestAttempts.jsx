import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testingService } from '../../services/api';

function TestAttempts() {
    const { id } = useParams();
    const [filter, setFilter] = useState('all'); // 'all', 'completed', 'incomplete'

    const { data, isLoading, error } = useQuery({
        queryKey: ['test-attempts', id],
        queryFn: () => testingService.getTestAttempts(id),
    });

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
        return <div className="alert alert-danger">Error loading test attempts: {error.message}</div>;
    }

    const attempts = data?.data?.data || [];
    const test = testData?.data?.data;

    // Apply filter
    const filteredAttempts = attempts.filter(attempt => {
        if (filter === 'all') return true;
        if (filter === 'completed') return attempt.completed;
        if (filter === 'incomplete') return !attempt.completed;
        return true;
    });

    // Group attempts by student
    const attemptsByStudent = filteredAttempts.reduce((acc, attempt) => {
        if (!acc[attempt.student_id]) {
            acc[attempt.student_id] = {
                student_id: attempt.student_id,
                student_name: attempt.student_name,
                group_name: attempt.group_name,
                attempts: []
            };
        }
        acc[attempt.student_id].attempts.push(attempt);
        return acc;
    }, {});

    // Calculate some statistics
    const totalAttempts = attempts.length;
    const completedAttempts = attempts.filter(a => a.completed).length;
    const avgScore = attempts.length > 0
        ? attempts.filter(a => a.completed).reduce((sum, a) => sum + a.score, 0) /
        (attempts.filter(a => a.completed).length || 1)
        : 0;

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
                    <h1 className="page-title">Test Attempts: {test?.title}</h1>
                </div>
                <div className="d-flex gap-2">
                    <Link to={`/tests/${id}/statistics`} className="btn btn-outline">
                        View Statistics
                    </Link>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="info-card">
                    <div className="info-card-title">Total Attempts</div>
                    <div className="info-card-value">{totalAttempts}</div>
                </div>

                <div className="info-card">
                    <div className="info-card-title">Completed Attempts</div>
                    <div className="info-card-value">{completedAttempts} ({totalAttempts > 0 ? ((completedAttempts / totalAttempts) * 100).toFixed(0) : 0}%)</div>
                </div>

                <div className="info-card">
                    <div className="info-card-title">Average Score</div>
                    <div className="info-card-value">{avgScore.toFixed(1)}%</div>
                </div>
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
                    Showing {filteredAttempts.length} {filter !== 'all' ? `${filter}` : ''} attempt{filteredAttempts.length !== 1 ? 's' : ''}
                </div>
            </div>

            {filteredAttempts.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h3>No Attempts Found</h3>
                        <p>
                            {filter === 'all'
                                ? 'This test has not been attempted by any students yet.'
                                : `No ${filter} attempts found for this test.`}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="student-attempts-list">
                    {Object.values(attemptsByStudent).map((studentData) => (
                        <div key={studentData.student_id} className="card mb-4">
                            <div className="student-info mb-3">
                                <div className="student-name">
                                    <h3 className="mb-0">{studentData.student_name}</h3>
                                    <span className="badge badge-info">{studentData.group_name}</span>
                                </div>
                                <div className="attempts-count">
                                    {studentData.attempts.length} attempt{studentData.attempts.length !== 1 ? 's' : ''}
                                </div>
                            </div>

                            <div className="table-container">
                                <table>
                                    <thead>
                                    <tr>
                                        <th>Attempt #</th>
                                        <th>Started</th>
                                        <th>Status</th>
                                        <th>Score</th>
                                        <th>Time Spent</th>
                                        <th>Correct</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {studentData.attempts.map((attempt, idx) => (
                                        <tr key={attempt.id}>
                                            <td>{idx + 1}</td>
                                            <td>{new Date(attempt.started_at).toLocaleString()}</td>
                                            <td>
                                                {attempt.completed ? (
                                                    <span className="badge badge-success">Completed</span>
                                                ) : (
                                                    <span className="badge badge-warning">In Progress</span>
                                                )}
                                            </td>
                                            <td>
                                                {attempt.completed ? (
                                                    <span className={`${getScoreColorClass(attempt.score)}`}>
                                                            {attempt.score.toFixed(1)}%
                                                        </span>
                                                ) : (
                                                    <span className="text-tertiary">-</span>
                                                )}
                                            </td>
                                            <td>{formatTime(attempt.total_time)}</td>
                                            <td>
                                                {attempt.correct_answers} / {attempt.total_questions}
                                                {attempt.completed && (
                                                    <span className="text-tertiary"> ({((attempt.correct_answers / attempt.total_questions) * 100).toFixed(0)}%)</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="mt-6">
                <Link to={`/tests/${id}`} className="btn btn-outline">
                    Back to Test
                </Link>
            </div>

            <style jsx="true">{`
                .info-card {
                    padding: 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                }
                
                .info-card-title {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }
                
                .info-card-value {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .filter-controls {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .filter-info {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                }
                
                .student-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .student-name {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .attempts-count {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
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
                
                .text-success {
                    color: var(--success);
                }
                
                .text-warning {
                    color: var(--warning);
                }
                
                .text-danger {
                    color: var(--danger);
                }
                
                @media (max-width: 768px) {
                    .grid-cols-3 {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .filter-controls {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .student-info {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }
                }
                
                @media (max-width: 640px) {
                    .grid-cols-3 {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper functions
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

export default TestAttempts;