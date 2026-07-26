import { useEffect, useState } from 'react'
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore'
import { format, startOfMonth, endOfMonth, getDaysInMonth } from 'date-fns'
import { db } from '../../firebase/config'
import { minutesToHHMM } from '../../utils/otCalculations'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import StatusBadge from '../../components/common/StatusBadge'

export default function TeamOverview() {
  const [employees, setEmployees] = useState([])
  const [workdayMap, setWorkdayMap] = useState({})
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const empSnap = await getDocs(
          query(collection(db, 'users'), where('role', '==', 'employee'))
        )
        const empList = empSnap.docs.map((d) => ({ id: d.id, ...d.data() }))
        setEmployees(empList)

        const [year, month] = selectedMonth.split('-').map(Number)
        const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
        const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

        const wdSnap = await getDocs(
          query(
            collection(db, 'workdays'),
            where('workDate', '>=', startDate),
            where('workDate', '<=', endDate)
          )
        )
        const byEmp = {}
        wdSnap.docs.forEach((d) => {
          const data = d.data()
          if (!byEmp[data.employeeId]) byEmp[data.employeeId] = []
          byEmp[data.employeeId].push(data)
        })
        setWorkdayMap(byEmp)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [selectedMonth])

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-slate-900 dark:text-white text-2xl font-bold">Team Overview</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-0.5">Monthly summary of your team's work</p>
        </div>
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          max={format(new Date(), 'yyyy-MM')}
          className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-300"
        />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading team data..." />
      ) : (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700/50 overflow-hidden transition-colors duration-300">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700/50">
                  <th className="text-left px-5 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Days Logged</th>
                  <th className="text-left px-5 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Total Work</th>
                  <th className="text-left px-5 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Overtime</th>
                  <th className="text-left px-5 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Approved</th>
                  <th className="text-left px-5 py-3 text-slate-600 dark:text-slate-400 text-xs font-medium uppercase tracking-wider">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700/50">
                {employees.map((emp) => {
                  const days = workdayMap[emp.id] || []
                  const totalWork = days.reduce((s, d) => s + (d.totalWorkMin || 0), 0)
                  const totalOT = days.reduce((s, d) => s + (d.overtimeMin || 0), 0)
                  const approved = days.filter((d) => d.status === 'APPROVED').length
                  const pending = days.filter((d) => d.status === 'SUBMITTED').length
                  return (
                    <tr key={emp.id} className="hover:bg-slate-100 dark:hover:bg-slate-700/20 transition-colors duration-300">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-600/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-semibold text-xs shrink-0">
                            {emp.name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p className="text-slate-800 dark:text-slate-200 text-sm font-medium">{emp.name}</p>
                            <p className="text-slate-500 text-xs">{emp.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-700 dark:text-slate-300 text-sm">{days.length}</td>
                      <td className="px-5 py-4 text-sky-600 dark:text-sky-400 text-sm font-medium">{minutesToHHMM(totalWork)}</td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-medium ${totalOT > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                          {minutesToHHMM(totalOT)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-emerald-600 dark:text-emerald-400 text-sm font-medium">{approved}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`text-sm font-medium ${pending > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}`}>
                          {pending}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {employees.length === 0 && (
              <div className="py-12 text-center">
                <p className="text-slate-500 text-sm">No team members found</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
