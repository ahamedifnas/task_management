import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const employeeLinks = [
  { to: '/employee', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/employee/timesheet', label: 'My Timesheet', icon: '📋' },
  { to: '/employee/history', label: 'History', icon: '📅' },
]
const supervisorLinks = [
  { to: '/supervisor', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/supervisor/pending', label: 'Pending Reviews', icon: '⏳' },
  { to: '/supervisor/team', label: 'Team Overview', icon: '👥' },
]
const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: '🏠', end: true },
  { to: '/admin/employees', label: 'Employees', icon: '👤' },
  { to: '/admin/projects', label: 'Projects', icon: '📁' },
  { to: '/admin/ot-policy', label: 'OT Policy', icon: '⚙️' },
  { to: '/admin/reports', label: 'Reports', icon: '📊' },
]

const roleLinks = { employee: employeeLinks, supervisor: supervisorLinks, admin: adminLinks }
const roleLabels = { employee: 'Employee', supervisor: 'Supervisor', admin: 'Administrator' }
const roleColors = { employee: 'text-sky-400', supervisor: 'text-violet-400', admin: 'text-emerald-400' }

export default function Sidebar({ mobile, onClose }) {
  const { userProfile, logout } = useAuth()
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const links = roleLinks[userProfile?.role] || []

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
      navigate('/login')
    } catch {
      toast.error('Logout failed')
    } finally {
      setLoggingOut(false)
    }
  }

  const initials = userProfile?.name
    ? userProfile.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <aside className={`flex flex-col h-full bg-slate-900 border-r border-slate-700/50 ${mobile ? 'w-full' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-700/50">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          T
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Timesheet</p>
          <p className="text-slate-500 text-xs">Manager</p>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-slate-400 hover:text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-400 font-semibold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{userProfile?.name || 'User'}</p>
            <p className={`text-xs font-medium ${roleColors[userProfile?.role] || 'text-slate-400'}`}>
              {roleLabels[userProfile?.role] || userProfile?.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            onClick={mobile ? onClose : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                isActive
                  ? 'bg-indigo-600/20 text-indigo-400 font-medium border border-indigo-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            <span className="text-base">{link.icon}</span>
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Department & Logout */}
      <div className="px-4 py-4 border-t border-slate-700/50 space-y-3">
        {userProfile?.department && (
          <p className="text-slate-500 text-xs px-1">
            Dept: <span className="text-slate-400">{userProfile.department}</span>
          </p>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-red-900/30 hover:text-red-400 transition-all duration-150"
        >
          <span>🚪</span>
          <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  )
}
