import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { labService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function LabsPage() {
    const { isFree } = useAuth();
    const navigate = useNavigate();

    // Fetch all labs
    const { data, isLoading, error } = useQuery({
        queryKey: ['labs'],
        queryFn: labService.getLabs,
        enabled: !isFree // Only fetch if user has subscription
    });

    const subjects = data?.data?.data || [];

    const navigateToLabGrades = (subject, group) => {
        navigate(`/labs/${encodeURIComponent(subject)}/${encodeURIComponent(group)}`);
    };

    if (isFree) {
        return (
            <div>
                <div className="page-header">
                    <div>
                        <h1 className="page-title">Labs</h1>
                        <p className="text-secondary">Manage and grade laboratory work</p>
                    </div>
                </div>
                <div className="premium-feature-card card p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 rounded-full bg-primary-lighter text-primary flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Premium Feature</h3>
                        <p className="text-secondary mb-4">Lab grading is a premium feature available with a paid subscription.</p>
                        <p className="text-secondary mb-6">Track student lab progress, share grade reports, and analyze performance metrics.</p>
                        <button className="btn btn-primary px-6">Upgrade Now</button>
                    </div>
                </div>
            </div>
        );
    }

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
                    <p>Error loading labs: {error.message}</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Labs</h1>
                    <p className="text-secondary">Manage and grade laboratory work</p>
                </div>
                <div>
                    <Link to="/labs/shared" className="btn btn-secondary flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
                            <polyline points="16 6 12 2 8 6"></polyline>
                            <line x1="12" y1="2" x2="12" y2="15"></line>
                        </svg>
                        <span className="hidden sm:inline">Shared Links</span>
                    </Link>
                </div>
            </div>

            {subjects.length === 0 ? (
                <div className="card p-8">
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                <path d="M10 2v7.31"></path>
                                <path d="M14 9.3V1.99"></path>
                                <path d="M8.5 2h7"></path>
                                <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                <path d="M5.17 14.83l4.24-4.24"></path>
                                <path d="M14.83 14.83l-4.24-4.24"></path>
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">No labs found</h3>
                        <p className="text-secondary mb-6">You haven't set up any lab grades yet. Create lessons with laboratory work type and then set up lab grades for your groups.</p>
                        <Link to="/lessons/new" className="btn btn-primary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            Create Lab Lesson
                        </Link>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-6">
                    {subjects.map((subject, index) => (
                        <div key={index} className="card overflow-hidden">
                            <div className="p-6 border-b border-border-color mb-0">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{backgroundColor: getSubjectColor(index)}}>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                                            <path d="M10 2v7.31"></path>
                                            <path d="M14 9.3V1.99"></path>
                                            <path d="M8.5 2h7"></path>
                                            <path d="M14 9.3a6.5 6.5 0 1 1-4 0"></path>
                                        </svg>
                                    </div>
                                    <h2 className="text-xl font-semibold">{subject.subject}</h2>
                                </div>
                            </div>

                            {subject.groups.length > 0 ? (
                                <div className="overflow-x-auto">
                                    <table className="table w-full">
                                        <thead>
                                        <tr>
                                            <th>Group</th>
                                            <th>Students</th>
                                            <th>Total Labs</th>
                                            <th>Average Grade</th>
                                            <th className="text-right">Actions</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {subject.groups.map((group, groupIndex) => (
                                            <tr key={groupIndex} className="hover:bg-bg-dark-tertiary transition-colors">
                                                <td className="font-medium">{group.name}</td>
                                                <td>{group.student_count || '-'}</td>
                                                <td>{group.total_labs || '-'}</td>
                                                <td>
                                                    {group.group_average ? (
                                                        <div className="flex items-center gap-2">
                                                            <span className={getAverageClass(group.group_average)}>
                                                                {group.group_average.toFixed(1)}
                                                            </span>
                                                            <div className="w-20 h-2 bg-bg-dark-tertiary rounded-full">
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${(group.group_average / 5) * 100}%`,
                                                                        backgroundColor: getAverageColor(group.group_average)
                                                                    }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-tertiary">N/A</span>
                                                    )}
                                                </td>
                                                <td className="text-right">
                                                    <button
                                                        onClick={() => navigateToLabGrades(subject.subject, group.name)}
                                                        className="btn btn-primary btn-sm"
                                                    >
                                                        Manage Lab Grades
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="p-6 pt-0">
                                    <p className="text-secondary">No groups with lab work for this subject</p>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <style jsx="true">{`
                .premium-feature-card {
                    background: linear-gradient(to bottom right, var(--bg-dark-secondary), var(--bg-dark-tertiary));
                    border-left: 4px solid var(--primary);
                }
            `}</style>
        </div>
    );
}

// Helper function to get color for subject
function getSubjectColor(index) {
    const colors = [
        'var(--primary)',
        'var(--accent)',
        'var(--success)',
        'var(--warning)',
        '#9333ea', // purple
        '#ec4899', // pink
        '#14b8a6', // teal
    ];

    return colors[index % colors.length];
}

// Helper function to get color class for average grade
function getAverageClass(average) {
    if (average >= 4) return 'text-success font-medium';
    if (average >= 3) return 'text-warning font-medium';
    return 'text-danger font-medium';
}

// Helper function to get color for average grade
function getAverageColor(average) {
    if (average >= 4) return 'var(--success)';
    if (average >= 3) return 'var(--warning)';
    return 'var(--danger)';
}

export default LabsPage;