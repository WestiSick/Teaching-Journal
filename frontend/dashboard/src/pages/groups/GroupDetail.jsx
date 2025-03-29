import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { groupService, lessonService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RequireSubscription } from '../../components/RequireSubscription';

function GroupDetail() {
    const { name } = useParams();
    const { isFree } = useAuth();
    const navigate = useNavigate();
    const decodedName = decodeURIComponent(name);

    // Загрузка данных группы
    const { data: groupData, isLoading: groupLoading, error: groupError } = useQuery({
        queryKey: ['group', decodedName],
        queryFn: () => groupService.getGroup(decodedName)
    });

    // Загрузка студентов в группе
    const { data: studentsData, isLoading: studentsLoading, error: studentsError } = useQuery({
        queryKey: ['group-students', decodedName],
        queryFn: () => groupService.getStudentsInGroup(decodedName),
        enabled: !groupLoading && !groupError
    });

    // Загрузка занятий для этой группы
    const { data: lessonsData, isLoading: lessonsLoading, error: lessonsError } = useQuery({
        queryKey: ['lessons', { group: decodedName }],
        queryFn: () => lessonService.getLessons({ group: decodedName }),
        enabled: !groupLoading && !groupError
    });

    const group = groupData?.data?.data;
    const students = studentsData?.data?.data || [];
    const lessons = lessonsData?.data?.data || [];

    const handleDelete = async () => {
        if (window.confirm(`Вы уверены, что хотите удалить группу "${decodedName}"? Это действие удалит все связанные данные.`)) {
            try {
                await groupService.deleteGroup(decodedName);
                navigate('/groups');
            } catch (error) {
                alert('Не удалось удалить группу');
            }
        }
    };

    if (groupLoading) {
        return <div className="loader">Загрузка...</div>;
    }

    if (groupError) {
        return <div className="alert alert-danger">Ошибка загрузки группы: {groupError.message}</div>;
    }

    if (!group) {
        return <div className="alert alert-warning">Группа не найдена</div>;
    }

    return (
        <div>
            <div className="page-header">
                <h1>Группа: {decodedName}</h1>
                <div>
                    <Link to="/groups" className="btn btn-secondary">Назад к списку групп</Link>
                    <RequireSubscription>
                        <Link to={`/groups/${encodeURIComponent(decodedName)}/edit`} className="btn btn-primary" style={{ marginLeft: '10px' }}>
                            Редактировать группу
                        </Link>
                        <button
                            onClick={handleDelete}
                            className="btn btn-danger"
                            style={{ marginLeft: '10px' }}
                        >
                            Удалить группу
                        </button>
                    </RequireSubscription>
                </div>
            </div>

            <div className="card">
                <h2>Информация о группе</h2>
                <p><strong>Всего студентов:</strong> {group.student_count || students.length || 0}</p>
                {group.subjects && group.subjects.length > 0 && (
                    <div>
                        <h3>Предметы</h3>
                        <ul>
                            {group.subjects.map(subject => (
                                <li key={subject}>{subject}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Список студентов */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <h2>Студенты</h2>
                    <RequireSubscription>
                        <Link to="/students/new" className="btn btn-primary"
                              onClick={() => localStorage.setItem('preselectedGroup', decodedName)}>
                            Добавить студента
                        </Link>
                    </RequireSubscription>
                </div>

                {studentsLoading ? (
                    <p>Загрузка студентов...</p>
                ) : studentsError ? (
                    <div className="alert alert-danger">Ошибка загрузки студентов: {studentsError.message}</div>
                ) : students.length === 0 ? (
                    <p>В этой группе нет студентов</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Имя</th>
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {students.map(student => (
                                <tr key={student.id}>
                                    <td>{student.fio}</td>
                                    <td>
                                        <RequireSubscription>
                                            <Link to={`/students/${student.id}`} className="btn btn-sm btn-secondary">
                                                Просмотр
                                            </Link>
                                        </RequireSubscription>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Недавние занятия */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="d-flex justify-content-between align-items-center">
                    <h2>Недавние занятия</h2>
                    <RequireSubscription>
                        <Link to="/lessons/new" className="btn btn-primary"
                              onClick={() => localStorage.setItem('preselectedGroup', decodedName)}>
                            Добавить занятие
                        </Link>
                    </RequireSubscription>
                </div>

                {lessonsLoading ? (
                    <p>Загрузка занятий...</p>
                ) : lessonsError ? (
                    <div className="alert alert-danger">Ошибка загрузки занятий: {lessonsError.message}</div>
                ) : lessons.length === 0 ? (
                    <p>Для этой группы еще нет занятий</p>
                ) : (
                    <div className="table-responsive">
                        <table className="table">
                            <thead>
                            <tr>
                                <th>Дата</th>
                                <th>Предмет</th>
                                <th>Тема</th>
                                <th>Тип</th>
                                <th>Действия</th>
                            </tr>
                            </thead>
                            <tbody>
                            {lessons.slice(0, 5).map(lesson => (
                                <tr key={lesson.id}>
                                    <td>{new Date(lesson.date).toLocaleDateString()}</td>
                                    <td>{lesson.subject}</td>
                                    <td>{lesson.topic}</td>
                                    <td>{lesson.type}</td>
                                    <td>
                                        <Link to={`/lessons/${lesson.id}`} className="btn btn-sm btn-secondary">
                                            Просмотр
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                        {lessons.length > 5 && (
                            <div style={{ textAlign: 'center', marginTop: '10px' }}>
                                <Link to="/lessons" className="btn btn-sm btn-secondary"
                                      onClick={() => localStorage.setItem('preselectedGroupFilter', decodedName)}>
                                    Показать все занятия
                                </Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

export default GroupDetail;