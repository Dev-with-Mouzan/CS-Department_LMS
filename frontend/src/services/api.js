import axios from 'axios'

const API_BASE_URL = '/api'

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Handle 401 errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginAttempt = error.config?.url?.includes('/auth/login') ||
      error.config?.url?.includes('/auth/verify-otp') ||
      error.config?.url?.includes('/auth/resend-otp')
    if (error.response?.status === 401 && !isLoginAttempt) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// ── Auth API ─────────────────────────────────────────
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  verifyOTP: (data) => api.post('/auth/verify-otp', data),
  resendOTP: (data) => api.post('/auth/resend-otp', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  getMe: () => api.get('/auth/me'),
}

// ── Users API ────────────────────────────────────────
export const usersAPI = {
  list: (params) => api.get('/users/', { params }),
  get: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users/', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  hardDelete: (id) => api.delete(`/users/${id}/hard`),
  setPassword: (id, data) => api.put(`/users/${id}/password`, data),
  getStats: () => api.get('/users/stats/dashboard'),
  listTeachers: () => api.get('/users/teachers'),
  getTeacher: (id) => api.get(`/users/teachers/${id}`),
  createTeacher: (data) => api.post('/users/teachers', data),
  updateTeacher: (id, data) => api.put(`/users/teachers/${id}`, data),
  deleteTeacher: (id) => api.delete(`/users/teachers/${id}`),
  hardDeleteTeacher: (id) => api.delete(`/users/teachers/${id}/hard`),
  listSemesters: () => api.get('/users/semesters'),
}

// ── Courses API ──────────────────────────────────────
export const coursesAPI = {
  list: (params) => api.get('/courses/', { params }),
  get: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses/', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  enroll: (courseId, data) => api.post(`/courses/${courseId}/enroll`, data),
  listEnrollments: (courseId) => api.get(`/courses/${courseId}/enrollments`),
}

// ── Assignments API ──────────────────────────────────
export const assignmentsAPI = {
  list: (params) => api.get('/assignments', { params }),
  get: (id) => api.get(`/assignments/${id}`),
  create: (data) => {
    if (data instanceof FormData) {
      return api.post('/assignments', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
    }
    return api.post('/assignments', data)
  },
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  submit: (assignmentId, file) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post(`/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
  listSubmissions: (assignmentId) => api.get(`/assignments/${assignmentId}/submissions`),
  grade: (submissionId, data) => api.put(`/submissions/${submissionId}/grade`, data),
}

// ── Attendance API ───────────────────────────────────
export const attendanceAPI = {
  createSession: (data) => api.post('/attendance/sessions', data),
  listSessions: (params) => api.get('/attendance/sessions', { params }),
  markAttendance: (sessionId, data) => api.post(`/attendance/sessions/${sessionId}/records`, data),
  getSessionRecords: (sessionId) => api.get(`/attendance/sessions/${sessionId}/records`),
  getPercentage: (studentId, courseId) =>
    api.get(`/attendance/student/${studentId}/course/${courseId}`),
  exportExcel: (courseId, year, month) =>
    api.get(`/attendance/export/${courseId}`, {
      params: { year, month },
      responseType: 'blob',
    }),
}

// ── Notices API ───────────────────────────────────────
export const noticesAPI = {
  list: (params) => api.get('/notices/', { params }),
  get: (id) => api.get(`/notices/${id}`),
  create: (formData) => api.post('/notices/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id, formData) => api.put(`/notices/${id}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/notices/${id}`),
}

// ── Study Materials API ───────────────────────────────
export const materialsAPI = {
  list: (params) => api.get('/materials/', { params }),
  upload: (formData) => api.post('/materials/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/materials/${id}`),
}

// ── Results API ────────────────────────────────────────
export const resultsAPI = {
  list: (params) => api.get('/results/', { params }),
  create: (formData) => api.post('/results/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id) => api.delete(`/results/${id}`),
}

// ── Quizzes API ───────────────────────────────────────
export const quizzesAPI = {
  list: (params) => api.get('/quizzes', { params }),
  get: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
}

// ── Reviews API ───────────────────────────────────
export const reviewsAPI = {
  listPublic: (limit) => api.get('/reviews/public', { params: { limit } }),
  listMine: () => api.get('/reviews/'),
  create: (data) => api.post('/reviews/', data),
  update: (id, data) => api.put(`/reviews/${id}`, data),
  delete: (id) => api.delete(`/reviews/${id}`),
}

export default api
