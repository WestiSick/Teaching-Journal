import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testingService, groupService } from '../../services/api';

function TestForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const isEditing = !!id;
    const editQuestionId = location.state?.editQuestionId;

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        subject: '',
        description: '',
        max_attempts: 3,
        time_per_question: 60,
        active: true,
        groups_allowed: []
    });

    // Question editing state
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [questionFormData, setQuestionFormData] = useState({
        question_text: '',
        question_order: 0,
        answers: [
            { answer_text: '', is_correct: true },
            { answer_text: '', is_correct: false }
        ]
    });

    // Fetch groups
    const { data: groupsData } = useQuery({
        queryKey: ['groups'],
        queryFn: groupService.getGroups
    });

    // Fetch test when editing
    const { data: testData, isLoading: isTestLoading } = useQuery({
        queryKey: ['test', id],
        queryFn: () => testingService.getTest(id),
        enabled: isEditing
    });

    // Create test mutation
    const createTestMutation = useMutation({
        mutationFn: (data) => testingService.createTest(data),
        onSuccess: (response) => {
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            const newTestId = response.data.data.id;
            navigate(`/tests/${newTestId}`);
        }
    });

    // Update test mutation
    const updateTestMutation = useMutation({
        mutationFn: (data) => testingService.updateTest(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            queryClient.invalidateQueries({ queryKey: ['test', id] });
            navigate(`/tests/${id}`);
        }
    });

    // Add question mutation
    const addQuestionMutation = useMutation({
        mutationFn: (data) => testingService.addQuestion(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
            resetQuestionForm();
        }
    });

    // Update question mutation
    const updateQuestionMutation = useMutation({
        mutationFn: ({ questionId, data }) => testingService.updateQuestion(id, questionId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
            resetQuestionForm();
        }
    });

    // If editing, populate form with test data
    useEffect(() => {
        if (isEditing && testData) {
            const test = testData.data.data;
            setFormData({
                title: test.title || '',
                subject: test.subject || '',
                description: test.description || '',
                max_attempts: test.max_attempts || 3,
                time_per_question: test.time_per_question || 60,
                active: test.active ?? true,
                groups_allowed: test.groups_allowed || []
            });

            // If there's a question to edit from URL state
            if (editQuestionId && test.questions) {
                const questionToEdit = test.questions.find(q => q.id === parseInt(editQuestionId));
                if (questionToEdit) {
                    setEditingQuestion(questionToEdit);
                    setQuestionFormData({
                        question_text: questionToEdit.question_text || '',
                        question_order: questionToEdit.question_order || 0,
                        answers: questionToEdit.answers || []
                    });
                }
            }
        }
    }, [isEditing, testData, editQuestionId]);

    // Handle input change
    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : (type === 'number' ? parseInt(value) : value)
        });
    };

    // Handle group selection
    const handleGroupChange = (e) => {
        const { value, checked } = e.target;
        if (checked) {
            setFormData({
                ...formData,
                groups_allowed: [...formData.groups_allowed, value]
            });
        } else {
            setFormData({
                ...formData,
                groups_allowed: formData.groups_allowed.filter(group => group !== value)
            });
        }
    };

    // Handle question form input change
    const handleQuestionInputChange = (e) => {
        const { name, value, type } = e.target;
        setQuestionFormData({
            ...questionFormData,
            [name]: type === 'number' ? parseInt(value) : value
        });
    };

    // Add another answer option
    const addAnswer = () => {
        setQuestionFormData({
            ...questionFormData,
            answers: [...questionFormData.answers, { answer_text: '', is_correct: false }]
        });
    };

    // Remove an answer
    const removeAnswer = (index) => {
        if (questionFormData.answers.length <= 2) {
            return; // Keep at least 2 answers
        }

        const updatedAnswers = [...questionFormData.answers];
        updatedAnswers.splice(index, 1);

        // Make sure at least one answer is correct
        const hasCorrectAnswer = updatedAnswers.some(answer => answer.is_correct);
        if (!hasCorrectAnswer && updatedAnswers.length > 0) {
            updatedAnswers[0].is_correct = true;
        }

        setQuestionFormData({
            ...questionFormData,
            answers: updatedAnswers
        });
    };

    // Handle answer text change
    const handleAnswerChange = (index, value) => {
        const updatedAnswers = [...questionFormData.answers];
        updatedAnswers[index].answer_text = value;
        setQuestionFormData({
            ...questionFormData,
            answers: updatedAnswers
        });
    };

    // Handle correct answer selection
    const handleCorrectAnswerChange = (index) => {
        const updatedAnswers = questionFormData.answers.map((answer, i) => ({
            ...answer,
            is_correct: i === index
        }));

        setQuestionFormData({
            ...questionFormData,
            answers: updatedAnswers
        });
    };

    // Reset question form
    const resetQuestionForm = () => {
        setEditingQuestion(null);
        setQuestionFormData({
            question_text: '',
            question_order: 0,
            answers: [
                { answer_text: '', is_correct: true },
                { answer_text: '', is_correct: false }
            ]
        });
    };

    // Handle test form submission
    const handleSubmit = (e) => {
        e.preventDefault();
        if (isEditing) {
            updateTestMutation.mutate(formData);
        } else {
            createTestMutation.mutate(formData);
        }
    };

    // Handle question form submission
    const handleQuestionSubmit = (e) => {
        e.preventDefault();
        if (editingQuestion) {
            updateQuestionMutation.mutate({
                questionId: editingQuestion.id,
                data: questionFormData
            });
        } else {
            addQuestionMutation.mutate(questionFormData);
        }
    };

    // Check if loading
    if (isEditing && isTestLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    const groups = groupsData?.data?.data || [];

    return (
        <div>
            <div className="page-header">
                <div>
                    <h1 className="page-title">{isEditing ? 'Edit Test' : 'Create New Test'}</h1>
                    <p className="text-secondary">
                        {isEditing
                            ? 'Update test details, questions, and settings'
                            : 'Create a new test for your students'}
                    </p>
                </div>
                <Link to={isEditing ? `/tests/${id}` : '/tests'} className="btn btn-outline">
                    Cancel
                </Link>
            </div>

            <div className="card mb-6">
                <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="form-group">
                            <label className="form-label" htmlFor="title">Test Title</label>
                            <input
                                id="title"
                                name="title"
                                type="text"
                                className="form-control"
                                value={formData.title}
                                onChange={handleInputChange}
                                placeholder="Enter test title"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="subject">Subject</label>
                            <input
                                id="subject"
                                name="subject"
                                type="text"
                                className="form-control"
                                value={formData.subject}
                                onChange={handleInputChange}
                                placeholder="e.g. Mathematics, Physics"
                                required
                            />
                        </div>

                        <div className="form-group col-span-2">
                            <label className="form-label" htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                className="form-control"
                                value={formData.description}
                                onChange={handleInputChange}
                                placeholder="Enter test description"
                                rows={3}
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="max_attempts">Maximum Attempts</label>
                            <input
                                id="max_attempts"
                                name="max_attempts"
                                type="number"
                                className="form-control"
                                value={formData.max_attempts}
                                onChange={handleInputChange}
                                min="1"
                                required
                            />
                            <small className="text-tertiary">How many times a student can take this test</small>
                        </div>

                        <div className="form-group">
                            <label className="form-label" htmlFor="time_per_question">Time per Question (seconds)</label>
                            <input
                                id="time_per_question"
                                name="time_per_question"
                                type="number"
                                className="form-control"
                                value={formData.time_per_question}
                                onChange={handleInputChange}
                                min="10"
                                required
                            />
                            <small className="text-tertiary">Time allowed for each question in seconds</small>
                        </div>

                        <div className="form-group">
                            <div className="d-flex align-items-center gap-2">
                                <input
                                    id="active"
                                    name="active"
                                    type="checkbox"
                                    checked={formData.active}
                                    onChange={handleInputChange}
                                />
                                <label className="form-label mb-0" htmlFor="active">Active</label>
                            </div>
                            <small className="text-tertiary">
                                If checked, this test will be available to students in selected groups
                            </small>
                        </div>
                    </div>

                    <div className="form-group mt-4">
                        <label className="form-label">Assign to Groups</label>
                        <small className="text-tertiary d-block mb-2">
                            Select the groups that should have access to this test
                        </small>

                        {groups.length === 0 ? (
                            <div className="text-tertiary">
                                No groups available. Create groups first.
                            </div>
                        ) : (
                            <div className="groups-grid">
                                {groups.map((group, idx) => (
                                    <div key={idx} className="group-checkbox">
                                        <input
                                            type="checkbox"
                                            id={`group-${idx}`}
                                            value={group.name}
                                            checked={formData.groups_allowed.includes(group.name)}
                                            onChange={handleGroupChange}
                                        />
                                        <label htmlFor={`group-${idx}`}>{group.name}</label>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="form-group mt-4">
                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={createTestMutation.isPending || updateTestMutation.isPending}
                        >
                            {createTestMutation.isPending || updateTestMutation.isPending
                                ? 'Saving...'
                                : isEditing ? 'Update Test' : 'Create Test'}
                        </button>
                    </div>
                </form>
            </div>

            {isEditing && (
                <>
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h2 className="text-xl font-semibold">
                            {editingQuestion ? 'Edit Question' : 'Add New Question'}
                        </h2>
                        {editingQuestion && (
                            <button
                                className="btn btn-outline"
                                onClick={resetQuestionForm}
                            >
                                Cancel Editing
                            </button>
                        )}
                    </div>

                    <div className="card mb-6">
                        <form onSubmit={handleQuestionSubmit}>
                            <div className="form-group">
                                <label className="form-label">Question Text</label>
                                <textarea
                                    name="question_text"
                                    className="form-control"
                                    value={questionFormData.question_text}
                                    onChange={handleQuestionInputChange}
                                    placeholder="Enter your question here"
                                    required
                                    rows={3}
                                ></textarea>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Question Order</label>
                                <input
                                    name="question_order"
                                    type="number"
                                    className="form-control"
                                    value={questionFormData.question_order}
                                    onChange={handleQuestionInputChange}
                                    min="0"
                                />
                                <small className="text-tertiary">Leave as 0 to place at the end</small>
                            </div>

                            <div className="form-group">
                                <label className="form-label">Answer Options</label>
                                <small className="text-tertiary d-block mb-2">Select one option as the correct answer</small>

                                {questionFormData.answers.map((answer, index) => (
                                    <div key={index} className="answer-option mb-2">
                                        <div className="d-flex gap-2 align-items-center">
                                            <div className="radio-container">
                                                <input
                                                    type="radio"
                                                    name="correct-answer"
                                                    checked={answer.is_correct}
                                                    onChange={() => handleCorrectAnswerChange(index)}
                                                />
                                            </div>
                                            <input
                                                type="text"
                                                className="form-control"
                                                value={answer.answer_text}
                                                onChange={(e) => handleAnswerChange(index, e.target.value)}
                                                placeholder={`Answer option ${index + 1}`}
                                                required
                                            />
                                            <button
                                                type="button"
                                                className="btn btn-sm btn-outline text-danger"
                                                onClick={() => removeAnswer(index)}
                                                disabled={questionFormData.answers.length <= 2}
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <line x1="18" y1="6" x2="6" y2="18"></line>
                                                    <line x1="6" y1="6" x2="18" y2="18"></line>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <button
                                    type="button"
                                    className="btn btn-sm btn-outline mt-2"
                                    onClick={addAnswer}
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <line x1="12" y1="5" x2="12" y2="19"></line>
                                        <line x1="5" y1="12" x2="19" y2="12"></line>
                                    </svg>
                                    <span>Add Answer Option</span>
                                </button>
                            </div>

                            <div className="form-group mt-4">
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                    disabled={addQuestionMutation.isPending || updateQuestionMutation.isPending}
                                >
                                    {addQuestionMutation.isPending || updateQuestionMutation.isPending
                                        ? 'Saving...'
                                        : editingQuestion ? 'Update Question' : 'Add Question'}
                                </button>
                            </div>
                        </form>
                    </div>

                    {testData?.data?.data?.questions?.length > 0 && !editingQuestion && (
                        <div className="questions-overview">
                            <h2 className="text-xl font-semibold mb-4">Existing Questions</h2>
                            <div className="questions-list">
                                {testData.data.data.questions.map((question, idx) => (
                                    <div key={question.id} className="question-item-mini">
                                        <div className="question-mini-header">
                                            <div className="question-number">Q{question.question_order}: {question.question_text}</div>
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => {
                                                    setEditingQuestion(question);
                                                    setQuestionFormData({
                                                        question_text: question.question_text || '',
                                                        question_order: question.question_order || 0,
                                                        answers: question.answers || []
                                                    });
                                                }}
                                            >
                                                Edit
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <style jsx="true">{`
                .groups-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 1rem;
                }
                
                .group-checkbox {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .group-checkbox label {
                    margin-bottom: 0;
                    cursor: pointer;
                }
                
                .questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 0.75rem;
                }
                
                .question-item-mini {
                    padding: 0.75rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                    border: 1px solid var(--border-color);
                }
                
                .question-mini-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .radio-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                }
                
                @media (max-width: 768px) {
                    .grid-cols-2 {
                        grid-template-columns: 1fr;
                    }
                    
                    .col-span-2 {
                        grid-column: span 1;
                    }
                    
                    .groups-grid {
                        grid-template-columns: repeat(2, 1fr);
                    }
                }
                
                @media (max-width: 640px) {
                    .groups-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

export default TestForm;