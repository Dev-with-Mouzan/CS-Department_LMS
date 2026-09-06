import { useState, useEffect } from 'react'
import { coursesAPI, attendanceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  CalendarCheck,
  BookOpen,
  CheckCircle2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  XCircle,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react'

const toneOf = (pct) => {
  if (pct >= 75) return { text: 'text-emerald-600', bar: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' }
  if (pct >= 50) return { text: 'text-amber-600', bar: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 border-amber-200' }
  return { text: 'text-red-500', bar: 'bg-red-500', bg: 'bg-red-50 text-red-600 border-red-200' }
}

const statusMeta = {
  present: { label: 'Present', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', Icon: CheckCircle2 },
  late: { label: 'Late', cls: 'bg-amber-50 text-amber-700 border-amber-200', Icon: Clock },
  absent: { label: 'Absent', cls: 'bg-red-50 text-red-600 border-red-200', Icon: XCircle },
  excused: { label: 'Excused', cls: 'bg-sky-50 text-sky-700 border-sky-200', Icon: ShieldCheck },
}

const fmtSessionDate = (d) => {
  const dt = new Date(`${String(d).slice(0, 10)}T00:00:00`)
  return dt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

const fmtTime = (t) => (t ? String(t).slice(0, 5) : '')

export default function MyAttendance() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [summary, setSummary] = useState({})
  const [loading, setLoading] = useState(true)
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [sessions, setSessions] = useState([])
  const [sessionsLoading, setSessionsLoading] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const c = await coursesAPI.list()
        setCourses(c.data)
        const att = {}
        for (const course of c.data) {
          try {
            const r = await attendanceAPI.getPercentage(user.id, course.id)
            att[course.id] = r.data
          } catch {
            att[course.id] = { total_sessions: 0, present_count: 0, percentage: 0 }
          }
        }
        setSummary(att)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  useEffect(() => {
    if (!activeCourseId) { setSessions([]); return }
    let cancelled = false
    const load = async () => {
      setSessionsLoading(true)
      try {
        const s = await attendanceAPI.listSessions({ course_id: activeCourseId })
        const rows = await Promise.all((s.data || []).map(async (sess) => {
          let status = null
          try {
            const rec = await attendanceAPI.getSessionRecords(sess.id)
            status = rec.data?.[0]?.status || null
          } catch { /* session not marked */ }
          return { ...sess, status }
        }))
        if (!cancelled) setSessions(rows)
      } catch {
        if (!cancelled) setSessions([])
      }
      finally {
        if (!cancelled) setSessionsLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [activeCourseId])

  const activeCourse = courses.find((c) => c.id === activeCourseId) || null
  const pick = (id) => setActiveCourseId(id)
  const goSubjects = () => setActiveCourseId(null)

  const totalSessions = Object.values(summary).reduce((sum, d) => sum + (d.total_sessions || 0), 0)
  const totalPresent = Object.values(summary).reduce((sum, d) => sum + (d.present_count || 0), 0)
  const overallPct = totalSessions > 0 ? (totalPresent / totalSessions * 100) : 0
  const pctColor = overallPct >= 75 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500'
  const barColor = overallPct >= 75 ? 'bg-emerald-500' : overallPct >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <CalendarCheck className="w-3 h-3" />
          Attendance
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">My Attendance</h1>
        <p className="text-sm text-navy-400 mt-1">Pick a subject to see your attendance and session history.</p>
      </div>

      {/* Overall summary card */}
      <div className="border border-surface-200 rounded-xl bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-navy-400">Overall Attendance</p>
            <p className={`text-3xl font-bold tracking-tight mt-1 ${pctColor}`}>{overallPct.toFixed(1)}%</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600 tabular-nums">{totalPresent}</p>
              <p className="text-[10px] text-navy-400">present</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy-500 tabular-nums">{totalSessions - totalPresent}</p>
              <p className="text-[10px] text-navy-400">absent/late</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-surface-200 rounded-full h-2.5">
          <div className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }} />
        </div>
        <p className="text-[10px] text-navy-400 mt-2 flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-emerald-500" />
          {totalSessions} total sessions
        </p>
      </div>

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
            <SubjectGrid courses={courses} summary={summary} onPick={pick} />
          ) : (
            <SubjectDetail
              course={activeCourse}
              att={summary[activeCourse.id] || { total_sessions: 0, present_count: 0, percentage: 0 }}
              sessions={sessions}
              sessionsLoading={sessionsLoading}
            />
          )}
        </>
      )}
    </div>
  )
}

/* ── Subject grid ────────────────────────────────────── */

