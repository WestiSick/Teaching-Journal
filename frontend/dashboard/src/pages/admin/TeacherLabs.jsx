import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';

function TeacherLabs() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [selectedGroup, setSelectedGroup] = useState(null);

    // Get teacher data
    const { data: userData, isLoading: userLoading } = useQuery({
        queryKey: ['admin-user', id],
        queryFn: () => adminService.getUsers(),
        select: (data) => {
            const users = data?.data?.data || [];
            return users.find(user => user.id.toString() === id.toString());
        }
    });

    // Get teacher labs
    const { data: labsData, isLoading: labsLoading } = useQuery({
        queryKey: ['admin-teacher-labs', id],
        queryFn: () => adminService.getTeacherLabs(id)
    });

    const teacher = userData;
    const subjects = labsData?.data?.data?.subjects || [];

    const isLoading = userLoading || labsLoading;

    // Handle subject selection
    const handleSubjectSelect = (subject) => {
        setSelectedSubject(subject);
        setSelectedGroup(null); // Reset group selection when subject changes
    };

    // Handle group selection
    const handleGroupSelect = (group) => {
        setSelectedGroup(group);
    };

    // Calculate overall average grade for all labs
    const calculateOverallAverage = () => {
        let totalSum = 0;
        let totalCount = 0;

        subjects.forEach(subject => {
            subject.groups.forEach(group => {
                if (group.group_average > 0) {
                    totalSum += group.group_average;
                    totalCount++;
                }
            });
        });

        return totalCount > 0 ? totalSum / totalCount : 0;
    };

    // Get the number of lab assignments across all subjects
    const getTotalLabsCount = () => {
        let totalLabs = 0;
        subjects.forEach(subject => {
            subject.groups.forEach(group => {
                totalLabs += group.total_labs;
            });
        });
        return totalLabs;
    };

    // Get the number of groups across all subjects
    const getGroupsCount = () => {
        const uniqueGroups = new Set();
        subjects.forEach(subject => {
            subject.groups.forEach(group => {
                uniqueGroups.add(group.name);
            });
        });
        return uniqueGroups.size;
    };

    const overallAverage = calculateOverallAverage();
    const totalLabsCount = getTotalLabsCount();
    const groupsCount = getGroupsCount();

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
                <h1 className="page-title">Teacher Labs</h1>
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
                            className="tab-button"
                            onClick={() => navigate(`/admin/teachers/${id}/attendance`)}
                        >
                            Attendance
                        </button>
                        <button
                            className="tab-button tab-button-active"
                            onClick={() => navigate(`/admin/teachers/${id}/labs`)}
                        >
                            Labs
                        </button>
                    </div>
                </div>
            </div>

            {/* Labs Summary */}
            <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-4">Labs Summary</h2>

                <div className="summary-stats">
                    <div className="summary-stat">
                        <div className="stat-label">Total Subjects</div>
                        <div className="stat-value">{subjects.length}</div>
                    </div>

                    <div className="summary-stat">
                        <div className="stat-label">Total Groups</div>
                        <div className="stat-value">{groupsCount}</div>
                    </div>

                    <div className="summary-stat">
                        <div className="stat-label">Total Lab Assignments</div>
                        <div className="stat-value">{totalLabsCount}</div>
                    </div>

                    <div className="summary-stat">
                        <div className="stat-label">Average Grade</div>
                        <div className="stat-value">
                            {overallAverage.toFixed(1)}
                        </div>
                    </div>
                </div>
            </div>

            {/* Subject/Group Selection */}
            {subjects.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 2v7.31"></path>
                            <path d="M14 9.3V1.99"></path>
                            <path d="M8.5 2h7"></path>
                            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                        </svg>
                        <h3>No Lab Data</h3>
                        <p>This teacher doesn't have any lab assignments yet.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-12 gap-6">
                    {/* Subjects List - Left Column */}
                    <div className="col-span-3">
                        <div className="card h-full">
                            <h3 className="text-lg font-semibold mb-4">Subjects</h3>

                            <div className="subjects-list">
                                {subjects.map((subject, index) => (
                                    <button
                                        key={index}
                                        className={`subject-item ${selectedSubject === subject ? 'subject-active' : ''}`}
                                        onClick={() => handleSubjectSelect(subject)}
                                    >
                                        <div className="subject-color" style={{ backgroundColor: getSubjectColor(index) }}></div>
                                        <div className="subject-details">
                                            <div className="subject-name">{subject.subject}</div>
                                            <div className="subject-group-count">
                                                {subject.groups.length} {subject.groups.length === 1 ? 'group' : 'groups'}
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Groups/Labs Detail - Right Column */}
                    <div className="col-span-9">
                        {!selectedSubject ? (
                            <div className="card">
                                <div className="selection-placeholder">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <path d="M12 8l4 4-4 4M8 12h8"></path>
                                    </svg>
                                    <h3>Select a Subject</h3>
                                    <p>Select a subject from the list to view group and lab details.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="card">
                                <div className="d-flex justify-content-between align-items-center mb-4">
                                    <h3 className="text-lg font-semibold">
                                        {selectedSubject.subject}
                                        <span className="subject-subtitle"> - {selectedSubject.groups.length} groups</span>
                                    </h3>
                                </div>

                                {/* Groups Navigation */}
                                <div className="groups-navigation mb-4">
                                    {selectedSubject.groups.map((group, index) => (
                                        <button
                                            key={index}
                                            className={`group-button ${selectedGroup === group ? 'group-active' : ''}`}
                                            onClick={() => handleGroupSelect(group)}
                                        >
                                            {group.name}
                                            <span className="group-avg">
                                                {group.group_average.toFixed(1)}
                                            </span>
                                        </button>
                                    ))}
                                </div>

                                {/* Group Details / Lab Details */}
                                {!selectedGroup ? (
                                    <div className="groups-overview">
                                        <h4 className="text-md font-semibold mb-3">Groups Overview</h4>

                                        <div className="table-container">
                                            <table className="table">
                                                <thead>
                                                <tr>
                                                    <th>Group</th>
                                                    <th>Students</th>
                                                    <th>Total Labs</th>
                                                    <th>Average Grade</th>
                                                </tr>
                                                </thead>
                                                <tbody>
                                                {selectedSubject.groups.map((group, index) => (
                                                    <tr key={index}>
                                                        <td>{group.name}</td>
                                                        <td>{group.student_count}</td>
                                                        <td>{group.total_labs}</td>
                                                        <td>
                                                            <div
                                                                className={`grade-badge ${
                                                                    group.group_average >= 4 ? 'grade-success' :
                                                                        group.group_average >= 3 ? 'grade-warning' :
                                                                            'grade-danger'
                                                                }`}
                                                            >
                                                                {group.group_average.toFixed(1)}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group-details">
                                        <div className="group-header mb-4">
                                            <h4 className="text-md font-semibold">{selectedGroup.name}</h4>
                                            <div className="group-meta">
                                                <div className="meta-item">
                                                    <span className="meta-label">Students:</span>
                                                    <span className="meta-value">{selectedGroup.student_count}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <span className="meta-label">Labs:</span>
                                                    <span className="meta-value">{selectedGroup.total_labs}</span>
                                                </div>
                                                <div className="meta-item">
                                                    <span className="meta-label">Average:</span>
                                                    <span className="meta-value">{selectedGroup.group_average.toFixed(1)}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grade-visualization">
                                            <h5 className="text-sm font-semibold mb-2">Average Grade Distribution</h5>
                                            <div className="grade-meter">
                                                <div className="grade-scale">
                                                    <div className="grade-marker grade-marker-1">1</div>
                                                    <div className="grade-marker grade-marker-2">2</div>
                                                    <div className="grade-marker grade-marker-3">3</div>
                                                    <div className="grade-marker grade-marker-4">4</div>
                                                    <div className="grade-marker grade-marker-5">5</div>
                                                </div>
                                                <div className="grade-pointer" style={{
                                                    left: `${Math.min(Math.max(selectedGroup.group_average / 5 * 100, 0), 100)}%`
                                                }}></div>
                                            </div>
                                        </div>

                                        <div className="labs-grid">
                                            {Array.from({ length: selectedGroup.total_labs }, (_, i) => (
                                                <div key={i} className="lab-card">
                                                    <div className="lab-number">Lab {i + 1}</div>
                                                    <div className="lab-placeholder">
                                                        <span>Details not available in admin view</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}

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
                
                .empty-state {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--text-tertiary);
                }
                
                .empty-state svg, .selection-placeholder svg {
                    margin-bottom: 1rem;
                    opacity: 0.5;
                }
                
                .empty-state h3, .selection-placeholder h3 {
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                
                .selection-placeholder {
                    text-align: center;
                    padding: 3rem 1rem;
                    color: var(--text-tertiary);
                }
                
                .subjects-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .subject-item {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    border: 1px solid transparent;
                    cursor: pointer;
                    text-align: left;
                    width: 100%;
                    transition: all var(--transition-fast) ease;
                }
                
                .subject-item:hover {
                    background-color: var(--bg-dark);
                }
                
                .subject-active {
                    border-color: var(--primary);
                    background-color: var(--primary-lighter);
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
                
                .subject-subtitle {
                    font-size: 0.875rem;
                    font-weight: normal;
                    color: var(--text-tertiary);
                    margin-left: 0.5rem;
                }
                
                .groups-navigation {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .group-button {
                    padding: 0.5rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    color: var(--text-secondary);
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all var(--transition-fast) ease;
                }
                
                .group-button:hover {
                    background-color: var(--bg-dark);
                    color: var(--text-primary);
                }
                
                .group-active {
                    border-color: var(--primary);
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                }
                
                .group-avg {
                    font-size: 0.75rem;
                    padding: 0.125rem 0.375rem;
                    background-color: var(--bg-dark);
                    border-radius: var(--radius-full);
                    font-weight: 600;
                }
                
                .group-active .group-avg {
                    background-color: var(--primary);
                    color: var(--bg-dark);
                }
                
                .grade-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius-full);
                    font-weight: 600;
                    font-size: 0.75rem;
                }
                
                .grade-success {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .grade-warning {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .grade-danger {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .group-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--border-color);
                    padding-bottom: 1rem;
                    margin-bottom: 1.5rem;
                }
                
                .group-meta {
                    display: flex;
                    gap: 1.5rem;
                }
                
                .meta-item {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .meta-label {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                }
                
                .meta-value {
                    font-weight: 600;
                }
                
                .grade-visualization {
                    margin-bottom: 2rem;
                }
                
                .grade-meter {
                    background-color: var(--bg-dark);
                    height: 4px;
                    border-radius: var(--radius-full);
                    position: relative;
                    margin-top: 1.5rem;
                    margin-bottom: 1.5rem;
                }
                
                .grade-scale {
                    display: flex;
                    justify-content: space-between;
                    position: absolute;
                    width: 100%;
                    top: -1.5rem;
                }
                
                .grade-marker {
                    width: 20px;
                    height: 20px;
                    background-color: var(--bg-dark-tertiary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    position: relative;
                }
                
                .grade-marker-1 {
                    left: 0%;
                    transform: translateX(-50%);
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .grade-marker-2 {
                    left: 25%;
                    transform: translateX(-50%);
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .grade-marker-3 {
                    left: 50%;
                    transform: translateX(-50%);
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .grade-marker-4 {
                    left: 75%;
                    transform: translateX(-50%);
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .grade-marker-5 {
                    left: 100%;
                    transform: translateX(-50%);
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .grade-pointer {
                    position: absolute;
                    width: 12px;
                    height: 12px;
                    background-color: var(--primary);
                    border-radius: var(--radius-full);
                    top: 50%;
                    transform: translate(-50%, -50%);
                }
                
                .labs-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-top: 1.5rem;
                }
                
                .lab-card {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                }
                
                .lab-number {
                    background-color: var(--bg-dark-tertiary);
                    padding: 0.5rem;
                    text-align: center;
                    font-weight: 500;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .lab-placeholder {
                    padding: 1.5rem 1rem;
                    text-align: center;
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                }
                
                @media (max-width: 1024px) {
                    .summary-stats {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .col-span-3, .col-span-9 {
                        grid-column: span 12;
                    }
                }
                
                @media (max-width: 768px) {
                    .summary-stats {
                        grid-template-columns: 1fr;
                    }
                    
                    .group-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .group-meta {
                        margin-top: 0.5rem;
                        flex-wrap: wrap;
                        gap: 1rem;
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

export default TeacherLabs;