import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studentTestsService } from '../../../services/testsService';

function TestTaking() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [selectedAnswerId, setSelectedAnswerId] = useState(null);
    const [textAnswer, setTextAnswer] = useState('');
    const [timer, setTimer] = useState(0);
    const timerRef = useRef(null);
    const questionIdRef = useRef(null); // Use a ref to store the question ID
    const studentId = localStorage.getItem('testStudentId');

    // Verify student is logged in
    useEffect(() => {
        if (!studentId) {
            navigate('/tests/student/login');
        }
    }, [navigate, studentId]);

    // Fetch next question
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['current-question', attemptId],
        queryFn: async () => {
            try {
                const response = await studentTestsService.getNextQuestion(attemptId);
                console.log('Question response:', response);
                return response;
            } catch (error) {
                console.error('Error fetching question:', error);
                throw error;
            }
        },
        onSuccess: (response) => {
            console.log('Response received:', response);

            // Access the nested data structure
            const responseData = response.data;

            // Check if the test is completed
            if (responseData.data && responseData.data.completed) {
                console.log('Test completed, navigating to results');
                navigate(`/tests/student/results/${attemptId}`);
                return;
            }

            // Check if we have valid question data
            if (!responseData.data || !responseData.data.question) {
                console.error('No question data received, but test is not marked as completed');
                return;
            }

            // Store the question ID in the ref
            const questionData = responseData.data.question;
            console.log('Setting question ID ref:', questionData.id);
            questionIdRef.current = questionData.id;

            // Reset answer selections for the new question
            setSelectedAnswerId(null);
            setTextAnswer('');

            // Reset and start timer
            setTimer(0);
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            timerRef.current = setInterval(() => {
                setTimer(prev => prev + 1);
            }, 1000);
        },
        retry: 1,
        refetchOnWindowFocus: false
    });

    // Submit answer mutation
    const submitAnswerMutation = useMutation({
        mutationFn: async () => {
            // Get the current question ID from the ref
            const questionId = questionIdRef.current;

            // Check for missing question ID
            if (!questionId) {
                console.error('ERROR: Missing question ID when submitting answer!');
                throw new Error('Missing question ID');
            }

            // Build the answer data
            const answerData = {
                question_id: questionId,
                answer_id: selectedAnswerId,
                text_answer: textAnswer,
                time_spent: timer
            };

            console.log('Submitting answer with data:', answerData);
            return studentTestsService.submitAnswer(attemptId, answerData);
        },
        onSuccess: (response) => {
            console.log('Answer submitted successfully:', response);

            // Check if test is completed after submitting
            if (response.data.data?.completed) {
                navigate(`/tests/student/results/${attemptId}`);
                return;
            }

            // Fetch next question
            refetch();
        },
        onError: (error) => {
            console.error('Error submitting answer:', error);
            alert('Failed to submit answer: ' + (error.message || 'Unknown error'));
        }
    });

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }
        };
    }, []);

    const handleAnswerSelect = (answerId) => {
        console.log(`Selected answer ID: ${answerId} for question ID: ${questionIdRef.current}`);
        setSelectedAnswerId(answerId);
        setTextAnswer('');
    };

    const handleTextChange = (e) => {
        setTextAnswer(e.target.value);
        setSelectedAnswerId(null);
    };

    const handleSubmit = () => {
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        console.log('Submitting with values:', {
            questionId: questionIdRef.current,
            answerId: selectedAnswerId,
            textAnswer,
            timer
        });

        submitAnswerMutation.mutate();
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Extract question and progress data from the correct nesting level
    const responseData = data?.data || {};
    const questionData = responseData.data?.question || null;
    const progressData = responseData.data?.progress || { answered: 0, total: 1 };

    // Loading state
    if (isLoading) {
        return (
            <div className="loader-container">
                <div className="loader">
                    <div className="spinner"></div>
                </div>
                <div className="loading-text">Loading question...</div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="error-container">
                <div className="alert alert-danger">
                    <h3>Error Loading Question</h3>
                    <p>{error.message || 'Failed to load the next question'}</p>
                </div>
                <div className="error-actions">
                    <button className="btn btn-primary" onClick={() => refetch()}>
                        Try Again
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/tests/student')}>
                        Back to Tests
                    </button>
                </div>
            </div>
        );
    }

    // If no data or no question
    if (!questionData) {
        return (
            <div className="error-container">
                <div className="alert alert-warning">
                    <h3>No Question Available</h3>
                    <p>Unable to load the next question. The test may be completed or there might be an issue with the test data.</p>
                </div>
                <div className="error-actions">
                    <button className="btn btn-primary" onClick={() => refetch()}>
                        Try Again
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/tests/student/history')}>
                        View Test History
                    </button>
                    <button className="btn btn-outline" onClick={() => navigate('/tests/student')}>
                        Back to Tests
                    </button>
                </div>
            </div>
        );
    }

    // We have valid question data - show the question
    const question = questionData;
    const progress = progressData;

    // Log current question ID when rendering
    console.log('Rendering question ID:', questionIdRef.current, 'Question data:', question);

    return (
        <div className="test-taking-container">
            <div className="test-taking-header">
                <div className="test-progress">
                    <div className="progress-text">
                        Question {progress.answered + 1} of {progress.total}
                    </div>
                    <div className="progress-bar-container">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${(progress.answered / progress.total) * 100}%` }}
                        ></div>
                    </div>
                </div>
                <div className="test-timer">
                    <div className="timer-display">
                        {formatTime(timer)}
                    </div>
                    <div className="timer-label">Time Elapsed</div>
                </div>
            </div>

            <div className="question-container">
                <div className="question-header">
                    <div className="question-number">Question {progress.answered + 1}</div>
                    <div className="question-type">{formatQuestionType(question.question_type)}</div>
                </div>

                <div className="question-content">
                    <h2 className="question-text">{question.question_text}</h2>

                    <div className="answer-options">
                        {(question.question_type === 'multiple_choice' || question.question_type === 'single_choice') && (
                            <div className="multiple-choice-options">
                                {Array.isArray(question.answers) && question.answers.length > 0 ? (
                                    question.answers.map(option => (
                                        <div
                                            key={option.id}
                                            className={`answer-option ${selectedAnswerId === option.id ? 'answer-selected' : ''}`}
                                            onClick={() => handleAnswerSelect(option.id)}
                                        >
                                            <div className="option-indicator">
                                                {question.question_type === 'multiple_choice' ? (
                                                    <span className="checkbox">
                                                        {selectedAnswerId === option.id && '✓'}
                                                    </span>
                                                ) : (
                                                    <span className="radio-button">
                                                        {selectedAnswerId === option.id && (
                                                            <span className="radio-filled"></span>
                                                        )}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="option-text">{option.answer_text}</div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="answer-error">No answer options available for this question</div>
                                )}
                            </div>
                        )}

                        {question.question_type === 'text' && (
                            <div className="text-answer">
                                <textarea
                                    className="text-answer-input"
                                    placeholder="Type your answer here..."
                                    value={textAnswer}
                                    onChange={handleTextChange}
                                    rows="4"
                                ></textarea>
                            </div>
                        )}
                    </div>
                </div>

                <div className="question-actions">
                    <button
                        className="btn btn-primary"
                        onClick={handleSubmit}
                        disabled={submitAnswerMutation.isPending || (
                            !selectedAnswerId && !textAnswer
                        )}
                    >
                        {submitAnswerMutation.isPending ? 'Submitting...' : 'Submit Answer'}
                    </button>
                </div>
            </div>

            {/* Debug info at the bottom of the page */}
            <div className="debug-info">
                <h4>Debug Info</h4>
                <div>Current Question ID: {questionIdRef.current}</div>
                <div>Selected Answer ID: {selectedAnswerId}</div>
                <div>Question Type: {question.question_type}</div>
            </div>

            <style jsx="true">{`
                .test-taking-container {
                    max-width: 900px;
                    margin: 0 auto;
                    padding: 2rem;
                }
                
                .loader-container, .error-container {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    text-align: center;
                }
                
                .loading-text {
                    margin-top: 1rem;
                    font-size: 1.125rem;
                    color: var(--text-secondary);
                }
                
                .error-actions {
                    margin-top: 1.5rem;
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                
                .test-taking-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 2rem;
                }
                
                .test-progress {
                    flex: 1;
                }
                
                .progress-text {
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                }
                
                .progress-bar-container {
                    height: 8px;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-full);
                    overflow: hidden;
                    width: 100%;
                    max-width: 300px;
                }
                
                .progress-bar-fill {
                    height: 100%;
                    background-color: var(--primary);
                    border-radius: var(--radius-full);
                    transition: width 0.3s ease;
                }
                
                .test-timer {
                    text-align: center;
                }
                
                .timer-display {
                    font-size: 1.75rem;
                    font-weight: 700;
                    font-family: var(--font-mono);
                    padding: 0.5rem 1rem;
                    background-color: var(--bg-dark-tertiary);
                    border-radius: var(--radius-md);
                    margin-bottom: 0.25rem;
                }
                
                .timer-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .question-container {
                    background-color: var(--bg-card);
                    border-radius: var(--radius-lg);
                    border: 1px solid var(--border-color);
                    overflow: hidden;
                }
                
                .question-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    background-color: var(--bg-dark-tertiary);
                    border-bottom: 1px solid var(--border-color);
                }
                
                .question-number {
                    font-weight: 600;
                }
                
                .question-type {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .question-content {
                    padding: 2rem;
                }
                
                .question-text {
                    font-size: 1.5rem;
                    margin-bottom: 2rem;
                }
                
                .answer-options {
                    margin-bottom: 1.5rem;
                }
                
                .multiple-choice-options {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .answer-option {
                    display: flex;
                    align-items: flex-start;
                    gap: 1rem;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    cursor: pointer;
                    transition: all var(--transition-normal) ease;
                }
                
                .answer-option:hover {
                    background-color: var(--bg-dark-tertiary);
                }
                
                .answer-selected {
                    border-color: var(--primary);
                    background-color: var(--primary-lighter);
                }
                
                .option-indicator {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .checkbox {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-color);
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    color: var(--primary);
                }
                
                .answer-selected .checkbox {
                    border-color: var(--primary);
                    background-color: var(--primary-lighter);
                }
                
                .radio-button {
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--border-color);
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                
                .answer-selected .radio-button {
                    border-color: var(--primary);
                }
                
                .radio-filled {
                    width: 10px;
                    height: 10px;
                    background-color: var(--primary);
                    border-radius: 50%;
                }
                
                .option-text {
                    flex: 1;
                }
                
                .text-answer {
                    margin-top: 1rem;
                }
                
                .text-answer-input {
                    width: 100%;
                    padding: 1rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--radius-md);
                    background-color: var(--bg-dark-tertiary);
                    color: var(--text-primary);
                    resize: vertical;
                    min-height: 120px;
                }
                
                .text-answer-input:focus {
                    outline: none;
                    border-color: var(--primary);
                }
                
                .question-actions {
                    padding: 1.5rem;
                    background-color: var(--bg-dark-tertiary);
                    border-top: 1px solid var(--border-color);
                    display: flex;
                    justify-content: flex-end;
                }
                
                .answer-error {
                    padding: 1rem;
                    background-color: var(--danger-lighter);
                    color: var(--danger);
                    border-radius: var(--radius-md);
                    text-align: center;
                }
                
                .debug-info {
                    margin-top: 2rem;
                    padding: 1rem;
                    background-color: #333;
                    border-radius: 0.5rem;
                    color: #fff;
                    font-family: monospace;
                }
                
                @media (max-width: 768px) {
                    .test-taking-container {
                        padding: 1rem;
                    }
                    
                    .test-taking-header {
                        flex-direction: column;
                        gap: 1rem;
                        align-items: flex-start;
                    }
                    
                    .question-text {
                        font-size: 1.25rem;
                    }
                }
            `}</style>
        </div>
    );
}

function formatQuestionType(type) {
    if (!type) return '';

    // Convert "multiple_choice" to "Multiple Choice"
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

export default TestTaking;