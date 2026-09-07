import { useState, useEffect } from 'react'
import { resultsAPI, coursesAPI } from '../services/api'
import Modal from '../components/Modal'
import Button from '../components/Button'
import {
  Trophy, FileText, GraduationCap, ScrollText, PlusCircle, Trash2,
  Download, BookOpen, TrendingDown, TrendingUp, ChevronRight, ChevronLeft,
} from 'lucide-react'

const tabs = [
  { id: 'midterm', label: 'Mid-Term', icon: FileText },
  { id: 'final', label: 'Final Year', icon: GraduationCap },
  { id: 'complete', label: 'Complete Result', icon: ScrollText },
]

const examLabels = { midterm: 'Mid-Term', final: 'Final Year', complete: 'Complete Result' }

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const semLabel = (semKey) =>
  semKey === 'other' ? 'General' : `${ordinal(Number(semKey))} Semester`

export default function Results() {
  const [tab, setTab] = useState('midterm')
  const [courses, setCourses] = useState([])
  const [allResults, setAllResults] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    title: '', exam_type: 'midterm', course_id: '',
  })
  const [worstPaper, setWorstPaper] = useState(null)
  const [bestPaper, setBestPaper] = useState(null)
  const [resultFile, setResultFile] = useState(null)
  const [activeSemester, setActiveSemester] = useState(null)
  const [activeCourse, setActiveCourse] = useState(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([coursesAPI.list(), resultsAPI.list()])
      .then(([c, r]) => { setCourses(c.data); setAllResults(r.data) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const openCreate = () => {
    setForm({
      title: '', exam_type: tab, course_id: activeCourse?.id || '',
    })
    setWorstPaper(null)
    setBestPaper(null)
    setResultFile(null)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!resultFile || !worstPaper || !bestPaper) {
      alert('Please upload the complete result, best paper and worst paper')
      return
    }
    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('title', form.title)
      fd.append('exam_type', form.exam_type)
      fd.append('course_id', form.course_id)
      fd.append('file', resultFile)
      fd.append('best_paper', bestPaper)
      fd.append('worst_paper', worstPaper)
      await resultsAPI.create(fd)
      setShowModal(false)
      const res = await resultsAPI.list()
      setAllResults(res.data)
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to add result')
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (r) => {
    if (!confirm(`Delete "${r.title}"?`)) return
    try {
      await resultsAPI.delete(r.id)
      setAllResults(allResults.filter(x => x.id !== r.id))
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
      window.open(`/${url}`, '_blank')
    }
  }

  const goSemesters = () => {
    setActiveSemester(null)
    setActiveCourse(null)
  }

  const goCourses = () => setActiveCourse(null)

  const semesters = Object.values(
    courses.reduce((acc, c) => {
      const key = c.semester != null ? String(c.semester) : 'other'
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {}),
  )
    .map((cs) => {
      const key = cs[0].semester != null ? String(cs[0].semester) : 'other'
      const ids = new Set(cs.map((c) => c.id))
      const tabResults = allResults.filter((r) => r.exam_type === tab && ids.has(r.course_id))
      return {
        key,
        count: cs.length,
        session: cs.find((c) => c.session)?.session || '',
        resultCount: allResults.filter((r) => ids.has(r.course_id)).length,
        tabCount: tabResults.length,
      }
    })
    .sort((a, b) => (a.key === 'other' ? 1 : b.key === 'other' ? -1 : Number(a.key) - Number(b.key)))

  const activeCourses = activeSemester != null
    ? courses.filter((c) => (c.semester != null ? String(c.semester) : 'other') === activeSemester)
    : []

  const filtered = allResults.filter(r => {
    const examMatch = r.exam_type === tab
    const courseMatch = !activeCourse || r.course_id === activeCourse.id
    return examMatch && courseMatch
  })

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Trophy className="w-3 h-3" />
          Results Management
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Results</h1>
        <p className="text-navy-400 mt-1.5">Pick a semester and book to manage its result sheets</p>
      </div>

      {/* Tab Switcher */}
      <div className="flex justify-center mb-5">
        <div className="inline-flex rounded-xl border border-surface-200 bg-white p-1 gap-1 w-full sm:w-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                tab === t.id
                  ? 'bg-accent-500 text-white shadow-md shadow-accent-500/20'
                  : 'text-navy-500 hover:text-navy-700 hover:bg-surface-50'
              }`}
            >
              <t.icon className="w-4 h-4 shrink-0" />
              <span className="hidden xs:inline sm:inline">{t.label}</span>
              <span className="xs:hidden sm:hidden">{t.id === 'midterm' ? 'Mid' : t.id === 'final' ? 'Final' : 'Full'}</span>
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Breadcrumbs */}
          <div className="flex items-center gap-2 mb-5 text-xs flex-wrap">
            <button
              onClick={goSemesters}
              className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-accent-600 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Semesters
            </button>
            {activeSemester != null && (
              <>
                <ChevronRight className="w-3 h-3 text-navy-300" />
                <button
                  onClick={goCourses}
                  className="inline-flex items-center gap-1 font-semibold text-navy-500 hover:text-accent-600 transition-colors"
                >
                  <GraduationCap className="w-3.5 h-3.5" />
                  {semLabel(activeSemester)}
                </button>
              </>
            )}
            {activeCourse && (
              <>
                <ChevronRight className="w-3 h-3 text-navy-300" />
                <span className="inline-flex items-center gap-1 font-semibold text-navy-800 truncate max-w-[220px]">
                  <BookOpen className="w-3.5 h-3.5 shrink-0" />
                  {activeCourse.title}
                </span>
              </>
            )}
          </div>

          {activeSemester == null ? (
            semesters.length === 0 ? (
              <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center bg-white">
                <Trophy className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                <p className="text-sm text-navy-400">No courses yet. Ask the admin to assign you some.</p>
              </div>
            ) : (
              <SemesterGrid semesters={semesters} tabLabel={examLabels[tab]} onPick={setActiveSemester} />
            )
          ) : activeCourse == null ? (
            <CourseGrid
              courses={activeCourses}
              resultsByCourse={allResults.filter((r) => activeCourses.some((c) => c.id === r.course_id)).reduce((m, r) => {
                if (!m[r.course_id]) m[r.course_id] = []
                m[r.course_id].push(r)
                return m
              }, {})}
              onPick={setActiveCourse}
            />
          ) : (
            <>
              {/* Toolbar */}
              <div className="border border-surface-200 rounded-xl bg-white p-3 mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-accent-500" />
                    {activeCourse.title}
                    <span className="text-xs font-medium text-navy-400">({filtered.length})</span>
                  </p>
                  <p className="text-xs text-navy-400 mt-0.5">
                    {examLabels[tab]} result sheets for {activeCourse.course_code}.
                  </p>
                </div>
                <Button onClick={openCreate}>
                  <PlusCircle className="w-4 h-4" />
                  Add Result
                </Button>
              </div>

              {/* Results list */}
              {filtered.length === 0 ? (
                <div className="border border-dashed border-surface-200 rounded-xl py-16 text-center">
                  <Trophy className="w-8 h-8 text-navy-300 mx-auto mb-2" />
                  <p className="text-sm text-navy-400">
                    No {examLabels[tab].toLowerCase()} results yet. Add one with the complete result and the best & worst papers.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(r => (
                    <div key={r.id} className="border border-surface-200 rounded-xl bg-white p-4 sm:p-5 flex flex-col sm:flex-row sm:items-start gap-4 hover:border-accent-300 hover:shadow-elevated transition-all">
                      <span className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border bg-accent-50 text-accent-600 border-accent-200 self-start">
                        <ScrollText className="w-5 h-5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-navy-900 truncate">{r.title}</h3>
                        </div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-navy-400">{r.course_name}</span>
                          <span className="text-[10px] text-navy-300">· {examLabels[r.exam_type]}</span>
                          <span className="text-[10px] text-navy-300">· {new Date(r.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap">
                        {[
                          { url: r.file_url, name: r.file_name, label: 'Complete', job: 'bg-accent-50 text-accent-600 border-accent-200 hover:bg-accent-100' },
                          { url: r.best_paper_url, name: r.best_paper_name, label: 'Best', job: 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100' },
                          { url: r.worst_paper_url, name: r.worst_paper_name, label: 'Worst', job: 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' },
                        ].filter(x => x.url).map(x => (
                          <button key={x.label} onClick={() => handleDownload(x.url, x.name)} title={`Download ${x.label.toLowerCase()} paper`}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold border transition-colors ${x.job}`}>
                            <Download className="w-3.5 h-3.5" />
                            {x.label}
                          </button>
                        ))}
                        <button onClick={() => handleDelete(r)} title="Delete"
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-red-600 border border-red-200 bg-white hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* Add Result Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Result">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="input-label">Title</label>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field" required placeholder="e.g. Mid-Term Result Sheet" />
          </div>

          <div>
            <label className="input-label">Complete result <span className="text-red-500">*</span></label>
            <input type="file" onChange={(e) => setResultFile(e.target.files[0])}
              className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer" />
            <p className="text-[10px] text-navy-400 mt-1">Main result sheet for this exam.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="input-label">Best paper <span className="text-red-500">*</span></label>
              <input type="file" onChange={(e) => setBestPaper(e.target.files[0])}
                className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500 file:text-white file:cursor-pointer" />
              <p className="text-[10px] text-navy-400 mt-1">Best performing answer script.</p>
            </div>
            <div>
              <label className="input-label">Worst paper <span className="text-red-500">*</span></label>
              <input type="file" onChange={(e) => setWorstPaper(e.target.files[0])}
                className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-red-500 file:text-white file:cursor-pointer" />
              <p className="text-[10px] text-navy-400 mt-1">Weakest performing answer script.</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="input-label">Exam</label>
              <select value={form.exam_type} onChange={(e) => setForm({ ...form, exam_type: e.target.value })}
                className="input-field">
                {tabs.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="input-label">Course</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })}
                className="input-field" required>
                <option value="">Select course</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.title}</option>)}
              </select>
            </div>
          </div>

          <p className="text-[11px] text-navy-400 bg-accent-50 border border-accent-100 rounded-lg px-3 py-2">
            Upload in order — <span className="font-semibold text-accent-600">complete result</span> first, then the{' '}
            <span className="font-semibold text-emerald-600">best</span> and{' '}
            <span className="font-semibold text-red-600">worst</span> paper. All three are mandatory.
          </p>

          <div className="flex gap-3 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? 'Adding...' : 'Add Result'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────── */

