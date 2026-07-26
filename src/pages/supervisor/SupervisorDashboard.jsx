import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../firebase/config'
import { minutesToHHMM } from '../../utils/otCalculations'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'
import { HiClock, HiUserGroup, HiCalendarDays, HiCheckCircle } from 'react-icons/hi2'

export default function SupervisorDashboard() {
  const [pending, setPending] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [approvalSnap, empSnap] = await Promise.all([
          getDocs(query(collection(db, 'approvals'), where('status', '==', 'PENDING'))),
          getDocs(query(collection(db, 'users'), where('role', '==', 'employee'), where('status', '==', 'active'))),
        ])
        const approvals = approvalSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        const empList = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setEmployees(empList)

        const wdIds = approvals.map((a) => a.workdayId)
        if (wdIds.length > 0) {
          const wdPromises = wdIds.map((id) =>
            getDocs(query(collection(db, 'workdays'), where('__name__', '==', id)))
          )
          const wdSnaps = await Promise.all(wdPromises)
          const wdMap = {}
          wdSnaps.forEach((snap) => snap.docs.forEach((d) => { wdMap[d.id] = { id: d.id, ...d.data() } }))
          const enriched = approvals.map((a) => ({
            ...a,
            workday: wdMap[a.workdayId],
            employee: empList.find((e) => e.id === (wdMap[a.workdayId]?.employeeId)),
          }))
          setPending(enriched)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const stats = [
    { label: 'Pending Reviews', value: pending.length, icon: HiClock, color: 'text-amber-600 dark:text-amber-400' },
    { label: 'Team Members', value: employees.length, icon: HiUserGroup, color: 'text-sky-600 dark:text-sky-400' },
    { label: 'Month', value: format(new Date(), 'MMM yyyy'), icon: HiCalendarDays, color: 'text-indigo-600 dark:text-indigo-400' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-slate-900 dark:text-white text-2xl font-bold">Supervisor Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">
          {format(new Date(), 'EEEE, MMMM do yyyy')}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 transition-colors duration-300">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-slate-600 dark:text-slate-400 text-xs">{s.label}</span>
              </div>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          )
        })}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading pending reviews..." />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 transition-colors duration-300">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
            <h2 className="text-slate-900 dark:text-white font-semibold">Pending Approvals</h2>
            <Link to="/supervisor/pending" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 text-sm">
              View all →
            </Link>
          </div>
          {pending.length === 0 ? (
            <div className="py-12 text-center">
              <HiCheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-500 mx-auto mb-3" />
              <p className="text-slate-600 dark:text-slate-400 font-medium">All caught up!</p>
              <p className="text-slate-500 text-sm mt-1">No pending timesheets to review</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-slate-700/50">
              {pending.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to={`/supervisor/pending?id=${item.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors duration-300 group"
                >
                  <div>
                    <p className="text-slate-800 dark:text-slate-200 text-sm font-medium group-hover:text-slate-900 dark:group-hover:text-slate-900 dark:hover:text-white">
                      {item.employee?.name || 'Unknown'}
                    </p>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {item.workday?.workDate && format(new Date(item.workday.workDate + 'T00:00:00'), 'MMM d, yyyy')}
                      {' · '}
                      {minutesToHHMM(item.workday?.totalWorkMin || 0)}
                    </p>
                  </div>
                  <StatusBadge status="SUBMITTED" />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
