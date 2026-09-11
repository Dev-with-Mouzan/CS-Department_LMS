import { useState, useEffect, useMemo } from 'react'
import { coursesAPI, attendanceAPI } from '../services/api'
import { ordinal, semLabel } from '../utils/format'
import {
  CalendarCheck, XCircle, Users, Download, GraduationCap,
  BookOpen, ChevronRight, ChevronLeft, Activity, Archive,
} from 'lucide-react'

const statusLabels = { present: 'Present', absent: 'Absent', late: 'Late', excused: 'Excused' }
const statusCodes = { present: 'P', absent: 'A', late: 'L', excused: 'E' }

const cellStyle = {
  present: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  absent: 'bg-red-100 text-red-600 border-red-200',
  late: 'bg-amber-100 text-amber-600 border-amber-200',
  excused: 'bg-surface-200 text-navy-500 border-surface-300',
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

const shortDate = (iso) => {
  const d = new Date(iso)
  const opts = { month: 'short', day: 'numeric' }
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', opts)
}

export default function ManageAttendance() {
  const now = new Date()
  const [courses, setCourses] = useState([])
  const [activeSemester, setActiveSemester] = useState(null)
  const [activeCourse, setActiveCourse] = useState(null)
  const [matrix, setMatrix] = useState(null)
  const [loading, setLoading] = useState(true)
  const [matrixLoading, setMatrixLoading] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState('')
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [activeTab, setActiveTab] = useState('active')

  useEffect(() => {
    setLoading(true)
    const params = activeTab === 'active' ? { is_active: true } : { is_active: false }
    coursesAPI.list(params)
      .then((r) => setCourses(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [activeTab])

  const semesters = Object.values(
    courses.reduce((acc, c) => {
      const key = c.semester != null ? String(c.semester) : 'other'
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {}),
  )
    .map((cs) => ({
      key: cs[0].semester != null ? String(cs[0].semester) : 'other',
      count: cs.length,
      session: cs.find((c) => c.session)?.session || '',
    }))
    .sort((a, b) => (a.key === 'other' ? 1 : b.key === 'other' ? -1 : Number(a.key) - Number(b.key)))

  const activeCourses = activeSemester != null
    ? courses.filter((c) => (c.semester != null ? String(c.semester) : 'other') === activeSemester)
    : []

  const selectCourse = async (c) => {
    setActiveCourse(c)
    setError('')
    setMatrixLoading(true)
    try {
      const res = await attendanceAPI.getMatrix(c.id)
      setMatrix(res.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load attendance')
      setMatrix(null)
    } finally {
      setMatrixLoading(false)
    }
  }

  const goSemesters = () => {
    setActiveSemester(null)
    setActiveCourse(null)
    setMatrix(null)
    setActiveTab('active')
  }

  const goCourses = () => {
    setActiveCourse(null)
    setMatrix(null)
  }

  // Filter sessions to the selected month and derive per-student summaries
  const monthSessions = useMemo(() => {
    if (!matrix) return []
    return matrix.sessions.filter((s) => {
      const d = new Date(s.session_date)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
  }, [matrix, month, year])

  const monthStudents = useMemo(() => {
    if (!matrix) return []
    return matrix.students.map((st) => {
      let present = 0
      let late = 0
      let absent = 0
      for (const s of monthSessions) {
        const status = (matrix.records[s.id] || {})[st.student_id]
        if (status === 'present') present += 1
        else if (status === 'late') late += 1
        else if (status === 'absent') absent += 1
      }
      const marked = present + late + absent
      return {
        ...st,
        present,
        late,
        absent,
        total_sessions: monthSessions.length,
        percentage: marked > 0 ? Math.round((present / marked) * 100) : 0,
      }
    })
  }, [matrix, monthSessions])

  const downloadExcel = async () => {
    if (!matrix) return
    setDownloading(true)
    try {
      const res = await attendanceAPI.exportExcel(matrix.course.id, year, month)
      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `Attendance_${matrix.course.course_code}_${periodLabel(month, year)}.xlsx`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch {
      alert('Failed to download Excel')
    } finally {
      setDownloading(false)
    }
  }

  const years = [year - 1, year, year + 1]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <CalendarCheck className="w-3 h-3" />
          Attendance
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Attendance Overview</h1>
        <p className="text-sm text-navy-400 mt-1">
          View attendance of every book and every semester, or download the monthly Excel register.
        </p>
      </div>

      {/* Active / Inactive Tab Switcher */}
      {activeSemester == null && (
        <div className="flex items-center justify-center gap-1 mb-6 p-1 bg-surface-100 rounded-xl w-fit mx-auto">
          <button
            onClick={() => { setActiveTab('active'); setActiveSemester(null); setActiveCourse(null); setMatrix(null) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'active'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-400 hover:text-navy-600'
            }`}
          >
            <Activity className="w-3.5 h-3.5" /> Active
          </button>
          <button
            onClick={() => { setActiveTab('inactive'); setActiveSemester(null); setActiveCourse(null); setMatrix(null) }}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inactive'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-navy-400 hover:text-navy-600'
            }`}
          >
            <Archive className="w-3.5 h-3.5" /> Inactive
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium bg-red-50 text-red-600 border border-red-200">
          <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
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
                <p className="text-navy-500 text-sm font-medium">No courses created yet.</p>
              </div>
            ) : (
              <SemesterGrid semesters={semesters} onPick={setActiveSemester} />
            )
          ) : activeCourse == null ? (
            <CourseGrid courses={activeCourses} onPick={selectCourse} />
          ) : matrixLoading ? (
            <div className="min-h-[200px] flex items-center justify-center">
              <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
            </div>
          ) : matrix ? (
            <AttendanceView
              course={matrix.course}
              sessions={monthSessions}
              students={monthStudents}
              records={matrix.records}
              month={month}
              year={year}
              months={MONTHS}
              years={years}
              setMonth={setMonth}
              setYear={setYear}
              onDownload={downloadExcel}
              downloading={downloading}
            />
          ) : (
            <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
              <p className="text-navy-500 text-sm font-medium">No attendance data available.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function periodLabel(month, year) {
  return `${MONTHS[month - 1]}_${year}`
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
              {s.count} books
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-navy-900 group-hover:text-accent-600 transition-colors">
            {semLabel(s.key)}
          </h3>
          {s.session && <p className="text-xs text-navy-400 mt-0.5">Session {s.session}</p>}
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
            View attendance
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  )
}

function CourseGrid({ courses, onPick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => (
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
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
            View attendance
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  )
}

function AttendanceView({
  course, sessions, students, records, month, year,
  months, years, setMonth, setYear, onDownload, downloading,
}) {
  const sessionCount = sessions.length
  const studentCount = students.length

  return (
    <div className="space-y-4">
      {/* Course header + stats */}
      <div className="border border-surface-200 rounded-xl bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <span className="w-11 h-11 rounded-xl bg-navy-900 text-white flex items-center justify-center shrink-0">
          <BookOpen className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-accent-600 tracking-wider uppercase">{course.course_code}</p>
          <h3 className="text-sm font-bold text-navy-900 truncate">{course.title}</h3>
          <p className="text-xs text-navy-400 mt-0.5">
            {course.session ? `Session ${course.session} · ` : ''}
            {semLabel(String(course.semester != null ? course.semester : 'other'))} · {months[month - 1]} {year}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-500/10 text-accent-600 text-xs font-semibold border border-accent-200">
            <Activity className="w-3.5 h-3.5" />
            {sessionCount} sessions
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 text-navy-600 text-xs font-semibold border border-surface-200">
            <Users className="w-3.5 h-3.5" />
            {studentCount} students
          </span>
        </div>
      </div>

      {/* Month picker + legend + download */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-xs font-semibold text-navy-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400"
          >
            {months.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-surface-200 bg-white text-xs font-semibold text-navy-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-navy-900 text-white hover:bg-navy-800 transition-colors shadow-md shadow-navy-900/10 disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          {downloading ? 'Downloading...' : `Download ${months[month - 1]} Excel`}
        </button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-[11px] font-semibold text-navy-500">
        {Object.entries(statusLabels).map(([k, label]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className={`w-3.5 h-3.5 rounded border ${k === 'present' ? 'bg-emerald-100 border-emerald-300' : k === 'absent' ? 'bg-red-100 border-red-300' : k === 'late' ? 'bg-amber-100 border-amber-300' : 'bg-surface-200 border-surface-300'}`} />
            {label}
          </span>
        ))}
      </div>

      {sessionCount === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
          <CalendarCheck className="w-8 h-8 text-navy-300 mx-auto mb-2" />
          <p className="text-sm text-navy-400">
            No attendance sessions recorded in {months[month - 1]} {year} for this book.
          </p>
        </div>
      ) : (
        <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-200">
                  <th className="sticky left-0 bg-surface-50 px-3 py-2.5 text-left text-[11px] font-bold text-navy-500 uppercase tracking-wider min-w-[180px]">
                    Student
                  </th>
                  <th className="sticky left-[180px] bg-surface-50 px-3 py-2.5 text-left text-[11px] font-bold text-navy-500 uppercase tracking-wider min-w-[90px]">
                    Roll No
                  </th>
                  {sessions.map((s) => (
                    <th key={s.id} className="px-2 py-2.5 text-center text-[11px] font-bold text-navy-500 min-w-[64px]">
                      <span className="block">{shortDate(s.session_date)}</span>
                    </th>
                  ))}
                  <th className="sticky right-0 bg-surface-50 px-3 py-2.5 text-center text-[11px] font-bold text-navy-500 uppercase tracking-wider min-w-[110px]">
                    Present
                  </th>
                  <th className="sticky right-0 bg-surface-50 px-3 py-2.5 text-center text-[11px] font-bold text-navy-500 uppercase tracking-wider min-w-[70px]">
                    %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-200">
                {students.map((st) => (
                  <tr key={st.student_id} className="hover:bg-surface-50/60 transition-colors">
                    <td className="sticky left-0 bg-white px-3 py-2.5 font-semibold text-navy-900 whitespace-nowrap">
                      {st.student_name}
                    </td>
                    <td className="sticky left-[180px] bg-white px-3 py-2.5 text-xs font-mono text-navy-500 whitespace-nowrap">
                      {st.roll_number || '—'}
                    </td>
                    {sessions.map((s) => {
                      const status = (records[s.id] || {})[st.student_id]
                      return status ? (
                        <td key={s.id} className="px-2 py-2 text-center">
                          <span
                            title={statusLabels[status]}
                            className={`inline-flex w-6 h-6 items-center justify-center rounded-md border text-[10px] font-bold ${cellStyle[status] || 'bg-surface-100 text-navy-400 border-surface-200'}`}
                          >
                            {statusCodes[status] || '?'}
                          </span>
                        </td>
                      ) : (
                        <td key={s.id} className="px-2 py-2 text-center">
                          <span className="inline-flex w-6 h-6 items-center justify-center rounded-md text-xs text-navy-300">—</span>
                        </td>
                      )
                    })}
                    <td className="sticky right-0 bg-white px-3 py-2.5 text-center">
                      <span className="text-xs font-bold text-navy-900 tabular-nums">{st.present}<span className="text-navy-300 font-medium">/{st.total_sessions}</span></span>
                    </td>
                    <td className="sticky right-0 bg-white px-3 py-2.5 text-center">
                      <span className={`inline-flex px-2 py-1 rounded-md text-[11px] font-bold tabular-nums ${
                        st.total_sessions === 0 ? 'text-navy-300' : st.percentage >= 75 ? 'bg-emerald-100 text-emerald-700' : st.percentage >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {st.total_sessions === 0 ? '—' : `${st.percentage}%`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}