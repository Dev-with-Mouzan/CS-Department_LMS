import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usersAPI, resultsAPI } from '../services/api'
import { parseDate, shortDate, MONTHS } from '../utils/format'
import {
  Users,
  GraduationCap,
  ShieldCheck,
  Clock,
  BookOpen,
  CalendarCheck,
  Trophy,
  UserPlus,
  FileText,
  ScrollText,
  CheckCircle2,
  ChevronRight,
  AlertTriangle,
  RefreshCw,
  Activity,
} from 'lucide-react'

const roleTone = (role) => ({
  student: { label: 'Student', cls: 'bg-emerald-100 text-emerald-700' },
  teacher: { label: 'Teacher', cls: 'bg-sky-100 text-sky-700' },
  admin: { label: 'Admin', cls: 'bg-navy-900 text-white' },
})[role] || { label: role || 'User', cls: 'bg-surface-100 text-navy-500' }

const examLabels = { midterm: 'Mid-Term', final: 'Final Term', complete: 'Complete Result' }
const examTone = {
  midterm: 'bg-sky-100 text-sky-700',
  final: 'bg-emerald-100 text-emerald-700',
  complete: 'bg-accent-100 text-accent-700',
}
const examIcons = { midterm: FileText, final: GraduationCap, complete: ScrollText }

