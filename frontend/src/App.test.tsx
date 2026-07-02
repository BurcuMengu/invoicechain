import { render, screen } from '@testing-library/react'
import { WalletProvider } from './lib/WalletContext'
import { BalanceProvider } from './lib/BalanceContext'
import { ToastProvider } from './lib/ToastContext'
import App from './App'

test('renders brand', () => {
  render(
    <WalletProvider>
      <BalanceProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </BalanceProvider>
    </WalletProvider>,
  )
  expect(screen.getByText('InvoiceChain')).toBeInTheDocument()
})
