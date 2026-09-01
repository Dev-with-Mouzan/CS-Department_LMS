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
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
      </div>
    )
  }

  const statCards = [
    { label: 'Total Users', value: stats?.total_users || 0, icon: Users, chip: 'bg-navy-900/10 text-navy-800 border-navy-900/10' },
    { label: 'Students', value: stats?.total_students || 0, icon: GraduationCap, chip: 'bg-success/10 text-success-dark border-success/20' },
    { label: 'Teachers', value: stats?.total_teachers || 0, icon: UserCheck, chip: 'bg-info/10 text-info-dark border-info/20' },
    { label: 'Active Users', value: stats?.active_users || 0, icon: ShieldCheck, chip: 'bg-accent-500/10 text-accent-700 border-accent-500/20' },
    { label: 'Pending Verification', value: stats?.pending_verification || 0, icon: Clock, chip: 'bg-warning/10 text-warning-dark border-warning/20' },
  ]

  const quickActions = [
    { to: '/admin/users', icon: UserPlus, label: 'Manage Users', desc: 'Add, edit, or deactivate users', accent: 'bg-accent-500', arrow: 'text-accent-600' },
    { to: '/admin/courses', icon: BookOpen, label: 'Manage Courses', desc: 'Create, edit, and assign courses', accent: 'bg-info', arrow: 'text-info' },
    { to: '/admin/enrollments', icon: GraduationCap, label: 'Enrollments', desc: 'Enroll students into courses', accent: 'bg-success', arrow: 'text-success-dark' },
    { to: '/admin/users', icon: BadgeCheck, label: 'Verifications', desc: 'Review pending & verified accounts', accent: 'bg-warning', arrow: 'text-warning-dark' },
  ]

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-10">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <LayoutDashboard className="w-3 h-3" />
          Overview
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Dashboard</h1>
        <p className="text-navy-400 mt-1.5">System overview and management at a glance.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-10">
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

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-surface-200 shadow-card p-6 lg:p-8">
        <h2 className="text-sm font-bold text-navy-500 uppercase tracking-wider mb-1">Quick Actions</h2>
        <p className="text-xs text-navy-400 mb-6">Common tasks for the CS Department.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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