import { parseContractError } from './errors'

export class TxError extends Error {}

/**
 * Signs and submits an assembled transaction, returning the parsed result.
 * Wraps contract errors in TxError with a human-readable message.
 */
export async function runTx<T>(assembled: {
  signAndSend: () => Promise<{ result: T }>
}): Promise<T> {
  try {
    const sent = await assembled.signAndSend()
    return sent.result
  } catch (e) {
    throw new TxError(parseContractError(e))
  }
}

/**
 * Returns the simulated result of a read-only assembled transaction.
 * No signing required.
 */
export async function readTx<T>(assembled: { result: T }): Promise<T> {
  return assembled.result
}
