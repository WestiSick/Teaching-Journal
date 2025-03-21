import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardService, userService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

function Dashboard() {
    const { currentUser, isFree } = useAuth();
    const [timeframe, setTimeframe] = useState('month');

    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard-stats', timeframe],
        queryFn: () => dashboardService.getStats({ timeframe })
    });

    // Fetch user details to get full name
    const { data: userData } = useQuery({
        queryKey: ['user-profile'],
        queryFn: userService.getCurrentUser
    });

    const stats = data?.data?.data;
    const userFullName = userData?.data?.data?.fio || currentUser?.email;

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error loading dashboard: {error.message}</div>;
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Dashboard</h1>
                    <p className="text-secondary">Welcome back, {userFullName}</p>
                </div>
                <div className="timeframe-selector">
                    <button
                        className={`btn ${timeframe === 'week' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTimeframe('week')}
                    >
                        Week
                    </button>
                    <button
                        className={`btn ${timeframe === 'month' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTimeframe('month')}
                    >
                        Month
                    </button>
                    <button
                        className={`btn ${timeframe === 'semester' ? 'btn-primary' : 'btn-outline'}`}
                        onClick={() => setTimeframe('semester')}
                    >
                        Semester
                    </button>
                </div>
            </div>

            {isFree && (
                <div className="alert alert-warning">
                    <div className="d-flex align-items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <div>
                            <h4 className="mb-1">Limited Features Available</h4>
                            <p className="mb-0">You are currently on a free plan with limited features. Contact the administrator to upgrade your account.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                    <div className="stats-card-title">Total Lessons</div>
                    <div className="stats-card-value">{stats?.total_lessons || 0}</div>
                    <div className="stats-card-description">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success">
                            <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                            <polyline points="17 6 23 6 23 12"></polyline>
                        </svg>
                        <span className="text-success ml-1">+{stats?.lessons_added || 3} this {timeframe}</span>
                    </div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--accent)' }}>
                    <div className="stats-card-title">Total Hours</div>
                    <div className="stats-card-value">{stats?.total_hours || 0}</div>
                    <div className="stats-card-description">
                        <span className="text-tertiary">Across all subjects</span>
                    </div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--success)' }}>
                    <div className="stats-card-title">Groups</div>
                    <div className="stats-card-value">{stats?.groups?.length || 0}</div>
                    <div className="stats-card-description">
                        <span className="text-tertiary">Active groups</span>
                    </div>
                </div>

                <div className="stats-card" style={{ borderLeftColor: 'var(--warning)' }}>
                    <div className="stats-card-title">Subjects</div>
                    <div className="stats-card-value">
                        {stats?.subjects ? Object.keys(stats.subjects).length : 0}
                    </div>
                    <div className="stats-card-description">
                        <span className="text-tertiary">Across all groups</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="col-span-8">
                    <div className="card">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="text-xl font-semibold">Recent Activity</h2>
                            <Link to="/lessons" className="btn btn-sm btn-outline">View All</Link>
                        </div>

                        {/* Recent Lessons */}
                        {!stats?.recent_lessons || stats.recent_lessons.length === 0 ? (
                            <div className="empty-state">
                                <div className="empty-state-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                </div>
                                <h3>No Recent Activity</h3>
                                <p>Start by creating your first lesson</p>
                                <Link to="/lessons/new" className="btn btn-primary mt-3">Create Lesson</Link>
                            </div>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Subject</th>
                                        <th>Group</th>
                                        <th>Topic</th>
                                        <th>Attendance</th>
                                        <th></th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {/* This is placeholder data - in a real app, use data from the API */}
                                    <tr>
                                        <td>Mar 18, 2025</td>
                                        <td>Mathematics</td>
                                        <td>Group A</td>
                                        <td>Linear Algebra</td>
                                        <td>
                                            <div className="attendance-indicator">
                                                <div className="progress" style={{ width: '120px' }}>
                                                    <div className="progress-bar progress-bar-success" style={{ width: '85%' }}></div>
                                                </div>
                                                <span className="ml-2">85%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Link to="/lessons/1" className="btn btn-sm btn-outline">View</Link>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Mar 17, 2025</td>
                                        <td>Physics</td>
                                        <td>Group B</td>
                                        <td>Quantum Mechanics</td>
                                        <td>
                                            <div className="attendance-indicator">
                                                <div className="progress" style={{ width: '120px' }}>
                                                    <div className="progress-bar progress-bar-warning" style={{ width: '73%' }}></div>
                                                </div>
                                                <span className="ml-2">73%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Link to="/lessons/2" className="btn btn-sm btn-outline">View</Link>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Mar 16, 2025</td>
                                        <td>Computer Science</td>
                                        <td>Group A</td>
                                        <td>Neural Networks</td>
                                        <td>
                                            <div className="attendance-indicator">
                                                <div className="progress" style={{ width: '120px' }}>
                                                    <div className="progress-bar progress-bar-success" style={{ width: '90%' }}></div>
                                                </div>
                                                <span className="ml-2">90%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Link to="/lessons/3" className="btn btn-sm btn-outline">View</Link>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td>Mar 15, 2025</td>
                                        <td>Chemistry</td>
                                        <td>Group C</td>
                                        <td>Organic Compounds</td>
                                        <td>
                                            <div className="attendance-indicator">
                                                <div className="progress" style={{ width: '120px' }}>
                                                    <div className="progress-bar progress-bar-danger" style={{ width: '62%' }}></div>
                                                </div>
                                                <span className="ml-2">62%</span>
                                            </div>
                                        </td>
                                        <td>
                                            <Link to="/lessons/4" className="btn btn-sm btn-outline">View</Link>
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Upcoming Lessons */}
                    <div className="card mt-6">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="text-xl font-semibold">Upcoming Lessons</h2>
                            <Link to="/lessons/new" className="btn btn-primary btn-sm">Add Lesson</Link>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="upcoming-lesson-card">
                                <div className="upcoming-lesson-date">
                                    <div className="date-indicator">
                                        <span className="month">Mar</span>
                                        <span className="day">21</span>
                                    </div>
                                    <div className="time">09:00 AM</div>
                                </div>
                                <div className="upcoming-lesson-details">
                                    <h4>Introduction to Calculus</h4>
                                    <p className="subject">Mathematics • Group A</p>
                                </div>
                            </div>

                            <div className="upcoming-lesson-card">
                                <div className="upcoming-lesson-date">
                                    <div className="date-indicator">
                                        <span className="month">Mar</span>
                                        <span className="day">22</span>
                                    </div>
                                    <div className="time">11:00 AM</div>
                                </div>
                                <div className="upcoming-lesson-details">
                                    <h4>Electromagnetic Fields</h4>
                                    <p className="subject">Physics • Group B</p>
                                </div>
                            </div>

                            <div className="upcoming-lesson-card">
                                <div className="upcoming-lesson-date">
                                    <div className="date-indicator">
                                        <span className="month">Mar</span>
                                        <span className="day">23</span>
                                    </div>
                                    <div className="time">02:00 PM</div>
                                </div>
                                <div className="upcoming-lesson-details">
                                    <h4>Algorithm Design</h4>
                                    <p className="subject">Computer Science • Group A</p>
                                </div>
                            </div>

                            <div className="upcoming-lesson-card">
                                <div className="upcoming-lesson-date">
                                    <div className="date-indicator">
                                        <span className="month">Mar</span>
                                        <span className="day">24</span>
                                    </div>
                                    <div className="time">10:00 AM</div>
                                </div>
                                <div className="upcoming-lesson-details">
                                    <h4>Laboratory Work: Reactions</h4>
                                    <p className="subject">Chemistry • Group C</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="col-span-4">
                    {stats?.subjects && Object.keys(stats.subjects).length > 0 && (
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">Subjects</h2>
                            <div className="subject-list">
                                {Object.entries(stats.subjects).map(([subject, count], idx) => (
                                    <div key={idx} className="subject-item">
                                        <div className="subject-color" style={{ backgroundColor: getSubjectColor(idx) }}></div>
                                        <div className="subject-details">
                                            <div className="subject-name">{subject}</div>
                                            <div className="subject-count">{count} lessons</div>
                                        </div>
                                        <Link to={`/subjects/${subject}/lessons`} className="btn btn-sm btn-outline">
                                            View
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {stats?.groups && stats.groups.length > 0 && (
                        <div className="card mt-6">
                            <h2 className="text-xl font-semibold mb-4">Your Groups</h2>
                            <div className="groups-list">
                                {stats.groups.map((group, idx) => (
                                    <Link key={idx} to={`/groups/${group}`} className="group-item">
                                        <div className="group-icon">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                                <circle cx="9" cy="7" r="4"></circle>
                                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                            </svg>
                                        </div>
                                        <div className="group-name">{group}</div>
                                        <div className="group-arrow">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="9 18 15 12 9 6"></polyline>
                                            </svg>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="card mt-6">
                        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                        <div className="quick-actions">
                            <Link to="/lessons/new" className="quick-action-card">
                                <div className="action-icon" style={{ backgroundColor: 'var(--primary-lighter)', color: 'var(--primary)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                </div>
                                <div className="action-text">Add Lesson</div>
                            </Link>

                            <Link to="/attendance" className="quick-action-card">
                                <div className="action-icon" style={{ backgroundColor: 'var(--success-lighter)', color: 'var(--success)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                </div>
                                <div className="action-text">Take Attendance</div>
                            </Link>

                            <Link to="/labs" className="quick-action-card">
                                <div className="action-icon" style={{ backgroundColor: 'var(--accent-dark)', color: 'var(--accent-light)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M10 2v7.31"></path>
                                        <path d="M14 9.3V1.99"></path>
                                        <path d="M8.5 2h7"></path>
                                        <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                    </svg>
                                </div>
                                <div className="action-text">Update Lab Grades</div>
                            </Link>

                            <Link to="/students/new" className="quick-action-card">
                                <div className="action-icon" style={{ backgroundColor: 'var(--warning-lighter)', color: 'var(--warning)' }}>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                </div>
                                <div className="action-text">Add Student</div>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .timeframe-selector {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .attendance-indicator {
                    display: flex;
                    align-items: center;
                }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    text-align: center;
                    color: var(--text-tertiary);
                }
                
                .empty-state-icon {
                    color: var(--text-tertiary);
                    margin-bottom: 1rem;
                    opacity: 0.6;
                }
                
                .upcoming-lesson-card {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    background-color: var(--bg-dark-secondary);
                    transition: all var(--transition-fast) ease;
                }
                
                .upcoming-lesson-card:hover {
                    box-shadow: var(--shadow-md);
                    border-color: var(--border-color-light);
                    background-color: var(--bg-dark-tertiary);
                }
                
                .upcoming-lesson-date {
                    margin-right: 1rem;
                    text-align: center;
                }
                
                .date-indicator {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-md);
                    padding: 0.5rem;
                    min-width: 4rem;
                }
                
                .date-indicator .month {
                    font-size: 0.75rem;
                    font-weight: 600;
                    text-transform: uppercase;
                }
                
                .date-indicator .day {
                    font-size: 1.25rem;
                    font-weight: 700;
                }
                
                .time {
                    font-size: 0.75rem;
                    margin-top: 0.5rem;
                    color: var(--text-tertiary);
                }
                
                .upcoming-lesson-details h4 {
                    margin-bottom: 0.25rem;
                    font-size: 1rem;
                    color: var(--text-primary);
                }
                
                .subject {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .subject-list,
                .groups-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .subject-item {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-secondary);
                    border: 1px solid var(--border-color);
                    transition: all var(--transition-fast) ease;
                }
                
                .subject-item:hover {
                    background-color: var(--bg-dark-tertiary);
                    border-color: var(--border-color-light);
                }
                
                .subject-color {
                    width: 0.5rem;
                    height: 2rem;
                    border-radius: var(--radius-full);
                    margin-right: 0.75rem;
                }
                
                .subject-details {
                    flex: 1;
                }
                
                .subject-name {
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .subject-count {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .group-item {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    background-color: var(--bg-dark-secondary);
                    color: var(--text-primary);
                    transition: all var(--transition-fast) ease;
                }
                
                .group-item:hover {
                    background-color: var(--bg-dark-tertiary);
                    border-color: var(--border-color-light);
                }
                
                .group-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2.5rem;
                    height: 2.5rem;
                    background-color: var(--primary-lighter);
                    border-radius: var(--radius-md);
                    margin-right: 0.75rem;
                    color: var(--primary);
                }
                
                .group-name {
                    flex: 1;
                    font-weight: 500;
                }
                
                .group-arrow {
                    color: var(--text-tertiary);
                }
                
                .quick-actions {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                
                .quick-action-card {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    background-color: var(--bg-dark-secondary);
                    color: var(--text-primary);
                    transition: all var(--transition-fast) ease;
                }
                
                .quick-action-card:hover {
                    box-shadow: var(--shadow-md);
                    transform: translateY(-2px);
                    background-color: var(--bg-dark-tertiary);
                    border-color: var(--border-color-light);
                }
                
                .action-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2.5rem;
                    height: 2.5rem;
                    border-radius: var(--radius-md);
                    margin-right: 0.75rem;
                }
                
                .action-text {
                    font-weight: 500;
                }
                
                @media (max-width: 1024px) {
                    .grid-cols-4 {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .grid-cols-12 {
                        grid-template-columns: 1fr;
                    }
                    
                    .col-span-8, .col-span-4 {
                        grid-column: span 1;
                    }
                }
                
                @media (max-width: 640px) {
                    .grid-cols-4 {
                        grid-template-columns: 1fr;
                    }
                    
                    .timeframe-selector {
                        margin-top: 1rem;
                    }
                    
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .upcoming-lesson-card {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .upcoming-lesson-date {
                        margin-right: 0;
                        margin-bottom: 0.75rem;
                        display: flex;
                        align-items: center;
                        width: 100%;
                    }
                    
                    .date-indicator {
                        flex-direction: row;
                        gap: 0.25rem;
                    }
                    
                    .time {
                        margin-top: 0;
                        margin-left: auto;
                    }
                    
                    .quick-actions {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

// Helper function to get a consistent color for a subject
function getSubjectColor(index) {
    const colors = [
        'var(--primary)',
        'var(--accent)',
        'var(--success)',
        'var(--warning)',
        '#9333ea', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
    ];

    return colors[index % colors.length];
}

export default Dashboard;