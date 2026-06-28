import { Navigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, userProfile, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    )
  }

  if (!currentUser) return <Navigate to="/login" replace />

  if (allowedRoles && userProfile && !allowedRoles.includes(userProfile.role)) {
    const redirectMap = { admin: '/admin', supervisor: '/supervisor', employee: '/employee' }
    return <Navigate to={redirectMap[userProfile.role] || '/login'} replace />
  }

  return children
}
