import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { assignmentsAPI, quizzesAPI } from '../services/api'
import EmptyState from '../components/EmptyState'
import ConfirmDialog from '../components/ConfirmDialog'
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
  MessageSquare,
  Shuffle,
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
        <div className="inline-flex rounded-xl border border-surface-200 bg-white p-1 gap-1 w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                  : 'text-navy-500 hover:text-navy-700 hover:bg-surface-50'
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" />
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
      <EmptyState
        icon={tab === 'assignments' ? ClipboardList : HelpCircle}
        title={tab === 'assignments' ? 'No assignments published for any of your subjects yet.' : 'No quizzes published for any of your subjects yet.'}
        hint="They will appear here once your teachers publish them."
      />
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
      <EmptyState icon={ClipboardList} title="No assignments published for this subject yet." />
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
                        href={`/api/files/${a.attachment_url.replace(/^uploads[\\/]/, '')}?token=${localStorage.getItem('token')}`}
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
  const [attemptedIds, setAttemptedIds] = useState(null)

  useEffect(() => {
    let cancelled = false
    Promise.all(
      items.map((q) => quizzesAPI.getAttempt(q.id).then((r) => r.data).catch(() => null))
    ).then((attempts) => {
      if (!cancelled) setAttemptedIds(new Set(attempts.filter(Boolean).map((a) => a.quiz_id)))
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length])

  if (items.length === 0) {
    return (
      <EmptyState icon={HelpCircle} title="No quizzes published for this subject yet." />
    )
  }

  return (
    <div className="space-y-3">
      {items.map((q) => (
        <QuizCard
          key={q.id}
          quiz={q}
          courseCode={courseCode}
          attempted={attemptedIds ? attemptedIds.has(q.id) : null}
          onSubmitted={() => setAttemptedIds((prev) => new Set(prev || []).add(q.id))}
        />
      ))}
    </div>
  )
}

function QuizCard({ quiz, courseCode, attempted = null, onSubmitted }) {
  const [expanded, setExpanded] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [currentQ, setCurrentQ] = useState(0)
  const [qSecondsLeft, setQSecondsLeft] = useState(null)
  const [reviewQ, setReviewQ] = useState(0)
  const [lockedQs, setLockedQs] = useState(() => new Set())
  const [detail, setDetail] = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [answers, setAnswers] = useState({})
  const [submissionFile, setSubmissionFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [secondsLeft, setSecondsLeft] = useState(null)
  const answersRef = useRef(answers)
  answersRef.current = answers
  const autoSubmittedRef = useRef(false)
  const browsingLockedRef = useRef(false) // true while Back-browsing an expired question

  const toggle = async () => {
    const next = !expanded
    setExpanded(next)
    if (next) {
      setLoadingDetail(true)
      setError('')
      try {
        if (!detail) {
          const r = await quizzesAPI.get(quiz.id)
          setDetail(r.data)
        }
        const attemptRes = await quizzesAPI.getAttempt(quiz.id)
        setResult(attemptRes.data)
      } catch (err) {
        setDetail((prev) => prev ?? { questions: [] })
        setResult(null)
        setError(err.response?.data?.detail || 'Failed to load this quiz')
      } finally {
        setLoadingDetail(false)
      }
    }
  }

  // Countdown: resumes from the server-recorded start time, auto-submits at 0
  useEffect(() => {
    if (!detail || result || quiz.attachment_url || !detail.time_limit || !detail.started_at) {
      setSecondsLeft(null)
      return
    }
    const expiresAt = new Date(detail.started_at).getTime() + detail.time_limit * 60 * 1000
    const iv = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) {
        clearInterval(iv)
        if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true
          handleSubmit(true)
        }
      }
    }, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail, result])

  const selectAnswer = (questionId, index) => {
    if (lockedQs.has(questionId)) return
    setAnswers((prev) => ({ ...prev, [questionId]: index }))
  }

  const isDocumentQuiz = !!quiz.attachment_url

  const handleSubmit = async (timedOut = false) => {
    if (!detail || submitting) return
    setError('')

    const questions = detail.questions || []
    const unanswered = questions.filter((q) => answersRef.current[q.id] === undefined)
    // one-at-a-time (timed) mode allows unanswered — they're graded wrong
    if (!timedOut && !perQuestionMode && unanswered.length > 0) {
      setError(`Please answer all ${questions.length} questions before submitting.`)
      return
    }

    if (isDocumentQuiz) {
      if (!submissionFile) {
        setError('Please upload your submission file.')
        return
      }
      setSubmitting(true)
      try {
        const payload = questions.map((q) => ({
          question_id: q.id,
          selected_index: answersRef.current[q.id],
        }))
        const res = await quizzesAPI.submitFile(quiz.id, submissionFile, payload)
        setResult(res.data)
        setReviewQ(0)
        onSubmitted?.(quiz.id)
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to submit')
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (questions.length === 0) return
    setSubmitting(true)
    try {
      // timed-out / partial submits omit unanswered questions (graded as wrong)
      const payload = questions
        .filter((q) => answersRef.current[q.id] !== undefined)
        .map((q) => ({
          question_id: q.id,
          selected_index: answersRef.current[q.id],
        }))
      // unanswered questions are allowed (graded wrong) when the timer expired
      // or the student skips them in one-at-a-time mode
      const res = await quizzesAPI.submit(quiz.id, payload, timedOut || unanswered.length > 0)
      setResult(res.data)
      setReviewQ(0)
      onSubmitted?.(quiz.id)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit quiz')
    } finally {
      setSubmitting(false)
    }
  }

  const effectiveMaxMarks = result?.max_marks ?? quiz.max_marks ?? (quiz.attachment_url ? 100 : null)
  const autoScore = !isDocumentQuiz && result?.grading_status === 'graded' && result.total > 0
  const manualScore = isDocumentQuiz && result?.grading_status === 'graded' && result.grade != null && effectiveMaxMarks
  const scorePercent = result
    ? autoScore
      ? Math.round((result.score / result.total) * 100)
      : manualScore
        ? Math.round((result.grade / effectiveMaxMarks) * 100)
        : 0
    : 0
  const scoreTone = scorePercent >= 70 ? 'text-emerald-600' : scorePercent >= 40 ? 'text-amber-600' : 'text-red-500'

  const isExpired = quiz.deadline && new Date() > new Date(quiz.deadline)
  const deadlineFormatted = quiz.deadline
    ? new Date(quiz.deadline).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })
    : null

  /* ── Timed MCQ quizzes: one question at a time.
     Per-MCQ time = (teacher time ÷ 2) in seconds ÷ questions assigned to this student.
     Slices live on the global server clock (started_at) — the timer keeps running
     across Next/Back, page refresh, and even closing the tab. ── */
  const questions = detail?.questions || []
  const perQuestionMode = !result && !isExpired && !isDocumentQuiz &&
    (detail?.time_limit || 0) > 0 && questions.length > 0
  const perQSeconds = perQuestionMode
    ? Math.max(1, Math.round((detail.time_limit * 60) / 2 / questions.length))
    : 0
  const currentQuestion = questions[currentQ]
  const currentLocked = !!currentQuestion && lockedQs.has(currentQuestion.id)
  const reviewAnswers = (!isDocumentQuiz && result?.answers) || []
  const reviewItem = reviewAnswers.length
    ? reviewAnswers[Math.min(reviewQ, reviewAnswers.length - 1)]
    : null

  // Next/Back never pauses anything — slices are windows on the global clock
  const advance = () => {
    browsingLockedRef.current = false
    setCurrentQ(currentQ + 1)
  }

  const goBack = () => {
    const prev = questions[currentQ - 1]
    browsingLockedRef.current = !!(prev && lockedQs.has(prev.id))
    setCurrentQ(currentQ - 1)
  }

  useEffect(() => {
    if (!perQuestionMode || !detail?.started_at) {
      setQSecondsLeft(null)
      return
    }
    const startedAt = new Date(detail.started_at).getTime()
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      const ended = new Set()
      questions.forEach((q, i) => {
        if (elapsed >= (i + 1) * perQSeconds) ended.add(q.id)
      })
      setLockedQs(ended)
      const q = questions[currentQ]
      if (q && ended.has(q.id)) {
        if (browsingLockedRef.current) {
          // student is browsing an expired question via Back — let them look
          setQSecondsLeft(null)
          return
        }
        setQSecondsLeft(0)
        if (currentQ < questions.length - 1) setCurrentQ(currentQ + 1)
        else if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true
          handleSubmit(true)
        }
        return
      }
      setQSecondsLeft(Math.max(0, (currentQ + 1) * perQSeconds - elapsed))
    }
    tick()
    const iv = setInterval(tick, 1000)
    return () => clearInterval(iv)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perQuestionMode, currentQ, perQSeconds, questions.length, detail?.started_at])

  const canAttempt = !expanded && attempted === false && !result && !isExpired && !quiz.attachment_url
  const startQuiz = () => {
    setConfirmOpen(false)
    if (!expanded) toggle()
  }

  return (
    <div className={`border rounded-xl bg-white overflow-hidden transition-all ${expanded ? 'border-accent-300 shadow-elevated' : 'border-surface-200'}`}>
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={startQuiz}
        title="Start quiz?"
        message={
          quiz.time_limit
            ? `You have ${quiz.time_limit} minutes. The timer starts as soon as you confirm.`
            : 'The quiz will open and your attempt begins now.'
        }
        confirmLabel="Start Quiz"
        tone="info"
      />
      <div
        role="button"
        tabIndex={0}
        onClick={() => {
          if (canAttempt) { setConfirmOpen(true); return }
          if (perQuestionMode) return // active timed quiz — no collapse (would pause the flow)
          toggle()
        }}
        onKeyDown={(e) => {
          if (e.key !== 'Enter' && e.key !== ' ') return
          e.preventDefault()
          if (canAttempt) { setConfirmOpen(true); return }
          if (perQuestionMode) return
          toggle()
        }}
        className="w-full flex items-start gap-3.5 p-4 sm:p-5 text-left hover:bg-surface-50/60 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent-500"
      >
        <span className="w-10 h-10 rounded-xl bg-navy-950 text-accent-400 border border-navy-950 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-bold text-navy-900">{quiz.title}</h3>
            {result ? (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-2xs font-bold ${
                isDocumentQuiz && result.grading_status !== 'graded'
                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border-emerald-200'
              }`}>
                {isDocumentQuiz && result.grading_status !== 'graded' ? <Clock className="w-3 h-3" /> : <CheckCircle2 className="w-3 h-3" />}
                {isDocumentQuiz ? (result.grading_status === 'graded' ? 'Graded' : 'Awaiting grading') : 'Completed'}
              </span>
            ) : isExpired ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 text-2xs font-bold">
                <Clock className="w-3 h-3" />
                Expired
              </span>
            ) : !quiz.is_published ? (
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
            {quiz.total_questions != null && quiz.total_questions < quiz.question_count && (
              <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                <Shuffle className="w-3 h-3 text-navy-300" />
                {quiz.total_questions} of {quiz.question_count} shuffled for you
              </span>
            )}
            {quiz.time_limit != null && quiz.time_limit > 0 && (
              <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                <Timer className="w-3 h-3 text-navy-300" />
                {quiz.time_limit} min
              </span>
            )}
            {deadlineFormatted && (
              <span className={`inline-flex items-center gap-1 text-2xs font-semibold ${isExpired ? 'text-red-500' : 'text-navy-400'}`}>
                <Clock className="w-3 h-3" />
                {isExpired ? 'Deadline passed' : `Due: ${deadlineFormatted}`}
              </span>
            )}
            {result && (
              isDocumentQuiz ? (
                result.grading_status === 'graded' && result.grade != null ? (
                  <span className={`inline-flex items-center gap-1 text-2xs font-bold ${scoreTone}`}>
                    Grade: {result.grade}/{effectiveMaxMarks}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-2xs font-bold text-amber-700">
                    <Clock className="w-3 h-3" />
                    Awaiting teacher grading
                  </span>
                )
              ) : (
                <span className={`inline-flex items-center gap-1 text-2xs font-bold ${scoreTone}`}>
                  Score: {result.score}/{result.total}
                </span>
              )
            )}
          </div>
        </div>
        {(result || attempted === true) && !canAttempt && !isDocumentQuiz && (
          <span className="inline-flex items-center shrink-0 px-3 py-1.5 rounded-xl bg-surface-100 text-navy-400 text-xs font-bold border border-surface-200">
            Already attempted
          </span>
        )}
        {canAttempt && (
          <button
            onClick={(e) => { e.stopPropagation(); setConfirmOpen(true) }}
            className="inline-flex items-center shrink-0 px-3 py-1.5 rounded-xl bg-accent-400 text-navy-950 text-xs font-bold hover:bg-accent-500 shadow-sm active:scale-[0.97] transition-all"
          >
            Attempt
          </button>
        )}
        <ChevronDown className={`w-4 h-4 text-navy-300 shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>

      {expanded && (
        <div
          className="border-t border-surface-100 p-4 sm:p-5 space-y-4 select-none"
          onContextMenu={(e) => e.preventDefault()}
        >
          {quiz.description && (
            <p className="text-sm text-navy-700 leading-relaxed whitespace-pre-wrap">{quiz.description}</p>
          )}

          {quiz.attachment_url && (
            <a
              href={`/api/files/${quiz.attachment_url.replace(/^uploads[\\/]/, '')}?token=${localStorage.getItem('token')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700 font-medium"
            >
              <Paperclip className="w-4 h-4" />
              {quiz.attachment_name || 'Download attachment'}
            </a>
          )}

          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
            </div>
          ) : result ? (
            /* ── Result View ── */
            <div className="space-y-4">
              {isDocumentQuiz ? (
                result.grading_status === 'graded' && result.grade != null ? (
                  <div className={`flex items-center gap-4 p-4 rounded-xl border ${
                    scorePercent >= 70
                      ? 'bg-emerald-50 border-emerald-200'
                      : scorePercent >= 40
                        ? 'bg-amber-50 border-amber-200'
                        : 'bg-red-50 border-red-200'
                  }`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold ${
                      scorePercent >= 70
                        ? 'bg-emerald-500 text-white'
                        : scorePercent >= 40
                          ? 'bg-amber-500 text-white'
                          : 'bg-red-500 text-white'
                    }`}>
                      {result.grade}/{effectiveMaxMarks}
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${scoreTone}`}>Graded by your teacher</p>
                      <p className="text-xs text-navy-500 mt-0.5">You received {scorePercent}% of the available marks.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50">
                    <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-sm font-bold text-amber-800">Submitted — awaiting teacher grading</p>
                      <p className="text-xs text-amber-700 mt-0.5">Your file was received. Your grade will appear here after review.</p>
                    </div>
                  </div>
                )
              ) : (
                <div className={`flex items-center gap-4 p-4 rounded-xl border ${
                  scorePercent >= 70
                    ? 'bg-emerald-50 border-emerald-200'
                    : scorePercent >= 40
                      ? 'bg-amber-50 border-amber-200'
                      : 'bg-red-50 border-red-200'
                }`}>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-extrabold ${
                    scorePercent >= 70
                      ? 'bg-emerald-500 text-white'
                      : scorePercent >= 40
                        ? 'bg-amber-500 text-white'
                        : 'bg-red-500 text-white'
                  }`}>
                    {result.score}/{result.total}
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${scoreTone}`}>
                      {scorePercent >= 70 ? 'Great job!' : scorePercent >= 40 ? 'Keep practicing!' : 'Needs improvement'}
                    </p>
                    <p className="text-xs text-navy-500 mt-0.5">
                      You scored {scorePercent}% — {result.score} out of {result.total} correct
                    </p>
                  </div>
                </div>
              )}

              {result.feedback && (
                <div className="flex items-start gap-2.5 rounded-xl border border-accent-200 bg-accent-50 p-3.5 text-sm text-navy-700">
                  <MessageSquare className="w-4 h-4 mt-0.5 text-accent-600 shrink-0" />
                  <span>{result.feedback}</span>
                </div>
              )}

              {isDocumentQuiz && result.submission_url && (
                <div className="space-y-2">
                  <p className="text-sm text-navy-600 font-medium">Your submission:</p>
                  <a
                    href={`/api/files/${result.submission_url.replace(/^uploads[\\/]/, '')}?token=${localStorage.getItem('token')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-accent-600 hover:text-accent-700 font-medium"
                  >
                    <Paperclip className="w-4 h-4" />
                    {result.submission_name || 'Download submission'}
                  </a>
                </div>
              )}

              {!isDocumentQuiz && reviewItem ? (
                /* ── One-at-a-time review (works after submit too) ── */
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-bold text-navy-500">
                      Question {Math.min(reviewQ, reviewAnswers.length - 1) + 1} of {reviewAnswers.length}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                      reviewItem.is_correct
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-red-50 border-red-200 text-red-600'
                    }`}>
                      {reviewItem.is_correct ? <CheckCircle2 className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                      {reviewItem.is_correct ? 'Correct' : reviewItem.selected_index < 0 ? 'Not answered' : 'Incorrect'}
                    </span>
                  </div>

                  <div className={`rounded-xl border p-4 ${
                    reviewItem.is_correct ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'
                  }`}>
                    <p className="text-sm font-semibold text-navy-900">
                      <span className="text-navy-400 font-bold mr-1.5">Q{Math.min(reviewQ, reviewAnswers.length - 1) + 1}.</span>
                      {reviewItem.question_text}
                    </p>
                    <div className="mt-2.5 space-y-1.5">
                      {reviewItem.options.map((opt, oi) => {
                        const isCorrect = oi === reviewItem.correct_index
                        const isSelected = oi === reviewItem.selected_index
                        return (
                          <div key={oi} className={`flex items-center gap-2.5 text-xs rounded-lg px-2.5 py-1.5 ${
                            isCorrect ? 'bg-emerald-100 text-emerald-800 font-semibold' :
                            isSelected && !isCorrect ? 'bg-red-100 text-red-700 line-through' :
                            'text-navy-500'
                          }`}>
                            <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center text-[10px] font-bold ${
                              isCorrect ? 'border-emerald-500 bg-emerald-500 text-white' :
                              isSelected ? 'border-red-500 bg-red-500 text-white' :
                              'border-surface-300 text-navy-400'
                            }`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span>{opt}</span>
                            {isCorrect && <span className="ml-auto text-emerald-600 font-bold">✓ Correct</span>}
                            {isSelected && !isCorrect && <span className="ml-auto text-red-500 font-bold">✗ Your answer</span>}
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      onClick={() => setReviewQ(Math.max(0, reviewQ - 1))}
                      disabled={reviewQ === 0}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-navy-600 bg-surface-100 hover:bg-surface-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Back
                    </button>
                    <button
                      onClick={() => setReviewQ(Math.min(reviewAnswers.length - 1, reviewQ + 1))}
                      disabled={reviewQ >= reviewAnswers.length - 1}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent-400 text-navy-950 hover:bg-accent-500 shadow-sm active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              ) : !isDocumentQuiz ? (
                <p className="text-sm text-navy-400 text-center py-4">No answers to review for this quiz.</p>
              ) : null}
            </div>
          ) : (
            /* ── Quiz Form View ── */
            <div className="space-y-4">
              {error && (
                <div className="flex items-start gap-2 bg-danger-light text-danger-dark px-3.5 py-2.5 rounded-xl text-xs font-medium border border-danger/20">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}

              {secondsLeft != null && !perQuestionMode && (
                <div
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-xs font-bold ${
                    secondsLeft <= 60
                      ? 'bg-red-50 border-red-200 text-red-600'
                      : 'bg-navy-950 border-navy-950 text-accent-400'
                  }`}
                >
                  <Timer className={`w-4 h-4 shrink-0 ${secondsLeft <= 60 ? 'animate-pulse' : ''}`} />
                  {secondsLeft > 0
                    ? `Time remaining: ${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, '0')}`
                    : "Time's up — submitting..."}
                </div>
              )}

              {detail && detail.total_questions != null && detail.total_questions < detail.question_count && (
                <div className="flex items-start gap-2 bg-info-light text-info-dark px-3.5 py-2.5 rounded-xl text-xs font-medium border border-info/20">
                  <Shuffle className="w-4 h-4 mt-0.5 shrink-0" />
                  These {detail.total_questions} questions were shuffled for you — another student may see different ones.
                </div>
              )}

              {detail && detail.questions.length > 0 ? (
                perQuestionMode ? (
                  /* ── One MCQ at a time (timed quizzes) ── */
                  <>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-navy-500">
                        Question {currentQ + 1} of {questions.length}
                      </span>
                      {qSecondsLeft != null ? (
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border ${
                          qSecondsLeft <= 5
                            ? 'bg-red-50 border-red-200 text-red-600 animate-pulse'
                            : 'bg-navy-950 border-navy-950 text-accent-400'
                        }`}>
                          <Timer className="w-3.5 h-3.5" />
                          {qSecondsLeft > 0 ? `${qSecondsLeft}s` : "Time's up — moving..."}
                        </span>
                      ) : currentLocked ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 border border-surface-200 text-navy-400 text-xs font-bold">
                          Locked
                        </span>
                      ) : null}
                    </div>

                    <div className="rounded-xl border border-surface-100 bg-surface-50/70 p-4">
                      <p className="text-sm font-semibold text-navy-900">
                        <span className="text-navy-400 font-bold mr-1.5">Q{currentQ + 1}.</span>
                        {currentQuestion.text}
                      </p>
                      {Array.isArray(currentQuestion.options) && currentQuestion.options.length > 0 ? (
                        <div className="mt-3 space-y-2">
                          {currentQuestion.options.map((opt, oi) => (
                            <button
                              key={oi}
                              type="button"
                              onClick={() => selectAnswer(currentQuestion.id, oi)}
                              disabled={currentLocked}
                              className={`w-full flex items-center gap-2.5 text-left text-xs rounded-lg px-3 py-2.5 border transition-all ${
                                currentLocked ? 'opacity-60 cursor-not-allowed border-surface-200 bg-white' :
                                answers[currentQuestion.id] === oi
                                  ? 'border-accent-400 bg-accent-50 text-navy-900 font-semibold shadow-sm'
                                  : 'border-surface-200 bg-white text-navy-600 hover:border-accent-200 hover:bg-surface-50'
                              }`}
                            >
                              <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-colors ${
                                answers[currentQuestion.id] === oi
                                  ? 'border-accent-500 bg-accent-500 text-white'
                                  : 'border-surface-300 text-navy-400'
                              }`}>
                                {String.fromCharCode(65 + oi)}
                              </span>
                              <span>{opt}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-navy-400">Free-response question — no options provided.</p>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        onClick={goBack}
                        disabled={currentQ === 0}
                        className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-navy-600 bg-surface-100 hover:bg-surface-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      >
                        <ChevronLeft className="w-4 h-4" />
                        Back
                      </button>
                      {currentQ < questions.length - 1 ? (
                        <button
                          onClick={advance}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent-400 text-navy-950 hover:bg-accent-500 shadow-sm active:scale-[0.97] transition-all"
                        >
                          Next
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSubmit(false)}
                          disabled={submitting}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-accent-500/20"
                        >
                          {submitting ? (
                            <>
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Submit Quiz
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                detail.questions.map((q, i) => (
                  <div key={q.id} className="rounded-xl border border-surface-100 bg-surface-50/70 p-4">
                    <p className="text-sm font-semibold text-navy-900">
                      <span className="text-navy-400 font-bold mr-1.5">Q{i + 1}.</span>
                      {q.text}
                    </p>
                    {Array.isArray(q.options) && q.options.length > 0 ? (
                      <div className="mt-3 space-y-2">
                        {q.options.map((opt, oi) => (
                          <button
                            key={oi}
                            type="button"
                            onClick={() => selectAnswer(q.id, oi)}
                            className={`w-full flex items-center gap-2.5 text-left text-xs rounded-lg px-3 py-2.5 border transition-all ${
                              answers[q.id] === oi
                                ? 'border-accent-400 bg-accent-50 text-navy-900 font-semibold shadow-sm'
                                : 'border-surface-200 bg-white text-navy-600 hover:border-accent-200 hover:bg-surface-50'
                            }`}
                          >
                            <span className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center font-bold text-[10px] transition-colors ${
                              answers[q.id] === oi
                                ? 'border-accent-500 bg-accent-500 text-white'
                                : 'border-surface-300 text-navy-400'
                            }`}>
                              {String.fromCharCode(65 + oi)}
                            </span>
                            <span>{opt}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-navy-400">Free-response question — no options provided.</p>
                    )}
                  </div>
                ))
                )
              ) : (
                <p className="text-sm text-navy-400 text-center py-4">No questions available for this quiz.</p>
              )}

              {isDocumentQuiz && !result && (
                <div className="space-y-3">
                  <p className="text-sm text-navy-600 font-medium">Upload your submission:</p>
                  <input
                    type="file"
                    onChange={(e) => setSubmissionFile(e.target.files[0])}
                    className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer"
                  />
                  {submissionFile && (
                    <p className="text-xs text-navy-500 flex items-center gap-1.5">
                      <Paperclip className="w-3 h-3" />
                      {submissionFile.name}
                    </p>
                  )}
                </div>
              )}

              {isExpired && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-xs font-semibold">
                  <Clock className="w-4 h-4 shrink-0" />
                  The deadline for this quiz has passed. You can no longer submit answers.
                </div>
              )}

              {!perQuestionMode && ((detail && detail.questions.length > 0) || isDocumentQuiz) && !isExpired && !result && (
                <div className="flex items-center justify-between pt-2">
                  {detail && detail.questions.length > 0 && (
                    <p className="text-xs text-navy-400">
                      {Object.keys(answers).length} of {detail.questions.length} answered
                    </p>
                  )}
                  {isDocumentQuiz && <p />}
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent-500 text-white hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-accent-500/20"
                  >
                    {submitting ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        {isDocumentQuiz ? 'Submit File' : 'Submit Quiz'}
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}