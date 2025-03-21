import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService, studentService } from '../../services/api';

function GroupForm() {
    const { name } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!name;
    const decodedName = isEditMode ? decodeURIComponent(name) : '';
    const fileInputRef = useRef(null);

    // Form state
    const [groupName, setGroupName] = useState('');
    const [students, setStudents] = useState([{ id: Date.now(), fio: '' }]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');

    // Fetch group data if in edit mode
    const { data: groupData, isLoading: groupLoading } = useQuery({
        queryKey: ['group', decodedName],
        queryFn: () => groupService.getGroup(decodedName),
        enabled: isEditMode
    });

    // Fetch students in the group if in edit mode
    const { data: studentsData, isLoading: studentsLoading } = useQuery({
        queryKey: ['group-students', decodedName],
        queryFn: () => groupService.getStudentsInGroup(decodedName),
        enabled: isEditMode
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: (data) => groupService.createGroup(data),
        onSuccess: () => {
            setSuccess('Group created successfully');
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setTimeout(() => navigate('/groups'), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to create group');
        }
    });

    // Update mutation
    const updateMutation = useMutation({
        mutationFn: ({ oldName, newName }) => groupService.updateGroup(oldName, { new_name: newName }),
        onSuccess: () => {
            setSuccess('Group updated successfully');
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setTimeout(() => navigate('/groups'), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to update group');
        }
    });

    // Add student mutation
    const addStudentMutation = useMutation({
        mutationFn: (data) => studentService.createStudent(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['group-students', decodedName] });
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to add student');
        }
    });

    // Populate form with group data if in edit mode
    useEffect(() => {
        if (isEditMode && groupData?.data?.data) {
            setGroupName(decodedName);
        }
    }, [isEditMode, groupData, decodedName]);

    // Populate students if in edit mode
    useEffect(() => {
        if (isEditMode && studentsData?.data?.data) {
            const existingStudents = studentsData.data.data;
            if (existingStudents && existingStudents.length > 0) {
                // We don't modify existing students in edit mode
                // They are displayed in read-only mode in GroupDetail
            }
        }
    }, [isEditMode, studentsData]);

    const handleAddStudent = () => {
        setStudents([...students, { id: Date.now(), fio: '' }]);
    };

    const handleRemoveStudent = (id) => {
        if (students.length > 1) {
            setStudents(students.filter(student => student.id !== id));
        }
    };

    const handleStudentChange = (id, value) => {
        setStudents(students.map(student =>
            student.id === id ? { ...student, fio: value } : student
        ));
    };

    // Handle file upload for student list
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Reset status and errors
        setUploadStatus('');
        setError('');

        // Check if it's a text file
        if (file.type !== 'text/plain') {
            setError('Please upload a text (.txt) file');
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setUploadStatus('Reading file...');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const lines = content.split('\n');

                // Filter out empty lines and trim whitespace
                const validNames = lines
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                if (validNames.length === 0) {
                    setError('No valid student names found in the file');
                    setUploadStatus('');
                    return;
                }

                // Create new student objects for each valid name
                const newStudents = validNames.map(name => ({
                    id: Date.now() + Math.random(), // Ensure unique IDs
                    fio: name
                }));

                // Replace the current student list if it only has one empty student
                // Otherwise append to the existing list
                if (students.length === 1 && !students[0].fio) {
                    setStudents(newStudents);
                } else {
                    setStudents([...students, ...newStudents]);
                }

                setUploadStatus(`Successfully added ${validNames.length} students from file`);

                // Reset file input
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (err) {
                console.error('Error processing file:', err);
                setError('Error processing file. Please check the format and try again.');
                setUploadStatus('');
            }
        };

        reader.onerror = () => {
            setError('Failed to read the file. Please try again.');
            setUploadStatus('');
        };

        reader.readAsText(file);
    };

    const validateForm = () => {
        setError('');
        setSuccess('');

        if (!groupName.trim()) {
            setError('Group name is required');
            return false;
        }

        if (!isEditMode) {
            // In create mode, validate students
            const emptyStudents = students.filter(student => !student.fio.trim());
            if (emptyStudents.length > 0) {
                setError('All student names must be filled or removed');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (isEditMode) {
            // Update group name
            if (groupName !== decodedName) {
                updateMutation.mutate({ oldName: decodedName, newName: groupName });
            } else {
                navigate(`/groups/${encodeURIComponent(groupName)}`);
            }
        } else {
            // Create group
            try {
                const response = await createMutation.mutateAsync({
                    name: groupName,
                    students: students.map(s => s.fio)
                });

                if (response.data.success) {
                    setSuccess('Group created successfully');
                    setTimeout(() => navigate('/groups'), 1500);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to create group');
            }
        }
    };

    // Loading state for edit mode
    if (isEditMode && (groupLoading || studentsLoading)) {
        return <div className="loader">Loading...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>{isEditMode ? 'Edit Group' : 'Create Group'}</h1>
                <Link to="/groups" className="btn btn-secondary">Back to Groups</Link>
            </div>

            <div className="card">
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}
                {uploadStatus && <div className="alert alert-info">{uploadStatus}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="groupName">Group Name</label>
                        <input
                            type="text"
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                            className="form-control"
                        />
                    </div>

                    {!isEditMode && (
                        <div className="form-group">
                            <label>Students (Optional)</label>

                            {/* File upload for student list */}
                            <div style={{ marginBottom: '15px', border: '1px dashed #ccc', padding: '15px', borderRadius: '5px' }}>
                                <h4>Upload Student List</h4>
                                <p className="text-muted">Upload a text file with one student name per line</p>
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={handleFileUpload}
                                    ref={fileInputRef}
                                    className="form-control"
                                />
                                <small className="form-text text-muted">
                                    The file should be a .txt file with each student's name on a separate line
                                </small>
                            </div>

                            <h4>Manually Add Students</h4>
                            {students.map((student, index) => (
                                <div key={student.id} style={{ display: 'flex', marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        value={student.fio}
                                        onChange={(e) => handleStudentChange(student.id, e.target.value)}
                                        placeholder={`Student ${index + 1} name`}
                                        className="form-control"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveStudent(student.id)}
                                        className="btn btn-danger"
                                        style={{ marginLeft: '10px' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddStudent}
                                className="btn btn-secondary"
                            >
                                Add Student
                            </button>
                            <small className="form-text text-muted">
                                You can also add students later from the group details page.
                            </small>
                        </div>
                    )}

                    <div className="form-actions" style={{ marginTop: '20px' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending)
                                ? 'Saving...'
                                : isEditMode ? 'Update Group' : 'Create Group'}
                        </button>
                        <Link to="/groups" className="btn btn-secondary" style={{ marginLeft: '10px' }}>
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default GroupForm;