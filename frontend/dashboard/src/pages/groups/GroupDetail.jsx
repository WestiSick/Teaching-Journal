import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { groupService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function GroupDetail() {
    const { name } = useParams();
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const decodedName = decodeURIComponent(name);

    // Fetch group details
    const { data: groupData, isLoading: groupLoading, error: groupError } = useQuery({
        queryKey: ['group', decodedName],
        queryFn: () => groupService.getGroup(decodedName)
    });

    // Fetch students in group
    const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useQuery({
        queryKey: ['group-students', decodedName],
        queryFn: () => groupService.getStudentsInGroup(decodedName),
        enabled: !groupLoading && !groupError
    });

    // Fetch lessons for this group
    const { data: lessonsData, isLoading: lessonsLoading, error: lessonsError } = useQuery({
        queryKey: ['lessons', { group: decodedName }],
        queryFn: () => lessonService.getLessons({ group: decodedName }),
        enabled: !groupLoading && !groupError
    });

    const group = groupData?.data?.data;
    const students = studentsData?.data?.data || [];
    const lessons = lessonsData?.data?.data || [];

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete the group "${decodedName}"? This will remove all associated data.`)) {
            try {
                await groupService.deleteGroup(decodedName);
                navigate('/groups');
            } catch (error) {
                console.error('Error deleting group:', error);
                alert('Failed to delete group');
            }
        }
    };

    if (groupLoading) {
        return <div className="loader">Loading...</div>;
    }

    if (groupError) {
        return <div className="alert alert-danger">Error loading group: {groupError.message}</div>;
    }

    if (!group) {
        return <div className="alert alert-warning">Group not found</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Group: {decodedName}</h1>
                <div>
                    <Link to="/groups" className="btn btn-secondary">Back to Groups</Link>
                    <RequireSubscription>
                        <Link to={`/groups/${encodeURIComponent(decodedName)}/edit`} className="btn btn-primary" style={{ marginLeft: '10px' }}>
                            Edit Group
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="btn btn-danger"
                            style={{ marginLeft: '10px' }}
                        >
                            Delete Group
                        </button>
                    </RequireSubscription>
                </div>
            </div>

            <div className="card">
                <h2>Group Information</h2>
                <p><strong>Total Students:</strong> {group.student_count || students.length || 0}</p>
                {group.subjects && group.subjects.length > 0 && (
                    <div>
                        <h3>Subjects</h3>
                        <ul>
                            {group.subjects.map(subject => (
                                <li key={subject}>{subject}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Students List */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <h2>Students</h2>
                    <RequireSubscription>
                        <Link to="/students/new" className="btn btn-primary"
                              onClick={() => localStorage.setItem('preselectedGroup', decodedName)}>
                            Add Student
                        </Link>
                    </RequireSubscription>
                </div>

                {studentsLoading ? (
                    <p>Loading students...</p>
                ) : studentsError ? (
                    <div className="alert alert-danger">Error loading students: {studentsError.message}</div>
                ) : students.length === 0 ? (
                    <p>No students in this group</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Name</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {students.map(student => (
                                <tr key={student.id}>
                                    <td>{student.fio}</td>
                                    <td>
                                        <RequireSubscription>
                                            <Link to={`/students/${student.id}`} className="btn btn-sm btn-secondary">
                                                View
                                            </Link>
                                        </RequireSubscription>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Recent Lessons */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <h2>Recent Lessons</h2>
                    <RequireSubscription>
                        <Link to="/lessons/new" className="btn btn-primary"
                              onClick={() => localStorage.setItem('preselectedGroup', decodedName)}>
                            Add Lesson
                        </Link>
                    </RequireSubscription>
                </div>

                {lessonsLoading ? (
                    <p>Loading lessons...</p>
                ) : lessonsError ? (
                    <div className="alert alert-danger">Error loading lessons: {lessonsError.message}</div>
                ) : lessons.length === 0 ? (
                    <p>No lessons for this group yet</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Date</th>
                                <th>Subject</th>
                                <th>Topic</th>
                                <th>Type</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lessons.slice(0, 5).map(lesson => (
                                <tr key={lesson.id}>
                                    <td>{new Date(lesson.date).toLocaleDateString()}</td>
                                    <td>{lesson.subject}</td>
                                    <td>{lesson.topic}</td>
                                    <td>{lesson.type}</td>
                                    <td>
                                        <Link to={`/lessons/${lesson.id}`} className="btn btn-sm btn-secondary">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {lessons.length > 5 && (
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <Link to="/lessons" className="btn btn-sm btn-secondary"
                                      onClick={() => localStorage.setItem('preselectedGroupFilter', decodedName)}>
                                    View All Lessons
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GroupDetail;