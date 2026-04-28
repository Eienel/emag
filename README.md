# ShadowPay

> Confidential payroll & vesting streams on iExec Nox.
> Salaries on-chain. Numbers off it.

[![iExec Vibe Coding Challenge](https://img.shields.io/badge/iExec-Vibe%20Coding%20Challenge-ff7a45)](https://dorahacks.io/hackathon/vibe-coding-iexec/detail)
[![Arbitrum Sepolia](https://img.shields.io/badge/network-Arbitrum%20Sepolia-28a0f0)](https://sepolia.arbiscan.io)

ShadowPay is a payroll and vesting protocol where every salary, RSU grant, and
contractor invoice flows in **confidential ERC-7984 tokens** powered by iExec's
Nox protocol. Amounts are encrypted with FHE before they touch the chain — only
the payer, recipient, and any auditors they explicitly authorise can decrypt
them.

It solves the problem that has kept Web3-native payroll a non-starter for real
companies: **public blockchains broadcast every salary on Etherscan**. Today,
the only workaround is custodial off-ramps (Deel, Coinbase, Bitwage), which
defeat the point of paying in crypto. ShadowPay keeps the on-chain audit trail
for compliance while keeping individual amounts private — exactly the trade-off
real-world finance actually needs.

---

## What it does

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
- **Vibe-coded with ChainGPT**: paste a sentence like
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
| `MockERC20` (mUSDC)             | *deployed by `deploy.ts`* |
| `WrappedConfidentialUSDC`       | *deployed by `deploy.ts`* |
| `ConfidentialPayrollStream`     | *deployed by `deploy.ts`* |
| Frontend                        | Vercel — link in the X post |
| GitHub                          | this repo                   |

`contracts/deployments.arbitrumSepolia.json` is the source of truth post-deploy.

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
