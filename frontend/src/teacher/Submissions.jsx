import { useState, useEffect } from 'react'
import { assignmentsAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  Inbox,
  ClipboardList,
  Clock,
  Award,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  User as UserIcon,
  MessageSquare,
  Star,
} from 'lucide-react'

export default function Submissions() {
  const [assignments, setAssignments] = useState([])
  const [selected, setSelected] = useState(null)
  const [submissions, setSubmissions] = useState([])
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => { assignmentsAPI.list().then(r => setAssignments(r.data)).catch(console.error).finally(() => setLoading(false)) }, [])

  const viewSubmissions = async (a) => {
    setSelected(a)
    try { const r = await assignmentsAPI.listSubmissions(a.id); setSubmissions(r.data) } catch { setSubmissions([]) }
  }

  const openGrade = (s) => { setSelectedSub(s); setGradeForm({ grade: s.grade || '', feedback: s.feedback || '' }); setShowGradeModal(true) }

  const handleGrade = async (e) => {
    e.preventDefault()
    try {
      await assignmentsAPI.grade(selectedSub.id, { grade: parseFloat(gradeForm.grade), feedback: gradeForm.feedback })
      setShowGradeModal(false)
      if (selected) viewSubmissions(selected)
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
  }

  const gradedCount = (list) => list.filter(s => s.status === 'graded').length

  return (
    <div className="p-6 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <Inbox className="w-3 h-3" />
          Submission Review
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Submissions</h1>
        <p className="text-navy-400 mt-1.5">Select an assignment to review student work</p>
      </div>

      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 border-dashed p-16 text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7" />
          </span>
          <p className="text-navy-500 text-sm font-medium">No assignments yet. Create an assignment first.</p>
        </div>
      ) : (
        <>
          {/* Assignment list */}
          <div className="space-y-2 mb-8">
            {assignments.map((a) => (
              <div key={a.id}
                onClick={() => viewSubmissions(a)}
                className={`bg-white rounded-2xl border shadow-card p-4 cursor-pointer transition-all duration-300 group ${
                  selected?.id === a.id
                    ? 'border-accent-500 ring-2 ring-accent-400/30 bg-accent-500/5'
                    : 'border-surface-200 hover:shadow-card-hover hover:-translate-y-0.5'
                }`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      selected?.id === a.id ? 'bg-accent-500 text-white' : 'bg-navy-900/5 text-navy-600 group-hover:bg-navy-900/10'
                    }`}>
                      <ClipboardList className="w-5 h-5" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-navy-900 truncate">{a.title}</h3>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                        <span className="inline-flex items-center gap-1.5 text-2xs text-navy-400">
                          <Clock className="w-3 h-3 text-navy-300" />
                          Due: {new Date(a.due_date).toLocaleDateString()}
                        </span>
                        <span className="inline-flex items-center gap-1.5 text-2xs text-navy-400">
                          <Award className="w-3 h-3 text-navy-300" />
                          Max {a.max_marks}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-surface-200 bg-surface-50 text-2xs font-bold text-navy-600">
                      <Inbox className="w-3 h-3" />
                      {submissions.length} submissions
                    </span>
                    <ChevronRight className={`w-4 h-4 text-navy-300 transition-transform ${selected?.id === a.id ? 'translate-x-0.5 text-accent-600' : 'group-hover:translate-x-0.5'}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {selected && (
            <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/60 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-navy-900">Submissions for: {selected.title}</h2>
                  <p className="text-2xs text-navy-400 mt-0.5">{gradedCount(submissions)} of {submissions.length} graded</p>
                </div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-success/20 bg-success-light text-success-dark text-2xs font-bold">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {gradedCount(submissions)} graded
                </span>
              </div>

              <div className="overflow-x-auto">
                {submissions.length === 0 ? (
                  <div className="px-6 py-12 text-center text-navy-400 text-sm">No submissions yet</div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-surface-100">
                        <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Submitted</th>
                        <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Status</th>
                        <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Grade</th>
                        <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-100">
                      {submissions.map((s) => (
                        <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                                <UserIcon className="w-4 h-4 text-navy-950" />
                              </span>
                              <span className="text-sm font-mono text-navy-600">{s.student_id.slice(0, 8)}...</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-xs text-navy-500">{new Date(s.submitted_at).toLocaleString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
                              s.status === 'graded' ? 'bg-success-light text-success-dark border-success/20'
                                : s.status === 'late' ? 'bg-warning-light text-warning-dark border-warning/20'
                                : 'bg-info-light text-info-dark border-info/20'
                            }`}>
                              {s.status === 'graded' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                              {s.status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 text-sm font-bold text-navy-900">
                              <Star className={`w-3.5 h-3.5 ${s.grade ? 'text-accent-500' : 'text-navy-200'}`} />
                              {s.grade ?? '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Button variant="ghost" size="sm" onClick={() => openGrade(s)}>
                              {s.status === 'graded' ? 'Re-grade' : 'Grade'}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <Modal isOpen={showGradeModal} onClose={() => setShowGradeModal(false)} title="Grade Submission">
        <form onSubmit={handleGrade} className="space-y-4">
          <div>
            <label className="input-label">Grade (out of {selected?.max_marks || 100})</label>
            <div className="relative">
              <Star className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input type="number" step="0.5" min={0} max={selected?.max_marks || 100}
                value={gradeForm.grade} onChange={(e) => setGradeForm({ ...gradeForm, grade: e.target.value })}
                className="input-field pl-10" required />
            </div>
          </div>
          <div>
            <label className="input-label">Feedback</label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 text-navy-300 absolute left-3 top-3 pointer-events-none" />
              <textarea value={gradeForm.feedback} rows={4}
                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                className="input-field pl-10 resize-none" placeholder="Provide constructive feedback..." />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" type="button" onClick={() => setShowGradeModal(false)}>Cancel</Button>
            <Button type="submit">Submit Grade</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}