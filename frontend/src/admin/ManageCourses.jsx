import { useState, useEffect } from 'react'
import { coursesAPI, usersAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import { BookOpen, PlusCircle, Trash2, CalendarDays, Pencil, Power } from 'lucide-react'

export default function ManageCourses() {
  const [courses, setCourses] = useState([])
  const [teachers, setTeachers] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ course_code: '', title: '', description: '', teacher_id: '' })

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
    setForm({ course_code: '', title: '', description: '', teacher_id: '' })
    setShowModal(true)
  }

  const openEdit = (course) => {
    setEditing(course)
    setForm({
      course_code: course.course_code || '',
      title: course.title || '',
      description: course.description || '',
      teacher_id: course.teacher_id || '',
      is_active: course.is_active,
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editing) {
        const { title, description, teacher_id, is_active } = form
        await coursesAPI.update(editing.id, { title, description, teacher_id, is_active })
      } else {
        await coursesAPI.create(form)
      }
      setShowModal(false)
      loadData()
    } catch (err) { alert(err.response?.data?.detail || 'Failed') }
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this course?')) return
    try { await coursesAPI.delete(id); loadData() } catch { alert('Failed') }
  }

  const handleToggleActive = async (course) => {
    try {
      await coursesAPI.update(course.id, { is_active: !course.is_active })
      loadData()
    } catch { alert('Failed') }
  }

  return (
    <div className="p-6 lg:p-10 max-w-7xl">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-accent-200 bg-accent-50 text-accent-700 text-[11px] font-bold uppercase tracking-widest mb-3">
          <BookOpen className="w-3 h-3" />
          Course Management
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Courses</h1>
        <p className="text-navy-400 mt-1.5">{courses.length} courses in the CS Department</p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <Button onClick={openCreate}>
          <PlusCircle className="w-4 h-4" />
          New Course
        </Button>
      </div>

      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-surface-200 border-dashed p-16 text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
            <BookOpen className="w-7 h-7" />
          </span>
          <p className="text-navy-500 text-sm font-medium">No courses yet. Create your first course to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map((course) => (
            <div key={course.id} className="bg-white rounded-2xl border border-surface-200 shadow-card hover:-translate-y-1 hover:shadow-card-hover transition-all duration-300 p-6 group">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-2xs bg-navy-900/5 text-navy-600 border border-navy-900/10 px-2.5 py-1 rounded-lg font-semibold">
                  {course.course_code}
                </span>
                <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold ${course.is_active ? 'text-success-dark' : 'text-danger'}`}>
                  <span className={`w-2.5 h-2.5 rounded-full ${course.is_active ? 'bg-success' : 'bg-danger'}`} />
                  {course.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <h3 className="font-bold text-navy-900 mb-1.5 group-hover:text-accent-600 transition-colors">{course.title}</h3>
              {course.description && (
                <p className="text-xs text-navy-400 line-clamp-2 mb-5">{course.description}</p>
              )}
              <div className="flex items-center justify-between pt-4 border-t border-surface-100">
                <span className="inline-flex items-center gap-1.5 text-2xs text-navy-300 font-medium">
                  <CalendarDays className="w-3.5 h-3.5" />
                  {new Date(course.created_at).toLocaleDateString()}
                </span>
                <div className="flex items-center gap-3">
                  <button onClick={() => openEdit(course)}
                    className="inline-flex items-center gap-1.5 text-2xs text-navy-500 hover:text-navy-900 font-semibold transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                    Edit
                  </button>
                  <button onClick={() => handleToggleActive(course)}
                    className={`inline-flex items-center gap-1.5 text-2xs font-semibold transition-colors ${
                      course.is_active ? 'text-danger hover:text-danger-dark' : 'text-success-dark hover:text-success'
                    }`}>
                    <Power className="w-3.5 h-3.5" />
                    {course.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button onClick={() => handleDelete(course.id)}
                    className="inline-flex items-center gap-1.5 text-2xs text-danger hover:text-danger-dark font-semibold transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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