import { useState, useEffect } from 'react'
import { reviewsAPI } from '../services/api'
import {
  Star,
  Send,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'

export default function MyReview() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [editingId, setEditingId] = useState(null)

  // Form state
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [text, setText] = useState('')

  useEffect(() => {
    loadReviews()
  }, [])

  const loadReviews = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await reviewsAPI.listMine()
      setReviews(res.data)
    } catch (err) {
      console.error(err)
      setError('Could not load your reviews.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Please select a star rating.')
      return
    }
    if (text.trim().length < 10) {
      setError('Review must be at least 10 characters.')
      return
    }

    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      if (editingId) {
        await reviewsAPI.update(editingId, { rating, text: text.trim() })
        setSuccess('Review updated successfully!')
      } else {
        await reviewsAPI.create({ rating, text: text.trim() })
        setSuccess('Review submitted successfully! It will appear on the landing page after approval.')
      }
      setRating(0)
      setText('')
      setEditingId(null)
      loadReviews()
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.detail || 'Failed to submit review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (review) => {
    setEditingId(review.id)
    setRating(review.rating)
    setText(review.text)
    setSuccess(null)
    setError(null)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setRating(0)
    setText('')
    setError(null)
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return
    try {
      await reviewsAPI.delete(id)
      setSuccess('Review deleted.')
      if (editingId === id) {
        setEditingId(null)
        setRating(0)
        setText('')
      }
      loadReviews()
    } catch (err) {
      console.error(err)
      setError('Failed to delete review.')
    }
  }

  const myReview = reviews.length > 0 ? reviews[0] : null
  const isEditing = editingId !== null

  return (
    <div className="p-5 lg:p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-500/10 border border-accent-500/20 text-accent-600 text-[11px] font-semibold mb-3">
          <Star className="w-3 h-3" />
          Student Review
        </span>
        <h1 className="text-3xl font-extrabold text-navy-900 tracking-tight">Share Your Experience</h1>
        <p className="text-navy-400 mt-1.5">Help other students by sharing your feedback about the LMS</p>
      </div>

      {/* Success / Error messages */}
      {success && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <p className="text-sm font-medium text-emerald-700">{success}</p>
        </div>
      )}
      {error && (
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm font-medium text-red-700">{error}</p>
        </div>
      )}

      {/* Review Form */}
      <div className="rounded-2xl border border-surface-200 bg-white p-6 mb-8">
        <h2 className="text-sm font-semibold text-navy-900 flex items-center justify-center gap-2 mb-5">
          <span className="w-7 h-7 rounded-lg bg-accent-100 text-accent-700 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5" />
          </span>
          {isEditing ? 'Edit Your Review' : myReview ? 'Update Your Review' : 'Write a Review'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Star Rating */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-navy-600 uppercase tracking-wider mb-2 text-center block">
              Your Rating
            </label>
            <div className="flex items-center justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110 active:scale-95"
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'text-accent-400 fill-accent-400'
                        : 'text-navy-200'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm font-semibold text-navy-600">
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          {/* Review Text */}
          <div className="mb-5">
            <label className="text-xs font-semibold text-navy-600 uppercase tracking-wider mb-2 block">
              Your Review
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="Tell us about your experience with the LMS..."
              className="input-field resize-none"
              required
            />
            <p className="text-[11px] text-navy-400 mt-1.5">
              {text.length}/1000 characters
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-accent-500 text-navy-950 hover:bg-accent-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98] shadow-sm shadow-accent-500/20"
            >
              {submitting ? (
                <div className="w-4 h-4 border-2 border-navy-950/30 border-t-navy-950 rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {isEditing ? 'Update Review' : 'Submit Review'}
            </button>
            {isEditing && (
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold text-navy-500 hover:bg-surface-100 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Reviews */}
      {loading ? (
        <div className="min-h-[120px] flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-surface-200 border-t-accent-500 rounded-full animate-spin" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-navy-900 flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-surface-100 text-navy-500 flex items-center justify-center">
              <RefreshCw className="w-3.5 h-3.5" />
            </span>
            Your Reviews
          </h2>
          {reviews.map((review) => (
            <div
              key={review.id}
              className="rounded-2xl border border-surface-200 bg-white p-5"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-center gap-2">
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${
                          star <= review.rating
                            ? 'text-accent-400 fill-accent-400'
                            : 'text-navy-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-semibold text-navy-500">
                    {review.rating}/5
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleEdit(review)}
                    className="p-1.5 rounded-lg text-navy-400 hover:text-accent-600 hover:bg-surface-50 transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(review.id)}
                    className="p-1.5 rounded-lg text-navy-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-navy-600 leading-relaxed">{review.text}</p>
              <p className="text-[11px] text-navy-400 mt-3">
                Submitted on{' '}
                {new Date(review.created_at).toLocaleDateString('en-US', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      ) : !loading ? (
        <div className="border border-dashed border-surface-200 rounded-2xl py-12 text-center">
          <span className="inline-flex w-12 h-12 rounded-xl bg-accent-50 text-accent-500 items-center justify-center mb-3">
            <Star className="w-6 h-6" />
          </span>
          <p className="text-sm font-medium text-navy-700">No reviews yet</p>
          <p className="text-xs text-navy-400 mt-1">Be the first to share your experience!</p>
        </div>
      ) : null}
    </div>
  )
}
