import { useState, useEffect, useMemo } from 'react'
import { assignmentsAPI, coursesAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  Inbox, ClipboardList, HelpCircle, Clock, Award,
  CheckCircle2, AlertTriangle, ChevronRight, ChevronLeft,
  User as UserIcon, MessageSquare, Star, FileText, Download,
  GraduationCap, BookOpen,
} from 'lucide-react'

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const semLabel = (semKey) =>
  semKey === 'other' ? 'General' : `${ordinal(Number(semKey))} Semester`

export default function Submissions() {
  const [tab, setTab] = useState('assignments') // 'assignments' | 'quizzes'
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [submissionCounts, setSubmissionCounts] = useState({})
  const [activeSemester, setActiveSemester] = useState(null) // semester key
  const [activeCourse, setActiveCourse] = useState(null) // course object
  const [selected, setSelected] = useState(null) // assignment
  const [submissions, setSubmissions] = useState([])
  const [showGradeModal, setShowGradeModal] = useState(false)
  const [selectedSub, setSelectedSub] = useState(null)
  const [gradeForm, setGradeForm] = useState({ grade: '', feedback: '' })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    setActiveSemester(null)
    setActiveCourse(null)
    setSelected(null)
    setSubmissions([])
    Promise.all([coursesAPI.list(), assignmentsAPI.list()])
      .then(async ([c, a]) => {
        setCourses(c.data)
        setAssignments(a.data)
        const counts = {}
        for (const item of a.data) {
          try {
            const res = await assignmentsAPI.listSubmissions(item.id)
            counts[item.id] = {
              total: res.data.length,
              graded: res.data.filter((s) => s.status === 'graded').length,
            }
          } catch {
            counts[item.id] = { total: 0, graded: 0 }
          }
        }
        setSubmissionCounts(counts)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [tab])

  const coursesById = useMemo(() => {
    const map = {}
    for (const c of courses) map[c.id] = c
    return map
  }, [courses])

  const semesters = useMemo(() => {
    const bySem = {}
    for (const c of courses) {
      const key = c.semester != null ? String(c.semester) : 'other'
      if (!bySem[key]) bySem[key] = []
      bySem[key].push(c)
    }
    return Object.entries(bySem)
      .sort(([a], [b]) => (a === 'other' ? 1 : b === 'other' ? -1 : Number(a) - Number(b)))
      .map(([key, cs]) => {
        const courseAssignments = cs.flatMap((c) => assignments.filter((a) => a.course_id === c.id))
        const totalSubs = courseAssignments.reduce((sum, a) => sum + (submissionCounts[a.id]?.total || 0), 0)
        const toReview = courseAssignments.reduce(
          (sum, a) => sum + ((submissionCounts[a.id]?.total || 0) - (submissionCounts[a.id]?.graded || 0)), 0,
        )
        return {
          key,
          count: cs.length,
          session: cs.find((c) => c.session)?.session || '',
          assignmentCount: courseAssignments.length,
          totalSubs,
          toReview,
        }
      })
  }, [courses, assignments, submissionCounts])

  const activeCourses = activeSemester != null
    ? (semesters.find((s) => s.key === activeSemester) && courses.filter((c) => (c.semester != null ? String(c.semester) : 'other') === activeSemester)) || []
    : []

  const activeCourseAssignments = activeCourse
    ? assignments.filter((a) => a.course_id === activeCourse.id)
    : []

  const viewSubmissions = async (a) => {
    setSelected(a)
    try {
      const r = await assignmentsAPI.listSubmissions(a.id)
      setSubmissions(r.data)
      setSubmissionCounts((prev) => ({
        ...prev,
        [a.id]: {
          total: r.data.length,
          graded: r.data.filter((s) => s.status === 'graded').length,
        },
      }))
    } catch {
      setSubmissions([])
    }
  }

  const openGrade = (s) => {
    setSelectedSub(s)
    setGradeForm({ grade: s.grade || '', feedback: s.feedback || '' })
    setShowGradeModal(true)
  }

  const handleGrade = async (e) => {
    e.preventDefault()
    try {
      await assignmentsAPI.grade(selectedSub.id, {
        grade: parseFloat(gradeForm.grade),
        feedback: gradeForm.feedback,
      })
      setShowGradeModal(false)
      if (selected) await viewSubmissions(selected)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed')
    }
  }

  const goSemesters = () => {
    setActiveSemester(null)
    setActiveCourse(null)
    setSelected(null)
    setSubmissions([])
  }

  const goCourses = () => {
    setActiveCourse(null)
    setSelected(null)
    setSubmissions([])
  }

  const gradedCount = (list) => list.filter((s) => s.status === 'graded').length

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Inbox className="w-3 h-3" />
          Submission Review
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Submissions</h1>
        <p className="text-navy-400 mt-1.5">Pick a semester and book to review student submissions</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex rounded-xl border border-surface-200 bg-white p-1 gap-1 w-full sm:w-auto">
          {[
            { id: 'assignments', label: 'Assignments', mobile: 'Assignments', icon: ClipboardList },
            { id: 'quizzes', label: 'Quizzes', mobile: 'Quizzes', icon: HelpCircle },
          ].map((t) => (
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

      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : tab === 'quizzes' ? (
        <EmptyState icon={HelpCircle} message="No quizzes yet. Create a quiz from the Assessments tab." />
      ) : (
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
              <EmptyState icon={Inbox} message="You have no courses yet. Ask the admin to assign you some." />
            ) : (
              <SemesterGrid semesters={semesters} onPick={setActiveSemester} />
            )
          ) : activeCourse == null ? (
            <CourseGrid
              courses={activeCourses}
              assignmentsByCourse={assignments.filter((a) => activeCourses.some((c) => c.id === a.course_id)).reduce((m, a) => {
                if (!m[a.course_id]) m[a.course_id] = []
                m[a.course_id].push(a)
                return m
              }, {})}
              counts={submissionCounts}
              onPick={setActiveCourse}
            />
          ) : (
            <>
              {activeCourseAssignments.length === 0 ? (
                <EmptyState icon={ClipboardList} message="No assignments for this book yet. Create one from the Assessments tab." />
              ) : (
                <>
                  <AssignmentList
                    items={activeCourseAssignments}
                    selected={selected}
                    counts={submissionCounts}
                    onSelect={viewSubmissions}
                  />
                  {selected && (
                    <SubmissionsTable
                      submissions={submissions}
                      maxMarks={selected.max_marks}
                      onGrade={openGrade}
                      gradedCount={gradedCount}
                    />
                  )}
                </>
              )}
            </>
          )}
        </>
      )}

      {/* Grade Modal */}
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

/* ── Sub-components ─────────────────────────────────── */

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
      <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </span>
      <p className="text-navy-500 text-sm font-medium">{message}</p>
    </div>
  )
}

