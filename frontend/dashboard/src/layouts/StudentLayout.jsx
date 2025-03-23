import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function StudentLayout() {
    const navigate = useNavigate();
    const [studentInfo, setStudentInfo] = useState(null);

    useEffect(() => {
        const studentInfoStr = localStorage.getItem('testStudentInfo');
        if (studentInfoStr) {
            try {
                const info = JSON.parse(studentInfoStr);
                setStudentInfo(info);
            } catch (error) {
                console.error('Error parsing student info:', error);
            }
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('testStudentId');
        localStorage.removeItem('testStudentInfo');
        navigate('/tests/student/login');
    };

    return (
        <div className="student-layout">
            {studentInfo && (
                <header className="student-header">
                    <div className="student-info">
                        <div className="student-avatar">
                            {studentInfo.fio?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div>
                            <div className="student-name">{studentInfo.fio}</div>
                            <div className="student-email">{studentInfo.email}</div>
                        </div>
                    </div>
                    <div className="header-actions">
                        <Link to="/tests/student" className="header-link">My Tests</Link>
                        <Link to="/tests/student/history" className="header-link">Test History</Link>
                        <button onClick={handleLogout} className="btn btn-outline logout-btn">
                            Logout
                        </button>
                    </div>
                </header>
            )}

            <main className="student-content">
                <Outlet />
            </main>

            <style jsx="true">{`
                .student-layout {
                    min-height: 100vh;
                    background-color: var(--bg-dark);
                }
                
                .student-header {
                    background-color: var(--bg-dark-secondary);
                    padding: 1rem 2rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .student-info {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .student-avatar {
                    width: 40px;
                    height: 40px;
                    border-radius: 50%;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 600;
                }
                
                .student-name {
                    font-weight: 600;
                }
                
                .student-email {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .header-actions {
                    display: flex;
                    align-items: center;
                    gap: 1.5rem;
                }
                
                .header-link {
                    color: var(--text-secondary);
                    font-weight: 500;
                    transition: color var(--transition-fast) ease;
                }
                
                .header-link:hover {
                    color: var(--primary);
                }
                
                .logout-btn {
                    padding: 0.375rem 1rem;
                    font-size: 0.875rem;
                }
                
                .student-content {
                    padding: 2rem;
                }
                
                @media (max-width: 768px) {
                    .student-header {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: flex-start;
                        padding: 1rem;
                    }
                    
                    .header-actions {
                        width: 100%;
                        justify-content: space-between;
                    }
                    
                    .student-content {
                        padding: 1rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default StudentLayout;