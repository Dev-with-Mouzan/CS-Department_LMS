import { useState, useEffect } from 'react'
import { materialsAPI } from '../services/api'
import {
  FolderOpen, FileText, Presentation, BookOpen, File, Download, Search,
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
  const [search, setSearch] = useState('')
  const [filterCourse, setFilterCourse] = useState('')

  useEffect(() => {
    materialsAPI.list()
      .then(res => setMaterials(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const courses = [...new Map(materials.map(m => [m.course_id, { id: m.course_id, name: m.course_name }])).values()]

  const filtered = materials.filter(m => {
    const q = search.trim().toLowerCase()
    const courseMatch = !filterCourse || m.course_id === filterCourse
    const searchMatch = !q || m.title.toLowerCase().includes(q) || (m.course_name || '').toLowerCase().includes(q)
    return courseMatch && searchMatch
  })

  // Group by course
  const grouped = {}
  filtered.forEach(m => {
    const key = m.course_name || 'Other'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(m)
  })

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <FolderOpen className="w-3 h-3" />
          Study Materials
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">My Materials</h1>
        <p className="text-sm text-navy-400 mt-1">View and download course materials.</p>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-6 flex-col sm:flex-row">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search materials..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all" />
        </div>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}
          className="px-3 py-2.5 bg-white border border-surface-200 rounded-xl text-sm text-navy-700 focus:outline-none focus:ring-2 focus:ring-accent-400/30">
          <option value="">All courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Materials */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
          <FolderOpen className="w-8 h-8 text-navy-300 mx-auto mb-2" />
          <p className="text-sm text-navy-400">No materials available yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([courseName, items]) => (
            <div key={courseName}>
              <h3 className="text-xs font-semibold text-navy-500 mb-3">{courseName}</h3>
              <div className="space-y-2">
                {items.map(m => {
                  const cat = CATEGORY_CONFIG[m.category] || CATEGORY_CONFIG.other
                  const CatIcon = cat.icon
                  return (
                    <div key={m.id} className="border border-surface-200 rounded-xl bg-white p-4 flex items-center gap-3 hover:border-accent-300 transition-colors">
                      <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 border ${cat.color}`}>
                        <CatIcon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-medium text-navy-900 truncate">{m.title}</h4>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cat.color}`}>
                            {cat.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {m.file_name && <span className="text-[10px] text-navy-300">{m.file_name}</span>}
                          <span className="text-[10px] text-navy-300">· {new Date(m.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <a href={`/${m.file_url}`} target="_blank" rel="noreferrer" title="Download"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-accent-600 border border-accent-200 bg-accent-50 hover:bg-accent-100 transition-colors shrink-0">
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
