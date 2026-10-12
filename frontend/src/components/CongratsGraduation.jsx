import { GraduationCap, PartyPopper } from 'lucide-react'

const CONFETTI_COLORS = ['#f59e0b', '#fbbf24', '#fcd34d', '#ffffff', '#9fb3c8', '#d97706']

// Deterministic pseudo-random layout so the burst looks organic but stable per render
const PIECES = Array.from({ length: 44 }, (_, i) => ({
  left: (i * 37 + 11) % 100,
  color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
  duration: `${2.6 + ((i * 13) % 20) / 10}s`,
  delay: `${((i * 7) % 18) / 10}s`,
  size: 6 + ((i * 5) % 5),
  radius: i % 3 === 0 ? '50%' : '2px',
}))

export default function CongratsGraduation({ onDismiss, firstName }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/85 backdrop-blur-sm" />

      {/* Confetti */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {PIECES.map((p, i) => (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.6,
              backgroundColor: p.color,
              borderRadius: p.radius,
              animationDuration: p.duration,
              animationDelay: p.delay,
            }}
          />
        ))}
      </div>

      {/* Card */}
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden animate-slide-up">
        <div className="h-1.5 bg-gradient-to-r from-accent-400 to-accent-600" />
        <div className="p-7 text-center">
          <div className="relative inline-flex mb-5">
            <span className="w-20 h-20 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center animate-bounce shadow-lg shadow-accent-500/30">
              <GraduationCap className="w-10 h-10 text-navy-950" />
            </span>
            <PartyPopper className="w-6 h-6 text-accent-500 absolute -right-4 top-0 animate-pulse" />
          </div>

          <h2 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Congratulations{firstName ? `, ${firstName}` : ''}! 🎓
          </h2>
          <p className="mt-3 text-sm text-navy-500 leading-relaxed">
            You've officially <strong className="text-navy-800">graduated</strong> from the
            CS Department, Govt. Graduate College Burewala. Your hard work and dedication
            have paid off — we wish you the very best in everything ahead.
          </p>

          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-xl bg-accent-500 text-navy-950 font-bold text-sm py-3.5 hover:bg-accent-400 active:scale-[0.99] transition-all shadow-lg shadow-accent-500/20"
          >
            Thank you ✨
          </button>
        </div>
      </div>
    </div>
  )
}
