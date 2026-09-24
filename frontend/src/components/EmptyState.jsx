export default function EmptyState({ icon: Icon, title, hint, compact = false, action }) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-dashed border-surface-300 text-center ${
        compact ? 'px-5 py-8' : 'px-6 py-14'
      }`}
      style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(238,241,246,0.55) 100%)' }}
    >
      {Icon && (
        <>
          <Icon className="absolute -right-8 -bottom-8 w-44 h-44 text-navy-700/[0.04] rotate-[-8deg] pointer-events-none" />
          <span className="relative inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500/25 to-accent-600/5 text-accent-600 border border-accent-200 items-center justify-center mb-4 shadow-[0_10px_24px_-12px_rgba(245,158,11,0.6)]">
            <Icon className="w-8 h-8" />
          </span>
        </>
      )}
      <div className="relative">
        <p className="text-navy-800 text-sm font-semibold">{title}</p>
        {hint && <p className="text-navy-400 text-xs mt-1.5 leading-relaxed">{hint}</p>}
        {action && (
          <button
            type="button"
            onClick={action.onClick}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-navy-900 text-white text-xs font-semibold px-4 py-2 hover:bg-navy-800 active:scale-[0.98] transition-all"
          >
            {action.label}
          </button>
        )}
      </div>
    </div>
  )
}