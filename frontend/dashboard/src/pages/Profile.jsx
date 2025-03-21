import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Profile() {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    // Tab state
    const [activeTab, setActiveTab] = useState('general');

    // Form states
    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        currentPassword: false,
        newPassword: false,
        confirmPassword: false
    });
    const [passwordStrength, setPasswordStrength] = useState(0);
    const [passwordMatch, setPasswordMatch] = useState(false);

    // Status states
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Fetch user details
    const { data, isLoading } = useQuery({
        queryKey: ['user-profile'],
        queryFn: userService.getCurrentUser
    });

    // Update user mutation
    const updateMutation = useMutation({
        mutationFn: (data) => userService.updateUser(data),
        onSuccess: () => {
            setSuccess('Profile updated successfully');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setPasswordStrength(0);
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });

            // Clear success message after 3 seconds
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Failed to update profile');

            // Clear error message after 5 seconds
            setTimeout(() => {
                setError('');
            }, 5000);
        }
    });

    // Password form change handler
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));

        // Check password strength if new password field is being updated
        if (name === 'newPassword') {
            checkPasswordStrength(value);
        }

        // Check if passwords match
        if (name === 'newPassword' || name === 'confirmPassword') {
            setPasswordMatch(
                passwordForm.confirmPassword &&
                value === (name === 'newPassword' ? passwordForm.confirmPassword : passwordForm.newPassword)
            );
        }
    };

    // Check password strength
    const checkPasswordStrength = (password) => {
        // Reset strength
        let strength = 0;

        // Return 0 for empty passwords
        if (!password) {
            setPasswordStrength(0);
            return;
        }

        // Length check
        if (password.length >= 8) strength += 1;

        // Contains number
        if (/\d/.test(password)) strength += 1;

        // Contains lowercase
        if (/[a-z]/.test(password)) strength += 1;

        // Contains uppercase
        if (/[A-Z]/.test(password)) strength += 1;

        // Contains special char
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        setPasswordStrength(strength);
    };

    // Toggle password visibility
    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // Password strength color
    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 2) return 'var(--danger)';
        if (passwordStrength <= 4) return 'var(--warning)';
        return 'var(--success)';
    };

    // Validate password form
    const validatePasswordForm = () => {
        setError('');
        setSuccess('');

        // Validate password change
        if (!passwordForm.currentPassword) {
            setError('Current password is required');
            return false;
        }

        if (!passwordForm.newPassword) {
            setError('New password is required');
            return false;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('New passwords do not match');
            return false;
        }

        if (passwordStrength < 3) {
            setError('Password is too weak. Include uppercase, lowercase, numbers, and special characters.');
            return false;
        }

        return true;
    };

    // Handle password update
    const handlePasswordUpdate = (e) => {
        e.preventDefault();

        if (!validatePasswordForm()) return;

        // Prepare data for submission
        const updateData = {
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
        };

        updateMutation.mutate(updateData);
    };

    // For demonstration purposes, generate a random avatar color based on user email
    const getAvatarColor = (email) => {
        if (!email) return '#4f46e5'; // Default to primary color

        // Simple hash function to generate consistent color for the same email
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Convert hash to an HSL color with high saturation and appropriate lightness for dark theme
        const h = hash % 360;
        return `hsl(${h}, 70%, 50%)`;
    };

    // Get user's name initials from their email
    const getInitials = (email) => {
        if (!email) return '?';
        return email.charAt(0).toUpperCase();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    // Get user's full name from API response
    const userData = data?.data?.data || {};
    const displayFio = userData.fio || 'User';
    const userEmail = currentUser?.email || userData?.email || 'No email';

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Profile Settings</h1>
                    <p className="text-secondary">Manage your account settings</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Profile sidebar */}
                <div className="lg:col-span-1">
                    <div className="card p-6 mb-6">
                        <div className="flex flex-col items-center text-center">
                            <div
                                className="w-28 h-28 rounded-full flex items-center justify-center text-4xl font-bold mb-4"
                                style={{ backgroundColor: getAvatarColor(userEmail), color: 'white' }}
                            >
                                {getInitials(userEmail)}
                            </div>
                            <h2 className="text-xl font-semibold">{displayFio}</h2>
                            <p className="text-secondary mb-4">{userEmail}</p>
                            <div className="badge bg-primary-lighter text-primary px-3 py-1 rounded-full">
                                {currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'free' ? 'Free User' : 'Premium User'}
                            </div>
                        </div>
                    </div>

                    {/* Navigation tabs */}
                    <div className="card overflow-hidden p-0">
                        <ul className="profile-menu">
                            <li className={`profile-menu-item ${activeTab === 'general' ? 'active' : ''}`}>
                                <button onClick={() => setActiveTab('general')} className="profile-menu-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <span>General Information</span>
                                </button>
                            </li>
                            <li className={`profile-menu-item ${activeTab === 'security' ? 'active' : ''}`}>
                                <button onClick={() => setActiveTab('security')} className="profile-menu-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <span>Password & Security</span>
                                </button>
                            </li>
                            <li className={`profile-menu-item ${activeTab === 'preferences' ? 'active' : ''}`}>
                                <button onClick={() => setActiveTab('preferences')} className="profile-menu-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    <span>Preferences</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Content area */}
                <div className="lg:col-span-2">
                    {/* Status messages */}
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

                    {/* General Information Tab */}
                    {activeTab === 'general' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">General Information</h2>
                            <div className="space-y-4">
                                <div className="form-group">
                                    <label htmlFor="email" className="form-label">Email Address</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={userEmail}
                                        disabled
                                        className="form-control bg-bg-dark-tertiary"
                                    />
                                    <small className="text-tertiary mt-1 block">Email cannot be changed</small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fio" className="form-label">Full Name</label>
                                    <input
                                        type="text"
                                        id="fio"
                                        value={displayFio}
                                        disabled
                                        className="form-control bg-bg-dark-tertiary"
                                    />
                                    <small className="text-tertiary mt-1 block">Full Name can only be changed by an administrator</small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="role" className="form-label">Account Type</label>
                                    <input
                                        type="text"
                                        id="role"
                                        value={currentUser?.role === 'admin' ? 'Administrator' : currentUser?.role === 'free' ? 'Free Account' : 'Premium Account'}
                                        disabled
                                        className="form-control bg-bg-dark-tertiary"
                                    />
                                    <small className="text-tertiary mt-1 block">
                                        {currentUser?.role === 'free'
                                            ? 'Upgrade to Premium for access to all features'
                                            : currentUser?.role === 'admin'
                                                ? 'Administrator accounts have full system access'
                                                : 'Premium accounts have access to all features'}
                                    </small>
                                </div>

                                {currentUser?.role === 'free' && (
                                    <div className="upgrade-box mt-6 p-4 rounded-lg border border-primary-light bg-primary-lighter bg-opacity-20">
                                        <h3 className="text-lg font-medium text-primary mb-2">Upgrade to Premium</h3>
                                        <p className="text-secondary mb-3">
                                            Get access to additional features like attendance reports,
                                            lab grading, and advanced analytics.
                                        </p>
                                        <button className="btn btn-primary">
                                            Upgrade Account
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Password & Security Tab */}
                    {activeTab === 'security' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">Change Password</h2>
                            <form onSubmit={handlePasswordUpdate} className="space-y-5">
                                <div className="form-group">
                                    <label htmlFor="currentPassword" className="form-label">Current Password</label>
                                    <div className="input-with-icon">
                                        <input
                                            type={showPasswords.currentPassword ? "text" : "password"}
                                            id="currentPassword"
                                            name="currentPassword"
                                            value={passwordForm.currentPassword}
                                            onChange={handlePasswordChange}
                                            className="form-control pr-10"
                                            placeholder="Enter your current password"
                                        />
                                        <button
                                            type="button"
                                            className="input-icon right hover:text-primary"
                                            onClick={() => togglePasswordVisibility('currentPassword')}
                                            tabIndex="-1"
                                        >
                                            {showPasswords.currentPassword ? (
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
                                </div>

                                <div className="form-group">
                                    <label htmlFor="newPassword" className="form-label">New Password</label>
                                    <div className="input-with-icon">
                                        <input
                                            type={showPasswords.newPassword ? "text" : "password"}
                                            id="newPassword"
                                            name="newPassword"
                                            value={passwordForm.newPassword}
                                            onChange={handlePasswordChange}
                                            className="form-control pr-10"
                                            placeholder="Enter new password"
                                        />
                                        <button
                                            type="button"
                                            className="input-icon right hover:text-primary"
                                            onClick={() => togglePasswordVisibility('newPassword')}
                                            tabIndex="-1"
                                        >
                                            {showPasswords.newPassword ? (
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
                                    {passwordForm.newPassword && (
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
                                            <div className="password-feedback text-xs mt-1">
                                                {passwordStrength === 0 && <span className="text-danger">Enter a password</span>}
                                                {passwordStrength === 1 && <span className="text-danger">Very weak</span>}
                                                {passwordStrength === 2 && <span className="text-danger">Weak</span>}
                                                {passwordStrength === 3 && <span className="text-warning">Moderate</span>}
                                                {passwordStrength === 4 && <span className="text-success">Strong</span>}
                                                {passwordStrength === 5 && <span className="text-success">Very strong</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                                    <div className="input-with-icon">
                                        <input
                                            type={showPasswords.confirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={passwordForm.confirmPassword}
                                            onChange={handlePasswordChange}
                                            className="form-control pr-10"
                                            placeholder="Confirm new password"
                                        />
                                        <button
                                            type="button"
                                            className="input-icon right hover:text-primary"
                                            onClick={() => togglePasswordVisibility('confirmPassword')}
                                            tabIndex="-1"
                                        >
                                            {showPasswords.confirmPassword ? (
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
                                    {passwordForm.confirmPassword && (
                                        <div className="text-xs mt-1">
                                            {passwordForm.confirmPassword === passwordForm.newPassword ? (
                                                <span className="text-success">Passwords match</span>
                                            ) : (
                                                <span className="text-danger">Passwords don't match</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="password-requirements mt-4 p-4 bg-bg-dark-tertiary rounded-lg">
                                    <h4 className="text-sm font-medium mb-2">Password Requirements</h4>
                                    <ul className="text-xs space-y-1 text-secondary">
                                        <li className={`flex items-center gap-1 ${passwordForm.newPassword && passwordForm.newPassword.length >= 8 ? 'text-success' : ''}`}>
                                            {passwordForm.newPassword && passwordForm.newPassword.length >= 8 ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                </svg>
                                            )}
                                            At least 8 characters
                                        </li>
                                        <li className={`flex items-center gap-1 ${passwordForm.newPassword && /[A-Z]/.test(passwordForm.newPassword) ? 'text-success' : ''}`}>
                                            {passwordForm.newPassword && /[A-Z]/.test(passwordForm.newPassword) ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                </svg>
                                            )}
                                            At least one uppercase letter
                                        </li>
                                        <li className={`flex items-center gap-1 ${passwordForm.newPassword && /[a-z]/.test(passwordForm.newPassword) ? 'text-success' : ''}`}>
                                            {passwordForm.newPassword && /[a-z]/.test(passwordForm.newPassword) ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                </svg>
                                            )}
                                            At least one lowercase letter
                                        </li>
                                        <li className={`flex items-center gap-1 ${passwordForm.newPassword && /\d/.test(passwordForm.newPassword) ? 'text-success' : ''}`}>
                                            {passwordForm.newPassword && /\d/.test(passwordForm.newPassword) ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                </svg>
                                            )}
                                            At least one number
                                        </li>
                                        <li className={`flex items-center gap-1 ${passwordForm.newPassword && /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? 'text-success' : ''}`}>
                                            {passwordForm.newPassword && /[^A-Za-z0-9]/.test(passwordForm.newPassword) ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                </svg>
                                            )}
                                            At least one special character
                                        </li>
                                    </ul>
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="btn btn-primary flex items-center gap-2"
                                        disabled={updateMutation.isPending}
                                    >
                                        {updateMutation.isPending ? (
                                            <>
                                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                <span>Updating...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                </svg>
                                                <span>Change Password</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Preferences Tab */}
                    {activeTab === 'preferences' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">Preferences</h2>
                            <div className="space-y-4">
                                <div className="notification-settings">
                                    <h3 className="text-lg font-medium mb-3">Notifications</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium">Email Notifications</h4>
                                                <p className="text-sm text-secondary">Receive email notifications for important events</p>
                                            </div>
                                            <label className="switch">
                                                <input type="checkbox" checked />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium">System Notifications</h4>
                                                <p className="text-sm text-secondary">Receive in-app notifications</p>
                                            </div>
                                            <label className="switch">
                                                <input type="checkbox" checked />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="appearance-settings mt-6">
                                    <h3 className="text-lg font-medium mb-3">Appearance</h3>
                                    <div className="form-group">
                                        <label htmlFor="theme" className="form-label">Theme</label>
                                        <select id="theme" className="form-control">
                                            <option value="dark">Dark Theme</option>
                                            <option value="light" disabled>Light Theme (Coming Soon)</option>
                                            <option value="system" disabled>System Default (Coming Soon)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="appearance-settings mt-6">
                                    <h3 className="text-lg font-medium mb-3">Language</h3>
                                    <div className="form-group">
                                        <label htmlFor="language" className="form-label">Interface Language</label>
                                        <select id="language" className="form-control">
                                            <option value="en">English</option>
                                            <option value="ru">Russian</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button className="btn btn-primary">
                                        Save Preferences
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style jsx="true">{`
                .profile-menu {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .profile-menu-item {
                    border-bottom: 1px solid var(--border-color);
                }
                
                .profile-menu-item:last-child {
                    border-bottom: none;
                }
                
                .profile-menu-button {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    width: 100%;
                    padding: 1rem 1.25rem;
                    text-align: left;
                    color: var(--text-secondary);
                    transition: all var(--transition-fast) ease;
                    background: transparent;
                    border: none;
                    cursor: pointer;
                }
                
                .profile-menu-button:hover {
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-primary);
                }
                
                .profile-menu-item.active .profile-menu-button {
                    background-color: var(--primary-lighter);
                    color: var(--primary);
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
                
                .input-icon.right {
                    right: 0;
                    padding-right: 0.75rem;
                    background: transparent;
                    border: none;
                    cursor: pointer;
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
                
                /* Toggle Switch */
                .switch {
                    position: relative;
                    display: inline-block;
                    width: 48px;
                    height: 24px;
                }
                
                .switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }
                
                .slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: var(--bg-dark-tertiary);
                    transition: .4s;
                }
                
                .slider:before {
                    position: absolute;
                    content: "";
                    height: 18px;
                    width: 18px;
                    left: 3px;
                    bottom: 3px;
                    background-color: var(--neutral-200);
                    transition: .4s;
                }
                
                input:checked + .slider {
                    background-color: var(--primary);
                }
                
                input:focus + .slider {
                    box-shadow: 0 0 1px var(--primary);
                }
                
                input:checked + .slider:before {
                    transform: translateX(24px);
                    background-color: white;
                }
                
                .slider.round {
                    border-radius: 24px;
                }
                
                .slider.round:before {
                    border-radius: 50%;
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

export default Profile;