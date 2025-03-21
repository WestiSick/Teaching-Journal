import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { adminService } from '../../services/api';

function TeacherGroups() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [showAddGroupModal, setShowAddGroupModal] = useState(false);
    const [newGroupData, setNewGroupData] = useState({
        group_name: '',
        students: ''
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

    // Get teacher groups
    const { data: groupsData, isLoading: groupsLoading } = useQuery({
        queryKey: ['admin-teacher-groups', id],
        queryFn: () => adminService.getTeacherGroups(id)
    });

    // Add group mutation
    const addGroupMutation = useMutation({
        mutationFn: (data) => adminService.addTeacherGroup(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-teacher-groups', id] });
            setShowAddGroupModal(false);
            setNewGroupData({ group_name: '', students: '' });
        }
    });

    const teacher = userData;
    const groups = groupsData?.data?.data?.groups || [];

    const isLoading = userLoading || groupsLoading;

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewGroupData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddGroup = (e) => {
        e.preventDefault();

        // Convert students string to array
        const studentsArray = newGroupData.students
            .split('\n')
            .map(s => s.trim())
            .filter(s => s !== '');

        addGroupMutation.mutate({
            group_name: newGroupData.group_name,
            students: studentsArray
        });
    };

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
                <h1 className="page-title">Teacher Groups</h1>
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
                            className="tab-button tab-button-active"
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

            {/* Groups List */}
            <div className="card">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-xl font-semibold">Groups</h2>
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowAddGroupModal(true)}
                    >
                        Add Group
                    </button>
                </div>

                {groups.length === 0 ? (
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <h3>No Groups Found</h3>
                        <p>This teacher doesn't have any groups yet.</p>
                        <button
                            className="btn btn-primary mt-3"
                            onClick={() => setShowAddGroupModal(true)}
                        >
                            Add Group
                        </button>
                    </div>
                ) : (
                    <div className="groups-grid">
                        {groups.map((group, index) => (
                            <div key={index} className="group-card">
                                <div className="group-header">
                                    <h3 className="group-name">{group.name}</h3>
                                    <span className="student-count">{group.student_count} students</span>
                                </div>

                                <div className="group-students">
                                    {group.students && group.students.length > 0 ? (
                                        <ul className="student-list">
                                            {group.students.slice(0, 5).map((student, idx) => (
                                                <li key={idx} className="student-item">
                                                    <span className="student-initial">{student.fio.charAt(0)}</span>
                                                    <span className="student-name">{student.fio}</span>
                                                </li>
                                            ))}
                                            {group.students.length > 5 && (
                                                <li className="more-students">+{group.students.length - 5} more</li>
                                            )}
                                        </ul>
                                    ) : (
                                        <p className="no-students">No students in this group</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Group Modal */}
            {showAddGroupModal && (
                <div className="modal-overlay">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h3 className="modal-title">Add Group for {teacher.fio}</h3>
                                <button
                                    type="button"
                                    className="btn-close"
                                    onClick={() => setShowAddGroupModal(false)}
                                >
                                    &times;
                                </button>
                            </div>
                            <form onSubmit={handleAddGroup}>
                                <div className="modal-body">
                                    <div className="form-group">
                                        <label htmlFor="group_name">Group Name</label>
                                        <input
                                            type="text"
                                            id="group_name"
                                            name="group_name"
                                            className="form-control"
                                            value={newGroupData.group_name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </div>
                                    <div className="form-group mt-3">
                                        <label htmlFor="students">Students (Optional)</label>
                                        <p className="text-tertiary text-sm mb-2">One student name per line</p>
                                        <textarea
                                            id="students"
                                            name="students"
                                            className="form-control"
                                            rows="5"
                                            value={newGroupData.students}
                                            onChange={handleInputChange}
                                            placeholder="John Smith&#10;Jane Doe"
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button
                                        type="button"
                                        className="btn btn-secondary"
                                        onClick={() => setShowAddGroupModal(false)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={addGroupMutation.isPending || !newGroupData.group_name}
                                    >
                                        {addGroupMutation.isPending ? 'Adding...' : 'Add Group'}
                                    </button>
                                </div>
                            </form>
                        </div>
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
                
                .groups-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                
                .group-card {
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-lg);
                    overflow: hidden;
                    border: 1px solid var(--border-color);
                }
                
                .group-header {
                    padding: 1rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .group-name {
                    margin: 0;
                    font-size: 1.125rem;
                }
                
                .student-count {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .group-students {
                    padding: 1rem;
                }
                
                .student-list {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .student-item {
                    display: flex;
                    align-items: center;
                    padding: 0.5rem 0;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .student-item:last-child {
                    border-bottom: none;
                }
                
                .student-initial {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 28px;
                    height: 28px;
                    border-radius: var(--radius-full);
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    font-weight: 600;
                    margin-right: 0.75rem;
                    font-size: 0.75rem;
                }
                
                .student-name {
                    font-size: 0.875rem;
                }
                
                .more-students {
                    text-align: center;
                    padding: 0.5rem 0;
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                }
                
                .no-students {
                    color: var(--text-tertiary);
                    text-align: center;
                    padding: 1rem 0;
                }
                
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .modal-dialog {
                    width: 100%;
                    max-width: 500px;
                }
                
                .modal-content {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    box-shadow: var(--shadow-lg);
                }
                
                .modal-header {
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .modal-title {
                    margin: 0;
                    font-size: 1.25rem;
                }
                
                .btn-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    color: var(--text-tertiary);
                    cursor: pointer;
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .modal-footer {
                    padding: 1rem 1.5rem;
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                }
            `}</style>
        </div>
    );
}

export default TeacherGroups;