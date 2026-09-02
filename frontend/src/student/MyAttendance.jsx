import { useState, useEffect } from 'react'
import { coursesAPI, attendanceAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { CalendarCheck, BookOpen, CheckCircle2, TrendingUp } from 'lucide-react'

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
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    )
  }

  const totalSessions = Object.values(data).reduce((sum, d) => sum + d.total_sessions, 0)
  const totalPresent = Object.values(data).reduce((sum, d) => sum + d.present_count, 0)
  const overallPct = totalSessions > 0 ? (totalPresent / totalSessions * 100) : 0
  const pctColor = overallPct >= 75 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-600' : 'text-red-500'
  const barColor = overallPct >= 75 ? 'bg-emerald-500' : overallPct >= 50 ? 'bg-amber-500' : 'bg-red-500'

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <CalendarCheck className="w-3 h-3" />
          Attendance
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">My Attendance</h1>
        <p className="text-sm text-navy-400 mt-1">Your attendance across all courses.</p>
      </div>

      {/* Overall stat */}
      <div className="border border-surface-200 rounded-xl bg-white p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs font-semibold text-navy-400">Overall Attendance</p>
            <p className={`text-3xl font-bold tracking-tight mt-1 ${pctColor}`}>{overallPct.toFixed(1)}%</p>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{totalPresent}</p>
              <p className="text-[10px] text-navy-400">present</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-navy-500">{totalSessions - totalPresent}</p>
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

      {/* Per-course */}
      {courses.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
          <BookOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
          <p className="text-sm text-navy-400">No courses enrolled yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => {
            const att = data[course.id] || { total_sessions: 0, present_count: 0, percentage: 0 }
            const pct = att.percentage
            const pColor = pct >= 75 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-red-500'
            const bColor = pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'

            return (
              <div key={course.id} className="border border-surface-200 rounded-xl bg-white p-4 hover:border-accent-300 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-lg bg-accent-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {course.course_code.slice(0, 2).toUpperCase()}
                    </span>
                    <div>
                      <p className="text-sm font-medium text-navy-900">{course.title}</p>
                      <p className="text-[10px] text-navy-400 font-mono">{course.course_code}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-xl font-bold tracking-tight ${pColor}`}>{pct.toFixed(1)}%</p>
                    <p className="text-[10px] text-navy-400">{att.present_count}/{att.total_sessions}</p>
                  </div>
                </div>
                <div className="w-full bg-surface-200 rounded-full h-1.5">
                  <div className={`h-1.5 rounded-full transition-all duration-500 ${bColor}`}
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
