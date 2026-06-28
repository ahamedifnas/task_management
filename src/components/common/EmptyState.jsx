export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-slate-500 mb-4 w-12 h-12 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="text-slate-300 font-semibold text-lg mb-1">{title}</h3>
      {description && <p className="text-slate-500 text-sm max-w-xs">{description}</p>}
    </div>
  )
}
