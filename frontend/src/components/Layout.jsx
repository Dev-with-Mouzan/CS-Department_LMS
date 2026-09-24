import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Tour, { useTour } from './Tour'
import { studentTourSteps, teacherTourSteps, adminTourSteps } from '../config/tourSteps'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Inbox,
  CalendarCheck,
  FolderOpen,
  LogOut,
  GraduationCap,
  Menu,
  X,
  UserPlus,
  ChevronDown,
  UserCog,
  Trophy,
  Star,
} from 'lucide-react'

const navConfig = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/admin/examinations', label: 'Result', icon: Trophy },
    { to: '/admin/promotion', label: 'Promotion', icon: UserPlus },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/assessments', label: 'Assessments', icon: ClipboardList },
    { to: '/teacher/submissions', label: 'Submissions', icon: Inbox },
    { to: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/teacher/results', label: 'Results', icon: Trophy },
    { to: '/teacher/materials', label: 'Materials', icon: FolderOpen },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/assignments', label: 'Assessment', icon: ClipboardList },
    { to: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/student/results', label: 'Results', icon: Trophy },
    { to: '/student/materials', label: 'Materials', icon: FolderOpen },
    { to: '/student/review', label: 'Review', icon: Star },
  ],
}

function Navbar({ links, role, user, onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-navy-950 border-b border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-14 lg:h-16 gap-4">
          {/* Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/" className="flex items-center gap-3 min-w-0 shrink-0 group">
              <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg object-cover shrink-0" loading="eager" />
              <div className="leading-tight min-w-0">
                <p className="text-sm lg:text-base font-bold text-white tracking-tight truncate">CS Department LMS</p>
                <p className="text-xs font-medium text-white/40 truncate">
                  Govt. Graduate College Burewala
                </p>
              </div>
            </Link>
          </div>

          {/* Desktop tabs */}
          <nav className="hidden lg:flex items-center gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === `/${role}`}
                className={({ isActive }) =>
                  `relative px-4 py-2.5 text-sm font-medium transition-all duration-200 after:content-[''] after:absolute after:left-4 after:right-4 after:-bottom-px after:h-0.5 after:rounded-full after:transition-colors ${
                    isActive
                      ? 'text-white font-semibold after:bg-accent-500'
                      : 'text-white/60 hover:text-white after:bg-transparent'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Right actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className={`group flex items-center gap-2 px-2 py-1.5 rounded-full transition-all ${
                  menuOpen
                    ? 'bg-white/10'
                    : 'hover:bg-white/5'
                }`}
              >
                <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <span className="text-xs font-semibold text-white">{getName(user)?.[0]?.toUpperCase() || '?'}</span>
                </span>
                <span className="hidden sm:block text-xs font-medium text-white">{getName(user)}</span>
                <ChevronDown className={`hidden sm:block w-3.5 h-3.5 text-white/40 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-xl border border-white/10 bg-navy-900 shadow-elevated overflow-hidden">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-semibold text-white truncate">{getName(user)}</p>
                    <p className="text-xs text-white/40 truncate">{user?.email}</p>
                  </div>
                  <div className="p-2">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile tabs */}
      {mobileOpen && (
        <div className="lg:hidden bg-navy-950 border-t border-white/5">
          <div className="px-4 py-4 space-y-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === `/${role}`}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                    isActive ? 'bg-accent-500 text-navy-950' : 'text-white/70 hover:text-white hover:bg-white/5'
                  }`
                }
              >
                <link.icon className="w-4 h-4" />
                {link.label}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

function getName(user) {
  const full = user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : ''
  if (full) return full
  return user?.email ? user.email.split('@')[0] : 'User'
}

const dashboardTourSteps = {
  student: studentTourSteps,
  teacher: teacherTourSteps,
  admin: adminTourSteps,
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'student'
  const links = navConfig[role] || []
  const { showTour, completeTour } = useTour('lms_dashboard_tour')
  const tourSteps = dashboardTourSteps[role] || []

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 via-surface-50 to-surface-100 flex flex-col">
      <Navbar links={links} role={role} user={user} onLogout={handleLogout} />
      <main className="flex-1">
        <Outlet />
      </main>
      {showTour && tourSteps.length > 0 && (
        <Tour steps={tourSteps} onComplete={completeTour} />
      )}
    </div>
  )
}