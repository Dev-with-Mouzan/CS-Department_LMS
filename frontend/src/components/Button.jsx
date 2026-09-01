export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...props
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]'

  const variants = {
    primary: 'bg-accent-500 text-navy-950 hover:bg-accent-400 focus:ring-accent-400 shadow-sm hover:shadow-md',
    secondary: 'bg-surface-100 text-navy-700 hover:bg-surface-200 focus:ring-navy-200 border border-surface-200',
    danger: 'bg-danger text-white hover:bg-danger-dark focus:ring-danger/30',
    ghost: 'bg-transparent text-navy-600 hover:bg-surface-100 focus:ring-navy-200',
    success: 'bg-success text-white hover:bg-success-dark focus:ring-success/30',
  }

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
