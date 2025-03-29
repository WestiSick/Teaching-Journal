import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { studentTestsService } from '../../../services/testsService';

function StudentLogin() {
    const navigate = useNavigate();
    const [mode, setMode] = useState('login'); // 'login' или 'register'
    const [formData, setFormData] = useState({
        fio: '',
        email: '',
        group_name: ''
    });
    const [error, setError] = useState('');

    const loginMutation = useMutation({
        mutationFn: (data) => studentTestsService.loginStudent(data),
        onSuccess: (response) => {
            const studentData = response.data.data;
            localStorage.setItem('testStudentId', studentData.student_id);
            localStorage.setItem('testStudentInfo', JSON.stringify(studentData));
            navigate('/tests/student');
        },
        onError: (error) => {
            setError(error.response?.data?.error || 'Не удалось войти. Проверьте введенные данные.');
        }
    });

    const registerMutation = useMutation({
        mutationFn: (data) => studentTestsService.registerStudent(data),
        onSuccess: (response) => {
            const studentData = response.data.data;
            localStorage.setItem('testStudentId', studentData.student_id);
            localStorage.setItem('testStudentInfo', JSON.stringify(studentData));
            navigate('/tests/student');
        },
        onError: (error) => {
            setError(error.response?.data?.error || 'Не удалось зарегистрироваться. Пожалуйста, попробуйте снова.');
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError('');
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setError('');

        if (mode === 'login') {
            if (!formData.fio || !formData.email) {
                setError('Пожалуйста, заполните все поля');
                return;
            }
            loginMutation.mutate({
                fio: formData.fio,
                email: formData.email
            });
        } else {
            if (!formData.fio || !formData.email || !formData.group_name) {
                setError('Пожалуйста, заполните все поля');
                return;
            }
            registerMutation.mutate(formData);
        }
    };

    const toggleMode = () => {
        setMode(prev => (prev === 'login' ? 'register' : 'login'));
        setError('');
    };

    return (
        <div className="student-login-container">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                            <line x1="6" y1="6" x2="6.01" y2="6"></line>
                            <line x1="6" y1="18" x2="6.01" y2="18"></line>
                        </svg>
                    </div>
                    <h1 className="login-title">{mode === 'login' ? 'Вход для студента' : 'Регистрация студента'}</h1>
                    <p className="login-subtitle">
                        {mode === 'login'
                            ? 'Войдите, чтобы получить доступ к тестам'
                            : 'Зарегистрируйтесь, чтобы начать проходить тесты'}
                    </p>
                </div>

                {error && (
                    <div className="alert alert-danger mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="fio">ФИО</label>
                        <input
                            type="text"
                            id="fio"
                            name="fio"
                            className="form-control"
                            value={formData.fio}
                            onChange={handleChange}
                            placeholder="Введите ваше полное имя"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            className="form-control"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="Введите ваш email"
                            required
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="form-group">
                            <label htmlFor="group_name">Группа</label>
                            <input
                                type="text"
                                id="group_name"
                                name="group_name"
                                className="form-control"
                                value={formData.group_name}
                                onChange={handleChange}
                                placeholder="Введите название вашей группы"
                                required
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary w-full mt-4"
                        disabled={loginMutation.isPending || registerMutation.isPending}
                    >
                        {(loginMutation.isPending || registerMutation.isPending)
                            ? (mode === 'login' ? 'Вход...' : 'Регистрация...')
                            : (mode === 'login' ? 'Войти' : 'Зарегистрироваться')}
                    </button>
                </form>

                <div className="login-footer">
                    <button
                        type="button"
                        className="toggle-mode-btn"
                        onClick={toggleMode}
                    >
                        {mode === 'login'
                            ? "Нет аккаунта? Зарегистрироваться"
                            : 'Уже есть аккаунт? Войти'}
                    </button>
                </div>
            </div>

            <style jsx="true">{`
                .student-login-container {
                    min-height: 100vh;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 2rem;
                    background-color: var(--bg-dark);
                }
                
                .login-card {
                    width: 100%;
                    max-width: 450px;
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    padding: 2rem;
                    box-shadow: var(--shadow-lg);
                    border: 1px solid var(--border-color);
                }
                
                .login-header {
                    text-align: center;
                    margin-bottom: 2rem;
                }
                
                .login-logo {
                    width: 64px;
                    height: 64px;
                    background-color: var(--primary-lighter);
                    color: var(--primary);
                    border-radius: var(--radius-full);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin: 0 auto 1rem;
                }
                
                .login-title {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                }
                
                .login-subtitle {
                    color: var(--text-tertiary);
                }
                
                .login-footer {
                    margin-top: 1.5rem;
                    text-align: center;
                }
                
                .toggle-mode-btn {
                    background: none;
                    border: none;
                    color: var(--primary);
                    cursor: pointer;
                    font-size: 0.875rem;
                }
                
                .toggle-mode-btn:hover {
                    text-decoration: underline;
                }
                
                .w-full {
                    width: 100%;
                }
                
                .mt-4 {
                    margin-top: 1rem;
                }
                
                .mb-4 {
                    margin-bottom: 1rem;
                }
            `}</style>
        </div>
    );
}

export default StudentLogin;