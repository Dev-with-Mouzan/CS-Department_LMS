import { useState, useEffect } from 'react'
import { coursesAPI, attendanceAPI } from '../services/api'
import Button from '../components/Button'
import {
  CalendarCheck,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Save,
  Hash,
} from 'lucide-react'

const statusStyles = {
  present: 'bg-success text-white border-success shadow-md shadow-success/20',
  absent: 'bg-danger-light text-danger-dark border-danger/20',
  late: 'bg-warning-light text-warning-dark border-warning/20',
}

export default function MarkAttendance() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [topic, setTopic] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => { coursesAPI.list().then(r => setCourses(r.data)).catch(console.error).finally(() => setLoading(false)) }, [])

  const loadStudents = async (courseId) => {
    try {
      const r = await coursesAPI.listEnrollments(courseId)
      setStudents(r.data)
      const init = {}; r.data.forEach(e => { init[e.student_id] = 'absent' }); setAttendance(init)
    } catch (err) { console.error(err) }
  }

  const handleCourseSelect = (c) => { setSelectedCourse(c); loadStudents(c.id); setMessage('') }

  const toggleStatus = (id) => {
    const cur = attendance[id]
    setAttendance({ ...attendance, [id]: cur === 'present' ? 'absent' : cur === 'absent' ? 'late' : 'present' })
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const now = new Date()
      const session = await attendanceAPI.createSession({
        course_id: selectedCourse.id,
        session_date: now.toISOString().split('T')[0],
        start_time: now.toTimeString().slice(0, 5),
        topic: topic || null,
      })
      const records = Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }))
      await attendanceAPI.markAttendance(session.data.id, { records })
      setMessage('Attendance saved successfully!')
      setTopic('')
    } catch (err) {
      setMessage('Failed: ' + (err.response?.data?.detail || err.message))
    } finally { setSubmitting(false) }
  }

  const presentCount = Object.values(attendance).filter(s => s === 'present').length
  const lateCount = Object.values(attendance).filter(s => s === 'late').length

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <CalendarCheck className="w-3 h-3" />
          Attendance Record
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Mark Attendance</h1>
        <p className="text-navy-400 mt-1.5">Select a course and record student attendance</p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium ${
          message.includes('success') ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
        }`}>
          {message.includes('success') ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {message}
        </div>
      )}

      {/* Course tabs */}
      <div className="flex justify-center gap-1.5 mb-8 flex-wrap">
        {loading ? <span className="text-navy-300 text-sm">Loading courses...</span> : courses.map(c => (
          <button key={c.id} onClick={() => handleCourseSelect(c)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              selectedCourse?.id === c.id
                ? 'bg-navy-900 text-white shadow-md shadow-navy-900/10'
                : 'bg-white border border-surface-200 text-navy-500 hover:bg-surface-100'
            }`}>
            <BookOpen className="w-3.5 h-3.5" />
            {c.course_code}
          </button>
        ))}
      </div>

      {selectedCourse && (
        <>
          <div className="mb-5 max-w-md mx-auto">
            <label className="input-label">Session topic (optional)</label>
            <div className="relative">
              <Hash className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={topic} onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Chapter 5 — Data Structures"
                className="input-field pl-10" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden mb-6">
            <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/60 flex flex-wrap items-center justify-between gap-3">
              <span className="inline-flex items-center gap-1.5 text-2xs font-bold text-navy-500 uppercase tracking-wider">
                <Users className="w-3.5 h-3.5" />
                {students.length} students
              </span>
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-light text-success-dark text-2xs font-bold border border-success/20">
                  <CheckCircle2 className="w-3 h-3" />
                  {presentCount} present
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-light text-warning-dark text-2xs font-bold border border-warning/20">
                  <Clock className="w-3 h-3" />
                  {lateCount} late
                </span>
              </div>
            </div>
            <div className="divide-y divide-surface-100">
              {students.map(e => (
                <div key={e.student_id} className="flex items-center justify-between px-6 py-3 hover:bg-surface-50 transition-colors">
                  <span className="inline-flex items-center gap-3 text-sm font-mono text-navy-600">
                    <span className={`w-2.5 h-2.5 rounded-full ${attendance[e.student_id] === 'present' ? 'bg-success' : attendance[e.student_id] === 'late' ? 'bg-warning' : 'bg-danger'}`} />
                    {e.student_id.slice(0, 8)}...
                  </span>
                  <div className="flex gap-1.5">
                    {['present', 'absent', 'late'].map((s) => (
                      <button key={s} onClick={() => setAttendance({ ...attendance, [e.student_id]: s })}
                        className={`px-3 py-1.5 rounded-lg text-2xs font-bold border transition-all ${
                          attendance[e.student_id] === s ? statusStyles[s] : 'bg-surface-100 text-navy-400 border-transparent hover:bg-surface-200'
                        }`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center">
            <Button onClick={handleSubmit} disabled={submitting}>
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Attendance'}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}