import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { testingService } from '../../../services/api';
import { StudentAuthProvider, useStudentAuth } from '../../../context/StudentAuthContext';
import StudentLayout from './StudentLayout';

function TestItem({ test, onStartTest }) {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="test-item">
            <div className="test-header">
                <div className="test-title-section">
                    <h3 className="test-title">{test.title}</h3>
                    <div className="test-badges">
                        <span className="badge badge-info">{test.subject}</span>
                        {test.can_take ? (
                            <span className="badge badge-success">Available</span>
                        ) : (
                            <span className="badge badge-danger">No Attempts Left</span>
                        )}
                    </div>
                </div>
                <div className="test-actions">
                    <button
                        className="btn-toggle"
                        onClick={() => setIsExpanded(!isExpanded)}
                        aria-label={isExpanded ? "Show less" : "Show more"}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={isExpanded ? "rotate-180" : ""}
                        >
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
            </div>

            {isExpanded && (
                <div className="test-details">
                    <div className="test-info">
                        <div className="info-item">
                            <div className="info-label">Description</div>
                            <div className="info-value">{test.description || 'No description provided'}</div>
                        </div>

                        <div className="info-grid">
                            <div className="info-item">
                                <div className="info-label">Questions</div>
                                <div className="info-value">{test.question_count}</div>
                            </div>

                            <div className="info-item">
                                <div className="info-label">Time per Question</div>
                                <div className="info-value">{test.time_per_question} seconds</div>
                            </div>

                            <div className="info-item">
                                <div className="info-label">Teacher</div>
                                <div className="info-value">{test.teacher_name}</div>
                            </div>

                            <div className="info-item">
                                <div className="info-label">Best Score</div>
                                <div className="info-value">
                                    {test.best_score > 0 ? `${test.best_score.toFixed(1)}%` : 'Not attempted'}
                                </div>
                            </div>

                            <div className="info-item">
                                <div className="info-label">Attempts</div>
                                <div className="info-value">
                                    {test.attempts_made} of {test.max_attempts} used
                                    {test.attempts_possible > 0 && ` (${test.attempts_possible} remaining)`}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="test-footer">
                        <button
                            className="btn btn-primary"
                            disabled={!test.can_take}
                            onClick={() => onStartTest(test.id)}
                        >
                            {test.can_take ? 'Start Test' : 'No Attempts Left'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

function StudentTestsPageContent() {
    const navigate = useNavigate();
    const { currentStudent } = useStudentAuth();

    // Fetch available tests
    const { data, isLoading, error } = useQuery({
        queryKey: ['available-tests'],
        queryFn: () => {
            console.log('Fetching available tests, token:',
                localStorage.getItem('studentToken') ?
                    localStorage.getItem('studentToken').substring(0, 15) + '...' :
                    'No token');
            console.log('Current student info:', currentStudent);

            return testingService.getAvailableTests()
                .then(response => {
                    console.log('Tests response:', response.data);
                    return response;
                })
                .catch(err => {
                    console.error('Error fetching tests:', err.response?.data || err.message);
                    throw err;
                });
        },
    });

    // Start test mutation
    const startTestMutation = useMutation({
        mutationFn: (testId) => testingService.startTest(testId),
        onSuccess: (response) => {
            const attemptId = response.data.data.attempt_id;
            navigate(`/student-testing/attempt/${attemptId}`);
        },
        onError: (error) => {
            console.error('Error starting test:', error.response?.data || error.message);
            // You could add a toast notification here
        }
    });

    const tests = data?.data?.data || [];

    // Start test handler
    const handleStartTest = (testId) => {
        startTestMutation.mutate(testId);
    };

    if (isLoading) {
        return (
            <div className="loading-container">
                <div className="spinner"></div>
                <p>Loading available tests...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="error-container">
                <div className="alert alert-danger">
                    <h3>Error Loading Tests</h3>
                    <p>{error.message || 'Failed to load available tests. Please try again later.'}</p>
                    <div className="error-details">
                        <pre>{JSON.stringify(error.response?.data || {}, null, 2)}</pre>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="student-tests-page">
            <div className="page-header">
                <h1>Available Tests</h1>
                <p className="welcome-text">Welcome back, {currentStudent?.fio || 'Student'}</p>
            </div>

            {tests.length === 0 ? (
                <div className="empty-state">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                    <h2>No Tests Available</h2>
                    <p>There are no tests available for you at this time. This could be because:</p>
                    <ul className="text-left my-3">
                        <li>No tests have been assigned to your group yet</li>
                        <li>No active tests are currently available</li>
                        <li>All available tests have already been completed</li>
                    </ul>
                    <p>Please check with your instructor if you believe this is an error.</p>
                    <div className="mt-4">
                        <p>Your current group: <strong>{currentStudent?.group || 'Not assigned'}</strong></p>
                    </div>
                </div>
            ) : (
                <div className="tests-list">
                    {tests.map((test) => (
                        <TestItem
                            key={test.id}
                            test={test}
                            onStartTest={handleStartTest}
                        />
                    ))}
                </div>
            )}

            <style jsx="true">{`
                .student-tests-page {
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
                
                .tests-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .test-item {
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
                
                .test-title-section {
                    display: flex;
                    flex-direction: column;
                }
                
                .test-title {
                    margin: 0;
                    font-size: 1.25rem;
                    font-weight: 600;
                }
                
                .test-badges {
                    display: flex;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                }
                
                .test-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .btn-toggle {
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                    padding: 0.5rem;
                    border-radius: var(--radius-full);
                    transition: all 0.2s ease;
                }
                
                .btn-toggle:hover {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-primary);
                }
                
                .rotate-180 {
                    transform: rotate(180deg);
                }
                
                .test-details {
                    padding: 1.5rem;
                }
                
                .test-info {
                    margin-bottom: 1.5rem;
                }
                
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    margin-top: 1rem;
                }
                
                .info-item {
                    margin-bottom: 0.75rem;
                }
                
                .info-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }
                
                .info-value {
                    color: var(--text-primary);
                }
                
                .test-footer {
                    display: flex;
                    justify-content: flex-end;
                    padding-top: 1rem;
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
                
                .empty-state ul {
                    text-align: left;
                    margin: 1rem 0;
                    color: var(--text-secondary);
                }
                
                .text-left {
                    text-align: left;
                }
                
                .my-3 {
                    margin-top: 1rem;
                    margin-bottom: 1rem;
                }
                
                .mt-4 {
                    margin-top: 1.5rem;
                }
                
                .loading-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 2rem;
                    text-align: center;
                }
                
                .error-details {
                    margin-top: 1rem;
                    padding: 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                    width: 100%;
                    overflow-x: auto;
                    text-align: left;
                }
                
                .error-details pre {
                    font-size: 0.75rem;
                    color: var(--danger);
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
                
                @media (max-width: 768px) {
                    .info-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 640px) {
                    .info-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .test-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .test-actions {
                        margin-top: 1rem;
                        align-self: flex-end;
                    }
                }
            `}</style>
        </div>
    );
}

// Wrapper component with layout
function StudentTestsPage() {
    return (
        <StudentAuthProvider>
            <StudentLayout>
                <StudentTestsPageContent />
            </StudentLayout>
        </StudentAuthProvider>
    );
}

export default StudentTestsPage;