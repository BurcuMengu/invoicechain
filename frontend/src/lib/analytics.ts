import * as Sentry from '@sentry/react'
import posthog from 'posthog-js'

/**
 * Analytics / monitoring facade.
 *
 * Everything here is *guarded*: Sentry and PostHog only initialize when their
 * respective env keys are present. Env vars are inlined at BUILD time by Vite
 * (`import.meta.env.VITE_*`). On the current live build no keys are set, so
 * `initAnalytics()` is a no-op and every helper below is a safe no-op too — the
 * app behaves exactly as it does today. None of these functions ever throw.
 */

const SENTRY_DSN = import.meta.env.VITE_SENTRY_DSN
const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com'

let sentryOn = false
let posthogOn = false

/** True when PostHog analytics is active (keys present + initialized). */
export let analyticsEnabled = false

/** Re-export so callers can guard Sentry-specific calls without importing it. */
export { Sentry }

/**
 * Initialize Sentry and/or PostHog if their keys are present. Safe to call
 * once at startup. If neither key is present, does nothing.
 */
export function initAnalytics(): void {
  if (SENTRY_DSN) {
    try {
      Sentry.init({
        dsn: SENTRY_DSN,
        integrations: [Sentry.browserTracingIntegration()],
        tracesSampleRate: 0.1,
        environment: 'testnet',
      })
      sentryOn = true
    } catch (e) {
      // Never let monitoring setup break the app.
      console.error('Sentry init failed', e)
    }
  }

  if (POSTHOG_KEY) {
    try {
      posthog.init(POSTHOG_KEY, {
        api_host: POSTHOG_HOST,
        capture_pageview: true,
      })
      posthogOn = true
      analyticsEnabled = true
    } catch (e) {
      console.error('PostHog init failed', e)
    }
  }
}

/** Capture a product analytics event. No-op unless PostHog is initialized. */
export function track(event: string, props?: Record<string, unknown>): void {
  if (!posthogOn) return
  try {
    posthog.capture(event, props)
  } catch {
    /* never throw from analytics */
  }
}

/**
 * Attribute subsequent events to a wallet address. No-op unless PostHog is on.
 * Helps make wallet interactions attributable.
 */
export function identifyWallet(address: string): void {
  if (!posthogOn) return
  try {
    posthog.identify(address)
  } catch {
    /* never throw from analytics */
  }
}

/**
 * Report an error to Sentry if enabled; otherwise log to the console so the
 * failure is never silently swallowed.
 */
export function captureError(e: unknown, context?: Record<string, unknown>): void {
  if (sentryOn) {
    try {
      Sentry.captureException(e, context ? { extra: context } : undefined)
      return
    } catch {
      /* fall through to console */
    }
  }
  console.error(e, context)
}
