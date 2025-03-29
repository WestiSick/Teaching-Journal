import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userService } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Profile() {
    const { currentUser } = useAuth();
    const queryClient = useQueryClient();

    // Состояние вкладок
    const [activeTab, setActiveTab] = useState('general');

    // Состояния форм
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

    // Состояния статусов
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Получаем данные пользователя
    const { data, isLoading } = useQuery({
        queryKey: ['user-profile'],
        queryFn: userService.getCurrentUser
    });

    // Мутация для обновления пользователя
    const updateMutation = useMutation({
        mutationFn: (data) => userService.updateUser(data),
        onSuccess: () => {
            setSuccess('Профиль успешно обновлен');
            setPasswordForm({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setPasswordStrength(0);
            queryClient.invalidateQueries({ queryKey: ['user-profile'] });

            // Очищаем сообщение об успехе через 3 секунды
            setTimeout(() => {
                setSuccess('');
            }, 3000);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось обновить профиль');

            // Очищаем сообщение об ошибке через 5 секунд
            setTimeout(() => {
                setError('');
            }, 5000);
        }
    });

    // Обработчик изменения пароля
    const handlePasswordChange = (e) => {
        const { name, value } = e.target;
        setPasswordForm(prev => ({ ...prev, [name]: value }));

        // Проверяем сложность пароля, если обновляется поле нового пароля
        if (name === 'newPassword') {
            checkPasswordStrength(value);
        }

        // Проверяем совпадение паролей
        if (name === 'newPassword' || name === 'confirmPassword') {
            setPasswordMatch(
                passwordForm.confirmPassword &&
                value === (name === 'newPassword' ? passwordForm.confirmPassword : passwordForm.newPassword)
            );
        }
    };

    // Проверка сложности пароля
    const checkPasswordStrength = (password) => {
        // Сбрасываем сложность
        let strength = 0;

        // Возвращаем 0 для пустых паролей
        if (!password) {
            setPasswordStrength(0);
            return;
        }

        // Проверка длины
        if (password.length >= 8) strength += 1;

        // Содержит цифры
        if (/\\d/.test(password)) strength += 1;

        // Содержит строчные буквы
        if (/[a-z]/.test(password)) strength += 1;

        // Содержит заглавные буквы
        if (/[A-Z]/.test(password)) strength += 1;

        // Содержит спецсимволы
        if (/[^A-Za-z0-9]/.test(password)) strength += 1;

        setPasswordStrength(strength);
    };

    // Переключение видимости пароля
    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    // Цвет индикатора сложности пароля
    const getPasswordStrengthColor = () => {
        if (passwordStrength <= 2) return 'var(--danger)';
        if (passwordStrength <= 4) return 'var(--warning)';
        return 'var(--success)';
    };

    // Валидация формы смены пароля
    const validatePasswordForm = () => {
        setError('');
        setSuccess('');

        // Валидация смены пароля
        if (!passwordForm.currentPassword) {
            setError('Требуется текущий пароль');
            return false;
        }

        if (!passwordForm.newPassword) {
            setError('Требуется новый пароль');
            return false;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setError('Новые пароли не совпадают');
            return false;
        }

        if (passwordStrength < 3) {
            setError('Пароль слишком слабый. Включите заглавные, строчные буквы, цифры и специальные символы.');
            return false;
        }

        return true;
    };

    // Обработчик обновления пароля
    const handlePasswordUpdate = (e) => {
        e.preventDefault();

        if (!validatePasswordForm()) return;

        // Подготовка данных для отправки
        const updateData = {
            currentPassword: passwordForm.currentPassword,
            newPassword: passwordForm.newPassword
        };

        updateMutation.mutate(updateData);
    };

    // Для демонстрации, генерируем случайный цвет аватара на основе email пользователя
    const getAvatarColor = (email) => {
        if (!email) return '#4f46e5'; // По умолчанию основной цвет

        // Простая хеш-функция для генерации последовательного цвета для одного и того же email
        let hash = 0;
        for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
        }

        // Преобразование хеша в цвет HSL с высокой насыщенностью и подходящей яркостью для темной темы
        const h = hash % 360;
        return `hsl(${h}, 70%, 50%)`;
    };

    // Получение инициалов пользователя из email
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

    // Получаем полное имя пользователя из ответа API
    const userData = data?.data?.data || {};
    const displayFio = userData.fio || 'Пользователь';
    const userEmail = currentUser?.email || userData?.email || 'Нет email';

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Настройки профиля</h1>
                    <p className="text-secondary">Управление настройками вашей учетной записи</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Боковая панель профиля */}
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
                                {currentUser?.role === 'admin' ? 'Администратор' : currentUser?.role === 'free' ? 'Бесплатный пользователь' : 'Премиум пользователь'}
                            </div>
                        </div>
                    </div>

                    {/* Навигационные вкладки */}
                    <div className="card overflow-hidden p-0">
                        <ul className="profile-menu">
                            <li className={`profile-menu-item ${activeTab === 'general' ? 'active' : ''}`}>
                                <button onClick={() => setActiveTab('general')} className="profile-menu-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="12" cy="7" r="4"></circle>
                                    </svg>
                                    <span>Общая информация</span>
                                </button>
                            </li>
                            <li className={`profile-menu-item ${activeTab === 'security' ? 'active' : ''}`}>
                                <button onClick={() => setActiveTab('security')} className="profile-menu-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                    </svg>
                                    <span>Пароль и безопасность</span>
                                </button>
                            </li>
                            <li className={`profile-menu-item ${activeTab === 'preferences' ? 'active' : ''}`}>
                                <button onClick={() => setActiveTab('preferences')} className="profile-menu-button">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                                    </svg>
                                    <span>Предпочтения</span>
                                </button>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* Основной контент */}
                <div className="lg:col-span-2">
                    {/* Сообщения о статусе */}
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

                    {/* Вкладка общей информации */}
                    {activeTab === 'general' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">Общая информация</h2>
                            <div className="space-y-4">
                                <div className="form-group">
                                    <label htmlFor="email" className="form-label">Адрес электронной почты</label>
                                    <input
                                        type="email"
                                        id="email"
                                        value={userEmail}
                                        disabled
                                        className="form-control bg-bg-dark-tertiary"
                                    />
                                    <small className="text-tertiary mt-1 block">Email не может быть изменен</small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="fio" className="form-label">Полное имя</label>
                                    <input
                                        type="text"
                                        id="fio"
                                        value={displayFio}
                                        disabled
                                        className="form-control bg-bg-dark-tertiary"
                                    />
                                    <small className="text-tertiary mt-1 block">Полное имя может быть изменено только администратором</small>
                                </div>

                                <div className="form-group">
                                    <label htmlFor="role" className="form-label">Тип аккаунта</label>
                                    <input
                                        type="text"
                                        id="role"
                                        value={currentUser?.role === 'admin' ? 'Администратор' : currentUser?.role === 'free' ? 'Бесплатный аккаунт' : 'Премиум аккаунт'}
                                        disabled
                                        className="form-control bg-bg-dark-tertiary"
                                    />
                                    <small className="text-tertiary mt-1 block">
                                        {currentUser?.role === 'free'
                                            ? 'Перейдите на Премиум для доступа ко всем функциям'
                                            : currentUser?.role === 'admin'
                                                ? 'Учетные записи администратора имеют полный доступ к системе'
                                                : 'Премиум-аккаунты имеют доступ ко всем функциям'}
                                    </small>
                                </div>

                                {currentUser?.role === 'free' && (
                                    <div className="upgrade-box mt-6 p-4 rounded-lg border border-primary-light bg-primary-lighter bg-opacity-20">
                                        <h3 className="text-lg font-medium text-primary mb-2">Перейти на Премиум</h3>
                                        <p className="text-secondary mb-3">
                                            Получите доступ к дополнительным функциям, таким как отчеты о посещаемости,
                                            оценки лабораторных работ и расширенная аналитика.
                                        </p>
                                        <button className="btn btn-primary">
                                            Улучшить аккаунт
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Вкладка пароля и безопасности */}
                    {activeTab === 'security' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">Изменить пароль</h2>
                            <form onSubmit={handlePasswordUpdate} className="space-y-5">
                                <div className="form-group">
                                    <label htmlFor="currentPassword" className="form-label">Текущий пароль</label>
                                    <div className="input-with-icon">
                                        <input
                                            type={showPasswords.currentPassword ? "text" : "password"}
                                            id="currentPassword"
                                            name="currentPassword"
                                            value={passwordForm.currentPassword}
                                            onChange={handlePasswordChange}
                                            className="form-control pr-10"
                                            placeholder="Введите ваш текущий пароль"
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
                                    <label htmlFor="newPassword" className="form-label">Новый пароль</label>
                                    <div className="input-with-icon">
                                        <input
                                            type={showPasswords.newPassword ? "text" : "password"}
                                            id="newPassword"
                                            name="newPassword"
                                            value={passwordForm.newPassword}
                                            onChange={handlePasswordChange}
                                            className="form-control pr-10"
                                            placeholder="Введите новый пароль"
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
                                                {passwordStrength === 0 && <span className="text-danger">Введите пароль</span>}
                                                {passwordStrength === 1 && <span className="text-danger">Очень слабый</span>}
                                                {passwordStrength === 2 && <span className="text-danger">Слабый</span>}
                                                {passwordStrength === 3 && <span className="text-warning">Средний</span>}
                                                {passwordStrength === 4 && <span className="text-success">Сильный</span>}
                                                {passwordStrength === 5 && <span className="text-success">Очень сильный</span>}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="confirmPassword" className="form-label">Подтвердите новый пароль</label>
                                    <div className="input-with-icon">
                                        <input
                                            type={showPasswords.confirmPassword ? "text" : "password"}
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            value={passwordForm.confirmPassword}
                                            onChange={handlePasswordChange}
                                            className="form-control pr-10"
                                            placeholder="Подтвердите новый пароль"
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
                                                <span className="text-success">Пароли совпадают</span>
                                            ) : (
                                                <span className="text-danger">Пароли не совпадают</span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="password-requirements mt-4 p-4 bg-bg-dark-tertiary rounded-lg">
                                    <h4 className="text-sm font-medium mb-2">Требования к паролю</h4>
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
                                            Не менее 8 символов
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
                                            Хотя бы одна заглавная буква
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
                                            Хотя бы одна строчная буква
                                        </li>
                                        <li className={`flex items-center gap-1 ${passwordForm.newPassword && /\\d/.test(passwordForm.newPassword) ? 'text-success' : ''}`}>
                                            {passwordForm.newPassword && /\\d/.test(passwordForm.newPassword) ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 6L9 17l-5-5"></path>
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                </svg>
                                            )}
                                            Хотя бы одна цифра
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
                                            Хотя бы один специальный символ
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
                                                <span>Обновление...</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                                                </svg>
                                                <span>Изменить пароль</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Вкладка предпочтений */}
                    {activeTab === 'preferences' && (
                        <div className="card">
                            <h2 className="text-xl font-semibold mb-4">Предпочтения</h2>
                            <div className="space-y-4">
                                <div className="notification-settings">
                                    <h3 className="text-lg font-medium mb-3">Уведомления</h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium">Email-уведомления</h4>
                                                <p className="text-sm text-secondary">Получать уведомления по электронной почте о важных событиях</p>
                                            </div>
                                            <label className="switch">
                                                <input type="checkbox" checked />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="font-medium">Системные уведомления</h4>
                                                <p className="text-sm text-secondary">Получать уведомления внутри приложения</p>
                                            </div>
                                            <label className="switch">
                                                <input type="checkbox" checked />
                                                <span className="slider round"></span>
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="appearance-settings mt-6">
                                    <h3 className="text-lg font-medium mb-3">Внешний вид</h3>
                                    <div className="form-group">
                                        <label htmlFor="theme" className="form-label">Тема</label>
                                        <select id="theme" className="form-control">
                                            <option value="dark">Темная тема</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="appearance-settings mt-6">
                                    <h3 className="text-lg font-medium mb-3">Язык</h3>
                                    <div className="form-group">
                                        <label htmlFor="language" className="form-label">Язык интерфейса</label>
                                        <select id="language" className="form-control">
                                            <option value="ru">Русский</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="pt-6">
                                    <button className="btn btn-primary">
                                        Сохранить предпочтения
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
                
                /* Переключатель */
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