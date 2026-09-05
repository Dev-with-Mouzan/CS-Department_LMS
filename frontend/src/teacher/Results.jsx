import { useState } from 'react'
import { Trophy, FileText, GraduationCap, ScrollText } from 'lucide-react'
import MidTermMarks from './MidTermMarks'
import FinalMarks from './FinalMarks'
import CompleteResult from './CompleteResult'

const tabs = [
  { id: 'midterm', label: 'Mid-Term', icon: FileText },
  { id: 'final', label: 'Final Year', icon: GraduationCap },
  { id: 'complete', label: 'Complete Result', icon: ScrollText },
]

export default function Results() {
  const [tab, setTab] = useState('midterm')

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Trophy className="w-3 h-3" />
          Results Management
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Results</h1>
        <p className="text-navy-400 mt-1.5">Manage student marks and generate result sheets</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex rounded-xl border border-surface-200 bg-white p-1 gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                  : 'text-navy-500 hover:text-navy-700 hover:bg-surface-50'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {tab === 'midterm' && <MidTermMarks />}
      {tab === 'final' && <FinalMarks />}
      {tab === 'complete' && <CompleteResult />}
    </div>
  )
}
