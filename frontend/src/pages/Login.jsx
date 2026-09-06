import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  Lock,
  Mail,
  ShieldCheck,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await login(email, password)
      const routes = { admin: '/admin', teacher: '/teacher', student: '/student' }
      navigate(routes[result.role] || '/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials')
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
                Continue your
                <br />
                <span className="text-accent-400">digital journey.</span>
              </h2>
              <p className="mt-6 text-navy-300 text-lg max-w-sm leading-relaxed">
                Sign in to access your courses, assignments, attendance, and results on the CS Department's learning platform.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-16">
            {[
              { icon: ShieldCheck, text: 'OTP-verified accounts' },
              { icon: CheckCircle2, text: 'Track attendance & submissions' },
              { icon: BarChart3, text: 'View results & analytics' },
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
          <div className="mb-8 text-center">
            <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 mb-5">
              <Lock className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Welcome back</h1>
            <p className="text-navy-400 mt-2">
              Sign in to access your account
            </p>
          </div>

          {error && (
            <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium border border-danger/20 animate-slide-down">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="input-label">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputBase}
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputBase} pr-11`}
                  placeholder="••••••••"
                  required
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

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-sm text-navy-500">
                <input type="checkbox" className="w-4 h-4 rounded border-surface-300 text-accent-500 focus:ring-accent-400" />
                Remember me
              </label>
              <Link to="/forgot-password" className="text-sm text-accent-600 hover:text-accent-700 font-medium">
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 text-base mt-1"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  Sign in
                  <ArrowRight className="w-4 h-4" />
                </span>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-navy-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-accent-600 hover:text-accent-700 font-semibold inline-flex items-center gap-1">
              Create one
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}