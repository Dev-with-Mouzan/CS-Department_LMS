import { useState, useEffect } from 'react'
import { noticesAPI, coursesAPI } from '../services/api'
import { useAuth } from '../context/AuthContext'
import {
  Bell, Pin, FileText, Image, File, CalendarDays, PlusCircle, X,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  news: { label: 'News', icon: FileText, color: 'bg-sky-50 text-sky-600 border-sky-200' },
  photo: { label: 'Photo', icon: Image, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  document: { label: 'Document', icon: File, color: 'bg-amber-50 text-amber-600 border-amber-200' },
}

export default function NoticeBoard() {
  const { user } = useAuth()
  const isTeacher = user?.role === 'teacher'
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  // Teacher create form state
  const [showForm, setShowForm] = useState(false)
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({ title: '', content: '', category: 'news', target_semester: '' })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadNotices() }, [])

  const loadNotices = () => {
    setLoading(true)
    noticesAPI.list()
      .then(res => setNotices(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  const openForm = () => {
    if (courses.length === 0) {
      coursesAPI.list().then(r => setCourses(r.data)).catch(console.error)
    }
    setForm({ title: '', content: '', category: 'news', target_semester: '' })
    setFile(null)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('content', form.content)
      fd.append('category', form.category)
      if (form.target_semester) fd.append('target_semester', form.target_semester)
      if (file) fd.append('file', file)
      await noticesAPI.create(fd)
      setShowForm(false)
      loadNotices()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to post notice')
    } finally { setSubmitting(false) }
  }

  const semesters = [...new Set(courses.map(c => c.semester).filter(Boolean))].sort((a, b) => a - b)

  const handleDownload = async (url, fileName) => {
    try {
      const response = await fetch(`/${url}`)
      const blob = await response.blob()
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName || url.split('/').pop()
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch (err) {
      console.error('Download failed:', err)
      window.open(`/${url}`, '_blank')
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Bell className="w-3 h-3" />
          Noticeboard
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Notices</h1>
        <p className="text-sm text-navy-400 mt-1">
          {isTeacher ? 'View and post notices for your students.' : 'Latest news and announcements.'}
        </p>
      </div>

      {/* Teacher: Post Notice button / inline form */}
      {isTeacher && (
        <div className="mb-6">
          {!showForm ? (
            <button onClick={openForm}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-dashed border-accent-300 rounded-xl text-sm font-semibold text-accent-600 bg-accent-500/5 hover:bg-accent-500/10 transition-colors">
              <PlusCircle className="w-4 h-4" />
              Post a Notice
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="border border-surface-200 rounded-xl bg-white p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-navy-900">New Notice</h3>
                <button type="button" onClick={() => setShowForm(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-navy-400 hover:bg-surface-100 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="input-label">Title</label>
                <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field" required placeholder="Notice title" />
              </div>
              <div>
                <label className="input-label">Content</label>
                <textarea value={form.content} rows={3} onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="input-field resize-none" placeholder="Write your notice..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <label className="input-label">Semester</label>
                  <select value={form.target_semester} onChange={(e) => setForm({ ...form, target_semester: e.target.value })}
                    className="input-field">
                    <option value="">All</option>
                    {semesters.map(s => <option key={s} value={s}>Sem {s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="input-label">Attachment</label>
                  <input type="file" onChange={(e) => setFile(e.target.files[0])}
                    className="input-field text-sm file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-navy-500 border border-surface-200 hover:bg-surface-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-accent-500 hover:bg-accent-600 transition-colors disabled:opacity-50">
                  {submitting ? 'Posting...' : 'Post Notice'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Notices list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : notices.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
          <Bell className="w-8 h-8 text-navy-300 mx-auto mb-2" />
          <p className="text-sm text-navy-400">No notices posted yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {notices.map(n => {
            const cat = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.news
            const CatIcon = cat.icon
            return (
              <div key={n.id} className="bg-white rounded-2xl shadow-sm border border-surface-100 p-5 hover:shadow-md hover:border-surface-200 transition-all">
                <div className="flex items-start gap-3">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${cat.color}`}>
                    <CatIcon className="w-5 h-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-navy-900">{n.title}</h3>
                      {n.is_pinned && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-600 border border-accent-500/20">
                          <Pin className="w-2.5 h-2.5" />
                          Pinned
                        </span>
                      )}
                      {n.author_role === 'admin' ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-navy-900 text-white">
                          Admin
                        </span>
                      ) : n.author_name ? (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 border border-sky-200">
                          {n.author_name}
                        </span>
                      ) : null}
                      {n.target_semester && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-navy-900/5 text-navy-500 border border-surface-200">
                          Sem {n.target_semester}
                        </span>
                      )}
                    </div>
                    {n.content && (
                      <p className="text-sm text-navy-500 mt-2 leading-relaxed whitespace-pre-wrap">{n.content}</p>
                    )}
                    {n.file_url && (
                      <button onClick={() => handleDownload(n.file_url, n.file_name)}
                        className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-600 hover:text-accent-700 mt-3 px-3 py-1.5 rounded-lg bg-accent-500/5 border border-accent-500/15 hover:bg-accent-500/10 transition-colors">
                        <File className="w-3.5 h-3.5" />
                        View attachment
                      </button>
                    )}
                    <div className="flex items-center gap-2 mt-3 text-[10px] text-navy-300">
                      <CalendarDays className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleDateString()}
                      {n.author_name && <span>· {n.author_name}</span>}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
