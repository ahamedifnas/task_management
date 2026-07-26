import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { minutesToHHMM } from '../../utils/otCalculations'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { HiInbox } from 'react-icons/hi2'

export default function History() {
  const { currentUser, userProfile } = useAuth()
  const [workdays, setWorkdays] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')
  const employeeId = currentUser?.uid || userProfile?.uid

  useEffect(() => {
    if (!employeeId) return

    async function fetchHistory() {
      setLoading(true)
      try {
        const q = query(
          collection(db, 'workdays'),
          where('employeeId', '==', employeeId)
        )

        const workdaySnap = await getDocs(q)
        const employeeWorkdays = workdaySnap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.workDate || '').localeCompare(a.workDate || ''))

        setWorkdays(employeeWorkdays)
      } catch (error) {
        console.error('Failed to load timesheet history:', error)
        setWorkdays([])
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [employeeId])

  const filtered = filterStatus === 'ALL' ? workdays : workdays.filter((w) => w.status === filterStatus)
  const statuses = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']

  const totalApprovedOT = workdays
    .filter((w) => w.status === 'APPROVED')
    .reduce((sum, workday) => sum + (Number(workday.overtimeMin) || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-slate-900 dark:text-white text-2xl font-bold">Timesheet History</h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">View and track all your past submissions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 transition-colors duration-300">
          <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Total Entries</p>
          <p className="text-slate-900 dark:text-white text-xl font-bold">{workdays.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 transition-colors duration-300">
          <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Approved</p>
          <p className="text-emerald-600 dark:text-emerald-400 text-xl font-bold">
            {workdays.filter((w) => w.status === 'APPROVED').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 transition-colors duration-300">
          <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Pending</p>
          <p className="text-amber-600 dark:text-amber-400 text-xl font-bold">
            {workdays.filter((w) => w.status === 'SUBMITTED').length}
          </p>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 transition-colors duration-300">
          <p className="text-slate-600 dark:text-slate-400 text-xs mb-1">Total Approved OT</p>
          <p className="text-indigo-600 dark:text-indigo-400 text-xl font-bold">{minutesToHHMM(totalApprovedOT)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-300 ${
              filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700'
            }`}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner text="Loading history..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HiInbox className="w-12 h-12" />}
          title="No entries found"
          description="No timesheet entries match your filter"
        />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 transition-colors duration-300">
          {filtered.map((day) => {
            const overtimeMin = Number(day.overtimeMin) || 0
            return (
              <Link
                key={day.id}
                to={`/employee/timesheet?date=${day.workDate}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-slate-100 dark:hover:bg-slate-700/30 transition-colors duration-300 group"
              >
              <div>
                <p className="text-slate-800 dark:text-slate-200 text-sm font-medium group-hover:text-slate-900 dark:group-hover:text-slate-900 dark:hover:text-white">
                  {format(new Date(day.workDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {minutesToHHMM(day.totalWorkMin || 0)} total work
                  {overtimeMin > 0 && (
                    <span className="text-amber-500 ml-2">· {minutesToHHMM(overtimeMin)} OT</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={day.status} />
                <svg className="w-4 h-4 text-slate-500 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
