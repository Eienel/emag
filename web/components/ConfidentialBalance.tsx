"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import type { Address } from "viem";
import { wrapperAbi } from "@/lib/abis";
import { getNoxClient, shortHandle } from "@/lib/nox";
import { formatUSDC } from "@/lib/format";
import deployments from "@/lib/deployments.json";

/**
 * Shows the connected wallet's wcUSDC (confidential) balance as a ciphertext
 * handle, with a one-click decrypt. This is what an employee sees after
 * claiming a stream — and what an employer can re-use to pay further streams
 * without touching public mUSDC again.
 */
export function ConfidentialBalance() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const wrapper = deployments.contracts.wrappedConfidentialUSDC as Address;

  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const { data: handle } = useReadContract({
    address: wrapper,
    abi: wrapperAbi,
    functionName: "confidentialBalanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 8000 },
  });

  if (!address) return null;
  const h = handle as `0x${string}` | undefined;
  const empty =
    !h || h === "0x0000000000000000000000000000000000000000000000000000000000000000";

  async function decrypt() {
    if (!h) return;
    setErr(null); setBusy(true);
    try {
      const nox = await getNoxClient(walletClient);
      const v = await nox.decryptUint256(h);
      setDecrypted(v);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl glass glass-hover px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted">Confidential balance</p>
          {empty ? (
            <p className="mt-1 text-sm text-muted">
              No wcUSDC yet. Wrap mUSDC below or claim from a stream.
            </p>
          ) : decrypted !== null ? (
            <p className="mt-1 text-lg font-semibold">
              {formatUSDC(decrypted)} <span className="text-xs text-muted">wcUSDC</span>
            </p>
          ) : (
            <p className="mt-1">
              <span className="cipher text-xs">{shortHandle(h!)}</span>
            </p>
          )}
          {err && <p className="mt-1 text-[10px] text-red-400">{err}</p>}
        </div>
        {!empty && (
          <button
            type="button"
            onClick={decrypt}
            disabled={busy}
            className="shrink-0 rounded-md glass glass-hover px-3 py-1.5 text-xs uppercase tracking-widest disabled:opacity-50"
          >
            {busy ? "Decrypting…" : decrypted !== null ? "Re-decrypt" : "Decrypt"}
          </button>
        )}
      </div>
    </div>
  );
}
