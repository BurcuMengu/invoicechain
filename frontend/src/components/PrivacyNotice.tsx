import { useState } from 'react'
import { useToast } from '../lib/ToastContext'
import { optOut } from '../lib/analytics'

const ACK_KEY = 'ic_privacy_ack'
const OPTOUT_KEY = 'ic_analytics_optout'
const PRIVACY_URL = 'https://github.com/BurcuMengu/invoicechain/blob/master/PRIVACY.md'

/** True when the notice has already been acknowledged or the user opted out. */
function alreadyHandled(): boolean {
  try {
    return localStorage.getItem(ACK_KEY) === '1' || localStorage.getItem(OPTOUT_KEY) === '1'
  } catch {
    // localStorage unavailable — don't nag; treat as handled.
    return true
  }
}

/**
 * First-visit, dismissible privacy banner pinned to the bottom of the viewport.
 * Discloses analytics + session replay + error monitoring and offers a working
 * opt-out. Shown only until acknowledged or opted out (persisted per browser).
 */
export default function PrivacyNotice() {
  const toast = useToast()
  const [visible, setVisible] = useState(() => !alreadyHandled())

  if (!visible) return null

  const ack = () => {
    try {
      localStorage.setItem(ACK_KEY, '1')
    } catch {
      /* ignore — banner still hides for this session */
    }
    setVisible(false)
  }

  const handleOptOut = () => {
    optOut()
    ack()
    toast.success('Analytics disabled for this browser.')
  }

  return (
    <div
      role="region"
      aria-label="Privacy notice"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur px-4 py-3 shadow-[0_-1px_3px_rgba(0,0,0,0.06)]"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-gray-600">
          InvoiceChain uses analytics and session replay (PostHog) and error monitoring (Sentry) to
          improve the product. We record page interactions and your public wallet address — never
          private keys or seed phrases. This is a testnet demo.{' '}
          <a
            href={PRIVACY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-indigo-600 underline hover:text-indigo-700"
          >
            Privacy details
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={handleOptOut}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            Opt out of analytics
          </button>
          <button
            type="button"
            onClick={ack}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
