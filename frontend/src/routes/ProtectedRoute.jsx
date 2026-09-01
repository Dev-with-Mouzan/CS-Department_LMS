import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute({ allowedRoles }) {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    // Redirect to their own dashboard
    switch (user?.role) {
      case 'admin': return <Navigate to="/admin" replace />
      case 'teacher': return <Navigate to="/teacher" replace />
      case 'student': return <Navigate to="/student" replace />
      default: return <Navigate to="/login" replace />
    }
  }

  return <Outlet />
}
