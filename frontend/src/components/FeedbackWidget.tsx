import { useState } from 'react'
import { useToast } from '../lib/ToastContext'
import { track, Sentry } from '../lib/analytics'

const FEEDBACK_KEY = 'ic_feedback'

type StoredFeedback = { rating: number; message: string; ts: number }

/** Append a submission to localStorage so feedback is never lost, even with no keys. */
function persistLocally(entry: StoredFeedback): void {
  try {
    const raw = localStorage.getItem(FEEDBACK_KEY)
    const arr: StoredFeedback[] = raw ? JSON.parse(raw) : []
    arr.push(entry)
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(arr))
  } catch {
    /* localStorage unavailable / quota — ignore, submission still tracked */
  }
}

export default function FeedbackWidget() {
  const toast = useToast()
  const [open, setOpen] = useState(false)
  const [rating, setRating] = useState(0)
  const [message, setMessage] = useState('')
  const [touched, setTouched] = useState(false)

  const reset = () => {
    setRating(0)
    setMessage('')
    setTouched(false)
  }

  const close = () => {
    setOpen(false)
    reset()
  }

  const handleSend = () => {
    if (!message.trim()) {
      setTouched(true)
      return
    }
    const entry: StoredFeedback = {
      rating,
      message: message.trim(),
      ts: Date.now(),
    }

    // 1. Product analytics (lands in PostHog when enabled; safe no-op otherwise).
    track('feedback_submitted', { rating: entry.rating, message: entry.message })

    // 2. Sentry user feedback, guarded — only if the API exists.
    try {
      Sentry.captureFeedback?.({
        message: entry.message,
        name: 'Anonymous',
      })
    } catch {
      /* never throw from feedback */
    }

    // 3. No-backend fallback so feedback is never lost.
    persistLocally(entry)

    close()
    toast.success('Thanks for your feedback!')
  }

  return (
    <>
      {/* Floating button — bottom-LEFT so it never overlaps toasts (bottom-right). */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Give feedback"
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-lg transition-colors hover:bg-indigo-700"
      >
        <span aria-hidden>💬</span>
        Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Feedback"
          onClick={close}
        >
          <div
            className="w-full max-w-sm space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-xl dark:border-gray-700 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Send feedback
            </h2>

            {/* Star rating */}
            <div className="flex items-center gap-1" role="group" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}
                  aria-pressed={rating === n}
                  className={`text-2xl transition-transform hover:scale-110 ${
                    n <= rating ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                  }`}
                >
                  ★
                </button>
              ))}
            </div>

            <div>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what you think"
                rows={4}
                aria-label="Feedback message"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              />
              {touched && !message.trim() && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  Please enter a message.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSend}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
