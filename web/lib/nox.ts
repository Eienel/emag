"use client";

import type { WalletClient } from "viem";

/**
 * Thin browser-side wrapper around the iExec Nox handle SDK.
 * Encrypts plaintext amounts into FHE input handles the contracts can ingest,
 * and decrypts ciphertexts the user has been granted ACL access to.
 *
 * The SDK is loaded lazily so SSR never imports the WASM payload.
 */

export type EncryptedInput = {
  /** ciphertext handle (bytes32-ish, hex-encoded) */
  handle: `0x${string}`;
  /** input proof bytes */
  proof: `0x${string}`;
};

export interface NoxClient {
  encryptUint256(plaintext: bigint, contractAddress: `0x${string}`): Promise<EncryptedInput>;
  decryptUint256(handle: `0x${string}`): Promise<bigint>;
}

let _cached: NoxClient | null = null;
let _cachedKey: string | null = null;
let _lastError: string | null = null;

/**
 * Lazily load the Nox SDK and instantiate a client. We tolerate the SDK being
 * unavailable (e.g. SSR, or before the wallet is connected) by returning a
 * stub that surfaces a clear hint at call-time. The SDK auto-resolves the
 * gateway / subgraph / FHE coprocessor address from the wallet's chainId,
 * so we deliberately do NOT override `gatewayUrl` here — overriding with a
 * guess broke initialisation in the first deploy.
 */
export async function getNoxClient(walletClient?: WalletClient): Promise<NoxClient> {
  const key = walletClient?.account?.address ?? "anon";
  if (_cached && _cachedKey === key) return _cached;

  if (typeof window === "undefined" || !walletClient) {
    return uninitialisedStub("connect a wallet on Arbitrum Sepolia first");
  }

  try {
    const { createViemHandleClient } = await import("@iexec-nox/handle");
    // No config override — let the SDK pick up the canonical Arbitrum Sepolia
    // gateway URL, subgraph URL and FHE coprocessor address from chainId 421614.
    const handleClient = await createViemHandleClient(walletClient);

    _cached = {
      async encryptUint256(plaintext, contractAddress) {
        const out = await handleClient.encryptInput(plaintext, "uint256", contractAddress);
        return {
          handle: out.handle as unknown as `0x${string}`,
          proof: out.handleProof as `0x${string}`,
        };
      },
      async decryptUint256(handle) {
        const out = await handleClient.decrypt(handle as never);
        return BigInt(out.value as bigint);
      },
    };
    _cachedKey = key;
    _lastError = null;
    return _cached;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[nox] SDK init failed — falling back to stub", err);
    _lastError = msg;
    return uninitialisedStub(`Nox SDK init failed: ${msg}`);
  }
}

/** Stub that surfaces the actual error reason instead of a generic hint. */
function uninitialisedStub(reason: string): NoxClient {
  return {
    async encryptUint256() { throw new Error(reason); },
    async decryptUint256() { throw new Error(reason); },
  };
}

export function lastNoxError(): string | null {
  return _lastError;
}

export function shortHandle(handle: string, take = 6): string {
  if (!handle || handle.length < take * 2 + 4) return handle;
  return `${handle.slice(0, take + 2)}…${handle.slice(-take)}`;
}
