import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import api from '../services/api'
import { AnimatedSection, StaggerContainer } from '../hooks/useScrollReveal.jsx'
import ChatWidget from '../components/ChatWidget'
import Tour, { useTour } from '../components/Tour'
import { landingTourSteps } from '../config/tourSteps'
import {
  GraduationCap,
  BookOpen,
  Users,
  CalendarCheck,
  BarChart3,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  TrendingUp,
  Shield,
  Zap,
  Star,
  Mail,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  UserPlus,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

/* ─────────────────────────────── Navbar ─────────────────────────────── */
function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('hero')

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Track which section is in view
  useEffect(() => {
    const sectionIds = ['hero', 'problem', 'solution', 'faculty', 'how-it-works', 'faq']
    const observers = []

    sectionIds.forEach((id) => {
      const el = document.getElementById(id)
      if (!el) return

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveSection(id)
          }
        },
        { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
      )

      observer.observe(el)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const links = [
    { label: 'Home', href: '#hero', id: 'hero' },
    { label: 'About', href: '#problem', id: 'problem' },
    { label: 'Features', href: '#solution', id: 'solution' },
    { label: 'Faculty', href: '#faculty', id: 'faculty' },
    { label: 'How It Works', href: '#how-it-works', id: 'how-it-works' },
    { label: 'FAQ', href: '#faq', id: 'faq' },
  ]

  const s = scrolled

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        s
          ? 'bg-surface-0/95 backdrop-blur-md shadow-card border-b border-surface-200/60'
          : 'bg-white/5 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 lg:h-16">
          <a href="#hero" className="flex items-center gap-3 group min-w-0">
            <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg object-cover shrink-0" />
            <div className="min-w-0">
              <p className={`text-xs sm:text-sm lg:text-base font-bold leading-tight tracking-tight truncate transition-colors duration-300 ${s ? 'text-navy-900' : 'text-white'}`}>
                CS Department LMS
              </p>
              <p className={`text-2xs font-medium truncate transition-colors duration-300 ${s ? 'text-navy-400' : 'text-white/50'}`}>
                Govt. Graduate College Burewala
              </p>
            </div>
          </a>

          <div className="hidden lg:flex items-center gap-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className={`px-4 py-3 text-sm font-medium rounded-t-lg transition-all duration-200 ${
                  activeSection === l.id
                    ? s
                      ? 'text-navy-900 font-semibold border-b-2 border-accent-500 rounded-none'
                      : 'text-white font-semibold border-b-2 border-accent-400 rounded-none'
                    : s
                      ? 'text-navy-500 hover:text-navy-900 hover:bg-surface-100'
                      : 'text-white/60 hover:text-white'
                }`}
              >
                {l.label}
              </a>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/login"
              className={`text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-300 ${
                s ? 'text-navy-600 hover:text-navy-900 hover:bg-surface-100' : 'text-white/80 hover:text-white'
              }`}
            >
              Sign In
            </Link>
            <Link to="/register"className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent-500 text-black hover:bg-accent-400 transition-colors shadow-md"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className={`lg:hidden p-2 rounded-lg transition-colors ${
              s ? 'hover:bg-surface-100' : 'hover:bg-white/10'
            }`}
            aria-label="Toggle menu"
          >
            {mobileOpen ? (
              <X className={`w-5 h-5 transition-colors ${s ? 'text-navy-700' : 'text-white'}`} />
            ) : (
              <Menu className={`w-5 h-5 transition-colors ${s ? 'text-navy-700' : 'text-white'}`} />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="lg:hidden bg-surface-0/98 backdrop-blur-md border-b border-surface-200 shadow-elevated">
          <div className="px-4 py-4 space-y-1">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setMobileOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-navy-700 hover:text-navy-900 hover:bg-surface-100 rounded-lg transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className="pt-3 border-t border-surface-200 mt-2 flex flex-col gap-2">
              <Link to="/login" onClick={() => setMobileOpen(false)} className="text-sm font-medium text-navy-600 hover:text-navy-900 px-4 py-2.5 rounded-lg border border-surface-200 text-center transition-colors">
                Sign In
              </Link>
              <Link to="/register" onClick={() => setMobileOpen(false)}className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent-500 text-black hover:bg-accent-400 transition-colors"
            >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  )
}

/* ─────────────────────────────── Hero ─────────────────────────────── */
function Hero() {
  const [profileIndex, setProfileIndex] = useState(0)
  const [fading, setFading] = useState(false)

  const profiles = [
    {
      name: 'Ali Hassan',
      attendance: '92%', grade: 'A-', streak: '12d',
      bars: [40, 65, 55, 80, 70, 90, 75],
      assignment: 'Data Structures — Assignment 3',
      due: 'Due tomorrow',
    },
    {
      name: 'Fatima Zahra',
      attendance: '97%', grade: 'A+', streak: '21d',
      bars: [70, 85, 80, 95, 88, 92, 90],
      assignment: 'Operating Systems — Quiz 2',
      due: 'Due in 2 days',
    },
    {
      name: 'Qasim Ali',
      attendance: '85%', grade: 'B+', streak: '7d',
      bars: [30, 50, 60, 45, 70, 55, 65],
      assignment: 'Database Systems — Lab 4',
      due: 'Due in 3 days',
    },
    {
      name: 'Ayesha Bibi',
      attendance: '94%', grade: 'A', streak: '18d',
      bars: [60, 75, 85, 70, 80, 95, 88],
      assignment: 'AI & Machine Learning — Project',
      due: 'Due today',
    },
    {
      name: 'Hassan Raza',
      attendance: '88%', grade: 'B+', streak: '9d',
      bars: [45, 55, 70, 60, 75, 80, 65],
      assignment: 'Networking — Case Study 2',
      due: 'Due tomorrow',
    },
    {
      name: 'Zainab Fatima',
      attendance: '99%', grade: 'A+', streak: '30d',
      bars: [90, 95, 88, 92, 97, 100, 94],
      assignment: 'CS — Project Milestone 3',
      due: 'Submitted ✓',
    },
  ]

  // Cycle profiles every 3 seconds with fade transition
  useEffect(() => {
    const interval = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setProfileIndex((prev) => (prev + 1) % profiles.length)
        setFading(false)
      }, 300)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  const p = profiles[profileIndex]

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center overflow-hidden"
    >
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/college_image.jfif"
          alt="Govt. Graduate College Burewala"
          className="w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-navy-950/85" />

      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 lg:pt-40 lg:pb-28 w-full">
        <div className="max-w-3xl mx-auto lg:mx-0 text-center lg:text-left">
          <div className="hero-animate inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 mb-8">
            <Star className="w-3.5 h-3.5 text-accent-400" />
            <span className="text-xs font-semibold text-white/60 tracking-wide uppercase">
              Dept. of Computer Science · Govt. Graduate College Burewala
            </span>
          </div>

          <h1 className="hero-animate text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
            The Future of CS
            <br />
            <span className="text-accent-400">Learning.</span>
          </h1>

          <p className="hero-animate mt-7 text-lg lg:text-xl text-white/50 max-w-lg leading-relaxed mx-auto lg:mx-0">
            Attendance, assignments, results, and classroom communication — all in
            one platform. Built for the CS Department at Govt. Graduate College Burewala.
          </p>

          <div className="hero-animate mt-10 flex flex-wrap gap-4 justify-center lg:justify-start">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-bold bg-accent-500 text-black hover:bg-accent-400 transition-all duration-200 shadow-lg shadow-accent-500/20"
            >
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl text-base font-semibold text-white border border-white/15 hover:bg-white/5 transition-all duration-200"
            >
              See How It Works
            </a>
          </div>

          <div className="hero-animate mt-14 flex items-center gap-8 lg:gap-10 justify-center lg:justify-start">
            {[
              { value: '2', label: 'Labs' },
              { value: '500+', label: 'CS Students' },
              { value: '07+', label: 'Faculty Members' },
            ].map((s, i) => (
              <div key={s.label} className="relative flex flex-col items-center text-center">
                {i > 0 && <div className="absolute -left-4 lg:-left-6 top-1/2 -translate-y-1/2 w-px h-8 bg-white/10 hidden lg:block" />}
                <p className="text-2xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-white/40 font-medium mt-0.5 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Animated Dashboard Card ── */}
        <div className="hidden lg:block absolute right-8 xl:right-16 top-1/2 -translate-y-1/2">
          <div className="relative w-[420px]">
            {/* Background shadow card */}
            <div className="card-fade-in absolute top-6 left-6 w-full h-[320px] rounded-2xl border border-white/5 bg-white/[0.02]" style={{ animationDelay: '0.5s' }} />

            {/* Main card */}
            <div className="card-slide-in relative rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-sm p-7">
              {/* Window dots */}
              <div className="dot-fade-in flex items-center gap-2 mb-6" style={{ animationDelay: '0.8s' }}>
                <div className="dot-cycle-1 w-3 h-3 rounded-full bg-white/10" />
                <div className="dot-cycle-2 w-3 h-3 rounded-full bg-white/10" />
                <div className="dot-cycle-3 w-3 h-3 rounded-full bg-white/10" />
                <div className="ml-auto">
                  <img src="/college-logo.png" alt="GGCB" className="w-8 h-8 rounded-full object-cover" />
                </div>
              </div>

              {/* Greeting — fades between profiles */}
              <div className={`mb-5 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
                <p className="text-sm text-white/40 mb-1">Welcome back,</p>
                <p className="text-lg font-bold text-white">{p.name}</p>
              </div>

              {/* Stat pills */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Attendance', value: p.attendance, accent: true },
                  { label: 'Avg. Grade', value: p.grade, accent: false },
                  { label: 'Streak', value: p.streak, accent: false },
                ].map((s) => (
                  <div
                    key={s.label}
                    className={`rounded-xl p-3 text-center transition-all duration-300 ${
                      s.accent ? 'bg-accent-500/15 border border-accent-500/20 stat-pulse' : 'bg-white/5'
                    } ${fading ? 'opacity-50 scale-95' : 'opacity-100 scale-100'}`}
                  >
                    <p className={`text-lg font-bold ${s.accent ? 'text-accent-400' : 'text-white'} transition-all duration-300`}>{s.value}</p>
                    <p className="text-2xs text-white/30 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart — bars morph between profiles */}
              <div className="bg-white/5 rounded-xl p-4 mb-4">
                <div className="flex items-end gap-2 h-28">
                  {p.bars.map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      {/* Percentage label */}
                      <span className="text-2xs font-bold text-white/50 transition-all duration-500">{h}%</span>
                      {/* Bar */}
                      <div className="w-full rounded-t-md overflow-hidden" style={{ height: '60px' }}>
                        <div
                          className="w-full rounded-t-md transition-all duration-700 ease-out"
                          style={{
                            height: `${h}%`,
                            marginTop: 'auto',
                            background: i === 5
                              ? 'linear-gradient(to top, #f59e0b, #fbbf24)'
                              : h >= 80
                                ? 'linear-gradient(to top, rgba(251,191,36,0.3), rgba(251,191,36,0.5))'
                                : 'linear-gradient(to top, rgba(255,255,255,0.08), rgba(255,255,255,0.15))',
                          }}
                        />
                      </div>
                      <span className="text-2xs text-white/25 font-medium">
                        {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Assignment row — fades between profiles */}
              <div className={`flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3 transition-opacity duration-300 ${fading ? 'opacity-0' : 'opacity-100'}`}>
                <div className="w-8 h-8 rounded-lg bg-accent-500/15 flex items-center justify-center">
                  <FileText className="w-4 h-4 text-accent-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white/80 truncate">{p.assignment}</p>
                  <p className="text-2xs text-accent-400/80">{p.due}</p>
                </div>
                <CheckCircle2 className="w-4 h-4 text-white/15 shrink-0" />
              </div>
            </div>

            {/* Floating dots */}
            <div className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-accent-500/30 animate-[float_4s_ease-in-out_infinite]" />
            <div className="absolute -bottom-2 -left-4 w-4 h-4 rounded-full bg-accent-500/20 animate-[float_5s_ease-in-out_infinite] [animation-delay:1s]" />
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Social Proof ─────────────────────────── */
function SocialProof() {
  const stats = [
    { icon: Users, value: '500+', label: 'CS Students', description: 'Currently enrolled in Computer Science programs' },
    { icon: BookOpen, value: '25+', label: 'CS Courses', description: 'Data Structures, AI, Networks, DB & more' },
    { icon: CalendarCheck, value: '98%', label: 'Attendance Tracked', description: 'Digital attendance with real-time sync' },
    { icon: BarChart3, value: '5K+', label: 'Assignments Submitted', description: 'Seamless lab reports & project submissions' },
  ]

  return (
    <section className="py-20 lg:py-28 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-200 bg-accent-50 text-accent-600 text-xs font-bold uppercase tracking-widest mb-3">Trusted by CS Students & Faculty</p>
          <h2 className="text-display-sm lg:text-display-md text-navy-900">Powering Computer Science at GGCB</h2>
          <p className="mt-3 text-navy-400 max-w-2xl mx-auto">
            Real numbers, real impact — see how the LMS is transforming daily academic operations for the CS Department at Govt. Graduate College Burewala.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s) => (
            <div key={s.label} className="stagger-child bg-white rounded-2xl border border-surface-200 p-8 text-center shadow-card group hover:-translate-y-2 hover:shadow-elevated hover:border-accent-200 transition-all duration-300">
              <div className="w-16 h-16 rounded-2xl bg-accent-50 border border-accent-100 flex items-center justify-center mx-auto mb-6 group-hover:bg-accent-100 group-hover:scale-110 transition-all duration-300">
                <s.icon className="w-8 h-8 text-accent-600" />
              </div>
              <p className="text-4xl font-extrabold text-navy-900 tracking-tight">{s.value}</p>
              <p className="text-sm font-bold text-navy-700 mt-2">{s.label}</p>
              <p className="text-xs text-navy-400 mt-3 leading-relaxed">{s.description}</p>
            </div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}

/* ───────────────────────── Problem Statement ───────────────────────── */
function ProblemStatement() {
  const problems = [
    { icon: AlertTriangle, title: 'Manual Attendance Headaches', description: 'Teachers spend 10–15 minutes of every class period on roll call. Paper records get lost, damaged, or are impossible to search through when parents ask for attendance history.' },
    { icon: Clock, title: 'Lost Assignments & Deadlines', description: 'Students forget to submit work on time. Teachers have no centralized way to distribute, collect, and grade assignments. Important deadlines get buried in WhatsApp groups.' },
    { icon: FileText, title: 'Scattered Communication', description: 'Notice boards, phone calls, WhatsApp messages — information falls through the cracks. Students miss class updates, and parents stay in the dark about academic progress.' },
    { icon: TrendingUp, title: 'No Performance Visibility', description: 'Without data, neither students nor teachers can track progress. Parents have no way to monitor grades or attendance remotely. Decisions are made blindly.' },
  ]

  return (
    <section id="problem" className="py-20 lg:py-28 bg-surface-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="max-w-3xl mx-auto text-center mb-16">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-danger/25 bg-danger/5 text-danger text-xs font-bold uppercase tracking-widest mb-3">The Challenge</p>
          <h2 className="text-display-sm lg:text-display-md text-navy-900">
            Education Shouldn't Feel <span className="text-danger">This Hard</span>
          </h2>
          <p className="mt-4 text-navy-400 text-lg leading-relaxed">
            Traditional classroom management in the CS Department at Govt. Graduate College Burewala relies on outdated, paper-based systems. The result? Wasted time, lost records, and disconnected students, teachers, and parents.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {problems.map((p) => (
            <div key={p.title} className="stagger-child flex flex-col sm:flex-row sm:gap-5 gap-4 p-6 sm:p-7 rounded-2xl bg-white border border-surface-200 shadow-card hover:shadow-elevated hover:-translate-y-1 transition-all duration-300">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-danger-light border border-danger/10 flex items-center justify-center shrink-0 self-center sm:self-auto">
                <p.icon className="w-6 h-6 sm:w-7 sm:h-7 text-danger" />
              </div>
              <div className="text-center sm:text-left">
                <h3 className="text-base sm:text-lg font-bold text-navy-900">{p.title}</h3>
                <p className="text-sm text-navy-500 mt-2 leading-relaxed">{p.description}</p>
              </div>
            </div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}

/* ────────────────────────── Solution ────────────────────────── */
function Solution() {
  const features = [
    { icon: CalendarCheck, title: 'Digital Attendance', description: 'One-tap attendance marking. Students and parents view real-time attendance history with charts and reports.', color: 'success' },
    { icon: FileText, title: 'Assignment Management', description: 'Create, distribute, submit, and grade assignments in one place. Auto-deadline reminders keep everyone on track.', color: 'info' },
    { icon: BarChart3, title: 'Performance Analytics', description: 'Visual dashboards show grades, attendance trends, and class rankings. Data-driven decisions for students and teachers.', color: 'accent' },
    { icon: Users, title: 'Role-Based Access', description: 'Separate dashboards for Admins, Teachers, and Students. Everyone sees exactly what they need — nothing more.', color: 'warning' },
    { icon: Shield, title: 'Secure & Private', description: 'OTP-based authentication, encrypted data, and role-based permissions keep student records safe.', color: 'info' },
    { icon: Zap, title: 'Instant Notifications', description: 'Push notifications for new assignments, attendance alerts, and grade updates — never miss what matters.', color: 'accent' },
  ]

  const colorMap = {
    success: { bg: 'bg-success-light', icon: 'text-success' },
    info: { bg: 'bg-info-light', icon: 'text-info' },
    accent: { bg: 'bg-accent-50', icon: 'text-accent-600' },
    warning: { bg: 'bg-warning-light', icon: 'text-warning-dark' },
  }

  return (
    <section id="solution" className="relative py-20 lg:py-28 bg-navy-950 overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/lab.jfif')" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-navy-950/100 via-navy-950/90 to-navy-900/95" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 text-accent-400 text-xs font-bold uppercase tracking-widest mb-3">Our Solution</p>
          <h2 className="text-display-sm lg:text-display-md text-white">
            Everything You Need, <span className="text-accent-400">One Platform</span>
          </h2>
          <p className="mt-4 text-navy-200 max-w-2xl mx-auto">
            CS Department LMS is purpose-built for the CS Department at Govt. Graduate College Burewala — bringing attendance, academics, and communication together under one roof.
          </p>
        </AnimatedSection>

        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((f) => {
            const c = colorMap[f.color]
            return (
              <div key={f.title} className="stagger-child bg-navy-800/80 backdrop-blur-md border border-white/10 rounded-2xl p-7 hover:bg-navy-800 hover:border-white/20 hover:shadow-[0_8px_30px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300 group">
                <div className={`w-14 h-14 rounded-xl ${c.bg} border border-white/10 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  <f.icon className={`w-7 h-7 ${c.icon}`} />
                </div>
                <h3 className="text-lg font-bold text-white">{f.title}</h3>
                <p className="text-sm text-navy-200 mt-2.5 leading-relaxed">{f.description}</p>
              </div>
            )
          })}
        </StaggerContainer>
      </div>
    </section>
  )
}

/* ─────────────────────── How It Works ─────────────────────── */
function HowItWorks() {
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = document.getElementById('how-it-works')
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setInView(true) },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const steps = [
    {
      step: 1,
      icon: UserPlus,
      title: 'Create Your Account',
      description: 'Sign up with your college email and phone number. Verify your account with a one-time SMS code.',
      detail: 'Takes less than 30 seconds',
      color: 'accent',
    },
    {
      step: 2,
      icon: BookOpen,
      title: 'Access Your Courses',
      description: 'Auto-enrolled in your CS semester courses — Data Structures, OS, DB, and more appear on your dashboard.',
      detail: 'All courses ready on day one',
      color: 'info',
    },
    {
      step: 3,
      icon: BarChart3,
      title: 'Track Your Progress',
      description: 'Monitor attendance, grades, assignment deadlines, and performance trends — all in real time.',
      detail: 'Always up to date',
      color: 'success',
    },
  ]

  const colorMap = {
    accent: { bg: 'bg-accent-50', border: 'border-accent-200', icon: 'text-accent-600', number: 'bg-accent-500', connector: 'bg-accent-200' },
    info: { bg: 'bg-info-light', border: 'border-info/30', icon: 'text-info', number: 'bg-info', connector: 'bg-info/30' },
    success: { bg: 'bg-success-light', border: 'border-success/30', icon: 'text-success', number: 'bg-success', connector: 'bg-success/30' },
  }

  return (
    <section id="how-it-works" className="py-20 lg:py-28 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-200 bg-accent-50 text-accent-600 text-xs font-bold uppercase tracking-widest mb-3">Simple & Intuitive</p>
          <h2 className="text-display-sm lg:text-display-md text-navy-900">How It Works</h2>
          <p className="mt-3 text-navy-400 max-w-2xl mx-auto">
            Getting started takes less than 2 minutes. Here's the journey from registration to full CS department integration.
          </p>
        </AnimatedSection>

        {/* Step cards */}
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-6 relative">
            {/* Connector line with animated particle (desktop only) */}
            <div className="hidden md:block absolute left-[20%] right-[20%] h-0.5" style={{ top: '32px' }}>
              {/* Background line */}
              <div className="h-full bg-surface-200" />
              {/* Animated fill */}
              <div className={`absolute inset-0 h-full bg-accent-400 transition-all duration-1000 ease-out ${inView ? 'w-full' : 'w-0'}`} />
              {/* Glowing particle */}
              {inView && (
                <div className="particle-trail absolute inset-0 h-full overflow-visible">
                  <div className="particle-glow absolute top-1/2 -translate-y-1/2" />
                </div>
              )}
            </div>

            {steps.map((step, i) => {
              const c = colorMap[step.color]
              return (
                <div
                  key={step.step}
                  className={`relative transition-all duration-700 ease-out ${
                    inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
                  }`}
                  style={{ transitionDelay: `${i * 200}ms` }}
                >
                  <div className="text-center">
                    {/* Step number circle */}
                    <div className="relative inline-flex items-center justify-center mb-6">
                      <div className={`w-16 h-16 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center relative z-10 transition-transform duration-500 hover:scale-110`}>
                        <step.icon className={`w-7 h-7 ${c.icon}`} />
                      </div>
                      <span className={`absolute -top-2 -right-2 w-7 h-7 rounded-full ${c.number} text-white text-xs font-bold flex items-center justify-center z-20 shadow-md`}>
                        {step.step}
                      </span>
                    </div>

                    {/* Content */}
                    <h3 className="text-lg font-bold text-navy-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-navy-500 leading-relaxed max-w-xs mx-auto mb-3">
                      {step.description}
                    </p>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-surface-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                      <span className="text-xs font-semibold text-navy-600">{step.detail}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

/* ─────────────────────────── Faculty Carousel ─────────────────────────── */
function FacultyCarousel({ faculty }) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)
  const maxIndex = Math.max(0, faculty.length - 3)
  const CARD_W = 334
  const GAP = 32
  const STEP = CARD_W + GAP

  const go = (dir) => {
    setCurrent((prev) => {
      const next = prev + dir
      if (next < 0) return maxIndex
      if (next > maxIndex) return 0
      return next
    })
  }

  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => go(1), 4000)
    return () => clearInterval(timerRef.current)
  }, [isPaused])

  return (
    <div
      className="relative mx-auto"
      style={{ maxWidth: '1100px', height: '420px' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Track */}
      <div className="overflow-hidden h-full">
        <div
          className="flex h-full"
          style={{
            gap: `${GAP}px`,
            transform: `translateX(-${current * STEP}px)`,
            transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {faculty.map((f, i) => (
            <div key={f.name} className="shrink-0 flex flex-col bg-white rounded-2xl border border-surface-200 overflow-hidden group hover:-translate-y-1 hover:shadow-lg transition-all duration-300" style={{ width: `${CARD_W}px`, height: '400px' }}>
              {/* Photo */}
              <div className="relative h-72 overflow-hidden">
                <img src={f.image} alt={f.name} className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/90 via-black/50 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4">
                  <p className="text-base font-bold text-white">{f.name}</p>
                  <p className="text-xs font-semibold text-accent-400">{f.title}</p>
                </div>
              </div>
              {/* Details */}
              <div className="flex-1 flex flex-col justify-between px-4 py-2.5">
                <div>
                  <div className="flex items-start gap-1.5 mb-1.5">
                    <GraduationCap className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-navy-800">{f.qualification}</p>
                      <p className="text-[10px] text-navy-400">{f.university}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-accent-500 mt-0.5 shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {f.research.map((r) => (
                        <span key={r} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-accent-50 text-accent-700 border border-accent-100">{r}</span>
                      ))}
                    </div>
                  </div>
                </div>
                {f.email && (
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-surface-100">
                    <Mail className="w-3 h-3 text-accent-500 shrink-0" />
                    <a href={`mailto:${f.email}`} className="text-[10px] text-navy-600 hover:text-accent-600 transition-colors truncate">{f.email}</a>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Left Arrow */}
      <button onClick={() => go(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 rounded-full bg-white/90 border border-surface-200 shadow-md flex items-center justify-center hover:bg-white hover:shadow-lg transition-all cursor-pointer">
        <ChevronLeft className="w-5 h-5 text-navy-600" />
      </button>

      {/* Right Arrow */}
      <button onClick={() => go(1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 rounded-full bg-white/90 border border-surface-200 shadow-md flex items-center justify-center hover:bg-white hover:shadow-lg transition-all cursor-pointer">
        <ChevronRight className="w-5 h-5 text-navy-600" />
      </button>
    </div>
  )
}

/* ─────────────────────────── Faculty ─────────────────────────── */
function Faculty() {
  const faculty = [
    {
      name: 'Dr. Rana Muhammad Nadeem',
      title: 'Associate Professor & HOD',
      department: 'Department of Computer Science',
      qualification: 'Ph.D. in Computer Science',
      university: 'The Superior University, Lahore',
      research: ['Machine Learning', 'Deep Learning', 'Internet of Things (IoT)'],
      email: 'dr.rananadim@ggcb.edu.pk',
      image: '/Dr Rana Nadeem sb HOD of computer science.png',
    },
    {
      name: 'Muhammad Imran',
      title: 'Lecturer & IT Focal Person',
      department: 'Department of Computer Science',
      qualification: 'MS in Computer Science',
      university: 'Govt. Graduate College Burewala',
      research: ['Web Development', 'IT Systems', 'Educational Technology'],
      email: 'imran.cs@ggcb.edu.pk',
      image: '/Prof Imran sb.png',
    },
    {
      name: 'Farah Mumtaz',
      title: 'Assistant Professor',
      department: 'Department of Computer Science',
      qualification: 'M.Phil in Computer Science',
      university: 'Govt. Graduate College Burewala',
      research: ['Software Engineering', 'Web Development'],
      email: 'farah.cs@ggcb.edu.pk',
      image: 'https://ggcb.edu.pk/uploads/staff/6a1afbda35ce5_1780153306.jpg',
    },
    {
      name: 'Mubashar Ahmad Shakeel',
      title: 'Assistant Professor',
      department: 'Department of Computer Science',
      qualification: 'MSc in Computer Science',
      university: 'Govt. Graduate College Burewala',
      research: ['Data Structures', 'Algorithms'],
      email: 'mubashar.cs@ggcb.edu.pk',
      image: '/Mubashir sb .png',
    },
    {
      name: 'Dr. Israr Ahmad',
      title: 'Lecturer',
      department: 'Department of Computer Science',
      qualification: 'Ph.D in Computer Science',
      university: 'Govt. Graduate College Burewala',
      research: ['Networks', 'Cloud Computing'],
      email: 'israr.cs@ggcb.edu.pk',
      image: '/DR Israr sb.png',
    },
    {
      name: 'Ali Rehan Alvi',
      title: 'Lecturer',
      department: 'Department of Computer Science',
      qualification: 'MSc in Computer Science',
      university: 'Govt. Graduate College Burewala',
      research: ['Programming', 'Database Systems'],
      email: 'ali.cs@ggcb.edu.pk',
      image: '/Prof Alvi sb.png',
    },
    {
      name: 'Myra Ashraf',
      title: 'Lecturer',
      department: 'Department of Computer Science',
      qualification: 'M.Phil in Computer Science',
      university: 'Govt. Graduate College Burewala',
      research: ['Artificial Intelligence', 'Data Science'],
      email: 'myra.cs@ggcb.edu.pk',
      image: 'https://ggcb.edu.pk/uploads/staff/6a1afeac984a9_1780154028.jpg',
    },
  ]

  return (
    <section id="faculty" className="py-20 lg:py-28 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-200 bg-accent-50 text-accent-600 text-xs font-bold uppercase tracking-widest mb-3">Our Leadership</p>
          <h2 className="text-display-sm lg:text-display-md text-navy-900">Meet the CS Faculty</h2>
          <p className="mt-3 text-navy-400 max-w-2xl mx-auto">
            Guided by experienced educators and researchers driving innovation in Computer Science education at GGCB.
          </p>
        </AnimatedSection>

        <FacultyCarousel faculty={faculty} />
      </div>
    </section>
  )
}

/* ─────────────────────────── Student Reviews Carousel ─────────────────────────── */
function StudentReviewsCarousel({ reviews }) {
  const [current, setCurrent] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const timerRef = useRef(null)
  const maxIndex = Math.max(0, reviews.length - 3)
  const CARD_W = 350
  const GAP = 24
  const STEP = CARD_W + GAP

  const go = (dir) => {
    setCurrent((prev) => {
      const next = prev + dir
      if (next < 0) return maxIndex
      if (next > maxIndex) return 0
      return next
    })
  }

  useEffect(() => {
    if (isPaused) return
    timerRef.current = setInterval(() => go(1), 4000)
    return () => clearInterval(timerRef.current)
  }, [isPaused])

  return (
    <div
      className="relative mx-auto"
      style={{ maxWidth: '1100px', height: '320px' }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Track */}
      <div className="overflow-hidden h-full">
        <div
          className="flex h-full"
          style={{
            gap: `${GAP}px`,
            transform: `translateX(-${current * STEP}px)`,
            transition: 'transform 0.7s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {reviews.map((r, i) => (
            <div key={i} className="shrink-0 flex flex-col bg-white rounded-2xl border border-surface-200 p-6 shadow-card hover:-translate-y-1 hover:shadow-elevated hover:border-accent-200 transition-all duration-300" style={{ width: `${CARD_W}px` }}>
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star key={si} className={`w-4 h-4 ${si < r.rating ? 'text-accent-400 fill-accent-400' : 'text-navy-200'}`} />
                ))}
              </div>
              {/* Quote */}
              <p className="text-sm text-navy-600 leading-relaxed mb-5 flex-1">&ldquo;{r.text}&rdquo;</p>
              {/* Author */}
              <div className="flex items-center gap-3 pt-4 border-t border-surface-100">
                <span className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                  {r.avatar}
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-navy-900 truncate">{r.name}</p>
                  <p className="text-2xs text-navy-400">{r.semester}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Left Arrow */}
      <button onClick={() => go(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-20 w-10 h-10 rounded-full bg-white/90 border border-surface-200 shadow-md flex items-center justify-center hover:bg-white hover:shadow-lg transition-all cursor-pointer">
        <ChevronLeft className="w-5 h-5 text-navy-600" />
      </button>

      {/* Right Arrow */}
      <button onClick={() => go(1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-20 w-10 h-10 rounded-full bg-white/90 border border-surface-200 shadow-md flex items-center justify-center hover:bg-white hover:shadow-lg transition-all cursor-pointer">
        <ChevronRight className="w-5 h-5 text-navy-600" />
      </button>
    </div>
  )
}

function StudentReviews() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reviews/public', { params: { limit: 6 } })
      .then((res) => {
        const mapped = res.data.map((r) => ({
          name: r.user_name || 'Student',
          semester: r.user_semester ? `BS CS — ${r.user_semester}${ordinalSuffix(r.user_semester)} Semester` : 'BS CS Student',
          avatar: (r.user_name || 'S').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase(),
          rating: r.rating,
          text: r.text,
        }))
        setReviews(mapped)
      })
      .catch(() => setReviews([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading || reviews.length === 0) return null

  return (
    <section className="py-20 lg:py-28 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-200 bg-accent-50 text-accent-600 text-xs font-bold uppercase tracking-widest mb-3">Student Voices</p>
          <h2 className="text-display-sm lg:text-display-md text-navy-900">What Students Say</h2>
          <p className="mt-3 text-navy-400 max-w-2xl mx-auto">
            Hear from CS students at GGCB who are already using the platform every day.
          </p>
        </AnimatedSection>

        <StudentReviewsCarousel reviews={reviews} />
      </div>
    </section>
  )
}

function ordinalSuffix(n) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return s[(v - 20) % 10] || s[v] || s[0]
}

/* ─────────────────────────── FAQ ─────────────────────────── */
function FAQ() {
  const [openIndex, setOpenIndex] = useState(null)

  const faqs = [
    { question: 'How do I create an account and sign in?', answer: 'Students and teachers register with their official email address and phone number. After registering, a 6-digit OTP is sent to your phone via SMS to verify your account. Once verified, you can sign in securely with your email and password.' },
    { question: "What can I do with my student dashboard?", answer: 'Students get a dedicated dashboard for viewing their attendance history, checking assignments posted by teachers, submitting work before deadlines, and tracking their grades and performance over time.' },
    { question: 'How is attendance marked and tracked?', answer: 'Teachers mark attendance digitally from their dashboard with one tap per student, and the record is timestamped and saved instantly. Students can view their complete attendance history with charts and reports anytime.' },
    { question: 'How do assignments and submissions work?', answer: 'Teachers create assignments with deadlines directly in the portal. Students see new assignments in their dashboard and submit their work online. Teachers grade submissions and results appear in the student dashboard.' },
    { question: 'What access do teachers and admins have?', answer: 'Teachers can mark attendance, create assignments, and review & grade student submissions. Administrators manage users and courses across the department with full oversight.' },
    { question: "I forgot my password. What should I do?", answer: 'Use the "Forgot Password" option on the sign-in page. Enter your registered email, and an OTP will be sent to you. Use it to reset your password and sign back in.' },
    { question: 'Which programs and courses are supported?', answer: 'The CS Department supports BS Computer Science (GCUF affiliated) and ICS programs. CS Department LMS covers all CS courses including Data Structures, AI & Machine Learning, Database Systems, Operating Systems, and Computer Networks.' },
    { question: 'How is my data protected?', answer: 'Your data is encrypted and stored securely, and OTP-based account verification ensures only verified users can access the system. Role-based permissions mean users only see what is relevant to them.' },
  ]

  return (
    <section id="faq" className="py-20 lg:py-28 bg-surface-0">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="text-center mb-16">
          <p className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-accent-200 bg-accent-50 text-accent-600 text-xs font-bold uppercase tracking-widest mb-3">Got Questions?</p>
          <h2 className="text-display-sm lg:text-display-md text-navy-900">Frequently Asked Questions</h2>
          <p className="mt-3 text-navy-400">Everything you need to know about getting started with CS Department LMS.</p>
        </AnimatedSection>

        <StaggerContainer className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="stagger-child card overflow-hidden transition-all duration-200">
              <button onClick={() => setOpenIndex(openIndex === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left group">
                <span className="text-sm font-semibold text-navy-800 pr-4 group-hover:text-navy-900">{faq.question}</span>
                {openIndex === i ? <ChevronUp className="w-5 h-5 text-accent-500 shrink-0" /> : <ChevronDown className="w-5 h-5 text-navy-300 shrink-0 group-hover:text-navy-400" />}
              </button>
              {openIndex === i && (
                <div className="px-5 pb-5 border-t border-surface-100">
                  <p className="text-sm text-navy-500 leading-relaxed pt-4">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </StaggerContainer>
      </div>
    </section>
  )
}

/* ──────────────────────────── CTA ──────────────────────────── */
function CTA() {
  return (
    <section className="py-20 lg:py-28 bg-navy-950 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src="/cta bg image.jfif"
          alt="Govt. Graduate College Burewala"
          className="w-full h-full object-cover object-center opacity-40"
        />
        <div className="absolute inset-0 bg-navy-950/80" />
      </div>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-[0.06]"
        style={{ background: 'radial-gradient(circle, #fbbf24 0%, transparent 65%)' }}
      />

      <AnimatedSection className="relative max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-display-sm lg:text-display-md text-white font-extrabold">Ready to Transform Your Learning?</h2>
        <p className="mt-4 text-white/50 text-lg max-w-xl mx-auto">
          Join hundreds of CS students and faculty already using CS Department LMS. Registration takes less than 60 seconds — start your digital campus experience today.
        </p>
        <div className="mt-10 flex justify-center gap-3 sm:gap-4">
          <Link to="/register"className="inline-flex items-center justify-center gap-2 flex-1 sm:flex-none px-6 sm:px-8 py-3.5 rounded-xl text-sm sm:text-base font-bold bg-accent-500 text-black hover:bg-accent-400 transition-colors shadow-lg shadow-accent-500/20"
            >
            Create Free Account
            <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          </Link>
          <Link to="/login" className="inline-flex items-center justify-center gap-2 px-4 sm:px-8 py-2.5 sm:py-3.5 rounded-xl text-xs sm:text-base font-semibold text-white border border-white/15 hover:bg-white/5 transition-colors whitespace-nowrap">
            Sign In
          </Link>
        </div>
        <p className="mt-6 text-xs text-white/30 font-medium">No credit card required · Free forever for CS Dept. students & staff</p>
      </AnimatedSection>
    </section>
  )
}

/* ──────────────────────────── Footer ──────────────────────────── */
function Footer() {
  return (
    <footer className="bg-navy-950 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <AnimatedSection className="py-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 rounded-lg object-cover" />
              <div>
                <p className="text-sm font-bold text-white">CS Dept. LMS</p>
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

          <div>
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-5">Quick Links</h4>
            <ul className="space-y-3">
              {['Home', 'About CS Dept.', 'Programs', 'Admissions', 'Results'].map((link) => (
                <li key={link}><a href="#" className="text-sm text-white/40 hover:text-accent-400 transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold text-white/30 uppercase tracking-wider mb-5">LMS</h4>
            <ul className="space-y-3">
              {['Student Portal', 'Teacher Portal', 'Admin Dashboard', 'CS Courses', 'Attendance'].map((link) => (
                <li key={link}><a href="#" className="text-sm text-white/40 hover:text-accent-400 transition-colors">{link}</a></li>
              ))}
            </ul>
          </div>

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
        </AnimatedSection>

        <div className="py-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-white/25">© {new Date().getFullYear()} Govt. Graduate College Burewala. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-white/25 hover:text-white/50 transition-colors">Privacy Policy</a>
            <a href="#" className="text-xs text-white/25 hover:text-white/50 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

/* ─────────────────────── Exported Landing Page ─────────────────────── */
export default function LandingPage() {
  const { showTour, completeTour } = useTour()

  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <SocialProof />
      <ProblemStatement />
      <Solution />
      <Faculty />
      <HowItWorks />
      <StudentReviews />
      <FAQ />
      <CTA />
      <Footer />
      <ChatWidget />
      {showTour && <Tour steps={landingTourSteps} onComplete={completeTour} />}
    </div>
  )
}
