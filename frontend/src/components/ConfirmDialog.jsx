import { useEffect } from 'react'
import { AlertTriangle, Trash2, X } from 'lucide-react'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title, message, confirmLabel = 'Delete', loading = false }) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      const handleEsc = (e) => { if (e.key === 'Escape') onClose() }
      window.addEventListener('keydown', handleEsc)
      return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', handleEsc) }
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/70 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-[0_20px_60px_-12px_rgba(0,0,0,0.35)] overflow-hidden animate-slide-up">
        {/* Top accent bar */}
        <div className="h-1 bg-gradient-to-r from-danger via-red-400 to-danger" />

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-navy-300 hover:text-navy-600 hover:bg-surface-100 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="px-7 pt-7 pb-6 text-center">
          {/* Icon */}
          <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-red-50 to-red-100 border border-red-200/60 flex items-center justify-center mb-5 shadow-sm">
            <AlertTriangle className="w-7 h-7 text-danger" />
          </div>

          {/* Title */}
          <h3 className="text-lg font-bold text-navy-900 mb-1.5">{title}</h3>

          {/* Message */}
          <p className="text-sm text-navy-400 leading-relaxed">{message}</p>

          {/* Buttons */}
          <div className="flex items-center gap-3 mt-7">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-navy-600 bg-surface-100 hover:bg-surface-200 rounded-xl transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-b from-danger to-red-700 hover:from-red-600 hover:to-red-800 rounded-xl shadow-md shadow-danger/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
