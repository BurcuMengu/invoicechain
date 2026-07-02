import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { WalletProvider } from './lib/WalletContext'
import { BalanceProvider } from './lib/BalanceContext'
import { ToastProvider } from './lib/ToastContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <WalletProvider>
      <BalanceProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BalanceProvider>
    </WalletProvider>
  </React.StrictMode>,
)
