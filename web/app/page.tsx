import Link from "next/link";
import { arbiscanAddr } from "@/lib/format";
import deployments from "@/lib/deployments.json";

export default function HomePage() {
  const payroll = deployments.contracts.confidentialPayrollStream;

  return (
    <div className="pt-14 sm:pt-20">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-medium leading-[1.1] tracking-tight sm:text-5xl">
          Payroll that doesn't leak.
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
          Stablecoin salaries on-chain are great until your team's comp is one
          Etherscan search away. ShadowPay streams pay in confidential
          ERC-7984 tokens. Amounts are encrypted at rest. Auditors get access
          when you grant it, not before.
        </p>

        <div className="mt-7 flex flex-wrap items-center gap-2">
          <Link
            href="/employer"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink hover:brightness-110"
          >
            Run payroll
          </Link>
          <Link
            href="/employee"
            className="rounded-md px-4 py-2 text-sm text-white/80 hover:text-white"
          >
            Claim pay
          </Link>
          <Link
            href="/auditor"
            className="rounded-md px-4 py-2 text-sm text-white/80 hover:text-white"
          >
            Audit a stream
          </Link>
          <a
            href={arbiscanAddr(payroll)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md px-3 py-2 text-sm text-muted hover:text-accent"
          >
            Contract ↗
          </a>
        </div>
      </section>

      <section className="mt-16 max-w-3xl">
        <div className="rounded-xl border border-white/10 bg-black/40 p-5 font-mono text-[13px] leading-relaxed">
          <p className="text-muted">
            <span className="text-white/40"># in the create-stream form, type:</span>
          </p>
          <p className="mt-1 text-white">
            pay <span className="text-accent">0xAlice</span> 5,000 USDC monthly
            for 12 months with a 3-month cliff
          </p>
          <p className="mt-3 text-muted">
            <span className="text-white/40"># ChainGPT fills the spec, FHE seals
            the amount, one tx creates the stream:</span>
          </p>
          <p className="mt-1 break-all text-white/70">
            createStream(<span className="text-accent">0xAlice</span>,{" "}
            <span className="text-orange-300">0x9f3c…ea</span>{" "}
            <span className="text-white/40">/* ciphertext */</span>, …)
          </p>
        </div>
        <p className="mt-3 text-xs text-muted">
          Only Alice and the payer can decrypt the amount. Everyone else sees
          the schedule and a 32-byte handle.
        </p>
      </section>

      <section className="mt-20 max-w-4xl">
        <div className="grid gap-px overflow-hidden rounded-2xl bg-white/[0.06] sm:grid-cols-2">
          <Half
            label="Encrypted"
            items={[
              "Amount per period",
              "Total stream value",
              "Recipient's running balance",
              "Whatever an employee would call their salary",
            ]}
          />
          <Half
            label="Still public"
            items={[
              "That a stream exists",
              "Schedule: cadence, length, cliff",
              "Payer and recipient addresses",
              "Auditors decrypt on demand, with a grant",
            ]}
            tone="muted"
          />
        </div>
      </section>

      <section className="mt-20 max-w-3xl space-y-8 text-sm leading-relaxed text-muted">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white">
            Who it's for
          </p>
          <p className="mt-2">
            Crypto-native startups paying remote teams in stablecoins. DAOs running
            contributor payroll. Global contractors who want USDC pay without
            their compensation in a public block explorer. Token grants and ESOP
            schedules where the vesting amount is sensitive.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white">
            Why now
          </p>
          <p className="mt-2">
            On-chain stablecoin payroll is the actual bull case for crypto rails
            this cycle. The blocker has been privacy: nobody wants their team's
            comp public. FHE on iExec Nox is the first thing that makes it
            workable on a real L2 without a custodian in the loop.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-white">
            Stack
          </p>
          <p className="mt-2 font-mono text-xs">
            iExec Nox · ERC-7984 · Arbitrum Sepolia · ChainGPT · Next.js · viem
          </p>
        </div>
      </section>
    </div>
  );
}

function Half({
  label,
  items,
  tone,
}: {
  label: string;
  items: string[];
  tone?: "muted";
}) {
  return (
    <div className="bg-[#0a0a0e] p-6 sm:p-7">
      <p
        className={
          tone === "muted"
            ? "text-xs uppercase tracking-wider text-muted"
            : "text-xs uppercase tracking-wider text-accent"
        }
      >
        {label}
      </p>
      <ul className="mt-4 space-y-2 text-sm">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className={tone === "muted" ? "text-white/30" : "text-accent/60"}>
              ›
            </span>
            <span className={tone === "muted" ? "text-muted" : "text-white"}>
              {it}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
