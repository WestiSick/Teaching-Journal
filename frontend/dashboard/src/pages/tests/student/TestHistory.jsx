import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { studentTestsService } from '../../../services/testsService';

function TestHistory() {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);
    const studentId = localStorage.getItem('testStudentId');
    const [filter, setFilter] = useState('all'); // 'all', 'completed', 'incomplete'
    const [subjectFilter, setSubjectFilter] = useState('');
    const [subjects, setSubjects] = useState([]);

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

    // Fetch test history
    const { data, isLoading, error } = useQuery({
        queryKey: ['test-history', studentId],
        queryFn: () => studentTestsService.getTestHistory(studentId),
        enabled: !!studentId,
        onSuccess: (response) => {
            const attempts = response.data.data.attempts || [];
            // Extract unique subjects for filtering
            const uniqueSubjects = [...new Set(attempts.map(attempt => attempt.subject))];
            setSubjects(uniqueSubjects);
        }
    });

    const testHistory = data?.data?.data?.attempts || [];

    // Apply filters
    const filteredHistory = testHistory.filter(attempt => {
        const matchesStatus = filter === 'all' ||
            (filter === 'completed' && attempt.completed) ||
            (filter === 'incomplete' && !attempt.completed);

        const matchesSubject = subjectFilter === '' || attempt.subject === subjectFilter;

        return matchesStatus && matchesSubject;
    });

    const handleLogout = () => {
        localStorage.removeItem('testStudentId');
        localStorage.removeItem('testStudentInfo');
        navigate('/tests/student/login');
    };

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Failed to load test history: {error.message}</div>;
    }

    if (!studentInfo) {
        return null; // Will redirect in useEffect
    }

    return (
        <div className="test-history-container">
            <div className="history-header">
                <div className="history-title">
                    <h1>Test History</h1>
                    <div className="student-info">
                        {studentInfo.fio} ({studentInfo.email})
                    </div>
                </div>
                <div className="header-actions">
                    <Link to="/tests/student" className="btn btn-secondary">Back to Tests</Link>
                    <button
                        className="btn btn-outline"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                </div>
            </div>

            <div className="filter-container">
                <div className="filter-group">
                    <label htmlFor="statusFilter">Status:</label>
                    <select
                        id="statusFilter"
                        className="form-control"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    >
                        <option value="all">All Attempts</option>
                        <option value="completed">Completed</option>
                        <option value="incomplete">Incomplete</option>
                    </select>
                </div>

                <div className="filter-group">
                    <label htmlFor="subjectFilter">Subject:</label>
                    <select
                        id="subjectFilter"
                        className="form-control"
                        value={subjectFilter}
                        onChange={(e) => setSubjectFilter(e.target.value)}
                    >
                        <option value="">All Subjects</option>
                        {subjects.map((subject, index) => (
                            <option key={index} value={subject}>{subject}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-count">
                    <span className="badge badge-info">{filteredHistory.length} attempts</span>
                </div>
            </div>

            {filteredHistory.length === 0 ? (
                <div className="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <h3>No Test Attempts Found</h3>
                    <p>You haven't taken any tests that match the selected filters.</p>
                    {(filter !== 'all' || subjectFilter !== '') && (
                        <button
                            className="btn btn-outline mt-3"
                            onClick={() => {
                                setFilter('all');
                                setSubjectFilter('');
                            }}
                        >
                            Clear Filters
                        </button>
                    )}
                </div>
            ) : (
                <div className="history-list">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Test</th>
                                <th>Subject</th>
                                <th>Date</th>
                                <th>Score</th>
                                <th>Status</th>
                                <th>Duration</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredHistory.map(attempt => (
                                <tr key={attempt.attempt_id}>
                                    <td>{attempt.test_title}</td>
                                    <td>
                                        <span className="subject-badge">{attempt.subject}</span>
                                    </td>
                                    <td>{new Date(attempt.start_time).toLocaleString()}</td>
                                    <td>
                                            <span className={`score-badge ${getScoreBadgeClass(attempt.score_percent)}`}>
                                                {attempt.score_percent.toFixed(1)}%
                                            </span>
                                    </td>
                                    <td>
                                            <span className={`status-badge ${attempt.completed ? 'status-completed' : 'status-incomplete'}`}>
                                                {attempt.completed ? 'Completed' : 'Incomplete'}
                                            </span>
                                    </td>
                                    <td>{formatDuration(attempt.duration_seconds)}</td>
                                    <td>
                                        <Link to={`/tests/student/results/${attempt.attempt_id}`} className="btn btn-sm btn-outline">
                                            View Results
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <div className="performance-summary">
                <h2 className="section-title">Performance Summary</h2>

                <div className="summary-grid">
                    <div className="summary-card">
                        <div className="summary-title">Average Score</div>
                        <div className="summary-value">
                            {calculateAverageScore(filteredHistory).toFixed(1)}%
                        </div>
                    </div>

                    <div className="summary-card">
                        <div className="summary-title">Total Attempts</div>
                        <div className="summary-value">{filteredHistory.length}</div>
                    </div>

                    <div className="summary-card">
                        <div className="summary-title">Completed Tests</div>
                        <div className="summary-value">
                            {filteredHistory.filter(attempt => attempt.completed).length}
                        </div>
                    </div>

                    <div className="summary-card">
                        <div className="summary-title">Average Duration</div>
                        <div className="summary-value">
                            {formatDuration(calculateAverageDuration(filteredHistory))}
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .test-history-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                
                .history-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .history-title h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }
                
                .student-info {
                    color: var(--text-tertiary);
                }
                
                .header-actions {
                    display: flex;
                    gap: 0.75rem;
                }
                
                .filter-container {
                    display: flex;
                    align-items: flex-end;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.375rem;
                }
                
                .filter-group label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .filter-count {
                    margin-left: auto;
                    align-self: center;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem;
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    color: var(--text-tertiary);
                    margin-bottom: 2rem;
                }
                
                .empty-state svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .empty-state h3 {
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                
                .subject-badge {
                    display: inline-block;
                    padding: 0.25rem 0.75rem;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
                }
                
                .score-badge {
                    font-weight: 600;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                    font-size: 0.75rem;
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
                
                .table-container {
                    margin-bottom: 2rem;
                }
                
                .performance-summary {
                    margin-top: 2rem;
                }
                
                .section-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 1.5rem;
                }
                
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1.5rem;
                }
                
                .summary-card {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    text-align: center;
                    border: 1px solid var(--border-color);
                }
                
                .summary-title {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }
                
                .summary-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                }
                
                .mt-3 {
                    margin-top: 0.75rem;
                }
                
                @media (max-width: 768px) {
                    .test-history-container {
                        padding: 1rem;
                    }
                    
                    .history-header {
                        flex-direction: column;
                        gap: 1rem;
                    }
                    
                    .header-actions {
                        width: 100%;
                    }
                    
                    .filter-container {
                        flex-direction: column;
                        align-items: stretch;
                        gap: 1rem;
                    }
                    
                    .filter-count {
                        margin: 0;
                    }
                    
                    .summary-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 576px) {
                    .summary-grid {
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

function getScoreBadgeClass(score) {
    if (score >= 80) return 'score-badge-high';
    if (score >= 60) return 'score-badge-medium';
    return 'score-badge-low';
}

function calculateAverageScore(attempts) {
    if (!attempts || attempts.length === 0) return 0;

    const totalScore = attempts.reduce((sum, attempt) => sum + attempt.score_percent, 0);
    return totalScore / attempts.length;
}

function calculateAverageDuration(attempts) {
    if (!attempts || attempts.length === 0) return 0;

    const completedAttempts = attempts.filter(attempt => attempt.completed);
    if (completedAttempts.length === 0) return 0;

    const totalDuration = completedAttempts.reduce((sum, attempt) => sum + attempt.duration_seconds, 0);
    return totalDuration / completedAttempts.length;
}

export default TestHistory;