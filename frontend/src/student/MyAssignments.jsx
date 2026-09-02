import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { assignmentsAPI } from '../services/api'
import Button from '../components/Button'
import {
  ClipboardList,
  UploadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Award,
  ChevronLeft,
} from 'lucide-react'

export default function MyAssignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [message, setMessage] = useState('')

  useEffect(() => { loadAssignments() }, [])

  const loadAssignments = async () => {
    try { const r = await assignmentsAPI.list(); setAssignments(r.data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleUpload = async (assignmentId, file) => {
    setUploading(assignmentId)
    setMessage('')
    try {
      await assignmentsAPI.submit(assignmentId, file)
      setMessage('Assignment submitted successfully!')
      loadAssignments()
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Failed to submit')
    } finally { setUploading(null) }
  }

  return (
    <div className="p-6 lg:p-10 max-w-5xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <ClipboardList className="w-3 h-3" />
          Assignment Management
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Assignments</h1>
        <p className="text-navy-400 mt-1.5">View and submit your assignments</p>
      </div>

      {message && (
        <div className={`flex items-start gap-3 px-4 py-3 rounded-xl mb-6 text-sm font-medium ${
          message.includes('success') ? 'bg-success-light text-success-dark' : 'bg-danger-light text-danger-dark'
        }`}>
          {message.includes('success') ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />}
          {message}
        </div>
      )}

      {loading ? (
        <div className="min-h-[200px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : assignments.length === 0 ? (
        <div className="border border-dashed border-surface-200 rounded-xl p-16 text-center">
          <span className="inline-flex w-14 h-14 rounded-2xl bg-accent-500/10 text-accent-600 border border-accent-200 items-center justify-center mb-4">
            <ClipboardList className="w-7 h-7" />
          </span>
          <p className="text-navy-500 text-sm font-medium">No assignments available yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assignments.map(a => {
            const isPast = new Date(a.due_date) < new Date()
            const daysLeft = Math.ceil((new Date(a.due_date) - new Date()) / (1000 * 60 * 60 * 24))

            return (
              <div key={a.id} className={`border border-surface-200 rounded-xl bg-white p-5 transition-all ${isPast ? 'opacity-70' : 'hover:border-accent-300'}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-navy-900">{a.title}</h3>
                      {isPast && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-danger-light text-danger-dark text-2xs font-bold">
                          <AlertTriangle className="w-3 h-3" />
                          Past due
                        </span>
                      )}
                    </div>
                    {a.description && <p className="text-xs text-navy-400 mt-1 line-clamp-2">{a.description}</p>}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                      <span className="inline-flex items-center gap-1.5 text-2xs text-navy-400">
                        <Clock className="w-3 h-3 text-navy-300" />
                        Due: {new Date(a.due_date).toLocaleDateString()}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-2xs text-navy-400">
                        <Award className="w-3 h-3 text-navy-300" />
                        Max: {a.max_marks}
                      </span>
                      {!isPast && daysLeft > 0 && (
                        <span className={`inline-flex items-center gap-1.5 text-2xs font-bold ${
                          daysLeft <= 2 ? 'text-danger' : daysLeft <= 7 ? 'text-warning-dark' : 'text-navy-400'
                        }`}>
                          <Clock className="w-3 h-3" />
                          {daysLeft} days left
                        </span>
                      )}
                    </div>
                  </div>

                  {!isPast && (
                    <label className="cursor-pointer ml-4 shrink-0">
                      <input type="file" className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
                        onChange={(e) => e.target.files[0] && handleUpload(a.id, e.target.files[0])} />
                      <span className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent-500 text-white hover:bg-accent-400 shadow-md shadow-accent-500/20 transition-colors ${
                        uploading === a.id ? 'opacity-70 pointer-events-none' : ''
                      }`}>
                        {uploading === a.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Uploading
                          </span>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            Submit
                          </>
                        )}
                      </span>
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-center mt-8">
        <Link to="/student" className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-navy-500 hover:text-navy-900 border border-surface-200 bg-white transition-colors">
          <ChevronLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  )
}