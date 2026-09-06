import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import VerifyOTP from './pages/VerifyOTP'
import ForgotPassword from './pages/ForgotPassword'
import LandingPage from './pages/LandingPage'

// Dashboards
import AdminDashboard from './admin/AdminDashboard'
import ManageUsers from './admin/ManageUsers'
import ManageTeachers from './admin/ManageTeachers'
import ManageCourses from './admin/ManageCourses'
import Examinations from './admin/Examinations'
import ManageEnrollments from './admin/ManageEnrollments'
import TeacherDashboard from './teacher/TeacherDashboard'
import Assessments from './teacher/Assessments'
import CreateAssignment from './teacher/CreateAssignment'
import CreateQuiz from './teacher/CreateQuiz'
import ManageMaterials from './teacher/ManageMaterials'
import Submissions from './teacher/Submissions'
import MarkAttendance from './teacher/MarkAttendance'
import Results from './teacher/Results'

import StudentDashboard from './student/StudentDashboard'
import MyReview from './student/MyReview'
import MyAssignments from './student/MyAssignments'
import MyResults from './student/MyResults'
import MyMaterials from './student/MyMaterials'
import MyAttendance from './student/MyAttendance'

// Components
import Layout from './components/Layout'
import ProtectedRoute from './routes/ProtectedRoute'
import LoadingSpinner from './components/LoadingSpinner'

export default function App() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={isAuthenticated ? <Navigate to={getDefaultRoute()} /> : <LandingPage />} />

      {/* Public Routes */}
      <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
      <Route path="/verify-otp" element={<VerifyOTP />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />

      {/* Admin Routes */}
      <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
        <Route element={<Layout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/teachers" element={<ManageTeachers />} />
          <Route path="/admin/courses" element={<ManageCourses />} />
          <Route path="/admin/examinations" element={<Examinations />} />
          <Route path="/admin/enrollments" element={<ManageEnrollments />} />
        </Route>
      </Route>

      {/* Teacher Routes */}
      <Route element={<ProtectedRoute allowedRoles={['teacher']} />}>
        <Route element={<Layout />}>
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/assessments" element={<Assessments />} />
          <Route path="/teacher/create-assignment" element={<CreateAssignment />} />
          <Route path="/teacher/create-quiz" element={<CreateQuiz />} />
          <Route path="/teacher/submissions" element={<Submissions />} />
          <Route path="/teacher/attendance" element={<MarkAttendance />} />
          <Route path="/teacher/results" element={<Results />} />
          <Route path="/teacher/materials" element={<ManageMaterials />} />
        </Route>
      </Route>

      {/* Student Routes */}
      <Route element={<ProtectedRoute allowedRoles={['student']} />}>
        <Route element={<Layout />}>
          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/assignments" element={<MyAssignments />} />
          <Route path="/student/results" element={<MyResults />} />
          <Route path="/student/attendance" element={<MyAttendance />} />
          <Route path="/student/review" element={<MyReview />} />
          <Route path="/student/materials" element={<MyMaterials />} />
        </Route>
      </Route>

      {/* Default redirect */}
      <Route path="*" element={<Navigate to={isAuthenticated ? getDefaultRoute() : '/'} />} />
    </Routes>
  )
}

function getDefaultRoute() {
  const user = JSON.parse(localStorage.getItem('user') || '{}')
  switch (user.role) {
    case 'admin': return '/admin'
    case 'teacher': return '/teacher'
    case 'student': return '/student'
    default: return '/login'
  }
}
