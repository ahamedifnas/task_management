import { useTheme } from '../../contexts/ThemeContext'

export default function ThemeToggle({ compact = false }) {
  const { isDark, toggleTheme } = useTheme()
  const label = isDark ? 'Light Mode' : 'Dark Mode'

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${label.toLowerCase()}`}
      title={`Switch to ${label.toLowerCase()}`}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-300 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
    >
      <span aria-hidden="true">{isDark ? '🌞' : '🌙'}</span>
      {!compact && <span>{label}</span>}
    </button>
  )
}
