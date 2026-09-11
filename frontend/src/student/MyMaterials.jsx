import { useState, useEffect } from 'react'
import api, { materialsAPI } from '../services/api'
import {
  FolderOpen, FileText, Presentation, BookOpen, File, Download, Search,
  ChevronLeft, ChevronRight,
} from 'lucide-react'

const CATEGORY_CONFIG = {
  notes: { label: 'Notes', icon: FileText, color: 'bg-sky-50 text-sky-600 border-sky-200' },
  slides: { label: 'Slides', icon: Presentation, color: 'bg-amber-50 text-amber-600 border-amber-200' },
  assignment: { label: 'Assignment', icon: BookOpen, color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
  reference: { label: 'Reference', icon: File, color: 'bg-purple-50 text-purple-600 border-purple-200' },
  other: { label: 'Other', icon: File, color: 'bg-surface-100 text-navy-500 border-surface-200' },
}

export default function MyMaterials() {
  const [materials, setMaterials] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [search, setSearch] = useState('')

  useEffect(() => {
    materialsAPI.list()
      .then(res => setMaterials(Array.isArray(res.data) ? res.data : []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Group by subject
  const courseMap = {}
  materials.forEach(m => {
    if (!courseMap[m.course_id]) courseMap[m.course_id] = { id: m.course_id, name: m.course_name || 'General', items: [] }
    courseMap[m.course_id].items.push(m)
  })
  const courses = Object.values(courseMap).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const activeCourse = courseMap[activeCourseId] || null
  const activeMaterials = activeCourse ? activeCourse.items : []

  const categoryCounts = (items) => {
    const counts = {}
    items.forEach(m => { counts[m.category] = (counts[m.category] || 0) + 1 })
    return counts
  }

  const filtered = activeMaterials.filter(m => {
    const q = search.trim().toLowerCase()
    return !q || m.title.toLowerCase().includes(q) || (m.file_name || '').toLowerCase().includes(q)
  })

  const goSubjects = () => {
    setActiveCourseId(null)
    setSearch('')
  }

  const handleDownload = async (url, fileName) => {
    try {
      const fileUrl = url.replace(/^uploads[\\/]/, 'files/')
      const response = await api.get(`/${fileUrl}`, { responseType: 'blob' })
      const blob = new Blob([response.data])
      const downloadUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = fileName || url.split('/').pop()
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(downloadUrl)
    } catch {
      window.open(`/${url}`, '_blank', 'noopener,noreferrer')
    }
  }

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <FolderOpen className="w-3 h-3" />
          Study Materials
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">My Materials</h1>
        <p className="text-sm text-navy-400 mt-1">Pick a subject to view and download its materials.</p>
      </div>

      {loading ? (
        <div className="min-h-[220px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-5 text-xs flex-wrap">
            <button
              onClick={goSubjects}
              className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-accent-600 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Subjects
            </button>
            {activeCourse && (
              <>
                <ChevronRight className="w-3 h-3 text-navy-300" />
                <span className="inline-flex items-center gap-1 font-semibold text-navy-800 truncate max-w-[260px]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  {activeCourse.name}
                </span>
              </>
            )}
          </div>

          {!activeCourse ? (
            <SubjectGrid courses={courses} categoryCounts={categoryCounts} onPick={setActiveCourseId} />
          ) : (
            <>
              {/* Toolbar */}
              <div className="border border-surface-200 rounded-xl bg-white p-3 mb-5">
                <div className="relative">
                  <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search materials..."
                    className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all" />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
                  <FolderOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                  <p className="text-sm text-navy-400">
                    {activeCourse.items.length === 0
                      ? `No materials uploaded for ${activeCourse.name} yet.`
                      : 'No materials match your search.'}
                  </p>
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
                            {m.file_name && <span className="text-[10px] text-navy-300">{m.file_name}</span>}
                            <span className="text-[10px] text-navy-300">· {new Date(m.created_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button onClick={() => handleDownload(m.file_url, m.file_name)} title="Download"
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-accent-600 border border-accent-200 bg-accent-50 hover:bg-accent-100 transition-colors shrink-0">
                          <Download className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

/* ── Subject grid ────────────────────────────────────── */

function SubjectGrid({ courses, categoryCounts, onPick }) {
  if (courses.length === 0) {
    return (
      <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
        <FolderOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
        <p className="text-sm text-navy-400">No course materials available yet.</p>
        <p className="text-xs text-navy-400 mt-1">They will appear here once your teachers upload them.</p>
      </div>
    )
  }

  const topCategories = (items) => {
    const counts = categoryCounts(items)
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => {
        const top = topCategories(c.items)
        return (
          <button
            key={c.id}
            onClick={() => onPick(c.id)}
            className="group text-left rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-800 text-white flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 text-accent-600 text-2xs font-bold">
                <FolderOpen className="w-3 h-3" />
                {c.items.length} material{c.items.length === 1 ? '' : 's'}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-navy-900 leading-snug group-hover:text-accent-600 transition-colors">
              {c.name}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
              {top.map(([category, count]) => {
                const cat = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.other
                const Icon = cat.icon
                return (
                  <span key={category} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-navy-600 text-2xs font-bold">
                    <Icon className="w-3 h-3" />
                    {count} {cat.label.toLowerCase()}
                  </span>
                )
              })}
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
              View materials
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )
      })}
    </div>
  )
}