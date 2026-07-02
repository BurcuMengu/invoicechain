# InvoiceChain Frontend Implementation Plan (Plan 2 of 3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A mobile-responsive React dApp that lets any wallet connect, claim test USDC, and run the full invoice-factoring loop (create → list → buy → settle / mark-default → reputation) against the deployed testnet contracts, with proper loading and error states on every contract call.

**Architecture:** Vite + React + TypeScript + Tailwind SPA under `frontend/`. TypeScript contract bindings are generated from the deployed contracts with `stellar contract bindings typescript`. A thin `lib/` wraps wallet connection (Stellar Wallets Kit), a transaction runner (simulate → sign → submit → poll), and app config. Pages consume typed clients through React hooks. No backend in this plan (feedback/analytics land in Plan 3).

**Tech Stack:** React 18, Vite 5, TypeScript 5, Tailwind 3, `@stellar/stellar-sdk` ^13, `@creit.tech/stellar-wallets-kit`, `react-router-dom` 6, `vitest` + Testing Library, `vite-plugin-node-polyfills`.

## Global Constraints

- Location: `frontend/` (monorepo sibling of `contracts/`).
- Network: **testnet**. RPC: `https://soroban-testnet.stellar.org`. Passphrase: `Test SDF Network ; September 2015`.
- Contract IDs come from `deployments/testnet.json` (copied into the frontend at build/dev via a config module — do NOT hardcode in components):
  - token: `CA63PKCVFVYIHDVMRTRSK25E7YFBZGJWEXSCHUHM2LFCLSBFA7PEL7VK`
  - marketplace: `CAMG7TMIJ5FJ753ARMKBTFCLPBKX2GHESEQZLVAJO33AZTPNDNVBCXYR`
  - reputation: `CDEKX5WLSYOR54LUDEQ3UNIK7TDHEKE24U4FEA57XQBP7FGV3UVXIMCP`
- USDC decimals = 7. Display helper: `amount / 10^7` with up to 2 decimals. Faucet mints 1000 USDC.
- Discount is in basis points (bps): UI shows percent = `bps/100`. Valid 1..=9000 (0.01%–90%).
- Money math uses `BigInt` end-to-end; never use JS `number` for `i128` values.
- Every contract write shows: pending (spinner/disabled), success (toast + refetch), and error (toast with a readable message parsed from the contract error). No silent failures.
- Mobile-first: every page usable at 375px width; a responsive nav (hamburger on small screens).
- Contract method/type names (from Plan 1, verbatim):
  - marketplace: `create_invoice(seller, debtor_name, face_value, due_ledger, discount_bps) -> u64`, `buy_invoice(id, investor)`, `settle(id, payer)`, `mark_default(id)`, `cancel_invoice(id)`, `get_invoice(id) -> Invoice`, `list_open() -> Vec<Invoice>`, `list_by_owner(owner)`, `list_by_seller(seller)`.
  - `Invoice { id: u64, seller, debtor_name: string, face_value: i128, discount_bps: u32, due_ledger: u64, owner, status }`, `Status = Listed|Funded|Settled|Defaulted|Cancelled`.
  - token: `faucet(to)`, `balance(id) -> i128`, `approve(from, spender, amount, expiration_ledger)`, `allowance(from, spender) -> i128`.
  - reputation: `get_score(party) -> Score`, `Score { settled_count: u32, defaulted_count: u32, volume: i128 }`.

---

### Task 0: Vite + React + TS + Tailwind scaffold

**Files:**
- Create: `frontend/package.json`, `frontend/vite.config.ts`, `frontend/tsconfig.json`, `frontend/tsconfig.node.json`, `frontend/index.html`, `frontend/postcss.config.js`, `frontend/tailwind.config.js`, `frontend/src/main.tsx`, `frontend/src/App.tsx`, `frontend/src/index.css`, `frontend/.gitignore`

**Interfaces:**
- Produces: a running dev server (`npm run dev`) rendering a placeholder App; `npm run build` and `npm test` wired.

