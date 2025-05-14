import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AuthLayout() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Navigate to="/dashboard" replace />;
    }

    return (
        <div className="auth-layout">
            <div className="auth-background"></div>
            <div className="auth-content">
                <div className="auth-branding">
                    <div className="logo">
                        <div className="logo-icon">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                            </svg>
                        </div>
                    </div>
                    <div className="branding-text">
                        <h1>Teacher Journal</h1>
                        <p>Современная платформа управления образованием</p>
                    </div>
                    <div className="branding-features">
                        <div className="feature-item">
                            <div className="feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <div>
                                <h3>Управление студентами</h3>
                                <p>Эффективное управление записями студентов и групповыми заданиями</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                            </div>
                            <div>
                                <h3>Отслеживание посещаемости</h3>
                                <p>Мониторинг посещаемости студентов с визуальной аналитикой</p>
                            </div>
                        </div>
                        <div className="feature-item">
                            <div className="feature-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M10 2v7.31"></path>
                                    <path d="M14 9.3V1.99"></path>
                                    <path d="M8.5 2h7"></path>
                                    <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                    <path d="M5.17 14.83l4.24-4.24"></path>
                                    <path d="M14.83 14.83l-4.24-4.24"></path>
                                </svg>
                            </div>
                            <div>
                                <h3>Оценка лабораторных работ</h3>
                                <p>Оценка и отслеживание выполнения лабораторных работ</p>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="auth-form-container">
                    <Outlet />
                </div>
            </div>

            <style jsx="true">{`
                .auth-layout {
                    min-height: 100vh;
                    position: relative;
                    overflow: hidden;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                }
                
                .auth-background {
                    position: absolute;
                    inset: 0;
                    background: linear-gradient(135deg, var(--bg-dark) 0%, var(--bg-dark-secondary) 100%);
                    z-index: -1;
                }
                
                .auth-background::before {
                    content: '';
                    position: absolute;
                    width: 80vw;
                    height: 80vw;
                    background: radial-gradient(circle, var(--primary-lighter) 0%, transparent 70%);
                    opacity: 0.05;
                    top: -40vw;
                    right: -40vw;
                    border-radius: 50%;
                }
                
                .auth-background::after {
                    content: '';
                    position: absolute;
                    width: 60vw;
                    height: 60vw;
                    background: radial-gradient(circle, var(--primary-lighter) 0%, transparent 70%);
                    opacity: 0.05;
                    bottom: -30vw;
                    left: -30vw;
                    border-radius: 50%;
                }
                
                .auth-content {
                    display: flex;
                    width: 100%;
                    max-width: 1100px;
                    background-color: rgba(31, 41, 55, 0.4);
                    backdrop-filter: blur(10px);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-xl);
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }
                
                .auth-branding {
                    flex: 1;
                    background: linear-gradient(135deg, var(--primary-darker) 0%, var(--primary) 100%);
                    color: white;
                    padding: 2.5rem;
                    display: flex;
                    flex-direction: column;
                }
                
                .logo {
                    margin-bottom: 2rem;
                }
                
                .logo-icon {
                    width: 60px;
                    height: 60px;
                    background-color: rgba(255, 255, 255, 0.1);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: var(--radius-md);
                }
                
                .branding-text {
                    margin-bottom: 3rem;
                }
                
                .branding-text h1 {
                    font-size: 2.5rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                    background: linear-gradient(to right, #ffffff 0%, #e2e8f0 100%);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
                
                .branding-text p {
                    font-size: 1.125rem;
                    opacity: 0.9;
                }
                
                .branding-features {
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    gap: 1.5rem;
                }
                
                .feature-item {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                }
                
                .feature-icon {
                    background-color: rgba(255, 255, 255, 0.1);
                    width: 44px;
                    height: 44px;
                    border-radius: var(--radius-md);
                    flex-shrink: 0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .feature-item h3 {
                    font-size: 1.125rem;
                    font-weight: 600;
                    margin-bottom: 0.375rem;
                }
                
                .feature-item p {
                    font-size: 0.875rem;
                    opacity: 0.8;
                }
                
                .auth-form-container {
                    flex: 1;
                    padding: 3rem 2rem;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                @media (max-width: 1024px) {
                    .auth-layout {
                        padding: 1rem;
                    }
                    
                    .auth-content {
                        flex-direction: column;
                        max-width: 500px;
                    }
                    
                    .auth-branding {
                        padding: 2rem;
                    }
                    
                    .branding-text {
                        margin-bottom: 2rem;
                    }
                    
                    .branding-text h1 {
                        font-size: 2rem;
                    }
                    
                    .branding-features {
                        display: none;
                    }
                    
                    .auth-form-container {
                        padding: 2rem;
                    }
                }
                
                @media (max-width: 600px) {
                    .auth-layout {
                        padding: 0;
                    }
                    
                    .auth-content {
                        border-radius: 0;
                        box-shadow: none;
                        min-height: 100vh;
                    }
                    
                    .auth-branding {
                        padding: 1.5rem;
                    }
                    
                    .branding-text h1 {
                        font-size: 1.75rem;
                    }
                    
                    .branding-text p {
                        font-size: 1rem;
                    }
                    
                    .auth-form-container {
                        padding: 1.5rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default AuthLayout;