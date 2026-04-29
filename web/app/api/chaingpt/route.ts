import { NextResponse } from "next/server";

/**
 * POST /api/chaingpt
 *
 * Body: { prompt: string }
 * Returns: parsed payroll spec
 *   {
 *     recipient?: `0x${string}`,
 *     amountPerPeriod?: string,        // human-readable, e.g. "5000"
 *     periodSeconds?: number,          // 30d / 14d / 7d / 1d / 1h
 *     totalPeriods?: number,
 *     cliffPeriods?: number
 *   }
 *
 * Strategy: try ChainGPT's API first when CHAINGPT_API_KEY is configured;
 * fall back to a deterministic local parser so the demo always works.
 */

const SYSTEM_PROMPT = `You convert natural-language payroll/vesting requests into a strict JSON object.

Schema:
{
  "recipient": "0x... (address) or null",
  "amountPerPeriod": "decimal string in USDC, e.g. '5000' or '5000.50'",
  "periodSeconds": one of [3600, 86400, 604800, 1209600, 2592000, 31536000],
  "totalPeriods": positive integer,
  "cliffPeriods": non-negative integer (default 0)
}

Rules:
- "monthly" => 2592000 (30 days)
- "weekly" => 604800
- "bi-weekly" / "every 2 weeks" => 1209600
- "daily" => 86400
- "yearly"/"annually" => 31536000
- "1 year of monthly pay" => totalPeriods=12, periodSeconds=2592000
- A "X-month cliff" with monthly periods => cliffPeriods=X
- Output ONLY the JSON, no commentary.`;

export async function POST(req: Request) {
  const { prompt } = (await req.json()) as { prompt?: string };
  if (!prompt) return NextResponse.json({ error: "missing prompt" }, { status: 400 });

  const apiKey = process.env.CHAINGPT_API_KEY;
  if (apiKey) {
    try {
      const r = await fetch("https://api.chaingpt.org/chat/stream", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "general_assistant",
          question: prompt,
          chatHistory: "off",
          systemPrompt: SYSTEM_PROMPT,
        }),
      });
      if (r.ok) {
        const text = await r.text();
        const parsed = extractJson(text);
        if (parsed) return NextResponse.json(parsed);
      }
    } catch (err) {
      console.warn("[chaingpt] proxy failed, using local parser", err);
    }
  }

  // Deterministic fallback so the demo never breaks.
  return NextResponse.json(localParse(prompt));
}

function extractJson(s: string): Record<string, unknown> | null {
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

const PERIODS: { re: RegExp; seconds: number }[] = [
  { re: /\bminutely\b|per minute|every minute|each minute/i, seconds: 60 },
  { re: /\bhourly\b|per hour|every hour/i, seconds: 3600 },
  { re: /\bdaily\b|per day|every day/i, seconds: 86400 },
  { re: /\bweekly\b|per week|every week/i, seconds: 604800 },
  { re: /\bbi[- ]?weekly\b|every 2 weeks|fortnight/i, seconds: 1209600 },
  { re: /\bmonthly\b|per month|every month/i, seconds: 2592000 },
  { re: /\byearly\b|annually|per year/i, seconds: 31536000 },
];

function localParse(prompt: string): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const addrMatch = prompt.match(/0x[a-fA-F0-9]{40}/);
  if (addrMatch) out.recipient = addrMatch[0];

  const amountMatch = prompt.match(/([\d,]+(?:\.\d+)?)\s*(?:USDC|usdc|USD|usd|\$)?/);
  if (amountMatch) out.amountPerPeriod = amountMatch[1].replace(/,/g, "");

  for (const p of PERIODS) {
    if (p.re.test(prompt)) { out.periodSeconds = p.seconds; break; }
  }

  // "for 12 months", "for 1 year", "over 24 months" → totalPeriods
  const total = prompt.match(/(?:for|over)\s+(\d+)\s*(month|months|year|years|week|weeks|day|days)/i);
  if (total) {
    const n = Number(total[1]);
    const unit = total[2].toLowerCase();
    const periodSec = (out.periodSeconds as number | undefined) ?? 2592000;
    const unitToSec: Record<string, number> = {
      month: 2592000, months: 2592000,
      year: 31536000, years: 31536000,
      week: 604800, weeks: 604800,
      day: 86400, days: 86400,
    };
    const totalSec = n * unitToSec[unit];
    out.totalPeriods = Math.max(1, Math.round(totalSec / periodSec));
  }

  // "X-month cliff", "with a 3 month cliff"
  const cliff = prompt.match(/(\d+)[- ]*(month|months|week|weeks|year|years|day|days)?\s*cliff/i);
  if (cliff) {
    const n = Number(cliff[1]);
    const unit = (cliff[2] ?? "month").toLowerCase();
    const periodSec = (out.periodSeconds as number | undefined) ?? 2592000;
    const unitToSec: Record<string, number> = {
      month: 2592000, months: 2592000,
      year: 31536000, years: 31536000,
      week: 604800, weeks: 604800,
      day: 86400, days: 86400,
    };
    out.cliffPeriods = Math.round((n * unitToSec[unit]) / periodSec);
  }

  return out;
}
