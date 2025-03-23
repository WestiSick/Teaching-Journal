import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { testingService } from '../../../services/api';
import { StudentAuthProvider, useStudentAuth } from '../../../context/StudentAuthContext';

function StudentTestRegisterContent() {
    const { isAuthenticated, login } = useStudentAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        fio: '',
        group_name: '',
        email: '',
        password: ''
    });

    const [formError, setFormError] = useState('');

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: (data) => testingService.registerStudent(data),
        onSuccess: (response) => {
            console.log('Registration successful, setting up student session:', response.data.data);
            const { token, student_id, fio, group_name } = response.data.data;

            // Store the token in localStorage
            localStorage.setItem('studentToken', token);

            // Update auth context
            login(token, { id: student_id, fio, group: group_name });

            // Navigate to tests page
            navigate('/student-testing/tests');
        },
        onError: (error) => {
            console.error('Registration error:', error.response?.data || error.message);
            setFormError(error.response?.data?.error || 'Registration failed. Please try again.');
        }
    });

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Handle form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        setFormError('');
        console.log('Submitting registration form:', formData);
        registerMutation.mutate(formData);
    };

    // Redirect if already authenticated
    if (isAuthenticated) {
        console.log('Already authenticated, redirecting to tests page');
        return <Navigate to="/student-testing/tests" replace />;
    }

    return (
        <div className="student-portal">
            <div className="portal-container">
                <div className="portal-header">
                    <div className="portal-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                        <h1>Student Testing Portal</h1>
                    </div>
                </div>

                <div className="portal-card">
                    <div className="portal-card-content">
                        <h2>Student Registration</h2>
                        <p>
                            Please fill out the form below to create your student account.
                        </p>

                        {formError && (
                            <div className="alert alert-danger">
                                {formError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label className="form-label" htmlFor="fio">Full Name</label>
                                <input
                                    id="fio"
                                    name="fio"
                                    type="text"
                                    className="form-control"
                                    value={formData.fio}
                                    onChange={handleInputChange}
                                    placeholder="Enter your full name"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="group_name">Group Name</label>
                                <input
                                    id="group_name"
                                    name="group_name"
                                    type="text"
                                    className="form-control"
                                    value={formData.group_name}
                                    onChange={handleInputChange}
                                    placeholder="Enter your group name (e.g. Group-101)"
                                    required
                                />
                                <small className="text-tertiary">
                                    This must match exactly the group name assigned by your teacher
                                </small>
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="email">Email</label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    className="form-control"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    placeholder="Enter your email"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label" htmlFor="password">Password</label>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    className="form-control"
                                    value={formData.password}
                                    onChange={handleInputChange}
                                    placeholder="Create a password"
                                    required
                                    minLength="6"
                                />
                                <small className="text-tertiary">
                                    Password must be at least 6 characters long
                                </small>
                            </div>

                            <div className="form-group">
                                <button
                                    type="submit"
                                    className="btn btn-primary w-full"
                                    disabled={registerMutation.isPending}
                                >
                                    {registerMutation.isPending ? 'Registering...' : 'Register'}
                                </button>
                            </div>
                        </form>

                        <div className="text-center mt-4">
                            <p className="text-tertiary">
                                Already have an account?{' '}
                                <Link to="/student-testing/login" className="text-primary-color">
                                    Login here
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>

                <div className="portal-footer">
                    <Link to="/student-testing" className="portal-footer-link">
                        Back to Testing Portal
                    </Link>
                </div>
            </div>

            <style jsx="true">{`
                .student-portal {
                    min-height: 100vh;
                    background-color: var(--bg-dark);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem 1rem;
                }
                
                .portal-container {
                    width: 100%;
                    max-width: 500px;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }
                
                .portal-header {
                    text-align: center;
                }
                
                .portal-logo {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 1rem;
                    color: var(--primary);
                }
                
                .portal-logo h1 {
                    margin: 0;
                    font-size: 1.5rem;
                }
                
                .portal-card {
                    background-color: var(--bg-dark-secondary);
                    border-radius: var(--radius-lg);
                    box-shadow: var(--shadow-md);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }
                
                .portal-card-content {
                    padding: 2rem;
                }
                
                .portal-card h2 {
                    color: var(--text-primary);
                    margin-top: 0;
                    margin-bottom: 1rem;
                }
                
                .portal-card p {
                    color: var(--text-secondary);
                    margin-bottom: 1.5rem;
                }
                
                .form-group {
                    margin-bottom: 1.5rem;
                }
                
                .w-full {
                    width: 100%;
                }
                
                .mt-4 {
                    margin-top: 1.5rem;
                }
                
                .text-center {
                    text-align: center;
                }
                
                .portal-footer {
                    text-align: center;
                    margin-top: 1rem;
                }
                
                .portal-footer-link {
                    color: var(--text-tertiary);
                    text-decoration: none;
                    font-size: 0.875rem;
                }
                
                .portal-footer-link:hover {
                    color: var(--primary);
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
}

// Wrapper component with provider
function StudentTestRegister() {
    return (
        <StudentAuthProvider>
            <StudentTestRegisterContent />
        </StudentAuthProvider>
    );
}

export default StudentTestRegister;