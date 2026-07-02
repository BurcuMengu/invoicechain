import { Server } from '@stellar/stellar-sdk/rpc'
import { config } from './config'

/**
 * Ensure a Stellar **testnet** account exists on-chain and has XLM to pay
 * transaction fees.
 *
 * A brand-new wallet (e.g. a freshly created Freighter account) does not exist
 * on the network until funded — so every transaction, including the USDC faucet,
 * fails with "Account not found". This first checks whether the account already
 * exists; only if it does not does it call Friendbot to create + fund it. That
 * check avoids a harmless-but-noisy 400 from Friendbot for already-funded
 * accounts. Never throws.
 */
export async function fundTestnetAccount(address: string): Promise<void> {
  // Already funded? Then there's nothing to do (and no need to hit Friendbot).
  try {
    const server = new Server(config.rpcUrl)
    await server.getAccount(address)
    return
  } catch {
    // Not found on-chain — fall through and fund it.
  }

  try {
    await fetch(`https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`)
  } catch {
    // Network error — proceed anyway; the caller's transaction will surface a
    // clear error if the account genuinely still can't transact.
  }
}
