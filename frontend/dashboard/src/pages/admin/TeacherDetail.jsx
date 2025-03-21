import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';

function TeacherDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    // Get teacher data from users
    const { data: userData, isLoading: userLoading } = useQuery({
        queryKey: ['admin-user', id],
        queryFn: () => adminService.getUsers(),
        select: (data) => {
            const users = data?.data?.data || [];
            return users.find(user => user.id.toString() === id.toString());
        }
    });

    // Get teacher groups
    const { data: groupsData, isLoading: groupsLoading } = useQuery({
        queryKey: ['admin-teacher-groups', id],
        queryFn: () => adminService.getTeacherGroups(id)
    });

    // Get teacher attendance
    const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
        queryKey: ['admin-teacher-attendance', id],
        queryFn: () => adminService.getTeacherAttendance(id)
    });

    // Get teacher labs
    const { data: labsData, isLoading: labsLoading } = useQuery({
        queryKey: ['admin-teacher-labs', id],
        queryFn: () => adminService.getTeacherLabs(id)
    });

    const teacher = userData;
    const groups = groupsData?.data?.data?.groups || [];
    const attendance = attendanceData?.data?.data?.attendance || [];
    const subjects = labsData?.data?.data?.subjects || [];

    const isLoading = userLoading || groupsLoading || attendanceLoading || labsLoading;

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
                <h1 className="page-title">Teacher Details</h1>
                <div>
                    <Link to="/admin/users" className="btn btn-secondary">Back to Users</Link>
                </div>
            </div>

            {/* Teacher Profile Card */}
            <div className="card mb-6">
                <div className="d-flex">
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

                <div className="stats-grid mt-4">
                    <div className="stat-item">
                        <div className="stat-label">Total Lessons</div>
                        <div className="stat-value">{teacher.total_lessons || 0}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">Total Hours</div>
                        <div className="stat-value">{teacher.total_hours || 0}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">Groups</div>
                        <div className="stat-value">{groups.length}</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-label">Subjects</div>
                        <div className="stat-value">{subjects.length}</div>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="card mb-6">
                <div className="admin-tabs">
                    <div className="tab-buttons">
                        <button
                            className="tab-button tab-button-active"
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
                            className="tab-button"
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

            <div className="grid grid-cols-12 gap-6">
                {/* Left Column */}
                <div className="col-span-8">
                    {/* Groups Overview */}
                    <div className="card mb-6">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="text-xl font-semibold">Groups</h2>
                            <Link to={`/admin/teachers/${id}/groups`} className="btn btn-sm btn-outline">
                                View All Groups
                            </Link>
                        </div>

                        {groups.length === 0 ? (
                            <p>No groups found for this teacher</p>
                        ) : (
                            <div className="table-container">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>Group</th>
                                        <th>Students</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {groups.slice(0, 5).map((group, index) => (
                                        <tr key={index}>
                                            <td>{group.name}</td>
                                            <td>{group.student_count}</td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Recent Attendance */}
                    <div className="card">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="text-xl font-semibold">Recent Attendance</h2>
                            <Link to={`/admin/teachers/${id}/attendance`} className="btn btn-sm btn-outline">
                                View All Attendance
                            </Link>
                        </div>

                        {attendance.length === 0 ? (
                            <p>No attendance records found for this teacher</p>
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
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {attendance.slice(0, 5).map((record) => (
                                        <tr key={record.lesson_id}>
                                            <td>{record.date}</td>
                                            <td>{record.subject}</td>
                                            <td>{record.group_name}</td>
                                            <td>{record.topic}</td>
                                            <td>
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
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column */}
                <div className="col-span-4">
                    {/* Subjects */}
                    <div className="card mb-6">
                        <h2 className="text-xl font-semibold mb-4">Subjects Taught</h2>

                        {subjects.length === 0 ? (
                            <p>No subjects found for this teacher</p>
                        ) : (
                            <div className="subjects-list">
                                {subjects.map((subject, index) => (
                                    <div key={index} className="subject-item">
                                        <div className="subject-color" style={{ backgroundColor: getSubjectColor(index) }}></div>
                                        <div className="subject-details">
                                            <div className="subject-name">{subject.subject}</div>
                                            <div className="subject-group-count">{subject.groups.length} groups</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Lab Grades Summary */}
                    <div className="card">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h2 className="text-xl font-semibold">Lab Grades</h2>
                            <Link to={`/admin/teachers/${id}/labs`} className="btn btn-sm btn-outline">
                                View Details
                            </Link>
                        </div>

                        {subjects.length === 0 ? (
                            <p>No lab grades found for this teacher</p>
                        ) : (
                            <div className="lab-summary">
                                {subjects.slice(0, 5).map((subject, index) => (
                                    <div key={index} className="lab-summary-item">
                                        <div className="lab-subject">{subject.subject}</div>
                                        <div className="lab-groups">
                                            {subject.groups.slice(0, 2).map((group, groupIndex) => (
                                                <div key={groupIndex} className="lab-group-item">
                                                    <span className="lab-group-name">{group.name}</span>
                                                    <div className="lab-group-avg">
                                                        <div
                                                            className={`lab-avg-badge ${
                                                                group.group_average >= 4 ? 'badge-success' :
                                                                    group.group_average >= 3 ? 'badge-warning' :
                                                                        'badge-danger'
                                                            }`}
                                                        >
                                                            {group.group_average.toFixed(1)}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {subject.groups.length > 2 && (
                                                <div className="more-groups">+{subject.groups.length - 2} more groups</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <style jsx="true">{`
                .teacher-avatar {
                    width: 80px;
                    height: 80px;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 2rem;
                    font-weight: 600;
                    margin-right: 1.5rem;
                }
                
                .teacher-info {
                    flex: 1;
                }
                
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(4, 1fr);
                    gap: 1rem;
                    margin-top: 1.5rem;
                }
                
                .stat-item {
                    background-color: var(--bg-dark-tertiary);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                }
                
                .stat-label {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                    margin-bottom: 0.25rem;
                }
                
                .stat-value {
                    font-size: 1.5rem;
                    font-weight: 600;
                    color: var(--text-primary);
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
                
                .attendance-rate {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .rate-value {
                    font-size: 0.875rem;
                }
                
                .subjects-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .subject-item {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
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
                
                .subject-group-count {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .lab-summary {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .lab-summary-item {
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                }
                
                .lab-subject {
                    font-weight: 500;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                
                .lab-groups {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .lab-group-item {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .lab-group-name {
                    font-size: 0.875rem;
                }
                
                .lab-avg-badge {
                    font-size: 0.75rem;
                    font-weight: 600;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius-full);
                }
                
                .more-groups {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    padding-top: 0.25rem;
                    text-align: center;
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

export default TeacherDetail;