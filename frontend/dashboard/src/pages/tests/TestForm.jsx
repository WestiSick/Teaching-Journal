import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { adminTestsService } from '../../services/testsService';

function TestForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const isEditMode = !!id;

    const [test, setTest] = useState({
        title: '',
        description: '',
        subject: '',
        time_per_question: 60,
        max_attempts: 1,
        is_active: true,
        questions: []
    });

    const [currentQuestion, setCurrentQuestion] = useState({
        question_text: '',
        question_type: 'multiple_choice',
        position: 1,
        answers: [
            { answer_text: '', is_correct: false },
            { answer_text: '', is_correct: false }
        ]
    });

    const [errors, setErrors] = useState({});
    const [activeTab, setActiveTab] = useState('basic');

    // Fetch test data if in edit mode
    const { data: testData, isLoading } = useQuery({
        queryKey: ['test', id],
        queryFn: () => adminTestsService.getTestDetails(id),
        enabled: isEditMode,
        retry: 1
    });

    // Create test mutation
    const createTestMutation = useMutation({
        mutationFn: (data) => adminTestsService.createTest(data),
        onSuccess: (response) => {
            const newTestId = response.data.data.test_id;
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            navigate(`/tests/${newTestId}`);
        },
        onError: (error) => {
            console.error("Error creating test:", error);
            setErrors(prev => ({
                ...prev,
                form: error.response?.data?.error || "Failed to create test. Please check your input and try again."
            }));
        }
    });

    // Update test mutation
    const updateTestMutation = useMutation({
        mutationFn: ({ id, data }) => adminTestsService.updateTest(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            queryClient.invalidateQueries({ queryKey: ['test', id] });
            navigate(`/tests/${id}`);
        },
        onError: (error) => {
            console.error("Error updating test:", error);
            setErrors(prev => ({
                ...prev,
                form: error.response?.data?.error || "Failed to update test. Please check your input and try again."
            }));
        }
    });

    // Add question mutation
    const addQuestionMutation = useMutation({
        mutationFn: ({ testId, data }) => adminTestsService.addQuestion(testId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
            setCurrentQuestion({
                question_text: '',
                question_type: 'multiple_choice',
                position: test.questions.length + 1,
                answers: [
                    { answer_text: '', is_correct: false },
                    { answer_text: '', is_correct: false }
                ]
            });
        },
        onError: (error) => {
            console.error("Error adding question:", error);
            setErrors(prev => ({
                ...prev,
                question: error.response?.data?.error || "Failed to add question. Please check your input and try again."
            }));
        }
    });

    // Set test data when fetched
    useEffect(() => {
        if (testData && isEditMode) {
            const fetchedTest = testData.data?.data;
            if (fetchedTest) {
                setTest({
                    title: fetchedTest.title || '',
                    description: fetchedTest.description || '',
                    subject: fetchedTest.subject || '',
                    time_per_question: fetchedTest.time_per_question || 60,
                    max_attempts: fetchedTest.max_attempts || 1,
                    is_active: fetchedTest.is_active !== undefined ? fetchedTest.is_active : true,
                    questions: Array.isArray(fetchedTest.questions) ? fetchedTest.questions : []
                });

                // Set position for new question
                setCurrentQuestion(prev => ({
                    ...prev,
                    position: (Array.isArray(fetchedTest.questions) ? fetchedTest.questions.length : 0) + 1
                }));
            }
        }
    }, [testData, isEditMode]);

    const handleTestChange = (e) => {
        const { name, value, type, checked } = e.target;
        setTest(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleQuestionChange = (e) => {
        const { name, value, type, checked } = e.target;
        setCurrentQuestion(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleAnswerChange = (index, field, value) => {
        setCurrentQuestion(prev => {
            const newAnswers = [...prev.answers];
            newAnswers[index] = {
                ...newAnswers[index],
                [field]: value
            };
            return {
                ...prev,
                answers: newAnswers
            };
        });
    };

    const addAnswerOption = () => {
        setCurrentQuestion(prev => ({
            ...prev,
            answers: [...prev.answers, { answer_text: '', is_correct: false }]
        }));
    };

    const removeAnswerOption = (index) => {
        if (currentQuestion.answers.length <= 2) {
            return; // Keep at least 2 options
        }

        setCurrentQuestion(prev => ({
            ...prev,
            answers: prev.answers.filter((_, i) => i !== index)
        }));
    };

    const validateTest = () => {
        const newErrors = {};

        if (!test.title.trim()) newErrors.title = 'Title is required';
        if (!test.subject.trim()) newErrors.subject = 'Subject is required';
        if (test.time_per_question <= 0) newErrors.time_per_question = 'Time must be greater than 0';
        if (test.max_attempts <= 0) newErrors.max_attempts = 'Max attempts must be greater than 0';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const validateQuestion = () => {
        const newErrors = {};

        if (!currentQuestion.question_text.trim()) newErrors.question_text = 'Question text is required';

        // Check if at least one answer is marked as correct
        const hasCorrectAnswer = currentQuestion.answers.some(answer => answer.is_correct);
        if (!hasCorrectAnswer) newErrors.answers = 'At least one answer must be marked as correct';

        // Check if all answers have text
        currentQuestion.answers.forEach((answer, index) => {
            if (!answer.answer_text.trim()) {
                if (!newErrors.answerTexts) newErrors.answerTexts = {};
                newErrors.answerTexts[index] = 'Answer text is required';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!validateTest()) {
            return;
        }

        if (isEditMode) {
            const updateData = {
                title: test.title,
                description: test.description,
                subject: test.subject,
                time_per_question: parseInt(test.time_per_question),
                max_attempts: parseInt(test.max_attempts),
                is_active: test.is_active
            };
            updateTestMutation.mutate({ id, data: updateData });
        } else {
            // Format data for API request
            const createData = {
                title: test.title,
                description: test.description,
                subject: test.subject,
                time_per_question: parseInt(test.time_per_question),
                max_attempts: parseInt(test.max_attempts),
                is_active: test.is_active
            };

            // Only include questions if there are any
            if (test.questions && test.questions.length > 0) {
                createData.questions = test.questions.map(q => ({
                    question_text: q.question_text,
                    question_type: q.question_type,
                    position: q.position,
                    answers: Array.isArray(q.answers) && q.answers.length > 0 ? q.answers.map(a => ({
                        answer_text: a.answer_text,
                        is_correct: a.is_correct
                    })) : []
                }));
            } else {
                createData.questions = [];
            }

            // Log the data being sent
            console.log("Submitting test data:", createData);

            // Send the mutation
            createTestMutation.mutate(createData);
        }
    };

    const handleAddQuestion = (e) => {
        e.preventDefault();

        if (!validateQuestion()) {
            return;
        }

        if (isEditMode) {
            addQuestionMutation.mutate({
                testId: id,
                data: currentQuestion
            });
        } else {
            // For new tests, just add to the local state
            setTest(prev => ({
                ...prev,
                questions: [...prev.questions, currentQuestion]
            }));

            // Reset current question form
            setCurrentQuestion({
                question_text: '',
                question_type: 'multiple_choice',
                position: test.questions.length + 2,
                answers: [
                    { answer_text: '', is_correct: false },
                    { answer_text: '', is_correct: false }
                ]
            });
        }
    };

    const handleCancel = () => {
        navigate(isEditMode ? `/tests/${id}` : '/tests');
    };

    if (isLoading && isEditMode) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div>
            <div className="page-header">
                <h1 className="page-title">{isEditMode ? 'Edit Test' : 'Create New Test'}</h1>
            </div>

            <div className="card">
                <div className="test-form-tabs">
                    <button
                        className={`tab-button ${activeTab === 'basic' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('basic')}
                    >
                        Basic Information
                    </button>
                    <button
                        className={`tab-button ${activeTab === 'questions' ? 'tab-active' : ''}`}
                        onClick={() => setActiveTab('questions')}
                    >
                        Questions
                    </button>
                </div>

                {errors.form && (
                    <div className="alert alert-danger mb-4">
                        {errors.form}
                    </div>
                )}

                {activeTab === 'basic' && (
                    <div className="test-basic-info">
                        <form onSubmit={handleSubmit}>
                            <div className="form-group">
                                <label htmlFor="title">Test Title <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    id="title"
                                    name="title"
                                    className={`form-control ${errors.title ? 'is-invalid' : ''}`}
                                    value={test.title}
                                    onChange={handleTestChange}
                                />
                                {errors.title && <div className="invalid-feedback">{errors.title}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="subject">Subject <span className="text-danger">*</span></label>
                                <input
                                    type="text"
                                    id="subject"
                                    name="subject"
                                    className={`form-control ${errors.subject ? 'is-invalid' : ''}`}
                                    value={test.subject}
                                    onChange={handleTestChange}
                                />
                                {errors.subject && <div className="invalid-feedback">{errors.subject}</div>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="description">Description</label>
                                <textarea
                                    id="description"
                                    name="description"
                                    className="form-control"
                                    value={test.description}
                                    onChange={handleTestChange}
                                    rows="3"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="form-group">
                                    <label htmlFor="time_per_question">Time Per Question (seconds) <span className="text-danger">*</span></label>
                                    <input
                                        type="number"
                                        id="time_per_question"
                                        name="time_per_question"
                                        className={`form-control ${errors.time_per_question ? 'is-invalid' : ''}`}
                                        value={test.time_per_question}
                                        onChange={handleTestChange}
                                        min="1"
                                    />
                                    {errors.time_per_question && <div className="invalid-feedback">{errors.time_per_question}</div>}
                                </div>

                                <div className="form-group">
                                    <label htmlFor="max_attempts">Maximum Attempts <span className="text-danger">*</span></label>
                                    <input
                                        type="number"
                                        id="max_attempts"
                                        name="max_attempts"
                                        className={`form-control ${errors.max_attempts ? 'is-invalid' : ''}`}
                                        value={test.max_attempts}
                                        onChange={handleTestChange}
                                        min="1"
                                    />
                                    {errors.max_attempts && <div className="invalid-feedback">{errors.max_attempts}</div>}
                                </div>
                            </div>

                            <div className="form-group form-check mt-3">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    name="is_active"
                                    className="form-check-input"
                                    checked={test.is_active}
                                    onChange={handleTestChange}
                                />
                                <label className="form-check-label" htmlFor="is_active">Active (visible to students)</label>
                            </div>

                            <div className="form-actions mt-4">
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleCancel}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary ml-2"
                                    disabled={createTestMutation.isPending || updateTestMutation.isPending}
                                >
                                    {(createTestMutation.isPending || updateTestMutation.isPending) ? 'Saving...' : 'Save Test'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {activeTab === 'questions' && (
                    <div className="test-questions">
                        {isEditMode && (
                            <div className="existing-questions mb-4">
                                <h3 className="text-lg font-semibold mb-3">Existing Questions</h3>

                                {!test.questions || test.questions.length === 0 ? (
                                    <p className="text-tertiary">No questions added yet. Use the form below to add questions.</p>
                                ) : (
                                    <div className="questions-list">
                                        {test.questions.map((question, index) => (
                                            <div key={question.id || index} className="question-item">
                                                <div className="question-header">
                                                    <div className="question-number">Q{index + 1}</div>
                                                    <div className="question-text">{question.question_text}</div>
                                                    <div className="question-type">{(question.question_type || '').replace('_', ' ')}</div>
                                                </div>
                                                <div className="question-answers">
                                                    {(Array.isArray(question.answers) ? question.answers : []).map((answer, ansIndex) => (
                                                        <div key={answer.id || ansIndex} className={`answer-item ${answer.is_correct ? 'answer-correct' : ''}`}>
                                                            <span className="answer-indicator">{String.fromCharCode(65 + ansIndex)}.</span>
                                                            <span className="answer-text">{answer.answer_text}</span>
                                                            {answer.is_correct && (
                                                                <span className="answer-correct-badge">Correct</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        <div className="add-question-form">
                            <h3 className="text-lg font-semibold mb-3">Add New Question</h3>

                            {errors.question && (
                                <div className="alert alert-danger mb-4">
                                    {errors.question}
                                </div>
                            )}

                            <form onSubmit={handleAddQuestion}>
                                <div className="form-group">
                                    <label htmlFor="question_text">Question Text <span className="text-danger">*</span></label>
                                    <textarea
                                        id="question_text"
                                        name="question_text"
                                        className={`form-control ${errors.question_text ? 'is-invalid' : ''}`}
                                        value={currentQuestion.question_text}
                                        onChange={handleQuestionChange}
                                        rows="2"
                                    />
                                    {errors.question_text && <div className="invalid-feedback">{errors.question_text}</div>}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label htmlFor="question_type">Question Type</label>
                                        <select
                                            id="question_type"
                                            name="question_type"
                                            className="form-control"
                                            value={currentQuestion.question_type}
                                            onChange={handleQuestionChange}
                                        >
                                            <option value="multiple_choice">Multiple Choice</option>
                                            <option value="single_choice">Single Choice</option>
                                            <option value="text">Text Answer</option>
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label htmlFor="position">Position</label>
                                        <input
                                            type="number"
                                            id="position"
                                            name="position"
                                            className="form-control"
                                            value={currentQuestion.position}
                                            onChange={handleQuestionChange}
                                            min="1"
                                        />
                                    </div>
                                </div>

                                <div className="answer-options mt-4">
                                    <div className="d-flex justify-content-between align-items-center mb-2">
                                        <label className="font-semibold">Answer Options <span className="text-danger">*</span></label>
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-outline"
                                            onClick={addAnswerOption}
                                        >
                                            Add Option
                                        </button>
                                    </div>

                                    {errors.answers && (
                                        <div className="alert alert-danger mb-3">{errors.answers}</div>
                                    )}

                                    {currentQuestion.answers.map((answer, index) => (
                                        <div key={index} className="answer-row">
                                            <div className="form-group mb-2">
                                                <div className="d-flex gap-2">
                                                    <div className="answer-letter">
                                                        {String.fromCharCode(65 + index)}.
                                                    </div>
                                                    <input
                                                        type="text"
                                                        className={`form-control ${errors.answerTexts?.[index] ? 'is-invalid' : ''}`}
                                                        value={answer.answer_text}
                                                        onChange={(e) => handleAnswerChange(index, 'answer_text', e.target.value)}
                                                        placeholder="Answer text"
                                                    />
                                                    <div className="answer-actions d-flex gap-2">
                                                        <div className="form-check">
                                                            <input
                                                                type="checkbox"
                                                                id={`is_correct_${index}`}
                                                                className="form-check-input"
                                                                checked={answer.is_correct}
                                                                onChange={(e) => handleAnswerChange(index, 'is_correct', e.target.checked)}
                                                            />
                                                            <label className="form-check-label" htmlFor={`is_correct_${index}`}>
                                                                Correct
                                                            </label>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            className="btn btn-sm btn-danger"
                                                            onClick={() => removeAnswerOption(index)}
                                                            disabled={currentQuestion.answers.length <= 2}
                                                        >
                                                            &times;
                                                        </button>
                                                    </div>
                                                </div>
                                                {errors.answerTexts?.[index] && (
                                                    <div className="invalid-feedback d-block">{errors.answerTexts[index]}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                <div className="form-actions mt-4">
                                    <button
                                        type="submit"
                                        className="btn btn-primary"
                                        disabled={addQuestionMutation.isPending}
                                    >
                                        {addQuestionMutation.isPending ? 'Adding...' : 'Add Question'}
                                    </button>
                                </div>
                            </form>
                        </div>

                        {!isEditMode && test.questions.length > 0 && (
                            <div className="preview-questions mt-4">
                                <h3 className="text-lg font-semibold mb-3">Preview Questions</h3>

                                <div className="questions-list">
                                    {test.questions.map((question, index) => (
                                        <div key={index} className="question-item">
                                            <div className="question-header">
                                                <div className="question-number">Q{index + 1}</div>
                                                <div className="question-text">{question.question_text}</div>
                                                <div className="question-type">{(question.question_type || '').replace('_', ' ')}</div>
                                            </div>
                                            <div className="question-answers">
                                                {(Array.isArray(question.answers) ? question.answers : []).map((answer, ansIndex) => (
                                                    <div key={ansIndex} className={`answer-item ${answer.is_correct ? 'answer-correct' : ''}`}>
                                                        <span className="answer-indicator">{String.fromCharCode(65 + ansIndex)}.</span>
                                                        <span className="answer-text">{answer.answer_text}</span>
                                                        {answer.is_correct && (
                                                            <span className="answer-correct-badge">Correct</span>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {!isEditMode && (
                            <div className="save-test-actions mt-5">
                                <div className="alert alert-info mb-3">
                                    <p>Don't forget to save your test after adding questions.</p>
                                </div>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSubmit}
                                    disabled={createTestMutation.isPending}
                                >
                                    {createTestMutation.isPending ? 'Saving...' : 'Save Test'}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <style jsx="true">{`
                .test-form-tabs {
                    display: flex;
                    border-bottom: 1px solid var(--border-color);
                    margin-bottom: 1.5rem;
                }
                
                .tab-button {
                    padding: 0.75rem 1.5rem;
                    background: none;
                    border: none;
                    color: var(--text-secondary);
                    cursor: pointer;
                    border-bottom: 2px solid transparent;
                    transition: all var(--transition-fast) ease;
                }
                
                .tab-button:hover {
                    color: var(--text-primary);
                }
                
                .tab-active {
                    color: var(--primary);
                    border-bottom-color: var(--primary);
                }
                
                .test-basic-info, .test-questions {
                    padding: 1rem 0;
                }
                
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                }
                
                .answer-row {
                    display: flex;
                    align-items: flex-start;
                    gap: 0.5rem;
                }
                
                .answer-letter {
                    width: 20px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    margin-top: 0.5rem;
                }
                
                .questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .question-item {
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    overflow: hidden;
                }
                
                .question-header {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .question-number {
                    font-weight: 600;
                    margin-right: 1rem;
                    color: var(--primary);
                    background-color: var(--primary-lighter);
                    padding: 0.25rem 0.5rem;
                    border-radius: var(--radius-md);
                }
                
                .question-text {
                    flex: 1;
                }
                
                .question-type {
                    font-size: 0.75rem;
                    color: var(--text-tertiary);
                    text-transform: capitalize;
                }
                
                .question-answers {
                    padding: 0.75rem 1rem;
                }
                
                .answer-item {
                    display: flex;
                    align-items: center;
                    padding: 0.5rem;
                    border-radius: var(--radius-sm);
                }
                
                .answer-item:not(:last-child) {
                    margin-bottom: 0.5rem;
                }
                
                .answer-correct {
                    background-color: var(--success-lighter);
                }
                
                .answer-indicator {
                    margin-right: 0.5rem;
                    font-weight: 600;
                }
                
                .answer-text {
                    flex: 1;
                }
                
                .answer-correct-badge {
                    font-size: 0.75rem;
                    padding: 0.125rem 0.5rem;
                    background-color: var(--success);
                    color: #fff;
                    border-radius: var(--radius-full);
                    margin-left: 0.5rem;
                }
                
                .answer-actions {
                    display: flex;
                    align-items: center;
                }
                
                .invalid-feedback {
                    color: var(--danger);
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                }
                
                .is-invalid {
                    border-color: var(--danger) !important;
                }
                
                .d-block {
                    display: block;
                }
                
                .mb-3 {
                    margin-bottom: 0.75rem;
                }
                
                .mb-4 {
                    margin-bottom: 1rem;
                }
            `}</style>
        </div>
    );
}

export default TestForm;