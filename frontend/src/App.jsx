import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Layouts
import StudentLayout from './components/layouts/StudentLayout'
import ProfessorLayout from './components/layouts/ProfessorLayout'
import InstitutionalAdminLayout from './components/layouts/InstitutionalAdminLayout'
import DepartmentalAdminLayout from './components/layouts/DepartmentalAdminLayout'
import SuperAdminLayout from './components/layouts/SuperAdminLayout'

// Auth Pages
import SignIn from './pages/auth/SignIn'
import SignUp from './pages/auth/SignUp'

// Student Pages
import StudentDashboard from './pages/student/Dashboard'
import StudentLectures from './pages/student/Lectures'
import StudentLectureDetail from './pages/student/LectureDetail'
import StudentLabs from './pages/student/Labs'
import StudentLabDetail from './pages/student/LabDetail'
import StudentQuiz from './pages/student/Quiz'
import StudentQuizDetail from './pages/student/QuizDetail'
import StudentProgress from './pages/student/Progress'
import StudentProfile from './pages/student/Profile'
import StudentAssignments from './pages/student/Assignments'
import StudentAttendance from './pages/student/Attendance'
import StudentTimetable from './pages/student/Timetable'
import StudentNotifications from './pages/student/Notifications'

// Professor Pages
import ProfDashboard from './pages/professor/Dashboard'
import ProfUpload from './pages/professor/Upload'
import ProfMyLectures from './pages/professor/MyLectures'
import ProfMyLabs from './pages/professor/MyLabs'
import ProfQuizBuilder from './pages/professor/QuizBuilder'
import ProfessorQuizzes from './pages/professor/Quizzes'
import ProfStudents from './pages/professor/Students'
import ProfAnalytics from './pages/professor/Analytics'
import ProfSettings from './pages/professor/Settings'
import ProfAssignments from './pages/professor/Assignments'
import ProfAttendance from './pages/professor/Attendance'
import ProfGradebook from './pages/professor/Gradebook'
import LectureDetailWithQuiz from './pages/professor/LectureDetailWithQuiz'
import ProfessorLabDetail from './pages/professor/LabDetail'

// Institutional Admin Pages
import InstOverview from './pages/inst-admin/Overview'
import InstDepartments from './pages/inst-admin/Departments'
import InstDeptAdmins from './pages/inst-admin/DeptAdmins'
import InstPolicies from './pages/inst-admin/Policies'
import InstEscalations from './pages/inst-admin/Escalations'
import InstAnalytics from './pages/inst-admin/Analytics'
import InstProfile from './pages/inst-admin/Profile'

// Department Admin Pages
import DeptOverview from './pages/dept-admin/Overview'
import DeptCourses from './pages/dept-admin/Courses'
import DeptFaculty from './pages/dept-admin/Faculty'
import DeptStudents from './pages/dept-admin/Students'
import DeptAnalytics from './pages/dept-admin/Analytics'
import DeptStudentIssues from './pages/dept-admin/StudentIssues'
import DeptPolicies from './pages/dept-admin/Policies'
import DeptProfile from './pages/dept-admin/Profile'
import DeptLectureAnalysis from './pages/dept-admin/LectureAnalysis'

// Super Admin Pages
import SuperOverview from './pages/super-admin/Overview'
import SuperInstitutions from './pages/super-admin/Institutions'
import SuperInstAdmins from './pages/super-admin/InstAdmins'
import SuperMonitoring from './pages/super-admin/Monitoring'
import SuperSecurityLogs from './pages/super-admin/SecurityLogs'
import SuperPolicies from './pages/super-admin/Policies'
import SuperProfile from './pages/super-admin/Profile'

// Auth guard components
function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  if (!user) return <Navigate to="/signin" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleDefaultPath(user.role)} replace />
  }
  return children
}

function getRoleDefaultPath(role) {
  switch (role) {
    case 'student': return '/student/dashboard'
    case 'professor': return '/professor/dashboard'
    case 'dept_admin': return '/dept-admin/overview'
    case 'inst_admin': return '/inst-admin/overview'
    case 'super_admin': return '/super-admin/overview'
    default: return '/signin'
  }
}

