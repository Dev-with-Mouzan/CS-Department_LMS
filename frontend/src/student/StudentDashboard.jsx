import React, { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authAPI, coursesAPI, assignmentsAPI, resultsAPI, attendanceAPI } from '../services/api'
import { parseDate, MONTHS } from '../utils/format'
import {
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  CalendarCheck,
  Trophy,
  GraduationCap,
  AlertTriangle,
  RefreshCw,
  X,
  Lock,
} from 'lucide-react'

const EMPTY_ATT = { total_sessions: 0, present_count: 0, percentage: 0 }

const toneOf = (pct) => {
  if (pct >= 75) return { text: 'text-emerald-600', bar: 'bg-emerald-500' }
  if (pct >= 50) return { text: 'text-amber-600', bar: 'bg-amber-500' }
  return { text: 'text-red-500', bar: 'bg-red-500' }
}

const examTone = (type) => {
  const t = String(type || '').toLowerCase()
  if (t.includes('final')) return { label: 'Final', chip: 'bg-navy-900 text-white' }
  if (t.includes('quiz')) return { label: 'Quiz', chip: 'bg-sky-100 text-sky-700' }
  if (t.includes('assignment')) return { label: 'Assignment', chip: 'bg-emerald-100 text-emerald-700' }
  return { label: 'Midterm', chip: 'bg-amber-100 text-amber-700' }
}

