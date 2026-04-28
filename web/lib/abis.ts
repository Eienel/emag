/**
 * Subset ABIs for the contracts we call from the frontend. Keep them tight —
 * only methods the UI actually invokes. Full ABIs live under contracts/artifacts
 * post-compile.
 */

export const erc20Abi = [
  { type: "function", name: "name", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "symbol", stateMutability: "view", inputs: [], outputs: [{ type: "string" }] },
  { type: "function", name: "decimals", stateMutability: "view", inputs: [], outputs: [{ type: "uint8" }] },
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "approve", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "mint", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [] },
] as const;

export const wrapperAbi = [
  { type: "function", name: "wrap", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint256" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "unwrap", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bytes32" }, { type: "bytes" }], outputs: [{ type: "uint256" }] },
  { type: "function", name: "finalizeUnwrap", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "bytes" }], outputs: [] },
  { type: "function", name: "confidentialBalanceOf", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "confidentialTransfer", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "bytes32" }, { type: "bytes" }], outputs: [{ type: "bytes32" }] },
  { type: "function", name: "setOperator", stateMutability: "nonpayable", inputs: [{ type: "address" }, { type: "uint48" }], outputs: [] },
] as const;

export const payrollAbi = [
  {
    type: "function",
    name: "createStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "encryptedAmount", type: "bytes32" },
      { name: "inputProof", type: "bytes" },
      { name: "periodSeconds", type: "uint64" },
      { name: "totalPeriods", type: "uint64" },
      { name: "cliffPeriods", type: "uint64" },
      { name: "startTime", type: "uint64" },
    ],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
  { type: "function", name: "claim", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [{ type: "uint64" }] },
  { type: "function", name: "cancel", stateMutability: "nonpayable", inputs: [{ type: "uint256" }], outputs: [] },
  { type: "function", name: "grantAuditor", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [] },
  { type: "function", name: "revokeAuditor", stateMutability: "nonpayable", inputs: [{ type: "uint256" }, { type: "address" }], outputs: [] },
  {
    type: "function",
    name: "getStream",
    stateMutability: "view",
    inputs: [{ type: "uint256" }],
    outputs: [
      { name: "payer", type: "address" },
      { name: "recipient", type: "address" },
      { name: "startTime", type: "uint64" },
      { name: "periodSeconds", type: "uint64" },
      { name: "totalPeriods", type: "uint64" },
      { name: "cliffPeriods", type: "uint64" },
      { name: "claimedPeriods", type: "uint64" },
      { name: "cancelled", type: "bool" },
      { name: "amountPerPeriod", type: "bytes32" },
    ],
  },
  { type: "function", name: "vestedPeriods", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint64" }] },
  { type: "function", name: "claimablePeriods", stateMutability: "view", inputs: [{ type: "uint256" }], outputs: [{ type: "uint64" }] },
  { type: "function", name: "nextStreamId", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  {
    type: "event",
    name: "StreamCreated",
    inputs: [
      { name: "streamId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "startTime", type: "uint64", indexed: false },
      { name: "periodSeconds", type: "uint64", indexed: false },
      { name: "totalPeriods", type: "uint64", indexed: false },
      { name: "cliffPeriods", type: "uint64", indexed: false },
    ],
  },
] as const;
