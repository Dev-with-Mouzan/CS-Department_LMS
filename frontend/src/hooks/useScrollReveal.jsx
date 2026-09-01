import { useEffect, useRef } from 'react'

/**
 * Custom hook that adds a CSS class when an element enters the viewport.
 * Uses Intersection Observer for performant scroll detection.
 *
 * @param {Object} options
 * @param {string} options.className - CSS class to add when visible (default: 'revealed')
 * @param {number} options.threshold - Visibility threshold 0–1 (default: 0.15)
 * @param {string} options.rootMargin - Root margin (default: '0px 0px -60px 0px')
 * @param {boolean} options.once - Only animate once (default: true)
 * @returns {React.RefObject} ref to attach to the element
 */
export function useScrollReveal({
  className = 'revealed',
  threshold = 0.15,
  rootMargin = '0px 0px -60px 0px',
  once = true,
} = {}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add(className)
          if (once) observer.unobserve(el)
        } else if (!once) {
          el.classList.remove(className)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [className, threshold, rootMargin, once])

  return ref
}

/**
 * AnimatedSection — wrapper that fades + slides in when scrolled into view.
 * Children with `.stagger-child` class get cascading delays.
 */
export function AnimatedSection({ children, className = '', delay = 0, as: Tag = 'div', ...props }) {
  const ref = useScrollReveal({ className: 'scroll-revealed' })

  return (
    <Tag
      ref={ref}
      className={`scroll-reveal ${className}`}
      style={{ transitionDelay: delay ? `${delay}ms` : undefined }}
      {...props}
    >
      {children}
    </Tag>
  )
}

/**
 * StaggerContainer — wraps a grid/list so children animate in sequence.
 */
export function StaggerContainer({ children, className = '', ...props }) {
  const ref = useScrollReveal({ className: 'scroll-revealed' })

  return (
    <div ref={ref} className={`scroll-reveal stagger-container ${className}`} {...props}>
      {children}
    </div>
  )
}
