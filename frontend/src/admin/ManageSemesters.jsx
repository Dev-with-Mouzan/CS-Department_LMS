import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { usersAPI, coursesAPI } from '../services/api'
import Button from '../components/Button'
import { GraduationCap, BookOpen, Users, ArrowRight, Search, Building2, Layers, UserCheck } from 'lucide-react'

export default function ManageSemesters() {
  const [semesters, setSemesters] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    Promise.all([usersAPI.listSemesters(), coursesAPI.list()])
      .then(([s, c]) => {
        const semMap = {}
        s.data.forEach((sem) => {
          semMap[sem.semester] = {
            ...sem,
            courses: c.data.filter((course) => course.semester === sem.semester),
          }
        })
        setSemesters(Object.values(semMap))
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const filteredSemesters = semesters.filter((sem) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      String(sem.semester).includes(q) ||
      sem.courses.some((course) => `${course.course_code} ${course.title}`.toLowerCase().includes(q))
    )
  })

  const totalCourses = semesters.reduce((sum, sem) => sum + sem.course_count, 0)
  const totalStudents = semesters.reduce((sum, sem) => sum + sem.student_count, 0)

  const stats = [
    { label: 'Total Semesters', value: semesters.length, icon: Layers, chip: 'bg-navy-900/10 text-navy-800 border-navy-900/10' },
    { label: 'Courses', value: totalCourses, icon: BookOpen, chip: 'bg-accent-500/10 text-accent-700 border-accent-200' },
    { label: 'Students', value: totalStudents, icon: Users, chip: 'bg-success/10 text-success-dark border-success/20' },
    { label: 'Departments', value: 1, icon: Building2, chip: 'bg-info/10 text-info-dark border-info/20' },
  ]

  return (
    <div className="p-5 lg:p-8 max-w-5xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <GraduationCap className="w-3 h-3" />
          Semester Management
        </span>
        <h1 className="text-3xl font-bold text-navy-900 tracking-tight">Semesters</h1>
        <p className="text-sm text-navy-400 mt-1">
          {semesters.length} semesters · {totalCourses} courses · {totalStudents} students
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="border border-surface-200 rounded-xl bg-white p-4 flex items-center gap-3">
            <span className={`inline-flex w-11 h-11 rounded-xl border items-center justify-center shrink-0 ${s.chip}`}>
              <s.icon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-2xl font-extrabold text-navy-900 tracking-tight leading-none">{s.value}</p>
              <p className="text-xs font-medium text-navy-400 mt-1">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar: search + action */}
      <div className="border border-surface-200 rounded-xl bg-white p-3 mb-8 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-navy-300 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by semester or course name/code..."
            className="w-full pl-9 pr-4 py-2.5 bg-surface-50 border border-surface-200 rounded-xl text-sm text-navy-900 placeholder-navy-300 focus:outline-none focus:ring-2 focus:ring-accent-400/30 focus:border-accent-400 transition-all"
          />
        </div>
        <Link to="/admin/courses" className="lg:self-center">
          <Button>
            <BookOpen className="w-4 h-4" />
            Manage Courses
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="border border-surface-200 rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-200 bg-surface-50/60">
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Semester</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Courses</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Course List</th>
                <th className="px-6 py-4 text-left text-2xs font-bold text-navy-400 uppercase tracking-wider">Students</th>
                <th className="px-6 py-4 text-right text-2xs font-bold text-navy-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <div className="w-9 h-9 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin mx-auto" />
                  </td>
                </tr>
              ) : filteredSemesters.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <span className="inline-flex w-12 h-12 rounded-2xl bg-navy-900/5 text-navy-400 border border-navy-900/10 items-center justify-center mb-3">
                      <GraduationCap className="w-6 h-6" />
                    </span>
                    <p className="text-navy-500 text-sm font-medium">No semesters found matching your criteria.</p>
                  </td>
                </tr>
              ) : filteredSemesters.map((sem) => (
                <tr key={sem.semester} className="hover:bg-surface-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-400 to-accent-600 flex items-center justify-center shrink-0">
                        <GraduationCap className="w-4.5 h-4.5 text-navy-950" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy-900">Semester {sem.semester}</p>
                        <p className="text-2xs text-navy-300 font-medium">Year {(sem.semester + 1) / 2}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-semibold bg-accent-500/10 text-accent-700 border border-accent-200">
                      <BookOpen className="w-3 h-3" />
                      {sem.course_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {sem.courses.length === 0 ? (
                      <span className="text-xs text-navy-300">No courses assigned.</span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-w-md">
                        {sem.courses.map((course) => (
                          <span key={course.id} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface-50 border border-surface-200 text-2xs text-navy-600 font-medium">
                            <span className="font-mono text-navy-300">{course.course_code}</span>
                            {course.title}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 text-sm text-navy-600">
                      <UserCheck className="w-3.5 h-3.5 text-navy-300" />
                      {sem.student_count}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end">
                      <Link to="/admin/courses"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-2xs font-semibold text-navy-600 border border-surface-200 bg-white hover:bg-surface-50 hover:text-navy-900 transition-all">
                        Manage Courses
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}