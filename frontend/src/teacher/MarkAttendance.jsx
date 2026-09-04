import { useState, useEffect } from 'react'
import { coursesAPI, attendanceAPI } from '../services/api'
import Button from '../components/Button'
import {
  CalendarCheck, BookOpen, CheckCircle2, XCircle, Users, Save, Download,
} from 'lucide-react'

const statusStyles = {
  present: 'bg-emerald-500 text-white border-emerald-500',
  absent: 'bg-red-500 text-white border-red-500',
  late: 'bg-amber-50 text-amber-600 border-amber-200',
}

export default function MarkAttendance() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [students, setStudents] = useState([])
  const [attendance, setAttendance] = useState({})
  const [topic, setTopic] = useState('')
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => { coursesAPI.list().then(r => setCourses(r.data)).catch(console.error).finally(() => setLoading(false)) }, [])

  const loadStudents = async (courseId) => {
    try {
      const r = await coursesAPI.listEnrollments(courseId)
      setStudents(r.data)
      const init = {}; r.data.forEach(e => { init[e.student_id] = 'absent' }); setAttendance(init)
    } catch (err) { console.error(err) }
  }

  const handleCourseSelect = (c) => { setSelectedCourse(c); loadStudents(c.id); setMessage('') }

  const handleSubmit = async () => {
    if (!attendanceDate) {
      setMessage('Please select an attendance date')
      return
    }
    setSubmitting(true)
    try {
      const now = new Date()
      const session = await attendanceAPI.createSession({
        course_id: selectedCourse.id,
        session_date: attendanceDate,
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
  const absentCount = students.length - presentCount - lateCount

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <CalendarCheck className="w-3 h-3" />
          Attendance
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Mark Attendance</h1>
        <p className="text-sm text-navy-400 mt-1">Select a course and record student attendance.</p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium border ${
          message.includes('success')
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-red-50 text-red-600 border-red-200'
        }`}>
          {message.includes('success') ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 mt-0.5 shrink-0" />}
          {message}
        </div>
      )}

      {/* Course selector */}
      <div className="flex gap-2 mb-6 flex-wrap justify-center">
        {loading ? (
          <span className="text-sm text-navy-400">Loading courses...</span>
        ) : courses.map(c => (
          <button key={c.id} onClick={() => handleCourseSelect(c)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold border transition-colors ${
              selectedCourse?.id === c.id
                ? 'bg-accent-500 text-white border-accent-500'
                : 'bg-white text-navy-600 border-surface-200 hover:border-accent-300'
            }`}>
            <BookOpen className="w-3.5 h-3.5" />
            {c.course_code}
          </button>
        ))}
      </div>

      {selectedCourse && (
        <>
          {/* Date + Topic inputs */}
          <div className="mb-5 max-w-md mx-auto space-y-4">
            <div>
              <label className="input-label">Attendance Date <span className="text-red-500">*</span></label>
              <input type="date" value={attendanceDate} onChange={(e) => setAttendanceDate(e.target.value)}
                required className="input-field" />
            </div>
            <div>
              <label className="input-label">Session topic (optional)</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Chapter 5 - Data Structures"
                className="input-field" />
            </div>
          </div>

          {/* Stats bar */}
          <div className="flex gap-3 mb-4 justify-center flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-600 text-xs font-semibold border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {presentCount} present
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-600 text-xs font-semibold border border-amber-200">
              {lateCount} late
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-100 text-navy-500 text-xs font-semibold border border-surface-200">
              {absentCount} absent
            </span>
          </div>

          {/* Student list */}
          <div className="border border-surface-200 rounded-xl bg-white mb-6">
            <div className="px-5 py-3 border-b border-surface-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-navy-500 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                {students.length} students
              </span>
            </div>
            <div className="divide-y divide-surface-200">
              {students.map((e, i) => (
                <div key={e.student_id} className="flex items-center justify-between px-5 py-3 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-lg bg-surface-100 flex items-center justify-center text-[10px] font-bold text-navy-500 shrink-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{e.student_name || 'Unknown Student'}</p>
                      {e.roll_number && (
                        <p className="text-2xs text-navy-400 font-mono">{e.roll_number}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {['present', 'absent', 'late'].map((s) => (
                      <button key={s} onClick={() => setAttendance({ ...attendance, [e.student_id]: s })}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors ${
                          attendance[e.student_id] === s ? statusStyles[s] : 'bg-white text-navy-400 border-surface-200 hover:bg-surface-50'
                        }`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Save + Download buttons */}
          <div className="flex justify-center gap-3">
            <Button onClick={handleSubmit} disabled={submitting || !attendanceDate}>
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Save Attendance'}
            </Button>
            <button
              onClick={async () => {
                setDownloading(true)
                try {
                  const now = new Date()
                  const res = await attendanceAPI.exportExcel(
                    selectedCourse.id,
                    now.getFullYear(),
                    now.getMonth() + 1
                  )
                  const url = window.URL.createObjectURL(new Blob([res.data]))
                  const link = document.createElement('a')
                  link.href = url
                  link.setAttribute('download', `Attendance_${selectedCourse.course_code}_${now.toLocaleString('default', { month: 'long' })}_${now.getFullYear()}.xlsx`)
                  document.body.appendChild(link)
                  link.click()
                  link.remove()
                  window.URL.revokeObjectURL(url)
                } catch (err) {
                  alert('Failed to download Excel')
                } finally {
                  setDownloading(false)
                }
              }}
              disabled={downloading}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-white text-navy-700 border border-surface-200 hover:bg-surface-50 hover:border-accent-300 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'Downloading...' : 'Download Excel'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
