import { useState, useEffect } from 'react'
import { materialsAPI, coursesAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  FolderOpen, PlusCircle, Trash2, FileText, Presentation, BookOpen,
  File, Download, Search,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  notes: { label: 'Notes', icon: FileText, color: 'bg-sky-50 text-sky-600 border-sky-200' },
  slides: { label: 'Slides', icon: Presentation, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  assignment: { label: 'Assignment', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  reference: { label: 'Reference', icon: File, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  other: { label: 'Other', icon: File, color: 'bg-surface-100 text-navy-500 border-surface-200' },
}

export default function ManageMaterials() {
  const [materials, setMaterials] = useState([])
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: 'notes', course_id: '' })
  const [file, setFile] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([materialsAPI.list(), coursesAPI.list()])
      .then(([m, c]) => { setMaterials(m.data); setCourses(c.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setForm({ title: '', description: '', category: 'notes', course_id: courses[0]?.id || '' })
    setFile(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!file) { alert('Please select a file'); return }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('description', form.description)
      fd.append('category', form.category)
      fd.append('course_id', form.course_id)
      fd.append('file', file)
      await materialsAPI.upload(fd)
      setShowModal(false)
      const res = await materialsAPI.list()
      setMaterials(res.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to upload')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (m) => {
    if (!confirm(`Delete "${m.title}"?`)) return
    try {
      await materialsAPI.delete(m.id)
      setMaterials(materials.filter(x => x.id !== m.id))
    } catch { alert('Failed') }
  }

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

  const filtered = materials.filter(m => {
    const q = search.trim().toLowerCase()
    const courseMatch = !filterCourse || m.course_id === filterCourse
    const searchMatch = !q || m.title.toLowerCase().includes(q) || (m.course_name || '').toLowerCase().includes(q)
    return courseMatch && searchMatch
  })

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <FolderOpen className="w-3 h-3" />
          Study Materials
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Materials</h1>
        <p className="text-sm text-navy-400 mt-1">Upload and manage course materials for your students.</p>
      </div>

      {/* Toolbar */}
      <div className="border border-surface-200 rounded-xl bg-white p-3 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all" />
        </div>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}
          className="px-3 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30">
          <option value="">All courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} - {c.title}</option>)}
        </select>
        <Button onClick={openCreate}>
          <PlusCircle className="w-4 h-4" />
          Upload
        </Button>
      </div>

      {/* Materials list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
          <FolderOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
          <p className="text-sm text-navy-400">No materials uploaded yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => {
            const cat = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.other
            const CatIcon = cat.icon
            return (
              <div key={m.id} className="border border-surface-200 rounded-xl bg-white p-4 flex items-center gap-4 hover:border-accent-300 transition-colors">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${cat.color}`}>
                  <CatIcon className="w-5 h-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-semibold text-navy-900 truncate">{m.title}</h3>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cat.color}`}>
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[10px] text-navy-400">{m.course_name}</span>
                    {m.file_name && <span className="text-[10px] text-navy-300">({m.file_name})</span>}
                    <span className="text-[10px] text-navy-300">· {new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleDownload(m.file_url, m.file_name)} title="Download"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-600 border border-accent-200 bg-accent-50 hover:bg-accent-100 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(m)} title="Delete"
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Upload Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Upload Material">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field" required placeholder="Material title" />
          </div>
          <div>
            <label className="input-label">Description (optional)</label>
            <textarea value={form.description} rows={2} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none" placeholder="Brief description..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Course</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className="input-field" required>
                <option value="">Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} - {c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Category</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="input-field">
                <option value="notes">Notes</option>
                <option value="slides">Slides</option>
                <option value="assignment">Assignment</option>
                <option value="reference">Reference</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <label className="input-label">File</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} required
              className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer" />
            <p className="text-[10px] text-navy-400 mt-1">PDF, DOCX, PPTX, images, or any file type.</p>
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Uploading...' : 'Upload Material'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
