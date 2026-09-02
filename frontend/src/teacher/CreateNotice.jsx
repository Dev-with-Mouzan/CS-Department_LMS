import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { noticesAPI, coursesAPI } from '../services/api'
import Button from '../components/Button'
import { Bell, FileText, Image, File, AlertCircle } from 'lucide-react'

export default function CreateNotice() {
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ title: '', content: '', category: 'news', target_semester: '' })
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    coursesAPI.list().then(r => {
      setCourses(r.data)
      // Get unique semesters from teacher's courses
      const semesters = [...new Set(r.data.map(c => c.semester).filter(Boolean))].sort((a, b) => a - b)
      if (semesters.length === 1) {
        setForm(f => ({ ...f, target_semester: String(semesters[0]) }))
      }
    }).catch(console.error)
  }, [])

  // Unique semesters from teacher's courses
  const semesters = [...new Set(courses.map(c => c.semester).filter(Boolean))].sort((a, b) => a - b)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('content', form.content)
      fd.append('category', form.category)
      if (form.target_semester) fd.append('target_semester', form.target_semester)
      if (file) fd.append('file', file)

      await noticesAPI.create(fd)
      navigate('/teacher/notices')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create notice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Bell className="w-3 h-3" />
          Noticeboard
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Post Notice</h1>
        <p className="text-sm text-navy-400 mt-1">Share news with your students.</p>
      </div>

      {error && (
        <div className="flex items-start gap-3 bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-6 text-sm font-medium border border-red-200">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border border-surface-200 rounded-xl bg-white p-6 space-y-5">
          <div>
            <label className="input-label">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field" required placeholder="Notice title" />
          </div>

          <div>
            <label className="input-label">Content</label>
            <textarea value={form.content} rows={4} onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="input-field resize-none" placeholder="Write your notice here..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field">
                <option value="news">News</option>
                <option value="photo">Photo</option>
                <option value="document">Document</option>
              </select>
            </div>
            <div>
              <label className="input-label">Target Semester</label>
              <select value={form.target_semester} onChange={(e) => setForm({ ...form, target_semester: e.target.value })}
                className="input-field">
                <option value="">All semesters</option>
                {semesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
              <p className="text-[10px] text-navy-400 mt-1">Only students in this semester will see this notice.</p>
            </div>
          </div>

          <div>
            <label className="input-label">Attachment (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])}
              className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer" />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button variant="ghost" type="button" onClick={() => navigate(-1)}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Posting...' : 'Post Notice'}
          </Button>
        </div>
      </form>
    </div>
  )
}
