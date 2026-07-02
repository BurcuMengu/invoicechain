# InvoiceChain — Invoice Tokenization & Factoring Marketplace — Design Spec

**Date:** 2026-07-02
**Status:** Approved

## Goal
A production-ready, end-to-end Stellar (Soroban) dApp where small businesses
tokenize their unpaid invoices and sell them at a discount to investors for
instant cash, while investors earn a return when the invoice is settled. The
project demonstrates advanced multi-contract logic, cross-contract calls, event
streaming, a reputation system, default handling, testing, CI/CD, monitoring,
analytics, and a mobile-responsive frontend — with a realistic path to onboard
10+ real users on testnet.

## Decisions (from brainstorming)
- **Frontend:** React + Vite + TypeScript + Tailwind (matches existing projects).
- **Location:** `~/invoicechain` (monorepo).
- **Scope:** Full production MVP — all InvoiceChain features included.
- **Invoice reality:** Full simulation. Invoice data is user-entered; debtor
  payment is simulated via a "pay / settle" action on testnet. (No real
  accounting/e-invoice API — that would sink the MVP.)
- **Roles:** No role separation. Any connected wallet can both create+sell
  invoices AND buy others' invoices. Minimum onboarding friction.
- **Test money:** In-app **faucet** button mints test USDC in one click, so a
  new user goes from "connect wallet" to "first transaction" in ~30 seconds.
- **Wallet:** Stellar Wallets Kit (multi-wallet).
- **Anchor / fiat ramp:** **Mock/simulated** on-ramp & off-ramp screens only.
  Real Anchors do not connect to testnet (no real fiat exists there); a genuine
  Anchor integration is reserved for the mainnet vision. Clearly labeled
  "Simulated (testnet)" in the UI.

## Feature scope (all included in MVP)
| Feature | MVP status |
|---|---|
| InvoiceToken — create invoice (face value, due date, debtor) | ✅ Full |
| Marketplace — list at a discount, investor buys | ✅ Full |
| Settlement — at maturity, simulated debtor payment → investor gets face value | ✅ Full |
| Reputation — on-chain score for sellers/debtors | ✅ Full |
| Default handling — mark unpaid-past-due invoices, reputation penalty | ✅ Full |
| Faucet test token | ✅ Full |
| Anchor / fiat ramp | ⚠️ Mock screen only (testnet limitation) |
| Monitoring (error tracking) + Analytics (usage) | ✅ Full |

## Architecture
```
Frontend (React+Vite, Wallets Kit, Tailwind)
   │  stellar-sdk (simulate + invoke)   │  Sentry (errors) + PostHog (analytics)
   ▼
marketplace contract ──cross-contract──▶ reputation contract
        │  transfer / transfer_from
        ▼
test_token contract (SEP-41 token + faucet mint)   [mainnet: real USDC SAC]
```

Inter-contract communication is shown two ways (a Level "technical complexity"
signal):
1. `marketplace` → calls `reputation` to record settled / defaulted outcomes.
2. `marketplace` → calls the `test_token` client (`transfer`, `transfer_from`).

**Why a registry (not factory+child):** invoices are many and lightweight, so
the `marketplace` holds them in a `Map<u64, Invoice>` rather than deploying a
contract per invoice. Cheaper and simpler than the crowdfund factory pattern,
while the separate `reputation` contract still demonstrates cross-contract calls.

## Contract: `test_token`
A minimal SEP-41 token used as the payment asset on testnet.
- **State:** `admin`, `name`, `symbol`, `decimals` (7), balances, allowances.
- **Functions:** standard token interface (`transfer`, `transfer_from`,
  `approve`, `allowance`, `balance`, `decimals`, `name`, `symbol`) plus
  `faucet(to)` — mints a fixed amount (e.g. 1000 USDC) to any caller for testnet
  onboarding. Rate-limited per address (cooldown by ledger) to prevent abuse.
- **Mainnet note:** replaced by the real USDC Stellar Asset Contract; `faucet`
  is testnet-only and removed on mainnet.

## Contract: `reputation`
On-chain trust score, written only by the `marketplace`.
- **State:** `marketplace` (authorized caller), `scores: Map<Address, Score>`.
- **Score:** `{ settled_count: u32, defaulted_count: u32, volume: i128 }`.
- **Functions:**
  - `__constructor(marketplace)` — set the only authorized writer.
  - `record_settled(party, amount)` — marketplace-only; bump settled_count +
    volume; emit `rep_up`.
  - `record_defaulted(party)` — marketplace-only; bump defaulted_count;
    emit `rep_down`.
  - Views: `get_score(addr)` → returns Score (derive a simple 0–100 rating in
    the frontend from counts).
- **Errors:** AlreadyInitialized, Unauthorized.

## Contract: `marketplace` (core)
**State:** `admin`, `token` (test_token addr), `reputation` (addr),
`next_id: u64`, `invoices: Map<u64, Invoice>`.

