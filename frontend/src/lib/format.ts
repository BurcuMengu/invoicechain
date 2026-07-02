const DECIMALS = 7n
const SCALE = 10n ** DECIMALS

export function fromStroops(v: bigint): string {
  const neg = v < 0n
  const abs = neg ? -v : v
  const whole = abs / SCALE
  const frac = abs % SCALE
  let out = whole.toString()
  if (frac !== 0n) {
    // show up to 2 decimals
    const cents = (frac * 100n) / SCALE
    if (cents !== 0n) out += '.' + cents.toString().padStart(2, '0').replace(/0+$/, '')
  }
  return (neg ? '-' : '') + out
}

export function toStroops(usdc: string): bigint {
  const [whole, frac = ''] = usdc.trim().split('.')
  const fracPadded = (frac + '0000000').slice(0, 7)
  return BigInt(whole || '0') * SCALE + BigInt(fracPadded || '0')
}

export function bpsToPercent(bps: number): string {
  return (bps / 100).toString()
}

export function salePrice(faceValue: bigint, bps: number): bigint {
  return (faceValue * BigInt(10000 - bps)) / 10000n
}