function SemesterGrid({ semesters, tabLabel, onPick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {semesters.map((s) => (
        <button
          key={s.key}
          onClick={() => onPick(s.key)}
          className="group text-left rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-elevated"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="w-11 h-11 rounded-xl bg-navy-900 text-white flex items-center justify-center">
              <GraduationCap className="w-5 h-5" />
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 text-accent-600 text-2xs font-bold">
              <Trophy className="w-3 h-3" />
              {s.resultCount} results
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-navy-900 group-hover:text-accent-600 transition-colors">
            {semLabel(s.key)}
          </h3>
          {s.session && <p className="text-xs text-navy-400 mt-0.5">Session {s.session}</p>}
          <div className="mt-4 flex items-center gap-4 text-xs text-navy-500">
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.count}</span> books</span>
            <span className="tabular-nums"><span className="font-bold text-navy-900">{s.tabCount}</span> {tabLabel}</span>
          </div>
          <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-accent-600">
            Manage results
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      ))}
    </div>
  )
}

function CourseGrid({ courses, resultsByCourse, onPick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {courses.map((c) => {
        const rs = resultsByCourse[c.id] || []
        return (
          <button
            key={c.id}
            onClick={() => onPick(c)}
            className="group text-left rounded-2xl border border-surface-200 bg-white p-5 transition-all duration-200 hover:border-accent-300 hover:shadow-elevated"
          >
            <div className="flex items-start justify-between gap-3">
              <span className="w-11 h-11 rounded-xl bg-navy-800 text-white flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </span>
              {c.session && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-100 text-navy-500 text-2xs font-bold">
                  {c.session}
                </span>
              )}
            </div>
            <p className="mt-4 text-[11px] font-bold text-accent-600 tracking-wider uppercase">{c.course_code}</p>
            <h3 className="mt-0.5 text-sm font-bold text-navy-900 leading-snug group-hover:text-accent-600 transition-colors">
              {c.title}
            </h3>
            <div className="mt-4 flex items-center gap-4 text-xs text-navy-500 flex-wrap">
              <span className="tabular-nums"><span className="font-bold text-navy-900">{rs.length}</span> results</span>
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