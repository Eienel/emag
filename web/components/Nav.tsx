"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import clsx from "clsx";

const TABS = [
  { href: "/", label: "Overview" },
  { href: "/employer", label: "Employer" },
  { href: "/employee", label: "Employee" },
  { href: "/auditor", label: "Auditor" },
];

export function Nav() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-edge bg-ink/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight">
          <span className="inline-block h-3 w-3 rounded-sm bg-accent" />
          ShadowPay
        </Link>
        <nav className="hidden gap-1 sm:flex">
          {TABS.map((t) => {
            const active = path === t.href || (t.href !== "/" && path?.startsWith(t.href));
            return (
              <Link
                key={t.href}
                href={t.href}
                className={clsx(
                  "rounded-md px-3 py-1.5 text-sm transition",
                  active ? "bg-edge text-white" : "text-muted hover:text-white"
                )}
              >
                {t.label}
              </Link>
            );
          })}
        </nav>
        <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false} />
      </div>
    </header>
  );
}
