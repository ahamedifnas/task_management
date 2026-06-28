import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { db } from '../../firebase/config'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import { HiFolderOpen } from 'react-icons/hi2'

export default function ProjectManagement() {
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProj, setEditingProj] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { fetchProjects() }, [])

  async function fetchProjects() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'projects'))
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditingProj(null)
    reset({ projectName: '', clientName: '', status: 'active' })
    setModalOpen(true)
  }

  function openEdit(proj) {
    setEditingProj(proj)
    reset({ projectName: proj.projectName, clientName: proj.clientName, status: proj.status })
    setModalOpen(true)
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      if (editingProj) {
        await updateDoc(doc(db, 'projects', editingProj.id), data)
        setProjects((prev) => prev.map((p) => p.id === editingProj.id ? { ...p, ...data } : p))
        toast.success('Project updated')
      } else {
        const ref = await addDoc(collection(db, 'projects'), { ...data, createdAt: serverTimestamp() })
        setProjects((prev) => [...prev, { id: ref.id, ...data }])
        toast.success('Project created')
      }
      setModalOpen(false)
    } catch {
      toast.error('Failed to save project')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(proj) {
    const newStatus = proj.status === 'active' ? 'inactive' : 'active'
    try {
      await updateDoc(doc(db, 'projects', proj.id), { status: newStatus })
      setProjects((prev) => prev.map((p) => p.id === proj.id ? { ...p, status: newStatus } : p))
      toast.success('Status updated')
    } catch {
      toast.error('Failed to update status')
    }
  }

  const filtered = projects.filter((p) =>
    p.projectName?.toLowerCase().includes(search.toLowerCase()) ||
    p.clientName?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Project Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage client projects for timesheet entries</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>+</span><span>New Project</span>
        </button>
      </div>

      <input
        type="text"
        placeholder="Search projects..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-sm px-4 py-2.5 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {loading ? (
        <LoadingSpinner text="Loading projects..." />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<HiFolderOpen className="w-12 h-12" />}
          title="No projects found"
          description="Create your first project"
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((proj) => (
            <div key={proj.id} className="bg-slate-800 rounded-xl border border-slate-700/50 p-5">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="w-10 h-10 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                  <HiFolderOpen className="w-5 h-5 text-violet-400" />
                </div>
                <StatusBadge status={proj.status || 'active'} />
              </div>
              <p className="text-white font-semibold">{proj.projectName}</p>
              <p className="text-slate-400 text-sm mt-0.5">{proj.clientName || 'No client'}</p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => openEdit(proj)}
                  className="flex-1 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => toggleStatus(proj)}
                  className={`flex-1 py-1.5 text-xs rounded-lg transition-colors ${
                    proj.status === 'active'
                      ? 'bg-red-900/30 text-red-400 hover:bg-red-800/50 border border-red-700/50'
                      : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/50 border border-emerald-700/50'
                  }`}
                >
                  {proj.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProj(null) }}
        title={editingProj ? 'Edit Project' : 'New Project'}
        size="sm"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Project Name</label>
            <input
              type="text"
              placeholder="e.g. Website Redesign"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('projectName', { required: 'Project name required' })}
            />
            {errors.projectName && <p className="text-red-400 text-xs mt-1">{errors.projectName.message}</p>}
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Client Name</label>
            <input
              type="text"
              placeholder="e.g. ABC Corp"
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('clientName')}
            />
          </div>
          <div>
            <label className="block text-slate-300 text-sm font-medium mb-1.5">Status</label>
            <select
              className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              {...register('status')}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-slate-600 text-slate-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm">
              {saving ? 'Saving...' : editingProj ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
