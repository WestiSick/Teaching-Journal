// frontend/dashboard/src/pages/schedule/SchedulePage.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';
import { scheduleService } from '../../services/api';

function SchedulePage() {
    const { user } = useAuth();
    const [searchParams, setSearchParams] = useState({
        teacher: user?.fio || '',
        date: new Date().toISOString().split('T')[0],
        endDate: ''
    });
    const [asyncJobId, setAsyncJobId] = useState(null);
    const [asyncProgress, setAsyncProgress] = useState(null);
    const [asyncResults, setAsyncResults] = useState(null);
    const [selectedItems, setSelectedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scheduleItems, setScheduleItems] = useState([]);
    const progressInterval = useRef(null);
    // Новое состояние для автозаполнения имени преподавателя
    const [allTeachers, setAllTeachers] = useState([]);
    const [teacherSuggestions, setTeacherSuggestions] = useState([]);

    // Загрузка преподавателей из API
    const loadTeachers = async () => {
        try {
            const response = await fetch('https://kis.vgltu.ru/list?type=Teacher');
            const teachers = await response.json();
            setAllTeachers(teachers);

            // Инициализация с несколькими предложениями
            const maxSuggestions = window.innerHeight > window.innerWidth ? 4 : 6;
            const initialSuggestions = teachers.slice(0, maxSuggestions);
            setTeacherSuggestions(initialSuggestions);
        } catch (error) {
            // Ошибка загрузки преподавателей
        }
    };

    // Обновление предложений преподавателей на основе ввода
    const updateTeacherSuggestions = (input) => {
        const inputLower = input.toLowerCase();
        const filtered = allTeachers
            .filter(teacher => teacher.toLowerCase().startsWith(inputLower))
            .slice(0, 5);
        setTeacherSuggestions(filtered);
    };

    // Получение данных расписания
    const fetchSchedule = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await scheduleService.getSchedule(searchParams);
            setScheduleItems(response.data.data.scheduleItems || []);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.error || 'Не удалось загрузить расписание');
            throw err;
        } finally {
            setIsLoading(false);
        }
    };

    // Обработка отправки формы
    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await fetchSchedule();
        } catch (error) {
            // Ошибка при получении расписания
        }
    };

    // Начало асинхронного получения для больших диапазонов дат
    const startAsyncFetch = async () => {
        try {
            setAsyncJobId(null);
            setAsyncProgress(null);
            setAsyncResults(null);

            const response = await scheduleService.startAsyncFetch({
                teacher: searchParams.teacher,
                startDate: searchParams.date,
                endDate: searchParams.endDate
            });

            const jobId = response.data.data.jobID;
            setAsyncJobId(jobId);

            // Начало отслеживания прогресса
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }

            progressInterval.current = setInterval(async () => {
                try {
                    const progressResponse = await scheduleService.getProgress(jobId);
                    const progress = progressResponse.data.data;
                    setAsyncProgress(progress);

                    if (progress.finished) {
                        clearInterval(progressInterval.current);
                        const resultsResponse = await scheduleService.getResults(jobId);
                        setAsyncResults(resultsResponse.data.data);
                        setScheduleItems(resultsResponse.data.data.scheduleItems || []);
                    }
                } catch (error) {
                    clearInterval(progressInterval.current);
                }
            }, 1000);
        } catch (error) {
            setError("Не удалось начать асинхронную загрузку");
        }
    };

    // Добавление выбранных уроков в систему
    const addSelectedLessons = async () => {
        if (selectedItems.length === 0) {
            alert("Пожалуйста, выберите занятия для добавления");
            return;
        }

        try {
            const response = await scheduleService.addAllLessons({
                scheduleItems: selectedItems
            });

            // Обновление интерфейса, чтобы показать, какие элементы теперь в системе
            const added = response.data.data.added;
            if (added > 0) {
                // Обновление данных расписания
                if (asyncJobId) {
                    const resultsResponse = await scheduleService.getResults(asyncJobId);
                    setAsyncResults(resultsResponse.data.data);
                    setScheduleItems(resultsResponse.data.data.scheduleItems || []);
                } else {
                    await fetchSchedule();
                }

                // Очистка выбора
                setSelectedItems([]);

                alert(`Успешно добавлено ${added} занятий в систему.`);
            } else {
                alert("Новые занятия не были добавлены. Возможно, они уже существуют в системе.");
            }
        } catch (error) {
            alert("Не удалось добавить занятия в систему");
        }
    };

    // Обработка выбора флажка
    const handleSelectItem = (item) => {
        if (item.inSystem) return; // Пропустить, если уже в системе

        const isSelected = selectedItems.some(selected => selected.id === item.id);

        if (isSelected) {
            setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
        } else {
            setSelectedItems(prev => [...prev, item]);
        }
    };

    // Выбрать все элементы, которые еще не в системе
    const selectAllAvailable = () => {
        const availableItems = scheduleItems.filter(item => !item.inSystem);
        setSelectedItems(availableItems);
    };

    // Очистить все выделения
    const clearSelection = () => {
        setSelectedItems([]);
    };

    // Загрузка преподавателей при монтировании компонента
    useEffect(() => {
        loadTeachers();
    }, []);

    // Очистка интервала при размонтировании
    useEffect(() => {
        return () => {
            if (progressInterval.current) {
                clearInterval(progressInterval.current);
            }
        };
    }, []);

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">Расписание</h1>
                    <p className="text-secondary">Поиск и импорт занятий из расписания университета</p>
                </div>
            </div>

            {/* Компактная форма поиска расписания */}
            <div className="bg-dark-secondary rounded-lg mb-6 p-3">
                <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[200px]">
                        <label htmlFor="teacher" className="form-label text-xs mb-1">Имя преподавателя</label>
                        <input
                            type="text"
                            id="teacher"
                            className="form-control py-1 text-sm"
                            value={searchParams.teacher}
                            onChange={(e) => {
                                const newValue = e.target.value;
                                setSearchParams({...searchParams, teacher: newValue});
                                updateTeacherSuggestions(newValue);
                            }}
                            placeholder="Введите имя преподавателя"
                            list="teacherSuggestions"
                            required
                        />
                        <datalist id="teacherSuggestions">
                            {teacherSuggestions.map((teacher, index) => (
                                <option key={index} value={teacher} />
                            ))}
                        </datalist>
                    </div>

                    <div className="flex-1 min-w-[130px]">
                        <label htmlFor="date" className="form-label text-xs mb-1">Дата начала</label>
                        <input
                            type="date"
                            id="date"
                            className="form-control py-1 text-sm"
                            value={searchParams.date}
                            onChange={(e) => setSearchParams({...searchParams, date: e.target.value})}
                            required
                        />
                    </div>

                    <div className="flex-1 min-w-[130px]">
                        <label htmlFor="endDate" className="form-label text-xs mb-1">Дата окончания (необязательно)</label>
                        <input
                            type="date"
                            id="endDate"
                            className="form-control py-1 text-sm"
                            value={searchParams.endDate}
                            onChange={(e) => setSearchParams({...searchParams, endDate: e.target.value})}
                        />
                    </div>

                    <div className="flex gap-2">
                        <RequireSubscription>
                            <button
                                type="button"
                                className="btn btn-secondary py-1 px-2 h-[34px] text-xs flex items-center gap-1"
                                onClick={startAsyncFetch}
                                disabled={!searchParams.teacher || !searchParams.date || !searchParams.endDate}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="1 4 1 10 7 10"></polyline>
                                    <polyline points="23 20 23 14 17 14"></polyline>
                                    <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
                                </svg>
                                Асинхронно
                            </button>
                        </RequireSubscription>

                        <button
                            type="submit"
                            className="btn btn-primary py-1 px-3 h-[34px] text-xs flex items-center gap-1"
                            disabled={!searchParams.teacher || !searchParams.date}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                            Поиск
                        </button>
                    </div>
                </form>
            </div>

            {/* Отслеживание прогресса асинхронной задачи */}
            {asyncProgress && (
                <div className="card mb-6">
                    <h3 className="text-lg font-medium mb-4">Прогресс асинхронной задачи</h3>
                    <div className="mb-4">
                        <div className="flex justify-between mb-2">
                            <span className="text-secondary">Статус: {asyncProgress.status}</span>
                            <span className="text-secondary">{asyncProgress.progress}%</span>
                        </div>
                        <div className="progress">
                            <div
                                className="progress-bar progress-bar-success"
                                style={{ width: `${asyncProgress.progress}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className="text-sm text-secondary">
                        {asyncProgress.finished ? (
                            <p>Задача завершена! Найдено {asyncProgress.itemCount} элементов расписания.</p>
                        ) : (
                            <p>Обработка периода {asyncProgress.completed} из {asyncProgress.totalPeriods}...</p>
                        )}
                    </div>
                </div>
            )}

            {/* Результаты расписания */}
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

            {isLoading && (
                <div className="flex items-center justify-center h-64">
                    <div className="spinner"></div>
                </div>
            )}

            {!isLoading && scheduleItems.length > 0 && (
                <div className="card mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-medium">Результаты расписания ({scheduleItems.length} элементов)</h3>
                        <div className="flex gap-2">
                            <RequireSubscription>
                                <button
                                    onClick={selectAllAvailable}
                                    className="btn btn-secondary btn-sm flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <polyline points="9 11 12 14 22 4"></polyline>
                                        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                    </svg>
                                    Выбрать все
                                </button>

                                <button
                                    onClick={clearSelection}
                                    className="btn btn-outline btn-sm flex items-center gap-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 12H5"></path>
                                    </svg>
                                    Очистить
                                </button>

                                <button
                                    onClick={addSelectedLessons}
                                    className="btn btn-primary btn-sm flex items-center gap-2"
                                    disabled={selectedItems.length === 0}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    Добавить выбранные ({selectedItems.length})
                                </button>
                            </RequireSubscription>
                        </div>
                    </div>

                    <div className="table-container">
                        <table className="min-w-full">
                            <thead>
                            <tr>
                                <th className="w-10">
                                    <span className="sr-only">Выбрать</span>
                                </th>
                                <th>Дата</th>
                                <th>Время</th>
                                <th>Предмет</th>
                                <th>Тип</th>
                                <th>Группа</th>
                                <th>Аудитория</th>
                                <th>Статус</th>
                            </tr>
                            </thead>
                            <tbody>
                            {scheduleItems.map((item) => (
                                <tr key={item.id} className={item.inSystem ? 'opacity-60' : ''}>
                                    <td>
                                        <RequireSubscription>
                                            <input
                                                type="checkbox"
                                                className={`form-checkbox ${item.inSystem ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                                checked={selectedItems.some(selected => selected.id === item.id)}
                                                onChange={() => handleSelectItem(item)}
                                                disabled={item.inSystem}
                                            />
                                        </RequireSubscription>
                                    </td>
                                    <td>{new Date(item.date).toLocaleDateString()}</td>
                                    <td>{item.time}</td>
                                    <td className="max-w-xs truncate" title={item.subject}>{item.subject}</td>
                                    <td>{item.classType}</td>
                                    <td>{item.group} {item.subgroup !== "Вся группа" ? `(${item.subgroup})` : ''}</td>
                                    <td>{item.auditorium}</td>
                                    <td>
                                        {item.inSystem ? (
                                            <span className="badge badge-success">В системе</span>
                                        ) : (
                                            <span className="badge badge-info">Не добавлено</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!isLoading && scheduleItems.length === 0 && (
                <div className="card p-8">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-bg-dark-tertiary rounded-full mx-auto flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-text-tertiary">
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                            </svg>
                        </div>
                        <h3 className="text-xl mb-2">Элементы расписания не найдены</h3>
                        <p className="text-secondary mb-6">Попробуйте поискать другого преподавателя или диапазон дат.</p>
                    </div>
                </div>
            )}

            {/* Дополнительные стили */}
            <style jsx="true">{`
                .form-checkbox {
                    appearance: none;
                    -webkit-appearance: none;
                    border: 1px solid var(--border-color);
                    height: 1.25rem;
                    width: 1.25rem;
                    border-radius: var(--radius-sm);
                    background-color: var(--bg-dark-tertiary);
                    cursor: pointer;
                    display: inline-block;
                    position: relative;
                    vertical-align: middle;
                }
                
                .form-checkbox:checked {
                    background-color: var(--primary);
                    border-color: var(--primary);
                }
                
                .form-checkbox:checked::after {
                    content: '';
                    position: absolute;
                    top: 0.1875rem;
                    left: 0.375rem;
                    width: 0.375rem;
                    height: 0.75rem;
                    border: solid white;
                    border-width: 0 0.125rem 0.125rem 0;
                    transform: rotate(45deg);
                }
                
                .btn-sm {
                    padding: 0.375rem 0.75rem;
                    font-size: 0.875rem;
                }
            `}</style>
        </div>
    );
}

export default SchedulePage;