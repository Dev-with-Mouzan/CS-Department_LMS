import { useState, useEffect } from 'react'
import { coursesAPI, attendanceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  CalendarCheck,
  BookOpen,
  CheckCircle2,
  XCircle,
  TrendingUp,
} from 'lucide-react'

export default function MyAttendance() {
  const { user } = useAuth()
  const [courses, setCourses] = useState([])
  const [data, setData] = useState({})
  const [loading, setLoading] = useState(true)

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
        setData(att)
      } catch (err) { console.error(err) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    )
  }

  const totalSessions = Object.values(data).reduce((sum, d) => sum + d.total_sessions, 0)
  const totalPresent = Object.values(data).reduce((sum, d) => sum + d.present_count, 0)
  const overallPct = totalSessions > 0 ? (totalPresent / totalSessions * 100) : 0
  const pctColor = overallPct >= 75 ? 'text-success' : overallPct >= 50 ? 'text-warning-dark' : 'text-danger'
  const barColor = overallPct >= 75 ? 'bg-success' : overallPct >= 50 ? 'bg-warning' : 'bg-danger'

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <CalendarCheck className="w-3 h-3" />
          Attendance Overview
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Attendance</h1>
        <p className="text-navy-400 mt-1.5">Your attendance across all courses</p>
      </div>

      {/* Overall stat */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6 lg:p-8 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider">Overall Attendance</p>
            <p className={`text-4xl font-extrabold tracking-tight mt-1 ${pctColor}`}>{overallPct.toFixed(1)}%</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-navy-900">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  {totalPresent}
                </span>
                <p className="text-2xs text-navy-400 mt-0.5">present</p>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-navy-900">
                  <XCircle className="w-4 h-4 text-danger" />
                  {totalSessions - totalPresent}
                </span>
                <p className="text-2xs text-navy-400 mt-0.5">absent / late</p>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full bg-surface-200 rounded-full h-3">
          <div className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${Math.min(overallPct, 100)}%` }} />
        </div>
        <p className="text-2xs text-navy-400 mt-2 inline-flex items-center gap-1.5">
          <TrendingUp className="w-3 h-3 text-success" />
          {totalSessions} total sessions attended
        </p>
      </div>

      {/* Per-course */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 border-dashed p-16 text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
            <BookOpen className="w-7 h-7" />
          </span>
          <p className="text-navy-500 text-sm font-medium">No courses enrolled yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => {
            const att = data[course.id] || { total_sessions: 0, present_count: 0, percentage: 0 }
            const pct = att.percentage
            const pctColor = pct >= 75 ? 'text-success' : pct >= 50 ? 'text-warning-dark' : 'text-danger'
            const barColor = pct >= 75 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger'

            return (
              <div key={course.id} className="bg-white rounded-2xl border border-surface-200 shadow-card p-5 hover:shadow-card-hover transition-all duration-300">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center shrink-0">
                      <span className="text-white text-2xs font-bold">{course.course_code.slice(0, 2).toUpperCase()}</span>
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-navy-900">{course.title}</h3>
                      <p className="text-2xs text-navy-400 font-mono mt-0.5">{course.course_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-extrabold tracking-tight ${pctColor}`}>{pct.toFixed(1)}%</p>
                    <p className="text-2xs text-navy-400">{att.present_count}/{att.total_sessions} sessions</p>
                  </div>
                </div>
                <div className="w-full bg-surface-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${barColor}`}
                    style={{ width: `${Math.min(pct, 100)}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}