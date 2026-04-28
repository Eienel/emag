"use client";

import { useEffect, useState } from "react";
import { useChainId, usePublicClient } from "wagmi";
import type { Address } from "viem";
import { payrollAbi } from "@/lib/abis";
import deployments from "@/lib/deployments.json";
import type { Stream } from "@/components/StreamCard";

/**
 * Pulls every stream from the contract via `nextStreamId` + `getStream`.
 * Also indexes them by payer / recipient / auditor so each view can filter
 * without re-reading the chain.
 */
export function useStreams() {
  const client = usePublicClient();
  const chainId = useChainId();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!client) return;
      setError(null);
      const payroll = deployments.contracts.confidentialPayrollStream as Address;
      if (payroll === "0x0000000000000000000000000000000000000000") {
        setLoading(false);
        return;
      }
      try {
        const next = (await client.readContract({
          address: payroll,
          abi: payrollAbi,
          functionName: "nextStreamId",
        })) as bigint;
        const ids = Array.from({ length: Number(next) }, (_, i) => BigInt(i));
        const fetched = await Promise.all(
          ids.map(async (id) => {
            const s = (await client.readContract({
              address: payroll,
              abi: payrollAbi,
              functionName: "getStream",
              args: [id],
            })) as readonly [Address, Address, bigint, bigint, bigint, bigint, bigint, boolean, `0x${string}`];
            return {
              id,
              payer: s[0],
              recipient: s[1],
              startTime: s[2],
              periodSeconds: s[3],
              totalPeriods: s[4],
              cliffPeriods: s[5],
              claimedPeriods: s[6],
              cancelled: s[7],
              amountHandle: s[8],
            } satisfies Stream;
          })
        );
        if (!cancelled) setStreams(fetched);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [client, chainId, tick]);

  return { streams, loading, error, refresh: () => setTick((t) => t + 1) };
}
