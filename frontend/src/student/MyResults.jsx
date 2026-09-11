import { useState, useEffect } from 'react'
import * as XLSX from 'xlsx'
import api, { resultsAPI } from '../services/api'
import {
  Trophy, FileText, GraduationCap, ScrollText, BookOpen,
  Eye, X, ShieldCheck, TrendingDown, TrendingUp, FileQuestion,
  ChevronLeft, ChevronRight, Download, AlertTriangle,
} from 'lucide-react'

const tabs = [
  { id: 'midterm', label: 'Mid-Term', icon: FileText },
  { id: 'final', label: 'Final Term', icon: GraduationCap },
  { id: 'complete', label: 'Complete Result', icon: ScrollText },
]

const examLabels = { midterm: 'Mid-Term', final: 'Final Term', complete: 'Complete Result' }

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'ico'])
const TEXT_EXTS = new Set(['txt', 'md', 'log', 'json', 'xml', 'html', 'htm', 'css', 'js', 'py', 'step', 'tex'])

const PREVIEWABLE = new Set([...IMAGE_EXTS, ...TEXT_EXTS, 'pdf', 'xlsx', 'xls', 'csv'])

export default function MyResults() {
  const [tab, setTab] = useState('midterm')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCourseId, setActiveCourseId] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    resultsAPI.list()
      .then(r => setResults(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const fileNameFor = (r, kind) => ({
    result: r.file_name, best: r.best_paper_name, worst: r.worst_paper_name,
  })[kind] || ''

  const openPreview = async (r, kind, label) => {
    const fileName = fileNameFor(r, kind)
    const ext = fileName.split('.').pop().toLowerCase()

    if (!PREVIEWABLE.has(ext)) {
      setPreview({ type: 'unsupported', label, title: r.title, fileName })
      return
    }

    try {
      const res = await api.get(`/results/${r.id}/view?kind=${kind}`, { responseType: 'blob' })
      const blob = new Blob([res.data])

      if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
        const buf = await blob.arrayBuffer()
        const wb = XLSX.read(buf, { type: 'array' })
        const sheets = wb.SheetNames
          .filter(n => wb.Sheets[n])
          .map(name => ({
            name,
            rows: XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: '', raw: false }),
          }))
        setPreview({ type: 'sheet', label, title: r.title, fileName, sheets })
      } else if (IMAGE_EXTS.has(ext)) {
        setPreview({ type: 'image', label, title: r.title, fileName, url: URL.createObjectURL(blob) })
      } else if (TEXT_EXTS.has(ext)) {
        setPreview({ type: 'text', label, title: r.title, fileName, text: await blob.text() })
      } else {
        setPreview({ type: 'iframe', label, title: r.title, fileName, url: URL.createObjectURL(blob) })
      }
    } catch (err) {
      setError('Unable to load the file for online viewing')
    }
  }

  const closePreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url)
    setPreview(null)
  }

  const switchTab = (id) => {
    setTab(id)
    setActiveCourseId(null)
  }

  const filtered = results.filter(r => r.exam_type === tab)

  // Group by subject
  const courseMap = {}
  filtered.forEach(r => {
    if (!courseMap[r.course_id]) courseMap[r.course_id] = { id: r.course_id, name: r.course_name, items: [] }
    courseMap[r.course_id].items.push(r)
  })
  const visibleCourses = Object.values(courseMap).sort((a, b) => (a.name || '').localeCompare(b.name || ''))

  const activeCourse = courseMap[activeCourseId] || null
  const activeResults = activeCourse ? activeCourse.items : []

  const files = (r) => [
    { kind: 'result', label: 'Complete result', name: r.file_name, url: r.file_url, icon: ScrollText, cls: 'text-accent-600 bg-accent-50 border-accent-200 hover:bg-accent-100' },
    { kind: 'best', label: 'Best paper', name: r.best_paper_name, url: r.best_paper_url, icon: TrendingUp, cls: 'text-emerald-600 bg-emerald-50 border-emerald-200 hover:bg-emerald-100' },
    { kind: 'worst', label: 'Worst paper', name: r.worst_paper_name, url: r.worst_paper_url, icon: TrendingDown, cls: 'text-red-600 bg-red-50 border-red-200 hover:bg-red-100' },
  ].filter(f => f.url)

  const sheetRows = (sheet) => sheet.rows.filter(row => row.some(c => String(c || '').trim() !== ''))

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {error && (
        <div className="mb-4 flex items-start gap-3 px-4 py-3 rounded-xl bg-danger-light text-danger-dark text-sm font-medium animate-slide-up">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">{error}</div>
          <button onClick={() => setError(null)} className="text-current opacity-50 hover:opacity-100">&times;</button>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm" onClick={closePreview} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl h-[85vh] flex flex-col animate-fade-in overflow-hidden">
            <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-surface-200 bg-surface-50/60 shrink-0">
              <div className="min-w-0">
                <p className="text-sm font-bold text-navy-900 truncate">{preview.label} — {preview.title}</p>
                <p className="text-[11px] text-navy-400 truncate">
                  {preview.type !== 'unsupported' ? 'Viewing online · download is disabled' : ''}
                  {preview.fileName ? ` · ${preview.fileName}` : ''}
                </p>
              </div>
              <button onClick={closePreview} className="w-8 h-8 rounded-lg flex items-center justify-center text-navy-400 hover:text-navy-700 hover:bg-surface-100 transition-colors shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-navy-950/95">
              {preview.type === 'sheet' && (
                <div className="p-4 space-y-4">
                  {preview.sheets.map(sheet => {
                    const rows = sheetRows(sheet)
                    if (rows.length === 0) return null
                    return (
                      <div key={sheet.name} className="rounded-xl bg-white border border-surface-200 overflow-hidden">
                        <div className="px-4 py-2.5 bg-navy-950 border-b border-white/10">
                          <p className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-accent-400" />
                            {sheet.name}
                          </p>
                        </div>
                        <div className="overflow-auto max-h-[56vh]">
                          <table className="w-full text-xs border-collapse">
                            <tbody>
                              {rows.map((row, i) => (
                                <tr key={i} className={i === 0 ? 'bg-accent-50/70' : 'even:bg-surface-50/50'}>
                                  {row.map((cell, j) => (
                                    <td key={j} className="px-3 py-1.5 border-b border-surface-100 text-navy-700 whitespace-nowrap font-medium">
                                      {cell}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {preview.type === 'image' && (
                <div className="h-full flex items-center justify-center p-4">
                  <img src={preview.url} alt={preview.label} className="max-w-full max-h-full rounded-lg bg-white object-contain" />
                </div>
              )}

              {preview.type === 'text' && (
                <pre className="p-5 text-xs leading-relaxed text-navy-100 whitespace-pre-wrap font-mono">{preview.text}</pre>
              )}

              {preview.type === 'iframe' && (
                <iframe src={preview.url} title={preview.label} className="w-full h-full border-0" sandbox="allow-same-origin" />
              )}

              {preview.type === 'unsupported' && (
                <div className="h-full flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <span className="inline-flex w-16 h-16 rounded-2xl bg-white/5 border border-white/10 items-center justify-center">
                    <FileQuestion className="w-8 h-8 text-navy-300" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-white">Preview not available</p>
                    <p className="text-xs text-navy-300 mt-1">
                      {preview.fileName} cannot be rendered in the browser.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Trophy className="w-3 h-3" />
          Result Board
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">My Results</h1>
        <p className="text-navy-400 mt-1.5">Pick a subject to view its result sheets online.</p>
      </div>

      {/* Tab Switcher */}
      <div className="mb-6 sm:flex sm:justify-center">
        <div className="w-full grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface-100/70 sm:inline-flex sm:w-auto sm:justify-center sm:bg-white sm:border sm:border-surface-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => switchTab(t.id)}
              className={`flex items-center justify-center gap-2 px-1 sm:px-5 py-2.5 rounded-lg text-[11px] sm:text-sm font-semibold whitespace-nowrap transition-all ${
                tab === t.id
                  ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                  : 'text-navy-500 hover:text-navy-700 hover:bg-white sm:hover:bg-surface-50'
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0 hidden sm:block" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-5 text-xs flex-wrap">
            <button
              onClick={() => setActiveCourseId(null)}
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
            <SubjectGrid courses={visibleCourses} tabLabel={examLabels[tab]} onPick={setActiveCourseId} />
          ) : activeResults.length === 0 ? (
            <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
              <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
                <Trophy className="w-7 h-7" />
              </span>
              <p className="text-navy-500 text-sm font-medium">
                No {examLabels[tab].toLowerCase()} results published for this subject yet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeResults.map(r => (
                <div key={r.id} className="border border-surface-200 rounded-xl bg-white p-5 hover:border-accent-300 hover:shadow-elevated transition-all">
                  <div className="flex items-start gap-3.5">
                    <span className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border bg-navy-950 text-accent-400 border-navy-950">
                      <ScrollText className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-bold text-navy-900">{r.title}</h3>
                        <span className="inline-flex items-center gap-1 p-0.5 px-1.5 rounded-md text-[10px] font-semibold border bg-accent-50 text-accent-600 border-accent-200">
                          {examLabels[r.exam_type]}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="inline-flex items-center gap-1 text-[11px] text-navy-400">
                          <BookOpen className="w-3 h-3 text-navy-300" />
                          {r.course_name}
                        </span>
                        <span className="text-[11px] text-navy-300">· {new Date(r.created_at).toLocaleDateString()}</span>
                        {r.uploader_name && <span className="text-[11px] text-navy-300">· by {r.uploader_name}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
                    {files(r).map(f => (
                      <button
                        key={f.kind}
                        onClick={() => openPreview(r, f.kind, f.label)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-semibold transition-colors ${f.cls}`}
                      >
                        <f.icon className="w-3.5 h-3.5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate text-left">{f.label}</span>
                        <span className="inline-flex items-center gap-1 shrink-0">
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="flex items-center gap-1.5 mt-3 text-[10px] text-navy-300">
                    <ShieldCheck className="w-3 h-3" />
                    View only — files open in the reader here and cannot be downloaded.
                  </p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Subject grid ────────────────────────────────────── */

function SubjectGrid({ courses, tabLabel, onPick }) {
  if (courses.length === 0) {
    return (
      <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
          <Trophy className="w-7 h-7" />
        </span>
        <p className="text-navy-500 text-sm font-medium">
          No {tabLabel.toLowerCase()} results published for your subjects yet.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => {
        const filesCount = c.items.reduce((n, r) => n + [r.file_url, r.best_paper_url, r.worst_paper_url].filter(Boolean).length, 0)
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
              <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-100 text-navy-500 text-2xs font-bold">
                {tabLabel}
              </span>
            </div>
            <h3 className="mt-4 text-sm font-bold text-navy-900 leading-snug group-hover:text-accent-600 transition-colors">
              {c.name}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-xs flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-100 text-navy-600 text-2xs font-bold">
                <ScrollText className="w-3 h-3" />
                {c.items.length} result sheet{c.items.length === 1 ? '' : 's'}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-50 text-accent-700 border border-accent-200 text-2xs font-bold">
                <Download className="w-3 h-3" />
                {filesCount} file{filesCount === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
              View results
              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        )
      })}
    </div>
  )
}