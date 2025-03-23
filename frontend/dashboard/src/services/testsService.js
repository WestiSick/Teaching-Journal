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
    registerStudent: (data) => {
        return createRequest('/students/register', 'POST', data);
    },

    // Login student
    loginStudent: (data) => {
        return createRequest('/students/login', 'POST', data);
    },

    // Get student info
    getStudentInfo: (studentId) => {
        return createRequest('/students/info', 'GET', null, { student_id: studentId });
    },

    // Get available tests
    getAvailableTests: (studentId) => {
        return createRequest('/available', 'GET', null, { student_id: studentId });
    },

    // Start test
    startTest: (testId, studentId) => {
        return createRequest(`/start/${testId}`, 'POST', { student_id: parseInt(studentId, 10) });
    },

    // Get next question - handle nested data structure
    getNextQuestion: (attemptId) => {
        return axios({
            method: 'GET',
            url: `/api/tests/attempt/${attemptId}/next`,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    },

    // Submit answer
    submitAnswer: (attemptId, data) => {
        return createRequest(`/attempt/${attemptId}/submit`, 'POST', data);
    },

    // Get test results
    getTestResults: (attemptId) => {
        return createRequest(`/attempt/${attemptId}/results`, 'GET');
    },

    // Get test history
    getTestHistory: (studentId) => {
        return createRequest('/history', 'GET', null, { student_id: studentId });
    }
};

export default {
    adminTestsService,
    studentTestsService
};