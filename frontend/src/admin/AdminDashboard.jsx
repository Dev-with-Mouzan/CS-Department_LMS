import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usersAPI } from '../services/api'
import {
  Users,
  GraduationCap,
  UserCheck,
  ShieldCheck,
  Clock,
  LayoutDashboard,
  ArrowRight,
  UserPlus,
  BookOpen,
  BadgeCheck,
} from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    usersAPI.getStats().then(res => setStats(res.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, color: 'bg-navy-900/10 text-navy-800' },
    { label: 'Students', value: stats?.total_students || 0, icon: GraduationCap, color: 'bg-emerald-50 text-emerald-600' },
    { label: 'Teachers', value: stats?.total_teachers || 0, icon: UserCheck, color: 'bg-sky-50 text-sky-600' },
    { label: 'Active Users', value: stats?.active_users || 0, icon: ShieldCheck, color: 'bg-accent-500/10 text-accent-600' },
    { label: 'Pending', value: stats?.pending_verification || 0, icon: Clock, color: 'bg-amber-50 text-amber-600' },
  ]

  const quickActions = [
    { to: '/admin/users', icon: UserPlus, label: 'Users', desc: 'Add, edit, verify & manage users', color: 'bg-accent-500' },
    { to: '/admin/teachers', icon: UserCheck, label: 'Teachers', desc: 'Manage faculty & reset passwords', color: 'bg-sky-500' },
    { to: '/admin/courses', icon: BookOpen, label: 'Courses', desc: 'Create, edit & assign courses', color: 'bg-emerald-500' },
    { to: '/admin/semesters', icon: GraduationCap, label: 'Semesters', desc: 'Semester-wise course overview', color: 'bg-amber-500' },
    { to: '/admin/enrollments', icon: UserPlus, label: 'Enrollments', desc: 'Enroll students into courses', color: 'bg-navy-800' },
    { to: '/admin/users', icon: BadgeCheck, label: 'Verifications', desc: 'Review pending & verified accounts', color: 'bg-accent-600' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <LayoutDashboard className="w-3 h-3" />
          Overview
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Dashboard</h1>
        <p className="text-sm text-navy-400 mt-1">System overview and management at a glance.</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 mb-8">
        {statCards.map(card => (
          <div key={card.label} className="flex-1 border border-surface-200 rounded-xl bg-white p-5 min-w-0">
            <span className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${card.color}`}>
              <card.icon className="w-4.5 h-4.5" />
            </span>
            <p className="text-2xl font-bold text-navy-900 tracking-tight">{card.value}</p>
            <p className="text-xs font-medium text-navy-400 mt-1.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-navy-900 mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {quickActions.map(action => (
            <Link
              key={action.label}
              to={action.to}
              className="group flex items-center gap-4 p-5 border border-surface-200 rounded-xl bg-white hover:border-accent-300 transition-colors"
            >
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0 ${action.color}`}>
                <action.icon className="w-4.5 h-4.5" />
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
