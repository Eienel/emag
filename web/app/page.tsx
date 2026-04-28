import Link from "next/link";

export default function HomePage() {
  return (
    <div className="pt-12">
      <section className="max-w-3xl">
        <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-edge bg-smoke px-3 py-1 text-xs uppercase tracking-widest text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" /> iExec Nox · ERC-7984 · Arbitrum
        </p>
        <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">
          Salaries on-chain.
          <br />
          <span className="text-accent">Numbers off it.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          ShadowPay streams payroll and vesting in <span className="text-white">confidential ERC-7984 tokens</span>.
          Employees see their own pay. Auditors get selective disclosure. Etherscan sees ciphertext.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Link
            href="/employer"
            className="group rounded-2xl border border-edge bg-smoke p-5 transition hover:border-accent"
          >
            <p className="text-xs uppercase tracking-widest text-muted">For founders & DAOs</p>
            <p className="mt-2 text-xl font-semibold">Run payroll →</p>
            <p className="mt-2 text-sm text-muted">
              Wrap USDC into wcUSDC. Spin up streams from natural language. Cancel anytime.
            </p>
          </Link>
          <Link
            href="/employee"
            className="group rounded-2xl border border-edge bg-smoke p-5 transition hover:border-accent"
          >
            <p className="text-xs uppercase tracking-widest text-muted">For employees</p>
            <p className="mt-2 text-xl font-semibold">Claim & decrypt →</p>
            <p className="mt-2 text-sm text-muted">
              See your stream. Pull each period the moment it vests. Unwrap to USDC when you need it.
            </p>
          </Link>
          <Link
            href="/auditor"
            className="group rounded-2xl border border-edge bg-smoke p-5 transition hover:border-accent"
          >
            <p className="text-xs uppercase tracking-widest text-muted">For auditors</p>
            <p className="mt-2 text-xl font-semibold">Selective disclosure →</p>
            <p className="mt-2 text-sm text-muted">
              Granted by employer or employee. Decrypt only the streams you've been allowed to see.
            </p>
          </Link>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-2">
          <Card title="Why confidential?">
            Public payroll is a non-starter for any real company. ShadowPay keeps amounts encrypted
            on-chain via FHE, so the on-chain record exists for compliance but stays unreadable
            without permission.
          </Card>
          <Card title="Why streams?">
            Continuous vesting + per-period claims mirror how real companies pay people: monthly
            salary, RSU cliffs, contractor milestones. All composable with existing DeFi.
          </Card>
        </div>
      </section>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-edge bg-smoke p-5">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm text-muted">{children}</p>
    </div>
  );
}
