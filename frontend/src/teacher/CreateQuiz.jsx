import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { coursesAPI, quizzesAPI } from '../services/api'
import Button from '../components/Button'
import {
  BookOpen, FileText, AlertCircle,
  Plus, Trash2, PenLine, CheckCircle2, Paperclip,
} from 'lucide-react'

export default function CreateQuiz({ courseId, onSuccess, onCancel }) {
  const [courses, setCourses] = useState([])
  const [form, setForm] = useState({
    course_id: courseId || '', title: '', description: '', time_limit: '', deadline: '',
  })
  const [questions, setQuestions] = useState([
    { text: '', options: ['', '', '', ''], correct: 0 },
  ])
  const [attachment, setAttachment] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    coursesAPI.list().then(r => {
      setCourses(r.data)
      if (courseId && !form.course_id) {
        setForm(prev => ({ ...prev, course_id: courseId }))
      }
    }).catch(console.error)
  }, [courseId])

  // ── Question helpers ──────────────────────────────────
  const addQuestion = () => {
    setQuestions([...questions, { text: '', options: ['', '', '', ''], correct: 0 }])
  }

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return
    setQuestions(questions.filter((_, i) => i !== idx))
  }

  const updateQuestion = (idx, field, value) => {
    const updated = [...questions]
    updated[idx] = { ...updated[idx], [field]: value }
    setQuestions(updated)
  }

  const updateOption = (qIdx, oIdx, value) => {
    const updated = [...questions]
    updated[qIdx].options[oIdx] = value
    setQuestions(updated)
  }

  // ── Submit ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    // Validate
    if (!attachment) {
      // No document uploaded — questions are required
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i]
        const filledOptions = q.options.filter(o => o.trim())
        if (!q.text.trim() && filledOptions.length < 2) continue
        if (!q.text.trim()) {
          setError(`Question ${i + 1} text is required`)
          return
        }
        if (filledOptions.length < 2) {
          setError(`Question ${i + 1} needs at least 2 options`)
          return
        }
        if (q.correct >= filledOptions.length) {
          setError(`Question ${i + 1}: selected correct answer is empty. Pick a valid option.`)
          return
        }
      }
    }

    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('course_id', form.course_id)
      formData.append('title', form.title.trim())
      if (form.description) formData.append('description', form.description.trim())
      if (form.time_limit) formData.append('time_limit', parseInt(form.time_limit))
      if (form.deadline) formData.append('deadline', new Date(form.deadline).toISOString())
      const validQuestions = questions.filter(q => {
        const opts = q.options.filter(o => o.trim())
        return q.text.trim() || opts.length >= 2
      })
      formData.append('questions', JSON.stringify(validQuestions.map((q) => {
        const options = q.options.map((o) => o.trim()).filter((o) => o.length)
        const correct = Math.min(q.correct, options.length - 1)
        return {
          text: q.text.trim(),
          options,
          correct: correct < 0 ? 0 : correct,
        }
      })))
      if (attachment) formData.append('attachment', attachment)

      await quizzesAPI.create(formData)
      setSuccess('Quiz created successfully! Students can now attempt it.')
      if (onSuccess) {
        setTimeout(() => onSuccess(), 800)
      } else {
        setTimeout(() => navigate('/teacher'), 1500)
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create quiz')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">

      {error && (
        <div className="flex items-start gap-3 bg-danger-light text-danger-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 bg-success-light text-success-dark px-4 py-3 rounded-xl mb-6 text-sm font-medium">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* ── Basic Info ─────────────────────────── */}
        <div className="border border-surface-200 rounded-xl bg-white p-6 lg:p-8 space-y-5">
          <div>
            <label className="input-label">Course</label>
            <div className="relative">
              <BookOpen className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                readOnly
                value={courses.find(c => c.id === form.course_id)
                  ? `${courses.find(c => c.id === form.course_id).course_code} — ${courses.find(c => c.id === form.course_id).title}`
                  : ''}
                className="input-field pl-10 bg-surface-50 text-navy-700 cursor-default"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Quiz Title</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-navy-300 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="input-field pl-10" placeholder="e.g. Quiz 1: Data Types" required />
            </div>
          </div>

          <div>
            <label className="input-label">Description (optional)</label>
            <textarea value={form.description} rows={3} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="input-field resize-none" placeholder="Any instructions for students..." />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="input-label">Time Limit (minutes, optional)</label>
              <input type="number" value={form.time_limit} min={1}
                onChange={(e) => setForm({ ...form, time_limit: e.target.value })}
                className="input-field" placeholder="No limit" />
            </div>
            <div>
              <label className="input-label">Deadline (optional)</label>
              <input type="datetime-local" value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="input-field" />
            </div>
          </div>

          <div>
            <label className="input-label">Attachment (optional)</label>
            <input type="file" onChange={(e) => setAttachment(e.target.files[0])}
              className="input-field text-sm file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-accent-500 file:text-white file:cursor-pointer" />
            {attachment && (
              <p className="mt-1.5 text-xs text-navy-500 flex items-center gap-1.5">
                <Paperclip className="w-3 h-3" />
                {attachment.name}
              </p>
            )}
          </div>
        </div>

        {/* ── Question Input Mode Toggle ─────────── */}
        <div className="border border-surface-200 rounded-xl bg-white p-6 lg:p-8 space-y-5">
          <div className="flex items-center justify-between">
            <label className="input-label !mb-0">Questions {attachment && <span className="text-navy-400 font-normal">(optional — document uploaded)</span>}</label>
            <span className="text-xs text-navy-400">{questions.length} question{questions.length !== 1 ? 's' : ''}</span>
          </div>

          {/* ── Questions ──────────────────────────── */}
          <div className="space-y-5">
              {questions.map((q, qIdx) => (
                <div key={qIdx} className="border border-surface-200 rounded-xl p-5 space-y-4 relative">
                  <div className="flex items-start justify-between gap-3">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-accent-500/10 text-accent-600 text-xs font-bold shrink-0 mt-0.5">
                      {qIdx + 1}
                    </span>
                    <div className="flex-1">
                      <input
                        value={q.text}
                        onChange={(e) => updateQuestion(qIdx, 'text', e.target.value)}
                        className="input-field"
                        placeholder={`Question ${qIdx + 1}`}
                      />
                    </div>
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(qIdx)}
                        className="p-2 rounded-lg hover:bg-danger-light text-navy-300 hover:text-danger transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-10">
                    {q.options.map((opt, oIdx) => (
                      <div key={oIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateQuestion(qIdx, 'correct', oIdx)}
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                            q.correct === oIdx
                              ? 'border-emerald-500 bg-emerald-500 text-white'
                              : 'border-surface-200 hover:border-accent-300'
                          }`}
                        >
                          {q.correct === oIdx && <CheckCircle2 className="w-3.5 h-3.5" />}
                        </button>
                        <input
                          value={opt}
                          onChange={(e) => updateOption(qIdx, oIdx, e.target.value)}
                          className="input-field text-sm"
                          placeholder={`Option ${oIdx + 1}`}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-navy-400 pl-10">Click the circle to mark the correct answer.</p>
                </div>
              ))}

              <button
                type="button"
                onClick={addQuestion}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-surface-200 hover:border-accent-300 text-sm font-semibold text-navy-500 hover:text-accent-600 bg-surface-50 hover:bg-accent-500/5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Another Question
              </button>
            </div>
        </div>

        {/* ── Actions ────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 justify-end pt-2">
          <Button variant="ghost" type="button" onClick={() => (onCancel ? onCancel() : navigate(-1))}>Cancel</Button>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Quiz'}
          </Button>
        </div>
      </form>
    </div>
  )
}
