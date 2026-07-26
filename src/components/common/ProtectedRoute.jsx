import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

// Keep in sync with AuthContext DEV_BYPASS
const DEV_BYPASS = false

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex items-center justify-center transition-colors duration-300">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    )
  }

  if (!DEV_BYPASS && !currentUser) return <Navigate to="/login" replace />
  if (!userProfile) return <Navigate to="/login" replace />

  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    const redirectMap = {
      ADMIN: '/admin/dashboard',
      SUPERVISOR: '/supervisor',
      EMPLOYEE: '/employee',
    }
    return <Navigate to={redirectMap[userProfile.role] || '/login'} replace />
  }

  return children
}
