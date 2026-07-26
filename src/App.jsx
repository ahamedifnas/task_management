import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useAuth } from './contexts/AuthContext'

import Layout from './components/layout/Layout'
import ProtectedRoute from './components/common/ProtectedRoute'

import Login from './pages/auth/Login'

import EmployeeDashboard from './pages/employee/EmployeeDashboard'
import Timesheet from './pages/employee/Timesheet'
import History from './pages/employee/History'

import SupervisorDashboard from './pages/supervisor/SupervisorDashboard'
import PendingReviews from './pages/supervisor/PendingReviews'
import TeamOverview from './pages/supervisor/TeamOverview'

import AdminDashboard from './pages/admin/AdminDashboard'
import EmployeeManagement from './pages/admin/EmployeeManagement'
import ProjectManagement from './pages/admin/ProjectManagement'
import OTPolicy from './pages/admin/OTPolicy'
import MonthlyReports from './pages/admin/MonthlyReports'

function RoleRedirect() {
  const { userProfile, loading } = useAuth()
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500" />
      </div>
    )
  }
  if (!userProfile) return <Navigate to="/login" replace />
  const redirectMap = {
    ADMIN: '/admin/dashboard',
    SUPERVISOR: '/supervisor',
    EMPLOYEE: '/employee',
  }
  return <Navigate to={redirectMap[userProfile.role] || '/login'} replace />
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1e293b', color: '#f1f5f9', border: '1px solid #334155' },
          success: { iconTheme: { primary: '#10b981', secondary: '#f1f5f9' } },
          error: { iconTheme: { primary: '#ef4444', secondary: '#f1f5f9' } },
        }}
      />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<RoleRedirect />} />
        <Route path="/employee" element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><Layout /></ProtectedRoute>}>
          <Route index element={<EmployeeDashboard />} />
          <Route path="timesheet" element={<Timesheet />} />
          <Route path="history" element={<History />} />
        </Route>
        <Route path="/supervisor" element={<ProtectedRoute allowedRoles={['SUPERVISOR']}><Layout /></ProtectedRoute>}>
          <Route index element={<SupervisorDashboard />} />
          <Route path="pending" element={<PendingReviews />} />
          <Route path="team" element={<TeamOverview />} />
        </Route>
        <Route path="/admin" element={<ProtectedRoute allowedRoles={['ADMIN']}><Layout /></ProtectedRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="employees" element={<EmployeeManagement />} />
          <Route path="projects" element={<ProjectManagement />} />
          <Route path="ot-policy" element={<OTPolicy />} />
          <Route path="reports" element={<MonthlyReports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
