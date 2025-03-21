import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';

function TeacherAttendance() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        group: '',
        subject: ''
    });

    // Get teacher data
    const { data: userData, isLoading: userLoading } = useQuery({
        queryKey: ['admin-user', id],
        queryFn: () => adminService.getUsers(),
        select: (data) => {
            const users = data?.data?.data || [];
            return users.find(user => user.id.toString() === id.toString());
        }
    });

    // Get teacher attendance
    const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
        queryKey: ['admin-teacher-attendance', id, filters],
        queryFn: () => adminService.getTeacherAttendance(id, filters)
    });

    const teacher = userData;
    const attendance = attendanceData?.data?.data?.attendance || [];
    const groups = attendanceData?.data?.data?.groups || [];
    const subjects = attendanceData?.data?.data?.subjects || [];

    const isLoading = userLoading || attendanceLoading;

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ group: '', subject: '' });
    };

    // Calculate overall attendance rate
    const calculateOverallRate = () => {
        if (attendance.length === 0) return 0;

        let totalAttended = 0;
        let totalStudents = 0;

        attendance.forEach(record => {
            totalAttended += record.attended_students;
            totalStudents += record.total_students;
        });

        return totalStudents > 0 ? (totalAttended / totalStudents) * 100 : 0;
    };

    const overallRate = calculateOverallRate();

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!teacher) {
        return <div className="alert alert-danger">Teacher not found</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">Teacher Attendance</h1>
                <div>
                    <Link to={`/admin/teachers/${id}`} className="btn btn-secondary">Back to Teacher</Link>
                </div>
            </div>

            {/* Teacher Info */}
            <div className="card mb-6">
                <div className="d-flex align-items-center">
                    <div className="teacher-avatar">
                        <span>{teacher.fio.charAt(0).toUpperCase()}</span>
                    </div>
                    <div className="teacher-info">
                        <h2>{teacher.fio}</h2>
                        <p className="text-tertiary">{teacher.login}</p>
                        <div className="d-flex align-items-center mt-2">
                            <span className={`badge ${teacher.role === 'teacher' ? 'badge-success' : 'badge-warning'}`}>
                                {teacher.role}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="card mb-6">
                <div className="admin-tabs">
                    <div className="tab-buttons">
                        <button
                            className="tab-button"
                            onClick={() => navigate(`/admin/teachers/${id}`)}
                        >
                            Overview
                        </button>
                        <button
                            className="tab-button"
                            onClick={() => navigate(`/admin/teachers/${id}/groups`)}
                        >
                            Groups
                        </button>
                        <button
                            className="tab-button tab-button-active"
                            onClick={() => navigate(`/admin/teachers/${id}/attendance`)}
                        >
                            Attendance
                        </button>
                        <button
                            className="tab-button"
                            onClick={() => navigate(`/admin/teachers/${id}/labs`)}
                        >
                            Labs
                        </button>
                    </div>
                </div>
            </div>

            {/* Attendance Summary */}
            <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-4">Attendance Summary</h2>

                <div className="summary-stats">
                    <div className="summary-stat">
                        <div className="stat-label">Total Lessons</div>
                        <div className="stat-value">{attendance.length}</div>
                    </div>

                    <div className="summary-stat">
                        <div className="stat-label">Average Attendance</div>
                        <div className="stat-value">
                            {overallRate.toFixed(1)}%
                        </div>
                    </div>

                    <div className="summary-stat">
                        <div className="stat-label">Groups</div>
                        <div className="stat-value">{groups.length}</div>
                    </div>

                    <div className="summary-stat">
                        <div className="stat-label">Subjects</div>
                        <div className="stat-value">{subjects.length}</div>
                    </div>
                </div>

                <div className="attendance-chart">
                    <div className="chart-title">Overall Attendance Rate</div>
                    <div className="chart-container">
                        <div className="progress-bar-large">
                            <div
                                className={`progress-fill ${
                                    overallRate >= 80 ? 'progress-fill-success' :
                                        overallRate >= 60 ? 'progress-fill-warning' :
                                            'progress-fill-danger'
                                }`}
                                style={{ width: `${overallRate}%` }}
                            ></div>
                        </div>
                        <div className="progress-value">{overallRate.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            {/* Attendance Records */}
            <div className="card">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-xl font-semibold">Attendance Records</h2>
                </div>

                {/* Filters */}
                <div className="filters mb-4">
                    <div className="filters-grid">
                        <div className="filter-group">
                            <label htmlFor="group">Group</label>
                            <select
                                id="group"
                                name="group"
                                className="form-control"
                                value={filters.group}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Groups</option>
                                {groups.map((group, index) => (
                                    <option key={index} value={group}>{group}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-group">
                            <label htmlFor="subject">Subject</label>
                            <select
                                id="subject"
                                name="subject"
                                className="form-control"
                                value={filters.subject}
                                onChange={handleFilterChange}
                            >
                                <option value="">All Subjects</option>
                                {subjects.map((subject, index) => (
                                    <option key={index} value={subject}>{subject}</option>
                                ))}
                            </select>
                        </div>

                        <div className="filter-actions">
                            <button
                                className="btn btn-secondary"
                                onClick={clearFilters}
                            >
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>

                {attendance.length === 0 ? (
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                            <line x1="16" y1="2" x2="16" y2="6"></line>
                            <line x1="8" y1="2" x2="8" y2="6"></line>
                            <line x1="3" y1="10" x2="21" y2="10"></line>
                        </svg>
                        <h3>No Attendance Records</h3>
                        <p>No attendance records found for the selected filters.</p>
                        {(filters.group || filters.subject) && (
                            <button className="btn btn-primary mt-3" onClick={clearFilters}>
                                Clear Filters
                            </button>
                        )}
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
                                <th>Type</th>
                                <th>Attendance</th>
                            </tr>
                            </thead>
                            <tbody>
                            {attendance.map((record) => (
                                <tr key={record.lesson_id}>
                                    <td>{record.date}</td>
                                    <td>{record.subject}</td>
                                    <td>{record.group_name}</td>
                                    <td>{record.topic}</td>
                                    <td>{record.type}</td>
                                    <td>
                                        <div className="attendance-cell">
                                            <div className="attendance-rate">
                                                <div className="progress" style={{ width: '120px' }}>
                                                    <div
                                                        className={`progress-bar ${
                                                            record.attendance_rate >= 80 ? 'progress-bar-success' :
                                                                record.attendance_rate >= 60 ? 'progress-bar-warning' :
                                                                    'progress-bar-danger'
                                                        }`}
                                                        style={{ width: `${record.attendance_rate}%` }}
                                                    ></div>
                                                </div>
                                                <span className="rate-value">{record.attendance_rate.toFixed(0)}%</span>
                                            </div>
                                            <div className="attendance-count">
                                                {record.attended_students} / {record.total_students} students
                                            </div>
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
                .teacher-avatar {
                    width: 60px;
                    height: 60px;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-right: 1.5rem;
                }
                
                .teacher-info {
                    flex: 1;
                }
                
                .admin-tabs {
                    overflow-x: auto;
                }
                
                .tab-buttons {
                    display: flex;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .tab-button {
                    padding: 0.75rem 1.5rem;
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    white-space: nowrap;
                    transition: all var(--transition-fast) ease;
                }
                
                .tab-button:hover {
                    color: var(--text-primary);
                    background-color: var(--bg-dark-tertiary);
                }
                
                .tab-button-active {
                    color: var(--primary);
                    border-bottom-color: var(--primary);
                }
                
                .summary-stats {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-bottom: 2rem;
                }
                
                .summary-stat {
                    background-color: var(--bg-dark-tertiary);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    text-align: center;
                }
                
                .stat-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }
                
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .attendance-chart {
                    background-color: var(--bg-dark-tertiary);
                    padding: 1.5rem;
                    border-radius: var(--radius-md);
                }
                
                .chart-title {
                    font-size: 1rem;
                    font-weight: 500;
                    margin-bottom: 1rem;
                    color: var(--text-secondary);
                }
                
                .chart-container {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .progress-bar-large {
                    height: 2rem;
                    background-color: var(--bg-dark);
                    border-radius: var(--radius-md);
                    flex: 1;
                    overflow: hidden;
                }
                
                .progress-fill {
                    height: 100%;
                    transition: width 0.3s ease;
                }
                
                .progress-fill-success {
                    background-color: var(--success);
                }
                
                .progress-fill-warning {
                    background-color: var(--warning);
                }
                
                .progress-fill-danger {
                    background-color: var(--danger);
                }
                
                .progress-value {
                    font-size: 1.25rem;
                    font-weight: 600;
                    min-width: 70px;
                    text-align: right;
                }
                
                .filters {
                    margin-bottom: 1.5rem;
                }
                
                .filters-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                    align-items: end;
                }
                
                .filter-group {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .filter-actions {
                    display: flex;
                    align-items: center;
                    justify-content: flex-end;
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
                
                .attendance-cell {
                    display: flex;
                    flex-direction: column;
                    gap: 0.25rem;
                }
                
                .attendance-rate {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .attendance-count {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                @media (max-width: 768px) {
                    .summary-stats {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .filters-grid {
                        grid-template-columns: 1fr;
                    }
                    
                    .filter-actions {
                        justify-content: flex-start;
                        margin-top: 0.5rem;
                    }
                }
            `}</style>
        </div>
    );
}

export default TeacherAttendance;