**Invoice:**
`{ id: u64, seller: Address, debtor_name: String, face_value: i128,
   discount_bps: u32, due_ledger: u64, owner: Address, status: Status }`
- Sale price = `face_value * (10000 - discount_bps) / 10000`.
- `owner` = seller until bought, then the investor.

**Status:** `Listed` → `Funded` → `Settled` | `Defaulted`. (`Listed` may be
`Cancelled` by the seller before purchase.)

**Functions:**
- `__constructor(admin, token, reputation)` — initialize.
- `create_invoice(seller, debtor_name, face_value, due_ledger, discount_bps)` —
  `require_auth(seller)`; validate amounts/discount/future due; store as
  `Listed`; emit `created`. Returns `id`.
- `cancel_invoice(id)` — seller-only, only while `Listed`; emit `cancelled`.
- `buy_invoice(id, investor)` — `require_auth(investor)`; only `Listed`;
  `token.transfer_from(investor → seller, sale_price)`; set `owner=investor`,
  status `Funded`; emit `funded`.
- `settle(id, payer)` — `require_auth(payer)` (simulated debtor); only `Funded`;
  `token.transfer_from(payer → owner, face_value)`; status `Settled`; call
  `reputation.record_settled(seller, face_value)`; emit `settled`.
- `mark_default(id)` — only `Funded` and `due_ledger` passed; status
  `Defaulted`; call `reputation.record_defaulted(seller)`; emit `defaulted`.
- Views: `get_invoice(id)`, `list_open()` (Listed), `list_by_owner(addr)`,
  `list_by_seller(addr)`.

**Errors (`#[contracterror]`):** AlreadyInitialized, ZeroAmount,
InvalidDiscount, DueInPast, NotFound, NotListed, NotFunded, NotSeller,
NotDueYet, Unauthorized.

## Frontend
- **Stack:** React 18 + Vite + TypeScript + Tailwind, `@stellar/stellar-sdk`,
  `@creit.tech/stellar-wallets-kit`, `react-router-dom`.
- **Pages:**
  - **Marketplace** — browse open invoices, buy.
  - **Create** — seller creates/lists an invoice.
  - **Portfolio** — my invoices (as seller & as investor), settle / cancel /
    mark-default actions, reputation score.
  - **Ramp (mock)** — simulated fiat on/off-ramp, clearly labeled testnet mock;
    the on-ramp "deposit" triggers the faucet.
  - **Onboarding** — connect wallet → faucet → guided first action.
- **UX requirements (Level):** mobile responsive, proper loading states, and
  error handling on every contract call (simulate → sign → submit, with toasts).
- **Data flow:** UI → stellar-sdk simulate (preview cost/errors) → wallet sign →
  submit → poll result → refresh from contract views. Contract events indexed
  via Stellar RPC `getEvents` for activity feeds.

## Production requirements
- **Deployment:** contracts on Stellar **testnet**; frontend on Vercel/Netlify
  (production URL).
- **Monitoring:** Sentry for error tracking (frontend + failed tx).
- **Analytics:** PostHog (or Plausible) for usage tracking — wallet connects,
  faucet claims, invoices created/bought/settled (funnel for the demo).
- **Feedback:** in-app feedback widget (mandatory) — short form storing to a
  lightweight backend (or PostHog surveys).
- **Onboarding proof:** 10+ real users; capture wallet addresses + tx hashes as
  proof of wallet interactions.
- **Repo:** public GitHub, 15+ meaningful commits, clear structure + docs
  (README, SUBMISSION.md, this spec).
- **Demo:** live demo video of the full create → sell → settle → reputation loop.

## Testing
- **Contracts:** Rust unit + integration tests per contract (`test.rs`),
  covering happy paths and every error, plus the cross-contract
  marketplace↔reputation and marketplace↔token flows. Target meaningful
  coverage of settle/default/reputation logic.
- **Frontend:** vitest + Testing Library for critical components (buy flow,
  create form validation, error states).
- **CI:** GitHub Actions — build contracts, run cargo tests, run frontend
  lint/test/build on every push.

## Roadmap
- **MVP:** full create → list → buy → settle → default → reputation loop on
  testnet, faucet, mock ramp, deployed frontend, monitoring + analytics,
  10 real users, feedback, demo video.
- **User acquisition:** pilot outreach — share the deployed link with small
  business / student / crypto communities; each user runs the guided flow with
  two wallets (seller + investor) to produce real wallet interactions.
- **Mainnet vision:** real USDC SAC, real Anchor (SEP-24) fiat on/off-ramp,
  off-chain invoice verification, partial factoring & offers/auctions,
  richer default/insurance layer, region/sector niche focus.

## Out of scope (explicitly, for MVP)
- Real e-invoice / accounting API integration.
- Real fiat rails / real Anchor (mainnet only).
- Partial factoring, bidding/auctions, invoice insurance.
- KYC/compliance module (mainnet vision).
