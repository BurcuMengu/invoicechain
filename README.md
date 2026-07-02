# InvoiceChain
Invoice tokenization & factoring marketplace on Stellar (Soroban).
See `docs/superpowers/specs/2026-07-02-invoicechain-design.md`.

## Contracts
- `test_token` — SEP-41 test payment asset with a faucet.
- `reputation` — on-chain trust score.
- `marketplace` — create → sell → settle → default loop.
