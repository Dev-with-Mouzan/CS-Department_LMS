import { useState, useEffect } from 'react'
import { usersAPI, coursesAPI, assignmentsAPI } from '../services/api'
import Button from '../components/Button'
import {
  UserCog, Search, BookOpen, Award, Clock,
  CheckCircle2, AlertTriangle, ChevronDown, Mail, Phone, Hash,
} from 'lucide-react'

export default function StudentReview() {
  const [courses, setCourses] = useState([])
  const [selectedCourse, setSelectedCourse] = useState('')
  const [students, setStudents] = useState([])
  const [studentStats, setStudentStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [expandedStudent, setExpandedStudent] = useState(null)

  useEffect(() => {
    coursesAPI.list()
      .then(r => setCourses(r.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedCourse) { setStudents([]); return }
    setLoading(true)
    coursesAPI.listEnrollments(selectedCourse)
      .then(async (r) => {
        const enrolled = r.data.filter(e => e.status === 'active')
        const studentIds = enrolled.map(e => e.student_id)
        // Fetch student details
        const studentDetails = await Promise.all(
          studentIds.map(id => usersAPI.get(id).then(res => res.data).catch(() => null))
        )
        setStudents(studentDetails.filter(Boolean))
        // Fetch assignment stats for this course
        try {
          const assignmentsRes = await assignmentsAPI.list({ course_id: selectedCourse })
          const assignments = assignmentsRes.data
          const stats = {}
          for (const s of studentDetails.filter(Boolean)) {
            let totalGrades = 0, gradedCount = 0, submittedCount = 0
            for (const a of assignments) {
              try {
                const subs = await assignmentsAPI.listSubmissions(a.id)
                const mySub = subs.data.find(sub => sub.student_id === s.id)
                if (mySub) {
                  submittedCount++
                  if (mySub.grade != null) { totalGrades += mySub.grade; gradedCount++ }
                }
              } catch {}
            }
            stats[s.id] = {
              assignmentsSubmitted: submittedCount,
              totalAssignments: assignments.length,
              avgGrade: gradedCount > 0 ? (totalGrades / gradedCount).toFixed(1) : '—',
            }
          }
          setStudentStats(stats)
        } catch {}
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [selectedCourse])

  const filtered = students.filter(s => {
    const q = search.toLowerCase()
    const name = `${s.first_name} ${s.last_name}`.toLowerCase()
    return name.includes(q) || s.email?.toLowerCase().includes(q)
  })

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <UserCog className="w-3 h-3" />
          Student Review
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Review</h1>
        <p className="text-navy-400 mt-1.5">View enrolled students and their performance</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
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

      {/* Content */}
      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : !selectedCourse ? (
        <EmptyState icon={BookOpen} message="Select a course to view enrolled students." />
      ) : filtered.length === 0 ? (
        <EmptyState icon={UserCog} message={search ? 'No students match your search.' : 'No students enrolled in this course.'} />
      ) : (
        <div className="space-y-2">
          {filtered.map((s) => {
            const stats = studentStats[s.id] || {}
            const isExpanded = expandedStudent === s.id
            return (
              <div key={s.id}
                className={`border rounded-xl bg-white transition-all ${isExpanded ? 'border-accent-500 ring-2 ring-accent-400/30' : 'border-surface-200 hover:border-accent-300'}`}>
                {/* Student Row */}
                <div onClick={() => setExpandedStudent(isExpanded ? null : s.id)}
                  className="flex items-center gap-4 p-4 cursor-pointer">
                  <span className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {s.first_name?.[0]}{s.last_name?.[0]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-navy-900">{s.first_name} {s.last_name}</h3>
                    <p className="text-xs text-navy-400 truncate">{s.email}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-4 shrink-0">
                    <StatBadge label="Submitted" value={stats.assignmentsSubmitted ?? '—'} total={stats.totalAssignments} color="bg-accent-500/10 text-accent-600" />
                    <StatBadge label="Avg Grade" value={stats.avgGrade ?? '—'} color="bg-emerald-50 text-emerald-600" />
                  </div>
                  <ChevronDown className={`w-4 h-4 text-navy-300 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-surface-100">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <InfoCard icon={Mail} label="Email" value={s.email} />
                      <InfoCard icon={Phone} label="Phone" value={s.phone || '—'} />
                      <InfoCard icon={Hash} label="Student ID" value={s.student_profile?.student_id || '—'} />
                      <InfoCard icon={Hash} label="Roll No." value={s.student_profile?.roll_number || '—'} />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
                      <InfoCard icon={BookOpen} label="Department" value={s.student_profile?.department || '—'} />
                      <InfoCard icon={Award} label="Semester" value={s.student_profile?.semester || '—'} />
                      <InfoCard icon={Clock} label="Enrollment Year" value={s.student_profile?.enrollment_year || '—'} />
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function EmptyState({ icon: Icon, message }) {
  return (
    <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
      <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
        <Icon className="w-7 h-7" />
      </span>
      <p className="text-navy-500 text-sm font-medium">{message}</p>
    </div>
  )
}

function StatBadge({ label, value, total, color }) {
  return (
    <div className="text-center">
      <span className={`inline-flex items-center justify-center min-w-[36px] h-6 px-2 rounded-md text-xs font-bold ${color}`}>
        {total != null ? `${value}/${total}` : value}
      </span>
      <p className="text-[10px] text-navy-400 mt-0.5">{label}</p>
    </div>
  )
}

function InfoCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface-50 border border-surface-100">
      <Icon className="w-3.5 h-3.5 text-navy-300 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-navy-400 uppercase font-semibold">{label}</p>
        <p className="text-xs font-medium text-navy-900 truncate">{value}</p>
      </div>
    </div>
  )
}
