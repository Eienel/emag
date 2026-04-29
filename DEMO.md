# ShadowPay — 2-minute demo script

The hackathon caps demos at 4 minutes; **2 minutes is better**. Tighter,
more re-watchable, lands harder. Here's a beat-by-beat with timing.

> Practise once, then record. Anything past 4:00 disqualifies the
> submission per the brief.

---

## Setup (do this once before recording)

- **3 wallets** in your phone's wallet app (MetaMask Mobile / Rainbow):
  - "Founder" → has Arbitrum Sepolia ETH (the deployer wallet, or any wallet you funded)
  - "Alice" (employee) → tiny bit of Sepolia ETH for gas
  - "Auditor" → tiny bit of Sepolia ETH for gas
- **Three browser tabs** open at <https://shadowpay-eight.vercel.app>, each connected to a different wallet.
- **Pre-mint mUSDC for the founder wallet** — open `/employer`, tap *Mint mUSDC*. Don't record this.
- **Pre-create a stream with a 1-hour period** so vesting actually progresses during the demo. (Optional but recommended; lets you show *Claim* without waiting.)

---

## Beat 1 — the problem (0:00 – 0:20)

**On screen:** Etherscan tab open on any payroll-style address (or the
hero of shadowpay-eight.vercel.app).

> "Crypto solved payments. It hasn't solved payroll.
>
> Pay on Ethereum: every salary is public on Etherscan. Use Coinbase or
> Deel: you've defeated the point of crypto. Until now."

## Beat 2 — vibe-coded stream creation (0:20 – 1:00)

**On screen:** ShadowPay → Employer page, founder wallet connected.

> "I'm a founder. I want to pay Alice $5,000 a month for a year, with a
> 3-month cliff."

Type into the ChainGPT prompt:

```
Pay 0xAlice... 5000 USDC monthly for 12 months with a 3-month cliff
```

Tap *Parse*. Watch the form fill. Tap *Create stream*.

> "ChainGPT parsed that. The contract approves USDC, wraps it into a
> confidential ERC-7984 token, encrypts the per-period amount with FHE,
> and creates the stream — one click, one transaction.
>
> The stream is live. The amount on-chain is just ciphertext."

Point at the new card showing the ciphertext handle.

## Beat 3 — privacy in action (1:00 – 1:30)

Switch to **Alice's wallet** tab → Employee page.

> "Alice. Same app, different wallet. She sees her stream — but as a
> ciphertext. She taps *Decrypt*…"

Tap *Decrypt*. Orange number appears.

> "…and sees her own number. 5,000."

Switch quickly to a **third tab** with no wallet permissions.

> "Anyone else? The stream is on-chain, but the amount stays
> ciphertext. They can see *that* a stream exists, not what's in it."

## Beat 4 — selective disclosure & close (1:30 – 2:00)

Back to **founder wallet** → tap *Grant auditor* on the stream card →
paste the auditor address. Switch to the **auditor wallet** tab →
Auditor page.

> "Now an external auditor. The founder just granted them access to
> *this stream only*. They decrypt — and see the number. Every other
> stream on the system stays sealed."

Tap *Decrypt* on the stream card. Number appears.

**End frame:** the homepage hero.

> "Crypto solved payments. ShadowPay solves payroll.
> Built on iExec Nox. Vibe Send with ChainGPT."

---

## Recording on iPhone

- Settings → Control Center → add **Screen Recording**. Pull down → tap
  the record button. 3-second countdown starts.
- Speak into the phone's mic while recording — captures voiceover live.
- Edit in the Photos app: tap *Edit* → trim handles → *Done*. Use
  fade-in if the cut is abrupt.
- Export as 1080p. Upload to YouTube unlisted, or attach directly to
  the X post if it's under the 2:20 native limit.

## What to upload alongside the video

The X post must include (per the brief):

1. Short project description (use the homepage tagline + one line on
   confidentiality).
2. The demo video (≤ 2 min recommended, ≤ 4 min hard cap).
3. A link to this repo.
4. Live link: <https://shadowpay-eight.vercel.app>
5. Tags: `@iEx_ec` and `@Chain_GPT`.

Pre-written variants are in `X_POST.md`.
