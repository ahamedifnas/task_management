import { useEffect, useState } from 'react'
import { collection, getDocs, doc, setDoc, updateDoc, query, where } from 'firebase/firestore'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { auth, db } from '../../firebase/config'
import StatusBadge from '../../components/common/StatusBadge'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import EmptyState from '../../components/common/EmptyState'
import Modal from '../../components/common/Modal'
import { HiUser } from 'react-icons/hi2'

const ROLES = ['employee', 'supervisor', 'admin']
const DEPARTMENTS = ['Engineering', 'Sales', 'HR', 'Finance', 'Operations', 'Marketing', 'IT', 'Other']

export default function EmployeeManagement() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingEmp, setEditingEmp] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  useEffect(() => { fetchEmployees() }, [])

  async function fetchEmployees() {
    setLoading(true)
    try {
      const snap = await getDocs(collection(db, 'users'))
      setEmployees(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    } finally {
      setLoading(false)
    }
  }

  function openNew() {
    setEditingEmp(null)
    reset({ name: '', email: '', role: 'employee', department: '', basicSalary: '', status: 'active', password: '' })
    setModalOpen(true)
  }

  function openEdit(emp) {
    setEditingEmp(emp)
    reset({ name: emp.name, email: emp.email, role: emp.role, department: emp.department, basicSalary: emp.basicSalary, status: emp.status })
    setModalOpen(true)
  }

  async function onSubmit(data) {
    setSaving(true)
    try {
      if (editingEmp) {
        await updateDoc(doc(db, 'users', editingEmp.id), {
          name: data.name,
          role: data.role,
          department: data.department,
          basicSalary: Number(data.basicSalary),
          status: data.status,
        })
        setEmployees((prev) => prev.map((e) => e.id === editingEmp.id ? { ...e, ...data, basicSalary: Number(data.basicSalary) } : e))
        toast.success('Employee updated')
      } else {
        const cred = await createUserWithEmailAndPassword(auth, data.email, data.password)
        const profile = {
          name: data.name,
          email: data.email,
          role: data.role,
          department: data.department,
          basicSalary: Number(data.basicSalary),
          status: 'active',
        }
        await setDoc(doc(db, 'users', cred.user.uid), profile)
        setEmployees((prev) => [...prev, { id: cred.user.uid, ...profile }])
        toast.success('Employee created')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.code === 'auth/email-already-in-use' ? 'Email already in use' : 'Failed to save employee')
    } finally {
      setSaving(false)
    }
  }

  async function toggleStatus(emp) {
    const newStatus = emp.status === 'active' ? 'inactive' : 'active'
    try {
      await updateDoc(doc(db, 'users', emp.id), { status: newStatus })
      setEmployees((prev) => prev.map((e) => e.id === emp.id ? { ...e, status: newStatus } : e))
      toast.success(`Employee ${newStatus === 'active' ? 'activated' : 'deactivated'}`)
    } catch {
      toast.error('Failed to update status')
    }
  }

  const filtered = employees.filter(
    (e) => e.name?.toLowerCase().includes(search.toLowerCase()) || e.email?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-white text-2xl font-bold">Employee Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Manage staff accounts and roles</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <span>+</span><span>Add Employee</span>
        </button>
      </div>

      <div>
        <input
          type="text"
          placeholder="Search employees..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2.5 bg-slate-800 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {loading ? (
        <LoadingSpinner text="Loading employees..." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<HiUser className="w-12 h-12" />} title="No employees found" description="Add your first employee to get started" />
      ) : (
        <div className="bg-slate-800 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700/50">
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Name</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Role</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Department</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Salary</th>
                  <th className="text-left px-5 py-3 text-slate-400 text-xs font-medium uppercase tracking-wider">Status</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/50">
                {filtered.map((emp) => (
                  <tr key={emp.id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-600/30 flex items-center justify-center text-indigo-400 font-semibold text-xs shrink-0">
                          {emp.name?.charAt(0) || '?'}
                        </div>
                        <div>
                          <p className="text-slate-200 text-sm font-medium">{emp.name}</p>
                          <p className="text-slate-500 text-xs">{emp.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className="capitalize text-slate-300 text-sm">{emp.role}</span>
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-sm">{emp.department || '—'}</td>
                    <td className="px-5 py-4 text-slate-300 text-sm">
                      {emp.basicSalary ? `LKR ${Number(emp.basicSalary).toLocaleString()}` : '—'}
                    </td>
                    <td className="px-5 py-4"><StatusBadge status={emp.status || 'active'} /></td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => openEdit(emp)}
                          className="px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => toggleStatus(emp)}
                          className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                            emp.status === 'active'
                              ? 'bg-red-900/30 text-red-400 hover:bg-red-800/50 border border-red-700/50'
                              : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-800/50 border border-emerald-700/50'
                          }`}
                        >
                          {emp.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditingEmp(null) }}
        title={editingEmp ? 'Edit Employee' : 'Add Employee'}
        size="md"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Full Name</label>
              <input
                type="text"
                placeholder="John Doe"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('name', { required: 'Name is required' })}
              />
              {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
            </div>

            {!editingEmp && (
              <>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Email</label>
                  <input
                    type="email"
                    placeholder="john@company.com"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    {...register('email', { required: 'Email required', pattern: { value: /\S+@\S+\.\S+/, message: 'Invalid email' } })}
                  />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-1.5">Password</label>
                  <input
                    type="password"
                    placeholder="Min 6 chars"
                    className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    {...register('password', { required: 'Password required', minLength: { value: 6, message: 'Min 6 chars' } })}
                  />
                  {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Role</label>
              <select
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('role', { required: true })}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Department</label>
              <select
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('department')}
              >
                <option value="">Select...</option>
                {DEPARTMENTS.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 text-sm font-medium mb-1.5">Basic Salary (LKR)</label>
              <input
                type="number"
                placeholder="50000"
                className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white placeholder-slate-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                {...register('basicSalary', { required: 'Salary required', min: { value: 1, message: 'Must be > 0' } })}
              />
              {errors.basicSalary && <p className="text-red-400 text-xs mt-1">{errors.basicSalary.message}</p>}
            </div>

            {editingEmp && (
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
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setModalOpen(false); setEditingEmp(null) }}
              className="flex-1 py-2.5 border border-slate-600 text-slate-300 hover:text-white rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-medium rounded-lg text-sm"
            >
              {saving ? 'Saving...' : editingEmp ? 'Save Changes' : 'Create Employee'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
