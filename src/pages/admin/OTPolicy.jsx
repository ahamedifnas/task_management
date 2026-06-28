import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { db } from '../../firebase/config'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import { HiArrowDownTray } from 'react-icons/hi2'

const ROUNDING_RULES = [
  { value: 'none', label: 'No rounding' },
  { value: 'nearest_15', label: 'Round to nearest 15 min' },
  { value: 'nearest_30', label: 'Round to nearest 30 min' },
  { value: 'floor_hour', label: 'Floor to nearest hour' },
]

const BASIS_OPTIONS = [
  { value: 'daily', label: 'Daily basis' },
  { value: 'weekly', label: 'Weekly basis' },
]

export default function OTPolicy() {
  const [policy, setPolicy] = useState(null)
  const [policyId, setPolicyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm()
  const watched = watch()

  useEffect(() => {
    async function fetchPolicy() {
      try {
        const snap = await getDocs(collection(db, 'otPolicy'))
        if (!snap.empty) {
          const d = snap.docs[0]
          const data = d.data()
          setPolicy(data)
          setPolicyId(d.id)
          reset(data)
        } else {
          reset({ stdHoursPerDay: 8, multiplier: 1.5, basis: 'daily', roundingRule: 'none' })
        }
      } finally {
        setLoading(false)
      }
    }
    fetchPolicy()
  }, [])

  async function onSubmit(data) {
    setSaving(true)
    try {
      const payload = {
        stdHoursPerDay: Number(data.stdHoursPerDay),
        multiplier: Number(data.multiplier),
        basis: data.basis,
        roundingRule: data.roundingRule,
        updatedAt: serverTimestamp(),
      }
      if (policyId) {
        await updateDoc(doc(db, 'otPolicy', policyId), payload)
      } else {
        const ref = await addDoc(collection(db, 'otPolicy'), payload)
        setPolicyId(ref.id)
      }
      setPolicy(payload)
      toast.success('OT policy saved!')
    } catch {
      toast.error('Failed to save policy')
    } finally {
      setSaving(false)
    }
  }

  const stdH = Number(watched.stdHoursPerDay) || 8
  const mult = Number(watched.multiplier) || 1.5

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-white text-2xl font-bold">Overtime Policy</h1>
        <p className="text-slate-400 text-sm mt-0.5">Configure overtime calculation rules</p>
      </div>

      {loading ? (
        <LoadingSpinner text="Loading policy..." />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6">
            <h2 className="text-white font-semibold mb-5">Policy Settings</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">
                  Standard Hours Per Day
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  max="24"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  {...register('stdHoursPerDay', { required: true, min: 1, max: 24 })}
                />
                <p className="text-slate-500 text-xs mt-1">Hours worked beyond this are considered overtime</p>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">
                  OT Multiplier
                </label>
                <input
                  type="number"
                  step="0.25"
                  min="1"
                  max="5"
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  {...register('multiplier', { required: true, min: 1 })}
                />
                <p className="text-slate-500 text-xs mt-1">e.g. 1.5 = time-and-a-half pay</p>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">OT Basis</label>
                <select
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  {...register('basis')}
                >
                  {BASIS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 text-sm font-medium mb-1.5">Rounding Rule</label>
                <select
                  className="w-full px-3 py-2.5 bg-slate-900 border border-slate-600 text-white rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  {...register('roundingRule')}
                >
                  {ROUNDING_RULES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold rounded-lg text-sm transition-colors"
              >
                <HiArrowDownTray className="w-4 h-4" />
                <span>{saving ? 'Saving...' : 'Save Policy'}</span>
              </button>
            </form>
          </div>

          {/* Preview */}
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-xl border border-slate-700/50 p-6">
              <h2 className="text-white font-semibold mb-4">OT Formula Preview</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">Standard Hours</span>
                  <span className="text-white font-medium">{stdH}h/day</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-700/50">
                  <span className="text-slate-400">OT Multiplier</span>
                  <span className="text-amber-400 font-medium">×{mult}</span>
                </div>
                <div className="bg-slate-900/50 rounded-lg p-4 mt-3 space-y-2 font-mono text-xs">
                  <p className="text-slate-400">// Example with LKR 50,000/month (30 days)</p>
                  <p className="text-slate-300">dailyRate = 50,000 / 30 = <span className="text-emerald-400">LKR 1,666.67</span></p>
                  <p className="text-slate-300">hourlyRate = 1,666.67 / {stdH} = <span className="text-emerald-400">LKR {(1666.67/stdH).toFixed(2)}</span></p>
                  <p className="text-slate-300">OT hourly = {(1666.67/stdH).toFixed(2)} × {mult} = <span className="text-amber-400">LKR {(1666.67/stdH*mult).toFixed(2)}</span></p>
                  <p className="text-slate-300">2h OT = <span className="text-indigo-400 font-bold">LKR {(1666.67/stdH*mult*2).toFixed(2)}</span></p>
                </div>
              </div>
            </div>

            <div className="bg-indigo-900/20 border border-indigo-700/30 rounded-xl p-4">
              <h3 className="text-indigo-300 font-medium text-sm mb-2">Formula</h3>
              <div className="space-y-1.5 text-xs text-slate-300 font-mono">
                <p>dailyRate = basicSalary ÷ daysInMonth</p>
                <p>hourlyRate = dailyRate ÷ stdHoursPerDay</p>
                <p>otHourly = hourlyRate × multiplier</p>
                <p>otAmount = otHourly × overtimeHours</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
