const statusConfig = {
  DRAFT:     { label: 'Draft',     className: 'bg-slate-700 text-slate-300' },
  SUBMITTED: { label: 'Submitted', className: 'bg-amber-900/50 text-amber-400' },
  APPROVED:  { label: 'Approved',  className: 'bg-emerald-900/50 text-emerald-400' },
  REJECTED:  { label: 'Rejected',  className: 'bg-red-900/50 text-red-400' },
  active:    { label: 'Active',    className: 'bg-emerald-900/50 text-emerald-400' },
  inactive:  { label: 'Inactive',  className: 'bg-slate-700 text-slate-400' },
}

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-700 text-slate-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
      {config.label}
    </span>
  )
}
