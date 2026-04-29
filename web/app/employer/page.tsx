"use client";

import { useAccount } from "wagmi";
import { CreateStreamForm } from "@/components/CreateStreamForm";
import { StreamCard } from "@/components/StreamCard";
import { MintFaucet } from "@/components/MintFaucet";
import { useStreams } from "@/lib/streams";

export default function EmployerPage() {
  const { address } = useAccount();
  const { streams, loading, error, refresh } = useStreams();

  const mine = streams.filter((s) => address && s.payer.toLowerCase() === address.toLowerCase());

  return (
    <div className="space-y-12 pt-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Run payroll</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Wrap USDC into a confidential balance, then create a stream. The per-period amount is
          encrypted with FHE before it ever touches the chain — only you, the recipient, and any
          auditor you grant can ever decrypt it.
        </p>
      </section>

      <MintFaucet />

      <section className="rounded-3xl glass-strong p-6">
        <CreateStreamForm onCreated={refresh} />
      </section>

      <section className="space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-xl font-semibold">Your active streams</h2>
          <p className="text-xs uppercase tracking-widest text-muted">{mine.length} stream{mine.length === 1 ? "" : "s"}</p>
        </div>

        {loading && <p className="text-sm text-muted">Loading…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {!loading && !error && mine.length === 0 && (
          <div className="rounded-2xl glass border-dashed p-8 text-center text-sm text-muted">
            No streams yet. Create one above to get going.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((s) => (
            <StreamCard key={s.id.toString()} stream={s} role="payer" />
          ))}
        </div>
      </section>
    </div>
  );
}
