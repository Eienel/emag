"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import clsx from "clsx";

const TABS = [
  { href: "/", label: "Overview", short: "Home" },
  { href: "/employer", label: "Employer", short: "Pay" },
  { href: "/employee", label: "Employee", short: "Claim" },
  { href: "/auditor", label: "Auditor", short: "Audit" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 glass-strong">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <Link
          href="/"
          aria-label="ShadowPay — back to home"
          className="flex shrink-0 items-center gap-2 text-base font-semibold tracking-tight sm:text-lg"
        >
          <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden="true">
            <rect width="64" height="64" rx="13" fill="#0a0a0e" />
            <path
              d="M44 14 H22 a10 10 0 0 0 0 20 H42 a10 10 0 0 1 0 20 H18"
              fill="none"
              stroke="#ffffff"
              strokeWidth="7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="32" cy="30" r="2.4" fill="#0a0a0e" />
            <path d="M31 30 L33 30 L33.6 36 L30.4 36 Z" fill="#0a0a0e" />
          </svg>
          <span className="hidden sm:inline">ShadowPay</span>
        </Link>

        <nav className="flex gap-0.5 overflow-x-auto sm:gap-1">
          {TABS.map((t) => {
            const active = path === t.href || (t.href !== "/" && path?.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={clsx(
                  "shrink-0 rounded-md px-2.5 py-1.5 text-xs transition sm:px-3 sm:text-sm",
                  active ? "bg-white/10 text-white" : "text-muted hover:text-white"
                )}
              >
                <span className="sm:hidden">{t.short}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </Link>
            );
          })}
        </nav>

        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
      </div>
    </header>
  );
}
