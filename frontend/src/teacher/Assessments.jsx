import { useState } from 'react'
import { ClipboardList, HelpCircle } from 'lucide-react'
import CreateAssignment from './CreateAssignment'
import CreateQuiz from './CreateQuiz'

const tabs = [
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
]

export default function Assessments() {
  const [tab, setTab] = useState('assignments')

  return (
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <ClipboardList className="w-3 h-3" />
          Assessment Tools
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Assessments</h1>
        <p className="text-navy-400 mt-1.5">Create assignments or quizzes for your students.</p>
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
      {tab === 'assignments' ? <CreateAssignment /> : <CreateQuiz />}
    </div>
  )
}
