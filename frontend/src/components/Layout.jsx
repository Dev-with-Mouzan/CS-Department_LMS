import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Users,
  BookOpen,
  ClipboardList,
  Inbox,
  CalendarCheck,
  LogOut,
  GraduationCap,
  Menu,
  X,
  UserPlus,
  ChevronDown,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react'

const navConfig = {
  admin: [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/courses', label: 'Courses', icon: BookOpen },
    { to: '/admin/enrollments', label: 'Enrollments', icon: UserPlus },
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/create-assignment', label: 'Assignments', icon: ClipboardList },
    { to: '/teacher/submissions', label: 'Submissions', icon: Inbox },
    { to: '/teacher/attendance', label: 'Attendance', icon: CalendarCheck },
  ],
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/assignments', label: 'Assignments', icon: ClipboardList },
    { to: '/student/attendance', label: 'Attendance', icon: CalendarCheck },
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
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg object-cover" />
            <div className="leading-tight">
              <p className="text-sm lg:text-base font-bold text-white tracking-tight">CS Department LMS</p>
              <p className="text-2xs font-medium text-white/40">
                Govt. Graduate College Burewala
              </p>
            </div>
          </Link>

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
                className={`group flex items-center gap-2.5 pl-0.5 pr-2.5 py-0.5 rounded-full border bg-white/5 transition-all ${
                  menuOpen
                    ? 'border-accent-500/50 bg-white/10 shadow-lg shadow-accent-500/10'
                    : 'border-white/10 hover:border-accent-500/40 hover:bg-white/10'
                }`}
              >
                <span className="w-9 h-9 rounded-full p-[2px] bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 shadow-md shadow-accent-500/20">
                  <span className="relative w-full h-full rounded-full bg-navy-800 flex items-center justify-center">
                    <span className="text-accent-300 text-sm font-bold">{getName(user)?.[0]?.toUpperCase() || '?'}</span>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-navy-950" />
                  </span>
                </span>
                <span className="hidden sm:block text-left leading-tight">
                  <span className="block text-xs font-bold text-white max-w-[140px] truncate">{getName(user)}</span>
                  <span className="flex items-center gap-1 text-2xs text-white/40">
                    <GraduationCap className="w-2.5 h-2.5" />
                    <span className="capitalize">{role}</span>
                  </span>
                </span>
                <ChevronDown className={`w-3.5 h-3.5 text-white/50 transition-transform group-hover:text-white/80 ${menuOpen ? 'rotate-180' : ''}`} />
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-72 rounded-2xl border border-white/10 bg-navy-900 shadow-elevated overflow-hidden">
                  <div
                    className="absolute -top-24 -right-24 w-56 h-56 rounded-full opacity-[0.08] pointer-events-none"
                    style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 65%)' }}
                  />
                  <div className="relative px-4 pt-4 pb-3 border-b border-white/10">
                    <div className="flex items-center gap-3">
                      <span className="w-11 h-11 rounded-full p-[2px] bg-gradient-to-br from-accent-400 via-accent-500 to-accent-600 shadow-md shadow-accent-500/25">
                        <span className="w-full h-full rounded-full bg-navy-800 flex items-center justify-center">
                          <span className="text-accent-300 text-sm font-bold">{getName(user)?.[0]?.toUpperCase() || '?'}</span>
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">{getName(user)}</p>
                        <p className="text-xs text-white/40 truncate">{user?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/15 border border-accent-500/30 text-[10px] font-semibold text-accent-300 uppercase tracking-widest">
                        <GraduationCap className="w-3 h-3" />
                        {roleLabels[role]}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${
                        user?.is_verified
                          ? 'bg-success/10 border-success/25 text-success'
                          : 'bg-warning/10 border-warning/25 text-warning'
                      }`}>
                        {user?.is_verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </div>
                  <div className="relative p-2">
                    <button
                      onClick={onLogout}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-accent-300 hover:bg-accent-500/10 transition-colors"
                    >
                      <span className="w-8 h-8 rounded-lg bg-accent-500/15 border border-accent-500/20 flex items-center justify-center">
                        <LogOut className="w-4 h-4 text-accent-400" />
                      </span>
                      Sign out
                      <span className="ml-auto text-2xs text-white/30">{role}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg text-white hover:bg-white/10 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
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
              <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 rounded-lg object-cover" />
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

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const role = user?.role || 'student'
  const links = navConfig[role] || []

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
    </div>
  )
}