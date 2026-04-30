"use client";

import { useAccount } from "wagmi";
import { StreamCard } from "@/components/StreamCard";
import { ConfidentialBalance } from "@/components/ConfidentialBalance";
import { useStreams } from "@/lib/streams";

export default function EmployeePage() {
  const { address } = useAccount();
  const { streams, loading, error } = useStreams();

  const mine = streams.filter((s) => address && s.recipient.toLowerCase() === address.toLowerCase());

  return (
    <div className="space-y-10 pt-10">
      <section>
        <h1 className="text-3xl font-semibold tracking-tight">Your pay</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Streams flow into your wallet as confidential ERC-7984 tokens. Decrypt to see your own
          number — only you and your employer (and anyone you authorise) can.
        </p>
      </section>

      {address && <ConfidentialBalance />}

      <section className="space-y-3">
        {!address && (
          <div className="rounded-2xl glass border-dashed p-8 text-center text-sm text-muted">
            Connect your wallet to see your streams.
          </div>
        )}
        {loading && <p className="text-sm text-muted">Loading…</p>}
        {error && <p className="text-sm text-red-400">{error}</p>}
        {address && !loading && mine.length === 0 && (
          <div className="rounded-2xl glass border-dashed p-8 text-center text-sm text-muted">
            No streams pointed at your address yet.
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {mine.map((s) => (
            <StreamCard key={s.id.toString()} stream={s} role="recipient" />
          ))}
        </div>
      </section>
    </div>
  );
}
