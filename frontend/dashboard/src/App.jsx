import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { StudentAuthProvider } from './context/StudentAuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminRoute } from './components/AdminRoute';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import StudentLayout from './pages/testing/student/StudentLayout';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// App Pages
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import NotFound from './pages/NotFound';

// Lessons Pages
import LessonsPage from './pages/lessons/LessonsPage';
import LessonDetail from './pages/lessons/LessonDetail';
import LessonForm from './pages/lessons/LessonForm';

// Groups Pages
import GroupsPage from './pages/groups/GroupsPage';
import GroupDetail from './pages/groups/GroupDetail';
import GroupForm from './pages/groups/GroupForm';

// Students Pages
import StudentsPage from './pages/students/StudentsPage';
import StudentDetail from './pages/students/StudentDetail';
import StudentForm from './pages/students/StudentForm';

// Attendance Pages
import AttendancePage from './pages/attendance/AttendancePage';
import LessonAttendance from './pages/attendance/LessonAttendance';
import StudentAttendance from './pages/attendance/StudentAttendance';
import AttendanceReport from './pages/attendance/AttendanceReport';

// Labs Pages
import LabsPage from './pages/labs/LabsPage';
import LabGrades from './pages/labs/LabGrades';
import SharedLinks from './pages/labs/SharedLinks';
import PublicSharedGrades from './pages/labs/PublicSharedGrades';

// Schedule page
import SchedulePage from './pages/schedule/SchedulePage';

// Tickets page
import TicketsPage from './pages/tickets/TicketsPage';
import TicketDetail from './pages/tickets/TicketDetail';
import TicketForm from './pages/tickets/TicketForm';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import SystemLogs from './pages/admin/SystemLogs';
import TeacherDetail from './pages/admin/TeacherDetail';
import TeacherGroups from './pages/admin/TeacherGroups';
import TeacherAttendance from './pages/admin/TeacherAttendance';
import TeacherLabs from './pages/admin/TeacherLabs';

// Testing Pages - Teacher/Admin
import TestsPage from './pages/testing/TestsPage';
import TestDetail from './pages/testing/TestDetail';
import TestForm from './pages/testing/TestForm';
import TestStatistics from './pages/testing/TestStatistics';
import TestAttempts from './pages/testing/TestAttempts';

// Testing Pages - Student
import StudentTestPortal from './pages/testing/student/StudentTestPortal';
import StudentTestLogin from './pages/testing/student/StudentTestLogin';
import StudentTestRegister from './pages/testing/student/StudentTestRegister';
import StudentTestsPage from './pages/testing/student/StudentTestsPage';
import TestAttemptPage from './pages/testing/student/TestAttemptPage';
import TestResultPage from './pages/testing/student/TestResultPage';
import TestHistoryPage from './pages/testing/student/TestHistoryPage';

function App() {
    return (
        <AuthProvider>
            <StudentAuthProvider>
                <Routes>
                    {/* Auth Routes */}
                    <Route element={<AuthLayout />}>
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                    </Route>

                    {/* Student Testing Portal (Public Routes) */}
                    <Route path="/student-testing" element={<StudentTestPortal />} />
                    <Route path="/student-testing/login" element={<StudentTestLogin />} />
                    <Route path="/student-testing/register" element={<StudentTestRegister />} />

                    {/* Protected Student Testing Routes */}
                    <Route path="/student-testing/tests" element={<StudentTestsPage />} />
                    <Route path="/student-testing/attempt/:id" element={<TestAttemptPage />} />
                    <Route path="/student-testing/result/:id" element={<TestResultPage />} />
                    <Route path="/student-testing/history" element={<TestHistoryPage />} />

                    {/* Public Shared Lab Grades Route - Important! This needs to be outside protected routes */}
                    <Route path="/labs/shared/:token" element={<PublicSharedGrades />} />

                    {/* Protected Routes */}
                    <Route element={
                        <ProtectedRoute>
                            <MainLayout />
                        </ProtectedRoute>
                    }>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/profile" element={<Profile />} />

                        {/* Lessons Routes */}
                        <Route path="lessons" element={<LessonsPage />} />
                        <Route path="lessons/new" element={<LessonForm />} />
                        <Route path="lessons/:id" element={<LessonDetail />} />
                        <Route path="lessons/:id/edit" element={<LessonForm />} />

                        {/* Groups Routes */}
                        <Route path="groups" element={<GroupsPage />} />
                        <Route path="groups/:name" element={<GroupDetail />} />
                        <Route path="groups/new" element={<GroupForm />} />
                        <Route path="groups/:name/edit" element={<GroupForm />} />

                        {/* Students Routes */}
                        <Route path="students" element={<StudentsPage />} />
                        <Route path="students/:id" element={<StudentDetail />} />
                        <Route path="students/new" element={<StudentForm />} />
                        <Route path="students/:id/edit" element={<StudentForm />} />

                        {/* Attendance Routes */}
                        <Route path="attendance" element={<AttendancePage />} />
                        <Route path="attendance/:id" element={<LessonAttendance />} />
                        <Route path="attendance/student/:id" element={<StudentAttendance />} />
                        <Route path="attendance/reports" element={<AttendanceReport />} />

                        {/* Labs Routes */}
                        <Route path="labs" element={<LabsPage />} />
                        <Route path="labs/:subject/:group" element={<LabGrades />} />
                        <Route path="labs/shared" element={<SharedLinks />} />

                        {/* Schedule Routes */}
                        <Route path="schedule" element={<SchedulePage />} />

                        {/* Tickets Routes */}
                        <Route path="tickets" element={<TicketsPage />} />
                        <Route path="tickets/new" element={<TicketForm />} />
                        <Route path="tickets/:id" element={<TicketDetail />} />
                        <Route path="tickets/:id/edit" element={<TicketForm />} />

                        {/* Testing Routes */}
                        <Route path="tests" element={<TestsPage />} />
                        <Route path="tests/new" element={<TestForm />} />
                        <Route path="tests/:id" element={<TestDetail />} />
                        <Route path="tests/:id/edit" element={<TestForm />} />
                        <Route path="tests/:id/statistics" element={<TestStatistics />} />
                        <Route path="tests/:id/attempts" element={<TestAttempts />} />

                        {/* Admin Routes */}
                        <Route element={<AdminRoute />}>
                            <Route path="admin" element={<AdminDashboard />} />
                            <Route path="admin/users" element={<UserManagement />} />
                            <Route path="admin/logs" element={<SystemLogs />} />
                            <Route path="admin/teachers/:id" element={<TeacherDetail />} />
                            <Route path="admin/teachers/:id/groups" element={<TeacherGroups />} />
                            <Route path="admin/teachers/:id/attendance" element={<TeacherAttendance />} />
                            <Route path="admin/teachers/:id/labs" element={<TeacherLabs />} />
                        </Route>
                    </Route>

                    {/* 404 route */}
                    <Route path="*" element={<NotFound />} />
                </Routes>
            </StudentAuthProvider>
        </AuthProvider>
    );
}

export default App;