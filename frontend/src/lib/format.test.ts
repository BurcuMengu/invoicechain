import { describe, it, expect } from 'vitest'
import { fromStroops, toStroops, bpsToPercent, salePrice } from './format'

describe('format', () => {
  it('fromStroops formats USDC', () => {
    expect(fromStroops(10_000_000_000n)).toBe('1000')
    expect(fromStroops(900_000_000n)).toBe('90')
    expect(fromStroops(1_050_000_000n)).toBe('105')
    expect(fromStroops(0n)).toBe('0')
  })
  it('toStroops parses USDC', () => {
    expect(toStroops('1000')).toBe(10_000_000_000n)
    expect(toStroops('90.5')).toBe(905_000_000n)
  })
  it('bpsToPercent', () => {
    expect(bpsToPercent(1000)).toBe('10')
    expect(bpsToPercent(50)).toBe('0.5')
  })
  it('salePrice mirrors contract', () => {
    expect(salePrice(1_000_000_000n, 1000)).toBe(900_000_000n)
    expect(salePrice(1_000_000_000n, 1)).toBe(999_900_000n)
  })

  // Extra edge cases
  it('toStroops handles zero string', () => {
    expect(toStroops('0')).toBe(0n)
  })
  it('fromStroops sub-cent fraction truncates to 2 decimals', () => {
    // 1_000_001n = 0.1000001 USDC — the 7th decimal is sub-cent and should be dropped
    expect(fromStroops(1_000_001n)).toBe('0.1')
    // 1_500_000n = 0.15 USDC — exactly two decimals
    expect(fromStroops(1_500_000n)).toBe('0.15')
  })
  it('salePrice at bps=9000 (90% discount)', () => {
    // 10% of face value remaining
    expect(salePrice(1_000_000_000n, 9000)).toBe(100_000_000n)
  })
})
