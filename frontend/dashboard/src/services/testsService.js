import axios from 'axios';

// Create a base configuration for test requests
const createRequest = (url, method, data = null, params = null) => {
    const token = localStorage.getItem('token');
    const config = {
        url: `/api/tests${url}`,
        method,
        headers: {
            'Authorization': token ? `Bearer ${token}` : undefined,
            'Content-Type': 'application/json'
        }
    };

    if (data) config.data = data;
    if (params) config.params = params;

    return axios(config);
};

// Admin/Teacher services
export const adminTestsService = {
    // Get all tests
    getAllTests: () =>
        createRequest('/admin/tests', 'GET'),

    // Get test details
    getTestDetails: (id) =>
        createRequest(`/admin/tests/${id}`, 'GET'),

    // Create test
    createTest: (data) => {
        console.log("Creating test with data:", data);
        return createRequest('/admin/tests', 'POST', data);
    },

    // Update test
    updateTest: (id, data) =>
        createRequest(`/admin/tests/${id}`, 'PUT', data),

    // Delete test
    deleteTest: (id) =>
        createRequest(`/admin/tests/${id}`, 'DELETE'),

    // Add question to test
    addQuestion: (testId, data) =>
        createRequest(`/admin/tests/${testId}/questions`, 'POST', data),

    // Update question
    updateQuestion: (testId, questionId, data) =>
        createRequest(`/admin/tests/${testId}/questions/${questionId}`, 'PUT', data),

    // Delete question
    deleteQuestion: (testId, questionId) =>
        createRequest(`/admin/tests/${testId}/questions/${questionId}`, 'DELETE'),

    // Get test statistics
    getTestStatistics: (id) =>
        createRequest(`/admin/tests/${id}/statistics`, 'GET')
};

// Student services
export const studentTestsService = {
    // Register student
    registerStudent: (data) =>
        createRequest('/students/register', 'POST', data),

    // Login student
    loginStudent: (data) =>
        createRequest('/students/login', 'POST', data),

    // Get student info
    getStudentInfo: (studentId) =>
        createRequest('/students/info', 'GET', null, { student_id: studentId }),

    // Get available tests
    getAvailableTests: (studentId) =>
        createRequest('/available', 'GET', null, { student_id: studentId }),

    // Start test - Fixed this function to match the API's expectations
    startTest: (testId, studentId) => {
        console.log(`Starting test ${testId} for student ${studentId}`);
        return createRequest(`/start/${testId}`, 'POST', { student_id: studentId });
    },

    // Get next question
    getNextQuestion: (attemptId) =>
        createRequest(`/attempt/${attemptId}/next`, 'GET'),

    // Submit answer
    submitAnswer: (attemptId, data) =>
        createRequest(`/attempt/${attemptId}/submit`, 'POST', data),

    // Get test results
    getTestResults: (attemptId) =>
        createRequest(`/attempt/${attemptId}/results`, 'GET'),

    // Get test history
    getTestHistory: (studentId) =>
        createRequest('/history', 'GET', null, { student_id: studentId })
};

export default {
    adminTestsService,
    studentTestsService
};