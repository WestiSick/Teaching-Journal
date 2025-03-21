import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { adminService } from '../../services/api';

function SystemLogs() {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(20);
    const [filters, setFilters] = useState({
        user_id: '',
        action: '',
        from_date: '',
        to_date: ''
    });

    // Fetch logs with pagination and filters
    const { data, isLoading, error } = useQuery({
        queryKey: ['admin-logs', page, limit, filters],
        queryFn: () => adminService.getLogs({ page, limit, ...filters })
    });

    const logs = data?.data?.data?.logs || [];
    const pagination = data?.data?.data?.pagination || {};

    const handleFilterChange = (e) => {
        const { name, value } = e.target;
        setFilters(prev => ({ ...prev, [name]: value }));
        setPage(1); // Reset to first page when filter changes
    };

    const handleClearFilters = () => {
        setFilters({
            user_id: '',
            action: '',
            from_date: '',
            to_date: ''
        });
        setPage(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.total_pages) {
            setPage(newPage);
        }
    };

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error loading logs: {error.message}</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">System Logs</h1>
                <Link to="/admin" className="btn btn-secondary">Back to Admin Dashboard</Link>
            </div>

            <div className="card mb-4">
                <h3 className="mb-3">Filters</h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="form-group">
                        <label htmlFor="user_id">User ID</label>
                        <input
                            type="text"
                            id="user_id"
                            name="user_id"
                            className="form-control"
                            value={filters.user_id}
                            onChange={handleFilterChange}
                            placeholder="Filter by user ID"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="action">Action</label>
                        <input
                            type="text"
                            id="action"
                            name="action"
                            className="form-control"
                            value={filters.action}
                            onChange={handleFilterChange}
                            placeholder="Filter by action"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="from_date">From Date</label>
                        <input
                            type="date"
                            id="from_date"
                            name="from_date"
                            className="form-control"
                            value={filters.from_date}
                            onChange={handleFilterChange}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="to_date">To Date</label>
                        <input
                            type="date"
                            id="to_date"
                            name="to_date"
                            className="form-control"
                            value={filters.to_date}
                            onChange={handleFilterChange}
                        />
                    </div>
                </div>
                <div className="d-flex justify-content-end mt-3">
                    <button
                        className="btn btn-secondary"
                        onClick={handleClearFilters}
                    >
                        Clear Filters
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="text-xl font-semibold">Log Entries</h2>
                    <div className="d-flex align-items-center">
                        <span className="mr-2">Show:</span>
                        <select
                            value={limit}
                            onChange={(e) => {
                                setLimit(Number(e.target.value));
                                setPage(1);
                            }}
                            className="form-control"
                            style={{ width: '80px' }}
                        >
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                </div>

                <div className="table-container">
                    <table className="table">
                        <thead>
                        <tr>
                            <th>ID</th>
                            <th>Timestamp</th>
                            <th>User ID</th>
                            <th>User</th>
                            <th>Action</th>
                            <th>Details</th>
                        </tr>
                        </thead>
                        <tbody>
                        {logs.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="text-center">No logs found</td>
                            </tr>
                        ) : (
                            logs.map(log => (
                                <tr key={log.id}>
                                    <td>{log.id}</td>
                                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                                    <td>{log.user_id}</td>
                                    <td>{log.user_fio}</td>
                                    <td>{log.action}</td>
                                    <td>{log.details}</td>
                                </tr>
                            ))
                        )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {pagination.total_pages > 1 && (
                    <div className="pagination mt-4">
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handlePageChange(1)}
                            disabled={page === 1}
                        >
                            &laquo;
                        </button>
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handlePageChange(page - 1)}
                            disabled={!pagination.has_prev}
                        >
                            &lt;
                        </button>

                        <div className="pagination-info">
                            Page {pagination.current_page} of {pagination.total_pages}
                        </div>

                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handlePageChange(page + 1)}
                            disabled={!pagination.has_next}
                        >
                            &gt;
                        </button>
                        <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handlePageChange(pagination.total_pages)}
                            disabled={page === pagination.total_pages}
                        >
                            &raquo;
                        </button>
                    </div>
                )}
            </div>

            <style jsx="true">{`
                .pagination {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 0.5rem;
                }
                
                .pagination-info {
                    padding: 0 1rem;
                    color: var(--text-tertiary);
                    font-size: 0.875rem;
                }
            `}</style>
        </div>
    );
}

export default SystemLogs;