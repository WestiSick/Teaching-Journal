import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { labService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function SharedLinks() {
    const { isFree } = useAuth();
    const queryClient = useQueryClient();
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [linkToDelete, setLinkToDelete] = useState(null);
    const [copiedLink, setCopiedLink] = useState(null);

    // Fetch all shared links
    const { data, isLoading, error: fetchError } = useQuery({
        queryKey: ['shared-links'],
        queryFn: labService.getSharedLinks,
        enabled: !isFree
    });

    // Effect to reset copied status after a delay
    useEffect(() => {
        if (copiedLink) {
            const timer = setTimeout(() => {
                setCopiedLink(null);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [copiedLink]);

    // Delete shared link mutation
    const deleteMutation = useMutation({
        mutationFn: (token) => labService.deleteSharedLink(token),
        onSuccess: () => {
            setSuccess('Shared link deleted successfully');
            queryClient.invalidateQueries({ queryKey: ['shared-links'] });
            setShowConfirmation(false);
            setLinkToDelete(null);

            // Clear success message after a delay
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to delete shared link');
            setShowConfirmation(false);

            // Clear error message after a delay
            setTimeout(() => {
                setError('');
            }, 5000);
        }
    });

    const handleDelete = (token, linkInfo) => {
        setLinkToDelete({
            token,
            subject: linkInfo.subject,
            group: linkInfo.group_name
        });
        setShowConfirmation(true);
    };

    const confirmDelete = () => {
        if (linkToDelete?.token) {
            deleteMutation.mutate(linkToDelete.token);
        }
    };

    const handleCopyLink = (token) => {
        // Create a proper frontend URL instead of using the API URL
        const shareUrl = `${window.location.protocol}//${window.location.host}/labs/shared/${token}`;

        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                setCopiedLink(token);
                setSuccess('Link copied to clipboard');

                // Clear success message after a delay
                setTimeout(() => {
                    setSuccess('');
                }, 3000);
            })
            .catch(() => {
                setError('Failed to copy link');

                // Clear error message after a delay
                setTimeout(() => {
                    setError('');
                }, 5000);
            });
    };

    const getProperShareUrl = (token) => {
        // Create a proper frontend URL instead of using the API URL
        return `${window.location.protocol}//${window.location.host}/labs/shared/${token}`;
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);

        // Get today and tomorrow dates for comparison
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const isToday = date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear();

        const isTomorrow = date.getDate() === tomorrow.getDate() &&
            date.getMonth() === tomorrow.getMonth() &&
            date.getFullYear() === tomorrow.getFullYear();

        // Format date based on when it is
        if (isToday) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (isTomorrow) {
            return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else {
            return date.toLocaleDateString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    };

    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Shared Lab Grade Links</h1>
                        <p className="text-secondary">Manage and track shared lab grade links</p>
                    </div>
                    <Link to="/labs" className="btn btn-secondary flex items-center gap-2">
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

    if (isLoading) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Shared Lab Grade Links</h1>
                        <p className="text-secondary">Manage and track shared lab grade links</p>
                    </div>
                    <Link to="/labs" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </div>
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (fetchError) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Shared Lab Grade Links</h1>
                        <p className="text-secondary">Manage and track shared lab grade links</p>
                    </div>
                    <Link to="/labs" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span className="hidden sm:inline">Back</span>
                    </Link>
                </div>
                <div className="alert alert-danger mb-6">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <p>Error loading shared links: {fetchError.message}</p>
                    </div>
                </div>
            </div>
        );
    }

    const sharedLinks = data?.data?.data || [];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Shared Lab Grade Links</h1>
                    <p className="text-secondary">Manage and track shared lab grade links</p>
                </div>
                <Link to="/labs" className="btn btn-secondary flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="hidden sm:inline">Back</span>
                </Link>
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

            <div className="card p-0 overflow-hidden">
                <div className="p-6 border-b border-border-color">
                    <h2 className="text-xl font-semibold">Active Share Links</h2>
                    <p className="text-secondary mt-1">
                        Links to lab grades that you've shared with students
                    </p>
                </div>

                {sharedLinks.length === 0 ? (
                    <div className="flex flex-col items-center py-12 px-6">
                        <div className="bg-bg-dark-tertiary rounded-full p-4 mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tertiary">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                        </div>
                        <h3 className="text-lg font-medium mb-2">No shared links found</h3>
                        <p className="text-secondary text-center mb-6">
                            You haven't created any share links yet. You can create share links from the lab grades page.
                        </p>
                        <Link to="/labs" className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                            </svg>
                            Create Share Link
                        </Link>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="table w-full">
                            <thead>
                            <tr>
                                <th>Subject</th>
                                <th>Group</th>
                                <th>Created</th>
                                <th>Expires</th>
                                <th>Status</th>
                                <th>Views</th>
                                <th className="text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sharedLinks.map((link) => {
                                const isExpired = new Date(link.expires_at) < new Date();
                                const properShareUrl = getProperShareUrl(link.token);
                                const isAlmostExpired = !isExpired &&
                                    (new Date(link.expires_at) - new Date()) / (1000 * 60 * 60 * 24) < 2; // Less than 2 days

                                return (
                                    <tr key={link.token}>
                                        <td className="font-medium">{link.subject}</td>
                                        <td>{link.group_name}</td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tertiary">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                <span>{formatDate(link.created_at)}</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${isExpired ? 'text-danger' : isAlmostExpired ? 'text-warning' : 'text-tertiary'}`}>
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <polyline points="12 6 12 12 16 14"></polyline>
                                                </svg>
                                                <span className={isExpired ? 'text-danger' : isAlmostExpired ? 'text-warning' : ''}>
                                                        {formatDate(link.expires_at)}
                                                    </span>
                                            </div>
                                        </td>
                                        <td>
                                            {isExpired ? (
                                                <span className="badge bg-danger-lighter text-danger px-3 py-1 inline-flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                                        </svg>
                                                        Expired
                                                    </span>
                                            ) : isAlmostExpired ? (
                                                <span className="badge bg-warning-lighter text-warning px-3 py-1 inline-flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <circle cx="12" cy="12" r="10"></circle>
                                                            <line x1="12" y1="8" x2="12" y2="12"></line>
                                                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                        </svg>
                                                        Expiring Soon
                                                    </span>
                                            ) : (
                                                <span className="badge bg-success-lighter text-success px-3 py-1 inline-flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                            <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                        </svg>
                                                        Active
                                                    </span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-tertiary">
                                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                    <circle cx="12" cy="12" r="3"></circle>
                                                </svg>
                                                <span className="font-medium">{link.access_count}</span>
                                            </div>
                                        </td>
                                        <td className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <a
                                                    href={properShareUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn-sm btn-secondary"
                                                    title="View shared page"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                        <circle cx="12" cy="12" r="3"></circle>
                                                    </svg>
                                                    <span className="hidden sm:inline ml-1">View</span>
                                                </a>
                                                <button
                                                    onClick={() => handleCopyLink(link.token)}
                                                    className={`btn btn-sm ${copiedLink === link.token ? 'btn-success' : 'btn-primary'}`}
                                                    disabled={isExpired}
                                                    title="Copy link to clipboard"
                                                >
                                                    {copiedLink === link.token ? (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                                                            </svg>
                                                            <span className="hidden sm:inline ml-1">Copied</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                                            </svg>
                                                            <span className="hidden sm:inline ml-1">Copy</span>
                                                        </>
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(link.token, link)}
                                                    className="btn btn-sm btn-danger"
                                                    title="Delete link"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                        <polyline points="3 6 5 6 21 6"></polyline>
                                                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                                    </svg>
                                                    <span className="hidden sm:inline ml-1">Delete</span>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Tips Card */}
            <div className="card mt-6 p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="16" x2="12" y2="12"></line>
                        <line x1="12" y1="8" x2="12.01" y2="8"></line>
                    </svg>
                    Tips for Sharing Lab Grades
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 bg-primary-lighter text-primary w-10 h-10 rounded-md flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="16"></line>
                                <line x1="8" y1="12" x2="16" y2="12"></line>
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-medium mb-1">Create from Lab Grades Page</h4>
                            <p className="text-secondary text-sm">
                                To create a new shared link, navigate to a specific lab grades page and use the "Generate Share Link" button.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 bg-success-lighter text-success w-10 h-10 rounded-md flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                                <polyline points="22 4 12 14.01 9 11.01"></polyline>
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-medium mb-1">Links Auto-Expire</h4>
                            <p className="text-secondary text-sm">
                                Shared links automatically expire after the time period you set. You can always create a new link if needed.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 bg-warning-lighter text-warning w-10 h-10 rounded-md flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-medium mb-1">Track Views</h4>
                            <p className="text-secondary text-sm">
                                You can see how many times each link has been accessed to monitor student engagement.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="flex-shrink-0 bg-danger-lighter text-danger w-10 h-10 rounded-md flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                        <div>
                            <h4 className="font-medium mb-1">Secure Access</h4>
                            <p className="text-secondary text-sm">
                                Anyone with the link can view the grades. Delete a link at any time to revoke access.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirmation Modal */}
            {showConfirmation && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
                    <div className="bg-bg-dark-secondary p-6 rounded-lg shadow-xl max-w-md w-full">
                        <h3 className="text-xl font-bold mb-4">Confirm Deletion</h3>
                        <p className="mb-2">Are you sure you want to delete this shared link?</p>
                        {linkToDelete && (
                            <div className="bg-bg-dark-tertiary p-4 rounded-md mb-4">
                                <p className="font-medium">{linkToDelete.subject} - {linkToDelete.group}</p>
                                <p className="text-sm text-secondary mt-1">
                                    Once deleted, students will no longer be able to access these lab grades.
                                </p>
                            </div>
                        )}
                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setShowConfirmation(false)}
                                className="btn btn-secondary"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
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
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                        Delete Link
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style jsx="true">{`
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

export default SharedLinks;