import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { groupService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function GroupsPage() {
    const { isFree } = useAuth();
    const navigate = useNavigate();

    // Fetch all groups
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    const groups = data?.data?.data || [];

    const handleDelete = async (name) => {
        if (window.confirm(`Are you sure you want to delete the group "${name}"? This will remove all associated data.`)) {
            try {
                await groupService.deleteGroup(name);
                refetch(); // Refresh the list after deletion
            } catch (error) {
                console.error('Error deleting group:', error);
                alert('Failed to delete group');
            }
        }
    };

    if (isLoading) {
        return <div className="loader">Loading...</div>;
    }

    if (error) {
        return <div className="alert alert-danger">Error loading groups: {error.message}</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Groups</h1>
                <RequireSubscription
                    fallback={
                        <button className="btn btn-primary" disabled>
                            Add Group (Subscription Required)
                        </button>
                    }
                >
                    <Link to="/groups/new" className="btn btn-primary">Add Group</Link>
                </RequireSubscription>
            </div>

            {/* Groups List */}
            {groups.length === 0 ? (
                <div className="card">
                    <h3>No groups found</h3>
                    <p>Create your first group to start managing students and lessons.</p>
                    <RequireSubscription>
                        <Link to="/groups/new" className="btn btn-primary">Create Group</Link>
                    </RequireSubscription>
                </div>
            ) : (
                <div className="card">
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Group Name</th>
                                <th>Students</th>
                                <th>Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {groups.map(group => (
                                <tr key={group.name}>
                                    <td>{group.name}</td>
                                    <td>{group.student_count || 0}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '5px' }}>
                                            <button
                                                onClick={() => navigate(`/groups/${encodeURIComponent(group.name)}`)}
                                                className="btn btn-sm btn-secondary"
                                            >
                                                View
                                            </button>

                                            <RequireSubscription
                                                fallback={
                                                    <button className="btn btn-sm btn-primary" disabled>
                                                        Edit
                                                    </button>
                                                }
                                            >
                                                <button
                                                    onClick={() => navigate(`/groups/${encodeURIComponent(group.name)}/edit`)}
                                                    className="btn btn-sm btn-primary"
                                                >
                                                    Edit
                                                </button>
                                            </RequireSubscription>

                                            <RequireSubscription
                                                fallback={
                                                    <button className="btn btn-sm btn-danger" disabled>
                                                        Delete
                                                    </button>
                                                }
                                            >
                                                <button
                                                    onClick={() => handleDelete(group.name)}
                                                    className="btn btn-sm btn-danger"
                                                >
                                                    Delete
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

export default GroupsPage;