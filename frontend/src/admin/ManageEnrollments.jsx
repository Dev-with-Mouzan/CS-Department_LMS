import { useState, useEffect } from 'react'
import { coursesAPI, usersAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { UserPlus, BookOpen, Users, GraduationCap, CalendarDays, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function ManageEnrollments() {
  const [courses, setCourses] = useState([])
  const [students, setStudents] = useState([])
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ student_id: '' })
  const [loading, setLoading] = useState(true)
  const [loadingEnroll, setLoadingEnroll] = useState(false)

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

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <Users className="w-3 h-3" />
          Enrollment Management
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Enrollments</h1>
        <p className="text-navy-400 mt-1.5">Enroll students into CS department courses.</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <Button onClick={() => { setShowModal(true); setForm({ student_id: '' }) }} disabled={!selectedCourse}>
          <UserPlus className="w-4 h-4" />
          Enroll Student
        </Button>
      </div>

      {/* Summary chips */}
      {courses.length > 0 && !loading && (
        <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-surface-200 text-xs font-semibold text-navy-600 shadow-sm">
            <BookOpen className="w-3.5 h-3.5 text-accent-600" />
            {courses.length} Courses
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-surface-200 text-xs font-semibold text-navy-600 shadow-sm">
            <Users className="w-3.5 h-3.5 text-success-dark" />
            {students.length} Students
          </span>
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-surface-200 text-xs font-semibold text-navy-600 shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-info" />
            {enrollments.length} Total Enrolled
          </span>
        </div>
      )}

      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 border-dashed p-16 text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
            <BookOpen className="w-7 h-7" />
          </span>
          <p className="text-navy-500 text-sm font-medium">No courses yet. Create a course to start enrolling students.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Course list */}
          <div className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <span className="inline-flex w-7 h-7 rounded-lg bg-navy-900/5 text-navy-600 items-center justify-center">
                <BookOpen className="w-3.5 h-3.5" />
              </span>
              <h2 className="text-sm font-bold text-navy-700 uppercase tracking-wider">Courses</h2>
            </div>
            <p className="text-xs text-navy-400 mb-4 pl-9">Select a course to view its enrolled students.</p>
            <div className="space-y-3">
              {courses.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCourse(c.id)}
                  className={`w-full flex items-center gap-4 p-4 rounded-2xl border text-left transition-all duration-300 group ${
                    selectedCourse === c.id
                      ? 'border-accent-500 bg-accent-500/5 shadow-md shadow-accent-500/10'
                      : 'border-surface-200 bg-white hover:border-accent-300 hover:shadow-card hover:-translate-y-0.5'
                  }`}
                >
                  <span className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                    selectedCourse === c.id ? 'bg-accent-500 text-white' : 'bg-navy-900/5 text-navy-600 group-hover:bg-navy-900/10'
                  }`}>
                    <BookOpen className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-navy-900 truncate">{c.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-2xs font-mono text-navy-400">{c.course_code}</span>
                      <span className={`h-1.5 w-1.5 rounded-full ${c.is_active ? 'bg-success' : 'bg-danger'}`} />
                    </div>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 transition-all ${
                    selectedCourse === c.id ? 'text-accent-600 group-hover:translate-x-0.5' : 'text-navy-300 group-hover:text-accent-500 group-hover:translate-x-0.5'
                  }`} />
                </button>
              ))}
            </div>
          </div>

          {/* Enrolled students */}
          <div className="lg:col-span-3">
            {!selectedCourse ? (
              <div className="h-full bg-white rounded-2xl border border-surface-200 border-dashed p-16 text-center flex flex-col items-center justify-center">
                <span className="inline-flex w-14 h-14 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-4">
                  <Users className="w-7 h-7" />
                </span>
                <p className="text-navy-500 text-sm font-medium">Select a course to view its enrolled students.</p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-surface-200 shadow-card overflow-hidden">
                {/* Course header */}
                <div className="px-6 py-5 border-b border-surface-100 bg-surface-50/60 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-11 h-11 rounded-xl bg-accent-500/10 text-accent-600 border border-accent-200 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </span>
                    <div>
                      <h2 className="text-base font-bold text-navy-900 tracking-tight">{course?.title}</h2>
                      <p className="text-2xs font-mono text-navy-400 mt-0.5">{course?.course_code}</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-success/20 bg-success-light text-success-dark text-2xs font-bold">
                    <GraduationCap className="w-3.5 h-3.5" />
                    {enrollments.length} enrolled
                  </span>
                </div>

                <div className="overflow-x-auto">
                  {loadingEnroll ? (
                    <div className="p-16 text-center">
                      <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin mx-auto" />
                    </div>
                  ) : enrollments.length === 0 ? (
                    <div className="p-16 text-center">
                      <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
                        <Users className="w-6 h-6" />
                      </span>
                      <p className="text-navy-500 text-sm font-medium">No students enrolled yet.</p>
                      <button onClick={() => setShowModal(true)} className="mt-3 text-xs font-bold text-accent-600 hover:text-accent-700 transition-colors">
                        Enroll a student +
                      </button>
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-surface-200 bg-surface-50">
                          <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Student</th>
                          <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Email</th>
                          <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Enrolled</th>
                          <th className="px-6 py-3.5 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-100">
                        {enrollments.map((en) => {
                          const s = studentById(en.student_id)
                          return (
                            <tr key={en.id} className="hover:bg-surface-50 transition-colors">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                                    <span className="text-navy-950 text-xs font-bold">{(s?.first_name?.[0] || '?')}{(s?.last_name?.[0] || '')}</span>
                                  </div>
                                  <span className="text-sm font-semibold text-navy-900">{s?.first_name} {s?.last_name}</span>
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
            )}
          </div>
        </div>
      )}

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