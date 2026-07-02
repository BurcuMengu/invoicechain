import { describe, it, expect } from 'vitest'
import { parseContractError } from './errors'

describe('parseContractError', () => {
  it('maps contract codes', () => {
    expect(parseContractError('HostError: Error(Contract, #6)')).toMatch(/not open/)
    expect(parseContractError('Error(Contract, #9)')).toMatch(/past due/)
  })
  it('maps token asserts', () => {
    expect(parseContractError('insufficient allowance')).toMatch(/approved/)
  })
  it('falls back', () => {
    expect(parseContractError('weird')).toMatch(/failed/i)
  })
})
