const statusConfig = {
  DRAFT:     { label: 'Draft',     className: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' },
  SUBMITTED: { label: 'Submitted', className: 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400' },
  APPROVED:  { label: 'Approved',  className: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' },
  REJECTED:  { label: 'Rejected',  className: 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400' },
  active:    { label: 'Active',    className: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' },
  Active:    { label: 'Active',    className: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400' },
  inactive:  { label: 'Inactive',  className: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
  Inactive:  { label: 'Inactive',  className: 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400' },
}

export default function StatusBadge({ status }) {
  const config = statusConfig[status] || { label: status, className: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300' }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors duration-300 ${config.className}`}>
      {config.label}
    </span>
  )
}
