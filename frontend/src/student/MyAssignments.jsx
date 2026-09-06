import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { assignmentsAPI, quizzesAPI } from '../services/api'
import {
  ClipboardList,
  HelpCircle,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  X,
  Paperclip,
  Download,
  ChevronDown,
  BookOpen,
  BadgeCheck,
  FileQuestion,
  Timer,
} from 'lucide-react'

const tabs = [
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
]

export default function MyAssignments() {
  const [tab, setTab] = useState('assignments')
  const [assignments, setAssignments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [openId, setOpenId] = useState(null)
  const [uploading, setUploading] = useState(null)
  const [message, setMessage] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, assignmentId: null, fileName: '', file: null })

  useEffect(() => {
    Promise.all([
      assignmentsAPI.list(),
      quizzesAPI.list().catch(() => ({ data: [] })),
    ])
      .then(([a, q]) => {
        setAssignments(Array.isArray(a.data) ? a.data : [])
        setQuizzes(Array.isArray(q.data) ? q.data : [])
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const reloadAssignments = async () => {
    try {
      const a = await assignmentsAPI.list()
      setAssignments(Array.isArray(a.data) ? a.data : [])
    } catch { /* keep current data */ }
  }

  const handleFileSelect = (assignmentId, file) => {
    setConfirmModal({ open: true, assignmentId, fileName: file.name, file })
  }

  const handleConfirmUpload = async () => {
    const { assignmentId, file } = confirmModal
    setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })
    setUploading(assignmentId)
    setMessage('')
    try {
      await assignmentsAPI.submit(assignmentId, file)
      setMessage('Assessment submitted successfully!')
      await reloadAssignments()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to submit')
    } finally { setUploading(null) }
  }

  const pickCourse = (id) => {
    setActiveCourseId(id)
    setOpenId(null)
  }

  const goSubjects = () => {
    setActiveCourseId(null)
    setOpenId(null)
  }

  // Group everything by subject (course)
  const courseMap = {}
  assignments.forEach((a) => {
    if (!courseMap[a.course_id]) courseMap[a.course_id] = { id: a.course_id, title: a.course_title, code: a.course_code, assignments: [], quizzes: [] }
    courseMap[a.course_id].assignments.push(a)
  })
  quizzes.forEach((q) => {
    if (!courseMap[q.course_id]) courseMap[q.course_id] = { id: q.course_id, title: q.course_title, code: q.course_code, assignments: [], quizzes: [] }
    courseMap[q.course_id].quizzes.push(q)
  })
  const allCourses = Object.values(courseMap).sort((x, y) => (x.title || '').localeCompare(y.title || ''))

  const visibleCourses = tab === 'assignments'
    ? allCourses.filter((c) => c.assignments.length > 0)
    : allCourses.filter((c) => c.quizzes.length > 0)

  const activeCourse = allCourses.find((c) => c.id === activeCourseId) || null

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <ClipboardList className="w-3 h-3" />
          Assessment Hub
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Assessments</h1>
        <p className="text-navy-400 mt-1.5">Pick a subject to see its assignments and quizzes.</p>
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

      {message && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium ${
          message.includes('success') ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
        }`}>
          {message.includes('success') ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          {message}
        </div>
      )}

      {loading ? (
        <div className="min-h-[220px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-5 text-xs flex-wrap">
            <button
              onClick={goSubjects}
              className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-accent-600 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Subjects
            </button>
            {activeCourse && (
              <>
                <ChevronRight className="w-3 h-3 text-navy-300" />
                <span className="inline-flex items-center gap-1 font-semibold text-navy-800 truncate max-w-[260px]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  {activeCourse.title}
                </span>
              </>
            )}
          </div>

          {!activeCourse ? (
            <SubjectGrid courses={visibleCourses} tab={tab} onPick={pickCourse} />
          ) : tab === 'assignments' ? (
            <AssignmentList
              items={activeCourse.assignments}
              courseCode={activeCourse.code}
              openId={openId}
              setOpenId={setOpenId}
              uploading={uploading}
              onFileSelect={handleFileSelect}
            />
          ) : (
            <QuizList items={activeCourse.quizzes} courseCode={activeCourse.code} />
          )}
        </>
      )}

      <div className="flex justify-center mt-8">
        <Link to="/student" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-navy-500 hover:text-navy-900 border border-surface-200 bg-white transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={() => setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <button
              onClick={() => setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })}
              className="absolute top-4 right-4 text-navy-300 hover:text-navy-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-5">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-warning/10 text-warning-dark border border-warning/20 mb-4">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <h2 className="text-lg font-bold text-navy-900">Confirm Submission</h2>
              <p className="text-sm text-navy-400 mt-1">
                You are about to submit <span className="font-semibold text-navy-700">{confirmModal.fileName}</span>.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <p className="text-xs text-amber-800 leading-relaxed">
                ⚠️ <strong>Please note:</strong> Each assessment can be submitted only once. After submitting, you will not be able to change your file.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-surface-200 text-navy-600 hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-500 text-white hover:bg-accent-400 transition-colors"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Subject grid ────────────────────────────────────── */

function SubjectGrid({ courses, tab, onPick }) {
  if (courses.length === 0) {
    return (
      <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
          {tab === 'assignments' ? <ClipboardList className="w-7 h-7" /> : <HelpCircle className="w-7 h-7" />}
        </span>
        <p className="text-navy-500 text-sm font-medium">
          {tab === 'assignments' ? 'No assignments published for any of your subjects yet.' : 'No quizzes published for any of your subjects yet.'}
        </p>
        <p className="text-navy-400 text-xs mt-1.5">They will appear here once your teachers publish them.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => {
        const submitted = c.assignments.filter((a) => a.submitted).length
        const pastDue = c.assignments.filter((a) => !a.submitted && new Date(a.due_date) < new Date()).length
        const totalQuestions = c.quizzes.reduce((n, q) => n + (q.question_count || 0), 0)
        return (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="group text-left rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-800 text-white flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </span>
              {tab === 'assignments' && submitted > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  {submitted} submitted
                </span>
              )}
            </div>
            <p className="mt-4 text-[11px] font-bold text-accent-600 tracking-wider uppercase">{c.code}</p>
            <h3 className="mt-0.5 text-sm font-bold text-navy-900 leading-snug group-hover:text-accent-600 transition-colors">
              {c.title}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
              {tab === 'assignments' ? (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-navy-600 text-2xs font-bold">
                    <ClipboardList className="w-3 h-3" />
                    {c.assignments.length} assignment{c.assignments.length === 1 ? '' : 's'}
                  </span>
                  {pastDue > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-2xs font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      {pastDue} past due
                    </span>
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-navy-600 text-2xs font-bold">
                    <HelpCircle className="w-3 h-3" />
                    {c.quizzes.length} quiz{c.quizzes.length === 1 ? '' : 'es'}
                  </span>
                  {totalQuestions > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-navy-600 text-2xs font-bold">
                      <FileQuestion className="w-3 h-3" />
                      {totalQuestions} questions
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
              {tab === 'assignments' ? 'Open assignments' : 'Open quizzes'}
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ── Assignment list (per subject) ───────────────────── */

const statusMeta = (status) => ({
  submitted: { label: 'Submitted', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', Icon: CheckCircle2 },
  late: { label: 'Submitted (late)', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  graded: { label: 'Graded', cls: 'bg-accent-50 text-accent-600 border-accent-200', Icon: BadgeCheck },
})[status] || { label: 'Submitted', cls: 'bg-emerald-50 text-emerald-600 border-emerald-200', Icon: CheckCircle2 }

function AssignmentList({ items, courseCode, openId, setOpenId, uploading, onFileSelect }) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
          <ClipboardList className="w-7 h-7" />
        </span>
        <p className="text-navy-500 text-sm font-medium">No assignments published for this subject yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map(a => {
        const isPast = new Date(a.due_date) < new Date()
        const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24))
        const expanded = openId === a.id
        const status = statusMeta(a.submission_status)
        const canSubmit = !a.submitted && !isPast

        return (
          <div key={a.id} className={`border rounded-xl bg-white overflow-hidden transition-all ${
            expanded ? 'border-accent-300 shadow-elevated' : a.submitted ? 'border-emerald-200' : isPast ? 'border-surface-200 opacity-75' : 'border-surface-200'
          }`}>
            {/* Clickable summary */}
            <button
              onClick={() => setOpenId(expanded ? null : a.id)}
              className="w-full flex items-start gap-3.5 p-4 sm:p-5 text-left hover:bg-surface-50/60 transition-colors"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                a.submitted
                  ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                  : 'bg-navy-950 text-accent-400 border-navy-950'
              }`}>
                {a.submitted ? <CheckCircle2 className="w-5 h-5" /> : <ClipboardList className="w-5 h-5" />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-bold text-navy-900">{a.title}</h3>
                  {a.submitted && (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-bold border ${status.cls}`}>
                      <status.Icon className="w-3 h-3" />
                      {status.label}
                    </span>
                  )}
                  {a.submission_status === 'graded' && a.submission_grade != null && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-2xs border bg-accent-500 text-white border-accent-500">
                      <Award className="w-3 h-3" />
                      {a.submission_grade}/{a.max_marks}
                    </span>
                  )}
                  {!a.submitted && isPast && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-light text-danger-dark text-2xs font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      Past due
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
                  {courseCode && (
                    <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                      <BookOpen className="w-3 h-3 text-navy-300" />
                      {courseCode}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                    <Clock className="w-3 h-3 text-navy-300" />
                    Due: {new Date(a.due_date).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                    <Award className="w-3 h-3 text-navy-300" />
                    Max: {a.max_marks}
                  </span>
                  {canSubmit && (
                    <span className={`inline-flex items-center gap-1 text-2xs font-bold ${
                      daysLeft <= 2 ? 'text-danger' : daysLeft <= 7 ? 'text-warning-dark' : 'text-navy-400'
                    }`}>
                      <Clock className="w-3 h-3" />
                      {daysLeft > 0 ? `${daysLeft} days left` : 'Today'}
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown className={`w-4 h-4 text-navy-300 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded details */}
            {expanded && (
              <div className="border-t border-surface-100">
                <div className="p-4 sm:p-5 space-y-4">
                  {a.description && (
                    <div>
                      <p className="text-[11px] font-bold text-navy-400 uppercase tracking-wider mb-1.5">Instructions from teacher</p>
                      <p className="text-sm text-navy-700 leading-relaxed whitespace-pre-wrap">{a.description}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {a.course_title && (
                      <div className="rounded-lg bg-surface-50 border border-surface-100 px-3 py-2">
                        <p className="text-2xs text-navy-400 font-medium">Course</p>
                        <p className="text-xs font-semibold text-navy-800 mt-0.5 truncate">{a.course_title}</p>
                      </div>
                    )}
                    <div className="rounded-lg bg-surface-50 border border-surface-100 px-3 py-2">
                      <p className="text-2xs text-navy-400 font-medium">Due date</p>
                      <p className="text-xs font-semibold text-navy-800 mt-0.5">{new Date(a.due_date).toLocaleDateString()}</p>
                    </div>
                    <div className="rounded-lg bg-surface-50 border border-surface-100 px-3 py-2">
                      <p className="text-2xs text-navy-400 font-medium">Total marks</p>
                      <p className="text-xs font-semibold text-navy-800 mt-0.5">{a.max_marks}</p>
                    </div>
                  </div>

                  {a.attachment_url && (
                    <div>
                      <p className="text-[11px] font-bold text-navy-400 uppercase tracking-wider mb-1.5">Teacher's attachment</p>
                      <a
                        href={`/uploads/${a.attachment_url.replace(/^uploads[\\/]/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-accent-500/10 border border-accent-200 text-accent-700 text-xs font-semibold hover:bg-accent-500/20 transition-colors"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        View attachment
                        <Download className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Footer: upload or already-submitted state */}
                <div className="px-4 sm:px-5 py-4 border-t border-surface-100 bg-surface-50/60">
                  {a.submitted ? (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-emerald-600">
                          <CheckCircle2 className="w-5 h-5" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-emerald-800">You already submitted this assessment</p>
                          <p className="text-xs text-emerald-700 mt-0.5">
                            Submitted {a.submitted_at ? new Date(a.submitted_at).toLocaleString() : ''}
                            {a.submitted_at && a.submission_status === 'late' ? ' · marked as late' : ''}
                          </p>
                          {a.submission_feedback && (
                            <p className="text-xs text-emerald-800 mt-1">{a.submission_feedback}</p>
                          )}
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-emerald-200 text-emerald-700 text-2xs font-bold shrink-0">
                        <BadgeCheck className="w-3 h-3" />
                        Can't resubmit
                      </span>
                    </div>
                  ) : isPast ? (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <p className="text-xs font-medium text-amber-800">The deadline for this assessment has passed.</p>
                    </div>
                  ) : (
                    <label className="cursor-pointer block">
                      <input type="file" className="hidden"
                        onChange={(e) => e.target.files[0] && onFileSelect(a.id, e.target.files[0])} />
                      <span className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold bg-accent-500 text-white hover:bg-accent-400 shadow-md shadow-accent-500/20 transition-colors ${
                        uploading === a.id ? 'opacity-70 pointer-events-none' : ''
                      }`}>
                        {uploading === a.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            Upload your completed assessment
                          </>
                        )}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* ── Quiz list (per subject) ─────────────────────────── */

function QuizList({ items, courseCode }) {
  if (items.length === 0) {
    return (
      <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
          <HelpCircle className="w-7 h-7" />
        </span>
        <p className="text-navy-500 text-sm font-medium">No quizzes published for this subject yet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((q) => <QuizCard key={q.id} quiz={q} courseCode={courseCode} />)}
    </div>
  )
}

function QuizCard({ quiz, courseCode }) {
  const [expanded, setExpanded] = useState(false)
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    if (next && !detail) {
      setLoadingDetail(true)
      try {
        const r = await quizzesAPI.get(quiz.id)
        setDetail(r.data)
      } catch {
        setDetail({ questions: [] })
      } finally {
        setLoadingDetail(false)
      }
    }
  }

  return (
    <div className={`border rounded-xl bg-white overflow-hidden transition-all ${expanded ? 'border-accent-300 shadow-elevated' : 'border-surface-200'}`}>
      <button
        onClick={toggle}
        className="w-full flex items-start gap-3.5 p-4 sm:p-5 text-left hover:bg-surface-50/60 transition-colors"
      >
        <span className="w-10 h-10 rounded-xl bg-navy-950 text-accent-400 border border-navy-950 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-navy-900">{quiz.title}</h3>
            {!quiz.is_published ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-100 text-navy-400 text-2xs font-bold">
                <Clock className="w-3 h-3" />
                Draft
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-bold">
                <BadgeCheck className="w-3 h-3" />
                Published
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5">
            {courseCode && (
              <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                <BookOpen className="w-3 h-3 text-navy-300" />
                {courseCode}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
              <FileQuestion className="w-3 h-3 text-navy-300" />
              {quiz.question_count} questions
            </span>
            {quiz.time_limit != null && quiz.time_limit > 0 && (
              <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                <Timer className="w-3 h-3 text-navy-300" />
                {quiz.time_limit} min
              </span>
            )}
          </div>
        </div>
        <ChevronDown className={`w-4 h-4 text-navy-300 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </button>

      {expanded && (
        <div className="border-t border-surface-100 p-4 sm:p-5 space-y-4">
          {quiz.description && (
            <p className="text-sm text-navy-700 leading-relaxed whitespace-pre-wrap">{quiz.description}</p>
          )}

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {detail && detail.questions.length > 0 ? (
                detail.questions.map((q, i) => (
                  <div key={q.id} className="rounded-xl border border-surface-100 bg-surface-50/70 p-4">
                    <p className="text-sm font-semibold text-navy-900">
                      <span className="text-navy-400 font-bold mr-1.5">Q{i + 1}.</span>
                      {q.text}
                    </p>
                    {Array.isArray(q.options) && q.options.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {q.options.map((opt, oi) => (
                          <div key={oi} className="flex items-center gap-2.5 text-xs text-navy-600">
                            <span className="w-5 h-5 shrink-0 rounded-md bg-white border border-surface-200 flex items-center justify-center font-bold text-[10px] text-navy-400">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span>{opt}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-navy-400">Free-response question — no options provided.</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-sm text-navy-400 text-center py-4">No questions available for this quiz.</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}