function SubjectGrid({ courses, summary, onPick }) {
  if (courses.length === 0) {
    return (
      <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
        <BookOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
        <p className="text-sm text-navy-400">No courses enrolled yet.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map(course => {
        const att = summary[course.id] || { total_sessions: 0, present_count: 0, percentage: 0 }
        const pct = att.percentage || (att.total_sessions ? (att.present_count / att.total_sessions) * 100 : 0)
        const tone = toneOf(pct)

        return (
          <button
            key={course.id}
            onClick={() => onPick(course.id)}
            className="group text-left rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-800 text-white flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </span>
              <p className={`text-xl font-bold tabular-nums leading-none ${tone.text}`}>
                {pct.toFixed(1)}
                <span className="text-[11px] font-semibold text-navy-400">%</span>
              </p>
            </div>
            <p className="mt-4 text-[11px] font-bold text-accent-600 tracking-wider uppercase">{course.course_code}</p>
            <h3 className="mt-0.5 text-sm font-bold text-navy-900 leading-snug group-hover:text-accent-600 transition-colors">
              {course.title}
            </h3>
            {course.semester != null && <p className="text-[10px] text-navy-400 mt-0.5">Semester {course.semester}</p>}
            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-navy-600 text-2xs font-bold">
                <CalendarCheck className="w-3 h-3" />
                {att.total_sessions} sessions
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-bold">
                <CheckCircle2 className="w-3 h-3" />
                {att.present_count} present
              </span>
            </div>
            <div className="mt-3 h-1.5 w-full rounded-full bg-surface-100 overflow-hidden">
              <div className={`h-full rounded-full ${tone.bar} transition-all duration-700`}
                style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
              View attendance
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )
      })}
    </div>
  )
}

/* ── Subject detail ──────────────────────────────────── */

function SubjectDetail({ course, att, sessions, sessionsLoading }) {
  const pct = att.percentage || (att.total_sessions ? (att.present_count / att.total_sessions) * 100 : 0)
  const tone = toneOf(pct)
  const absent = att.total_sessions - att.present_count

  return (
    <div className="space-y-5">
      {/* Summary hero */}
      <div className="border border-surface-200 rounded-2xl bg-white p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-accent-600 tracking-wider uppercase">{course.course_code}</p>
            <h2 className="mt-0.5 text-lg font-bold text-navy-900 leading-snug">{course.title}</h2>
            {course.session && <p className="text-xs text-navy-400 mt-1">Session {course.session}</p>}
          </div>
          <div className="text-right shrink-0">
            <p className={`text-3xl font-bold tabular-nums leading-none ${tone.text}`}>
              {pct.toFixed(1)}
              <span className="text-sm font-semibold text-navy-400">%</span>
            </p>
            <p className="text-[11px] text-navy-400 mt-1.5 tabular-nums">{att.present_count}/{att.total_sessions} sessions</p>
          </div>
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-surface-100 overflow-hidden">
          <div className={`h-full rounded-full ${tone.bar} transition-all duration-700`}
            style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-2xs font-bold">
            <CheckCircle2 className="w-3 h-3" />
            {att.present_count} present
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-navy-600 text-2xs font-bold">
            <XCircle className="w-3 h-3" />
            {absent} absent/late
          </span>
        </div>
      </div>

      {/* Session history */}
      <div className="border border-surface-200 rounded-2xl bg-white p-5">
        <h3 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
            <CalendarCheck className="w-3.5 h-3.5" />
          </span>
          Session history
        </h3>

        {sessionsLoading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="mt-4 border border-dashed border-surface-200 rounded-xl py-10 text-center">
            <CalendarCheck className="w-7 h-7 text-navy-300 mx-auto mb-2" />
            <p className="text-sm text-navy-400">No attendance sessions have been held for this subject yet.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {sessions.map((s) => {
              const meta = statusMeta[s.status] || { label: 'Not marked', cls: 'bg-surface-100 text-navy-400 border-surface-200', Icon: AlertTriangle }
              const Icon = meta.Icon
              return (
                <div key={s.id} className="flex items-center gap-3 rounded-xl border border-surface-100 p-3 hover:border-accent-200 transition-colors">
                  <span className="w-10 h-10 shrink-0 rounded-lg bg-navy-900 text-white flex flex-col items-center justify-center leading-none">
                    <span className="text-sm font-bold">{new Date(`${String(s.session_date).slice(0, 10)}T00:00:00`).getDate()}</span>
                    <span className="text-[9px] text-accent-300 uppercase mt-0.5">
                      {new Date(`${String(s.session_date).slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', { month: 'short' })}
                    </span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-navy-900 truncate">
                      {s.topic || 'Attendance session'}
                    </p>
                    <p className="text-[10px] text-navy-400 mt-0.5">
                      {fmtSessionDate(s.session_date)}
                      {fmtTime(s.start_time) && ` · ${fmtTime(s.start_time)}`}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-2xs font-bold shrink-0 ${meta.cls}`}>
                    <Icon className="w-3 h-3" />
                    {meta.label}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}