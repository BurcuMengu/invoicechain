import { useState } from 'react'
import { useWallet } from '../lib/WalletContext'
import { useToast } from '../lib/ToastContext'
import { useBalanceCtx } from '../lib/BalanceContext'
import { getToken } from '../lib/clients'
import { runTx } from '../lib/tx'
import { fromStroops } from '../lib/format'
import { useBalance } from '../hooks/useBalance'
import { track, captureError } from '../lib/analytics'

export default function RampPage() {
  const { address, connect, signTransaction } = useWallet()
  const toast = useToast()
  const { refresh: refreshHeader } = useBalanceCtx()
  const { balance, loading: balanceLoading, refetch } = useBalance(address)
  const [depositing, setDepositing] = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing, setWithdrawing] = useState(false)

  const handleDeposit = async () => {
    if (!address) {
      try {
        await connect()
      } catch {
        toast.error('Please connect your wallet to use the ramp.')
      }
      return
    }
    setDepositing(true)
    try {
      const token = getToken(signTransaction, address)
      const assembled = await token.faucet({ to: address })
      await runTx(assembled)
      track('faucet_claimed')
      toast.success('1000 test USDC deposited to your wallet!')
      refetch()
      refreshHeader()
    } catch (e) {
      captureError(e)
      toast.error(e instanceof Error ? e.message : String(e))
    } finally {
      setDepositing(false)
    }
  }

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(withdrawAmount)
    if (!amount || amount <= 0) {
      toast.error('Enter a valid withdrawal amount.')
      return
    }
    setWithdrawing(true)
    setTimeout(() => {
      toast.success(`Withdrawal of $${amount.toFixed(2)} simulated — no real funds moved.`)
      setWithdrawAmount('')
      setWithdrawing(false)
    }, 800)
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Fiat Ramp</h1>

      {/* Testnet banner */}
      <div
        role="alert"
        className="rounded-lg border border-yellow-300 bg-yellow-50 px-4 py-3 text-sm font-semibold text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300"
      >
        Simulated (testnet) — no real money moves.
      </div>

      {/* Wallet gate */}
      {!address && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center dark:border-gray-700 dark:bg-gray-900">
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Connect your wallet to use the ramp.
          </p>
          <button
            onClick={() => connect().catch(() => toast.error('Could not connect wallet.'))}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Connect wallet
          </button>
        </div>
      )}

      {/* Balance pill */}
      {address && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
          <span className="text-gray-500 dark:text-gray-400">USDC balance: </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {balanceLoading
              ? '…'
              : balance !== null
                ? `${fromStroops(balance)} USDC`
                : '—'}
          </span>
        </div>
      )}

      {/* On-ramp */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">On-ramp</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Deposit $1000 → receive 1000 test USDC in your wallet via the testnet faucet.
        </p>
        <button
          onClick={handleDeposit}
          disabled={depositing}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {depositing ? 'Processing…' : 'Deposit $1000 → get 1000 USDC'}
        </button>
      </section>

      {/* Off-ramp */}
      <section className="space-y-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Off-ramp</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Withdraw USDC → $ (simulated — no funds move on testnet).
        </p>
        <form onSubmit={handleWithdraw} className="flex flex-col gap-3 sm:flex-row">
          <input
            type="number"
            value={withdrawAmount}
            onChange={(e) => setWithdrawAmount(e.target.value)}
            placeholder="Amount in USDC"
            min="0.01"
            step="any"
            disabled={!address || withdrawing}
            className="min-w-0 flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <button
            type="submit"
            disabled={!address || withdrawing}
            className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-gray-900 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-gray-700 dark:hover:bg-gray-600"
          >
            {withdrawing ? 'Simulating…' : 'Withdraw'}
          </button>
        </form>
      </section>
    </div>
  )
}
