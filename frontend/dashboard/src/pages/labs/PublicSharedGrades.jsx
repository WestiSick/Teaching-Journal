import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function PublicSharedGrades() {
    const { token } = useParams();
    const [sharedData, setSharedData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Use useEffect to fetch the data directly without react-query
    useEffect(() => {
        const fetchSharedGrades = async () => {
            try {
                setLoading(true);
                // Make a direct API call to the shared endpoint using the token
                const response = await axios.get(`/api/labs/shared/${token}`);
                setSharedData(response.data.data);
                setLoading(false);
            } catch (err) {
                console.error('Error loading shared grades:', err);
                setError(err);
                setLoading(false);
            }
        };

        fetchSharedGrades();
    }, [token]);

    // Calculate student averages excluding zeros
    const studentsWithUpdatedAverages = useMemo(() => {
        if (!sharedData || !sharedData.students) return [];

        return sharedData.students.map(student => {
            // Calculate new average excluding zeros
            const nonZeroGrades = student.grades.filter(grade => grade > 0);
            const sum = nonZeroGrades.reduce((acc, grade) => acc + grade, 0);
            const nonZeroAverage = nonZeroGrades.length > 0 ? sum / nonZeroGrades.length : 0;

            return {
                ...student,
                nonZeroAverage // Store the newly calculated average
            };
        });
    }, [sharedData]);

    // Calculate group average based on student non-zero averages
    const groupNonZeroAverage = useMemo(() => {
        if (!studentsWithUpdatedAverages || studentsWithUpdatedAverages.length === 0) return 0;

        const studentsWithNonZeroGrades = studentsWithUpdatedAverages.filter(
            student => student.nonZeroAverage > 0
        );

        if (studentsWithNonZeroGrades.length === 0) return 0;

        const sum = studentsWithNonZeroGrades.reduce(
            (acc, student) => acc + student.nonZeroAverage,
            0
        );

        return sum / studentsWithNonZeroGrades.length;
    }, [studentsWithUpdatedAverages]);

    if (loading) {
        return (
            <div className="public-shared-container">
                <div className="loading-container">
                    <div className="spinner"></div>
                    <p className="loading-text">Loading shared grades...</p>
                </div>
            </div>
        );
    }

    if (error) {
        // Special handling for expired links (410 Gone)
        if (error.response?.status === 410) {
            return (
                <div className="public-shared-container">
                    <div className="error-card">
                        <div className="error-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="9" y1="9" x2="15" y2="15"></line>
                                <line x1="15" y1="9" x2="9" y2="15"></line>
                            </svg>
                        </div>
                        <h1>Shared Link Expired</h1>
                        <p>This shared lab grades link has expired or been deleted.</p>
                        <p className="error-hint">Please contact your teacher for a new link.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className="public-shared-container">
                <div className="error-card">
                    <div className="error-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                    </div>
                    <h1>Error</h1>
                    <p>The shared lab grades could not be loaded.</p>
                    <p className="error-detail">{error.message || 'Unknown error occurred'}</p>
                </div>
            </div>
        );
    }

    if (!sharedData) {
        return (
            <div className="public-shared-container">
                <div className="error-card">
                    <div className="error-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                    </div>
                    <h1>Invalid Link</h1>
                    <p>The shared lab grades link is invalid or has been removed.</p>
                    <p className="error-hint">Please check the URL or contact your teacher.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="public-shared-container">
            <div className="public-shared-card">
                <div className="public-shared-header">
                    <div className="share-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 2v7.31"></path>
                            <path d="M14 9.3V1.99"></path>
                            <path d="M8.5 2h7"></path>
                            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                        </svg>
                    </div>
                    <div className="header-content">
                        <h1>Shared Lab Grades</h1>
                        <h2>{sharedData.subject} - {sharedData.group_name}</h2>
                    </div>
                </div>

                {/* Creator and expiration information - prominently displayed */}
                <div className="share-info-banner">
                    <div className="shared-by">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <div>
                            <span className="info-label">Shared by:</span>
                            <span className="info-value">{sharedData.shared_by}</span>
                        </div>
                    </div>
                    <div className="expires-on">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <div>
                            <span className="info-label">Expires on:</span>
                            <span className="info-value">{new Date(sharedData.expires_at).toLocaleDateString()} at {new Date(sharedData.expires_at).toLocaleTimeString()}</span>
                        </div>
                    </div>
                </div>

                {studentsWithUpdatedAverages.length > 0 ? (
                    <div className="grades-table-container">
                        <table className="grades-table">
                            <thead>
                            <tr>
                                <th className="student-column">Student</th>
                                {Array.from({ length: sharedData.total_labs }, (_, i) => (
                                    <th key={i} className="lab-column">Lab {i + 1}</th>
                                ))}
                                <th className="average-column">Average</th>
                            </tr>
                            </thead>
                            <tbody>
                            {studentsWithUpdatedAverages.map((student) => (
                                <tr key={student.student_id}>
                                    <td className="student-name">{student.student_fio}</td>
                                    {student.grades.map((grade, index) => (
                                        <td key={index} className="grade-cell">
                                            <div className={`lab-grade ${getGradeClass(grade || 0)}`}>
                                                {grade || '–'}
                                            </div>
                                        </td>
                                    ))}
                                    <td className={`average-cell ${getAverageClass(student.nonZeroAverage)}`}>
                                        {student.nonZeroAverage ? student.nonZeroAverage.toFixed(1) : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr>
                                <td><strong>Group Average</strong></td>
                                {Array.from({ length: sharedData.total_labs }, () => (
                                    <td></td>
                                ))}
                                <td className={`group-average ${getAverageClass(groupNonZeroAverage)}`}>
                                    <strong>{groupNonZeroAverage.toFixed(1)}</strong>
                                </td>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>No students or grades to display</p>
                    </div>
                )}

                <div className="share-footer">
                    <p>
                        This is a read-only view of lab grades.
                    </p>
                    <div className="share-dates">
                        <div className="date-item">
                            <span className="date-label">Created:</span>
                            <span className="date-value">{new Date(sharedData.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="date-divider">|</div>
                        <div className="date-item">
                            <span className="date-label">Valid until:</span>
                            <span className="date-value">{new Date(sharedData.expires_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .public-shared-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background-color: var(--bg-dark);
                    color: var(--text-primary);
                }
                
                .loading-container, .error-card, .public-shared-card {
                    max-width: 1000px;
                    width: 100%;
                    margin: 0 auto;
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-lg);
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }
                
                .loading-container {
                    padding: 4rem 2rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                
                .spinner {
                    width: 50px;
                    height: 50px;
                    border: 4px solid var(--bg-dark-tertiary);
                    border-radius: 50%;
                    border-top-color: var(--primary);
                    animation: spin 1s linear infinite;
                    margin-bottom: 1.5rem;
                }
                
                .loading-text {
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                }
                
                .error-card {
                    padding: 3rem 2rem;
                    text-align: center;
                }
                
                .error-icon {
                    color: var(--danger);
                    margin-bottom: 1.5rem;
                }
                
                .error-card h1 {
                    font-size: 1.875rem;
                    margin-bottom: 1rem;
                }
                
                .error-card p {
                    color: var(--text-secondary);
                    margin-bottom: 0.5rem;
                }
                
                .error-hint {
                    margin-top: 1.5rem;
                    color: var(--text-tertiary);
                }
                
                .error-detail {
                    background-color: var(--bg-dark-tertiary);
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    margin-top: 1rem;
                    font-family: monospace;
                    overflow-wrap: break-word;
                }
                
                .public-shared-card {
                    display: flex;
                    flex-direction: column;
                }
                
                .public-shared-header {
                    display: flex;
                    align-items: center;
                    padding: 1.5rem 2rem;
                    background: linear-gradient(to right, var(--primary-darker), var(--primary));
                    color: white;
                }
                
                .share-icon {
                    background-color: rgba(255, 255, 255, 0.1);
                    width: 60px;
                    height: 60px;
                    border-radius: var(--radius-md);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-right: 1.5rem;
                }
                
                .header-content h1 {
                    font-size: 1.75rem;
                    font-weight: 700;
                    margin-bottom: 0.25rem;
                }
                
                .header-content h2 {
                    font-size: 1.125rem;
                    font-weight: 500;
                    opacity: 0.9;
                }
                
                .share-info-banner {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 1.5rem;
                    padding: 1.25rem 2rem;
                    background-color: var(--primary-lighter);
                    color: var(--text-primary);
                }
                
                .shared-by, .expires-on {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                
                .info-label {
                    font-weight: 600;
                    margin-right: 0.5rem;
                }
                
                .info-value {
                    color: var(--primary-light);
                }
                
                .grades-table-container {
                    overflow-x: auto;
                    padding: 0 2rem;
                }
                
                .grades-table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 2rem 0;
                }
                
                .grades-table th {
                    background-color: var(--bg-dark-tertiary);
                    padding: 0.75rem 1rem;
                    text-align: center;
                    font-weight: 600;
                    color: var(--text-secondary);
                }
                
                .grades-table th.student-column {
                    text-align: left;
                }
                
                .grades-table td {
                    padding: 0.75rem 1rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .student-name {
                    font-weight: 500;
                }
                
                .grade-cell {
                    text-align: center;
                }
                
                .lab-grade {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    font-weight: 600;
                }
                
                .grade-0 {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-tertiary);
                }
                
                .grade-1, .grade-2 {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .grade-3 {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .grade-4, .grade-5 {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .average-cell, .group-average {
                    text-align: center;
                    font-weight: 600;
                }
                
                .average-low {
                    color: var(--danger);
                }
                
                .average-medium {
                    color: var(--warning);
                }
                
                .average-high {
                    color: var(--success);
                }
                
                .empty-state {
                    padding: 3rem 2rem;
                    text-align: center;
                    color: var(--text-tertiary);
                }
                
                .empty-state svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .share-footer {
                    padding: 1.5rem 2rem;
                    border-top: 1px solid var(--border-color);
                    color: var(--text-tertiary);
                    text-align: center;
                }
                
                .share-dates {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                    font-size: 0.875rem;
                }
                
                .date-item {
                    display: flex;
                    align-items: center;
                }
                
                .date-label {
                    margin-right: 0.25rem;
                }
                
                .date-divider {
                    color: var(--border-color);
                }
                
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                @media (max-width: 768px) {
                    .public-shared-container {
                        padding: 1rem;
                    }
                    
                    .public-shared-header {
                        padding: 1.25rem;
                        flex-direction: column;
                        text-align: center;
                        gap: 1rem;
                    }
                    
                    .share-icon {
                        margin-right: 0;
                    }
                    
                    .share-info-banner {
                        padding: 1rem;
                        flex-direction: column;
                        gap: 0.75rem;
                    }
                    
                    .grades-table-container {
                        padding: 0 1rem;
                    }
                    
                    .grades-table {
                        margin: 1.5rem 0;
                    }
                    
                    .share-footer {
                        padding: 1.25rem;
                    }
                    
                    .share-dates {
                        flex-direction: column;
                    }
                    
                    .date-divider {
                        display: none;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper functions to determine grade and average classes
function getGradeClass(grade) {
    if (grade === 0) return 'grade-0';
    if (grade <= 2) return 'grade-1';
    if (grade === 3) return 'grade-3';
    return 'grade-4';
}

function getAverageClass(average) {
    if (!average) return '';
    if (average < 3) return 'average-low';
    if (average < 4) return 'average-medium';
    return 'average-high';
}

export default PublicSharedGrades;