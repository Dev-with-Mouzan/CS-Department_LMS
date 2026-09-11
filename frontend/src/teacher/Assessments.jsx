import React, { useState, useEffect, useCallback } from 'react'
import { parseDate, shortDate, MONTHS } from '../utils/format'
import {
  ClipboardList,
  HelpCircle,
  Plus,
  FileText,
  CalendarDays,
  Award,
  Trash2,
  Clock,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Paperclip,
  AlertTriangle,
  RefreshCw,
  X,
  Inbox,
  GraduationCap,
  BookOpen,
  Copy,
  Check,
  ArrowRight,
} from 'lucide-react'
import { assignmentsAPI, quizzesAPI, coursesAPI, materialsAPI } from '../services/api'
import { ordinal, semLabel } from '../utils/format'
import CreateAssignment from './CreateAssignment'
import CreateQuiz from './CreateQuiz'
import Modal from '../components/Modal'
import Button from '../components/Button'
import ConfirmDialog from '../components/ConfirmDialog'

const tabs = [
  { id: 'assignments', label: 'Assignments', icon: ClipboardList },
  { id: 'quizzes', label: 'Quizzes', icon: HelpCircle },
]

const Chip = React.memo(function Chip({ icon: Icon, children, tone = 'default' }) {
  const tones = {
    default: 'bg-surface-50 text-navy-500 border-surface-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    navy: 'bg-navy-900 text-white border-navy-950',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {children}
    </span>
  )
})

