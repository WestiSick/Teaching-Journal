import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { testingService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function TestsPage() {
    const { currentUser } = useAuth();
    const [subjectFilter, setSubjectFilter] = useState('');

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['tests', subjectFilter],
        queryFn: () => testingService.getTests({ subject: subjectFilter }),
    });

    const tests = data?.data?.data || [];
    const subjects = [...new Set(tests.map(test => test.subject))];

    // Function to toggle test active status
    const toggleTestActive = async (id, currentStatus) => {
        try {
            await testingService.toggleTestActive(id, !currentStatus);
            refetch();
        } catch (err) {
            console.error('Error toggling test status:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error loading tests: {error.message}</div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Tests</h1>
                    <p className="text-secondary">Manage your tests and quizzes</p>
                </div>
                <div className="d-flex gap-3">
                    <div className="form-group mb-0">
                        <select
                            className="form-control"
                            value={subjectFilter}
                            onChange={(e) => setSubjectFilter(e.target.value)}
                        >
                            <option value="">All Subjects</option>
                            {subjects.map((subject, idx) => (
                                <option key={idx} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>
                    <Link to="/tests/new" className="btn btn-primary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        <span>Create Test</span>
                    </Link>
                </div>
            </div>

            {tests.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <h3>No Tests Found</h3>
                        <p>Create your first test to get started</p>
                        <Link to="/tests/new" className="btn btn-primary mt-3">Create Test</Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tests.map((test) => (
                        <div key={test.id} className="card">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <div className="d-flex align-items-center gap-2">
                                    <h2 className="card-title mb-0">{test.title}</h2>
                                    {test.active ? (
                                        <span className="badge badge-success">Active</span>
                                    ) : (
                                        <span className="badge badge-danger">Inactive</span>
                                    )}
                                </div>
                                <div className="d-flex gap-2">
                                    <button
                                        className={`btn btn-sm ${test.active ? 'btn-warning' : 'btn-success'}`}
                                        onClick={() => toggleTestActive(test.id, test.active)}
                                    >
                                        {test.active ? 'Deactivate' : 'Activate'}
                                    </button>
                                    <Link to={`/tests/${test.id}`} className="btn btn-sm btn-outline">
                                        View
                                    </Link>
                                    <Link to={`/tests/${test.id}/edit`} className="btn btn-sm btn-outline">
                                        Edit
                                    </Link>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mb-4">
                                <div className="test-detail">
                                    <div className="detail-label">Subject</div>
                                    <div className="detail-value">{test.subject}</div>
                                </div>
                                <div className="test-detail">
                                    <div className="detail-label">Questions</div>
                                    <div className="detail-value">{test.questions_count}</div>
                                </div>
                                <div className="test-detail">
                                    <div className="detail-label">Max Attempts</div>
                                    <div className="detail-value">{test.max_attempts}</div>
                                </div>
                                <div className="test-detail">
                                    <div className="detail-label">Time per Question</div>
                                    <div className="detail-value">{test.time_per_question} seconds</div>
                                </div>
                                <div className="test-detail">
                                    <div className="detail-label">Created</div>
                                    <div className="detail-value">{new Date(test.created_at).toLocaleDateString()}</div>
                                </div>
                                <div className="test-detail">
                                    <div className="detail-label">Last Updated</div>
                                    <div className="detail-value">{new Date(test.updated_at).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <div className="mb-3">
                                <div className="detail-label">Description</div>
                                <div className="detail-value">{test.description || 'No description provided'}</div>
                            </div>
                            <div className="mb-3">
                                <div className="detail-label">Groups</div>
                                <div className="groups-list">
                                    {test.groups_allowed && test.groups_allowed.length > 0 ? (
                                        <div className="d-flex flex-wrap gap-2">
                                            {test.groups_allowed.map((group, idx) => (
                                                <span key={idx} className="badge badge-info">{group}</span>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-tertiary">No groups assigned</div>
                                    )}
                                </div>
                            </div>
                            <div className="d-flex gap-2 mt-4">
                                <Link to={`/tests/${test.id}/statistics`} className="btn btn-sm btn-outline">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 3v18h18"></path>
                                        <path d="M18 17V9"></path>
                                        <path d="M13 17V5"></path>
                                        <path d="M8 17v-3"></path>
                                    </svg>
                                    <span>Statistics</span>
                                </Link>
                                <Link to={`/tests/${test.id}/attempts`} className="btn btn-sm btn-outline">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                                    </svg>
                                    <span>Attempts</span>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx="true">{`
                .test-detail {
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                }
                
                .detail-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.25rem;
                }
                
                .detail-value {
                    font-weight: 500;
                    color: var(--text-primary);
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
                
                .groups-list {
                    margin-top: 0.5rem;
                }
                
                @media (max-width: 768px) {
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .grid-cols-3 {
                        grid-template-columns: repeat(2, 1fr);
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

export default TestsPage;