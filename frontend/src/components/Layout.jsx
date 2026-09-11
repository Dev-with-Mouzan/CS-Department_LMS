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
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MapPin,
  Phone,
  Mail,
  Download,
} from 'lucide-react'

const navConfig = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/attendance', label: 'Attendance', icon: CalendarCheck },
    { to: '/admin/examinations', label: 'Result', icon: Trophy },
    { to: '/admin/promotion', label: 'Promotion', icon: UserPlus },
    { to: '/admin/backup', label: 'Backup', icon: Download },
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

const roleLabels = {
  admin: 'Administrator',
  teacher: 'Instructor',
  student: 'Student',
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
                <p className="text-2xs font-medium text-white/40 truncate">
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
                <ChevronDown className={`w-3.5 h-3.5 text-white/40 transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
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

function Footer({ links, role }) {
  const portalLinks = links.map((link) => ({ label: link.label, to: link.to }))

  return (
    <footer className="bg-navy-950 border-t border-white/5 relative overflow-hidden">
      <div
        className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-[0.05] pointer-events-none"
        style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 65%)' }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 rounded-lg object-cover" loading="lazy" />
              <div>
                <p className="text-sm font-bold text-white">CS Department LMS</p>
                <p className="text-2xs text-white/40">Govt. Graduate College Burewala</p>
              </div>
            </div>
            <p className="text-sm text-white/40 leading-relaxed">
              CS Department's official Learning Management System at Govt. Graduate College Burewala. Digitizing education for a connected campus.
            </p>
            <div className="flex gap-3 mt-5">
              {[{ icon: Facebook, label: 'Facebook' }, { icon: Instagram, label: 'Instagram' }, { icon: Twitter, label: 'Twitter' }, { icon: Youtube, label: 'YouTube' }].map((s) => (
                <a key={s.label} href="#" aria-label={s.label} className="w-9 h-9 rounded-lg bg-white/5 hover:bg-accent-500/20 flex items-center justify-center text-white/30 hover:text-accent-400 transition-colors">
                  <s.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div>
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-5">Menu</h4>
            <ul className="space-y-3">
              {portalLinks.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} end={link.to === `/${role}`} className="text-sm text-white/40 hover:text-accent-400 transition-colors">
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform */}
          <div>
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-5">Platform</h4>
            <ul className="space-y-3">
              <li><Link to="/" className="text-sm text-white/40 hover:text-accent-400 transition-colors">Website Home</Link></li>
              <li><Link to="/login" className="text-sm text-white/40 hover:text-accent-400 transition-colors">Sign In</Link></li>
              <li><Link to="/register" className="text-sm text-white/40 hover:text-accent-400 transition-colors">Create Account</Link></li>
              <li><span className="text-sm text-white/30">{roleLabels[role]} Portal</span></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-5">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-accent-500 mt-0.5 shrink-0" />
                <span className="text-sm text-white/40 leading-relaxed">CS Dept., Govt. Graduate College Burewala,<br />Vehari District, Punjab, Pakistan</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-accent-500 shrink-0" />
                <span className="text-sm text-white/40">+92 67 334 5678</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-accent-500 shrink-0" />
                <span className="text-sm text-white/40">cs@ggcb.edu.pk</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">© {new Date().getFullYear()} CS Department, Govt. Graduate College Burewala. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-white/25 hover:text-white/50 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-white/25 hover:text-white/50 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
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
    <div className="min-h-screen bg-surface-50 flex flex-col">
      <Navbar links={links} role={role} user={user} onLogout={handleLogout} />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer links={links} role={role} />
      {showTour && tourSteps.length > 0 && (
        <Tour steps={tourSteps} onComplete={completeTour} />
      )}
    </div>
  )
}