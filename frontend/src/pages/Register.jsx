import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  Phone,
  CalendarDays,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Eye,
  EyeOff,
  ArrowLeft,
} from 'lucide-react'

export default function Register() {
  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '', password: '',
    role_name: 'student', semester: '', enrollment_year: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload = {
        ...form,
        semester: form.semester ? parseInt(form.semester, 10) : null,
        enrollment_year: form.enrollment_year ? parseInt(form.enrollment_year, 10) : null,
      }
      await register(payload)
      navigate('/verify-otp')
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  const inputBase = "w-full pl-11 pr-4 py-2.5 bg-surface-0 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 hover:border-navy-300"

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Left — Brand Panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-navy-950 relative overflow-hidden">
        {/* Background image + overlay */}
        <div className="absolute inset-0">
          <img
            src="/lab.jfif"
            alt="Computer Science Lab"
            className="w-full h-full object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-navy-950/95 via-navy-950/90 to-navy-900/85" />
        </div>

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-16 text-white w-full">
          <div>
            <Link to="/" className="inline-flex items-center gap-3 group">
              <img src="/college-logo.png" alt="GGCB Logo" className="w-9 h-9 rounded-lg object-cover ring-1 ring-white/20" />
              <span className="text-xl font-bold tracking-tight">CS Department LMS</span>
            </Link>

            <div className="mt-20">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-[11px] font-semibold text-accent-300 uppercase tracking-widest">
                CS Dept. · GGC Burewala
              </span>
              <h2 className="mt-6 text-5xl xl:text-6xl font-extrabold tracking-tight leading-[1.05]">
                Start your
                <br />
                <span className="text-accent-400">digital journey.</span>
              </h2>
             <p className="mt-6 text-navy-300 text-lg max-w-sm leading-relaxed">
                Join the CS Department's learning platform — attendance, assignments, courses, and results in one place.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-16">
            {[
              { icon: ShieldCheck, text: 'OTP-verified accounts' },
              { icon: GraduationCap, text: 'Designed for CS students & faculty' },
              { icon: CheckCircle2, text: 'Attendance, assignments & results' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-navy-200">
                <span className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <f.icon className="w-4 h-4 text-accent-400" />
                </span>
                {f.text}
              </div>
            ))}
          </div>

          <Link to="/" className="mt-10 inline-flex items-center gap-2 text-sm text-white/40 hover:text-accent-300 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
        </div>

        <div className="absolute top-0 right-0 w-1/2 h-full opacity-[0.03]"
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
        />
      </div>

      {/* Right — Form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-8 lg:p-12">
        <div className="w-full max-w-md animate-fade-in">
          {/* Mobile logo */}
          <Link to="/" className="flex items-center gap-3 mb-8 lg:hidden">
            <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 rounded-lg object-cover" />
            <span className="text-xl font-bold text-navy-900 tracking-tight">CS Department LMS</span>
          </Link>

          <div className="mb-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 mb-5">
              <GraduationCap className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Create account</h1>
            <p className="text-navy-400 mt-2">
              Join the CS Department's LMS — it takes less than a minute.
            </p>
          </div>

          {error && (
            <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium border border-danger/20 animate-slide-down">
              {error}
            </div>
          )}

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface-100 rounded-2xl border border-surface-200 mb-6">
            {[
              { value: 'student', label: 'Student' },
              { value: 'teacher', label: 'Teacher' },
            ].map((r) => (
              <button
                key={r.value}
                type="button"
                name="role_name"
                onClick={() => setForm({ ...form, role_name: r.value })}
                className={`py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  form.role_name === r.value
                    ? 'bg-white text-navy-900 shadow-sm border border-surface-200'
                    : 'text-navy-500 hover:text-navy-700'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">First name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input name="first_name" value={form.first_name} onChange={handleChange}
                    className={inputBase} placeholder="Ali" required />
                </div>
              </div>
              <div>
                <label className="input-label">Last name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input name="last_name" value={form.last_name} onChange={handleChange}
                    className={inputBase} placeholder="Khan" required />
                </div>
              </div>
            </div>

            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="email" name="email" value={form.email} onChange={handleChange}
                  className={inputBase} placeholder="you@example.com" required />
              </div>
            </div>

            <div>
              <label className="input-label">Phone number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input type="tel" name="phone" value={form.phone} onChange={handleChange}
                  className={inputBase} placeholder="+92 3XX XXXXXXX" required />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  className={`${inputBase} pr-11`}
                  placeholder="Min. 6 characters"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-navy-300 hover:text-navy-500 transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {form.role_name === 'student' && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="input-label">Semester</label>
                  <div className="relative">
                    <GraduationCap className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="number" name="semester" value={form.semester} onChange={handleChange}
                      className={inputBase} min={1} max={8} placeholder="1 – 8" />
                  </div>
                </div>
                <div>
                  <label className="input-label">Enrollment year</label>
                  <div className="relative">
                    <CalendarDays className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input type="number" name="enrollment_year" value={form.enrollment_year} onChange={handleChange}
                      className={inputBase} min={2020} max={2030} placeholder="2026" />
                  </div>
                </div>
              </div>
            )}

            <p className="flex items-center gap-2 text-xs text-navy-400">
              <ShieldCheck className="w-4 h-4 text-success shrink-0" />
              OTP will be sent via SMS to verify your phone number.
            </p>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Create account
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-navy-400">
            Already have an account?{' '}
            <Link to="/login" className="text-accent-600 hover:text-accent-700 font-semibold inline-flex items-center gap-1">
              Sign in
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}