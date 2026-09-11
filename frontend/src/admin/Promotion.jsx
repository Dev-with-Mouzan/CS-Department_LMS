import { useState, useEffect } from 'react'
import { promotionAPI, usersAPI } from '../services/api'
import Button from '../components/Button'
import Modal from '../components/Modal'
import {
  GraduationCap, Users, ChevronRight, ArrowRight, ArrowLeft,
  CheckCircle2, AlertCircle, UserPlus, X, TrendingUp,
  BookOpen, ClipboardCheck, FileText, Trophy, BarChart3,
  Clock, ChevronDown, ChevronUp, Paperclip,
} from 'lucide-react'

export default function Promotion() {
  const [sessions, setSessions] = useState([])
  const [selectedSession, setSelectedSession] = useState(null)
  const [semesters, setSemesters] = useState([])
  const [selectedSemester, setSelectedSemester] = useState(null)
  const [students, setStudents] = useState([])
  const [selectedStudents, setSelectedStudents] = useState([])
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, data: null })
  const [profileModal, setProfileModal] = useState({ open: false, data: null, loading: false })
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => { loadSessions() }, [])

  const loadSessions = async () => {
    setLoading(true)
    try { setSessions((await promotionAPI.getSessions()).data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadSemesters = async (session) => {
    setSelectedSession(session)
    setSelectedSemester(null)
    setStudents([])
    setSelectedStudents([])
    setLoading(true)
    try {
      const [semRes, histRes] = await Promise.all([
        promotionAPI.getSessionSemesters(session),
        promotionAPI.getHistory(session),
      ])
      setSemesters(semRes.data)
      setHistory(histRes.data)
    }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const refreshSemesters = async () => {
    if (!selectedSession) return
    try {
      const semRes = await promotionAPI.getSessionSemesters(selectedSession)
      setSemesters(semRes.data)
    } catch (err) { console.error(err) }
  }

  const loadStudents = async (semester) => {
    setSelectedSemester(semester)
    setSelectedStudents([])
    setLoading(true)
    try { setStudents((await promotionAPI.getSemesterStudents(selectedSession, semester)).data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadHistory = async () => {
    setLoading(true)
    try { setHistory((await promotionAPI.getHistory(selectedSession)).data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const loadProfile = async (userId) => {
    setProfileModal({ open: true, data: null, loading: true })
    try {
      const res = await usersAPI.getProfile(userId)
      setProfileModal({ open: true, data: res.data, loading: false })
    } catch (err) {
      setProfileModal({ open: false, data: null, loading: false })
    }
  }

  const toggleStudent = (id) => {
    setSelectedStudents((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    )
  }

  const toggleAll = () => {
    setSelectedStudents(selectedStudents.length === students.length ? [] : students.map((s) => s.id))
  }

  const promote = async (toSemester, studentIds) => {
    setLoading(true)
    setMessage('')
    try {
      const res = await promotionAPI.promote({ student_ids: studentIds, to_semester: toSemester })
      setMessage(res.data.message)
      setSelectedStudents([])
      setConfirmModal({ open: false, data: null })
      localStorage.setItem('coursesTab', 'inactive')
      if (selectedSemester) {
        loadStudents(selectedSemester)
        refreshSemesters()
      } else if (selectedSession) {
        loadSemesters(selectedSession)
      }
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Promotion failed')
    } finally {
      setLoading(false)
    }
  }

  const promoteAllInSemester = (fromSem) => {
    const count = semesters.find((s) => s.semester === fromSem)?.student_count || 0
    if (count === 0) return
    setConfirmModal({
      open: true,
      data: { action: 'semester', count, toSem: fromSem + 1, fromSem },
    })
  }

  const promoteSelected = () => {
    if (selectedStudents.length === 0) return
    setConfirmModal({
      open: true,
      data: { action: 'selected', count: selectedStudents.length, toSem: selectedSemester + 1 },
    })
  }

  const executePromote = () => {
    const { action, toSem, fromSem } = confirmModal.data
    if (action === 'semester') {
      promotionAPI.getSemesterStudents(selectedSession, fromSem).then((res) => {
        promote(toSem, res.data.map((s) => s.id))
      })
    } else if (action === 'graduate') {
      promotionAPI.graduate({ student_ids: confirmModal.data.studentIds }).then((res) => {
        setMessage(res.data.message)
        setConfirmModal({ open: false, data: null })
        localStorage.setItem('coursesTab', 'inactive')
        if (selectedSemester) loadStudents(selectedSemester)
      }).catch((err) => {
        setMessage(err.response?.data?.detail || 'Graduation failed')
        setConfirmModal({ open: false, data: null })
      })
    } else {
      promote(toSem, selectedStudents)
    }
  }

  const graduateAllInSemester = () => {
    const nonPromoted = students.filter((s) => !s.promoted && !s.is_graduated)
    if (nonPromoted.length === 0) return
    setConfirmModal({
      open: true,
      data: { action: 'graduate', count: nonPromoted.length, studentIds: nonPromoted.map((s) => s.id) },
    })
  }

  const totalStudents = semesters.reduce((sum, s) => sum + s.student_count, 0)
  const currentSem = semesters.find((s) => s.semester === semesters.reduce((min, s) => s.student_count > 0 ? Math.max(min, s.semester) : min, 0))
  const studentsToPromote = students.filter((s) => !s.promoted && !s.is_graduated).length

  return (
    <div className="p-5 lg:p-8 max-w-7xl mx-auto w-full">
      {/* Message toast */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 flex items-start gap-3 px-4 py-3 rounded-xl shadow-elevated text-sm font-medium animate-slide-up ${
          message.includes('failed') || message.includes('error') ? 'bg-danger-light text-danger-dark' : 'bg-success-light text-success-dark'
        }`}>
          {message.includes('failed') || message.includes('error')
            ? <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
          {message}
          <button onClick={() => setMessage('')} className="ml-2 opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* ── Session Selector ──────────────────────────── */}
      {!selectedSession && (
        <>
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">Semester Promotion</h1>
                <p className="text-sm text-navy-400">Select a session to manage student progression</p>
              </div>
            </div>
          </div>

          {loading && <div className="text-center py-16 text-navy-400 text-sm">Loading sessions...</div>}

          {!loading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sessions.map((s) => (
                <button key={s.session} onClick={() => loadSemesters(s.session)}
                  className="group text-left border border-surface-200 rounded-2xl p-6 bg-white hover:border-accent-300 hover:shadow-elevated transition-all duration-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <p className="text-xs font-semibold text-navy-400 uppercase tracking-wider mb-1">Session</p>
                      <p className="text-2xl font-extrabold text-navy-900">{s.session}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-accent-50 flex items-center justify-center group-hover:bg-accent-100 transition-colors">
                      <GraduationCap className="w-5 h-5 text-accent-500" />
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-navy-400" />
                      <span className="text-sm font-semibold text-navy-700">{s.student_count}</span>
                      <span className="text-xs text-navy-400">students</span>
                    </div>
                    <div className="text-xs text-navy-400">
                      Year {s.enrollment_year}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-surface-100 flex items-center justify-between">
                    <span className="text-xs text-navy-400">Click to view semesters</span>
                    <ChevronRight className="w-4 h-4 text-navy-300 group-hover:text-accent-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
              {sessions.length === 0 && (
                <div className="col-span-full text-center py-16">
                  <GraduationCap className="w-12 h-12 text-navy-200 mx-auto mb-3" />
                  <p className="text-navy-400 text-sm">No sessions found</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Session Dashboard ─────────────────────────── */}
      {selectedSession && !selectedSemester && (
        <>
          {/* Header */}
          <div className="mb-6">
            <button onClick={() => { setSelectedSession(null); setSemesters([]); setHistoryOpen(false) }}
              className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 transition-colors mb-3">
              <ArrowLeft className="w-4 h-4" /> All Sessions
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">Session {selectedSession}</h1>
                <p className="text-sm text-navy-400 mt-0.5">{totalStudents} students across {semesters.filter((s) => s.student_count > 0).length} semesters</p>
              </div>
              <button onClick={() => { setHistoryOpen(!historyOpen); if (!historyOpen) loadHistory() }}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-surface-200 text-sm font-medium text-navy-600 hover:bg-surface-50 transition-colors">
                <Clock className="w-4 h-4" /> History
                {historyOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {loading && <div className="text-center py-16 text-navy-400 text-sm">Loading...</div>}

          {/* History panel */}
          {!loading && historyOpen && (
            <div className="mb-6 border border-surface-200 rounded-2xl bg-white overflow-hidden animate-slide-up">
              <div className="px-5 py-3 border-b border-surface-100 bg-surface-50/50">
                <p className="text-sm font-semibold text-navy-700">Promotion History</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[600px]">
                  <thead>
                    <tr className="border-b border-surface-100">
                      <th className="text-left px-5 py-3 font-semibold text-navy-500 text-xs">Student</th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-500 text-xs">From</th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-500 text-xs">To</th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-500 text-xs">By</th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-500 text-xs">Date</th>
                      <th className="text-left px-5 py-3 font-semibold text-navy-500 text-xs"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-b border-surface-50 hover:bg-surface-50/50">
                        <td className="px-5 py-3 font-medium text-navy-900">{h.student_name}</td>
                        <td className="px-5 py-3 text-navy-500">Sem {h.from_semester}</td>
                        <td className="px-5 py-3">
                          <span className="inline-flex items-center gap-1 text-navy-500">
                            <ArrowRight className="w-3 h-3" /> Sem {h.to_semester}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-navy-500">{h.promoted_by}</td>
                        <td className="px-5 py-3 text-navy-400">{h.promoted_at ? new Date(h.promoted_at).toLocaleDateString() : '-'}</td>
                        <td className="px-5 py-3">
                          <button onClick={() => loadProfile(h.student_id)}
                            className="text-accent-600 hover:text-accent-700 text-xs font-semibold">View</button>
                        </td>
                      </tr>
                    ))}
                    {history.length === 0 && (
                      <tr><td colSpan="6" className="text-center py-8 text-navy-400 text-sm">No promotion history yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Semester Grid */}
          {!loading && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => {
                const data = semesters.find((s) => s.semester === sem)
                const count = data?.student_count || 0
                const gradCount = data?.graduated_count || 0
                const isCurrent = count > 0
                const canPromote = sem < 8
                const promotedFrom = sem < 8 && history.some((h) => h.from_semester === sem)
                const allPromoted = promotedFrom && count === 0
                const allGraduated = sem === 8 && count > 0 && gradCount === count
                const nextSem = sem + 1

                return (
                  <div key={sem}
                    className={`relative border rounded-2xl overflow-hidden transition-all duration-200 ${
                      allPromoted || allGraduated
                        ? 'border-surface-200 bg-surface-50 opacity-60'
                        : isCurrent
                          ? 'border-accent-200 bg-white shadow-sm'
                          : 'border-surface-200 bg-white'
                    }`}>
                    {/* Card header */}
                    <div className={`w-full text-left p-5 ${allPromoted || allGraduated ? 'cursor-default' : count > 0 ? 'hover:bg-surface-50/50 cursor-pointer' : 'cursor-default'} transition-colors`}>
                      {!allPromoted && !allGraduated && (
                        <button onClick={() => loadStudents(sem)} className="w-full text-left">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                                isCurrent ? 'bg-accent-500 text-white' : 'bg-surface-100 text-navy-400'
                              }`}>{sem}</span>
                              <span className="text-sm font-bold text-navy-900">Sem {sem}</span>
                            </div>
                            {count > 0 && <ChevronRight className="w-4 h-4 text-navy-300" />}
                          </div>
                          <p className="text-3xl font-extrabold text-navy-900 mb-1">{count}</p>
                          <p className="text-xs text-navy-400">{count === 1 ? 'student' : 'students'}</p>
                          {count > 0 && (
                            <div className="mt-3">
                              <div className="flex items-center justify-between text-[10px] text-navy-400 mb-1">
                                <span>Progress</span>
                                <span>{sem === 8 ? '100%' : `${Math.round((sem / 8) * 100)}%`}</span>
                              </div>
                              <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-500 ${
                                  sem === 8 ? 'bg-success' : 'bg-accent-400'
                                }`} style={{ width: `${sem === 8 ? 100 : (sem / 8) * 100}%` }} />
                              </div>
                            </div>
                          )}
                        </button>
                      )}
                      {allPromoted && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-surface-200 text-navy-400">{sem}</span>
                              <span className="text-sm font-bold text-navy-500">Sem {sem}</span>
                            </div>
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          </div>
                          <p className="text-sm font-semibold text-navy-500">All promoted to Sem {nextSem}</p>
                        </>
                      )}
                      {allGraduated && (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold bg-surface-200 text-navy-400">{sem}</span>
                              <span className="text-sm font-bold text-navy-500">Sem {sem}</span>
                            </div>
                            <GraduationCap className="w-4 h-4 text-success" />
                          </div>
                          <p className="text-sm font-semibold text-navy-500">All graduated</p>
                        </>
                      )}
                    </div>

                    {/* Promote button / Promoted status */}
                    {allPromoted && (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-surface-100 bg-success-light text-success-dark text-xs font-semibold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Promoted to Sem {nextSem}
                      </div>
                    )}
                    {allGraduated && (
                      <div className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-surface-100 bg-success-light text-success-dark text-xs font-semibold">
                        <GraduationCap className="w-3.5 h-3.5" /> Graduated
                      </div>
                    )}
                    {!allPromoted && !allGraduated && canPromote && !promotedFrom && count > 0 && (
                      <button onClick={(e) => { e.stopPropagation(); promoteAllInSemester(sem) }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-t border-surface-100 bg-accent-50/50 text-accent-700 hover:bg-accent-100 cursor-pointer text-xs font-semibold transition-colors">
                        <ArrowRight className="w-3.5 h-3.5" /> Promote to Sem {nextSem}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ── Student List ──────────────────────────────── */}
      {selectedSession && selectedSemester && (
        <>
          {/* Header */}
          <div className="mb-6">
            <button onClick={() => { setSelectedSemester(null); setStudents([]); setSelectedStudents([]) }}
              className="flex items-center gap-1.5 text-sm text-navy-400 hover:text-navy-700 transition-colors mb-3">
              <ArrowLeft className="w-4 h-4" /> Session {selectedSession}
            </button>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">Semester {selectedSemester}</h1>
                <p className="text-sm text-navy-400 mt-0.5">{students.length} students in this semester</p>
              </div>
              {selectedSemester < 8 && studentsToPromote > 0 && (
                <div className="flex items-center gap-2">
                  {selectedStudents.length > 0 && (
                    <Button onClick={promoteSelected} size="sm">
                      <ArrowRight className="w-4 h-4" /> Promote {selectedStudents.length} to Sem {selectedSemester + 1}
                    </Button>
                  )}
                  {selectedStudents.length === 0 && (
                    <Button onClick={promoteAllInSemester.bind(null, selectedSemester)} size="sm" variant="outline">
                      <UserPlus className="w-4 h-4" /> Promote All to Sem {selectedSemester + 1}
                    </Button>
                  )}
                </div>
              )}
              {selectedSemester === 8 && studentsToPromote > 0 && (
                <Button onClick={graduateAllInSemester} size="sm" variant="outline">
                  <GraduationCap className="w-4 h-4" /> Mark as Graduated
                </Button>
              )}
            </div>
          </div>

          {loading && <div className="text-center py-16 text-navy-400 text-sm">Loading students...</div>}

          {!loading && (
            <div className="border border-surface-200 rounded-2xl bg-white overflow-hidden">
              {/* Bulk actions bar */}
              {selectedStudents.length > 0 && (
                <div className="px-5 py-3 bg-accent-50 border-b border-accent-200 flex items-center justify-between animate-slide-up">
                  <span className="text-sm font-medium text-accent-700">{selectedStudents.length} selected</span>
                  <button onClick={() => setSelectedStudents([])} className="text-xs text-accent-600 hover:text-accent-800 font-medium">Clear</button>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-surface-100 bg-surface-50/60">
                      <th className="px-5 py-3 text-left">
                        <input type="checkbox" checked={selectedStudents.length === students.length && students.length > 0}
                          onChange={toggleAll} className="rounded" />
                      </th>
                      <th className="px-5 py-3 text-left font-semibold text-navy-500 text-xs">Student</th>
                      <th className="px-5 py-3 text-left font-semibold text-navy-500 text-xs">Roll No</th>
                      <th className="px-5 py-3 text-left font-semibold text-navy-500 text-xs">Status</th>
                      <th className="px-5 py-3 text-right font-semibold text-navy-500 text-xs">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}
                        onClick={() => !s.promoted && !s.is_graduated && toggleStudent(s.id)}
                        className={`border-b border-surface-50 transition-colors ${
                          s.promoted || s.is_graduated ? 'bg-surface-50/30 cursor-default' :
                          selectedStudents.includes(s.id) ? 'bg-accent-50/50 cursor-pointer' : 'hover:bg-surface-50/50 cursor-pointer'
                        }`}>
                        <td className="px-5 py-3">
                          {!s.promoted && !s.is_graduated && (
                            <input type="checkbox" checked={selectedStudents.includes(s.id)}
                              onChange={() => toggleStudent(s.id)}
                              onClick={(e) => e.stopPropagation()} className="rounded" />
                          )}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                              s.promoted ? 'bg-gradient-to-br from-navy-300 to-navy-400' : 'bg-gradient-to-br from-accent-400 to-accent-600'
                            }`}>
                              {s.first_name?.[0]}{s.last_name?.[0]}
                            </div>
                            <div>
                              <p className="font-semibold text-navy-900">{s.first_name} {s.last_name}</p>
                              <p className="text-xs text-navy-400">{s.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3 text-navy-500 font-mono text-xs">{s.roll_number || '-'}</td>
                        <td className="px-5 py-3">
                          {s.is_graduated ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-success-light text-success-dark">
                              <CheckCircle2 className="w-3 h-3" /> Graduated
                            </span>
                          ) : s.promoted ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-accent-50 text-accent-700">
                              <ArrowRight className="w-3 h-3" /> Promoted to Sem {s.promoted_to}
                            </span>
                          ) : (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              s.is_active ? 'bg-success-light text-success-dark' : 'bg-surface-100 text-navy-400'
                            }`}>{s.is_active ? 'Active' : 'Inactive'}</span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-right">
                          {!s.promoted && !s.is_graduated && (
                            <button onClick={(e) => { e.stopPropagation(); loadProfile(s.id) }}
                              className="text-accent-600 hover:text-accent-700 text-xs font-semibold underline underline-offset-2">
                              View Profile
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {students.length === 0 && (
                      <tr><td colSpan="5" className="text-center py-16 text-navy-400 text-sm">No students in this semester</td></tr>
                    )}
                    {students.length > 0 && students.every(s => s.promoted) && (
                      <tr><td colSpan="5" className="text-center py-8 text-navy-400 text-xs">All students in this semester have been promoted</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Confirm Modal ─────────────────────────────── */}
      <Modal isOpen={confirmModal.open} onClose={() => setConfirmModal({ open: false, data: null })}
        title={confirmModal.data?.action === 'graduate' ? 'Confirm Graduation' : 'Confirm Promotion'}>
        {confirmModal.data && (
          <div className="p-5">
            {confirmModal.data.action === 'graduate' ? (
              <div className="flex items-center gap-3 mb-4 p-3 bg-success-light rounded-xl">
                <GraduationCap className="w-5 h-5 text-success-dark" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    Graduate {confirmModal.data.count} {confirmModal.data.count === 1 ? 'student' : 'students'}
                  </p>
                  <p className="text-xs text-navy-500">Mark as graduated from Semester 8</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 mb-4 p-3 bg-accent-50 rounded-xl">
                <ArrowRight className="w-5 h-5 text-accent-600" />
                <div>
                  <p className="text-sm font-semibold text-navy-900">
                    Promote {confirmModal.data.count} {confirmModal.data.count === 1 ? 'student' : 'students'}
                  </p>
                  <p className="text-xs text-navy-500">to Semester {confirmModal.data.toSem}</p>
                </div>
              </div>
            )}
            <p className="text-xs text-navy-400 mb-5">This action will be recorded and cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmModal({ open: false, data: null })} size="sm">Cancel</Button>
              <Button onClick={executePromote} size="sm">
                {confirmModal.data.action === 'graduate'
                  ? <><GraduationCap className="w-4 h-4" /> Confirm Graduation</>
                  : <><ArrowRight className="w-4 h-4" /> Confirm Promotion</>}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Student Profile Modal ─────────────────────── */}
      <Modal isOpen={profileModal.open} onClose={() => setProfileModal({ open: false, data: null })} title="Student Profile" size="xl">
        {profileModal.loading && (
          <div className="p-12 text-center">
            <div className="w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm text-navy-400">Loading profile...</p>
          </div>
        )}
        {profileModal.data && <StudentProfileContent data={profileModal.data} />}
      </Modal>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════
   Student Profile Content
   ═══════════════════════════════════════════════════════ */
function StudentProfileContent({ data }) {
  const [activeTab, setActiveTab] = useState('overview')
  const [semesterData, setSemesterData] = useState(null)
  const [loadingSemesters, setLoadingSemesters] = useState(false)
  const { user, profile, attendance, assignments, quizzes, results, promotions } = data

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart3 },
    { key: 'semesters', label: 'Semesters', icon: GraduationCap },
    { key: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { key: 'assignments', label: 'Assignments', icon: BookOpen },
    { key: 'quizzes', label: 'Quizzes', icon: FileText },
    { key: 'results', label: 'Results', icon: Trophy },
  ]

  const loadSemesters = async () => {
    if (semesterData) return
    setLoadingSemesters(true)
    try { setSemesterData((await usersAPI.getSemesterProgress(user.id)).data) }
    catch (err) { console.error(err) }
    finally { setLoadingSemesters(false) }
  }

  const avgAttendance = attendance.length > 0 ? Math.round(attendance.reduce((s, a) => s + a.percentage, 0) / attendance.length) : 0
  const gradedAssignments = assignments.filter((a) => a.grade != null)
  const avgGrade = gradedAssignments.length > 0 ? Math.round(gradedAssignments.reduce((s, a) => s + a.grade, 0) / gradedAssignments.length) : null
  const attemptedQuizzes = quizzes.filter((q) => q.attempted)
  const gradedQuizzes = attemptedQuizzes.filter((q) => q.total_questions > 0)
  const avgQuizScore = gradedQuizzes.length > 0 ? Math.round(gradedQuizzes.reduce((s, q) => s + (q.score / q.total) * 100, 0) / gradedQuizzes.length) : null

  return (
    <div className="max-h-[75vh] overflow-y-auto -mx-6 -my-6">
      {/* Profile header */}
      <div className="px-6 py-5 border-b border-surface-100 bg-surface-50/30">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-white font-bold text-xl shadow-sm">
            {user.first_name?.[0]}{user.last_name?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-navy-900">{user.first_name} {user.last_name}</h3>
            <p className="text-xs text-navy-400 truncate">{user.email}</p>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-100 text-[10px] font-semibold text-navy-600">
                Roll: {profile.roll_number || '-'}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-accent-50 text-[10px] font-semibold text-accent-700">
                {profile.session} — Sem {profile.semester}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface-100 text-[10px] font-semibold text-navy-600">
                {profile.department}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 pt-3 border-b border-surface-100 flex gap-0.5 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.key}
            onClick={() => { setActiveTab(tab.key); if (tab.key === 'semesters') loadSemesters() }}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-t-lg transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-navy-900 border border-b-0 border-surface-200 shadow-sm'
                : 'text-navy-400 hover:text-navy-600 hover:bg-surface-50'
            }`}>
            <tab.icon className="w-3.5 h-3.5" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-6">
        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard label="Attendance" value={`${avgAttendance}%`}
                color={avgAttendance >= 75 ? 'success' : avgAttendance >= 50 ? 'warning' : 'danger'} />
              <StatCard label="Avg Grade" value={avgGrade != null ? `${avgGrade}%` : '-'}
                sub={`${gradedAssignments.length}/${assignments.length} graded`} color="info" />
              <StatCard label="Quiz Avg" value={avgQuizScore != null ? `${avgQuizScore}%` : '-'}
                sub={`${attemptedQuizzes.length}/${quizzes.length} attempted`} color="info" />
              <StatCard label="Results" value={results.length} sub="uploaded" color="navy" />
            </div>
            {promotions.length > 0 && (
              <div className="border border-surface-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-navy-600 mb-3">Promotion History</p>
                <div className="space-y-2">
                  {promotions.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <span className="w-5 h-5 rounded bg-success-light text-success-dark flex items-center justify-center text-[10px] font-bold">
                        <ArrowRight className="w-3 h-3" />
                      </span>
                      <span className="text-navy-600">Sem {p.from_semester} → Sem {p.to_semester}</span>
                      <span className="text-navy-400">({p.session})</span>
                      <span className="text-navy-300 ml-auto">{p.promoted_at ? new Date(p.promoted_at).toLocaleDateString() : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Semesters */}
        {activeTab === 'semesters' && (
          <div>
            {loadingSemesters && (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs text-navy-400">Loading...</p>
              </div>
            )}
            {!loadingSemesters && semesterData && (
              <div className="space-y-3">
                {/* Timeline bar */}
                <div className="flex items-center gap-1 mb-4">
                  {semesterData.semesters.map((sem) => (
                    <div key={sem.semester} className="flex-1">
                      <div className={`h-2 rounded-full ${
                        sem.status === 'completed' ? 'bg-success' :
                        sem.status === 'current' ? 'bg-accent-500' : 'bg-surface-200'
                      }`} />
                      <p className={`text-center text-[9px] mt-1 font-semibold ${
                        sem.status === 'current' ? 'text-accent-600' : 'text-navy-400'
                      }`}>{sem.semester}</p>
                    </div>
                  ))}
                </div>

                {/* Semester cards */}
                {semesterData.semesters.map((sem) => {
                  const isCurrent = sem.status === 'current'
                  const isCompleted = sem.status === 'completed'
                  return (
                    <div key={sem.semester}
                      className={`border rounded-xl p-4 ${
                        isCurrent ? 'border-accent-300 bg-accent-50/30' :
                        isCompleted ? 'border-surface-200 bg-white' :
                        'border-dashed border-surface-200 bg-surface-50/30'
                      }`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-bold ${
                            isCurrent ? 'bg-accent-500 text-white' :
                            isCompleted ? 'bg-success-light text-success-dark' :
                            'bg-surface-100 text-navy-400'
                          }`}>{sem.semester}</span>
                          <span className="text-sm font-bold text-navy-900">Semester {sem.semester}</span>
                          {isCurrent && <span className="px-1.5 py-0.5 rounded bg-accent-500/10 text-accent-600 text-[9px] font-bold">CURRENT</span>}
                          {isCompleted && <span className="px-1.5 py-0.5 rounded bg-success-light text-success-dark text-[9px] font-bold">DONE</span>}
                        </div>
                        {!isCurrent && !isCompleted && <span className="text-[10px] text-navy-400">Upcoming</span>}
                        {isCompleted && (
                          <span className={`text-sm font-extrabold ${sem.attendance_pct >= 75 ? 'text-success-dark' : sem.attendance_pct >= 50 ? 'text-amber-600' : 'text-danger-dark'}`}>
                            {sem.attendance_pct}%
                          </span>
                        )}
                      </div>
                      {!isCurrent && !isCompleted ? (
                        <p className="text-[10px] text-navy-400">Not yet started</p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2 mt-2">
                          <MiniStat label="Courses" value={sem.courses} />
                          <MiniStat label="Attended" value={`${sem.present}/${sem.total_sessions}`} />
                          <MiniStat label="Assignments" value={`${sem.submitted_assignments}/${sem.total_assignments}`} />
                          <MiniStat label="Quizzes" value={`${sem.attempted_quizzes}/${sem.total_quizzes}`} />
                        </div>
                      )}
                      {sem.course_names.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {sem.course_names.map((name, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-surface-100 text-[9px] font-medium text-navy-600">{name}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Attendance */}
        {activeTab === 'attendance' && (
          <div className="space-y-2">
            {attendance.map((a) => (
              <div key={a.course_id} className="flex items-center gap-4 p-3 border border-surface-200 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{a.course_name}</p>
                  <p className="text-xs text-navy-400">{a.present}/{a.total_sessions} classes attended</p>
                </div>
                <div className="w-24">
                  <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${a.percentage >= 75 ? 'bg-success' : a.percentage >= 50 ? 'bg-amber-400' : 'bg-danger'}`}
                      style={{ width: `${a.percentage}%` }} />
                  </div>
                </div>
                <span className={`text-sm font-extrabold w-14 text-right ${a.percentage >= 75 ? 'text-success-dark' : a.percentage >= 50 ? 'text-amber-600' : 'text-danger-dark'}`}>
                  {a.percentage}%
                </span>
              </div>
            ))}
            {attendance.length === 0 && <EmptyState message="No attendance records" />}
          </div>
        )}

        {/* Assignments */}
        {activeTab === 'assignments' && (
          <div className="space-y-2">
            {assignments.map((a) => (
              <div key={a.id} className="flex items-center gap-4 p-3 border border-surface-200 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{a.title}</p>
                  <p className="text-xs text-navy-400">{a.course_name} — {a.due_date ? `Due ${new Date(a.due_date).toLocaleDateString()}` : 'No deadline'}</p>
                </div>
                <div className="text-right shrink-0">
                  {a.submitted ? (
                    <span className={`text-sm font-bold ${a.grade != null ? 'text-success-dark' : 'text-amber-600'}`}>
                      {a.grade != null ? `${a.grade}/${a.max_marks}` : 'Submitted'}
                    </span>
                  ) : (
                    <span className="text-xs text-navy-400">Not submitted</span>
                  )}
                </div>
              </div>
            ))}
            {assignments.length === 0 && <EmptyState message="No assignments" />}
          </div>
        )}

        {/* Quizzes */}
        {activeTab === 'quizzes' && (
          <div className="space-y-2">
            {quizzes.map((q) => (
              <div key={q.id} className="flex items-center gap-4 p-3 border border-surface-200 rounded-xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900 truncate">{q.title}</p>
                  <p className="text-xs text-navy-400">{q.course_name} — {q.total_questions > 0 ? `${q.total_questions} questions` : 'File submission'}</p>
                  {q.submission_url && (
                    <a
                      href={`/api/files/${q.submission_url}?token=${localStorage.getItem('token')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent-600 hover:text-accent-700 font-medium mt-1"
                    >
                      <Paperclip className="w-3 h-3" />
                      {q.submission_name || 'View submission'}
                    </a>
                  )}
                </div>
                <div className="text-right shrink-0">
                  {q.attempted ? (
                    q.total_questions > 0 ? (
                      <span className={`text-sm font-bold ${q.score / q.total >= 0.5 ? 'text-success-dark' : 'text-danger-dark'}`}>
                        {q.score}/{q.total}
                      </span>
                    ) : (
                      <span className="text-xs text-success-dark font-semibold">Submitted</span>
                    )
                  ) : (
                    <span className="text-xs text-navy-400">Not attempted</span>
                  )}
                </div>
              </div>
            ))}
            {quizzes.length === 0 && <EmptyState message="No quizzes" />}
          </div>
        )}

        {/* Results */}
        {activeTab === 'results' && (
          <div className="space-y-2">
            {results.map((r) => (
              <div key={r.id} className="flex items-center gap-4 p-3 border border-surface-200 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-info/10 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-info-dark" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy-900">{r.course_name}</p>
                  <p className="text-xs text-navy-400">{r.exam_type} — {r.file_name}</p>
                </div>
                <span className="text-xs text-navy-400 shrink-0">{r.uploaded_at ? new Date(r.uploaded_at).toLocaleDateString() : ''}</span>
              </div>
            ))}
            {results.length === 0 && <EmptyState message="No results uploaded" />}
          </div>
        )}
      </div>
    </div>
  )
}


/* ═══════════════════════════════════════════════════════
   Small helpers
   ═══════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, color }) {
  const colors = {
    success: 'bg-success-light border-success/20',
    warning: 'bg-amber-50 border-amber-200',
    danger: 'bg-danger-light border-danger/20',
    info: 'bg-info/10 border-info/20',
    navy: 'bg-navy-50 border-navy-200',
  }
  return (
    <div className={`border rounded-xl p-3 ${colors[color] || colors.navy}`}>
      <p className="text-[10px] font-semibold text-navy-500 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-extrabold text-navy-900 mt-0.5 leading-none">{value}</p>
      {sub && <p className="text-[10px] text-navy-400 mt-1">{sub}</p>}
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-sm font-extrabold text-navy-900">{value}</p>
      <p className="text-[9px] text-navy-400">{label}</p>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div className="text-center py-8">
      <p className="text-sm text-navy-400">{message}</p>
    </div>
  )
}
