import axios from 'axios';

// Create axios instance
const api = axios.create({
    baseURL: '/api',
    headers: {
        'Content-Type': 'application/json',
    },
});

// Set token from localStorage if it exists
const token = localStorage.getItem('token');
if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Auth services
export const authService = {
    login: (email, password) =>
        api.post('/auth/login', { email, password }),

    register: (fio, email, password) =>
        api.post('/auth/register', { fio, email, password }),

    refreshToken: () => {
        // Use the token from localStorage
        const token = localStorage.getItem('token');
        return api.post('/auth/refresh', {}, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
    },
};

// User services
export const userService = {
    getCurrentUser: () =>
        api.get('/users/me'),

    updateUser: (data) =>
        api.put('/users/me', data),
};

// Dashboard services
export const dashboardService = {
    getStats: () =>
        api.get('/dashboard/stats'),
};

// Lesson services
export const lessonService = {
    getLessons: (params) =>
        api.get('/lessons', { params }),

    getLesson: (id) =>
        api.get(`/lessons/${id}`),

    createLesson: (data) =>
        api.post('/lessons', data),

    updateLesson: (id, data) =>
        api.put(`/lessons/${id}`, data),

    deleteLesson: (id) =>
        api.delete(`/lessons/${id}`),

    exportLessons: (params) =>
        api.get('/export/lessons', {
            params,
            responseType: 'blob',
        }),

    getSubjects: () =>
        api.get('/subjects'),

    getLessonsBySubject: (subject) =>
        api.get(`/subjects/${subject}/lessons`),
};

// Group services
export const groupService = {
    getGroups: () =>
        api.get('/groups'),

    getGroup: (name) =>
        api.get(`/groups/${name}`),

    createGroup: (data) =>
        api.post('/groups', data),

    updateGroup: (name, data) =>
        api.put(`/groups/${name}`, data),

    deleteGroup: (name) =>
        api.delete(`/groups/${name}`),

    getStudentsInGroup: (name) =>
        api.get(`/groups/${name}/students`),
};

// Student services
export const studentService = {
    getStudents: (params) =>
        api.get('/students', { params }),

    getStudent: (id) =>
        api.get(`/students/${id}`),

    createStudent: (data) =>
        api.post('/students', data),

    updateStudent: (id, data) =>
        api.put(`/students/${id}`, data),

    deleteStudent: (id) =>
        api.delete(`/students/${id}`),
};

// Attendance services
export const attendanceService = {
    getAttendance: (params) =>
        api.get('/attendance', { params }),

    getLessonAttendance: (lessonId) =>
        api.get(`/attendance/${lessonId}`),

    saveAttendance: (lessonId, data) =>
        api.post(`/attendance/${lessonId}`, data),

    deleteAttendance: (lessonId) =>
        api.delete(`/attendance/${lessonId}`),

    exportAttendance: (mode) =>
        api.get('/attendance/export', {
            params: { mode },
            responseType: 'blob',
        }),
};

// Lab services
export const labService = {
    getLabs: () =>
        api.get('/labs'),

    getLabGrades: (subject, group) =>
        api.get(`/labs/${subject}/${group}`),

    updateLabSettings: (subject, group, data) =>
        api.put(`/labs/${subject}/${group}/settings`, data),

    updateLabGrades: (subject, group, data) =>
        api.put(`/labs/${subject}/${group}/grades`, data),

    exportLabGrades: (subject, group) =>
        api.get(`/labs/${subject}/${group}/export`, {
            responseType: 'blob',
        }),

    shareLabGrades: (subject, group, data) =>
        api.post(`/labs/${subject}/${group}/share`, data),

    getSharedLabGrades: (token) => {
        return axios.get(`/api/labs/shared/${token}`);
    },

    getSharedLinks: () =>
        api.get('/labs/links'),

    deleteSharedLink: (token) =>
        api.delete(`/labs/links/${token}`),
};

// Admin services - FIXED to use the configured api instance
export const adminService = {
    getUsers: () =>
        api.get('/admin/users'),

    updateUserRole: (id, role) =>
        api.put(`/admin/users/${id}/role`, { role }),

    deleteUser: (id) =>
        api.delete(`/admin/users/${id}`),

    getLogs: (params) =>
        api.get('/admin/logs', { params }),

    getTeacherGroups: (id) =>
        api.get(`/admin/teachers/${id}/groups`),

    addTeacherGroup: (id, data) =>
        api.post(`/admin/teachers/${id}/groups`, data),

    getTeacherAttendance: (id, params) =>
        api.get(`/admin/teachers/${id}/attendance`, { params }),

    getTeacherLabs: (id) =>
        api.get(`/admin/teachers/${id}/labs`),
};

// Schedule API services (using relative URLs)
export const scheduleService = {
    getSchedule: (params) =>
        axios.get('/api/schedule', {
            params,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),

    startAsyncFetch: (data) =>
        axios.post('/api/schedule/async', data, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),

    getProgress: (jobId) =>
        axios.get(`/api/schedule/progress/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),

    getResults: (jobId) =>
        axios.get(`/api/schedule/results/${jobId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),

    addLesson: (data) =>
        axios.post('/api/schedule/lesson', data, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),

    addAllLessons: (data) =>
        axios.post('/api/schedule/lessons', data, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }),
};

// Ticket services (using relative URLs)
export const ticketService = {
    getTickets: (params) =>
        axios.get('/api/tickets', {
            params,
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(error => {
            console.error('Error fetching tickets:', error.response || error);
            throw error;
        }),

    getTicket: (id) =>
        axios.get(`/api/tickets/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(error => {
            console.error(`Error fetching ticket ${id}:`, error.response || error);
            throw error;
        }),

    createTicket: (data) =>
        axios.post('/api/tickets', data, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        }).catch(error => {
            console.error('Error creating ticket:', error.response || error);
            throw error;
        }),

    updateTicket: (id, data) =>
        axios.put(`/api/tickets/${id}`, data, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        }).catch(error => {
            console.error(`Error updating ticket ${id}:`, error.response || error);
            throw error;
        }),

    deleteTicket: (id) =>
        axios.delete(`/api/tickets/${id}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(error => {
            console.error(`Error deleting ticket ${id}:`, error.response || error);
            throw error;
        }),

    getComments: (id) =>
        axios.get(`/api/tickets/${id}/comments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(error => {
            console.error(`Error fetching comments for ticket ${id}:`, error.response || error);
            throw error;
        }),

    addComment: (id, data) =>
        axios.post(`/api/tickets/${id}/comments`, data, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            }
        }).catch(error => {
            console.error(`Error adding comment to ticket ${id}:`, error.response || error);
            throw error;
        }),

    getAttachments: (id) =>
        axios.get(`/api/tickets/${id}/attachments`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(error => {
            console.error(`Error fetching attachments for ticket ${id}:`, error.response || error);
            throw error;
        }),

    addAttachment: (id, formData) =>
        axios.post(`/api/tickets/${id}/attachments`, formData, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                // Note: Do not set Content-Type for multipart/form-data
                // Axios will set it automatically with the boundary
            }
        }).catch(error => {
            console.error(`Error uploading attachment to ticket ${id}:`, error.response || error);
            throw error;
        }),

    downloadAttachment: (id) =>
        axios.get(`/api/tickets/attachments/${id}`, {
            responseType: 'blob',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        }).catch(error => {
            console.error(`Error downloading attachment ${id}:`, error.response || error);
            throw error;
        }),

    getTicketStats: () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.error('No token found for authentication');
            return Promise.reject(new Error('Authentication token not found'));
        }

        return axios.get('/api/tickets/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        })
            .then(response => {
                console.log('Raw stats response:', response);
                return response;
            })
            .catch(error => {
                console.error('Error in stats API:', error);
                throw error;
            });
    }
};

// Testing services
export const testingService = {
    // Admin/Teacher API
    getTests: (params) =>
        api.get('/testing/tests', { params }),

    getTest: (id) =>
        api.get(`/testing/tests/${id}`),

    createTest: (data) =>
        api.post('/testing/tests', data),

    updateTest: (id, data) =>
        api.put(`/testing/tests/${id}`, data),

    deleteTest: (id) =>
        api.delete(`/testing/tests/${id}`),

    toggleTestActive: (id, active) =>
        api.put(`/testing/tests/${id}/activate`, { active }),

    addQuestion: (testId, data) =>
        api.post(`/testing/tests/${testId}/questions`, data),

    updateQuestion: (testId, questionId, data) =>
        api.put(`/testing/tests/${testId}/questions/${questionId}`, data),

    deleteQuestion: (testId, questionId) =>
        api.delete(`/testing/tests/${testId}/questions/${questionId}`),

    getTestStatistics: (id) =>
        api.get(`/testing/tests/${id}/statistics`),

    getTestAttempts: (id) =>
        api.get(`/testing/tests/${id}/attempts`),

    manageTestGroups: (id, groups) =>
        api.post(`/testing/tests/${id}/groups`, { groups }),

    // Student API
    registerStudent: (data) =>
        axios.post('/api/testing/students/register', data),

    loginStudent: (data) =>
        axios.post('/api/testing/students/login', data),

    getAvailableTests: () =>
        axios.get('/api/testing/student/tests', {
            headers: {
                'X-Student-Token': localStorage.getItem('studentToken')
            }
        }),

    getAttemptHistory: (params) =>
        axios.get('/api/testing/student/attempts', {
            params,
            headers: {
                'X-Student-Token': localStorage.getItem('studentToken')
            }
        }),

    startTest: (id) =>
        axios.post(`/api/testing/student/tests/${id}/start`, {}, {
            headers: {
                'X-Student-Token': localStorage.getItem('studentToken')
            }
        }),

    getCurrentQuestion: (attemptId) =>
        axios.get(`/api/testing/student/attempts/${attemptId}/questions/current`, {
            headers: {
                'X-Student-Token': localStorage.getItem('studentToken')
            }
        }),

    submitAnswer: (attemptId, questionId, data) =>
        axios.post(`/api/testing/student/attempts/${attemptId}/questions/${questionId}/answer`, data, {
            headers: {
                'X-Student-Token': localStorage.getItem('studentToken')
            }
        }),

    finishTest: (attemptId) =>
        axios.post(`/api/testing/student/attempts/${attemptId}/finish`, {}, {
            headers: {
                'X-Student-Token': localStorage.getItem('studentToken')
            }
        }),

    getTestResult: (attemptId) =>
        axios.get(`/api/testing/student/attempts/${attemptId}/result`, {
            headers: {
                'X-Student-Token': localStorage.getItem('studentToken')
            }
        }),
};

// Modify the interceptor at the bottom of the file
api.interceptors.response.use(
    response => response,
    async error => {
        const originalRequest = error.config;

        // Only try to refresh token once and only if it's a 401 error
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Check if the failed request was itself a refresh token request
            const isRefreshRequest = originalRequest.url === '/auth/refresh';

            // If we're already trying to refresh the token and that failed, logout
            if (isRefreshRequest) {
                localStorage.removeItem('token');
                window.location.href = '/login';
                return Promise.reject(error);
            }

            try {
                const response = await authService.refreshToken();
                const token = response.data.data.token;

                localStorage.setItem('token', token);
                api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                originalRequest.headers['Authorization'] = `Bearer ${token}`;

                return api(originalRequest);
            } catch (refreshError) {
                // Redirect to login on refresh failure
                localStorage.removeItem('token');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;