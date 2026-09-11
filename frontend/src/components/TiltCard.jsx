import { useRef, useCallback } from 'react'

export default function TiltCard({ children, className = '' }) {
  const cardRef = useRef(null)
  const glareRef = useRef(null)

  const handleMouseMove = useCallback((e) => {
    const card = cardRef.current
    if (!card) return
    const rect = card.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2

    const rotateX = ((y - centerY) / centerY) * -8
    const rotateY = ((x - centerX) / centerX) * 8

    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`

    if (glareRef.current) {
      const gx = (x / rect.width) * 100
      const gy = (y / rect.height) * 100
      glareRef.current.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.15), transparent 60%)`
    }
  }, [])

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current
    if (card) {
      card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)'
    }
    if (glareRef.current) {
      glareRef.current.style.background = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0), transparent 60%)'
    }
  }, [])

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative transition-transform duration-200 ease-out ${className}`}
      style={{ transformStyle: 'preserve-3d' }}
    >
      <div
        ref={glareRef}
        className="pointer-events-none absolute inset-0 rounded-xl z-10"
        style={{ transition: 'opacity 0.2s ease-out' }}
      />
      <div style={{ transform: 'translateZ(20px)', transformStyle: 'preserve-3d' }}>
        {children}
      </div>
    </div>
  )
}
