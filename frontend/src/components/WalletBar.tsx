import { useWallet } from '../lib/WalletContext'
import { useBalanceCtx } from '../lib/BalanceContext'
import { fromStroops } from '../lib/format'

function truncate(addr: string) {
  return addr.slice(0, 4) + '…' + addr.slice(-4)
}

export default function WalletBar() {
  const { address, connect, disconnect } = useWallet()
  const { balance, loading, error, refresh } = useBalanceCtx()

  const onConnect = async () => {
    try { await connect() } catch { /* user cancelled */ }
  }

  if (!address) {
    return (
      <button
        onClick={() => void onConnect()}
        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-3 py-1.5 rounded transition-colors"
      >
        Connect Wallet
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-mono text-gray-700 dark:text-gray-300">{truncate(address)}</span>
      <span className="text-gray-400">|</span>
      {loading ? (
        <span className="text-gray-400 animate-pulse">…</span>
      ) : error ? (
        <button
          onClick={refresh}
          className="text-red-500 hover:text-red-600 text-xs"
          title="Failed to load balance — click to retry"
        >
          ↻ retry
        </button>
      ) : (
        <span className="text-gray-700 dark:text-gray-300">
          {balance !== null ? `${fromStroops(balance)} USDC` : '—'}
        </span>
      )}
      {!loading && !error && balance !== null && (
        <button
          onClick={refresh}
          className="text-gray-400 hover:text-gray-600 text-xs"
          title="Refresh balance"
        >
          ↻
        </button>
      )}
      <button
        onClick={disconnect}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs px-2 py-1 rounded transition-colors"
      >
        Disconnect
      </button>
    </div>
  )
}
