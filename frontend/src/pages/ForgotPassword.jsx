import { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'
import {
  Lock,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react'

export default function ForgotPassword() {
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startResendTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setResendSeconds(120)
    timerRef.current = setInterval(() => {
      setResendSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const handleResendOTP = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const fullPhone = `+92${phone}`
      await authAPI.resendResetOTP({ phone: fullPhone })
      setMessage('New OTP sent to your phone number')
      startResendTimer()
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend OTP')
    } finally {
      setLoading(false)
    }
  }

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    if (phone.length !== 10) {
      setError('Please enter a valid 10-digit phone number')
      setLoading(false)
      return
    }
    try {
      const fullPhone = `+92${phone}`
      await authAPI.forgotPassword({ phone: fullPhone })
      setMessage('OTP sent to your phone number')
      setStep(2)
      startResendTimer()
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to send OTP'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fullPhone = `+92${phone}`
      await authAPI.resetPassword({ phone: fullPhone, otp_code: otp, new_password: newPassword })
      setMessage('Password reset successfully!')
      setTimeout(() => window.location.href = '/login', 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed')
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
                Don't worry,<br />
                <span className="text-accent-400">we've got you.</span>
              </h2>
              <p className="mt-6 text-navy-300 text-lg max-w-sm leading-relaxed">
                Reset your password in seconds — enter your phone number and follow the OTP steps.
              </p>
            </div>
          </div>

          <div className="space-y-4 mt-16">
            {[
              { icon: ShieldCheck, text: 'Secure OTP verification' },
              { icon: KeyRound, text: 'Quick password reset' },
              { icon: CheckCircle2, text: 'Back to your account in no time' },
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
              {step === 1 ? <Lock className="w-6 h-6" /> : <KeyRound className="w-6 h-6" />}
            </span>
            <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">
              {step === 1 ? 'Forgot password?' : 'Reset password'}
            </h1>
            <p className="text-navy-400 mt-2">
              {step === 1
                ? 'Enter your phone number to receive a reset code'
                : 'Enter the OTP and your new password'}
            </p>
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

          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-4">
              <div>
                <label className="input-label">Phone number</label>
                <div className="relative flex">
                  <span className="flex items-center pl-3.5 pr-2 bg-surface-100 border border-r-0 border-surface-200 rounded-l-xl text-sm font-semibold text-navy-600 select-none">
                    +92
                  </span>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-4 py-2.5 bg-surface-0 border border-surface-200 rounded-r-xl text-sm text-navy-900 placeholder-navy-300 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 hover:border-navy-300"
                    placeholder="3XX XXXXXXX"
                    maxLength={10}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                    Sending...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Send reset code
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              <button
                type="button"
                onClick={() => { setStep(1); setError(''); setMessage('') }}
                className="flex items-center gap-2 text-sm text-navy-400 hover:text-accent-600 font-medium transition-colors mb-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Change phone number
              </button>
              <div>
                <label className="input-label">OTP Code</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className={`${inputBase} text-center text-xl tracking-[0.5em] font-mono`}
                    maxLength={6}
                    placeholder="000000"
                    required
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handleResendOTP}
                disabled={loading || resendSeconds > 0}
                className="w-full text-sm text-navy-400 hover:text-accent-600 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {resendSeconds > 0
                  ? `Resend OTP in ${String(Math.floor(resendSeconds / 60)).padStart(2, '0')}:${String(resendSeconds % 60).padStart(2, '0')}`
                  : 'Resend OTP code'}
              </button>

              <div>
                <label className="input-label">New password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputBase} pr-11`}
                    placeholder="Min. 8 characters"
                    required
                    minLength={8}
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

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-base mt-1"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
                    Resetting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    Reset password
                    <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </button>
            </form>
          )}

          <p className="mt-8 text-center text-sm text-navy-400">
            <Link to="/login" className="text-accent-600 hover:text-accent-700 font-semibold inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
