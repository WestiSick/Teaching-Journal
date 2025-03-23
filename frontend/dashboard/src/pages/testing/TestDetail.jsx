import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { testingService } from '../../services/api';

function TestDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [showAddQuestionForm, setShowAddQuestionForm] = useState(false);
    const [questionData, setQuestionData] = useState({
        question_text: '',
        question_order: 0,
        answers: [
            { answer_text: '', is_correct: true },
            { answer_text: '', is_correct: false }
        ]
    });

    // Fetch test details
    const { data, isLoading, error } = useQuery({
        queryKey: ['test', id],
        queryFn: () => testingService.getTest(id),
    });

    // Delete test mutation
    const deleteTestMutation = useMutation({
        mutationFn: () => testingService.deleteTest(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tests'] });
            navigate('/tests');
        }
    });

    // Add question mutation
    const addQuestionMutation = useMutation({
        mutationFn: (questionData) => testingService.addQuestion(id, questionData),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
            setShowAddQuestionForm(false);
            setQuestionData({
                question_text: '',
                question_order: 0,
                answers: [
                    { answer_text: '', is_correct: true },
                    { answer_text: '', is_correct: false }
                ]
            });
        }
    });

    // Delete question mutation
    const deleteQuestionMutation = useMutation({
        mutationFn: (questionId) => testingService.deleteQuestion(id, questionId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
        }
    });

    // Toggle test active status
    const toggleActiveMutation = useMutation({
        mutationFn: (active) => testingService.toggleTestActive(id, active),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['test', id] });
        }
    });

    const test = data?.data?.data;

    // Handle form submission for adding a question
    const handleAddQuestion = (e) => {
        e.preventDefault();
        addQuestionMutation.mutate(questionData);
    };

    // Add another answer option
    const addAnswer = () => {
        setQuestionData({
            ...questionData,
            answers: [...questionData.answers, { answer_text: '', is_correct: false }]
        });
    };

    // Remove an answer
    const removeAnswer = (index) => {
        if (questionData.answers.length <= 2) {
            return; // Keep at least 2 answers
        }

        const updatedAnswers = [...questionData.answers];
        updatedAnswers.splice(index, 1);

        // Make sure at least one answer is correct
        const hasCorrectAnswer = updatedAnswers.some(answer => answer.is_correct);
        if (!hasCorrectAnswer && updatedAnswers.length > 0) {
            updatedAnswers[0].is_correct = true;
        }

        setQuestionData({
            ...questionData,
            answers: updatedAnswers
        });
    };

    // Handle answer text change
    const handleAnswerChange = (index, value) => {
        const updatedAnswers = [...questionData.answers];
        updatedAnswers[index].answer_text = value;
        setQuestionData({
            ...questionData,
            answers: updatedAnswers
        });
    };

    // Handle correct answer selection
    const handleCorrectAnswerChange = (index) => {
        const updatedAnswers = questionData.answers.map((answer, i) => ({
            ...answer,
            is_correct: i === index
        }));

        setQuestionData({
            ...questionData,
            answers: updatedAnswers
        });
    };

    // Delete test confirmation
    const confirmDeleteTest = () => {
        if (window.confirm('Are you sure you want to delete this test? This action cannot be undone.')) {
            deleteTestMutation.mutate();
        }
    };

    // Delete question confirmation
    const confirmDeleteQuestion = (questionId) => {
        if (window.confirm('Are you sure you want to delete this question?')) {
            deleteQuestionMutation.mutate(questionId);
        }
    };

    if (isLoading) {
        return (
            <div className="loader">
                <div className="spinner"></div>
            </div>
        );
    }

    if (error) {
        return <div className="alert alert-danger">Error loading test: {error.message}</div>;
    }

    if (!test) {
        return <div className="alert alert-warning">Test not found</div>;
    }

    return (
        <div>
            <div className="page-header">
                <div className="d-flex align-items-center gap-3">
                    <Link to="/tests" className="btn btn-outline btn-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                        <span>Back</span>
                    </Link>
                    <h1 className="page-title">{test.title}</h1>
                    {test.active ? (
                        <span className="badge badge-success">Active</span>
                    ) : (
                        <span className="badge badge-danger">Inactive</span>
                    )}
                </div>
                <div className="d-flex gap-2">
                    <button
                        className={`btn ${test.active ? 'btn-warning' : 'btn-success'}`}
                        onClick={() => toggleActiveMutation.mutate(!test.active)}
                    >
                        {test.active ? 'Deactivate' : 'Activate'} Test
                    </button>
                    <Link to={`/tests/${id}/edit`} className="btn btn-primary">
                        Edit Test
                    </Link>
                    <button
                        className="btn btn-danger"
                        onClick={confirmDeleteTest}
                    >
                        Delete Test
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="info-card">
                    <div className="info-card-title">Subject</div>
                    <div className="info-card-value">{test.subject}</div>
                </div>
                <div className="info-card">
                    <div className="info-card-title">Questions</div>
                    <div className="info-card-value">{test.questions?.length || 0}</div>
                </div>
                <div className="info-card">
                    <div className="info-card-title">Max Attempts</div>
                    <div className="info-card-value">{test.max_attempts}</div>
                </div>
                <div className="info-card">
                    <div className="info-card-title">Time per Question</div>
                    <div className="info-card-value">{test.time_per_question} seconds</div>
                </div>
                <div className="info-card">
                    <div className="info-card-title">Created</div>
                    <div className="info-card-value">{new Date(test.created_at).toLocaleDateString()}</div>
                </div>
                <div className="info-card">
                    <div className="info-card-title">Last Updated</div>
                    <div className="info-card-value">{new Date(test.updated_at).toLocaleDateString()}</div>
                </div>
            </div>

            <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-3">Description</h2>
                <p>{test.description || 'No description provided'}</p>
            </div>

            <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-3">Groups</h2>
                <div className="groups-list">
                    {test.groups_allowed && test.groups_allowed.length > 0 ? (
                        <div className="d-flex flex-wrap gap-2">
                            {test.groups_allowed.map((group, idx) => (
                                <span key={idx} className="badge badge-info">{group}</span>
                            ))}
                        </div>
                    ) : (
                        <div className="text-tertiary">No groups assigned</div>
                    )}
                </div>
                <div className="mt-4">
                    <Link to={`/tests/${id}/edit`} className="btn btn-sm btn-outline">
                        Manage Groups
                    </Link>
                </div>
            </div>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-xl font-semibold">Questions</h2>
                <button
                    className="btn btn-primary"
                    onClick={() => setShowAddQuestionForm(!showAddQuestionForm)}
                >
                    {showAddQuestionForm ? 'Cancel' : 'Add Question'}
                </button>
            </div>

            {showAddQuestionForm && (
                <div className="card mb-6">
                    <h3 className="text-lg font-semibold mb-4">Add New Question</h3>
                    <form onSubmit={handleAddQuestion}>
                        <div className="form-group">
                            <label className="form-label">Question Text</label>
                            <textarea
                                className="form-control"
                                value={questionData.question_text}
                                onChange={(e) => setQuestionData({...questionData, question_text: e.target.value})}
                                placeholder="Enter your question here"
                                required
                                rows={3}
                            ></textarea>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Question Order</label>
                            <input
                                type="number"
                                className="form-control"
                                value={questionData.question_order}
                                onChange={(e) => setQuestionData({...questionData, question_order: parseInt(e.target.value)})}
                                min="0"
                            />
                            <small className="text-tertiary">Leave as 0 to place at the end</small>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Answer Options</label>
                            <small className="text-tertiary d-block mb-2">Select one option as the correct answer</small>

                            {questionData.answers.map((answer, index) => (
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
                                            disabled={questionData.answers.length <= 2}
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
                                disabled={addQuestionMutation.isPending}
                            >
                                {addQuestionMutation.isPending ? 'Adding...' : 'Add Question'}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {test.questions && test.questions.length === 0 ? (
                <div className="card">
                    <div className="empty-state">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <h3>No Questions Yet</h3>
                        <p>Add questions to your test to get started</p>
                    </div>
                </div>
            ) : (
                <div className="questions-list">
                    {test.questions && test.questions.map((question, idx) => (
                        <div key={question.id} className="question-item card">
                            <div className="question-header">
                                <div className="question-number">Question {question.question_order}</div>
                                <div className="question-actions">
                                    <Link to={`/tests/${id}/edit`} state={{ editQuestionId: question.id }} className="btn btn-sm btn-outline">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                    </Link>
                                    <button
                                        className="btn btn-sm btn-outline text-danger"
                                        onClick={() => confirmDeleteQuestion(question.id)}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="3 6 5 6 21 6"></polyline>
                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="question-text">{question.question_text}</div>
                            <div className="answers-list">
                                {question.answers && question.answers.map((answer, answerIdx) => (
                                    <div key={answer.id} className={`answer-option ${answer.is_correct ? 'answer-correct' : ''}`}>
                                        <div className="answer-marker">
                                            {answer.is_correct ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                </svg>
                                            ) : (
                                                <span>{String.fromCharCode(65 + answerIdx)}</span>
                                            )}
                                        </div>
                                        <div className="answer-text">{answer.answer_text}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="d-flex justify-content-between mt-6">
                <Link to="/tests" className="btn btn-outline">
                    Back to Tests
                </Link>
                <div className="d-flex gap-3">
                    <Link to={`/tests/${id}/statistics`} className="btn btn-outline">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 3v18h18"></path>
                            <path d="M18 17V9"></path>
                            <path d="M13 17V5"></path>
                            <path d="M8 17v-3"></path>
                        </svg>
                        <span>View Statistics</span>
                    </Link>
                    <Link to={`/tests/${id}/attempts`} className="btn btn-outline">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>
                        <span>View Attempts</span>
                    </Link>
                </div>
            </div>

            <style jsx="true">{`
                .info-card {
                    padding: 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                }
                
                .info-card-title {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                    margin-bottom: 0.5rem;
                }
                
                .info-card-value {
                    font-size: 1.25rem;
                    font-weight: 600;
                    color: var(--text-primary);
                }
                
                .empty-state {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem 2rem;
                    color: var(--text-tertiary);
                    text-align: center;
                }
                
                .empty-state svg {
                    color: var(--text-tertiary);
                    margin-bottom: 1.5rem;
                    opacity: 0.6;
                }
                
                .questions-list {
                    display: flex;
                    flex-direction: column;
                    gap: 1.5rem;
                }
                
                .question-item {
                    border: 1px solid var(--border-color);
                }
                
                .question-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1rem;
                }
                
                .question-number {
                    font-weight: 600;
                    color: var(--text-tertiary);
                }
                
                .question-actions {
                    display: flex;
                    gap: 0.5rem;
                }
                
                .question-text {
                    font-size: 1.125rem;
                    font-weight: 500;
                    margin-bottom: 1.5rem;
                }
                
                .answers-list {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr);
                    gap: 1rem;
                }
                
                .answer-option {
                    display: flex;
                    align-items: center;
                    padding: 0.75rem;
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    border: 1px solid var(--border-color);
                }
                
                .answer-correct {
                    background-color: var(--success-lighter);
                    border-color: var(--success);
                }
                
                .answer-marker {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                    border-radius: var(--radius-full);
                    background-color: var(--bg-dark-secondary);
                    color: var(--text-tertiary);
                    margin-right: 0.75rem;
                    font-size: 0.875rem;
                    font-weight: 600;
                }
                
                .answer-correct .answer-marker {
                    background-color: var(--success);
                    color: var(--bg-dark);
                }
                
                .answer-text {
                    flex: 1;
                }
                
                .radio-container {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 24px;
                    height: 24px;
                }
                
                @media (max-width: 768px) {
                    .page-header {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 1rem;
                    }
                    
                    .grid-cols-3 {
                        grid-template-columns: repeat(2, 1fr);
                    }
                    
                    .answers-list {
                        grid-template-columns: 1fr;
                    }
                }
                
                @media (max-width: 640px) {
                    .grid-cols-3 {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

export default TestDetail;