export default function AdminDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [users, setUsers] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [s, u, r] = await Promise.all([
        usersAPI.getStats(),
        usersAPI.list(),
        resultsAPI.list().catch(() => ({ data: [] })),
      ])
      setStats(s.data)
      setUsers(u.data || [])
      setResults(r.data || [])
    } catch (err) {
      console.error(err)
      setError('Could not load your dashboard data. Check your connection and try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) {
    return (
      <div className="p-5 lg:p-8 max-w-6xl mx-auto w-full">
        <div className="h-44 rounded-2xl bg-surface-200/70 animate-pulse mb-6" />
        <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5">
          <div className="space-y-5">
            <div className="h-64 rounded-2xl bg-surface-200/70 animate-pulse" />
            <div className="h-64 rounded-2xl bg-surface-200/70 animate-pulse" />
          </div>
          <div className="space-y-5">
            <div className="h-48 rounded-2xl bg-surface-200/70 animate-pulse" />
            <div className="h-48 rounded-2xl bg-surface-200/70 animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-5 lg:p-8 max-w-6xl mx-auto w-full">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
          <span className="inline-flex w-12 h-12 rounded-xl bg-red-100 items-center justify-center mb-3">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </span>
          <p className="text-sm font-medium text-red-700">{error}</p>
          <button
            onClick={load}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-red-600 text-white text-xs font-semibold px-3.5 py-2 hover:bg-red-700 active:scale-[0.98] transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Try again
          </button>
        </div>
      </div>
    )
  }

  const firstName = user?.first_name || 'there'
  const today = parseDate(new Date())
  const dateLine = today.toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const totalUsers = stats?.total_users || 0
  const totalStudents = stats?.total_students || 0
  const totalTeachers = stats?.total_teachers || 0
  const activeUsers = stats?.active_users || 0
  const pending = stats?.pending_verification || 0
  const verified = totalUsers - pending

  const recentUsers = [...users]
    .sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
    .slice(0, 4)

  const recentResults = [...results]
    .sort((x, y) => new Date(y.created_at) - new Date(x.created_at))
    .slice(0, 3)

  const heroStats = [
    { label: 'Total users', value: totalUsers },
    { label: 'Students', value: totalStudents },
    { label: 'Teachers', value: totalTeachers },
    { label: 'Unverified', value: pending },
  ]

  const managementHub = [
    { to: '/admin/users', icon: Users, label: 'Users', desc: 'Manage accounts, roles & verification', color: 'bg-accent-500' },
    { to: '/admin/courses', icon: BookOpen, label: 'Courses', desc: 'Create courses & assign teachers', color: 'bg-emerald-500' },
    { to: '/admin/attendance', icon: CalendarCheck, label: 'Attendance', desc: 'View & download attendance per subject', color: 'bg-sky-500' },
    { to: '/admin/examinations', icon: Trophy, label: 'Result', desc: 'View & delete published result sheets', color: 'bg-amber-500' },
    { to: '/admin/promotion', icon: UserPlus, label: 'Promotion', desc: 'Promote students between semesters', color: 'bg-navy-800' },
  ]

  const activePct = totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
  const completionPct = results.length > 0 ? results.filter(r => r.status === 'complete').length / results.length * 100 : 0

  return (
    <div className="p-5 lg:p-8 max-w-6xl mx-auto w-full">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-navy-950 text-white p-6 lg:p-8 mb-6">
        <div className="absolute -top-20 -right-16 w-72 h-72 rounded-full bg-accent-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-28 -left-12 w-80 h-80 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '22px 22px',
          }}
        />

        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-accent-300">{dateLine}</p>
            <h1 className="mt-2 text-2xl lg:text-[28px] font-bold tracking-tight leading-tight">
              Welcome back,{' '}
              <span className="text-accent-400">{firstName}</span>
            </h1>
            <p className="mt-1.5 text-sm text-navy-300">
              Full admin access — manage every account, course and result in the department.
            </p>
            {pending === 0 ? (
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-accent-400" />
                <span className="text-[11px] font-medium text-navy-200">All accounts verified</span>
              </div>
            ) : (
              <Link
                to="/admin/users"
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent-500/40 bg-accent-500/10 px-3 py-1.5 hover:bg-accent-500/20 transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-accent-400" />
                <span className="text-[11px] font-semibold text-accent-300">
                  {pending} account{pending === 1 ? '' : 's'} awaiting verification
                </span>
                <ChevronRight className="w-3 h-3 text-accent-400" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5 w-full md:w-[320px] shrink-0">
            {heroStats.map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <p className={`text-xl font-bold tabular-nums tracking-tight ${s.label === 'Unverified' && pending > 0 ? 'text-accent-400' : ''}`}>
                  {s.value}
                </p>
                <p className="text-[11px] font-medium text-navy-300 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Main grid */}
      <div className="grid lg:grid-cols-[1.55fr_1fr] gap-5">
        {/* Left column */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* Management hub */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-navy-900 text-white flex items-center justify-center">
                    <Activity className="w-3.5 h-3.5" />
                  </span>
                  Management hub
                </h2>
                <p className="text-xs text-navy-400 mt-1">Administer accounts, faculty, courses and results.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {managementHub.map((action) => (
                <Link
                  key={action.label}
                  to={action.to}
                  className="group flex items-center gap-3.5 rounded-xl border border-surface-100 bg-surface-50/70 p-3.5 transition-all duration-200 hover:border-accent-200 hover:bg-white"
                >
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 ${action.color} shadow-md transition-shadow`}>
                    <action.icon className="w-4.5 h-4.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-navy-900 group-hover:text-accent-600 transition-colors">{action.label}</p>
                    <p className="text-[11px] text-navy-400 mt-0.5 truncate">{action.desc}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 shrink-0 text-navy-300 group-hover:text-accent-500 group-hover:translate-x-0.5 transition-all" />
                </Link>
              ))}
            </div>
          </section>

          {/* Newest users */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <UserPlus className="w-3.5 h-3.5" />
                  </span>
                  Newest users
                </h2>
                <p className="text-xs text-navy-400 mt-1">Recently created accounts across every role.</p>
              </div>
              {users.length > 0 && (
                <Link
                  to="/admin/users"
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent-600 hover:text-accent-700"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {recentUsers.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-surface-200 py-7 text-center">
                <Users className="w-7 h-7 text-navy-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-navy-900">No users yet</p>
                <p className="text-xs text-navy-400 mt-1">Accounts created here will appear in this list.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-1">
                {recentUsers.map((u) => {
                  const r = roleTone(u.role_name)
                  const initial = (u.first_name || u.email || '?')[0].toUpperCase()
                  return (
                    <div key={u.id} className="flex items-center gap-3 rounded-xl p-2.5 transition-colors hover:bg-surface-50">
                      <span className="w-9 h-9 shrink-0 rounded-xl bg-navy-800 text-white flex items-center justify-center text-sm font-bold">
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-medium text-navy-900 truncate">
                          {`${u.first_name || ''} ${u.last_name || ''}`.trim() || 'Unnamed user'}
                        </p>
                        <p className="text-[10px] text-navy-400 truncate">
                          {u.email || u.phone || ''} · joined {shortDate(u.created_at)}
                        </p>
                      </div>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold ${r.cls}`}>{r.label}</span>
                      {u.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 shrink-0" title="Verified">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-600 shrink-0" title="Pending verification">
                          <Clock className="w-3.5 h-3.5" />
                          Pending
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right rail */}
        <div className="flex flex-col gap-5 min-w-0">
          {/* System overview */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                  <Activity className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-navy-900">System overview</h2>
              </div>
              <p className="text-[11px] text-navy-400 tabular-nums">{totalUsers} accounts · {totalStudents} students</p>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-surface-50 border border-surface-100 px-3 py-4 text-center">
                <p className="text-2xl font-bold text-navy-900 tabular-nums">{activeUsers}</p>
                <p className="text-xs text-navy-400 mt-1">active</p>
              </div>
              <div className="rounded-lg bg-surface-50 border border-surface-100 px-3 py-4 text-center">
                <p className="text-2xl font-bold text-emerald-600 tabular-nums">{verified}</p>
                <p className="text-xs text-navy-400 mt-1">verified</p>
              </div>
              <div className={`rounded-lg border px-3 py-4 text-center ${pending > 0 ? 'bg-amber-50 border-amber-200' : 'bg-surface-50 border-surface-100'}`}>
                <p className={`text-2xl font-bold tabular-nums ${pending > 0 ? 'text-amber-600' : 'text-navy-900'}`}>{pending}</p>
                <p className="text-xs text-navy-400 mt-1">pending</p>
              </div>
            </div>

            <div className="mt-3 h-1.5 w-full rounded-full bg-surface-100 overflow-hidden">
              <div
                className="h-full rounded-full bg-sky-500 transition-all duration-700"
                style={{ width: `${Math.min(activePct, 100)}%` }}
              />
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-navy-400">
              <span className="font-semibold text-navy-500 tabular-nums">{activePct.toFixed(0)}% active</span>
              {pending > 0 ? (
                <Link
                  to="/admin/users"
                  className="inline-flex items-center gap-1 font-semibold text-amber-600 hover:text-amber-700"
                >
                  {pending} pending verification
                  <ChevronRight className="w-3 h-3" />
                </Link>
              ) : (
                <span className="font-semibold text-emerald-600">All verified</span>
              )}
            </div>
          </section>

          {/* Recent results */}
          <section className="flex-1 rounded-2xl border border-surface-200 bg-white p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Trophy className="w-3.5 h-3.5" />
                </span>
                <h2 className="text-sm font-semibold text-navy-900">Recent results</h2>
              </div>
              {results.length > 0 && (
                <Link
                  to="/admin/examinations"
                  className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent-600 hover:text-accent-700"
                >
                  View all
                  <ChevronRight className="w-3 h-3" />
                </Link>
              )}
            </div>

            {recentResults.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-surface-200 py-7 text-center">
                <Trophy className="w-7 h-7 text-navy-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-navy-900">No results published</p>
                <p className="text-xs text-navy-400 mt-1">Result sheets uploaded by teachers appear here.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-2.5">
                {recentResults.map((r) => {
                  const Icon = examIcons[r.exam_type] || FileText
                  return (
                    <Link
                      key={r.id}
                      to="/admin/examinations"
                      className="block rounded-xl bg-surface-50 border border-surface-100 p-3.5 hover:border-accent-200 hover:bg-white transition-all"
                    >
                      <div className="flex items-start gap-2.5">
                        <span className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center ${examTone[r.exam_type] || 'bg-surface-100 text-navy-500'}`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-medium text-navy-900 leading-snug truncate">{r.title}</p>
                          <p className="text-[10px] text-navy-400 mt-0.5 truncate">
                            {r.course_name || 'Course'} · {examLabels[r.exam_type]}
                          </p>
                          <p className="text-[10px] text-navy-400 mt-0.5">
                            {r.uploader_name || 'Admin'} · {shortDate(r.created_at)}
                          </p>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}