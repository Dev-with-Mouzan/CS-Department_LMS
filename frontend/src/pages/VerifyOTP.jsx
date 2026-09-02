import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import { ShieldCheck, Terminal } from 'lucide-react'

export default function VerifyOTP() {
  const [otp, setOtp] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [verified, setVerified] = useState(false)
  const { user } = useAuth()
  const navigate = useNavigate()

  const handleVerify = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authAPI.verifyOTP({ email: user?.email, otp_code: otp })
      setVerified(true)
      setMessage('Account verified successfully!')
      setTimeout(() => {
        const routes = { admin: '/admin', teacher: '/teacher', student: '/student' }
        navigate(routes[user?.role] || '/')
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
      await authAPI.resendOTP({ email: user?.email })
      setMessage('New OTP sent — check the server terminal for the code (test mode)')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to resend')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 p-8">
      <div className="w-full max-w-sm animate-fade-in">
        <div className="flex items-center gap-3 mb-10">
          <img src="/college-logo.png" alt="GGCB Logo" className="w-8 h-8 rounded-lg object-cover" />
          <span className="text-xl font-bold text-navy-900 tracking-tight">CS Department LMS</span>
        </div>

        <div className="text-center mb-8">
          <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 mb-5">
            <ShieldCheck className="w-6 h-6" />
          </span>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">Verify your account</h1>
          <p className="text-navy-400 mt-2 text-sm">
            Enter the 6-digit OTP
            {user?.phone ? ` sent to ${user.phone}` : ''}
          </p>
          <p className="text-2xs text-navy-300 mt-1.5 bg-surface-100 border border-surface-200 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            <Terminal className="w-3 h-3 text-accent-600" />
            Test mode: the code is printed on the server terminal.
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

        {!verified && (
          <form onSubmit={handleVerify} className="space-y-5">
            <div>
              <label className="input-label">OTP Code</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono py-4"
                maxLength={6} placeholder="000000" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Verifying...' : 'Verify account'}
            </button>
          </form>
        )}

        <button onClick={handleResend} disabled={loading}
          className="w-full mt-4 text-sm text-navy-400 hover:text-accent-600 font-medium transition-colors">
          Resend OTP code
        </button>
      </div>
    </div>
  )
}
