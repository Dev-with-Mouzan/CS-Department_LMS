import { ScrollText } from 'lucide-react'

export default function CompleteResult() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
          <ScrollText className="w-7 h-7" />
        </span>
        <p className="text-navy-500 text-sm font-medium">Complete result format coming soon.</p>
        <p className="text-navy-400 text-xs mt-1">Paste your format and this page will be designed accordingly.</p>
      </div>
    </div>
  )
}
