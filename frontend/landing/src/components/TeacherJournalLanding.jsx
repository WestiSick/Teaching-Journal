import React, { useState, useEffect } from 'react';
import { Menu, X, Check, BookOpen, Users, ClipboardList, BarChart2, Award, AlertCircle, CheckCircle } from 'lucide-react';
import { sendToTelegram, validateFormData } from '../utils/utility';

const TeacherJournalLanding = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [activeFeature, setActiveFeature] = useState(0);
    const [isScrolled, setIsScrolled] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        institution: '',
        contactPerson: '',
        email: '',
        institutionType: ''
    });

    // Form submission state
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formStatus, setFormStatus] = useState({
        message: '',
        isError: false,
        isSuccess: false
    });

    // Animation on scroll effect
    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Auto-rotate features
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveFeature((prev) => (prev + 1) % features.length);
        }, 5000);

        return () => clearInterval(interval);
    }, []);
    // Handle form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Reset form status
        setFormStatus({
            message: '',
            isError: false,
            isSuccess: false
        });

        // Validate form data
        const errorMessage = validateFormData(formData);
        if (errorMessage) {
            setFormStatus({
                message: errorMessage,
                isError: true,
                isSuccess: false
            });
            return;
        }

        // Submit form
        setIsSubmitting(true);

        try {
            const result = await sendToTelegram(formData);

            if (result.success) {
                setFormStatus({
                    message: result.message,
                    isError: false,
                    isSuccess: true
                });

                // Reset form data on success
                setFormData({
                    institution: '',
                    contactPerson: '',
                    email: '',
                    institutionType: ''
                });
            } else {
                setFormStatus({
                    message: result.message,
                    isError: true,
                    isSuccess: false
                });
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            setFormStatus({
                message: 'Произошла ошибка при отправке заявки. Пожалуйста, попробуйте позже.',
                isError: true,
                isSuccess: false
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const features = [
        {
            icon: <BookOpen className="w-12 h-12 mb-4 text-indigo-500" />,
            title: "Учет пар",
            description: "Добавляйте и отслеживайте проведенные занятия по предметам и группам с удобной системой фильтрации."
        },
        {
            icon: <Users className="w-12 h-12 mb-4 text-purple-500" />,
            title: "Посещаемость",
            description: "Ведите учет посещаемости студентов с интерактивной визуализацией данных и автоматической аналитикой."
        },
        {
            icon: <ClipboardList className="w-12 h-12 mb-4 text-blue-500" />,
            title: "Лабораторные",
            description: "Фиксируйте сдачу лабораторных работ, отслеживайте успеваемость и генерируйте отчеты для анализа."
        },
        {
            icon: <BarChart2 className="w-12 h-12 mb-4 text-green-500" />,
            title: "Аналитика",
            description: "Получайте подробную статистику по успеваемости и посещаемости с визуальными графиками и отчетами."
        },
        {
            icon: <Award className="w-12 h-12 mb-4 text-amber-500" />,
            title: "Рейтинги",
            description: "Отслеживайте прогресс студентов в рейтинговой системе и мотивируйте их к лучшим результатам."
        }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 text-gray-100 overflow-hidden">
            {/* Floating Accent Elements */}
            <div className="fixed w-96 h-96 rounded-full bg-blue-500/10 blur-3xl top-1/4 -left-48 animate-pulse"></div>
            <div className="fixed w-96 h-96 rounded-full bg-purple-500/10 blur-3xl bottom-1/4 -right-48 animate-pulse delay-1000"></div>

            {/* Header */}
            <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-gray-900/80 backdrop-blur-md py-2 shadow-md' : 'bg-transparent py-4'}`}>
                <div className="container mx-auto px-4 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                            <BookOpen className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center">
                                <h1 className="text-xl font-bold">Teacher Journal</h1>
                                <span className="ml-2 px-2 py-0.5 text-xs font-bold rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 text-white transform -rotate-3 shadow-lg animate-pulse">BETA</span>
                            </div>
                            <p className="text-xs text-gray-400">Специально для ВГЛТУ</p>
                        </div>
                    </div>

                    {/* Desktop Menu */}
                    <nav className="hidden md:flex items-center space-x-8">
                        <a href="#features" className="text-white hover:text-indigo-300 transition-colors font-medium">Возможности</a>
                        <a href="#about" className="text-white hover:text-indigo-300 transition-colors font-medium">О системе</a>
                        <a href="#advantages" className="text-white hover:text-indigo-300 transition-colors font-medium">Преимущества</a>
                        <div className="flex space-x-3">
                            <a href="/login" className="px-5 py-2 rounded-lg bg-gray-700 text-white border-2 border-gray-400 hover:bg-gray-600 transition-colors font-bold text-shadow shadow-md">
                                Вход
                            </a>
                            <a href="/register" className="px-5 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity font-bold shadow-md shadow-indigo-500/20 text-shadow">
                                Регистрация
                            </a>
                        </div>
                    </nav>

                    {/* Mobile menu button */}
                    <button
                        className="md:hidden text-gray-300"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                    >
                        {isMenuOpen ? <X /> : <Menu />}
                    </button>
                </div>

                {/* Mobile menu */}
                {isMenuOpen && (
                    <nav className="md:hidden bg-gray-900/90 backdrop-blur-md p-4 absolute w-full">
                        <div className="flex flex-col space-y-4">
                            <a href="#features" className="text-white font-medium py-2 hover:text-indigo-300 transition-colors">Возможности</a>
                            <a href="#about" className="text-white font-medium py-2 hover:text-indigo-300 transition-colors">О системе</a>
                            <a href="#advantages" className="text-white font-medium py-2 hover:text-indigo-300 transition-colors">Преимущества</a>
                            <a href="/login" className="py-3 rounded-lg bg-gray-700 text-white border-2 border-gray-400 hover:bg-gray-600 transition-colors text-center font-bold text-shadow">
                                Вход
                            </a>
                            <a href="/register" className="py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity text-center font-bold shadow-md text-shadow">
                                Регистрация
                            </a>
                        </div>
                    </nav>
                )}
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-3xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500">
                            Цифровой журнал нового поколения
                        </h1>
                        <p className="text-xl md:text-2xl text-gray-300 mb-8">
                            Современный инструмент для эффективного управления учебным процессом
                        </p>
                        <div className="flex flex-col md:flex-row justify-center gap-4">
                            <a href="#order-system" className="px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20 transform hover:-translate-y-1 duration-200 text-center text-lg">
                                Начать работу
                            </a>
                            <a href="#features" className="px-8 py-3 rounded-full bg-gray-700 text-white border-2 border-gray-400 font-bold hover:bg-gray-600 transition-colors transform hover:-translate-y-1 duration-200 text-center text-lg">
                                Узнать больше
                            </a>
                        </div>
                    </div>
                </div>

                {/* Floating elements */}
                <div className="absolute top-1/2 left-5 w-20 h-20 bg-blue-500/10 rounded-full blur-xl animate-float"></div>
                <div className="absolute bottom-1/4 right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-xl animate-float-delay"></div>
            </section>

            {/* Feature Preview Section */}
            <section id="features" className="py-20 relative overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Функциональные возможности</h2>
                        <p className="text-gray-400">Инновационные решения для автоматизации процесса обучения</p>
                    </div>

                    <div className="flex flex-col lg:flex-row items-center gap-10">
                        {/* Feature selector */}
                        <div className="w-full lg:w-1/3 space-y-4">
                            {features.map((feature, index) => (
                                <div
                                    key={index}
                                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 ${activeFeature === index ? 'bg-gray-800/80 border-l-4 border-indigo-500 shadow-lg' : 'hover:bg-gray-800/40'}`}
                                    onClick={() => setActiveFeature(index)}
                                >
                                    <div className="flex items-center">
                                        <div className={`mr-4 opacity-${activeFeature === index ? '100' : '70'}`}>
                                            {feature.icon}
                                        </div>
                                        <div>
                                            <h3 className={`font-semibold text-lg ${activeFeature === index ? 'text-white' : 'text-gray-300'}`}>{feature.title}</h3>
                                            <p className={`text-sm ${activeFeature === index ? 'text-gray-300' : 'text-gray-400'}`}>{feature.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Feature illustration */}
                        <div className="w-full lg:w-2/3 bg-gray-800/40 rounded-2xl border border-gray-700/50 backdrop-blur-sm p-6 shadow-xl relative overflow-hidden">
                            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl"></div>
                            <div className="absolute -left-10 -top-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl"></div>

                            {/* UI mockup for features */}
                            <div className="relative z-10 h-80 rounded-lg overflow-hidden border border-gray-700/30">
                                {activeFeature === 0 && (
                                    <div className="h-full bg-gray-900 p-4 transition-all duration-500 animate-fade-in">
                                        <div className="border-b border-gray-700 pb-3 mb-4">
                                            <h3 className="text-lg font-medium">Учет занятий</h3>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-gray-800 p-3 rounded-lg">
                                                <div className="h-2 w-3/4 bg-indigo-500/40 rounded-full mb-2"></div>
                                                <div className="h-2 w-1/2 bg-gray-700 rounded-full"></div>
                                            </div>
                                            <div className="bg-gray-800 p-3 rounded-lg">
                                                <div className="h-2 w-3/4 bg-indigo-500/40 rounded-full mb-2"></div>
                                                <div className="h-2 w-1/2 bg-gray-700 rounded-full"></div>
                                            </div>
                                            <div className="bg-gray-800 p-3 rounded-lg">
                                                <div className="h-2 w-3/4 bg-indigo-500/40 rounded-full mb-2"></div>
                                                <div className="h-2 w-1/2 bg-gray-700 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="mt-4">
                                            <div className="h-24 bg-gray-800 rounded-lg p-3">
                                                <div className="grid grid-cols-4 gap-2">
                                                    {[1, 2, 3, 4].map(item => (
                                                        <div key={item} className="h-6 bg-gray-700/50 rounded flex items-center justify-center">
                                                            <div className="h-2 w-1/2 bg-purple-500/30 rounded-full"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="mt-2 grid grid-cols-4 gap-2">
                                                    {[1, 2, 3, 4].map(item => (
                                                        <div key={item} className="h-6 bg-gray-700/50 rounded flex items-center justify-center">
                                                            <div className="h-2 w-1/2 bg-purple-500/30 rounded-full"></div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeFeature === 1 && (
                                    <div className="h-full bg-gray-900 p-4 transition-all duration-500 animate-fade-in">
                                        <div className="border-b border-gray-700 pb-3 mb-4">
                                            <h3 className="text-lg font-medium">Посещаемость</h3>
                                        </div>
                                        <div className="grid grid-cols-7 gap-1 mb-4">
                                            {[...Array(28)].map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`h-8 rounded-md flex items-center justify-center text-xs ${i % 3 === 0 ? 'bg-green-500/20 border border-green-500/30' : i % 7 === 0 ? 'bg-red-500/20 border border-red-500/30' : 'bg-gray-700/40'}`}
                                                >
                                                    {i % 3 === 0 && <Check size={14} className="text-green-400" />}
                                                    {i % 7 === 0 && <X size={14} className="text-red-400" />}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="h-28 bg-gray-800 rounded-lg p-3">
                                            <div className="flex justify-between h-full items-end">
                                                {[30, 80, 60, 90, 50, 75, 85, 40].map((height, i) => (
                                                    <div key={i} className="w-6 rounded-t relative" style={{height: `${height}%`}}>
                                                        <div className={`absolute bottom-0 w-full rounded-t h-full ${height > 70 ? 'bg-green-500/60' : height > 40 ? 'bg-blue-500/60' : 'bg-red-500/60'}`}></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeFeature === 2 && (
                                    <div className="h-full bg-gray-900 p-4 transition-all duration-500 animate-fade-in">
                                        <div className="border-b border-gray-700 pb-3 mb-4">
                                            <h3 className="text-lg font-medium">Лабораторные работы</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                {name: "Лабораторная работа №1", completed: true, score: 92},
                                                {name: "Лабораторная работа №2", completed: true, score: 85},
                                                {name: "Лабораторная работа №3", completed: false, score: null},
                                                {name: "Лабораторная работа №4", completed: false, score: null}
                                            ].map((lab, i) => (
                                                <div key={i} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                                    <div className="flex items-center">
                                                        <div className={`w-4 h-4 rounded-full mr-3 ${lab.completed ? 'bg-green-500' : 'bg-gray-600'}`}></div>
                                                        <span>{lab.name}</span>
                                                    </div>
                                                    <div>
                                                        {lab.completed ? (
                                                            <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-md">{lab.score}/100</span>
                                                        ) : (
                                                            <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded-md">Не сдано</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeFeature === 3 && (
                                    <div className="h-full bg-gray-900 p-4 transition-all duration-500 animate-fade-in">
                                        <div className="border-b border-gray-700 pb-3 mb-4">
                                            <h3 className="text-lg font-medium">Аналитика</h3>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 mb-4">
                                            <div className="bg-gray-800 p-3 rounded-lg">
                                                <div className="text-xs text-gray-400 mb-1">Средний балл</div>
                                                <div className="text-xl font-bold">84.7</div>
                                                <div className="h-1 w-full bg-gray-700 mt-2">
                                                    <div className="h-full w-4/5 bg-blue-500 rounded-full"></div>
                                                </div>
                                            </div>
                                            <div className="bg-gray-800 p-3 rounded-lg">
                                                <div className="text-xs text-gray-400 mb-1">Посещаемость</div>
                                                <div className="text-xl font-bold">92%</div>
                                                <div className="h-1 w-full bg-gray-700 mt-2">
                                                    <div className="h-full w-11/12 bg-green-500 rounded-full"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-28 rounded-lg overflow-hidden">
                                            <div className="flex justify-between h-full items-end px-2">
                                                {[20, 45, 60, 85, 75, 90, 65, 80].map((height, i) => (
                                                    <div key={i} className="w-6 rounded-t-sm" style={{height: `${height}%`}}>
                                                        <div
                                                            className="w-full h-full rounded-t-sm"
                                                            style={{
                                                                background: `linear-gradient(to top, rgb(56, 189, 248, 0.7) 0%, rgb(103, 232, 249, 0.5) 100%)`
                                                            }}
                                                        ></div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeFeature === 4 && (
                                    <div className="h-full bg-gray-900 p-4 transition-all duration-500 animate-fade-in">
                                        <div className="border-b border-gray-700 pb-3 mb-4">
                                            <h3 className="text-lg font-medium">Рейтинги</h3>
                                        </div>
                                        <div className="space-y-3">
                                            {[
                                                {name: "Иванов С.В.", rank: 1, score: 97},
                                                {name: "Петрова А.И.", rank: 2, score: 95},
                                                {name: "Сидоров К.В.", rank: 3, score: 92},
                                                {name: "Кузнецова О.П.", rank: 4, score: 89},
                                                {name: "Смирнов Д.А.", rank: 5, score: 85}
                                            ].map((student, i) => (
                                                <div key={i} className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                                                    <div className="flex items-center">
                                                        <div className={`w-6 h-6 flex items-center justify-center rounded-full mr-3 ${
                                                            student.rank === 1 ? 'bg-amber-500' :
                                                                student.rank === 2 ? 'bg-gray-300' :
                                                                    student.rank === 3 ? 'bg-amber-700' : 'bg-gray-700'
                                                        } text-xs font-bold`}>
                                                            {student.rank}
                                                        </div>
                                                        <span>{student.name}</span>
                                                    </div>
                                                    <div>
                            <span className={`px-2 py-1 ${
                                student.score > 95 ? 'bg-green-500/20 text-green-400' :
                                    student.score > 90 ? 'bg-blue-500/20 text-blue-400' :
                                        'bg-purple-500/20 text-purple-400'
                            } text-xs rounded-md`}>{student.score}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* About Section */}
            <section id="about" className="py-20 relative bg-gradient-to-b from-gray-900 to-gray-950">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">О системе Teacher Journal</h2>
                        <p className="text-gray-400">Разработано специально для Воронежского государственного лесотехнического университета</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:shadow-xl hover:border-gray-600/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 w-12 h-12 rounded-lg mb-4 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Безопасность данных</h3>
                            <p className="text-gray-400">Надежная защита персональных данных преподавателей и студентов с соблюдением всех требований законодательства.</p>
                        </div>

                        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:shadow-xl hover:border-gray-600/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-12 h-12 rounded-lg mb-4 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Высокая производительность</h3>
                            <p className="text-gray-400">Быстрая обработка данных и моментальный доступ к информации даже при высоких нагрузках.</p>
                        </div>

                        <div className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:shadow-xl hover:border-gray-600/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="bg-gradient-to-br from-amber-500 to-orange-600 w-12 h-12 rounded-lg mb-4 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold mb-2">Интеграция</h3>
                            <p className="text-gray-400">Легкая интеграция с существующими информационными системами университета и экспорт отчетов.</p>
                        </div>
                    </div>

                    <div className="mt-16 text-center">
                        <a href="/register" className="inline-block px-8 py-3 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20 transform hover:-translate-y-1 duration-200 text-lg text-shadow">
                            Присоединиться к системе
                        </a>
                    </div>
                </div>
            </section>

            {/* Advantages Section (replacing Testimonials) */}
            <section id="advantages" className="py-20 relative">
                <div className="container mx-auto px-4">
                    <div className="max-w-3xl mx-auto text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Преимущества системы</h2>
                        <p className="text-gray-400">Почему Teacher Journal – лучший выбор для современного преподавателя</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold">Экономия времени</h3>
                                </div>
                            </div>
                            <p className="text-gray-300">Автоматизация рутинных задач освобождает до 5 часов в неделю, которые можно посвятить профессиональному развитию и улучшению качества преподавания.</p>
                        </div>

                        <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-teal-600 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold">Точная аналитика</h3>
                                </div>
                            </div>
                            <p className="text-gray-300">Подробная статистика и визуализация данных помогает выявить проблемные области и принять обоснованные решения для улучшения учебного процесса.</p>
                        </div>

                        <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold">Улучшение коммуникации</h3>
                                </div>
                            </div>
                            <p className="text-gray-300">Повышение прозрачности учебного процесса и эффективная обратная связь способствуют лучшему пониманию между преподавателями и студентами.</p>
                        </div>

                        <div className="bg-gray-800/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/30 hover:border-gray-600/50 transition-all duration-300 transform hover:-translate-y-1">
                            <div className="flex items-center mb-4">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                    </svg>
                                </div>
                                <div className="ml-4">
                                    <h3 className="text-xl font-semibold">Повышение результатов</h3>
                                </div>
                            </div>
                            <p className="text-gray-300">Согласно исследованиям, использование цифровых журналов повышает успеваемость студентов в среднем на 15-20% благодаря своевременному выявлению проблем.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* For Educational Institutions Section */}
            <section id="order-system" className="py-20 relative bg-gradient-to-b from-gray-950 to-gray-900">
                <div className="container mx-auto px-4">
                    <div className="max-w-5xl mx-auto bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 md:p-12 border border-gray-700/50 shadow-xl overflow-hidden relative">
                        <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl"></div>
                        <div className="absolute -left-20 -top-20 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl"></div>

                        <div className="flex flex-col md:flex-row gap-8 items-center relative z-10">
                            <div className="w-full md:w-3/5">
                                <h2 className="text-2xl md:text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                                    Заказать систему для вашего учебного заведения
                                </h2>
                                <p className="text-gray-300 mb-4">
                                    Teacher Journal — это эксклюзивная система, разработанная специально для ВГЛТУ. Наша команда готова создать аналогичное решение под потребности и особенности вашего образовательного учреждения.
                                </p>
                                <ul className="space-y-3 mb-6">
                                    <li className="flex items-start">
                                        <div className="mr-3 mt-1 h-5 w-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-300">Разработка уникальной версии системы с вашим брендингом и требованиями</span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="mr-3 mt-1 h-5 w-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-300">Адаптация под специфические учебные программы и процессы вашего учреждения</span>
                                    </li>
                                    <li className="flex items-start">
                                        <div className="mr-3 mt-1 h-5 w-5 rounded-full bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                        <span className="text-gray-300">Полный комплекс услуг: разработка, внедрение, обучение и поддержка</span>
                                    </li>
                                </ul>
                                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-lg p-4 mb-6">
                                    <p className="text-gray-300 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Заполните форму справа, и наш специалист свяжется с вами для обсуждения деталей и демонстрации возможностей системы
                                    </p>
                                </div>
                            </div>

                            <div className="w-full md:w-2/5">
                                <div className="bg-gray-900/70 rounded-xl border border-gray-700/50 p-5 shadow-lg border-t-4 border-t-indigo-500">
                                    <h3 className="text-xl font-semibold mb-2 text-center">Оставить заявку</h3>
                                    <p className="text-gray-400 text-sm text-center mb-4">Заполните форму для получения индивидуального предложения</p>

                                    {/* Form status message */}
                                    {formStatus.message && (
                                        <div className={`mb-4 p-3 rounded-lg flex items-center ${formStatus.isError ? 'bg-red-900/30 border border-red-700' : 'bg-green-900/30 border border-green-700'}`}>
                                            {formStatus.isError ? (
                                                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                                            ) : (
                                                <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                                            )}
                                            <span className={`text-sm ${formStatus.isError ? 'text-red-200' : 'text-green-200'}`}>
                {formStatus.message}
            </span>
                                        </div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Название учреждения</label>
                                            <input
                                                type="text"
                                                name="institution"
                                                value={formData.institution}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="Введите название"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Контактное лицо</label>
                                            <input
                                                type="text"
                                                name="contactPerson"
                                                value={formData.contactPerson}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="ФИО"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Электронная почта</label>
                                            <input
                                                type="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Тип учебного заведения</label>
                                            <select
                                                name="institutionType"
                                                value={formData.institutionType}
                                                onChange={handleInputChange}
                                                className="w-full bg-gray-800/50 border border-gray-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            >
                                                <option value="">Выберите тип</option>
                                                <option value="university">Университет</option>
                                                <option value="college">Колледж</option>
                                                <option value="school">Школа</option>
                                                <option value="other">Другое</option>
                                            </select>
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={isSubmitting}
                                            className={`w-full py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold transition-all shadow-lg text-shadow ${isSubmitting ? 'opacity-70 cursor-not-allowed' : 'hover:opacity-90 cursor-pointer'}`}
                                        >
                                            {isSubmitting ? 'Отправка...' : 'Отправить заявку'}
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 relative">
                <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-purple-900/20"></div>
                <div className="container mx-auto px-4 relative z-10">
                    <div className="max-w-4xl mx-auto bg-gray-800/50 backdrop-blur-md rounded-2xl p-10 border border-gray-700/30 shadow-xl">
                        <div className="text-center">
                            <h2 className="text-3xl md:text-4xl font-bold mb-6">Готовы начать работу с Teacher Journal?</h2>
                            <p className="text-xl text-gray-300 mb-8">Присоединяйтесь к сотням преподавателей, которые уже оптимизировали свою работу</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                                <a href="/register" className="px-8 py-3 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold hover:opacity-90 transition-opacity shadow-lg shadow-indigo-500/20 text-center text-lg text-shadow">
                                    Регистрация
                                </a>
                                <a href="#features" className="px-8 py-3 rounded-lg bg-gray-700 text-white border-2 border-gray-400 font-bold hover:bg-gray-600 transition-colors text-center text-lg text-shadow">
                                    Демонстрация системы
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 bg-gray-900">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col md:flex-row justify-between items-center">
                        <div className="flex items-center mb-6 md:mb-0">
                            <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mr-3">
                                <BookOpen className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold">Teacher Journal</h1>
                                <p className="text-xs text-gray-400">© 2025 · </p>
                            </div>
                        </div>

                        <div className="flex space-x-8 text-gray-400">
                            <a href="#" className="hover:text-white transition-colors">О системе</a>
                            <a href="#" className="hover:text-white transition-colors">Функции</a>
                            <a href="#" className="hover:text-white transition-colors">Контакты</a>
                            <a href="#" className="hover:text-white transition-colors">Поддержка</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Additional CSS for animations */}
            <style jsx>{`
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes float-delay {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
          100% { transform: translateY(0px); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animate-float-delay {
          animation: float-delay 7s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.5s ease-out forwards;
        }
        
        .text-shadow {
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.8);
        }
      `}</style>
        </div>
    );
};

export default TeacherJournalLanding;