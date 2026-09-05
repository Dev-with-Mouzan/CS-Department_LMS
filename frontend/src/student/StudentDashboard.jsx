import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { coursesAPI, assignmentsAPI } from '../services/api'
import {
  LayoutDashboard,
  BookOpen,
  CalendarClock,
  CheckCircle2,
  ArrowRight,
  UploadCloud,
  CalendarCheck,
  Paperclip,
  Download,
} from 'lucide-react'

export default function StudentDashboard() {
  const [courses, setCourses] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([coursesAPI.list(), assignmentsAPI.list()])
      .then(([c, a]) => { setCourses(c.data); setAssignments(a.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    )
  }

  const upcoming = assignments.filter(a => new Date(a.due_date) > new Date())
  const past = assignments.filter(a => new Date(a.due_date) <= new Date())

  const statCards = [
    { label: 'Enrolled Courses', value: courses.length, icon: BookOpen, color: 'bg-accent-500/10 text-accent-600' },
    { label: 'Upcoming Deadlines', value: upcoming.length, icon: CalendarClock, color: 'bg-amber-50 text-amber-600' },
    { label: 'Completed', value: past.length, icon: CheckCircle2, color: 'bg-emerald-50 text-emerald-600' },
  ]

  const quickActions = [
    { to: '/student/assignments', icon: UploadCloud, label: 'My Assignments', desc: 'View & submit your homework', color: 'bg-accent-500' },
    { to: '/student/attendance', icon: CalendarCheck, label: 'My Attendance', desc: 'Track your attendance percentage', color: 'bg-sky-500' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <LayoutDashboard className="w-3 h-3" />
          Overview
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Student Dashboard</h1>
        <p className="text-sm text-navy-400 mt-1">Your courses, assignments, and academic progress.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {statCards.map(card => (
          <div key={card.label} className="border border-surface-200 rounded-xl bg-white p-4">
            <span className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-4 h-4" />
            </span>
            <p className="text-2xl font-bold text-navy-900 tracking-tight">{card.value}</p>
            <p className="text-xs font-medium text-navy-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Assignments */}
      <div className="border border-surface-200 rounded-xl bg-white mb-6">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-200">
          <div>
            <h2 className="text-sm font-semibold text-navy-900">Upcoming Assignments</h2>
            <p className="text-xs text-navy-400 mt-0.5">Deadlines approaching soon.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[11px] font-semibold">
            <CalendarClock className="w-3 h-3" />
            {upcoming.length} upcoming
          </span>
        </div>
        {upcoming.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <span className="inline-flex w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 items-center justify-center mb-2">
              <CheckCircle2 className="w-5 h-5" />
            </span>
            <p className="text-sm font-medium text-navy-900">No upcoming assignments</p>
            <p className="text-xs text-navy-400 mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-200">
            {upcoming.map(a => {
              const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <div key={a.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                      daysLeft <= 2 ? 'bg-red-50 text-red-600' : daysLeft <= 7 ? 'bg-amber-50 text-amber-600' : 'bg-surface-100 text-navy-500'
                    }`}>
                      {daysLeft}d
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy-900 truncate">{a.title}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xs text-navy-400">Due {new Date(a.due_date).toLocaleDateString()}</p>
                        {a.attachment_url && (
                          <a
                            href={`/uploads/${a.attachment_url.replace(/^uploads[\\/]/, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-semibold"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Paperclip className="w-3 h-3" />
                            <Download className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link to="/student/assignments" className="text-xs font-semibold text-accent-600 hover:text-accent-700 whitespace-nowrap">
                    Submit
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My Courses */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900">My Courses</h2>
          <span className="text-xs text-navy-400">{courses.length} courses</span>
        </div>
        {courses.length === 0 ? (
          <p className="text-sm text-navy-400 py-6 text-center border border-dashed border-surface-200 rounded-xl">No courses enrolled yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courses.map(c => (
              <div key={c.id} className="border border-surface-200 rounded-xl bg-white p-4 flex items-center gap-3 hover:border-accent-300 transition-colors">
                <span className="w-9 h-9 rounded-lg bg-accent-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {c.course_code.slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900 truncate">{c.title}</p>
                  <p className="text-xs text-navy-400 font-mono">{c.course_code}</p>
                </div>
                <ArrowRight className="w-3.5 h-3.5 ml-auto text-navy-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map(action => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex items-center gap-4 p-4 border border-surface-200 rounded-xl bg-white hover:border-accent-300 transition-colors"
            >
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${action.color}`}>
                <action.icon className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy-900 group-hover:text-accent-600 transition-colors">{action.label}</p>
                <p className="text-xs text-navy-400 mt-0.5">{action.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 ml-auto text-navy-300 group-hover:text-accent-500 transition-colors shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
