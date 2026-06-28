import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { minutesToHHMM } from '../../utils/otCalculations'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import { HiInbox } from 'react-icons/hi2'

export default function History() {
  const { userProfile } = useAuth()
  const [workdays, setWorkdays] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('ALL')

  useEffect(() => {
    if (!userProfile?.uid) return
    async function fetchHistory() {
      try {
        const q = query(
          collection(db, 'workdays'),
          where('employeeId', '==', userProfile.uid),
          orderBy('workDate', 'desc')
        )
        const snap = await getDocs(q)
        setWorkdays(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } finally {
        setLoading(false)
      }
    }
    fetchHistory()
  }, [userProfile])

  const filtered = filterStatus === 'ALL' ? workdays : workdays.filter((w) => w.status === filterStatus)
  const statuses = ['ALL', 'DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED']

  const totalApprovedOT = workdays
    .filter((w) => w.status === 'APPROVED')
    .reduce((s, w) => s + (w.overtimeMin || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Timesheet History</h1>
        <p className="text-slate-400 text-sm mt-0.5">View and track all your past submissions</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
          <p className="text-slate-400 text-xs mb-1">Total Entries</p>
          <p className="text-white text-xl font-bold">{workdays.length}</p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
          <p className="text-slate-400 text-xs mb-1">Approved</p>
          <p className="text-emerald-400 text-xl font-bold">
            {workdays.filter((w) => w.status === 'APPROVED').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
          <p className="text-slate-400 text-xs mb-1">Pending</p>
          <p className="text-amber-400 text-xl font-bold">
            {workdays.filter((w) => w.status === 'SUBMITTED').length}
          </p>
        </div>
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
          <p className="text-slate-400 text-xs mb-1">Total Approved OT</p>
          <p className="text-indigo-400 text-xl font-bold">{minutesToHHMM(totalApprovedOT)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterStatus === s
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
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
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50">
          {filtered.map((day) => (
            <Link
              key={day.id}
              to={`/employee/timesheet?date=${day.workDate}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors group"
            >
              <div>
                <p className="text-slate-200 text-sm font-medium group-hover:text-white">
                  {format(new Date(day.workDate + 'T00:00:00'), 'EEEE, MMMM d, yyyy')}
                </p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {minutesToHHMM(day.totalWorkMin || 0)} total work
                  {day.overtimeMin > 0 && (
                    <span className="text-amber-500 ml-2">· {minutesToHHMM(day.overtimeMin)} OT</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={day.status} />
                <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
