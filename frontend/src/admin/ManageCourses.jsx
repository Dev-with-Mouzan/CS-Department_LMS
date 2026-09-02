import { useState, useEffect } from 'react'
import { coursesAPI, usersAPI, attendanceAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  BookOpen, PlusCircle, Trash2, CalendarDays, Pencil, Power, Search, GraduationCap,
  UserCheck, CheckCircle2, Building2, Download,
} from 'lucide-react'

export default function ManageCourses() {
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ course_code: '', title: '', description: '', teacher_id: '', semester: '' })
  const [downloadingId, setDownloadingId] = useState(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      const [c, t] = await Promise.all([coursesAPI.list(), usersAPI.list({ role: 'teacher' })])
      setCourses(c.data)
      setTeachers(t.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ course_code: '', title: '', description: '', teacher_id: '', semester: '' })
    setShowModal(true)
  }

  const openEdit = (course) => {
    setEditing(course)
    setForm({
      course_code: course.course_code || '',
      title: course.title || '',
      description: course.description || '',
      teacher_id: course.teacher_id || '',
      semester: course.semester || '',
      is_active: course.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { title, description, teacher_id, semester, is_active } = form
        const payload = { title, description, teacher_id, is_active }
        if (semester) payload.semester = parseInt(semester, 10)
        await coursesAPI.update(editing.id, payload)
      } else {
        const payload = { ...form }
        if (payload.semester) payload.semester = parseInt(payload.semester, 10)
        await coursesAPI.create(payload)
      }
      setShowModal(false)
      loadData()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this course?')) return
    try { await coursesAPI.delete(id); loadData() } catch { alert('Failed') }
  }


  const teacherById = (id) => teachers.find((t) => t.id === id)

  const semesters = [...new Set(courses.filter((c) => c.semester).map((c) => c.semester))].sort((a, b) => a - b)

  const filteredCourses = courses.filter((c) => {
    const q = search.trim().toLowerCase()
    const statusMatch = filter === '' || (filter === 'active' && c.is_active) || (filter === 'inactive' && !c.is_active)
    if (!statusMatch) return false
    if (!q) return true
    return (
      `${c.course_code} ${c.title}`.toLowerCase().includes(q) ||
      (c.teacher_id && `${teacherById(c.teacher_id)?.first_name} ${teacherById(c.teacher_id)?.last_name}`.toLowerCase().includes(q))
    )
  })

  const stats = [
    { label: 'Total Courses', value: courses.length, icon: BookOpen, chip: 'bg-navy-900/10 text-navy-800 border-navy-900/10' },
    { label: 'Active', value: courses.filter((c) => c.is_active).length, icon: CheckCircle2, chip: 'bg-success/10 text-success-dark border-success/20' },
    { label: 'Semesters', value: semesters.length, icon: GraduationCap, chip: 'bg-accent-500/10 text-accent-700 border-accent-200' },
    { label: 'Teachers', value: new Set(courses.map((c) => c.teacher_id).filter(Boolean)).size, icon: UserCheck, chip: 'bg-info/10 text-info-dark border-info/20' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <BookOpen className="w-3 h-3" />
          Course Management
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Courses</h1>
        <p className="text-sm text-navy-400 mt-1">
          {courses.length} courses in the CS Department
          {search.trim() || filter ? ` · ${filteredCourses.length} matching` : ''}
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
              <p className="text-2xl font-extrabold text-navy-900 tracking-tight leading-none">{s.value}</p>
              <p className="text-xs font-medium text-navy-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: filters + search + action */}
      <div className="border border-surface-200 rounded-xl bg-white p-3 mb-8 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="inline-flex gap-1 p-1 bg-navy-900/5 rounded-xl self-start lg:self-center">
          {[{ value: '', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }].map((r) => (
            <button key={r.value} onClick={() => setFilter(r.value)}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filter === r.value
                  ? 'bg-navy-900 text-white shadow-md shadow-navy-900/10'
                  : 'text-navy-500 hover:bg-white hover:text-navy-800'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by code, title or teacher..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
          />
        </div>
        <Button onClick={openCreate} className="lg:self-center">
          <PlusCircle className="w-4 h-4" />
          New Course
        </Button>
      </div>

      {/* Table */}
      <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50/60">
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Course</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Teacher</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Created</th>
                <th className="px-6 py-4 text-right text-2xs font-bold text-navy-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="w-9 h-9 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
                      <BookOpen className="w-6 h-6" />
                    </span>
                    <p className="text-navy-500 text-sm font-medium">No courses found matching your criteria.</p>
                  </td>
                </tr>
              ) : filteredCourses.map((course) => {
                const t = teacherById(course.teacher_id)
                return (
                  <tr key={course.id} className="hover:bg-surface-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-800 to-navy-950 flex items-center justify-center shrink-0">
                          <BookOpen className="w-4.5 h-4.5 text-accent-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-navy-900 truncate">{course.title}</p>
                          <p className="text-2xs font-mono text-navy-300">{course.course_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {course.semester ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold bg-accent-500/10 text-accent-700 border border-accent-200">
                          <GraduationCap className="w-3 h-3" />
                          Semester {course.semester}
                        </span>
                      ) : (
                        <span className="text-2xs text-navy-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {t ? (
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-info to-info-dark flex items-center justify-center shrink-0">
                            <span className="text-white text-[10px] font-bold">{t.first_name?.[0]}{t.last_name?.[0]}</span>
                          </span>
                          <span className="text-sm text-navy-600">{t.first_name} {t.last_name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-navy-300">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold border ${
                        course.is_active
                          ? 'bg-success-light text-success-dark border-success/20'
                          : 'bg-surface-100 text-navy-400 border-surface-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${course.is_active ? 'bg-success' : 'bg-navy-300'}`} />
                        {course.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-navy-400 font-medium">
                        <CalendarDays className="w-3.5 h-3.5 text-navy-300" />
                        {new Date(course.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => openEdit(course)} title="Edit"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-500 border border-surface-200 bg-white hover:bg-surface-50 hover:text-navy-900 transition-all">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={async () => {
                            setDownloadingId(course.id)
                            try {
                              const now = new Date()
                              const res = await attendanceAPI.exportExcel(
                                course.id,
                                now.getFullYear(),
                                now.getMonth() + 1
                              )
                              const url = window.URL.createObjectURL(new Blob([res.data]))
                              const link = document.createElement('a')
                              link.href = url
                              link.setAttribute('download', `Attendance_${course.course_code}_${now.toLocaleString('default', { month: 'long' })}_${now.getFullYear()}.xlsx`)
                              document.body.appendChild(link)
                              link.click()
                              link.remove()
                              window.URL.revokeObjectURL(url)
                            } catch {
                              alert('Failed to download Excel')
                            } finally {
                              setDownloadingId(null)
                            }
                          }}
                          title="Download Attendance Excel"
                          disabled={downloadingId === course.id}
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-600 border border-accent-200 bg-white hover:bg-accent-50 transition-all disabled:opacity-50"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>

                        <button onClick={() => handleDelete(course.id)} title="Delete"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-all">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Course' : 'Create Course'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Course code</label>
              <input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })}
                className={`input-field ${editing ? 'bg-surface-50' : ''}`} placeholder="CS101"
                required disabled={editing} />
            </div>
            <div>
              <label className="input-label">Title</label>
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field" required />
            </div>
          </div>
          <div>
            <label className="input-label">Description</label>
            <textarea value={form.description} rows={3} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none" />
          </div>
          <div>
            <label className="input-label">Semester</label>
            <input type="number" value={form.semester} min={1} max={8}
              onChange={(e) => setForm({ ...form, semester: e.target.value })}
              className="input-field" placeholder="1 – 8" required />
            <p className="text-2xs text-navy-400 mt-1">Students in this semester are auto-enrolled on account verification.</p>
          </div>
          <div>
            <label className="input-label">Assigned teacher</label>
            <select value={form.teacher_id} onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
              className="input-field">
              <option value="">Select teacher</option>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
            </select>
          </div>
          {editing && (
            <label className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-surface-50 cursor-pointer">
              <span className="text-sm font-medium text-navy-700">Course active</span>
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="w-4 h-4 accent-accent-500" />
            </label>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit">{editing ? 'Save Changes' : 'Create Course'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}