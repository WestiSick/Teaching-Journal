import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { studentTestsService } from '../../../services/testsService';

function TestTaking() {
    const { attemptId } = useParams();
    const navigate = useNavigate();
    const [currentQuestionData, setCurrentQuestionData] = useState(null);
    const [answer, setAnswer] = useState({
        questionId: null,
        answerId: null,
        textAnswer: '',
        timeSpent: 0
    });
    const [timer, setTimer] = useState(0);
    const [showAlert, setShowAlert] = useState(false);
    const [error, setError] = useState(null);
    const [debugInfo, setDebugInfo] = useState(null);
    const timerRef = useRef(null);
    const studentId = localStorage.getItem('testStudentId');

    // Verify student is logged in
    useEffect(() => {
        if (!studentId) {
            navigate('/tests/student/login');
        }
    }, [navigate, studentId]);

    // Fetch next question
    const { data, isLoading, error: queryError, refetch } = useQuery({
        queryKey: ['current-question', attemptId],
        queryFn: async () => {
            console.log(`🔍 Fetching next question for attempt ${attemptId}`);
            try {
                const response = await studentTestsService.getNextQuestion(attemptId);
                console.log('📦 Raw question response:', response);

                // Add more detailed logging of the response structure
                if (response.data) {
                    console.log('📊 Response status:', response.status);
                    console.log('📄 Response data structure:', Object.keys(response.data));
                    console.log('📝 Response data:', response.data);

                    // Check nested data
                    if (response.data.data) {
                        console.log('🔍 Inner data structure:', Object.keys(response.data.data));
                    }
                }

                return response;
            } catch (error) {
                console.error('❌ Error fetching question:', error);
                setError(`Failed to fetch question: ${error.message}`);
                if (error.response) {
                    console.error('❌ Error response:', error.response.data);
                    setDebugInfo(error.response.data);
                }
                throw error;
            }
        },
        onSuccess: (response) => {
            console.log('✅ Question data received successfully');

            // Deeply log the response structure to help debug
            console.log('📊 Full response structure:', JSON.stringify(response.data, null, 2));

            // Try multiple paths to find the data
            let questionData = null;
            let progressData = null;

            // Check for test completion
            const isCompleted =
                response.data?.completed ||
                response.data?.data?.completed ||
                response.data?.data?.data?.completed;

            if (isCompleted) {
                console.log('🏁 Test completed, navigating to results');
                navigate(`/tests/student/results/${attemptId}`);
                return;
            }

            // Attempt to find question data at various paths
            if (response.data?.data?.question) {
                // Path: response.data.data.question
                console.log('📋 Found question at path: response.data.data.question');
                questionData = response.data.data.question;
                progressData = response.data.data.progress;
            } else if (response.data?.data?.data?.question) {
                // Path: response.data.data.data.question
                console.log('📋 Found question at path: response.data.data.data.question');
                questionData = response.data.data.data.question;
                progressData = response.data.data.data.progress;
            } else if (response.data?.question) {
                // Path: response.data.question
                console.log('📋 Found question at path: response.data.question');
                questionData = response.data.question;
                progressData = response.data.progress;
            } else {
                // Try to find question in any property
                console.log('🔍 Searching for question data anywhere in the response...');

                // Function to recursively search for question object
                const findQuestionData = (obj) => {
                    if (!obj || typeof obj !== 'object') return null;

                    // Check if this object has question properties
                    if (obj.question_text && obj.answers) {
                        return obj;
                    }

                    // Check if this is a question wrapper
                    if (obj.question && typeof obj.question === 'object' && obj.question.question_text) {
                        // Also look for progress
                        if (obj.progress) {
                            progressData = obj.progress;
                        }
                        return obj.question;
                    }

                    // Recursively search in all properties
                    for (const key in obj) {
                        const result = findQuestionData(obj[key]);
                        if (result) return result;
                    }

                    return null;
                };

                questionData = findQuestionData(response.data);

                if (questionData) {
                    console.log('🔍 Found question data through deep search');
                } else {
                    console.error('❌ Could not find question data in response');
                    setError('Question data not found in server response');
                    setDebugInfo(response.data);
                    return;
                }
            }

            console.log('📋 Extracted question data:', questionData);
            console.log('📊 Progress data:', progressData);

            // Default progress if not found
            const defaultProgress = { answered: 0, total: 1 };

            // Set the question data for rendering
            setCurrentQuestionData({
                question: questionData,
                progress: progressData || defaultProgress
            });

            // Reset answer state
            setAnswer({
                questionId: questionData.id,
                answerId: null,
                textAnswer: '',
                timeSpent: 0
            });

            // Reset timer
            setTimer(0);

            // Start timer
            if (timerRef.current) {
                clearInterval(timerRef.current);
            }

            timerRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev >= (questionData.time_limit || 60) - 10 && !showAlert) {
                        setShowAlert(true);
                    }
                    return prev + 1;
                });
            }, 1000);
        },
        retry: 1,
        refetchOnWindowFocus: false
    });

    // Submit answer mutation
    const submitAnswerMutation = useMutation({
        mutationFn: async (answerData) => {
            console.log('📝 Submitting answer:', answerData);
            try {
                const response = await studentTestsService.submitAnswer(attemptId, answerData);
                console.log('✅ Submit answer response:', response);
                return response;
            } catch (error) {
                console.error('❌ Error submitting answer:', error);
                if (error.response) {
                    console.error('❌ Error response:', error.response.data);
                }
                throw error;
            }
        },
        onSuccess: (response) => {
            console.log('✅ Answer submitted successfully');
            console.log('📄 Response data:', response.data);

            // Check multiple paths for completion status
            const isCompleted =
                response.data?.completed ||
                response.data?.data?.completed ||
                response.data?.data?.data?.completed;

            if (isCompleted) {
                console.log('🏁 All questions completed, navigating to results');
                navigate(`/tests/student/results/${attemptId}`);
                return;
            }

            // Fetch next question
            console.log('🔄 Fetching next question...');
            refetch();
        },
        onError: (error) => {
            console.error('❌ Error in submit mutation:', error);
            setError(`Failed to submit answer: ${error.message}`);
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
        console.log('📝 Answer selected:', answerId);
        setAnswer(prev => ({
            ...prev,
            answerId,
            textAnswer: '' // Clear text answer when selecting multiple choice
        }));
    };

    const handleTextChange = (e) => {
        console.log('📝 Text answer changed');
        setAnswer(prev => ({
            ...prev,
            textAnswer: e.target.value,
            answerId: null // Clear answerId when typing text
        }));
    };

    const handleSubmit = () => {
        console.log('📤 Submitting answer...');
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        // Prepare answer data
        const answerData = {
            question_id: answer.questionId,
            answer_id: answer.answerId,
            text_answer: answer.textAnswer,
            time_spent: timer
        };

        console.log('📤 Answer data being submitted:', answerData);
        submitAnswerMutation.mutate(answerData);
    };

    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    // Enhanced debug view to help diagnose issues
    if (data && !currentQuestionData) {
        return (
            <div className="error-container">
                <div className="alert alert-warning">
                    <h3>Data Received But No Question Available</h3>
                    <p>Our application received data from the server but couldn't extract a question to display.</p>
                    <p>This could be due to an unexpected data format or structure. Technical support has been notified.</p>

                    <div className="debug-actions">
                        <button className="btn btn-primary" onClick={() => refetch()}>
                            Try Again
                        </button>
                        <button className="btn btn-secondary" onClick={() => navigate('/tests/student')}>
                            Back to Tests
                        </button>
                    </div>

                    <div className="debug-info">
                        <h4>Response Data Analysis:</h4>
                        <div className="debug-section">
                            <h5>Response Status: {data?.status || 'Unknown'}</h5>
                            <h5>Data Structure:</h5>
                            <ul>
                                {data?.data && Object.keys(data.data).map(key => (
                                    <li key={key}>
                                        {key}: {typeof data.data[key] === 'object' ?
                                        `(Object with keys: ${Object.keys(data.data[key]).join(', ')})` :
                                        String(data.data[key])}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <h5>Complete Raw Response:</h5>
                        <pre>{JSON.stringify(data, null, 2)}</pre>
                    </div>
                </div>
            </div>
        );
    }

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
    if (queryError || error) {
        return (
            <div className="error-container">
                <div className="alert alert-danger">
                    <h3>Error Loading Question</h3>
                    <p>{error || queryError.message}</p>
                    {debugInfo && (
                        <div className="debug-info">
                            <h4>Debug Information:</h4>
                            <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
                        </div>
                    )}
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

    // If no question data is available but we have a response
    if (!currentQuestionData) {
        return (
            <div className="error-container">
                <div className="alert alert-warning">
                    <h3>No Question Available</h3>
                    <p>Unable to load the next question. This might be because the test is already completed or no questions are available.</p>
                    <div className="debug-info">
                        <h4>Response Data:</h4>
                        <pre>{data ? JSON.stringify(data, null, 2) : 'No data received from server'}</pre>
                    </div>
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

    // Defensive check for question data structure
    const { question, progress } = currentQuestionData;

    if (!question || !question.question_text) {
        return (
            <div className="error-container">
                <div className="alert alert-danger">
                    <h3>Invalid Question Data</h3>
                    <p>The question data received from the server is not in the expected format.</p>
                    <div className="debug-info">
                        <h4>Current Question Data:</h4>
                        <pre>{JSON.stringify(currentQuestionData, null, 2)}</pre>
                    </div>
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
                    <div className={`timer-display ${timer > (question.time_limit || 60) * 0.8 ? 'timer-warning' : ''}`}>
                        {formatTime(timer)}
                    </div>
                    <div className="timer-label">Time Elapsed</div>
                </div>
            </div>

            {showAlert && (
                <div className="time-alert">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <span>Time is running out! Please submit your answer soon.</span>
                    <button
                        className="alert-close"
                        onClick={() => setShowAlert(false)}
                    >
                        &times;
                    </button>
                </div>
            )}

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
                                            className={`answer-option ${answer.answerId === option.id ? 'answer-selected' : ''}`}
                                            onClick={() => handleAnswerSelect(option.id)}
                                        >
                                            <div className="option-indicator">
                                                {question.question_type === 'multiple_choice' ? (
                                                    <span className="checkbox">
                                                        {answer.answerId === option.id && '✓'}
                                                    </span>
                                                ) : (
                                                    <span className="radio-button">
                                                        {answer.answerId === option.id && (
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
                                    value={answer.textAnswer}
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
                            !answer.answerId && !answer.textAnswer
                        )}
                    >
                        {submitAnswerMutation.isPending ? 'Submitting...' : 'Submit Answer'}
                    </button>
                </div>
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
                
                .error-actions, .debug-actions {
                    margin-top: 1.5rem;
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                }
                
                .debug-info {
                    margin-top: 1.5rem;
                    text-align: left;
                    background-color: var(--bg-dark-tertiary);
                    padding: 1rem;
                    border-radius: var(--radius-md);
                    overflow: auto;
                    max-height: 400px;
                }
                
                .debug-section {
                    margin-bottom: 1rem;
                    padding: 0.5rem;
                    background-color: rgba(255, 255, 255, 0.1);
                    border-radius: var(--radius-sm);
                }
                
                .debug-info pre {
                    margin: 0;
                    white-space: pre-wrap;
                    font-family: var(--font-mono);
                    font-size: 0.875rem;
                }
                
                .debug-info h5 {
                    margin-top: 1rem;
                    margin-bottom: 0.5rem;
                }
                
                .debug-info ul {
                    padding-left: 1.5rem;
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
                
                .timer-warning {
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                    animation: pulse 1s infinite;
                }
                
                @keyframes pulse {
                    0% { opacity: 1; }
                    50% { opacity: 0.7; }
                    100% { opacity: 1; }
                }
                
                .timer-label {
                    font-size: 0.875rem;
                    color: var(--text-tertiary);
                }
                
                .time-alert {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background-color: var(--warning-lighter);
                    color: var(--warning);
                    border-radius: var(--radius-md);
                    margin-bottom: 1.5rem;
                }
                
                .alert-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    color: var(--warning);
                    cursor: pointer;
                    margin-left: auto;
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