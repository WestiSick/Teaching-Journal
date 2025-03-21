import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authService } from '../../services/api';

function Register() {
    const [formData, setFormData] = useState({
        fio: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [passwordFeedback, setPasswordFeedback] = useState('');

    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Password strength check
        if (name === 'password') {
            checkPasswordStrength(value);
        }
    };

    const checkPasswordStrength = (password) => {
        // Reset
        let strength = 0;
        let feedback = '';

        // Length check
        if (password.length >= 8) {
            strength += 1;
        } else {
            feedback = 'Password should be at least 8 characters';
            setPasswordStrength(strength);
            setPasswordFeedback(feedback);
            return;
        }

        // Contains number
        if (/\d/.test(password)) {
            strength += 1;
        }

        // Contains lowercase
        if (/[a-z]/.test(password)) {
            strength += 1;
        }

        // Contains uppercase
        if (/[A-Z]/.test(password)) {
            strength += 1;
        }

        // Contains special char
        if (/[^A-Za-z0-9]/.test(password)) {
            strength += 1;
        }

        // Feedback based on strength
        if (strength <= 2) {
            feedback = 'Weak password';
        } else if (strength <= 4) {
            feedback = 'Good password';
        } else {
            feedback = 'Strong password';
        }

        setPasswordStrength(strength);
        setPasswordFeedback(feedback);
    };

    const validateForm = () => {
        if (!formData.fio || !formData.email || !formData.password) {
            setError('All fields are required');
            return false;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setError('');
        setLoading(true);

        try {
            await authService.register(formData.fio, formData.email, formData.password);
            navigate('/login', { state: { message: 'Registration successful! You can now login.' } });
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register');
        } finally {
            setLoading(false);
        }
    };

    const togglePasswordVisibility = () => {
        setShowPassword(!showPassword);
    };

    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 2) return 'var(--danger)';
        if (passwordStrength <= 4) return 'var(--warning)';
        return 'var(--success)';
    };

    const getPasswordFeedbackColor = () => {
        if (passwordStrength <= 2) return 'text-danger';
        if (passwordStrength <= 4) return 'text-warning';
        return 'text-success';
    };

    return (
        <div className="auth-container">
            <div className="auth-header">
                <div className="logo-container">
                    <div className="logo-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                    </div>
                    <h1 className="logo-text">Teacher Journal</h1>
                </div>
                <p className="auth-subtitle">Create a new account</p>
            </div>

            {error && (
                <div className="alert alert-danger mb-4">
                    <div className="flex items-center gap-3">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                            <line x1="12" y1="9" x2="12" y2="13"></line>
                            <line x1="12" y1="17" x2="12.01" y2="17"></line>
                        </svg>
                        <p>{error}</p>
                    </div>
                </div>
            )}

            <form onSubmit={handleSubmit} className="auth-form">
                <div className="form-group">
                    <label htmlFor="fio" className="form-label">Full Name</label>
                    <div className="input-with-icon">
                        <input
                            type="text"
                            id="fio"
                            name="fio"
                            value={formData.fio}
                            onChange={handleChange}
                            disabled={loading}
                            className="form-control pl-10"
                            placeholder="John Doe"
                        />
                        <div className="input-icon left">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                <circle cx="12" cy="7" r="4"></circle>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="email" className="form-label">Email Address</label>
                    <div className="input-with-icon">
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            disabled={loading}
                            className="form-control pl-10"
                            placeholder="name@example.com"
                        />
                        <div className="input-icon left">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                                <polyline points="22,6 12,13 2,6"></polyline>
                            </svg>
                        </div>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="password" className="form-label">Password</label>
                    <div className="input-with-icon">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            disabled={loading}
                            className="form-control pl-10 pr-10"
                            placeholder="••••••••"
                        />
                        <div className="input-icon left">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                        <button
                            type="button"
                            className="input-icon right hover:text-primary"
                            onClick={togglePasswordVisibility}
                            tabIndex="-1"
                        >
                            {showPassword ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                </svg>
                            ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                            )}
                        </button>
                    </div>
                    {formData.password && (
                        <div className="mt-2">
                            <div className="password-strength-bar">
                                {[...Array(5)].map((_, i) => (
                                    <div
                                        key={i}
                                        className="password-strength-segment"
                                        style={{
                                            backgroundColor: i < passwordStrength ? getPasswordStrengthColor() : 'var(--bg-dark-tertiary)'
                                        }}
                                    ></div>
                                ))}
                            </div>
                            <div className={`password-feedback text-xs mt-1 ${getPasswordFeedbackColor()}`}>
                                {passwordFeedback}
                            </div>
                        </div>
                    )}
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                    <div className="input-with-icon">
                        <input
                            type={showPassword ? "text" : "password"}
                            id="confirmPassword"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            disabled={loading}
                            className="form-control pl-10"
                            placeholder="••••••••"
                        />
                        <div className="input-icon left">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                        </div>
                    </div>
                    {formData.password && formData.confirmPassword && (
                        <div className="password-match text-xs mt-1">
                            {formData.password === formData.confirmPassword ? (
                                <span className="text-success">Passwords match</span>
                            ) : (
                                <span className="text-danger">Passwords do not match</span>
                            )}
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="btn btn-primary w-full flex justify-center items-center gap-2 mt-6"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Creating account...</span>
                        </>
                    ) : (
                        <>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                <circle cx="8.5" cy="7" r="4"></circle>
                                <line x1="20" y1="8" x2="20" y2="14"></line>
                                <line x1="23" y1="11" x2="17" y2="11"></line>
                            </svg>
                            <span>Create Account</span>
                        </>
                    )}
                </button>

                <div className="mt-6 text-sm text-center text-tertiary">
                    By registering, you agree to our <a href="#" className="text-primary hover:underline">Terms of Service</a> and <a href="#" className="text-primary hover:underline">Privacy Policy</a>.
                </div>
            </form>

            <div className="auth-footer">
                <p>Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
            </div>

            <style jsx="true">{`
                .auth-container {
                    max-width: 400px;
                    width: 100%;
                }
                
                .auth-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .logo-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-bottom: 1rem;
                }
                
                .logo-icon {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 40px;
                    height: 40px;
                    background-color: var(--primary);
                    color: white;
                    border-radius: var(--radius-md);
                    margin-right: 0.75rem;
                }
                
                .logo-text {
                    font-size: 1.5rem;
                    font-weight: 700;
                    color: var(--text-primary);
                }
                
                .auth-subtitle {
                    color: var(--text-secondary);
                }
                
                .auth-form {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    padding: 1.5rem;
                    box-shadow: var(--shadow-md);
                    margin-bottom: 1.5rem;
                    border: 1px solid var(--border-color);
                }
                
                .input-with-icon {
                    position: relative;
                }
                
                .input-icon {
                    position: absolute;
                    top: 0;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    color: var(--text-tertiary);
                }
                
                .input-icon.left {
                    left: 0;
                    padding-left: 0.75rem;
                }
                
                .input-icon.right {
                    right: 0;
                    padding-right: 0.75rem;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }
                
                .auth-footer {
                    text-align: center;
                    color: var(--text-secondary);
                }
                
                .password-strength-bar {
                    display: flex;
                    gap: 4px;
                    height: 4px;
                }
                
                .password-strength-segment {
                    flex: 1;
                    height: 100%;
                    border-radius: 2px;
                    transition: background-color 0.3s ease;
                }
                
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

export default Register;