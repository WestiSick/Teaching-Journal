import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { labService } from '../../services/api';

function SharedLabGrades() {
    const { token } = useParams();
    const [copied, setCopied] = useState(false);

    // Fetch shared lab grades using token
    const { data, isLoading, error } = useQuery({
        queryKey: ['shared-lab-grades', token],
        queryFn: () => labService.getSharedLabGrades(token),
        // We don't need authentication for this endpoint
        // It's accessible via a public token
    });

    // Function to copy the share link to clipboard
    const copyShareLink = () => {
        const shareUrl = `${window.location.origin}/labs/shared/${token}`;
        navigator.clipboard.writeText(shareUrl)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 3000);
            })
            .catch(err => console.error('Could not copy text: ', err));
    };

    // Function to download as PDF (placeholder)
    const downloadAsPdf = () => {
        // This would need an actual PDF generation implementation
        alert('PDF download functionality would be implemented here');
    };

    if (isLoading) {
        return (
            <div className="container mx-auto max-w-6xl p-6">
                <div className="flex justify-center items-center h-64">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    if (error) {
        // Special handling for expired links (410 Gone)
        if (error.response?.status === 410) {
            return (
                <div className="container mx-auto max-w-6xl p-6">
                    <div className="card p-8 text-center">
                        <div className="flex justify-center mb-6">
                            <div className="w-20 h-20 rounded-full bg-danger-lighter text-danger flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                </svg>
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold mb-4">Shared Link Expired</h1>
                        <p className="text-secondary mb-6">This shared lab grades link has expired or been deleted.</p>
                        <p className="text-tertiary mb-6">You can create a new share link from the lab grades page.</p>
                        <div className="flex justify-center gap-4">
                            <Link to="/labs/links" className="btn btn-primary">
                                Manage Share Links
                            </Link>
                            <Link to="/labs" className="btn btn-secondary">
                                Back to Labs
                            </Link>
                        </div>
                    </div>
                </div>
            );
        }

        return (
            <div className="container mx-auto max-w-6xl p-6">
                <div className="alert alert-danger">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <p>The shared lab grades could not be loaded.</p>
                    </div>
                    <p className="mt-2">{error.message}</p>
                </div>
                <div className="flex justify-center mt-6">
                    <Link to="/labs" className="btn btn-secondary">
                        Back to Labs
                    </Link>
                </div>
            </div>
        );
    }

    const sharedData = data?.data?.data;

    if (!sharedData) {
        return (
            <div className="container mx-auto max-w-6xl p-6">
                <div className="card p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <div className="w-20 h-20 rounded-full bg-warning-lighter text-warning flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
                    <p className="text-secondary mb-6">The shared lab grades link is invalid.</p>
                    <div className="flex justify-center">
                        <Link to="/labs" className="btn btn-secondary">
                            Back to Labs
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // Construct the public share URL for copying
    const shareUrl = `${window.location.origin}/labs/shared/${token}`;

    return (
        <div className="container mx-auto max-w-6xl p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Shared Lab Grades</h1>
                    <p className="text-secondary">Viewing shared grades that are available to students</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        className="btn btn-primary flex items-center gap-2"
                        onClick={copyShareLink}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                        {copied ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                        className="btn btn-secondary flex items-center gap-2"
                        onClick={downloadAsPdf}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                        Download PDF
                    </button>
                    <Link
                        to="/labs/links"
                        className="btn btn-outline flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        Back
                    </Link>
                </div>
            </div>

            {/* Share Info Card */}
            <div className="card mb-6">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-8 p-6">
                    <div className="w-14 h-14 rounded-lg bg-primary-lighter text-primary flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                        </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-semibold mb-1">{sharedData.subject} - {sharedData.group_name}</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-secondary">
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="12" cy="7" r="4"></circle>
                                </svg>
                                <span>Shared by: <span className="text-primary">{sharedData.shared_by}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                    <line x1="16" y1="2" x2="16" y2="6"></line>
                                    <line x1="8" y1="2" x2="8" y2="6"></line>
                                    <line x1="3" y1="10" x2="21" y2="10"></line>
                                </svg>
                                <span>Created: {new Date(sharedData.created_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polyline points="12 6 12 12 16 14"></polyline>
                                </svg>
                                <span>Expires: {new Date(sharedData.expires_at).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <span>Views: {sharedData.access_count || 0}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex-shrink-0 flex flex-col items-end gap-2">
                        <div className="text-lg font-medium flex items-center gap-2">
                            <span className="text-secondary">Status:</span>
                            {new Date(sharedData.expires_at) > new Date() ? (
                                <span className="badge bg-success-lighter text-success px-3 py-1">Active</span>
                            ) : (
                                <span className="badge bg-danger-lighter text-danger px-3 py-1">Expired</span>
                            )}
                        </div>
                        <div className="text-sm text-tertiary">
                            {new Date(sharedData.expires_at) > new Date() ? (
                                <span>Expires in {getRemainingDays(sharedData.expires_at)} days</span>
                            ) : (
                                <span>Expired {Math.abs(getRemainingDays(sharedData.expires_at))} days ago</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 border-t border-border-color bg-bg-dark-tertiary rounded-b-lg">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                        <div className="text-sm text-tertiary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                            </svg>
                            <span>Share URL:</span>
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-2">
                            <input
                                type="text"
                                value={shareUrl}
                                readOnly
                                className="form-control text-sm py-2 flex-1"
                                onClick={(e) => e.target.select()}
                            />
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={copyShareLink}
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Grades Table */}
            <div className="card">
                <div className="flex justify-between items-center px-6 py-4 border-b border-border-color">
                    <h2 className="text-xl font-semibold">Lab Grades</h2>
                    <div className="flex items-center gap-2">
                        <span className="text-secondary">Group Average:</span>
                        <span className={`font-semibold ${getAverageClass(sharedData.group_average)}`}>
                            {sharedData.group_average.toFixed(1)}
                        </span>
                    </div>
                </div>

                {sharedData.students?.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                            <tr className="bg-bg-dark-tertiary">
                                <th className="px-4 py-3 text-left">Student</th>
                                {Array.from({ length: sharedData.total_labs }, (_, i) => (
                                    <th key={i} className="px-4 py-3 text-center">Lab {i + 1}</th>
                                ))}
                                <th className="px-4 py-3 text-center">Average</th>
                            </tr>
                            </thead>
                            <tbody>
                            {sharedData.students.map((student) => (
                                <tr key={student.student_id} className="border-b border-border-color">
                                    <td className="px-4 py-3 font-medium">{student.student_fio}</td>
                                    {student.grades.map((grade, index) => (
                                        <td key={index} className="px-4 py-3 text-center">
                                            <div className={`lab-grade ${getGradeClass(grade || 0)}`}>
                                                {grade || '–'}
                                            </div>
                                        </td>
                                    ))}
                                    <td className={`px-4 py-3 text-center font-semibold ${getAverageClass(student.average)}`}>
                                        {student.average ? student.average.toFixed(1) : 'N/A'}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                            <tfoot>
                            <tr className="bg-bg-dark-tertiary">
                                <td className="px-4 py-3 font-semibold">Group Average</td>
                                {Array.from({ length: sharedData.total_labs }, () => (
                                    <td className="px-4 py-3"></td>
                                ))}
                                <td className={`px-4 py-3 text-center font-bold ${getAverageClass(sharedData.group_average)}`}>
                                    {sharedData.group_average.toFixed(1)}
                                </td>
                            </tr>
                            </tfoot>
                        </table>
                    </div>
                ) : (
                    <div className="p-8 text-center text-tertiary">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-50">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <p>No students or grades to display</p>
                    </div>
                )}
            </div>

            <style jsx="true">{`
                .lab-grade {
                    display: inline-flex;
                    align-items: center;
                    justify-content: center;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    font-weight: 600;
                }
                
                .grade-0 {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-tertiary);
                }
                
                .grade-1, .grade-2 {
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                }
                
                .grade-3 {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                }
                
                .grade-4, .grade-5 {
                    background-color: var(--success-lighter);
                    color: var(--success);
                }
            `}</style>
        </div>
    );
}

// Helper functions for styling and calculations
function getGradeClass(grade) {
    if (grade === 0) return 'grade-0';
    if (grade <= 2) return 'grade-1';
    if (grade === 3) return 'grade-3';
    return 'grade-4';
}

function getAverageClass(average) {
    if (!average) return '';
    if (average < 3) return 'text-danger';
    if (average < 4) return 'text-warning';
    return 'text-success';
}

function getRemainingDays(expiresAt) {
    const now = new Date();
    const expiryDate = new Date(expiresAt);
    const diffTime = expiryDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
}

export default SharedLabGrades;