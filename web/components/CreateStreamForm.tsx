"use client";

import { useState } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { parseAbi, type Address } from "viem";
import { payrollAbi, wrapperAbi, erc20Abi } from "@/lib/abis";
import { getNoxClient } from "@/lib/nox";
import { parseUSDC } from "@/lib/format";
import deployments from "@/lib/deployments.json";

const PERIOD_OPTIONS: { label: string; seconds: number }[] = [
  { label: "Monthly (30d)", seconds: 30 * 24 * 60 * 60 },
  { label: "Bi-weekly (14d)", seconds: 14 * 24 * 60 * 60 },
  { label: "Weekly (7d)", seconds: 7 * 24 * 60 * 60 },
  { label: "Daily (24h)", seconds: 24 * 60 * 60 },
  { label: "Hourly (demo)", seconds: 60 * 60 },
];

type FormState = {
  recipient: string;
  amountPerPeriod: string;
  periodSeconds: number;
  totalPeriods: string;
  cliffPeriods: string;
};

const initial: FormState = {
  recipient: "",
  amountPerPeriod: "",
  periodSeconds: PERIOD_OPTIONS[0].seconds,
  totalPeriods: "12",
  cliffPeriods: "0",
};

export function CreateStreamForm({ onCreated }: { onCreated?: () => void }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [form, setForm] = useState<FormState>(initial);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  async function handleAi() {
    if (!aiPrompt.trim()) return;
    setAiBusy(true); setError(null);
    try {
      const r = await fetch("/api/chaingpt", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      if (!r.ok) throw new Error(await r.text());
      const parsed = await r.json();
      setForm((s) => ({
        recipient: parsed.recipient ?? s.recipient,
        amountPerPeriod: parsed.amountPerPeriod ?? s.amountPerPeriod,
        periodSeconds: parsed.periodSeconds ?? s.periodSeconds,
        totalPeriods: parsed.totalPeriods?.toString() ?? s.totalPeriods,
        cliffPeriods: parsed.cliffPeriods?.toString() ?? s.cliffPeriods,
      }));
    } catch (e: any) {
      setError(`AI parse failed: ${e.message ?? e}`);
    } finally {
      setAiBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null); setSuccess(null);
    if (!walletClient || !address) return setError("Connect a wallet first.");
    if (!form.recipient.startsWith("0x") || form.recipient.length !== 42) return setError("Invalid recipient address.");
    if (!form.amountPerPeriod) return setError("Enter an amount per period.");

    const amount = parseUSDC(form.amountPerPeriod);
    const totalPeriods = BigInt(form.totalPeriods || "0");
    const cliffPeriods = BigInt(form.cliffPeriods || "0");
    if (totalPeriods === 0n) return setError("totalPeriods must be > 0");
    if (cliffPeriods >= totalPeriods) return setError("cliff must be < totalPeriods");

    const totalDeposit = amount * totalPeriods;
    const c = deployments.contracts;
    const underlying = c.underlying as Address;
    const wrapper = c.wrappedConfidentialUSDC as Address;
    const payroll = c.confidentialPayrollStream as Address;

    setBusy(true);
    try {
      // 1. approve underlying USDC for the wrapper
      setStep("Approving USDC for wrapping…");
      await walletClient.writeContract({
        address: underlying,
        abi: erc20Abi,
        functionName: "approve",
        args: [wrapper, totalDeposit],
      });

      // 2. wrap USDC → wcUSDC
      setStep(`Wrapping ${form.amountPerPeriod} × ${form.totalPeriods} into confidential balance…`);
      await walletClient.writeContract({
        address: wrapper,
        abi: wrapperAbi,
        functionName: "wrap",
        args: [address, totalDeposit],
      });

      // 3. authorise the payroll contract as an operator on wcUSDC for ~1 year
      setStep("Authorising the payroll contract as a confidential operator…");
      const oneYearFromNow = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365;
      await walletClient.writeContract({
        address: wrapper,
        abi: wrapperAbi,
        functionName: "setOperator",
        args: [payroll, oneYearFromNow],
      });

      // 4. encrypt the per-period amount (the contract will multiply by totalPeriods
      //    and pull the lump sum via confidentialTransferFrom inside createStream).
      setStep("Sealing per-period amount with FHE…");
      const nox = await getNoxClient(walletClient);
      const enc = await nox.encryptUint256(amount, payroll);

      setStep("Submitting createStream transaction…");
      const tx = await walletClient.writeContract({
        address: payroll,
        abi: payrollAbi,
        functionName: "createStream",
        args: [
          form.recipient as Address,
          enc.handle,
          enc.proof,
          BigInt(form.periodSeconds),
          totalPeriods,
          cliffPeriods,
          0n,
        ],
      });
      setSuccess(`Stream created. tx: ${tx}`);
      setForm(initial);
      onCreated?.();
    } catch (e: any) {
      setError(e?.shortMessage ?? e?.message ?? String(e));
    } finally {
      setBusy(false);
      setStep(null);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="rounded-2xl border border-edge bg-smoke p-5">
        <p className="mb-2 text-xs uppercase tracking-widest text-muted">Vibe-code with ChainGPT</p>
        <div className="flex gap-2">
          <input
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder='e.g. "Pay 0xAlice 5,000 USDC monthly for 12 months with a 3-month cliff"'
            className="flex-1 rounded-md border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            type="button"
            onClick={handleAi}
            disabled={aiBusy}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {aiBusy ? "Parsing…" : "Parse"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Recipient (0x…)">
          <input
            value={form.recipient}
            onChange={(e) => update("recipient", e.target.value)}
            placeholder="0x…"
            className="input"
          />
        </Field>
        <Field label="Amount per period (USDC)">
          <input
            value={form.amountPerPeriod}
            onChange={(e) => update("amountPerPeriod", e.target.value)}
            placeholder="5000"
            inputMode="decimal"
            className="input"
          />
        </Field>
        <Field label="Period">
          <select
            value={form.periodSeconds}
            onChange={(e) => update("periodSeconds", Number(e.target.value))}
            className="input"
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p.seconds} value={p.seconds}>
                {p.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Total periods">
          <input
            value={form.totalPeriods}
            onChange={(e) => update("totalPeriods", e.target.value)}
            inputMode="numeric"
            className="input"
          />
        </Field>
        <Field label="Cliff (periods)">
          <input
            value={form.cliffPeriods}
            onChange={(e) => update("cliffPeriods", e.target.value)}
            inputMode="numeric"
            className="input"
          />
        </Field>
      </div>

      {step && <p className="text-xs text-muted">→ {step}</p>}
      {error && <p className="rounded-md border border-red-700 bg-red-950 px-3 py-2 text-xs text-red-300">{error}</p>}
      {success && <p className="rounded-md border border-green-800 bg-green-950 px-3 py-2 text-xs text-green-300">{success}</p>}

      <div className="flex items-center justify-end gap-2">
        <button
          type="submit"
          disabled={busy || !address || chainId !== 421614}
          className="rounded-md bg-accent px-5 py-2 text-sm font-semibold text-ink disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create stream"}
        </button>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          border: 1px solid #26262d;
          background: #0a0a0c;
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          border-radius: 0.5rem;
          color: white;
          outline: none;
        }
        :global(.input:focus) {
          border-color: #ff7a45;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs uppercase tracking-widest text-muted">{label}</span>
      {children}
    </label>
  );
}
