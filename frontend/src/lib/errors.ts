const MARKET_ERRORS: Record<number, string> = {
  1: 'Already initialized',
  2: 'Amount must be greater than zero',
  3: 'Discount must be between 0.01% and 90%',
  4: 'Due date must be in the future',
  5: 'Invoice not found',
  6: 'Invoice is not open for this action',
  7: 'Invoice is not funded',
  8: 'Only the seller can do this',
  9: 'Invoice is not past due yet',
}

export function parseContractError(e: unknown): string {
  const s = typeof e === 'string' ? e : (e as Error)?.message ?? String(e)
  const m = s.match(/Error\(Contract, #(\d+)\)/)
  if (m) return MARKET_ERRORS[Number(m[1])] ?? `Contract error #${m[1]}`
  if (/account not found|op_no_account|no.?such.?account/i.test(s))
    return 'Your testnet account is not funded yet — get test USDC from Onboarding/Ramp first (it funds your account), then retry.'
  if (/insufficient allowance/i.test(s)) return 'You have not approved enough USDC'
  if (/insufficient balance|txinsufficientfee|insufficient fee/i.test(s))
    return 'Insufficient balance to cover the transaction — make sure your testnet account is funded.'
  return 'Transaction failed. Please try again.'
}
