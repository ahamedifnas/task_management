import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { format } from 'date-fns'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { minutesToHHMM } from '../../utils/otCalculations'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import {
  HiClipboardDocumentList, HiClock, HiArrowTrendingUp, HiCheckCircle, HiInbox,
} from 'react-icons/hi2'

export default function EmployeeDashboard() {
  const { userProfile } = useAuth()
  const [recentDays, setRecentDays] = useState([])
  const [todayWorkday, setTodayWorkday] = useState(null)
  const [loading, setLoading] = useState(true)

  const today = format(new Date(), 'yyyy-MM-dd')

  useEffect(() => {
    if (!userProfile?.uid) return

    async function fetchData() {
      try {
        const q = query(
          collection(db, 'workdays'),
          where('employeeId', '==', userProfile.uid),
          orderBy('workDate', 'desc'),
          limit(7)
        )
        const snap = await getDocs(q)
        const days = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setRecentDays(days)
        setTodayWorkday(days.find((d) => d.workDate === today) || null)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userProfile, today])

  const stats = [
    {
      label: "Today's Status",
      value: todayWorkday ? todayWorkday.status : 'No Entry',
      icon: HiClipboardDocumentList,
      color: 'text-indigo-400',
    },
    {
      label: "Today's Hours",
      value: todayWorkday ? minutesToHHMM(todayWorkday.totalWorkMin || 0) : '—',
      icon: HiClock,
      color: 'text-sky-400',
    },
    {
      label: 'Overtime Today',
      value: todayWorkday ? minutesToHHMM(todayWorkday.overtimeMin || 0) : '—',
      icon: HiArrowTrendingUp,
      color: 'text-amber-400',
    },
    {
      label: 'Submissions This Week',
      value: recentDays.filter((d) => ['SUBMITTED', 'APPROVED'].includes(d.status)).length,
      icon: HiCheckCircle,
      color: 'text-emerald-400',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">
            Good {getGreeting()}, {userProfile?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {format(new Date(), 'EEEE, MMMM do yyyy')}
          </p>
        </div>
        <Link
          to="/employee/timesheet"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-indigo-500/20"
        >
          <span>+</span>
          <span>{todayWorkday ? "Update Today's Timesheet" : "Start Today's Timesheet"}</span>
        </Link>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <LoadingSpinner text="Loading your data..." />
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon
              return (
                <div key={stat.label} className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${stat.color}`} />
                    <span className="text-slate-400 text-xs">{stat.label}</span>
                  </div>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              )
            })}
          </div>

          {/* Recent Activity */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
              <h2 className="text-white font-semibold">Recent Timesheets</h2>
              <Link to="/employee/history" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                View all →
              </Link>
            </div>
            {recentDays.length === 0 ? (
              <div className="py-12 text-center">
                <HiInbox className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No timesheets yet</p>
                <p className="text-slate-500 text-sm mt-1">Start by creating today's entry</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {recentDays.map((day) => (
                  <Link
                    key={day.id}
                    to={`/employee/timesheet?date=${day.workDate}`}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-700/30 transition-colors group"
                  >
                    <div>
                      <p className="text-slate-200 text-sm font-medium group-hover:text-white transition-colors">
                        {format(new Date(day.workDate + 'T00:00:00'), 'EEE, MMM d')}
                        {day.workDate === today && (
                          <span className="ml-2 text-xs bg-indigo-600/30 text-indigo-400 px-2 py-0.5 rounded-full">Today</span>
                        )}
                      </p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        {minutesToHHMM(day.totalWorkMin || 0)} total
                        {day.overtimeMin > 0 && ` · ${minutesToHHMM(day.overtimeMin)} OT`}
                      </p>
                    </div>
                    <StatusBadge status={day.status} />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