function AuthRedirect() {
  const { user, loading } = useAuth()
  if (loading) return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>
  if (user) return <Navigate to={getRoleDefaultPath(user.role)} replace />
  return <Navigate to="/signin" replace />
}

function App() {
  return (
    <Routes>
      {/* Auth */}
      <Route path="/" element={<AuthRedirect />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Navigate to="/signin" replace />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />

      {/* Student Portal */}
      <Route path="/student" element={
        <PrivateRoute allowedRoles={['student']}>
          <StudentLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<StudentDashboard />} />
        <Route path="lectures" element={<StudentLectures />} />
        <Route path="lectures/:id" element={<StudentLectureDetail />} />
        <Route path="labs" element={<StudentLabs />} />
        <Route path="labs/:id" element={<StudentLabDetail />} />
        <Route path="quiz" element={<StudentQuiz />} />
        <Route path="quiz/:id" element={<StudentQuizDetail />} />
        <Route path="assignments" element={<StudentAssignments />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="timetable" element={<StudentTimetable />} />
        <Route path="notifications" element={<StudentNotifications />} />
        <Route path="progress" element={<StudentProgress />} />
        <Route path="profile" element={<StudentProfile />} />
      </Route>

      {/* Professor Portal */}
      <Route path="/professor" element={
        <PrivateRoute allowedRoles={['professor']}>
          <ProfessorLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<ProfDashboard />} />
        <Route path="upload" element={<ProfUpload />} />
        <Route path="my-lectures" element={<ProfMyLectures />} />
        <Route path="my-labs" element={<ProfMyLabs />} />
        <Route path="quiz-builder" element={<ProfQuizBuilder />} />
        <Route path="quizzes" element={<ProfessorQuizzes />} />
        <Route path="assignments" element={<ProfAssignments />} />
        <Route path="attendance" element={<ProfAttendance />} />
        <Route path="gradebook" element={<ProfGradebook />} />
        <Route path="students" element={<ProfStudents />} />
        <Route path="analytics" element={<ProfAnalytics />} />
        <Route path="settings" element={<ProfSettings />} />
        <Route path="lectures/:lectureId" element={<LectureDetailWithQuiz />} />
        <Route path="labs/:id" element={<ProfessorLabDetail />} />
      </Route>

      {/* Institutional Admin */}
      <Route path="/inst-admin" element={
        <PrivateRoute allowedRoles={['inst_admin']}>
          <InstitutionalAdminLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<InstOverview />} />
        <Route path="departments" element={<InstDepartments />} />
        <Route path="dept-admins" element={<InstDeptAdmins />} />
        <Route path="policies" element={<InstPolicies />} />
        <Route path="escalations" element={<InstEscalations />} />
        <Route path="analytics" element={<InstAnalytics />} />
        <Route path="profile" element={<InstProfile />} />
      </Route>

      {/* Department Admin */}
      <Route path="/dept-admin" element={
        <PrivateRoute allowedRoles={['dept_admin']}>
          <DepartmentalAdminLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<DeptOverview />} />
        <Route path="courses" element={<DeptCourses />} />
        <Route path="faculty" element={<DeptFaculty />} />
        <Route path="students" element={<DeptStudents />} />
        <Route path="analytics" element={<DeptAnalytics />} />
        <Route path="student-issues" element={<DeptStudentIssues />} />
        <Route path="policies" element={<DeptPolicies />} />
        <Route path="profile" element={<DeptProfile />} />
        <Route path="lecture-analysis/:id" element={<DeptLectureAnalysis />} />
      </Route>

      {/* Super Admin */}
      <Route path="/super-admin" element={
        <PrivateRoute allowedRoles={['super_admin']}>
          <SuperAdminLayout />
        </PrivateRoute>
      }>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<SuperOverview />} />
        <Route path="institutions" element={<SuperInstitutions />} />
        <Route path="inst-admins" element={<SuperInstAdmins />} />
        <Route path="monitoring" element={<SuperMonitoring />} />
        <Route path="security-logs" element={<SuperSecurityLogs />} />
        <Route path="policies" element={<SuperPolicies />} />
        <Route path="profile" element={<SuperProfile />} />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<AuthRedirect />} />
    </Routes>
  )
}

export default App
