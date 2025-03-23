import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { adminTestsService } from '../../services/testsService';

function TestStatistics() {
    const { id } = useParams();

    // Fetch test statistics
    const { data, isLoading, error } = useQuery({
        queryKey: ['test-statistics', id],
        queryFn: () => adminTestsService.getTestStatistics(id)
    });

    const stats = data?.data?.data;

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Failed to load test statistics: {error.message}</div>;
    }

    if (!stats) {
        return <div className="alert alert-warning">No statistics found for this test</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Test Statistics</h1>
                <Link to={`/tests/${id}`} className="btn btn-secondary">Back to Test</Link>
            </div>

            <div className="test-info card mb-6">
                <div className="test-header">
                    <h2 className="test-title">{stats.test_info.title}</h2>
                    <div className="test-meta">
                        <span className="test-subject">{stats.test_info.subject}</span>
                        <span className={`test-status ${stats.test_info.is_active ? 'status-active' : 'status-inactive'}`}>
                            {stats.test_info.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stats-card">
                    <div className="stats-card-title">Total Attempts</div>
                    <div className="stats-card-value">{stats.overall_stats.total_attempts}</div>
                </div>

                <div className="stats-card">
                    <div className="stats-card-title">Completed Attempts</div>
                    <div className="stats-card-value">{stats.overall_stats.completed_count}</div>
                </div>

                <div className="stats-card">
                    <div className="stats-card-title">Average Score</div>
                    <div className="stats-card-value">{stats.overall_stats.average_score.toFixed(1)}%</div>
                </div>

                <div className="stats-card">
                    <div className="stats-card-title">Average Duration</div>
                    <div className="stats-card-value">{formatDuration(stats.overall_stats.average_duration)}</div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-8">
                    <div className="card mb-6">
                        <h3 className="text-xl font-semibold mb-4">Question Performance</h3>

                        <div className="table-container">
                            <table className="table">
                                <thead>
                                <tr>
                                    <th>Question</th>
                                    <th>Type</th>
                                    <th>Correct %</th>
                                    <th>Attempted</th>
                                    <th>Avg. Time</th>
                                </tr>
                                </thead>
                                <tbody>
                                {stats.question_stats.map((question) => (
                                    <tr key={question.question_id}>
                                        <td className="question-cell">
                                            <div className="question-position">Q{question.position}</div>
                                            <div className="question-text">{truncateText(question.question_text, 60)}</div>
                                        </td>
                                        <td>{formatQuestionType(question.question_type)}</td>
                                        <td>
                                            <div className="progress-indicator">
                                                <div className="progress">
                                                    <div
                                                        className={`progress-bar ${getProgressBarClass(question.correct_percent)}`}
                                                        style={{ width: `${question.correct_percent}%` }}
                                                    ></div>
                                                </div>
                                                <div className="progress-value">{question.correct_percent.toFixed(1)}%</div>
                                            </div>
                                        </td>
                                        <td>{question.attempted_count}</td>
                                        <td>{formatDuration(question.average_time_spent)}</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-span-4">
                    <div className="card mb-6">
                        <h3 className="text-xl font-semibold mb-4">Student Performance</h3>

                        {stats.student_performance.length === 0 ? (
                            <div className="empty-state">
                                <p>No student has attempted this test yet.</p>
                            </div>
                        ) : (
                            <div className="student-performance-list">
                                {stats.student_performance.map((student) => (
                                    <div key={student.student_id} className="student-performance-item">
                                        <div className="student-info">
                                            <div className="student-name">{student.student_name}</div>
                                            <div className="student-meta">
                                                {student.attempt_count} {student.attempt_count === 1 ? 'attempt' : 'attempts'}
                                                <span className="meta-separator">•</span>
                                                Last: {formatDate(student.last_attempt)}
                                            </div>
                                        </div>
                                        <div className="student-score">
                                            <div className={`score-badge ${getScoreBadgeClass(student.highest_score)}`}>
                                                {student.highest_score}%
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="card">
                        <h3 className="text-xl font-semibold mb-4">Completion Rate</h3>

                        <div className="completion-chart">
                            <div className="chart-container">
                                <div className="donut-chart">
                                    <div className="donut-hole"></div>
                                    <div
                                        className="donut-ring"
                                        style={{
                                            background: `conic-gradient(
                                                var(--success) 0% ${(stats.overall_stats.completed_count / Math.max(stats.overall_stats.total_attempts, 1)) * 100}%, 
                                                var(--warning) ${(stats.overall_stats.completed_count / Math.max(stats.overall_stats.total_attempts, 1)) * 100}% 100%
                                            )`
                                        }}
                                    ></div>
                                </div>
                                <div className="chart-labels">
                                    <div className="chart-label">
                                        <div className="label-color" style={{ backgroundColor: 'var(--success)' }}></div>
                                        <div className="label-text">Completed</div>
                                        <div className="label-value">{stats.overall_stats.completed_count}</div>
                                    </div>
                                    <div className="chart-label">
                                        <div className="label-color" style={{ backgroundColor: 'var(--warning)' }}></div>
                                        <div className="label-text">Incomplete</div>
                                        <div className="label-value">{stats.overall_stats.total_attempts - stats.overall_stats.completed_count}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="chart-summary">
                                <div className="summary-label">Completion Rate</div>
                                <div className="summary-value">
                                    {stats.overall_stats.total_attempts === 0
                                        ? '0%'
                                        : `${((stats.overall_stats.completed_count / stats.overall_stats.total_attempts) * 100).toFixed(1)}%`
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .test-header {
                    margin-bottom: 1rem;
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
                }
                
                .test-subject {
                    font-weight: 500;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                }
                
                .test-status {
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
                    font-size: 0.875rem;
                }
                
                .status-active {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .status-inactive {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .stats-card {
                    background-color: var(--bg-card);
                    padding: 1.5rem;
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border-color);
                    border-left: 4px solid var(--primary);
                    transition: transform var(--transition-normal) ease, box-shadow var(--transition-normal) ease;
                }
                
                .stats-card:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-lg);
                }
                
                .stats-card-title {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                }
                
                .stats-card-value {
                    font-size: 1.75rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                
                .question-cell {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .question-position {
                    font-weight: 600;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius-md);
                    white-space: nowrap;
                }
                
                .progress-indicator {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .progress {
                    height: 0.5rem;
                    width: 100px;
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
                
                .progress-value {
                    font-size: 0.875rem;
                    font-weight: 500;
                    min-width: 45px;
                }
                
                .empty-state {
                    text-align: center;
                    color: var(--text-tertiary);
                    padding: 2rem 0;
                }
                
                .student-performance-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .student-performance-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                }
                
                .student-name {
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                }
                
                .student-meta {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .meta-separator {
                    margin: 0 0.375rem;
                }
                
                .score-badge {
                    font-weight: 600;
                    padding: 0.25rem 0.75rem;
                    border-radius: var(--radius-full);
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
                
                .completion-chart {
                    padding: 1rem;
                }
                
                .chart-container {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .donut-chart {
                    position: relative;
                    width: 120px;
                    height: 120px;
                }
                
                .donut-hole {
                    position: absolute;
                    width: 80px;
                    height: 80px;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background-color: var(--bg-card);
                    border-radius: 50%;
                }
                
                .donut-ring {
                    width: 100%;
                    height: 100%;
                    border-radius: 50%;
                }
                
                .chart-labels {
                    flex: 1;
                }
                
                .chart-label {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.5rem;
                }
                
                .label-color {
                    width: 12px;
                    height: 12px;
                    border-radius: 2px;
                }
                
                .label-text {
                    flex: 1;
                    font-size: 0.875rem;
                }
                
                .label-value {
                    font-weight: 600;
                }
                
                .chart-summary {
                    text-align: center;
                    background-color: var(--bg-dark-tertiary);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                }
                
                .summary-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }
                
                .summary-value {
                    font-size: 1.5rem;
                    font-weight: 700;
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

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatQuestionType(type) {
    if (!type) return '';
    return type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getProgressBarClass(percent) {
    if (percent >= 70) return 'progress-bar-success';
    if (percent >= 40) return 'progress-bar-warning';
    return 'progress-bar-danger';
}

function getScoreBadgeClass(score) {
    if (score >= 80) return 'score-badge-high';
    if (score >= 60) return 'score-badge-medium';
    return 'score-badge-low';
}

function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString();
}

export default TestStatistics;