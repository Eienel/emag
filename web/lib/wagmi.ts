"use client";

import {
  connectorsForWallets,
  type WalletList,
} from "@rainbow-me/rainbowkit";
import {
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  injectedWallet,
} from "@rainbow-me/rainbowkit/wallets";
import { createConfig, http } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID ?? "00000000000000000000000000000000";

// Explicit wallet list — deliberately excludes coinbaseWallet/baseAccount,
// which transitively pulls in @coinbase/cdp-sdk and a Solana runtime that
// neither we nor the Vercel build need (and that has been breaking builds).
const wallets: WalletList = [
  {
    groupName: "Recommended",
    wallets: [metaMaskWallet, rainbowWallet, walletConnectWallet, injectedWallet],
  },
];

const connectors = connectorsForWallets(wallets, {
  appName: "ShadowPay",
  projectId,
});

export const wagmiConfig = createConfig({
  connectors,
  chains: [arbitrumSepolia],
  ssr: true,
  transports: {
    [arbitrumSepolia.id]: http(),
  },
});
