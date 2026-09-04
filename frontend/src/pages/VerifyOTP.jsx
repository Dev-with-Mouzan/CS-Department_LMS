import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  ShieldCheck,
  Terminal,
  Lock,
  Mail,
  CheckCircle2,
  BarChart3,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
} from 'lucide-react'

export default function VerifyOTP() {
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const { user, loginAfterVerify } = useAuth()
  const navigate = useNavigate()

  // Get email from pending verification or from logged-in user
  const pendingData = JSON.parse(localStorage.getItem('pendingVerification') || '{}')
  const email = user?.email || pendingData.email
  const phone = user?.phone || pendingData.phone

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await authAPI.verifyOTP({ email, otp_code: otp })
      const { access_token, user_id, role, is_verified } = res.data
      // Log the user in now that OTP is verified
      loginAfterVerify(access_token, user_id, role, is_verified, email)
      setVerified(true)
      setMessage('Account verified successfully!')
      setTimeout(() => {
        const routes = { admin: '/admin', teacher: '/teacher', student: '/student' }
        navigate(routes[role] || '/')
      }, 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid OTP code')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    setError('')
    setLoading(true)
    try {
      await authAPI.resendOTP({ email })
      setMessage('New OTP sent — check the server terminal for the code (test mode)')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend')
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
                Almost <span className="text-accent-400">there.</span>
              </h2>
              <p className="mt-6 text-navy-300 text-lg max-w-sm leading-relaxed">
                We've sent a one-time code to your phone to make sure it's really you. Enter it below to finish setting up your account.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-16">
            {[
              { icon: ShieldCheck, text: 'Phone-verified accounts' },
              { icon: MessageSquare, text: 'OTP sent via SMS' },
              { icon: Lock, text: 'Your data stays secure' },
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
          style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
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
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Verify your account</h1>
            <p className="text-navy-400 mt-2">
              Enter the 6-digit OTP
              {phone ? ` sent to ${phone}` : ''}
            </p>
          </div>

          {/* Test mode notice */}
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl border border-accent-200 bg-accent-50 mb-6 text-xs text-accent-800">
            <Terminal className="w-4 h-4 shrink-0 text-accent-600" />
            Test mode: the code is printed on the server terminal.
          </div>

          {message && (
            <div className="bg-success-light text-success-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium border border-success/20 animate-slide-down">
              {message}
            </div>
          )}
          {error && (
            <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium border border-danger/20 animate-slide-down">
              {error}
            </div>
          )}

          {!verified && (
            <form onSubmit={handleVerify} className="space-y-4">
              <div>
                <label className="input-label">OTP Code</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={`${inputBase} text-center text-2xl tracking-[0.5em] font-mono py-4`}
                    maxLength={6}
                    placeholder="000000"
                    required
                  />
                </div>
              </div>

              <p className="flex items-center gap-2 text-xs text-navy-400">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
                {phone ? `Code sent to ${phone}` : 'Check your phone for the OTP code'}
              </p>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Verify account
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          )}

          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full mt-4 text-sm text-navy-400 hover:text-accent-600 font-medium transition-colors"
          >
            Resend OTP code
          </button>

          <p className="mt-8 text-center text-sm text-navy-400">
            Already verified?{' '}
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
