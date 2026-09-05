import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { coursesAPI, assignmentsAPI } from '../services/api'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CalendarClock,
  ArrowRight,
  PlusCircle,
  Inbox,
  CalendarCheck,
} from 'lucide-react'

export default function TeacherDashboard() {
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

  const statCards = [
    { label: 'My Courses', value: courses.length, icon: BookOpen, color: 'bg-accent-500/10 text-accent-600' },
    { label: 'Assignments', value: assignments.length, icon: ClipboardList, color: 'bg-sky-50 text-sky-600' },
    { label: 'Upcoming', value: upcoming.length, icon: CalendarClock, color: 'bg-emerald-50 text-emerald-600' },
  ]

  const quickActions = [
    { to: '/teacher/assessments', icon: PlusCircle, label: 'Create Assessment', desc: 'Assignments & quizzes for students', color: 'bg-accent-500' },
    { to: '/teacher/submissions', icon: Inbox, label: 'Review Submissions', desc: 'Grade & give feedback on work', color: 'bg-emerald-500' },
    { to: '/teacher/attendance', icon: CalendarCheck, label: 'Mark Attendance', desc: "Record today's session", color: 'bg-sky-500' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <LayoutDashboard className="w-3 h-3" />
          Overview
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Instructor Dashboard</h1>
        <p className="text-sm text-navy-400 mt-1">Your courses, assignments, and activity.</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="flex-1 border border-surface-200 rounded-xl bg-white p-5 min-w-0">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-4.5 h-4.5" />
            </span>
            <p className="text-2xl font-bold text-navy-900 tracking-tight">{card.value}</p>
            <p className="text-xs font-medium text-navy-400 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* My Courses */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-navy-900">My Courses</h2>
          <span className="text-xs text-navy-400">{courses.length} courses</span>
        </div>
        {courses.length === 0 ? (
          <p className="text-sm text-navy-400 py-6 text-center border border-dashed border-surface-200 rounded-xl">No courses assigned yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {courses.map(c => (
              <div key={c.id} className="border border-surface-200 rounded-xl bg-white p-4 flex items-center gap-3 hover:border-accent-300 transition-colors">
                <span className="w-9 h-9 rounded-lg bg-navy-800 flex items-center justify-center text-xs font-bold text-white shrink-0">
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map(action => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex items-center gap-4 p-5 border border-surface-200 rounded-xl bg-white hover:border-accent-300 transition-colors"
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
