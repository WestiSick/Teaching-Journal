// frontend/dashboard/src/pages/tickets/TicketsPage.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ticketService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function TicketsPage() {
    const { currentUser } = useAuth();
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('last_activity');
    const isAdmin = currentUser?.role === 'admin';

    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['tickets', filter, sortBy],
        queryFn: () => ticketService.getTickets({ status: filter, sort: sortBy })
    });

    // Only fetch stats if user is admin
    const { data: statsData, isLoading: statsLoading } = useQuery({
        queryKey: ['ticket-stats'],
        queryFn: ticketService.getTicketStats,
        retry: 1,         // Only retry once
        retryDelay: 1000, // Wait 1 second before retrying
        onError: (error) => {
            console.error('Failed to load ticket stats:', error);
        },
        // Skip this query for non-admin users
        enabled: isAdmin
    });

    // Debug the stats data (for admin only)
    useEffect(() => {
        if (statsData && isAdmin) {
            console.log('Stats data received:', statsData);
        }
    }, [statsData, isAdmin]);

    const tickets = data?.data?.data || [];

    // Extract stats safely with fallbacks (for admin only)
    const stats = isAdmin ? (statsData?.data?.data || {}) : {};
    if (isAdmin) {
        console.log('Stats object for display:', stats);
    }

    const totalTickets = stats.total || 0;
    const newTickets = stats.new || 0;
    const inProgressTickets = stats.in_progress || 0;
    const resolvedTickets = stats.resolved || 0;
    const closedTickets = stats.closed || 0;

    const handleFilterChange = (newFilter) => {
        setFilter(newFilter);
    };

    const handleSortChange = (event) => {
        setSortBy(event.target.value);
    };

    // Function to get appropriate badge class for ticket status
    const getStatusBadge = (status) => {
        switch(status.toLowerCase()) {
            case 'new':
                return 'badge-info';
            case 'open':
                return 'badge-warning';
            case 'inprogress':
                return 'badge-warning';
            case 'resolved':
                return 'badge-success';
            case 'closed':
                return 'badge-secondary';
            default:
                return 'badge-info';
        }
    };

    // Function to get appropriate badge class for ticket priority
    const getPriorityBadge = (priority) => {
        switch(priority.toLowerCase()) {
            case 'low':
                return 'badge-success';
            case 'medium':
                return 'badge-warning';
            case 'high':
                return 'badge-danger';
            case 'critical':
                return 'badge-danger';
            default:
                return 'badge-warning';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleString();
    };

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Support Tickets</h1>
                    <p className="text-secondary">View and manage all support tickets</p>
                </div>
                <Link to="/tickets/new" className="btn btn-primary">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Ticket
                </Link>
            </div>

            {/* Stats Overview - Admin Only */}
            {isAdmin && (
                !statsLoading ? (
                    <div className="grid grid-cols-5 gap-4 mb-6">
                        <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                            <div className="stats-card-title">Total Tickets</div>
                            <div className="stats-card-value">{totalTickets}</div>
                        </div>
                        <div className="stats-card" style={{ borderLeftColor: 'var(--primary)' }}>
                            <div className="stats-card-title">New</div>
                            <div className="stats-card-value">{newTickets}</div>
                        </div>
                        <div className="stats-card" style={{ borderLeftColor: 'var(--warning)' }}>
                            <div className="stats-card-title">In Progress</div>
                            <div className="stats-card-value">{inProgressTickets}</div>
                        </div>
                        <div className="stats-card" style={{ borderLeftColor: 'var(--success)' }}>
                            <div className="stats-card-title">Resolved</div>
                            <div className="stats-card-value">{resolvedTickets}</div>
                        </div>
                        <div className="stats-card" style={{ borderLeftColor: 'var(--neutral-500)' }}>
                            <div className="stats-card-title">Closed</div>
                            <div className="stats-card-value">{closedTickets}</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center items-center p-4 mb-6">
                        <div className="spinner"></div>
                    </div>
                )
            )}

            <div className="card">
                <div className="mb-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    {/* Filter Buttons */}
                    <div className="flex gap-2 flex-wrap">
                        <button
                            className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleFilterChange('all')}
                        >
                            All
                        </button>
                        <button
                            className={`btn ${filter === 'new' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleFilterChange('new')}
                        >
                            New
                        </button>
                        <button
                            className={`btn ${filter === 'inprogress' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleFilterChange('inprogress')}
                        >
                            In Progress
                        </button>
                        <button
                            className={`btn ${filter === 'resolved' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleFilterChange('resolved')}
                        >
                            Resolved
                        </button>
                        <button
                            className={`btn ${filter === 'closed' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => handleFilterChange('closed')}
                        >
                            Closed
                        </button>
                        {isAdmin && (
                            <button
                                className={`btn ${filter === 'assigned' ? 'btn-primary' : 'btn-outline'}`}
                                onClick={() => handleFilterChange('assigned')}
                            >
                                Assigned to Me
                            </button>
                        )}
                    </div>

                    {/* Sort Dropdown */}
                    <div className="form-group mb-0">
                        <select
                            className="form-control"
                            value={sortBy}
                            onChange={handleSortChange}
                        >
                            <option value="last_activity">Latest Activity</option>
                            <option value="created_desc">Newest</option>
                            <option value="created_asc">Oldest</option>
                            <option value="priority_desc">Highest Priority</option>
                            <option value="priority_asc">Lowest Priority</option>
                            <option value="status_asc">Status (A-Z)</option>
                            <option value="status_desc">Status (Z-A)</option>
                        </select>
                    </div>
                </div>

                {isLoading ? (
                    <div className="flex justify-center items-center p-8">
                        <div className="spinner"></div>
                    </div>
                ) : error ? (
                    <div className="alert alert-danger">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span>Error loading tickets: {error.message}</span>
                    </div>
                ) : tickets.length === 0 ? (
                    <div className="text-center p-8">
                        <div className="mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto text-text-tertiary">
                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <line x1="10" y1="9" x2="8" y2="9"></line>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No tickets found</h3>
                        <p className="mb-4">There are no tickets matching your current filters.</p>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => handleFilterChange('all')} className="btn btn-outline">View All Tickets</button>
                            <Link to="/tickets/new" className="btn btn-primary">Create a Ticket</Link>
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr>
                                <th>ID</th>
                                <th>Title</th>
                                <th>Status</th>
                                <th>Priority</th>
                                <th>Category</th>
                                <th>Created By</th>
                                <th>Created</th>
                                <th>Last Activity</th>
                                <th className="text-right">Actions</th>
                            </tr>
                            </thead>
                            <tbody>
                            {tickets.map(ticket => (
                                <tr key={ticket.id}>
                                    <td>#{ticket.id}</td>
                                    <td>
                                        <Link to={`/tickets/${ticket.id}`} className="text-primary hover:text-primary-light">
                                            {ticket.title}
                                        </Link>
                                    </td>
                                    <td>
                                            <span className={`badge ${getStatusBadge(ticket.status)}`}>
                                                {ticket.status}
                                            </span>
                                    </td>
                                    <td>
                                            <span className={`badge ${getPriorityBadge(ticket.priority)}`}>
                                                {ticket.priority}
                                            </span>
                                    </td>
                                    <td>{ticket.category}</td>
                                    <td>{ticket.created_by_user?.name || `User #${ticket.created_by}`}</td>
                                    <td>{formatDate(ticket.created_at)}</td>
                                    <td>{formatDate(ticket.last_activity)}</td>
                                    <td className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Link to={`/tickets/${ticket.id}`} className="btn btn-sm btn-outline">
                                                View
                                            </Link>
                                            {(isAdmin || currentUser?.id === ticket.created_by) && (
                                                <Link to={`/tickets/${ticket.id}/edit`} className="btn btn-sm btn-primary">
                                                    Edit
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TicketsPage;