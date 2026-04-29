# ShadowPay

> **Crypto solved payments. ShadowPay solves payroll.**
> Confidential salary, vesting, and contractor streams on iExec Nox.

[![iExec Vibe Coding Challenge](https://img.shields.io/badge/iExec-Vibe%20Coding%20Challenge-ff7a45)](https://dorahacks.io/hackathon/vibe-coding-iexec/detail)
[![Arbitrum Sepolia](https://img.shields.io/badge/network-Arbitrum%20Sepolia-28a0f0)](https://sepolia.arbiscan.io)
[![Live demo](https://img.shields.io/badge/live-shadowpay--eight.vercel.app-blue)](https://shadowpay-eight.vercel.app)

## Why this matters

Crypto solved global, instant, programmable payments. It has not solved
**payroll**. Until now, every company paying salaries on-chain has had to
pick:

- **Transparency** — pay direct on Ethereum, accept that every employee
  can read every other employee's salary on Etherscan.
- **Usability** — pay through a custodial middleman (Deel, Coinbase,
  Bitwage), which defeats the entire point of paying in crypto.

ShadowPay is the first protocol that delivers both. Salaries are
**confidential** ERC-7984 tokens, encrypted with FHE through iExec's Nox
protocol; the on-chain audit trail still exists, but individual amounts are
unreadable without explicit permission. Auditors, regulators, and
accountants can be granted **selective disclosure** per stream when needed.

## Who it's for

- **Crypto-native startups** paying remote teams in stablecoins.
- **DAOs** running contributor and core-team payroll on-chain.
- **Tokenized companies** distributing equity grants (RSUs, ESOPs) without
  publishing every employee's allocation.
- **Global contractors** who want stablecoin pay without the rest of the
  internet seeing the invoice amount.

## Why now

- **On-chain salaries are growing fast.** Stablecoin payroll (USDC, EURC,
  USDe) is going mainstream as remote work globalises and FX/banking rails
  for remote teams stay terrible.
- **Privacy is the last missing primitive.** Streaming, vesting,
  compliance hooks (ERC-3643), and confidential token standards (ERC-7984)
  all exist. Nothing has stitched them together for payroll until now.
- **FHE is finally production-ready on a real L2.** iExec Nox brings
  fully-homomorphic-encrypted state to Arbitrum Sepolia with native dev
  tools, a usable SDK, and live infrastructure.

## How it feels in 3 steps

1. **Wrap.** Deposit any ERC-20 stablecoin (we ship with USDC). The
   contract wraps it into `wcUSDC` — a confidential ERC-7984 equivalent.
2. **Stream.** Type *"Pay Alice $5,000 monthly for 12 months with a 3-month
   cliff."* ChainGPT parses it. The contract encrypts the per-period amount
   with FHE before it ever touches the chain.
3. **Claim.** The recipient pulls each period as it vests; the contract
   releases the encrypted balance via `confidentialTransfer`. Only the
   payer, recipient, and granted auditors can ever decrypt the number.

**Live demo:** <https://shadowpay-eight.vercel.app>

---

## What it does (technical)

- **Wrap** any ERC-20 stablecoin (USDC, EURC, USDe…) into a confidential
  ERC-7984 equivalent (e.g. wcUSDC) using the official iExec
  `ERC20ToERC7984Wrapper`.
- **Stream** that confidential balance to one or many recipients on a chunked
  per-period schedule (monthly, weekly, daily, hourly). Total amount stays
  encrypted; only public state on-chain is the schedule (period length, total
  periods, cliff).
- **Claim** vested chunks at any time. The contract calls
  `confidentialTransfer` on the wrapper, releasing `amountPerPeriod ×
  periodsClaimed` to the recipient as encrypted balance.
- **Cancel** with vested-funds protection: the recipient keeps everything that
  has already vested; only un-vested periods are returned to the payer.
- **Selective disclosure**: the payer or recipient can grant any address (an
  auditor, accountant, regulator) read-access to a specific stream's encrypted
  handle. Granted auditors can decrypt the per-period amount through the Nox
  gateway.
- **Vibe Send with ChainGPT**: paste a sentence like
  *"Pay 0xAlice 5,000 USDC monthly for 12 months with a 3-month cliff"*
  and the form pre-fills via the ChainGPT API (or a deterministic local parser
  fallback).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js, App Router)                │
│  Employer page · Employee page · Auditor page                    │
│        wagmi + viem + RainbowKit + iExec Nox SDK                 │
└───────────────┬───────────────────────────┬──────────────────────┘
                │                           │
                ▼                           ▼
         FHE encrypt/decrypt        ChainGPT NL → JSON
         (Nox gateway, Zama         (proxied via /api/chaingpt
          coprocessor)               with safe local fallback)
                │                           │
                ▼                           │
┌──────────────────────────────────────────────────────────────────┐
│                  Smart Contracts (Solidity 0.8.28)               │
│                                                                  │
│   MockERC20 (mUSDC)  ──approve──►  WrappedConfidentialUSDC       │
│                                          (ERC-7984)              │
│                                          │                       │
│                                          ▼                       │
│                          ConfidentialPayrollStream               │
│                              · createStream                      │
│                              · claim                             │
│                              · cancel                            │
│                              · grantAuditor                      │
└──────────────────────────────────────────────────────────────────┘
                                          │
                                          ▼
                              Arbitrum Sepolia (chainId 421614)
```

### Why per-period chunking?

FHE arithmetic supports multiplication of an encrypted value by a public
scalar very cheaply (`euint256 * uint256`). It does **not** support general
division by a non-power-of-two encrypted divisor cheaply. So instead of
"continuous" Sablier-style streams (which would need encrypted division to
compute the unlocked fraction), ShadowPay stores a single encrypted
`amountPerPeriod` and unlocks `N` chunks at a time:

```
payout = amountPerPeriod × periodsElapsed   (encrypted × public scalar)
```

This is FHE-cheap, deterministic, and matches how real payroll actually works
(monthly, bi-weekly, milestone-based). Vesting cliffs and milestone bonuses
fall out for free.

---

## Repository layout

```
emag/
├── contracts/                 Hardhat project (Solidity 0.8.28)
│   ├── contracts/
│   │   ├── ConfidentialPayrollStream.sol   ← core protocol
│   │   ├── WrappedConfidentialUSDC.sol     ← ERC-20 ⇄ ERC-7984 wrapper
│   │   └── mocks/MockERC20.sol             ← faucet token for the demo
│   ├── scripts/deploy.ts                   ← Arbitrum Sepolia deployment
│   ├── test/payroll.t.ts                   ← control-plane smoke tests
│   └── hardhat.config.ts
├── web/                       Next.js 14 (App Router)
│   ├── app/
│   │   ├── page.tsx                        ← landing
│   │   ├── employer/page.tsx               ← create + manage streams
│   │   ├── employee/page.tsx               ← claim + decrypt your pay
│   │   ├── auditor/page.tsx                ← selective disclosure view
│   │   └── api/chaingpt/route.ts           ← ChainGPT NL → JSON proxy
│   ├── components/
│   │   ├── CreateStreamForm.tsx
│   │   ├── StreamCard.tsx
│   │   └── Nav.tsx
│   └── lib/
│       ├── nox.ts                          ← FHE encrypt/decrypt helpers
│       ├── streams.ts                      ← chain-state hook
│       ├── abis.ts                         ← typed ABIs
│       └── deployments.json                ← written by deploy.ts
├── feedback.md                ← required per evaluation criteria
└── README.md
```

---

## Quickstart

### Prerequisites

- Node 18+
- An EOA with a small amount of Arbitrum Sepolia ETH (faucet: <https://www.alchemy.com/faucets/arbitrum-sepolia>)
- *(Optional)* a [WalletConnect project ID](https://cloud.walletconnect.com)
- *(Optional)* a [ChainGPT API key](https://chaingpt.org) — message
  `@vladnazarxyz` on Telegram to get free credits as per the challenge brief

### 1. Install

```bash
npm install
```

(installs both `contracts/` and `web/` workspaces).

### 2. Deploy contracts to Arbitrum Sepolia

```bash
cp contracts/.env.example contracts/.env
# fill in DEPLOYER_PRIVATE_KEY (and optionally ARBISCAN_API_KEY)

npm --prefix contracts run compile
npm --prefix contracts run deploy
```

The deploy script:

1. Spins up a MockERC20 (mUSDC) and mints 1M to the deployer (or wraps an
   existing testnet USDC if `DEMO_UNDERLYING_ADDRESS` is set).
2. Deploys `WrappedConfidentialUSDC` (the ERC-7984 wrapper).
3. Deploys `ConfidentialPayrollStream` pointed at the wrapper.
4. Writes `contracts/deployments.arbitrumSepolia.json`.
5. Mirrors the artifact to `web/lib/deployments.json` so the frontend picks it
   up automatically.
6. Verifies all contracts on Arbiscan if `ARBISCAN_API_KEY` is set.

### 3. Run the frontend

```bash
cp web/.env.example web/.env.local
# fill in NEXT_PUBLIC_WC_PROJECT_ID (and optionally CHAINGPT_API_KEY)

npm --prefix web run dev
```

Open <http://localhost:3000>, switch your wallet to Arbitrum Sepolia, and:

1. **Employer** view → mint yourself some mUSDC, paste a recipient, type a
   prompt or fill the form, hit *Create stream*. Approve / wrap / setOperator /
   createStream all happen in sequence.
2. **Employee** view (different wallet) → see your stream as a ciphertext;
   decrypt to reveal *your* per-period amount; claim periods as they vest.
3. **Auditor** view (third wallet, after the employer or employee grants it
   access) → decrypt only the streams you've been authorised to see.

---

## Live deployment

| Item                            | Value                       |
|---------------------------------|-----------------------------|
| Network                         | Arbitrum Sepolia (421614)   |
| `MockERC20` (mUSDC)             | *populated post-deploy in `contracts/deployments.arbitrumSepolia.json`* |
| `WrappedConfidentialUSDC`       | *populated post-deploy*     |
| `ConfidentialPayrollStream`     | *populated post-deploy*     |
| Frontend                        | Vercel — link in the X post |
| GitHub                          | this repo                   |

`contracts/deployments.arbitrumSepolia.json` is the source of truth
post-deploy and is mirrored to `web/lib/deployments.json` so the frontend
picks new addresses up automatically.

### Disposable deployer pattern

For the hackathon we generate a **fresh, disposable hot wallet** for the
deployer and (recommended) `transferOwnership` of the payroll contract to
the team's actual wallet at deploy time:

```bash
# in contracts/.env
DEPLOYER_PRIVATE_KEY=0x...      # disposable, generated fresh
FINAL_OWNER=0xYourRealWallet    # contract owner after deploy

npm --prefix contracts run deploy
```

The deployer wallet then never needs to touch real funds again — burn
or forget.

---

## How ShadowPay uses iExec Nox

| Surface                     | Nox primitive used                                                                 |
|-----------------------------|-------------------------------------------------------------------------------------|
| `WrappedConfidentialUSDC`   | inherits `ERC20ToERC7984Wrapper` from `@iexec-nox/nox-confidential-contracts`     |
| `ConfidentialPayrollStream` | uses `Nox.fromExternal(externalEuint256, bytes)` to ingest the encrypted per-period amount |
| Same                        | uses `Nox.mul(euint256, uint256)` to compute `payout = amountPerPeriod × periods` |
| Same                        | uses `Nox.allow / allowTransient / allowThis` to manage ACL for payer, recipient, contract, auditor |
| Frontend                    | uses `@iexec-nox/nox-sdk` to encrypt user input and decrypt granted handles via the Nox gateway |

The contract never sees plaintext amounts. The frontend never displays an
amount the connected wallet doesn't have ACL access to.

---

## Stretch ideas (post-hackathon)

- **Tokenized-equity grants** — same streaming primitive, but flowing
  ERC-3643-compliant equity tokens wrapped into ERC-7984. This puts ShadowPay
  on the compliant-cap-table track too.
- **Multi-recipient batch streams** — one transaction creates N streams, useful
  for bulk-onboarding contractors.
- **Milestone streams** — release a chunk on a signed approval rather than on
  time, for contractor work.
- **Real-time treasury view** — encrypted-aggregate balance for the whole
  payroll contract, decryptable only by the company's CFO key.

---

## Credits & feedback

- Built for the [iExec Vibe Coding Challenge](https://dorahacks.io/hackathon/vibe-coding-iexec/detail).
- AI partner: [ChainGPT](https://chaingpt.org).
- Vibe-coded with [Claude Code](https://www.anthropic.com/claude-code).
- See [`feedback.md`](./feedback.md) for our notes on the iExec dev experience.

License: MIT.
