import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../firebase/config'
import LoadingSpinner from '../../components/common/LoadingSpinner'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ employees: 0, projects: 0, pending: 0, approved: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const [empSnap, projSnap, pendingSnap, approvedSnap] = await Promise.all([
          getDocs(query(collection(db, 'users'), where('role', '==', 'employee'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'projects'), where('status', '==', 'active'))),
          getDocs(query(collection(db, 'approvals'), where('status', '==', 'PENDING'))),
          getDocs(query(collection(db, 'approvals'), where('status', '==', 'APPROVED'))),
        ])
        setStats({
          employees: empSnap.size,
          projects: projSnap.size,
          pending: pendingSnap.size,
          approved: approvedSnap.size,
        })
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const cards = [
    { label: 'Active Employees', value: stats.employees, icon: '👤', color: 'text-sky-400', to: '/admin/employees' },
    { label: 'Active Projects', value: stats.projects, icon: '📁', color: 'text-violet-400', to: '/admin/projects' },
    { label: 'Pending Approvals', value: stats.pending, icon: '⏳', color: 'text-amber-400', to: '/admin/reports' },
    { label: 'Approved This Month', value: stats.approved, icon: '✅', color: 'text-emerald-400', to: '/admin/reports' },
  ]

  const quickLinks = [
    { to: '/admin/employees', label: 'Manage Employees', desc: 'Add, edit or deactivate staff', icon: '👤' },
    { to: '/admin/projects', label: 'Manage Projects', desc: 'Configure client projects', icon: '📁' },
    { to: '/admin/ot-policy', label: 'OT Policy', desc: 'Set overtime multipliers and rules', icon: '⚙️' },
    { to: '/admin/reports', label: 'Monthly Reports', desc: 'Generate and export payroll data', icon: '📊' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">{format(new Date(), 'EEEE, MMMM do yyyy')}</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading stats..." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((c) => (
              <Link key={c.label} to={c.to} className="bg-slate-800 rounded-xl border border-slate-700/50 p-4 hover:border-slate-600 transition-colors group">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{c.icon}</span>
                  <span className="text-slate-400 text-xs">{c.label}</span>
                </div>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
              </Link>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickLinks.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="bg-slate-800 rounded-xl border border-slate-700/50 p-5 hover:border-indigo-500/50 hover:bg-slate-700/50 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-xl shrink-0">
                    {l.icon}
                  </div>
                  <div>
                    <p className="text-white font-medium group-hover:text-indigo-300 transition-colors">{l.label}</p>
                    <p className="text-slate-400 text-sm mt-0.5">{l.desc}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
