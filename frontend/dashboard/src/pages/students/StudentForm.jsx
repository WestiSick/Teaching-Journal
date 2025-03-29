import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService, groupService } from '../../services/api';

function StudentForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!id;
    const fileInputRef = useRef(null);

    // Состояние формы
    const [formData, setFormData] = useState({
        fio: '',
        group_name: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');
    const [batchStudents, setBatchStudents] = useState([]);
    const [isBatchMode, setIsBatchMode] = useState(false);

    // Загрузка групп для выпадающего списка
    const { data: groupsData } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    // Загрузка данных о студенте в режиме редактирования
    const { data: studentData, isLoading: studentLoading } = useQuery({
        queryKey: ['student', id],
        queryFn: () => studentService.getStudent(id),
        enabled: isEditMode
    });

    // Мутация создания
    const createMutation = useMutation({
        mutationFn: (data) => studentService.createStudent(data),
        onSuccess: () => {
            setSuccess('Студент успешно создан');
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setTimeout(() => navigate('/students'), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось создать студента');
        }
    });

    // Мутация пакетного создания
    const batchCreateMutation = useMutation({
        mutationFn: async (students) => {
            const results = [];
            for (const student of students) {
                try {
                    const result = await studentService.createStudent(student);
                    results.push({ success: true, data: result.data });
                } catch (err) {
                    results.push({ success: false, error: err.response?.data?.error || 'Создание не удалось' });
                }
            }
            return results;
        },
        onSuccess: (results) => {
            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            if (failCount === 0) {
                setSuccess(`Успешно создано всех ${successCount} студентов`);
            } else {
                setSuccess(`Создано ${successCount} студентов. ${failCount} не удалось создать.`);
            }

            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });

            // Сбросить пакетный режим и список
            setIsBatchMode(false);
            setBatchStudents([]);

            setTimeout(() => navigate('/students'), 2000);
        },
        onError: (err) => {
            setError('Не удалось создать студентов: ' + (err.message || 'Неизвестная ошибка'));
        }
    });

    // Мутация обновления
    const updateMutation = useMutation({
        mutationFn: ({ id, data }) => studentService.updateStudent(id, data),
        onSuccess: () => {
            setSuccess('Студент успешно обновлен');
            queryClient.invalidateQueries({ queryKey: ['students'] });
            queryClient.invalidateQueries({ queryKey: ['student', id] });
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setTimeout(() => navigate(`/students/${id}`), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось обновить студента');
        }
    });

    // Проверка, есть ли предварительно выбранная группа со страницы деталей группы
    useEffect(() => {
        const preselectedGroup = localStorage.getItem('preselectedGroup');
        if (preselectedGroup && !isEditMode) {
            setFormData(prev => ({ ...prev, group_name: preselectedGroup }));
            localStorage.removeItem('preselectedGroup');
        }
    }, [isEditMode]);

    // Заполнение формы данными о студенте в режиме редактирования
    useEffect(() => {
        if (isEditMode && studentData?.data?.data) {
            const student = studentData.data.data;
            setFormData({
                fio: student.fio || '',
                group_name: student.group_name || ''
            });
        }
    }, [isEditMode, studentData]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Обработка загрузки файла со списком студентов
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Сбросить статус и ошибки
        setUploadStatus('');
        setError('');
        setBatchStudents([]);

        // Проверить, является ли файл текстовым
        if (file.type !== 'text/plain') {
            setError('Пожалуйста, загрузите текстовый файл (.txt)');
            // Сбросить поле ввода файла
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        // Проверить, выбрана ли группа
        if (!formData.group_name) {
            setError('Пожалуйста, выберите группу перед загрузкой имен студентов');
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        setUploadStatus('Чтение файла...');

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target.result;
                const lines = content.split('\n');

                // Отфильтровать пустые строки и удалить лишние пробелы
                const validNames = lines
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                if (validNames.length === 0) {
                    setError('В файле не найдено действительных имен студентов');
                    setUploadStatus('');
                    return;
                }

                // Создать объекты пакетных студентов
                const newStudents = validNames.map(name => ({
                    fio: name,
                    group_name: formData.group_name
                }));

                setBatchStudents(newStudents);
                setIsBatchMode(true);
                setUploadStatus(`Готово к созданию ${validNames.length} студентов в группе "${formData.group_name}"`);

                // Сбросить поле ввода файла
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            } catch (err) {
                setError('Ошибка обработки файла. Пожалуйста, проверьте формат и попробуйте снова.');
                setUploadStatus('');
            }
        };

        reader.onerror = () => {
            setError('Не удалось прочитать файл. Пожалуйста, попробуйте снова.');
            setUploadStatus('');
        };

        reader.readAsText(file);
    };

    const cancelBatchMode = () => {
        setIsBatchMode(false);
        setBatchStudents([]);
        setUploadStatus('');
    };

    const validateForm = () => {
        setError('');
        setSuccess('');

        if (!formData.fio.trim() && !isBatchMode) {
            setError('Имя студента обязательно');
            return false;
        }

        if (!formData.group_name) {
            setError('Группа обязательна');
            return false;
        }

        return true;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (isEditMode) {
            updateMutation.mutate({ id, data: formData });
        } else if (isBatchMode && batchStudents.length > 0) {
            // Режим пакетного создания
            batchCreateMutation.mutate(batchStudents);
        } else {
            // Режим создания одного студента
            createMutation.mutate(formData);
        }
    };

    // Состояние загрузки для режима редактирования
    if (isEditMode && studentLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner"></div>
            </div>
        );
    }

    const groups = groupsData?.data?.data || [];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        {isEditMode ? 'Редактировать студента' : isBatchMode ? 'Добавить несколько студентов' : 'Добавить нового студента'}
                    </h1>
                    <p className="text-secondary">
                        {isEditMode
                            ? 'Обновить информацию о студенте'
                            : isBatchMode
                                ? `Создание ${batchStudents.length} студентов`
                                : 'Создать новую запись о студенте'}
                    </p>
                </div>
                <Link to="/students" className="btn btn-secondary flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                    <span className="hidden sm:inline">Назад</span>
                </Link>
            </div>

            <div className="card">
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

                {uploadStatus && !isBatchMode && (
                    <div className="alert alert-info mb-6">
                        <div className="flex items-center gap-3">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="16" x2="12" y2="12"></line>
                                <line x1="12" y1="8" x2="12.01" y2="8"></line>
                            </svg>
                            <p>{uploadStatus}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="form-group">
                        <label htmlFor="group_name" className="form-label">Группа <span className="text-danger">*</span></label>
                        <select
                            id="group_name"
                            name="group_name"
                            value={formData.group_name}
                            onChange={handleChange}
                            required
                            className="form-control"
                            disabled={isEditMode || isBatchMode}
                        >
                            <option value="">Выберите группу</option>
                            {groups.map(group => (
                                <option key={group.name} value={group.name}>
                                    {group.name}
                                </option>
                            ))}
                        </select>
                        <small className="text-tertiary mt-1 block">
                            {isEditMode
                                ? "Группу нельзя изменить. Создайте новую запись студента, если это необходимо."
                                : "Выберите группу, к которой принадлежит этот студент"}
                        </small>
                    </div>

                    {!isEditMode && !isBatchMode && (
                        <>
                            <div className="form-group">
                                <label htmlFor="fio" className="form-label">Имя студента <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    id="fio"
                                    name="fio"
                                    value={formData.fio}
                                    onChange={handleChange}
                                    required
                                    className="form-control"
                                    placeholder="Введите полное имя студента"
                                />
                            </div>

                            {/* Загрузка файла для пакетного создания студентов */}
                            <div className="bg-bg-dark-tertiary border border-border-color border-dashed rounded-lg p-6 mt-8">
                                <div className="flex flex-col items-center text-center">
                                    <div className="mb-4">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
                                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="12" y1="18" x2="12" y2="12"></line>
                                            <line x1="9" y1="15" x2="15" y2="15"></line>
                                        </svg>
                                    </div>
                                    <h4 className="text-lg font-medium mb-2">Или добавьте несколько студентов сразу</h4>
                                    <p className="text-secondary mb-4">Загрузите текстовый файл с одним именем студента на строку для создания нескольких студентов одновременно</p>

                                    <div className="relative w-full max-w-md">
                                        <input
                                            type="file"
                                            accept=".txt"
                                            onChange={handleFileUpload}
                                            ref={fileInputRef}
                                            className="form-control file-input"
                                            disabled={!formData.group_name}
                                        />
                                        <small className="text-tertiary mt-2 block">
                                            Файл должен быть в формате .txt, с именем каждого студента на отдельной строке. Все студенты будут добавлены в выбранную группу.
                                        </small>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {isEditMode && (
                        <div className="form-group">
                            <label htmlFor="fio" className="form-label">Имя студента <span className="text-danger">*</span></label>
                            <input
                                type="text"
                                id="fio"
                                name="fio"
                                value={formData.fio}
                                onChange={handleChange}
                                required
                                className="form-control"
                                placeholder="Введите полное имя студента"
                            />
                        </div>
                    )}

                    {isBatchMode && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium">Студенты для создания ({batchStudents.length})</h3>
                                <div className="badge bg-primary-lighter text-primary">Группа: {formData.group_name}</div>
                            </div>

                            <div className="bg-bg-dark-secondary border border-border-color rounded-lg p-4 max-h-60 overflow-y-auto">
                                <ol className="list-decimal pl-5 space-y-1">
                                    {batchStudents.map((student, index) => (
                                        <li key={index} className="text-secondary">
                                            <span className="text-primary">{student.fio}</span>
                                        </li>
                                    ))}
                                </ol>
                            </div>

                            <button
                                type="button"
                                onClick={cancelBatchMode}
                                className="btn btn-outline flex items-center gap-2"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="15" y1="9" x2="9" y2="15"></line>
                                    <line x1="9" y1="9" x2="15" y2="15"></line>
                                </svg>
                                Отменить пакетное создание
                            </button>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-3 pt-4 border-t border-border-color">
                        <button
                            type="submit"
                            className="btn btn-primary flex items-center gap-2"
                            disabled={createMutation.isPending || updateMutation.isPending || batchCreateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending || batchCreateMutation.isPending ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    Сохранение...
                                </>
                            ) : isEditMode ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    Обновить студента
                                </>
                            ) : isBatchMode ? (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                                        <circle cx="9" cy="7" r="4"></circle>
                                        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                                        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                                    </svg>
                                    Создать {batchStudents.length} студентов
                                </>
                            ) : (
                                <>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                    Создать студента
                                </>
                            )}
                        </button>
                        <Link to="/students" className="btn btn-secondary flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>

            {/* Пользовательские стили */}
            <style jsx="true">{`
                .file-input {
                    color: var(--text-secondary);
                    background-color: var(--bg-dark-secondary);
                    border-color: var(--border-color);
                    cursor: pointer;
                    transition: all var(--transition-fast) ease;
                }
                
                .file-input:hover:not(:disabled) {
                    background-color: var(--bg-dark-tertiary);
                    border-color: var(--border-color-light);
                }
                
                .file-input:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
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

export default StudentForm;