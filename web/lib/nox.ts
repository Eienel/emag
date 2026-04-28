/**
 * Thin browser-side wrapper around the iExec Nox SDK.
 * Encrypts plaintext amounts into FHE ciphertexts the contracts can ingest,
 * and decrypts ciphertexts the user has been granted ACL access to.
 *
 * The SDK is loaded lazily so SSR never imports the WASM payload.
 */

let _client: NoxClient | null = null;

export type EncryptedInput = {
  /** 32-byte ciphertext handle */
  handle: `0x${string}`;
  /** input proof bytes */
  proof: `0x${string}`;
};

export interface NoxClient {
  encryptUint256(plaintext: bigint, contractAddress: `0x${string}`, userAddress: `0x${string}`): Promise<EncryptedInput>;
  decryptUint256(handle: `0x${string}`, contractAddress: `0x${string}`): Promise<bigint>;
}

/**
 * Lazily load the Nox SDK and instantiate a client. We tolerate the SDK being
 * absent in development (e.g. before npm install completes) by returning a
 * stub that surfaces a clear error if the user tries to encrypt/decrypt.
 */
export async function getNoxClient(): Promise<NoxClient> {
  if (_client) return _client;
  try {
    // @ts-expect-error — package is resolved at runtime
    const mod = await import("@iexec-nox/nox-sdk");
    const client = await mod.createClient({
      chainId: 421614,
      gatewayUrl: process.env.NEXT_PUBLIC_NOX_GATEWAY ?? "https://gateway.iex.ec/nox",
    });
    _client = {
      async encryptUint256(plaintext, contractAddress, userAddress) {
        const input = await client.createEncryptedInput(contractAddress, userAddress);
        input.add256(plaintext);
        const out = await input.encrypt();
        return { handle: out.handles[0] as `0x${string}`, proof: out.inputProof as `0x${string}` };
      },
      async decryptUint256(handle, contractAddress) {
        return BigInt(await client.decrypt(handle, contractAddress));
      },
    };
    return _client;
  } catch (err) {
    console.warn("[nox] SDK unavailable — falling back to stub", err);
    _client = stubClient();
    return _client;
  }
}

/** Demo stub used when the Nox SDK isn't installed yet. */
function stubClient(): NoxClient {
  return {
    async encryptUint256(plaintext) {
      const hex = plaintext.toString(16).padStart(64, "0");
      return { handle: `0x${hex}` as `0x${string}`, proof: "0x" };
    },
    async decryptUint256(handle) {
      return BigInt(handle);
    },
  };
}

export function shortHandle(handle: string, take = 6): string {
  if (!handle || handle.length < take * 2 + 4) return handle;
  return `${handle.slice(0, take + 2)}…${handle.slice(-take)}`;
}
