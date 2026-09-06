import { useState, useEffect } from 'react'
import { coursesAPI, usersAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  UserPlus, BookOpen, Users, GraduationCap, CalendarDays, CheckCircle2, Search, Layers,
} from 'lucide-react'

export default function ManageEnrollments() {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ student_id: '' })
  const [loading, setLoading] = useState(true)
  const [loadingEnroll, setLoadingEnroll] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [c, s] = await Promise.all([coursesAPI.list(), usersAPI.list({ role: 'student' })])
      setCourses(c.data)
      setStudents(s.data)
      if (c.data.length > 0 && !selectedCourse) {
        setSelectedCourse(c.data[0].id)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadEnrollments = async (courseId) => {
    if (!courseId) return
    try {
      const res = await coursesAPI.listEnrollments(courseId)
      setEnrollments(res.data)
    } catch (err) { console.error(err) }
  }

  const selectCourse = (courseId) => {
    setSelectedCourse(courseId)
    loadEnrollments(courseId)
  }

  useEffect(() => {
    if (selectedCourse) loadEnrollments(selectedCourse)
  }, [selectedCourse])

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!form.student_id) return
    setLoadingEnroll(true)
    try {
      await coursesAPI.enroll(selectedCourse, { student_id: form.student_id })
      setShowModal(false)
      setForm({ student_id: '' })
      loadEnrollments(selectedCourse)
    } catch (err) { alert(err.response?.data?.detail || 'Failed to enroll student') }
    finally { setLoadingEnroll(false) }
  }

  const studentById = (id) => students.find((s) => s.id === id)
  const course = courses.find((c) => c.id === selectedCourse)
  const enrolledIds = enrollments.map((en) => en.student_id)
  const availableStudents = students.filter((s) => !enrolledIds.includes(s.id))

  const filteredEnrollments = enrollments.filter((en) => {
    const q = search.trim().toLowerCase()
    const s = studentById(en.student_id)
    if (!q) return true
    return (
      `${s?.first_name || ''} ${s?.last_name || ''}`.toLowerCase().includes(q) ||
      (s?.phone || '').toLowerCase().includes(q) ||
      (s?.email || '').toLowerCase().includes(q)
    )
  })

  const stats = [
    { label: 'Courses', value: courses.length, icon: BookOpen, chip: 'bg-navy-900/10 text-navy-800 border-navy-900/10' },
    { label: 'Students', value: students.length, icon: Users, chip: 'bg-success/10 text-success-dark border-success/20' },
    { label: 'Enrolled', value: enrollments.length, icon: CheckCircle2, chip: 'bg-accent-500/10 text-accent-700 border-accent-200' },
    { label: 'Course Semester', value: course?.semester ? `Sem ${course.semester}` : '—', icon: Layers, chip: 'bg-info/10 text-info-dark border-info/20' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Users className="w-3 h-3" />
          Enrollment Management
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Enrollments</h1>
        <p className="text-sm text-navy-400 mt-1">
          {enrollments.length} enrolled in {course ? `${course.course_code} — ${course.title}` : 'selected course'}
          {search.trim() ? ` · ${filteredEnrollments.length} matching` : ''}
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="border border-surface-200 rounded-xl bg-white p-4 flex items-center gap-3">
            <span className={`inline-flex w-11 h-11 rounded-xl border items-center justify-center shrink-0 ${s.chip}`}>
              <s.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-navy-900 tracking-tight leading-none truncate">{s.value}</p>
              <p className="text-xs font-medium text-navy-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: course select + search + action */}
      <div className="border border-surface-200 rounded-xl bg-white p-3 mb-8 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="lg:w-72">
          <select value={selectedCourse || ''} onChange={(e) => selectCourse(e.target.value)}
            className="w-full px-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all">
            <option value="">Select course</option>
            {courses.map((c) => <option key={c.id} value={c.id}>{c.course_code} — {c.title}</option>)}
          </select>
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search enrolled students by name, phone or email..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
          />
        </div>
        <Button onClick={() => { setShowModal(true); setForm({ student_id: '' }) }} disabled={!selectedCourse} className="lg:self-center">
          <UserPlus className="w-4 h-4" />
          Enroll Student
        </Button>
      </div>

      {/* Table */}
      <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
        {/* Course header */}
        {course && (
          <div className="px-6 py-5 border-b border-surface-100 bg-surface-50/60 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="w-11 h-11 rounded-xl bg-accent-500/10 text-accent-600 border border-accent-200 flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-base font-bold text-navy-900 tracking-tight">{course.title}</h2>
                <p className="text-2xs font-mono text-navy-400 mt-0.5">Semester {course.semester || '—'} · {course.course_code}</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-success/20 bg-success-light text-success-dark text-2xs font-bold">
              <GraduationCap className="w-3.5 h-3.5" />
              {enrollments.length} enrolled
            </span>
          </div>
        )}

        <div className="overflow-x-auto">
          {loadingEnroll ? (
            <div className="p-16 text-center">
              <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin mx-auto" />
            </div>
          ) : !selectedCourse ? (
            <div className="p-16 text-center">
              <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </span>
              <p className="text-navy-500 text-sm font-medium">Select a course to view its enrolled students.</p>
            </div>
          ) : filteredEnrollments.length === 0 ? (
            <div className="p-16 text-center">
              <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
                <Users className="w-6 h-6" />
              </span>
              <p className="text-navy-500 text-sm font-medium">
                {search.trim() ? 'No enrolled students found matching your criteria.' : 'No students enrolled yet.'}
              </p>
              {!search.trim() && (
                <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-bold text-accent-600 hover:text-accent-700 transition-colors">
                  Enroll a student +
                </button>
              )}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-50/60">
                  <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Enrolled</th>
                  <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filteredEnrollments.map((en) => {
                  const s = studentById(en.student_id)
                  return (
                    <tr key={en.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0">
                            <span className="text-navy-950 text-xs font-bold">{(s?.first_name?.[0] || '?')}{(s?.last_name?.[0] || '')}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy-900 truncate">{s?.first_name} {s?.last_name}</p>
                            <p className="text-2xs font-mono text-navy-300">{s?.phone || (s?.email || '—')}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-navy-500">{s?.email || '—'}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs text-navy-400 font-medium">
                          <CalendarDays className="w-3.5 h-3.5 text-accent-500" />
                          {new Date(en.enrollment_date).toLocaleDateString()}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold ${
                          en.status === 'active'
                            ? 'bg-success-light text-success-dark border border-success/20'
                            : 'bg-surface-100 text-navy-400 border border-surface-200'
                        }`}>
                          <CheckCircle2 className={`w-3 h-3 ${en.status === 'active' ? 'text-success' : 'text-navy-300'}`} />
                          {en.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Enroll Student">
        <form onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className="input-label">Course</label>
            <input value={`${course?.course_code} — ${course?.title}`} className="input-field bg-surface-50" disabled readOnly />
          </div>
          <div>
            <label className="input-label">Student</label>
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} className="input-field" required>
              <option value="">Select a student</option>
              {availableStudents.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name} — {s.email}</option>)}
            </select>
            {availableStudents.length === 0 && (
              <p className="text-2xs text-navy-400 mt-1.5">All students are already enrolled in this course.</p>
            )}
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={availableStudents.length === 0 || loadingEnroll}>Enroll Student</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}