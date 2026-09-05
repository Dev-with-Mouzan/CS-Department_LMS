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
  ShieldAlert,
  X,
  Paperclip,
  Download,
} from 'lucide-react'

export default function MyAssignments() {
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null)
  const [message, setMessage] = useState('')
  const [confirmModal, setConfirmModal] = useState({ open: false, assignmentId: null, fileName: '', file: null })

  useEffect(() => { loadAssignments() }, [])

  const loadAssignments = async () => {
    try { const r = await assignmentsAPI.list(); setAssignments(r.data) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const handleFileSelect = (assignmentId, file) => {
    setConfirmModal({ open: true, assignmentId, fileName: file.name, file })
  }

  const handleConfirmUpload = async () => {
    const { assignmentId, file } = confirmModal
    setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })
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
      {/* Confirmation Modal */}
      {confirmModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm" onClick={() => setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-fade-in">
            <button
              onClick={() => setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })}
              className="absolute top-4 right-4 text-navy-300 hover:text-navy-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="text-center mb-5">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-warning/10 text-warning-dark border border-warning/20 mb-4">
                <ShieldAlert className="w-6 h-6" />
              </span>
              <h2 className="text-lg font-bold text-navy-900">Confirm Submission</h2>
              <p className="text-sm text-navy-400 mt-1">
                You are about to submit <span className="font-semibold text-navy-700">{confirmModal.fileName}</span>.
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
              <p className="text-xs text-amber-800 leading-relaxed">
                ⚠️ <strong>Please note:</strong> Once submitted, you may not be able to change your file. Make sure you have selected the correct file before proceeding.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal({ open: false, assignmentId: null, fileName: '', file: null })}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border border-surface-200 text-navy-600 hover:bg-surface-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmUpload}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-accent-500 text-white hover:bg-accent-400 transition-colors"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

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
                    {a.attachment_url && (
                      <a
                        href={`/uploads/${a.attachment_url.replace(/^uploads[\\/]/, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-lg bg-accent-500/10 border border-accent-200 text-accent-700 text-xs font-semibold hover:bg-accent-500/20 transition-colors"
                      >
                        <Paperclip className="w-3 h-3" />
                        View Attachment
                        <Download className="w-3 h-3" />
                      </a>
                    )}
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
                </div>

                {/* Submit button moved below, full width row */}
                {!isPast && (
                  <div className="mt-4 pt-4 border-t border-surface-100">
                    <label className="cursor-pointer block">
                      <input type="file" className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.zip,.png,.jpg,.jpeg"
                        onChange={(e) => e.target.files[0] && handleFileSelect(a.id, e.target.files[0])} />
                      <span className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-accent-500 text-white hover:bg-accent-400 shadow-md shadow-accent-500/20 transition-colors ${
                        uploading === a.id ? 'opacity-70 pointer-events-none' : ''
                      }`}>
                        {uploading === a.id ? (
                          <span className="flex items-center gap-1.5">
                            <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Uploading...
                          </span>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5" />
                            Submit Assignment
                          </>
                        )}
                      </span>
                    </label>
                  </div>
                )}
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