- [ ] **Step 1: Scaffold and install**

Run from `~/invoicechain`:
```bash
cd frontend 2>/dev/null || (npm create vite@latest frontend -- --template react-ts && cd frontend)
```
If `npm create vite` is non-interactive-unfriendly, create the files manually per the following steps. Then set `frontend/package.json` to:
```json
{
  "name": "invoicechain-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "lint": "eslint . --max-warnings 0",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@creit.tech/stellar-wallets-kit": "^1.7.3",
    "@stellar/stellar-sdk": "^13.1.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.2"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "eslint": "^8.57.1",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.47",
    "tailwindcss": "^3.4.11",
    "typescript": "^5.5.4",
    "vite": "^5.4.5",
    "vite-plugin-node-polyfills": "^0.22.0",
    "vitest": "^2.1.1"
  }
}
```
Run `npm install`.

- [ ] **Step 2: Vite config with node polyfills (stellar-sdk needs Buffer)**

`frontend/vite.config.ts`:
```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [react(), nodePolyfills({ globals: { Buffer: true, global: true, process: true } })],
  test: { environment: 'jsdom', globals: true, setupFiles: './src/test/setup.ts' },
})
```

- [ ] **Step 3: Tailwind setup**

`frontend/tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: [],
}
```
`frontend/postcss.config.js`:
```js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```
`frontend/src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 4: App shell + test setup**

`frontend/src/App.tsx`:
```tsx
export default function App() {
  return <div className="min-h-screen grid place-items-center text-2xl font-semibold">InvoiceChain</div>
}
```
`frontend/src/main.tsx`:
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
```
`frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom'
```
`frontend/index.html` must contain `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>`.

- [ ] **Step 5: Verify build + a trivial test**

