"use client";

import { useState } from "react";
import { useAccount, useReadContract, useWalletClient } from "wagmi";
import type { Address } from "viem";
import { erc20Abi } from "@/lib/abis";
import { formatUSDC } from "@/lib/format";
import deployments from "@/lib/deployments.json";

const MINT_AMOUNT = 100_000n * 10n ** 6n; // 100,000 mUSDC, 6 decimals

export function MintFaucet() {
  const { address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [busy, setBusy] = useState(false);
  const underlying = deployments.contracts.underlying as Address;

  const { data: balance, refetch } = useReadContract({
    address: underlying,
    abi: erc20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  async function mint() {
    if (!walletClient || !address) return;
    setBusy(true);
    try {
      await walletClient.writeContract({
        address: underlying,
        abi: erc20Abi,
        functionName: "mint",
        args: [address, MINT_AMOUNT],
      });
      await refetch();
    } finally {
      setBusy(false);
    }
  }

  if (!address) return null;
  const bal = (balance as bigint | undefined) ?? 0n;

  return (
    <div className="flex items-center justify-between rounded-2xl border border-edge bg-smoke px-5 py-4">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted">Demo balance</p>
        <p className="mt-1 text-lg font-semibold">
          {formatUSDC(bal)} <span className="text-xs text-muted">mUSDC</span>
        </p>
      </div>
      <button
        type="button"
        onClick={mint}
        disabled={busy}
        className="rounded-md border border-edge px-3 py-1.5 text-sm hover:border-accent disabled:opacity-50"
      >
        {busy ? "Minting…" : `+ Mint ${formatUSDC(MINT_AMOUNT)} mUSDC`}
      </button>
    </div>
  );
}
