import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import {
  HiHome, HiClipboardDocumentList, HiCalendarDays, HiClock,
  HiUserGroup, HiUser, HiFolderOpen, HiCog6Tooth, HiChartBarSquare,
  HiArrowRightOnRectangle, HiXMark,
} from 'react-icons/hi2'

const employeeLinks = [
  { to: '/employee', label: 'Dashboard', icon: HiHome, end: true },
  { to: '/employee/timesheet', label: 'My Timesheet', icon: HiClipboardDocumentList },
  { to: '/employee/history', label: 'History', icon: HiCalendarDays },
]
const supervisorLinks = [
  { to: '/supervisor', label: 'Dashboard', icon: HiHome, end: true },
  { to: '/supervisor/pending', label: 'Pending Reviews', icon: HiClock },
  { to: '/supervisor/team', label: 'Team Overview', icon: HiUserGroup },
]
const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: HiHome, end: true },
  { to: '/admin/employees', label: 'Employees', icon: HiUser },
  { to: '/admin/projects', label: 'Projects', icon: HiFolderOpen },
  { to: '/admin/ot-policy', label: 'OT Policy', icon: HiCog6Tooth },
  { to: '/admin/reports', label: 'Reports', icon: HiChartBarSquare },
]

const roleLinks = { EMPLOYEE: employeeLinks, SUPERVISOR: supervisorLinks, ADMIN: adminLinks }
const roleColors = { EMPLOYEE: 'text-sky-600 dark:text-sky-400', SUPERVISOR: 'text-violet-600 dark:text-violet-400', ADMIN: 'text-emerald-600 dark:text-emerald-400' }

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

  const initials = userProfile?.fullName
    ? userProfile.fullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <aside className={`flex flex-col h-full bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700/50 transition-colors duration-300 ${mobile ? 'w-full' : 'w-64'}`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-200 dark:border-slate-700/50">
        <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
          T
        </div>
        <div>
          <p className="text-slate-900 dark:text-white font-semibold text-sm leading-tight">Timesheet</p>
          <p className="text-slate-500 text-xs">Manager</p>
        </div>
        {mobile && (
          <button onClick={onClose} className="ml-auto text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">
            <HiXMark className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* User Profile */}
      <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-600/30 border border-indigo-500/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="text-slate-900 dark:text-white text-sm font-medium truncate">{userProfile?.fullName || 'User'}</p>
            <p className={`text-xs font-medium ${roleColors[userProfile?.role] || 'text-slate-600 dark:text-slate-400'}`}>
              {userProfile?.role || 'EMPLOYEE'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {links.map((link) => {
          const Icon = link.icon
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={mobile ? onClose : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? 'bg-indigo-100/70 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 font-medium border border-indigo-500/30'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
                }`
              }
            >
              <Icon className="w-4.5 h-4.5 shrink-0" style={{ width: '1.1rem', height: '1.1rem' }} />
              <span>{link.label}</span>
            </NavLink>
          )
        })}
      </nav>

      {/* Department & Logout */}
      <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-700/50 space-y-3">
        {userProfile?.department && (
          <p className="text-slate-500 text-xs px-1">
            Dept: <span className="text-slate-600 dark:text-slate-400">{userProfile.department}</span>
          </p>
        )}
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-600 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
        >
          <HiArrowRightOnRectangle className="w-4 h-4 shrink-0" />
          <span>{loggingOut ? 'Signing out...' : 'Sign Out'}</span>
        </button>
      </div>
    </aside>
  )
}
