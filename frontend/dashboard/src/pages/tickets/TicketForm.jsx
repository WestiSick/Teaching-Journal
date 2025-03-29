import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ticketService } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

function TicketForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const fileInputRef = useRef(null);

    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        priority: 'Medium',
        status: 'New',
        assigned_to: null
    });

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [formErrors, setFormErrors] = useState({});
    const [submitError, setSubmitError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data: ticketData, isLoading: ticketLoading } = useQuery({
        queryKey: ['ticket', id],
        queryFn: () => ticketService.getTicket(id),
        enabled: isEditMode,
        onSuccess: (response) => {
            const ticket = response.data.data;
            setFormData({
                title: ticket.title || '',
                description: ticket.description || '',
                category: ticket.category || '',
                priority: ticket.priority || 'Medium',
                status: ticket.status || 'New',
                assigned_to: ticket.assigned_to
            });
        }
    });

    const createTicketMutation = useMutation({
        mutationFn: (data) => ticketService.createTicket(data),
        onSuccess: (response) => {
            const newTicketId = response.data.data.id;

            if (selectedFiles.length > 0) {
                uploadFiles(newTicketId);
            } else {
                navigate(`/tickets/${newTicketId}`);
            }
        },
        onError: (error) => {
            setSubmitError('Не удалось создать тикет. Пожалуйста, попробуйте снова.');
            setIsSubmitting(false);
        }
    });

    const updateTicketMutation = useMutation({
        mutationFn: (data) => ticketService.updateTicket(id, data),
        onSuccess: () => {
            if (selectedFiles.length > 0) {
                uploadFiles(id);
            } else {
                navigate(`/tickets/${id}`);
            }
        },
        onError: (error) => {
            setSubmitError('Не удалось обновить тикет. Пожалуйста, попробуйте снова.');
            setIsSubmitting(false);
        }
    });

    const handleChange = (e) => {
        const { name, value } = e.target;

        // For the assigned_to field, convert to number or null
        if (name === 'assigned_to') {
            setFormData(prev => ({
                ...prev,
                [name]: value === '' ? null : parseInt(value, 10)
            }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: value
            }));
        }

        if (formErrors[name]) {
            setFormErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[name];
                return newErrors;
            });
        }
    };

    const handleFileSelect = (e) => {
        setSelectedFiles([...e.target.files]);
    };

    const uploadFiles = async (ticketId) => {
        try {
            for (const file of selectedFiles) {
                const formData = new FormData();
                formData.append('attachment', file);

                await ticketService.addAttachment(ticketId, formData);
            }

            // Navigate to ticket detail page after uploads complete
            navigate(`/tickets/${ticketId}`);
        } catch (error) {
            // Still navigate to the ticket page even if file upload fails
            navigate(`/tickets/${ticketId}`);
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!formData.title.trim()) {
            errors.title = 'Заголовок обязателен';
        }

        if (!formData.description.trim()) {
            errors.description = 'Описание обязательно';
        }

        if (!formData.category) {
            errors.category = 'Категория обязательна';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitError('');

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        if (isEditMode) {
            updateTicketMutation.mutate(formData);
        } else {
            createTicketMutation.mutate(formData);
        }
    };

    if (isEditMode && ticketLoading) {
        return (
            <div className="flex justify-center items-center p-8">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEditMode ? 'Редактировать тикет' : 'Создать новый тикет'}</h1>
                    <p className="text-secondary">
                        {isEditMode
                            ? `Редактирование тикета #${id}`
                            : 'Отправить новый тикет в службу поддержки'}
                    </p>
                </div>
                <Link to={isEditMode ? `/tickets/${id}` : "/tickets"} className="btn btn-secondary">
                    Отмена
                </Link>
            </div>

            <div className="card">
                <form onSubmit={handleSubmit}>
                    {/* Title */}
                    <div className="form-group">
                        <label htmlFor="title" className="form-label">Заголовок *</label>
                        <input
                            type="text"
                            id="title"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className={`form-control ${formErrors.title ? 'border-danger' : ''}`}
                            placeholder="Введите описательный заголовок"
                        />
                        {formErrors.title && <p className="text-danger mt-1 text-sm">{formErrors.title}</p>}
                    </div>

                    {/* Description */}
                    <div className="form-group">
                        <label htmlFor="description" className="form-label">Описание *</label>
                        <textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            className={`form-control ${formErrors.description ? 'border-danger' : ''}`}
                            placeholder="Подробно опишите вашу проблему"
                            rows="6"
                        ></textarea>
                        {formErrors.description && <p className="text-danger mt-1 text-sm">{formErrors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Category */}
                        <div className="form-group">
                            <label htmlFor="category" className="form-label">Категория *</label>
                            <select
                                id="category"
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className={`form-control ${formErrors.category ? 'border-danger' : ''}`}
                            >
                                <option value="">Выберите категорию</option>
                                <option value="Technical">Техническая</option>
                                <option value="Administrative">Административная</option>
                                <option value="Account">Аккаунт</option>
                                <option value="Feature">Запрос функции</option>
                                <option value="Bug">Сообщение об ошибке</option>
                                <option value="Other">Другое</option>
                            </select>
                            {formErrors.category && <p className="text-danger mt-1 text-sm">{formErrors.category}</p>}
                        </div>

                        {/* Priority */}
                        <div className="form-group">
                            <label htmlFor="priority" className="form-label">Приоритет</label>
                            <select
                                id="priority"
                                name="priority"
                                value={formData.priority}
                                onChange={handleChange}
                                className="form-control"
                            >
                                <option value="Low">Низкий</option>
                                <option value="Medium">Средний</option>
                                <option value="High">Высокий</option>
                                <option value="Critical">Критический</option>
                            </select>
                        </div>
                    </div>

                    {/* Admin Only Fields */}
                    {currentUser?.role === 'admin' && isEditMode && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Status */}
                            <div className="form-group">
                                <label htmlFor="status" className="form-label">Статус</label>
                                <select
                                    id="status"
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="form-control"
                                >
                                    <option value="New">Новый</option>
                                    <option value="Open">Открыт</option>
                                    <option value="InProgress">В работе</option>
                                    <option value="Resolved">Решен</option>
                                    <option value="Closed">Закрыт</option>
                                </select>
                            </div>

                            {/* Assigned To */}
                            <div className="form-group">
                                <label htmlFor="assigned_to" className="form-label">Назначен</label>
                                <input
                                    type="number"
                                    id="assigned_to"
                                    name="assigned_to"
                                    value={formData.assigned_to || ''}
                                    onChange={handleChange}
                                    className="form-control"
                                    placeholder="ID пользователя (оставьте пустым для неназначенных)"
                                />
                                <p className="text-text-tertiary mt-1 text-sm">Введите ID администратора для назначения</p>
                            </div>
                        </div>
                    )}

                    {/* File Attachments */}
                    <div className="form-group">
                        <label className="form-label">Вложения</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="file"
                                ref={fileInputRef}
                                multiple
                                onChange={handleFileSelect}
                                className="hidden"
                                id="file-upload"
                            />
                            <label htmlFor="file-upload" className="btn btn-outline cursor-pointer">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                    <polyline points="17 8 12 3 7 8"></polyline>
                                    <line x1="12" y1="3" x2="12" y2="15"></line>
                                </svg>
                                Выбрать файлы
                            </label>
                            {selectedFiles.length > 0 && (
                                <span>{selectedFiles.length} файл(ов) выбрано</span>
                            )}
                        </div>
                        {selectedFiles.length > 0 && (
                            <div className="mt-3">
                                <p className="text-sm font-medium mb-2">Выбранные файлы:</p>
                                <ul className="bg-bg-dark-tertiary p-3 rounded-lg">
                                    {Array.from(selectedFiles).map((file, index) => (
                                        <li key={index} className="mb-1 last:mb-0 text-sm">
                                            {file.name} ({(file.size / 1024).toFixed(1)} КБ)
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    {/* Error Message */}
                    {submitError && (
                        <div className="alert alert-danger mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <span>{submitError}</span>
                        </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-end gap-2 mt-4">
                        <Link to={isEditMode ? `/tickets/${id}` : "/tickets"} className="btn btn-secondary">
                            Отмена
                        </Link>
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <div className="spinner spinner-sm mr-2"></div>
                                    {isEditMode ? 'Обновление...' : 'Создание...'}
                                </>
                            ) : (
                                isEditMode ? 'Обновить тикет' : 'Создать тикет'
                            )}
                        </button>
                    </div>
                </form>
            </div>

            <style jsx="true">{`
                .spinner-sm {
                    width: 1rem;
                    height: 1rem;
                    border: 2px solid var(--bg-dark-tertiary);
                    border-radius: 50%;
                    border-top-color: var(--text-primary);
                    animation: spin 1s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
}

export default TicketForm;