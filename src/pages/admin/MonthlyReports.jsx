import { useEffect, useState } from 'react'
import {
  collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query,
  where, serverTimestamp,
} from 'firebase/firestore'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import toast from 'react-hot-toast'
import { db } from '../../firebase/config'
import { calcOTAmount, minutesToHHMM } from '../../utils/otCalculations'
import { exportToExcel, exportToPDF } from '../../utils/exportUtils'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import {
  HiArrowPath, HiExclamationTriangle, HiTableCells, HiDocumentArrowDown, HiChartBarSquare,
} from 'react-icons/hi2'

export default function MonthlyReports() {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [employees, setEmployees] = useState([])
  const [summaries, setSummaries] = useState([])
  const [otPolicy, setOtPolicy] = useState(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    async function fetchBase() {
      const [empSnap, policySnap] = await Promise.all([
        getDocs(query(collection(db, 'users'), where('role', '==', 'employee'), where('status', '==', 'active'))),
        getDocs(collection(db, 'otPolicy')),
      ])
      setEmployees(empSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      if (!policySnap.empty) setOtPolicy(policySnap.docs[0].data())
    }
    fetchBase()
  }, [])

  useEffect(() => {
    async function fetchSummaries() {
      setLoading(true)
      try {
        const snap = await getDocs(
          query(collection(db, 'monthlySummary'), where('yearMonth', '==', selectedMonth))
        )
        setSummaries(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } finally {
        setLoading(false)
      }
    }
    fetchSummaries()
  }, [selectedMonth])

  async function generateSummaries() {
    if (!otPolicy) {
      toast.error('Configure OT policy first')
      return
    }
    setGenerating(true)
    try {
      const [year, month] = selectedMonth.split('-').map(Number)
      const startDate = format(startOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')
      const endDate = format(endOfMonth(new Date(year, month - 1)), 'yyyy-MM-dd')

      const wdSnap = await getDocs(
        query(
          collection(db, 'workdays'),
          where('workDate', '>=', startDate),
          where('workDate', '<=', endDate),
          where('status', '==', 'APPROVED')
        )
      )
      const wdByEmp = {}
      wdSnap.docs.forEach((d) => {
        const data = d.data()
        if (!wdByEmp[data.employeeId]) wdByEmp[data.employeeId] = []
        wdByEmp[data.employeeId].push(data)
      })

      const newSummaries = []
      for (const emp of employees) {
        const days = wdByEmp[emp.id] || []
        const totalWorkMin = days.reduce((s, d) => s + (Number(d.totalWorkMin) || 0), 0)
       const overtimeMin = days.reduce(
  (sum, day) => sum + (Number(day.overtimeMin) || 0),
  0
)
        const otAmount = calcOTAmount(emp.basicSalary, otPolicy.stdHoursPerDay, otPolicy.multiplier, overtimeMin, selectedMonth)

        const existing = summaries.find((s) => s.employeeId === emp.id)
        const payload = {
          employeeId: emp.id,
          employeeName: emp.name,
          department: emp.department,
          basicSalary: emp.basicSalary,
          yearMonth: selectedMonth,
          totalWorkMin,
          overtimeMin,
          otAmount,
          generatedAt: serverTimestamp(),
        }

        if (existing) {
          await updateDoc(doc(db, 'monthlySummary', existing.id), payload)
          newSummaries.push({ id: existing.id, ...payload })
        } else {
          const ref = await addDoc(collection(db, 'monthlySummary'), payload)
          newSummaries.push({ id: ref.id, ...payload })
        }
      }
      setSummaries(newSummaries)
      toast.success(`Generated summaries for ${employees.length} employees`)
    } catch (err) {
      toast.error('Generation failed: ' + err.message)
    } finally {
      setGenerating(false)
    }
  }

  function closeDeleteModal() {
    if (deleting) return
    setDeleteTarget(null)
  }

  async function deleteMonthlyReport() {
    if (!deleteTarget) return

    setDeleting(true)
    const toastId = toast.loading('Deleting...')

    try {
      await deleteDoc(doc(db, 'monthlySummary', deleteTarget.id))
      setSummaries((prev) => prev.filter((summary) => summary.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Monthly report deleted successfully.', { id: toastId })
    } catch (error) {
      console.error('Delete monthly report failed:', error)
      toast.error('Delete failed.', { id: toastId })
    } finally {
      setDeleting(false)
    }
  }

  const enriched = summaries.map((s) => ({
    ...s,
    employeeName: s.employeeName || employees.find((e) => e.id === s.employeeId)?.name || 'Unknown',
    department: s.department || employees.find((e) => e.id === s.employeeId)?.department || '—',
  }))

  const totalOTAmount = enriched.reduce((s, r) => s + (r.otAmount || 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Monthly Reports</h1>
          <p className="text-slate-400 text-sm mt-0.5">Generate and export overtime payroll summaries</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            max={format(new Date(), 'yyyy-MM')}
            className="px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            onClick={generateSummaries}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <HiArrowPath className={`w-4 h-4 ${generating ? 'animate-spin' : ''}`} />
            <span>{generating ? 'Generating...' : 'Generate'}</span>
          </button>
        </div>
      </div>

      {!otPolicy && (
        <div className="bg-amber-900/20 border border-amber-700/30 rounded-xl px-5 py-4 flex items-start gap-3">
          <HiExclamationTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-400 text-sm font-medium">No OT policy configured</p>
            <p className="text-amber-300/70 text-xs mt-1">Configure an OT policy before generating reports.</p>
          </div>
        </div>
      )}

      {enriched.length > 0 && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Employees</p>
              <p className="text-white text-xl font-bold">{enriched.length}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Total OT Hours</p>
              <p className="text-amber-400 text-xl font-bold">
                {minutesToHHMM(enriched.reduce((s, r) => s + (r.overtimeMin || 0), 0))}
              </p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Total OT Amount</p>
              <p className="text-emerald-400 text-xl font-bold">LKR {totalOTAmount.toFixed(0)}</p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => { exportToExcel(enriched, `ot_report_${selectedMonth}`); toast.success('Excel exported!') }}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <HiTableCells className="w-4 h-4" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={() => { exportToPDF(enriched, selectedMonth, `ot_report_${selectedMonth}`); toast.success('PDF exported!') }}
              className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <HiDocumentArrowDown className="w-4 h-4" />
              <span>Export PDF</span>
            </button>
          </div>
        </>
      )}

      {loading ? (
        <LoadingSpinner text="Loading summaries..." />
      ) : enriched.length === 0 ? (
        <EmptyState
          icon={<HiChartBarSquare className="w-12 h-12" />}
          title="No summaries generated"
          description={`Click "Generate" to create the monthly report for ${selectedMonth}`}
        />
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Employee</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Basic Salary</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Total Work</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Overtime</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">OT Amount</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {enriched.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-semibold text-xs shrink-0">
                          {row.employeeName?.charAt(0)}
                        </div>
                        <span className="text-slate-200 text-sm font-medium">{row.employeeName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">{row.department}</td>
                    <td className="px-5 py-4 text-slate-300 text-sm">
                      LKR {Number(row.basicSalary || 0).toLocaleString()}
                    </td>
                    <td className="px-5 py-4 text-sky-400 text-sm font-medium">{minutesToHHMM(row.totalWorkMin)}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-medium ${row.overtimeMin > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                        {minutesToHHMM(row.overtimeMin)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-emerald-400 text-sm font-bold">
                        LKR {(row.otAmount || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setDeleteTarget(row)}
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-600 bg-slate-900/50">
                  <td colSpan={5} className="px-5 py-3 text-slate-300 text-sm font-semibold text-right">Total OT Payable:</td>
                  <td className="px-5 py-3 text-emerald-400 text-sm font-bold">LKR {totalOTAmount.toFixed(2)}</td>
                  <td className="px-5 py-3"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={Boolean(deleteTarget)}
        onClose={closeDeleteModal}
        title="Delete Monthly Report"
        size="sm"
      >
        <div className="space-y-4">
          <div className="bg-slate-900/50 rounded-lg px-4 py-3 space-y-2">
            <p className="text-slate-300 text-sm">
              <span className="text-slate-400">Employee:</span>{' '}
              {deleteTarget?.employeeName}
            </p>
            <p className="text-slate-300 text-sm">
              <span className="text-slate-400">Month:</span>{' '}
              {deleteTarget?.yearMonth || selectedMonth}
            </p>
          </div>

          <p className="text-slate-300 text-sm">
            Are you sure you want to permanently delete this monthly report?
          </p>

          <p className="text-red-400 text-sm">This action cannot be undone.</p>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deleting}
              className="flex-1 py-2.5 border border-slate-600 text-slate-300 hover:text-white rounded-lg text-sm disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={deleteMonthlyReport}
              disabled={deleting}
              className="flex-1 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
