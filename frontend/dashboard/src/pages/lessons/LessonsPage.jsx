import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { lessonService, groupService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function LessonsPage() {
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        subject: '',
        group: '',
        from_date: '',
        to_date: '',
        search: ''
    });
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const [expandedLesson, setExpandedLesson] = useState(null);

    // Fetch lessons with filters
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['lessons', filters],
        queryFn: () => lessonService.getLessons(filters)
    });

    // Fetch subjects for filter dropdown
    const { data: subjectsData } = useQuery({
        queryKey: ['subjects'],
        queryFn: lessonService.getSubjects
    });

    // Fetch groups for filter dropdown
    const { data: groupsData } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    const lessons = data?.data?.data || [];
    const subjects = subjectsData?.data?.data || [];
    const groups = groupsData?.data?.data || [];

    // Set initial date filters to current month
    useEffect(() => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters(prev => ({
            ...prev,
            from_date: firstDay.toISOString().split('T')[0],
            to_date: lastDay.toISOString().split('T')[0]
        }));
    }, []);

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

        setFilters({
            subject: '',
            group: '',
            from_date: firstDay.toISOString().split('T')[0],
            to_date: lastDay.toISOString().split('T')[0],
            search: ''
        });
    };

    const handleExport = async (filterType = null) => {
        try {
            // Prepare export parameters
            const exportParams = {};

            // If filterType is 'current', use current filters
            if (filterType === 'current') {
                if (filters.group) exportParams.group = filters.group;
                if (filters.subject) exportParams.subject = filters.subject;
                if (filters.from_date) exportParams.from_date = filters.from_date;
                if (filters.to_date) exportParams.to_date = filters.to_date;
                if (filters.search) exportParams.search = filters.search;
            }

            const response = await lessonService.exportLessons(exportParams);

            // Create a blob from the response
            const blob = new Blob([response.data], { type: response.headers['content-type'] });
            const url = window.URL.createObjectURL(blob);

            // Create a descriptive filename
            let filename = 'lessons_export';
            if (filterType === 'current' && filters.group) {
                filename += `_${filters.group}`;
            }
            if (filterType === 'current' && filters.subject) {
                filename += `_${filters.subject}`;
            }
            filename += `_${new Date().toISOString().split('T')[0]}.xlsx`;

            // Create a temporary link and trigger download
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            // Clean up
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting lessons:', error);
            alert('Failed to export lessons data. Please make sure you have a paid subscription.');
        }
    };

    const handleDelete = async (id, topic) => {
        if (window.confirm(`Are you sure you want to delete lesson "${topic}"?`)) {
            try {
                await lessonService.deleteLesson(id);
                refetch(); // Refresh the list after deletion
            } catch (error) {
                console.error('Error deleting lesson:', error);
                alert('Failed to delete lesson');
            }
        }
    };

    // Toggle dropdown
    const toggleDropdown = () => {
        setDropdownOpen(!dropdownOpen);
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Filter lessons by search term
    const filteredLessons = lessons.filter(lesson => {
        if (!filters.search) return true;
        const searchTerm = filters.search.toLowerCase();
        return (
            lesson.topic?.toLowerCase().includes(searchTerm) ||
            lesson.subject?.toLowerCase().includes(searchTerm) ||
            lesson.group_name?.toLowerCase().includes(searchTerm)
        );
    });

    const toggleLessonDetails = (id) => {
        setExpandedLesson(expandedLesson === id ? null : id);
    };

    const getLessonTypeIcon = (type) => {
        switch (type) {
            case 'Лекция':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                );
            case 'Практика':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                        <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                );
            case 'Лабораторная работа':
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 2v7.31"></path>
                        <path d="M14 9.3V1.99"></path>
                        <path d="M8.5 2h7"></path>
                        <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                        <path d="M5.17 14.83l4.24-4.24"></path>
                        <path d="M14.83 14.83l-4.24-4.24"></path>
                    </svg>
                );
            default:
                return (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 11 12 14 22 4"></polyline>
                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                    </svg>
                );
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="alert alert-danger mb-6">
                <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <p>Error loading lessons: {error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Lessons</h1>
                    <p className="text-secondary">Manage your course lessons and lectures</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    <RequireSubscription
                        fallback={
                            <button className="btn btn-primary opacity-70 cursor-not-allowed flex items-center gap-2" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                <span className="hidden sm:inline">Add</span>
                            </button>
                        }
                    >
                        <Link to="/lessons/new" className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            <span className="hidden sm:inline">Add Lesson</span>
                        </Link>
                    </RequireSubscription>

                    <RequireSubscription
                        fallback={
                            <button className="btn btn-secondary opacity-70 cursor-not-allowed flex items-center gap-2" disabled>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span className="hidden sm:inline">Export</span>
                            </button>
                        }
                    >
                        <div className="dropdown" ref={dropdownRef}>
                            <button
                                className="btn btn-secondary flex items-center gap-2"
                                type="button"
                                id="exportDropdown"
                                onClick={toggleDropdown}
                                aria-expanded={dropdownOpen}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="7 10 12 15 17 10"></polyline>
                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                </svg>
                                <span className="hidden sm:inline">Export</span>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-1">
                                    <polyline points="6 9 12 15 18 9"></polyline>
                                </svg>
                            </button>
                            <div className={`dropdown-menu ${dropdownOpen ? 'show' : ''}`} aria-labelledby="exportDropdown">
                                <button
                                    className="dropdown-item"
                                    onClick={() => { handleExport(); setDropdownOpen(false); }}
                                >
                                    Export All Lessons
                                </button>
                                <button
                                    className="dropdown-item"
                                    onClick={() => { handleExport('current'); setDropdownOpen(false); }}
                                >
                                    Export with Current Filters
                                </button>
                            </div>
                        </div>
                    </RequireSubscription>
                </div>
            </div>

            {/* Compact Filters */}
            <div className="bg-dark-secondary rounded-lg mb-6 p-3">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[130px]">
                        <label htmlFor="subject" className="form-label text-xs mb-1">Subject</label>
                        <select
                            id="subject"
                            name="subject"
                            value={filters.subject}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        >
                            <option value="">All Subjects</option>
                            {subjects.map(subject => (
                                <option key={subject} value={subject}>{subject}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[130px]">
                        <label htmlFor="group" className="form-label text-xs mb-1">Group</label>
                        <select
                            id="group"
                            name="group"
                            value={filters.group}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        >
                            <option value="">All Groups</option>
                            {groups.map(group => (
                                <option key={group.name} value={group.name}>{group.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[110px]">
                        <label htmlFor="from_date" className="form-label text-xs mb-1">From</label>
                        <input
                            type="date"
                            id="from_date"
                            name="from_date"
                            value={filters.from_date}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        />
                    </div>

                    <div className="flex-1 min-w-[110px]">
                        <label htmlFor="to_date" className="form-label text-xs mb-1">To</label>
                        <input
                            type="date"
                            id="to_date"
                            name="to_date"
                            value={filters.to_date}
                            onChange={handleFilterChange}
                            className="form-control py-1 text-sm"
                        />
                    </div>

                    <div className="flex-1 min-w-[180px]">
                        <label htmlFor="search" className="form-label text-xs mb-1">Search</label>
                        <div className="relative">
                            <input
                                type="text"
                                id="search"
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                                placeholder="Search..."
                                className="form-control pl-7 py-1 text-sm"
                            />
                            <div className="absolute inset-y-0 left-0 flex items-center pl-2 pointer-events-none text-text-tertiary">
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="11" cy="11" r="8"></circle>
                                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                </svg>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={clearFilters}
                        className="btn btn-outline py-1 px-3 h-[34px] flex items-center gap-1 text-xs"
                        title="Clear all filters"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 12a9 9 0 0 1-9 9c-2.39 0-4.68-.94-6.4-2.65L3 16"></path>
                            <path d="M3 12a9 9 0 0 1 9-9c2.39 0 4.68.94 6.4 2.65L21 8"></path>
                            <path d="M3 8h6"></path>
                            <path d="M15 16h6"></path>
                        </svg>
                        Clear
                    </button>
                </div>
            </div>

            {/* Lessons Table */}
            {filteredLessons.length === 0 ? (
                <div className="card p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full mx-auto flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl mb-2">No lessons found</h3>
                        <p className="text-secondary mb-6">Try changing your filters or create a new lesson.</p>
                        <RequireSubscription
                            fallback={
                                <button className="btn btn-primary opacity-70 cursor-not-allowed" disabled>
                                    Add Lesson (Subscription Required)
                                </button>
                            }
                        >
                            <Link to="/lessons/new" className="btn btn-primary">
                                Add Your First Lesson
                            </Link>
                        </RequireSubscription>
                    </div>
                </div>
            ) : (
                <div className="lesson-cards-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLessons.map(lesson => (
                        <div
                            key={lesson.id}
                            className={`lesson-card ${expandedLesson === lesson.id ? 'expanded' : ''}`}
                            onClick={() => toggleLessonDetails(lesson.id)}
                        >
                            <div className="lesson-card-header">
                                <div className="lesson-type-icon" title={lesson.type}>
                                    {getLessonTypeIcon(lesson.type)}
                                </div>
                                <div className="lesson-date-badge">
                                    {new Date(lesson.date).toLocaleDateString()}
                                </div>
                                <h3 className="lesson-title" title={lesson.topic}>
                                    {lesson.topic}
                                </h3>
                                <div className="lesson-meta">
                                    <span className="lesson-subject">{lesson.subject}</span>
                                    <span className="lesson-divider">•</span>
                                    <span className="lesson-group">{lesson.group_name}</span>
                                </div>
                            </div>

                            <div className="lesson-card-content">
                                <div className="lesson-details">
                                    <div className="lesson-detail-item">
                                        <span className="lesson-detail-label">Type:</span>
                                        <span className="lesson-detail-value">{lesson.type}</span>
                                    </div>
                                    <div className="lesson-detail-item">
                                        <span className="lesson-detail-label">Hours:</span>
                                        <span className="lesson-detail-value">{lesson.hours}</span>
                                    </div>
                                    <div className="lesson-detail-item">
                                        <span className="lesson-detail-label">Created:</span>
                                        <span className="lesson-detail-value">
                                            {lesson.created_at ? new Date(lesson.created_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </div>
                                </div>
                                <div className="lesson-actions" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigate(`/lessons/${lesson.id}`);
                                        }}
                                        className="lesson-action-btn view-btn"
                                        title="View Lesson"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                            <circle cx="12" cy="12" r="3"></circle>
                                        </svg>
                                    </button>

                                    <RequireSubscription
                                        fallback={
                                            <button className="lesson-action-btn edit-btn opacity-50 cursor-not-allowed" disabled title="Subscription Required">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                </svg>
                                            </button>
                                        }
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                navigate(`/lessons/${lesson.id}/edit`);
                                            }}
                                            className="lesson-action-btn edit-btn"
                                            title="Edit Lesson"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                            </svg>
                                        </button>
                                    </RequireSubscription>

                                    <RequireSubscription
                                        fallback={
                                            <button className="lesson-action-btn delete-btn opacity-50 cursor-not-allowed" disabled title="Subscription Required">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="3 6 5 6 21 6"></polyline>
                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                </svg>
                                            </button>
                                        }
                                    >
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDelete(lesson.id, lesson.topic);
                                            }}
                                            className="lesson-action-btn delete-btn"
                                            title="Delete Lesson"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </RequireSubscription>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Custom Styles */}
            <style jsx="true">{`
                .dropdown-menu {
                    position: absolute;
                    top: 100%;
                    right: 0;
                    z-index: 1000;
                    display: none;
                    min-width: 10rem;
                    padding: 0.5rem 0;
                    margin: 0.125rem 0 0;
                    background-color: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    box-shadow: var(--shadow-lg);
                }
                
                .dropdown-menu.show {
                    display: block;
                }
                
                .dropdown-item {
                    display: block;
                    width: 100%;
                    padding: 0.5rem 1.5rem;
                    clear: both;
                    text-align: inherit;
                    white-space: nowrap;
                    background-color: transparent;
                    border: 0;
                    cursor: pointer;
                    color: var(--text-secondary);
                    text-align: left;
                    transition: all var(--transition-fast) ease;
                }
                
                .dropdown-item:hover {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-primary);
                }
                
                .lesson-cards-container {
                    margin-bottom: 2rem;
                }
                
                .lesson-card {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                    transition: all var(--transition-normal) ease;
                    cursor: pointer;
                    position: relative;
                }
                
                .lesson-card:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-md);
                    border-color: var(--border-color-light);
                }
                
                .lesson-card.expanded {
                    box-shadow: var(--shadow-lg);
                    border-color: var(--primary);
                }
                
                .lesson-card-header {
                    padding: 1.25rem;
                    position: relative;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .lesson-type-icon {
                    position: absolute;
                    top: 1.25rem;
                    left: 1.25rem;
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-md);
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .lesson-date-badge {
                    position: absolute;
                    top: 1.25rem;
                    right: 1.25rem;
                    padding: 0.25rem 0.5rem;
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-secondary);
                    border-radius: var(--radius-md);
                    font-size: 0.75rem;
                }
                
                .lesson-title {
                    margin-top: 2.5rem;
                    margin-bottom: 0.5rem;
                    font-size: 1.125rem;
                    font-weight: 600;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .lesson-meta {
                    display: flex;
                    align-items: center;
                    color: var(--text-secondary);
                    font-size: 0.875rem;
                }
                
                .lesson-divider {
                    margin: 0 0.5rem;
                }
                
                .lesson-subject, .lesson-group {
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                
                .lesson-group {
                    color: var(--primary-light);
                    max-width: 120px;
                }
                
                .lesson-card-content {
                    max-height: 0;
                    overflow: hidden;
                    transition: max-height var(--transition-normal) ease;
                    background-color: var(--bg-dark-secondary);
                }
                
                .lesson-card.expanded .lesson-card-content {
                    max-height: 300px;
                }
                
                .lesson-details {
                    padding: 1rem 1.25rem;
                }
                
                .lesson-detail-item {
                    display: flex;
                    margin-bottom: 0.5rem;
                }
                
                .lesson-detail-label {
                    width: 80px;
                    color: var(--text-tertiary);
                }
                
                .lesson-detail-value {
                    color: var(--text-secondary);
                }
                
                .lesson-actions {
                    display: flex;
                    justify-content: flex-end;
                    padding: 0.75rem 1.25rem;
                    gap: 0.75rem;
                    border-top: 1px solid var(--border-color);
                }
                
                .lesson-action-btn {
                    width: 36px;
                    height: 36px;
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    transition: all var(--transition-fast) ease;
                }
                
                .view-btn {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-primary);
                }
                
                .view-btn:hover {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--primary);
                }
                
                .edit-btn {
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                }
                
                .edit-btn:hover {
                    background-color: var(--primary-light);
                    color: var(--bg-dark);
                }
                
                .delete-btn {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .delete-btn:hover {
                    background-color: var(--danger-light);
                    color: white;
                }
            `}</style>
        </div>
    );
}

export default LessonsPage;