import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  collection, query, where, getDocs, doc, getDoc,
  updateDoc, serverTimestamp, orderBy,
} from 'firebase/firestore'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { minutesToHHMM } from '../../utils/otCalculations'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import { HiCheckCircle, HiXMark, HiCheck } from 'react-icons/hi2'

export default function PendingReviews() {
  const { userProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const [approvals, setApprovals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedApproval, setSelectedApproval] = useState(null)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [otPolicy, setOtPolicy] = useState(null)
  const [comment, setComment] = useState('')
  const [processing, setProcessing] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)

  useEffect(() => {
    fetchPending()
    fetchProjects()
  }, [])

  async function fetchProjects() {
    const [projectSnap, policySnap] = await Promise.all([
      getDocs(collection(db, 'projects')),
      getDocs(collection(db, 'otPolicy')),
    ])
    setProjects(projectSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    if (!policySnap.empty) setOtPolicy(policySnap.docs[0].data())
  }

  async function fetchPending() {
    setLoading(true)
    try {
      const approvalSnap = await getDocs(
        query(collection(db, 'approvals'), where('status', '==', 'PENDING'))
      )
      const list = approvalSnap.docs.map((d) => ({ id: d.id, ...d.data() }))

      const enriched = await Promise.all(
        list.map(async (a) => {
          const [wdSnap, empSnap] = await Promise.all([
            getDoc(doc(db, 'workdays', a.workdayId)),
            a.employeeId ? getDoc(doc(db, 'users', a.employeeId)) : Promise.resolve(null),
          ])
          return {
            ...a,
            workday: wdSnap.exists() ? { id: wdSnap.id, ...wdSnap.data() } : null,
            employee: empSnap?.exists() ? { id: empSnap.id, ...empSnap.data() } : null,
          }
        })
      )
      enriched.sort((a, b) => (a.workday?.workDate || '').localeCompare(b.workday?.workDate || ''))
      setApprovals(enriched)

      const initId = searchParams.get('id')
      if (initId) {
        const found = enriched.find((a) => a.id === initId)
        if (found) openDetail(found)
      }
    } finally {
      setLoading(false)
    }
  }

  async function openDetail(approval) {
    setSelectedApproval(approval)
    setComment('')
    setDetailOpen(true)
    if (approval.workday?.id) {
      const taskSnap = await getDocs(
        query(collection(db, 'workdays', approval.workday.id, 'tasks'), orderBy('startTime'))
      )
      setTasks(taskSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
    }
  }

  async function handleDecision(decision) {
    if (!selectedApproval) return
    setProcessing(true)
    try {
      const status = decision === 'approve' ? 'APPROVED' : 'REJECTED'
      await updateDoc(doc(db, 'approvals', selectedApproval.id), {
        status,
        approverId: userProfile.uid,
        comment,
        approvedAt: serverTimestamp(),
      })
      await updateDoc(doc(db, 'workdays', selectedApproval.workday.id), {
  status,
  rejectionComment: decision === 'reject' ? comment : null,
})
      toast.success(`Timesheet ${decision === 'approve' ? 'approved' : 'rejected'}!`)
      setDetailOpen(false)
      setApprovals((prev) => prev.filter((a) => a.id !== selectedApproval.id))
    } catch {
      toast.error('Action failed')
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Pending Reviews</h1>
        <p className="text-slate-400 text-sm mt-0.5">Review and approve team timesheets</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading submissions..." />
      ) : approvals.length === 0 ? (
        <EmptyState
          icon={<HiCheckCircle className="w-12 h-12 text-emerald-500" />}
          title="All caught up!"
          description="No pending timesheets to review"
        />
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 divide-y divide-slate-700/50">
          {approvals.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between px-5 py-4 hover:bg-slate-700/30 transition-colors cursor-pointer"
              onClick={() => openDetail(item)}
            >
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-semibold text-sm shrink-0">
                  {item.employee?.name?.charAt(0) || '?'}
                </div>
                <div>
                  <p className="text-slate-200 text-sm font-medium">{item.employee?.name || 'Unknown'}</p>
                  <p className="text-slate-500 text-xs mt-0.5">
                    {item.workday?.workDate
                      ? format(new Date(item.workday.workDate + 'T00:00:00'), 'EEE, MMM d, yyyy')
                      : '—'}
                    {' · '}
                 {Number(item.workday?.overtimeMin) > 0 && (
  <span className="text-amber-500 ml-1">
    · {minutesToHHMM(Number(item.workday?.overtimeMin) || 0)} OT
  </span>
)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status="SUBMITTED" />
                <button
                  className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-400 text-xs font-medium rounded-lg transition-colors border border-indigo-500/30"
                  onClick={(e) => { e.stopPropagation(); openDetail(item) }}
                >
                  Review
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        isOpen={detailOpen}
        onClose={() => { setDetailOpen(false); setTasks([]) }}
        title={`Review — ${selectedApproval?.employee?.name || 'Timesheet'}`}
        size="lg"
      >
        {selectedApproval && (
          <div className="space-y-4">
            {/* Info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Date</p>
                <p className="text-slate-200 text-sm font-medium">
                  {selectedApproval.workday?.workDate
                    ? format(new Date(selectedApproval.workday.workDate + 'T00:00:00'), 'MMM d, yyyy')
                    : '—'}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Total Work</p>
                <p className="text-sky-400 text-sm font-bold">{minutesToHHMM(selectedApproval.workday?.totalWorkMin)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-3">
                <p className="text-slate-500 text-xs mb-1">Overtime</p>
                <p className="text-amber-400 text-sm font-bold">
  {minutesToHHMM(Number(selectedApproval.workday?.overtimeMin) || 0)}
</p>
              </div>
            </div>

            {/* Tasks */}
            <div>
              <h3 className="text-slate-300 text-sm font-medium mb-2">Tasks</h3>
              <div className="space-y-2">
                {tasks.map((task) => {
                  const proj = projects.find((p) => p.id === task.projectId)
                  return (
                    <div key={task.id} className="bg-slate-900/50 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-400">
                          {task.startTime} – {task.endTime}
                        </span>
                        <span className="text-xs text-amber-400 font-medium">{minutesToHHMM(task.durationMin)}</span>
                      </div>
                      {proj && <p className="text-indigo-400 text-xs mb-0.5">{proj.projectName}</p>}
                      <p className="text-slate-200 text-sm">{task.description}</p>
                      {task.workReport && (
                        <p className="text-slate-400 text-xs mt-1">{task.workReport}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">
                Comment <span className="text-slate-500 font-normal">(optional for approval, recommended for rejection)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Add a comment..."
                rows={2}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleDecision('reject')}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-900/30 hover:bg-red-800/50 disabled:opacity-60 text-red-400 font-medium rounded-lg text-sm border border-red-700/50 transition-colors"
              >
                <HiXMark className="w-4 h-4" />
                <span>{processing ? 'Processing...' : 'Reject'}</span>
              </button>
              <button
                onClick={() => handleDecision('approve')}
                disabled={processing}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
              >
                <HiCheck className="w-4 h-4" />
                <span>{processing ? 'Processing...' : 'Approve'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
