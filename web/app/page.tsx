import Link from "next/link";

export default function HomePage() {
  return (
    <div className="pt-12">
      <section className="max-w-3xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full glass px-3 py-1 text-xs uppercase tracking-widest text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> iExec Nox · ERC-7984 · Arbitrum
        </p>
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">
          Crypto solved payments.
          <br />
          <span className="text-accent">ShadowPay solves payroll.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Until now, paying salaries on-chain meant choosing between
          <span className="text-white"> transparency</span> (every salary public on Etherscan) and
          <span className="text-white"> usability</span> (custodial off-ramps that defeat the point).
          ShadowPay does both — confidential ERC-7984 streams with selective disclosure for auditors.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/employer"
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-ink"
          >
            Run payroll →
          </Link>
          <Link
            href="/employee"
            className="rounded-md glass glass-hover px-5 py-2.5 text-sm font-medium"
          >
            Claim your pay
          </Link>
          <Link
            href="/auditor"
            className="rounded-md glass glass-hover px-5 py-2.5 text-sm font-medium"
          >
            Audit a stream
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          <Card title="Built for">
            Crypto-native startups paying remote teams. DAOs running contributor payroll. Global
            contractors who want stablecoin pay without their salary public on Etherscan. Token
            grants and ESOP distributions for tokenized companies.
          </Card>
          <Card title="Why now">
            On-chain salaries are growing fast as stablecoin payroll (USDC, EURC, USDe) goes
            mainstream and remote work goes global. Privacy is the last missing primitive — and FHE
            on iExec Nox finally makes it production-ready on a real L2.
          </Card>
          <Card title="How it feels">
            <span className="text-white">1.</span> Wrap USDC into wcUSDC.&nbsp;
            <span className="text-white">2.</span> Type "pay Alice $5k/mo for a year" — ChainGPT
            fills the form.&nbsp;
            <span className="text-white">3.</span> One click. Stream is live, encrypted on-chain,
            visible only to the people you choose.
          </Card>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <Card title="What stays private">
            Per-period amount. Recipient balance. Total stream value. Anything an employee or
            contractor would consider their compensation.
          </Card>
          <Card title="What's still verifiable">
            That a stream exists. Its schedule (period length, total periods, cliff). Its payer and
            recipient. Auditors with explicit grants can decrypt amounts on demand.
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass glass-hover rounded-2xl p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
