import { useState } from 'react';
import { Outlet, Navigate, Link, useNavigate } from 'react-router-dom';
import { StudentAuthProvider, useStudentAuth } from '../../../context/StudentAuthContext';

function StudentLayoutContent() {
    const { isAuthenticated, currentStudent, logout } = useStudentAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Redirect if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/student-testing/login" replace />;
    }

    const handleLogout = () => {
        logout();
        navigate('/student-testing');
    };

    return (
        <div className="student-layout">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`student-sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <span>Testing Portal</span>
                    </div>

                    <button
                        className="close-sidebar"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>

                <div className="student-info">
                    <div className="avatar">
                        {currentStudent?.fio?.charAt(0) || 'S'}
                    </div>
                    <div className="info">
                        <div className="name">{currentStudent?.fio || 'Student'}</div>
                        <div className="group">{currentStudent?.group || 'Unknown Group'}</div>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <Link to="/student-testing/tests" className="nav-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <span>Available Tests</span>
                    </Link>

                    <Link to="/student-testing/history" className="nav-link">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>Test History</span>
                    </Link>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={handleLogout} className="logout-button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="student-main">
                <header className="main-header">
                    <button
                        className="menu-toggle"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="3" y1="12" x2="21" y2="12"></line>
                            <line x1="3" y1="6" x2="21" y2="6"></line>
                            <line x1="3" y1="18" x2="21" y2="18"></line>
                        </svg>
                    </button>

                    <div className="header-title">Student Testing Portal</div>
                </header>

                <div className="main-content">
                    <Outlet />
                </div>
            </main>

            <style jsx="true">{`
                .student-layout {
                    display: flex;
                    min-height: 100vh;
                    background-color: var(--bg-dark);
                }
                
                .sidebar-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    z-index: 40;
                }
                
                .student-sidebar {
                    width: 260px;
                    background-color: var(--bg-dark-secondary);
                    border-right: 1px solid var(--border-color);
                    display: flex;
                    flex-direction: column;
                    height: 100vh;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 50;
                    transition: transform 0.3s ease;
                }
                
                .sidebar-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .sidebar-logo {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    color: var(--primary);
                }
                
                .sidebar-logo span {
                    font-weight: 700;
                    font-size: 1rem;
                }
                
                .close-sidebar {
                    display: none;
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                }
                
                .student-info {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                    font-size: 1.25rem;
                }
                
                .info .name {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .info .group {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .sidebar-nav {
                    flex: 1;
                    padding: 1rem 0;
                    overflow-y: auto;
                }
                
                .nav-link {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    color: var(--text-secondary);
                    text-decoration: none;
                    transition: all 0.2s ease;
                }
                
                .nav-link:hover, .nav-link.active {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-primary);
                }
                
                .sidebar-footer {
                    padding: 1rem;
                    border-top: 1px solid var(--border-color);
                }
                
                .logout-button {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    width: 100%;
                    border: none;
                    background: none;
                    color: var(--danger);
                    cursor: pointer;
                    text-align: left;
                    border-radius: var(--radius-md);
                    transition: all 0.2s ease;
                }
                
                .logout-button:hover {
                    background-color: var(--danger-lighter);
                }
                
                .student-main {
                    flex: 1;
                    margin-left: 260px;
                    display: flex;
                    flex-direction: column;
                }
                
                .main-header {
                    height: 60px;
                    border-bottom: 1px solid var(--border-color);
                    background-color: var(--bg-dark-secondary);
                    display: flex;
                    align-items: center;
                    padding: 0 1.5rem;
                    position: sticky;
                    top: 0;
                    z-index: 10;
                }
                
                .menu-toggle {
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                    display: none;
                    margin-right: 1rem;
                }
                
                .header-title {
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .main-content {
                    flex: 1;
                    padding: 1.5rem;
                }
                
                @media (max-width: 768px) {
                    .student-sidebar {
                        transform: translateX(-100%);
                    }
                    
                    .student-sidebar.open {
                        transform: translateX(0);
                    }
                    
                    .close-sidebar {
                        display: block;
                    }
                    
                    .menu-toggle {
                        display: block;
                    }
                    
                    .student-main {
                        margin-left: 0;
                    }
                }
            `}</style>
        </div>
    );
}

// Wrapper component with provider
function StudentLayout() {
    return (
        <StudentAuthProvider>
            <StudentLayoutContent />
        </StudentAuthProvider>
    );
}

export default StudentLayout;