import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { attendanceService, groupService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function AttendanceReport() {
    const { isFree } = useAuth();
    const [filters, setFilters] = useState({
        group: '',
        subject: '',
        date_from: '',
        date_to: '',
        report_type: 'group' // 'group' or 'subject'
    });

    // Set initial date filters to current month
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters(prev => ({
            ...prev,
            date_from: firstDay.toISOString().split('T')[0],
            date_to: lastDay.toISOString().split('T')[0]
        }));
    }, []);

    // Fetch groups for filter dropdown
    const { data: groupsData } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups,
        enabled: !isFree
    });

    // Fetch subjects for filter dropdown
    const { data: subjectsData } = useQuery({
        queryKey: ['subjects'],
        queryFn: lessonService.getSubjects,
        enabled: !isFree
    });

    // Fetch attendance data with filters
    const { data: attendanceData, isLoading, error } = useQuery({
        queryKey: ['attendance', filters],
        queryFn: () => attendanceService.getAttendance(filters),
        enabled: !isFree // Only fetch if user has subscription
    });

    const groups = groupsData?.data?.data || [];
    const subjects = subjectsData?.data?.data || [];
    const attendanceRecords = attendanceData?.data?.data || [];

    // Process the attendance data into report format
    const processAttendanceData = React.useCallback(() => {
        if (!attendanceRecords.length) return null;

        if (filters.report_type === 'group') {
            // Group by group name
            const groupedData = {};

            attendanceRecords.forEach(record => {
                if (!groupedData[record.group_name]) {
                    groupedData[record.group_name] = {
                        name: record.group_name,
                        lessons: [],
                        total_students: record.total_students,
                        attended_sum: 0,
                        total_sum: 0
                    };
                }

                groupedData[record.group_name].lessons.push({
                    date: record.date,
                    attended: record.attended_students,
                    total: record.total_students,
                    rate: record.attendance_rate
                });

                groupedData[record.group_name].attended_sum += record.attended_students;
                groupedData[record.group_name].total_sum += record.total_students;
            });

            // Calculate averages and prepare the final format
            const items = Object.values(groupedData).map(group => ({
                name: group.name,
                total_lessons: group.lessons.length,
                average_attendance: group.total_sum > 0 ? (group.attended_sum / group.total_sum) * 100 : 0,
                students: group.lessons.map((lesson, i) => ({
                    name: `Lesson ${i + 1} (${formatDate(lesson.date)})`,
                    attended: lesson.attended,
                    total: lesson.total,
                    rate: lesson.rate
                }))
            }));

            // Prepare chart data - attendance over time
            const chartData = [];
            if (items.length > 0 && items[0].students.length > 0) {
                chartData.push(...items[0].students.map(student => ({
                    name: student.name.split(' ')[1], // Extract date part
                    present: student.rate,
                    absent: 100 - student.rate
                })));
            }

            return {
                report_type: 'Group',
                report_title: filters.group || 'All Groups',
                period: `${formatDate(filters.date_from)} to ${formatDate(filters.date_to)}`,
                items,
                chartData
            };
        } else {
            // Group by subject
            const groupedData = {};

            attendanceRecords.forEach(record => {
                if (!groupedData[record.subject]) {
                    groupedData[record.subject] = {
                        name: record.subject,
                        groups: {},
                        total_students: 0,
                        attended_sum: 0,
                        total_sum: 0
                    };
                }

                if (!groupedData[record.subject].groups[record.group_name]) {
                    groupedData[record.subject].groups[record.group_name] = {
                        name: record.group_name,
                        attended_students: 0,
                        total_students: 0,
                        lessons_count: 0
                    };
                }

                groupedData[record.subject].groups[record.group_name].attended_students += record.attended_students;
                groupedData[record.subject].groups[record.group_name].total_students += record.total_students;
                groupedData[record.subject].groups[record.group_name].lessons_count++;

                groupedData[record.subject].attended_sum += record.attended_students;
                groupedData[record.subject].total_sum += record.total_students;
            });

            // Calculate rates and prepare the final format
            const items = Object.values(groupedData).map(subject => ({
                name: subject.name,
                total_lessons: Math.max(...Object.values(subject.groups).map(g => g.lessons_count)),
                average_attendance: subject.total_sum > 0 ? (subject.attended_sum / subject.total_sum) * 100 : 0,
                groups: Object.values(subject.groups).map(group => ({
                    name: group.name,
                    attended_students: group.attended_students,
                    total_students: group.total_students,
                    rate: group.total_students > 0 ? (group.attended_students / group.total_students) * 100 : 0
                }))
            }));

            // Prepare chart data - attendance by subject
            const chartData = items.map(item => ({
                name: item.name,
                present: item.average_attendance,
                absent: 100 - item.average_attendance
            }));

            return {
                report_type: 'Subject',
                report_title: filters.subject || 'All Subjects',
                period: `${formatDate(filters.date_from)} to ${formatDate(filters.date_to)}`,
                items,
                chartData
            };
        }
    }, [attendanceRecords, filters]);

    const reportData = processAttendanceData();

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const resetFilters = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters({
            group: '',
            subject: '',
            date_from: firstDay.toISOString().split('T')[0],
            date_to: lastDay.toISOString().split('T')[0],
            report_type: 'group'
        });
    };

    const handleExport = async () => {
        try {
            const mode = filters.report_type;
            const response = await attendanceService.exportAttendance(mode);

            // Create a blob from the response
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);

            // Create a temporary link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `attendance_report_${mode}_${new Date().toISOString().split('T')[0]}.xlsx`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting attendance report:', error);
            alert('Failed to export attendance report');
        }
    };

    // Helper function to format dates consistently
    function formatDate(dateString) {
        if (!dateString) return 'N/A';

        try {
            // Check if the date is in DD.MM.YYYY format
            if (dateString.includes('.')) {
                const [day, month, year] = dateString.split('.');
                return new Date(`${year}-${month}-${day}`).toLocaleDateString();
            }

            // Otherwise assume it's ISO or another format that Date can handle
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            console.error('Error formatting date:', error, dateString);
            return dateString; // Return the original string if parsing fails
        }
    }

    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Attendance Reports</h1>
                        <p className="text-secondary">Generate detailed attendance analytics</p>
                    </div>
                    <Link to="/attendance" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </div>
                <RequireSubscription />
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Attendance Reports</h1>
                    <p className="text-secondary">Generate detailed attendance analytics</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="btn btn-primary flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span className="hidden sm:inline">Export</span>
                    </button>
                    <Link to="/attendance" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </div>
            </div>

            {/* Report Filters */}
            <div className="card mb-6">
                <h3 className="text-xl font-semibold mb-4">Report Settings</h3>
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="form-group">
                            <label htmlFor="report_type" className="form-label">Report Type</label>
                            <select
                                id="report_type"
                                name="report_type"
                                value={filters.report_type}
                                onChange={handleFilterChange}
                                className="form-control"
                            >
                                <option value="group">Group Report</option>
                                <option value="subject">Subject Report</option>
                            </select>
                        </div>

                        {filters.report_type === 'group' ? (
                            <div className="form-group">
                                <label htmlFor="group" className="form-label">Group</label>
                                <select
                                    id="group"
                                    name="group"
                                    value={filters.group}
                                    onChange={handleFilterChange}
                                    className="form-control"
                                >
                                    <option value="">All Groups</option>
                                    {groups.map(group => (
                                        <option key={group.name} value={group.name}>{group.name}</option>
                                    ))}
                                </select>
                            </div>
                        ) : (
                            <div className="form-group">
                                <label htmlFor="subject" className="form-label">Subject</label>
                                <select
                                    id="subject"
                                    name="subject"
                                    value={filters.subject}
                                    onChange={handleFilterChange}
                                    className="form-control"
                                >
                                    <option value="">All Subjects</option>
                                    {subjects.map(subject => (
                                        <option key={subject} value={subject}>{subject}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="form-group">
                            <label htmlFor="date_from" className="form-label">From Date</label>
                            <input
                                type="date"
                                id="date_from"
                                name="date_from"
                                value={filters.date_from}
                                onChange={handleFilterChange}
                                className="form-control"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="date_to" className="form-label">To Date</label>
                            <input
                                type="date"
                                id="date_to"
                                name="date_to"
                                value={filters.date_to}
                                onChange={handleFilterChange}
                                className="form-control"
                            />
                        </div>
                        <div className="flex items-end">
                            <button onClick={resetFilters} className="btn btn-outline flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 12a9 9 0 0 1-9 9c-2.39 0-4.68-.94-6.4-2.65L3 16"></path>
                                    <path d="M3 12a9 9 0 0 1 9-9c2.39 0 4.68.94 6.4 2.65L21 8"></path>
                                    <path d="M3 8h6"></path>
                                    <path d="M15 16h6"></path>
                                </svg>
                                Reset Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Display */}
            {isLoading ? (
                <div className="card flex items-center justify-center p-12">
                    <div className="spinner"></div>
                </div>
            ) : error ? (
                <div className="alert alert-danger">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <p>Error loading report data: {error.message}</p>
                    </div>
                </div>
            ) : !reportData || !reportData.items || reportData.items.length === 0 ? (
                <div className="card p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full mx-auto flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <h3 className="text-xl mb-2">No attendance data found</h3>
                        <p className="text-tertiary mb-6">Try changing your filters or record attendance for your lessons.</p>
                    </div>
                </div>
            ) : (
                <div className="card mb-6">
                    <div className="mb-4">
                        <h2 className="text-2xl font-bold">{reportData.report_type} Attendance Report</h2>
                        <h3 className="text-xl text-primary mb-2">{reportData.report_title}</h3>
                        <p className="text-secondary"><strong>Period:</strong> {reportData.period}</p>
                    </div>

                    {/* Attendance Visualization */}
                    {reportData.chartData && reportData.chartData.length > 0 && (
                        <div className="mb-6 pt-4 pb-6 border-t border-b border-border-color">
                            <h3 className="text-lg font-medium mb-4">Attendance Overview</h3>
                            <div className="h-64 flex items-end gap-1">
                                {reportData.chartData.map((item, index) => (
                                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="w-full flex flex-col items-center">
                                            <div className="chart-bar bg-success"
                                                 style={{ height: `${Math.min(item.present || 0, 100) * 2}px` }}></div>
                                            <div className="chart-bar bg-danger"
                                                 style={{ height: `${Math.min(item.absent || 0, 100) * 2}px` }}></div>
                                        </div>
                                        <div className="text-xs text-tertiary whitespace-nowrap overflow-hidden text-ellipsis"
                                             style={{maxWidth: '80px', textAlign: 'center'}}>
                                            {item.name}
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-center mt-4 gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-success rounded-sm"></div>
                                    <span className="text-sm">Present</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-danger rounded-sm"></div>
                                    <span className="text-sm">Absent</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {reportData.items.map((item, index) => (
                        <div key={index} className="mb-6">
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-3 h-12 rounded-sm" style={{backgroundColor: getItemColor(index)}}></div>
                                <div>
                                    <h4 className="text-lg font-semibold">{item.name}</h4>
                                    <p className="text-secondary">
                                        <strong>Total Lessons:</strong> {item.total_lessons} |
                                        <strong> Average Attendance:</strong> <span className={getAttendanceColorClass(item.average_attendance)}>{item.average_attendance.toFixed(1)}%</span>
                                    </p>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th>{filters.report_type === 'group' ? 'Lesson' : 'Group'}</th>
                                        <th>{filters.report_type === 'group' ? 'Students Present' : 'Students Present'}</th>
                                        <th>{filters.report_type === 'group' ? 'Total Students' : 'Total Students'}</th>
                                        <th>Attendance Rate</th>
                                        <th>Status</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {filters.report_type === 'group' ? (
                                        item.students.map((student, studentIndex) => (
                                            <tr key={studentIndex}>
                                                <td className="font-medium">{student.name}</td>
                                                <td>{student.attended}</td>
                                                <td>{student.total}</td>
                                                <td className={getAttendanceColorClass(student.rate)}>{student.rate.toFixed(1)}%</td>
                                                <td>
                                                    <div className="attendance-indicator">
                                                        <div className="progress" style={{ width: '120px' }}>
                                                            <div
                                                                className={`progress-bar ${getProgressBarClass(student.rate)}`}
                                                                style={{ width: `${student.rate}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        item.groups.map((group, groupIndex) => (
                                            <tr key={groupIndex}>
                                                <td className="font-medium">{group.name}</td>
                                                <td>{group.attended_students}</td>
                                                <td>{group.total_students}</td>
                                                <td className={getAttendanceColorClass(group.rate)}>{group.rate.toFixed(1)}%</td>
                                                <td>
                                                    <div className="attendance-indicator">
                                                        <div className="progress" style={{ width: '120px' }}>
                                                            <div
                                                                className={`progress-bar ${getProgressBarClass(group.rate)}`}
                                                                style={{ width: `${group.rate}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <style jsx="true">{`
                .attendance-indicator {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }

                .progress {
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-full);
                    overflow: hidden;
                    height: 8px;
                }
                
                .progress-bar {
                    height: 100%;
                }
                
                .progress-bar-success {
                    background-color: var(--success);
                }
                
                .progress-bar-warning {
                    background-color: var(--warning);
                }
                
                .progress-bar-danger {
                    background-color: var(--danger);
                }
                
                .chart-bar {
                    width: 100%;
                    border-radius: 2px;
                    max-width: 40px;
                    transition: height 0.3s ease;
                }
                
                .spinner {
                    width: 2.5rem;
                    height: 2.5rem;
                    border: 3px solid var(--bg-dark-tertiary);
                    border-radius: 50%;
                    border-top-color: var(--primary);
                    animation: spin 1s ease-in-out infinite;
                }
                
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
            `}</style>
        </div>
    );
}

// Helper function to get a color for an item based on index
function getItemColor(index) {
    const colors = [
        'var(--primary)',
        'var(--success)',
        'var(--warning)',
        'var(--accent)',
        '#9333ea', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
    ];

    return colors[index % colors.length];
}

// Helper functions for attendance colors
function getAttendanceColorClass(rate) {
    if (rate >= 85) return 'text-success';
    if (rate >= 70) return 'text-warning';
    return 'text-danger';
}

function getProgressBarClass(rate) {
    if (rate >= 85) return 'progress-bar-success';
    if (rate >= 70) return 'progress-bar-warning';
    return 'progress-bar-danger';
}

export default AttendanceReport;