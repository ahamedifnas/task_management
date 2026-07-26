import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import {
  collection, doc, getDocs, addDoc, updateDoc, deleteDoc,
  serverTimestamp, query, where, orderBy,
} from 'firebase/firestore'
import { format } from 'date-fns'
import toast from 'react-hot-toast'
import { db } from '../../firebase/config'
import { useAuth } from '../../contexts/AuthContext'
import { calcDuration, calcOvertimeMinutes, hasOverlap, minutesToHHMM } from '../../utils/otCalculations'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import Modal from '../../components/common/Modal'
import {
  HiPencilSquare, HiTrash, HiClock, HiCheckCircle, HiXCircle, HiCheck,
} from 'react-icons/hi2'

export default function Timesheet() {
  const { userProfile } = useAuth()
  const [searchParams] = useSearchParams()
  const [selectedDate, setSelectedDate] = useState(
    searchParams.get('date') || format(new Date(), 'yyyy-MM-dd')
  )
  const [workday, setWorkday] = useState(null)
  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [otPolicy, setOtPolicy] = useState(null)

  const { register, handleSubmit, reset, formState: { errors }, watch } = useForm()
  const startTime = watch('startTime')
  const endTime = watch('endTime')
  const duration = startTime && endTime ? calcDuration(startTime, endTime) : 0

  const isLocked = workday?.status === 'SUBMITTED' || workday?.status === 'APPROVED'

  const fetchData = useCallback(async () => {
    if (!userProfile?.uid) return
    setLoading(true)
    try {
      const [projSnap, policySnap] = await Promise.all([
        getDocs(query(collection(db, 'projects'), where('status', '==', 'active'))),
        getDocs(collection(db, 'otPolicy')),
      ])
      setProjects(projSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      if (!policySnap.empty) setOtPolicy(policySnap.docs[0].data())

      const wdQ = query(
        collection(db, 'workdays'),
        where('employeeId', '==', userProfile.uid),
        where('workDate', '==', selectedDate)
      )
      const wdSnap = await getDocs(wdQ)
      if (!wdSnap.empty) {
        const wdDoc = wdSnap.docs[0]
        const wd = { id: wdDoc.id, ...wdDoc.data() }
        setWorkday(wd)
        const taskSnap = await getDocs(
          query(collection(db, 'workdays', wdDoc.id, 'tasks'), orderBy('startTime'))
        )
        setTasks(taskSnap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } else {
        setWorkday(null)
        setTasks([])
      }
    } finally {
      setLoading(false)
    }
  }, [userProfile, selectedDate])

  useEffect(() => { fetchData() }, [fetchData])

  async function ensureWorkday() {
    if (workday) return workday
    const newWd = {
      employeeId: userProfile.uid,
      workDate: selectedDate,
      status: 'DRAFT',
      totalWorkMin: 0,
      overtimeMin: 0,
      createdAt: serverTimestamp(),
    }
    const ref = await addDoc(collection(db, 'workdays'), newWd)
    const created = { id: ref.id, ...newWd }
    setWorkday(created)
    return created
  }

  async function updateWorkdayTotals(wd, updatedTasks) {
    const totalMin = updatedTasks.reduce((sum, task) => sum + (Number(task.durationMin) || 0), 0)
    const overtimeMin = calcOvertimeMinutes(
      totalMin,
      otPolicy?.stdHoursPerDay,
      otPolicy?.roundingRule
    )
    await updateDoc(doc(db, 'workdays', wd.id), { totalWorkMin: totalMin, overtimeMin })
    setWorkday((prev) => ({ ...prev, totalWorkMin: totalMin, overtimeMin }))
  }

  async function onTaskSubmit(data) {
    if (!data.endTime || data.endTime <= data.startTime) {
      toast.error('End time must be after start time')
      return
    }
    const otherTasks = editingTask ? tasks.filter((t) => t.id !== editingTask.id) : tasks
    if (hasOverlap(otherTasks, data.startTime, data.endTime)) {
      toast.error('Task times overlap with an existing task')
      return
    }
    setSubmitting(true)
    try {
      const wd = await ensureWorkday()
      const durationMin = calcDuration(data.startTime, data.endTime)
      const taskData = { ...data, durationMin }

      let updatedTasks
      if (editingTask) {
        await updateDoc(doc(db, 'workdays', wd.id, 'tasks', editingTask.id), taskData)
        updatedTasks = tasks.map((t) => t.id === editingTask.id ? { ...t, ...taskData } : t)
        toast.success('Task updated')
      } else {
        const ref = await addDoc(collection(db, 'workdays', wd.id, 'tasks'), taskData)
        updatedTasks = [...tasks, { id: ref.id, ...taskData }]
        toast.success('Task added')
      }
      updatedTasks.sort((a, b) => a.startTime.localeCompare(b.startTime))
      setTasks(updatedTasks)
      await updateWorkdayTotals(wd, updatedTasks)
      setTaskModalOpen(false)
      reset()
      setEditingTask(null)
    } catch {
      toast.error('Failed to save task')
    } finally {
      setSubmitting(false)
    }
  }

  async function deleteTask(taskId) {
    if (!workday || isLocked) return
    setSubmitting(true)
    try {
      await deleteDoc(doc(db, 'workdays', workday.id, 'tasks', taskId))
      const updatedTasks = tasks.filter((t) => t.id !== taskId)
      setTasks(updatedTasks)
      await updateWorkdayTotals(workday, updatedTasks)
      toast.success('Task removed')
    } catch {
      toast.error('Failed to remove task')
    } finally {
      setSubmitting(false)
    }
  }

  function openEditTask(task) {
    setEditingTask(task)
    reset({
      projectId: task.projectId,
      description: task.description,
      startTime: task.startTime,
      endTime: task.endTime,
      workReport: task.workReport,
    })
    setTaskModalOpen(true)
  }

  function openNewTask() {
    setEditingTask(null)
    reset({ projectId: '', description: '', startTime: '', endTime: '', workReport: '' })
    setTaskModalOpen(true)
  }

  async function submitForApproval() {
    if (!workday || tasks.length === 0) {
      toast.error('Add at least one task before submitting')
      return
    }
    setSubmitting(true)
    try {
      const totalWorkMin = tasks.reduce((sum, task) => sum + (Number(task.durationMin) || 0), 0)
      const overtimeMin = calcOvertimeMinutes(
        totalWorkMin,
        otPolicy?.stdHoursPerDay,
        otPolicy?.roundingRule
      )
      await updateDoc(doc(db, 'workdays', workday.id), {
        status: 'SUBMITTED',
        totalWorkMin,
        overtimeMin,
        submittedAt: serverTimestamp(),
      })
      await addDoc(collection(db, 'approvals'), {
        workdayId: workday.id,
        employeeId: userProfile.uid,
        status: 'PENDING',
        submittedAt: serverTimestamp(),
        approverId: null,
        comment: '',
        approvedAt: null,
      })
      setWorkday((prev) => ({ ...prev, status: 'SUBMITTED', totalWorkMin, overtimeMin }))
      toast.success('Timesheet submitted for approval!')
    } catch {
      toast.error('Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  const totalMin = tasks.reduce((sum, task) => sum + (Number(task.durationMin) || 0), 0)
  const stdMin = (otPolicy?.stdHoursPerDay || 8) * 60
  const otMin = calcOvertimeMinutes(
    totalMin,
    otPolicy?.stdHoursPerDay,
    otPolicy?.roundingRule
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Daily Timesheet</h1>
          <p className="text-slate-400 text-sm mt-0.5">Log your tasks and track working hours</p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            max={format(new Date(), 'yyyy-MM-dd')}
            className="px-3 py-2 bg-slate-800 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {workday && <StatusBadge status={workday.status} />}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading timesheet..." />
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Total Work</p>
              <p className="text-sky-400 text-xl font-bold">{minutesToHHMM(totalMin)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Standard ({otPolicy?.stdHoursPerDay || 8}h)</p>
              <p className="text-slate-300 text-xl font-bold">{minutesToHHMM(stdMin)}</p>
            </div>
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-4">
              <p className="text-slate-400 text-xs mb-1">Overtime</p>
              <p className={`text-xl font-bold ${otMin > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
                {minutesToHHMM(otMin)}
              </p>
            </div>
          </div>

          {/* Tasks Section */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700/50">
              <h2 className="text-white font-semibold">Tasks ({tasks.length})</h2>
              {!isLocked && (
                <button
                  onClick={openNewTask}
                  className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm rounded-lg transition-colors"
                >
                  <span>+</span><span>Add Task</span>
                </button>
              )}
            </div>

            {tasks.length === 0 ? (
              <div className="py-12 text-center">
                <HiClock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No tasks yet</p>
                <p className="text-slate-500 text-sm mt-1">Add your first task to start tracking</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-700/50">
                {tasks.map((task) => {
                  const proj = projects.find((p) => p.id === task.projectId)
                  return (
                    <div key={task.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
                              {task.startTime} – {task.endTime}
                            </span>
                            <span className="text-xs text-amber-400 font-medium">
                              {minutesToHHMM(task.durationMin)}
                            </span>
                          </div>
                          {proj && (
                            <p className="text-indigo-400 text-xs font-medium mb-0.5">{proj.projectName}</p>
                          )}
                          <p className="text-slate-200 text-sm">{task.description}</p>
                          {task.workReport && (
                            <p className="text-slate-400 text-xs mt-1 line-clamp-2">{task.workReport}</p>
                          )}
                        </div>
                        {!isLocked && (
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => openEditTask(task)}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-700 rounded transition-colors"
                            >
                              <HiPencilSquare className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteTask(task.id)}
                              className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                            >
                              <HiTrash className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Submit / Status */}
          {workday?.status === 'REJECTED' && (
            <div className="bg-red-900/20 border border-red-700/50 rounded-xl px-5 py-4">
              <div className="flex items-center gap-2 mb-1">
                <HiXCircle className="w-4 h-4 text-red-400" />
                <p className="text-red-400 font-medium text-sm">Rejected</p>
              </div>
              {workday.rejectionComment && (
                <p className="text-red-300/70 text-sm mt-1">{workday.rejectionComment}</p>
              )}
              <p className="text-slate-400 text-xs mt-2">Update your tasks and resubmit.</p>
            </div>
          )}

          {!isLocked && tasks.length > 0 && workday?.status !== 'REJECTED' && (
            <button
              onClick={submitForApproval}
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-emerald-500/20"
            >
              <HiCheck className="w-5 h-5" />
              <span>{submitting ? 'Submitting...' : 'Submit for Approval'}</span>
            </button>
          )}

          {workday?.status === 'SUBMITTED' && (
            <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl px-5 py-3 text-center flex items-center justify-center gap-2">
              <HiClock className="w-4 h-4 text-amber-400" />
              <p className="text-amber-400 font-medium text-sm">Awaiting Supervisor Approval</p>
            </div>
          )}

          {workday?.status === 'APPROVED' && (
            <div className="bg-emerald-900/20 border border-emerald-700/50 rounded-xl px-5 py-3 text-center flex items-center justify-center gap-2">
              <HiCheckCircle className="w-4 h-4 text-emerald-400" />
              <p className="text-emerald-400 font-medium text-sm">Approved</p>
            </div>
          )}
        </>
      )}

      {/* Task Modal */}
      <Modal
        isOpen={taskModalOpen}
        onClose={() => { setTaskModalOpen(false); setEditingTask(null); reset() }}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        size="md"
      >
        <form onSubmit={handleSubmit(onTaskSubmit)} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Project</label>
            <select
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('projectId', { required: 'Select a project' })}
            >
              <option value="">Select project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.projectName}</option>
              ))}
            </select>
            {errors.projectId && <p className="text-red-400 text-xs mt-1">{errors.projectId.message}</p>}
          </div>

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Description</label>
            <input
              type="text"
              placeholder="What did you work on?"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('description', { required: 'Description is required' })}
            />
            {errors.description && <p className="text-red-400 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Start Time</label>
              <input
                type="time"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('startTime', { required: 'Required' })}
              />
              {errors.startTime && <p className="text-red-400 text-xs mt-1">{errors.startTime.message}</p>}
            </div>
            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">End Time</label>
              <input
                type="time"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('endTime', { required: 'Required' })}
              />
              {errors.endTime && <p className="text-red-400 text-xs mt-1">{errors.endTime.message}</p>}
            </div>
          </div>

          {duration > 0 && (
            <div className="bg-slate-900/50 rounded-lg px-3 py-2 text-sm text-slate-400">
              Duration: <span className="text-amber-400 font-medium">{minutesToHHMM(duration)}</span>
            </div>
          )}

          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Work Report</label>
            <textarea
              rows={3}
              placeholder="Describe what you accomplished..."
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              {...register('workReport')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setTaskModalOpen(false); setEditingTask(null); reset() }}
              className="flex-1 py-2.5 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 rounded-lg text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Saving...' : editingTask ? 'Update Task' : 'Add Task'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
