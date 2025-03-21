import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function LessonAttendance() {
    const { id } = useParams();
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const dataFetchedRef = useRef(false);

    // State to track attendance
    const [attendanceData, setAttendanceData] = useState({
        attended_student_ids: []
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [rawAttendanceData, setRawAttendanceData] = useState(null);

    // Debug Mode
    const [debugMode, setDebugMode] = useState(false);

    // Fetch lesson details
    const { data: lessonData, isLoading: lessonLoading, error: lessonError } = useQuery({
        queryKey: ['lesson', id],
        queryFn: () => lessonService.getLesson(id)
    });

    // Fetch lesson attendance with minimal processing
    const {
        data: attendanceDetails,
        isLoading: attendanceLoading,
        error: attendanceError,
        refetch: refetchAttendance
    } = useQuery({
        queryKey: ['lesson-attendance', id],
        queryFn: () => attendanceService.getLessonAttendance(id),
        onSuccess: (response) => {
            // Store the raw data for debugging
            setRawAttendanceData(response?.data);
            console.log('Raw API Response:', response);
        }
    });

    // Process attendance data separately from the query
    useEffect(() => {
        if (attendanceDetails && !dataFetchedRef.current) {
            console.log('Processing attendance data from API response:', attendanceDetails);

            try {
                // Get the raw response data
                const responseData = attendanceDetails.data;

                // Extract student data and attendance information
                let studentsArray = [];
                let attendedIds = [];

                // Try to find the students array in various locations
                if (responseData?.data?.students && Array.isArray(responseData.data.students)) {
                    studentsArray = responseData.data.students;
                } else if (responseData?.students && Array.isArray(responseData.students)) {
                    studentsArray = responseData.students;
                } else if (Array.isArray(responseData)) {
                    studentsArray = responseData;
                } else if (responseData?.data && Array.isArray(responseData.data)) {
                    studentsArray = responseData.data;
                }

                console.log('Found students array:', studentsArray);

                // If we found a students array, look for attended status
                if (studentsArray && studentsArray.length > 0) {
                    // Log the first student to see its structure
                    console.log('Sample student object:', studentsArray[0]);

                    // Try to extract attended student IDs from various possible formats
                    attendedIds = studentsArray
                        .filter(student => {
                            // Check various properties for attendance status
                            const isAttended =
                                student.attended === true ||
                                student.attended === 1 ||
                                student.attendance === true ||
                                student.attendance === 1 ||
                                student.status === 'present' ||
                                student.status === 'attended' ||
                                student.isPresent === true ||
                                student.present === true;

                            console.log(`Student ${student.id || student._id}: Attendance status determined as ${isAttended}`);
                            return isAttended;
                        })
                        .map(student => student.id || student._id || student.studentId);
                }

                // Direct extraction if available
                if (!attendedIds.length) {
                    if (responseData?.data?.attended_student_ids && Array.isArray(responseData.data.attended_student_ids)) {
                        attendedIds = responseData.data.attended_student_ids;
                    } else if (responseData?.attended_student_ids && Array.isArray(responseData.attended_student_ids)) {
                        attendedIds = responseData.attended_student_ids;
                    }
                }

                console.log('Extracted attended student IDs:', attendedIds);

                // Set the attendance data
                setAttendanceData({ attended_student_ids: attendedIds });
                dataFetchedRef.current = true;
            } catch (err) {
                console.error('Error processing attendance data:', err);
                setError('Error processing attendance data');
            }
        }
    }, [attendanceDetails]);

    // Debug function to show data structures
    const toggleDebugMode = () => {
        setDebugMode(prevMode => !prevMode);
    };

    // Manual Attendance Override Functions
    const manuallySetAttendance = (studentList) => {
        console.log('Manually setting attendance for students:', studentList);
        setAttendanceData({ attended_student_ids: studentList });
    };

    // Save attendance mutation
    const saveMutation = useMutation({
        mutationFn: (data) => attendanceService.saveAttendance(id, data),
        onSuccess: () => {
            setSuccess('Attendance saved successfully');
            dataFetchedRef.current = false; // Reset so we can fetch new data
            queryClient.invalidateQueries({ queryKey: ['lesson-attendance', id] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to save attendance');
        }
    });

    // Delete attendance mutation
    const deleteMutation = useMutation({
        mutationFn: () => attendanceService.deleteAttendance(id),
        onSuccess: () => {
            setSuccess('Attendance record deleted');
            queryClient.invalidateQueries({ queryKey: ['lesson-attendance', id] });
            queryClient.invalidateQueries({ queryKey: ['attendance'] });
            // Reset attendance data
            setAttendanceData({ attended_student_ids: [] });
            setShowConfirmation(false);
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to delete attendance record');
        }
    });

    const toggleStudentAttendance = (studentId) => {
        setAttendanceData(prev => {
            const isPresent = prev.attended_student_ids.includes(studentId);

            if (isPresent) {
                // Remove student from attended list
                return {
                    ...prev,
                    attended_student_ids: prev.attended_student_ids.filter(id => id !== studentId)
                };
            } else {
                // Add student to attended list
                return {
                    ...prev,
                    attended_student_ids: [...prev.attended_student_ids, studentId]
                };
            }
        });
    };

    const markAllPresent = () => {
        if (attendanceDetails?.data?.data?.students) {
            const allStudentIds = attendanceDetails.data.data.students.map(student => student.id);
            setAttendanceData({ attended_student_ids: allStudentIds });
        }
    };

    const markAllAbsent = () => {
        setAttendanceData({ attended_student_ids: [] });
    };

    const handleSave = async () => {
        try {
            console.log('Saving attendance data:', attendanceData);
            await saveMutation.mutateAsync(attendanceData);
        } catch (error) {
            // Error is handled in the mutation
        }
    };

    const handleDelete = async () => {
        try {
            await deleteMutation.mutateAsync();
        } catch (error) {
            // Error is handled in the mutation
        }
    };

    // Manual data refresh
    const handleRefresh = () => {
        dataFetchedRef.current = false;
        refetchAttendance();
    };

    // Get data from queries
    const lesson = lessonData?.data?.data;
    const attendance = attendanceDetails?.data?.data;

    // For manual testing - shows structure of students
    const studentsFromAttendance = attendance?.students || [];

    // Check for subscription
    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Lesson Attendance</h1>
                        <p className="text-secondary">Manage student attendance for this lesson</p>
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

    // Loading state
    if (lessonLoading || attendanceLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    // Error state
    if (lessonError || attendanceError) {
        return (
            <div className="alert alert-danger mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p>Error: {lessonError?.message || attendanceError?.message}</p>
                </div>
            </div>
        );
    }

    // Missing data state
    if (!lesson) {
        return (
            <div className="alert alert-warning mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <p>Lesson not found</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Lesson Attendance</h1>
                    <p className="text-secondary">Manage student attendance for this lesson</p>
                </div>
                <div className="flex gap-2">
                    <Link to="/attendance" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                    <Link to={`/lessons/${id}`} className="btn btn-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                        <span className="hidden sm:inline">View Lesson</span>
                    </Link>
                </div>
            </div>

            {/* Lesson Details */}
            <div className="card p-6 mb-6">
                <div className="flex flex-col md:flex-row md:items-start gap-4">
                    <div className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 bg-primary-lighter text-primary rounded-lg flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                            <polyline points="2 17 12 22 22 17"></polyline>
                            <polyline points="2 12 12 17 22 12"></polyline>
                        </svg>
                    </div>

                    <div className="flex-1">
                        <h2 className="text-2xl font-semibold mb-2">{lesson.topic}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span className="text-secondary">Date:</span>
                                <span>{new Date(lesson.date).toLocaleDateString()}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                </svg>
                                <span className="text-secondary">Subject:</span>
                                <span>{lesson.subject}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                                <span className="text-secondary">Group:</span>
                                <span>{lesson.group_name}</span>
                            </div>

                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span className="text-secondary">Type:</span>
                                <span>{lesson.type}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Attendance Management */}
            <div className="card mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold mb-2 sm:mb-0">Manage Attendance</h2>
                    <div className="flex gap-2">
                        <button onClick={markAllPresent} className="btn btn-success flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 11 12 14 22 4"></polyline>
                                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                            </svg>
                            <span className="hidden sm:inline">Mark All Present</span>
                        </button>
                        <button onClick={markAllAbsent} className="btn btn-danger flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span className="hidden sm:inline">Mark All Absent</span>
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="alert alert-danger mb-4">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                                <line x1="12" y1="9" x2="12" y2="13"></line>
                                <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                            <p>{error}</p>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="alert alert-success mb-4">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                            <p>{success}</p>
                        </div>
                    </div>
                )}

                {!attendance || !attendance.students ? (
                    <div className="alert alert-info">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <p>No student data available for this lesson</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Square Stats Cards */}
                        <div className="grid grid-cols-4 gap-4 mb-6">
                            {/* Total Students */}
                            <div className="stat-card bg-bg-dark-secondary p-4 rounded-lg flex flex-col items-center justify-center text-center border-t-4" style={{ borderTopColor: 'var(--primary)', height: '120px' }}>
                                <div className="text-sm text-text-tertiary mb-2">Total Students</div>
                                <div className="text-3xl font-bold">{attendance.total_students}</div>
                            </div>

                            {/* Present */}
                            <div className="stat-card bg-bg-dark-secondary p-4 rounded-lg flex flex-col items-center justify-center text-center border-t-4" style={{ borderTopColor: 'var(--success)', height: '120px' }}>
                                <div className="text-sm text-text-tertiary mb-2">Present</div>
                                <div className="text-3xl font-bold text-success">{attendanceData.attended_student_ids.length}</div>
                            </div>

                            {/* Absent */}
                            <div className="stat-card bg-bg-dark-secondary p-4 rounded-lg flex flex-col items-center justify-center text-center border-t-4" style={{ borderTopColor: 'var(--danger)', height: '120px' }}>
                                <div className="text-sm text-text-tertiary mb-2">Absent</div>
                                <div className="text-3xl font-bold text-danger">{attendance.total_students - attendanceData.attended_student_ids.length}</div>
                            </div>

                            {/* Attendance Rate */}
                            <div className="stat-card bg-bg-dark-secondary p-4 rounded-lg flex flex-col items-center justify-center text-center border-t-4" style={{ borderTopColor: 'var(--accent)', height: '120px' }}>
                                <div className="text-sm text-text-tertiary mb-2">Attendance Rate</div>
                                <div className="text-3xl font-bold">
                                    {attendance.total_students > 0
                                        ? ((attendanceData.attended_student_ids.length / attendance.total_students) * 100).toFixed(1)
                                        : 0}%
                                </div>
                                <div className="w-full mt-2">
                                    <div className="w-full h-2 bg-bg-dark rounded-full">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${attendance.total_students > 0
                                                    ? ((attendanceData.attended_student_ids.length / attendance.total_students) * 100)
                                                    : 0}%`,
                                                backgroundColor: 'var(--accent)'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Student attendance cards */}
                        <div className="attendance-grid mb-6">
                            {attendance.students.map(student => {
                                // Check for presence by comparing to the state
                                const isPresent = attendanceData.attended_student_ids.includes(student.id);
                                return (
                                    <div
                                        key={student.id}
                                        className={`attendance-cell ${isPresent ? 'present' : 'absent'}`}
                                        onClick={() => toggleStudentAttendance(student.id)}
                                    >
                                        <div className="attendance-status">
                                            {isPresent ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="9 11 12 14 22 4"></polyline>
                                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            )}
                                        </div>
                                        <div className="attendance-name">
                                            {student.fio}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 pt-4 border-t border-border-color flex flex-wrap gap-3">
                            <button
                                onClick={handleSave}
                                className="btn btn-primary flex items-center gap-2"
                                disabled={saveMutation.isPending}
                            >
                                {saveMutation.isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                            <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                            <polyline points="7 3 7 8 15 8"></polyline>
                                        </svg>
                                        Save Attendance
                                    </>
                                )}
                            </button>

                            {attendance && attendance.total_students > 0 && (
                                <button
                                    onClick={() => setShowConfirmation(true)}
                                    className="btn btn-danger flex items-center gap-2"
                                    disabled={deleteMutation.isPending}
                                >
                                    {deleteMutation.isPending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                            Delete Attendance Record
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* Confirmation dialog for delete action */}
            {showConfirmation && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-bg-dark-secondary p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                        <p className="mb-6">Are you sure you want to delete this attendance record? This action cannot be undone.</p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete()}
                                className="btn btn-danger"
                            >
                                Delete Record
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                .attendance-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 10px;
                }
                
                .attendance-cell {
                    display: flex;
                    align-items: center;
                    padding: 10px;
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .attendance-cell.present {
                    background-color: var(--success-lighter);
                    border: 1px solid var(--success-light);
                }
                
                .attendance-cell.absent {
                    background-color: var(--danger-lighter);
                    border: 1px solid var(--danger-light);
                }
                
                .attendance-cell:hover {
                    transform: translateY(-2px);
                    box-shadow: var(--shadow-md);
                }
                
                .attendance-status {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    margin-right: 10px;
                }
                
                .present .attendance-status {
                    background-color: var(--success);
                    color: white;
                }
                
                .absent .attendance-status {
                    background-color: var(--danger);
                    color: white;
                }
                
                .attendance-name {
                    font-weight: 500;
                }
                
                .present .attendance-name {
                    color: var(--success);
                }
                
                .absent .attendance-name {
                    color: var(--danger);
                }
                
                .stat-card {
                    transition: all 0.2s ease;
                }
                
                .stat-card:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-lg);
                }
                
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                }

                /* Responsive adjustments */
                @media (max-width: 767px) {
                    .grid-cols-4 {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 479px) {
                    .grid-cols-4 {
                        grid-template-columns: repeat(1, 1fr);
                    }
                    
                    .stat-card {
                        height: 100px !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default LessonAttendance;