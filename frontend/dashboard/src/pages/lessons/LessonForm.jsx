import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { lessonService, groupService } from '../../services/api';

function LessonForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!id;

    // Form state
    const [formData, setFormData] = useState({
        group_name: '',
        subject: '',
        topic: '',
        hours: 2,
        date: new Date().toISOString().split('T')[0],
        type: 'Лекция'
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // UI state for showing dropdowns
    const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
    const [showGroupDropdown, setShowGroupDropdown] = useState(false);

    // Refs for the input fields to focus them
    const subjectInputRef = useRef(null);
    const groupInputRef = useRef(null);

    // Refs for the dropdown containers for clicking outside detection
    const subjectDropdownRef = useRef(null);
    const groupDropdownRef = useRef(null);

    // Fetch groups for dropdown
    const { data: groupsData } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    // Fetch subjects for dropdown
    const { data: subjectsData } = useQuery({
        queryKey: ['subjects'],
        queryFn: lessonService.getSubjects
    });

    // Fetch lesson data if in edit mode
    const { data: lessonData, isLoading: lessonLoading } = useQuery({
        queryKey: ['lesson', id],
        queryFn: () => lessonService.getLesson(id),
        enabled: isEditMode
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data) => lessonService.createLesson(data),
        onSuccess: () => {
            setSuccess('Lesson created successfully');
            queryClient.invalidateQueries({ queryKey: ['lessons'] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            setTimeout(() => navigate('/lessons'), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to create lesson');
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: (data) => lessonService.updateLesson(id, data),
        onSuccess: () => {
            setSuccess('Lesson updated successfully');
            queryClient.invalidateQueries({ queryKey: ['lessons'] });
            queryClient.invalidateQueries({ queryKey: ['lesson', id] });
            queryClient.invalidateQueries({ queryKey: ['subjects'] });
            setTimeout(() => navigate(`/lessons/${id}`), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to update lesson');
        }
    });

    // Populate form with lesson data if in edit mode
    useEffect(() => {
        if (isEditMode && lessonData?.data?.data) {
            const lesson = lessonData.data.data;
            setFormData({
                group_name: lesson.group_name || '',
                subject: lesson.subject || '',
                topic: lesson.topic || '',
                hours: lesson.hours || 2,
                date: lesson.date || new Date().toISOString().split('T')[0],
                type: lesson.type || 'Лекция'
            });
        }
    }, [isEditMode, lessonData]);

    // Handle clicking outside of dropdowns to close them
    useEffect(() => {
        function handleClickOutside(event) {
            if (subjectDropdownRef.current && !subjectDropdownRef.current.contains(event.target)) {
                setShowSubjectDropdown(false);
            }
            if (groupDropdownRef.current && !groupDropdownRef.current.contains(event.target)) {
                setShowGroupDropdown(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubjectClick = (subject) => {
        setFormData(prev => ({ ...prev, subject }));
        setShowSubjectDropdown(false);
        if (subjectInputRef.current) {
            subjectInputRef.current.focus();
        }
    };

    const handleGroupClick = (groupName) => {
        setFormData(prev => ({ ...prev, group_name: groupName }));
        setShowGroupDropdown(false);
        if (groupInputRef.current) {
            groupInputRef.current.focus();
        }
    };

    const validateForm = () => {
        setError('');
        setSuccess('');

        if (!formData.group_name) {
            setError('Group is required');
            return false;
        }

        if (!formData.subject) {
            setError('Subject is required');
            return false;
        }

        if (!formData.topic) {
            setError('Topic is required');
            return false;
        }

        if (!formData.date) {
            setError('Date is required');
            return false;
        }

        if (!formData.hours || formData.hours <= 0) {
            setError('Hours must be greater than 0');
            return false;
        }

        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (isEditMode) {
            updateMutation.mutate(formData);
        } else {
            createMutation.mutate(formData);
        }
    };

    // Loading state for edit mode
    if (isEditMode && lessonLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    const groups = groupsData?.data?.data || [];
    const subjects = subjectsData?.data?.data || [];

    // Filter groups and subjects based on current input
    const filteredGroups = groups.filter(group =>
        group.name.toLowerCase().includes(formData.group_name.toLowerCase())
    );

    const filteredSubjects = subjects.filter(subject =>
        subject.toLowerCase().includes(formData.subject.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEditMode ? 'Edit Lesson' : 'Add New Lesson'}</h1>
                    <p className="text-secondary">
                        {isEditMode ? 'Update lesson information' : 'Create a new lesson for your group'}
                    </p>
                </div>
                <Link to="/lessons" className="btn btn-secondary flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="hidden sm:inline">Back</span>
                </Link>
            </div>

            <div className="card">
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Group Selection */}
                        <div className="form-group" ref={groupDropdownRef}>
                            <label htmlFor="group_name" className="form-label">Group <span className="text-danger">*</span></label>
                            <div className="relative dropdown-container">
                                <div className="input-with-icon">
                                    <input
                                        type="text"
                                        id="group_name"
                                        name="group_name"
                                        value={formData.group_name}
                                        onChange={handleChange}
                                        onFocus={() => setShowGroupDropdown(true)}
                                        ref={groupInputRef}
                                        required
                                        className="form-control pl-10"
                                        placeholder="Enter or select group"
                                        autoComplete="off"
                                    />
                                    <div className="input-icon left">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                            <circle cx="9" cy="7" r="4"></circle>
                                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                        </svg>
                                    </div>
                                </div>
                                {showGroupDropdown && filteredGroups.length > 0 && (
                                    <div className="dropdown-list">
                                        {filteredGroups.map(group => (
                                            <div
                                                key={group.name}
                                                className="dropdown-item"
                                                onClick={() => handleGroupClick(group.name)}
                                            >
                                                <span className="font-medium">{group.name}</span>
                                                <span className="text-sm text-tertiary ml-2">
                                                    {group.student_count} students
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <small className="text-tertiary mt-1 block">
                                    Type to search or enter a new group name
                                </small>
                            </div>
                        </div>

                        {/* Subject Input */}
                        <div className="form-group" ref={subjectDropdownRef}>
                            <label htmlFor="subject" className="form-label">Subject <span className="text-danger">*</span></label>
                            <div className="relative dropdown-container">
                                <div className="input-with-icon">
                                    <input
                                        type="text"
                                        id="subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        onFocus={() => setShowSubjectDropdown(true)}
                                        ref={subjectInputRef}
                                        required
                                        className="form-control pl-10"
                                        placeholder="Enter or select subject"
                                        autoComplete="off"
                                    />
                                    <div className="input-icon left">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                                        </svg>
                                    </div>
                                </div>
                                {showSubjectDropdown && filteredSubjects.length > 0 && (
                                    <div className="dropdown-list">
                                        {filteredSubjects.map(subject => (
                                            <div
                                                key={subject}
                                                className="dropdown-item"
                                                onClick={() => handleSubjectClick(subject)}
                                            >
                                                {subject}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <small className="text-tertiary mt-1 block">
                                    Type to search or enter a new subject name
                                </small>
                            </div>
                        </div>
                    </div>

                    {/* Topic Input */}
                    <div className="form-group">
                        <label htmlFor="topic" className="form-label">Topic <span className="text-danger">*</span></label>
                        <div className="input-with-icon">
                            <input
                                type="text"
                                id="topic"
                                name="topic"
                                value={formData.topic}
                                onChange={handleChange}
                                required
                                className="form-control pl-10"
                                placeholder="Enter lesson topic"
                            />
                            <div className="input-icon left">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                                    <polyline points="2 17 12 22 22 17"></polyline>
                                    <polyline points="2 12 12 17 22 12"></polyline>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Lesson Type */}
                        <div className="form-group">
                            <label htmlFor="type" className="form-label">Lesson Type <span className="text-danger">*</span></label>
                            <div className="input-with-icon">
                                <select
                                    id="type"
                                    name="type"
                                    value={formData.type}
                                    onChange={handleChange}
                                    required
                                    className="form-control pl-10"
                                >
                                    <option value="Лекция">Лекция</option>
                                    <option value="Практика">Практика</option>
                                    <option value="Лабораторная работа">Лабораторная работа</option>
                                </select>
                                <div className="input-icon left">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                        <polyline points="14 2 14 8 20 8"></polyline>
                                        <line x1="16" y1="13" x2="8" y2="13"></line>
                                        <line x1="16" y1="17" x2="8" y2="17"></line>
                                        <polyline points="10 9 9 9 8 9"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Date Input */}
                        <div className="form-group">
                            <label htmlFor="date" className="form-label">Date <span className="text-danger">*</span></label>
                            <div className="input-with-icon">
                                <input
                                    type="date"
                                    id="date"
                                    name="date"
                                    value={formData.date}
                                    onChange={handleChange}
                                    required
                                    className="form-control pl-10"
                                />
                                <div className="input-icon left">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                        <line x1="16" y1="2" x2="16" y2="6"></line>
                                        <line x1="8" y1="2" x2="8" y2="6"></line>
                                        <line x1="3" y1="10" x2="21" y2="10"></line>
                                    </svg>
                                </div>
                            </div>
                        </div>

                        {/* Hours Input */}
                        <div className="form-group">
                            <label htmlFor="hours" className="form-label">Hours <span className="text-danger">*</span></label>
                            <div className="input-with-icon">
                                <input
                                    type="number"
                                    id="hours"
                                    name="hours"
                                    value={formData.hours}
                                    onChange={handleChange}
                                    min="1"
                                    max="8"
                                    required
                                    className="form-control pl-10"
                                />
                                <div className="input-icon left">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <polyline points="12 6 12 12 16 14"></polyline>
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-4 border-t border-border-color">
                        <button
                            type="submit"
                            className="btn btn-primary flex items-center gap-2"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending ? (
                                <>
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    <span>Saving...</span>
                                </>
                            ) : isEditMode ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    <span>Update Lesson</span>
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    <span>Create Lesson</span>
                                </>
                            )}
                        </button>
                        <Link to="/lessons" className="btn btn-secondary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            <span>Cancel</span>
                        </Link>
                    </div>
                </form>
            </div>

            <style jsx="true">{`
                .dropdown-container {
                    position: relative;
                }
                
                .dropdown-list {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    right: 0;
                    z-index: 10;
                    max-height: 200px;
                    overflow-y: auto;
                    background-color: var(--bg-dark-secondary);
                    border: 1px solid var(--border-color);
                    border-top: none;
                    border-radius: 0 0 var(--radius-md) var(--radius-md);
                    box-shadow: var(--shadow-md);
                }
                
                .dropdown-item {
                    padding: 0.75rem 1rem;
                    cursor: pointer;
                    transition: all var(--transition-fast) ease;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .dropdown-item:last-child {
                    border-bottom: none;
                }
                
                .dropdown-item:hover {
                    background-color: var(--bg-dark-tertiary);
                }
                
                .input-with-icon {
                    position: relative;
                }
                
                .input-icon {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    color: var(--text-tertiary);
                }
                
                .input-icon.left {
                    left: 0;
                    padding-left: 0.75rem;
                }
                
                @keyframes spin {
                    to {
                        transform: rotate(360deg);
                    }
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
            `}</style>
        </div>
    );
}

export default LessonForm;