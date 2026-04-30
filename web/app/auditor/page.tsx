"use client";

import { useState } from "react";
import { StreamCard } from "@/components/StreamCard";
import { useStreams } from "@/lib/streams";

export default function AuditorPage() {
  const { streams, loading, error } = useStreams();
  const [filter, setFilter] = useState("");

  const visible = streams.filter((s) => {
    if (!filter.trim()) return true;
    const f = filter.toLowerCase();
    return s.payer.toLowerCase().includes(f) || s.recipient.toLowerCase().includes(f);
  });

  return (
    <div className="space-y-10 pt-10">
      <section>
        <h1 className="text-3xl font-medium tracking-tight">Selective disclosure</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
          You see plaintext for streams you've been granted access to. Everything
          else stays ciphertext. Filter by payer or recipient to find the
          streams you can read.
        </p>
      </section>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="filter by address (0x…)"
        className="w-full rounded-md glass glass-hover px-3 py-2 text-sm focus:!border-accent focus:outline-none"
      />

      {loading && <p className="text-sm text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        {visible.map((s) => (
          <StreamCard key={s.id.toString()} stream={s} role="auditor" />
        ))}
      </div>
    </div>
  );
}
