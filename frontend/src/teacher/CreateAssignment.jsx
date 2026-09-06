import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI, assignmentsAPI } from '../services/api'
import Button from '../components/Button'
import { BookOpen, FileText, CalendarDays, Award, AlertCircle } from 'lucide-react'

export default function CreateAssignment({ onSuccess, onCancel }) {
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({
    course_id: '', title: '', description: '', due_date: '', max_marks: 100,
  })
  const [attachment, setAttachment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => { coursesAPI.list().then(r => setCourses(r.data)).catch(console.error) }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('course_id', form.course_id)
      formData.append('title', form.title)
      if (form.description) formData.append('description', form.description)
      formData.append('due_date', new Date(form.due_date).toISOString())
      formData.append('max_marks', parseInt(form.max_marks))
      if (attachment) formData.append('attachment', attachment)

      await assignmentsAPI.create(formData)
      if (onSuccess) {
        onSuccess()
        return
      }
      navigate('/teacher')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create assignment')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {error && (
        <div className="flex items-start gap-3 bg-danger-light text-danger-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border border-surface-200 rounded-xl bg-white p-6 lg:p-8 space-y-5">
          <div>
            <label className="input-label">Course</label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className="input-field pl-10" required>
                <option value="">Select a course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="input-label">Title</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field pl-10" placeholder="e.g. Assignment 1: Data Structures" required />
            </div>
          </div>

          <div>
            <label className="input-label">Description</label>
            <textarea value={form.description} rows={4} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none" placeholder="Describe the assignment requirements..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Due date</label>
              <div className="relative">
                <CalendarDays className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="datetime-local" value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  className="input-field pl-10" required />
              </div>
            </div>
            <div>
              <label className="input-label">Max marks</label>
              <div className="relative">
                <Award className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input type="number" value={form.max_marks} min={1}
                  onChange={(e) => setForm({ ...form, max_marks: e.target.value })}
                  className="input-field pl-10" />
              </div>
            </div>
          </div>

          <div>
            <label className="input-label">Attachment (optional)</label>
            <input type="file" onChange={(e) => setAttachment(e.target.files[0])}
              className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          <Button variant="ghost" type="button" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Assignment'}
          </Button>
        </div>
      </form>
    </div>
  )
}
