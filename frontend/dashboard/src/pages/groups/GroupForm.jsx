import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupService, studentService } from '../../services/api';

function GroupForm() {
    const { name } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!name;
    const decodedName = isEditMode ? decodeURIComponent(name) : '';
    const fileInputRef = useRef(null);

    // Состояние формы
    const [groupName, setGroupName] = useState('');
    const [students, setStudents] = useState([{ id: Date.now(), fio: '' }]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');

    // Загрузка данных группы в режиме редактирования
    const { data: groupData, isLoading: groupLoading } = useQuery({
        queryKey: ['group', decodedName],
        queryFn: () => groupService.getGroup(decodedName),
        enabled: isEditMode
    });

    // Загрузка студентов в группе в режиме редактирования
    const { data: studentsData, isLoading: studentsLoading } = useQuery({
        queryKey: ['group-students', decodedName],
        queryFn: () => groupService.getStudentsInGroup(decodedName),
        enabled: isEditMode
    });

    // Мутация для создания
    const createMutation = useMutation({
        mutationFn: (data) => groupService.createGroup(data),
        onSuccess: () => {
            setSuccess('Группа успешно создана');
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setTimeout(() => navigate('/groups'), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось создать группу');
        }
    });

    // Мутация для обновления
    const updateMutation = useMutation({
        mutationFn: ({ oldName, newName }) => groupService.updateGroup(oldName, { new_name: newName }),
        onSuccess: () => {
            setSuccess('Группа успешно обновлена');
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            setTimeout(() => navigate('/groups'), 1500);
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось обновить группу');
        }
    });

    // Мутация для добавления студента
    const addStudentMutation = useMutation({
        mutationFn: (data) => studentService.createStudent(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['groups'] });
            queryClient.invalidateQueries({ queryKey: ['group-students', decodedName] });
        },
        onError: (err) => {
            setError(err.response?.data?.error || 'Не удалось добавить студента');
        }
    });

    // Заполнение формы данными группы в режиме редактирования
    useEffect(() => {
        if (isEditMode && groupData?.data?.data) {
            setGroupName(decodedName);
        }
    }, [isEditMode, groupData, decodedName]);

    // Заполнение студентов в режиме редактирования
    useEffect(() => {
        if (isEditMode && studentsData?.data?.data) {
            const existingStudents = studentsData.data.data;
            if (existingStudents && existingStudents.length > 0) {
                // Мы не изменяем существующих студентов в режиме редактирования
                // Они отображаются в режиме только для чтения в GroupDetail
            }
        }
    }, [isEditMode, studentsData]);

    const handleAddStudent = () => {
        setStudents([...students, { id: Date.now(), fio: '' }]);
    };

    const handleRemoveStudent = (id) => {
        if (students.length > 1) {
            setStudents(students.filter(student => student.id !== id));
        }
    };

    const handleStudentChange = (id, value) => {
        setStudents(students.map(student =>
            student.id === id ? { ...student, fio: value } : student
        ));
    };

    // Обработка загрузки файла со списком студентов
    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Сброс статуса и ошибок
        setUploadStatus('');
        setError('');

        // Проверка, является ли это текстовым файлом
        if (file.type !== 'text/plain') {
            setError('Пожалуйста, загрузите текстовый файл (.txt)');
            // Сброс поля ввода файла
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
                const lines = content.split('\\n');

                // Фильтрация пустых строк и удаление пробелов
                const validNames = lines
                    .map(line => line.trim())
                    .filter(line => line.length > 0);

                if (validNames.length === 0) {
                    setError('В файле не найдены корректные имена студентов');
                    setUploadStatus('');
                    return;
                }

                // Создание объектов студентов для каждого допустимого имени
                const newStudents = validNames.map(name => ({
                    id: Date.now() + Math.random(), // Обеспечение уникальных ID
                    fio: name
                }));

                // Замена текущего списка студентов, если он содержит только одного пустого студента
                // В противном случае добавление к существующему списку
                if (students.length === 1 && !students[0].fio) {
                    setStudents(newStudents);
                } else {
                    setStudents([...students, ...newStudents]);
                }

                setUploadStatus(`Успешно добавлено ${validNames.length} студентов из файла`);

                // Сброс поля ввода файла
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

    const validateForm = () => {
        setError('');
        setSuccess('');

        if (!groupName.trim()) {
            setError('Название группы обязательно');
            return false;
        }

        if (!isEditMode) {
            // В режиме создания проверяем студентов
            const emptyStudents = students.filter(student => !student.fio.trim());
            if (emptyStudents.length > 0) {
                setError('Все имена студентов должны быть заполнены или удалены');
                return false;
            }
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (isEditMode) {
            // Обновление имени группы
            if (groupName !== decodedName) {
                updateMutation.mutate({ oldName: decodedName, newName: groupName });
            } else {
                navigate(`/groups/${encodeURIComponent(groupName)}`);
            }
        } else {
            // Создание группы
            try {
                const response = await createMutation.mutateAsync({
                    name: groupName,
                    students: students.map(s => s.fio)
                });

                if (response.data.success) {
                    setSuccess('Группа успешно создана');
                    setTimeout(() => navigate('/groups'), 1500);
                }
            } catch (err) {
                setError(err.response?.data?.error || 'Не удалось создать группу');
            }
        }
    };

    // Состояние загрузки в режиме редактирования
    if (isEditMode && (groupLoading || studentsLoading)) {
        return <div className="loader">Загрузка...</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>{isEditMode ? 'Редактировать группу' : 'Создать группу'}</h1>
                <Link to="/groups" className="btn btn-secondary">Назад к группам</Link>
            </div>

            <div className="card">
                {error && <div className="alert alert-danger">{error}</div>}
                {success && <div className="alert alert-success">{success}</div>}
                {uploadStatus && <div className="alert alert-info">{uploadStatus}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="groupName">Название группы</label>
                        <input
                            type="text"
                            id="groupName"
                            value={groupName}
                            onChange={(e) => setGroupName(e.target.value)}
                            required
                            className="form-control"
                        />
                    </div>

                    {!isEditMode && (
                        <div className="form-group">
                            <label>Студенты (опционально)</label>

                            {/* Загрузка файла со списком студентов */}
                            <div style={{ marginBottom: '15px', border: '1px dashed #ccc', padding: '15px', borderRadius: '5px' }}>
                                <h4>Загрузить список студентов</h4>
                                <p className="text-muted">Загрузите текстовый файл с одним именем студента на строку</p>
                                <input
                                    type="file"
                                    accept=".txt"
                                    onChange={handleFileUpload}
                                    ref={fileInputRef}
                                    className="form-control"
                                />
                                <small className="form-text text-muted">
                                    Файл должен быть в формате .txt с именем каждого студента на отдельной строке
                                </small>
                            </div>

                            <h4>Ручное добавление студентов</h4>
                            {students.map((student, index) => (
                                <div key={student.id} style={{ display: 'flex', marginBottom: '10px' }}>
                                    <input
                                        type="text"
                                        value={student.fio}
                                        onChange={(e) => handleStudentChange(student.id, e.target.value)}
                                        placeholder={`Имя студента ${index + 1}`}
                                        className="form-control"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveStudent(student.id)}
                                        className="btn btn-danger"
                                        style={{ marginLeft: '10px' }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={handleAddStudent}
                                className="btn btn-secondary"
                            >
                                Добавить студента
                            </button>
                            <small className="form-text text-muted">
                                Вы также можете добавить студентов позже со страницы деталей группы.
                            </small>
                        </div>
                    )}

                    <div className="form-actions" style={{ marginTop: '20px' }}>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createMutation.isPending || updateMutation.isPending}
                        >
                            {(createMutation.isPending || updateMutation.isPending)
                                ? 'Сохранение...'
                                : isEditMode ? 'Обновить группу' : 'Создать группу'}
                        </button>
                        <Link to="/groups" className="btn btn-secondary" style={{ marginLeft: '10px' }}>
                            Отмена
                        </Link>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default GroupForm;