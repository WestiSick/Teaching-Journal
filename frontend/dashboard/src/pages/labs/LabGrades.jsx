import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService, groupService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function LabGrades() {
    const { subject, group } = useParams();
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const decodedSubject = decodeURIComponent(subject);
    const decodedGroup = decodeURIComponent(group);

    // State for lab settings
    const [labSettings, setLabSettings] = useState({
        total_labs: 0
    });

    // State for lab grades
    const [grades, setGrades] = useState([]);

    // State for share settings
    const [shareSettings, setShareSettings] = useState({
        expiration_days: 7
    });

    // State for showing share dialog
    const [showShareDialog, setShowShareDialog] = useState(false);
    const [shareLink, setShareLink] = useState('');

    // State for errors and success messages
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // State for debounce save timeout
    const [saveTimeout, setSaveTimeout] = useState(null);

    // State for active tab
    const [activeTab, setActiveTab] = useState('grades'); // 'grades' or 'stats'

    // Helper function to calculate average from grades (only counting non-zero grades)
    const calculateAverage = (grades) => {
        if (!grades || !grades.length) return 0;

        // Only include grades > 0 in the calculation
        const validGrades = grades.filter(grade => grade > 0);
        if (validGrades.length === 0) return 0;

        const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
        return sum / validGrades.length;
    };

    // Fetch lab grades for this subject and group
    const { data, isLoading, error: fetchError } = useQuery({
        queryKey: ['lab-grades', decodedSubject, decodedGroup],
        queryFn: () => labService.getLabGrades(decodedSubject, decodedGroup),
        enabled: !isFree,
        onSuccess: (response) => {
            const labData = response.data.data;

            // Set lab settings - check if total_labs is valid
            if (labData.total_labs !== undefined && labData.total_labs !== null) {
                setLabSettings({
                    total_labs: parseInt(labData.total_labs) || 0
                });
            }

            // Check if we have student data with grades
            if (labData.students && labData.students.length > 0) {
                setGrades(labData.students.map(student => {
                    const gradesArray = [...(student.grades || Array(labData.total_labs || 0).fill(0))];
                    // Recalculate average ignoring zeros
                    const recalculatedAverage = calculateAverage(gradesArray);

                    return {
                        student_id: student.student_id,
                        student_fio: student.student_fio,
                        grades: gradesArray,
                        average: recalculatedAverage
                    };
                }));
            }
        }
    });

    // Effect to ensure total_labs is properly initialized
    useEffect(() => {
        if (data?.data?.data) {
            const labData = data.data.data;

            // If total_labs defined in data, set it
            if (labData.total_labs !== undefined && labData.total_labs !== null) {
                const totalLabs = parseInt(labData.total_labs) || 0;

                // Update only if different from current value
                if (totalLabs !== labSettings.total_labs) {
                    setLabSettings(prev => ({
                        ...prev,
                        total_labs: totalLabs
                    }));
                }
            }
        }
    }, [data]);

    // Fetch all lab grades directly for debugging
    const { data: allLabGrades } = useQuery({
        queryKey: ['lab-grades-debug', decodedSubject, decodedGroup],
        queryFn: async () => {
            try {
                const response = await labService.getLabGrades(decodedSubject, decodedGroup);
                return response.data;
            } catch (error) {
                return null;
            }
        },
        enabled: !isFree,
    });

    // Fetch students for this group - separate query
    const {
        data: studentsData,
        isLoading: studentsLoading
    } = useQuery({
        queryKey: ['group-students', decodedGroup],
        queryFn: () => groupService.getStudentsInGroup(decodedGroup),
        enabled: !isFree,
    });

    // Use effect to set grades from students data if grades is empty
    useEffect(() => {
        // Get students from data
        const students = studentsData?.data?.data || [];

        // Get lab data from API response
        const labData = data?.data?.data || {};

        // Only update if we have students but no grades
        if (students.length > 0 && grades.length === 0) {
            // If we have lab grades in the API response, try to match them with students
            if (labData.students && labData.students.length > 0) {
                // Create a map of student_id to grades from lab data
                const studentGradesMap = {};
                labData.students.forEach(student => {
                    const gradesArray = student.grades || [];
                    // Recalculate average ignoring zeros
                    const recalculatedAverage = calculateAverage(gradesArray);

                    studentGradesMap[student.student_id] = {
                        grades: gradesArray,
                        average: recalculatedAverage
                    };
                });

                // Map students with their grades
                setGrades(students.map(student => {
                    const studentGrades = studentGradesMap[student.id] || {
                        grades: Array(labSettings.total_labs || 0).fill(0),
                        average: 0
                    };

                    return {
                        student_id: student.id,
                        student_fio: student.fio,
                        grades: [...studentGrades.grades],
                        average: studentGrades.average
                    };
                }));
            } else {
                // If no lab data, just initialize with zeros
                setGrades(students.map(student => ({
                    student_id: student.id,
                    student_fio: student.fio,
                    grades: Array(labSettings.total_labs || 0).fill(0),
                    average: 0
                })));
            }
        } else if (students.length > 0 && grades.length > 0) {
            // If we already have grades but they're all zeros, try to get from lab data
            const allZeros = grades.every(student =>
                student.grades.every(grade => grade === 0)
            );

            if (allZeros && labData.students && labData.students.length > 0) {
                // Create a map of student_id to grades from lab data
                const studentGradesMap = {};
                labData.students.forEach(student => {
                    const gradesArray = student.grades || [];
                    // Recalculate average ignoring zeros
                    const recalculatedAverage = calculateAverage(gradesArray);

                    studentGradesMap[student.student_id] = {
                        grades: gradesArray,
                        average: recalculatedAverage
                    };
                });

                // Update grades if we have data from the server
                setGrades(prev => prev.map(student => {
                    const studentGrades = studentGradesMap[student.student_id];
                    if (!studentGrades) return student;

                    return {
                        ...student,
                        grades: [...studentGrades.grades],
                        average: studentGrades.average
                    };
                }));
            }
        }
    }, [studentsData, data, grades.length, labSettings.total_labs]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (saveTimeout) {
                clearTimeout(saveTimeout);
            }
        };
    }, [saveTimeout]);

    // Update lab settings mutation
    const updateSettingsMutation = useMutation({
        mutationFn: (data) => labService.updateLabSettings(decodedSubject, decodedGroup, data),
        onSuccess: (response) => {
            // Save the current total_labs value locally
            const savedTotalLabs = labSettings.total_labs;

            setSuccess('Настройки лабораторных работ обновлены');

            // Invalidate caches
            queryClient.invalidateQueries({ queryKey: ['lab-grades', decodedSubject, decodedGroup] });
            queryClient.invalidateQueries({ queryKey: ['lab-grades-debug', decodedSubject, decodedGroup] });
            queryClient.invalidateQueries({ queryKey: ['labs'] });

            // Immediately update settings after saving
            // This ensures settings won't be reset when data is refreshed
            setLabSettings(prev => ({
                ...prev,
                total_labs: savedTotalLabs
            }));

            // Automatically adjust the grades arrays for all students based on new lab count
            const newLabCount = savedTotalLabs;

            if (grades.length > 0) {
                setGrades(prev => prev.map(student => {
                    const currentGrades = [...student.grades];
                    const newGrades = [...currentGrades];

                    // If new count is greater, add zeros
                    if (newLabCount > currentGrades.length) {
                        for (let i = currentGrades.length; i < newLabCount; i++) {
                            newGrades.push(0);
                        }
                    }
                    // If new count is less, truncate
                    else if (newLabCount < currentGrades.length) {
                        newGrades.length = newLabCount;
                    }

                    // Recalculate average with the new grades array
                    const recalculatedAverage = calculateAverage(newGrades);

                    return {
                        ...student,
                        grades: newGrades,
                        average: recalculatedAverage
                    };
                }));
            }
            // If we have no grades but have students, set up empty grades
            else if (studentsData?.data?.data && studentsData.data.data.length > 0) {
                const students = studentsData.data.data;
                setGrades(students.map(student => ({
                    student_id: student.id,
                    student_fio: student.fio,
                    grades: Array(newLabCount).fill(0),
                    average: 0
                })));
            }

            // Clear success message after a delay
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось обновить настройки лабораторных работ');
        }
    });

    // Update lab grades mutation
    const updateGradesMutation = useMutation({
        mutationFn: (data) => labService.updateLabGrades(decodedSubject, decodedGroup, data),
        onSuccess: (response) => {
            setSuccess('Оценки лабораторных работ обновлены');

            // Invalidate all relevant queries to force refresh
            queryClient.invalidateQueries({ queryKey: ['lab-grades', decodedSubject, decodedGroup] });
            queryClient.invalidateQueries({ queryKey: ['lab-grades-debug', decodedSubject, decodedGroup] });
            queryClient.invalidateQueries({ queryKey: ['labs'] });

            // Force immediate refetch
            queryClient.refetchQueries({ queryKey: ['lab-grades', decodedSubject, decodedGroup] });
            queryClient.refetchQueries({ queryKey: ['lab-grades-debug', decodedSubject, decodedGroup] });

            // Clear success message after a delay
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось обновить оценки лабораторных работ');
        }
    });

    // Share lab grades mutation
    const shareGradesMutation = useMutation({
        mutationFn: (data) => labService.shareLabGrades(decodedSubject, decodedGroup, data),
        onSuccess: (response) => {
            const shareData = response.data.data;
            // Get the token from the API response
            const token = shareData.token;

            // Construct a proper frontend URL
            const shareUrl = `${window.location.origin}/labs/shared/${token}`;
            setShareLink(shareUrl);

            // Show the share dialog
            setShowShareDialog(true);

            navigator.clipboard.writeText(shareUrl)
                .then(() => {
                    // Копирование ссылки в буфер обмена выполнено успешно
                })
                .catch((err) => {
                    // Ошибка копирования ссылки
                });
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось поделиться оценками лабораторных работ');
        }
    });

    // Handle change in the number of labs - with auto-save
    const handleLabCountChange = (e) => {
        const newCount = parseInt(e.target.value) || 0;

        // Update local state
        setLabSettings(prev => ({ ...prev, total_labs: newCount }));

        // Update the grades arrays for each student if needed
        if (grades.length > 0) {
            setGrades(prev => prev.map(student => {
                const currentGrades = [...student.grades];
                const newGrades = [...currentGrades];

                // If new count is greater, add zeros
                if (newCount > currentGrades.length) {
                    for (let i = currentGrades.length; i < newCount; i++) {
                        newGrades.push(0);
                    }
                }
                // If new count is less, truncate
                else if (newCount < currentGrades.length) {
                    newGrades.length = newCount;
                }

                // Recalculate average with the new grades array
                const recalculatedAverage = calculateAverage(newGrades);

                return {
                    ...student,
                    grades: newGrades,
                    average: recalculatedAverage
                };
            }));
        }

        // Clear previous timeout if exists
        if (saveTimeout) {
            clearTimeout(saveTimeout);
        }

        // Set new timeout for saving with 800ms delay
        const timeoutId = setTimeout(() => {
            updateSettingsMutation.mutate({ total_labs: newCount });
        }, 800);

        setSaveTimeout(timeoutId);
    };

    // Handle grade change for a specific student and lab
    const handleGradeChange = (studentId, labIndex, value) => {
        // Convert to number between 0 and 5
        let numValue = parseInt(value) || 0;
        numValue = Math.max(0, Math.min(5, numValue));

        setGrades(prev => prev.map(student => {
            if (student.student_id === studentId) {
                const newGrades = [...student.grades];
                newGrades[labIndex] = numValue;

                // Recalculate average - only count non-zero grades
                const recalculatedAverage = calculateAverage(newGrades);

                return {
                    ...student,
                    grades: newGrades,
                    average: recalculatedAverage
                };
            }
            return student;
        }));
    };

    // Save lab grades
    const saveLabGrades = () => {
        // Prepare the grades data in the format expected by the API
        const gradesData = {
            grades: []
        };

        grades.forEach(student => {
            if (student.grades && Array.isArray(student.grades)) {
                student.grades.forEach((grade, labIndex) => {
                    gradesData.grades.push({
                        student_id: student.student_id,
                        lab_number: labIndex + 1, // 1-based index for lab numbers
                        grade: grade || 0
                    });
                });
            }
        });

        updateGradesMutation.mutate(gradesData);
    };

    // Share lab grades
    const shareLabGrades = () => {
        // Reset previous messages
        setError('');
        setSuccess('');

        // Validate that we have the correct data
        if (!decodedSubject || !decodedGroup) {
            setError('Отсутствует информация о предмете или группе');
            return;
        }

        shareGradesMutation.mutate(
            { expiration_days: shareSettings.expiration_days }
        );
    };

    // Handle export
    const handleExport = async () => {
        try {
            const response = await labService.exportLabGrades(decodedSubject, decodedGroup);

            // Create a blob from the response
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);

            // Create a temporary link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = `lab_grades_${decodedSubject}_${decodedGroup}.xlsx`;
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            setError('Не удалось экспортировать оценки лабораторных работ');
        }
    };

    // Handle share settings change
    const handleShareSettingsChange = (e) => {
        const { name, value } = e.target;
        setShareSettings(prev => ({ ...prev, [name]: parseInt(value) || 7 }));
    };

    // Close share dialog
    const closeShareDialog = () => {
        setShowShareDialog(false);
    };

    // Copy share link
    const copyShareLink = () => {
        navigator.clipboard.writeText(shareLink)
            .then(() => {
                setSuccess('Ссылка скопирована в буфер обмена');
                setTimeout(() => {
                    setSuccess('');
                }, 3000);
            })
            .catch((err) => {
                setError('Не удалось скопировать ссылку в буфер обмена');
            });
    };

    // Calculate group average - only include non-zero grades
    const calculateGroupAverage = () => {
        if (grades.length === 0) return 0;

        // Get students who have at least one non-zero grade
        const studentsWithGrades = grades.filter(student =>
            student.grades.some(grade => grade > 0)
        );

        if (studentsWithGrades.length === 0) return 0;

        // Sum up all student averages and divide by the number of students with grades
        const sum = studentsWithGrades.reduce((acc, student) => acc + student.average, 0);
        return sum / studentsWithGrades.length;
    };

    // Get completion statistics
    const getCompletionStats = () => {
        if (grades.length === 0 || labSettings.total_labs === 0) {
            return { completed: 0, total: 0, rate: 0 };
        }

        let completedCount = 0;
        const totalPossible = grades.length * labSettings.total_labs;

        grades.forEach(student => {
            student.grades.forEach(grade => {
                if (grade > 0) completedCount++;
            });
        });

        return {
            completed: completedCount,
            total: totalPossible,
            rate: totalPossible > 0 ? (completedCount / totalPossible) * 100 : 0
        };
    };

    // Get graded labs count by lab number
    const getGradedLabsCount = () => {
        if (grades.length === 0 || labSettings.total_labs === 0) {
            return [];
        }

        const labCounts = [];
        for (let i = 0; i < labSettings.total_labs; i++) {
            const gradedCount = grades.filter(student => student.grades[i] > 0).length;
            labCounts.push({
                lab: i + 1,
                count: gradedCount,
                rate: (gradedCount / grades.length) * 100
            });
        }

        return labCounts;
    };

    const groupAverage = calculateGroupAverage();
    const completionStats = getCompletionStats();
    const gradedLabsCount = getGradedLabsCount();

    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Оценки лабораторных работ</h1>
                        <p className="text-secondary">Премиум-функция</p>
                    </div>
                </div>
                <RequireSubscription />
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="alert alert-danger mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p>Ошибка загрузки оценок лабораторных работ: {fetchError.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Оценки лабораторных работ: {decodedSubject}</h1>
                    <p className="text-secondary">Группа: {decodedGroup}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        <span className="hidden sm:inline">Экспорт</span>
                    </button>
                    <Link to="/labs" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Назад</span>
                    </Link>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger mb-6">
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
                <div className="alert alert-success mb-6">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                        </svg>
                        <p>{success}</p>
                    </div>
                </div>
            )}

            {/* Lab Settings - with auto-save */}
            <div className="card p-6 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Настройки лабораторных работ</h2>
                        <div className="flex items-center gap-4">
                            <div>
                                <label htmlFor="total_labs" className="form-label">Количество лабораторных</label>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        id="total_labs"
                                        value={labSettings.total_labs}
                                        onChange={handleLabCountChange}
                                        min="0"
                                        max="20"
                                        className="form-control"
                                        style={{ width: '100px' }}
                                    />
                                    {updateSettingsMutation.isPending && (
                                        <div className="text-tertiary text-sm flex items-center gap-1">
                                            <div className="w-3 h-3 border-2 border-tertiary border-t-transparent rounded-full animate-spin"></div>
                                            Сохранение...
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <div
                                    className={`tab-button ${activeTab === 'grades' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('grades')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                    Оценки
                                </div>

                                <div
                                    className={`tab-button ${activeTab === 'stats' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('stats')}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="18" y1="20" x2="18" y2="10"></line>
                                        <line x1="12" y1="20" x2="12" y2="4"></line>
                                        <line x1="6" y1="20" x2="6" y2="14"></line>
                                    </svg>
                                    Статистика
                                </div>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={shareLabGrades}
                        className="btn btn-primary flex items-center gap-2"
                        disabled={shareGradesMutation.isPending || grades.length === 0}
                    >
                        {shareGradesMutation.isPending ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                <span>Отправка...</span>
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="18" cy="5" r="3"></circle>
                                    <circle cx="6" cy="12" r="3"></circle>
                                    <circle cx="18" cy="19" r="3"></circle>
                                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                                </svg>
                                <span>Поделиться оценками</span>
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Summary box - always visible - FULL WIDTH */}
            <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="stats-card-square" style={{ borderTopColor: 'var(--primary)' }}>
                    <div className="stats-card-title">Студенты</div>
                    <div className="stats-card-value">{grades.length}</div>
                </div>

                <div className="stats-card-square" style={{ borderTopColor: getAverageColor(groupAverage) }}>
                    <div className="stats-card-title">Средний балл группы</div>
                    <div className="stats-card-value">{groupAverage.toFixed(1)}</div>
                </div>

                <div className="stats-card-square" style={{ borderTopColor: 'var(--success)' }}>
                    <div className="stats-card-title">Выполнено лабораторных</div>
                    <div className="stats-card-value">{completionStats.completed} <span className="text-tertiary text-sm">/ {completionStats.total}</span></div>
                </div>

                <div className="stats-card-square" style={{ borderTopColor: 'var(--accent)' }}>
                    <div className="stats-card-title">Показатель выполнения</div>
                    <div className="stats-card-value">{completionStats.rate.toFixed(1)}%</div>
                </div>
            </div>

            {/* Tab content */}
            {activeTab === 'grades' && (
                <div className="card">
                    <div className="p-6 border-b border-border-color">
                        <h3 className="text-xl font-semibold">Оценки лабораторных работ</h3>
                    </div>

                    {grades.length === 0 ? (
                        <div className="p-8 flex flex-col items-center justify-center">
                            <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full flex items-center justify-center mb-4">
                                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Студенты не найдены</h3>
                            <p className="text-secondary mb-6">Студенты для этой группы не найдены</p>
                            <Link to={`/groups/${encodeURIComponent(decodedGroup)}`} className="btn btn-primary">
                                Просмотр группы
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="table">
                                    <thead>
                                    <tr>
                                        <th className="sticky left-0 bg-bg-card z-10">Студент</th>
                                        {Array.from({ length: labSettings.total_labs }, (_, i) => (
                                            <th key={i} className="text-center">Лаб. {i + 1}</th>
                                        ))}
                                        <th className="text-center">Среднее</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {grades.map((student) => (
                                        <tr key={student.student_id}>
                                            <td className="sticky left-0 bg-bg-card z-10 font-medium">{student.student_fio}</td>
                                            {Array.from({ length: labSettings.total_labs }, (_, i) => (
                                                <td key={i} className="text-center p-1">
                                                    <input
                                                        type="number"
                                                        value={student.grades[i] || 0}
                                                        onChange={(e) => handleGradeChange(student.student_id, i, e.target.value)}
                                                        min="0"
                                                        max="5"
                                                        className={`grade-input grade-${student.grades[i] || 0}`}
                                                    />
                                                </td>
                                            ))}
                                            <td className="text-center">
                                                <div className={`grade-badge ${getGradeClass(student.average)}`}>
                                                    {student.average ? student.average.toFixed(1) : '0.0'}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-6 border-t border-border-color">
                                <button
                                    onClick={saveLabGrades}
                                    className="btn btn-primary flex items-center gap-2"
                                    disabled={updateGradesMutation.isPending}
                                >
                                    {updateGradesMutation.isPending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                            <span>Сохранение...</span>
                                        </>
                                    ) : (
                                        <>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                <polyline points="7 3 7 8 15 8"></polyline>
                                            </svg>
                                            <span>Сохранить оценки</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {activeTab === 'stats' && (
                <div className="card">
                    <div className="p-6 border-b border-border-color">
                        <h3 className="text-xl font-semibold">Статистика лабораторных работ</h3>
                    </div>

                    {grades.length === 0 ? (
                        <div className="p-8 text-center">
                            <p className="text-secondary">Нет данных для статистики</p>
                        </div>
                    ) : (
                        <div className="p-6">
                            <h4 className="text-lg font-medium mb-4">Выполнение по лабораторным</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Bar chart for lab completion */}
                                <div className="h-64 bg-bg-dark-tertiary rounded-md p-4 flex items-end gap-1">
                                    {gradedLabsCount.map((lab, index) => (
                                        <div key={index} className="flex-1 flex flex-col items-center justify-end gap-2">
                                            <div
                                                className="w-full rounded-t-sm"
                                                style={{
                                                    height: `${lab.rate}%`,
                                                    backgroundColor: getCompletionColor(lab.rate),
                                                    maxWidth: '40px',
                                                    margin: '0 auto'
                                                }}
                                            ></div>
                                            <div className="text-xs text-tertiary">Лаб. {lab.lab}</div>
                                        </div>
                                    ))}
                                </div>

                                {/* Lab completion table */}
                                <div>
                                    <div className="overflow-y-auto max-h-64">
                                        <table className="table w-full">
                                            <thead>
                                            <tr>
                                                <th>Лабораторная</th>
                                                <th>Выполнено</th>
                                                <th>Процент</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {gradedLabsCount.map((lab, index) => (
                                                <tr key={index}>
                                                    <td>Лаб. {lab.lab}</td>
                                                    <td>{lab.count} / {grades.length}</td>
                                                    <td className={getCompletionTextClass(lab.rate)}>
                                                        {lab.rate.toFixed(1)}%
                                                    </td>
                                                </tr>
                                            ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Student performance */}
                            <h4 className="text-lg font-medium mt-8 mb-4">Успеваемость студентов</h4>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Students sorted by average grade */}
                                <div>
                                    <h5 className="text-base font-medium mb-2">Лучшие студенты</h5>
                                    <div className="overflow-y-auto max-h-64">
                                        <table className="table w-full">
                                            <thead>
                                            <tr>
                                                <th>Студент</th>
                                                <th>Средний балл</th>
                                                <th>Выполнено</th>
                                            </tr>
                                            </thead>
                                            <tbody>
                                            {[...grades]
                                                .filter(student => student.average > 0)
                                                .sort((a, b) => b.average - a.average)
                                                .slice(0, 5)
                                                .map((student, index) => {
                                                    const completedCount = student.grades.filter(g => g > 0).length;
                                                    const completionRate = (completedCount / student.grades.length) * 100;

                                                    return (
                                                        <tr key={index}>
                                                            <td>{student.student_fio}</td>
                                                            <td className={getGradeTextClass(student.average)}>
                                                                {student.average.toFixed(1)}
                                                            </td>
                                                            <td>{completedCount} / {student.grades.length} ({completionRate.toFixed(0)}%)</td>
                                                        </tr>
                                                    );
                                                })
                                            }
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Grade distribution */}
                                <div>
                                    <h5 className="text-base font-medium mb-2">Распределение оценок</h5>
                                    <div className="grid grid-cols-6 gap-2 mb-4">
                                        {[0, 1, 2, 3, 4, 5].map(grade => {
                                            // Count occurrences of this grade
                                            let count = 0;
                                            grades.forEach(student => {
                                                student.grades.forEach(g => {
                                                    if (g === grade) count++;
                                                });
                                            });

                                            // Calculate percentage
                                            const totalGrades = grades.reduce((acc, student) => acc + student.grades.length, 0);
                                            const percentage = totalGrades > 0 ? (count / totalGrades) * 100 : 0;

                                            return (
                                                <div key={grade} className="flex flex-col items-center">
                                                    <div className="mb-2 text-lg font-medium text-center">
                                                        {grade === 0 ? '-' : grade}
                                                    </div>
                                                    <div className="w-full h-32 bg-bg-dark-tertiary rounded-md flex flex-col justify-end">
                                                        <div
                                                            className="w-full rounded-t-sm"
                                                            style={{
                                                                height: `${percentage}%`,
                                                                backgroundColor: getGradeColor(grade)
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <div className="mt-2 text-xs text-tertiary">
                                                        {count} ({percentage.toFixed(1)}%)
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Share Labs Dialog */}
            {showShareDialog && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-bg-dark-secondary p-6 rounded-lg shadow-xl max-w-lg w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Поделиться оценками лабораторных работ</h3>
                            <button
                                onClick={closeShareDialog}
                                className="text-tertiary hover:text-primary"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                </svg>
                            </button>
                        </div>

                        <div className="alert alert-success mb-4">
                            <div className="flex items-start gap-3">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-1">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                </svg>
                                <div>
                                    <p className="font-medium mb-1">Ссылка для общего доступа успешно создана!</p>
                                    <p>Ссылка будет действительна в течение {shareSettings.expiration_days} дней.</p>
                                </div>
                            </div>
                        </div>

                        <div className="form-group mb-4">
                            <label className="form-label">Ссылка для общего доступа</label>
                            <div className="flex">
                                <input
                                    type="text"
                                    value={shareLink}
                                    readOnly
                                    className="form-control rounded-r-none"
                                />
                                <button
                                    onClick={copyShareLink}
                                    className="btn btn-primary rounded-l-none"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <button
                                onClick={() => { window.open(shareLink, '_blank') }}
                                className="btn btn-primary mr-2"
                            >
                                Просмотреть ссылку
                            </button>
                            <button
                                onClick={closeShareDialog}
                                className="btn btn-secondary"
                            >
                                Закрыть
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
                .grade-input {
                    width: 45px;
                    height: 45px;
                    text-align: center;
                    font-weight: 600;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    border: 1px solid var(--border-color);
                    color: var(--text-primary);
                    transition: all 0.2s ease;
                }
                
                .grade-input:focus {
                    outline: none;
                    border-color: var(--primary);
                    box-shadow: 0 0 0 2px var(--primary-lighter);
                }
                
                .grade-input.grade-0 {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-tertiary);
                }
                
                .grade-input.grade-1, .grade-input.grade-2 {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                    border-color: var(--danger-light);
                }
                
                .grade-input.grade-3 {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                    border-color: var(--warning-light);
                }
                
                .grade-input.grade-4, .grade-input.grade-5 {
                    background-color: var(--success-lighter);
                    color: var(--success);
                    border-color: var(--success-light);
                }
                
                .grade-badge {
                    display: inline-block;
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius-md);
                    font-weight: 600;
                }
                
                .grade-badge.low {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .grade-badge.mid {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .grade-badge.high {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
                
                .tab-button {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    padding: 0.5rem 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-secondary);
                    cursor: pointer;
                    transition: all 0.2s ease;
                }
                
                .tab-button:hover {
                    background-color: var(--bg-dark-secondary);
                }
                
                .tab-button.active {
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                }
                
                .stats-card-square {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border-color);
                    border-top: 4px solid;
                    transition: transform var(--transition-normal) ease, box-shadow var(--transition-normal) ease;
                    padding: 1.25rem;
                    height: 150px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    text-align: center;
                }
                
                .stats-card-square:hover {
                    transform: translateY(-5px);
                    box-shadow: var(--shadow-lg);
                    border-color: var(--border-color-light);
                }
                
                .stats-card-square .stats-card-title {
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                    font-weight: 500;
                    margin-bottom: 0.75rem;
                }
                
                .stats-card-square .stats-card-value {
                    font-size: 2.25rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                
                @media (max-width: 768px) {
                    .grid-cols-4 {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 480px) {
                    .grid-cols-4 {
                        grid-template-columns: repeat(1, 1fr);
                    }
                }
            `}</style>
        </div>
    );
}

// Helper function to get class for average grade
function getGradeClass(average) {
    if (average >= 4) return 'high';
    if (average >= 3) return 'mid';
    return 'low';
}

// Helper function to get color for average grade
function getAverageColor(average) {
    if (average >= 4) return 'var(--success)';
    if (average >= 3) return 'var(--warning)';
    return 'var(--danger)';
}

// Helper function to get color for completion rate
function getCompletionColor(rate) {
    if (rate >= 80) return 'var(--success)';
    if (rate >= 50) return 'var(--warning)';
    return 'var(--danger)';
}

// Helper function to get text color class for completion
function getCompletionTextClass(rate) {
    if (rate >= 80) return 'text-success';
    if (rate >= 50) return 'text-warning';
    return 'text-danger';
}

// Helper function to get text color class for grade
function getGradeTextClass(grade) {
    if (grade >= 4) return 'text-success';
    if (grade >= 3) return 'text-warning';
    return 'text-danger';
}

// Helper function to get color for grade
function getGradeColor(grade) {
    if (grade === 0) return 'var(--bg-dark-secondary)';
    if (grade <= 2) return 'var(--danger)';
    if (grade === 3) return 'var(--warning)';
    return 'var(--success)';
}

export default LabGrades;