import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { WalletProvider } from './lib/WalletContext'
import { BalanceProvider } from './lib/BalanceContext'
import { ToastProvider } from './lib/ToastContext'
import { initAnalytics, Sentry } from './lib/analytics'

initAnalytics()

function ErrorFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950 p-6">
      <div className="max-w-md text-center space-y-3">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          An unexpected error occurred. Please reload the page.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
        >
          Reload
        </button>
      </div>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Sentry.ErrorBoundary fallback={<ErrorFallback />}>
      <WalletProvider>
        <BalanceProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </BalanceProvider>
      </WalletProvider>
    </Sentry.ErrorBoundary>
  </React.StrictMode>,
)
