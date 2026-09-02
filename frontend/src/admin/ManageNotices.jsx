import { useState, useEffect } from 'react'
import { noticesAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  Bell, PlusCircle, Pencil, Trash2, Pin, FileText, Image, File,
  CalendarDays, Search, X,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  news: { label: 'News', icon: FileText, color: 'bg-sky-50 text-sky-600 border-sky-200' },
  photo: { label: 'Photo', icon: Image, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  document: { label: 'Document', icon: File, color: 'bg-amber-50 text-amber-600 border-amber-200' },
}

export default function ManageNotices() {
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ title: '', content: '', category: 'news', target_semester: '', is_pinned: false })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => { loadNotices() }, [])

  const loadNotices = async () => {
    setLoading(true)
    try {
      const res = await noticesAPI.list()
      setNotices(res.data)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditing(null)
    setForm({ title: '', content: '', category: 'news', target_semester: '', is_pinned: false })
    setFile(null)
    setShowModal(true)
  }

  const openEdit = (notice) => {
    setEditing(notice)
    setForm({ title: notice.title, content: notice.content || '', category: notice.category, target_semester: notice.target_semester || '', is_pinned: notice.is_pinned })
    setFile(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('content', form.content)
      fd.append('category', form.category)
      fd.append('is_pinned', form.is_pinned)
      if (form.target_semester) fd.append('target_semester', form.target_semester)
      if (file) fd.append('file', file)

      if (editing) {
        await noticesAPI.update(editing.id, fd)
      } else {
        await noticesAPI.create(fd)
      }
      setShowModal(false)
      loadNotices()
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save notice')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (notice) => {
    if (!confirm(`Delete "${notice.title}"?`)) return
    try { await noticesAPI.delete(notice.id); loadNotices() }
    catch { alert('Failed') }
  }

  const filtered = notices.filter(n => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)
  })

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Bell className="w-3 h-3" />
          Noticeboard
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Notices</h1>
        <p className="text-sm text-navy-400 mt-1">Share news, photos, and documents with everyone.</p>
      </div>

      {/* Toolbar */}
      <div className="border border-surface-200 rounded-xl bg-white p-3 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notices..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
          />
        </div>
        <Button onClick={openCreate}>
          <PlusCircle className="w-4 h-4" />
          New Notice
        </Button>
      </div>

      {/* Notices list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
          <Bell className="w-8 h-8 text-navy-300 mx-auto mb-2" />
          <p className="text-sm text-navy-400">No notices yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(n => {
            const cat = CATEGORY_CONFIG[n.category] || CATEGORY_CONFIG.news
            const CatIcon = cat.icon
            return (
              <div key={n.id} className="border border-surface-200 rounded-xl bg-white p-5 hover:border-accent-300 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${cat.color}`}>
                      <CatIcon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-navy-900 truncate">{n.title}</h3>
                        {n.is_pinned && (
                          <Pin className="w-3 h-3 text-accent-500 shrink-0" />
                        )}
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cat.color}`}>
                          {cat.label}
                        </span>
                        {n.target_semester && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-navy-900/5 text-navy-500 border border-surface-200">
                            Sem {n.target_semester}
                          </span>
                        )}
                      </div>
                      {n.content && (
                        <p className="text-xs text-navy-400 mt-1 line-clamp-2">{n.content}</p>
                      )}
                      {n.file_url && (
                        <a href={`/${n.file_url}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 mt-1.5">
                          <File className="w-3 h-3" />
                          View attachment
                        </a>
                      )}
                      <p className="text-[10px] text-navy-300 mt-2">
                        {n.author_name} · {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => openEdit(n)} title="Edit"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-500 border border-surface-200 bg-white hover:bg-surface-50 hover:text-navy-900 transition-all">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(n)} title="Delete"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Notice' : 'New Notice'}>
        <form onSubmit={handleSubmit} className="space-y-4">
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
          <div className="grid grid-cols-2 gap-3">
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
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">Attachment</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])}
              className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer" />
          </div>
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl border border-surface-200 bg-surface-50 cursor-pointer">
            <input type="checkbox" checked={form.is_pinned}
              onChange={(e) => setForm({ ...form, is_pinned: e.target.checked })}
              className="w-4 h-4 accent-accent-500" />
            <span className="text-sm font-medium text-navy-700">Pin to top</span>
          </label>
          {editing?.file_url && !file && (
            <p className="text-xs text-navy-400">Current attachment: <a href={`/${editing.file_url}`} target="_blank" rel="noreferrer" className="text-accent-600 hover:underline">view file</a></p>
          )}
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Post Notice'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
