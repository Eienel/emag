import type { Metadata } from "next";
import { Providers } from "./providers";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "ShadowPay — confidential payroll on iExec Nox",
  description:
    "Stream salaries and vesting in confidential ERC-7984 tokens. Salaries stay private on-chain; auditors get selective disclosure.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <Providers>
          <Nav />
          <main className="mx-auto max-w-6xl px-4 pb-16">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