const CourseCard = React.memo(function CourseCard({ course, att, isPast }) {
  const a = att || EMPTY_ATT
  const pct = a.percentage || (a.total_sessions ? (a.present_count / a.total_sessions) * 100 : 0)
  const tone = toneOf(pct)
  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${
      isPast
        ? 'border-surface-200 bg-surface-50/50 opacity-70'
        : 'border-surface-200 hover:border-accent-300'
    }`}>
      <div className="flex items-center gap-3">
        <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold ${
          isPast
            ? 'bg-surface-200 text-navy-400'
            : 'bg-gradient-to-br from-navy-800 to-navy-950 text-white'
        }`}>
          {isPast ? <Lock className="w-4 h-4" /> : course.course_code.slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className={`text-sm font-medium truncate ${isPast ? 'text-navy-500' : 'text-navy-900'}`}>{course.title}</p>
            {isPast && (
              <span className="shrink-0 px-1.5 py-0.5 rounded bg-surface-200 text-[9px] font-bold text-navy-500">PAST</span>
            )}
          </div>
          <p className="text-[11px] text-navy-400 font-mono truncate">
            {course.course_code}
            {course.session ? ` · ${course.session}` : ''}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold tabular-nums leading-none ${isPast ? 'text-navy-400' : tone.text}`}>
            {pct.toFixed(0)}
            <span className="text-[11px] font-semibold text-navy-400">%</span>
          </p>
          <p className="text-[10px] text-navy-400 mt-1 tabular-nums">
            {a.present_count}/{a.total_sessions} sessions
          </p>
        </div>
      </div>
      <div className="mt-3 h-1.5 w-full rounded-full bg-surface-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isPast ? 'bg-navy-300' : tone.bar}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
})

export default function StudentDashboard() {
  const { user, setUser } = useAuth()
  const userRef = useRef(user)
  userRef.current = user
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [results, setResults] = useState([])
  const [att, setAtt] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showCourses, setShowCourses] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // Refresh user profile to get latest semester after promotion
      try {
        const meRes = await authAPI.getMe()
        if (meRes.data?.semester !== undefined) {
          setUser((prev) => prev ? { ...prev, semester: meRes.data.semester } : prev)
        }
      } catch { /* keep current user data */ }

      const [c, a, r] = await Promise.all([
        coursesAPI.list(),
        assignmentsAPI.list(),
        resultsAPI.list(),
      ])
      const attResults = await Promise.all(
        c.data.map((course) =>
          attendanceAPI.getPercentage(userRef.current.id, course.id)
            .then((r) => ({ courseId: course.id, data: r.data }))
            .catch(() => ({ courseId: course.id, data: EMPTY_ATT }))
        )
      )
      const attMap = {}
      for (const r of attResults) attMap[r.courseId] = r.data
      setCourses(c.data)
      setAssignments(a.data)
      setResults(r.data)
      setAtt(attMap)
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
            <div className="h-56 rounded-2xl bg-surface-200/70 animate-pulse" />
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
  const semester = user?.semester
  const today = parseDate(new Date())
  const dateLine = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const currentCourses = courses.filter((c) => c.semester === semester)
  const pastCourses = courses.filter((c) => c.semester < semester)

  const upcoming = assignments
    .map((a) => ({ ...a, due: parseDate(a.due_date) }))
    .filter((a) => a.due && a.due >= new Date().setHours(0, 0, 0, 0))
    .sort((x, y) => {
      if (x.submitted !== y.submitted) return x.submitted ? 1 : -1
      return x.due - y.due
    })
  const pendingCount = upcoming.filter((a) => !a.submitted).length

  const totalSessions = Object.values(att).reduce((sum, d) => sum + (d.total_sessions || 0), 0)
  const totalPresent = Object.values(att).reduce((sum, d) => sum + (d.present_count || 0), 0)
  const overallPct = totalSessions > 0 ? (totalPresent / totalSessions) * 100 : 0
  const attTone = toneOf(overallPct)

  const heroStats = [
    { label: 'Courses', value: currentCourses.length },
    { label: 'Pending', value: pendingCount, note: 'assessments' },
    { label: 'Results', value: results.length },
    { label: 'Attendance', value: `${overallPct.toFixed(0)}%` },
  ]

  const shortDate = (value) => {
    const d = parseDate(value)
    return d ? `${d.getDate()} ${MONTHS[d.getMonth()]}` : ''
  }

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
            <p className="mt-1.5 text-sm text-navy-300">
              {semester ? `Semester ${semester} · BSCS` : 'BSCS'} student — here's how your term is shaping up.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-accent-400" />
              <span className="text-[11px] font-medium text-navy-200">
                {pendingCount === 0
                  ? 'All clear — nothing due right now'
                  : `${pendingCount} assessment${pendingCount === 1 ? '' : 's'} awaiting submission`}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full md:w-[320px] shrink-0">
            {heroStats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className={`text-xl font-bold tabular-nums tracking-tight ${s.label === 'Attendance' ? attTone.text : ''}`}>
                  {s.value}
                </p>
                <p className="text-[11px] font-medium text-navy-300 mt-0.5">
                  {s.label}
                  {s.note ? <span className="text-navy-400"> · {s.note}</span> : null}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Upcoming assessments */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <CalendarClock className="w-3.5 h-3.5" />
                  </span>
                  Upcoming assessments
                </h2>
                <p className="text-xs text-navy-400 mt-1">
                  {upcoming.length > 2
                    ? `Showing 2 of ${upcoming.length} — newest deadlines first.`
                    : 'Deadlines in the order they hit.'}
                </p>
              </div>
            </div>

            {upcoming.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-surface-200 py-10 text-center">
                <span className="inline-flex w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 items-center justify-center mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                </span>
                <p className="text-sm font-medium text-navy-900">No pending assessments</p>
                <p className="text-xs text-navy-400 mt-1">You're all caught up.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {upcoming.slice(0, 2).map((a) => {
                  const d = a.due
                  const daysLeft = Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24))
                  const chip =
                    a.submitted
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : daysLeft <= 2
                        ? 'bg-red-50 text-red-600 border-red-200'
                        : daysLeft <= 7
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-surface-100 text-navy-500 border-surface-200'
                  const chipText = a.submitted
                    ? 'Submitted'
                    : daysLeft <= 0
                      ? 'Due today'
                      : `${daysLeft}d left`
                  return (
                    <Link
                      key={a.id}
                      to="/student/assignments"
                      className="group flex items-center gap-3.5 rounded-xl border border-surface-100 bg-surface-50/70 p-3 transition-all duration-200 hover:border-accent-200 hover:bg-white"
                    >
                      <span className="flex w-11 shrink-0 flex-col items-center rounded-lg bg-white border border-surface-200 py-1.5">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-navy-400">
                          {MONTHS[d.getMonth()]}
                        </span>
                        <span className="text-base font-bold leading-tight text-navy-900 tabular-nums">
                          {d.getDate()}
                        </span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-navy-900 truncate">{a.title}</p>
                        <p className="text-[11px] text-navy-400 truncate">
                          {a.course_code || a.course_title || 'Assessment'}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold ${chip}`}>
                        {chipText}
                      </span>
                      <ChevronRight className="w-4 h-4 shrink-0 text-navy-300 transition-all group-hover:text-accent-500 group-hover:translate-x-0.5" />
                    </Link>
                  )
                })}
              </div>
            )}
            {upcoming.length > 2 && (
              <Link
                to="/student/assignments"
                className="mt-3.5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-surface-200 py-2.5 text-xs font-semibold text-navy-500 transition-all hover:border-accent-300 hover:text-accent-600 hover:bg-accent-500/5 active:scale-[0.99]"
              >
                See all assessments
                <span className="text-navy-400 font-medium tabular-nums">({upcoming.length - 2} more)</span>
                <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5" />
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
                  {currentCourses.length > 2
                    ? `Showing 2 of ${currentCourses.length} current semester courses.`
                    : 'Current semester courses.'}
                </p>
              </div>
              <span className="text-xs font-medium text-navy-400 tabular-nums">{currentCourses.length} active</span>
            </div>

            {currentCourses.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-surface-200 py-10 text-center">
                <BookOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-navy-900">No courses available yet</p>
                <p className="text-xs text-navy-400 mt-1">Your semester courses will show up here.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {currentCourses.slice(0, 2).map((course) => (
                  <CourseCard key={course.id} course={course} att={att[course.id]} />
                ))}
              </div>
            )}
            {currentCourses.length > 0 && (
              <button
                onClick={() => setShowCourses(true)}
                className="mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-surface-200 py-2.5 text-xs font-semibold text-navy-500 transition-all hover:border-accent-300 hover:text-accent-600 hover:bg-accent-500/5 active:scale-[0.99]"
              >
                Show all courses
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </section>

          {/* Past courses */}
          {pastCourses.length > 0 && (
            <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-surface-200 text-navy-500 flex items-center justify-center">
                      <Lock className="w-3.5 h-3.5" />
                    </span>
                    Past courses
                  </h2>
                  <p className="text-xs text-navy-400 mt-1">Courses from previous semesters (read-only).</p>
                </div>
                <span className="text-xs font-medium text-navy-400 tabular-nums">{pastCourses.length} archived</span>
              </div>
              <div className="mt-4 space-y-3">
                {pastCourses.map((course) => (
                  <CourseCard key={course.id} course={course} att={att[course.id]} isPast />
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Attendance */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <CalendarCheck className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-navy-900">Attendance</h2>
              </div>
              <p className="text-[11px] text-navy-400 tabular-nums">{totalSessions} sessions</p>
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
                    className={attTone.bar}
                    strokeDasharray="326.73"
                    strokeDashoffset={326.73 * (1 - Math.min(overallPct, 100) / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-xl font-bold tabular-nums ${attTone.text}`}>{overallPct.toFixed(0)}%</span>
                </div>
              </div>
              <div className="min-w-0">
                <p className="text-2xl font-bold text-navy-900 tabular-nums">{totalPresent}</p>
                <p className="text-[11px] text-navy-400">sessions present</p>
                <p className="text-[11px] text-navy-400 mt-0.5">
                  of <span className="font-semibold text-navy-600 tabular-nums">{totalSessions}</span> total
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl bg-surface-50 px-3.5 py-2.5">
              <p className="text-[11px] text-navy-500">
                {overallPct >= 75
                  ? 'Above the 75% bar — keep it up.'
                  : overallPct >= 50
                    ? 'Below 75% — attend class to stay eligible.'
                    : 'Attendance is critical right now.'}
              </p>
              <Link
                to="/student/attendance"
                className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent-600 hover:text-accent-700 shrink-0"
              >
                Details
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
                  to="/student/results"
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
                <p className="text-xs text-navy-400 mt-1">Results appear here once teachers publish them.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-1">
                {results.slice(0, 3).map((r) => {
                  const e = examTone(r.exam_type)
                  return (
                    <Link
                      key={r.id}
                      to="/student/results"
                      className="group flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-50"
                    >
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${e.chip}`}>
                        {e.label}
                      </span>
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
        </div>
      </div>

      {/* All courses modal */}
      {showCourses && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm"
            onClick={() => setShowCourses(false)}
          />
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-3 border-b border-surface-200 px-5 py-4">
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-navy-900">All courses</h3>
                <p className="text-xs text-navy-400 mt-0.5">
                  {currentCourses.length} active · {pastCourses.length} past
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
            <div className="max-h-[60vh] overflow-y-auto p-5 space-y-5">
              {currentCourses.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-navy-500 uppercase tracking-wider mb-2">Current Semester</p>
                  <div className="space-y-3">
                    {currentCourses.map((course) => (
                      <CourseCard key={course.id} course={course} att={att[course.id]} />
                    ))}
                  </div>
                </div>
              )}
              {pastCourses.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-navy-500 uppercase tracking-wider mb-2">Past Semesters</p>
                  <div className="space-y-3">
                    {pastCourses.map((course) => (
                      <CourseCard key={course.id} course={course} att={att[course.id]} isPast />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}