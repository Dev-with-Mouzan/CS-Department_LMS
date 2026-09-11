import { useState, useEffect } from 'react'
import { coursesAPI, attendanceAPI } from '../services/api'
import Button from '../components/Button'
import { ordinal, semLabel } from '../utils/format'
import {
  CalendarCheck, CheckCircle2, XCircle, Users, Save, Download, Lock,
  ChevronRight, ChevronLeft, GraduationCap, BookOpen,
} from 'lucide-react'

const statusStyles = {
  present: 'bg-emerald-500 text-white border-emerald-500',
  absent: 'bg-red-500 text-white border-red-500',
  late: 'bg-amber-50 text-amber-600 border-amber-200',
}

const statusLabels = { present: 'Present', absent: 'Absent', late: 'Late' }

export default function MarkAttendance() {
  const [courses, setCourses] = useState([])
  const [sessionsByCourse, setSessionsByCourse] = useState({})
  const [activeSemester, setActiveSemester] = useState(null)
  const [activeCourse, setActiveCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [topic, setTopic] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(() => {
    const now = new Date()
    const y = now.getFullYear()
    const m = String(now.getMonth() + 1).padStart(2, '0')
    const d = String(now.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [downloading, setDownloading] = useState(false)
  const [sessions, setSessions] = useState([])
  const [markedSession, setMarkedSession] = useState(null)
  const [markedRecords, setMarkedRecords] = useState([])

  useEffect(() => {
    coursesAPI.list()
      .then(async (r) => {
        setCourses(r.data)
        const map = {}
        for (const c of r.data) {
          try {
            const res = await attendanceAPI.listSessions({ course_id: c.id })
            map[c.id] = res.data
          } catch {
            map[c.id] = []
          }
        }
        setSessionsByCourse(map)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const session = sessions.find(s => s.session_date === attendanceDate) || null
    if (session && session.id !== markedSession?.id) {
      setMarkedSession(session)
      attendanceAPI.getSessionRecords(session.id)
        .then(r => setMarkedRecords(r.data))
        .catch(console.error)
    } else if (!session && markedSession) {
      setMarkedSession(null)
      setMarkedRecords([])
    }
  }, [attendanceDate, sessions])

  const selectCourse = async (c) => {
    setActiveCourse(c)
    setMarkedSession(null)
    setMarkedRecords([])
    setSessions(sessionsByCourse[c.id] || [])
    setMessage('')
    try {
      const r = await coursesAPI.listCourseStudents(c.id)
      setStudents(r.data)
      const init = {}; r.data.forEach(e => { init[e.student_id] = 'present' }); setAttendance(init)
    } catch (err) { console.error(err) }
  }

  const goSemesters = () => {
    setActiveSemester(null)
    setActiveCourse(null)
    setMarkedSession(null)
    setMarkedRecords([])
    setSessions([])
    setStudents([])
    setMessage('')
  }

  const goCourses = () => {
    setActiveCourse(null)
    setMarkedSession(null)
    setMarkedRecords([])
    setSessions([])
    setStudents([])
    setMessage('')
  }

  const handleSubmit = async () => {
    if (!activeCourse) return
    if (!attendanceDate) {
      setMessage('Please select an attendance date')
      return
    }
    // Pre-check: is attendance already marked for this date?
    const existingSession = (sessionsByCourse[activeCourse.id] || []).find(s => s.session_date === attendanceDate)
    if (existingSession) {
      setMessage('Attendance already marked for this date')
      setMarkedSession(existingSession)
      try {
        const r = await attendanceAPI.getSessionRecords(existingSession.id)
        setMarkedRecords(r.data)
      } catch {}
      return
    }
    setSubmitting(true)
    try {
      const now = new Date()
      const session = await attendanceAPI.createSession({
        course_id: activeCourse.id,
        session_date: attendanceDate,
        start_time: now.toTimeString().slice(0, 5),
        topic: topic || null,
      })
      const records = Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }))
      await attendanceAPI.markAttendance(session.data.id, { records })
      setMessage('Attendance saved successfully!')
      setTopic('')
      const res = await attendanceAPI.listSessions({ course_id: activeCourse.id })
      setSessions(res.data)
      setSessionsByCourse(prev => ({ ...prev, [activeCourse.id]: res.data }))
    } catch (err) {
      if (err.response?.status === 409) {
        const res = await attendanceAPI.listSessions({ course_id: activeCourse.id }).catch(() => null)
        if (res) {
          setSessions(res.data)
          setSessionsByCourse(prev => ({ ...prev, [activeCourse.id]: res.data }))
        }
        setMessage(err.response?.data?.detail || 'Attendance already marked for today')
      } else {
        setMessage('Failed: ' + (err.response?.data?.detail || err.message))
      }
    } finally { setSubmitting(false) }
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const lateCount = Object.values(attendance).filter(s => s === 'late').length
  const absentCount = students.length - presentCount - lateCount

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
      const sessionCount = cs.reduce((sum, c) => sum + (sessionsByCourse[c.id]?.length || 0), 0)
      return {
        key,
        count: cs.length,
        session: cs.find((c) => c.session)?.session || '',
        sessionCount,
      }
    })
    .sort((a, b) => (a.key === 'other' ? 1 : b.key === 'other' ? -1 : Number(a.key) - Number(b.key)))

  const activeCourses = activeSemester != null
    ? courses.filter((c) => (c.semester != null ? String(c.semester) : 'other') === activeSemester)
    : []

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <CalendarCheck className="w-3 h-3" />
          Attendance
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Mark Attendance</h1>
        <p className="text-sm text-navy-400 mt-1">Pick a semester and book to record attendance.</p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium border ${
          message.includes('success')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {message.includes('success') ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {message}
        </div>
      )}

      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
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
              <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
                <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
                  <BookOpen className="w-7 h-7" />
                </span>
                <p className="text-navy-500 text-sm font-medium">No courses yet. Ask the admin to assign you some.</p>
              </div>
            ) : (
              <SemesterGrid semesters={semesters} onPick={setActiveSemester} />
            )
          ) : activeCourse == null ? (
            <CourseGrid
              courses={activeCourses}
              sessionsByCourse={sessionsByCourse}
              onPick={selectCourse}
            />
          ) : (
            /* ── Marking view ─────────────────────────── */
            <>
              {markedSession ? (
                <>
                  {/* Already marked banner */}
                  <div className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium">
                    <Lock className="w-4 h-4 mt-0.5 shrink-0" />
                    <div>
                      <p>
                        Attendance already marked for <strong>{activeCourse.course_code}</strong> on <strong>{attendanceDate}</strong> ({markedRecords.length} students).
                      </p>
                      <p className="text-xs text-emerald-600/80 mt-0.5">Pick a different date or course to mark again.</p>
                    </div>
                  </div>

                  {/* Saved records (read-only) */}
                  <div className="border border-surface-200 rounded-xl bg-white mb-6">
                    <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-navy-500 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Saved records — {markedRecords.length} students
                      </span>
                    </div>
                    <div className="divide-y divide-surface-200">
                      {students.map((e, i) => {
                        const rec = markedRecords.find(r => r.student_id === e.student_id)
                        return (
                          <div key={e.student_id} className="flex items-center justify-between px-5 py-3">
                            <div className="flex items-center gap-3">
                              <span className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center text-[10px] font-bold text-navy-500 shrink-0">{i + 1}</span>
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-navy-900 truncate">{e.student_name || 'Unknown Student'}</p>
                                {e.roll_number && <p className="text-2xs text-navy-400 font-mono">{e.roll_number}</p>}
                              </div>
                            </div>
                            {rec ? (
                              <span className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border ${
                                rec.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : rec.status === 'late'
                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                    : 'bg-red-50 text-red-600 border-red-200'
                              }`}>
                                {statusLabels[rec.status] || rec.status}
                              </span>
                            ) : (
                              <span className="text-[11px] text-navy-300 font-semibold">Not marked</span>
                            )}
                          </div>
                        )
                      })}
                      {students.length === 0 && <p className="px-5 py-4 text-xs text-navy-400">No students enrolled in this course.</p>}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Date + Topic inputs */}
                  <div className="mb-5 max-w-md mx-auto space-y-4">
                    <div>
                      <label className="input-label">Attendance Date <span className="text-red-500">*</span></label>
                      <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}
                        required className="input-field" />
                    </div>
                    <div>
                      <label className="input-label">Session topic (optional)</label>
                      <input value={topic} onChange={(e) => setTopic(e.target.value)}
                        placeholder="e.g. Chapter 5 - Data Structures"
                        className="input-field" />
                    </div>
                  </div>

                  {/* Stats bar */}
                  <div className="flex gap-3 mb-4 justify-center flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {presentCount} present
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200">
                      {lateCount} late
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 text-navy-500 text-xs font-semibold border border-surface-200">
                      {absentCount} absent
                    </span>
                  </div>

                  {/* Student list */}
                  <div className="border border-surface-200 rounded-xl bg-white mb-6">
                    <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between">
                      <span className="text-xs font-semibold text-navy-500 flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {students.length} students
                      </span>
                      <button onClick={() => {
                        const allPresent = {}
                        students.forEach(e => { allPresent[e.student_id] = 'present' })
                        setAttendance(allPresent)
                      }} className="text-[11px] font-semibold text-accent-600 hover:underline">
                        Mark all present
                      </button>
                    </div>
                    <div className="divide-y divide-surface-200">
                      {students.map((e, i) => (
                        <div key={e.student_id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center text-[10px] font-bold text-navy-500 shrink-0">
                              {i + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-navy-900 truncate">{e.student_name || 'Unknown Student'}</p>
                              {e.roll_number && (
                                <p className="text-2xs text-navy-400 font-mono">{e.roll_number}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1.5">
                            {['present', 'absent', 'late'].map((s) => (
                              <button key={s} onClick={() => setAttendance({ ...attendance, [e.student_id]: s })}
                                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                                  attendance[e.student_id] === s ? statusStyles[s] : 'bg-white text-navy-400 border-surface-200 hover:bg-surface-50'
                                }`}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Save + Download buttons */}
              <div className="flex justify-center gap-3">
                {!markedSession && (
                  <Button onClick={handleSubmit} disabled={submitting || !attendanceDate}>
                    <Save className="w-4 h-4" />
                    {submitting ? 'Saving...' : 'Save Attendance'}
                  </Button>
                )}
                <button
                  onClick={async () => {
                    setDownloading(true)
                    try {
                      const now = new Date()
                      const res = await attendanceAPI.exportExcel(
                        activeCourse.id,
                        now.getFullYear(),
                        now.getMonth() + 1
                      )
                      const url = window.URL.createObjectURL(new Blob([res.data]))
                      const link = document.createElement('a')
                      link.href = url
                      link.setAttribute('download', `Attendance_${activeCourse.course_code}_${now.toLocaleString('default', { month: 'long' })}_${now.getFullYear()}.xlsx`)
                      document.body.appendChild(link)
                      link.click()
                      link.remove()
                      window.URL.revokeObjectURL(url)
                    } catch (err) {
                      alert('Failed to download Excel')
                    } finally {
                      setDownloading(false)
                    }
                  }}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-navy-700 border border-surface-200 hover:bg-surface-50 hover:border-accent-300 transition-colors disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Downloading...' : 'Download Excel'}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────── */

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
              <CalendarCheck className="w-3 h-3" />
              {s.sessionCount} sessions
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-navy-900 group-hover:text-accent-600 transition-colors">
            {semLabel(s.key)}
          </h3>
          {s.session && <p className="text-xs text-navy-400 mt-0.5">Session {s.session}</p>}
          <div className="mt-4 flex items-center gap-4 text-xs text-navy-500">
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.count}</span> books</span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
            Mark attendance
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  )
}

function CourseGrid({ courses, sessionsByCourse, onPick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => {
        const sList = sessionsByCourse[c.id] || []
        const lastDate = sList.length
          ? new Date(Math.max(...sList.map((s) => new Date(s.session_date).getTime()))).toLocaleDateString()
          : null
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
              <span className="tabular-nums"><span className="font-bold text-navy-900">{sList.length}</span> sessions</span>
              <span className="text-2xs text-navy-400">
                {lastDate ? `Last: ${lastDate}` : 'No sessions yet'}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
              Mark attendance
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )
      })}
    </div>
  )
}