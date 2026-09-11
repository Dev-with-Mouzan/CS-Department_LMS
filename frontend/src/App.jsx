import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import LoadingSpinner from './components/LoadingSpinner'
import ErrorBoundary from './components/ErrorBoundary'

// Lazy-loaded page components
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const VerifyOTP = lazy(() => import('./pages/VerifyOTP'))
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'))
const LandingPage = lazy(() => import('./pages/LandingPage'))

const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const ManageUsers = lazy(() => import('./admin/ManageUsers'))
const ManageCourses = lazy(() => import('./admin/ManageCourses'))
const ManageAttendance = lazy(() => import('./admin/ManageAttendance'))
const Examinations = lazy(() => import('./admin/Examinations'))
const Promotion = lazy(() => import('./admin/Promotion'))
const AdminBackup = lazy(() => import('./admin/AdminBackup'))

const TeacherDashboard = lazy(() => import('./teacher/TeacherDashboard'))
const Assessments = lazy(() => import('./teacher/Assessments'))
const CreateAssignment = lazy(() => import('./teacher/CreateAssignment'))
const CreateQuiz = lazy(() => import('./teacher/CreateQuiz'))
const ManageMaterials = lazy(() => import('./teacher/ManageMaterials'))
const Submissions = lazy(() => import('./teacher/Submissions'))
const MarkAttendance = lazy(() => import('./teacher/MarkAttendance'))
const Results = lazy(() => import('./teacher/Results'))

const StudentDashboard = lazy(() => import('./student/StudentDashboard'))
const MyReview = lazy(() => import('./student/MyReview'))
const MyAssignments = lazy(() => import('./student/MyAssignments'))
const MyResults = lazy(() => import('./student/MyResults'))
const MyMaterials = lazy(() => import('./student/MyMaterials'))
const MyAttendance = lazy(() => import('./student/MyAttendance'))

// Eager-loaded components (always needed)
import Layout from './components/Layout'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  const { loading, isAuthenticated } = useAuth()

  if (loading) return <LoadingSpinner />

  return (
    <ErrorBoundary>
    <Suspense fallback={<LoadingSpinner />}>
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
            <Route path="/admin/courses" element={<ManageCourses />} />
            <Route path="/admin/attendance" element={<ManageAttendance />} />
            <Route path="/admin/examinations" element={<Examinations />} />
            <Route path="/admin/promotion" element={<Promotion />} />
            <Route path="/admin/backup" element={<AdminBackup />} />
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
    </Suspense>
    </ErrorBoundary>
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
