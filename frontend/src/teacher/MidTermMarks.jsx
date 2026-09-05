import { useState, useEffect } from 'react'
import { coursesAPI, usersAPI, assignmentsAPI } from '../services/api'
import Button from '../components/Button'
import {
  BookOpen, Search, Award, AlertCircle, CheckCircle2,
  TrendingUp, TrendingDown, Save, User as UserIcon,
} from 'lucide-react'

export default function MidTermMarks() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState([])
  const [marks, setMarks] = useState({})
  const [fullMarks, setFullMarks] = useState('')
  const [bestPaper, setBestPaper] = useState({ student: '', marks: '' })
  const [worstPaper, setWorstPaper] = useState({ student: '', marks: '' })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    coursesAPI.list().then(r => setCourses(r.data)).catch(console.error).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourse) { setStudents([]); setMarks({}); return }
    setLoading(true)
    coursesAPI.listEnrollments(selectedCourse)
      .then(async (r) => {
        const enrolled = r.data.filter(e => e.status === 'active')
        const studentDetails = await Promise.all(
          enrolled.map(e => usersAPI.get(e.student_id).then(res => res.data).catch(() => null))
        )
        const valid = studentDetails.filter(Boolean)
        setStudents(valid)
        // Initialize marks
        const initial = {}
        valid.forEach(s => { initial[s.id] = { obtained: '' } })
        setMarks(initial)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedCourse])

  const updateMark = (studentId, value) => {
    setMarks(prev => ({ ...prev, [studentId]: { ...prev[studentId], obtained: value } }))
  }

  const handleSave = () => {
    setSaving(true)
    setMessage('')
    // Simulate save
    setTimeout(() => {
      setMessage('Mid-term marks saved successfully!')
      setSaving(false)
      setTimeout(() => setMessage(''), 3000)
    }, 800)
  }

  // Auto-detect best/worst
  useEffect(() => {
    if (!fullMarks || students.length === 0) return
    const max = parseInt(fullMarks)
    if (isNaN(max)) return
    let best = { id: '', val: -1 }
    let worst = { id: '', val: max + 1 }
    students.forEach(s => {
      const v = parseInt(marks[s.id]?.obtained)
      if (!isNaN(v)) {
        if (v > best.val) best = { id: s.id, val: v }
        if (v < worst.val) worst = { id: s.id, val: v }
      }
    })
    if (best.id) {
      const s = students.find(st => st.id === best.id)
      setBestPaper({ student: s ? `${s.first_name} ${s.last_name}` : '', marks: String(best.val) })
    }
    if (worst.id) {
      const s = students.find(st => st.id === worst.id)
      setWorstPaper({ student: s ? `${s.first_name} ${s.last_name}` : '', marks: String(worst.val) })
    }
  }, [marks, fullMarks, students])

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const name = `${s.first_name} ${s.last_name}`.toLowerCase()
    return name.includes(q) || s.email?.toLowerCase().includes(q)
  })

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Course Selector */}
      <div className="border border-surface-200 rounded-xl bg-white p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <BookOpen className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select value={selectedCourse} onChange={(e) => { setSelectedCourse(e.target.value); setSearch('') }}
              className="input-field pl-10" required>
              <option value="">Select a course</option>
              {courses.map(c => <option key={c.id} value={c.id}>{c.course_code} — {c.title}</option>)}
            </select>
          </div>
          {selectedCourse && (
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={search} onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10" placeholder="Search students..." />
            </div>
          )}
        </div>

        {/* Full Marks */}
        {selectedCourse && (
          <div className="max-w-xs">
            <label className="input-label">Full Marks (Mid-Term)</label>
            <input type="number" value={fullMarks} min={1}
              onChange={(e) => setFullMarks(e.target.value)}
              className="input-field" placeholder="e.g. 50" />
          </div>
        )}
      </div>

      {/* Best / Worst Case */}
      {selectedCourse && fullMarks && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="border border-emerald-200 rounded-xl bg-emerald-50/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
              </span>
              <h3 className="text-sm font-bold text-emerald-800">Best Case Paper</h3>
            </div>
            <div className="space-y-2">
              <div>
                <label className="input-label !text-emerald-700">Student Name</label>
                <input value={bestPaper.student} readOnly
                  className="input-field bg-white/80" placeholder="Auto-detected" />
              </div>
              <div>
                <label className="input-label !text-emerald-700">Marks Obtained</label>
                <input value={bestPaper.marks} readOnly
                  className="input-field bg-white/80" placeholder="—" />
              </div>
            </div>
          </div>

          <div className="border border-red-200 rounded-xl bg-red-50/50 p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-red-600" />
              </span>
              <h3 className="text-sm font-bold text-red-800">Worst Case Paper</h3>
            </div>
            <div className="space-y-2">
              <div>
                <label className="input-label !text-red-700">Student Name</label>
                <input value={worstPaper.student} readOnly
                  className="input-field bg-white/80" placeholder="Auto-detected" />
              </div>
              <div>
                <label className="input-label !text-red-700">Marks Obtained</label>
                <input value={worstPaper.marks} readOnly
                  className="input-field bg-white/80" placeholder="—" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Student Marks Table */}
      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : selectedCourse && filtered.length > 0 ? (
        <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
          <div className="px-6 py-4 border-b border-surface-100 bg-surface-50/60">
            <h2 className="text-sm font-bold text-navy-900">Student Marks ({filtered.length})</h2>
            <p className="text-2xs text-navy-400 mt-0.5">Enter obtained marks for each student</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-100">
                  <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase">#</th>
                  <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Student</th>
                  <th className="px-6 py-3 text-left text-2xs font-bold text-navy-400 uppercase">Roll No</th>
                  <th className="px-6 py-3 text-center text-2xs font-bold text-navy-400 uppercase">Full Marks</th>
                  <th className="px-6 py-3 text-center text-2xs font-bold text-navy-400 uppercase">Obtained</th>
                  <th className="px-6 py-3 text-center text-2xs font-bold text-navy-400 uppercase">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {filtered.map((s, idx) => {
                  const obtained = parseInt(marks[s.id]?.obtained)
                  const full = parseInt(fullMarks)
                  const pct = !isNaN(obtained) && !isNaN(full) && full > 0
                    ? ((obtained / full) * 100).toFixed(1) : '—'
                  return (
                    <tr key={s.id} className="hover:bg-surface-50 transition-colors">
                      <td className="px-6 py-3 text-xs text-navy-400 font-medium">{idx + 1}</td>
                      <td className="px-6 py-3">
                        <div className="flex items-center gap-3">
                          <span className="w-8 h-8 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center">
                            <UserIcon className="w-3.5 h-3.5 text-white" />
                          </span>
                          <span className="text-sm font-semibold text-navy-900">{s.first_name} {s.last_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3 text-xs text-navy-500 font-mono">
                        {s.student_profile?.roll_number || '—'}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="text-sm font-bold text-navy-900">{fullMarks || '—'}</span>
                      </td>
                      <td className="px-6 py-3 text-center">
                        <input type="number" min={0} max={fullMarks || undefined}
                          value={marks[s.id]?.obtained || ''}
                          onChange={(e) => updateMark(s.id, e.target.value)}
                          className="w-24 text-center input-field text-sm py-1.5"
                          placeholder="0" />
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`text-sm font-bold ${
                          pct === '—' ? 'text-navy-300'
                            : parseFloat(pct) >= 80 ? 'text-emerald-600'
                            : parseFloat(pct) >= 50 ? 'text-amber-600'
                            : 'text-red-600'
                        }`}>
                          {pct !== '—' ? `${pct}%` : '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : selectedCourse ? (
        <div className="border border-dashed border-surface-200 rounded-xl p-12 text-center">
          <p className="text-navy-400 text-sm">No students enrolled in this course.</p>
        </div>
      ) : null}

      {/* Message */}
      {message && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
          message.includes('success') ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
        }`}>
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {message}
        </div>
      )}

      {/* Save */}
      {selectedCourse && students.length > 0 && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Mid-Term Marks'}
          </Button>
        </div>
      )}
    </div>
  )
}
