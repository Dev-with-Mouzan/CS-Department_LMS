import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { coursesAPI, assignmentsAPI, resultsAPI, attendanceAPI } from '../services/api'
import { parseDate, shortDate, MONTHS } from '../utils/format'
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Inbox,
  CalendarCheck,
  PlusCircle,
  GraduationCap,
  Trophy,
  Users,
  AlertTriangle,
  RefreshCw,
  X,
} from 'lucide-react'

const examTone = (type) => {
  const t = String(type || '').toLowerCase()
  if (t.includes('final')) return { label: 'Final', chip: 'bg-navy-900 text-white' }
  if (t.includes('quiz')) return { label: 'Quiz', chip: 'bg-sky-100 text-sky-700' }
  if (t.includes('assignment')) return { label: 'Assignment', chip: 'bg-emerald-100 text-emerald-700' }
  return { label: 'Midterm', chip: 'bg-amber-100 text-amber-700' }
}

const CourseCard = React.memo(function CourseCard({ course, meta }) {
  const m = meta || { students: 0, sessions: 0, submitted: 0, ungraded: 0 }
  return (
    <div className="group border border-surface-200 bg-white hover:border-accent-300 hover:shadow-glow rounded-2xl overflow-hidden transition-all">
      <div className="flex items-center justify-between gap-3 px-5 py-3 bg-navy-950">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-white">
          <GraduationCap className="w-3.5 h-3.5 text-accent-400" />
          BSCS
        </span>
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono tracking-wide bg-white/10 border border-white/10 text-accent-300">
          {course.session || '—'}
        </span>
      </div>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 shrink-0 rounded-xl bg-navy-800 text-white group-hover:bg-accent-500 transition-colors flex items-center justify-center text-xs font-bold">
            {course.course_code.slice(0, 2).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate text-navy-900 group-hover:text-accent-600 transition-colors">{course.title}</p>
            <p className="text-xs text-navy-400 font-mono mt-0.5">
              {course.course_code}
              {course.semester ? ` · Sem ${course.semester}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-surface-50 border border-surface-100 px-2 py-2.5 text-center">
            <Users className="w-3.5 h-3.5 text-navy-300 mx-auto" />
            <p className="text-sm font-bold text-navy-900 tabular-nums mt-1">{m.students}</p>
            <p className="text-[9px] text-navy-400 mt-0.5">Students</p>
          </div>
          <div className="rounded-lg bg-surface-50 border border-surface-100 px-2 py-2.5 text-center">
            <CalendarCheck className="w-3.5 h-3.5 text-navy-300 mx-auto" />
            <p className="text-sm font-bold text-navy-900 tabular-nums mt-1">{m.sessions}</p>
            <p className="text-[9px] text-navy-400 mt-0.5">Sessions</p>
          </div>
          <div className="rounded-lg bg-surface-50 border border-surface-100 px-2 py-2.5 text-center">
            <Inbox className="w-3.5 h-3.5 text-navy-300 mx-auto" />
            <p className={`text-sm font-bold tabular-nums mt-1 ${m.ungraded > 0 ? 'text-amber-600' : 'text-navy-900'}`}>
              {m.submitted}
            </p>
            <p className="text-[9px] text-navy-400 mt-0.5">Responses</p>
          </div>
        </div>

        {m.ungraded > 0 && (
          <Link
            to="/teacher/submissions"
            className="mt-2.5 flex items-center justify-between gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 transition-colors hover:bg-amber-100/70"
          >
            <span className="text-[11px] font-semibold text-amber-700">
              {m.ungraded} response{m.ungraded === 1 ? '' : 's'} to review
            </span>
            <span className="inline-flex items-center gap-0.5 text-[11px] font-bold text-accent-600">
              Review
              <ChevronRight className="w-3 h-3" />
            </span>
          </Link>
        )}
      </div>
    </div>
  )
})

export default function TeacherDashboard() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [results, setResults] = useState([])
  const [courseMeta, setCourseMeta] = useState({})
  const [subStats, setSubStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCourses, setShowCourses] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [c, a, r] = await Promise.all([
        coursesAPI.list(),
        assignmentsAPI.list(),
        resultsAPI.list(),
      ])

      const [subGroups, enrollments, sessions] = await Promise.all([
        Promise.all(
          a.data.map(async (asg) => {
            try {
              const s = await assignmentsAPI.listSubmissions(asg.id)
              return { courseId: asg.course_id, subs: s.data }
            } catch {
              return { courseId: asg.course_id, subs: [] }
            }
          })
        ),
        Promise.all(
          c.data.map(async (course) => {
            try {
              const s = await coursesAPI.listCourseStudents(course.id)
              return { courseId: course.id, count: s.data.length }
            } catch {
              return { courseId: course.id, count: 0 }
            }
          })
        ),
        Promise.all(
          c.data.map(async (course) => {
            try {
              const s = await attendanceAPI.listSessions({ course_id: course.id })
              return { courseId: course.id, count: s.data.length }
            } catch {
              return { courseId: course.id, count: 0 }
            }
          })
        ),
      ])

      const meta = {}
      for (const course of c.data) {
        meta[course.id] = { students: 0, sessions: 0, submitted: 0, ungraded: 0 }
      }
      for (const e of enrollments) meta[e.courseId].students = e.count
      for (const s of sessions) meta[s.courseId].sessions = s.count

      let total = 0
      let ungraded = 0
      for (const { courseId, subs } of subGroups) {
        total += subs.length
        ungraded += subs.filter((s) => s.grade == null).length
        meta[courseId].submitted += subs.length
        meta[courseId].ungraded += subs.filter((s) => s.grade == null).length
      }

      setCourses(c.data)
      setAssignments(a.data)
      setResults(r.data)
      setCourseMeta(meta)
      setSubStats({ total, ungraded })
    } catch (err) {
      console.error(err)
      setError('Could not load your dashboard data. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="p-5 lg:p-8 max-w-6xl mx-auto w-full">
        <div className="h-44 rounded-2xl bg-surface-200/70 animate-pulse mb-6" />
        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5">
          <div className="space-y-5">
            <div className="h-64 rounded-2xl bg-surface-200/70 animate-pulse" />
            <div className="h-72 rounded-2xl bg-surface-200/70 animate-pulse" />
          </div>
          <div className="space-y-5">
            <div className="h-52 rounded-2xl bg-surface-200/70 animate-pulse" />
            <div className="h-40 rounded-2xl bg-surface-200/70 animate-pulse" />
            <div className="h-40 rounded-2xl bg-surface-200/70 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 lg:p-8 max-w-6xl mx-auto w-full">
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
      </div>
    )
  }

  const firstName = user?.first_name || 'there'
  const today = parseDate(new Date())
  const dateLine = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const displayedCourses = courses

  const upcoming = assignments
    .map((a) => ({ ...a, due: parseDate(a.due_date) }))
    .filter((a) => a.due && a.due >= new Date().setHours(0, 0, 0, 0))
    .sort((x, y) => x.due - y.due)

  const toReview = subStats?.ungraded || 0
  const subTotal = subStats?.total || 0
  const graded = subTotal - toReview
  const reviewedPct = subTotal > 0 ? (graded / subTotal) * 100 : 0
  const ringTone = subTotal > 0 ? (toReview === 0 ? 'bg-emerald-500' : 'bg-accent-500') : 'bg-surface-200'

  const heroStats = [
    { label: 'Active courses', value: courses.length },
    { label: 'Assessments', value: assignments.length },
    { label: 'Upcoming', value: upcoming.length },
    { label: 'To review', value: toReview },
  ]

  const quickActions = [
    { to: '/teacher/assessments', icon: PlusCircle, label: 'Create assessment', desc: 'Assignments & quizzes for students', color: 'bg-accent-500' },
    { to: '/teacher/submissions', icon: Inbox, label: 'Review submissions', desc: 'Grade & give feedback on work', color: 'bg-emerald-500' },
    { to: '/teacher/attendance', icon: CalendarCheck, label: 'Mark attendance', desc: "Record today's session", color: 'bg-sky-500' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto w-full">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-950 text-white p-6 lg:p-8 mb-6">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-accent-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-12 w-80 h-80 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-accent-300">{dateLine}</p>
            <h1 className="mt-2 text-2xl lg:text-[28px] font-bold tracking-tight leading-tight">
              Welcome back,{' '}
              <span className="text-accent-400">{firstName}</span>
            </h1>
            <p className="mt-1.5 text-sm text-navy-300">Faculty · BSCS Department — here's how your term is shaping up.</p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-accent-400" />
              <span className="text-[11px] font-medium text-navy-200">
                {toReview === 0
                  ? 'All submissions reviewed — clear inbox'
                  : `${toReview} submission${toReview === 1 ? '' : 's'} awaiting your review`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full md:w-[320px] shrink-0">
            {heroStats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xl font-bold tabular-nums tracking-tight">{s.value}</p>
                <p className="text-[11px] font-medium text-navy-300 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Upcoming deadlines */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <CalendarClock className="w-3.5 h-3.5" />
                  </span>
                  Upcoming deadlines
                </h2>
                <p className="text-xs text-navy-400 mt-1">
                  {upcoming.length > 2
                    ? `Showing 2 of ${upcoming.length} — newest deadlines first.`
                    : 'Deadlines in the order they hit.'}
                </p>
              </div>
              {upcoming.length > 0 && (
                <Link
                  to="/teacher/assessments"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700 whitespace-nowrap"
                >
                  All assessments
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {upcoming.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-surface-200 py-10 text-center">
                <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <p className="text-sm font-medium text-navy-900">No upcoming deadlines</p>
                <p className="text-xs text-navy-400 mt-1">Create assessments to keep students working.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {upcoming.slice(0, 2).map((a) => {
                  const d = a.due
                  const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
                  const chip =
                    daysLeft <= 2
                      ? 'bg-red-50 text-red-600 border-red-200'
                      : daysLeft <= 7
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-surface-100 text-navy-500 border-surface-200'
                  return (
                    <Link
                      key={a.id}
                      to="/teacher/assessments"
                      className="group flex items-center gap-3.5 rounded-xl border border-surface-100 bg-surface-50/70 p-3 transition-all duration-200 hover:border-accent-200 hover:bg-white"
                    >
                      <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-white border border-surface-200 py-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-navy-400">
                          {MONTHS[d.getMonth()]}
                        </span>
                        <span className="text-base font-bold leading-tight text-navy-900 tabular-nums">{d.getDate()}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy-900 truncate">{a.title}</p>
                        <p className="text-[11px] text-navy-400 truncate">{a.course_code || a.course_title || 'Assessment'}</p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${chip}`}>
                        {daysLeft <= 0 ? 'Due today' : `${daysLeft}d left`}
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0 text-navy-300 transition-all group-hover:text-accent-500 group-hover:translate-x-0.5" />
                    </Link>
                  )
                })}
              </div>
            )}
            {upcoming.length > 2 && (
              <Link
                to="/teacher/assessments"
                className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-surface-200 py-2.5 text-xs font-semibold text-navy-500 transition-all hover:border-accent-300 hover:text-accent-600 hover:bg-accent-500/5 active:scale-[0.99]"
              >
                See all deadlines
                <span className="text-navy-400 font-medium tabular-nums">({upcoming.length - 2} more)</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </section>

          {/* My courses */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center">
                    <BookOpen className="w-3.5 h-3.5" />
                  </span>
                  My courses
                </h2>
                <p className="text-xs text-navy-400 mt-1">
                  {courses.length > 2 ? `Showing 2 of ${courses.length} courses you teach.` : 'Courses you are teaching.'}
                </p>
              </div>
              <span className="text-xs font-medium text-navy-400 tabular-nums">{courses.length} courses</span>
            </div>

            {courses.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-surface-200 py-10 text-center">
                <BookOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-navy-900">No courses assigned yet</p>
                <p className="text-xs text-navy-400 mt-1">Your assigned courses will show up here.</p>
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {displayedCourses.slice(0, 2).map((course) => (
                  <CourseCard key={course.id} course={course} meta={courseMeta[course.id]} />
                ))}
              </div>
            )}
            {displayedCourses.length > 0 && (
              <button
                onClick={() => setShowCourses(true)}
                className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-surface-200 py-2.5 text-xs font-semibold text-navy-500 transition-all hover:border-accent-300 hover:text-accent-600 hover:bg-accent-500/5 active:scale-[0.99]"
              >
                Show all courses
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </section>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Submissions */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Inbox className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-navy-900">Submissions</h2>
              </div>
              <p className="text-[11px] text-navy-400 tabular-nums">{subTotal} received</p>
            </div>

            <div className="mt-5 flex items-center justify-center gap-7">
              <div className="relative w-28 h-28 shrink-0">
                <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-surface-100" />
                  <circle
                    cx="60"
                    cy="60"
                    r="52"
                    fill="none"
                    strokeWidth="10"
                    strokeLinecap="round"
                    className={ringTone}
                    strokeDasharray="326.73"
                    strokeDashoffset={326.73 * (1 - Math.min(reviewedPct, 100) / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xl font-bold tabular-nums ${toReview === 0 ? 'text-emerald-600' : 'text-navy-900'}`}>
                    {subTotal > 0 ? `${reviewedPct.toFixed(0)}%` : '—'}
                  </span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-emerald-700 tabular-nums">{graded}</p>
                <p className="text-[11px] text-navy-400">responses graded</p>
                <p className="text-[11px] text-navy-400 mt-0.5">
                  <span className={`font-semibold ${toReview > 0 ? 'text-amber-600' : 'text-navy-600'}`}>
                    {toReview}
                  </span>{' '}
                  still to review
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-50 px-3.5 py-2.5">
              <p className="text-[11px] text-navy-500">
                {toReview > 0
                  ? 'Students are waiting on your feedback.'
                  : subTotal > 0
                    ? 'All responses graded — excellent.'
                    : 'No responses received yet.'}
              </p>
              <Link
                to="/teacher/submissions"
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent-600 hover:text-accent-700 shrink-0"
              >
                Review
                <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          </section>

          {/* Recent results */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-navy-900">Recent results</h2>
              </div>
              {results.length > 0 && (
                <Link
                  to="/teacher/results"
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent-600 hover:text-accent-700"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {results.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-surface-200 py-7 text-center">
                <p className="text-sm font-medium text-navy-900">Nothing published yet</p>
                <p className="text-xs text-navy-400 mt-1">Results you publish will appear here.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-1">
                {results.slice(0, 3).map((r) => {
                  const e = examTone(r.exam_type)
                  return (
                    <Link
                      key={r.id}
                      to="/teacher/results"
                      className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-50"
                    >
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${e.chip}`}>{e.label}</span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-navy-900 truncate">{r.title}</p>
                        <p className="text-[10px] text-navy-400 truncate">
                          {r.course_name || 'Result'} · {shortDate(r.created_at)}
                        </p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 shrink-0 text-navy-300 group-hover:text-accent-500 group-hover:translate-x-0.5 transition-all" />
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          {/* Quick actions */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-2">
            {quickActions.map((action) => (
              <Link
                key={action.label}
                to={action.to}
                className="group flex items-center gap-3.5 rounded-xl p-3 transition-colors hover:bg-accent-500/5"
              >
                <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${action.color} shadow-md transition-shadow`}>
                  <action.icon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy-900 group-hover:text-accent-600 transition-colors">{action.label}</p>
                  <p className="text-[11px] text-navy-400">{action.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 shrink-0 text-navy-300 group-hover:text-accent-500 group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </section>
        </div>
      </div>

      {/* All courses modal */}
      {showCourses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={() => setShowCourses(false)} />
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-navy-900">All courses</h3>
                <p className="text-xs text-navy-400 mt-0.5">
                  {displayedCourses.length} course{displayedCourses.length === 1 ? '' : 's'} · teaching this term
                </p>
              </div>
              <button
                onClick={() => setShowCourses(false)}
                className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:bg-surface-50 hover:text-navy-600 active:scale-95 transition-all"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-4 p-5">
              {displayedCourses.map((course) => (
                <CourseCard key={course.id} course={course} meta={courseMeta[course.id]} />
              ))}
              {displayedCourses.length === 0 && (
                <div className="col-span-full text-center py-10">
                  <p className="text-sm text-navy-400">No courses</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}