export function formatUSDC(value: bigint, decimals = 6, fractionDigits = 2): string {
  const sign = value < 0n ? "-" : "";
  const abs = value < 0n ? -value : value;
  const base = 10n ** BigInt(decimals);
  const whole = abs / base;
  const frac = abs % base;
  const fracStr = frac
    .toString()
    .padStart(decimals, "0")
    .slice(0, fractionDigits)
    .replace(/0+$/, "");
  return `${sign}${whole.toLocaleString("en-US")}${fracStr ? "." + fracStr : ""}`;
}

export function parseUSDC(input: string, decimals = 6): bigint {
  const trimmed = input.trim();
  if (!trimmed) return 0n;
  const [whole, frac = ""] = trimmed.replace(/,/g, "").split(".");
  const padded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole || "0") * 10n ** BigInt(decimals) + BigInt(padded || "0");
}

export function shortAddr(addr?: string | null): string {
  if (!addr) return "";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const PERIOD_LABELS: Record<number, string> = {
  [60 * 60]: "hour",
  [24 * 60 * 60]: "day",
  [7 * 24 * 60 * 60]: "week",
  [30 * 24 * 60 * 60]: "month",
  [365 * 24 * 60 * 60]: "year",
};

export function periodLabel(seconds: number): string {
  return PERIOD_LABELS[seconds] ?? `${seconds}s`;
}
