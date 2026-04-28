"use client";

import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import type { Address } from "viem";
import { payrollAbi } from "@/lib/abis";
import { getNoxClient, shortHandle } from "@/lib/nox";
import { formatUSDC, periodLabel, shortAddr } from "@/lib/format";
import deployments from "@/lib/deployments.json";

type Role = "payer" | "recipient" | "auditor";

export type Stream = {
  id: bigint;
  payer: Address;
  recipient: Address;
  startTime: bigint;
  periodSeconds: bigint;
  totalPeriods: bigint;
  cliffPeriods: bigint;
  claimedPeriods: bigint;
  cancelled: boolean;
  amountHandle: `0x${string}`;
};

export function StreamCard({ stream, role }: { stream: Stream; role: Role }) {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const payroll = deployments.contracts.confidentialPayrollStream as Address;
  const wrapper = deployments.contracts.wrappedConfidentialUSDC as Address;

  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [decryptErr, setDecryptErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: claimable, refetch: refetchClaimable } = useReadContract({
    address: payroll,
    abi: payrollAbi,
    functionName: "claimablePeriods",
    args: [stream.id],
  });
  const { data: vested, refetch: refetchVested } = useReadContract({
    address: payroll,
    abi: payrollAbi,
    functionName: "vestedPeriods",
    args: [stream.id],
  });

  useEffect(() => {
    const t = setInterval(() => { refetchClaimable(); refetchVested(); }, 8000);
    return () => clearInterval(t);
  }, [refetchClaimable, refetchVested]);

  const isMine =
    address?.toLowerCase() === stream.payer.toLowerCase() ||
    address?.toLowerCase() === stream.recipient.toLowerCase();

  async function decrypt() {
    setDecryptErr(null);
    try {
      const nox = await getNoxClient();
      const v = await nox.decryptUint256(stream.amountHandle, payroll);
      setDecrypted(v);
    } catch (e: any) {
      setDecryptErr(e?.message ?? String(e));
    }
  }

  async function claim() {
    if (!walletClient) return;
    setBusy(true);
    try {
      await walletClient.writeContract({
        address: payroll,
        abi: payrollAbi,
        functionName: "claim",
        args: [stream.id],
      });
      refetchClaimable(); refetchVested();
    } finally {
      setBusy(false);
    }
  }

  async function cancel() {
    if (!walletClient) return;
    if (!confirm("Cancel this stream? The recipient keeps already-vested periods.")) return;
    setBusy(true);
    try {
      await walletClient.writeContract({
        address: payroll,
        abi: payrollAbi,
        functionName: "cancel",
        args: [stream.id],
      });
      refetchVested();
    } finally {
      setBusy(false);
    }
  }

  async function grantAuditor() {
    if (!walletClient) return;
    const auditor = prompt("Auditor address (0x…)");
    if (!auditor) return;
    setBusy(true);
    try {
      await walletClient.writeContract({
        address: payroll,
        abi: payrollAbi,
        functionName: "grantAuditor",
        args: [stream.id, auditor as Address],
      });
    } finally {
      setBusy(false);
    }
  }

  const periodSec = Number(stream.periodSeconds);
  const totalPeriods = Number(stream.totalPeriods);
  const claimablePeriodsN = Number(claimable ?? 0n);
  const vestedN = Number(vested ?? 0n);
  const claimedN = Number(stream.claimedPeriods);
  const progress = Math.min(100, Math.round((vestedN / totalPeriods) * 100));

  return (
    <div className="rounded-2xl border border-edge bg-smoke p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-widest text-muted">Stream #{stream.id.toString()}</p>
          <p className="text-sm">
            <span className="text-muted">{role === "recipient" ? "From" : "To"}: </span>
            <span className="font-mono">
              {role === "recipient" ? shortAddr(stream.payer) : shortAddr(stream.recipient)}
            </span>
          </p>
          <p className="text-sm text-muted">
            {periodLabel(periodSec)} × {totalPeriods}
            {Number(stream.cliffPeriods) > 0 ? ` · ${stream.cliffPeriods.toString()}-period cliff` : ""}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-widest text-muted">amount / period</p>
          {decrypted !== null ? (
            <p className="text-lg font-semibold text-accent">{formatUSDC(decrypted)} <span className="text-xs text-muted">USDC</span></p>
          ) : (
            <span className="cipher text-xs">{shortHandle(stream.amountHandle)}</span>
          )}
          {isMine || role === "auditor" ? (
            <button onClick={decrypt} className="mt-1 text-[11px] uppercase tracking-widest text-accent hover:underline">
              {decrypted !== null ? "re-decrypt" : "decrypt"}
            </button>
          ) : null}
          {decryptErr && <p className="mt-1 text-[10px] text-red-400">{decryptErr}</p>}
        </div>
      </div>

      <div className="mt-4">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-edge">
          <div className="h-full bg-accent" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted">
          {vestedN} / {totalPeriods} periods vested · {claimedN} claimed · {claimablePeriodsN} claimable
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {role === "recipient" && !stream.cancelled && claimablePeriodsN > 0 && (
          <button
            onClick={claim}
            disabled={busy}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-ink disabled:opacity-50"
          >
            Claim {claimablePeriodsN} period{claimablePeriodsN === 1 ? "" : "s"}
          </button>
        )}
        {role === "payer" && !stream.cancelled && (
          <>
            <button
              onClick={cancel}
              disabled={busy}
              className="rounded-md border border-edge px-3 py-1.5 text-sm hover:border-red-700 hover:text-red-300 disabled:opacity-50"
            >
              Cancel stream
            </button>
            <button
              onClick={grantAuditor}
              disabled={busy}
              className="rounded-md border border-edge px-3 py-1.5 text-sm hover:border-accent disabled:opacity-50"
            >
              Grant auditor
            </button>
          </>
        )}
        {stream.cancelled && (
          <span className="rounded-md border border-red-900 px-3 py-1.5 text-xs text-red-400">Cancelled</span>
        )}
      </div>

      <p className="mt-4 truncate font-mono text-[10px] text-muted">
        ciphertext: {stream.amountHandle}
      </p>
    </div>
  );
}