function SemesterGrid({ semesters, onPick }) {
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
              {s.assignmentCount} assignments
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-navy-900 group-hover:text-accent-600 transition-colors">
            {semLabel(s.key)}
          </h3>
          {s.session && <p className="text-xs text-navy-400 mt-0.5">Session {s.session}</p>}
          <div className="mt-4 flex items-center gap-4 text-xs text-navy-500">
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.count}</span> books</span>
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.totalSubs}</span> submissions</span>
          </div>
          {s.toReview > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-50 border border-amber-200 px-2.5 py-1 text-2xs font-bold text-amber-700">
              <Clock className="w-3 h-3" />
              {s.toReview} to review
            </div>
          )}
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
            Review submissions
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  )
}

function CourseGrid({ courses, assignmentsByCourse, counts, onPick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => {
        const als = assignmentsByCourse[c.id] || []
        const totalSubs = als.reduce((sum, a) => sum + (counts[a.id]?.total || 0), 0)
        const toReview = als.reduce(
          (sum, a) => sum + ((counts[a.id]?.total || 0) - (counts[a.id]?.graded || 0)), 0,
        )
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
              <span className="tabular-nums"><span className="font-bold text-navy-900">{als.length}</span> assignments</span>
              <span className="tabular-nums"><span className="font-bold text-navy-900">{totalSubs}</span> submissions</span>
              {toReview > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-2xs font-bold text-amber-700">
                  <Clock className="w-3 h-3" />
                  {toReview} to review
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
              View submissions
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

function AssignmentList({ items, selected, counts, onSelect }) {
  return (
    <div className="space-y-2 mb-8">
      {items.map((a) => {
        const toReview = (counts[a.id]?.total || 0) - (counts[a.id]?.graded || 0)
        return (
          <div
            key={a.id}
            onClick={() => onSelect(a)}
            className={`border rounded-xl p-4 cursor-pointer transition-all group ${
              selected?.id === a.id
                ? 'border-accent-500 ring-2 ring-accent-400/30 bg-accent-500/5'
                : 'border-surface-200 hover:border-accent-300'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                selected?.id === a.id ? 'bg-accent-500 text-white' : 'bg-navy-900/5 text-navy-600 group-hover:bg-navy-900/10'
              }`}>
                <ClipboardList className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-navy-900 truncate flex-1 min-w-0">{a.title}</h3>
                  <ChevronRight className={`w-4 h-4 text-navy-300 shrink-0 transition-transform ${
                    selected?.id === a.id ? 'translate-x-0.5 text-accent-600' : 'group-hover:translate-x-0.5'
                  }`} />
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                  <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                    <Clock className="w-3 h-3 text-navy-300" />
                    Due: {new Date(a.due_date).toLocaleDateString()}
                  </span>
                  <span className="inline-flex items-center gap-1 text-2xs text-navy-400">
                    <Award className="w-3 h-3 text-navy-300" />
                    Max {a.max_marks}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-surface-200 bg-surface-50 text-2xs font-bold text-navy-600">
                    <Inbox className="w-3 h-3" />
                    {counts[a.id]?.total ?? 0} submissions
                  </span>
                  {toReview > 0 && (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-amber-200 bg-amber-50 text-2xs font-bold text-amber-700">
                      <Clock className="w-3 h-3" />
                      {toReview} to review
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function SubmissionsTable({ submissions, maxMarks, onGrade, gradedCount }) {
  return (
    <div className="border border-surface-200 rounded-xl bg-white overflow-hidden mt-6">
      <div className="px-4 sm:px-6 py-4 border-b border-surface-100 bg-surface-50/60 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-navy-900">
            Submissions ({submissions.length})
          </h2>
          <p className="text-2xs text-navy-400 mt-0.5">
            {gradedCount(submissions)} of {submissions.length} graded
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-success/20 bg-success-light text-success-dark text-2xs font-bold">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {gradedCount(submissions)} graded
        </span>
      </div>

      {submissions.length === 0 ? (
        <div className="px-6 py-12 text-center text-navy-400 text-sm">No submissions yet</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="px-5 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Student</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Submitted</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Status</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Grade</th>
                  <th className="px-5 py-3 text-left text-2xs font-bold text-navy-400 uppercase">File</th>
                  <th className="px-5 py-3 text-right text-2xs font-bold text-navy-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {submissions.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0">
                          <UserIcon className="w-3.5 h-3.5 text-navy-950" />
                        </span>
                        <div>
                          <p className="text-sm font-semibold text-navy-900">{s.student_name || 'Unknown'}</p>
                          {s.roll_number && <p className="text-2xs text-navy-400">Roll: {s.roll_number}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-navy-500 whitespace-nowrap">{new Date(s.submitted_at).toLocaleDateString()}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold border ${
                        s.status === 'graded' ? 'bg-success-light text-success-dark border-success/20'
                          : s.status === 'late' ? 'bg-warning-light text-warning-dark border-warning/20'
                          : 'bg-info-light text-info-dark border-info/20'
                      }`}>
                        {s.status === 'graded' ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        {s.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1 text-sm font-bold text-navy-900">
                        <Star className={`w-3.5 h-3.5 ${s.grade ? 'text-accent-500' : 'text-navy-200'}`} />
                        {s.grade ?? '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {s.file_url ? (
                        <a
                          href={`/${s.file_url}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-accent-200 bg-accent-50 text-accent-700 text-2xs font-semibold hover:bg-accent-100 transition-colors"
                        >
                          <FileText className="w-3 h-3" />
                          View
                        </a>
                      ) : (
                        <span className="text-2xs text-navy-300">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => onGrade(s)}>
                        {s.status === 'graded' ? 'Re-grade' : 'Grade'}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-surface-100">
            {submissions.map((s) => (
              <div key={s.id} className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0">
                    <UserIcon className="w-4 h-4 text-navy-950" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{s.student_name || 'Unknown'}</p>
                    {s.roll_number && <p className="text-2xs text-navy-400">Roll: {s.roll_number}</p>}
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-semibold border shrink-0 ${
                    s.status === 'graded' ? 'bg-success-light text-success-dark border-success/20'
                      : s.status === 'late' ? 'bg-warning-light text-warning-dark border-warning/20'
                      : 'bg-info-light text-info-dark border-info/20'
                  }`}>
                    {s.status}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 text-2xs text-navy-400">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(s.submitted_at).toLocaleDateString()}
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-navy-700">
                      <Star className={`w-3 h-3 ${s.grade ? 'text-accent-500' : 'text-navy-200'}`} />
                      {s.grade ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {s.file_url && (
                      <a
                        href={`/${s.file_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-accent-200 bg-accent-50 text-accent-700 text-2xs font-semibold"
                      >
                        <FileText className="w-3 h-3" />
                        View
                      </a>
                    )}
                    <button
                      onClick={() => onGrade(s)}
                      className="text-2xs font-semibold text-accent-600 hover:text-accent-700 px-2 py-1"
                    >
                      {s.status === 'graded' ? 'Re-grade' : 'Grade'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}