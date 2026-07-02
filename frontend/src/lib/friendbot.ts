/**
 * Fund a Stellar **testnet** account via Friendbot so it exists on-chain and has
 * XLM to pay transaction fees.
 *
 * A brand-new wallet (e.g. a freshly created Freighter account) does not exist
 * on the network until it is funded — so every transaction, including the USDC
 * faucet, fails with "Account not found". Calling this first creates + funds the
 * account with test XLM.
 *
 * Idempotent from the caller's view: if the account already exists, Friendbot
 * responds with an error which we swallow. Never throws.
 */
export async function fundTestnetAccount(address: string): Promise<void> {
  try {
    const res = await fetch(
      `https://friendbot.stellar.org/?addr=${encodeURIComponent(address)}`,
    )
    // 200 = funded now. 400 = already funded (op_already_exists) — both are fine.
    if (!res.ok) {
      // Drain the body so the connection can close; ignore the content.
      await res.text().catch(() => undefined)
    }
  } catch {
    // Network error — proceed anyway; the caller's transaction will surface a
    // clear error if the account genuinely still can't transact.
  }
}
