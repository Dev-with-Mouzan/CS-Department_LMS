export default function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50">
      <div className="text-center animate-fade-in">
        <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin mx-auto"></div>
        <p className="mt-4 text-navy-400 text-sm font-medium">Loading...</p>
      </div>
    </div>
  )
}
