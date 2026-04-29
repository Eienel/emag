/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.externals.push("pino-pretty", "lokijs", "encoding");

    // RainbowKit transitively re-exports every wagmi connector via its barrel,
    // which drags @wagmi/connectors → @base-org/account → @coinbase/cdp-sdk
    // (and a Solana runtime!) into the bundle. We never use the Base Account
    // connector — alias the heavy deps to `false` so webpack stops trying to
    // resolve them. This is safe as long as we don't expose those connectors
    // in lib/wagmi.ts (we don't).
    config.resolve.alias = {
      ...config.resolve.alias,
      "@base-org/account": false,
      "@coinbase/cdp-sdk": false,
    };

    return config;
  },
};
module.exports = nextConfig;
