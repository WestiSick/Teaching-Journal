import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { studentService, groupService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function StudentsPage() {
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const [filters, setFilters] = useState({
        group: '',
        search: ''
    });

    // Check if there's a preselected group filter from another page
    useEffect(() => {
        const preselectedGroup = localStorage.getItem('preselectedGroupFilter');
        if (preselectedGroup) {
            setFilters(prev => ({ ...prev, group: preselectedGroup }));
            localStorage.removeItem('preselectedGroupFilter');
        }
    }, []);

    // Fetch students with filters
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['students', filters],
        queryFn: () => studentService.getStudents(filters)
    });

    // Fetch groups for filter dropdown
    const { data: groupsData } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    const students = data?.data?.data || [];
    const groups = groupsData?.data?.data || [];

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const clearFilters = () => {
        setFilters({ group: '', search: '' });
    };

    const handleDelete = async (id, studentName) => {
        if (window.confirm(`Are you sure you want to delete student "${studentName}"?`)) {
            try {
                await studentService.deleteStudent(id);
                refetch(); // Refresh the list after deletion
            } catch (error) {
                console.error('Error deleting student:', error);
                alert('Failed to delete student');
            }
        }
    };

    // Filter students by search term if present
    const filteredStudents = students.filter(student => {
        if (!filters.search) return true;
        return student.fio.toLowerCase().includes(filters.search.toLowerCase());
    });

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
                    <p>Error loading students: {error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Students</h1>
                    <p className="text-secondary">Manage your student records</p>
                </div>
                <RequireSubscription
                    fallback={
                        <button className="btn btn-primary opacity-70 cursor-not-allowed flex items-center gap-2" disabled>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Add Student (Subscription)
                        </button>
                    }
                >
                    <Link to="/students/new" className="btn btn-primary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Add Student
                    </Link>
                </RequireSubscription>
            </div>

            {/* Compact Filters */}
            <div className="bg-dark-secondary rounded-lg mb-6 p-3">
                <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[180px]">
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

                    <div className="flex-1 min-w-[220px]">
                        <label htmlFor="search" className="form-label text-xs mb-1">Search</label>
                        <div className="relative">
                            <input
                                type="text"
                                id="search"
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                                placeholder="Search by name..."
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

            {/* Students Table */}
            {filteredStudents.length === 0 ? (
                <div className="card p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full mx-auto flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="9" cy="7" r="4"></circle>
                                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl mb-2">No students found</h3>
                        <p className="text-tertiary mb-6">Try changing your filters or add a new student.</p>
                        <RequireSubscription
                            fallback={
                                <button className="btn btn-primary opacity-70 cursor-not-allowed" disabled>
                                    Add Student (Subscription Required)
                                </button>
                            }
                        >
                            <Link to="/students/new" className="btn btn-primary">
                                Add Your First Student
                            </Link>
                        </RequireSubscription>
                    </div>
                </div>
            ) : (
                <div className="card p-0 overflow-hidden">
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Group</th>
                                <th className="text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {filteredStudents.map(student => (
                                <tr key={student.id}>
                                    <td>
                                        <div className="flex items-center gap-3">
                                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary-lighter text-primary flex items-center justify-center font-medium">
                                                {student.fio.charAt(0).toUpperCase()}
                                            </div>
                                            <div>{student.fio}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <Link to={`/groups/${encodeURIComponent(student.group_name)}`} className="group">
                                                <span className="text-primary-light group-hover:text-primary group-hover:underline transition-colors">
                                                    {student.group_name}
                                                </span>
                                        </Link>
                                    </td>
                                    <td>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => navigate(`/students/${student.id}`)}
                                                className="btn btn-sm btn-secondary"
                                                title="View Student"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                                <span className="hidden sm:inline ml-1">View</span>
                                            </button>

                                            <RequireSubscription
                                                fallback={
                                                    <button className="btn btn-sm btn-primary opacity-60 cursor-not-allowed" disabled title="Edit Student (Subscription Required)">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                        </svg>
                                                    </button>
                                                }
                                            >
                                                <button
                                                    onClick={() => navigate(`/students/${student.id}/edit`)}
                                                    className="btn btn-sm btn-primary"
                                                    title="Edit Student"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                                    </svg>
                                                    <span className="hidden sm:inline ml-1">Edit</span>
                                                </button>
                                            </RequireSubscription>

                                            <RequireSubscription
                                                fallback={
                                                    <button className="btn btn-sm btn-danger opacity-60 cursor-not-allowed" disabled title="Delete Student (Subscription Required)">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6"></polyline>
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                        </svg>
                                                    </button>
                                                }
                                            >
                                                <button
                                                    onClick={() => handleDelete(student.id, student.fio)}
                                                    className="btn btn-sm btn-danger"
                                                    title="Delete Student"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                    <span className="hidden sm:inline ml-1">Delete</span>
                                                </button>
                                            </RequireSubscription>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default StudentsPage;