Create `frontend/src/App.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react'
import App from './App'
test('renders brand', () => {
  render(<App />)
  expect(screen.getByText('InvoiceChain')).toBeInTheDocument()
})
```
Run: `cd frontend && npm run build && npm test`
Expected: build succeeds; 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add frontend
git commit -m "feat(frontend): scaffold Vite+React+TS+Tailwind"
```

---

### Task 1: App config + generated contract bindings

**Files:**
- Create: `frontend/src/lib/config.ts`
- Create: `frontend/src/contracts/` (generated packages: `marketplace/`, `token/`, `reputation/`)
- Create: `frontend/scripts/gen-bindings.sh`

**Interfaces:**
- Produces: `config` object (`{ network, rpcUrl, networkPassphrase, contractIds }`) and typed clients importable from `src/contracts/*`.

- [ ] **Step 1: Config module reading the deployed IDs**

`frontend/src/lib/config.ts`:
```ts
export const config = {
  network: 'testnet' as const,
  rpcUrl: 'https://soroban-testnet.stellar.org',
  networkPassphrase: 'Test SDF Network ; September 2015',
  contractIds: {
    token: 'CA63PKCVFVYIHDVMRTRSK25E7YFBZGJWEXSCHUHM2LFCLSBFA7PEL7VK',
    marketplace: 'CAMG7TMIJ5FJ753ARMKBTFCLPBKX2GHESEQZLVAJO33AZTPNDNVBCXYR',
    reputation: 'CDEKX5WLSYOR54LUDEQ3UNIK7TDHEKE24U4FEA57XQBP7FGV3UVXIMCP',
  },
}
export type ContractName = keyof typeof config.contractIds
```

- [ ] **Step 2: Bindings generation script**

`frontend/scripts/gen-bindings.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail
NET=testnet
declare -A IDS=(
  [marketplace]=CAMG7TMIJ5FJ753ARMKBTFCLPBKX2GHESEQZLVAJO33AZTPNDNVBCXYR
  [token]=CA63PKCVFVYIHDVMRTRSK25E7YFBZGJWEXSCHUHM2LFCLSBFA7PEL7VK
  [reputation]=CDEKX5WLSYOR54LUDEQ3UNIK7TDHEKE24U4FEA57XQBP7FGV3UVXIMCP
)
for name in "${!IDS[@]}"; do
  stellar contract bindings typescript --network "$NET" \
    --contract-id "${IDS[$name]}" \
    --output-dir "src/contracts/$name" --overwrite
done
echo "bindings generated"
```

- [ ] **Step 3: Generate the bindings**

Run: `cd frontend && chmod +x scripts/gen-bindings.sh && ./scripts/gen-bindings.sh`
Expected: three packages under `src/contracts/{marketplace,token,reputation}`, each exporting a `Client` class and typed `Invoice`/`Status`/`Score` interfaces. Inspect `src/contracts/marketplace/src/index.ts` to confirm method names match the constraints (`create_invoice`, `buy_invoice`, `settle`, `mark_default`, `cancel_invoice`, `get_invoice`, `list_open`, ...). Record the exact exported client factory signature in your report (later tasks import it).

- [ ] **Step 4: Ensure bindings compile within the app**

The generated packages may be their own npm workspaces. Simplest integration: import their `src/index.ts` directly. Add path aliases if needed, or `npm install` inside each generated dir if they declare deps. Verify with: `cd frontend && npx tsc --noEmit` (fix any binding import issues; the generated code depends on `@stellar/stellar-sdk` which is already installed).
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/config.ts frontend/scripts/gen-bindings.sh frontend/src/contracts
git commit -m "feat(frontend): app config + generated contract bindings"
```

---

### Task 2: Money + status formatting helpers (pure, TDD)

**Files:**
- Create: `frontend/src/lib/format.ts`
- Test: `frontend/src/lib/format.test.ts`

**Interfaces:**
- Produces:
  - `fromStroops(v: bigint): string` — 7-decimal USDC → human string, trims trailing zeros, max 2 decimals for display.
  - `toStroops(usdc: string): bigint` — human USDC → i128 stroops.
  - `bpsToPercent(bps: number): string` — `1000 → "10"`.
  - `salePrice(faceValue: bigint, bps: number): bigint` — `faceValue * (10000 - bps) / 10000` (BigInt floor, mirrors the contract).

- [ ] **Step 1: Write failing tests**

`frontend/src/lib/format.test.ts`:
```ts
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
})
```

- [ ] **Step 2: Run to verify failure**

Run: `cd frontend && npx vitest run src/lib/format.test.ts`
Expected: FAIL (module not found).

- [ ] **Step 3: Implement `frontend/src/lib/format.ts`**

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/lib/format.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/format.ts frontend/src/lib/format.test.ts
git commit -m "feat(frontend): money/status format helpers (tested)"
```

---

### Task 3: Wallet connection (Stellar Wallets Kit) + context

**Files:**
- Create: `frontend/src/lib/wallet.ts`
- Create: `frontend/src/lib/WalletContext.tsx`
- Test: `frontend/src/lib/wallet.test.ts`

**Interfaces:**
- Produces:
  - `WalletProvider` React component.
  - `useWallet()` hook returning `{ address: string | null, connect(): Promise<void>, disconnect(): void, signTransaction: (xdr: string) => Promise<string> }`.

- [ ] **Step 1: Wallet kit wrapper**

`frontend/src/lib/wallet.ts`:
```ts
import {
  StellarWalletsKit, WalletNetwork, allowAllModules, FREIGHTER_ID,
} from '@creit.tech/stellar-wallets-kit'

export const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules(),
})

export async function pickAndConnect(): Promise<string> {
  return new Promise((resolve, reject) => {
    kit.openModal({
      onWalletSelected: async (option) => {
        try {
          kit.setWallet(option.id)
          const { address } = await kit.getAddress()
          resolve(address)
        } catch (e) { reject(e) }
      },
      onClosed: () => reject(new Error('cancelled')),
    })
  })
}

export async function signTx(xdr: string, networkPassphrase: string): Promise<string> {
  const { signedTxXdr } = await kit.signTransaction(xdr, { networkPassphrase })
  return signedTxXdr
}
```

- [ ] **Step 2: Context + hook**

`frontend/src/lib/WalletContext.tsx`:
```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { pickAndConnect, signTx } from './wallet'
import { config } from './config'

type WalletState = {
  address: string | null
  connect: () => Promise<void>
  disconnect: () => void
  signTransaction: (xdr: string) => Promise<string>
}
const Ctx = createContext<WalletState | null>(null)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(() => localStorage.getItem('ic_addr'))
  const connect = useCallback(async () => {
    const a = await pickAndConnect()
    localStorage.setItem('ic_addr', a)
    setAddress(a)
  }, [])
  const disconnect = useCallback(() => { localStorage.removeItem('ic_addr'); setAddress(null) }, [])
  const signTransaction = useCallback((xdr: string) => signTx(xdr, config.networkPassphrase), [])
  return <Ctx.Provider value={{ address, connect, disconnect, signTransaction }}>{children}</Ctx.Provider>
}

export function useWallet() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useWallet must be used within WalletProvider')
  return v
}
```

- [ ] **Step 3: Test the hook guard (pure, no real wallet)**

`frontend/src/lib/wallet.test.ts`:
```ts
import { renderHook } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useWallet } from './WalletContext'

describe('useWallet', () => {
  it('throws outside provider', () => {
    expect(() => renderHook(() => useWallet())).toThrow(/WalletProvider/)
  })
})
```
Run: `cd frontend && npx vitest run src/lib/wallet.test.ts` — expect PASS (after implementing above).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/wallet.ts frontend/src/lib/WalletContext.tsx frontend/src/lib/wallet.test.ts
git commit -m "feat(frontend): wallet connection via Stellar Wallets Kit"
```

---

### Task 4: Contract client factory + transaction runner

**Files:**
- Create: `frontend/src/lib/clients.ts`
- Create: `frontend/src/lib/tx.ts`
- Create: `frontend/src/lib/errors.ts`
- Test: `frontend/src/lib/errors.test.ts`

**Interfaces:**
- Produces:
  - `getMarketplace(address?)`, `getToken(address?)`, `getReputation(address?)` — return typed clients wired to config + a `signTransaction` that uses the wallet.
  - `runTx<T>(assembled): Promise<T>` — signs, submits, polls, returns the parsed result; throws `TxError` on failure.
  - `parseContractError(e): string` — maps a contract error code to a readable message.

- [ ] **Step 1: Error mapping (TDD)**

`frontend/src/lib/errors.ts`:
```ts
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
  if (/insufficient allowance/i.test(s)) return 'You have not approved enough USDC'
  if (/insufficient balance/i.test(s)) return 'Insufficient USDC balance'
  return 'Transaction failed. Please try again.'
}
```
`frontend/src/lib/errors.test.ts`:
```ts
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
```
Run: `cd frontend && npx vitest run src/lib/errors.test.ts` → PASS.

- [ ] **Step 2: Client factory**

`frontend/src/lib/clients.ts` — use the generated bindings' `Client` classes (adjust the import path/constructor to match what Task 1 recorded). Representative shape:
```ts
import { Client as Marketplace } from '../contracts/marketplace/src'
import { Client as Token } from '../contracts/token/src'
import { Client as Reputation } from '../contracts/reputation/src'
import { config } from './config'

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
```
NOTE: the exact constructor options are defined by the generated bindings (Task 1). Match them precisely. The generated `AssembledTransaction` exposes `.simulate()`, `.signAndSend()`, and `.result`.

- [ ] **Step 3: Transaction runner**

`frontend/src/lib/tx.ts`:
```ts
import { parseContractError } from './errors'

export class TxError extends Error {}

// The generated bindings return an AssembledTransaction with signAndSend().
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

// Read-only calls: bindings return an AssembledTransaction whose .result holds
// the simulated value without signing.
export async function readTx<T>(assembled: { result: T }): Promise<T> {
  return assembled.result
}
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run` and `npx tsc --noEmit`
Expected: all tests pass; no type errors.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/clients.ts frontend/src/lib/tx.ts frontend/src/lib/errors.ts frontend/src/lib/errors.test.ts
git commit -m "feat(frontend): contract client factory + tx runner + error mapping"
```

---

### Task 5: Layout, routing, wallet bar, toasts

**Files:**
- Create: `frontend/src/components/Layout.tsx`, `frontend/src/components/WalletBar.tsx`, `frontend/src/components/Toast.tsx`, `frontend/src/lib/ToastContext.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/main.tsx`

**Interfaces:**
- Produces: `useToast()` → `{ success(msg), error(msg) }`; a responsive shell with nav links (Marketplace, Create, Portfolio, Ramp) + wallet connect/disconnect and a truncated address; `<Outlet/>` for routed pages.

- [ ] **Step 1: Toast context**

`frontend/src/lib/ToastContext.tsx`:
```tsx
import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
type Toast = { id: number; kind: 'success' | 'error'; msg: string }
const Ctx = createContext<{ success: (m: string) => void; error: (m: string) => void } | null>(null)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const push = useCallback((kind: 'success' | 'error', msg: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((t) => [...t, { id, kind, msg }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000)
  }, [])
  const api = { success: (m: string) => push('success', m), error: (m: string) => push('error', m) }
  return (
    <Ctx.Provider value={api}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map((t) => (
          <div key={t.id} className={`px-4 py-2 rounded shadow text-white ${t.kind === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>{t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  )
}
export function useToast() {
  const v = useContext(Ctx); if (!v) throw new Error('useToast within ToastProvider'); return v
}
```

- [ ] **Step 2: WalletBar + responsive Layout**

`frontend/src/components/WalletBar.tsx` — connect button when `address` is null; otherwise show `G...abc` (first 4 + last 4) + a disconnect button + a live USDC balance (fetched via `getToken().balance`). Handle loading/error on balance fetch.

`frontend/src/components/Layout.tsx` — a top bar with the brand, nav `NavLink`s (Marketplace `/`, Create `/create`, Portfolio `/portfolio`, Ramp `/ramp`), a mobile hamburger that toggles a dropdown at `< md`, and `<WalletBar/>`. Body renders `<Outlet/>` inside a `max-w-5xl mx-auto p-4` container.

Provide complete code following the Global Constraints (mobile at 375px, Tailwind responsive classes `hidden md:flex` / hamburger state).

- [ ] **Step 3: Router wiring**

`frontend/src/App.tsx` sets up `createBrowserRouter`/`<Routes>` with `Layout` as the shell and routes to the five pages (placeholders until later tasks). `frontend/src/main.tsx` wraps `<WalletProvider><ToastProvider><App/></ToastProvider></WalletProvider>`.

- [ ] **Step 4: Smoke test**

Add `frontend/src/components/Layout.test.tsx` that renders the layout within the providers + a `MemoryRouter` and asserts the nav links render. Run `npx vitest run`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): responsive layout, routing, wallet bar, toasts"
```

---

### Task 6: Onboarding page (connect → faucet → guided first step)

**Files:**
- Create: `frontend/src/pages/Onboarding.tsx`
- Create: `frontend/src/hooks/useBalance.ts`

**Interfaces:**
- Consumes: `useWallet`, `getToken`, `useToast`, `fromStroops`.
- Produces: route `/onboarding` (also the default CTA when disconnected).

- [ ] **Step 1: Balance hook**

`frontend/src/hooks/useBalance.ts` — `useBalance(address: string | null)` returns `{ balance: bigint | null, loading, error, refetch }`, calling `getToken().balance({ id: address })` (read-only, use `.result`). Handle null address (skip).

- [ ] **Step 2: Onboarding UI**

`frontend/src/pages/Onboarding.tsx` — three numbered steps:
1. Connect wallet (button → `connect()`).
2. Claim 1000 test USDC (button → `runTx(getToken(sign, addr).faucet({ to: addr }))`, then refetch balance; disabled while pending; success/error toast). Show current balance.
3. "You're ready — go to Marketplace" link, enabled once balance > 0.
Every button shows a pending state; every failure shows `parseContractError` via toast.

- [ ] **Step 3: Manual verification (documented, not automated — wallet needed)**

Run: `cd frontend && npm run dev`, open the app, connect a testnet wallet, click faucet, confirm balance shows 1000. Record in your report that this was verified (or note it needs a real wallet at review time).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Onboarding.tsx frontend/src/hooks/useBalance.ts
git commit -m "feat(frontend): onboarding page with faucet"
```

---

### Task 7: Marketplace page (list open + buy)

**Files:**
- Create: `frontend/src/pages/Marketplace.tsx`
- Create: `frontend/src/hooks/useInvoices.ts`
- Create: `frontend/src/components/InvoiceCard.tsx`

**Interfaces:**
- Consumes: `getMarketplace().list_open()`, `getToken().approve` + `getMarketplace().buy_invoice`, formatters.
- Produces: route `/`.

- [ ] **Step 1: Invoices hook**

`frontend/src/hooks/useInvoices.ts` — `useOpenInvoices()` → `{ invoices, loading, error, refetch }` from `list_open()`; map the raw bindings `Invoice[]` (bigint fields) into a UI type. Also export `useInvoicesByOwner(addr)` and `useInvoicesBySeller(addr)` for Task 8.

- [ ] **Step 2: InvoiceCard**

`frontend/src/components/InvoiceCard.tsx` — shows debtor name, face value (`fromStroops`), discount (`bpsToPercent`), computed price (`salePrice` → `fromStroops`), a status badge, and an action slot (children). Mobile-friendly card.

- [ ] **Step 3: Marketplace page + buy flow**

`frontend/src/pages/Marketplace.tsx`:
- Grid of `InvoiceCard` for each open invoice with a **Buy** button showing the price.
- Buy handler: `approve` the marketplace for `salePrice` (expiration far in future), then `buy_invoice({ id, investor: addr })` via `runTx`; on success toast + refetch; on error toast. Disable while pending. Require connected wallet (else prompt connect).
- Loading skeleton + empty state ("No open invoices — create one").

- [ ] **Step 4: Component test (pure rendering)**

`InvoiceCard.test.tsx` — render with a fixed invoice, assert face value, price, and discount text appear. `npx vitest run`.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Marketplace.tsx frontend/src/hooks/useInvoices.ts frontend/src/components/InvoiceCard.tsx frontend/src/components/InvoiceCard.test.tsx
git commit -m "feat(frontend): marketplace page + buy flow"
```

---

### Task 8: Create page + Portfolio page

**Files:**
- Create: `frontend/src/pages/Create.tsx`, `frontend/src/pages/Portfolio.tsx`

**Interfaces:**
- Consumes: `create_invoice`, `settle`, `mark_default`, `cancel_invoice`, `get_score`, hooks from Task 7.
- Produces: routes `/create`, `/portfolio`.

- [ ] **Step 1: Create page (form + validation)**

`frontend/src/pages/Create.tsx`:
- Fields: debtor name (text), face value USDC (number → `toStroops`), discount % (number → bps = `pct*100`), due-in-days (number → `due_ledger = currentSeq + days*17280`; fetch current ledger via RPC `getLatestLedger`).
- Client-side validation mirroring the contract (face_value > 0; 0.01 ≤ pct ≤ 90; days ≥ 1) with inline error messages.
- Submit: `runTx(getMarketplace(sign, addr).create_invoice({ seller: addr, debtor_name, face_value, due_ledger, discount_bps }))`; success toast + redirect to Portfolio; error toast.

- [ ] **Step 2: Portfolio page**

`frontend/src/pages/Portfolio.tsx`:
- Two sections: **Selling** (`list_by_seller(addr)`) and **Investing** (`list_by_owner(addr)` where owner==addr and status Funded/Settled/Defaulted).
- Per invoice, contextual actions:
  - Seller + Listed → **Cancel** (`cancel_invoice`).
  - Owner + Funded → **Settle** (approve token for `face_value`, then `settle({ id, payer: addr })`) and, when past due, **Mark Default** (`mark_default({ id })`).
- Show the connected wallet's reputation from `get_score(addr)`: settled/defaulted counts + a simple rating (e.g. `settled/(settled+defaulted)`).
- All actions: pending/success/error handling + refetch.

- [ ] **Step 3: Verify build + tests**

Run: `cd frontend && npm run build && npx vitest run`
Expected: build OK; tests pass.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Create.tsx frontend/src/pages/Portfolio.tsx
git commit -m "feat(frontend): create invoice + portfolio (settle/cancel/default/reputation)"
```

---

### Task 9: Ramp (mock) page + final polish

**Files:**
- Create: `frontend/src/pages/Ramp.tsx`
- Modify: pages for empty/loading polish; `frontend/src/index.css` for any base styles.

**Interfaces:**
- Produces: route `/ramp`.

- [ ] **Step 1: Mock ramp UI**

`frontend/src/pages/Ramp.tsx` — clearly labeled **"Simulated (testnet) — no real money"** banner. On-ramp: "Deposit $ → receive test USDC" triggers the faucet. Off-ramp: "Withdraw USDC → $" is a mock form that shows a success toast without moving funds (or transfers to a burn-ish note). This satisfies the spec's mock-anchor requirement without implying real fiat.

- [ ] **Step 2: Responsive pass**

Verify each page at 375px: no horizontal scroll, tappable targets, nav hamburger works. Fix Tailwind classes as needed.

- [ ] **Step 3: Build + full test**

Run: `cd frontend && npm run build && npx vitest run && npm run lint`
Expected: build OK, tests pass, lint clean.

- [ ] **Step 4: Commit**

```bash
git add frontend/src
git commit -m "feat(frontend): mock ramp page + responsive polish"
```

---

## Self-Review

**Spec coverage (design doc → tasks):**
- React+Vite+TS+Tailwind → Task 0 ✅
- Wallets Kit → Task 3 ✅
- Contract calls via typed clients → Tasks 1,4 ✅
- Marketplace/Create/Portfolio/Ramp(mock)/Onboarding pages → Tasks 5–9 ✅
- Mobile responsive → Tasks 5,9 ✅
- Loading + error states on every call → Tasks 4–9 (tx runner + toasts) ✅
- Faucet onboarding → Task 6 ✅
- Reputation display → Task 8 ✅
- Monitoring/analytics/feedback/deploy → **Plan 3** (out of scope here) ✅

**Placeholder scan:** Component-heavy tasks (5–9) specify interfaces + key code and behavior rather than every JSX line; this is deliberate for UI where exact markup is stylistic — the data flow, contract calls, states, and error handling are all concrete. Infra/logic tasks (0–4) carry complete code and TDD.

**Type consistency:** `Invoice`/`Status`/`Score` come from generated bindings (Task 1) — later tasks must use those exact types; `salePrice`/`fromStroops`/`toStroops` signatures fixed in Task 2; `runTx`/`readTx`/`parseContractError` fixed in Task 4; `useWallet`/`useToast` fixed in Tasks 3/5.

**Note for executor:** the exact generated-binding client constructor and method call shape (Task 1) governs Tasks 4–9; if it differs from the representative snippets here, follow the generated code and keep the documented behavior.

## Execution Handoff

Plan 2 of 3. Execute with subagent-driven-development. Frontend flows that need a real wallet are verified manually (documented in reports); pure logic (format, errors, wallet guard, card rendering) is unit-tested. After this plan: deploy the frontend and run Plan 3 (monitoring, analytics, feedback, user onboarding).
