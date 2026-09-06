import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      loadUser()
    } else {
      setLoading(false)
    }
  }, [])

  const loadUser = async () => {
    try {
      const res = await authAPI.getMe()
      setUser(res.data)
    } catch {
      logout()
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password })
    const { access_token } = res.data
    localStorage.setItem('token', access_token)
    setToken(access_token)
    const userData = await fetchFullProfile({ id: res.data.user_id, role: res.data.role, is_verified: res.data.is_verified, email })
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
    return res.data
  }

  const fetchFullProfile = async (fallback) => {
    try {
      const me = await authAPI.getMe()
      if (me.data) return me.data
    } catch {
      // keep working with the minimal login payload if profile fetch fails
    }
    return fallback
  }

  const register = async (data) => {
    const res = await authAPI.register(data)
    // Don't auto-login — store email/phone for the OTP screen
    localStorage.setItem('pendingVerification', JSON.stringify({ email: data.email, phone: data.phone }))
    return res.data
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('pendingVerification')
    setToken(null)
    setUser(null)
  }

  const loginAfterVerify = async (access_token, user_id, role, is_verified, email) => {
    localStorage.setItem('token', access_token)
    setToken(access_token)
    const userData = await fetchFullProfile({ id: user_id, role, is_verified, email })
    localStorage.setItem('user', JSON.stringify(userData))
    localStorage.removeItem('pendingVerification')
    setUser(userData)
  }

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    loginAfterVerify,
    isAdmin: user?.role === 'admin',
    isTeacher: user?.role === 'teacher',
    isStudent: user?.role === 'student',
    isAuthenticated: !!token && !!user,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
