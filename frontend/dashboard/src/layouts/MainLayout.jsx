import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';

function MainLayout() {
    const { currentUser, isAdmin, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    // Handle responsive sidebar visibility
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (mobile) {
                setSidebarOpen(false);
            } else {
                setSidebarOpen(true);
            }
        };

        window.addEventListener('resize', handleResize);
        handleResize(); // Initialize on mount

        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="layout-container">
            {/* Overlay for mobile when sidebar is open */}
            {isMobile && sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-logo">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                    </svg>
                    <span>Teacher Journal</span>

                    {isMobile && (
                        <button
                            className="close-sidebar"
                            onClick={() => setSidebarOpen(false)}
                            aria-label="Close sidebar"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    )}
                </div>

                <div className="sidebar-links">
                    <NavLink to="/dashboard" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="3" width="7" height="9"></rect>
                            <rect x="14" y="3" width="7" height="5"></rect>
                            <rect x="14" y="12" width="7" height="9"></rect>
                            <rect x="3" y="16" width="7" height="5"></rect>
                        </svg>
                        <span>Dashboard</span>
                    </NavLink>

                    <NavLink to="/lessons" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        <span>Lessons</span>
                    </NavLink>

                    <NavLink to="/groups" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>Groups</span>
                    </NavLink>

                    <NavLink to="/students" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>Students</span>
                    </NavLink>

                    <NavLink to="/attendance" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>Attendance</span>
                    </NavLink>

                    <NavLink to="/labs" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 2v7.31"></path>
                            <path d="M14 9.3V1.99"></path>
                            <path d="M8.5 2h7"></path>
                            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                            <path d="M5.17 14.83l4.24-4.24"></path>
                            <path d="M14.83 14.83l-4.24-4.24"></path>
                        </svg>
                        <span>Labs</span>
                    </NavLink>

                    {isAdmin && (
                        <NavLink to="/admin" className={({ isActive }) =>
                            isActive ? "sidebar-link active" : "sidebar-link"}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3"></circle>
                                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                            </svg>
                            <span>Admin Panel</span>
                        </NavLink>
                    )}

                    <NavLink to="/schedule" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <span>Schedule</span>
                    </NavLink>

                    <NavLink to="/tickets" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <line x1="10" y1="9" x2="8" y2="9"></line>
                        </svg>
                        <span>Tickets</span>
                    </NavLink>

                </div>


                <div className="sidebar-footer">
                    <NavLink to="/profile" className={({ isActive }) =>
                        isActive ? "sidebar-link active" : "sidebar-link"}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span>Profile</span>
                    </NavLink>

                    <button onClick={handleLogout} className="sidebar-link text-danger">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                            <polyline points="16 17 21 12 16 7"></polyline>
                            <line x1="21" y1="12" x2="9" y2="12"></line>
                        </svg>
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            <main className="main-content">
                <header className="topbar">
                    <div className="d-flex align-items-center">
                        <button
                            className="menu-toggle"
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            aria-label={sidebarOpen ? "Close sidebar" : "Open sidebar"}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="3" y1="12" x2="21" y2="12"></line>
                                <line x1="3" y1="6" x2="21" y2="6"></line>
                                <line x1="3" y1="18" x2="21" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    <div className="topbar-right">
                        <div className="user-status">
                            <span className={`status-indicator ${currentUser?.role === 'admin' ? 'status-admin' : 'status-user'}`}></span>
                            <span className="status-text">{currentUser?.role || 'Guest'}</span>
                        </div>

                        <div className="user-profile" onClick={() => navigate('/profile')}>
                            <div className="user-avatar">
                                {currentUser?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{currentUser?.email || 'User'}</div>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="content-wrapper">
                    <Outlet />
                </div>
            </main>

            <style jsx="true">{`
                .layout-container {
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
                    z-index: 990;
                }
                
                .sidebar {
                    background-color: var(--bg-dark-secondary);
                    width: 260px;
                    height: 100vh;
                    overflow-y: auto;
                    display: flex;
                    flex-direction: column;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 1000;
                    transition: transform var(--transition-normal) ease;
                }
                
                .sidebar-logo {
                    display: flex;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .sidebar-logo span {
                    margin-left: 0.75rem;
                    font-weight: 700;
                    font-size: 1.25rem;
                    color: var(--primary);
                }
                
                .close-sidebar {
                    margin-left: auto;
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                }
                
                .sidebar-links {
                    flex: 1;
                    padding: 1rem 0;
                }
                
                .sidebar-footer {
                    padding: 1rem 0;
                    border-top: 1px solid var(--border-color);
                }
                
                .topbar {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    background-color: var(--bg-dark-secondary);
                    border-bottom: 1px solid var(--border-color);
                    height: 64px;
                }
                
                .menu-toggle {
                    background: none;
                    border: none;
                    color: var(--text-tertiary);
                    cursor: pointer;
                    padding: 0.25rem;
                    display: none;
                }
                
                .topbar-right {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                
                .user-status {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .status-indicator {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                }
                
                .status-admin {
                    background-color: var(--primary);
                }
                
                .status-user {
                    background-color: var(--success);
                }
                
                .status-text {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .user-profile {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    cursor: pointer;
                }
                
                .user-avatar {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                }
                
                .user-name {
                    font-weight: 500;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                
                .content-wrapper {
                    padding: 1.5rem;
                }
                
                .main-content {
                    flex: 1;
                    margin-left: 260px;
                    display: flex;
                    flex-direction: column;
                    min-height: 100vh;
                }
                
                @media (max-width: 1024px) {
                    .sidebar {
                        transform: translateX(-100%);
                        box-shadow: var(--shadow-lg);
                    }
                    
                    .sidebar.open {
                        transform: translateX(0);
                    }
                    
                    .menu-toggle {
                        display: block;
                    }
                    
                    .main-content {
                        margin-left: 0;
                    }
                }
                
                @media (max-width: 640px) {
                    .topbar {
                        padding: 1rem;
                    }
                    
                    .user-info {
                        display: none;
                    }
                    
                    .user-status {
                        display: none;
                    }
                    
                    .content-wrapper {
                        padding: 1rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default MainLayout;