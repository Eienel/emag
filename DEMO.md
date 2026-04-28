# ShadowPay — 4-minute demo script

The hackathon caps the demo at 4 minutes. Here's a tight, scannable script —
roughly 60 seconds × four beats. Read it aloud while recording your screen
(or your phone screen mirrored into a desktop, if you don't have a PC).

> Tip: practise once, then record. Anything past 4:00 disqualifies the
> submission per the brief.

---

## Beat 1 — the problem (0:00 – 0:45)

**On screen:** open Etherscan, scroll any payroll-style address.

> "If your company pays salaries on Ethereum, every employee can read every
> other employee's salary on Etherscan. That's why nobody actually does
> Web3-native payroll — they all use Coinbase or Deel as a custodial
> middleman, which defeats the entire point.
>
> ShadowPay fixes this. Salaries on-chain. Numbers off it."

## Beat 2 — vibe-coded stream creation (0:45 – 1:45)

**On screen:** ShadowPay → Employer page, wallet connected as the founder.

> "I'm the founder. I want to pay Alice 5,000 USDC a month for a year, with
> a 3-month cliff."

Type into the ChainGPT prompt:

```
Pay 0xAlice... 5,000 USDC monthly for 12 months with a 3-month cliff
```

Hit *Parse*. Watch the form fill in.

> "ChainGPT parsed that into a structured payroll spec. Now I just hit
> Create. Behind the scenes:
>   1. it approves USDC,
>   2. wraps it into confidential wcUSDC using iExec's official ERC-7984
>      wrapper,
>   3. authorises the payroll contract as a confidential operator,
>   4. encrypts the per-period amount with FHE through the Nox SDK,
>   5. and calls createStream on Arbitrum Sepolia."

When the tx confirms, point at the new card.

> "There's the stream. Notice — the amount is just a ciphertext handle.
> That's all that's on chain."

## Beat 3 — privacy in action (1:45 – 3:00)

Switch to a second browser/wallet that's the **employee** (Alice).

**On screen:** Employee page.

> "Now I'm Alice. I see the stream pointed at me — but as a ciphertext.
> When I click *Decrypt*, the Nox gateway checks I have ACL access to this
> handle…"

Click decrypt, the orange number appears.

> "…and I see my own number: 5,000. But only mine."

Now switch to a **third wallet** (a curious coworker, "Bob").

> "If I'm Bob, a coworker — same page, different wallet — I can see the
> stream exists, but the decrypt fails. The number stays a ciphertext."

(Show the failed decrypt or the stream not appearing in Bob's list.)

## Beat 4 — selective disclosure & claim (3:00 – 4:00)

Back to the **employer** wallet → click *Grant auditor* on the stream, paste
the auditor's address. Switch to the **auditor** wallet → Auditor page.

> "The employer just granted an external auditor access to this specific
> stream. The auditor can decrypt it — and only this one. Every other stream
> on the system stays sealed."

Show the decrypt working in the auditor view.

Switch back to the **employee** wallet, advance time (or just show on a
shorter-period stream you set up beforehand for the demo).

> "Meanwhile, every period vests automatically. Alice clicks *Claim*, and
> the contract releases this period's pay confidentially — encrypted balance
> moves into her wallet, no plaintext anywhere on chain."

**End frame:** the homepage tagline.

> "Salaries on-chain. Numbers off it. ShadowPay, built on iExec Nox."

---

## Recording on mobile (since you don't have a PC)

- iOS: Settings → Control Center → add **Screen Recording**. Record from the
  pulldown.
- Have **three browser tabs** open in advance, each with a different wallet
  signed in (use Rainbow, MetaMask Mobile, and Trust). Switch between tabs
  for the role transitions.
- Use a stream with a **shorter period (1 hour or even 1 minute)** seeded
  before the demo so you can show the *Claim* step without waiting a month.
  `seed-demo.ts` is wired for this — set `DEMO_PERIOD_SECONDS` to override.
- Record once, watch it back, re-record. The 4-minute cap is strict.

## What to upload alongside the video

The X (Twitter) post must include:

1. A short description of the project (use the homepage tagline + one
   sentence on confidentiality).
2. The demo video (≤ 4 min).
3. A link to this repo.
4. Tag `@iEx_ec` and `@Chain_GPT`.