export default function Assessments() {
  const [tab, setTab] = useState('assignments')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [quizzes, setQuizzes] = useState([])
  const [subCounts, setSubCounts] = useState({})
  const [quizDetails, setQuizDetails] = useState({})
  const [expandedQuiz, setExpandedQuiz] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [showCreate, setShowCreate] = useState(false)
  const [activeSemester, setActiveSemester] = useState(null)
  const [activeCourse, setActiveCourse] = useState(null)
  const [showReuseModal, setShowReuseModal] = useState(false)
  const [reuseStep, setReuseStep] = useState(1)
  const [reuseSources, setReuseSources] = useState([])
  const [selectedSource, setSelectedSource] = useState(null)
  const [sourceItems, setSourceItems] = useState({ materials: [], assignments: [], quizzes: [] })
  const [selectedItems, setSelectedItems] = useState({ materials: [], assignments: [], quizzes: [] })
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [reuseLoading, setReuseLoading] = useState(false)
  const [reuseSubmitting, setReuseSubmitting] = useState(false)
  const [showAllPastCourses, setShowAllPastCourses] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [a, q, c] = await Promise.all([assignmentsAPI.list(), quizzesAPI.list(), coursesAPI.list()])
      setAssignments(a.data)
      setQuizzes(q.data)
      setCourses(c.data)

      const counts = {}
      await Promise.all(
        a.data.map(async (asg) => {
          try {
            const s = await assignmentsAPI.listSubmissions(asg.id)
            counts[asg.id] = {
              total: s.data.length,
              ungraded: s.data.filter((sb) => sb.grade == null).length,
            }
          } catch {
            counts[asg.id] = { total: 0, ungraded: 0 }
          }
        })
      )
      setSubCounts(counts)
    } catch (err) {
      console.error(err)
      setError('Could not load your assessments. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setShowCreate(false)
    setExpandedQuiz(null)
  }, [tab])

  const handleCreateSuccess = () => {
    setShowCreate(false)
    setExpandedQuiz(null)
    load()
  }

  const toggleQuiz = async (quiz) => {
    if (expandedQuiz === quiz.id) {
      setExpandedQuiz(null)
      return
    }
    setExpandedQuiz(quiz.id)
    if (!quizDetails[quiz.id]) {
      try {
        const r = await quizzesAPI.get(quiz.id)
        setQuizDetails((d) => ({ ...d, [quiz.id]: r.data.questions || [] }))
      } catch {
        setQuizDetails((d) => ({ ...d, [quiz.id]: [] }))
      }
    }
  }

  const handleDelete = async (type, id) => {
    const msg = type === 'assignment'
      ? 'Delete this assignment? All student submissions will be removed.'
      : 'Delete this quiz? This cannot be undone.'
    setDeleteTarget({ type, id, message: msg })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(deleteTarget.id)
    try {
      if (deleteTarget.type === 'assignment') await assignmentsAPI.delete(deleteTarget.id)
      else await quizzesAPI.delete(deleteTarget.id)
      setExpandedQuiz(null)
      load()
    } catch (err) {
      window.alert(err.response?.data?.detail || 'Delete failed')
    } finally {
      setDeleting(null)
      setDeleteTarget(null)
    }
  }

  const goSemesters = () => {
    setActiveSemester(null)
    setActiveCourse(null)
    setShowCreate(false)
    setExpandedQuiz(null)
  }

  const goCourses = () => {
    setActiveCourse(null)
    setShowCreate(false)
    setExpandedQuiz(null)
  }

  const fetchReuseSources = async (showAll = false) => {
    if (!activeCourse) return
    setReuseLoading(true)
    try {
      const res = await coursesAPI.reusable(activeCourse.id, showAll)
      setReuseSources(res.data)
    } catch (err) {
      console.error(err)
    } finally {
      setReuseLoading(false)
    }
  }

  const openReuseModal = async () => {
    if (!activeCourse) return
    setShowAllPastCourses(false)
    setReuseStep(1)
    setSelectedSource(null)
    setSourceItems({ materials: [], assignments: [], quizzes: [] })
    setSelectedItems({ materials: [], assignments: [], quizzes: [] })
    setShowReuseModal(true)
    await fetchReuseSources(false)
  }

  const selectSourceCourse = async (source) => {
    setSelectedSource(source)
    setReuseStep(2)
    setReuseLoading(true)
    try {
      const [mats, asgs, qzs] = await Promise.all([
        materialsAPI.list({ course_id: source.id }),
        assignmentsAPI.list({ course_id: source.id }),
        quizzesAPI.list({ course_id: source.id }),
      ])
      setSourceItems({
        materials: mats.data || [],
        assignments: asgs.data || [],
        quizzes: qzs.data || [],
      })
    } catch (err) {
      console.error(err)
    } finally {
      setReuseLoading(false)
    }
  }

  const toggleItem = (type, id) => {
    setSelectedItems(prev => {
      const list = prev[type]
      const next = list.includes(id) ? list.filter(x => x !== id) : [...list, id]
      return { ...prev, [type]: next }
    })
  }

  const toggleAll = (type, ids) => {
    setSelectedItems(prev => {
      const allSelected = ids.every(id => prev[type].includes(id))
      return { ...prev, [type]: allSelected ? [] : [...ids] }
    })
  }

  const handleReuse = async () => {
    if (!activeCourse || !selectedSource) return
    const total = selectedItems.materials.length + selectedItems.assignments.length + selectedItems.quizzes.length
    if (total === 0) { alert('Please select at least one item to reuse.'); return }
    setReuseSubmitting(true)
    try {
      await coursesAPI.reuse(activeCourse.id, {
        source_course_id: selectedSource.id,
        materials: selectedItems.materials,
        assignments: selectedItems.assignments,
        quizzes: selectedItems.quizzes,
      })
      setShowReuseModal(false)
      load()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to reuse items')
    } finally {
      setReuseSubmitting(false)
    }
  }

  const semesters = Object.values(
    courses.reduce((acc, c) => {
      const key = c.semester != null ? String(c.semester) : 'other'
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {}),
  )
    .map((cs) => {
      const key = cs[0].semester != null ? String(cs[0].semester) : 'other'
      const ids = new Set(cs.map((c) => c.id))
      return {
        key,
        count: cs.length,
        session: cs.find((c) => c.session)?.session || '',
        asgCount: assignments.filter((a) => ids.has(a.course_id)).length,
        quizCount: quizzes.filter((q) => ids.has(q.course_id)).length,
      }
    })
    .sort((a, b) => (a.key === 'other' ? 1 : b.key === 'other' ? -1 : Number(a.key) - Number(b.key)))

  const activeCourses = activeSemester != null
    ? courses.filter((c) => (c.semester != null ? String(c.semester) : 'other') === activeSemester)
    : []

  const activeItems = activeCourse
    ? tab === 'assignments'
      ? assignments.filter((a) => a.course_id === activeCourse.id)
      : quizzes.filter((q) => q.course_id === activeCourse.id)
    : []

  const activeTab = tabs.find((t) => t.id === tab)

  return (
    <>
    <div className="p-5 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <ClipboardList className="w-3 h-3" />
          Assessment Tools
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Assessments</h1>
        <p className="text-navy-400 mt-1.5">Pick a semester and book to view its assignments and quizzes.</p>
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
              <span
                className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
                  tab === t.id ? 'bg-white/20' : 'bg-surface-100 text-navy-400'
                }`}
              >
                {tab === 'assignments' ? assignments.length || 0 : quizzes.length || 0}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-surface-200/70 animate-pulse" />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
          <span className="inline-flex w-12 h-12 rounded-xl bg-red-100 items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </span>
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold px-3.5 py-2 hover:bg-red-700 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      )}

      {/* Content */}
      {!loading && !error && (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-5 text-xs flex-wrap">
            <button
              onClick={goSemesters}
              className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-accent-600 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Semesters
            </button>
            {activeSemester != null && (
              <>
                <ChevronRight className="w-3 h-3 text-navy-300" />
                <button
                  onClick={goCourses}
                  className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-accent-600 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  {semLabel(activeSemester)}
                </button>
              </>
            )}
            {activeCourse && (
              <>
                <ChevronRight className="w-3 h-3 text-navy-300" />
                <span className="inline-flex items-center gap-1 font-semibold text-navy-800 truncate max-w-[220px]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  {activeCourse.title}
                </span>
              </>
            )}
          </div>

          {activeSemester == null ? (
            semesters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-200 bg-white px-6 py-12 text-center">
                <span className="inline-flex w-12 h-12 rounded-xl bg-navy-900 text-white items-center justify-center mb-3">
                  <BookOpen className="w-6 h-6" />
                </span>
                <p className="text-sm font-semibold text-navy-900">No courses yet</p>
                <p className="text-xs text-navy-400 mt-1">
                  Ask the admin to assign you some courses to get started.
                </p>
              </div>
            ) : (
              <SemesterGrid semesters={semesters} tab={tab} onPick={setActiveSemester} />
            )
          ) : activeCourse == null ? (
            <CourseGrid
              courses={activeCourses}
              assignmentsByCourse={assignments.filter((a) => activeCourses.some((c) => c.id === a.course_id)).reduce((m, a) => {
                if (!m[a.course_id]) m[a.course_id] = []
                m[a.course_id].push(a)
                return m
              }, {})}
              quizzesByCourse={quizzes.filter((q) => activeCourses.some((c) => c.id === q.course_id)).reduce((m, q) => {
                if (!m[q.course_id]) m[q.course_id] = []
                m[q.course_id].push(q)
                return m
              }, {})}
              onPick={setActiveCourse}
            />
          ) : (
            <>
              {showCreate ? (
                <div className="relative">
                  <button
                    onClick={() => setShowCreate(false)}
                    className="absolute -top-2 -right-2 z-10 w-8 h-8 rounded-full bg-white border border-surface-200 shadow-md text-navy-400 hover:text-navy-700 flex items-center justify-center transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  {tab === 'assignments' ? (
                    <CreateAssignment courseId={activeCourse.id} onSuccess={handleCreateSuccess} onCancel={() => setShowCreate(false)} />
                  ) : (
                    <CreateQuiz courseId={activeCourse.id} onSuccess={handleCreateSuccess} onCancel={() => setShowCreate(false)} />
                  )}
                </div>
              ) : (
                <>
                  {/* Section header */}
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                        <activeTab.icon className="w-4 h-4 text-accent-500" />
                        {activeTab.label}
                        <span className="text-xs font-medium text-navy-400">({activeItems.length})</span>
                      </p>
                      <p className="text-xs text-navy-400 mt-0.5">
                        {tab === 'assignments'
                          ? `Assignments for ${activeCourse.course_code}.`
                          : `Quizzes for ${activeCourse.course_code}.`}
                      </p>
                    </div>
                    <button
                      onClick={() => setShowCreate(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-500 text-white text-xs font-semibold px-3.5 py-2.5 shadow-md shadow-accent-500/20 hover:bg-accent-600 active:scale-[0.98] transition-all shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      New {tab === 'assignments' ? 'Assignment' : 'Quiz'}
                    </button>
                    <button
                      onClick={openReuseModal}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-surface-200 bg-white text-navy-600 text-xs font-semibold px-3.5 py-2.5 hover:bg-surface-50 active:scale-[0.98] transition-all shrink-0"
                    >
                      <Copy className="w-4 h-4" />
                      Reuse
                    </button>
                  </div>

                  {/* Empty state */}
                  {activeItems.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-surface-200 bg-white px-6 py-12 text-center">
                      <span className={`inline-flex w-12 h-12 rounded-xl items-center justify-center mb-3 ${tab === 'assignments' ? 'bg-navy-900 text-white' : 'bg-emerald-100 text-emerald-700'}`}>
                        <activeTab.icon className="w-6 h-6" />
                      </span>
                      <p className="text-sm font-semibold text-navy-900">
                        No {tab === 'assignments' ? 'assignments' : 'quizzes'} in this course
                      </p>
                      <p className="text-xs text-navy-400 mt-1">
                        Create your first {tab === 'assignments' ? 'assignment' : 'quiz'} for {activeCourse.course_code}.
                      </p>
                      <button
                        onClick={() => setShowCreate(true)}
                        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-accent-500 text-white text-xs font-semibold px-3.5 py-2.5 shadow-md shadow-accent-500/20 hover:bg-accent-600 active:scale-[0.98] transition-all"
                      >
                        <Plus className="w-4 h-4" />
                        Create {tab === 'assignments' ? 'Assignment' : 'Quiz'}
                      </button>
                    </div>
                  )}

                  {/* Assignments list */}
                  {tab === 'assignments' && activeItems.length > 0 && (
                    <div className="space-y-3">
                      {activeItems.map((a) => {
                        const sc = subCounts[a.id] || { total: 0, ungraded: 0 }
                        const overdue = parseDate(a.due_date) && parseDate(a.due_date) < new Date()
                        return (
                          <div key={a.id} className="border border-surface-200 rounded-2xl bg-white p-5 hover:border-accent-200 hover:shadow-glow transition-all">
                            <div className="flex items-center gap-3.5">
                              <span className="w-11 h-11 shrink-0 rounded-xl bg-navy-900 text-white flex items-center justify-center">
                                <FileText className="w-5 h-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-navy-900 truncate">{a.title}</p>
                                <p className="text-xs text-navy-400 font-mono mt-0.5 truncate">
                                  {a.course_code || ''} · {a.course_title || ''}
                                </p>
                              </div>
                              <button
                                onClick={() => handleDelete('assignment', a.id)}
                                disabled={deleting === a.id}
                                title="Delete assignment"
                                className="p-2 rounded-lg text-navy-300 hover:text-danger hover:bg-danger-light transition-colors shrink-0 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Chip icon={CalendarDays} tone={overdue ? 'red' : 'default'}>
                                Due {shortDate(a.due_date)}
                                {overdue && ' · Overdue'}
                              </Chip>
                              <Chip icon={Award}>Max {a.max_marks} marks</Chip>
                              <Chip icon={Inbox} tone={sc.ungraded > 0 ? 'amber' : 'default'}>
                                {sc.total} response{sc.total === 1 ? '' : 's'}
                                {sc.ungraded > 0 && ` · ${sc.ungraded} to review`}
                              </Chip>
                              {a.attachment_url && (
                                <Chip icon={Paperclip} tone="green">Attachment</Chip>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Quizzes list */}
                  {tab === 'quizzes' && activeItems.length > 0 && (
                    <div className="space-y-3">
                      {activeItems.map((q) => {
                        const questions = quizDetails[q.id] || null
                        const isOpen = expandedQuiz === q.id
                        return (
                          <div key={q.id} className="border border-surface-200 rounded-2xl bg-white p-5 hover:border-accent-200 hover:shadow-glow transition-all">
                            <div className="flex items-center gap-3.5">
                              <span className="w-11 h-11 shrink-0 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                <HelpCircle className="w-5 h-5" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-navy-900 truncate">{q.title}</p>
                                <p className="text-xs text-navy-400 font-mono mt-0.5 truncate">
                                  {q.course_code || ''} · {q.course_title || ''}
                                </p>
                                {q.attachment_url && (
                                  <a
                                    href={`/api/files/${q.attachment_url}?token=${localStorage.getItem('token')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-medium mt-1"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <Paperclip className="w-3 h-3" />
                                    {q.attachment_name || 'Attachment'}
                                  </a>
                                )}
                              </div>
                              <button
                                onClick={() => toggleQuiz(q)}
                                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors shrink-0 ${
                                  isOpen ? 'bg-navy-900 text-white' : 'bg-surface-100 text-navy-600 hover:bg-surface-200'
                                }`}
                              >
                                {isOpen ? 'Hide questions' : 'View questions'}
                                <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-90' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleDelete('quiz', q.id)}
                                disabled={deleting === q.id}
                                title="Delete quiz"
                                className="p-2 rounded-lg text-navy-300 hover:text-danger hover:bg-danger-light transition-colors shrink-0 disabled:opacity-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Chip icon={HelpCircle}>{q.question_count} question{q.question_count === 1 ? '' : 's'}</Chip>
                              <Chip icon={Clock} tone={q.time_limit ? 'navy' : 'default'}>
                                {q.time_limit ? `${q.time_limit} min limit` : 'No time limit'}
                              </Chip>
                              <Chip tone="green">Created {shortDate(q.created_at)}</Chip>
                            </div>

                            {isOpen && (
                              <div className="mt-4 rounded-xl bg-surface-50 border border-surface-100 p-4 space-y-4">
                                {questions && questions.length === 0 && (
                                  <p className="text-xs text-navy-400 text-center">No questions in this quiz.</p>
                                )}
                                {questions && questions.length > 0 && (
                                  questions.map((qu, i) => (
                                    <div key={qu.id} className="rounded-lg bg-white border border-surface-100 p-3.5">
                                      <p className="text-[13px] font-semibold text-navy-900">
                                        <span className="text-accent-600 font-bold mr-1.5">Q{i + 1}.</span>
                                        {qu.text}
                                      </p>
                                      <ul className="mt-2.5 space-y-1.5">
                                        {qu.options.map((opt, oi) => {
                                          const isCorrect = qu.correct_index != null && oi === qu.correct_index
                                          return (
                                            <li key={oi} className="flex items-center gap-2 text-xs">
                                              {isCorrect ? (
                                                <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                                  {opt}
                                                </span>
                                              ) : (
                                                <span className="text-navy-500 pl-5">{opt}</span>
                                              )}
                                            </li>
                                          )
                                        })}
                                      </ul>
                                    </div>
                                  ))
                                )}
                                {!questions && (
                                  <div className="flex items-center justify-center gap-2 py-3">
                                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-accent-500 border-t-transparent" />
                                    <span className="text-xs text-navy-400">Loading questions...</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Reuse Modal */}
      <Modal isOpen={showReuseModal} onClose={() => setShowReuseModal(false)} title="Reuse from Previous Course">
        {reuseStep === 1 && (
          <div className="space-y-4">
            <p className="text-sm text-navy-500">Select a previous course to reuse content from:</p>
            <label className="flex items-center gap-3 p-3 rounded-lg border border-surface-200 hover:border-surface-300 cursor-pointer transition-all">
              <input type="checkbox" checked={showAllPastCourses}
                onChange={async (e) => {
                  const val = e.target.checked
                  setShowAllPastCourses(val)
                  setSelectedSource(null)
                  await fetchReuseSources(val)
                }}
                className="w-4 h-4 rounded border-surface-300 text-accent-500 focus:ring-accent-500" />
              <div>
                <p className="text-sm font-medium text-navy-800">Show all past courses</p>
                <p className="text-xs text-navy-400">Browse content from every course you've taught, not just {activeCourse?.course_code}</p>
              </div>
            </label>
            {reuseLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
              </div>
            ) : reuseSources.length === 0 ? (
              <div className="text-center py-8 text-sm text-navy-400">
                No previous courses with reusable content found for {activeCourse?.course_code}.
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {reuseSources.map(s => (
                  <button key={s.id} onClick={() => selectSourceCourse(s)}
                    className="w-full text-left p-4 rounded-xl border border-surface-200 hover:border-accent-300 hover:bg-accent-50/50 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-accent-600 tracking-wider uppercase">{s.course_code}</p>
                        <p className="text-sm font-semibold text-navy-900 mt-0.5">{s.title}</p>
                        {s.session && <p className="text-xs text-navy-400 mt-0.5">Session {s.session}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 text-[10px] text-navy-500">
                        {s.material_count > 0 && <span>{s.material_count} materials</span>}
                        {s.assignment_count > 0 && <span>{s.assignment_count} assignments</span>}
                        {s.quiz_count > 0 && <span>{s.quiz_count} quizzes</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-3 justify-end pt-2">
              <Button variant="secondary" onClick={() => setShowReuseModal(false)}>Cancel</Button>
            </div>
          </div>
        )}

        {reuseStep === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <button onClick={() => setReuseStep(1)} className="text-accent-600 hover:underline font-medium">
                {selectedSource?.course_code}
              </button>
              <ArrowRight className="w-3.5 h-3.5 text-navy-300" />
              <span className="font-semibold text-navy-800">{activeCourse?.course_code}</span>
            </div>

            {reuseLoading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {/* Materials */}
                {sourceItems.materials.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-navy-700 uppercase tracking-wider">Materials ({sourceItems.materials.length})</h4>
                      <button onClick={() => toggleAll('materials', sourceItems.materials.map(m => m.id))}
                        className="text-[10px] font-semibold text-accent-600 hover:underline">
                        {selectedItems.materials.length === sourceItems.materials.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {sourceItems.materials.map(m => (
                        <label key={m.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedItems.materials.includes(m.id)
                              ? 'border-accent-400 bg-accent-50/50'
                              : 'border-surface-200 hover:border-surface-300'
                          }`}>
                          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                            selectedItems.materials.includes(m.id) ? 'bg-accent-500 border-accent-500 text-white' : 'border-surface-300'
                          }`}>
                            {selectedItems.materials.includes(m.id) && <Check className="w-3 h-3" />}
                          </span>
                          <input type="checkbox" className="sr-only"
                            checked={selectedItems.materials.includes(m.id)}
                            onChange={() => toggleItem('materials', m.id)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy-900 truncate">{m.title}</p>
                            <p className="text-[10px] text-navy-400">{m.category}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Assignments */}
                {sourceItems.assignments.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-navy-700 uppercase tracking-wider">Assignments ({sourceItems.assignments.length})</h4>
                      <button onClick={() => toggleAll('assignments', sourceItems.assignments.map(a => a.id))}
                        className="text-[10px] font-semibold text-accent-600 hover:underline">
                        {selectedItems.assignments.length === sourceItems.assignments.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {sourceItems.assignments.map(a => (
                        <label key={a.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedItems.assignments.includes(a.id)
                              ? 'border-accent-400 bg-accent-50/50'
                              : 'border-surface-200 hover:border-surface-300'
                          }`}>
                          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                            selectedItems.assignments.includes(a.id) ? 'bg-accent-500 border-accent-500 text-white' : 'border-surface-300'
                          }`}>
                            {selectedItems.assignments.includes(a.id) && <Check className="w-3 h-3" />}
                          </span>
                          <input type="checkbox" className="sr-only"
                            checked={selectedItems.assignments.includes(a.id)}
                            onChange={() => toggleItem('assignments', a.id)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy-900 truncate">{a.title}</p>
                            <p className="text-[10px] text-navy-400">Max marks: {a.max_marks}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quizzes */}
                {sourceItems.quizzes.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-navy-700 uppercase tracking-wider">Quizzes ({sourceItems.quizzes.length})</h4>
                      <button onClick={() => toggleAll('quizzes', sourceItems.quizzes.map(q => q.id))}
                        className="text-[10px] font-semibold text-accent-600 hover:underline">
                        {selectedItems.quizzes.length === sourceItems.quizzes.length ? 'Deselect all' : 'Select all'}
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {sourceItems.quizzes.map(q => (
                        <label key={q.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                            selectedItems.quizzes.includes(q.id)
                              ? 'border-accent-400 bg-accent-50/50'
                              : 'border-surface-200 hover:border-surface-300'
                          }`}>
                          <span className={`w-5 h-5 rounded flex items-center justify-center shrink-0 border ${
                            selectedItems.quizzes.includes(q.id) ? 'bg-accent-500 border-accent-500 text-white' : 'border-surface-300'
                          }`}>
                            {selectedItems.quizzes.includes(q.id) && <Check className="w-3 h-3" />}
                          </span>
                          <input type="checkbox" className="sr-only"
                            checked={selectedItems.quizzes.includes(q.id)}
                            onChange={() => toggleItem('quizzes', q.id)} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy-900 truncate">{q.title}</p>
                            <p className="text-[10px] text-navy-400">{q.question_count} questions</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {sourceItems.materials.length === 0 && sourceItems.assignments.length === 0 && sourceItems.quizzes.length === 0 && (
                  <div className="text-center py-8 text-sm text-navy-400">
                    No content found in the selected course.
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2 border-t border-surface-100">
              <Button variant="secondary" onClick={() => setReuseStep(1)}>Back</Button>
              <Button onClick={handleReuse} disabled={reuseSubmitting || (
                selectedItems.materials.length === 0 &&
                selectedItems.assignments.length === 0 &&
                selectedItems.quizzes.length === 0
              )}>
                {reuseSubmitting ? 'Copying...' : `Copy ${selectedItems.materials.length + selectedItems.assignments.length + selectedItems.quizzes.length} items`}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
    <ConfirmDialog
      isOpen={!!deleteTarget}
      onClose={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
      title={`Delete ${deleteTarget?.type === 'assignment' ? 'Assignment' : 'Quiz'}`}
      message={deleteTarget?.message || ''}
      confirmLabel="Delete"
    />
    </>
  )
}

/* ── Sub-components ─────────────────────────────────── */

const SemesterGrid = React.memo(function SemesterGrid({ semesters, tab, onPick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {semesters.map((s) => (
        <button
          key={s.key}
          onClick={() => onPick(s.key)}
          className="group text-left rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-elevated"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="w-11 h-11 rounded-xl bg-navy-900 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 text-accent-600 text-2xs font-bold">
              <ClipboardList className="w-3 h-3" />
              {tab === 'assignments' ? s.asgCount : s.quizCount} {tab === 'assignments' ? 'assignments' : 'quizzes'}
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-navy-900 group-hover:text-accent-600 transition-colors">
            {semLabel(s.key)}
          </h3>
          {s.session && <p className="text-xs text-navy-400 mt-0.5">Session {s.session}</p>}
          <div className="mt-4 flex items-center gap-4 text-xs text-navy-500">
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.count}</span> books</span>
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.asgCount}</span> assignments</span>
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.quizCount}</span> quizzes</span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
            Manage assessments
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  )
})

const CourseGrid = React.memo(function CourseGrid({ courses, assignmentsByCourse, quizzesByCourse, onPick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => {
        const asgCount = (assignmentsByCourse[c.id] || []).length
        const quizCount = (quizzesByCourse[c.id] || []).length
        return (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="group text-left rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-800 text-white flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </span>
              {c.session && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-100 text-navy-500 text-2xs font-bold">
                  {c.session}
                </span>
              )}
            </div>
            <p className="mt-4 text-[11px] font-bold text-accent-600 tracking-wider uppercase">{c.course_code}</p>
            <h3 className="mt-0.5 text-sm font-bold text-navy-900 leading-snug group-hover:text-accent-600 transition-colors">
              {c.title}
            </h3>
            <div className="mt-4 flex items-center gap-4 text-xs text-navy-500 flex-wrap">
              <span className="tabular-nums"><span className="font-bold text-navy-900">{asgCount}</span> assignments</span>
              <span className="tabular-nums"><span className="font-bold text-navy-900">{quizCount}</span> quizzes</span>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
              View assessments
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )
      })}
    </div>
  )
})