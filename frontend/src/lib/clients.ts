import { Client as Marketplace } from '../contracts/marketplace/src'
import { Client as Token } from '../contracts/token/src'
import { Client as Reputation } from '../contracts/reputation/src'
import { config } from './config'

/** The shape provided by WalletContext.signTransaction */
type Signer = (xdr: string) => Promise<string>

const common = (signTransaction?: Signer, publicKey?: string) => ({
  rpcUrl: config.rpcUrl,
  networkPassphrase: config.networkPassphrase,
  publicKey,
  signTransaction: signTransaction
    ? async (xdr: string) => ({ signedTxXdr: await signTransaction(xdr) })
    : undefined,
})

export const getMarketplace = (signTransaction?: Signer, publicKey?: string) =>
  new Marketplace({ contractId: config.contractIds.marketplace, ...common(signTransaction, publicKey) })

export const getToken = (signTransaction?: Signer, publicKey?: string) =>
  new Token({ contractId: config.contractIds.token, ...common(signTransaction, publicKey) })

export const getReputation = (signTransaction?: Signer, publicKey?: string) =>
  new Reputation({ contractId: config.contractIds.reputation, ...common(signTransaction, publicKey) })
