import { Link, Navigate } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from '../../../context/StudentAuthContext';

// Main portal component
function StudentTestPortalContent() {
    const { isAuthenticated, currentStudent } = useStudentAuth();

    // Redirect to tests page if already logged in
    if (isAuthenticated) {
        return <Navigate to="/student-testing/tests" replace />;
    }

    return (
        <div className="student-portal">
            <div className="portal-container">
                <div className="portal-header">
                    <div className="portal-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <h1>Student Testing Portal</h1>
                    </div>
                </div>

                <div className="portal-card">
                    <div className="portal-card-content">
                        <h2>Welcome to the Student Testing Portal</h2>
                        <p>
                            This portal allows you to take tests assigned by your teachers.
                            Please log in with your student credentials or register if you don't have an account yet.
                        </p>

                        <div className="portal-actions">
                            <Link to="/student-testing/login" className="btn btn-primary">
                                Login
                            </Link>
                            <Link to="/student-testing/register" className="btn btn-outline">
                                Register
                            </Link>
                        </div>
                    </div>
                </div>

                <div className="portal-footer">
                    <Link to="/" className="portal-footer-link">
                        Back to Teacher Journal
                    </Link>
                </div>
            </div>

            <style jsx="true">{`
                .student-portal {
                    min-height: 100vh;
                    background-color: var(--bg-dark);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1rem;
                }
                
                .portal-container {
                    width: 100%;
                    max-width: 600px;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                
                .portal-header {
                    text-align: center;
                }
                
                .portal-logo {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: var(--primary);
                }
                
                .portal-logo h1 {
                    margin: 0;
                    font-size: 1.5rem;
                }
                
                .portal-card {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }
                
                .portal-card-content {
                    padding: 2rem;
                }
                
                .portal-card h2 {
                    color: var(--text-primary);
                    margin-top: 0;
                    margin-bottom: 1rem;
                }
                
                .portal-card p {
                    color: var(--text-secondary);
                    margin-bottom: 2rem;
                }
                
                .portal-actions {
                    display: flex;
                    gap: 1rem;
                }
                
                .portal-footer {
                    text-align: center;
                    margin-top: 1rem;
                }
                
                .portal-footer-link {
                    color: var(--text-tertiary);
                    text-decoration: none;
                    font-size: 0.875rem;
                }
                
                .portal-footer-link:hover {
                    color: var(--primary);
                    text-decoration: underline;
                }
                
                @media (max-width: 640px) {
                    .portal-actions {
                        flex-direction: column;
                    }
                }
            `}</style>
        </div>
    );
}

// Wrapper component with provider
function StudentTestPortal() {
    return (
        <StudentAuthProvider>
            <StudentTestPortalContent />
        </StudentAuthProvider>
    );
}

export default StudentTestPortal;