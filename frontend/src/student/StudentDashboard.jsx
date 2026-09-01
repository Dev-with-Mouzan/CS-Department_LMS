import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { coursesAPI, assignmentsAPI } from '../services/api'
import {
  LayoutDashboard,
  BookOpen,
  ClipboardList,
  CalendarClock,
  CheckCircle2,
  ArrowRight,
  UploadCloud,
  CalendarCheck,
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    )
  }

  const upcoming = assignments.filter(a => new Date(a.due_date) > new Date())
  const past = assignments.filter(a => new Date(a.due_date) <= new Date())

  const statCards = [
    { label: 'Enrolled Courses', value: courses.length, icon: BookOpen, chip: 'bg-accent-500/10 text-accent-700 border-accent-500/20' },
    { label: 'Upcoming Deadlines', value: upcoming.length, icon: CalendarClock, chip: 'bg-warning/10 text-warning-dark border-warning/20' },
    { label: 'Completed', value: past.length, icon: CheckCircle2, chip: 'bg-success/10 text-success-dark border-success/20' },
  ]

  const quickActions = [
    { to: '/student/assignments', icon: UploadCloud, label: 'My Assignments', desc: 'View & submit your homework', accent: 'bg-accent-500', arrow: 'text-accent-600' },
    { to: '/student/attendance', icon: CalendarCheck, label: 'My Attendance', desc: 'Track your attendance percentage', accent: 'bg-info', arrow: 'text-info' },
  ]

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <LayoutDashboard className="w-3 h-3" />
          Overview
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Student Dashboard</h1>
        <p className="text-navy-400 mt-1.5">Your courses, assignments, and academic progress.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl border border-surface-200 p-5 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300">
            <span className={`inline-flex w-11 h-11 rounded-xl border items-center justify-center mb-4 ${card.chip}`}>
              <card.icon className="w-5 h-5" />
            </span>
            <p className="text-3xl font-extrabold text-navy-900 tracking-tight">{card.value}</p>
            <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Upcoming Assignments */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6 lg:p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-navy-500 uppercase tracking-wider">Upcoming Assignments</h2>
            <p className="text-xs text-navy-400 mt-0.5">Deadlines approaching soon.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-warning/20 bg-warning-light text-warning-dark text-2xs font-bold">
            <CalendarClock className="w-3.5 h-3.5" />
            {upcoming.length} upcoming
          </span>
        </div>
        {upcoming.length === 0 ? (
          <div className="text-center py-10">
            <span className="inline-flex w-12 h-12 rounded-2xl bg-success/10 text-success-dark border border-success/20 items-center justify-center mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </span>
            <p className="text-navy-500 text-sm font-medium">No upcoming assignments</p>
            <p className="text-navy-300 text-xs mt-1">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(a => {
              const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24))
              return (
                <div key={a.id} className="flex items-center justify-between p-4 rounded-2xl border border-surface-200 bg-surface-50 hover:bg-white hover:shadow-card transition-all duration-300">
                  <div className="flex items-center gap-4">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                      daysLeft <= 2 ? 'bg-danger-light text-danger-dark' : daysLeft <= 7 ? 'bg-warning-light text-warning-dark' : 'bg-surface-200 text-navy-500'
                    }`}>
                      {daysLeft}d
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-navy-900">{a.title}</h3>
                      <p className="text-2xs text-navy-400 mt-0.5">Due: {new Date(a.due_date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Link to="/student/assignments" className="text-xs font-bold text-accent-600 hover:text-accent-700 transition-colors">
                    Submit →
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* My Courses */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-sm font-bold text-navy-500 uppercase tracking-wider">My Courses</h2>
            <p className="text-xs text-navy-400 mt-0.5">Your enrolled courses this session.</p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-2xs font-bold">
            <BookOpen className="w-3.5 h-3.5" />
            {courses.length} courses
          </span>
        </div>
        {courses.length === 0 ? (
          <p className="text-navy-400 text-sm py-6 text-center">No courses enrolled yet.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {courses.map(c => (
              <div key={c.id} className="flex items-center gap-4 p-4 rounded-2xl border border-surface-200 bg-surface-50 hover:bg-white hover:shadow-card transition-all duration-300">
                <div className="w-11 h-11 rounded-xl bg-accent-500 flex items-center justify-center shrink-0">
                  <span className="text-navy-950 text-xs font-bold">{c.course_code.slice(0, 2).toUpperCase()}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-navy-900 truncate">{c.title}</h3>
                  <p className="text-2xs text-navy-400 font-mono mt-0.5">{c.course_code}</p>
                </div>
                <ArrowRight className="w-4 h-4 ml-auto text-navy-300" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6 lg:p-8 mt-6">
        <h2 className="text-sm font-bold text-navy-500 uppercase tracking-wider mb-1">Quick Actions</h2>
        <p className="text-xs text-navy-400 mb-6">Common tasks for students.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex items-start gap-4 p-5 rounded-2xl border border-surface-200 bg-surface-50 hover:bg-white hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${action.accent}`}>
                <action.icon className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-navy-900 group-hover:text-accent-600 transition-colors">{action.label}</h3>
                <p className="text-xs text-navy-400 mt-1">{action.desc}</p>
              </div>
              <ArrowRight className={`w-4 h-4 mt-1 shrink-0 transition-transform group-hover:translate-x-1 ${action.arrow}`} />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}