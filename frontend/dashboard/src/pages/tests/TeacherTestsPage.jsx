import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminTestsService } from '../../services/testsService';

function TeacherTestsPage() {
    const [filter, setFilter] = useState('all'); // 'all', 'active', 'inactive'

    // Fetch all tests
    const { data, isLoading, error } = useQuery({
        queryKey: ['tests'],
        queryFn: adminTestsService.getAllTests
    });

    const tests = data?.data?.data || [];

    // Filter tests based on active status
    const filteredTests = filter === 'all'
        ? tests
        : tests.filter(test =>
            filter === 'active' ? test.is_active : !test.is_active
        );

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Failed to load tests: {error.message}</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Tests</h1>
                <Link to="/tests/new" className="btn btn-primary">Create New Test</Link>
            </div>

            <div className="card">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <div className="filter-buttons">
                        <button
                            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'} mr-2`}
                            onClick={() => setFilter('all')}
                        >
                            All Tests
                        </button>
                        <button
                            className={`btn ${filter === 'active' ? 'btn-primary' : 'btn-outline'} mr-2`}
                            onClick={() => setFilter('active')}
                        >
                            Active Tests
                        </button>
                        <button
                            className={`btn ${filter === 'inactive' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setFilter('inactive')}
                        >
                            Inactive Tests
                        </button>
                    </div>
                    <div className="test-count">
                        <span className="badge badge-info">{filteredTests.length} tests</span>
                    </div>
                </div>

                {filteredTests.length === 0 ? (
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <h3>No Tests Found</h3>
                        <p>You haven't created any tests yet. Click the button below to create your first test.</p>
                        <Link to="/tests/new" className="btn btn-primary mt-3">Create Test</Link>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Title</th>
                                <th>Subject</th>
                                <th>Questions</th>
                                <th>Status</th>
                                <th>Attempts</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredTests.map(test => (
                                <tr key={test.id}>
                                    <td>{test.title}</td>
                                    <td>{test.subject}</td>
                                    <td>{test.questions_count}</td>
                                    <td>
                                            <span className={`badge ${test.is_active ? 'badge-success' : 'badge-warning'}`}>
                                                {test.is_active ? 'Active' : 'Inactive'}
                                            </span>
                                    </td>
                                    <td>{test.attempts_count} / {test.max_attempts}</td>
                                    <td>{new Date(test.created_at).toLocaleDateString()}</td>
                                    <td>
                                        <div className="d-flex gap-2">
                                            <Link to={`/tests/${test.id}`} className="btn btn-sm btn-outline">
                                                View
                                            </Link>
                                            <Link to={`/tests/${test.id}/edit`} className="btn btn-sm btn-primary">
                                                Edit
                                            </Link>
                                            <Link to={`/tests/${test.id}/statistics`} className="btn btn-sm btn-secondary">
                                                Stats
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <style jsx="true">{`
                .filter-buttons {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--text-tertiary);
                }
                
                .empty-state svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .empty-state h3 {
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
            `}</style>
        </div>
    );
}

export default TeacherTestsPage;