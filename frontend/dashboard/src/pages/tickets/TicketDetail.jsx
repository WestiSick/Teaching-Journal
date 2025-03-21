// frontend/dashboard/src/pages/tickets/TicketDetail.jsx
import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function TicketDetail() {
    const { id } = useParams();
    const { currentUser } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const commentInputRef = useRef(null);

    const [newComment, setNewComment] = useState('');
    const [isInternal, setIsInternal] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [fileUploadProgress, setFileUploadProgress] = useState(0);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [activeTab, setActiveTab] = useState('details');

    // Fetch ticket details
    const { data: ticketData, isLoading: ticketLoading, error: ticketError, refetch: refetchTicket } = useQuery({
        queryKey: ['ticket', id],
        queryFn: () => ticketService.getTicket(id)
    });

    // Fetch comments
    const { data: commentsData, isLoading: commentsLoading, error: commentsError, refetch: refetchComments } = useQuery({
        queryKey: ['ticket-comments', id],
        queryFn: () => ticketService.getComments(id)
    });

    // Fetch attachments
    const { data: attachmentsData, isLoading: attachmentsLoading, error: attachmentsError, refetch: refetchAttachments } = useQuery({
        queryKey: ['ticket-attachments', id],
        queryFn: () => ticketService.getAttachments(id)
    });

    // Add comment mutation
    const addCommentMutation = useMutation({
        mutationFn: (commentData) => ticketService.addComment(id, commentData),
        onSuccess: () => {
            refetchComments();
            refetchTicket();
            setNewComment('');
            setIsInternal(false);
            // Handle file uploads after comment is posted
            if (selectedFiles.length > 0) {
                handleFileUpload();
            }
        }
    });

    // Update ticket status mutation
    const updateTicketMutation = useMutation({
        mutationFn: (data) => ticketService.updateTicket(id, data),
        onSuccess: () => {
            refetchTicket();
        }
    });

    // Delete ticket mutation
    const deleteTicketMutation = useMutation({
        mutationFn: () => ticketService.deleteTicket(id),
        onSuccess: () => {
            navigate('/tickets');
        }
    });

    const ticket = ticketData?.data?.data;
    const comments = commentsData?.data?.data || [];
    const attachments = attachmentsData?.data?.data || [];

    // Auto-scroll to comment section when clicking reply button
    const scrollToCommentInput = () => {
        setActiveTab('comments');
        setTimeout(() => {
            commentInputRef.current?.focus();
        }, 100);
    };

    // Handle comment submission
    const handleCommentSubmit = (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const commentData = {
            content: newComment,
            is_internal: isInternal
        };

        addCommentMutation.mutate(commentData);
    };

    // Handle file selection
    const handleFileSelect = (e) => {
        setSelectedFiles([...e.target.files]);
    };

    // Handle file upload
    const handleFileUpload = async () => {
        if (selectedFiles.length === 0) return;

        setUploadingFiles(true);
        setFileUploadProgress(0);

        try {
            for (let i = 0; i < selectedFiles.length; i++) {
                const formData = new FormData();
                formData.append('attachment', selectedFiles[i]);

                await ticketService.addAttachment(id, formData);
                setFileUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
            }

            // Reset file input and refresh attachments
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setSelectedFiles([]);
            refetchAttachments();

        } catch (error) {
            console.error('Error uploading files:', error);
        } finally {
            setUploadingFiles(false);
        }
    };

    // Handle status change
    const handleStatusChange = (newStatus) => {
        updateTicketMutation.mutate({ status: newStatus });
    };

    // Handle ticket deletion
    const handleDeleteTicket = () => {
        if (window.confirm('Are you sure you want to delete this ticket? This action cannot be undone.')) {
            deleteTicketMutation.mutate();
        }
    };

    // Download attachment
    const handleDownloadAttachment = async (attachmentId, fileName) => {
        try {
            const response = await ticketService.downloadAttachment(attachmentId);

            // Create a blob from the response data
            const blob = new Blob([response.data]);

            // Create a link and trigger download
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error downloading attachment:', error);
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    const getStatusColor = (status) => {
        switch(status?.toLowerCase()) {
            case 'new': return 'var(--primary)';
            case 'open': return 'var(--warning)';
            case 'inprogress': return 'var(--warning)';
            case 'resolved': return 'var(--success)';
            case 'closed': return 'var(--neutral-500)';
            default: return 'var(--primary)';
        }
    };

    const getPriorityColor = (priority) => {
        switch(priority?.toLowerCase()) {
            case 'low': return 'var(--success)';
            case 'medium': return 'var(--warning)';
            case 'high': return 'var(--danger)';
            case 'critical': return 'var(--danger)';
            default: return 'var(--warning)';
        }
    };

    // Format relative time (e.g., "2 hours ago")
    const getRelativeTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'just now';

        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} ${diffInMinutes === 1 ? 'minute' : 'minutes'} ago`;

        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;

        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;

        return formatDate(dateString);
    };

    if (ticketLoading) {
        return (
            <div className="flex justify-center items-center p-8 min-h-screen">
                <div className="spinner"></div>
            </div>
        );
    }

    if (ticketError) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="alert alert-danger">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Error loading ticket: {ticketError.message}</span>
                </div>
                <div className="mt-4">
                    <Link to="/tickets" className="btn btn-primary">Return to Tickets</Link>
                </div>
            </div>
        );
    }

    if (!ticket) {
        return (
            <div className="p-6 max-w-4xl mx-auto">
                <div className="alert alert-warning">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Ticket not found</span>
                </div>
                <div className="mt-4">
                    <Link to="/tickets" className="btn btn-primary">Return to Tickets</Link>
                </div>
            </div>
        );
    }

    const canResolve = currentUser?.role === 'admin' || (currentUser?.id === ticket.assigned_to);
    const canReopen = currentUser?.role === 'admin' || (currentUser?.id === ticket.created_by && ticket.status === 'Resolved');
    const canDelete = currentUser?.role === 'admin' || currentUser?.id === ticket.created_by;
    const canEdit = currentUser?.role === 'admin' || currentUser?.id === ticket.created_by;

    return (
        <div className="p-4 md:p-6">
            {/* Header Section */}
            <div className="mb-6 bg-bg-card rounded-lg p-6 shadow-md border border-border-color">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    {/* Left side - Title and metadata */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-text-tertiary">#</span>
                            <span className="text-xl font-bold">{ticket.id}</span>
                            <span
                                className="ml-2 badge text-sm px-2 py-1"
                                style={{
                                    backgroundColor: `${getStatusColor(ticket.status)}25`,
                                    color: getStatusColor(ticket.status)
                                }}
                            >
                                {ticket.status}
                            </span>
                            <span
                                className="ml-2 badge text-sm px-2 py-1"
                                style={{
                                    backgroundColor: `${getPriorityColor(ticket.priority)}25`,
                                    color: getPriorityColor(ticket.priority)
                                }}
                            >
                                {ticket.priority}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold mb-2">{ticket.title}</h1>
                        <div className="flex items-center text-text-tertiary text-sm mb-1">
                            <span>Opened by </span>
                            <span className="font-medium text-text-secondary ml-1">{ticket.created_by_user?.name || `User #${ticket.created_by}`}</span>
                            <span className="mx-2">•</span>
                            <span>{getRelativeTime(ticket.created_at)}</span>
                            <span className="mx-2">•</span>
                            <span>{ticket.category}</span>
                        </div>
                    </div>

                    {/* Right side - Actions */}
                    <div className="flex gap-2 self-end md:self-auto">
                        <Link to="/tickets" className="btn btn-sm btn-outline flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back
                        </Link>
                        <button
                            onClick={scrollToCommentInput}
                            className="btn btn-sm btn-primary flex items-center gap-1"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                            </svg>
                            Reply
                        </button>
                        {canEdit && (
                            <Link to={`/tickets/${id}/edit`} className="btn btn-sm btn-outline flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                            </Link>
                        )}
                        {canDelete && (
                            <button onClick={handleDeleteTicket} className="btn btn-sm btn-danger flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                </svg>
                                Delete
                            </button>
                        )}
                    </div>
                </div>

                {/* Status Actions */}
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border-color">
                    {currentUser?.role === 'admin' && (
                        <>
                            <button
                                onClick={() => handleStatusChange('New')}
                                className="btn btn-sm btn-outline"
                                disabled={ticket.status === 'New'}
                            >
                                Mark as New
                            </button>
                            <button
                                onClick={() => handleStatusChange('Open')}
                                className="btn btn-sm btn-outline"
                                disabled={ticket.status === 'Open'}
                            >
                                Mark as Open
                            </button>
                            <button
                                onClick={() => handleStatusChange('InProgress')}
                                className="btn btn-sm btn-warning"
                                disabled={ticket.status === 'InProgress'}
                            >
                                Mark In Progress
                            </button>
                        </>
                    )}

                    {canResolve && (
                        <button
                            onClick={() => handleStatusChange('Resolved')}
                            className="btn btn-sm btn-success"
                            disabled={ticket.status === 'Resolved' || ticket.status === 'Closed'}
                        >
                            Mark as Resolved
                        </button>
                    )}

                    {canReopen && ticket.status === 'Resolved' && (
                        <button
                            onClick={() => handleStatusChange('Open')}
                            className="btn btn-sm btn-outline"
                        >
                            Reopen Ticket
                        </button>
                    )}

                    {currentUser?.role === 'admin' && (
                        <button
                            onClick={() => handleStatusChange('Closed')}
                            className="btn btn-sm btn-secondary"
                            disabled={ticket.status === 'Closed'}
                        >
                            Close Ticket
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-4 border-b border-border-color">
                <div className="flex gap-1">
                    <button
                        className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'details' ? 'text-primary border-b-2 border-primary' : 'text-text-tertiary'}`}
                        onClick={() => setActiveTab('details')}
                    >
                        Details
                    </button>
                    <button
                        className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'comments' ? 'text-primary border-b-2 border-primary' : 'text-text-tertiary'}`}
                        onClick={() => setActiveTab('comments')}
                    >
                        Comments {comments.length > 0 && `(${comments.length})`}
                    </button>
                    <button
                        className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'attachments' ? 'text-primary border-b-2 border-primary' : 'text-text-tertiary'}`}
                        onClick={() => setActiveTab('attachments')}
                    >
                        Attachments {attachments.length > 0 && `(${attachments.length})`}
                    </button>
                    {currentUser?.role === 'admin' && ticket.history && ticket.history.length > 0 && (
                        <button
                            className={`px-4 py-2 font-medium rounded-t-lg ${activeTab === 'history' ? 'text-primary border-b-2 border-primary' : 'text-text-tertiary'}`}
                            onClick={() => setActiveTab('history')}
                        >
                            History
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Main Content */}
                <div className="col-span-12 lg:col-span-8">
                    {/* Details Tab */}
                    {activeTab === 'details' && (
                        <div className="card mb-6">
                            <h2 className="text-xl font-semibold mb-4">Description</h2>
                            <div className="bg-bg-dark-tertiary p-6 rounded-lg whitespace-pre-wrap">
                                {ticket.description}
                            </div>
                        </div>
                    )}

                    {/* Comments Tab */}
                    {activeTab === 'comments' && (
                        <div className="card mb-6">
                            <h2 className="text-xl font-semibold mb-4">Comments</h2>

                            {commentsLoading ? (
                                <div className="flex justify-center items-center p-6">
                                    <div className="spinner"></div>
                                </div>
                            ) : comments.length === 0 ? (
                                <div className="bg-bg-dark-tertiary p-6 rounded-lg mb-6 text-center">
                                    <div className="mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-tertiary">
                                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                        </svg>
                                    </div>
                                    <p className="text-text-secondary text-lg font-medium">No comments yet</p>
                                    <p className="text-text-tertiary">Be the first to add a comment to this ticket</p>
                                </div>
                            ) : (
                                <div className="space-y-4 mb-6">
                                    {comments.map(comment => (
                                        <div
                                            key={comment.id}
                                            className={`p-4 rounded-lg transition-all ${comment.is_internal ? 'bg-primary-lighter border-l-4 border-primary' : 'bg-bg-dark-tertiary'}`}
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 bg-bg-dark-secondary text-primary rounded-full flex items-center justify-center font-semibold text-lg">
                                                        {comment.user?.name?.charAt(0).toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium">{comment.user?.name || `User #${comment.user_id}`}</div>
                                                        <div className="text-text-tertiary text-sm">{getRelativeTime(comment.created_at)}</div>
                                                    </div>
                                                </div>
                                                {comment.is_internal && (
                                                    <span className="badge badge-info text-xs flex items-center gap-1">
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                                                        </svg>
                                                        Internal Note
                                                    </span>
                                                )}
                                            </div>
                                            <div className="pl-13 ml-13">
                                                <p className="whitespace-pre-wrap text-text-primary leading-relaxed">{comment.content}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Add Comment Form */}
                            <div className="mt-6 pt-6 border-t border-border-color">
                                <h3 className="font-semibold text-lg mb-3">Add a Comment</h3>
                                <form onSubmit={handleCommentSubmit}>
                                    <div className="form-group">
                                        <textarea
                                            ref={commentInputRef}
                                            className="form-control"
                                            rows="5"
                                            placeholder="Write your comment here..."
                                            value={newComment}
                                            onChange={(e) => setNewComment(e.target.value)}
                                            required
                                        ></textarea>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-between gap-4 mt-4">
                                        <div className="flex items-center gap-4">
                                            {/* File Upload */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                                                <input
                                                    type="file"
                                                    ref={fileInputRef}
                                                    multiple
                                                    onChange={handleFileSelect}
                                                    className="hidden"
                                                    id="file-upload"
                                                />
                                                <label htmlFor="file-upload" className="btn btn-sm btn-outline cursor-pointer">
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                        <polyline points="17 8 12 3 7 8"></polyline>
                                                        <line x1="12" y1="3" x2="12" y2="15"></line>
                                                    </svg>
                                                    Attach Files
                                                </label>
                                                {selectedFiles.length > 0 && (
                                                    <span className="text-sm text-text-secondary">
                                                        {selectedFiles.length} file(s) selected
                                                    </span>
                                                )}
                                            </div>

                                            {/* Internal Note Checkbox (Admin Only) */}
                                            {currentUser?.role === 'admin' && (
                                                <div className="flex items-center">
                                                    <input
                                                        type="checkbox"
                                                        id="internal-note"
                                                        checked={isInternal}
                                                        onChange={(e) => setIsInternal(e.target.checked)}
                                                        className="mr-2"
                                                    />
                                                    <label htmlFor="internal-note" className="text-sm">
                                                        Mark as Internal Note
                                                    </label>
                                                </div>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            className="btn btn-primary"
                                            disabled={addCommentMutation.isPending || !newComment.trim()}
                                        >
                                            {addCommentMutation.isPending ? (
                                                <>
                                                    <div className="spinner w-4 h-4 mr-2"></div>
                                                    Posting...
                                                </>
                                            ) : (
                                                <>
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                                                        <path d="M22 2L11 13"></path>
                                                        <path d="M22 2l-7 20-4-9-9-4 20-7z"></path>
                                                    </svg>
                                                    Post Comment
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </form>

                                {/* File Upload Progress */}
                                {uploadingFiles && (
                                    <div className="mt-4 p-3 bg-bg-dark-tertiary rounded-lg">
                                        <div className="flex items-center mb-1">
                                            <div className="w-full bg-bg-dark rounded-full h-2.5 mr-2">
                                                <div
                                                    className="bg-primary h-2.5 rounded-full transition-all"
                                                    style={{ width: `${fileUploadProgress}%` }}
                                                ></div>
                                            </div>
                                            <span className="text-sm whitespace-nowrap">{fileUploadProgress}%</span>
                                        </div>
                                        <p className="text-sm text-text-tertiary">Uploading {selectedFiles.length} file(s)...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Attachments Tab */}
                    {activeTab === 'attachments' && (
                        <div className="card mb-6">
                            <h2 className="text-xl font-semibold mb-4">Attachments</h2>

                            {attachmentsLoading ? (
                                <div className="flex justify-center items-center p-6">
                                    <div className="spinner"></div>
                                </div>
                            ) : attachments.length === 0 ? (
                                <div className="bg-bg-dark-tertiary p-6 rounded-lg text-center">
                                    <div className="mb-3">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-tertiary">
                                            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                            <polyline points="13 2 13 9 20 9"></polyline>
                                        </svg>
                                    </div>
                                    <p className="text-text-secondary text-lg font-medium">No attachments</p>
                                    <p className="text-text-tertiary mb-4">This ticket doesn't have any file attachments</p>

                                    <div className="flex justify-center">
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            multiple
                                            onChange={handleFileSelect}
                                            className="hidden"
                                            id="attachment-upload"
                                        />
                                        <label htmlFor="attachment-upload" className="btn btn-primary cursor-pointer">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                <polyline points="17 8 12 3 7 8"></polyline>
                                                <line x1="12" y1="3" x2="12" y2="15"></line>
                                            </svg>
                                            Add Attachment
                                        </label>
                                    </div>

                                    {selectedFiles.length > 0 && (
                                        <div className="mt-4 text-left bg-bg-dark p-4 rounded-lg">
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-medium">{selectedFiles.length} file(s) selected</span>
                                                <button
                                                    onClick={handleFileUpload}
                                                    className="btn btn-sm btn-primary"
                                                    disabled={uploadingFiles}
                                                >
                                                    {uploadingFiles ? (
                                                        <>
                                                            <div className="spinner w-3 h-3 mr-1"></div>
                                                            Uploading...
                                                        </>
                                                    ) : "Upload Files"}
                                                </button>
                                            </div>
                                            <ul className="text-sm space-y-1">
                                                {Array.from(selectedFiles).map((file, index) => (
                                                    <li key={index} className="text-text-secondary">
                                                        {file.name} ({(file.size / 1024).toFixed(1)} KB)
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* File Upload Progress */}
                                    {uploadingFiles && (
                                        <div className="mt-4 p-3 bg-bg-dark rounded-lg">
                                            <div className="flex items-center mb-1">
                                                <div className="w-full bg-bg-dark-tertiary rounded-full h-2.5 mr-2">
                                                    <div
                                                        className="bg-primary h-2.5 rounded-full transition-all"
                                                        style={{ width: `${fileUploadProgress}%` }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm whitespace-nowrap">{fileUploadProgress}%</span>
                                            </div>
                                            <p className="text-sm text-text-tertiary">Uploading {selectedFiles.length} file(s)...</p>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {attachments.map(attachment => (
                                        <div
                                            key={attachment.id}
                                            className="bg-bg-dark-tertiary p-4 rounded-lg flex items-center gap-3 hover:bg-bg-card-hover transition-colors"
                                        >
                                            <div className="bg-bg-dark p-2 rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
                                                    <polyline points="13 2 13 9 20 9"></polyline>
                                                </svg>
                                            </div>
                                            <div className="flex-1 overflow-hidden">
                                                <div className="font-medium truncate" title={attachment.file_name}>
                                                    {attachment.file_name}
                                                </div>
                                                <div className="text-sm text-text-tertiary">
                                                    {(attachment.file_size / 1024).toFixed(1)} KB
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleDownloadAttachment(attachment.id, attachment.file_name)}
                                                className="btn btn-sm btn-outline"
                                                title="Download file"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                                    <polyline points="7 10 12 15 17 10"></polyline>
                                                    <line x1="12" y1="15" x2="12" y2="3"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* History Tab (Admin Only) */}
                    {activeTab === 'history' && currentUser?.role === 'admin' && ticket.history && ticket.history.length > 0 && (
                        <div className="card mb-6">
                            <h2 className="text-xl font-semibold mb-4">Ticket History</h2>
                            <div className="relative pl-5 border-l-2 border-border-color">
                                {ticket.history.map((history, index) => (
                                    <div key={index} className="mb-5 relative">
                                        {/* Timeline dot */}
                                        <div className="absolute -left-[17px] w-7 h-7 bg-bg-dark-tertiary border-4 border-bg-dark rounded-full flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10"></circle>
                                                <polyline points="12 6 12 12 16 14"></polyline>
                                            </svg>
                                        </div>

                                        <div className="ml-4">
                                            <div className="font-medium mb-1">
                                                {history.field_name.replace(/([A-Z])/g, ' $1').trim()}
                                            </div>
                                            <div className="bg-bg-dark-tertiary p-3 rounded-lg">
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div className="p-2 bg-bg-dark rounded-md">
                                                        <div className="text-text-tertiary text-xs mb-1">Previous</div>
                                                        <div className="text-text-secondary">{history.old_value || '(empty)'}</div>
                                                    </div>
                                                    <div className="p-2 bg-bg-dark rounded-md">
                                                        <div className="text-text-tertiary text-xs mb-1">New</div>
                                                        <div className="text-text-primary">{history.new_value || '(empty)'}</div>
                                                    </div>
                                                </div>
                                                <div className="text-text-tertiary text-xs mt-2">
                                                    {formatDate(history.change_time)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Sidebar */}
                <div className="col-span-12 lg:col-span-4">
                    {/* Ticket Info Card */}
                    <div className="card mb-6 sticky top-4">
                        <h3 className="text-lg font-semibold mb-4">Ticket Information</h3>

                        <div className="space-y-4">
                            <div className="flex bg-bg-dark-tertiary p-3 rounded-lg">
                                <div className="w-5 h-10 mr-3" style={{ backgroundColor: getStatusColor(ticket.status) }}></div>
                                <div className="flex-1">
                                    <div className="text-text-tertiary text-xs">Status</div>
                                    <div className="font-medium">{ticket.status}</div>
                                </div>
                            </div>

                            <div className="flex bg-bg-dark-tertiary p-3 rounded-lg">
                                <div className="w-5 h-10 mr-3" style={{ backgroundColor: getPriorityColor(ticket.priority) }}></div>
                                <div className="flex-1">
                                    <div className="text-text-tertiary text-xs">Priority</div>
                                    <div className="font-medium">{ticket.priority}</div>
                                </div>
                            </div>

                            <div className="bg-bg-dark-tertiary p-3 rounded-lg">
                                <div className="text-text-tertiary text-xs mb-1">Category</div>
                                <div className="font-medium">{ticket.category}</div>
                            </div>

                            <div className="bg-bg-dark-tertiary p-3 rounded-lg">
                                <div className="text-text-tertiary text-xs mb-1">Created By</div>
                                <div className="flex items-center">
                                    <div className="w-8 h-8 bg-bg-dark-secondary text-primary rounded-full flex items-center justify-center font-semibold mr-2">
                                        {ticket.created_by_user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <div>
                                        <div className="font-medium">{ticket.created_by_user?.name || `User #${ticket.created_by}`}</div>
                                        <div className="text-xs text-text-tertiary">{ticket.created_by_user?.email}</div>
                                    </div>
                                </div>
                            </div>

                            {ticket.assigned_to && (
                                <div className="bg-bg-dark-tertiary p-3 rounded-lg">
                                    <div className="text-text-tertiary text-xs mb-1">Assigned To</div>
                                    <div className="flex items-center">
                                        <div className="w-8 h-8 bg-bg-dark-secondary text-success rounded-full flex items-center justify-center font-semibold mr-2">
                                            {ticket.assigned_to_user?.name?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <div>
                                            <div className="font-medium">{ticket.assigned_to_user?.name || `User #${ticket.assigned_to}`}</div>
                                            <div className="text-xs text-text-tertiary">{ticket.assigned_to_user?.email}</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-bg-dark-tertiary p-3 rounded-lg">
                                <div className="text-text-tertiary text-xs mb-1">Created</div>
                                <div className="font-medium">{formatDate(ticket.created_at)}</div>
                            </div>

                            <div className="bg-bg-dark-tertiary p-3 rounded-lg">
                                <div className="text-text-tertiary text-xs mb-1">Last Updated</div>
                                <div className="font-medium">{formatDate(ticket.updated_at)}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default TicketDetail;