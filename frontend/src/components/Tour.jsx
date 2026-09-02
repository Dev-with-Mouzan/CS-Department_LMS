import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronRight, ChevronLeft, X, Sparkles, GripVertical } from 'lucide-react'

const TOUR_KEY = 'lms_tour_completed'

export function useTour(key = TOUR_KEY) {
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    const completed = localStorage.getItem(key)
    if (!completed) {
      // Small delay so page renders first
      const t = setTimeout(() => setShowTour(true), 800)
      return () => clearTimeout(t)
    }
  }, [key])

  const completeTour = () => {
    localStorage.setItem(key, 'true')
    setShowTour(false)
  }

  const restartTour = () => {
    localStorage.removeItem(key)
    setShowTour(true)
  }

  return { showTour, completeTour, restartTour }
}

export default function Tour({ steps, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0)
  const [spotRect, setSpotRect] = useState(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const tooltipRef = useRef(null)

  const step = steps[currentStep]
  const total = steps.length

  const updateSpotlight = useCallback(() => {
    if (!step?.target) {
      setSpotRect(null)
      return
    }
    const el = document.querySelector(step.target)
    if (el) {
      const rect = el.getBoundingClientRect()
      setSpotRect(rect)
      // Scroll element into view
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    } else {
      setSpotRect(null)
    }
  }, [step])

  useEffect(() => {
    updateSpotlight()
    window.addEventListener('resize', updateSpotlight)
    return () => window.removeEventListener('resize', updateSpotlight)
  }, [updateSpotlight])

  // Position tooltip after spotRect changes
  useEffect(() => {
    if (!spotRect || !tooltipRef.current) return
    const tt = tooltipRef.current
    const ttRect = tt.getBoundingClientRect()
    const margin = 16

    let top, left
    const placement = step.placement || 'bottom'

    if (placement === 'bottom') {
      top = spotRect.bottom + margin
      left = spotRect.left + spotRect.width / 2 - ttRect.width / 2
    } else if (placement === 'top') {
      top = spotRect.top - ttRect.height - margin
      left = spotRect.left + spotRect.width / 2 - ttRect.width / 2
    } else if (placement === 'right') {
      top = spotRect.top + spotRect.height / 2 - ttRect.height / 2
      left = spotRect.right + margin
    } else if (placement === 'left') {
      top = spotRect.top + spotRect.height / 2 - ttRect.height / 2
      left = spotRect.left - ttRect.width - margin
    }

    // Clamp to viewport
    left = Math.max(16, Math.min(left, window.innerWidth - ttRect.width - 16))
    top = Math.max(16, Math.min(top, window.innerHeight - ttRect.height - 16))

    setTooltipPos({ top, left })
  }, [spotRect, step])

  const goNext = () => {
    if (currentStep < total - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const goPrev = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Escape') onComplete()
    if (e.key === 'ArrowRight' || e.key === 'Enter') goNext()
    if (e.key === 'ArrowLeft') goPrev()
  }, [currentStep, onComplete])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (!step) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-[2px] transition-all duration-300" onClick={onComplete} />

      {/* Spotlight cutout */}
      {spotRect && (
        <div
          className="absolute rounded-xl border-2 border-accent-400 shadow-[0_0_0_4000px_rgba(15,23,42,0.55)] transition-all duration-500 ease-out pointer-events-none"
          style={{
            top: spotRect.top - 6,
            left: spotRect.left - 6,
            width: spotRect.width + 12,
            height: spotRect.height + 12,
          }}
        />
      )}

      {/* Step counter pill */}
      <div className="absolute top-5 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 rounded-full bg-navy-900 border border-white/10 shadow-elevated">
        <Sparkles className="w-4 h-4 text-accent-400" />
        <span className="text-xs font-bold text-white">
          Step {currentStep + 1} of {total}
        </span>
      </div>

      {/* Tooltip */}
      <div
        ref={tooltipRef}
        className="absolute w-[340px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-surface-200 overflow-hidden animate-slide-up"
        style={{ top: tooltipPos.top, left: tooltipPos.left }}
      >
        {/* Accent top bar */}
        <div className="h-1 bg-gradient-to-r from-accent-400 to-accent-600" />

        <div className="p-5">
          {/* Icon + title */}
          <div className="flex items-start gap-3 mb-3">
            {step.icon && (
              <span className="w-10 h-10 rounded-xl bg-accent-50 border border-accent-200 flex items-center justify-center shrink-0">
                <step.icon className="w-5 h-5 text-accent-600" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="text-base font-bold text-navy-900">{step.title}</h3>
              {step.subtitle && (
                <p className="text-xs text-navy-400 mt-0.5">{step.subtitle}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-navy-500 leading-relaxed mb-5">{step.content}</p>

          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {steps.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    i === currentStep
                      ? 'bg-accent-500 w-5'
                      : i < currentStep
                        ? 'bg-accent-300'
                        : 'bg-surface-200'
                  }`}
                />
              ))}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={onComplete}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-navy-400 hover:text-navy-600 hover:bg-surface-100 transition-colors"
              >
                Skip
              </button>
              {currentStep > 0 && (
                <button
                  onClick={goPrev}
                  className="w-8 h-8 rounded-lg border border-surface-200 flex items-center justify-center text-navy-400 hover:text-navy-700 hover:bg-surface-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={goNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold bg-accent-500 text-navy-950 hover:bg-accent-400 transition-colors shadow-sm"
              >
                {currentStep === total - 1 ? 'Finish' : 'Next'}
                {currentStep < total - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
