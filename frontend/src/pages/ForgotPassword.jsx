import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authAPI } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRequestReset = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authAPI.forgotPassword({ email })
      setMessage('If the email exists, an OTP has been sent')
      setStep(2)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authAPI.resetPassword({ email, otp_code: otp, new_password: newPassword })
      setMessage('Password reset successfully!')
      setTimeout(() => window.location.href = '/login', 1500)
    } catch (err) {
      setError(err.response?.data?.detail || 'Reset failed')
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

        <div className="mb-8">
          <h1 className="text-display-sm text-navy-900 tracking-tight">Reset password</h1>
          <p className="text-navy-400 mt-1">
            {step === 1 ? 'Enter your email to receive a reset code' : 'Enter the OTP and your new password'}
          </p>
        </div>

        {message && (
          <div className="bg-success-light text-success-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium">
            {message}
          </div>
        )}
        {error && (
          <div className="bg-danger-light text-danger-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium">
            {error}
          </div>
        )}

        {step === 1 ? (
          <form onSubmit={handleRequestReset} className="space-y-5">
            <div>
              <label className="input-label">Email address</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                className="input-field" placeholder="you@example.com" required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Sending...' : 'Send reset code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-5">
            <div>
              <label className="input-label">OTP Code</label>
              <input value={otp} onChange={(e) => setOtp(e.target.value)}
                className="input-field text-center text-xl tracking-[0.5em] font-mono py-3"
                maxLength={6} placeholder="000000" required />
            </div>
            <div>
              <label className="input-label">New password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="input-field" placeholder="Min. 6 characters" required minLength={6} />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-base">
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-sm">
          <Link to="/login" className="text-navy-400 hover:text-accent-600 font-medium transition-colors">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
